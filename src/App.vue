<script setup lang="ts">
import { NConfigProvider, dateZhCN, zhCN } from 'naive-ui';
import { RouterView } from 'vue-router';
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <router-view />
  </n-config-provider>
</template>
