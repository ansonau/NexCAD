import { Crosshair, Undo2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/documentStore';
import type { AlignTarget } from '../store/documentStore';
import { IconButton } from './ui';

const AXES = [
  { axis: 0 as const, label: 'X' },
  { axis: 1 as const, label: 'Y' },
  { axis: 2 as const, label: 'Z' },
];

const TARGETS: { target: AlignTarget; titleKey: string; hintKey: string; mark: string }[] = [
  { target: 'first', titleKey: 'align.toA', hintKey: 'align.toAHint', mark: 'A' },
  { target: 'second', titleKey: 'align.toB', hintKey: 'align.toBHint', mark: 'B' },
  { target: 'average', titleKey: 'align.average', hintKey: 'align.averageHint', mark: '≈' },
];

export function AlignToolsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const selectionCount = useDocumentStore((s) => s.selection.length);
  const canUndo = useDocumentStore((s) => s.past.length > 0);
  const canAlign = selectionCount >= 2;

  const align = (axis: 0 | 1 | 2, target: AlignTarget) => {
    useDocumentStore.getState().alignSelected(axis, target);
  };

  return (
    <section className="rounded-2xl border border-accent-line bg-white/88 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">{t('align.center')}</h3>
          <p className="text-[11px] text-ink-3">{t('align.inlineHint')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton title={t('align.undo')} onClick={() => useDocumentStore.getState().undo()} disabled={!canUndo} className="h-8 w-8">
            <Undo2 size={14} />
          </IconButton>
          <IconButton title={t('common.close')} onClick={onClose} className="h-8 w-8">
            <X size={14} />
          </IconButton>
        </div>
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-ink-3">{t('align.hint')}</p>
      <p className={`mb-3 text-[12px] font-medium ${canAlign ? 'text-ink-2' : 'text-amber-700'}`}>
        {t(canAlign ? 'align.ready' : 'align.disabled', { count: selectionCount })}
      </p>
      <div className="space-y-2">
        {TARGETS.map(({ target, titleKey, hintKey, mark }) => (
          <div key={target} className="rounded-2xl border border-line bg-white/88 p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-[14px] font-bold text-accent-strong">
                {mark}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-ink">{t(titleKey)}</p>
                <p className="text-[11px] leading-snug text-ink-3">{t(hintKey)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {AXES.map(({ axis, label }) => (
                <button
                  key={`${target}-${label}`}
                  type="button"
                  title={`${t(titleKey)} ${label}`}
                  aria-label={`${t(titleKey)} ${label}`}
                  disabled={!canAlign}
                  onClick={() => align(axis, target)}
                  className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-line bg-white text-[12px] font-semibold text-ink-2 transition-colors hover:border-accent/50 hover:bg-accent-soft hover:text-accent disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <Crosshair size={14} strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
