# 应用内更新：`latest.json` 放哪里

## 推荐：完全自动化（无需手动上传 Release 资源）

本仓库 **[`.github/workflows/desktop-release.yml`](../../.github/workflows/desktop-release.yml)** 在发版成功时会自动：

1. 多平台 **`tauri build`**（需配置 Actions Secret **`TAURI_SIGNING_PRIVATE_KEY`** 等，见 [仓库设置说明](REPO_SETUP.md)）。
2. 用 **`scripts/merge-github-updater-latest.mjs`** 合并各平台的 `latest.fragment.*.json` 为 **`latest.json`**。
3. 通过 **`gh release create` / `gh release upload`** 把安装包、**`.sig`**、**`latest.json`** 一并挂到 **GitHub Release Assets**。

你只要按 [仓库设置说明](REPO_SETUP.md) 完成 **版本号 + CHANGELOG 发布标记 + 合并到 `main`**（并确保 Secrets 与 **`pubkey`** 正确），**不必**在网页上手动上传 `latest.json`。

---

以下章节仅在**不走该工作流**、需要**手动**维护更新清单时参考。

## 手动：应放在何处（与 `tauri.conf.json` 的 `endpoints` 一致）

当前配置为：

`https://github.com/Lexcubia/Minecraft-Utilities/releases/latest/download/latest.json`

含义是：

1. 打开 GitHub 仓库 **Lexcubia/Minecraft-Utilities** 的 **Releases**。
2. 在 **GitHub 判定为「Latest」的那一个 Release** 上，上传一个资源文件，**文件名必须恰好为** **`latest.json`**（与 URL 最后一段一致）。
3. 上传的安装包、`.sig` 等资源的 **下载 URL** 必须写进 `latest.json` 的 `platforms.*.url` 中；通常使用：  
   `https://github.com/Lexcubia/Minecraft-Utilities/releases/download/<Tag>/<资源文件名>`  
   例如 Tag 为 `v0.1.0`、常见免安装包文件名为 `minecraft-utilities-win-x86_64-v0.1.0.zip`（当前主线以 zip/tar.gz 分发六款平台包，不产出 NSIS/MSI/DMG 等安装包）。

**不要**把 `latest.json` 只放在仓库源码树里而不挂到 Release 上——`releases/latest/download/` 读的是 **Release 资源**，不是仓库里的路径。

若你 Fork 了仓库，请把 `tauri.conf.json` 里的 `endpoints` 改成你的 `owner/repo`，并在对应仓库的 Latest Release 上同样上传 `latest.json`。

## 手动：如何得到可用的内容

1. 在本机配置 **`TAURI_SIGNING_PRIVATE_KEY`**（与 `pubkey` 成对），执行 **`pnpm exec tauri build`**（需已开启 `bundle.createUpdaterArtifacts`）。
2. 在 **`build/cargo-target/release/bundle/`** 下查找构建生成的 **`latest.json`** 与 **`*.sig`**（Cargo `target-dir` 见 `src-tauri/.cargo/config.toml`）；或参考工作流里 **`scripts/merge-github-updater-latest.mjs`** 的合并方式（多平台）。
3. **`signature`** 字段：填写与安装包同名的 **`.sig` 文件全文**（一般为**单行**，与 Tauri 生成的一致），不是路径。
4. 将填好的 JSON **另存为文件名 `latest.json`**，上传到上述 Latest Release。

仓库内提供的 **`docs/zh-cn/examples/updater-latest.template.json`** 仅为**字段结构示例**；其中 `signature` 的占位符**不能用于真实更新**，必须换成真实 `.sig` 内容。

## 与官方文档

静态 JSON 字段说明见：[Tauri Updater（Static JSON File）](https://v2.tauri.app/plugin/updater/#static-json-file)。
