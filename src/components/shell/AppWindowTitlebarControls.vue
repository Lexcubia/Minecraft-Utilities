<script setup lang="ts">
import {
  DEFAULT_WINDOW_TITLEBAR_SEGMENTS,
  isWindowTitlebarSlotSegment,
  type WindowTitlebarSegment,
} from '@/constants/window-titlebar';
import { shellWindowControlKey } from '@/shell/shell-window-context';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** 置于顶栏/侧栏内：与相邻控件间距 */
    embedded?: boolean;
    /** 纵向排列（窄侧栏） */
    stacked?: boolean;
    /**
     * 从左到右的片段序列：内置键或 `{ slot: 'x' }`（父组件提供 `#x`）。
     * 可任意重排；可插入多个 slot 段。
     */
    segments?: WindowTitlebarSegment[];
  }>(),
  {
    embedded: false,
    stacked: false,
    segments: () => [...DEFAULT_WINDOW_TITLEBAR_SEGMENTS],
  },
);

const shellWindow = inject(shellWindowControlKey, null);

const isDesktop = computed(() => isTauriRuntime());

const showsMaximize = computed(() => props.segments.includes('maximize'));

const isMaximized = ref(false);

let unlistenResize: (() => void) | undefined;

async function syncMaximized() {
  if (!isDesktop.value || !showsMaximize.value) return;
  try {
    isMaximized.value = await getCurrentWindow().isMaximized();
  } catch {
    /* webview 未就绪等 */
  }
}

function onMinimize() {
  if (shellWindow) void shellWindow.minimizeWindow();
  else void getCurrentWindow().minimize();
}

function onToggleMaximize() {
  void (async () => {
    await getCurrentWindow().toggleMaximize();
    await syncMaximized();
  })();
}

function onClose() {
  if (shellWindow) void shellWindow.onCloseButton();
  else void getCurrentWindow().close();
}

function segmentRowKey(segment: WindowTitlebarSegment, index: number): string {
  return isWindowTitlebarSlotSegment(segment)
    ? `slot:${segment.slot}:${index}`
    : `${segment}:${index}`;
}

onMounted(() => {
  if (!isDesktop.value || !showsMaximize.value) return;
  void (async () => {
    await syncMaximized();
    unlistenResize = await getCurrentWindow().onResized(() => {
      void syncMaximized();
    });
  })();
});

onUnmounted(() => {
  unlistenResize?.();
});
</script>

<template>
  <div
    v-if="isDesktop"
    class="app-window-titlebar-controls flex-shrink-0"
    :class="{
      'app-window-titlebar-controls--embedded': props.embedded,
      'app-window-titlebar-controls--stacked': props.stacked,
    }"
  >
    <template v-for="(segment, index) in props.segments" :key="segmentRowKey(segment, index)">
      <v-btn
        v-if="segment === 'minimize'"
        icon
        size="x-small"
        density="compact"
        variant="text"
        class="app-window-titlebar-controls__btn"
        :aria-label="t('nav.windowMinimize')"
        @click="onMinimize"
      >
        <v-icon icon="mdi-window-minimize" size="18" />
      </v-btn>
      <v-btn
        v-else-if="segment === 'maximize'"
        icon
        size="x-small"
        density="compact"
        variant="text"
        class="app-window-titlebar-controls__btn"
        :aria-label="isMaximized ? t('nav.windowRestore') : t('nav.windowMaximize')"
        @click="onToggleMaximize"
      >
        <v-icon
          :icon="isMaximized ? 'mdi-window-restore' : 'mdi-window-maximize'"
          size="18"
        />
      </v-btn>
      <v-btn
        v-else-if="segment === 'close'"
        icon
        size="x-small"
        density="compact"
        variant="text"
        class="app-window-titlebar-controls__btn app-window-titlebar-controls__btn--close"
        :aria-label="t('nav.windowClose')"
        @click="onClose"
      >
        <v-icon icon="mdi-close" size="18" />
      </v-btn>
      <slot v-else-if="isWindowTitlebarSlotSegment(segment)" :name="segment.slot" />
    </template>
  </div>
</template>

<style scoped>
.app-window-titlebar-controls {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 0;
  margin-inline-start: 6px;
}

.app-window-titlebar-controls--embedded {
  margin-inline-start: 0;
}

.app-window-titlebar-controls--stacked {
  flex-direction: column;
  gap: 2px;
}

.app-window-titlebar-controls__btn {
  min-width: 30px !important;
  width: 30px !important;
  height: 30px !important;
}

.app-window-titlebar-controls__btn--close:hover,
.app-window-titlebar-controls__btn--close:focus-visible {
  color: rgb(var(--v-theme-error)) !important;
}
</style>
