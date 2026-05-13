import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GitHubReleaseAsset } from '@/types/github-release';

import { pickPreferredInstallAsset } from './pickReleaseAsset';

function asset(name: string): GitHubReleaseAsset {
  return {
    name,
    browser_download_url: `https://example.com/${name}`,
    size: 1,
  };
}

describe('pickPreferredInstallAsset (macOS)', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers canonical mac zip over windows zip when no dmg', () => {
    const assets = [
      asset('minecraft-utilities-win-x86_64-v0.1.0.zip'),
      asset('minecraft-utilities-macos-x86_64-v0.1.0.zip'),
    ];
    expect(pickPreferredInstallAsset(assets)?.name).toBe(
      'minecraft-utilities-macos-x86_64-v0.1.0.zip',
    );
  });

  it('prefers minecraft-utilities-macos dmg over windows zip', () => {
    const assets = [
      asset('minecraft-utilities-win-x86_64-v0.1.0.zip'),
      asset('minecraft-utilities-macos-x86_64-v0.1.0.dmg'),
    ];
    expect(pickPreferredInstallAsset(assets)?.name).toBe(
      'minecraft-utilities-macos-x86_64-v0.1.0.dmg',
    );
  });

  it('prefers canonical mac dmg over mac zip when both exist', () => {
    const assets = [
      asset('minecraft-utilities-macos-x86_64-v0.1.0.dmg'),
      asset('minecraft-utilities-macos-x86_64-v0.1.0.zip'),
    ];
    expect(pickPreferredInstallAsset(assets)?.name).toBe(
      'minecraft-utilities-macos-x86_64-v0.1.0.dmg',
    );
  });

  it('falls back to any zip whose name suggests mac when canonical name missing', () => {
    const assets = [
      asset('minecraft-utilities-win-x86_64-v0.1.0.zip'),
      asset('custom-macos-portable.zip'),
    ];
    expect(pickPreferredInstallAsset(assets)?.name).toBe('custom-macos-portable.zip');
  });
});
