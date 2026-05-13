/**
 * 将 `tauri build --bundles app` 生成的 `.app` 打成 zip，写入 `build/desktop/`（与 `scripts/build-artifacts.mjs` 一致）。
 * 共享上下文见 `scripts/lib/load-desktop-pack-context.mjs`。
 * 使用系统 `ditto` 保留扩展属性与签名；仅 macOS 上执行。
 * 架构由环境变量 `MAC_CPU`（`aarch64` | `x86_64`）指定；未设置时按 `process.arch` 推断。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { loadDesktopPackContext } from './lib/load-desktop-pack-context.mjs';

const { root, mainBinaryName, version, artifacts } = loadDesktopPackContext();

if (process.platform !== 'darwin') {
  process.stderr.write('pack-macos-app-zip: skip (not macOS).\n');
  process.exit(0);
}

let macCpu = process.env.MAC_CPU?.trim();
if (!macCpu) {
  if (process.arch === 'arm64') macCpu = 'aarch64';
  else if (process.arch === 'x64') macCpu = 'x86_64';
  else {
    throw new Error(`pack-macos-app-zip: unsupported process.arch=${process.arch}; set MAC_CPU`);
  }
}
if (macCpu !== 'x86_64' && macCpu !== 'aarch64') {
  throw new Error(`pack-macos-app-zip: invalid MAC_CPU=${macCpu} (expect x86_64 or aarch64)`);
}

const releaseDir = artifacts.tauriRelease();
const bundleRoot = path.join(releaseDir, 'bundle');

if (!fs.existsSync(bundleRoot)) {
  throw new Error(`Missing ${bundleRoot}; run: pnpm exec tauri build --ci --bundles app`);
}

/** @type {string[]} */
const appPaths = [];
for (const ent of fs.readdirSync(bundleRoot, { withFileTypes: true })) {
  if (!ent.isDirectory()) continue;
  const sub = path.join(bundleRoot, ent.name);
  for (const name of fs.readdirSync(sub)) {
    if (name.endsWith('.app')) {
      appPaths.push(path.join(sub, name));
    }
  }
}

if (appPaths.length !== 1) {
  throw new Error(
    `pack-macos-app-zip: expected exactly one .app under ${bundleRoot}, found ${appPaths.length} (${appPaths.map((p) => path.basename(p)).join(', ') || 'none'}); run: pnpm exec tauri build --ci --bundles app`,
  );
}

const appPath = appPaths[0];
const outDir = artifacts.desktopPackages();
const zipName = `${mainBinaryName}-macos-${macCpu}-v${version}.zip`;
const zipPath = path.join(outDir, zipName);

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(zipPath)) {
  fs.rmSync(zipPath);
}

execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appPath, zipPath], {
  stdio: 'inherit',
});

process.stdout.write(`Wrote ${path.relative(root, zipPath)}\n`);
