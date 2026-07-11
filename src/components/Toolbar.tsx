import { useState } from 'react';
import {
  Box,
  Circle,
  Cone,
  Cylinder,
  Download,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getGeometryClient } from '../geometry/client';
import { writeBinaryStl } from '../export/stl';
import { useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';
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
  const [exporting, setExporting] = useState(false);

  const exportStl = async () => {
    setExporting(true);
    try {
      const { doc } = useDocumentStore.getState();
      const mesh = await getGeometryClient().requestExport(doc.nodes);
      const blob = new Blob([writeBinaryStl(mesh)], { type: 'model/stl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name}.stl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error && err.message === 'EXPORT_EMPTY'
        ? t('errors.exportEmpty')
        : t('errors.exportFailed');
      useToastStore.getState().show(message);
    } finally {
      setExporting(false);
    }
  };

  return (
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
      <ToolButton title={t('toolbar.export')} onClick={exportStl} disabled={exporting}>
        <Download size={20} />
      </ToolButton>
    </div>
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
