<script setup lang="ts">
import SettingsDialog from '@/components/settings/SettingsDialog.vue';
import AppShellAppBar from '@/layouts/AppShellAppBar.vue';
import AppShellNavigationDrawer from '@/layouts/AppShellNavigationDrawer.vue';
import AppShellVisitedTabs from '@/layouts/AppShellVisitedTabs.vue';
import { checkInAppUpdate } from '@/composables/useInAppUpdater';
import { usePrefersColorSchemeDark } from '@/composables/usePrefersColorSchemeDark';
import {
  getUiLanguageChoiceIds,
  uiLanguageOptionLabelKey,
  type UiLanguage,
} from '@/constants/ui-languages';
import { shellWindowControlKey, type ShellWindowControl } from '@/shell/shell-window-context';
import { useSettingsStore } from '@/stores/settings';
import { useVisitedPagesStore } from '@/stores/visited-pages';
import { appLog } from '@/utils/appLog';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow, type CloseRequestedEvent } from '@tauri-apps/api/window';
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { routeNameToSettingsTab, type SettingsTab } from '@/views/settings/settings-tabs';
import { useDisplay } from 'vuetify';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { mdAndUp } = useDisplay();
const settings = useSettingsStore();
const visitedPages = useVisitedPagesStore();
const prefersDark = usePrefersColorSchemeDark();

const isEffectivelyDark = computed(() => {
  if (settings.colorScheme === 'dark') return true;
  if (settings.colorScheme === 'light') return false;
  return prefersDark.value;
});

function toggleLightDark() {
  settings.colorScheme = isEffectivelyDark.value ? 'light' : 'dark';
}

const languageChoices = computed(() =>
  getUiLanguageChoiceIds().map((id) => ({
    id,
    label: t(uiLanguageOptionLabelKey(id)),
  })),
);

function setUiLanguage(id: UiLanguage) {
  settings.uiLanguage = id;
}

const isSettings = computed(() => route.path.startsWith('/settings'));

const settingsDialogOpen = ref(false);
const settingsDialogTabOverride = ref<SettingsTab | undefined>(undefined);

const settingsDialogInitialTab = computed<SettingsTab | undefined>(() => {
  if (settingsDialogTabOverride.value !== undefined) return settingsDialogTabOverride.value;
  return routeNameToSettingsTab(route.name as string | undefined) ?? undefined;
});

function openSettingsDialog(tab?: SettingsTab) {
  settingsDialogTabOverride.value = tab;
  settingsDialogOpen.value = true;
}

watch(settingsDialogOpen, (open) => {
  if (!open) settingsDialogTabOverride.value = undefined;
});

const exitConfirmOpen = ref(false);
const exitConfirmDontRemind = ref(false);
let exitConfirmResolve: ((value: { confirmed: boolean; dontRemind: boolean }) => void) | null = null;

function showExitConfirmDialog(): Promise<{ confirmed: boolean; dontRemind: boolean }> {
  exitConfirmDontRemind.value = false;
  return new Promise((resolve) => {
    exitConfirmResolve = resolve;
    exitConfirmOpen.value = true;
  });
}

function finishExitConfirm(confirmed: boolean) {
  const dont = exitConfirmDontRemind.value;
  exitConfirmOpen.value = false;
  exitConfirmResolve?.({ confirmed, dontRemind: confirmed && dont });
  exitConfirmResolve = null;
}

/** 托盘「关闭」等：仅退出，不含「关闭键隐藏到托盘」 */
async function requestAppExit() {
  if (!isTauriRuntime()) return;
  if (settings.confirmBeforeClose) {
    const { confirmed, dontRemind } = await showExitConfirmDialog();
    if (dontRemind) settings.confirmBeforeClose = false;
    if (!confirmed) return;
  }
  await invoke('exit_app');
}

/** 顶栏关闭键 */
async function onCloseButton() {
  if (!isTauriRuntime()) return;
  const w = getCurrentWindow();
  if (settings.closeBehavior === 'tray') {
    await w.hide();
    return;
  }
  if (settings.confirmBeforeClose) {
    const { confirmed, dontRemind } = await showExitConfirmDialog();
    if (dontRemind) settings.confirmBeforeClose = false;
    if (!confirmed) return;
  }
  await invoke('exit_app');
}

async function minimizeWindow() {
  if (!isTauriRuntime()) return;
  await getCurrentWindow().minimize();
}

const shellWindowApi: ShellWindowControl = {
  minimizeWindow,
  onCloseButton,
  requestAppExit,
};
provide(shellWindowControlKey, shellWindowApi);

let unlistenCloseRequested: UnlistenFn | undefined;
let unlistenTrayOpenSettings: UnlistenFn | undefined;
let unlistenTrayRequestExit: UnlistenFn | undefined;

const updateAvailableSnack = ref(false);
const updateAvailableVersion = ref('');

function scheduleStartupInAppUpdateHint() {
  if (!settings.autoCheckUpdates) return;
  window.setTimeout(() => {
    void (async () => {
      const pre = await checkInAppUpdate();
      if (pre.kind !== 'available') return;
      updateAvailableVersion.value = pre.version;
      updateAvailableSnack.value = true;
    })();
  }, 5000);
}

async function syncTrayMenuLabels() {
  if (!isTauriRuntime()) return;
  try {
    await invoke('sync_tray_menu_labels', {
      openMain: t('tray.menuOpenMain'),
      settings: t('tray.menuSettings'),
      close: t('tray.menuClose'),
      tooltip: t('tray.tooltip'),
    });
    appLog('tray', 'debug', 'Tray menu labels synced');
  } catch (e) {
    appLog(
      'tray',
      'warn',
      'sync_tray_menu_labels skipped',
      e instanceof Error ? e.message : String(e),
    );
  }
}

onMounted(async () => {
  if (!isTauriRuntime()) return;
  unlistenCloseRequested = await getCurrentWindow().onCloseRequested(
    async (event: CloseRequestedEvent) => {
      if (settings.closeBehavior === 'tray') {
        event.preventDefault();
        await getCurrentWindow().hide();
        return;
      }
      if (!settings.confirmBeforeClose) return;
      event.preventDefault();
      const { confirmed, dontRemind } = await showExitConfirmDialog();
      if (dontRemind) settings.confirmBeforeClose = false;
      if (confirmed) await invoke('exit_app');
    },
  );
  unlistenTrayOpenSettings = await listen('tray-open-settings', () => {
    openSettingsDialog('general');
  });
  unlistenTrayRequestExit = await listen('tray-request-exit', () => {
    void requestAppExit();
  });
  await syncTrayMenuLabels();
  scheduleStartupInAppUpdateHint();
});

watch(
  () => [settings.uiLanguage, locale.value] as const,
  () => {
    void syncTrayMenuLabels();
  },
);

onUnmounted(() => {
  unlistenCloseRequested?.();
  unlistenTrayOpenSettings?.();
  unlistenTrayRequestExit?.();
});

const drawerOpen = ref(true);
const drawerRail = ref(false);

watch(
  mdAndUp,
  (wide) => {
    if (wide) {
      drawerOpen.value = true;
    } else {
      drawerRail.value = false;
      drawerOpen.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => route.fullPath,
  () => {
    if (!mdAndUp.value) drawerOpen.value = false;
  },
);

function toggleDrawerMobile() {
  drawerOpen.value = !drawerOpen.value;
}

function toggleDrawerDesktop() {
  drawerOpen.value = !drawerOpen.value;
}

function toggleDrawerRail() {
  drawerRail.value = !drawerRail.value;
}

function goBack() {
  if (window.history.length > 1) router.back();
  else void router.push({ name: 'welcome' });
}

function onUpdateAvailableSnackOpenUpdates() {
  updateAvailableSnack.value = false;
  openSettingsDialog('updates');
}
</script>

<template>
  <AppShellNavigationDrawer
    v-model:drawer-open="drawerOpen"
    v-model:drawer-rail="drawerRail"
    :md-and-up="mdAndUp"
    :drawer-location="settings.drawerLocation"
    :is-effectively-dark="isEffectivelyDark"
    :language-choices="languageChoices"
    :current-ui-language="settings.uiLanguage"
    @toggle-light-dark="toggleLightDark"
    @open-settings="openSettingsDialog"
    @set-ui-language="setUiLanguage"
  />

  <AppShellAppBar
    :is-settings="isSettings"
    :drawer-open="drawerOpen"
    :drawer-rail="drawerRail"
    :md-and-up="mdAndUp"
    :is-effectively-dark="isEffectivelyDark"
    :language-choices="languageChoices"
    :current-ui-language="settings.uiLanguage"
    @back="goBack"
    @toggle-drawer-desktop="toggleDrawerDesktop"
    @toggle-drawer-rail="toggleDrawerRail"
    @toggle-drawer-mobile="toggleDrawerMobile"
    @toggle-light-dark="toggleLightDark"
    @open-settings="openSettingsDialog"
    @set-ui-language="setUiLanguage"
  />

  <v-main class="app-shell-main d-flex flex-column">
    <!-- 滚动放在内层，避免 fixed app-bar 盖住 v-main 顶部滚动条轨道 -->
    <div
      class="app-shell-main-scroll"
      :class="{ 'app-shell-main-scroll--with-floating-tabs': settings.showVisitedTabBar }"
    >
      <router-view v-slot="{ Component }">
        <keep-alive :include="visitedPages.shellKeepAliveNames">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
    <!-- 叠在滚动区之上；top 须对齐 Vuetify 为顶栏预留的 padding（否则落在顶栏背后不可见） -->
    <div
      v-if="settings.showVisitedTabBar"
      class="app-shell-main-tabs-floating"
    >
      <AppShellVisitedTabs />
    </div>
  </v-main>

  <SettingsDialog
    v-model="settingsDialogOpen"
    :initial-tab="settingsDialogInitialTab"
  />

  <v-snackbar
    v-model="updateAvailableSnack"
    :timeout="10000"
    location="bottom"
    color="surface-variant"
    elevation="6"
    multi-line
  >
    {{ t('settings.updates.snackUpdateAvailable', { version: updateAvailableVersion }) }}
    <template #actions>
      <v-btn variant="text" color="primary" @click="onUpdateAvailableSnackOpenUpdates">
        {{ t('settings.updates.snackOpenUpdates') }}
      </v-btn>
    </template>
  </v-snackbar>

  <v-dialog
    v-model="exitConfirmOpen"
    max-width="440"
    persistent
    scrim-class="app-exit-dialog-scrim"
    content-class="app-exit-dialog-outer"
  >
    <v-card class="app-exit-dialog-card" rounded="xl" elevation="14">
      <div class="app-exit-dialog-banner d-flex align-center justify-center">
        <v-icon icon="mdi-exit-to-app" size="44" color="white" class="opacity-95" />
      </div>
      <v-card-title class="text-h6 text-center font-weight-semibold pt-6 pb-1 px-6">
        {{ t('window.exitConfirmTitle') }}
      </v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis text-center px-8 pt-2 pb-0">
        {{ t('window.exitConfirmMessage') }}
      </v-card-text>
      <v-card-text class="pt-5 pb-1 px-6">
        <v-checkbox
          v-model="exitConfirmDontRemind"
          density="comfortable"
          color="primary"
          hide-details
          class="app-exit-dialog-checkbox"
          :label="t('window.exitConfirmDontRemind')"
        />
      </v-card-text>
      <v-divider class="border-opacity-25 mx-2" />
      <v-card-actions class="pa-4 gap-3 flex-column flex-sm-row">
        <v-btn
          variant="tonal"
          color="surface-variant"
          size="large"
          rounded="lg"
          class="flex-grow-1 w-100 w-sm-auto"
          @click="finishExitConfirm(false)"
        >
          {{ t('window.exitConfirmCancel') }}
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          size="large"
          rounded="lg"
          class="flex-grow-1 w-100 w-sm-auto"
          @click="finishExitConfirm(true)"
        >
          {{ t('window.exitConfirmOk') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.app-exit-dialog-banner {
  height: 92px;
  background: linear-gradient(
    125deg,
    rgb(var(--v-theme-error)) 0%,
    color-mix(in srgb, rgb(var(--v-theme-error)) 55%, rgb(var(--v-theme-primary))) 55%,
    rgb(var(--v-theme-primary)) 100%
  );
}

.app-exit-dialog-card {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 10%, transparent);
}

:deep(.app-exit-dialog-scrim) {
  backdrop-filter: blur(4px);
}

:deep(.app-exit-dialog-outer) {
  padding: 12px;
}

.app-exit-dialog-checkbox :deep(.v-label) {
  opacity: 0.92;
  font-size: 0.875rem;
}
</style>
