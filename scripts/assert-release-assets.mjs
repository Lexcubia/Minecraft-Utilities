/**
 * CI 用：校验 `upload/`（单矩阵 job）或 `release-files/`（合并后）中的免安装归档数量与命名。
 *
 *   node scripts/assert-release-assets.mjs matrix [upload]
 *   node scripts/assert-release-assets.mjs publish [release-files]
 */
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT } from './build-artifacts.mjs';
import { loadDesktopPackContext } from './lib/load-desktop-pack-context.mjs';

const root = REPO_ROOT;

/** @param {string} d */
function listReleaseArchives(d) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} p */
  function walk(p) {
    if (!fs.existsSync(p)) return;
    for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile()) {
        const lower = ent.name.toLowerCase();
        if (lower.endsWith('.zip') || lower.endsWith('.tar.gz')) out.push(full);
      }
    }
  }
  walk(d);
  return out;
}

/** @param {{ mainBinaryName: string, version: string }} ctx */
function expectedPublishBasenames(ctx) {
  const { mainBinaryName, version } = ctx;
  return [
    `${mainBinaryName}-linux-x86_64-v${version}.tar.gz`,
    `${mainBinaryName}-linux-aarch64-v${version}.tar.gz`,
    `${mainBinaryName}-win-x86_64-v${version}.zip`,
    `${mainBinaryName}-win-aarch64-v${version}.zip`,
    `${mainBinaryName}-macos-aarch64-v${version}.zip`,
    `${mainBinaryName}-macos-x86_64-v${version}.zip`,
  ];
}

const [mode, dirArg] = process.argv.slice(2);
if (mode !== 'matrix' && mode !== 'publish') {
  process.stderr.write(
    'Usage: node scripts/assert-release-assets.mjs matrix [uploadDir]\n' +
      '       node scripts/assert-release-assets.mjs publish [releaseFilesDir]\n',
  );
  process.exit(2);
}

const rel = dirArg || (mode === 'publish' ? 'release-files' : 'upload');
const targetDir = path.resolve(root, rel);

if (mode === 'matrix') {
  const files = listReleaseArchives(targetDir);
  if (files.length !== 1) {
    process.stderr.write(
      `assert-release-assets matrix: expected exactly 1 archive under ${rel}, found ${files.length}\n` +
        files.map((f) => path.relative(root, f)).join('\n'),
    );
    process.stderr.write('\n');
    process.exit(1);
  }
  process.stdout.write(`OK matrix: ${path.relative(root, files[0])}\n`);
  process.exit(0);
}

const ctx = loadDesktopPackContext();
const expected = new Set(expectedPublishBasenames(ctx));
const actual = new Set(listReleaseArchives(targetDir).map((p) => path.basename(p)));

const missing = [...expected].filter((x) => !actual.has(x));
const extra = [...actual].filter((x) => !expected.has(x));

if (missing.length || extra.length) {
  process.stderr.write(
    `assert-release-assets publish: archive set mismatch under ${rel}\n` +
      `  missing (${missing.length}): ${missing.join(', ') || '(none)'}\n` +
      `  extra (${extra.length}): ${extra.join(', ') || '(none)'}\n`,
  );
  process.exit(1);
}

process.stdout.write(`OK publish: ${expected.size} desktop archives for v${ctx.version}\n`);
