import { create } from 'zustand';

export type GizmoMode = 'translate' | 'rotate';

interface ViewState {
  shellXray: boolean;
  wireframe: boolean;
  gizmoMode: GizmoMode;
  toggleShellXray: () => void;
  toggleWireframe: () => void;
  setGizmoMode: (mode: GizmoMode) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  shellXray: false,
  wireframe: false,
  gizmoMode: 'translate',
  toggleShellXray: () => set((s) => ({ shellXray: !s.shellXray })),
  toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),
  setGizmoMode: (mode) => set({ gizmoMode: mode }),
}));
