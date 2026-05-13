import { SETTINGS_STORAGE_KEY } from '@/constants/settings-persist';
import {
  buildI18nMessages,
  normalizePersistedUiLanguage,
  resolveI18nLocaleCode,
  resolveVuetifyLocaleKey,
  type UiLanguage,
} from '@/constants/ui-languages';
import { createI18n } from 'vue-i18n';

export type { UiLanguage };

export {
  resolveI18nLocaleCode as resolveI18nLocale,
  resolveVuetifyLocaleKey as resolveVuetifyLocale,
};

function readInitialUiLanguage(): UiLanguage {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return 'system';
    const parsed = JSON.parse(raw) as { uiLanguage?: string };
    return normalizePersistedUiLanguage(parsed.uiLanguage);
  } catch {
    /* ignore */
  }
  return 'system';
}

const initialUiLanguage = readInitialUiLanguage();
const initialI18nLocale = resolveI18nLocaleCode(initialUiLanguage);

export const i18n = createI18n({
  legacy: false,
  locale: initialI18nLocale,
  fallbackLocale: 'en',
  messages: buildI18nMessages(),
});
