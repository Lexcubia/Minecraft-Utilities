# 仓库与链接说明

根目录 [README](../README.md) 与 [README.en](../README.en.md) 中的 GitHub 链接、`contrib.rocks` 贡献者图已指向 **`Lexcubia/minecraft-modpack-updater`**。

若你 **Fork** 本仓库并单独托管，请将上述 README 中的 `Lexcubia` 替换为你的 **用户名或组织名**，以便 Issue 与贡献者图指向你的仓库。

## 发布分支 `release`

桌面安装包由 GitHub Actions 在 **`release`** 分支上构建并发布（见根目录 `CHANGELOG.md` 与 `.github/workflows/build.yml`、`release.yml`）。

1. 从 `main`（或当前开发分支）创建或更新 **`release`**：`git checkout -b release main` 或 `git checkout release && git merge main`。
2. 将 **`package.json` 的 `version`** 与 **`CHANGELOG.md`** 中 **`## [同一版本号]`** 小节对齐并写好发布说明。
3. **推送 `release`**：`git push origin release`，将触发构建；构建成功后自动创建/更新 **`v<version>`** 的 GitHub Release（说明来自 CHANGELOG 该小节正文）。

首次在远程创建分支：`git push -u origin release`。
