# Changelog

本文件记录面向用户的可见变更。未发布条目使用 **`## Unreleased`**（无方括号）；已发布版本使用 **`## [语义化版本] - 日期`** 以满足发布 CI 对 `<!-- release:publish -->` 的校验。

小节分类可采用 **`### Changes`**、**`### Bug fixes`**、**`### Breaking Changes`**（按需出现，无内容则省略该小节），写法与 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 相容。

## Unreleased

## [0.3.0] - 2026-05-13

<!-- release:publish -->

### Changes

- Python CLI **`uuid-migrate`**：Java 版存档目录内将旧玩家 UUID 批量替换为新 UUID（`playerdata` / `advancements` / `stats` 重命名 + 文本与 gzip NBT）；使用说明见 [使用说明（USAGE）](docs/zh-cn/USAGE.md)。
- **应用内更新（Tauri updater）**：开启 `bundle.createUpdaterArtifacts`；`desktop-release` 合并各平台 `latest.fragment.*.json` 并上传 **`latest.json`** 与 **`.sig`**；需在 GitHub Actions 配置 **`TAURI_SIGNING_PRIVATE_KEY`**（详见 [仓库设置说明](docs/zh-cn/REPO_SETUP.md)）。
- **桌面壳与窗口**：无边框主窗、自定义标题栏与拖拽区、毛玻璃卡片与设计令牌、全局右键菜单与主内容区滚动；设置布局与导航/访问标签体验调整。
- **系统托盘**：托盘菜单独立小窗与路由，**Rust** 侧托盘逻辑与 **capabilities** 能力同步扩展。
- **设置与提示**：设置面板/顶栏呈现、SnackBar 队列与应用日志相关体验；外观/日志/更新/关于等设置页布局与文案更新。
- **字体与主题**：通过 **Fontsource** 引入可选 Web 字体（含中文与像素风格等），外观设置支持字体预设；**Vuetify** 主题与组件样式扩展。
- **UUID 迁移页与欢迎页**：表单与向导流程、样式与中英文案优化。
- **品牌与安装图标**：`public/app-logo.svg` / `docs/img/logo.svg` 与 **`pnpm gen:logo`** 管线调整，并重新生成 **Tauri** 多平台图标资源。
- **开发者文档**：中文开发者文档索引补充 **[UI 令牌与壳层样式](docs/zh-cn/developers/UI_STYLES.md)**。

## [0.2.0] - 2026-05-12

<!-- release:publish -->

### Changes

- Windows **免安装便携包**：`pnpm tauri:build:portable` / `pnpm desktop:pack:portable`，产出 `artifacts/portable/Minecraft-Utilities-<version>-x64_portable.zip`；`desktop-release` 工作流在 Windows 矩阵中上传该 zip。
- 设置 **更新** 页：GitHub Release 列表与内置 `CHANGELOG.md` 合并展示，展开查看 **`### Changes`** 等小节内容；完整文件仍可从「在 GitHub 查看完整 CHANGELOG」打开。
- 品牌图标单一配置源 **`config/app-icons.json`**：`pnpm gen:logo` 写 SVG 并同步 `tauri.conf.json` 的 `bundle.icon`；Vite 注入 `index.html` favicon；`pnpm gen:logo` 含 `sync-tauri-bundle-icons-from-config`。
- Minecraft 风格草方块 **SVG** 品牌图标（`public/app-logo.svg` / `docs/img/logo.svg`）与 **`pnpm gen:logo`** 生成脚本。
- 产品统一为 **Minecraft Utilities**（本机 Minecraft 实用工具合集）；文档、README、CLI 与 `package.json` 展示名对齐。本地设置存储键更新为 `minecraft-utilities-settings-v1`（旧键下配置不会自动迁移）。
- Python 发行名与入口：`minecraft-utilities`（保留 `modpack-updater` 为兼容别名）。
- 导航侧栏品牌区与列表前置图标 **去掉** 图标区域底色块（品牌不再使用 `v-avatar` tonal）。
- 仓库与桌面发布流程对齐 **Lexcubia/Minecraft-Utilities**：`main` + CHANGELOG `<!-- release:publish -->` 触发 **`desktop-release`**；PR 上 **`changelog-publish-marker`** 校验版本提升时的发布标记。

## [0.1.0] - 2026-05-11

<!-- release:publish -->

### Changes

- Tauri 2 + Vue 桌面壳与 Python 引擎骨架（首期聚焦整合包/清单能力）。
- GitHub Actions：`check`、`test`、`commitlint`、PR 上 CHANGELOG 发布标记校验，以及合并到 `main` 后按版本与 `<!-- release:publish -->` 触发的 **`desktop-release`** 多平台构建与 GitHub Release。
