# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- 产品统一为 **Minecraft Utilities**（本机 Minecraft 实用工具合集）；文档、README、CLI 与 `package.json` 展示名对齐。本地设置存储键更新为 `minecraft-utilities-settings-v1`（旧键下配置不会自动迁移）。
- Python 发行名与入口：`minecraft-utilities`（保留 `modpack-updater` 为兼容别名）。

### Fixed

## [0.1.0] - 2026-05-11

<!-- release:publish -->

### Added

- Tauri 2 + Vue 桌面壳与 Python 引擎骨架（首期聚焦整合包/清单能力）。
- GitHub Actions：`check`、`test`、`commitlint`、PR 上 CHANGELOG 发布标记校验，以及合并到 `main` 后按版本与 `<!-- release:publish -->` 触发的 **`desktop-release`** 多平台构建与 GitHub Release。
