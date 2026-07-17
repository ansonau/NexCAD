import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDocument, createPartNode } from '../types/document';
import { findNode, useDocumentStore } from '../store/documentStore';
import { DEFAULT_ENCLOSURE_PARAMS } from './plan';
import { generateEnclosure, regenerateEnclosure } from './actions';
import { useToastStore } from '../store/toastStore';
import i18n from '../i18n';

const COLLISION_MSG = i18n.t('enclosure.collisionWarning');

// 角柱一定碰撞、搜尋範圍內找不到解的極端參數：cornerRadius=0（headroom 最小）、
// wallThickness=1（角柱嵌入零件邊界內），對照 plan.test.ts「零件塞滿整條邊緣」案例的思路
// （design.md D2：headroom = cornerRadius+3，collisionRadius 恆 > headroom 時無解）。
const COLLIDING_PARAMS = {
  ...DEFAULT_ENCLOSURE_PARAMS,
  wallThickness: 1,
  clearanceMargin: 0,
  cornerRadius: 0,
};

beforeEach(() => {
  useDocumentStore.setState({
    doc: emptyDocument(),
    selection: [],
    past: [],
    future: [],
    dragBase: null,
  });
  useToastStore.setState({ toasts: [] });
});

describe('generateEnclosure', () => {
  it('沒有零件時不新增任何節點', () => {
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    expect(useDocumentStore.getState().doc.nodes).toHaveLength(0);
  });

  it('有零件時新增 base 與 lid 兩個 enclosure 節點（screw 型）', () => {
    useDocumentStore.getState().addNode(createPartNode('arduino-nano', 'Nano'));
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    const nodes = useDocumentStore.getState().doc.nodes.filter((n) => n.type === 'enclosure');
    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.type === 'enclosure' && n.part).sort()).toEqual(['base', 'lid']);
  });

  it('open 型只新增 base，不新增 lid', () => {
    useDocumentStore.getState().addNode(createPartNode('arduino-nano', 'Nano'));
    generateEnclosure({ ...DEFAULT_ENCLOSURE_PARAMS, lidType: 'open' });
    const nodes = useDocumentStore.getState().doc.nodes.filter((n) => n.type === 'enclosure');
    expect(nodes).toHaveLength(1);
  });

  it('選取中含 part 節點時，外殼只包含選取的零件', () => {
    const store = useDocumentStore.getState();
    const a = createPartNode('arduino-uno', 'A');
    const b = createPartNode('arduino-nano', 'B');
    store.addNode(a);
    store.addNode(b);
    store.setSelection([a.id]);
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    const enclosures = useDocumentStore
      .getState()
      .doc.nodes.filter((n) => n.type === 'enclosure');
    expect(enclosures.length).toBeGreaterThan(0);
    for (const e of enclosures) {
      if (e.type !== 'enclosure') continue;
      expect(e.sourceParts.map((s) => s.nodeId)).toEqual([a.id]);
    }
  });

  it('選取中無 part 節點時，外殼包含全部可見零件', () => {
    const store = useDocumentStore.getState();
    const a = createPartNode('arduino-uno', 'A');
    const b = createPartNode('arduino-nano', 'B');
    store.addNode(a);
    store.addNode(b);
    store.setSelection([]);
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    const base = useDocumentStore
      .getState()
      .doc.nodes.find((n) => n.type === 'enclosure');
    expect(base && base.type === 'enclosure' ? base.sourceParts : []).toHaveLength(2);
  });
});

describe('regenerateEnclosure', () => {
  it('用零件目前位置更新 sourceParts', () => {
    const part = createPartNode('arduino-nano', 'Nano');
    useDocumentStore.getState().addNode(part);
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    const baseId = useDocumentStore
      .getState()
      .doc.nodes.find((n) => n.type === 'enclosure' && n.part === 'base')!.id;

    useDocumentStore.getState().updateNode(part.id, (n) => {
      n.transform.position = [50, 0, 0];
    });
    regenerateEnclosure(baseId);

    const base = findNode(useDocumentStore.getState().doc.nodes, baseId);
    expect(base?.type === 'enclosure' && base.sourceParts[0].transform.position).toEqual([50, 0, 0]);
  });

  it('目標不是 enclosure 節點時不動作', () => {
    const part = createPartNode('arduino-nano', 'Nano');
    useDocumentStore.getState().addNode(part);
    regenerateEnclosure(part.id);
    expect(findNode(useDocumentStore.getState().doc.nodes, part.id)).toEqual(part);
  });

  it('角柱找不到無碰撞位置時，顯示碰撞警告 toast', () => {
    const part = createPartNode('arduino-nano', 'Nano');
    useDocumentStore.getState().addNode(part);
    generateEnclosure(COLLIDING_PARAMS);
    const baseId = useDocumentStore
      .getState()
      .doc.nodes.find((n) => n.type === 'enclosure' && n.part === 'base')!.id;

    useDocumentStore.getState().updateNode(part.id, (n) => {
      n.transform.position = [50, 0, 0];
    });
    regenerateEnclosure(baseId);

    const toasts = useToastStore.getState().toasts;
    expect(toasts.some((t) => t.message === COLLISION_MSG)).toBe(true);
  });
});

describe('角柱碰撞警告（generateEnclosure）', () => {
  it('角柱找不到無碰撞位置時，顯示碰撞警告 toast', () => {
    useDocumentStore.getState().addNode(createPartNode('arduino-nano', 'Nano'));
    generateEnclosure(COLLIDING_PARAMS);
    const toasts = useToastStore.getState().toasts;
    expect(toasts.some((t) => t.message === COLLISION_MSG)).toBe(true);
  });

  it('無碰撞時不顯示碰撞警告 toast', () => {
    useDocumentStore.getState().addNode(createPartNode('arduino-nano', 'Nano'));
    generateEnclosure(DEFAULT_ENCLOSURE_PARAMS);
    const toasts = useToastStore.getState().toasts;
    expect(toasts.some((t) => t.message === COLLISION_MSG)).toBe(false);
  });
});
