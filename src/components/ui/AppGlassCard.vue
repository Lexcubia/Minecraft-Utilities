<script setup lang="ts">
/**
 * 毛玻璃卡片根（与 `app-glass-card` 样式同源）。
 * 分区标题 + 正文请优先用 `AppGlassSectionCard.vue`。
 */
withDefaults(
  defineProps<{
    tag?: string;
  }>(),
  { tag: 'div' },
);
</script>

<template>
  <component :is="tag" class="app-glass-card">
    <slot />
  </component>
</template>
