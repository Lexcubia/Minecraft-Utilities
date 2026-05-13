import {
  DEFAULT_UI_FONT_PRESET_ID,
  isUiFontPresetId,
  type UiFontPresetId,
} from '@/constants/ui-font-presets';
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
import {
  SETTINGS_PERSIST_BROADCAST_EVENT,
  SETTINGS_STORAGE_KEY,
} from '@/constants/settings-persist';
import { normalizePersistedUiLanguage, type UiLanguage } from '@/constants/ui-languages';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
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

export type { UiFontPresetId };

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
  /** 界面 UI 字体预设（`html[data-app-font]`） */
  uiFontPreset: UiFontPresetId;
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

let persistDiskInFlight = false;
let persistDiskQueuedJson: string | null = null;
let persistDiskLastCommittedJson: string | null = null;

async function flushPersistDiskQueue() {
  if (!isTauriRuntime() || persistDiskInFlight) return;
  persistDiskInFlight = true;
  try {
    while (persistDiskQueuedJson !== null) {
      const json = persistDiskQueuedJson;
      persistDiskQueuedJson = null;
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('user_data_write_app_settings', { json });
        persistDiskLastCommittedJson = json;
      } catch (e) {
        // 写盘失败时保留最新 payload，等待下一次变更或显式 flush 重试。
        persistDiskQueuedJson = json;
        console.warn('[settings] write app-settings to disk failed', e);
        break;
      }
    }
  } finally {
    persistDiskInFlight = false;
    if (persistDiskQueuedJson !== null) void flushPersistDiskQueue();
  }
}

function schedulePersistDisk(json: string) {
  if (!isTauriRuntime()) return;
  if (json === persistDiskLastCommittedJson && persistDiskQueuedJson === null) return;
  persistDiskQueuedJson = json;
  void flushPersistDiskQueue();
}

/** 跨 Webview 同步：立即广播，避免与「从磁盘重读」等路径竞态导致 UI 回弹。 */
function scheduleBroadcastPersisted(json: string) {
  if (!isTauriRuntime()) return;
  void (async () => {
    const { emit } = await import('@tauri-apps/api/event');
    await emit(SETTINGS_PERSIST_BROADCAST_EVENT, { json });
  })();
}

function save(state: PersistedSettings): void {
  const json = JSON.stringify(state);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SETTINGS_STORAGE_KEY, json);
  }
  scheduleBroadcastPersisted(json);
  schedulePersistDisk(json);
}

export const useSettingsStore = defineStore('settings', () => {
  const colorScheme = ref<ColorScheme>('system');
  const confirmBeforeClose = ref(true);
  const closeBehavior = ref<CloseBehavior>('quit');
  const defaultDryRun = ref(true);
  /** 仅内存；CurseForge Key 不写入持久化 */
  const curseForgeApiKey = ref('');
  const autoCheckUpdates = ref(true);
  const updateChannel = ref<UpdateChannel>('stable');
  const uiLanguage = ref<UiLanguage>('system');
  const themeColorPreset = ref<ThemeColorPresetId>(DEFAULT_THEME_COLOR_PRESET_ID);
  const customThemeColors = ref<ThemeColorSchemePair>(normalizeCustomThemeColors(undefined));
  const drawerLocation = ref<DrawerLocation>(DEFAULT_DRAWER_LOCATION);
  const showVisitedTabBar = ref(true);
  const appBackgroundPreset = ref<AppBackgroundPresetId>(DEFAULT_APP_BACKGROUND_PRESET_ID);
  const customAppBackgroundPath = ref('');
  /** 非 Tauri（如纯 Vite）下选图后的 blob URL，不入库 */
  const customBackgroundObjectUrl = ref('');
  const uiFontPreset = ref<UiFontPresetId>(DEFAULT_UI_FONT_PRESET_ID);

  let applyingSnapshot = false;

  function applySnapshotInner(snap: Partial<PersistedSettings>) {
    colorScheme.value = snap.colorScheme ?? 'system';
    confirmBeforeClose.value = snap.confirmBeforeClose !== false;
    closeBehavior.value = initialCloseBehavior(snap);
    defaultDryRun.value = snap.defaultDryRun ?? true;
    autoCheckUpdates.value = snap.autoCheckUpdates ?? true;
    updateChannel.value = snap.updateChannel ?? 'stable';
    uiLanguage.value = normalizePersistedUiLanguage(snap.uiLanguage);
    themeColorPreset.value =
      snap.themeColorPreset && isThemeColorPresetId(snap.themeColorPreset)
        ? snap.themeColorPreset
        : DEFAULT_THEME_COLOR_PRESET_ID;
    customThemeColors.value = normalizeCustomThemeColors(snap.customThemeColors);
    drawerLocation.value =
      snap.drawerLocation && isDrawerLocation(snap.drawerLocation)
        ? snap.drawerLocation
        : DEFAULT_DRAWER_LOCATION;
    showVisitedTabBar.value = snap.showVisitedTabBar !== false;
    appBackgroundPreset.value =
      snap.appBackgroundPreset && isAppBackgroundPresetId(snap.appBackgroundPreset)
        ? snap.appBackgroundPreset
        : DEFAULT_APP_BACKGROUND_PRESET_ID;
    customAppBackgroundPath.value =
      typeof snap.customAppBackgroundPath === 'string' ? snap.customAppBackgroundPath : '';
    uiFontPreset.value =
      snap.uiFontPreset && isUiFontPresetId(snap.uiFontPreset)
        ? snap.uiFontPreset
        : DEFAULT_UI_FONT_PRESET_ID;
  }

  function applySnapshot(snap: Partial<PersistedSettings>) {
    applyingSnapshot = true;
    try {
      applySnapshotInner(snap);
    } finally {
      applyingSnapshot = false;
    }
  }

  applySnapshot(load());

  function collectPersistedPayload(): PersistedSettings {
    return {
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
      uiFontPreset: uiFontPreset.value,
    };
  }

  function serializePersistedPayload(): string {
    return JSON.stringify(collectPersistedPayload());
  }

  function hydrateFromDisk() {
    applySnapshot(load());
  }

  function hydrateFromRemoteJson(json: string) {
    try {
      const parsed = JSON.parse(json) as Partial<PersistedSettings>;
      applySnapshot(parsed);
      if (typeof localStorage !== 'undefined') {
        const persisted = JSON.stringify(collectPersistedPayload());
        localStorage.setItem(SETTINGS_STORAGE_KEY, persisted);
      }
    } catch {
      /* 忽略损坏的 payload */
    }
  }

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
    [
      colorScheme,
      confirmBeforeClose,
      closeBehavior,
      defaultDryRun,
      autoCheckUpdates,
      updateChannel,
      uiLanguage,
      themeColorPreset,
      customThemeColors,
      drawerLocation,
      showVisitedTabBar,
      appBackgroundPreset,
      customAppBackgroundPath,
      uiFontPreset,
    ],
    () => {
      if (applyingSnapshot) return;
      save(collectPersistedPayload());
    },
    /** 与 `applySnapshot` / `hydrateFromRemoteJson` 同步：避免默认 `pre` 刷新时 `applyingSnapshot` 已复位而误触发 `save`→广播→回灌循环 */
    { deep: true, flush: 'sync' },
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
    uiFontPreset,
    revokeCustomBackgroundObjectUrl,
    clearCustomAppBackground,
    hydrateFromDisk,
    hydrateFromRemoteJson,
    serializePersistedPayload,
  };
});

/** 将当前 store 快照立即写入磁盘（退出或隐藏窗口前调用）。 */
export async function flushAppSettingsToDisk(): Promise<void> {
  if (!isTauriRuntime()) return;
  const store = useSettingsStore();
  const raw = store.serializePersistedPayload();
  if (!raw.trim()) return;
  persistDiskQueuedJson = raw;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('user_data_write_app_settings', { json: raw });
    persistDiskLastCommittedJson = raw;
    persistDiskQueuedJson = null;
  } catch (e) {
    console.warn('[settings] flush app-settings to disk failed', e);
  }
}
