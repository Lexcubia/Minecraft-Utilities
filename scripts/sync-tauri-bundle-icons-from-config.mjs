/**
 * 将 `config/app-icons.json` 中的 `tauriBundleIcons.pathsRelativeToSrcTauriDir`
 * 写回 `src-tauri/tauri.conf.json` 的 `bundle.icon`，与托盘等资源路径保持单一配置源。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cfgPath = path.join(root, 'config', 'app-icons.json');
const tauriPath = path.join(root, 'src-tauri', 'tauri.conf.json');

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const nextIcons = cfg.tauriBundleIcons.pathsRelativeToSrcTauriDir;
if (!Array.isArray(nextIcons) || nextIcons.length === 0) {
  throw new Error(
    'config/app-icons.json: tauriBundleIcons.pathsRelativeToSrcTauriDir must be a non-empty array',
  );
}

const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
if (JSON.stringify(tauri.bundle.icon) === JSON.stringify(nextIcons)) {
  process.exit(0);
}

tauri.bundle.icon = nextIcons;
fs.writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`, 'utf8');
