import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CAR_CONFIG, buildCarAnchorAndElectronics } from '../parts/presets';
import type { CarChassisShape, CarConfigParams } from '../parts/presets';
import { useDocumentStore } from '../store/documentStore';
import { Dialog, FieldLabel, GhostButton, PrimaryButton, fieldClass, numberFieldClass, SectionLabel } from './ui';

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
  const setSelection = useDocumentStore((s) => s.setSelection);

  const set = <K extends keyof CarConfigParams>(key: K, value: CarConfigParams[K]) =>
    setConfig((p) => ({ ...p, [key]: value }));

  const generate = () => {
    const { anchor, electronics, defaultSelection } = buildCarAnchorAndElectronics(config, i18n.language);
    addNodes([anchor, ...electronics]);
    setSelection(defaultSelection);
    onClose();
  };

  return (
    <Dialog title={t('toolbar.smartCar')} onClose={onClose} width="w-80">
      <div className="mb-3">
        <SectionLabel>{t('car.chassisShape')}</SectionLabel>
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
      </div>

      <div className="mb-3">
        <SectionLabel>{t('car.chassisDimensions')}</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField
            label={t('car.length')}
            value={config.length}
            min={200}
            max={350}
            onChange={(v) => set('length', v)}
          />
          <NumberField
            label={t('car.width')}
            value={config.width}
            min={150}
            max={250}
            onChange={(v) => set('width', v)}
          />
          <NumberField
            label={t('car.thickness')}
            value={config.thickness}
            min={2}
            max={6}
            step={1}
            onChange={(v) => set('thickness', v)}
          />
        </div>
      </div>

      <div className="mb-3">
        <SectionLabel>{t('car.driveType')}</SectionLabel>
        <select
          className={fieldClass}
          value={config.drive}
          onChange={(e) => set('drive', e.target.value as CarConfigParams['drive'])}
        >
          <option value="2wd">{t('car.drive2wd')}</option>
          <option value="4wd">{t('car.drive4wd')}</option>
        </select>
      </div>

      <div className="mb-3">
        <SectionLabel>{t('car.wheelSize')}</SectionLabel>
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
      </div>

      {config.drive === '2wd' && (
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-[12px] text-ink-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded accent-blue-600"
            checked={config.includeCaster}
            onChange={(e) => set('includeCaster', e.target.checked)}
          />
          {t('car.includeCaster')}
        </label>
      )}

      <div className="flex justify-end gap-1.5">
        <GhostButton onClick={onClose}>{t('export.cancel')}</GhostButton>
        <PrimaryButton onClick={generate}>{t('car.placeElectronics')}</PrimaryButton>
      </div>
    </Dialog>
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
