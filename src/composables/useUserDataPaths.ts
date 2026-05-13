import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { shallowRef } from 'vue';

export type UserDataPaths = {
  /** 持久化根目录：默认可执行文件所在目录；不可写时为本机 `app_local_data_dir()` */
  dataRoot: string;
  logDir: string;
  appLogPath: string;
  /** `settings.json`（与前端设置 store 同步），位于 `dataRoot` 根目录 */
  appSettingsPath: string;
};

const paths = shallowRef<UserDataPaths | null>(null);

/** 拉取一次持久化根路径。非 Tauri 返回 null。 */
export async function loadUserDataPaths(): Promise<UserDataPaths | null> {
  if (!isTauriRuntime()) return null;
  if (paths.value) return paths.value;
  const { invoke } = await import('@tauri-apps/api/core');
  const raw = await invoke<string>('user_data_get_paths');
  try {
    paths.value = JSON.parse(raw) as UserDataPaths;
  } catch {
    console.warn('[useUserDataPaths] invalid JSON from user_data_get_paths');
    paths.value = null;
  }
  return paths.value;
}

export function useUserDataPaths() {
  return { paths, loadUserDataPaths };
}
