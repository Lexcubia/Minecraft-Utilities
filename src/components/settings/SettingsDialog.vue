<script setup lang="ts">
import AboutTab from '@/views/settings/tabs/AboutTab.vue';
import AppearanceTab from '@/views/settings/tabs/AppearanceTab.vue';
import GeneralTab from '@/views/settings/tabs/GeneralTab.vue';
import UpdatesTab from '@/views/settings/tabs/UpdatesTab.vue';
import {
  SETTINGS_SECTIONS,
  type SettingsTab,
} from '@/views/settings/settings-tabs';
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

const tabComponents: Record<SettingsTab, typeof AppearanceTab> = {
  general: GeneralTab,
  appearance: AppearanceTab,
  updates: UpdatesTab,
  about: AboutTab,
};

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
    <v-card color="surface" variant="flat" rounded="xl">
      <v-toolbar color="surface" class="px-2 border-b">
        <v-toolbar-title class="text-h6 font-weight-medium">{{ t('nav.settingsHeader') }}</v-toolbar-title>
        <v-spacer />
        <v-btn icon variant="text" :aria-label="t('common.close')" @click="close">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-toolbar>

      <v-tabs
        v-model="activeTab"
        bg-color="surface"
        color="primary"
        grow
        show-arrows
        class="settings-dialog-tabs border-b"
      >
        <v-tab
          v-for="item in SETTINGS_SECTIONS"
          :key="item.id"
          :text="t(item.labelKey)"
          :value="item.id"
        />
      </v-tabs>

      <v-card-text class="pa-4 settings-dialog-body">
        <v-window v-model="activeTab">
          <v-window-item
            v-for="item in SETTINGS_SECTIONS"
            :key="item.id"
            :value="item.id"
            class="pt-2"
          >
            <component :is="tabComponents[item.id]" />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.settings-dialog-body {
  max-height: min(70vh, 640px);
  overflow-y: auto;
}

.settings-dialog-tabs :deep(.v-tab) {
  min-width: 0;
  text-transform: none;
  letter-spacing: normal;
}
</style>
