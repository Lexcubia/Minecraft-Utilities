//! 持久化数据优先从**应用目录**（可执行文件所在目录）下的 **`configs/`**、**`logs/`**、**`locales/`**、**`assets/`** 读写；其中 **`configs/settings.json`** 为主配置文件。
//! 若应用目录不可写（如安装到 `Program Files`），则回退到 **`app_local_data_dir()`** 下相同目录布局。
//! 安装包内由 `bundle.resources` 提供 `src/locales`、`src/log`、`src/config` 与 `src/user-data/assets` 的种子文件，首次启动复制到数据根（若缺失）。
//! 若曾使用旧布局（`user/`、根目录 `settings.json`、目录名 **`config`** / **`log`**）或数据仍在 **`app_local_data_dir`**，启动时会迁移 / 复制到当前数据根。

use serde::Serialize;
use std::fs;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

use tauri::path::BaseDirectory;
use tauri::Manager;

const CONFIG_SUBDIR: &str = "configs";
const SETTINGS_FILE: &str = "settings.json";
const LOG_SUBDIR: &str = "logs";
const APP_LOG_FILE: &str = "app.log";
const APP_LOG_MAX_BYTES: u64 = 4 * 1024 * 1024;

fn legacy_app_data_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_local_data_dir().map_err(|e| e.to_string())
}

/// 可执行文件所在目录（便携 / 解压即用的「应用目录」）。
fn application_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().executable_dir().map_err(|e| e.to_string())
}

/// 在 `dir/configs` 下探测是否可写；可写则使用应用目录承载持久化数据。
fn app_dir_data_usable(app_dir: &Path) -> bool {
    let cfg = app_dir.join(CONFIG_SUBDIR);
    if fs::create_dir_all(&cfg).is_err() {
        return false;
    }
    let probe = cfg.join(".mu-write-probe");
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

fn config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_root(app)?.join(CONFIG_SUBDIR))
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join(SETTINGS_FILE))
}

fn log_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_root(app)?.join(LOG_SUBDIR))
}

/// 将旧版 `…/user/*` 提升到该 `base` 根下。
fn migrate_from_user_subdir(base: &Path) -> Result<(), String> {
    let wrapped = base.join("user");
    if !wrapped.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(&wrapped).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name();
        let dest = base.join(&name);
        if dest.exists() {
            continue;
        }
        fs::rename(entry.path(), &dest).map_err(|e| e.to_string())?;
    }
    if fs::read_dir(&wrapped).map_err(|e| e.to_string())?.next().is_none() {
        let _ = fs::remove_dir(&wrapped);
    }
    Ok(())
}

/// 根目录散落的 `settings.json` → `configs/settings.json`。
fn migrate_legacy_user_layout(root: &Path) -> Result<(), String> {
    let new_settings = root.join(CONFIG_SUBDIR).join(SETTINGS_FILE);
    let old_settings = root.join(SETTINGS_FILE);
    if !new_settings.exists() && old_settings.is_file() {
        let parent = new_settings
            .parent()
            .ok_or_else(|| "settings path has no parent directory".to_string())?;
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        fs::rename(&old_settings, &new_settings).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// `config/` → `configs/`、`log/` → `logs/`（目标已存在则跳过）。
fn migrate_data_subdir_names(root: &Path) -> Result<(), String> {
    let old_cfg = root.join("config");
    let new_cfg = root.join(CONFIG_SUBDIR);
    if !new_cfg.exists() && old_cfg.is_dir() {
        fs::rename(&old_cfg, &new_cfg).map_err(|e| e.to_string())?;
    }

    let old_log = root.join("log");
    let new_logs = root.join(LOG_SUBDIR);
    if !new_logs.exists() && old_log.is_dir() {
        fs::rename(&old_log, &new_logs).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// 将 `src` 下文件/目录合并复制到 `dst`：已存在的文件不覆盖。
fn copy_tree_merge_skip_existing(src: &Path, dst: &Path) -> Result<(), String> {
    if !src.exists() {
        return Ok(());
    }
    if src.is_file() {
        if dst.exists() {
            return Ok(());
        }
        if let Some(p) = dst.parent() {
            fs::create_dir_all(p).map_err(|e| e.to_string())?;
        }
        fs::copy(src, dst).map_err(|e| e.to_string())?;
        return Ok(());
    }
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        copy_tree_merge_skip_existing(&entry.path(), &dst.join(entry.file_name()))?;
    }
    Ok(())
}

/// 当数据根在应用目录且尚无 `configs/settings.json` 时，从旧版 `app_local_data_dir` 复制已有数据。
fn try_copy_legacy_app_data_into_primary(primary: &Path, legacy: &Path) -> Result<(), String> {
    if primary.as_path() == legacy.as_path() {
        return Ok(());
    }
    if primary.join(CONFIG_SUBDIR).join(SETTINGS_FILE).is_file() {
        return Ok(());
    }
    let legacy_configs = legacy.join(CONFIG_SUBDIR).join(&SETTINGS_FILE);
    let legacy_config_old = legacy.join("config").join(&SETTINGS_FILE);
    if legacy_configs.is_file() {
        copy_tree_merge_skip_existing(&legacy.join(CONFIG_SUBDIR), &primary.join(CONFIG_SUBDIR))?;
    } else if legacy_config_old.is_file() {
        copy_tree_merge_skip_existing(&legacy.join("config"), &primary.join(CONFIG_SUBDIR))?;
    }
    for sub in ["locales", "assets", LOG_SUBDIR] {
        let s = legacy.join(sub);
        let d = primary.join(sub);
        if s.exists() && !d.exists() {
            copy_tree_merge_skip_existing(&s, &d)?;
        }
    }
    let legacy_log_old = legacy.join("log");
    let dlog = primary.join(LOG_SUBDIR);
    if legacy_log_old.is_dir() && !dlog.exists() {
        if fs::rename(&legacy_log_old, &dlog).is_err() {
            copy_tree_merge_skip_existing(&legacy_log_old, &dlog)?;
        }
    }
    Ok(())
}

fn copy_if_missing(src: &Path, dest: &Path) -> Result<(), String> {
    if dest.exists() {
        return Ok(());
    }
    if let Some(p) = dest.parent() {
        fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }
    fs::copy(src, dest).map_err(|e| e.to_string())?;
    Ok(())
}

fn seed_from_template(app: &tauri::AppHandle, rel: &str, dest_under_root: &Path) -> Result<(), String> {
    let resolved = app
        .path()
        .resolve(rel, BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    if !resolved.is_file() {
        return Ok(());
    }
    let dest = data_root(app)?.join(dest_under_root);
    copy_if_missing(&resolved, &dest)
}

#[tauri::command]
pub fn user_data_init_defaults(app: tauri::AppHandle) -> Result<(), String> {
    let legacy = legacy_app_data_root(&app)?;
    let primary = data_root(&app)?;

    if primary.as_path() != legacy.as_path() {
        migrate_from_user_subdir(&legacy)?;
        migrate_legacy_user_layout(&legacy)?;
        migrate_data_subdir_names(&legacy)?;
        try_copy_legacy_app_data_into_primary(&primary, &legacy)?;
    }

    migrate_from_user_subdir(&primary)?;
    migrate_legacy_user_layout(&primary)?;
    migrate_data_subdir_names(&primary)?;

    fs::create_dir_all(primary.join("locales")).map_err(|e| e.to_string())?;
    fs::create_dir_all(primary.join("assets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(primary.join(CONFIG_SUBDIR)).map_err(|e| e.to_string())?;
    fs::create_dir_all(primary.join(LOG_SUBDIR)).map_err(|e| e.to_string())?;

    seed_from_template(&app, "locales/en.json", Path::new("locales/en.json"))?;
    seed_from_template(&app, "locales/zh-CN.json", Path::new("locales/zh-CN.json"))?;
    seed_from_template(&app, "assets/README.txt", Path::new("assets/README.txt"))?;
    seed_from_template(&app, "logs/README.txt", Path::new("logs/README.txt"))?;
    seed_from_template(&app, "configs/README.txt", Path::new("configs/README.txt"))?;
    seed_from_template(&app, "configs/settings.json", Path::new("configs/settings.json"))?;

    let sp = settings_path(&app)?;
    if !sp.exists() {
        fs::write(&sp, "{}\n").map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDataPaths {
    pub data_root: String,
    pub locales_dir: String,
    pub assets_dir: String,
    pub config_dir: String,
    pub log_dir: String,
    pub app_log_path: String,
    pub settings_path: String,
}

#[tauri::command]
pub fn user_data_get_paths(app: tauri::AppHandle) -> Result<String, String> {
    let root = data_root(&app)?;
    let log = log_dir(&app)?;
    let cfg = config_dir(&app)?;
    let paths = UserDataPaths {
        data_root: root.to_string_lossy().into_owned(),
        locales_dir: root.join("locales").to_string_lossy().into_owned(),
        assets_dir: root.join("assets").to_string_lossy().into_owned(),
        config_dir: cfg.to_string_lossy().into_owned(),
        log_dir: log.to_string_lossy().into_owned(),
        app_log_path: log.join(APP_LOG_FILE).to_string_lossy().into_owned(),
        settings_path: settings_path(&app)?.to_string_lossy().into_owned(),
    };
    serde_json::to_string(&paths).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn user_data_read_settings(app: tauri::AppHandle) -> Result<String, String> {
    let p = settings_path(&app)?;
    if !p.exists() {
        return Ok("{}".into());
    }
    fs::read_to_string(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn user_data_write_settings(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let p = settings_path(&app)?;
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = p
        .parent()
        .ok_or_else(|| "settings path has no parent directory".to_string())?
        .join(".settings-write.tmp");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(json.as_bytes()).map_err(|e| e.to_string())?;
        f.sync_all().map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &p).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn user_data_read_locale(app: tauri::AppHandle, id: String) -> Result<Option<String>, String> {
    let safe = id.replace(['/', '\\'], "");
    if safe.is_empty() {
        return Ok(None);
    }
    let p = data_root(&app)?.join("locales").join(format!("{safe}.json"));
    if !p.is_file() {
        return Ok(None);
    }
    fs::read_to_string(&p).map(Some).map_err(|e| e.to_string())
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
