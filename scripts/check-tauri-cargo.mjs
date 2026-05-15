#!/usr/bin/env node
/**
 * 本地 / CI：`cargo check` 校验 Tauri 后端（含各 `#[cfg]` 目标代码路径）。
 * Linux 需 WebKit 等系统依赖，与 desktop-release 矩阵一致。
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = path.join(root, 'src-tauri', 'Cargo.toml');

const result = spawnSync('cargo', ['check', '--manifest-path', manifest], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === 0 ? 0 : (result.status ?? 1));
