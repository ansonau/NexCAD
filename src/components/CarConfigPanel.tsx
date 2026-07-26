import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CAR_CONFIG, buildCarAnchorAndElectronics } from '../parts/presets';
import type { CarChassisShape, CarConfigParams } from '../parts/presets';
import { useDocumentStore } from '../store/documentStore';
import { Dialog, FieldLabel, GhostButton, PrimaryButton, fieldClass, numberFieldClass } from './ui';

const SHAPE_OPTIONS: { value: CarChassisShape; labelKey: string }[] = [
  { value: 'rounded-rect', labelKey: 'car.shapeRoundedRect' },
  { value: 'rect', labelKey: 'car.shapeRect' },
  { value: 'ellipse', labelKey: 'car.shapeEllipse' },
];

const WHEEL_OPTIONS: { value: number; label: string }[] = [
  { value: 65, label: '65mm' },
];

export function CarConfigPanel({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<CarConfigParams>({ ...DEFAULT_CAR_CONFIG });
  const addNodes = useDocumentStore((s) => s.addNodes);

  const set = <K extends keyof CarConfigParams>(key: K, value: CarConfigParams[K]) =>
    setConfig((p) => ({ ...p, [key]: value }));

  const generate = () => {
    const { anchor, electronics, defaultSelection } = buildCarAnchorAndElectronics(config, i18n.language);
    addNodes([anchor, ...electronics], defaultSelection);
    onClose();
  };

  return (
    <Dialog title={t('toolbar.smartCar')} onClose={onClose} width="w-[30rem]">
      <PanelGroup title={t('car.chassisShape')}>
        <select
          className={fieldClass}
          value={config.shape}
          onChange={(e) => set('shape', e.target.value as CarChassisShape)}
        >
          {SHAPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </PanelGroup>

      <PanelGroup title={`${t('car.chassisDimensions')} (mm)`}>
        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label={t('car.lengthShort')}
            value={config.length}
            min={200}
            max={350}
            onChange={(v) => set('length', v)}
          />
          <NumberField
            label={t('car.widthShort')}
            value={config.width}
            min={150}
            max={250}
            onChange={(v) => set('width', v)}
          />
          <NumberField
            label={t('car.thicknessShort')}
            value={config.thickness}
            min={2}
            max={6}
            step={1}
            onChange={(v) => set('thickness', v)}
          />
        </div>
      </PanelGroup>

      <PanelGroup title={t('car.driveType')}>
        <div className="grid grid-cols-2 gap-2">
          {(['2wd', '4wd'] as const).map((drive) => {
            const active = config.drive === drive;
            return (
              <button
                key={drive}
                type="button"
                aria-pressed={active}
                onClick={() => set('drive', drive)}
                className={`rounded-2xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  active ? 'border-accent bg-accent-soft text-accent shadow-sm' : 'border-line bg-white text-ink-2 hover:border-accent/50 hover:text-ink'
                }`}
              >
                <span className="block text-[13px] font-semibold">
                  {drive === '2wd' ? t('car.drive2wd') : t('car.drive4wd')}
                </span>
              </button>
            );
          })}
        </div>
      </PanelGroup>

      <PanelGroup title={t('car.wheelSize')}>
        <select
          className={fieldClass}
          value={config.wheelSize}
          onChange={(e) => set('wheelSize', Number(e.target.value))}
        >
          {WHEEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {config.drive === '2wd' && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] font-medium text-ink-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded accent-blue-600"
              checked={config.includeCaster}
              onChange={(e) => set('includeCaster', e.target.checked)}
            />
            {t('car.includeCaster')}
          </label>
        )}
      </PanelGroup>

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex justify-end gap-2 border-t border-line bg-white/98 px-4 py-3">
        <GhostButton onClick={onClose}>{t('export.cancel')}</GhostButton>
        <PrimaryButton onClick={generate}>{t('car.placeElectronics')}</PrimaryButton>
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

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        className={numberFieldClass}
        value={draft ?? value}
        min={min}
        max={max}
        step={step}
        onFocus={() => setDraft(String(value))}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = Number.parseFloat(e.target.value);
          if (!Number.isNaN(v)) {
            const clamped = Math.max(min, max !== undefined ? Math.min(v, max) : v);
            onChange(clamped);
          }
        }}
      />
    </label>
  );
}
