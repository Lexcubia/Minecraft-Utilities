<script setup lang="ts">
import { NButton, NCard, NSpace, NText, NThing } from 'naive-ui';
import { invoke } from '@tauri-apps/api/core';
import { ref } from 'vue';

const greetMsg = ref('');

async function pingRust() {
  greetMsg.value = await invoke<string>('greet', { name: 'Modpack' });
}
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-6">
    <n-thing title="Minecraft 整合包升级工具" description="Tauri 2 · Vite · Vue 3 · Naive UI">
      <template #header-extra>
        <n-text depth="3">开发中</n-text>
      </template>
    </n-thing>

    <n-card title="下一步" size="small" class="card">
      <n-space vertical>
        <n-text depth="2"> 核心引擎（Python）与向导流程见仓库 </n-text>
        <code>docs/</code>
        <n-space>
          <n-button type="primary" @click="pingRust"> 测试 Tauri 调用 </n-button>
        </n-space>
        <n-text v-if="greetMsg" depth="2">{{ greetMsg }}</n-text>
      </n-space>
    </n-card>
  </div>
</template>

<style scoped>
.card {
  margin-top: 20px;
}
</style>
