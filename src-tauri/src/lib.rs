// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[cfg(desktop)]
mod tray_desktop;

/// 与前端 `REPO_URL`（`src/constants/app-meta.ts`）保持一致。
const GITHUB_OWNER: &str = "Lexcubia";
const GITHUB_REPO: &str = "Minecraft-Utilities";

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
