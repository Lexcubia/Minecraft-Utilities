<p align="center">
  <img alt="Minecraft Utilities" src="docs/img/logo.svg" width="256" height="256" />
</p>

<div align="center">

# Minecraft Utilities

<!-- prettier-ignore-start -->
<!-- markdownlint-disable-next-line MD036 -->
_✨ Practical tools for Minecraft players · local-first ✨_
<!-- prettier-ignore-end -->

Powered by [Tauri 2](https://tauri.app/) · [Vue 3](https://vuejs.org/) · [Python 3](https://www.python.org/)

Under active development 🎉……

[简体中文](./README.md) | [English](./README.en.md)

</div>

## 📖 Notice

This project is **moving fast** and may contain bugs 🐛. Please file **[Issues](https://github.com/Lexcubia/Minecraft-Utilities/issues)**.

> 💡 Auto-update for releases is planned. For now, see [Usage (Chinese)](docs/zh-cn/USAGE.md) for source-based workflows.

## 🏗️ Architecture

- **Desktop shell**: [Tauri 2](https://tauri.app/)
- **UI & build**: [Vue 3](https://vuejs.org/) · [Vite](https://vitejs.dev/) · [TypeScript](https://www.typescriptlang.org/) · [Tailwind CSS](https://tailwindcss.com/) · [Vuetify](https://vuetifyjs.com/) (Material)
- **State & routing**: [Pinia](https://pinia.vuejs.org/) · [Vue Router](https://router.vuejs.org/)
- **Core engine**: [Python 3](https://www.python.org/) (business logic, networking, filesystem; libraries in [ARCHITECTURE](docs/ARCHITECTURE.md))
- **Tauri foundation**: [Rust](https://www.rust-lang.org/) (managed by the Tauri toolchain)

More detail 👉 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## ✨ Features

- **Direction**: **Minecraft Utilities** grows into a set of **local, practical tools** for players (Tauri desktop + Python engine).
- **Current track**: with common launchers and **`.minecraft/versions/`** isolation, align mods and manifests using official **zip / mrpack**; **dry-run by default**; **back up before you apply**.
- **Formats**: **CurseForge** and **Modrinth** official pack inputs.

Roadmap & depth 👉 [Feature overview](README.en.md#-features) · [ROADMAP](docs/ROADMAP.md)

## 🛠️ For developers

👉 **[docs/zh-cn/README.md](docs/zh-cn/README.md)** (Chinese doc hub) · **[AGENTS.md](AGENTS.md)**

## 💖 Thanks

### Maintainer

| Contributor                             | Role                                   |
| --------------------------------------- | -------------------------------------- |
| [Lexcubia](https://github.com/Lexcubia) | Project founder and current maintainer |

The avatar grid below is generated from GitHub commit history.

<p align="center">
  <a href="https://github.com/Lexcubia/Minecraft-Utilities/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Lexcubia/Minecraft-Utilities&max=1000" alt="Contributors" />
  </a>
</p>
