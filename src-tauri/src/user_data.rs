//! 用户数据根目录：**默认可执行文件所在目录**（与便携包、用户期望的「应用旁」一致）；若该目录不可写则回退 **`app_local_data_dir()`**。
//! - **`settings.json`**：应用设置（JSON），位于 `data_root` 根目录。
//! - **`logs/app.log`**：由 `user_data_append_log_line` 追加；**每次启动**将非空旧文件归档为 `app-YYYYMMDD_HHMMSS_mmm.log`（本地时间 + 毫秒），并最多保留 **20** 个归档；单文件超过约 4MB 时同样归档并换新文件。
//!
//! 启动时会从旧路径迁移一次：`configs/app-settings.json`（同目录或系统数据目录下的历史文件）。

use chrono::Local;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use tauri::Manager;

const LOG_SUBDIR: &str = "logs";
const LEGACY_CONFIG_SUBDIR: &str = "configs";
const LEGACY_APP_SETTINGS_FILE: &str = "app-settings.json";
const SETTINGS_FILE: &str = "settings.json";
const APP_LOG_FILE: &str = "app.log";
const APP_LOG_MAX_BYTES: u64 = 4 * 1024 * 1024;
/// 带时间戳的归档（启动轮转 + 按大小轮转）最多保留个数。
const APP_LOG_ARCHIVE_MAX: usize = 20;

fn app_local_data_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_local_data_dir().map_err(|e| e.to_string())
}

/// 可执行文件所在目录（优先 `current_exe()` 的父目录，避免部分环境下 `executable_dir()` 与真实路径不一致）。
fn executable_parent_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            return Ok(parent.to_path_buf());
        }
    }
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

/// 可执行文件旁目录；仅当可写探测通过时视为「便携根」。
fn portable_data_root(app: &tauri::AppHandle) -> Option<PathBuf> {
    let app_dir = executable_parent_dir(app).ok()?;
    if app_dir_data_usable(&app_dir) {
        Some(app_dir)
    } else {
        None
    }
}

fn data_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(p) = portable_data_root(app) {
        Ok(p)
    } else {
        app_local_data_root(app)
    }
}

/// 当前用户数据根目录（便携目录或 `app_local_data_dir`）。仅 Windows 应用内更新使用。
#[cfg(target_os = "windows")]
pub fn app_data_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    data_root(app)
}

fn settings_file_has_keys(path: &Path) -> Result<bool, String> {
    if !path.is_file() {
        return Ok(false);
    }
    let s = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let t = s.trim();
    if t.is_empty() {
        return Ok(false);
    }
    let Ok(v) = serde_json::from_str::<Value>(t) else {
        return Ok(false);
    };
    Ok(match v {
        Value::Object(map) => !map.is_empty(),
        _ => false,
    })
}

fn atomic_write_file(path: &Path, contents: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, contents).map_err(|e| e.to_string())?;
    #[cfg(windows)]
    {
        let _ = fs::remove_file(path);
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

/// 若当前 `settings.json` 尚无有效内容，则从旧版路径复制一次。
fn migrate_settings_if_needed(app: &tauri::AppHandle) -> Result<(), String> {
    let dest = app_settings_path(app)?;
    if settings_file_has_keys(&dest)? {
        return Ok(());
    }

    let root = data_root(app)?;
    let local = match app_local_data_root(app) {
        Ok(p) => p,
        Err(_) => root.clone(),
    };

    let mut candidates: Vec<PathBuf> = Vec::new();

    // 同 data_root 下的旧布局
    candidates.push(
        root.join(LEGACY_CONFIG_SUBDIR)
            .join(LEGACY_APP_SETTINGS_FILE),
    );

    // 当前在系统目录运行，但 exe 旁曾有便携配置
    if let Some(exe_root) = portable_data_root(app) {
        if exe_root != root {
            candidates.push(
                exe_root
                    .join(LEGACY_CONFIG_SUBDIR)
                    .join(LEGACY_APP_SETTINGS_FILE),
            );
        }
    }

    // 曾写入 app_local 的 `configs/app-settings.json` 或 `settings.json`
    if local != root {
        candidates.push(
            local
                .join(LEGACY_CONFIG_SUBDIR)
                .join(LEGACY_APP_SETTINGS_FILE),
        );
        candidates.push(local.join(SETTINGS_FILE));
    }

    for src in candidates {
        if !src.is_file() || src == dest {
            continue;
        }
        if !settings_file_has_keys(&src)? {
            continue;
        }
        let content = fs::read_to_string(&src).map_err(|e| e.to_string())?;
        let trimmed = content.trim();
        if serde_json::from_str::<Value>(trimmed).is_err() {
            continue;
        }
        atomic_write_file(&dest, trimmed)?;
        break;
    }

    Ok(())
}

fn log_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_root(app)?.join(LOG_SUBDIR))
}

/// 归档文件名：`app-YYYYMMDD_HHMMSS_mmm.log`（本地时间 + 毫秒）。
fn new_timestamped_archive_path(dir: &Path) -> PathBuf {
    let now = Local::now();
    dir.join(format!(
        "app-{}_{:03}.log",
        now.format("%Y%m%d_%H%M%S"),
        now.timestamp_subsec_millis()
    ))
}

fn unique_timestamped_archive_path(dir: &Path) -> Result<PathBuf, String> {
    let mut path = new_timestamped_archive_path(dir);
    let mut n = 0u32;
    while path.exists() {
        n += 1;
        if n > 999 {
            return Err("failed to allocate unique log archive name".to_string());
        }
        let now = Local::now();
        path = dir.join(format!(
            "app-{}_{:03}_{}.log",
            now.format("%Y%m%d_%H%M%S"),
            now.timestamp_subsec_millis(),
            n
        ));
    }
    Ok(path)
}

fn is_log_archive_candidate(file_name: &str) -> bool {
    if file_name == "app.log.prev" {
        return true;
    }
    file_name.starts_with("app-") && file_name.ends_with(".log") && file_name != APP_LOG_FILE
}

/// 保留修改时间最新的 `APP_LOG_ARCHIVE_MAX` 个归档，删除更旧的。
fn prune_log_archives(dir: &Path) -> Result<(), String> {
    let mut entries: Vec<(PathBuf, SystemTime)> = Vec::new();
    let rd = match fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return Ok(()),
    };
    for ent in rd {
        let ent = ent.map_err(|e| e.to_string())?;
        let name = ent.file_name().to_string_lossy().into_owned();
        if !is_log_archive_candidate(&name) {
            continue;
        }
        let mt = ent
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .unwrap_or(SystemTime::UNIX_EPOCH);
        entries.push((ent.path(), mt));
    }
    entries.sort_by_key(|(_, mt)| {
        std::cmp::Reverse(
            mt.duration_since(SystemTime::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos(),
        )
    });
    for (path, _) in entries.into_iter().skip(APP_LOG_ARCHIVE_MAX) {
        let _ = fs::remove_file(path);
    }
    Ok(())
}

/// 将当前 `app.log` 移出为时间戳归档（若存在且非空）；空文件则删除。
fn archive_current_app_log_if_present(dir: &Path) -> Result<(), String> {
    let path = dir.join(APP_LOG_FILE);
    if !path.is_file() {
        return Ok(());
    }
    let len = fs::metadata(&path).map_err(|e| e.to_string())?.len();
    if len == 0 {
        let _ = fs::remove_file(&path);
        return Ok(());
    }
    let dest = unique_timestamped_archive_path(dir)?;
    fs::rename(&path, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

fn app_settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_root(app)?.join(SETTINGS_FILE))
}

#[tauri::command]
pub fn user_data_init_defaults(app: tauri::AppHandle) -> Result<(), String> {
    let root = data_root(&app)?;
    fs::create_dir_all(root.join(LOG_SUBDIR)).map_err(|e| e.to_string())?;
    let log = log_dir(&app)?;
    archive_current_app_log_if_present(&log)?;
    prune_log_archives(&log)?;
    migrate_settings_if_needed(&app)?;
    // 确保启动后磁盘上即存在 `settings.json`（前端尚未 hydrate 时也能看到文件）
    let settings_path = app_settings_path(&app)?;
    if !settings_path.is_file() {
        atomic_write_file(&settings_path, "{}")?;
    }
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

/// 读取 `settings.json`；不存在或空文件返回 `"{}"`；非法 JSON 返回 Err。
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
    serde_json::from_str::<Value>(t).map_err(|e| format!("invalid settings JSON: {e}"))?;
    Ok(t.to_string())
}

/// 原子写入 `settings.json`（先写临时文件再 rename）。
#[tauri::command]
pub fn user_data_write_app_settings(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let trimmed = json.trim();
    serde_json::from_str::<Value>(trimmed)
        .map_err(|e| format!("refuse to write invalid settings JSON: {e}"))?;
    let path = app_settings_path(&app)?;
    atomic_write_file(&path, trimmed)?;
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
                archive_current_app_log_if_present(&dir)?;
                prune_log_archives(&dir)?;
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
