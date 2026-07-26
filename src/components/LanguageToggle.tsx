import { useTranslation } from 'react-i18next';
import { panelClass } from './ui';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'zh' ? 'en' : 'zh';
  return (
    <button
      onClick={() => void i18n.changeLanguage(next)}
      aria-label={next === 'en' ? 'Switch to English' : '切換為中文'}
      className={`flex h-9 cursor-pointer items-center justify-center px-3 text-[12px] font-semibold text-ink-2 transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${panelClass}`}
    >
      {i18n.language === 'zh' ? 'EN' : '中'}
    </button>
  );
}
