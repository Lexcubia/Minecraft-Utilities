# 仓库与链接说明

产品对外展示名称为 **Minecraft Utilities**（窗口标题等）；GitHub 仓库为 **[Lexcubia/Minecraft-Utilities](https://github.com/Lexcubia/Minecraft-Utilities)**。根目录 README 中的 Issue、贡献者图等链接应与该路径一致。

若你 **Fork** 本仓库并单独托管，请将 README 中的 `Lexcubia/Minecraft-Utilities` 替换为你的 **用户名或组织名 / 仓库名**，以便 Issue 与贡献者图指向你的仓库。

## 分支与 `main` 保护

**请勿直接向 `main` 推送**（应在 GitHub 仓库 **Settings → Branches → Branch protection rules** 中为 `main` 勾选「禁止直接推送」，仅允许经 Pull Request 合并）。合并进 `main` 后的代码才会触发桌面端发布检测（见下）。

## 版本号（单一来源）

- **真相源**：根目录 **`package.json` 的 `version`**。前端 `APP_VERSION` 已从此处读取，无需再改别处展示号。
- **自动同步**：执行 **`pnpm version patch`**、**`pnpm version minor`** 或 **`pnpm version major`** 时，npm/pnpm 会更新 `package.json` 并触发 **`scripts.version`** → 运行 **`scripts/sync-version.mjs`**，将同一版本写入 **`src-tauri/Cargo.toml`**、**`src-tauri/tauri.conf.json`**、**`pyproject.toml`**、**`python/modpack_updater/__init__.py`**，并尝试在 **`src-tauri`** 下执行 **`cargo build -q`** 以刷新 **`Cargo.lock`**。
- **无 Rust 环境**：可设 **`SKIP_CARGO_SYNC=1`** 再执行 `pnpm version …`，之后在本机或 CI 有 Rust 时再 `cargo build` 一次即可。
- **仅手动改过 `package.json` 版本时**：运行 **`pnpm sync:version`** 同步其余文件。
- **显式指定版本**（同时写回 `package.json`）：`node scripts/sync-version.mjs x.y.z`。
- **CHANGELOG**：发版说明仍需在 **`CHANGELOG.md`** 手写 **`## [x.y.z]`** 小节与 **`<!-- release:publish -->`**；版本号 bump 不会自动改 CHANGELOG。

## 桌面端发布（`main` + CHANGELOG 标记）

工作流：[`.github/workflows/desktop-release.yml`](../../.github/workflows/desktop-release.yml)。

1. 使用上一节方式 **bump `package.json` 版本** 并同步各端；在 **`CHANGELOG.md`** 增加 **`## [x.y.z]`** 小节，写好该版本说明。
2. 在该 **`## [x.y.z]`** 小节正文中加入一行 **`<!-- release:publish -->`**（HTML 注释，渲染不可见），表示**合并到 `main` 后**若远程尚不存在 **`vx.y.z`** 标签，则自动执行多平台打包并创建 GitHub Release。
3. PR 通过审查并合并到 **`main`** 后，Actions 会检测：无 `vx.y.z` 标签 + 对应小节含上述标记 → 执行 `tauri build` 并 `gh release create`。**若已存在该标签**，则跳过（避免重复发版）。

合并前 CI 会校验：若 **`package.json` 版本相对目标分支有提升**，则 **`CHANGELOG.md` 中对应 `## [新版本]`** 小节必须包含 **`<!-- release:publish -->`**（见 `.github/workflows/changelog-publish-marker.yml`）。

安装包文件名不含空格：由 `tauri.conf.json` 的 **`productName`**（如 `Minecraft-Utilities`）与 **`mainBinaryName`** 控制；窗口标题仍可为带空格的 **Minecraft Utilities**。

### 应用内更新（Tauri updater）

桌面发版工作流会为 GitHub Release 生成并上传 **`latest.json`** 与各平台 **`.sig`**（需在仓库 **Settings → Secrets and variables → Actions** 中配置）：

- **`TAURI_SIGNING_PRIVATE_KEY`**：Minisign **私钥**，须为 **`tauri-updater.key` 文件全文**（`tauri signer generate` 写入的**单行 base64**；勿混入 BOM 或多余换行）。与 `tauri.conf.json` 的 **`plugins.updater.pubkey`** 成对；本地勿提交私钥，见根目录 `.gitignore`。可用 `pnpm exec tauri signer generate -w src-tauri/tauri-updater.key` 生成。
- **`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`**：若生成密钥时设置了密码则填写；否则可省略或留空。

**`pubkey` 格式**：`tauri.conf.json` 中的 **`plugins.updater.pubkey`** 必须与 **`tauri-updater.key.pub` 文件全文**（单行 base64）一致；**不要**只填解码后的内层 `RWQp…` 一行，否则构建 updater 签名时会报 `failed to decode pubkey` / UTF-8 解码错误。

手动准备 **`latest.json`** 时，资源应挂在 GitHub Release 上（与 `endpoints` 的 `releases/latest/download/latest.json` 一致），详见 [应用内更新 `latest.json`](UPDATER_LATEST.md)。

未配置私钥时，`tauri build` 在开启 **`bundle.createUpdaterArtifacts`** 的情况下会失败。若 **Fork** 仓库发版，请把 `tauri.conf.json` 中 **`plugins.updater.endpoints`** 的 GitHub URL 改成你的 **`用户名或组织/仓库名`**，与 `github.repository` 一致。

本机执行 **`pnpm tauri:build`**（`tauri build --ci --no-bundle`，不生成安装包）或发版矩阵中的显式 **`--bundles app`**（mac）等命令时，若需生成 **updater 签名产物**，同样需要导出上述环境变量；仅日常 **`tauri dev`** 不受影响。

## 手动重跑

在 Actions 中对 **`desktop-release`** 工作流可使用 **`workflow_dispatch`** 手动触发；检测逻辑不变（仍要求无标签 + CHANGELOG 标记）。
