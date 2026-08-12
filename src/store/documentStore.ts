import { create } from 'zustand';
import type { CarAnchorNode, NexcadDocument, SceneNode, Vec3 } from '../types/document';
import { emptyDocument, identityTransform, newId } from '../types/document';

const MAX_HISTORY = 100;
export type AlignTarget = 'first' | 'second' | 'average';

interface DocumentState {
  doc: NexcadDocument;
  selection: string[];
  past: NexcadDocument[];
  future: NexcadDocument[];
  dragBase: NexcadDocument | null;
  mutate: (label: string, fn: (doc: NexcadDocument) => void) => void;
  undo: () => void;
  redo: () => void;
  setSelection: (ids: string[]) => void;
  addNode: (node: SceneNode) => void;
  addNodes: (nodes: SceneNode[], selection?: string[]) => void;
  updateNode: (id: string, fn: (node: SceneNode) => void) => void;
  updateCarAnchorRigid: (id: string, fn: (anchor: CarAnchorNode) => void) => void;
  removeSelected: () => void;
  groupSelected: (name: string) => void;
  alignSelected: (axis: 0 | 1 | 2, target?: AlignTarget) => void;
  beginDrag: () => void;
  updateTransient: (id: string, fn: (node: SceneNode) => void) => void;
  updateCarAnchorRigidTransient: (id: string, fn: (anchor: CarAnchorNode) => void) => void;
}

function rotateZDeg(p: Vec3, degrees: number): Vec3 {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
}

/**
 * 錨點的電子零件是獨立 PartNode，只靠 electronicsIds 名義關聯（不是子節點）。
 * 改錨點 transform 不會自動連動它們，所以每次改完錨點後，把同樣的位移／繞錨點
 * 原位置的 Z 旋轉套用到每個電子零件，讓「移動/旋轉錨點」等於「移動整台車」。
 */
function applyCarAnchorRigidMove(
  nodes: SceneNode[],
  anchor: CarAnchorNode,
  oldPosition: Vec3,
  oldRotationZ: number,
): void {
  const dRotZ = anchor.transform.rotation[2] - oldRotationZ;
  const idSet = new Set(anchor.electronicsIds);
  for (const n of nodes) {
    if (n.type !== 'part' || !idSet.has(n.id)) continue;
    const relative: Vec3 = [
      n.transform.position[0] - oldPosition[0],
      n.transform.position[1] - oldPosition[1],
      n.transform.position[2] - oldPosition[2],
    ];
    const rotated = dRotZ !== 0 ? rotateZDeg(relative, dRotZ) : relative;
    n.transform.position = [
      anchor.transform.position[0] + rotated[0],
      anchor.transform.position[1] + rotated[1],
      anchor.transform.position[2] + rotated[2],
    ];
    if (dRotZ !== 0) n.transform.rotation[2] += dRotZ;
  }
}

export function findNode(nodes: SceneNode[], id: string): SceneNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.type === 'group') {
      const hit = findNode(n.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

function pruneSelection(selection: string[], doc: NexcadDocument): string[] {
  return selection.filter((id) => findNode(doc.nodes, id));
}

function removeNodes(nodes: SceneNode[], ids: Set<string>): SceneNode[] {
  return nodes
    .filter((n) => !ids.has(n.id))
    .map((n) => (n.type === 'group' ? { ...n, children: removeNodes(n.children, ids) } : n));
}

function groupSelectedInPlace(nodes: SceneNode[], ids: Set<string>, name: string): string | null {
  const selected = nodes.filter((n) => ids.has(n.id));
  if (selected.length >= 2) {
    const groupId = newId();
    const firstIndex = nodes.findIndex((n) => ids.has(n.id));
    const group: SceneNode = {
      type: 'group',
      id: groupId,
      name,
      role: 'solid',
      transform: identityTransform(),
      visible: true,
      locked: false,
      children: selected,
    };
    nodes.splice(firstIndex, 0, group);
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      if (ids.has(nodes[i].id)) nodes.splice(i, 1);
    }
    return groupId;
  }
  for (const n of nodes) {
    if (n.type === 'group') {
      const groupId = groupSelectedInPlace(n.children, ids, name);
      if (groupId) return groupId;
    }
  }
  return null;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  doc: emptyDocument(),
  selection: [],
  past: [],
  future: [],
  dragBase: null,

  mutate: (_label, fn) => {
    const { doc, past } = get();
    const next = structuredClone(doc);
    fn(next);
    set({ doc: next, past: [...past.slice(-MAX_HISTORY + 1), doc], future: [], dragBase: null });
  },

  undo: () => {
    const { past, doc, future, selection } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [doc, ...future],
      selection: pruneSelection(selection, prev),
      dragBase: null,
    });
  },

  redo: () => {
    const { past, doc, future, selection } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      doc: next,
      past: [...past, doc],
      future: future.slice(1),
      selection: pruneSelection(selection, next),
      dragBase: null,
    });
  },

  setSelection: (ids) => set({ selection: ids }),

  addNode: (node) => {
    get().mutate('新增節點', (d) => {
      d.nodes.push(node);
    });
    set({ selection: [node.id] });
  },

  addNodes: (nodes, selection) => {
    if (nodes.length === 0) return;
    get().mutate('新增節點', (d) => {
      d.nodes.push(...nodes);
    });
    set({ selection: selection ?? nodes.map((n) => n.id) });
  },

  updateNode: (id, fn) =>
    get().mutate('修改節點', (d) => {
      const n = findNode(d.nodes, id);
      if (n) fn(n);
    }),

  updateCarAnchorRigid: (id, fn) =>
    get().mutate('移動小車', (d) => {
      const n = findNode(d.nodes, id);
      if (!n || n.type !== 'car-anchor') return;
      const oldPosition: Vec3 = [...n.transform.position];
      const oldRotationZ = n.transform.rotation[2];
      fn(n);
      applyCarAnchorRigidMove(d.nodes, n, oldPosition, oldRotationZ);
    }),

  removeSelected: () => {
    const selected = new Set(get().selection);
    if (selected.size === 0) return;
    get().mutate('刪除節點', (d) => {
      d.nodes = removeNodes(d.nodes, selected);
    });
    set({ selection: [] });
  },

  groupSelected: (name) => {
    const selected = new Set(get().selection);
    if (selected.size < 2) return;
    let groupId: string | null = null;
    get().mutate('群組節點', (d) => {
      groupId = groupSelectedInPlace(d.nodes, selected, name);
    });
    if (groupId) set({ selection: [groupId] });
  },

  alignSelected: (axis, target = 'first') => {
    const { selection } = get();
    if (selection.length < 2) return;
    get().mutate('對齊節點', (d) => {
      const nodes = selection.map((id) => findNode(d.nodes, id)).filter((node): node is SceneNode => Boolean(node));
      const anchor = target === 'second' ? nodes[1] : nodes[0];
      if (!anchor) return;
      const targetPosition =
        target === 'average'
          ? nodes.reduce((sum, node) => sum + node.transform.position[axis], 0) / nodes.length
          : anchor.transform.position[axis];
      const referenceId = target === 'average' ? null : anchor.id;
      for (const id of selection) {
        if (id === referenceId) continue;
        const node = findNode(d.nodes, id);
        if (node && !node.locked) node.transform.position[axis] = targetPosition;
      }
    });
  },

  beginDrag: () => set({ dragBase: get().doc }),

  updateTransient: (id, fn) =>
    set((s) => {
      const next = structuredClone(s.doc);
      const n = findNode(next.nodes, id);
      if (!n) return {};
      fn(n);
      if (s.dragBase) {
        return {
          doc: next,
          past: [...s.past.slice(-MAX_HISTORY + 1), s.dragBase],
          future: [],
          dragBase: null,
        };
      }
      return { doc: next };
    }),

  updateCarAnchorRigidTransient: (id, fn) =>
    set((s) => {
      const next = structuredClone(s.doc);
      const n = findNode(next.nodes, id);
      if (!n || n.type !== 'car-anchor') return {};
      const oldPosition: Vec3 = [...n.transform.position];
      const oldRotationZ = n.transform.rotation[2];
      fn(n);
      applyCarAnchorRigidMove(next.nodes, n, oldPosition, oldRotationZ);
      if (s.dragBase) {
        return {
          doc: next,
          past: [...s.past.slice(-MAX_HISTORY + 1), s.dragBase],
          future: [],
          dragBase: null,
        };
      }
      return { doc: next };
    }),
}));
