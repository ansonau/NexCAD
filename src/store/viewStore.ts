import { create } from 'zustand';

export type GizmoMode = 'translate' | 'rotate';
export type DimensionMode = 'off' | 'enclosure' | 'parts' | 'holes' | 'holeLabels';

interface ViewState {
  shellXray: boolean;
  wireframe: boolean;
  highResModels: boolean;
  dimensionMode: DimensionMode;
  gizmoMode: GizmoMode;
  toggleShellXray: () => void;
  toggleWireframe: () => void;
  toggleHighResModels: () => void;
  setDimensionMode: (mode: DimensionMode) => void;
  setGizmoMode: (mode: GizmoMode) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  shellXray: false,
  wireframe: false,
  highResModels: false,
  dimensionMode: 'off',
  gizmoMode: 'translate',
  toggleShellXray: () => set((s) => ({ shellXray: !s.shellXray })),
  toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),
  toggleHighResModels: () => set((s) => ({ highResModels: !s.highResModels })),
  setDimensionMode: (mode) => set({ dimensionMode: mode }),
  setGizmoMode: (mode) => set({ gizmoMode: mode }),
}));
