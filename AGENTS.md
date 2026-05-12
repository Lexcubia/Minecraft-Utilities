# AI Agent / 贡献者指南

本仓库产品名为 **Minecraft Utilities**（本机 Minecraft 实用工具合集）。技术栈以 **Tauri 2 + Vite + Vue** 为仓库根主体（`src/`、`src-tauri/`），**Python** 引擎为子目录包 `python/modpack_updater/`（包名历史原因保留目录名；CLI 入口见 `pyproject.toml`）；根目录 **pnpm** 管理 Node 依赖，并配有 **Prettier、Markdownlint、Husky、AGENTS、docs 索引** 等工程化约定。

## 项目组成

| 部分                       | 路径                      | 说明                                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python 引擎                | `python/modpack_updater/` | 清单/整合包解析、Curse/Modrinth、差异、下载、写回等引擎能力；CLI 入口 `minecraft-utilities`（兼容别名 `modpack-updater`）                                                                                                                                                                       |
| 桌面端（仓库根）           | `src/`、`src-tauri/`      | Tauri 2 + Vite + Vue + TS + Tailwind + Vuetify + Pinia + Vue Router                                                                                                                                                                                                                             |
| 文档（使用 / 开发 / 法律） | `docs/`                   | 入口 [docs/zh-cn/README.md](docs/zh-cn/README.md)；根 [README](README.md) 为架构与功能一览                                                                                                                                                                                                      |
| 品牌 / 图标                | `config/app-icons.json`   | 唯一配置：Web favicon 路径、SVG 输出列表、`tauri.conf.json` 的 `bundle.icon`、README 居中图路径；`pnpm gen:logo` 写 SVG 并同步 Tauri；前端用 `src/constants/app-icons.ts`（`app-meta` 再导出 `APP_LOGO_URL`）；托盘 PNG 与 `tray_desktop.rs` 注释须与配置中 `trayPngRelativeToSrcTauriDir` 一致 |

## 编码约定

- **业务逻辑**放在 Python 引擎；Vue 只做展示与调用本机 API / Tauri `invoke`，不在前端复制解析规则。
- **Python**：`ruff`（含 **format**）+ `pytest`；提交前 `ruff check python tests`、`ruff format --check python tests` 与 `pytest`。
- **前端**：`pnpm lint:app`（**ESLint 9** flat + `typescript-eslint` + `eslint-plugin-vue`，与 Prettier 由 `eslint-config-prettier` 对齐）、`pnpm test`（**Vitest**）、`pnpm build`（`vue-tsc` + Vite）；完整 `tauri build` 需本机 Rust。
- **Markdown**：根目录 `pnpm lint:md`（**markdownlint-cli2**，规则见 [.markdownlint.json](.markdownlint.json)；根 README 含 HTML 居中块，已关闭 **MD041**）。
- **一键（仅 JS 侧）**：`pnpm verify:js`（format + lint + test + build）。
- **Windows 免安装包**：`pnpm tauri:build:portable`（前端 + `tauri build --no-bundle` + zip）或完整 `tauri build` 后执行 `pnpm desktop:pack:portable`；产出见 `artifacts/portable/*.zip`，逻辑在 `scripts/pack-windows-portable.mjs`；CI 见 `desktop-release.yml`。
- **版本号**：唯一维护根目录 **`package.json` 的 `version`**；发版迭代用 **`pnpm version patch|minor|major`**（会跑 **`scripts/sync-version.mjs`** 同步 Tauri/Python/Cargo 与 **`Cargo.lock`**，无 Rust 时设 **`SKIP_CARGO_SYNC=1`**）；仅手改版本后执行 **`pnpm sync:version`**。**`CHANGELOG.md`** 仍手写。详见 [docs/zh-cn/REPO_SETUP.md](docs/zh-cn/REPO_SETUP.md)。
- **配置文件命名**：仓库根为 **ESM**（`package.json` 中 `"type": "module"`），工具链配置使用 **`.js`**（如 `prettier.config.js`、`lint-staged.config.js`、`commitlint.config.js`）；前端与构建相关为 **`.ts`**（如 `eslint.config.ts`、`vite.config.ts`），**不使用 `.mjs`**。
- **格式化**：仓库根 `pnpm format`（Prettier：仓库根 md/json/yaml + 根目录 `*.js` 配置 + **`src/**/_.ts`** / **`src/\*\*/_.css`** / `eslint.config.ts`/`vitest.config.ts`/`vite.config.ts`）；`.vue` 单文件暂由 **Volar / IDE** 排版（`prettier-plugin-vue`与当前 Vue 3.5 SFC 组合存在解析问题，待插件升级后再纳入 Prettier）；**ESLint** 覆盖`.vue` 与 TS。

## Git 钩子与提交说明

- **Husky**：`package.json` 的 `prepare` 在安装依赖时执行 `husky`，将 `core.hooksPath` 指向 `.husky/_`（需本机为 **git 仓库**）。临时跳过钩子可设环境变量 **`HUSKY=0`**。
- **pre-commit**：若当前分支为 **`main` / `master`** 则**直接拒绝提交**（与「禁止直推默认分支」一致）；否则运行 **lint-staged**（见根目录 [`lint-staged.config.js`](lint-staged.config.js)）：对暂存区执行 **`src/`** 下 **ESLint --fix**、相关 **Prettier**，以及仓库根 **md/json/yaml/js/cjs** 的 Prettier。Python 仍请在提交前自行执行 `ruff`/`pytest` 或依赖 CI。
- **commit-msg**：先由 **`scripts/strip-cursor-coauthor.mjs`** 去掉 Cursor 注入的 **`Co-authored-by:`** 尾注，再运行 **commitlint**（[`commitlint.config.js`](commitlint.config.js)），继承 **[@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional)**。提交标题示例：`feat(gui): 描述`、`fix: 描述`、`docs: 描述`、`chore: 描述`。
- **CI**：GitHub Actions 见 [`.github/workflows/`](.github/workflows/)，命名与职责参考 [MaaEnd v2 workflows](https://github.com/MaaEnd/MaaEnd/tree/v2/.github/workflows)：**`check`**（格式 + 全量 lint + Ruff）、**`test`**（Vitest + Pytest）：在 **`push` 到非 `main`/`master` 分支**（如 `develop`、功能分支）且命中 `paths` 时运行；**`pull_request` 指向 `main`/`master`** 时仍运行（合并前门禁）。**`commitlint`**、**`changelog-publish-marker`** 仅 **PR**。**桌面发布**：合并到 **`main`** 后由 **`desktop-release.yml`** 检测：无 **`vx.y.z`** 标签且 CHANGELOG 该版本小节含发布标记则多平台 **`pnpm exec tauri build`** 并创建/更新 **GitHub Release**（详见 [docs/zh-cn/REPO_SETUP.md](docs/zh-cn/REPO_SETUP.md)）。请在仓库设置中禁止直推 **`main`**，仅经 PR 合并。`check` / `test` / **`desktop-release`** 支持 **`workflow_dispatch`**（其中发布 job 仍受检测条件约束）。

## 必读文档

1. [中文文档索引](docs/zh-cn/README.md)（使用、开发、法律信息入口）
2. [产品设计](docs/PRODUCT.md)
3. [架构说明](docs/ARCHITECTURE.md)
4. [路线图](docs/ROADMAP.md)

## 审查重点

- 涉及 **`.minecraft/versions/`** 的路径须在真机或文档中可核对。
- **CurseForge API Key** 不得写入仓库；仅应用数据目录或环境变量。
- 用户数据目录的写操作须有 **dry-run** 与备份策略说明。
