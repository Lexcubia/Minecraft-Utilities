/**
 * GitHub Release 免安装资产命名（与 `scripts/pack-*.mjs` 产出一致）。
 * 须与 `src-tauri/tauri.conf.json` 的 `mainBinaryName` 保持同步；Vitest 会校验二者一致。
 */
export const MAIN_BINARY_NAME = 'minecraft-utilities';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const id = escapeRegExp(MAIN_BINARY_NAME);

/** 匹配 `minecraft-utilities-win-<cpu>-v<semver>.zip` */
export const releaseWinZipPattern = new RegExp(`^${id}-win-.+\\.zip$`, 'i');

/** 匹配 `minecraft-utilities-macos-<cpu>-v<semver>.zip` */
export const releaseMacosZipPattern = new RegExp(`^${id}-macos-.+\\.zip$`, 'i');

/** 匹配 `minecraft-utilities-linux-<cpu>-v<semver>.tar.gz` */
export const releaseLinuxTarGzPattern = new RegExp(`^${id}-linux-.+\\.tar\\.gz$`, 'i');
