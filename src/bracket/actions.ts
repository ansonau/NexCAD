import { findNode, useDocumentStore } from '../store/documentStore';
import { createBracketNode } from '../types/document';
import type { BracketParams, EnclosureSourcePart, PartNode } from '../types/document';
import { useToastStore } from '../store/toastStore';
import i18n from '../i18n';

function bracketName(): string {
  return i18n.language === 'en' ? 'Bracket' : '支架';
}

/** 由選取的零件建立支架；未選取任何零件時提示而不動作。 */
export function generateBracket(params: BracketParams): void {
  const store = useDocumentStore.getState();
  const selectedParts = store.selection
    .map((id) => findNode(store.doc.nodes, id))
    .filter((n): n is PartNode => n?.type === 'part');
  if (selectedParts.length === 0) {
    useToastStore.getState().show(i18n.t('bracket.needsSelection'));
    return;
  }
  const sourceParts: EnclosureSourcePart[] = selectedParts.map((n) => ({
    nodeId: n.id,
    partId: n.partId,
    transform: n.transform,
  }));
  store.addNode(createBracketNode(params, bracketName(), { sourceParts }));
}

/** 用目前零件最新位置重新產生指定支架節點（沿用其既有 params） */
export function regenerateBracket(nodeId: string): void {
  const store = useDocumentStore.getState();
  const node = findNode(store.doc.nodes, nodeId);
  if (!node || node.type !== 'bracket') return;
  const refreshed = node.sourceParts.map((s) => {
    const live = findNode(store.doc.nodes, s.nodeId);
    return live && live.type === 'part' ? { ...s, transform: live.transform } : s;
  });
  store.updateNode(nodeId, (n) => {
    if (n.type === 'bracket') n.sourceParts = refreshed;
  });
}
