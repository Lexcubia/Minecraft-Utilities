<script setup lang="ts">
/**
 * 独立工具窗 / 设置类页面的通用骨架：顶区（标题、Tabs 等）不随正文纵向滚动，
 * 仅默认插槽区域滚动；配合外层 `.app-shell-main-scroll` 的 flex 列 + 本根节点
 * `flex-1 min-h-0 overflow-hidden` 占满主区高度并建立内部滚动链。
 *
 * 默认不设 padding / 外边距，由使用方通过 props 传入 Tailwind 等 class。
 *
 * 嵌套滚动时父级滚动容器须为 flex 列（本仓库对独立窗的
 * `.app-shell-main-scroll--nested-document` + `--inner-scroll-host` 启用），
 * 外壳 `overflow-y: hidden` 以免与内层滚动条、`scrollbar-gutter: stable` 叠加。
 */
withDefaults(
  defineProps<{
    /** 可选最大宽度类，如 max-w-2xl */
    maxWidthClass?: string;
    /** 根容器 class（建议全宽用 `w-100 min-w-0`；勿在此用 mx-auto/max-w-* 以免两侧留白） */
    containerClass?: string;
    /** 顶区 wrapper class（如 pt-8 mb-5） */
    headerClass?: string;
    /** 正文滚动区 wrapper class（如 pb-8） */
    bodyClass?: string;
  }>(),
  {
    maxWidthClass: '',
    containerClass: '',
    headerClass: '',
    bodyClass: '',
  },
);
</script>

<template>
  <div
    class="app-scrollable-document-frame d-flex flex-column flex-1 min-h-0 overflow-hidden"
    :class="[maxWidthClass, containerClass]"
  >
    <div
      v-if="$slots.header"
      class="app-scrollable-document-frame__header flex-shrink-0"
      :class="headerClass"
    >
      <slot name="header" />
    </div>
    <div
      class="app-scrollable-document-frame__body flex-grow-1 min-h-0 overflow-y-auto"
      :class="bodyClass"
    >
      <slot />
    </div>
  </div>
</template>
