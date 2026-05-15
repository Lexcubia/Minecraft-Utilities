# 前端 UI 样式约定

面向 **Vuetify 4 + 少量全局 CSS** 的桌面壳，目标：**同一套圆角/分割/毛玻璃/透明度语义**，以及 **Linear 式密度档位**；避免在 `.vue` 里复制一长串 `color-mix`，也**避免在文档里按组件逐条规定写法**（新组件应在既有档位上扩展，而不是无限追加规范条目）。

> 说明：本文件提供样式体系与实现背景；需要“强制执行”的限制条款，以 `.cursor/rules/project-authority.mdc` 为准。

## 加载顺序

`src/main.ts` 中在 **`import vuetify`**（即 `vuetify/styles`）之后依次引入：

1. `design-tokens.css` — `:root` 上的 CSS 变量（依赖 `--v-theme-*`）
2. `app-ui.css` — 页面级语义类
3. `app-btn-toggle.css` — **仅**分段按钮组**相邻衔接处**的几何（直角接缝）；密度与字距不在此文件
4. `app-glass-card.css`、`app-shell-scroll.css`、`shell-glass.css`、`accent-gradient.css`、`app-context-menu-surface.css`、**`linear-density.css`** 等

新增全局样式时保持上述顺序，勿在令牌之前引用 `--v-theme-*`。

## 设计令牌 `src/styles/design-tokens.css`

- **`--app-radius-sm` … `--app-radius-xl`**：圆角档位，与 Vuetify `rounded-*` 对齐。
- **`--app-glass-blur`、`--app-glass-surface`**：顶栏/侧栏毛玻璃。
- **`--app-on-surface-05` … `--app-on-surface-14`**：弱底、hover、边框、阴影。
- **`--app-gradient-primary-secondary-135`**：主→次渐变（与 `accent-gradient.css` 一致）。
- **`--app-shadow-overlay-lg`**：右键菜单等浮层外阴影。
- **`--app-primary-06`**：列表行 hover 等浅主色底。
- **`--app-page-pad-x` / `--app-page-pad-y`**：`.app-page` 内边距。
- **`--app-control-compact-height`** 等：与 **Linear 密度**共用的紧凑控件高度档位（见 `linear-density.css`）。

**约定**：新组件需要「半透明 on-surface 叠色」时，优先从表中选一档；确需新比例时再在 `design-tokens.css` 增补**命名变量**，避免魔法数。

## Linear 密度 `src/styles/linear-density.css`

主窗口根由 `App.vue` 挂载 **`app-linear-ui`**（托盘菜单窗不挂载）。**按钮高度、列表行、侧栏字距、分段组与 small 按钮对齐**等，均在本文件按**档位**扩展；新增一类控件时，**优先在此对齐已有选择器**，而不是新开一页 `:deep()`。

与 `app-btn-toggle.css` 的分工：**衔接几何**在后者；**在 `.app-linear-ui` 下的字重/字号/高度**在前者。

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
- **跨多页复用的「皮肤」**：建议用设计令牌 + **`src/styles` 全局 CSS**，并按上节顺序引入，减少在多个 `.vue` 复制同一套 `:deep()` 的维护成本。
- **Tailwind**：仓库根已引入；页面布局优先用 **语义类 + Vuetify**，避免大块 `class="flex ..."` 与 Vuetify 栅格混用导致两套体系打架。

## 与 AGENTS 的关系

更细的工程约定见仓库根 [AGENTS.md](../../../AGENTS.md)。当前仓库将“硬性约束”集中在 `.cursor/rules/project-authority.mdc`，本文件保留为样式体系说明与实施参考。
