import { Selection, CaretDown, Ruler, Scan, Sparkle } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { panelClass } from './ui';
import { useViewStore } from '../store/viewStore';
import type { DimensionMode } from '../store/viewStore';

export function ViewToggles() {
  const { t } = useTranslation();
  const shellXray = useViewStore((s) => s.shellXray);
  const wireframe = useViewStore((s) => s.wireframe);
  const highResModels = useViewStore((s) => s.highResModels);
  const dimensionMode = useViewStore((s) => s.dimensionMode);
  const toggleShellXray = useViewStore((s) => s.toggleShellXray);
  const toggleWireframe = useViewStore((s) => s.toggleWireframe);
  const toggleHighResModels = useViewStore((s) => s.toggleHighResModels);
  const setDimensionMode = useViewStore((s) => s.setDimensionMode);

  return (
    <div className={`flex items-center gap-1 p-1 ${panelClass}`}>
      <ToggleButton active={shellXray} onClick={toggleShellXray} label={t('view.xray')} icon={Scan} />
      <ToggleButton active={wireframe} onClick={toggleWireframe} label={t('view.wireframe')} icon={Selection} />
      <DimensionDropdown
        mode={dimensionMode}
        onChange={setDimensionMode}
        labels={{
          title: t('view.dimensions'),
          enclosure: t('view.dimensionsEnclosure'),
          parts: t('view.dimensionsParts'),
          holes: t('view.dimensionsHoles'),
          holeLabels: t('view.dimensionsHoleLabels'),
        }}
      />
      <ToggleButton
        active={highResModels}
        onClick={toggleHighResModels}
        label={t('view.highRes')}
        icon={Sparkle}
      />
    </div>
  );
}

function DimensionDropdown({
  mode,
  onChange,
  labels,
}: {
  mode: DimensionMode;
  onChange: (mode: DimensionMode) => void;
  labels: { title: string; enclosure: string; parts: string; holes: string; holeLabels: string };
}) {
  const [open, setOpen] = useState(false);
  const active = mode !== 'off';
  const setMode = (next: Exclude<DimensionMode, 'off'>) => {
    onChange(mode === next ? 'off' : next);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        title={labels.title}
        aria-label={labels.title}
        aria-pressed={active}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 cursor-pointer items-center justify-center gap-1 rounded-[10px] px-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
          active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-slate-900/5 hover:text-ink'
        }`}
      >
        <Ruler size={15} weight="regular" />
        <span className={`font-mono text-[10px] font-semibold tracking-[-0.02em] ${active ? 'text-accent-strong' : 'text-ink-3'}`}>mm</span>
        <CaretDown size={12} weight="regular" />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-10 z-50 w-44 rounded-xl border border-line bg-white p-1 shadow-pop">
          <DimensionMenuItem active={mode === 'enclosure'} label={labels.enclosure} onClick={() => setMode('enclosure')} />
          <DimensionMenuItem active={mode === 'parts'} label={labels.parts} onClick={() => setMode('parts')} />
          <DimensionMenuItem active={mode === 'holes'} label={labels.holes} onClick={() => setMode('holes')} />
          <DimensionMenuItem active={mode === 'holeLabels'} label={labels.holeLabels} onClick={() => setMode('holeLabels')} />
        </div>
      )}
    </div>
  );
}

function DimensionMenuItem({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex h-8 w-full cursor-pointer items-center rounded-lg px-2 text-left text-[12px] font-medium transition-colors ${
        active ? 'bg-accent-soft text-accent-strong' : 'text-ink-2 hover:bg-slate-900/5 hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  icon: Icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: Icon;
  badge?: string;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 cursor-pointer items-center justify-center rounded-[10px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        active
          ? 'bg-accent-soft text-accent'
          : 'text-ink-2 hover:bg-slate-900/5 hover:text-ink'
      } ${badge ? 'w-auto gap-1 px-2' : 'w-8'}`}
    >
      <Icon size={15} weight={active ? 'duotone' : 'regular'} />
      {badge && (
        <span className={`font-mono text-[10px] font-semibold tracking-[-0.02em] ${active ? 'text-accent-strong' : 'text-ink-3'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
