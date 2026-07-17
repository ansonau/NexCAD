import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateEnclosure } from '../enclosure/actions';
import { DEFAULT_ENCLOSURE_PARAMS } from '../enclosure/plan';
import type { EnclosureParams, SceneNode } from '../types/document';
import { useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';

export function EnclosurePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [params, setParams] = useState<EnclosureParams>(DEFAULT_ENCLOSURE_PARAMS);
  const [paddingTouched, setPaddingTouched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const set = <K extends keyof EnclosureParams>(key: K, value: EnclosureParams[K]) =>
    setParams((p) => ({ ...p, [key]: value }));

  const selection = useDocumentStore((s) => s.selection);
  const doc = useDocumentStore((s) => s.doc);
  const allParts = collectVisibleParts(doc.nodes);
  const selectedParts = allParts.filter((id) => selection.includes(id));
  const scopeCount = selectedParts.length > 0 ? selectedParts.length : allParts.length;
  const scopeKey = selectedParts.length > 0 ? 'enclosure.scopeSelected' : 'enclosure.scopeAll';

  const generate = () => {
    if (allParts.length === 0) {
      useToastStore.getState().show(t('enclosure.noParts'));
      return;
    }
    generateEnclosure(params);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-sm font-medium text-slate-800">{t('enclosure.title')}</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <NumberField
            label={t('enclosure.wallThickness')}
            value={params.wallThickness}
            onChange={(v) =>
              setParams((p) => ({
                ...p,
                wallThickness: v,
                standoffWallPadding: paddingTouched ? p.standoffWallPadding : v,
              }))
            }
          />
          <NumberField
            label={t('enclosure.clearanceMargin')}
            value={params.clearanceMargin}
            onChange={(v) => set('clearanceMargin', v)}
          />
          <NumberField
            label={t('enclosure.cornerRadius')}
            value={params.cornerRadius}
            onChange={(v) => set('cornerRadius', v)}
          />
        </div>
        <label className="mb-3 block">
          <span className="text-xs text-slate-400">{t('enclosure.lidType')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
            value={params.lidType}
            onChange={(e) => set('lidType', e.target.value as EnclosureParams['lidType'])}
          >
            <option value="screw">{t('enclosure.lidScrew')}</option>
            <option value="slide">{t('enclosure.lidSlide')}</option>
            <option value="open">{t('enclosure.lidOpen')}</option>
          </select>
        </label>
        <label className="mb-4 block">
          <span className="text-xs text-slate-400">{t('enclosure.screwSize')}</span>
          <select
            className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
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
          className="mb-2 text-xs text-slate-500 underline"
        >
          {t('enclosure.advanced')}
        </button>
        {advancedOpen && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <NumberField
              label={t('enclosure.standoffWallPadding')}
              value={params.standoffWallPadding}
              min={0.5}
              onChange={(v) => {
                setPaddingTouched(true);
                set('standoffWallPadding', v);
              }}
            />
            <OptionalNumberField
              label={t('enclosure.pilotDepthOverride')}
              value={params.pilotDepthOverride}
              onChange={(v) => set('pilotDepthOverride', v)}
            />
            <label className="col-span-2 block">
              <span className="text-xs text-slate-400">{t('enclosure.mountingStyle')}</span>
              <select
                className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
                value={params.mountingStyle ?? 'screw'}
                onChange={(e) =>
                  set('mountingStyle', e.target.value as EnclosureParams['mountingStyle'])
                }
              >
                <option value="screw">{t('enclosure.mountingScrew')}</option>
                <option value="peg">{t('enclosure.mountingPeg')}</option>
              </select>
            </label>
            {params.lidType === 'screw' && (
              <label className="col-span-2 block">
                <span className="text-xs text-slate-400">{t('enclosure.screwLidProfile')}</span>
                <select
                  className="h-11 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800"
                  value={params.screwLidProfile ?? 'flatRecessed'}
                  onChange={(e) =>
                    set('screwLidProfile', e.target.value as EnclosureParams['screwLidProfile'])
                  }
                >
                  <option value="flatExposed">{t('enclosure.lidFlatExposed')}</option>
                  <option value="flatRecessed">{t('enclosure.lidFlatRecessed')}</option>
                </select>
              </label>
            )}
            {params.lidType === 'screw' && (
              <label className="col-span-2 flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={params.reserveCornerSpace !== false}
                  onChange={(e) => set('reserveCornerSpace', e.target.checked)}
                />
                {t('enclosure.reserveCornerSpace')}
              </label>
            )}
          </div>
        )}
        <p className="mb-3 text-xs text-slate-500">{t(scopeKey, { count: scopeCount })}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-11 rounded-xl px-4 text-sm text-slate-600 hover:bg-slate-100"
          >
            {t('export.cancel')}
          </button>
          <button
            onClick={generate}
            className="h-11 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white hover:bg-slate-700"
          >
            {t('enclosure.generate')}
          </button>
        </div>
      </div>
    </div>
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

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="number"
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
        value={draft ?? value}
        min={min}
        step={0.5}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = Number.parseFloat(e.target.value);
          if (!Number.isNaN(v) && v >= min) onChange(v);
        }}
      />
    </label>
  );
}

function OptionalNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="number"
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
        value={draft ?? (value === undefined ? '' : value)}
        min={0.5}
        step={0.5}
        onFocus={() => setDraft(value === undefined ? '' : String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          if (e.target.value === '') {
            onChange(undefined);
            return;
          }
          const v = Number.parseFloat(e.target.value);
          if (!Number.isNaN(v) && v > 0) onChange(v);
        }}
      />
    </label>
  );
}
