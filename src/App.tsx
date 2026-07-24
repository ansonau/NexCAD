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
  const nodeCount = useDocumentStore((s) => s.doc.nodes.length);

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
      {nodeCount === 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-line bg-white/95 px-8 py-6 text-center shadow-pop backdrop-blur-xl animate-pop-in">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 12 20.5 7M12 12v9.5M12 12 3.5 7" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-semibold tracking-tight text-ink">{t('view.welcomeTitle')}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{t('view.welcomeHint')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
