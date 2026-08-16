import { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { generateBracket } from '../bracket/actions';
import { DEFAULT_BRACKET_PARAMS } from '../bracket/plan';
import { getPartDefinition } from '../parts/library';
import type { BracketParams, BracketStyle, SceneNode } from '../types/document';
import { useDocumentStore } from '../store/documentStore';
import { Dialog, FieldLabel, GhostButton, PrimaryButton, Seg, StepperField, fieldClass } from './ui';
import { BracketStyleSelector } from './BracketStyleDiagram';

type PartNode = Extract<SceneNode, { type: 'part' }>;

function selectedParts(): PartNode[] {
  const { selection, doc } = useDocumentStore.getState();
  return selection
    .map((id) => doc.nodes.find((n) => n.id === id))
    .filter((n): n is PartNode => n?.type === 'part');
}

const STYLES: { value: BracketStyle; hintKey: string }[] = [
  { value: 'base', hintKey: 'bracket.styleBaseHint' },
  { value: 'l', hintKey: 'bracket.styleLHint' },
  { value: 'u', hintKey: 'bracket.styleUHint' },
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [autoOrient, setAutoOrient] = useState(true);

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
  const styleInfo = STYLES.find((s) => s.value === style)!;

  const generate = () => {
    generateBracket(params, style !== 'base' && autoOrient);
    onClose();
  };

  const autoOrientBox = (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 rounded accent-blue-600"
        checked={autoOrient}
        onChange={(e) => setAutoOrient(e.target.checked)}
      />
      {t('bracket.autoOrient')}
    </label>
  );

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

      {/* 樣式 */}
      <PanelGroup title={t('bracket.style')}>
        <BracketStyleSelector
          value={style}
          onChange={setStyle}
          labels={{ base: t('bracket.styleBase'), l: t('bracket.styleL'), u: t('bracket.styleU') }}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-ink-3">{t(styleInfo.hintKey)}</p>
      </PanelGroup>

      {/* 尺寸 */}
      <PanelGroup title={t('bracket.dimensions')}>
        {style === 'base' && (
          <div className="grid grid-cols-2 gap-2">
            <StepperField
              label={t('bracket.baseThicknessShort')}
              value={params.baseThickness}
              min={0.5}
              step={0.5}
              onChange={(v) => set('baseThickness', v)}
            />
            <StepperField
              label={t('bracket.baseExpandShort')}
              value={params.baseExpand ?? params.baseMargin}
              min={0}
              step={0.5}
              onChange={(v) => set('baseExpand', v)}
            />
          </div>
        )}
        {style === 'l' && (
          <div className="grid grid-cols-2 gap-2">
            <StepperField
              label={t('bracket.baseThicknessShort')}
              value={params.baseThickness}
              min={0.5}
              step={0.5}
              onChange={(v) => set('baseThickness', v)}
            />
            <StepperField
              label={t('bracket.baseDepthShort')}
              value={params.baseDepth ?? params.baseMargin}
              min={0}
              step={1}
              onChange={(v) => set('baseDepth', v)}
            />
          </div>
        )}
        {style === 'u' && (
          <div className="grid grid-cols-2 gap-2">
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
          </div>
        )}
      </PanelGroup>

      {/* 固定結構（擋牆／背板／側牆） */}
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
          <label className="mt-2 block">
            <FieldLabel>{t('bracket.baseDirection')}</FieldLabel>
            <Seg
              options={[
                { value: 'back', label: t('bracket.baseDirectionBack') },
                { value: 'front', label: t('bracket.baseDirectionFront') },
                { value: 'both', label: t('bracket.baseDirectionBoth') },
              ]}
              value={params.baseDirection ?? 'back'}
              onChange={(v) => set('baseDirection', v)}
            />
          </label>
          <div className="mt-3">{autoOrientBox}</div>
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
              label={t('bracket.wallDepthShort')}
              value={params.wallDepth ?? 0}
              min={0}
              step={0.5}
              onChange={(v) => set('wallDepth', v)}
            />
            <StepperField
              label={t('bracket.wallThicknessShort')}
              value={params.wallThickness ?? 1.5}
              min={0.5}
              step={0.5}
              onChange={(v) => set('wallThickness', v)}
            />
          </div>
          <div className="mt-2">
            <StepperField
              label={t('bracket.wallClearanceShort')}
              value={params.wallClearance ?? 0.5}
              min={0}
              step={0.1}
              onChange={(v) => set('wallClearance', v)}
            />
          </div>
          <p className="mt-2 text-[11px] text-ink-3">{t('bracket.wallDepthHint')}</p>
          <div className="mt-3">{autoOrientBox}</div>
        </PanelGroup>
      )}

      {/* 零件固定（底座型／L 型有固定柱） */}
      {(style === 'base' || style === 'l') && (
        <PanelGroup title={t('bracket.mounting')}>
          <label className="block">
            <FieldLabel>{t('bracket.screwSize')}</FieldLabel>
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
          </label>
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
        </PanelGroup>
      )}

      {/* 進階選項（可摺疊） */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((o) => !o)}
        className="mb-2 flex h-9 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-slate-900/[0.035] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <span>{t('bracket.advanced')}</span>
        {advancedOpen ? <CaretUp size={14} /> : <CaretDown size={14} />}
      </button>
      {advancedOpen && (
        <div className="mb-3 space-y-2 rounded-2xl border border-line bg-slate-900/[0.018] p-3">
          <div className="grid grid-cols-2 gap-2">
            <StepperField
              label={t('bracket.cornerRadiusShort')}
              value={params.cornerRadius}
              min={0}
              step={0.5}
              onChange={(v) => set('cornerRadius', v)}
            />
            {style === 'l' && (
              <StepperField
                label={t('bracket.baseMarginShort')}
                value={params.baseMargin}
                min={0}
                step={0.5}
                onChange={(v) => set('baseMargin', v)}
              />
            )}
          </div>

          <section className="rounded-xl border border-line bg-white/82 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded accent-blue-600"
                checked={params.baseHoles !== false}
                onChange={(e) => set('baseHoles', e.target.checked)}
              />
              {t('bracket.baseHoles')}
            </label>
            {params.baseHoles !== false && (
              <>
                <label className="mt-2 block">
                  <FieldLabel>{t('bracket.baseHoleCount')}</FieldLabel>
                  <Seg
                    options={[
                      { value: '2', label: t('bracket.baseHoleCount2') },
                      { value: '4', label: t('bracket.baseHoleCount4') },
                    ]}
                    value={String(params.baseHoleCount ?? 4) as '2' | '4'}
                    onChange={(v) => set('baseHoleCount', Number(v) as 2 | 4)}
                  />
                </label>
                {(params.baseHoleCount ?? 4) === 2 && (
                  <label className="mt-2 block">
                    <FieldLabel>{t('bracket.baseHoleAxis')}</FieldLabel>
                    <Seg
                      options={[
                        { value: 'long', label: t('bracket.baseHoleAxisLong') },
                        { value: 'short', label: t('bracket.baseHoleAxisShort') },
                      ]}
                      value={params.baseHoleAxis ?? 'long'}
                      onChange={(v) => set('baseHoleAxis', v)}
                    />
                  </label>
                )}
                <label className="mt-2 block">
                  <FieldLabel>{t('bracket.baseHoleScrewSize')}</FieldLabel>
                  <select
                    className={fieldClass}
                    value={params.baseHoleScrewSize ?? params.screwSize}
                    onChange={(e) => set('baseHoleScrewSize', e.target.value as BracketParams['baseHoleScrewSize'])}
                  >
                    {(['M2', 'M2.5', 'M3', 'M4'] as const).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-2">
                  <StepperField
                    label={t('bracket.baseHoleSpacingShort')}
                    value={params.baseHoleSpacing ?? 0}
                    min={0}
                    step={1}
                    onChange={(v) => set('baseHoleSpacing', v)}
                  />
                  <p className="mt-1 text-[11px] text-ink-3">{t('bracket.baseHoleSpacingHint')}</p>
                </div>
                <div className="mt-2">
                  <StepperField
                    label={t('bracket.baseHoleInsetShort')}
                    value={params.baseHoleInset ?? params.baseMargin / 2}
                    min={0.5}
                    step={0.5}
                    onChange={(v) => set('baseHoleInset', v)}
                  />
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded accent-blue-600"
                    checked={params.baseHoleCountersink === true}
                    onChange={(e) => set('baseHoleCountersink', e.target.checked)}
                  />
                  {t('bracket.baseHoleCountersink')}
                </label>
              </>
            )}
          </section>
        </div>
      )}

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
