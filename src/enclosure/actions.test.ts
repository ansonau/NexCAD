import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDocument, createPartNode } from '../types/document';
import { findNode, useDocumentStore } from '../store/documentStore';
import { DEFAULT_ENCLOSURE_PARAMS } from './plan';
import { generateEnclosure, regenerateEnclosure } from './actions';

beforeEach(() => {
  useDocumentStore.setState({
    doc: emptyDocument(),
    selection: [],
    past: [],
    future: [],
    dragBase: null,
  });
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
});
