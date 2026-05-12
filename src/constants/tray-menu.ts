/** 独立托盘菜单 Webview 的 label（须与 capabilities、Rust 侧约定一致） */
export const TRAY_MENU_WEBVIEW_LABEL = 'tray-menu';

/** 与 `tray_desktop.rs` 中 `TrayFlyoutOpenPayload`（camelCase）一致 */
export type TrayFlyoutOpenPayload = {
  cursorX: number;
  cursorY: number;
  iconX: number;
  iconY: number;
  iconWidth: number;
  iconHeight: number;
};

export function isTrayFlyoutPayload(v: unknown): v is TrayFlyoutOpenPayload {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.cursorX === 'number' &&
    typeof o.cursorY === 'number' &&
    typeof o.iconX === 'number' &&
    typeof o.iconY === 'number' &&
    typeof o.iconWidth === 'number' &&
    typeof o.iconHeight === 'number'
  );
}
