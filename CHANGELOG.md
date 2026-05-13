# Changelog

本文件记录面向用户的可见变更。未发布条目使用 **`## Unreleased`**（无方括号）；已发布版本使用 **`## [语义化版本] - 日期`** 以满足发布 CI 对 `<!-- release:publish -->` 的校验。

小节分类可采用 **`### Changes`**、**`### Bug fixes`**、**`### Breaking Changes`**（按需出现，无内容则省略该小节），写法与 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 相容。

## Unreleased

### Changes

- **桌面发行物**：关闭 Tauri 默认安装包矩阵（`bundle.active: false`）；GitHub Release 保留六款平台包（Linux `tar.gz` ×2、Windows `zip` ×2、macOS **`dmg` ×2**）；默认 `pnpm tauri:build` 为 `--no-bundle`，发版矩阵在 mac 上显式打 DMG。

## [0.1.0] - 2026-05-15

<!-- release:publish -->

### Changes

- **桌面应用**：基于 **Tauri 2**、**Vue 3**、**Vite**、**TypeScript** 的本机壳层；围绕 **CurseForge zip** / **Modrinth mrpack** 与 **`.minecraft/versions/`** 版本隔离场景的产品与交互骨架；强调 **dry-run** 与**备份**后再写回。
- **Python 引擎**：`python/modpack_updater/` 包与 **`minecraft-utilities`**（兼容别名 **`modpack-updater`**）CLI 入口，业务规则集中于引擎侧。
- **发行与 CI**：`desktop-release` 多架构构建；Release 资产命名为 **`minecraft-utilities-linux-{x86_64|aarch64}-v{x.y.z}.tar.gz`**、**`minecraft-utilities-macos-{aarch64|x86_64}-v{x.y.z}.dmg`**、**`minecraft-utilities-win-{x86_64|aarch64}-v{x.y.z}.zip`**（Windows 无 NSIS/MSI 安装包）。
- **Windows 应用内更新**：从 GitHub **`releases/latest`** 匹配与本机架构一致的 zip，下载后解压到临时目录并打开资源管理器，便于用户自行覆盖安装目录。
- **数据与设置**：应用目录优先的 **`configs/`**、**`logs/`**、**`locales/`**、**`assets/`** 布局与种子文件；启动流程对 Pinia / 用户数据 / i18n 合并的容错。
- **工程化**：pnpm、ESLint、Vitest、Ruff、pytest、Husky、Prettier、Markdownlint、中文文档索引 **`docs/zh-cn/README.md`**、品牌 **`pnpm gen:logo`** 与 **`AGENTS.md`** 约定。
