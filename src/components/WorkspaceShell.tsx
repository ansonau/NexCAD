import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionRail } from './ActionRail';
import { GlobalActions } from './GlobalActions';
import { PartsDrawer } from './PartsDrawer';
import { ProjectsPanel } from './ProjectsPanel';
import { PropertyCard } from './PropertyCard';
import { SceneTreePanel } from './SceneTreePanel';
import { ToastStack } from './ToastStack';
import { Toolbar } from './Toolbar';
import { ViewToggles } from './ViewToggles';
import { Viewport } from './Viewport';
import { WorkflowTools } from './WorkflowTools';
import { useDocumentStore } from '../store/documentStore';

function useIsLargeScreen() {
  const [isLargeScreen, setIsLargeScreen] = useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsLargeScreen(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isLargeScreen;
}

export function WorkspaceShell() {
  const { t } = useTranslation();
  const hasSelection = useDocumentStore((s) => s.selection.length > 0);
  const isLargeScreen = useIsLargeScreen();
  const [sidebarTab, setSidebarTab] = useState<'parts' | 'tools' | 'objects'>('parts');
  const sidebarTabs = [
    { id: 'parts' as const, label: t('view.sidebarParts') },
    { id: 'tools' as const, label: t('view.sidebarTools') },
    { id: 'objects' as const, label: t('view.sidebarScene') },
  ];

  return (
    <div className="grid h-full w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-canvas text-ink lg:grid-cols-[272px_minmax(0,1fr)_328px]">
      <header className="col-span-full flex min-w-0 items-center gap-3 border-b border-line bg-white/94 px-3.5 py-2">
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-[16px] font-bold tracking-[-0.03em] text-ink">NexCAD</div>
          <ProjectsPanel />
        </div>
        {isLargeScreen && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <Toolbar docked />
          </div>
        )}
        <div className="ml-auto shrink-0">
          <GlobalActions />
        </div>
      </header>

      {isLargeScreen && (
        <aside className="min-w-0 border-r border-line bg-[#f8fafd]/92 lg:flex lg:flex-col">
          <div className="flex h-full min-h-0 flex-col gap-2 p-3">
            <div role="tablist" aria-label={t('view.objects')} className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-900/[0.045] p-1">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  onClick={() => setSidebarTab(tab.id)}
                  id={`sidebar-tab-${tab.id}`}
                  aria-selected={sidebarTab === tab.id}
                  aria-controls={`sidebar-panel-${tab.id}`}
                  className={`h-8 cursor-pointer rounded-xl text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    sidebarTab === tab.id
                      ? 'bg-white text-accent shadow-panel'
                      : 'text-ink-2 hover:bg-white/70 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {sidebarTab === 'parts' && (
              <div id="sidebar-panel-parts" role="tabpanel" aria-labelledby="sidebar-tab-parts" className="flex min-h-0 flex-1">
                <PartsDrawer docked showTitle={false} />
              </div>
            )}
            {sidebarTab === 'tools' && (
              <div id="sidebar-panel-tools" role="tabpanel" aria-labelledby="sidebar-tab-tools">
                <WorkflowTools showTitle={false} compact />
              </div>
            )}
            {sidebarTab === 'objects' && (
              <div id="sidebar-panel-objects" role="tabpanel" aria-labelledby="sidebar-tab-objects" className="flex min-h-0 flex-1">
                <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-white/84 p-2 shadow-sm">
                  <SceneTreePanel docked onAddPart={() => setSidebarTab('parts')} />
                </section>
              </div>
            )}
          </div>
        </aside>
      )}

      <main className="relative min-h-0 min-w-0 overflow-hidden">
        <Viewport />
        {!isLargeScreen && <Toolbar />}
        <div className="pointer-events-none absolute right-3 top-16 z-[45] lg:left-1/2 lg:right-auto lg:top-3 lg:z-20 lg:-translate-x-1/2">
          <div className="pointer-events-auto">
            <ViewToggles />
          </div>
        </div>
        {!isLargeScreen && <PartsDrawer />}
        {!isLargeScreen && (
          <div className="pointer-events-none absolute left-3 top-32 z-[45] flex max-h-[calc(100%-10rem)] w-60 flex-col gap-2">
            <div className="pointer-events-auto">
              <WorkflowTools />
            </div>
            <div className="pointer-events-auto">
              <SceneTreePanel />
            </div>
          </div>
        )}
        <div className="absolute bottom-16 left-3 z-[45] lg:bottom-3 lg:z-20">
          <ActionRail compact />
        </div>
        {!isLargeScreen && (
          <div className="pointer-events-none absolute bottom-28 right-3 z-30 flex max-h-[calc(100%-12rem)] w-64 flex-col items-end gap-2">
            {hasSelection && <PropertyCard />}
          </div>
        )}
      </main>

      {isLargeScreen && (
        <aside className="min-w-0 border-l border-line bg-[#f8fafd]/94 lg:flex lg:flex-col">
          <div className="min-h-0 flex-1 p-3">
            <PropertyCard />
          </div>
        </aside>
      )}

      <ToastStack />
    </div>
  );
}
