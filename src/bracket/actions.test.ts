import { beforeEach, describe, expect, it } from 'vitest';
import { createPartNode, emptyDocument } from '../types/document';
import { findNode, useDocumentStore } from '../store/documentStore';
import { DEFAULT_BRACKET_PARAMS } from './plan';
import { generateBracket, regenerateBracket } from './actions';
import { useToastStore } from '../store/toastStore';
import i18n from '../i18n';

const NEEDS_SELECTION_MSG = i18n.t('bracket.needsSelection');

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

describe('generateBracket', () => {
  it('未選取零件時不新增節點並顯示提示', () => {
    generateBracket(DEFAULT_BRACKET_PARAMS);
    expect(useDocumentStore.getState().doc.nodes).toHaveLength(0);
    expect(useToastStore.getState().toasts.some((t) => t.message === NEEDS_SELECTION_MSG)).toBe(true);
  });

  it('選取零件時新增 bracket 節點並記錄來源零件', () => {
    const store = useDocumentStore.getState();
    const part = createPartNode('arduino-nano', 'Nano');
    store.addNode(part);
    store.setSelection([part.id]);

    generateBracket(DEFAULT_BRACKET_PARAMS);

    const bracket = useDocumentStore.getState().doc.nodes.find((n) => n.type === 'bracket');
    expect(bracket).toBeDefined();
    expect(bracket?.type === 'bracket' ? bracket.sourceParts.map((s) => s.nodeId) : []).toEqual([part.id]);
    expect(useDocumentStore.getState().selection).toEqual([bracket!.id]);
  });

  it('多個選取零件都納入 sourceParts', () => {
    const store = useDocumentStore.getState();
    const a = createPartNode('arduino-uno', 'A');
    const b = createPartNode('arduino-nano', 'B');
    store.addNode(a);
    store.addNode(b);
    store.setSelection([a.id, b.id]);

    generateBracket(DEFAULT_BRACKET_PARAMS);

    const bracket = useDocumentStore.getState().doc.nodes.find((n) => n.type === 'bracket');
    expect(bracket?.type === 'bracket' ? bracket.sourceParts : []).toHaveLength(2);
  });
});

describe('regenerateBracket', () => {
  it('用零件目前位置更新 sourceParts', () => {
    const store = useDocumentStore.getState();
    const part = createPartNode('arduino-nano', 'Nano');
    store.addNode(part);
    store.setSelection([part.id]);
    generateBracket(DEFAULT_BRACKET_PARAMS);
    const bracketId = useDocumentStore.getState().doc.nodes.find((n) => n.type === 'bracket')!.id;

    store.updateNode(part.id, (n) => {
      n.transform.position = [50, 0, 0];
    });
    regenerateBracket(bracketId);

    const bracket = findNode(useDocumentStore.getState().doc.nodes, bracketId);
    expect(bracket?.type === 'bracket' && bracket.sourceParts[0].transform.position).toEqual([50, 0, 0]);
  });

  it('目標不是 bracket 節點時不動作', () => {
    const part = createPartNode('arduino-nano', 'Nano');
    useDocumentStore.getState().addNode(part);
    regenerateBracket(part.id);
    expect(findNode(useDocumentStore.getState().doc.nodes, part.id)).toEqual(part);
  });
});
