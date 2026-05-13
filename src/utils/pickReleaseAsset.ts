import {
  releaseLinuxTarGzPattern,
  releaseMacosZipPattern,
  releaseWinZipPattern,
} from '@/constants/desktopReleaseAssets';
import type { GitHubReleaseAsset } from '@/types/github-release';

function detectPlatform(): 'windows' | 'macos' | 'linux' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'unknown';
}

function findByExtensions(
  assets: GitHubReleaseAsset[],
  exts: string[],
): GitHubReleaseAsset | undefined {
  const lower = exts.map((e) => e.toLowerCase());
  return assets.find((a) => {
    const n = a.name.toLowerCase();
    return lower.some((e) => n.endsWith(e));
  });
}

/**
 * 为当前平台挑选最合适的发布产物（zip / tar.gz）；无匹配时退回第一个带下载地址的资源。
 * macOS 主线仅分发 `minecraft-utilities-macos-*.zip`（内嵌 .app），不再使用 .dmg。
 */
export function pickPreferredInstallAsset(
  assets: GitHubReleaseAsset[],
): GitHubReleaseAsset | undefined {
  if (!assets.length) return undefined;
  const platform = detectPlatform();
  let picked: GitHubReleaseAsset | undefined;
  if (platform === 'windows') {
    picked =
      assets.find((a) => releaseWinZipPattern.test(a.name)) ?? findByExtensions(assets, ['.zip']);
  } else if (platform === 'macos') {
    picked =
      assets.find((a) => releaseMacosZipPattern.test(a.name)) ??
      assets.find((a) => {
        const n = a.name.toLowerCase();
        return n.endsWith('.zip') && (n.includes('macos') || n.includes('darwin'));
      });
  } else if (platform === 'linux') {
    picked =
      assets.find((a) => releaseLinuxTarGzPattern.test(a.name)) ??
      findByExtensions(assets, ['.tar.gz']) ??
      findByExtensions(assets, ['.appimage']) ??
      findByExtensions(assets, ['.deb']) ??
      findByExtensions(assets, ['.rpm']);
  }
  if (!picked) {
    for (const ext of ['.zip', '.tar.gz', '.appimage', '.deb']) {
      picked = findByExtensions(assets, [ext]);
      if (picked) break;
    }
  }
  return picked ?? assets[0];
}

export function formatAssetSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
