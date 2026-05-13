import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '@/utils/isTauriRuntime';

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

/** 仅查询是否有新版本（Windows：对比 GitHub Latest Release 与当前应用版本）。 */
export async function checkInAppUpdate(): Promise<InAppUpdateCheckResult> {
  if (!isTauriRuntime()) return { kind: 'unsupported' };
  try {
    const raw = await invoke<string>('check_windows_release_update');
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

/** Windows：下载 Latest Release 中与当前架构一致的免安装 zip，解压到临时目录并打开资源管理器；其他系统不支持。 */
export async function downloadAndInstallAppUpdate(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  if (!isTauriRuntime()) {
    return { ok: false, message: 'Not in Tauri desktop runtime.' };
  }
  try {
    await invoke('run_windows_release_update_setup');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
