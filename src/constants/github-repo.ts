import { REPO_URL } from '@/constants/app-meta';

const match = REPO_URL.match(/github\.com\/([^/]+)\/([^/#?]+)/i);

/** 与 `app-meta` 中 `REPO_URL` 解析一致；Rust 侧 `lib.rs` 常量需同步。 */
export const GITHUB_REPO_OWNER = (match?.[1] ?? 'Lexcubia').trim();
export const GITHUB_REPO_NAME = (match?.[2] ?? 'Minecraft-Utilities')
  .replace(/\.git$/i, '')
  .trim();

export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases?per_page=40`;

export const GITHUB_RELEASES_WEB = `${REPO_URL}/releases`;
