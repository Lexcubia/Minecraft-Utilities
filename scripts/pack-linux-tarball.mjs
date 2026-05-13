/**
 * 将 `src-tauri/target/release` 下的 Linux 主二进制打成免安装 tar.gz（仅 Linux）。
 * 产物：`minecraft-utilities-linux-<x86_64|aarch64>-v<semver>.tar.gz`
 * 架构由环境变量 `TARGET_ARCH`（`x86_64` | `aarch64`）指定；未设置时按 `uname -m` 推断。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

if (process.platform !== 'linux') {
  process.stderr.write('pack-linux-tarball: skip (not Linux).\n');
  process.exit(0);
}

const tauriConf = JSON.parse(
  fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'),
);
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const mainBinaryName = tauriConf.mainBinaryName;
const version = pkg.version;

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

const releaseDir = path.join(root, 'src-tauri', 'target', 'release');
const binName = mainBinaryName;
const binPath = path.join(releaseDir, binName);

if (!fs.existsSync(binPath)) {
  throw new Error(`Missing ${binPath}; run tauri build --no-bundle first.`);
}

const outDir = path.join(root, 'artifacts', 'linux');
const stageName = `${mainBinaryName}-${version}-${targetArch}`;
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
    '持久化数据默认写在「与二进制同目录」下的 configs、logs、locales、assets；主配置为 configs/settings.json。',
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
