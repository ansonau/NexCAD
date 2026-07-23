import { useState } from 'react';
import {
  Box,
  Car,
  Circle,
  Cone,
  Cylinder,
  Download,
  PackageOpen,
  Redo2,
  Trash2,
  Undo2,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EnclosurePanel } from './EnclosurePanel';
import { ExportDialog } from './ExportDialog';
import { ScrewToolsMenu } from './ScrewToolsMenu';
import { CarConfigPanel } from './CarConfigPanel';
import { panelClass } from './ui';
import { useDocumentStore } from '../store/documentStore';
import { createPrimitive } from '../types/document';
import type { PrimitiveKind } from '../types/document';

const PRIMITIVES: { kind: PrimitiveKind; label: string; icon: LucideIcon }[] = [
  { kind: 'box', label: 'toolbar.box', icon: Box },
  { kind: 'cylinder', label: 'toolbar.cylinder', icon: Cylinder },
  { kind: 'sphere', label: 'toolbar.sphere', icon: Circle },
  { kind: 'cone', label: 'toolbar.cone', icon: Cone },
];

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

function PrimitiveButton({
  kind,
  label,
  icon: Icon,
}: {
  kind: PrimitiveKind;
  label: string;
  icon: LucideIcon;
}) {
  const { t } = useTranslation();
  const addNode = useDocumentStore((s) => s.addNode);
  return (
    <ToolButton title={t(label)} onClick={() => addNode(createPrimitive(kind))}>
      <Icon size={16} strokeWidth={1.8} />
      <span className="text-[11px] font-medium leading-none text-ink-3">{t(label)}</span>
    </ToolButton>
  );
}

export function Toolbar() {
  const { t } = useTranslation();
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const removeSelected = useDocumentStore((s) => s.removeSelected);
  const selection = useDocumentStore((s) => s.selection);
  const canUndo = useDocumentStore((s) => s.past.length > 0);
  const canRedo = useDocumentStore((s) => s.future.length > 0);
  const [showExport, setShowExport] = useState(false);
  const [showEnclosure, setShowEnclosure] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showCarMenu, setShowCarMenu] = useState(false);

  return (
    <>
      <div
        className={`pointer-events-auto absolute left-1/2 top-3 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto p-1 whitespace-nowrap ${panelClass}`}
      >
        {PRIMITIVES.map((p) => (
          <PrimitiveButton key={p.kind} kind={p.kind} label={p.label} icon={p.icon} />
        ))}
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
        <Divider />
        <ToolButton
          title={t('enclosure.title')}
          onClick={() => setShowEnclosure((v) => !v)}
          active={showEnclosure}
        >
          <PackageOpen size={16} strokeWidth={1.8} />
          <span className="text-[11px] font-medium leading-none text-ink-3">{t('enclosure.title')}</span>
        </ToolButton>
        <ToolButton
          title={t('toolbar.smartCar')}
          onClick={() => setShowCarMenu((v) => !v)}
          active={showCarMenu}
        >
          <Car size={16} strokeWidth={1.8} />
          <span className="text-[11px] font-medium leading-none text-ink-3">{t('toolbar.smartCar')}</span>
        </ToolButton>
        <ToolButton
          title={t('tools.title')}
          onClick={() => setShowTools((v) => !v)}
          active={showTools}
        >
          <Wrench size={16} strokeWidth={1.8} />
          <span className="text-[11px] font-medium leading-none text-ink-3">{t('tools.title')}</span>
        </ToolButton>
        <Divider />
        <ToolButton title={t('toolbar.export')} onClick={() => setShowExport(true)}>
          <Download size={16} strokeWidth={1.8} />
          <span className="text-[11px] font-medium leading-none text-ink-3">{t('toolbar.export')}</span>
        </ToolButton>
      </div>
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showEnclosure && <EnclosurePanel onClose={() => setShowEnclosure(false)} />}
      {showTools && <ScrewToolsMenu onClose={() => setShowTools(false)} />}
      {showCarMenu && <CarConfigPanel onClose={() => setShowCarMenu(false)} />}
    </>
  );
}

function Divider() {
  return <div className="mx-1 h-7 w-px bg-slate-900/10 self-center" />;
}
