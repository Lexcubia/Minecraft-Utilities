# 使用说明

## 当前阶段

发行版安装包尚未发布；以下为 **从源码参与体验或开发** 的用法。正式版流程将在首次 Release 后更新本节。

## 基本操作思路（目标体验）

1. 在所使用的启动器中确认 **Minecraft Utilities** 当前主线所针对的整合包 **实例根目录**（及 `.minecraft/versions/` 等布局，见 [产品设计](../PRODUCT.md)）。
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
minecraft-utilities --help
# 兼容旧入口名：
# modpack-updater --help
```

### 存档 UUID 迁移（换号 / 迁移账号）

将**整个存档目录**（含 `level.dat`、`playerdata` 等）中的旧玩家 UUID 批量替换为新 UUID：重命名 `playerdata`、`advancements`、`stats` 下同名文件，并在常见文本扩展名与 gzip NBT（`.dat`）中替换字符串写法及 NBT `UUID` IntArray。

**请先完整备份存档。** 建议先 **`--dry-run`** 查看将执行的操作。

```bash
# 预览（不写盘）。将下方路径换为你的「存档根目录」（含 level.dat、playerdata 等）。
minecraft-utilities uuid-migrate "C:\Minecraft\instances\YourInstance\saves\YourWorld" ^
  --from 00000000-0000-4000-8000-000000000001 ^
  --to 11111111-1111-4111-8111-111111111111 ^
  --dry-run

# 确认后执行（将写盘）
minecraft-utilities uuid-migrate "C:\Minecraft\instances\YourInstance\saves\YourWorld" ^
  --from 00000000-0000-4000-8000-000000000001 ^
  --to 11111111-1111-4111-8111-111111111111
```

（Linux / macOS 下去掉 `^`，用反斜杠续行或写成一行即可。）

**说明**：当前不扫描 `region` / `poi` / `entities` 下的 `.mca` 区块文件；区块实体中的 UUID 不会自动替换。

### 桌面端（仓库根目录）

```bash
pnpm install
pnpm dev                  # 仅 Vite 前端
pnpm desktop:dev          # 完整 Tauri（等同 pnpm tauri dev；需本机安装 Rust）
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
