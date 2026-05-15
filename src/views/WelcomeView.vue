<script setup lang="ts">
import AppGlassCard from '@/components/ui/AppGlassCard.vue';
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
  <div class="app-page">
    <AppGlassCard tag="div" class="pa-5 mb-5">
      <div class="d-flex flex-wrap align-center gap-3 mb-1">
        <v-avatar size="64" rounded="0" variant="flat" class="app-welcome-logo flex-shrink-0">
          <img :src="APP_LOGO_URL" alt="" width="64" height="64" class="app-pixel-logo" />
        </v-avatar>
        <div class="min-w-0">
          <div class="text-h5 font-weight-bold">{{ APP_TITLE }}</div>
          <p class="text-body-2 text-medium-emphasis mt-1 mb-0">{{ t('welcome.heroTagline') }}</p>
        </div>
      </div>
      <p class="text-body-2 mt-3 mb-0">{{ t('welcome.introBody') }}</p>
      <v-chip class="mt-3" color="primary" size="x-small" variant="tonal" rounded="pill">
        {{ t('welcome.versionLabel', { version: APP_VERSION }) }}
      </v-chip>
    </AppGlassCard>

    <h2 class="app-section-title mb-2">{{ t('welcome.quickTitle') }}</h2>

    <AppGlassCard tag="div" class="quick-list overflow-hidden">
      <button
        v-for="item in mainQuick"
        :key="item.id"
        type="button"
        class="quick-row app-linear-list-row app-focus-ring-inset d-flex align-center ga-3 px-4 text-start w-100"
        @click="runQuick(item)"
      >
        <v-icon :icon="item.icon" color="primary" size="20" class="flex-shrink-0" />
        <span>{{ t(item.titleKey) }}</span>
      </button>
    </AppGlassCard>
  </div>
</template>

<style scoped>
.app-welcome-logo img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

/* 与上方「快速开始」标题衔接：去掉卡片顶边与顶侧阴影，避免读出「按钮上方多一条线」 */
.quick-list.app-glass-card {
  border-top: none;
  box-shadow: none;
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
  background-color: var(--app-primary-06);
}
</style>
