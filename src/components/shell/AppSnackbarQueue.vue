<script setup lang="ts">
import {
  APP_SNACK_ID_KEY,
  useSnackbarQueueStore,
  type AppSnackbarAction,
} from '@/stores/snackbar-queue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import type { SnackbarMessage } from 'vuetify/lib/components/VSnackbarQueue/VSnackbarQueue.js';

const { t } = useI18n();
const store = useSnackbarQueueStore();
const { messages } = storeToRefs(store);

function snackIdFromItem(item: SnackbarMessage): string | undefined {
  if (typeof item === 'string') return undefined;
  const v = (item as Record<string, unknown>)[APP_SNACK_ID_KEY];
  return typeof v === 'string' ? v : undefined;
}

function isClosableItem(item: SnackbarMessage): boolean {
  if (typeof item === 'string') return true;
  return (item as { closable?: boolean }).closable !== false;
}

async function onActionClick(action: AppSnackbarAction, dismiss: () => void): Promise<void> {
  try {
    await action.run?.();
  } finally {
    dismiss();
  }
}

function onCustomActionClick(item: SnackbarMessage, action: AppSnackbarAction, dismiss: () => void) {
  const sid = snackIdFromItem(item);
  if (!sid) return;
  void onActionClick(action, dismiss);
}
</script>

<template>
  <v-snackbar-queue
    v-model="messages"
    location="bottom"
    :timeout="3000"
    :closable="false"
    collapsed
    display-strategy="overflow"
    :total-visible="3"
    :gap="8"
    class="app-snackbar-queue-host"
    content-class="app-snackbar-queue-snack"
  >
    <template #actions="{ item, props }">
      <v-btn
        v-for="(a, i) in store.getActionsFor(snackIdFromItem(item))"
        :key="`${snackIdFromItem(item) ?? 'x'}-${i}`"
        variant="text"
        color="primary"
        @click="onCustomActionClick(item, a, props.onClick)"
      >
        {{ a.label }}
      </v-btn>
      <v-btn
        v-if="isClosableItem(item)"
        icon
        variant="text"
        density="comfortable"
        :aria-label="t('common.close')"
        @click="props.onClick"
      >
        <v-icon icon="mdi-close" size="20" />
      </v-btn>
    </template>
  </v-snackbar-queue>
</template>
