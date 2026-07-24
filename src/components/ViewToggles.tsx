import { BoxSelect, ScanLine, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { panelClass } from './ui';
import { useViewStore } from '../store/viewStore';

export function ViewToggles() {
  const { t } = useTranslation();
  const shellXray = useViewStore((s) => s.shellXray);
  const wireframe = useViewStore((s) => s.wireframe);
  const highResModels = useViewStore((s) => s.highResModels);
  const toggleShellXray = useViewStore((s) => s.toggleShellXray);
  const toggleWireframe = useViewStore((s) => s.toggleWireframe);
  const toggleHighResModels = useViewStore((s) => s.toggleHighResModels);

  return (
    <div className={`flex items-center gap-1 p-1 ${panelClass}`}>
      <ToggleButton active={shellXray} onClick={toggleShellXray} label={t('view.xray')} icon={ScanLine} />
      <ToggleButton active={wireframe} onClick={toggleWireframe} label={t('view.wireframe')} icon={BoxSelect} />
      <ToggleButton
        active={highResModels}
        onClick={toggleHighResModels}
        label={t('view.highRes')}
        icon={Sparkles}
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: typeof ScanLine;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        active
          ? 'bg-accent-soft text-accent'
          : 'text-ink-2 hover:bg-slate-900/5 hover:text-ink'
      }`}
    >
      <Icon size={15} strokeWidth={1.8} />
    </button>
  );
}
