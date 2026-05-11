//! 系统托盘：桌面端；右键菜单（打开主面板 / 设置 / 关闭）与左键还原窗口。
//! 菜单为系统原生绘制，样式随 OS；文案由前端按语言同步。

#![cfg(desktop)]

use serde::Deserialize;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

const TRAY_ID: &str = "main-tray";
const MENU_ID_OPEN_MAIN: &str = "mc_tray_open_main";
const MENU_ID_SETTINGS: &str = "mc_tray_settings";
const MENU_ID_CLOSE: &str = "mc_tray_close";

fn tray_icon() -> tauri::Result<Image<'static>> {
    // 须与仓库根 `config/app-icons.json` 中 `tauriBundleIcons.trayPngRelativeToSrcTauriDir` 一致
    const PNG: &[u8] = include_bytes!("../icons/32x32.png");
    Image::from_bytes(PNG)
}

fn emit_tray<R: Runtime>(app: &AppHandle<R>, event: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
        let _ = w.emit(event, ());
    }
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let open_main = MenuItem::with_id(app, MENU_ID_OPEN_MAIN, "Open main window", true, None::<&str>)?;
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
                show_main_window(&tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
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
    let open_item = MenuItem::with_id(&app, MENU_ID_OPEN_MAIN, &payload.open_main, true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let sep = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let settings_item =
        MenuItem::with_id(&app, MENU_ID_SETTINGS, &payload.settings, true, None::<&str>).map_err(|e| e.to_string())?;
    let close_item =
        MenuItem::with_id(&app, MENU_ID_CLOSE, &payload.close, true, None::<&str>).map_err(|e| e.to_string())?;
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
