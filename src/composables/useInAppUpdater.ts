import { check, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { isTauriRuntime } from '@/utils/isTauriRuntime';

export type InAppUpdateCheckResult =
  | { kind: 'none' }
  | { kind: 'available'; version: string; body?: string }
  | { kind: 'unsupported' }
  | { kind: 'error'; message: string };

/** 仅查询是否有 Tauri 增量更新（不下载）。 */
export async function checkInAppUpdate(): Promise<InAppUpdateCheckResult> {
  if (!isTauriRuntime()) return { kind: 'unsupported' };
  try {
    const update = await check();
    if (!update) return { kind: 'none' };
    return { kind: 'available', version: update.version, body: update.body };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/** 检查并下载、安装（由系统/安装器完成后续步骤）。 */
export async function downloadAndInstallAppUpdate(
  onProgress?: (e: DownloadEvent) => void,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTauriRuntime()) {
    return { ok: false, message: 'Not in Tauri desktop runtime.' };
  }
  try {
    const update = await check();
    if (!update) return { ok: false, message: 'NO_UPDATE' };
    await update.downloadAndInstall(onProgress);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
