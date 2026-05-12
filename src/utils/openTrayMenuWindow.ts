import { TRAY_MENU_WEBVIEW_LABEL, type TrayFlyoutOpenPayload } from '@/constants/tray-menu';
import { appLog } from '@/utils/appLog';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/dpi';
import { monitorFromPoint } from '@tauri-apps/api/window';
import type { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import router from '@/router';

const MENU_LOGICAL_W = 220;
const MENU_LOGICAL_H = 158;
const GAP_PHYS = 8;

function trayAnchorPhysical(p: TrayFlyoutOpenPayload): { x: number; y: number } {
  const useIcon = p.iconWidth > 0.5 && p.iconHeight > 0.5;
  if (useIcon) {
    return {
      x: p.iconX + p.iconWidth / 2,
      y: p.iconY,
    };
  }
  return { x: p.cursorX, y: p.cursorY };
}

function clampOuterTopLeft(
  x: number,
  y: number,
  pw: number,
  ph: number,
  wx: number,
  wy: number,
  ww: number,
  wh: number,
): [number, number] {
  const wRight = wx + ww;
  const wBottom = wy + wh;
  const nx = Math.min(Math.max(wx, x), wRight - pw);
  const ny = Math.min(Math.max(wy, y), wBottom - ph);
  return [nx, ny];
}

function trayMenuAbsoluteUrl(): string {
  const { href } = router.resolve({ name: 'tray-menu' });
  return new URL(href, window.location.origin).href;
}

async function layoutTrayMenuOuterPhysical(
  win: WebviewWindow,
  p: TrayFlyoutOpenPayload,
): Promise<void> {
  const anchor = trayAnchorPhysical(p);
  const mon = await monitorFromPoint(anchor.x, anchor.y);
  const scale = mon?.scaleFactor ?? (await win.scaleFactor());
  const pw = MENU_LOGICAL_W * scale;
  const ph = MENU_LOGICAL_H * scale;

  let ox = anchor.x - pw / 2;
  let oy = anchor.y - GAP_PHYS - ph;

  if (mon) {
    const wx = mon.workArea.position.x;
    const wy = mon.workArea.position.y;
    const ww = mon.workArea.size.width;
    const wh = mon.workArea.size.height;
    [ox, oy] = clampOuterTopLeft(ox, oy, pw, ph, wx, wy, ww, wh);
    const iconBottom = p.iconY + p.iconHeight;
    if (p.iconHeight > 0.5 && oy + ph > anchor.y - 2) {
      oy = iconBottom + GAP_PHYS;
      [ox, oy] = clampOuterTopLeft(ox, oy, pw, ph, wx, wy, ww, wh);
    }
  }

  await win.setPosition(new PhysicalPosition(Math.round(ox), Math.round(oy)));
  await win.setSize(new PhysicalSize(Math.round(pw), Math.round(ph)));
}

/** 非 Linux：在托盘附近打开独立透明小窗菜单（屏幕物理坐标） */
export async function openTrayMenuWindow(p: TrayFlyoutOpenPayload): Promise<void> {
  if (!isTauriRuntime()) return;
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

  const url = trayMenuAbsoluteUrl();
  const existing = await WebviewWindow.getByLabel(TRAY_MENU_WEBVIEW_LABEL);

  if (existing) {
    await layoutTrayMenuOuterPhysical(existing, p);
    await existing.show();
    await existing.setFocus();
    return;
  }

  const win = new WebviewWindow(TRAY_MENU_WEBVIEW_LABEL, {
    url,
    title: '',
    width: MENU_LOGICAL_W,
    height: MENU_LOGICAL_H,
    decorations: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    shadow: false,
    visible: false,
    center: false,
    focus: true,
  });

  win.once('tauri://error', (e) => {
    appLog('tray', 'error', 'Tray menu window could not be created', String(e?.payload ?? e));
  });

  win.once('tauri://created', () => {
    void (async () => {
      try {
        await layoutTrayMenuOuterPhysical(win, p);
        await win.show();
        await win.setFocus();
      } catch {
        await win.show();
      }
    })();
  });
}
