/**
 * 从 `src-tauri/target/release` 收集主程序 exe 与同目录 DLL，打成免安装 zip（仅 Windows）。
 * 在 `pnpm exec tauri build`（含或不含 bundle）之后运行；CI 在 Windows 矩阵内于 Tauri build 后调用。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

if (process.platform !== 'win32') {
  process.stderr.write('pack-windows-portable: skip (not Windows).\n');
  process.exit(0);
}

const tauriConf = JSON.parse(
  fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'),
);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const mainBinaryName = tauriConf.mainBinaryName;
const productName = tauriConf.productName;
const version = pkg.version;

const releaseDir = path.join(root, 'src-tauri', 'target', 'release');
const exeName = `${mainBinaryName}.exe`;
const exePath = path.join(releaseDir, exeName);

if (!fs.existsSync(exePath)) {
  throw new Error(`Missing ${exePath}; run tauri build first.`);
}

const outDir = path.join(root, 'artifacts', 'portable');
const stageName = `${productName}-${version}-x64`;
const stageDir = path.join(outDir, '_stage', stageName);
const zipName = `${productName}-${version}-x64_portable.zip`;
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
    `${productName} ${version} (Windows x64 portable)`,
    '',
    '解压后双击运行 .exe 即可，无需安装程序。',
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
