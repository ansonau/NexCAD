import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'zh' ? 'en' : 'zh';
  return (
    <button
      onClick={() => void i18n.changeLanguage(next)}
      aria-label={next === 'en' ? 'Switch to English' : '切換為中文'}
      className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-3 text-sm font-medium text-slate-600 shadow-lg backdrop-blur hover:bg-slate-100"
    >
      {i18n.language === 'zh' ? 'EN' : '中'}
    </button>
  );
}
