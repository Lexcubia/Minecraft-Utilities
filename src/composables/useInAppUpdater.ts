import type { UpdateChannel } from '@/stores/settings';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { buildUpdateNetworkOptionsJson } from '@/utils/updateNetworkOptions';

export type InAppUpdateNetworkOptions = {
  updateChannel: UpdateChannel;
  updateProxy: string;
};

function optionsArg(opts: InAppUpdateNetworkOptions): string {
  return buildUpdateNetworkOptionsJson(opts.updateChannel, opts.updateProxy);
}

export type InAppUpdateCheckResult =
  | { kind: 'none' }
  | {
      kind: 'available';
      version: string;
      /** 与 GitHub `tag_name` 一致，用于匹配内置 CHANGELOG */ tagName: string;
    }
  | { kind: 'unsupported' }
  | { kind: 'unsupportedPlatform'; releasesPageUrl: string }
  | { kind: 'error'; message: string };

export type WindowsReleaseUpdatePhase = 'downloading' | 'extracting' | 'applying';

export type WindowsReleaseUpdateProgress = {
  phase: WindowsReleaseUpdatePhase;
  downloaded: number;
  total: number | null;
  /** 0–100，两位小数；无 Content-Length 时为 null */
  percent: number | null;
};

export const WINDOWS_RELEASE_UPDATE_PROGRESS_EVENT = 'windows-release-update-progress';

type WindowsReleaseCheckJson = {
  supported: boolean;
  error?: string;
  hasUpdate?: boolean;
  latestVersion?: string;
  tagName?: string;
  setupDownloadUrl?: string;
  setupFileName?: string;
  releasesPageUrl: string;
};

/** 仅查询是否有新版本（Windows：按渠道对比 GitHub Releases 与当前应用版本）。 */
export async function checkInAppUpdate(
  network: InAppUpdateNetworkOptions,
): Promise<InAppUpdateCheckResult> {
  if (!isTauriRuntime()) return { kind: 'unsupported' };
  try {
    const raw = await invoke<string>('check_windows_release_update', {
      optionsJson: optionsArg(network),
    });
    const j = JSON.parse(raw) as WindowsReleaseCheckJson;
    if (!j.supported) {
      return { kind: 'unsupportedPlatform', releasesPageUrl: j.releasesPageUrl };
    }
    if (j.error) return { kind: 'error', message: j.error };
    if (!j.hasUpdate) return { kind: 'none' };
    const version = (j.latestVersion ?? '').trim();
    const tagName = (j.tagName ?? '').trim() || (version ? `v${version}` : '');
    return { kind: 'available', version, tagName };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/** 监听 Windows 应用内更新进度；返回取消监听的函数。 */
export async function listenWindowsReleaseUpdateProgress(
  onProgress: (progress: WindowsReleaseUpdateProgress) => void,
): Promise<UnlistenFn> {
  return listen<WindowsReleaseUpdateProgress>(WINDOWS_RELEASE_UPDATE_PROGRESS_EVENT, (ev) => {
    onProgress(ev.payload);
  });
}

/** Windows：下载、替换安装目录并重启；其他系统不支持。 */
export async function downloadAndInstallAppUpdate(
  network: InAppUpdateNetworkOptions,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTauriRuntime()) {
    return { ok: false, message: 'Not in Tauri desktop runtime.' };
  }
  try {
    await invoke('run_windows_release_update_setup', {
      optionsJson: optionsArg(network),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

/** 若上次更新后已重启，返回新版本号（仅读取一次）。 */
export async function takePostUpdateSuccessNotice(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  try {
    const v = await invoke<string | null>('take_post_update_success_notice');
    const trimmed = (v ?? '').trim();
    return trimmed || null;
  } catch {
    return null;
  }
}
