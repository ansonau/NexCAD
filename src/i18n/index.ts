import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import zh from './zh.json';

const STORAGE_KEY = 'nexcad-lang';
// ponytail: node 測試環境無 localStorage（例如 actions.ts 被非元件模組測試 import 時），
// 用 typeof 守衛避免整個 i18n 初始化炸掉；瀏覽器環境行為不變。
const storage =
  typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' ? localStorage : undefined;

void i18n.use(initReactI18next).init({
  resources: { zh: { translation: zh }, en: { translation: en } },
  lng: storage?.getItem(STORAGE_KEY) ?? 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => storage?.setItem(STORAGE_KEY, lng));

export default i18n;
