import { findNode, useDocumentStore } from '../store/documentStore';
import { createBracketNode, identityTransform, newId } from '../types/document';
import type { BracketParams, EnclosureSourcePart, GroupNode, PartNode, SceneNode } from '../types/document';
import { useToastStore } from '../store/toastStore';
import i18n from '../i18n';

function bracketName(): string {
  return i18n.language === 'en' ? 'Bracket' : '支架';
}

/** 遞迴移除指定 id 的節點並回傳被移除的節點（供重新群組用）。 */
function extractNodes(nodes: SceneNode[], ids: Set<string>): { nodes: SceneNode[]; removed: SceneNode[] } {
  const removed: SceneNode[] = [];
  const kept: SceneNode[] = [];
  for (const n of nodes) {
    if (ids.has(n.id)) {
      removed.push(n);
      continue;
    }
    if (n.type === 'group') {
      const r = extractNodes(n.children, ids);
      removed.push(...r.removed);
      kept.push({ ...n, children: r.nodes });
    } else {
      kept.push(n);
    }
  }
  return { nodes: kept, removed };
}

/**
 * 由選取的零件建立支架，並把來源零件與支架包進同一個群組，方便一起移動/選取。
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

  const bracket = createBracketNode(params, bracketName());
  const groupId = newId();
  const selectedIds = new Set(selectedParts.map((p) => p.id));

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
    const { nodes, removed } = extractNodes(d.nodes, selectedIds);
    const group: GroupNode = {
      type: 'group',
      id: groupId,
      name: bracketName(),
      role: 'solid',
      transform: identityTransform(),
      visible: true,
      locked: false,
      children: [...removed, { ...bracket, sourceParts }],
    };
    d.nodes = [...nodes, group];
  });
  useDocumentStore.setState({ selection: [groupId] });
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
