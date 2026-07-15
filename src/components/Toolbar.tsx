import { useState } from 'react';
import {
  Box,
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
import { useDocumentStore } from '../store/documentStore';
import { createPrimitive } from '../types/document';
import type { PrimitiveKind } from '../types/document';

const PRIMITIVES: { kind: PrimitiveKind; label: string; icon: LucideIcon }[] = [
  { kind: 'box', label: 'toolbar.box', icon: Box },
  { kind: 'cylinder', label: 'toolbar.cylinder', icon: Cylinder },
  { kind: 'sphere', label: 'toolbar.sphere', icon: Circle },
  { kind: 'cone', label: 'toolbar.cone', icon: Cone },
];

export function Toolbar() {
  const { t } = useTranslation();
  const addNode = useDocumentStore((s) => s.addNode);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const removeSelected = useDocumentStore((s) => s.removeSelected);
  const selection = useDocumentStore((s) => s.selection);
  const canUndo = useDocumentStore((s) => s.past.length > 0);
  const canRedo = useDocumentStore((s) => s.future.length > 0);
  const [showExport, setShowExport] = useState(false);
  const [showEnclosure, setShowEnclosure] = useState(false);
  const [showTools, setShowTools] = useState(false);

  return (
    <>
      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-lg backdrop-blur">
        {PRIMITIVES.map((p) => (
          <ToolButton key={p.kind} title={t(p.label)} onClick={() => addNode(createPrimitive(p.kind))}>
            <p.icon size={20} />
          </ToolButton>
        ))}
        <Divider />
        <ToolButton title={t('toolbar.undo')} onClick={undo} disabled={!canUndo}>
          <Undo2 size={20} />
        </ToolButton>
        <ToolButton title={t('toolbar.redo')} onClick={redo} disabled={!canRedo}>
          <Redo2 size={20} />
        </ToolButton>
        <ToolButton title={t('toolbar.delete')} onClick={removeSelected} disabled={selection.length === 0}>
          <Trash2 size={20} />
        </ToolButton>
        <Divider />
        <ToolButton title={t('enclosure.title')} onClick={() => setShowEnclosure(true)}>
          <PackageOpen size={20} />
        </ToolButton>
        <ToolButton title={t('tools.title')} onClick={() => setShowTools(true)}>
          <Wrench size={20} />
        </ToolButton>
        <Divider />
        <ToolButton title={t('toolbar.export')} onClick={() => setShowExport(true)}>
          <Download size={20} />
        </ToolButton>
      </div>
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showEnclosure && <EnclosurePanel onClose={() => setShowEnclosure(false)} />}
      {showTools && <ScrewToolsMenu onClose={() => setShowTools(false)} />}
    </>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-slate-200" />;
}

function ToolButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
