<script setup lang="ts">
import AboutTab from '@/views/settings/tabs/AboutTab.vue';
import AppearanceTab from '@/views/settings/tabs/AppearanceTab.vue';
import GeneralTab from '@/views/settings/tabs/GeneralTab.vue';
import LogsTab from '@/views/settings/tabs/LogsTab.vue';
import UpdatesTab from '@/views/settings/tabs/UpdatesTab.vue';
import {
  SETTINGS_SECTIONS,
  type SettingsTab,
} from '@/views/settings/settings-tabs';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** 受控时与 v-model 同步 */
    modelValue?: SettingsTab;
    /** 非受控时的初始分区 */
    initialTab?: SettingsTab;
    /** `dialog`：限制正文高度；`page`：随布局伸展 */
    variant?: 'dialog' | 'page';
  }>(),
  { variant: 'dialog', modelValue: undefined, initialTab: undefined },
);

const emit = defineEmits<{
  'update:modelValue': [value: SettingsTab];
}>();

const activeTab = ref<SettingsTab>(props.modelValue ?? props.initialTab ?? 'general');

const tabComponents: Record<SettingsTab, typeof AppearanceTab> = {
  general: GeneralTab,
  appearance: AppearanceTab,
  updates: UpdatesTab,
  logs: LogsTab,
  about: AboutTab,
};

watch(
  () => props.modelValue,
  (v) => {
    if (v !== undefined) activeTab.value = v;
  },
);

watch(
  () => props.initialTab,
  (v) => {
    if (props.modelValue === undefined && v !== undefined) activeTab.value = v;
  },
);

watch(activeTab, (v) => {
  if (props.modelValue !== undefined) emit('update:modelValue', v);
});
</script>

<template>
  <div class="settings-panel">
    <v-tabs
      v-model="activeTab"
      bg-color="transparent"
      color="primary"
      grow
      show-arrows
      class="settings-panel-tabs app-border-block-end flex-shrink-0"
    >
      <v-tab
        v-for="item in SETTINGS_SECTIONS"
        :key="item.id"
        :text="t(item.labelKey)"
        :value="item.id"
      />
    </v-tabs>

    <div
      class="settings-panel-body pa-4"
      :class="{ 'settings-panel-body--dialog': props.variant === 'dialog' }"
    >
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
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
}

.settings-panel-body {
  overflow-y: auto;
  min-height: 0;
  flex: 1 1 auto;
}

.settings-panel-body--dialog {
  max-height: min(70vh, 640px);
}

.settings-panel-tabs :deep(.v-tab) {
  min-width: 0;
  text-transform: none;
  letter-spacing: normal;
}
</style>
