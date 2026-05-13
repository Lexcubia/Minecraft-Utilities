<script setup lang="ts">
import AppGlassCard from '@/components/ui/AppGlassCard.vue';
import { TRAY_MENU_WEBVIEW_LABEL } from '@/constants/tray-menu';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { emitTo } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, type CloseRequestedEvent } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

let unlistenClose: (() => void) | undefined;
let unlistenFocus: (() => void) | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

async function hideSelf() {
  if (!isTauriRuntime()) return;
  await getCurrentWindow().hide();
}

async function notifyMain(event: string) {
  await emitTo('main', event, {});
}

async function onOpenMain() {
  await hideSelf();
  await invoke('focus_main_window');
}

async function onOpenSettings() {
  await hideSelf();
  await notifyMain('tray-open-settings');
}

async function onQuit() {
  await hideSelf();
  await notifyMain('tray-request-exit');
}

onMounted(async () => {
  if (!isTauriRuntime() || WebviewWindow.getCurrent().label !== TRAY_MENU_WEBVIEW_LABEL) return;

  document.documentElement.classList.add('tray-menu-html');
  document.body.classList.add('tray-menu-body');
  document.getElementById('app')?.classList.add('tray-menu-mount');

  unlistenClose = await getCurrentWindow().onCloseRequested(async (e: CloseRequestedEvent) => {
    e.preventDefault();
    await hideSelf();
  });

  unlistenFocus = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    if (focused) {
      if (hideTimer !== undefined) {
        clearTimeout(hideTimer);
        hideTimer = undefined;
      }
      return;
    }
    hideTimer = window.setTimeout(() => {
      hideTimer = undefined;
      void hideSelf();
    }, 180);
  });
});

onUnmounted(() => {
  document.documentElement.classList.remove('tray-menu-html');
  document.body.classList.remove('tray-menu-body');
  document.getElementById('app')?.classList.remove('tray-menu-mount');
  unlistenClose?.();
  unlistenFocus?.();
  if (hideTimer !== undefined) clearTimeout(hideTimer);
});
</script>

<template>
  <div class="tray-menu-app d-flex align-center justify-center pa-1">
    <AppGlassCard tag="div" class="tray-menu-card overflow-hidden">
      <div class="tray-menu-header px-3 py-1 app-border-block-end">
        <span class="text-caption font-weight-semibold text-medium-emphasis">
          {{ t('tray.menuTitle') }}
        </span>
      </div>
      <v-list density="compact" class="py-1 tray-menu-list" bg-color="transparent">
        <v-list-item
          class="tray-menu-item mx-1 rounded"
          :title="t('tray.menuOpenMain')"
          prepend-icon="mdi-open-in-app"
          @click="onOpenMain"
        />
        <v-list-item
          class="tray-menu-item mx-1 rounded"
          :title="t('tray.menuSettings')"
          prepend-icon="mdi-cog-outline"
          @click="onOpenSettings"
        />
        <v-divider class="my-1 mx-2 border-opacity-25" />
        <v-list-item
          class="tray-menu-item mx-1 rounded text-error"
          :title="t('tray.menuClose')"
          prepend-icon="mdi-exit-to-app"
          @click="onQuit"
        />
      </v-list>
    </AppGlassCard>
  </div>
</template>

<style scoped>
.tray-menu-app {
  box-sizing: border-box;
  min-height: 100%;
  min-width: 100%;
  background: transparent;
}

.tray-menu-card {
  width: 100%;
  max-width: 100%;
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.22),
    0 0 0 1px var(--app-on-surface-10) inset;
}

.tray-menu-header {
  background: color-mix(in srgb, rgb(var(--v-theme-surface)) 35%, transparent);
}

.tray-menu-list {
  padding-block: 2px !important;
}

.tray-menu-list :deep(.v-list-item) {
  min-height: 32px !important;
  padding-block: 2px !important;
}

.tray-menu-item :deep(.v-list-item__prepend) {
  width: 36px;
}

.tray-menu-item :deep(.v-list-item-title) {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.25;
}

.tray-menu-item :deep(.v-list-item__prepend .v-icon) {
  opacity: 0.92;
  font-size: 1.125rem !important;
}

.tray-menu-item :deep(.v-list-item:not(.v-list-item--active):hover),
.tray-menu-item :deep(.v-list-item:not(.v-list-item--active):focus-visible) {
  background: var(--app-on-surface-09) !important;
}
</style>

<style>
/* 独立 Webview：整窗透明，便于圆角毛玻璃贴托盘 */
html.tray-menu-html,
body.tray-menu-body {
  margin: 0;
  background: transparent !important;
  overflow: hidden;
}

#app.tray-menu-mount {
  background: transparent !important;
}
</style>
