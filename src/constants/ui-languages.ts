import en from '@/locales/en.json';
import zhCN from '@/locales/zh-CN.json';

/** 固定项：系统（跟随 OS 语言，不持久化为具体语种） */
export const UI_LANGUAGE_SYSTEM = 'system' as const;

/**
 * 应用支持的界面语种（唯一配置源）。
 * 新增语种：在此追加一项、增加对应源码 `src/locales/*.json`（打包进前端）、并在 `plugins/vuetify.ts` 注册 Vuetify 文案（若需）。
 */
export const UI_I18N_LOCALES = [
  {
    id: 'zh-CN',
    messages: zhCN,
    /** Vuetify 内置 locale 名 */
    vuetifyLocale: 'zhHans' as const,
  },
  {
    id: 'en',
    messages: en,
    vuetifyLocale: 'en' as const,
  },
] as const;

export type UiAppLocaleId = (typeof UI_I18N_LOCALES)[number]['id'];

export type UiLanguage = typeof UI_LANGUAGE_SYSTEM | UiAppLocaleId;

export type VuetifyAppLocaleKey = (typeof UI_I18N_LOCALES)[number]['vuetifyLocale'];

const localeById = Object.fromEntries(UI_I18N_LOCALES.map((e) => [e.id, e])) as Record<
  UiAppLocaleId,
  (typeof UI_I18N_LOCALES)[number]
>;

export function isUiAppLocaleId(value: string): value is UiAppLocaleId {
  return value in localeById;
}

export function isUiLanguage(value: string): value is UiLanguage {
  return value === UI_LANGUAGE_SYSTEM || isUiAppLocaleId(value);
}

/** 旧版 localStorage 曾使用 `zhHans`，迁移为 `zh-CN`。 */
export function normalizePersistedUiLanguage(raw: string | undefined | null): UiLanguage {
  if (raw == null || raw === '') return UI_LANGUAGE_SYSTEM;
  if (raw === 'zhHans') return 'zh-CN';
  if (raw === UI_LANGUAGE_SYSTEM) return UI_LANGUAGE_SYSTEM;
  if (isUiAppLocaleId(raw)) return raw;
  return UI_LANGUAGE_SYSTEM;
}

/** 语言卡片按钮顺序：系统 + 各注册语种 */
export function getUiLanguageChoiceIds(): readonly UiLanguage[] {
  return [UI_LANGUAGE_SYSTEM, ...UI_I18N_LOCALES.map((l) => l.id)] as const;
}

/** i18n 文案 key：`settings.general.language.opts.${id}` */
export function uiLanguageOptionLabelKey(id: UiLanguage): string {
  return `settings.general.language.opts.${id}`;
}

export function buildI18nMessages(): Record<
  UiAppLocaleId,
  (typeof UI_I18N_LOCALES)[number]['messages']
> {
  return Object.fromEntries(UI_I18N_LOCALES.map((l) => [l.id, l.messages])) as Record<
    UiAppLocaleId,
    (typeof UI_I18N_LOCALES)[number]['messages']
  >;
}

export function getDefaultAppLocaleId(): UiAppLocaleId {
  return UI_I18N_LOCALES[0]?.id ?? 'en';
}

/** 根据浏览器语言匹配已注册的应用语种；无匹配则返回列表首项。 */
export function matchNavigatorToAppLocale(): UiAppLocaleId {
  const nav =
    typeof navigator !== 'undefined' && navigator.language ? navigator.language.toLowerCase() : '';
  if (!nav) return getDefaultAppLocaleId();
  for (const l of UI_I18N_LOCALES) {
    const id = l.id.toLowerCase();
    const base = id.split('-')[0] ?? id;
    if (nav === id || nav.startsWith(`${base}-`) || nav === base) return l.id;
  }
  return getDefaultAppLocaleId();
}

export function resolveI18nLocaleCode(pref: UiLanguage): UiAppLocaleId {
  if (pref === UI_LANGUAGE_SYSTEM) return matchNavigatorToAppLocale();
  return pref;
}

export function resolveVuetifyLocaleKey(pref: UiLanguage): VuetifyAppLocaleKey {
  const code = resolveI18nLocaleCode(pref);
  return localeById[code].vuetifyLocale;
}
