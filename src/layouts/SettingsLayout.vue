<script setup lang="ts">
import AppScrollableDocumentFrame from '@/components/shell/AppScrollableDocumentFrame.vue';
import { useSettingsUiMode } from '@/shell/settings-ui-mode';
import {
  SETTINGS_SECTION_ICONS,
  SETTINGS_SECTIONS,
  normalizeSettingsTab,
  routeNameToSettingsTab,
  settingsRouteName,
  type SettingsTab,
} from '@/views/settings/settings-tabs';
import { useVisitedPagesStore } from '@/stores/visited-pages';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

defineOptions({ name: 'SettingsLayout' });

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const visitedPages = useVisitedPagesStore();
const settingsUiMode = useSettingsUiMode();

const currentTab = computed(() => routeNameToSettingsTab(route.name as string | undefined));

const heading = computed(() => {
  const id = currentTab.value;
  if (!id) return '';
  const row = SETTINGS_SECTIONS.find((s) => s.id === id);
  return row ? t(row.labelKey) : '';
});

const sectionIcon = computed(() => {
  const id = currentTab.value;
  return id ? SETTINGS_SECTION_ICONS[id] : 'mdi-cog-outline';
});

const standaloneTab = computed<SettingsTab>({
  get: () => currentTab.value ?? 'general',
  set: (tab) =>
    void router.push({ name: settingsRouteName(normalizeSettingsTab(String(tab))) }),
});

const showSettingsHeader = computed(() => {
  if (settingsUiMode.value === 'standalone') return true;
  return !!currentTab.value && settingsUiMode.value === 'embedded';
});
</script>

<template>
  <!-- 独立窗：内层分栏滚动，依赖 .app-shell-main-scroll--nested-document -->
  <AppScrollableDocumentFrame
    v-if="settingsUiMode === 'standalone'"
    container-class="w-100 min-w-0"
    header-class="mb-5"
    body-class="pb-8"
  >
    <template v-if="showSettingsHeader" #header>
      <v-tabs
        v-model="standaloneTab"
        bg-color="transparent"
        color="primary"
        grow
        show-arrows
        class="settings-standalone-tabs app-border-block-end"
      >
        <v-tab
          v-for="item in SETTINGS_SECTIONS"
          :key="item.id"
          :text="t(item.labelKey)"
          :value="item.id"
        />
      </v-tabs>
    </template>

    <div class="mx-auto max-w-2xl w-100 min-w-0 px-4">
      <router-view v-slot="{ Component }">
        <keep-alive :include="visitedPages.settingsLeafKeepAliveNames">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </AppScrollableDocumentFrame>

  <!-- 主窗嵌入：仅使用 .app-shell-main-scroll 单滚动条，与其它页面一致 -->
  <div v-else class="settings-layout-embedded w-100 min-w-0">
    <template v-if="showSettingsHeader">
      <h1
        v-if="currentTab"
        class="text-h5 font-weight-bold d-flex align-center gap-3 px-4 mb-5"
      >
        <v-icon :icon="sectionIcon" color="primary" size="28" />
        {{ heading }}
      </h1>
    </template>

    <div class="mx-auto max-w-2xl w-100 min-w-0 px-4 pb-8">
      <router-view v-slot="{ Component }">
        <keep-alive :include="visitedPages.settingsLeafKeepAliveNames">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>
  </div>
</template>

<style scoped>
.settings-standalone-tabs :deep(.v-tab) {
  min-width: 0;
  text-transform: none;
  letter-spacing: normal;
}
</style>
