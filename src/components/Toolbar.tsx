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
import { CarPresetMenu } from './CarPresetMenu';
import { IconButton, panelClass } from './ui';
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
  const [showCarMenu, setShowCarMenu] = useState(false);

  return (
    <>
      <div
        className={`absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-0.5 p-1 ${panelClass}`}
      >
        {PRIMITIVES.map((p) => (
          <IconButton key={p.kind} title={t(p.label)} onClick={() => addNode(createPrimitive(p.kind))}>
            <p.icon size={18} strokeWidth={1.8} />
          </IconButton>
        ))}
        <Divider />
        <IconButton title={t('toolbar.undo')} onClick={undo} disabled={!canUndo}>
          <Undo2 size={18} strokeWidth={1.8} />
        </IconButton>
        <IconButton title={t('toolbar.redo')} onClick={redo} disabled={!canRedo}>
          <Redo2 size={18} strokeWidth={1.8} />
        </IconButton>
        <IconButton
          title={t('toolbar.delete')}
          onClick={removeSelected}
          disabled={selection.length === 0}
        >
          <Trash2 size={18} strokeWidth={1.8} />
        </IconButton>
        <Divider />
        <IconButton title={t('enclosure.title')} onClick={() => setShowEnclosure(true)}>
          <PackageOpen size={18} strokeWidth={1.8} />
        </IconButton>
        <IconButton title={t('toolbar.smartCar')} onClick={() => setShowCarMenu(true)}>
          <Car size={18} strokeWidth={1.8} />
        </IconButton>
        <IconButton title={t('tools.title')} onClick={() => setShowTools(true)}>
          <Wrench size={18} strokeWidth={1.8} />
        </IconButton>
        <Divider />
        <IconButton title={t('toolbar.export')} onClick={() => setShowExport(true)}>
          <Download size={18} strokeWidth={1.8} />
        </IconButton>
      </div>
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showEnclosure && <EnclosurePanel onClose={() => setShowEnclosure(false)} />}
      {showTools && <ScrewToolsMenu onClose={() => setShowTools(false)} />}
      {showCarMenu && <CarPresetMenu onClose={() => setShowCarMenu(false)} />}
    </>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-line" />;
}
