//! 用户数据根目录（默认可执行文件所在目录；不可写时回退 **`app_local_data_dir()`**）下维护：
//! - **`logs/`**：`app.log` 由 `user_data_append_log_line` 追加，支持轮转与 `app.log.prev`。
//! - **`configs/app-settings.json`**：与前端 `localStorage` 同步的应用设置（JSON），避免仅依赖 WebView 存储导致重启丢配置。

use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

use tauri::Manager;

const LOG_SUBDIR: &str = "logs";
const CONFIG_SUBDIR: &str = "configs";
const APP_SETTINGS_FILE: &str = "app-settings.json";
const APP_LOG_FILE: &str = "app.log";
const APP_LOG_MAX_BYTES: u64 = 4 * 1024 * 1024;

fn legacy_app_data_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_local_data_dir().map_err(|e| e.to_string())
}

fn application_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().executable_dir().map_err(|e| e.to_string())
}

fn app_dir_data_usable(app_dir: &Path) -> bool {
    let logs = app_dir.join(LOG_SUBDIR);
    if fs::create_dir_all(&logs).is_err() {
        return false;
    }
    let probe = logs.join(".mu-write-probe");
    match fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&probe)
    {
        Ok(mut f) => {
            let _ = writeln!(f, "ok");
            let _ = fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

fn data_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = application_dir(app)?;
    if app_dir_data_usable(&app_dir) {
        return Ok(app_dir);
    }
    legacy_app_data_root(app)
}

fn log_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_root(app)?.join(LOG_SUBDIR))
}

fn app_settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_root(app)?
        .join(CONFIG_SUBDIR)
        .join(APP_SETTINGS_FILE))
}

#[tauri::command]
pub fn user_data_init_defaults(app: tauri::AppHandle) -> Result<(), String> {
    let root = data_root(&app)?;
    fs::create_dir_all(root.join(LOG_SUBDIR)).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join(CONFIG_SUBDIR)).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDataPaths {
    pub data_root: String,
    pub log_dir: String,
    pub app_log_path: String,
    pub app_settings_path: String,
}

#[tauri::command]
pub fn user_data_get_paths(app: tauri::AppHandle) -> Result<String, String> {
    let root = data_root(&app)?;
    let log = log_dir(&app)?;
    let settings = app_settings_path(&app)?;
    let paths = UserDataPaths {
        data_root: root.to_string_lossy().into_owned(),
        log_dir: log.to_string_lossy().into_owned(),
        app_log_path: log.join(APP_LOG_FILE).to_string_lossy().into_owned(),
        app_settings_path: settings.to_string_lossy().into_owned(),
    };
    serde_json::to_string(&paths).map_err(|e| e.to_string())
}

/// 读取 `configs/app-settings.json`；不存在或空文件返回 `"{}"`；非法 JSON 返回 Err。
#[tauri::command]
pub fn user_data_read_app_settings(app: tauri::AppHandle) -> Result<String, String> {
    let path = app_settings_path(&app)?;
    if !path.is_file() {
        return Ok("{}".to_string());
    }
    let s = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let t = s.trim();
    if t.is_empty() {
        return Ok("{}".to_string());
    }
    serde_json::from_str::<Value>(t).map_err(|e| format!("invalid app-settings JSON: {e}"))?;
    Ok(t.to_string())
}

/// 原子写入设置文件（先写临时文件再 rename）。
#[tauri::command]
pub fn user_data_write_app_settings(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let trimmed = json.trim();
    serde_json::from_str::<Value>(trimmed)
        .map_err(|e| format!("refuse to write invalid app-settings JSON: {e}"))?;
    let path = app_settings_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, trimmed).map_err(|e| e.to_string())?;
    #[cfg(windows)]
    {
        let _ = fs::remove_file(&path);
    }
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn user_data_append_log_line(app: tauri::AppHandle, line: String) -> Result<(), String> {
    let dir = log_dir(&app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(APP_LOG_FILE);
    if path.is_file() {
        if let Ok(meta) = fs::metadata(&path) {
            if meta.len() > APP_LOG_MAX_BYTES {
                let bak = dir.join("app.log.prev");
                let _ = fs::remove_file(&bak);
                fs::rename(&path, &bak).map_err(|e| e.to_string())?;
            }
        }
    }
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    writeln!(f, "{line}").map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())?;
    Ok(())
}
