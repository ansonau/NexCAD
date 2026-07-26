import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createScrewHoleNode } from '../enclosure/screwHoleNode';
import { primitiveZRange, projectPartHoles } from '../enclosure/holeProjection';
import type { HoleStyle, ScrewSize } from '../enclosure/screws';
import { findNode, useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';
import { Dialog, GhostButton, OutlineButton, PrimaryButton } from './ui';

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
    <Dialog title={t('tools.title')} onClose={onClose} width="w-[30rem]">
      <PanelGroup title={t('tools.size')}>
        <div className="grid grid-cols-4 gap-2">
          {SIZES.map((s) => {
            const active = size === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => setSize(s)}
                className={`h-10 rounded-2xl border text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  active ? 'border-accent bg-accent-soft text-accent shadow-sm' : 'border-line bg-white text-ink-2 hover:border-accent/50 hover:text-ink'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </PanelGroup>

      <PanelGroup title={t('tools.style')}>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => {
            const active = style === s.value;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStyle(s.value)}
                className={`rounded-2xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  active ? 'border-accent bg-accent-soft text-accent shadow-sm' : 'border-line bg-white text-ink-2 hover:border-accent/50 hover:text-ink'
                }`}
              >
                <span className="block text-[13px] font-semibold">{t(s.key)}</span>
              </button>
            );
          })}
        </div>
      </PanelGroup>

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex justify-end gap-2 border-t border-line bg-white/98 px-4 py-3">
        <GhostButton onClick={onClose}>{t('export.cancel')}</GhostButton>
        <OutlineButton onClick={projectHoles}>{t('tools.projectHoles')}</OutlineButton>
        <PrimaryButton onClick={addScrewHole}>{t('tools.screwHole')}</PrimaryButton>
      </div>
    </Dialog>
  );
}

function PanelGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3 rounded-2xl border border-line bg-white/82 p-3">
      <h3 className="mb-2 text-[13px] font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}
