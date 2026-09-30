import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import vi from '../locales/vi/common.json';
import en from '../locales/en/common.json';

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { common: vi },
      en: { common: en },
    },
    fallbackLng: 'vi',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    // Vietnamese is the product default (§3 of the plan) — only an explicit
    // in-app switch (persisted to localStorage) should ever change it, never
    // the visitor's browser/OS locale.
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'mekong-erp:lang',
    },
  });

// Keep <html lang> in step with the UI language (WCAG 3.1.1) — the static
// index.html can't know the persisted language.
function syncDocumentLang(language: string | undefined): void {
  document.documentElement.lang = language?.startsWith('en') ? 'en' : 'vi';
}
i18next.on('initialized', () => syncDocumentLang(i18next.language));
i18next.on('languageChanged', syncDocumentLang);

export default i18next;
