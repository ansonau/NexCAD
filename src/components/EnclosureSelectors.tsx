import { useTranslation } from 'react-i18next';

type LidType = 'screw' | 'slide' | 'open';
type ScrewLidProfile = 'flatExposed' | 'flatRecessed';

const buttonClass = (active: boolean) =>
  `overflow-hidden rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
    active ? 'border-accent bg-accent-soft shadow-sm' : 'border-line bg-white hover:border-accent/50'
  }`;

/** 上蓋類型選擇器（圖示 + 標籤） */
export function LidTypeSelector({
  value,
  onChange,
}: {
  value: LidType;
  onChange: (v: LidType) => void;
}) {
  const { t } = useTranslation();
  const options = [
    { value: 'screw', label: t('enclosure.lidScrew'), image: '/enclosure-lid-type-screw.png' },
    { value: 'slide', label: t('enclosure.lidSlide'), image: '/enclosure-lid-type-slide.png' },
    { value: 'open', label: t('enclosure.lidOpen'), image: '/enclosure-lid-type-open.png' },
  ] as const;
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={buttonClass(value === o.value)}
        >
          <img src={o.image} alt="" className="aspect-[4/3] w-full bg-slate-900/[0.025] object-contain p-1" />
          <span className={`block px-2 py-2 text-[11px] font-semibold ${value === o.value ? 'text-accent' : 'text-ink-2'}`}>
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/** 螺絲上蓋樣式選擇器（圖示 + 標籤） */
export function ScrewLidProfileSelector({
  value,
  onChange,
}: {
  value: ScrewLidProfile;
  onChange: (v: ScrewLidProfile) => void;
}) {
  const { t } = useTranslation();
  const options = [
    { value: 'flatExposed', label: t('enclosure.lidFlatExposed'), image: '/enclosure-lid-head-exposed.png' },
    { value: 'flatRecessed', label: t('enclosure.lidFlatRecessed'), image: '/enclosure-lid-head-recessed.png' },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={buttonClass(value === o.value)}
        >
          <img src={o.image} alt="" className="mx-auto aspect-[4/3] w-3/4 bg-slate-900/[0.025] object-contain p-1" />
          <span className={`block px-2 py-2 text-[11px] font-semibold ${value === o.value ? 'text-accent' : 'text-ink-2'}`}>
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}
