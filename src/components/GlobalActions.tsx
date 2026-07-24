import { HelpCircle, Settings, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const controlClass =
  'flex h-11 min-w-11 items-center justify-center rounded-full border border-line bg-white px-2.5 text-[12px] font-semibold text-ink-2 shadow-panel transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

export function GlobalActions() {
  const { t, i18n } = useTranslation();
  const [popover, setPopover] = useState<'help' | 'settings' | null>(null);
  const language = i18n.language === 'en' ? 'en' : 'zh';

  return (
    <div className="relative flex items-center justify-end gap-2">
      <button
        type="button"
        className={controlClass}
        aria-label={t('view.help')}
        aria-expanded={popover === 'help'}
        onClick={() => setPopover((value) => (value === 'help' ? null : 'help'))}
      >
        <HelpCircle size={16} strokeWidth={1.9} />
      </button>
      <select
        className={`${controlClass} cursor-pointer pr-6`}
        aria-label={t('view.language')}
        value={language}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
      >
        <option value="zh">繁中</option>
        <option value="en">EN</option>
      </select>
      <button
        type="button"
        className={controlClass}
        aria-label={t('view.settings')}
        aria-expanded={popover === 'settings'}
        onClick={() => setPopover((value) => (value === 'settings' ? null : 'settings'))}
      >
        <Settings size={16} strokeWidth={1.9} />
      </button>
      <button type="button" className={`${controlClass} bg-slate-800 text-white hover:text-white`} aria-label={t('view.user')}>
        <UserRound size={16} strokeWidth={1.9} />
      </button>
      {popover && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-line bg-white/95 p-3 text-left shadow-pop backdrop-blur-xl">
          <p className="text-[13px] font-semibold text-ink">
            {popover === 'help' ? t('view.helpTitle') : t('view.settingsTitle')}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
            {popover === 'help' ? t('view.helpHint') : t('view.settingsHint')}
          </p>
        </div>
      )}
    </div>
  );
}
