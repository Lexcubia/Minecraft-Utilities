<script setup lang="ts">
import {
  APP_LOGO_URL,
  APP_NAME,
  APP_TITLE,
  APP_VERSION,
  DOCS_ZH_CN_README_URL,
  REPO_URL,
} from '@/constants/app-meta';
import { openExternal } from '@/utils/openExternal';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
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
</style>
