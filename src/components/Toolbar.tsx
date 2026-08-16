import { useState } from 'react';
import {
  DownloadSimple,
  ArrowsOutCardinal,
  ArrowClockwise,
  ArrowsClockwise,
  Trash,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { ExportDialog } from './ExportDialog';
import { panelClass } from './ui';
import { useDocumentStore } from '../store/documentStore';
import { useViewStore } from '../store/viewStore';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

function ToolButton({
  title,
  onClick,
  disabled,
  active,
  label,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold transition-colors duration-150 hover:bg-slate-900/5 active:scale-95 disabled:pointer-events-none disabled:opacity-35 ${focusRing} ${
        active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {children}
      {label && <span className="leading-none">{label}</span>}
    </button>
  );
}

export function Toolbar({ docked = false }: { docked?: boolean }) {
  const { t } = useTranslation();
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const removeSelected = useDocumentStore((s) => s.removeSelected);
  const selection = useDocumentStore((s) => s.selection);
  const canUndo = useDocumentStore((s) => s.past.length > 0);
  const canRedo = useDocumentStore((s) => s.future.length > 0);
  const gizmoMode = useViewStore((s) => s.gizmoMode);
  const setGizmoMode = useViewStore((s) => s.setGizmoMode);
  const [showExport, setShowExport] = useState(false);

  return (
    <>
      <div
        className={
          docked
            ? 'pointer-events-auto flex min-w-0 items-center justify-center gap-1 overflow-x-auto whitespace-nowrap rounded-2xl border border-line bg-white/82 p-1 shadow-sm'
            : `pointer-events-auto absolute left-1/2 top-3 flex max-w-[calc(100%_-_1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto p-1 whitespace-nowrap ${panelClass}`
        }
      >
        <ToolGroup>
          <ToolButton
            title={t('view.translate')}
            label={t('view.translate')}
            onClick={() => setGizmoMode('translate')}
            active={gizmoMode === 'translate'}
          >
            <ArrowsOutCardinal size={16} weight="regular" />
          </ToolButton>
          <ToolButton
            title={t('view.rotate')}
            label={t('view.rotate')}
            onClick={() => setGizmoMode('rotate')}
            active={gizmoMode === 'rotate'}
          >
            <ArrowsClockwise size={16} weight="regular" />
          </ToolButton>
        </ToolGroup>
        <Divider />
        <ToolGroup>
          <ToolButton title={t('toolbar.undo')} onClick={undo} disabled={!canUndo}>
            <ArrowCounterClockwise size={16} weight="regular" />
          </ToolButton>
          <ToolButton title={t('toolbar.redo')} onClick={redo} disabled={!canRedo}>
            <ArrowClockwise size={16} weight="regular" />
          </ToolButton>
          <ToolButton title={t('toolbar.delete')} onClick={removeSelected} disabled={selection.length === 0}>
            <Trash size={16} weight="regular" />
          </ToolButton>
        </ToolGroup>
        <Divider />
        <ToolGroup>
          <ToolButton title={t('toolbar.export')} label={t('toolbar.export')} onClick={() => setShowExport(true)}>
            <DownloadSimple size={16} weight="regular" />
          </ToolButton>
        </ToolGroup>
      </div>
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="mx-1 h-6 w-px self-center bg-slate-900/10" />;
}
