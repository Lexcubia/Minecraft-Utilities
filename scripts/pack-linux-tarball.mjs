/**
 * 从 Cargo release 目录下的 Linux 主二进制打成免安装 tar.gz（仅 Linux）。
 * 产物：`minecraft-utilities-linux-<x86_64|aarch64>-v<semver>.tar.gz`
 * 架构由环境变量 `TARGET_ARCH`（`x86_64` | `aarch64`）指定；未设置时按 `uname -m` 推断。
 * 路径约定见 `scripts/build-artifacts.mjs`；共享入口 `scripts/lib/load-desktop-pack-context.mjs`。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { loadDesktopPackContext } from './lib/load-desktop-pack-context.mjs';

const { root, mainBinaryName, version, artifacts } = loadDesktopPackContext();

if (process.platform !== 'linux') {
  process.stderr.write('pack-linux-tarball: skip (not Linux).\n');
  process.exit(0);
}

let targetArch = process.env.TARGET_ARCH?.trim();
if (!targetArch) {
  const machine = execFileSync('uname', ['-m'], { encoding: 'utf8' }).trim();
  if (machine === 'aarch64' || machine === 'arm64') targetArch = 'aarch64';
  else if (machine === 'x86_64' || machine === 'amd64') targetArch = 'x86_64';
  else {
    throw new Error(
      `pack-linux-tarball: unsupported machine "${machine}"; set TARGET_ARCH=x86_64|aarch64`,
    );
  }
}
if (targetArch !== 'x86_64' && targetArch !== 'aarch64') {
  throw new Error(
    `pack-linux-tarball: invalid TARGET_ARCH=${targetArch} (expect x86_64 or aarch64)`,
  );
}

const releaseDir = artifacts.tauriRelease();
const binName = mainBinaryName;
const binPath = path.join(releaseDir, binName);

if (!fs.existsSync(binPath)) {
  throw new Error(`Missing ${binPath}; run tauri build --no-bundle first.`);
}

const outDir = artifacts.desktopPackages();
const stageName = `${mainBinaryName}-linux-${targetArch}-v${version}`;
const stageDir = path.join(outDir, '_stage', stageName);
const tarName = `${mainBinaryName}-linux-${targetArch}-v${version}.tar.gz`;
const tarPath = path.join(outDir, tarName);

fs.rmSync(path.join(outDir, '_stage'), { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

fs.copyFileSync(binPath, path.join(stageDir, binName));
fs.chmodSync(path.join(stageDir, binName), 0o755);

const readme = path.join(stageDir, 'README-PORTABLE.txt');
fs.writeFileSync(
  readme,
  [
    `${mainBinaryName} ${version} (Linux ${targetArch} portable)`,
    '',
    '解压后可直接运行同名二进制；需本机已安装 WebKitGTK 等发行版依赖（与 Tauri 官方文档一致）。',
    '持久化：与二进制同目录下写入 logs（含 app.log 留档）；界面设置仅保存在应用本地存储（localStorage）。',
    '',
  ].join('\n'),
  'utf8',
);

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(tarPath)) {
  fs.rmSync(tarPath);
}

execFileSync('tar', ['-czf', tarPath, '-C', path.dirname(stageDir), path.basename(stageDir)], {
  stdio: 'inherit',
  cwd: root,
});

fs.rmSync(path.join(outDir, '_stage'), { recursive: true, force: true });

process.stdout.write(`Wrote ${path.relative(root, tarPath)}\n`);
