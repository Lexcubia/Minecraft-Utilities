# AI Agent / 贡献者指南（精简）

## 项目概览

- 产品名：**Minecraft Utilities**
- 技术栈：仓库根 **Tauri 2 + Vite + Vue + TS**，引擎为 `python/modpack_updater/`
- 包管理：根目录 `pnpm`
- 主要目录：
  - 前端：`src/`
  - Rust/Tauri：`src-tauri/`
  - Python 引擎：`python/modpack_updater/`
  - 文档：`docs/`

## 规则与文档分工

- `.cursor/rules/project-authority.mdc`：唯一强约束来源（流程、UI、安全、发布边界）
- `docs/zh-cn/developers/UI_STYLES.md`：UI 体系说明（令牌、密度、全局样式分工）
- `docs/zh-cn/REPO_SETUP.md`：构建/CI/发布细节

## 快速入口

- 文档索引：`docs/zh-cn/README.md`
- 仓库首页功能一览：`README.md`
- 架构说明：`docs/ARCHITECTURE.md`
- 路线图：`docs/ROADMAP.md`

如需新增或调整“硬约束”，请直接修改 `.cursor/rules/project-authority.mdc`，避免在多个文档重复维护。
