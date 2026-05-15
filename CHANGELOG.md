# Changelog

本文件记录面向用户的可见变更。未发布条目使用 **`## Unreleased`**（无方括号）；已发布版本使用 **`## [语义化版本] - 日期`** 以满足发布 CI 对 `<!-- release:publish -->` 的校验。

小节分类可采用 **`### Changes`**、**`### Bug fixes`**、**`### Breaking Changes`**（按需出现，无内容则省略该小节），写法与 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 相容。

## Unreleased

## [0.1.3-beta] - 2026-05-15

<!-- release:publish -->

### Changes

- **应用内更新（Windows）**：下载显示实际进度（两位小数）；完成后自动替换安装目录并重启，重启后提示更新成功。
- **托盘**：右键菜单透明铺满、与展开箭头间距优化；右键不再唤起主窗口；默认关闭行为为最小化到系统托盘。
- **更新页**：版本标记仅显示「当前版本」「可升级」，样式与布局优化。
- **CI**：`check` / `test` 仅在合并进 `main` 后运行；移除耗时的 `cargo clippy` 门禁（Rust 编译由发版工作流覆盖）。

## [0.1.1] - 2026-05-14

<!-- release:publish -->

### Changes

- **设置持久化**：跨窗口/多实例同步与落盘策略；JSON 读写与合并容错改进。
- **应用内更新**：先检查、确认后再下载的流程；移除过度自动检查相关选项。
- **用户数据目录**：本机侧重日志目录落盘；其余设置由前端持久化承载。
- **发行与构建**：统一 **`build/`** 产物目录与 Windows 免安装打包；macOS **DMG** 与 Release 资产校验；多架构安装包选择逻辑与命名约定对齐。
- **桌面发行物**：关闭 Tauri 默认安装包矩阵（`bundle.active: false`）；GitHub Release 保留六款平台包（Linux `tar.gz` ×2、Windows `zip` ×2、macOS **DMG** ×2）；本地默认 **`pnpm desktop:build`** 为 `--no-bundle`；**`package.json`** 中桌面脚本统一为 **`desktop:*`**（见 **AGENTS.md**）。
- **CI**：扩展 check/test 路径触发范围；`src-tauri` 纳入 **Rust fmt / Clippy**。
- **界面与文案**：设置嵌入页标题与正文 **`max-w-2xl`** 列对齐；更新页与部分中英文案精简（含「升级」「更新记录」等区域）。

## [0.1.0] - 2026-05-15

<!-- release:publish -->

### Changes

- **桌面应用**：基于 **Tauri 2**、**Vue 3**、**Vite**、**TypeScript** 的本机壳层；围绕 **CurseForge zip** / **Modrinth mrpack** 与 **`.minecraft/versions/`** 版本隔离场景的产品与交互骨架；强调 **dry-run** 与**备份**后再写回。
- **Python 引擎**：`python/modpack_updater/` 包与 **`minecraft-utilities`**（兼容别名 **`modpack-updater`**）CLI 入口，业务规则集中于引擎侧。
- **发行与 CI**：`desktop-release` 多架构构建；Release 资产命名为 **`minecraft-utilities-linux-{x86_64|aarch64}-v{x.y.z}.tar.gz`**、**`minecraft-utilities-macos-{aarch64|x86_64}-v{x.y.z}.dmg`**、**`minecraft-utilities-win-{x86_64|aarch64}-v{x.y.z}.zip`**（Windows 无 NSIS/MSI 安装包）。
- **Windows 应用内更新**：从 GitHub **`releases/latest`** 匹配与本机架构一致的 zip，下载后解压到临时目录并打开资源管理器，便于用户自行覆盖安装目录。
- **数据与设置**：应用目录优先的 **`configs/`**、**`logs/`**、**`locales/`**、**`assets/`** 布局与种子文件；启动流程对 Pinia / 用户数据 / i18n 合并的容错。
- **工程化**：pnpm、ESLint、Vitest、Ruff、pytest、Husky、Prettier、Markdownlint、中文文档索引 **`docs/zh-cn/README.md`**、品牌 **`pnpm gen:logo`** 与 **`AGENTS.md`** 约定。
