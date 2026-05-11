import {
  DEFAULT_DRAWER_LOCATION,
  isDrawerLocation,
  type DrawerLocation,
} from '@/constants/drawer-location';
import {
  DEFAULT_APP_BACKGROUND_PRESET_ID,
  isAppBackgroundPresetId,
  type AppBackgroundPresetId,
} from '@/constants/app-background-presets';
import {
  CUSTOM_THEME_PRESET_ID,
  DEFAULT_CUSTOM_THEME_COLORS,
  DEFAULT_THEME_COLOR_PRESET_ID,
  isThemeColorPresetId,
  type ThemeColorPair,
  type ThemeColorPresetId,
  type ThemeColorSchemePair,
} from '@/constants/theme-color-presets';
import { SETTINGS_STORAGE_KEY } from '@/constants/settings-persist';
import { normalizePersistedUiLanguage, type UiLanguage } from '@/constants/ui-languages';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type { AppBackgroundPresetId };

export type { ThemeColorPair, ThemeColorPresetId, ThemeColorSchemePair };

export type { UiLanguage };

export type { DrawerLocation };

export type ColorScheme = 'light' | 'dark' | 'system';

/** 顶栏关闭键：隐藏到托盘 / 退出应用 */
export type CloseBehavior = 'tray' | 'quit';

export type UpdateChannel = 'stable' | 'beta';

function isCloseBehavior(v: unknown): v is CloseBehavior {
  return v === 'tray' || v === 'quit';
}

/** 从持久化或旧字段 `minimizeToTray` 解析 */
function initialCloseBehavior(snap: Partial<PersistedSettings>): CloseBehavior {
  if (isCloseBehavior(snap.closeBehavior)) return snap.closeBehavior;
  const legacy = snap as { minimizeToTray?: boolean };
  if (legacy.minimizeToTray === true) return 'tray';
  return 'quit';
}

function isHex6(s: unknown): s is string {
  return typeof s === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s);
}

function normalizeThemeColorPair(raw: unknown, fallback: ThemeColorPair): ThemeColorPair {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const o = raw as Record<string, unknown>;
  return {
    primary: isHex6(o.primary) ? o.primary : fallback.primary,
    secondary: isHex6(o.secondary) ? o.secondary : fallback.secondary,
  };
}

function normalizeCustomThemeColors(raw: unknown): ThemeColorSchemePair {
  const fb = DEFAULT_CUSTOM_THEME_COLORS;
  if (!raw || typeof raw !== 'object') {
    return { light: { ...fb.light }, dark: { ...fb.dark } };
  }
  const o = raw as Record<string, unknown>;
  return {
    light: normalizeThemeColorPair(o.light, fb.light),
    dark: normalizeThemeColorPair(o.dark, fb.dark),
  };
}

type PersistedSettings = {
  colorScheme: ColorScheme;
  /**
   * 退出前是否显示 Vue 确认框；默认 true，不在设置页暴露，仅「不再提醒」写为 false。
   */
  confirmBeforeClose: boolean;
  /** 顶栏关闭键行为 */
  closeBehavior: CloseBehavior;
  defaultDryRun: boolean;
  autoCheckUpdates: boolean;
  updateChannel: UpdateChannel;
  uiLanguage: UiLanguage;
  themeColorPreset: ThemeColorPresetId;
  customThemeColors: ThemeColorSchemePair;
  drawerLocation: DrawerLocation;
  /** AppBar 下方访问历史标签条 */
  showVisitedTabBar: boolean;
  appBackgroundPreset: AppBackgroundPresetId;
  /** Tauri 下为系统绝对路径；浏览器预览用 `customBackgroundObjectUrl` */
  customAppBackgroundPath: string;
};

function load(): Partial<PersistedSettings> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedSettings>;
  } catch {
    return {};
  }
}

function save(state: PersistedSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
}

export const useSettingsStore = defineStore('settings', () => {
  const snap = load();

  const colorScheme = ref<ColorScheme>(snap.colorScheme ?? 'system');
  const confirmBeforeClose = ref(snap.confirmBeforeClose !== false);
  const closeBehavior = ref<CloseBehavior>(initialCloseBehavior(snap));
  const defaultDryRun = ref(snap.defaultDryRun ?? true);
  /** 仅内存；正式版由 Tauri / 引擎写入应用数据目录，不写入 localStorage */
  const curseForgeApiKey = ref('');
  const autoCheckUpdates = ref(snap.autoCheckUpdates ?? true);
  const updateChannel = ref<UpdateChannel>(snap.updateChannel ?? 'stable');
  const uiLanguage = ref<UiLanguage>(normalizePersistedUiLanguage(snap.uiLanguage));
  const themeColorPreset = ref<ThemeColorPresetId>(
    snap.themeColorPreset && isThemeColorPresetId(snap.themeColorPreset)
      ? snap.themeColorPreset
      : DEFAULT_THEME_COLOR_PRESET_ID,
  );
  const customThemeColors = ref<ThemeColorSchemePair>(
    normalizeCustomThemeColors(snap.customThemeColors),
  );
  const drawerLocation = ref<DrawerLocation>(
    snap.drawerLocation && isDrawerLocation(snap.drawerLocation)
      ? snap.drawerLocation
      : DEFAULT_DRAWER_LOCATION,
  );
  const showVisitedTabBar = ref(snap.showVisitedTabBar !== false);
  const appBackgroundPreset = ref<AppBackgroundPresetId>(
    snap.appBackgroundPreset && isAppBackgroundPresetId(snap.appBackgroundPreset)
      ? snap.appBackgroundPreset
      : DEFAULT_APP_BACKGROUND_PRESET_ID,
  );
  const customAppBackgroundPath = ref(
    typeof snap.customAppBackgroundPath === 'string' ? snap.customAppBackgroundPath : '',
  );
  /** 非 Tauri（如纯 Vite）下选图后的 blob URL，不入库 */
  const customBackgroundObjectUrl = ref('');

  function revokeCustomBackgroundObjectUrl() {
    if (customBackgroundObjectUrl.value) {
      URL.revokeObjectURL(customBackgroundObjectUrl.value);
      customBackgroundObjectUrl.value = '';
    }
  }

  function clearCustomAppBackground() {
    revokeCustomBackgroundObjectUrl();
    customAppBackgroundPath.value = '';
  }

  function setCustomThemeColor(
    mode: 'light' | 'dark',
    role: 'primary' | 'secondary',
    value: string,
  ) {
    const normalized = /^#[0-9A-Fa-f]{6}$/i.test(value)
      ? `#${value.slice(1).toLowerCase()}`
      : customThemeColors.value[mode][role];
    customThemeColors.value = {
      ...customThemeColors.value,
      [mode]: { ...customThemeColors.value[mode], [role]: normalized },
    };
    themeColorPreset.value = CUSTOM_THEME_PRESET_ID;
  }

  watch(
    () =>
      ({
        colorScheme: colorScheme.value,
        confirmBeforeClose: confirmBeforeClose.value,
        closeBehavior: closeBehavior.value,
        defaultDryRun: defaultDryRun.value,
        autoCheckUpdates: autoCheckUpdates.value,
        updateChannel: updateChannel.value,
        uiLanguage: uiLanguage.value,
        themeColorPreset: themeColorPreset.value,
        customThemeColors: customThemeColors.value,
        drawerLocation: drawerLocation.value,
        showVisitedTabBar: showVisitedTabBar.value,
        appBackgroundPreset: appBackgroundPreset.value,
        customAppBackgroundPath: customAppBackgroundPath.value,
      }) satisfies PersistedSettings,
    (payload) => save(payload),
    { deep: true },
  );

  return {
    colorScheme,
    confirmBeforeClose,
    closeBehavior,
    defaultDryRun,
    curseForgeApiKey,
    autoCheckUpdates,
    updateChannel,
    uiLanguage,
    themeColorPreset,
    customThemeColors,
    setCustomThemeColor,
    drawerLocation,
    showVisitedTabBar,
    appBackgroundPreset,
    customAppBackgroundPath,
    customBackgroundObjectUrl,
    revokeCustomBackgroundObjectUrl,
    clearCustomAppBackground,
  };
});
