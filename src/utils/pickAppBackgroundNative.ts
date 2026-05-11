import { useSettingsStore } from '@/stores/settings';
import { isTauriRuntime } from '@/utils/isTauriRuntime';

/** 在 Tauri 内打开系统选图；取消或未选时无改动。 */
export async function pickAppBackgroundWithNativeDialog(): Promise<void> {
  if (!isTauriRuntime()) return;
  const settings = useSettingsStore();
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: 'Image',
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'svg'],
      },
    ],
  });
  const path =
    typeof selected === 'string'
      ? selected
      : Array.isArray(selected) && selected[0]
        ? selected[0]
        : null;
  if (!path) return;
  settings.revokeCustomBackgroundObjectUrl();
  settings.customAppBackgroundPath = path;
}
