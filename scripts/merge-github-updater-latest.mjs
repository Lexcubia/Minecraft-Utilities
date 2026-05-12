#!/usr/bin/env node
/**
 * 合并各平台 Tauri 构建产出的 `latest.fragment.*.json`，并重写 `platforms.*.url` 为
 * `https://github.com/{owner}/{repo}/releases/download/{tag}/{basename}`，
 * 供应用内 updater 使用（与 `tauri.conf.json` 的 `endpoints` 一致）。
 *
 * 用法：
 *   node scripts/merge-github-updater-latest.mjs \
 *     --root release-files \
 *     --tag v0.2.0 \
 *     --repo Owner/Name \
 *     [--notes-file release_notes.md] \
 *     --out release-files/latest.json
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  /** @type {Record<string, string | undefined>} */
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') out.root = argv[++i];
    else if (a === '--tag') out.tag = argv[++i];
    else if (a === '--repo') out.repo = argv[++i];
    else if (a === '--notes-file') out.notesFile = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}

function basenameFromUpdaterUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('file:')) {
    try {
      return path.basename(new URL(trimmed).pathname);
    } catch {
      return path.basename(trimmed);
    }
  }
  if (trimmed.includes('://')) {
    try {
      const u = new URL(trimmed);
      const segs = u.pathname.split('/').filter(Boolean);
      return segs[segs.length - 1] ?? '';
    } catch {
      return path.basename(trimmed);
    }
  }
  return path.basename(trimmed.replace(/\\/g, '/'));
}

const args = parseArgs(process.argv);
const root = args.root;
const tag = args.tag;
const repo = args.repo;
const outPath = args.out;
const notesFile = args.notesFile;

if (!root || !tag || !repo || !outPath) {
  console.error(
    'Usage: node scripts/merge-github-updater-latest.mjs --root <dir> --tag <vX.Y.Z> --repo owner/name --out <latest.json> [--notes-file path]',
  );
  process.exit(1);
}

const [owner, repoName] = repo.split('/');
if (!owner || !repoName) {
  console.error(`Invalid --repo (expected owner/name): ${repo}`);
  process.exit(1);
}

const prefix = `https://github.com/${owner}/${repoName}/releases/download/${tag}/`;

const fragments = [];
for (const f of walkFiles(root)) {
  const base = path.basename(f);
  if (base.startsWith('latest.fragment.') && base.endsWith('.json')) {
    fragments.push(f);
  }
}

if (fragments.length === 0) {
  console.error(
    'No latest.fragment.*.json found under --root. Ensure Tauri build used TAURI_SIGNING_PRIVATE_KEY and createUpdaterArtifacts is true.',
  );
  process.exit(1);
}

fragments.sort();

/** @type {{ version: string; notes: string; pub_date?: string; platforms: Record<string, { signature: string; url: string }> }} */
const merged = {
  version: '',
  notes: '',
  pub_date: new Date().toISOString(),
  platforms: {},
};

for (const fp of fragments) {
  const raw = fs.readFileSync(fp, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`Invalid JSON: ${fp}`, e);
    process.exit(1);
  }
  if (!merged.version && data.version) merged.version = data.version;
  if (!merged.notes && typeof data.notes === 'string') merged.notes = data.notes;
  if (data.pub_date) merged.pub_date = data.pub_date;
  const pl = data.platforms;
  if (!pl || typeof pl !== 'object') continue;
  for (const [key, plat] of Object.entries(pl)) {
    if (!plat || typeof plat.signature !== 'string' || typeof plat.url !== 'string') continue;
    const bn = basenameFromUpdaterUrl(plat.url);
    if (!bn) {
      console.error(`Could not infer asset basename from url in ${fp} key=${key}: ${plat.url}`);
      process.exit(1);
    }
    merged.platforms[key] = {
      signature: plat.signature,
      url: `${prefix}${encodeURIComponent(bn)}`,
    };
  }
}

if (!merged.version) {
  console.error('Merged updater JSON has no version.');
  process.exit(1);
}
if (Object.keys(merged.platforms).length === 0) {
  console.error('Merged updater JSON has no platforms.');
  process.exit(1);
}

if (notesFile && fs.existsSync(notesFile)) {
  merged.notes = fs.readFileSync(notesFile, 'utf8').trim() || merged.notes;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath} (${Object.keys(merged.platforms).length} platform(s)).`);
