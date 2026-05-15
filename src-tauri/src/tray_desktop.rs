//! 系统托盘：桌面端。
//! - **Linux**：原生右键菜单（无菜单时图标可能异常）；左键尽量还原主窗。
//! - **Windows / macOS**：左键还原主窗；右键由独立透明小窗 `tray-menu` 展示毛玻璃菜单（`tray-flyout-open`）。

#![cfg(desktop)]

use serde::Deserialize;
use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};
use tauri::Emitter;

#[cfg(not(target_os = "linux"))]
use tauri::{Position, Size};

#[cfg(target_os = "linux")]
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

const TRAY_ID: &str = "main-tray";

#[cfg(target_os = "linux")]
const MENU_ID_OPEN_MAIN: &str = "mc_tray_open_main";
#[cfg(target_os = "linux")]
const MENU_ID_SETTINGS: &str = "mc_tray_settings";
#[cfg(target_os = "linux")]
const MENU_ID_CLOSE: &str = "mc_tray_close";

#[cfg(not(target_os = "linux"))]
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TrayFlyoutOpenPayload {
    cursor_x: f64,
    cursor_y: f64,
    icon_x: f64,
    icon_y: f64,
    icon_width: f64,
    icon_height: f64,
}

fn tray_icon() -> tauri::Result<Image<'static>> {
    const PNG: &[u8] = include_bytes!("../icons/32x32.png");
    Image::from_bytes(PNG)
}

#[cfg(target_os = "linux")]
fn emit_tray<R: Runtime>(app: &AppHandle<R>, event: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
        let _ = w.emit(event, ());
    }
}

pub fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// 托盘 / 单实例 / 前端：统一恢复主窗（设置由各 Webview 的 `settings-persist-broadcast` 同步，避免与异步写盘竞态）。
#[tauri::command]
pub fn focus_main_window(app: AppHandle) -> Result<(), String> {
    show_main_window(&app);
    Ok(())
}

#[cfg(target_os = "linux")]
fn create_tray_linux<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let open_main = MenuItem::with_id(
        app,
        MENU_ID_OPEN_MAIN,
        "Open main window",
        true,
        None::<&str>,
    )?;
    let sep = PredefinedMenuItem::separator(app)?;
    let settings_item = MenuItem::with_id(app, MENU_ID_SETTINGS, "Settings", true, None::<&str>)?;
    let close_item = MenuItem::with_id(app, MENU_ID_CLOSE, "Close", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_main, &sep, &settings_item, &close_item])?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(tray_icon()?)
        .tooltip("Minecraft Utilities")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            MENU_ID_OPEN_MAIN => show_main_window(app),
            MENU_ID_SETTINGS => emit_tray(app, "tray-open-settings"),
            MENU_ID_CLOSE => emit_tray(app, "tray-request-exit"),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn tray_icon_bounds_physical(rect: tauri::Rect) -> (f64, f64, f64, f64) {
    let (x, y) = match rect.position {
        Position::Physical(p) => (p.x as f64, p.y as f64),
        Position::Logical(l) => (l.x, l.y),
    };
    let (w, h) = match rect.size {
        Size::Physical(s) => (s.width as f64, s.height as f64),
        Size::Logical(l) => (l.width, l.height),
    };
    (x, y, w.max(1.0), h.max(1.0))
}

#[cfg(not(target_os = "linux"))]
fn create_tray_non_linux<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(tray_icon()?)
        .tooltip("Minecraft Utilities")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            let app = tray.app_handle();
            if let TrayIconEvent::Click {
                button,
                button_state: MouseButtonState::Up,
                position,
                rect,
                ..
            } = event
            {
                match button {
                    MouseButton::Left => show_main_window(app),
                    MouseButton::Right => {
                        let (icon_x, icon_y, icon_width, icon_height) =
                            tray_icon_bounds_physical(rect);
                        let payload = TrayFlyoutOpenPayload {
                            cursor_x: position.x,
                            cursor_y: position.y,
                            icon_x,
                            icon_y,
                            icon_width,
                            icon_height,
                        };
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.emit("tray-flyout-open", payload);
                        }
                    }
                    _ => {}
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    #[cfg(target_os = "linux")]
    {
        create_tray_linux(app)
    }
    #[cfg(not(target_os = "linux"))]
    {
        create_tray_non_linux(app)
    }
}

#[tauri::command]
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayMenuLabelsPayload {
    pub open_main: String,
    pub settings: String,
    pub close: String,
    pub tooltip: String,
}

#[tauri::command]
pub fn sync_tray_menu_labels(app: AppHandle, payload: TrayMenuLabelsPayload) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let open_item = MenuItem::with_id(
            &app,
            MENU_ID_OPEN_MAIN,
            &payload.open_main,
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let sep = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
        let settings_item = MenuItem::with_id(
            &app,
            MENU_ID_SETTINGS,
            &payload.settings,
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let close_item = MenuItem::with_id(&app, MENU_ID_CLOSE, &payload.close, true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let menu = Menu::with_items(&app, &[&open_item, &sep, &settings_item, &close_item])
            .map_err(|e| e.to_string())?;
        let tray = app
            .tray_by_id(TRAY_ID)
            .ok_or_else(|| "tray icon not initialized".to_string())?;
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
        let TrayMenuLabelsPayload { tooltip, .. } = payload;
        let _ = tray.set_tooltip(Some(tooltip));
        Ok(())
    }
    #[cfg(not(target_os = "linux"))]
    {
        let tray = app
            .tray_by_id(TRAY_ID)
            .ok_or_else(|| "tray icon not initialized".to_string())?;
        let TrayMenuLabelsPayload {
            open_main,
            settings,
            close,
            tooltip,
        } = payload;
        let _ = (open_main, settings, close);
        tray.set_tooltip(Some(tooltip)).map_err(|e| e.to_string())
    }
}
