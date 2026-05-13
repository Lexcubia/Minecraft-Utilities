<script setup lang="ts">
import {
  APP_LOGO_URL,
  APP_NAME,
  APP_TITLE,
  APP_VERSION,
  DOCS_ZH_CN_README_URL,
  REPO_URL,
} from '@/constants/app-meta';
import AppGlassSectionCard from '@/components/ui/AppGlassSectionCard.vue';
import { openExternal } from '@/utils/openExternal';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <AppGlassSectionCard>
    <div class="d-flex flex-column gap-4">
      <div class="d-flex align-center gap-3">
        <div class="about-brand-mark flex-shrink-0" aria-hidden="true">
          <img
            :src="APP_LOGO_URL"
            alt=""
            width="48"
            height="48"
            class="about-brand-logo app-pixel-logo"
          />
        </div>
        <div class="text-h6 font-weight-medium">{{ APP_TITLE }}</div>
      </div>
      <v-sheet color="surface-variant" variant="flat" rounded="md" class="about-table">
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
    </div>
  </AppGlassSectionCard>
</template>

<style scoped>
.about-brand-mark {
  line-height: 0;
  overflow: hidden;
}

.about-brand-logo {
  display: block;
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.about-table :deep(table) {
  width: 100%;
}
.about-table :deep(td) {
  padding: 10px 14px;
}
</style>
