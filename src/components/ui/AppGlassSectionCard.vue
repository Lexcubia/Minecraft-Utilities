<script setup lang="ts">
/**
 * 分区卡片：与 `AppGlassCard` 同源（GitHub Release 式毛玻璃 + 令牌圆角），
 * 用于设置页等「标题 + 正文」块，避免各处 `v-card` 圆角/表面不一致。
 */
import AppGlassCard from '@/components/ui/AppGlassCard.vue';
import { computed, useSlots } from 'vue';

const props = withDefaults(
  defineProps<{
    /** `default`：正文 `pa-4`；`none`：无内边距（列表、自定义排版） */
    bodyPadding?: 'default' | 'none';
  }>(),
  { bodyPadding: 'default' },
);

const slots = useSlots();
const hasOverline = computed(() => Boolean(slots.overline));
const hasHead = computed(() => Boolean(slots.head));
const hasTitle = computed(() => Boolean(slots.title));

const bodyClass = computed(() => {
  const base = 'app-glass-section-card__body';
  if (props.bodyPadding === 'none') return base;
  return `${base} pa-4`;
});
</script>

<template>
  <AppGlassCard tag="div" class="app-glass-section-card d-flex flex-column overflow-hidden">
    <div v-if="hasOverline" class="app-glass-section-card__overline">
      <slot name="overline" />
    </div>
    <div v-if="hasHead" class="app-glass-section-card__head">
      <slot name="head" />
    </div>
    <div
      v-else-if="hasTitle"
      class="app-glass-section-card__title text-subtitle-1 pa-4 app-border-block-end"
    >
      <slot name="title" />
    </div>
    <div :class="bodyClass">
      <slot />
    </div>
  </AppGlassCard>
</template>

<style scoped>
.app-glass-section-card__overline {
  flex-shrink: 0;
}
</style>
