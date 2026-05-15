<script setup lang="ts">
import {
  isPinnedHomeVisitedTab,
  useVisitedPagesStore,
  visitedTabTitle,
  type VisitedPageTab,
} from '@/stores/visited-pages';
import { storeToRefs } from 'pinia';
import { useDisplay } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const visited = useVisitedPagesStore();
const { tabs } = storeToRefs(visited);
const { smAndDown } = useDisplay();

const hoveredTabId = ref<string | null>(null);
const focusedTabId = ref<string | null>(null);

const tabMenu = ref<{
  open: boolean;
  x: number;
  y: number;
  target: VisitedPageTab | null;
}>({ open: false, x: 0, y: 0, target: null });

const tabMenuTargetIndex = computed(() => {
  const id = tabMenu.value.target?.id;
  if (!id) return -1;
  return tabs.value.findIndex((x) => x.id === id);
});

const tabMenuCloseThisDisabled = computed(() => {
  const target = tabMenu.value.target;
  if (!target) return true;
  return isPinnedHomeVisitedTab(target) || tabs.value.length <= 1;
});

const tabMenuCloseOthersDisabled = computed(() => {
  const target = tabMenu.value.target;
  if (!target) return true;
  return tabs.value.filter((x) => x.id !== target.id && !isPinnedHomeVisitedTab(x)).length === 0;
});

const tabMenuCloseLeftDisabled = computed(() => tabMenuTargetIndex.value <= 1);

/** 与模板 class 一致，供 document 捕获阶段判断点击是否在菜单内 */
const APP_CONTEXT_MENU_SURFACE_SELECTOR = '.app-context-menu-surface';

let dismissOutsidePointer: ((e: MouseEvent) => void) | null = null;

function removeDismissOutsideListeners() {
  if (!dismissOutsidePointer) return;
  window.removeEventListener('click', dismissOutsidePointer, true);
  window.removeEventListener('contextmenu', dismissOutsidePointer, true);
  dismissOutsidePointer = null;
}

function closeTabMenu() {
  removeDismissOutsideListeners();
  tabMenu.value.open = false;
  tabMenu.value.target = null;
}

function scheduleTabMenuDismiss() {
  void nextTick(() => {
    setTimeout(() => {
      removeDismissOutsideListeners();
      dismissOutsidePointer = (e: MouseEvent) => {
        const t = e.target;
        if (t instanceof Element && t.closest(APP_CONTEXT_MENU_SURFACE_SELECTOR)) return;
        closeTabMenu();
      };
      window.addEventListener('click', dismissOutsidePointer, true);
      window.addEventListener('contextmenu', dismissOutsidePointer, true);
    }, 0);
  });
}

function onTabContextMenu(e: MouseEvent, tab: VisitedPageTab) {
  e.preventDefault();
  tabMenu.value.target = tab;
  const pad = 8;
  const mw = 188;
  const mh = 200;
  tabMenu.value.x = Math.min(e.clientX, window.innerWidth - mw - pad);
  tabMenu.value.y = Math.min(e.clientY, window.innerHeight - mh - pad);
  tabMenu.value.open = true;
  scheduleTabMenuDismiss();
}

function onTabMenuKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeTabMenu();
}

watch(
  () => tabMenu.value.open,
  (open) => {
    if (open) window.addEventListener('keydown', onTabMenuKeydown);
    else window.removeEventListener('keydown', onTabMenuKeydown);
  },
);

onUnmounted(() => {
  removeDismissOutsideListeners();
  window.removeEventListener('keydown', onTabMenuKeydown);
});

async function ensureActiveRouteStillOpen() {
  const path = route.fullPath;
  if (tabs.value.some((x) => x.id === path)) return;
  const last = tabs.value[tabs.value.length - 1];
  if (last) await router.push(last.fullPath);
  else await router.push('/');
}

function isChipClosable(tab: VisitedPageTab): boolean {
  if (isPinnedHomeVisitedTab(tab)) return false;
  if (tabs.value.length <= 1) return false;
  return hoveredTabId.value === tab.id || focusedTabId.value === tab.id;
}

function onWrapFocusIn(tab: VisitedPageTab) {
  focusedTabId.value = tab.id;
}

function onWrapFocusOut(tab: VisitedPageTab, e: FocusEvent) {
  const wrap = e.currentTarget as HTMLElement;
  const next = e.relatedTarget as Node | null;
  if (next && wrap.contains(next)) return;
  if (focusedTabId.value === tab.id) focusedTabId.value = null;
}

watch(
  () => [route.fullPath, route.name] as const,
  () => {
    visited.syncFromRoute(route);
  },
  { immediate: true },
);

function tabLabel(tab: VisitedPageTab) {
  return visitedTabTitle(tab.routeName, t);
}

function isActive(tab: VisitedPageTab) {
  return tab.id === route.fullPath;
}

function goTab(tab: VisitedPageTab) {
  if (tab.id === route.fullPath) return;
  void router.push(tab.fullPath);
}

async function closeTab(tab: VisitedPageTab) {
  if (isPinnedHomeVisitedTab(tab)) return;
  if (tabs.value.length <= 1) return;
  const wasActive = tab.id === route.fullPath;
  const remaining = tabs.value.filter((x) => x.id !== tab.id);
  const fallback = remaining.length ? remaining[remaining.length - 1]!.fullPath : '/';
  visited.removeTab(tab.id);
  if (wasActive) {
    await router.push(fallback);
  }
}

async function menuCloseThis() {
  const tab = tabMenu.value.target;
  closeTabMenu();
  if (!tab) return;
  await closeTab(tab);
}

async function menuCloseOthers() {
  const tab = tabMenu.value.target;
  closeTabMenu();
  if (!tab || tabs.value.length <= 1) return;
  visited.keepOnlyTabIds([tab.id]);
  if (route.fullPath !== tab.fullPath) {
    await router.push(tab.fullPath);
  }
}

async function menuCloseAll() {
  closeTabMenu();
  visited.collapseToHomeTabOnly();
  await router.push('/');
}

async function menuCloseLeft() {
  const tab = tabMenu.value.target;
  closeTabMenu();
  if (!tab) return;
  visited.removeTabsBefore(tab.id);
  await ensureActiveRouteStillOpen();
}

async function menuCloseRight() {
  const tab = tabMenu.value.target;
  closeTabMenu();
  if (!tab) return;
  visited.removeTabsAfter(tab.id);
  await ensureActiveRouteStillOpen();
}
</script>

<template>
  <div
    class="app-shell-visited-tabs d-flex align-center"
    :class="smAndDown ? 'px-1' : 'px-2'"
  >
    <TransitionGroup
      tag="div"
      name="visited-tab"
      class="visited-tabs-scroll d-flex align-center gap-1 flex-grow-1 min-w-0 py-1"
    >
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="visited-tab-wrap flex-shrink-0"
        :class="{ 'visited-tab-wrap--active': isActive(tab) }"
        :tabindex="tabs.length > 1 ? 0 : -1"
        @mouseenter="hoveredTabId = tab.id"
        @mouseleave="hoveredTabId = null"
        @focusin="onWrapFocusIn(tab)"
        @focusout="onWrapFocusOut(tab, $event)"
        @contextmenu.prevent="onTabContextMenu($event, tab)"
      >
        <v-chip
          class="visited-tab-chip text-caption"
          size="small"
          variant="flat"
          :closable="isChipClosable(tab)"
          :max-width="smAndDown ? 120 : 200"
          :aria-current="isActive(tab) ? 'page' : undefined"
          :aria-label="tabLabel(tab)"
          @click="goTab(tab)"
          @click:close.stop="closeTab(tab)"
        >
          <span class="text-truncate">{{ tabLabel(tab) }}</span>
        </v-chip>
      </div>
    </TransitionGroup>

    <Teleport to="body">
      <div
        v-if="tabMenu.open && tabMenu.target"
        class="app-context-menu-surface rounded-lg"
        role="menu"
        :aria-label="t('nav.visitedTabMenu.ariaLabel')"
        :style="{ top: `${tabMenu.y}px`, left: `${tabMenu.x}px` }"
        @click.stop
        @contextmenu.prevent.stop
      >
        <v-list
          density="compact"
          class="py-1"
          tabindex="-1"
        >
          <v-list-item
            role="menuitem"
            :title="t('nav.visitedTabMenu.closeThis')"
            :disabled="tabMenuCloseThisDisabled"
            @click="menuCloseThis"
          />
          <v-list-item
            role="menuitem"
            :title="t('nav.visitedTabMenu.closeOthers')"
            :disabled="tabMenuCloseOthersDisabled"
            @click="menuCloseOthers"
          />
          <v-list-item
            role="menuitem"
            :title="t('nav.visitedTabMenu.closeAll')"
            @click="menuCloseAll"
          />
          <v-divider class="my-1" />
          <v-list-item
            role="menuitem"
            :title="t('nav.visitedTabMenu.closeLeft')"
            :disabled="tabMenuCloseLeftDisabled"
            @click="menuCloseLeft"
          />
          <v-list-item
            role="menuitem"
            :title="t('nav.visitedTabMenu.closeRight')"
            :disabled="tabMenuTargetIndex < 0 || tabMenuTargetIndex >= tabs.length - 1"
            @click="menuCloseRight"
          />
        </v-list>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* 右键菜单外壳样式见 src/styles/app-context-menu-surface.css */

.app-context-menu-surface :deep(.v-list) {
  background: transparent !important;
}

.app-context-menu-surface :deep(.v-list-item) {
  border-radius: 6px;
  margin-inline: 4px;
  min-height: 30px !important;
  padding-block: 2px !important;
}

.app-context-menu-surface :deep(.v-list-item--density-compact.v-list-item--one-line) {
  min-height: 30px !important;
}

.app-context-menu-surface :deep(.v-list-item__content) {
  padding-block: 0;
}

.app-context-menu-surface :deep(.v-list-item-title) {
  font-size: inherit;
  font-weight: 500;
  line-height: inherit;
}

.app-context-menu-surface :deep(.v-list-item:not(.v-list-item--active):hover),
.app-context-menu-surface :deep(.v-list-item:not(.v-list-item--active):focus-visible) {
  background: var(--app-on-surface-09) !important;
}

.app-context-menu-surface :deep(.v-divider) {
  margin-inline: 8px;
  border-color: var(--app-on-surface-12);
  opacity: 1;
}

.app-shell-visited-tabs {
  min-height: var(--app-shell-visited-tabs-band-height, 40px);
  width: 100%;
  min-width: 0;
}

.visited-tabs-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  flex-wrap: nowrap;
  /* 仍可通过触控板/Shift+滚轮横向滚动；隐藏轨道避免 closable 宽度变化时轨道显隐造成整行跳动 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.visited-tabs-scroll::-webkit-scrollbar {
  display: none;
  height: 0;
}

/* 标签：实色底 + 描边，无 backdrop-filter（避免与主区背景/毛玻璃顶栏叠出脏边） */
.visited-tab-chip {
  --visited-chip-border: var(--app-on-surface-14);
  border: 1px solid var(--visited-chip-border) !important;
  box-shadow: none !important;
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  transition:
    background-color 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.visited-tab-wrap--active .visited-tab-chip {
  --visited-chip-border: color-mix(in srgb, rgb(var(--v-theme-primary)) 45%, transparent);
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 26%, rgb(var(--v-theme-surface))) !important;
}

/* closable：与标签底色对比清晰，且不依赖 chip 上可能被 !important 盖掉的继承色 */
.visited-tab-wrap :deep(.v-chip__close) {
  color: rgb(var(--v-theme-on-surface)) !important;
  opacity: 0.62;
  transition: color 0.18s ease, opacity 0.18s ease;
  animation: visited-tab-close-in 0.2s cubic-bezier(0.33, 1, 0.68, 1) both;
}

.visited-tab-wrap :deep(.v-chip__close .v-icon) {
  color: inherit !important;
  opacity: 1 !important;
}

.visited-tab-wrap :deep(.v-chip__close:hover),
.visited-tab-wrap :deep(.v-chip__close:focus-visible) {
  opacity: 1;
}

.visited-tab-wrap--active .visited-tab-chip :deep(.v-chip__close) {
  color: rgb(var(--v-theme-primary)) !important;
  opacity: 0.72;
}

.visited-tab-wrap--active .visited-tab-chip :deep(.v-chip__close:hover),
.visited-tab-wrap--active .visited-tab-chip :deep(.v-chip__close:focus-visible) {
  opacity: 1;
}

/* 入场只动 transform，避免与常态 opacity 打架 */
@keyframes visited-tab-close-in {
  from {
    transform: scale(0.88);
  }

  to {
    transform: scale(1);
  }
}

/* 标签条增删与顺序变化 */
.visited-tab-enter-active,
.visited-tab-leave-active {
  transition:
    opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.visited-tab-move {
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.visited-tab-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.visited-tab-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .visited-tab-chip {
    transition-duration: 0.01ms !important;
  }

  .visited-tab-wrap :deep(.v-chip__close) {
    animation-duration: 0.01ms !important;
  }

  .visited-tab-enter-active,
  .visited-tab-leave-active,
  .visited-tab-move {
    transition-duration: 0.01ms !important;
  }

  .visited-tab-enter-from,
  .visited-tab-leave-to {
    transform: none;
  }
}
</style>
