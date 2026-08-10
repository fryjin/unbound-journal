import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import jaJP from './locales/ja-JP.json';
import koKR from './locales/ko-KR.json';
import zhHant from './locales/zh-Hant.json';
import { supportedLocales, type SupportedLocale } from './locales';

const localeCodes = new Set<string>(supportedLocales.map((item) => item.code));
const storedLocale = window.localStorage.getItem('unbound-journal.locale');
const initialLocale: SupportedLocale =
  storedLocale && localeCodes.has(storedLocale) ? (storedLocale as SupportedLocale) : 'en';

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: en },
    'ja-JP': { translation: jaJP },
    'ko-KR': { translation: koKR },
    'zh-Hant': { translation: zhHant },
  },
});

document.documentElement.lang = initialLocale;

export default i18n;
