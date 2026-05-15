<script setup lang="ts">
import AppWindowTitlebarControls from '@/components/shell/AppWindowTitlebarControls.vue';
import type { WindowTitlebarSegment } from '@/constants/window-titlebar';
import { bindTauriWindowDragRegion } from '@/composables/bindTauriWindowDragRegion';
import type { ComponentPublicInstance } from 'vue';
import { onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

/** 设置独立窗：不展示最大化键（仍可通过系统菜单/双击标题栏最大化，依平台而定） */
const settingsWindowTitlebarSegments: WindowTitlebarSegment[] = ['minimize', 'close'];

let detachTitleBarPointerDrag: (() => void) | undefined;

function resolveBarHostElement(
  el: Element | ComponentPublicInstance | null,
): HTMLElement | null {
  if (el == null) return null;
  if (el instanceof HTMLElement) return el;
  const node = (el as ComponentPublicInstance).$el;
  return node instanceof HTMLElement ? node : null;
}

function setBarDragHostRef(el: Element | ComponentPublicInstance | null) {
  detachTitleBarPointerDrag?.();
  detachTitleBarPointerDrag = undefined;
  const host = resolveBarHostElement(el);
  if (!host) return;

  detachTitleBarPointerDrag = bindTauriWindowDragRegion(host);
}

onUnmounted(() => detachTitleBarPointerDrag?.());
</script>

<template>
  <v-app-bar
    :ref="setBarDragHostRef"
    class="shell-glass-app-bar app-settings-bar-drag-root"
    color="surface"
    density="compact"
    flat
    elevation="0"
  >
    <template #title>
      <div class="app-settings-bar-title min-w-0 d-flex align-center flex-grow-1">
        <span class="text-subtitle-1 font-weight-medium text-truncate">
          {{ t('nav.settingsHeader') }}
        </span>
      </div>
    </template>
    <template #append>
      <div class="d-flex align-center" data-tauri-drag-region-exclude>
        <AppWindowTitlebarControls embedded :segments="settingsWindowTitlebarSegments" />
      </div>
    </template>
  </v-app-bar>
</template>

<style scoped>
.app-settings-bar-drag-root :deep(.v-toolbar__content) {
  align-items: center;
  flex-wrap: nowrap;
}

.app-settings-bar-title {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
