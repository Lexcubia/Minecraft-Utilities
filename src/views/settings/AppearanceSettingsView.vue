<script setup lang="ts">
import AppearanceTab from '@/views/settings/tabs/AppearanceTab.vue';

defineOptions({ name: 'AppearanceSettingsView' });
</script>

<template>
  <div>
    <h1 class="sr-only">外观</h1>
    <AppearanceTab />
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
