# 仓库与链接说明

产品对外展示名称为 **Minecraft Utilities**（窗口标题等）；GitHub 仓库为 **[Lexcubia/Minecraft-Utilities](https://github.com/Lexcubia/Minecraft-Utilities)**。根目录 README 中的 Issue、贡献者图等链接应与该路径一致。

若你 **Fork** 本仓库并单独托管，请将 README 中的 `Lexcubia/Minecraft-Utilities` 替换为你的 **用户名或组织名 / 仓库名**，以便 Issue 与贡献者图指向你的仓库。

## 分支与 `main` 保护

**请勿直接向 `main` 推送**（应在 GitHub 仓库 **Settings → Branches → Branch protection rules** 中为 `main` 勾选「禁止直接推送」，仅允许经 Pull Request 合并）。合并进 `main` 后的代码才会触发桌面端发布检测（见下）。

## 桌面端发布（`main` + CHANGELOG 标记）

工作流：[`.github/workflows/desktop-release.yml`](../../.github/workflows/desktop-release.yml)。

1. 在 PR 中将要发布的 **`package.json` 的 `version`** 与 **`src-tauri/tauri.conf.json` 的 `version`**（若需与 npm 一致）对齐，并在 **`CHANGELOG.md`** 增加 **`## [x.y.z]`** 小节，写好该版本说明。
2. 在该 **`## [x.y.z]`** 小节正文中加入一行 **`<!-- release:publish -->`**（HTML 注释，渲染不可见），表示**合并到 `main` 后**若远程尚不存在 **`vx.y.z`** 标签，则自动执行多平台打包并创建 GitHub Release。
3. PR 通过审查并合并到 **`main`** 后，Actions 会检测：无 `vx.y.z` 标签 + 对应小节含上述标记 → 执行 `tauri build` 并 `gh release create`。**若已存在该标签**，则跳过（避免重复发版）。

合并前 CI 会校验：若 **`package.json` 版本相对目标分支有提升**，则 **`CHANGELOG.md` 中对应 `## [新版本]`** 小节必须包含 **`<!-- release:publish -->`**（见 `.github/workflows/changelog-publish-marker.yml`）。

安装包文件名不含空格：由 `tauri.conf.json` 的 **`productName`**（如 `Minecraft-Utilities`）与 **`mainBinaryName`** 控制；窗口标题仍可为带空格的 **Minecraft Utilities**。

## 手动重跑

在 Actions 中对 **`desktop-release`** 工作流可使用 **`workflow_dispatch`** 手动触发；检测逻辑不变（仍要求无标签 + CHANGELOG 标记）。
