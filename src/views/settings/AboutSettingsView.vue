<script setup lang="ts">
import AboutTab from '@/views/settings/tabs/AboutTab.vue';

defineOptions({ name: 'AboutSettingsView' });
</script>

<template>
  <div>
    <h1 class="sr-only">关于</h1>
    <AboutTab />
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
