<script setup lang="ts">
import AppSnackbarQueue from '@/components/shell/AppSnackbarQueue.vue';
import { resolveI18nLocale, resolveVuetifyLocale } from '@/i18n';
import {
  buildAppRootBackgroundStyle,
  resolveCustomBackgroundDisplayUrl,
} from '@/utils/buildAppRootBackgroundStyle';
import { usePrefersColorSchemeDark } from '@/composables/usePrefersColorSchemeDark';
import { useSettingsStore } from '@/stores/settings';
import { APP_VERSION } from '@/constants/app-meta';
import { TRAY_MENU_WEBVIEW_LABEL } from '@/constants/tray-menu';
import {
  APP_LOG_BROADCAST_EVENT,
  APP_LOG_CLEAR_EVENT,
  APP_LOG_SNAPSHOT_EVENT,
  APP_LOG_SYNC_REQUEST_EVENT,
} from '@/constants/app-log-sync';
import { SETTINGS_PERSIST_BROADCAST_EVENT, SETTINGS_STORAGE_KEY } from '@/constants/settings-persist';
import {
  CUSTOM_THEME_PRESET_ID,
  usesAccentControlGradient,
} from '@/constants/theme-color-presets';
import { DEFAULT_UI_FONT_PRESET_ID, isUiFontPresetId } from '@/constants/ui-font-presets';
import { applyVuetifyThemeColors } from '@/utils/applyVuetifyThemeColors';
import { appLog } from '@/utils/appLog';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { useAppLogStore, type AppLogEntry } from '@/stores/app-log';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useLocale, useTheme } from 'vuetify';

const settings = useSettingsStore();
const prefersDark = usePrefersColorSchemeDark();
const theme = useTheme();
const { locale } = useI18n();
const vuetifyLocale = useLocale();
const router = useRouter();

let unlistenSettingsNavigate: UnlistenFn | undefined;
let unlistenSettingsPersistBroadcast: UnlistenFn | undefined;
let unlistenAppLogBroadcast: UnlistenFn | undefined;
let unlistenAppLogSnapshot: UnlistenFn | undefined;
let unlistenAppLogClear: UnlistenFn | undefined;
let unlistenAppLogSyncRequest: UnlistenFn | undefined;

function onStoragePersist(e: StorageEvent) {
  if (isTauriRuntime()) return;
  if (e.storageArea !== localStorage) return;
  if (e.key !== SETTINGS_STORAGE_KEY) return;
  if (typeof e.newValue !== 'string' || !e.newValue.trim()) return;
  settings.hydrateFromRemoteJson(e.newValue);
}

const resolvedDark = computed(() => {
  if (settings.colorScheme === 'dark') return true;
  if (settings.colorScheme === 'light') return false;
  return prefersDark.value;
});

const customBackgroundDisplayUrl = computed(() =>
  resolveCustomBackgroundDisplayUrl({
    customAppBackgroundPath: settings.customAppBackgroundPath,
    customBackgroundObjectUrl: settings.customBackgroundObjectUrl,
  }),
);

const appBackgroundStyle = computed(() =>
  buildAppRootBackgroundStyle(settings.appBackgroundPreset, customBackgroundDisplayUrl.value),
);

const accentGradientActive = computed(() => usesAccentControlGradient(settings.themeColorPreset));

const isTrayMenuWebview = computed(
  () => isTauriRuntime() && WebviewWindow.getCurrent().label === TRAY_MENU_WEBVIEW_LABEL,
);

watch(
  resolvedDark,
  (dark) => {
    void theme.change(dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
  },
  { immediate: true },
);

function applyUiLocales() {
  locale.value = resolveI18nLocale(settings.uiLanguage);
  vuetifyLocale.current.value = resolveVuetifyLocale(settings.uiLanguage);
}

watch(() => settings.uiLanguage, applyUiLocales, { immediate: true });

watch(
  () => settings.uiFontPreset,
  (preset) => {
    document.documentElement.dataset.appFont = isUiFontPresetId(preset)
      ? preset
      : DEFAULT_UI_FONT_PRESET_ID;
  },
  { immediate: true },
);

watch(
  () => settings.appBackgroundPreset,
  (preset) => {
    document.documentElement.dataset.appBgPreset = preset;
  },
  { immediate: true },
);

watch(
  () => [settings.themeColorPreset, settings.customThemeColors] as const,
  () => {
    applyVuetifyThemeColors(
      theme,
      settings.themeColorPreset,
      settings.themeColorPreset === CUSTOM_THEME_PRESET_ID
        ? { ...settings.customThemeColors }
        : undefined,
    );
  },
  { immediate: true, deep: true },
);

function onSystemLanguageChange() {
  if (settings.uiLanguage === 'system') applyUiLocales();
}

onMounted(async () => {
  window.addEventListener('languagechange', onSystemLanguageChange);
  window.addEventListener('storage', onStoragePersist);

  const logStore = useAppLogStore();

  if (isTauriRuntime()) {
    unlistenSettingsPersistBroadcast = await listen<{ json: string }>(
      SETTINGS_PERSIST_BROADCAST_EVENT,
      (ev) => {
        settings.hydrateFromRemoteJson(ev.payload.json);
      },
    );

    unlistenAppLogBroadcast = await listen<AppLogEntry>(APP_LOG_BROADCAST_EVENT, (ev) => {
      logStore.ingestBroadcast(ev.payload);
    });
    unlistenAppLogSnapshot = await listen<{ entries: AppLogEntry[] }>(
      APP_LOG_SNAPSHOT_EVENT,
      (ev) => {
        logStore.applySnapshot(ev.payload.entries);
      },
    );
    unlistenAppLogClear = await listen(APP_LOG_CLEAR_EVENT, () => {
      logStore.clear();
    });

    if (WebviewWindow.getCurrent().label === 'main') {
      unlistenAppLogSyncRequest = await listen(APP_LOG_SYNC_REQUEST_EVENT, () => {
        void emit(APP_LOG_SNAPSHOT_EVENT, { entries: [...logStore.entries] });
      });
    }

    if (WebviewWindow.getCurrent().label === 'settings') {
      void emit(APP_LOG_SYNC_REQUEST_EVENT, {});
      window.setTimeout(() => void emit(APP_LOG_SYNC_REQUEST_EVENT, {}), 450);
    }
  }

  if (isTauriRuntime() && WebviewWindow.getCurrent().label === 'settings') {
    unlistenSettingsNavigate = await listen<{ path: string }>('settings-navigate', (ev) => {
      void router.push(ev.payload.path);
    });
  }

  appLog('app', 'info', `UI ready (${APP_VERSION})`);
});

onUnmounted(() => {
  window.removeEventListener('languagechange', onSystemLanguageChange);
  window.removeEventListener('storage', onStoragePersist);
  unlistenSettingsNavigate?.();
  unlistenSettingsPersistBroadcast?.();
  unlistenAppLogBroadcast?.();
  unlistenAppLogSnapshot?.();
  unlistenAppLogClear?.();
  unlistenAppLogSyncRequest?.();
});
</script>

<template>
  <v-app
    :class="{
      'app-accent-gradient': accentGradientActive && !isTrayMenuWebview,
      'app-tray-menu-root': isTrayMenuWebview,
    }"
    :style="isTrayMenuWebview ? { background: 'transparent' } : appBackgroundStyle"
  >
    <router-view />
    <AppSnackbarQueue />
  </v-app>
</template>

<style>
.app-tray-menu-root.v-application {
  background: transparent !important;
}

.app-tray-menu-root .v-application__wrap {
  min-height: 0 !important;
  background: transparent !important;
}
</style>
