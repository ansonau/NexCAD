import { useEffect } from 'react';
import { saveProject } from '../persistence/db';
import { useDocumentStore } from '../store/documentStore';
import { useProjectStore } from '../store/projectStore';

const AUTOSAVE_DELAY_MS = 800;

function persistNow(): void {
  const projectId = useProjectStore.getState().projectId;
  if (!projectId) return;
  const doc = useDocumentStore.getState().doc;
  void saveProject({ id: projectId, name: doc.name, updatedAt: Date.now(), doc });
}

/** 文件變更後 debounce 寫入 IndexedDB；pagehide 時立即寫入 */
export function useAutosave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useDocumentStore.subscribe((state, prev) => {
      if (state.doc === prev.doc) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(persistNow, AUTOSAVE_DELAY_MS);
    });
    const onPageHide = () => persistNow();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}
