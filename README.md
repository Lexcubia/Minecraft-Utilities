<p align="center">
  <img alt="Modpack Updater Logo" src="docs/img/logo.svg" width="256" height="256" />
</p>

<div align="center">

# Minecraft 整合包升级工具

<!-- prettier-ignore-start -->
<!-- markdownlint-disable-next-line MD036 -->
_✨ Modpack Updater · 整合包安全升级 ✨_
<!-- prettier-ignore-end -->

Powered by [Tauri 2](https://tauri.app/) · [Vue 3](https://vuejs.org/) · [Python 3](https://www.python.org/)

绝赞开发中 🎉……

[简体中文](./README.md) | [English](./README.en.md)

</div>

## 📖 使用须知

这是一个**正在快速迭代**的项目，可能会有一些小 BUG 出没 🐛（我们会努力消灭它们的！）

遇到问题？欢迎来提 **[Issue](https://github.com/Lexcubia/minecraft-modpack-updater/issues)** 反馈。更多好玩的功能正在路上，敬请期待 ✨

> 💡 **提示**：发行版自动更新能力在路线图中规划；当前阶段请从源码或 CI 产物体验，详见 [使用说明](docs/zh-cn/USAGE.md)。

## 🏗️ 架构一览

- **桌面壳**：[Tauri 2](https://tauri.app/)
- **界面与构建**：[Vue 3](https://vuejs.org/) · [Vite](https://vitejs.dev/) · [TypeScript](https://www.typescriptlang.org/) · [Tailwind CSS](https://tailwindcss.com/) · [Naive UI](https://www.naiveui.com/)
- **状态与路由**：[Pinia](https://pinia.vuejs.org/) · [Vue Router](https://router.vuejs.org/)
- **核心引擎**：[Python 3](https://www.python.org/)（业务逻辑、网络与文件；配套库见 [架构说明](docs/ARCHITECTURE.md)）
- **Tauri 底层**：[Rust](https://www.rust-lang.org/)（由 Tauri 工具链管理，一般无需单独编写）

更完整的分层、目录与接口约定 👉 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## ✨ 功能一览

- **升级模组**：用作者发布的 **新版整合包**（CurseForge **zip** 或 Modrinth **mrpack**）对齐你当前实例里的模组。
- **先预览再动手**：支持先看变更再执行，降低误改风险；**升级前请自行备份**。
- **双平台包**：兼容 **CurseForge** 与 **Modrinth** 两种常见整合包格式。

细节与路线图 👉 [产品设计](docs/PRODUCT.md) · [路线图](docs/ROADMAP.md)

## 🛠️ 开发者指南

想参与开发或深入了解项目？来这里吧 👉 **[中文文档索引](docs/zh-cn/README.md)** · **[AGENTS.md](AGENTS.md)**

欢迎各路大佬贡献代码，一起把升级工具变得更好！💪

## 💖 感谢贡献者

感谢所有添砖加瓦的开发者们！🎉 你们都是最棒的！

### 维护者

| 贡献者                                  | 说明               |
| --------------------------------------- | ------------------ |
| [Lexcubia](https://github.com/Lexcubia) | 项目发起与当前维护 |

以下头像墙由 GitHub 提交记录自动生成（与上方列表互补，不重复罗列亦可）。

<p align="center">
  <a href="https://github.com/Lexcubia/minecraft-modpack-updater/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Lexcubia/minecraft-modpack-updater&max=1000" alt="Contributors" />
  </a>
</p>

有你们的贡献，项目才能变得越来越好~ ❤️
