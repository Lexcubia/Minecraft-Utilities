<script setup lang="ts">
import {
  DOCS_ZH_CN_README_URL,
  REPO_URL,
  APP_TITLE,
  APP_VERSION,
} from '@/constants/app-meta';
import { openExternal } from '@/utils/openExternal';
import {
  SETTINGS_SECTION_ICONS,
  SETTINGS_SECTIONS,
  settingsRouteName,
  type SettingsTab,
} from '@/views/settings/settings-tabs';
import { invoke } from '@tauri-apps/api/core';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

defineOptions({ name: 'WelcomeView' });

const { t } = useI18n();
const router = useRouter();
const greetMsg = ref('');

function goSettings(tab: SettingsTab) {
  void router.push({ name: settingsRouteName(tab) });
}

function openDocs() {
  void openExternal(DOCS_ZH_CN_README_URL);
}

function openRepo() {
  void openExternal(REPO_URL);
}

const settingsQuick = computed(() =>
  SETTINGS_SECTIONS.map((s) => ({
    id: s.id,
    labelKey: s.labelKey,
  })),
);

const externalQuick = computed(() => [
  {
    titleKey: 'welcome.openDocs',
    hintKey: 'welcome.openDocsHint',
    icon: 'mdi-book-open-variant',
    action: openDocs,
  },
  {
    titleKey: 'welcome.openRepo',
    hintKey: 'welcome.openRepoHint',
    icon: 'mdi-github',
    action: openRepo,
  },
]);

async function pingRust() {
  greetMsg.value = await invoke<string>('greet', { name: 'Modpack' });
}
</script>

<template>
  <div class="welcome-page mx-auto max-w-3xl px-4 py-6">
    <v-sheet class="pa-6 mb-6" color="surface" elevation="1" rounded="lg" variant="flat">
      <div class="text-h4 font-weight-bold">{{ APP_TITLE }}</div>
      <p class="text-body-2 text-medium-emphasis mt-2 mb-0">{{ t('welcome.heroTagline') }}</p>
      <p class="text-body-1 mt-4 mb-0">{{ t('welcome.introBody') }}</p>
      <v-chip class="mt-4" color="primary" size="small" variant="tonal">
        {{ t('welcome.versionLabel', { version: APP_VERSION }) }}
      </v-chip>
    </v-sheet>

    <h2 class="text-h6 font-weight-bold mb-3">{{ t('welcome.quickTitle') }}</h2>

    <v-row dense>
      <v-col v-for="item in settingsQuick" :key="item.id" cols="12" sm="6">
        <v-card
          class="quick-card h-100"
          color="surface"
          elevation="1"
          rounded="lg"
          variant="flat"
          role="button"
          tabindex="0"
          @click="goSettings(item.id)"
          @keydown.enter="goSettings(item.id)"
          @keydown.space.prevent="goSettings(item.id)"
        >
          <v-card-text class="d-flex flex-column">
            <v-avatar class="mb-3" color="primary" size="44" variant="tonal" rounded="lg">
              <v-icon :icon="SETTINGS_SECTION_ICONS[item.id]" color="primary" size="24" />
            </v-avatar>
            <div class="text-subtitle-1 font-weight-medium">{{ t(item.labelKey) }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col v-for="(ext, i) in externalQuick" :key="`ext-${i}`" cols="12" sm="6">
        <v-card
          class="quick-card h-100"
          color="surface"
          elevation="1"
          rounded="lg"
          variant="flat"
          role="button"
          tabindex="0"
          @click="ext.action()"
          @keydown.enter="ext.action()"
          @keydown.space.prevent="ext.action()"
        >
          <v-card-text class="d-flex flex-column">
            <v-avatar class="mb-3" color="primary" size="44" variant="tonal" rounded="lg">
              <v-icon :icon="ext.icon" color="primary" size="24" />
            </v-avatar>
            <div class="text-subtitle-1 font-weight-medium">{{ t(ext.titleKey) }}</div>
            <p class="text-body-2 text-medium-emphasis mb-0 mt-1">{{ t(ext.hintKey) }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <div class="mt-6 text-center">
      <v-btn color="primary" variant="tonal" @click="pingRust">{{ t('welcome.devPing') }}</v-btn>
      <p v-if="greetMsg" class="text-body-2 text-medium-emphasis mt-3 mb-0">{{ greetMsg }}</p>
    </div>
  </div>
</template>

<style scoped>
.quick-card {
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.quick-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>
