export const SETTINGS_TABS = ['general', 'appearance', 'updates', 'logs', 'about'] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const SETTINGS_SECTIONS: { id: SettingsTab; labelKey: string }[] = [
  { id: 'general', labelKey: 'settings.sections.general' },
  { id: 'appearance', labelKey: 'settings.sections.appearance' },
  { id: 'updates', labelKey: 'settings.sections.updates' },
  { id: 'logs', labelKey: 'settings.sections.logs' },
  { id: 'about', labelKey: 'settings.sections.about' },
];

/** 侧栏与首页快捷入口等共用 */
export const SETTINGS_SECTION_ICONS: Record<SettingsTab, string> = {
  general: 'mdi-tune-vertical',
  appearance: 'mdi-palette-outline',
  updates: 'mdi-update',
  logs: 'mdi-text-search',
  about: 'mdi-information-outline',
};

export function isSettingsTab(value: string): value is SettingsTab {
  return (SETTINGS_TABS as readonly string[]).includes(value);
}

export function normalizeSettingsTab(tab: string | undefined | null): SettingsTab {
  if (tab && isSettingsTab(tab)) return tab;
  return 'general';
}

/** 子路由 name，如 `settings-appearance` */
export function settingsRouteName(tab: SettingsTab): string {
  return `settings-${tab}`;
}

/** 路由 hash 不含 `#` */
export function hashToSettingsTab(hash: string | undefined): SettingsTab | null {
  if (!hash) return null;
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  return isSettingsTab(id) ? id : null;
}

/** 从子路由 name 解析分区，非设置子路由返回 null */
export function routeNameToSettingsTab(name: string | undefined | null): SettingsTab | null {
  if (!name || !name.startsWith('settings-')) return null;
  const id = name.slice('settings-'.length);
  return isSettingsTab(id) ? id : null;
}
