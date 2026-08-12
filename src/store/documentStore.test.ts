import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CAR_CONFIG } from '../parts/presets';
import { createCarAnchorNode, createPartNode, createPrimitive, emptyDocument } from '../types/document';
import type { PrimitiveNode } from '../types/document';
import { findNode, useDocumentStore } from './documentStore';

beforeEach(() => {
  useDocumentStore.setState({ doc: emptyDocument(), selection: [], past: [], future: [], dragBase: null });
});

const store = () => useDocumentStore.getState();

describe('documentStore', () => {
  it('addNode 加入節點並選取', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    expect(store().doc.nodes).toHaveLength(1);
    expect(store().selection).toEqual([node.id]);
  });

  it('undo/redo 來回', () => {
    store().addNode(createPrimitive('box'));
    store().undo();
    expect(store().doc.nodes).toHaveLength(0);
    store().redo();
    expect(store().doc.nodes).toHaveLength(1);
  });

  it('mutate 後 redo 歷史被清空', () => {
    store().addNode(createPrimitive('box'));
    store().undo();
    store().addNode(createPrimitive('cylinder'));
    store().redo();
    expect(store().doc.nodes).toHaveLength(1);
    expect((store().doc.nodes[0] as PrimitiveNode).kind).toBe('cylinder');
  });

  it('updateNode 修改參數且可 undo', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    store().updateNode(node.id, (n) => {
      if (n.type === 'primitive') n.params.width = 50;
    });
    expect((findNode(store().doc.nodes, node.id) as PrimitiveNode).params.width).toBe(50);
    store().undo();
    expect((findNode(store().doc.nodes, node.id) as PrimitiveNode).params.width).toBe(20);
  });

  it('beginDrag + updateTransient 整段拖曳只佔一步 undo', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    store().beginDrag();
    store().updateTransient(node.id, (n) => {
      n.transform.position = [5, 0, 0];
    });
    store().updateTransient(node.id, (n) => {
      n.transform.position = [9, 0, 0];
    });
    expect(findNode(store().doc.nodes, node.id)!.transform.position).toEqual([9, 0, 0]);
    store().undo();
    expect(findNode(store().doc.nodes, node.id)!.transform.position).toEqual([0, 0, 0]);
  });

  it('removeSelected 刪除選取節點並清空選取', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    store().removeSelected();
    expect(store().doc.nodes).toHaveLength(0);
    expect(store().selection).toEqual([]);
  });

  it('findNode 能找到群組內的節點', () => {
    const inner = createPrimitive('box');
    store().mutate('add group', (d) => {
      d.nodes.push({
        type: 'group',
        id: 'g1',
        name: 'g',
        role: 'solid',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        visible: true,
        locked: false,
        children: [inner],
      });
    });
    expect(findNode(store().doc.nodes, inner.id)?.id).toBe(inner.id);
  });

  it('beginDrag 後沒有 updateTransient 不會浪費 undo 步驟', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    store().beginDrag();
    store().undo();
    expect(store().doc.nodes).toHaveLength(0);
  });

  it('undo 後 selection 不會殘留已刪除節點', () => {
    const node = createPrimitive('box');
    store().addNode(node);
    expect(store().selection).toEqual([node.id]);
    store().undo();
    expect(store().selection).toEqual([]);
  });

  it('removeSelected 可刪除群組內的子節點', () => {
    const inner = createPrimitive('box');
    store().mutate('add group', (d) => {
      d.nodes.push({
        type: 'group',
        id: 'g2',
        name: 'g',
        role: 'solid',
        transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        visible: true,
        locked: false,
        children: [inner],
      });
    });
    store().setSelection([inner.id]);
    store().removeSelected();
    expect(findNode(store().doc.nodes, inner.id)).toBeUndefined();
    expect(store().doc.nodes).toHaveLength(1);
    expect(store().selection).toEqual([]);
  });

  it('addNodes 一次加入多個節點並整體選取，佔一步 undo', () => {
    const a = createPrimitive('box');
    const b = createPrimitive('cylinder');
    store().addNodes([a, b]);
    expect(store().doc.nodes).toHaveLength(2);
    expect(store().selection.sort()).toEqual([a.id, b.id].sort());
    store().undo();
    expect(store().doc.nodes).toHaveLength(0);
  });

  it('addNodes 可指定加入後的選取節點', () => {
    const anchor = createPrimitive('box');
    const motor = createPrimitive('cylinder');
    store().addNodes([anchor, motor], [anchor.id]);
    expect(store().doc.nodes).toHaveLength(2);
    expect(store().selection).toEqual([anchor.id]);
  });

  it('groupSelected 將同層選取節點放入群組並可 undo', () => {
    const a = createPrimitive('box');
    const b = createPrimitive('cylinder');
    const c = createPrimitive('sphere');
    store().addNodes([a, b, c]);
    store().setSelection([a.id, c.id]);
    store().groupSelected('群組');
    expect(store().doc.nodes).toHaveLength(2);
    const grouped = store().doc.nodes[0];
    expect(grouped.type).toBe('group');
    expect(grouped.name).toBe('群組');
    expect(store().selection).toEqual([grouped.id]);
    if (grouped.type !== 'group') throw new Error('expected group');
    expect(grouped.children.map((node) => node.id)).toEqual([a.id, c.id]);
    store().undo();
    expect(store().doc.nodes.map((node) => node.id)).toEqual([a.id, b.id, c.id]);
  });

  it('alignSelected 以第一個選取節點對齊 X/Y/Z 並保留 selection', () => {
    const a = createPrimitive('box', { transform: { position: [10, 1, 1], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    const b = createPrimitive('cylinder', { transform: { position: [30, 2, 2], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    store().addNodes([a, b]);
    store().setSelection([a.id, b.id]);
    store().alignSelected(0);
    expect(findNode(store().doc.nodes, b.id)?.transform.position).toEqual([10, 2, 2]);
    expect(store().selection).toEqual([a.id, b.id]);
    store().alignSelected(1);
    expect(findNode(store().doc.nodes, b.id)?.transform.position).toEqual([10, 1, 2]);
    store().alignSelected(2);
    expect(findNode(store().doc.nodes, b.id)?.transform.position).toEqual([10, 1, 1]);
  });

  it('alignSelected 產生可 undo 的單一步驟', () => {
    const a = createPrimitive('box', { transform: { position: [10, 1, 1], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    const b = createPrimitive('cylinder', { transform: { position: [30, 2, 2], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    store().addNodes([a, b]);
    store().setSelection([a.id, b.id]);
    store().alignSelected(0);
    store().undo();
    expect(findNode(store().doc.nodes, b.id)?.transform.position).toEqual([30, 2, 2]);
  });

  it('alignSelected 可對齊第二個選取節點', () => {
    const a = createPrimitive('box', { transform: { position: [10, 1, 1], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    const b = createPrimitive('cylinder', { transform: { position: [30, 2, 2], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    store().addNodes([a, b]);
    store().setSelection([a.id, b.id]);
    store().alignSelected(0, 'second');
    expect(findNode(store().doc.nodes, a.id)?.transform.position).toEqual([30, 1, 1]);
    expect(findNode(store().doc.nodes, b.id)?.transform.position).toEqual([30, 2, 2]);
  });

  it('alignSelected 可對齊到選取節點平均位置', () => {
    const a = createPrimitive('box', { transform: { position: [10, 1, 1], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    const b = createPrimitive('cylinder', { transform: { position: [30, 2, 2], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    store().addNodes([a, b]);
    store().setSelection([a.id, b.id]);
    store().alignSelected(0, 'average');
    expect(findNode(store().doc.nodes, a.id)?.transform.position).toEqual([20, 1, 1]);
    expect(findNode(store().doc.nodes, b.id)?.transform.position).toEqual([20, 2, 2]);
  });

  it('alignSelected 不會移動鎖定的非基準節點', () => {
    const a = createPrimitive('box', { transform: { position: [10, 1, 1], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    const b = createPrimitive('cylinder', { transform: { position: [30, 2, 2], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    b.locked = true;
    store().addNodes([a, b]);
    store().setSelection([a.id, b.id]);
    store().alignSelected(0);
    expect(findNode(store().doc.nodes, b.id)?.transform.position).toEqual([30, 2, 2]);
    expect(findNode(store().doc.nodes, b.id)?.locked).toBe(true);
  });

  describe('updateCarAnchorRigid：移動/旋轉錨點要連動電子零件', () => {
    function addAnchorWithElectronics() {
      const e1 = createPartNode('hc-sr04', 'HC-SR04', {
        transform: { position: [105, 0, 21.5], rotation: [0, 0, 0], scale: [1, 1, 1] },
      });
      const e2 = createPartNode('arduino-uno', 'Arduino', {
        transform: { position: [40, 0, 21.5], rotation: [0, 0, 0], scale: [1, 1, 1] },
      });
      const anchor = createCarAnchorNode(DEFAULT_CAR_CONFIG, 'smart-car-2wd', [e1.id, e2.id], {
        transform: { position: [-3, 0, 18.5], rotation: [0, 0, 0], scale: [1, 1, 1] },
      });
      store().addNodes([anchor, e1, e2]);
      return { anchor, e1, e2 };
    }

    it('平移錨點時電子零件跟著平移同樣距離', () => {
      const { anchor, e1, e2 } = addAnchorWithElectronics();
      store().updateCarAnchorRigid(anchor.id, (n) => {
        n.transform.position = [-3 + 100, 400, 18.5];
      });
      expect(findNode(store().doc.nodes, e1.id)?.transform.position).toEqual([205, 400, 21.5]);
      expect(findNode(store().doc.nodes, e2.id)?.transform.position).toEqual([140, 400, 21.5]);
    });

    it('逐軸原地改單一分量（PropertyCard 每軸 StepperField 的寫法）也要連動——回歸：oldPosition 曾經只存陣列參照，逐軸 in-place 改法會讓 delta 算成 0', () => {
      const { anchor, e1 } = addAnchorWithElectronics();
      store().updateCarAnchorRigid(anchor.id, (n) => {
        n.transform.position[1] = 400; // 只改 Y 這一分量，不整支 position 陣列重新賦值
      });
      expect(findNode(store().doc.nodes, e1.id)?.transform.position).toEqual([105, 400, 21.5]);
    });

    it('旋轉錨點 Z 軸時電子零件繞錨點原位置旋轉，且自身 rotation.z 也累加', () => {
      const { anchor, e1 } = addAnchorWithElectronics();
      store().updateCarAnchorRigid(anchor.id, (n) => {
        n.transform.rotation = [0, 0, 90];
      });
      // e1 原本相對錨點 (105-(-3), 0-0) = (108, 0)；繞原點轉 90° 後應變成 (0, 108)，
      // 加回新錨點位置（未變，仍是 (-3,0)）＝ (-3, 108)
      const moved = findNode(store().doc.nodes, e1.id)!;
      expect(moved.transform.position[0]).toBeCloseTo(-3, 6);
      expect(moved.transform.position[1]).toBeCloseTo(108, 6);
      expect(moved.transform.rotation[2]).toBe(90);
    });

    it('只改非 car-anchor 節點時不受影響（一般 updateNode 行為不變）', () => {
      const node = createPrimitive('box');
      store().addNode(node);
      store().updateNode(node.id, (n) => void (n.transform.position[0] = 50));
      expect(findNode(store().doc.nodes, node.id)?.transform.position[0]).toBe(50);
    });

    it('可 undo：連動的電子零件位置也一起回復', () => {
      const { anchor, e1 } = addAnchorWithElectronics();
      store().updateCarAnchorRigid(anchor.id, (n) => {
        n.transform.position = [97, 0, 18.5];
      });
      store().undo();
      expect(findNode(store().doc.nodes, e1.id)?.transform.position).toEqual([105, 0, 21.5]);
    });
  });
});
