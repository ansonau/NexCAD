import { useTranslation } from 'react-i18next';
import { useViewStore } from '../store/viewStore';

export function ViewToggles() {
  const { t } = useTranslation();
  const shellXray = useViewStore((s) => s.shellXray);
  const wireframe = useViewStore((s) => s.wireframe);
  const gizmoMode = useViewStore((s) => s.gizmoMode);
  const toggleShellXray = useViewStore((s) => s.toggleShellXray);
  const toggleWireframe = useViewStore((s) => s.toggleWireframe);
  const setGizmoMode = useViewStore((s) => s.setGizmoMode);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={toggleShellXray}
        aria-pressed={shellXray}
        className={`flex h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-medium shadow-lg backdrop-blur ${
          shellXray ? 'bg-slate-800 text-white' : 'bg-white/90 text-slate-600 hover:bg-slate-100'
        }`}
      >
        {t('view.xray')}
      </button>
      <button
        onClick={toggleWireframe}
        aria-pressed={wireframe}
        className={`flex h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-medium shadow-lg backdrop-blur ${
          wireframe ? 'bg-slate-800 text-white' : 'bg-white/90 text-slate-600 hover:bg-slate-100'
        }`}
      >
        {t('view.wireframe')}
      </button>
      <button
        onClick={() => setGizmoMode('translate')}
        aria-pressed={gizmoMode === 'translate'}
        className={`flex h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-medium shadow-lg backdrop-blur ${
          gizmoMode === 'translate' ? 'bg-slate-800 text-white' : 'bg-white/90 text-slate-600 hover:bg-slate-100'
        }`}
      >
        {t('view.translate')}
      </button>
      <button
        onClick={() => setGizmoMode('rotate')}
        aria-pressed={gizmoMode === 'rotate'}
        className={`flex h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-medium shadow-lg backdrop-blur ${
          gizmoMode === 'rotate' ? 'bg-slate-800 text-white' : 'bg-white/90 text-slate-600 hover:bg-slate-100'
        }`}
      >
        {t('view.rotate')}
      </button>
    </div>
  );
}
