import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateBracket } from '../bracket/actions';
import { DEFAULT_BRACKET_PARAMS } from '../bracket/plan';
import { getPartDefinition } from '../parts/library';
import type { BracketParams, BracketStyle, SceneNode } from '../types/document';
import { useDocumentStore } from '../store/documentStore';
import { Dialog, FieldLabel, GhostButton, PrimaryButton, StepperField, fieldClass } from './ui';

type PartNode = Extract<SceneNode, { type: 'part' }>;

function selectedParts(): PartNode[] {
  const { selection, doc } = useDocumentStore.getState();
  return selection
    .map((id) => doc.nodes.find((n) => n.id === id))
    .filter((n): n is PartNode => n?.type === 'part');
}

const STYLES: { value: BracketStyle; key: string }[] = [
  { value: 'base', key: 'bracket.styleBase' },
  { value: 'l', key: 'bracket.styleL' },
  { value: 'u', key: 'bracket.styleU' },
];

export function BracketPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const initialParts = selectedParts();
  const [params, setParams] = useState<BracketParams>(() => ({
    ...DEFAULT_BRACKET_PARAMS,
    wallHeight: initialParts.length > 0 && !initialParts.some((p) => (getPartDefinition(p.partId)?.mountingHoles.length ?? 0) > 0)
      ? 3
      : DEFAULT_BRACKET_PARAMS.wallHeight,
  }));

  const set = <K extends keyof BracketParams>(key: K, value: BracketParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const setStyle = (style: BracketStyle) =>
    setParams((p) => ({
      ...p,
      style,
      // 切到 U 型抱箍時若沒設定側牆高度，補一個預設值
      wallHeight: style === 'u' && (p.wallHeight ?? 0) <= 0 ? 8 : p.wallHeight,
    }));

  const parts = selectedParts();
  const selectedCount = parts.length;
  const hasHoles = parts.some((p) => (getPartDefinition(p.partId)?.mountingHoles.length ?? 0) > 0);
  const style = params.style ?? 'base';

  const generate = () => {
    generateBracket(params);
    onClose();
  };

  return (
    <Dialog title={t('bracket.title')} onClose={onClose} width="w-[30rem]">
      {selectedCount > 0 ? (
        <p className="mb-3 rounded-xl border border-accent-line bg-accent-soft px-3 py-2 text-[12px] font-semibold text-accent">
          {t('bracket.scope', { count: selectedCount })}
        </p>
      ) : (
        <div className="mb-3 rounded-2xl border border-line bg-slate-900/[0.025] px-3 py-4 text-center">
          <p className="text-[12px] font-medium text-ink-2">{t('bracket.needsSelection')}</p>
        </div>
      )}

      {selectedCount > 0 && !hasHoles && style === 'base' && (
        <p className="mb-3 flex items-start gap-1.5 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-800">
          {t('bracket.noHolesHint')}
        </p>
      )}

      <PanelGroup title={t('bracket.style')}>
        <div className="grid grid-cols-3 gap-2">
          {STYLES.map((s) => {
            const active = style === s.value;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStyle(s.value)}
                className={`h-10 rounded-2xl border text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  active
                    ? 'border-accent bg-accent-soft text-accent shadow-sm'
                    : 'border-line bg-white text-ink-2 hover:border-accent/50 hover:text-ink'
                }`}
              >
                {t(s.key)}
              </button>
            );
          })}
        </div>
      </PanelGroup>

      <PanelGroup title={`${t('bracket.params')} (mm)`}>
        <div className="grid grid-cols-3 gap-2">
          <StepperField
            label={t('bracket.baseThicknessShort')}
            value={params.baseThickness}
            min={0.5}
            step={0.5}
            onChange={(v) => set('baseThickness', v)}
          />
          <StepperField
            label={t('bracket.baseMarginShort')}
            value={params.baseMargin}
            min={0}
            step={0.5}
            onChange={(v) => set('baseMargin', v)}
          />
          <StepperField
            label={t('bracket.cornerRadiusShort')}
            value={params.cornerRadius}
            min={0}
            step={0.5}
            onChange={(v) => set('cornerRadius', v)}
          />
        </div>
      </PanelGroup>

      {style === 'base' && (
        <PanelGroup title={t('bracket.wall')}>
          <div className="grid grid-cols-3 gap-2">
            <StepperField
              label={t('bracket.wallHeightShort')}
              value={params.wallHeight ?? 0}
              min={0}
              step={0.5}
              onChange={(v) => set('wallHeight', v)}
            />
            <StepperField
              label={t('bracket.wallThicknessShort')}
              value={params.wallThickness ?? 1.5}
              min={0.5}
              step={0.5}
              onChange={(v) => set('wallThickness', v)}
            />
            <StepperField
              label={t('bracket.wallClearanceShort')}
              value={params.wallClearance ?? 0.5}
              min={0}
              step={0.1}
              onChange={(v) => set('wallClearance', v)}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-3">{t('bracket.wallHint')}</p>
        </PanelGroup>
      )}

      {style === 'l' && (
        <PanelGroup title={t('bracket.styleL')}>
          <StepperField
            label={t('bracket.wallThicknessShort')}
            value={params.wallThickness ?? 1.5}
            min={0.5}
            step={0.5}
            onChange={(v) => set('wallThickness', v)}
          />
        </PanelGroup>
      )}

      {style === 'u' && (
        <PanelGroup title={t('bracket.styleU')}>
          <div className="grid grid-cols-3 gap-2">
            <StepperField
              label={t('bracket.wallHeightShort')}
              value={params.wallHeight ?? 0}
              min={0.5}
              step={0.5}
              onChange={(v) => set('wallHeight', v)}
            />
            <StepperField
              label={t('bracket.wallThicknessShort')}
              value={params.wallThickness ?? 1.5}
              min={0.5}
              step={0.5}
              onChange={(v) => set('wallThickness', v)}
            />
            <StepperField
              label={t('bracket.wallClearanceShort')}
              value={params.wallClearance ?? 0.5}
              min={0}
              step={0.1}
              onChange={(v) => set('wallClearance', v)}
            />
          </div>
        </PanelGroup>
      )}

      <PanelGroup title={t('bracket.screwSize')}>
        <select
          className={fieldClass}
          value={params.screwSize}
          onChange={(e) => set('screwSize', e.target.value as BracketParams['screwSize'])}
        >
          {(['M2', 'M2.5', 'M3', 'M4'] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="mt-2 block">
          <FieldLabel>{t('bracket.mountingStyle')}</FieldLabel>
          <select
            className={fieldClass}
            value={params.mountingStyle ?? 'screw'}
            onChange={(e) => set('mountingStyle', e.target.value as BracketParams['mountingStyle'])}
          >
            <option value="screw">{t('enclosure.mountingScrew')}</option>
            <option value="peg">{t('enclosure.mountingPeg')}</option>
            <option value="hole">{t('enclosure.mountingHole')}</option>
          </select>
        </label>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded accent-blue-600"
            checked={params.baseHoles !== false}
            onChange={(e) => set('baseHoles', e.target.checked)}
          />
          {t('bracket.baseHoles')}
        </label>
      </PanelGroup>

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex justify-end gap-2 border-t border-line bg-white/98 px-4 py-3">
        <GhostButton onClick={onClose}>{t('export.cancel')}</GhostButton>
        <PrimaryButton onClick={generate} disabled={selectedCount === 0}>
          {t('bracket.generate')}
        </PrimaryButton>
      </div>
    </Dialog>
  );
}

function PanelGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3 rounded-2xl border border-line bg-white/82 p-3">
      <h3 className="mb-2 text-[13px] font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}
