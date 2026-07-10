import { beforeEach, describe, expect, it } from 'vitest';
import { createPrimitive, emptyDocument } from '../types/document';
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
});
