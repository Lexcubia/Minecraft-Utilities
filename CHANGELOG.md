# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-05-12

<!-- release:publish -->

### Added

- Windows **免安装便携包**：`pnpm tauri:build:portable` / `pnpm desktop:pack:portable`，产出 `artifacts/portable/Minecraft-Utilities-<version>-x64_portable.zip`；`desktop-release` 工作流在 Windows 矩阵中上传该 zip。
- 设置 **关于** 页内嵌 **CHANGELOG** 版本更迭（`CHANGELOG.md?raw`、折叠面板、GitHub 完整文件入口）。
- 品牌图标单一配置源 **`config/app-icons.json`**：`pnpm gen:logo` 写 SVG 并同步 `tauri.conf.json` 的 `bundle.icon`；Vite 注入 `index.html` favicon；`pnpm gen:logo` 含 `sync-tauri-bundle-icons-from-config`。
- Minecraft 风格草方块 **SVG** 品牌图标（`public/app-logo.svg` / `docs/img/logo.svg`）与 **`pnpm gen:logo`** 生成脚本。

### Changed

- 产品统一为 **Minecraft Utilities**（本机 Minecraft 实用工具合集）；文档、README、CLI 与 `package.json` 展示名对齐。本地设置存储键更新为 `minecraft-utilities-settings-v1`（旧键下配置不会自动迁移）。
- Python 发行名与入口：`minecraft-utilities`（保留 `modpack-updater` 为兼容别名）。
- 导航侧栏品牌区与列表前置图标 **去掉** 图标区域底色块（品牌不再使用 `v-avatar` tonal）。
- 仓库与桌面发布流程对齐 **Lexcubia/Minecraft-Utilities**：`main` + CHANGELOG `<!-- release:publish -->` 触发 **`desktop-release`**；PR 上 **`changelog-publish-marker`** 校验版本提升时的发布标记。

### Fixed

## [0.1.0] - 2026-05-11

<!-- release:publish -->

### Added

- Tauri 2 + Vue 桌面壳与 Python 引擎骨架（首期聚焦整合包/清单能力）。
- GitHub Actions：`check`、`test`、`commitlint`、PR 上 CHANGELOG 发布标记校验，以及合并到 `main` 后按版本与 `<!-- release:publish -->` 触发的 **`desktop-release`** 多平台构建与 GitHub Release。
