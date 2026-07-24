import { create } from 'zustand';

export type GizmoMode = 'translate' | 'rotate';

interface ViewState {
  shellXray: boolean;
  wireframe: boolean;
  highResModels: boolean;
  gizmoMode: GizmoMode;
  toggleShellXray: () => void;
  toggleWireframe: () => void;
  toggleHighResModels: () => void;
  setGizmoMode: (mode: GizmoMode) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  shellXray: false,
  wireframe: false,
  highResModels: false,
  gizmoMode: 'translate',
  toggleShellXray: () => set((s) => ({ shellXray: !s.shellXray })),
  toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),
  toggleHighResModels: () => set((s) => ({ highResModels: !s.highResModels })),
  setGizmoMode: (mode) => set({ gizmoMode: mode }),
}));
