#!/usr/bin/env node
/**
 * Tauri `bundle.createUpdaterArtifacts: "v1Compatible"` 会生成 zip/tar.gz 与 `.sig`，
 * 但未必在 `target/release/bundle` 下写出 `latest.json`。desktop-release 需要各 job 产出
 * 可被 `find … -name latest.json` 发现的文件，供后续复制为 `latest.fragment.*.json`。
 *
 * 若 bundle 树中已存在 `latest.json`，则直接退出 0。
 * 否则根据当前平台产物合成一个 `latest.json` 写到 bundle 根目录。
 *
 * 用法：
 *   node scripts/synthesize-updater-latest-fragment.mjs \
 *     --bundle src-tauri/target/release/bundle \
 *     --target windows|linux|darwin
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  /** @type {{ bundle?: string; target?: string }} */
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bundle') out.bundle = argv[++i];
    else if (a === '--target') out.target = argv[++i];
  }
  return out;
}

/** @param {string} dir */
function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}

/** @param {string} bundleRoot */
function findExistingLatestJson(bundleRoot) {
  for (const f of walkFiles(bundleRoot)) {
    if (path.basename(f) === 'latest.json') return f;
  }
  return null;
}

function readAppVersion() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const v = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  if (!v || typeof v !== 'string') throw new Error('Invalid package.json version');
  return v;
}

/** @param {string} sigPath */
function readSignature(sigPath) {
  return fs.readFileSync(sigPath, 'utf8').trim();
}

/** @param {string} basename */
function placeholderUrl(basename) {
  // merge-github-updater-latest.mjs 只取 URL 最后一段作为文件名；勿对 basename 再做 encodeURIComponent，避免双重编码。
  return `https://invalid.local/updater-artifact/${basename}`;
}

function darwinUpdaterArch() {
  const ra = process.env.RUNNER_ARCH;
  if (ra) {
    const u = ra.toUpperCase();
    if (u === 'ARM64' || u === 'AARCH64') return 'aarch64';
    if (u === 'X64' || u === 'X86_64') return 'x86_64';
  }
  const m = os.machine();
  if (m === 'arm64' || m === 'aarch64') return 'aarch64';
  if (m === 'x86_64' || m === 'amd64') return 'x86_64';
  const a = os.arch();
  if (a === 'arm64') return 'aarch64';
  if (a === 'x64') return 'x86_64';
  throw new Error(`Cannot infer darwin updater arch (machine=${m}, arch=${a}, RUNNER_ARCH=${ra})`);
}

/**
 * @param {string} bundleRoot
 * @param {'windows' | 'linux' | 'darwin'} target
 */
function synthesize(bundleRoot, target) {
  /** @type {Record<string, { signature: string; url: string }>} */
  const platforms = {};
  const all = [...walkFiles(bundleRoot)];

  if (target === 'windows') {
    const nsisZips = all.filter(
      (f) =>
        f.includes(`${path.sep}nsis${path.sep}`) && f.endsWith('.nsis.zip') && !f.endsWith('.sig'),
    );
    const msiZips = all.filter(
      (f) =>
        f.includes(`${path.sep}msi${path.sep}`) && f.endsWith('.msi.zip') && !f.endsWith('.sig'),
    );
    if (nsisZips.length === 1) {
      const z = nsisZips[0];
      const sig = `${z}.sig`;
      if (!fs.existsSync(sig)) throw new Error(`Missing signature for NSIS zip: ${sig}`);
      platforms['windows-x86_64-nsis'] = {
        signature: readSignature(sig),
        url: placeholderUrl(path.basename(z)),
      };
    } else if (nsisZips.length > 1) {
      throw new Error(
        `Expected 1 NSIS updater zip, found ${nsisZips.length}: ${nsisZips.join(', ')}`,
      );
    }

    if (msiZips.length === 1) {
      const z = msiZips[0];
      const sig = `${z}.sig`;
      if (!fs.existsSync(sig)) throw new Error(`Missing signature for MSI zip: ${sig}`);
      platforms['windows-x86_64-msi'] = {
        signature: readSignature(sig),
        url: placeholderUrl(path.basename(z)),
      };
    } else if (msiZips.length > 1) {
      throw new Error(`Expected 1 MSI updater zip, found ${msiZips.length}: ${msiZips.join(', ')}`);
    }
  } else if (target === 'linux') {
    const imgs = all.filter(
      (f) =>
        f.includes(`${path.sep}appimage${path.sep}`) &&
        f.endsWith('.AppImage.tar.gz') &&
        !f.endsWith('.sig'),
    );
    if (imgs.length === 1) {
      const z = imgs[0];
      const sig = `${z}.sig`;
      if (!fs.existsSync(sig)) throw new Error(`Missing signature for AppImage tar.gz: ${sig}`);
      platforms['linux-x86_64-appimage'] = {
        signature: readSignature(sig),
        url: placeholderUrl(path.basename(z)),
      };
    } else if (imgs.length > 1) {
      throw new Error(`Expected 1 AppImage updater archive, found ${imgs.length}`);
    }
  } else if (target === 'darwin') {
    const arch = darwinUpdaterArch();
    const apps = all.filter(
      (f) =>
        f.includes(`${path.sep}macos${path.sep}`) &&
        f.endsWith('.app.tar.gz') &&
        !f.endsWith('.sig'),
    );
    if (apps.length === 1) {
      const z = apps[0];
      const sig = `${z}.sig`;
      if (!fs.existsSync(sig)) throw new Error(`Missing signature for macOS app.tar.gz: ${sig}`);
      platforms[`darwin-${arch}-app`] = {
        signature: readSignature(sig),
        url: placeholderUrl(path.basename(z)),
      };
    } else if (apps.length > 1) {
      throw new Error(`Expected 1 macOS app.tar.gz updater archive, found ${apps.length}`);
    }
  } else {
    throw new Error(`Unknown --target ${target}`);
  }

  if (Object.keys(platforms).length === 0) {
    throw new Error(
      `No v1Compatible updater artifacts found under ${path.resolve(bundleRoot)} for target=${target}`,
    );
  }

  const version = readAppVersion();
  const doc = {
    version,
    notes: '',
    pub_date: new Date().toISOString(),
    platforms,
  };

  const outFile = path.join(bundleRoot, 'latest.json');
  fs.writeFileSync(outFile, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outFile} keys=${Object.keys(platforms).join(', ')}`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv);
const bundle =
  args.bundle ?? path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'bundle');
const target = args.target;

if (!target || !['windows', 'linux', 'darwin'].includes(target)) {
  console.error(
    'Usage: node scripts/synthesize-updater-latest-fragment.mjs --bundle <dir> --target windows|linux|darwin',
  );
  process.exit(1);
}

if (!fs.existsSync(bundle)) {
  console.error(`Bundle directory does not exist: ${path.resolve(bundle)}`);
  process.exit(1);
}

const existing = findExistingLatestJson(bundle);
if (existing) {
  console.log(`Updater latest.json already present: ${existing}`);
  process.exit(0);
}

try {
  synthesize(bundle, /** @type {'windows' | 'linux' | 'darwin'} */ (target));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
