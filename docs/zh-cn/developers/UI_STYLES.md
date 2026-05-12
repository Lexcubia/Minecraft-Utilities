# 前端 UI 样式约定

面向 **Vuetify 4 + 少量全局 CSS** 的桌面壳，目标：**同一套圆角/分割/毛玻璃/透明度语义**，避免在 `.vue` 里复制一长串 `color-mix`。

## 加载顺序

`src/main.ts` 中在 **`import vuetify`**（即 `vuetify/styles`）之后依次引入：

1. `design-tokens.css` — `:root` 上的 CSS 变量（依赖 `--v-theme-*`）
2. `app-ui.css` — 页面级语义类
3. `app-shell-scroll.css`、`shell-glass.css`、`accent-gradient.css`、`app-context-menu-surface.css` 等

新增全局样式时保持上述顺序，勿在令牌之前引用 `--v-theme-*`。

## 设计令牌 `src/styles/design-tokens.css`

- **`--app-radius-sm` … `--app-radius-xl`**：圆角档位，与 Vuetify `rounded-*` 对齐。
- **`--app-glass-blur`、`--app-glass-surface`**：顶栏/侧栏毛玻璃。
- **`--app-on-surface-05` … `--app-on-surface-14`**：弱底、hover、边框、阴影。
- **`--app-gradient-primary-secondary-135`**：主→次渐变（与 `accent-gradient.css` 一致）。
- **`--app-shadow-overlay-lg`**：右键菜单等浮层外阴影。
- **`--app-primary-06`**：列表行 hover 等浅主色底。
- **`--app-page-pad-x` / `--app-page-pad-y`**：`.app-page` 内边距。

**约定**：新组件需要「半透明 on-surface 叠色」时，优先从表中选一档；确需新比例时再在 `design-tokens.css` 增补命名变量，避免魔法数。

## 语义类 `src/styles/app-ui.css`

- **`.app-page`**：主内容区水平居中 + 最大宽度 + 标准内边距（欢迎页等）。
- **`.app-border-block-end`**：块下边框（工具栏/标签条与内容分割）。
- **`.app-panel-border`**：卡片式 `v-sheet` 外框 + `rounded-lg` 同档圆角。
- **`.app-focus-ring-inset`**：键盘焦点环（主色 inset）。

## Vuetify 全局默认 `src/plugins/vuetify.ts`

通过 `defaults` 统一：

- `global.ripple: false` — 更接近桌面控件
- `VBtn` / `VSheet` / `VCard` 圆角
- 表单控件 `outlined` + `comfortable` + `hideDetails` 策略

单页若需例外，在组件上显式覆盖 props 即可。

## 布局常量 `src/constants/ui-layout.ts`

- **`APP_DRAWER_WIDTH_PX`** — 与 `AppShellNavigationDrawer` 的 `width` 一致，改默认窗口宽度时请一并考虑。
- **`APP_PAGE_MAX_WIDTH_REM`** — 与 `.app-page` 的 `max-width: 48rem` 一致，改页面宽度时请同步。

## Vue 单文件

- **壳层结构、与 Vuetify 深度耦合的样式**：可用 `<style scoped>` + `:deep()`。
- **跨多个壳组件复用的「皮肤」**（如右键菜单列表项 hover）：优先用设计令牌变量，减少复制。
- **Tailwind**：仓库根已引入；页面布局优先用 **语义类 + Vuetify**，避免大块 `class="flex ..."` 与 Vuetify 栅格混用导致两套体系打架。

## 与 AGENTS 的关系

更细的工程约定见仓库根 [AGENTS.md](../../../AGENTS.md)。
