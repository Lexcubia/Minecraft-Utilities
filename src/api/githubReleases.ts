import { GITHUB_RELEASES_API } from '@/constants/github-repo';
import type { GitHubRelease, GitHubReleaseAsset } from '@/types/github-release';
import { appLog } from '@/utils/appLog';
import { invoke } from '@tauri-apps/api/core';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseAssets(raw: unknown): GitHubReleaseAsset[] {
  if (!Array.isArray(raw)) return [];
  const out: GitHubReleaseAsset[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = item.name;
    const url = item.browser_download_url;
    const size = item.size;
    if (typeof name !== 'string' || typeof url !== 'string') continue;
    const n = typeof size === 'number' ? size : Number(size);
    out.push({
      name,
      browser_download_url: url,
      size: Number.isFinite(n) ? n : 0,
    });
  }
  return out;
}

function parseRelease(raw: unknown): GitHubRelease | null {
  if (!isRecord(raw)) return null;
  const id = raw.id;
  const tag_name = raw.tag_name;
  const html_url = raw.html_url;
  if (typeof id !== 'number' || typeof tag_name !== 'string' || typeof html_url !== 'string') {
    return null;
  }
  const draft = Boolean(raw.draft);
  if (draft) return null;

  return {
    id,
    tag_name,
    name: typeof raw.name === 'string' ? raw.name : null,
    body: typeof raw.body === 'string' ? raw.body : null,
    prerelease: Boolean(raw.prerelease),
    draft,
    published_at: typeof raw.published_at === 'string' ? raw.published_at : null,
    html_url,
    assets: parseAssets(raw.assets),
  };
}

export async function fetchGithubReleasesList(): Promise<GitHubRelease[]> {
  let text: string;
  let via: 'tauri' | 'web' = 'tauri';
  try {
    text = await invoke<string>('fetch_github_releases');
  } catch (e) {
    appLog(
      'network',
      'debug',
      'fetch_github_releases (Tauri) failed, using web',
      e instanceof Error ? e.message : String(e),
    );
    via = 'web';
    const res = await fetch(GITHUB_RELEASES_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      const err = new Error(`GitHub API HTTP ${res.status}`) as Error & { cause?: unknown };
      err.cause = e;
      throw err;
    }
    text = await res.text();
  }

  const data = JSON.parse(text) as unknown;
  if (!Array.isArray(data)) {
    throw new Error('Invalid releases response');
  }

  const list = data.map(parseRelease).filter((r): r is GitHubRelease => r !== null);
  list.sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
  appLog('network', 'info', `GitHub releases loaded (${list.length})`, `via ${via}`);
  return list;
}
