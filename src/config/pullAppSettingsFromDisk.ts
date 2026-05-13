import { mergeDiskAppSettingsJson } from '@/config/mergeDiskAppSettings';
import { useSettingsStore } from '@/stores/settings';

/** 以磁盘为真源重载设置（与启动时 `mergeDiskAppSettingsJson` 一致）。 */
export async function pullAppSettingsFromDisk(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  const raw = await invoke<string>('user_data_read_app_settings');
  const merged = mergeDiskAppSettingsJson((raw ?? '').trim() || '{}');
  useSettingsStore().hydrateFromRemoteJson(merged);
}
