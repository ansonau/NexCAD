import { useState } from 'react';
import {
  Download,
  Move,
  Redo2,
  Rotate3D,
  Trash2,
  Undo2,
} from 'lucide-react';
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
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex cursor-pointer items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 transition-colors duration-150 hover:bg-slate-900/5 active:scale-95 disabled:pointer-events-none disabled:opacity-35 ${focusRing} ${
        active ? 'text-accent' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {children}
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
            ? 'pointer-events-auto flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap'
            : `pointer-events-auto absolute left-1/2 top-3 flex max-w-[calc(100%_-_1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto p-1 whitespace-nowrap ${panelClass}`
        }
      >
        <ToolButton
          title={t('view.translate')}
          onClick={() => setGizmoMode('translate')}
          active={gizmoMode === 'translate'}
        >
          <Move size={16} strokeWidth={1.8} />
          <span className="text-[11px] font-medium leading-none text-ink-3">{t('view.translate')}</span>
        </ToolButton>
        <ToolButton
          title={t('view.rotate')}
          onClick={() => setGizmoMode('rotate')}
          active={gizmoMode === 'rotate'}
        >
          <Rotate3D size={16} strokeWidth={1.8} />
          <span className="text-[11px] font-medium leading-none text-ink-3">{t('view.rotate')}</span>
        </ToolButton>
        <Divider />
        <ToolButton title={t('toolbar.undo')} onClick={undo} disabled={!canUndo}>
          <Undo2 size={16} strokeWidth={1.8} />
        </ToolButton>
        <ToolButton title={t('toolbar.redo')} onClick={redo} disabled={!canRedo}>
          <Redo2 size={16} strokeWidth={1.8} />
        </ToolButton>
        <ToolButton title={t('toolbar.delete')} onClick={removeSelected} disabled={selection.length === 0}>
          <Trash2 size={16} strokeWidth={1.8} />
        </ToolButton>
        <ToolButton title={t('toolbar.export')} onClick={() => setShowExport(true)}>
          <Download size={16} strokeWidth={1.8} />
          <span className="text-[11px] font-medium leading-none text-ink-3">{t('toolbar.export')}</span>
        </ToolButton>
      </div>
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </>
  );
}

function Divider() {
  return <div className="mx-1 h-7 w-px bg-slate-900/10 self-center" />;
}
