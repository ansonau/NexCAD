import { create } from 'zustand';
import type { NexcadDocument, SceneNode } from '../types/document';
import { emptyDocument } from '../types/document';

const MAX_HISTORY = 100;

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
  updateNode: (id: string, fn: (node: SceneNode) => void) => void;
  removeSelected: () => void;
  beginDrag: () => void;
  updateTransient: (id: string, fn: (node: SceneNode) => void) => void;
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
    set({ doc: next, past: [...past.slice(-MAX_HISTORY + 1), doc], future: [] });
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

  updateNode: (id, fn) =>
    get().mutate('修改節點', (d) => {
      const n = findNode(d.nodes, id);
      if (n) fn(n);
    }),

  removeSelected: () => {
    const selected = new Set(get().selection);
    if (selected.size === 0) return;
    get().mutate('刪除節點', (d) => {
      d.nodes = removeNodes(d.nodes, selected);
    });
    set({ selection: [] });
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
}));
