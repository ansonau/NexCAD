import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateEnclosure } from '../enclosure/actions';
import { DEFAULT_ENCLOSURE_PARAMS } from '../enclosure/plan';
import type { EnclosureParams, SceneNode } from '../types/document';
import { useDocumentStore } from '../store/documentStore';
import { Dialog, FieldLabel, GhostButton, PrimaryButton, SectionLabel, StepperField, fieldClass } from './ui';

export function EnclosurePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [params, setParams] = useState<EnclosureParams>(DEFAULT_ENCLOSURE_PARAMS);
  const [paddingTouched, setPaddingTouched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const set = <K extends keyof EnclosureParams>(key: K, value: EnclosureParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const allParts = collectVisibleParts(doc.nodes);
  const selectedParts = allParts.filter((id) => selection.includes(id));
  const scopeCount = selectedParts.length > 0 ? selectedParts.length : allParts.length;
  const scopeKey = selectedParts.length > 0 ? 'enclosure.scopeSelected' : 'enclosure.scopeAll';

  const generate = () => {
    if (allParts.length === 0) return;
    generateEnclosure(params);
    onClose();
  };

  return (
    <Dialog title={t('enclosure.title')} onClose={onClose} width="w-96">
      {allParts.length === 0 ? (
        <div className="mb-3 rounded-lg bg-slate-50 px-3 py-3 text-center">
          <p className="text-[12px] font-medium text-ink-2">{t('enclosure.noPartsHint')}</p>
          <p className="mt-1 text-[11px] text-ink-3">{t('enclosure.noPartsDetail')}</p>
        </div>
      ) : (
        <p className="mb-3 rounded-lg bg-accent-soft px-2.5 py-1.5 text-[11px] font-medium text-accent">
          {t(scopeKey, { count: scopeCount })}
        </p>
      )}

      <SectionLabel>{t('enclosure.params')}</SectionLabel>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <StepperField
          label={t('enclosure.wallThickness')}
          value={params.wallThickness}
          min={0.5}
          step={0.5}
          onChange={(v) =>
            setParams((p) => ({
              ...p,
              wallThickness: v,
              standoffWallPadding: paddingTouched ? p.standoffWallPadding : v,
            }))
          }
        />
        <StepperField
          label={t('enclosure.clearanceMargin')}
          value={params.clearanceMargin}
          min={0}
          step={0.5}
          onChange={(v) => set('clearanceMargin', v)}
        />
        <StepperField
          label={t('enclosure.cornerRadius')}
          value={params.cornerRadius}
          min={0}
          step={0.5}
          onChange={(v) => set('cornerRadius', v)}
        />
      </div>

      <div className="mb-2">
        <FieldLabel>{t('enclosure.lidType')}</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'screw', label: t('enclosure.lidScrew'), image: '/enclosure-lid-type-screw.png' },
            { value: 'slide', label: t('enclosure.lidSlide'), image: '/enclosure-lid-type-slide.png' },
            { value: 'open', label: t('enclosure.lidOpen'), image: '/enclosure-lid-type-open.png' },
          ] as const).map((option) => {
            const active = params.lidType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => set('lidType', option.value)}
                className={`overflow-hidden rounded-xl border bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  active ? 'border-accent ring-2 ring-accent/20' : 'border-line hover:border-accent/50'
                }`}
              >
                <img src={option.image} alt="" className="aspect-[4/3] w-full bg-slate-50 object-contain p-1" />
                <span className={`block px-2 py-1.5 text-[11px] font-medium ${active ? 'text-accent' : 'text-ink-2'}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <label className="mb-3 block">
        <FieldLabel>{t('enclosure.screwSize')}</FieldLabel>
        <select
          className={fieldClass}
          value={params.screwSize}
          onChange={(e) => set('screwSize', e.target.value as EnclosureParams['screwSize'])}
        >
          {(['M2', 'M2.5', 'M3', 'M4'] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={() => setAdvancedOpen((o) => !o)}
        className="mb-2 flex cursor-pointer items-center gap-1 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {t('enclosure.advanced')}
        {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {advancedOpen && (
        <div className="mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <StepperField
              label={t('enclosure.standoffWallPadding')}
              value={params.standoffWallPadding}
              min={0.5}
              step={0.5}
              onChange={(v) => {
                setPaddingTouched(true);
                set('standoffWallPadding', v);
              }}
            />
            <label className="block">
              <FieldLabel>{t('enclosure.pilotDepthOverride')}</FieldLabel>
              <input
                type="number"
                className={fieldClass}
                value={params.pilotDepthOverride ?? ''}
                min={0.5}
                step={0.5}
                placeholder="—"
                onChange={(e) => {
                  if (e.target.value === '') {
                    set('pilotDepthOverride', undefined);
                  } else {
                    const v = Number.parseFloat(e.target.value);
                    if (!Number.isNaN(v) && v > 0) set('pilotDepthOverride', v);
                  }
                }}
              />
            </label>
          </div>
          <label className="block">
            <FieldLabel>{t('enclosure.mountingStyle')}</FieldLabel>
            <select
              className={fieldClass}
              value={params.mountingStyle ?? 'screw'}
              onChange={(e) =>
                set('mountingStyle', e.target.value as EnclosureParams['mountingStyle'])
              }
            >
              <option value="screw">{t('enclosure.mountingScrew')}</option>
              <option value="peg">{t('enclosure.mountingPeg')}</option>
              <option value="hole">{t('enclosure.mountingHole')}</option>
            </select>
          </label>
          {params.lidType === 'screw' && (
            <>
              <div>
                <FieldLabel>{t('enclosure.screwLidProfile')}</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    {
                      value: 'flatExposed',
                      label: t('enclosure.lidFlatExposed'),
                      image: '/enclosure-lid-head-exposed.png',
                    },
                    {
                      value: 'flatRecessed',
                      label: t('enclosure.lidFlatRecessed'),
                      image: '/enclosure-lid-head-recessed.png',
                    },
                  ] as const).map((option) => {
                    const active = (params.screwLidProfile ?? 'flatRecessed') === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => set('screwLidProfile', option.value)}
                        className={`overflow-hidden rounded-xl border bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                          active ? 'border-accent ring-2 ring-accent/20' : 'border-line hover:border-accent/50'
                        }`}
                      >
                        <img src={option.image} alt="" className="mx-auto aspect-[4/3] w-3/4 bg-slate-50 object-contain p-1" />
                        <span className={`block px-2 py-1.5 text-[11px] font-medium ${active ? 'text-accent' : 'text-ink-2'}`}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block">
                <FieldLabel>{t('enclosure.screwEntry')}</FieldLabel>
                <select
                  className={fieldClass}
                  value={params.screwEntry ?? 'fromLid'}
                  onChange={(e) =>
                    set('screwEntry', e.target.value as EnclosureParams['screwEntry'])
                  }
                >
                  <option value="fromLid">{t('enclosure.screwEntryFromLid')}</option>
                  <option value="fromBase">{t('enclosure.screwEntryFromBase')}</option>
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded accent-blue-600"
                  checked={params.reserveCornerSpace !== false}
                  onChange={(e) => set('reserveCornerSpace', e.target.checked)}
                />
                {t('enclosure.reserveCornerSpace')}
              </label>
            </>
          )}
          {params.lidType !== 'open' && (
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded accent-blue-600"
                checked={params.lidDisplayCutout !== false}
                onChange={(e) => set('lidDisplayCutout', e.target.checked)}
              />
              {t('enclosure.lidDisplayCutout')}
            </label>
          )}
        </div>
      )}

      <div className="flex justify-end gap-1.5">
        <GhostButton onClick={onClose}>{t('export.cancel')}</GhostButton>
        <PrimaryButton onClick={generate} disabled={allParts.length === 0}>{t('enclosure.generate')}</PrimaryButton>
      </div>
    </Dialog>
  );
}

function collectVisibleParts(nodes: SceneNode[]): string[] {
  const out: string[] = [];
  const visit = (list: SceneNode[]) => {
    for (const n of list) {
      if (!n.visible) continue;
      if (n.type === 'part') out.push(n.id);
      else if (n.type === 'group') visit(n.children);
    }
  };
  visit(nodes);
  return out;
}
