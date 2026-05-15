# 路线图与任务

**Minecraft Utilities**：以本机实用工具为长期方向；下列任务以 **zip/mrpack、`.minecraft/versions/` 布局、plan/apply** 为主线的首期能力，后续可并行扩展其它工具模块。

实现项完成后，请同步更新：

- 本文件中的勾选框
- 仓库根 [README](../README.md) 的 **「功能一览」**（与实现一致）及 [中文文档索引](zh-cn/README.md) 中 [使用说明](zh-cn/USAGE.md) 如有必要

---

## 范围与输入

- [x] 第一期范围：主输入为 Curse zip / Modrinth mrpack；目标版本由第二份 zip/mrpack 提供；无清单 `mods/` 仅作高级/排障；自动拉取最新 Release 为待定
- [x] 后端选型结论写入计划（默认 Python 核心，可改为 Rust/Go）
- [x] **目录前提（文档）**：第一期仅支持 **`.minecraft/versions/` 版本隔离**布局；**未隔离**（根目录单版本共用）暂不纳入，见仓库根 [README「功能一览」](../README.md#-功能一览)
- [ ] **stack-init**：初始化已确认后端的工程骨架与 `scan` / `plan` / `apply` 占位
- [ ] **input-archive-zip-mrpack**：读取 zip / `.mrpack`，解压或安全解析内嵌清单并接入后续流程
- [ ] **versions-layout-docs-qa**：对照常见启动器实测**实例根目录**、**`.minecraft/versions/`** 下各版本目录命名与 `saves`/`config` 等相对路径，更新用户文档与向导文案

### `versions` 目录下两种升级方式（产品级）

- [ ] **migrate-dual-versions-in-versions**：当 `.minecraft/versions/` 下**已有新旧两个版本目录**时，支持将旧版 **存档与配置等** 迁移至新版对应位置（规则、冲突与 dry-run 与实测布局对齐）
- [ ] **install-archive-then-migrate**：当 `versions/` 下**仅有一个**已安装版本且用户持有**整合包压缩包**时：先完成**新包安装/解压至 versions（或启动器等价流程）**，再将存档与其它内容迁移至新装版本，再衔接模组 plan/apply

---

## 核心引擎

- [ ] **internal-model**：`PackMeta`、`ModRef`、`ResolvedFile`、`DiffItem`、`ApplyPlan` 等与 JSON 序列化、单测
- [ ] **parser-curse**：`manifest.json` 解析与校验（含自 zip 解压布局）
- [ ] **parser-modrinth**：`modrinth.index.json`（含 `.mrpack`）
- [ ] **provider-curse**：CurseForge 文件 API、`projectId`+`fileId` → URL/哈希、Key 与 429 退避
- [ ] **provider-modrinth**：直链与哈希校验（及必要时 Modrinth API）
- [ ] **diff-engine**：目标清单 vs 当前 `mods/`（及可选 lockfile）
- [ ] **downloader**：并发、临时文件、校验后原子替换、重试
- [ ] **writer-apply**：写回清单与 `mods/`；`--prune-unlisted` 可选
- [ ] **overrides-report**：`overrides/` 差异报告，默认保守
- [ ] **dry-run-ux**：全链路 dry-run、人类可读 + JSON 输出、错误码
- [ ] **fixtures-ci**：样例包、CI（lint + 测试）

---

## 图形界面与发行

- [ ] **gui-engine-api**：本机 REST（或 CLI `--json`）、OpenAPI / 错误模型
- [ ] **gui-tauri-vue-scaffold**：Tauri 2 + **Vite** + Vue 3 + TypeScript + **Tailwind CSS** + **Vuetify** + Vue Router + Pinia；与开发期 sidecar 联调（见 [ARCHITECTURE.md](ARCHITECTURE.md)）
- [ ] **gui-vue-wizard**：选包、选整合包**实例根目录**、（仅 Curse）应用内 Key、plan 表、默认 dry-run、日志
- [ ] **gui-packaging**：Windows 安装包/绿色包、捆绑引擎、Release 资产
- [ ] **product-lazy-bundle**：懒人包验收（无 Python/Node、无 PATH 等）

---

## 远期

- [ ] **deferred-auto-target-release**：双站自动解析目标版本（免第二份包）、合规与限流
- [ ] **deferred-mc-non-isolated**：支持 **未隔离**（根 `.minecraft` 单套 `saves`/`config`、无 `versions` 分版本）下的升级与迁移
