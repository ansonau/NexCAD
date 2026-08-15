import { findNode, useDocumentStore } from '../store/documentStore';
import { createBracketNode } from '../types/document';
import type { BracketParams, EnclosureSourcePart, PartNode } from '../types/document';
import { useToastStore } from '../store/toastStore';
import i18n from '../i18n';

function bracketName(): string {
  return i18n.language === 'en' ? 'Bracket' : '支架';
}

/**
 * 由選取的零件建立支架；未選取任何零件時提示而不動作。
 * `autoOrient`：當零件平放（rx=ry=0）時，自動繞 Y 軸轉 90° 使感測面朝前（+X），
 * 保留原本的 Z 軸面內旋轉；已傾斜的零件則保持不動。用於 L 型／U 型立式支架。
 */
export function generateBracket(params: BracketParams, autoOrient = false): void {
  const store = useDocumentStore.getState();
  const selectedParts = store.selection
    .map((id) => findNode(store.doc.nodes, id))
    .filter((n): n is PartNode => n?.type === 'part');
  if (selectedParts.length === 0) {
    useToastStore.getState().show(i18n.t('bracket.needsSelection'));
    return;
  }

  const node = createBracketNode(params, bracketName());
  store.mutate('建立支架', (d) => {
    const sourceParts: EnclosureSourcePart[] = [];
    for (const part of selectedParts) {
      const live = findNode(d.nodes, part.id);
      if (!live || live.type !== 'part') continue;
      if (autoOrient) {
        const [rx, ry, rz] = live.transform.rotation;
        if (rx === 0 && ry === 0) {
          live.transform.rotation = [0, 90, rz];
        }
      }
      sourceParts.push({ nodeId: live.id, partId: live.partId, transform: live.transform });
    }
    d.nodes.push({ ...node, sourceParts });
  });
  useDocumentStore.setState({ selection: [node.id] });
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
