import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createScrewHoleNode } from '../enclosure/screwHoleNode';
import { primitiveZRange, projectPartHoles } from '../enclosure/holeProjection';
import type { HoleStyle, ScrewSize } from '../enclosure/screws';
import { findNode, useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';
import { Dialog, FieldLabel, OutlineButton, PrimaryButton, fieldClass } from './ui';

const SIZES: ScrewSize[] = ['M2', 'M2.5', 'M3', 'M4'];
const STYLES: { value: HoleStyle; key: string }[] = [
  { value: 'socketHead', key: 'tools.socketHeadStyle' },
  { value: 'through', key: 'tools.throughStyle' },
  { value: 'selfTap', key: 'tools.selfTapStyle' },
  { value: 'countersink', key: 'tools.countersinkStyle' },
];

export function ScrewToolsMenu({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [size, setSize] = useState<ScrewSize>('M3');
  const [style, setStyle] = useState<HoleStyle>('socketHead');
  const addNode = useDocumentStore((s) => s.addNode);
  const addNodes = useDocumentStore((s) => s.addNodes);

  const addScrewHole = () => {
    addNode(createScrewHoleNode(size, style));
    onClose();
  };

  const projectHoles = () => {
    const { selection, doc } = useDocumentStore.getState();
    if (selection.length !== 2) {
      useToastStore.getState().show(t('tools.projectNeedsSelection'));
      return;
    }
    const [a, b] = selection.map((id) => findNode(doc.nodes, id));
    const part = a?.type === 'part' ? a : b?.type === 'part' ? b : undefined;
    const plate = a?.type === 'primitive' ? a : b?.type === 'primitive' ? b : undefined;
    if (!part || !plate) {
      useToastStore.getState().show(t('tools.projectNeedsSelection'));
      return;
    }
    const holes = projectPartHoles(part, primitiveZRange(plate), size);
    if (holes.length === 0) return;
    addNodes(holes);
    useToastStore.getState().show(t('tools.projected', { count: holes.length }));
    onClose();
  };

  return (
    <Dialog title={t('tools.title')} onClose={onClose} width="w-72">
      <label className="mb-2 block">
        <FieldLabel>{t('tools.size')}</FieldLabel>
        <select
          className={fieldClass}
          value={size}
          onChange={(e) => setSize(e.target.value as ScrewSize)}
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-4 block">
        <FieldLabel>{t('tools.style')}</FieldLabel>
        <select
          className={fieldClass}
          value={style}
          onChange={(e) => setStyle(e.target.value as HoleStyle)}
        >
          {STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {t(s.key)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1.5">
        <PrimaryButton onClick={addScrewHole} className="w-full">
          {t('tools.screwHole')}
        </PrimaryButton>
        <OutlineButton onClick={projectHoles} className="w-full">
          {t('tools.projectHoles')}
        </OutlineButton>
      </div>
    </Dialog>
  );
}
