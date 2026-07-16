import { findNode, useDocumentStore } from '../store/documentStore';
import { identityTransform, newId } from '../types/document';
import type { EnclosureNode, EnclosureParams, EnclosureSourcePart, SceneNode } from '../types/document';

function collectPartSnapshots(nodes: SceneNode[]): EnclosureSourcePart[] {
  const out: EnclosureSourcePart[] = [];
  const visit = (list: SceneNode[]) => {
    for (const n of list) {
      if (!n.visible) continue;
      if (n.type === 'part') out.push({ nodeId: n.id, partId: n.partId, transform: n.transform });
      else if (n.type === 'group') visit(n.children);
    }
  };
  visit(nodes);
  return out;
}

function makeEnclosureNode(
  part: 'base' | 'lid',
  params: EnclosureParams,
  sourceParts: EnclosureSourcePart[],
): EnclosureNode {
  return {
    type: 'enclosure',
    id: newId(),
    name: part === 'base' ? '外殼底座' : '外殼上蓋',
    role: 'solid',
    transform: identityTransform(),
    visible: true,
    locked: false,
    part,
    params,
    sourceParts,
  };
}

/**
 * 產生外殼（base，以及非 open 時的 lid）。
 * selection 內含 part 節點時只包含選取的零件；否則包含全部可見零件。無零件時不動作。
 */
export function generateEnclosure(params: EnclosureParams): void {
  const store = useDocumentStore.getState();
  const all = collectPartSnapshots(store.doc.nodes);
  const selectedIds = new Set(store.selection);
  const selected = all.filter((s) => selectedIds.has(s.nodeId));
  const sourceParts = selected.length > 0 ? selected : all;
  if (sourceParts.length === 0) return;
  store.addNode(makeEnclosureNode('base', params, sourceParts));
  if (params.lidType !== 'open') {
    store.addNode(makeEnclosureNode('lid', params, sourceParts));
  }
}

/** 用目前零件最新位置重新產生指定外殼節點（沿用其既有 params） */
export function regenerateEnclosure(nodeId: string): void {
  const store = useDocumentStore.getState();
  const node = findNode(store.doc.nodes, nodeId);
  if (!node || node.type !== 'enclosure') return;
  const refreshed = node.sourceParts.map((s) => {
    const live = findNode(store.doc.nodes, s.nodeId);
    return live && live.type === 'part' ? { ...s, transform: live.transform } : s;
  });
  store.updateNode(nodeId, (n) => {
    if (n.type === 'enclosure') n.sourceParts = refreshed;
  });
}
