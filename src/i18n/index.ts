import { SETTINGS_STORAGE_KEY } from '@/constants/settings-persist';
import {
  buildI18nMessages,
  normalizePersistedUiLanguage,
  resolveI18nLocaleCode,
  resolveVuetifyLocaleKey,
  UI_I18N_LOCALES,
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

/** Tauri：将用户数据目录下 `locales/<id>.json` 深度合并到内置文案（可覆盖键值）。 */
export async function mergeDiskLocalesIntoI18n(): Promise<void> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;
  const { invoke } = await import('@tauri-apps/api/core');
  for (const l of UI_I18N_LOCALES) {
    const raw = await invoke<string | null>('user_data_read_locale', { id: l.id });
    if (!raw?.trim()) continue;
    try {
      const extra = JSON.parse(raw) as Record<string, unknown>;
      i18n.global.mergeLocaleMessage(l.id, extra);
    } catch {
      /* invalid locale JSON */
    }
  }
}
