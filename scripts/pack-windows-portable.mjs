/**
 * 从 Cargo release 目录收集主程序 exe 与同目录 DLL，打成免安装 zip（仅 Windows）。
 * 在 `pnpm exec tauri build --ci --no-bundle` 之后运行；CI 在 Windows 矩阵内于 Tauri build 后调用。
 * 路径约定见 `scripts/build-artifacts.mjs`；打包脚本共享入口见 `scripts/lib/load-desktop-pack-context.mjs`。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { loadDesktopPackContext } from './lib/load-desktop-pack-context.mjs';

const { root, mainBinaryName, version, artifacts } = loadDesktopPackContext();

if (process.platform !== 'win32') {
  process.stderr.write('pack-windows-portable: skip (not Windows).\n');
  process.exit(0);
}

/** 与 GitHub Release 资产命名一致：`{name}-win-x86_64-v{x.x.x}.zip` */
function winCpuArchLabel() {
  if (process.arch === 'arm64') return 'aarch64';
  return 'x86_64';
}

const releaseDir = artifacts.tauriRelease();
const exeName = `${mainBinaryName}.exe`;
const exePath = path.join(releaseDir, exeName);

if (!fs.existsSync(exePath)) {
  throw new Error(`Missing ${exePath}; run tauri build first.`);
}

const cpu = winCpuArchLabel();
const outDir = artifacts.desktopPackages();
const stageName = `${mainBinaryName}-win-${cpu}-v${version}`;
const stageDir = path.join(outDir, '_stage', stageName);
const zipName = `${mainBinaryName}-win-${cpu}-v${version}.zip`;
const zipPath = path.join(outDir, zipName);

fs.rmSync(path.join(outDir, '_stage'), { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

function copyTopLevel(name) {
  const src = path.join(releaseDir, name);
  if (fs.existsSync(src) && fs.statSync(src).isFile()) {
    fs.copyFileSync(src, path.join(stageDir, name));
  }
}

copyTopLevel(exeName);

for (const ent of fs.readdirSync(releaseDir, { withFileTypes: true })) {
  if (!ent.isFile()) continue;
  const n = ent.name;
  if (n.toLowerCase().endsWith('.dll')) {
    copyTopLevel(n);
  }
}

const readme = path.join(stageDir, 'README-PORTABLE.txt');
fs.writeFileSync(
  readme,
  [
    `${mainBinaryName} ${version} (Windows ${cpu} portable zip)`,
    '',
    '解压后双击运行 .exe 即可，无需安装程序。',
    '持久化：与可执行文件同目录下写入 logs（含 app.log 与会话归档）；界面设置保存在 settings.json。',
    '需本机已安装 Microsoft Edge WebView2 Runtime（多数 Windows 10/11 已自带）。',
    '',
    '若杀毒软件误报，请将本目录加入信任或向厂商误报。',
    '',
  ].join('\r\n'),
  'utf8',
);

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(zipPath)) {
  fs.rmSync(zipPath);
}

const env = {
  ...process.env,
  PORTABLE_STAGE_DIR: stageDir,
  PORTABLE_ZIP_PATH: zipPath,
};

execFileSync(
  'powershell.exe',
  [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '$ErrorActionPreference = "Stop"; Compress-Archive -Path (Join-Path $env:PORTABLE_STAGE_DIR "*") -DestinationPath $env:PORTABLE_ZIP_PATH -CompressionLevel Optimal',
  ],
  { stdio: 'inherit', cwd: root, env },
);

fs.rmSync(path.join(outDir, '_stage'), { recursive: true, force: true });

process.stdout.write(`Wrote ${path.relative(root, zipPath)}\n`);
