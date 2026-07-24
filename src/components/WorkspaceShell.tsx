import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, PackagePlus } from 'lucide-react';
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
  const [partsOpen, setPartsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="grid h-full w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-canvas text-ink lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <header className="col-span-full flex min-w-0 items-center gap-3 border-b border-line bg-white/88 px-3 py-2 backdrop-blur-xl">
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-[15px] font-black tracking-tight text-ink">NexCAD</div>
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
        <aside className="min-w-0 border-r border-line bg-white/78 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex h-full min-h-0 flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  {t('view.objects')}
                </p>
                <p className="text-[12px] font-medium text-ink-2">{t('view.sceneTree')}</p>
              </div>
              <button
                type="button"
                onClick={() => setPartsOpen((value) => !value)}
                aria-expanded={partsOpen}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <PackagePlus size={15} strokeWidth={1.9} />
                {t('view.addPart')}
              </button>
            </div>

            {partsOpen && (
              <div>
                <button
                  type="button"
                  onClick={() => setPartsOpen(false)}
                  aria-expanded={partsOpen}
                  className="mb-2 flex h-8 w-full cursor-pointer items-center justify-between rounded-lg px-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3 transition-colors hover:bg-slate-900/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {t('view.partsLibrary')}
                  <ChevronDown size={14} />
                </button>
                <PartsDrawer docked showTitle={false} compact />
              </div>
            )}

            <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-white/72 p-2 shadow-sm">
              <SceneTreePanel docked onAddPart={() => setPartsOpen(true)} />
            </section>

            <div>
              <button
                type="button"
                onClick={() => setToolsOpen((value) => !value)}
                aria-expanded={toolsOpen}
                className="flex h-9 w-full cursor-pointer items-center justify-between rounded-xl border border-line bg-white/72 px-3 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3 shadow-sm transition-colors hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {t('view.sidebarTools')}
                {toolsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              {toolsOpen && (
                <div className="mt-2">
                  <WorkflowTools showTitle={false} compact />
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      <main className="relative min-h-0 min-w-0 overflow-hidden">
        <Viewport />
        {!isLargeScreen && <Toolbar />}
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2 lg:top-3">
          <div className="pointer-events-auto">
            <ViewToggles />
          </div>
        </div>
        {!isLargeScreen && <PartsDrawer />}
        {isLargeScreen && (
          <div className="absolute bottom-3 left-3 z-20">
            <ActionRail compact />
          </div>
        )}
        {!isLargeScreen && (
          <div className="pointer-events-none absolute right-3 top-3 z-30 flex max-h-[calc(100%-1.5rem)] w-64 flex-col items-end gap-2">
            {hasSelection && <PropertyCard />}
          </div>
        )}
      </main>

      {isLargeScreen && (
        <aside className="min-w-0 border-l border-line bg-white/82 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="min-h-0 flex-1 p-3">
            <PropertyCard />
          </div>
        </aside>
      )}

      <ToastStack />
    </div>
  );
}
