import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PartsDrawer } from './components/PartsDrawer';
import { PropertyCard } from './components/PropertyCard';
import { LanguageToggle } from './components/LanguageToggle';
import { ProjectsPanel } from './components/ProjectsPanel';
import { ToastStack } from './components/ToastStack';
import { Toolbar } from './components/Toolbar';
import { Viewport } from './components/Viewport';
import { ViewToggles } from './components/ViewToggles';
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
    <div className="relative h-full w-full overflow-hidden bg-slate-50">
      <Viewport />
      <ProjectsPanel />
      <Toolbar />
      <PropertyCard />
      <PartsDrawer />
      <ToastStack />
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="absolute right-4 top-16">
        <ViewToggles />
      </div>
      <div className="absolute bottom-4 left-4 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur">
        NexCAD
      </div>
    </div>
  );
}
