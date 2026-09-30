import { readonly, ref } from 'vue';
import { MESSAGES, type MessageKey } from './messages';
import { translate, type Lang, type Params } from './logic/translate';

const STORAGE_KEY = 'mekong-erp-vue:lang';

function readStored(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'vi' ? stored : null;
  } catch {
    return null;
  }
}

// Vietnamese unless the visitor has chosen otherwise: the browser's own language is not
// consulted, so the default holds on a fresh profile (as in the React app).
const lang = ref<Lang>(readStored() ?? 'vi');

function setLang(next: Lang): void {
  lang.value = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage unavailable: the choice just won't outlive the page.
  }
}

/** A small typed translator. Reading `lang` inside `t` is what re-renders on a switch. */
export function useI18n() {
  function t(key: MessageKey, params?: Params): string {
    return translate(MESSAGES[lang.value], lang.value, key, params);
  }
  return { lang: readonly(lang), setLang, t };
}

document.documentElement.lang = lang.value;
