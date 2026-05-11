/**
 * 以根目录 package.json 的 `version` 为唯一真相源，同步：
 * - src-tauri/Cargo.toml
 * - src-tauri/tauri.conf.json
 * - pyproject.toml
 * - python/modpack_updater/__init__.py
 *
 * 用法：
 * - 由 npm/pnpm 的 `version` 生命周期在 `pnpm version patch|minor|major` 之后自动执行；
 * - 或手动改完 package.json 后执行：`pnpm sync:version`
 * - 或显式指定版本（同时写回 package.json）：`node scripts/sync-version.mjs 0.3.0`
 *
 * 可选：若已安装 Rust，会尝试在 `src-tauri` 下执行 `cargo build -q` 以刷新 Cargo.lock；
 *   跳过请设环境变量 `SKIP_CARGO_SYNC=1`。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assertSemver(v) {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(v)) {
    throw new Error(`Invalid semver string: ${v}`);
  }
}

const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

let version = process.argv[2]?.trim();
if (version) {
  assertSemver(version);
  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
} else {
  version = pkg.version;
  assertSemver(version);
}

function replaceFirstLineRe(filePath, pattern, replacement) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!pattern.test(raw)) {
    throw new Error(`sync-version: pattern not found in ${path.relative(root, filePath)}`);
  }
  fs.writeFileSync(filePath, raw.replace(pattern, replacement), 'utf8');
}

const cargoToml = path.join(root, 'src-tauri', 'Cargo.toml');
replaceFirstLineRe(cargoToml, /^version = "[^"]+"$/m, `version = "${version}"`);

const tauriConfPath = path.join(root, 'src-tauri', 'tauri.conf.json');
replaceFirstLineRe(tauriConfPath, /^ {2}"version": "[^"]*",$/m, `  "version": "${version}",`);

const pyprojectPath = path.join(root, 'pyproject.toml');
replaceFirstLineRe(pyprojectPath, /^version = "[^"]+"$/m, `version = "${version}"`);

const pyInitPath = path.join(root, 'python', 'modpack_updater', '__init__.py');
replaceFirstLineRe(pyInitPath, /^__version__ = "[^"]+"$/m, `__version__ = "${version}"`);

if (process.env.SKIP_CARGO_SYNC === '1') {
  process.stdout.write(`sync-version: ${version} (SKIP_CARGO_SYNC=1, skip cargo)\n`);
  process.exit(0);
}

const cargoDir = path.join(root, 'src-tauri');
const cargo = spawnSync('cargo', ['build', '-q'], { cwd: cargoDir, stdio: 'inherit' });
if (cargo.error) {
  if (cargo.error.code === 'ENOENT') {
    process.stderr.write(
      'sync-version: cargo not in PATH; skipped Cargo.lock refresh (install Rust or run cargo build in src-tauri).\n',
    );
    process.exit(0);
  }
  throw cargo.error;
}
if (cargo.status !== 0) {
  process.stderr.write('sync-version: cargo build failed; fix errors or set SKIP_CARGO_SYNC=1.\n');
  process.exit(cargo.status ?? 1);
}

process.stdout.write(`sync-version: ${version} (Cargo.lock refreshed)\n`);
