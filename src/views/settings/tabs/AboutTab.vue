<script setup lang="ts">
import {
  APP_LOGO_URL,
  APP_NAME,
  APP_TITLE,
  APP_VERSION,
  DOCS_ZH_CN_README_URL,
  REPO_URL,
} from '@/constants/app-meta';
import { changelogHeadingDisplay, parseKeepAChangelog } from '@/utils/parseChangelog';
import { openExternal } from '@/utils/openExternal';
import changelogSource from '../../../../CHANGELOG.md?raw';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const changelogSections = computed(() => parseKeepAChangelog(changelogSource));

/** 默认展开首个版本块（通常为 Unreleased） */
const changelogOpen = ref<number[]>([0]);

function openChangelogOnGithub() {
  void openExternal(`${REPO_URL}/blob/main/CHANGELOG.md`);
}
</script>

<template>
  <v-card color="surface" variant="flat" rounded="lg" elevation="1">
    <v-card-title class="text-subtitle-1">{{ t('settings.about.cardTitle') }}</v-card-title>
    <v-card-text class="d-flex flex-column gap-4">
      <div class="d-flex align-center gap-3">
        <v-avatar size="56" rounded="lg" variant="tonal" color="primary" class="flex-shrink-0">
          <img :src="APP_LOGO_URL" alt="" width="48" height="48" class="about-brand-logo" />
        </v-avatar>
        <div class="text-h6 font-weight-medium">{{ APP_TITLE }}</div>
      </div>
      <v-sheet color="surface-variant" variant="flat" rounded="lg" class="about-table">
        <v-table density="compact">
          <tbody>
            <tr>
              <td class="text-medium-emphasis" style="width: 88px">{{ t('settings.about.fieldName') }}</td>
              <td>{{ APP_NAME }}</td>
            </tr>
            <tr>
              <td class="text-medium-emphasis">{{ t('settings.about.fieldVersion') }}</td>
              <td>{{ APP_VERSION }}</td>
            </tr>
            <tr>
              <td class="text-medium-emphasis align-top">{{ t('settings.about.fieldDescription') }}</td>
              <td class="text-body-2">{{ t('meta.description') }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-sheet>

      <div class="flex flex-wrap gap-2">
        <v-btn variant="flat" color="primary" @click="openExternal(REPO_URL)">
          {{ t('settings.about.repo') }}
        </v-btn>
        <v-btn variant="flat" color="primary" @click="openExternal(`${REPO_URL}/issues`)">
          {{ t('settings.about.issues') }}
        </v-btn>
        <v-btn variant="flat" color="primary" @click="openExternal(DOCS_ZH_CN_README_URL)">
          {{ t('settings.about.docsZh') }}
        </v-btn>
      </div>

      <v-divider class="border-opacity-50" />

      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <span class="text-subtitle-2 font-weight-medium">{{ t('settings.about.changelogTitle') }}</span>
        <v-btn variant="text" size="small" color="primary" @click="openChangelogOnGithub">
          {{ t('settings.about.changelogFull') }}
        </v-btn>
      </div>
      <p class="text-caption text-medium-emphasis mb-0">{{ t('settings.about.changelogHint') }}</p>

      <v-expansion-panels
        v-if="changelogSections.length"
        v-model="changelogOpen"
        multiple
        variant="accordion"
        class="changelog-panels"
      >
        <v-expansion-panel v-for="(sec, i) in changelogSections" :key="`${sec.version}-${i}`" :value="i">
          <v-expansion-panel-title class="text-body-2 py-3">
            {{ changelogHeadingDisplay(sec.headingLine) }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="changelog-body text-body-2 text-medium-emphasis">
              {{ sec.body || t('settings.about.changelogEmpty') }}
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.about-brand-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.about-table :deep(table) {
  width: 100%;
}
.about-table :deep(td) {
  padding: 10px 14px;
}

.changelog-panels {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 12%, transparent);
  border-radius: 8px;
}

.changelog-panels :deep(.v-expansion-panel:not(:last-child)) {
  border-bottom: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, transparent);
}

.changelog-body {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
