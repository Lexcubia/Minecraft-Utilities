# Changelog

本文件记录面向用户的可见变更。未发布条目使用 **`## Unreleased`**（无方括号）；已发布版本使用 **`## [语义化版本] - 日期`** 以满足发布 CI 对 `<!-- release:publish -->` 的校验。

小节分类可采用 **`### Changes`**、**`### Bug fixes`**、**`### Breaking Changes`**（按需出现，无内容则省略该小节），写法与 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 相容。

## Unreleased

## [0.3.2] - 2026-05-15

<!-- release:publish -->

### Bug fixes

- **启动白屏**：`bootstrap` 中先 **`app.use(pinia)`** 再执行 Tauri 用户数据与设置合并；对用户数据初始化、**`user_data_get_paths`** 返回 JSON、磁盘 **`locales/*.json`** 合并增加容错，失败时回退到内置默认设置并继续 **`mount`**；磁盘文案仅在为**普通对象**（非数组等）时才 **`mergeLocaleMessage`**。

### Changes

- **设置默认文件**：`configs/settings.json` 以仓库 **`src/config/settings.json`** 为完整默认（非空 JSON）；Rust 在磁盘缺失/空白/`{}` 时写入该默认；前端启动时再与磁盘合并，避免空白配置导致界面异常。

## [0.3.1] - 2026-05-14

<!-- release:publish -->

### Changes

- **Windows 桌面更新**：移除 Tauri `updater` 插件；应用从 GitHub **`releases/latest`** 对比版本并下载 **`Minecraft-Utilities_*_x64-setup.exe`**（NSIS），静默启动安装程序。macOS / Linux 仍从 Release 手动下载。
- **CI**：`desktop-release` 不再要求 `TAURI_SIGNING_PRIVATE_KEY`，也不再合并上传 **`latest.json`** / **`.sig`**（旧 Tauri updater 流程）。
- **桌面应用数据目录**：持久化优先在**应用目录**（**可执行文件所在目录**）下维护 **`configs/settings.json`**、**`locales/`**、**`assets/`**、**`logs/`**；`configs/settings.json` 为界面设置的主配置；不可写时回退 **`app_local_data_dir()`** 并保持相同目录名。若旧数据仅在 AppData，首次在可写应用目录启动时会**合并复制**缺失项；曾用目录名 **`config`** / **`log`** 的会自动重命名为 **`configs`** / **`logs`**。种子仍由 **`bundle.resources`**（`src/locales`、`src/log`、`src/config`、`src/user-data/assets`）提供。
- **会话日志落盘**：写入当前数据根下的 **`logs/app.log`**（UTF-8 单行；过大时轮转为 `app.log.prev`）；设置页「运行日志」提示完整路径。

## [0.3.0] - 2026-05-13

<!-- release:publish -->

### Changes

#### 命令行（Python）

- **`uuid-migrate`**：在 **Java 版世界存档目录** 中，把旧玩家 UUID **批量替换**为新 UUID；覆盖 `playerdata`、`advancements`、`stats` 等路径下的**文件改名**，以及普通文本与 **gzip NBT** 内的引用。命令行用法见 [使用说明（USAGE）](docs/zh-cn/USAGE.md)。

#### 应用内自动更新

- **桌面客户端**支持通过内置更新器**检查并安装新版本**（启用 `bundle.createUpdaterArtifacts` 等构建产物）。
- **维护者 / CI**：`desktop-release` 会合并各平台的 `latest.fragment.*.json`，上传 **`latest.json`** 与 **`.sig`**；请在 GitHub Actions 配置 **`TAURI_SIGNING_PRIVATE_KEY`**，步骤见 [仓库设置说明](docs/zh-cn/REPO_SETUP.md)。

#### 主窗口、导航与外观

- **窗口**：主窗口为**无边框**；提供**自定义标题栏**（可拖动移动）、窗口按钮与更顺滑的**主内容区滚动**；毛玻璃卡片与**设计令牌**统一视觉层次。
- **操作**：新增**全局右键菜单**；侧栏与「已访问标签」等导航更易用。
- **字体与主题**：引入 **Fontsource** 可选 Web 字体（含中文与像素风格等），在**外观**里选择**字体预设**；**Vuetify** 主题与组件样式一并扩展。

#### 设置、通知与日志

- **设置**：支持**面板 / 顶栏**等呈现方式；「外观、日志、更新、关于」等分页的**布局与文案**更新。
- **通知与日志**：**SnackBar** 支持**排队**显示；应用日志相关展示与选项调整。

#### 系统托盘

- **托盘菜单**在独立**小窗口**中打开，结构更清晰；托盘相关**权限与后端逻辑**（含 `capabilities`）已同步扩展。

#### 内置页面

- **UUID 迁移**与**欢迎**页的向导 / 表单流程、样式与中英文案优化。

#### 品牌与安装图标

- 更新品牌 **SVG**（`public/app-logo.svg`、`docs/img/logo.svg`）与 **`pnpm gen:logo`** 生成管线，并**重新导出**各平台安装包与启动器所用图标。

#### 开发者文档

- 中文开发者索引增加 **[UI 令牌与壳层样式](docs/zh-cn/developers/UI_STYLES.md)**，说明壳层间距、颜色与玻璃态等约定，便于后续改界面时保持一致。

## [0.2.0] - 2026-05-12

<!-- release:publish -->

### Changes

#### Windows 便携分发

- **免安装压缩包**：本地构建可用 `pnpm tauri:build:portable` 或 `pnpm desktop:pack:portable`，生成 `artifacts/portable/Minecraft-Utilities-<version>-x64_portable.zip`，解压即可运行。
- **维护者 / CI**：`desktop-release` 在 Windows 矩阵中会上传上述便携 **zip**，便于在 Release 中一并分发。

#### 设置里的「更新」页

- 将 **GitHub Release 列表** 与应用内置的 **`CHANGELOG.md`** **合并展示**；可按小节展开阅读（如 **`### Changes`**）。需要全文时仍可通过「在 GitHub 查看完整 CHANGELOG」跳转。

#### 品牌与图标管线

- 新增 **Minecraft 风格草方块** 品牌 **SVG**（`public/app-logo.svg`、`docs/img/logo.svg`）及配套 **`pnpm gen:logo`** 脚本。
- **单一配置源** **`config/app-icons.json`**：运行 `pnpm gen:logo` 时写回 SVG、同步 **`tauri.conf.json`** 的 `bundle.icon`、为 **`index.html`** 注入 favicon，并执行 `sync-tauri-bundle-icons-from-config`，减少手工改多处配置。

#### 产品命名与命令行

- 对外产品名统一为 **Minecraft Utilities**（本机 Minecraft 实用工具合集）；文档、README、桌面与 `package.json` 等展示名对齐。
- **Python 包 / CLI**：推荐入口为 **`minecraft-utilities`**；历史别名 **`modpack-updater`** 仍可用。

#### 本地设置存储

- 设置持久化键更新为 **`minecraft-utilities-settings-v1`**。**旧键下的配置不会自动迁移**，升级后相当于重新使用默认设置（属行为变化，升级前请自行备份或记下重要选项）。

#### 主界面

- 导航侧栏：**品牌区**与列表项前置图标**去掉**图标区域底色块，视觉更干净（不再使用 `v-avatar` 的 tonal 背景样式）。

#### 仓库与发布流程（维护者）

- 远程与发版流程对齐 **`Lexcubia/Minecraft-Utilities`**：合并到 **`main`** 且 **`CHANGELOG.md`** 对应版本含 **`<!-- release:publish -->`** 时触发 **`desktop-release`**；PR 上由 **`changelog-publish-marker`** 校验「升版本时是否带发布标记」，减少漏配发版信息。

## [0.1.0] - 2026-05-11

<!-- release:publish -->

### Changes

#### 首期能力范围

- 交付 **Tauri 2 + Vue** 桌面壳与 **Python** 引擎骨架；当前阶段侧重**整合包 / 清单**相关能力的基础打通（后续版本在此之上迭代功能）。

#### 自动化与发版（维护者）

- **GitHub Actions**：提供 **`check`**（格式与静态检查等）、**`test`**（前端与 Python 测试）、**`commitlint`**（提交信息规范）。
- **合并前**：在指向默认分支的 **PR** 上校验 **`CHANGELOG.md`** 的发布标记等约定。
- **合并后**：代码进入 **`main`** 且版本与 **`CHANGELOG.md`** 中 **`<!-- release:publish -->`** 条件满足时，触发 **`desktop-release`**，进行多平台构建并发布 **GitHub Release**。
