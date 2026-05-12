<script setup lang="ts">
import {
  DOCS_ZH_CN_README_URL,
  REPO_URL,
  APP_LOGO_URL,
  APP_TITLE,
  APP_VERSION,
} from '@/constants/app-meta';
import { openExternal } from '@/utils/openExternal';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

defineOptions({ name: 'WelcomeView' });

const { t } = useI18n();
const router = useRouter();

function openDocs() {
  void openExternal(DOCS_ZH_CN_README_URL);
}

function openRepo() {
  void openExternal(REPO_URL);
}

type MainQuickItem =
  | {
      id: string;
      kind: 'route';
      routeName: 'uuid-migrate';
      titleKey: string;
      icon: string;
    }
  | {
      id: string;
      kind: 'external';
      titleKey: string;
      icon: string;
      action: () => void;
    };

const mainQuick = computed<MainQuickItem[]>(() => [
  {
    id: 'uuid-migrate',
    kind: 'route',
    routeName: 'uuid-migrate',
    titleKey: 'tools.uuidMigrate.navTitle',
    icon: 'mdi-swap-horizontal',
  },
  {
    id: 'docs',
    kind: 'external',
    titleKey: 'welcome.openDocs',
    icon: 'mdi-book-open-variant',
    action: openDocs,
  },
  {
    id: 'repo',
    kind: 'external',
    titleKey: 'welcome.openRepo',
    icon: 'mdi-github',
    action: openRepo,
  },
]);

function runQuick(item: MainQuickItem) {
  if (item.kind === 'route') void router.push({ name: item.routeName });
  else item.action();
}
</script>

<template>
  <div class="welcome-page mx-auto max-w-3xl px-4 py-6">
    <v-sheet class="pa-6 mb-6" color="surface" elevation="1" rounded="lg" variant="flat">
      <div class="d-flex flex-wrap align-center gap-4 mb-2">
        <v-avatar size="80" rounded="lg" variant="flat" class="app-welcome-logo flex-shrink-0">
          <img :src="APP_LOGO_URL" alt="" width="80" height="80" />
        </v-avatar>
        <div class="min-w-0">
          <div class="text-h4 font-weight-bold">{{ APP_TITLE }}</div>
          <p class="text-body-2 text-medium-emphasis mt-2 mb-0">{{ t('welcome.heroTagline') }}</p>
        </div>
      </div>
      <p class="text-body-1 mt-4 mb-0">{{ t('welcome.introBody') }}</p>
      <v-chip class="mt-4" color="primary" size="small" variant="tonal">
        {{ t('welcome.versionLabel', { version: APP_VERSION }) }}
      </v-chip>
    </v-sheet>

    <h2 class="text-h6 font-weight-bold mb-3">{{ t('welcome.quickTitle') }}</h2>

    <v-sheet
      class="quick-list border-sm overflow-hidden"
      color="surface"
      elevation="1"
      rounded="lg"
      variant="flat"
    >
      <button
        v-for="item in mainQuick"
        :key="item.id"
        type="button"
        class="quick-row d-flex align-center ga-3 px-4 py-3 text-start w-100"
        @click="runQuick(item)"
      >
        <v-icon :icon="item.icon" color="primary" size="22" class="flex-shrink-0" />
        <span class="text-body-1 font-weight-medium">{{ t(item.titleKey) }}</span>
      </button>
    </v-sheet>
  </div>
</template>

<style scoped>
.app-welcome-logo img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.quick-list {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}

.quick-row {
  cursor: pointer;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  transition: background-color 0.12s ease;
}

.quick-row:not(:last-child) {
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.quick-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.06);
}

.quick-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
</style>
