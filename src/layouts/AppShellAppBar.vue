<script setup lang="ts">
import AppShellTrayActions from '@/layouts/AppShellTrayActions.vue';
import AppShellWindowChrome from '@/layouts/AppShellWindowChrome.vue';
import { APP_TITLE } from '@/constants/app-meta';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import type { UiLanguage } from '@/constants/ui-languages';
import { SETTINGS_SECTIONS, routeNameToSettingsTab } from '@/views/settings/settings-tabs';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { RouteLocationRaw } from 'vue-router';
import { useRoute } from 'vue-router';
import type { ComponentPublicInstance } from 'vue';
import { computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const route = useRoute();

type AppBarBreadcrumbItem = {
  title: string;
  to?: RouteLocationRaw;
};

const breadcrumbItems = computed((): AppBarBreadcrumbItem[] => {
  const name = route.name as string | undefined;
  if (name === 'welcome') {
    return [{ title: APP_TITLE }];
  }
  const tab = routeNameToSettingsTab(name);
  const items: AppBarBreadcrumbItem[] = [
    { title: t('nav.home'), to: { name: 'welcome' } },
    { title: t('nav.settings'), to: { name: 'settings' } },
  ];
  if (tab) {
    const section = SETTINGS_SECTIONS.find((s) => s.id === tab);
    items.push({ title: section ? t(section.labelKey) : t('nav.settingsHeader') });
  } else {
    items.push({ title: t('nav.settingsHeader') });
  }
  return items;
});

defineProps<{
  isSettings: boolean;
  drawerOpen: boolean;
  drawerRail: boolean;
  mdAndUp: boolean;
  isEffectivelyDark: boolean;
  languageChoices: { id: UiLanguage; label: string }[];
  currentUiLanguage: UiLanguage;
}>();

const emit = defineEmits<{
  back: [];
  'toggle-drawer-desktop': [];
  'toggle-drawer-rail': [];
  'toggle-drawer-mobile': [];
  'toggle-light-dark': [];
  'open-settings': [];
  'set-ui-language': [id: UiLanguage];
}>();

async function onAppBarDblclick(e: MouseEvent) {
  if (!isTauriRuntime()) return;
  const t = e.target;
  if (t instanceof Element && t.closest('[data-tauri-drag-region-exclude]')) return;
  await getCurrentWindow().toggleMaximize();
}

/**
 * WebView2 下仅靠 data-tauri-drag-region 可能无效；在顶栏根节点上对主键 pointerdown 调用 startDragging()。
 * 用 ref 回调绑定到 VAppBar 解析出的真实 HTMLElement（与模板 @pointerdown 是否透传无关）。
 */
let detachTitleBarPointerDrag: (() => void) | undefined;

function resolveAppBarHostElement(
  el: Element | ComponentPublicInstance | null,
): HTMLElement | null {
  if (el == null) return null;
  if (el instanceof HTMLElement) return el;
  const node = (el as ComponentPublicInstance).$el;
  return node instanceof HTMLElement ? node : null;
}

function setAppBarDragHostRef(el: Element | ComponentPublicInstance | null) {
  detachTitleBarPointerDrag?.();
  detachTitleBarPointerDrag = undefined;
  const host = resolveAppBarHostElement(el);
  if (!host || !isTauriRuntime()) return;

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-tauri-drag-region-exclude]')) return;
    void getCurrentWindow().startDragging();
  };

  host.addEventListener('pointerdown', onPointerDown);
  detachTitleBarPointerDrag = () => {
    host.removeEventListener('pointerdown', onPointerDown);
    detachTitleBarPointerDrag = undefined;
  };
}

onUnmounted(() => detachTitleBarPointerDrag?.());
</script>

<template>
  <v-app-bar
    :ref="setAppBarDragHostRef"
    class="shell-glass-app-bar app-shell-app-bar-drag-root"
    color="surface"
    density="comfortable"
    flat
    @dblclick="onAppBarDblclick"
  >
    <template #prepend>
      <div class="app-bar-prepend d-flex align-center" data-tauri-drag-region-exclude>
        <v-btn
          v-if="isSettings"
          icon
          size="small"
          density="compact"
          variant="text"
          class="app-bar-prepend-btn"
          :aria-label="t('nav.back')"
          @click="emit('back')"
        >
          <v-icon icon="mdi-arrow-left" size="20" />
        </v-btn>
        <v-btn
          v-if="mdAndUp"
          icon
          size="small"
          density="compact"
          variant="text"
          class="app-bar-prepend-btn"
          :aria-label="drawerOpen ? t('nav.collapseDrawer') : t('nav.expandDrawer')"
          @click="emit('toggle-drawer-desktop')"
        >
          <v-icon :icon="drawerOpen ? 'mdi-backburger' : 'mdi-menu'" size="20" />
        </v-btn>
        <v-btn
          v-if="mdAndUp && drawerOpen"
          icon
          size="small"
          density="compact"
          variant="text"
          class="app-bar-prepend-btn"
          :aria-label="drawerRail ? t('nav.expandDrawerText') : t('nav.railOnly')"
          @click="emit('toggle-drawer-rail')"
        >
          <v-icon
            :icon="drawerRail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            size="20"
          />
        </v-btn>
        <v-app-bar-nav-icon
          v-if="!mdAndUp"
          size="small"
          density="compact"
          class="app-bar-prepend-btn"
          :aria-label="t('nav.openMenu')"
          @click="emit('toggle-drawer-mobile')"
        />
      </div>
    </template>

    <template #title>
      <div class="app-bar-drag min-w-0 d-flex align-center">
        <v-app-bar-title class="app-bar-title min-w-0 flex-grow-1">
          <nav
            class="app-bar-breadcrumb-nav"
            data-tauri-drag-region-exclude
            :aria-label="t('nav.ariaBreadcrumb')"
          >
            <v-breadcrumbs
              class="app-bar-breadcrumbs text-body-2 px-0 py-0 bg-transparent"
              density="compact"
              :items="breadcrumbItems"
            >
              <template #divider>
                <v-icon icon="mdi-chevron-right" size="14" class="text-medium-emphasis" />
              </template>
            </v-breadcrumbs>
          </nav>
        </v-app-bar-title>
        <v-spacer />
      </div>
    </template>

    <template #append>
      <!-- Tauri：桌面端三键顶栏右端；窄屏托盘与窗口三键分两簇 -->
      <div
        v-if="isTauriRuntime()"
        class="app-bar-append-outer d-flex align-center flex-shrink-0"
        data-tauri-drag-region-exclude
      >
        <template v-if="!mdAndUp">
          <div class="app-bar-append app-bar-append--split d-flex align-center">
            <div class="app-bar-append-cluster d-flex align-center">
              <AppShellTrayActions
                :is-effectively-dark="isEffectivelyDark"
                :language-choices="languageChoices"
                :current-ui-language="currentUiLanguage"
                @toggle-light-dark="emit('toggle-light-dark')"
                @open-settings="emit('open-settings')"
                @set-ui-language="emit('set-ui-language', $event)"
              />
            </div>
            <div class="app-bar-append-cluster d-flex align-center">
              <AppShellWindowChrome embedded />
            </div>
          </div>
        </template>
        <AppShellWindowChrome v-else class="app-bar-window-chrome-desktop" />
      </div>
    </template>

    <template v-if="$slots.extension" #extension>
      <div class="app-bar-extension-wrap" data-tauri-drag-region-exclude>
        <slot name="extension" />
      </div>
    </template>
  </v-app-bar>
</template>

<style scoped>
/*
 * 顶栏主行：单行不换行、纵轴居中，避免面包屑与左侧按钮错位成两行。
 * 拖窗：Tauri 下在 v-app-bar 根上 pointerdown → startDragging()（见脚本）。
 */
.app-shell-app-bar-drag-root :deep(.v-toolbar__content) {
  align-items: center;
  flex-wrap: nowrap;
}

.app-shell-app-bar-drag-root :deep(.v-toolbar__prepend),
.app-shell-app-bar-drag-root :deep(.v-toolbar__append),
.app-shell-app-bar-drag-root :deep(.v-toolbar__start),
.app-shell-app-bar-drag-root :deep(.v-toolbar__end) {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.app-bar-title {
  align-self: center;
  display: flex;
  align-items: center;
  min-width: 0;
  font-size: inherit;
  line-height: inherit;
}

.app-bar-drag {
  flex: 1 1 0%;
  min-width: 0;
  align-items: center;
}

.app-bar-breadcrumb-nav {
  display: flex;
  align-items: center;
  min-width: 0;
}

.app-bar-breadcrumbs :deep(.v-breadcrumbs) {
  padding-block: 0 !important;
  padding-inline: 0 !important;
  flex-wrap: nowrap;
  overflow: hidden;
  line-height: 1.3;
  min-height: 0;
  align-items: center;
}

.app-bar-breadcrumbs :deep(.v-breadcrumbs-item) {
  max-width: 42vw;
  min-height: 0;
  padding-inline: 2px !important;
  font-size: 0.8125rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-bar-breadcrumbs :deep(.v-breadcrumbs-item--link) {
  font-weight: 400;
}

.app-bar-breadcrumbs :deep(.v-breadcrumbs-divider) {
  padding: 0 !important;
  margin-inline: -2px;
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

@media (min-width: 960px) {
  .app-bar-breadcrumbs :deep(.v-breadcrumbs-item) {
    max-width: 200px;
  }
}

.app-bar-append {
  margin-inline-end: 2px;
}

/* 窄屏：托盘与窗口三键分两簇，中间留白，不共用一个灰底 */
.app-bar-append--split {
  gap: 10px;
}

/* 桌面顶栏右上角：去掉与左侧按钮的间距，贴齐窗口右缘 */
:deep(.app-bar-window-chrome-desktop) {
  margin-inline-start: 0 !important;
  margin-inline-end: 2px;
}

.app-bar-append-cluster {
  gap: 0;
  padding: 4px 6px;
  border-radius: 10px;
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 5%, transparent);
}

.app-bar-append-cluster :deep(.v-btn:hover),
.app-bar-append-cluster :deep(.v-btn:focus-visible) {
  background: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, transparent) !important;
}

.app-bar-prepend {
  gap: 0;
  margin-inline-start: 2px;
}

.app-bar-prepend-btn {
  min-width: 34px !important;
  width: 34px !important;
  height: 34px !important;
}
</style>
