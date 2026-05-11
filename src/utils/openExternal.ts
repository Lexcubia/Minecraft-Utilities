/**
 * 在桌面端优先使用系统默认应用打开 URL；纯 Web 预览时回退到 window.open。
 */
export async function openExternal(href: string): Promise<void> {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(href);
  } catch {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}
