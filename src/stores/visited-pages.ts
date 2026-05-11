import { APP_TITLE } from '@/constants/app-meta';
import { SETTINGS_SECTIONS, routeNameToSettingsTab } from '@/views/settings/settings-tabs';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ComposerTranslation } from 'vue-i18n';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

const MAX_TABS = 16;

export type VisitedPageTab = {
  /** 与 `fullPath` 一致，用作稳定键 */
  id: string;
  fullPath: string;
  routeName: string | undefined | null;
};

/** 首页（welcome）标签：常驻且不可关闭；与 router 中 `name: 'welcome'`、路径 `/` 一致 */
export function isPinnedHomeVisitedTab(
  tab: Pick<VisitedPageTab, 'id' | 'routeName' | 'fullPath'>,
): boolean {
  if (tab.routeName === 'welcome') return true;
  const pathOnly = (tab.fullPath || tab.id).split('?')[0] || '';
  return pathOnly === '/' || pathOnly === '';
}

function defaultHomeVisitedTab(): VisitedPageTab {
  return { id: '/', fullPath: '/', routeName: 'welcome' };
}

/** 保证存在首页项且始终排在首位 */
function normalizePinnedHomeOrder(list: VisitedPageTab[]): VisitedPageTab[] {
  const homeEntry = list.find((t) => isPinnedHomeVisitedTab(t)) ?? defaultHomeVisitedTab();
  const rest = list.filter((t) => !isPinnedHomeVisitedTab(t));
  return [homeEntry, ...rest];
}

function leafCacheName(routeName: string | null | undefined): string | null {
  if (!routeName) return null;
  const map: Record<string, string> = {
    welcome: 'WelcomeView',
    'settings-appearance': 'AppearanceSettingsView',
    'settings-general': 'GeneralSettingsView',
    'settings-updates': 'UpdatesSettingsView',
    'settings-about': 'AboutSettingsView',
  };
  return map[routeName] ?? null;
}

function tabShellCache(tab: VisitedPageTab): 'WelcomeView' | 'SettingsLayout' | null {
  const n = tab.routeName == null ? '' : String(tab.routeName);
  const pathOnly = tab.fullPath.split('?')[0] || '';
  if (n === 'welcome' || pathOnly === '/' || pathOnly === '') return 'WelcomeView';
  if (n.startsWith('settings-') || pathOnly.startsWith('/settings')) return 'SettingsLayout';
  return null;
}

export function visitedTabTitle(
  routeName: string | null | undefined,
  t: ComposerTranslation,
): string {
  if (routeName === 'welcome') return t('nav.home');
  if (!routeName) return APP_TITLE;
  const tab = routeNameToSettingsTab(routeName);
  if (tab) {
    const row = SETTINGS_SECTIONS.find((s) => s.id === tab);
    return row ? t(row.labelKey) : t('nav.settings');
  }
  return APP_TITLE;
}

export const useVisitedPagesStore = defineStore('visited-pages', () => {
  const tabs = ref<VisitedPageTab[]>([]);

  function syncFromRoute(route: RouteLocationNormalizedLoaded) {
    if (route.name === 'settings') return;
    const id = route.fullPath || '/';
    if (tabs.value.some((x) => x.id === id)) {
      tabs.value = normalizePinnedHomeOrder(tabs.value);
      return;
    }

    tabs.value.push({
      id,
      fullPath: route.fullPath,
      routeName: route.name as string | undefined,
    });

    while (tabs.value.length > MAX_TABS) {
      const dropIdx = tabs.value.findIndex((x) => x.id !== id && !isPinnedHomeVisitedTab(x));
      if (dropIdx === -1) break;
      tabs.value.splice(dropIdx, 1);
    }

    tabs.value = normalizePinnedHomeOrder(tabs.value);
  }

  function removeTab(id: string) {
    const i = tabs.value.findIndex((x) => x.id === id);
    if (i === -1) return;
    if (isPinnedHomeVisitedTab(tabs.value[i])) return;
    tabs.value.splice(i, 1);
    tabs.value = normalizePinnedHomeOrder(tabs.value);
  }

  /** 只保留指定 id 的标签；首页始终保留（除非 keepIds 已包含首页） */
  function keepOnlyTabIds(keepIds: readonly string[]) {
    const set = new Set(keepIds);
    let next = tabs.value.filter((x) => set.has(x.id));
    if (!next.some((x) => isPinnedHomeVisitedTab(x))) {
      const homeEntry =
        tabs.value.find((x) => isPinnedHomeVisitedTab(x)) ?? defaultHomeVisitedTab();
      next = [homeEntry, ...next];
    }
    tabs.value = normalizePinnedHomeOrder(next);
  }

  /** 「关闭全部」：只保留首页标签（当前页对应的访问项一并移除） */
  function collapseToHomeTabOnly() {
    const homeEntry = tabs.value.find((x) => isPinnedHomeVisitedTab(x)) ?? defaultHomeVisitedTab();
    tabs.value = normalizePinnedHomeOrder([homeEntry]);
  }

  /** 删除位于某 id 左侧的标签（不含自身）；首页左侧无内容可删 */
  function removeTabsBefore(anchorId: string) {
    const list = normalizePinnedHomeOrder(tabs.value);
    const i = list.findIndex((x) => x.id === anchorId);
    if (i <= 1) {
      tabs.value = list;
      return;
    }
    tabs.value = [list[0], ...list.slice(i)];
  }

  /** 删除位于某 id 右侧的标签（不含自身） */
  function removeTabsAfter(anchorId: string) {
    const list = normalizePinnedHomeOrder(tabs.value);
    const i = list.findIndex((x) => x.id === anchorId);
    if (i === -1 || i >= list.length - 1) return;
    tabs.value = list.slice(0, i + 1);
  }

  const shellKeepAliveNames = computed(() => {
    const s = new Set<string>();
    for (const tab of tabs.value) {
      const shell = tabShellCache(tab);
      if (shell) s.add(shell);
    }
    return [...s];
  });

  const settingsLeafKeepAliveNames = computed(() => {
    const s = new Set<string>();
    for (const tab of tabs.value) {
      const leaf = leafCacheName(tab.routeName);
      if (leaf) s.add(leaf);
    }
    return [...s];
  });

  return {
    tabs,
    syncFromRoute,
    removeTab,
    keepOnlyTabIds,
    collapseToHomeTabOnly,
    removeTabsBefore,
    removeTabsAfter,
    shellKeepAliveNames,
    settingsLeafKeepAliveNames,
  };
});
