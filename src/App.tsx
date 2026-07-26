import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkspaceShell } from './components/WorkspaceShell';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { listProjects, saveProject } from './persistence/db';
import { useDocumentStore } from './store/documentStore';
import { useProjectStore } from './store/projectStore';
import { emptyDocument, newId } from './types/document';

// 同步旗標：StrictMode 雙掛載時第二次 effect 在第一次的 await 恢復前就執行，
// 只靠 store 內的 projectId 判斷會重複建立專案
let bootstrapped = false;

export default function App() {
  useKeyboardShortcuts();
  useAutosave();
  const { t } = useTranslation();

  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;
    void (async () => {
      if (useProjectStore.getState().projectId) return;
      const projects = await listProjects();
      if (projects.length > 0) {
        const latest = projects[0];
        useDocumentStore.setState({
          doc: latest.doc,
          selection: [],
          past: [],
          future: [],
          dragBase: null,
        });
        useProjectStore.getState().setProjectId(latest.id);
      } else {
        const id = newId();
        const doc = emptyDocument(t('projects.untitled'));
        useDocumentStore.setState({ doc, selection: [], past: [], future: [], dragBase: null });
        useProjectStore.getState().setProjectId(id);
        await saveProject({ id, name: doc.name, updatedAt: Date.now(), doc });
      }
    })();
  }, [t]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas text-ink">
      <WorkspaceShell />
    </div>
  );
}
