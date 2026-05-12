import type { SettingsTab } from '@/views/settings/settings-tabs';
import { settingsRouteName } from '@/views/settings/settings-tabs';
import { appLog } from '@/utils/appLog';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import router from '@/router';

const SETTINGS_WEBVIEW_LABEL = 'settings';

export function settingsAbsoluteUrl(tab?: SettingsTab): string {
  const name = settingsRouteName(tab ?? 'general');
  const { href } = router.resolve({ name });
  return new URL(href, window.location.origin).href;
}

/** 独立设置窗口：已存在则聚焦并导航；否则创建（无系统标题栏，由页面内三键控制） */
export async function openSettingsWindow(tab?: SettingsTab): Promise<void> {
  if (!isTauriRuntime()) return;
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const { emitTo } = await import('@tauri-apps/api/event');
  const url = settingsAbsoluteUrl(tab);
  const path = router.resolve({ name: settingsRouteName(tab ?? 'general') }).path;

  const existing = await WebviewWindow.getByLabel(SETTINGS_WEBVIEW_LABEL);
  if (existing) {
    try {
      await existing.show();
      await existing.setFocus();
      await emitTo(SETTINGS_WEBVIEW_LABEL, 'settings-navigate', { path });
    } catch (e) {
      appLog(
        'app',
        'error',
        'Failed to show existing settings window',
        e instanceof Error ? e.message : String(e),
      );
    }
    return;
  }

  const win = new WebviewWindow(SETTINGS_WEBVIEW_LABEL, {
    url,
    title: 'Minecraft Utilities',
    width: 720,
    height: 700,
    minWidth: 520,
    minHeight: 480,
    center: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    decorations: false,
    visible: true,
  });

  win.once('tauri://error', (e) => {
    appLog('app', 'error', 'Settings window could not be created', String(e?.payload ?? e));
  });
}
