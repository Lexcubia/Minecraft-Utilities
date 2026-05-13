// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[cfg(desktop)]
mod fs_list;
#[cfg(desktop)]
mod python_cli;
#[cfg(desktop)]
mod tray_desktop;
#[cfg(desktop)]
mod user_data;
#[cfg(desktop)]
mod windows_release_update;

/// 与前端 `REPO_URL`（`src/constants/app-meta.ts`）保持一致。
const GITHUB_OWNER: &str = "Lexcubia";
const GITHUB_REPO: &str = "Minecraft-Utilities";

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 列出存档 `playerdata` 中的玩家 UUID；名称由 `usercache.json` 映射（调用 Python CLI）。
#[cfg(desktop)]
#[tauri::command]
fn world_uuid_list_players(world_dir: String, usercache_path: Option<String>) -> Result<String, String> {
    let mut args: Vec<String> = vec!["world-players".into(), world_dir];
    if let Some(uc) = usercache_path {
        let u = uc.trim();
        if !u.is_empty() {
            args.push("--usercache".into());
            args.push(u.to_string());
        }
    }
    let refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    python_cli::run_python_cli(&refs)
}

/// 列出目录下一层子文件夹名（已排序）。
#[cfg(desktop)]
#[tauri::command]
fn list_subdirs(parent_path: String) -> Result<Vec<String>, String> {
    fs_list::list_subdirs(&parent_path)
}

/// 列出服务端根目录下含 `level.dat` 的存档文件夹名。
#[cfg(desktop)]
#[tauri::command]
fn list_server_world_dirs(server_root: String) -> Result<Vec<String>, String> {
    fs_list::list_server_world_dirs(&server_root)
}

/// 路径是否为已有文件（用于检查 `usercache.json` 是否存在）。
#[cfg(desktop)]
#[tauri::command]
fn path_is_file(path: String) -> bool {
    std::path::PathBuf::from(path).is_file()
}

/// 按 JSON 映射批量执行 UUID 迁移（调用 Python CLI）。
#[cfg(desktop)]
#[tauri::command]
fn world_uuid_migrate_batch(world_dir: String, pairs_json: String, dry_run: bool) -> Result<String, String> {
    let dir = std::env::temp_dir();
    let fname = format!(
        "mu-uuid-pairs-{}-{}.json",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    );
    let path = dir.join(fname);
    std::fs::write(&path, pairs_json).map_err(|e| e.to_string())?;
    let path_s = path.to_string_lossy();
    let result = if dry_run {
        python_cli::run_python_cli(&[
            "uuid-migrate-batch",
            &world_dir,
            "--pairs-file",
            path_s.as_ref(),
            "--dry-run",
        ])
    } else {
        python_cli::run_python_cli(&["uuid-migrate-batch", &world_dir, "--pairs-file", path_s.as_ref()])
    };
    let _ = std::fs::remove_file(&path);
    result
}

/// 拉取仓库的 GitHub Releases JSON（公开 API，无需 token）。
#[tauri::command]
fn fetch_github_releases() -> Result<String, String> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/releases?per_page=40",
        GITHUB_OWNER, GITHUB_REPO
    );
    let client = reqwest::blocking::Client::builder()
        .user_agent(concat!(
            env!("CARGO_PKG_NAME"),
            "/",
            env!("CARGO_PKG_VERSION"),
            " (github-releases)"
        ))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&url).send().map_err(|e| e.to_string())?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("GitHub API HTTP {}", status));
    }
    response.text().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(desktop)]
    {
        builder = builder
            .invoke_handler(tauri::generate_handler![
                greet,
                fetch_github_releases,
                world_uuid_list_players,
                world_uuid_migrate_batch,
                list_subdirs,
                list_server_world_dirs,
                path_is_file,
                user_data::user_data_init_defaults,
                user_data::user_data_get_paths,
                user_data::user_data_append_log_line,
                windows_release_update::check_windows_release_update,
                windows_release_update::run_windows_release_update_setup,
                tray_desktop::exit_app,
                tray_desktop::sync_tray_menu_labels,
            ])
            .setup(|app| {
                tray_desktop::create_tray(app.handle())?;
                Ok(())
            });
    }

    #[cfg(not(desktop))]
    {
        builder = builder.invoke_handler(tauri::generate_handler![greet, fetch_github_releases]);
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
