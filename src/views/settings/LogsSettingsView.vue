<script setup lang="ts">
import LogsTab from '@/views/settings/tabs/LogsTab.vue';
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'LogsSettingsView' });

const { t } = useI18n();
</script>

<template>
  <div>
    <h1 class="sr-only">{{ t('settings.sections.logs') }}</h1>
    <LogsTab />
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
