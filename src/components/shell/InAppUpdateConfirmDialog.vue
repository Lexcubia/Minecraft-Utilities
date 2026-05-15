<script setup lang="ts">
import { useInAppUpdateStore } from '@/stores/in-app-update';
import { findChangelogBodyForTag, parseKeepAChangelogPublished } from '@/utils/parseChangelog';
import { renderMarkdownToSafeHtml } from '@/utils/renderMarkdown';
import changelogSource from '../../../CHANGELOG.md?raw';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const inApp = useInAppUpdateStore();

function onUpdateConfirmDialog(open: boolean) {
  if (!open) inApp.cancelPendingUpdate();
}

const changelogPublished = computed(() => parseKeepAChangelogPublished(changelogSource));

const updateConfirmNotesHtml = computed(() => {
  const tag = inApp.updatePendingTag.trim();
  if (!tag) return '';
  const body = findChangelogBodyForTag(changelogPublished.value, tag);
  if (!body?.trim()) return '';
  return renderMarkdownToSafeHtml(body);
});
</script>

<template>
  <v-dialog
    :model-value="inApp.updateConfirmOpen"
    max-width="520"
    scrollable
    @update:model-value="onUpdateConfirmDialog"
  >
    <v-card rounded="lg">
      <v-card-title class="text-h6 font-weight-semibold pe-8">
        {{ t('settings.updates.inAppConfirmTitle') }}
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-3">
          {{ t('settings.updates.inAppConfirmIntro', { version: inApp.updatePendingVersion }) }}
        </p>
        <div
          v-if="updateConfirmNotesHtml"
          class="update-confirm-notes markdown-body text-body-2 rounded-md pa-3"
          v-html="updateConfirmNotesHtml"
        />
        <p v-else class="text-caption text-medium-emphasis mb-0">
          {{ t('settings.about.changelogEmpty') }}
        </p>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" :disabled="inApp.downloadingUpdate" @click="inApp.cancelPendingUpdate()">
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="inApp.downloadingUpdate"
          @click="inApp.confirmDownloadAndInstallUpdate()"
        >
          {{ t('settings.updates.inAppConfirmOk') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.update-confirm-notes {
  max-height: 240px;
  overflow-y: auto;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.update-confirm-notes :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.update-confirm-notes :deep(a:hover) {
  text-decoration: underline;
}
</style>
