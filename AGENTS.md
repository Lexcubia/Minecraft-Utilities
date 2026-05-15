# AI Agent / 贡献者指南

本仓库产品名为 **Minecraft Utilities**（本机 Minecraft 实用工具合集）。技术栈以 **Tauri 2 + Vite + Vue** 为仓库根主体（`src/`、`src-tauri/`），**Python** 引擎为子目录包 `python/modpack_updater/`（包名历史原因保留目录名；CLI 入口见 `pyproject.toml`）；根目录 **pnpm** 管理 Node 依赖，并配有 **Prettier、Markdownlint、Husky、AGENTS、docs 索引** 等工程化约定。

## 项目组成

<!-- markdownlint-disable MD060 -->

| 部分                       | 路径                      | 说明                                                                                                                                                                         |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python 引擎                | `python/modpack_updater/` | 清单/整合包解析、Curse/Modrinth、差异、下载、写回等引擎能力；CLI 入口 `minecraft-utilities`（兼容别名 `modpack-updater`）                                                    |
| 桌面端（仓库根）           | `src/`、`src-tauri/`      | Tauri 2 + Vite + Vue + TS + Tailwind + Vuetify + Pinia + Vue Router                                                                                                          |
| 文档（使用 / 开发 / 法律） | `docs/`                   | 入口 [docs/zh-cn/README.md](docs/zh-cn/README.md)；根 [README](README.md) 为架构与功能一览                                                                                   |
| 品牌 / 图标                | `config/app-icons.json`   | 唯一配置见 `config/app-icons.json`。**pnpm gen:logo**：SVG → **tauri icon** 生成 `src-tauri/icons`（安装包/任务栏）并同步 `bundle.icon`；前端 `APP_LOGO_URL` 见 `app-meta`。 |

<!-- markdownlint-enable MD060 -->

## 编码约定

- **业务逻辑**放在 Python 引擎；Vue 只做展示与调用本机 API / Tauri `invoke`，不在前端复制解析规则。
- **Python**：`ruff`（含 **format**）+ `pytest`；提交前 `ruff check python tests`、`ruff format --check python tests` 与 `pytest`。
- **前端**：`pnpm lint:app`（**ESLint 9** flat + `typescript-eslint` + `eslint-plugin-vue`，与 Prettier 由 `eslint-config-prettier` 对齐）、`pnpm test`（**Vitest**）、`pnpm build`（`vue-tsc` + Vite）；完整 `tauri build` 需本机 Rust。**UI 令牌与壳层样式**见 [docs/zh-cn/developers/UI_STYLES.md](docs/zh-cn/developers/UI_STYLES.md)。
- **Markdown**：根目录 `pnpm lint:md`（**markdownlint-cli2**，规则见 [.markdownlint.json](.markdownlint.json)；根 README 含 HTML 居中块，已关闭 **MD041**）。
- **一键（仅 JS 侧）**：`pnpm verify:js`（format + lint + test + build）。
- **构建产物目录**：统一在仓库根 **`build/`** 下（`build/web`、`build/cargo-target`、`build/desktop`；详见 **`scripts/build-artifacts.mjs`**、**`src-tauri/.cargo/config.toml`**）。**`tauri.conf.json`** 中 **`bundle.active: false`**，避免默认生成 NSIS/MSI 等安装包。macOS 发版由 CI 执行 **`tauri build --bundles dmg`**，产物为 **`minecraft-utilities-macos-*-v*.dmg`**。CI 校验见 **`scripts/assert-release-assets.mjs`** 与 **`desktop-release.yml`**（共 6 个平台包：zip×2、tar.gz×2、dmg×2）。
- **`package.json` 脚本约定**：**`dev` / `build` / `preview`** 仅 **Vue + Vite**（`tauri build` 会通过 `beforeBuildCommand` 调用 **`pnpm build`**）。**`desktop:*`** 均为 **Tauri 桌面**：**`desktop:dev`**（`tauri dev`）、**`desktop:build`**（`tauri build --ci --no-bundle`，无安装包）、**`desktop:build:win`**（Web 构建 + Tauri + Windows 免安装 zip）、**`desktop:pack:win`** / **`desktop:pack:linux`** / **`desktop:pack:mac-zip`**（在已有 release 二进制后仅执行打包脚本）。任意子命令仍可用 **`pnpm tauri …`** 透传官方 CLI。
- **版本号**：唯一维护根目录 **`package.json` 的 `version`**；发版迭代用 **`pnpm version patch|minor|major`**（会跑 **`scripts/sync-version.mjs`** 同步 Tauri/Python/Cargo 与 **`Cargo.lock`**，无 Rust 时设 **`SKIP_CARGO_SYNC=1`**）；仅手改版本后执行 **`pnpm sync:version`**。**`CHANGELOG.md`** 仍手写。详见 [docs/zh-cn/REPO_SETUP.md](docs/zh-cn/REPO_SETUP.md)。
- **配置文件命名**：仓库根为 **ESM**（`package.json` 中 `"type": "module"`），工具链配置使用 **`.js`**（如 `prettier.config.js`、`lint-staged.config.js`、`commitlint.config.js`）；前端与构建相关为 **`.ts`**（如 `eslint.config.ts`、`vite.config.ts`），**不使用 `.mjs`**。
- **格式化**：仓库根 `pnpm format`（Prettier：仓库根 md/json/yaml + 根目录 `*.js` 配置 + **`src/**/_.ts`** / **`src/\*\*/_.css`** / `eslint.config.ts`/`vitest.config.ts`/`vite.config.ts`）；`.vue` 单文件暂由 **Volar / IDE** 排版（`prettier-plugin-vue`与当前 Vue 3.5 SFC 组合存在解析问题，待插件升级后再纳入 Prettier）；**ESLint** 覆盖`.vue` 与 TS。

## Git 钩子与提交说明

- **Husky**：`package.json` 的 `prepare` 在安装依赖时执行 `husky`，将 `core.hooksPath` 指向 `.husky/_`（需本机为 **git 仓库**）。临时跳过钩子可设环境变量 **`HUSKY=0`**。
- **pre-commit**：若当前分支为 **`main` / `master`** 则**直接拒绝提交**（与「禁止直推默认分支」一致）；否则运行 **lint-staged**（见根目录 [`lint-staged.config.js`](lint-staged.config.js)）：对暂存区执行 **`src/**/_.ts`** 与 **`scripts/\*\*/_.mjs`** 的 **ESLint --fix** + **Prettier**，**`src/**/\*.{vue,js}`** 的 ESLint，以及仓库根 **md/json/yaml/js/cjs** 的 Prettier。Python 仍请在提交前自行执行 `ruff`/`pytest` 或依赖 CI。
- **commit-msg**：先由 **`scripts/strip-cursor-coauthor.mjs`** 去掉 Cursor 注入的 **`Co-authored-by:`** 尾注，再运行 **commitlint**（[`commitlint.config.js`](commitlint.config.js)），继承 **[@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional)**。提交标题示例：`feat(gui): 描述`、`fix: 描述`、`docs: 描述`、`chore: 描述`。
- **CI**：GitHub Actions 见 [`.github/workflows/`](.github/workflows/)：**`check`**（Prettier + ESLint + Markdownlint + Ruff）、**`test`**（Vitest + Pytest）、**`commitlint`**、**`changelog-publish-marker`** 均在 **PR → `main`/`master`** 上运行，作为合并前门禁；**`develop`/功能分支 push 不触发**上述检查。**`main` 合并后**仅由 **`desktop-release.yml`** 根据 CHANGELOG 发布标记打包发版（`tauri build`，含 Rust 编译）；**不在 `main` push 时重复跑 `check`/`test`**。**`src-tauri` 的 `cargo fmt`/`clippy` 不在 PR 门禁中**（避免拉取重型依赖）。详见 [docs/zh-cn/REPO_SETUP.md](docs/zh-cn/REPO_SETUP.md)。各工作流支持 **`workflow_dispatch`**。
- **分支**：日常在 **`develop`** 提交；发版前在 **`develop`** 写好版本号与 CHANGELOG，开 **PR → `main`**，待 **`check` / `test` / `commitlint` / `changelog-publish-marker` 通过** 后合并；**`main` 只做发布**。无特殊需求勿长期保留 `cursor/*` 临时分支，合并后删除。

## 必读文档

1. [中文文档索引](docs/zh-cn/README.md)（使用、开发、法律信息入口）
2. [产品设计](docs/PRODUCT.md)
3. [架构说明](docs/ARCHITECTURE.md)
4. [路线图](docs/ROADMAP.md)

## 审查重点

- 涉及 **`.minecraft/versions/`** 的路径须在真机或文档中可核对。
- **CurseForge API Key** 不得写入仓库；仅应用数据目录或环境变量。
- 用户数据目录的写操作须有 **dry-run** 与备份策略说明。
