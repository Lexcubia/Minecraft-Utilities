<script setup lang="ts">
import UpdatesTab from '@/views/settings/tabs/UpdatesTab.vue';

defineOptions({ name: 'UpdatesSettingsView' });
</script>

<template>
  <div>
    <h1 class="sr-only">更新</h1>
    <UpdatesTab />
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
