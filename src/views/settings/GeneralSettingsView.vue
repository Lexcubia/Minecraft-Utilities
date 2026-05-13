<script setup lang="ts">
import GeneralTab from '@/views/settings/tabs/GeneralTab.vue';

defineOptions({ name: 'GeneralSettingsView' });
</script>

<template>
  <div>
    <h1 class="sr-only">通用</h1>
    <GeneralTab />
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
