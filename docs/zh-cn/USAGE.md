# 使用说明

## 当前阶段

发行版安装包尚未发布；以下为 **从源码参与体验或开发** 的用法。正式版流程将在首次 Release 后更新本节。

## 基本操作思路（目标体验）

1. 在所使用的启动器中确认整合包 **实例根目录**（及 `.minecraft/versions/` 等布局，见 [产品设计](../PRODUCT.md)）。
2. 准备 **目标版本** 的官方 **`.zip` 或 `.mrpack`**（第一期多需第二份包作为目标清单来源）。
3. 使用图形向导或 CLI：**先预览（dry-run / plan）**，确认后再 **应用（apply）**。
4. **CurseForge** 包需配置 API Key（应用内保存或环境变量，勿提交到仓库）。

**请务必在操作前完整备份实例目录。**

---

## 从源码运行（开发者）

### Python CLI

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux / macOS:
# source .venv/bin/activate

pip install -e ".[dev]"
modpack-updater --help
```

### 桌面端（仓库根目录）

```bash
pnpm install
pnpm dev                  # 仅 Vite 前端
pnpm tauri dev            # 完整 Tauri（需本机安装 Rust）
```

### 质量检查

```bash
ruff check python tests
ruff format --check python tests
pytest
pnpm format:check
pnpm lint
pnpm test
pnpm build
```

等价快捷（不含 Python）：`pnpm verify:js`。

**Git 提交**：须符合 **Conventional Commits**（如 `feat:`、`fix:`、`docs:`、`chore:` 等）；`pnpm install` 后在 **git 仓库**内会启用 **Husky**（`pre-commit` → lint-staged，`commit-msg` → commitlint）。详见根目录 [AGENTS.md](../../AGENTS.md)。

更完整的说明见 [开发者索引](developers/README.md)。
