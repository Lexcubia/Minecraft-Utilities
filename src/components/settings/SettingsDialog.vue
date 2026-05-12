<script setup lang="ts">
import AppGlassCard from '@/components/ui/AppGlassCard.vue';
import SettingsPanel from '@/components/settings/SettingsPanel.vue';
import type { SettingsTab } from '@/views/settings/settings-tabs';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
  /** 打开对话框时默认选中的分区 */
  initialTab?: SettingsTab;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const activeTab = ref<SettingsTab>('general');

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeTab.value = props.initialTab ?? 'general';
    }
  },
);

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <AppGlassCard tag="div" class="settings-dialog-card overflow-hidden d-flex flex-column">
      <v-toolbar color="transparent" class="px-2 app-border-block-end" flat>
        <v-toolbar-title class="text-h6 font-weight-medium">{{ t('nav.settingsHeader') }}</v-toolbar-title>
        <v-spacer />
        <v-btn icon variant="text" :aria-label="t('common.close')" @click="close">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-toolbar>

      <SettingsPanel v-model="activeTab" variant="dialog" class="flex-grow-1 min-h-0" />
    </AppGlassCard>
  </v-dialog>
</template>

<style scoped>
.settings-dialog-card {
  max-height: min(92vh, 760px);
}
</style>
