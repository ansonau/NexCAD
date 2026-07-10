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
import { getGeometryClient } from '../geometry/client';
import { writeBinaryStl } from '../export/stl';
import { useDocumentStore } from '../store/documentStore';
import { createPrimitive } from '../types/document';
import type { PrimitiveKind } from '../types/document';

const PRIMITIVES: { kind: PrimitiveKind; label: string; icon: LucideIcon }[] = [
  { kind: 'box', label: '方塊', icon: Box },
  { kind: 'cylinder', label: '圓柱', icon: Cylinder },
  { kind: 'sphere', label: '球體', icon: Circle },
  { kind: 'cone', label: '圓錐', icon: Cone },
];

export function Toolbar() {
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
      alert(err instanceof Error ? err.message : '匯出失敗');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-lg backdrop-blur">
      {PRIMITIVES.map((p) => (
        <ToolButton key={p.kind} title={p.label} onClick={() => addNode(createPrimitive(p.kind))}>
          <p.icon size={20} />
        </ToolButton>
      ))}
      <Divider />
      <ToolButton title="復原" onClick={undo} disabled={!canUndo}>
        <Undo2 size={20} />
      </ToolButton>
      <ToolButton title="重做" onClick={redo} disabled={!canRedo}>
        <Redo2 size={20} />
      </ToolButton>
      <ToolButton title="刪除" onClick={removeSelected} disabled={selection.length === 0}>
        <Trash2 size={20} />
      </ToolButton>
      <Divider />
      <ToolButton title="匯出 STL" onClick={exportStl} disabled={exporting}>
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
