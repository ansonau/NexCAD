import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createScrewHoleNode } from '../enclosure/screwHoleNode';
import { primitiveZRange, projectPartHoles } from '../enclosure/holeProjection';
import type { HoleStyle, ScrewSize } from '../enclosure/screws';
import { findNode, useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';

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
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30"
      onClick={onClose}
    >
      <div
        className="w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-medium text-slate-800">{t('tools.title')}</p>
        <label className="mb-3 block">
          <span className="text-xs text-slate-400">{t('tools.size')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
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
          <span className="text-xs text-slate-400">{t('tools.style')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
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
        <button
          onClick={addScrewHole}
          className="mb-2 h-11 w-full rounded-xl bg-slate-800 text-sm font-medium text-white hover:bg-slate-700"
        >
          {t('tools.screwHole')}：{t('tools.add')}
        </button>
        <button
          onClick={projectHoles}
          className="h-11 w-full rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100"
        >
          {t('tools.projectHoles')}
        </button>
      </div>
    </div>
  );
}
