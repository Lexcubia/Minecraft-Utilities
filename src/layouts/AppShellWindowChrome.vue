<script setup lang="ts">
import { shellWindowControlKey } from '@/shell/shell-window-context';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** 置于侧栏底部：去掉与顶栏按钮的间距 */
    embedded?: boolean;
    /** 侧栏 rail 模式：纵向排列以免超出窄宽度 */
    stacked?: boolean;
  }>(),
  { embedded: false, stacked: false },
);

const isDesktop = computed(() => isTauriRuntime());

const shellWindow = inject(shellWindowControlKey, null);

const isMaximized = ref(false);

let unlistenResize: (() => void) | undefined;

async function syncMaximized() {
  if (!isDesktop.value) return;
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

onMounted(() => {
  if (!isDesktop.value) return;
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
    class="app-window-chrome flex-shrink-0"
    :class="{
      'app-window-chrome--embedded': props.embedded,
      'app-window-chrome--stacked': props.stacked,
    }"
  >
    <v-btn
      icon
      size="x-small"
      density="compact"
      variant="text"
      class="app-window-chrome-btn"
      :aria-label="t('nav.windowMinimize')"
      @click="onMinimize"
    >
      <v-icon icon="mdi-window-minimize" size="18" />
    </v-btn>
    <v-btn
      icon
      size="x-small"
      density="compact"
      variant="text"
      class="app-window-chrome-btn"
      :aria-label="isMaximized ? t('nav.windowRestore') : t('nav.windowMaximize')"
      @click="onToggleMaximize"
    >
      <v-icon
        :icon="isMaximized ? 'mdi-window-restore' : 'mdi-window-maximize'"
        size="18"
      />
    </v-btn>
    <v-btn
      icon
      size="x-small"
      density="compact"
      variant="text"
      class="app-window-chrome-btn app-window-chrome-btn--close"
      :aria-label="t('nav.windowClose')"
      @click="onClose"
    >
      <v-icon icon="mdi-close" size="18" />
    </v-btn>
  </div>
</template>

<style scoped>
.app-window-chrome {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 0;
  margin-inline-start: 6px;
}

.app-window-chrome--embedded {
  margin-inline-start: 0;
}

.app-window-chrome--stacked {
  flex-direction: column;
  gap: 2px;
}

.app-window-chrome-btn {
  min-width: 30px !important;
  width: 30px !important;
  height: 30px !important;
}

.app-window-chrome-btn--close:hover,
.app-window-chrome-btn--close:focus-visible {
  color: rgb(var(--v-theme-error)) !important;
}
</style>
