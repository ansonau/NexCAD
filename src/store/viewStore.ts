import { create } from 'zustand';

interface ViewState {
  shellXray: boolean;
  wireframe: boolean;
  toggleShellXray: () => void;
  toggleWireframe: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  shellXray: false,
  wireframe: false,
  toggleShellXray: () => set((s) => ({ shellXray: !s.shellXray })),
  toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),
}));
