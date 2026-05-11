<script setup lang="ts">
import {
  SETTINGS_SECTION_ICONS,
  SETTINGS_SECTIONS,
  routeNameToSettingsTab,
} from '@/views/settings/settings-tabs';
import { useVisitedPagesStore } from '@/stores/visited-pages';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

defineOptions({ name: 'SettingsLayout' });

const { t } = useI18n();
const route = useRoute();
const visitedPages = useVisitedPagesStore();

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
</script>

<template>
  <div class="settings-page mx-auto max-w-2xl px-4 py-8">
    <h1
      v-if="currentTab"
      class="text-h5 font-weight-bold mb-5 d-flex align-center gap-3"
    >
      <v-icon :icon="sectionIcon" color="primary" size="28" />
      {{ heading }}
    </h1>

    <router-view v-slot="{ Component }">
      <keep-alive :include="visitedPages.settingsLeafKeepAliveNames">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>
