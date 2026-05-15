//! Windows：从 GitHub `releases/latest` 查找与本机构建架构一致的免安装 zip，下载后解压并替换当前安装目录，再重启。
//! 其他桌面系统：`check_windows_release_update` 返回 `supported: false`，不发起网络请求。

use serde::Serialize;
#[cfg(target_os = "windows")]
use serde_json::Value;
#[cfg(target_os = "windows")]
use std::io::{Read, Write};
#[cfg(target_os = "windows")]
use std::process::Stdio;
#[cfg(target_os = "windows")]
use std::time::Duration;
#[cfg(target_os = "windows")]
use tauri::{AppHandle, Emitter};

const OWNER: &str = "Lexcubia";
const REPO: &str = "Minecraft-Utilities";
#[cfg(target_os = "windows")]
const DIST_BASE: &str = "minecraft-utilities";

/// 前端监听：`listen('windows-release-update-progress', …)`
pub const PROGRESS_EVENT: &str = "windows-release-update-progress";

#[cfg(target_os = "windows")]
const UPDATE_SUCCESS_MARKER: &str = ".mu-update-success.json";

#[cfg(target_os = "windows")]
fn github_user_agent() -> String {
    concat!(
        env!("CARGO_PKG_NAME"),
        "/",
        env!("CARGO_PKG_VERSION"),
        " (windows-release-update)"
    )
    .to_string()
}

#[cfg(target_os = "windows")]
fn github_http_client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .user_agent(github_user_agent())
        .timeout(Duration::from_secs(90))
        .connect_timeout(Duration::from_secs(25))
        .build()
        .map_err(|e| e.to_string())
}

fn releases_page_url() -> String {
    format!("https://github.com/{OWNER}/{REPO}/releases")
}

#[cfg(target_os = "windows")]
fn win_dist_cpu_suffix() -> Result<&'static str, String> {
    match std::env::consts::ARCH {
        "x86_64" => Ok("x86_64"),
        "aarch64" => Ok("aarch64"),
        other => Err(format!(
            "In-app update zip is only supported on x86_64 or aarch64 Windows (current ARCH={other})."
        )),
    }
}

#[cfg(target_os = "windows")]
fn expected_portable_zip_name(tag_body: &str) -> Result<String, String> {
    let cpu = win_dist_cpu_suffix()?;
    Ok(format!("{DIST_BASE}-win-{cpu}-v{tag_body}.zip"))
}

#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsReleaseCheck {
    pub supported: bool,
    pub error: Option<String>,
    pub has_update: Option<bool>,
    pub latest_version: Option<String>,
    pub tag_name: Option<String>,
    /// 免安装 zip 的浏览器下载地址（字段名沿用前端 JSON 约定）
    pub setup_download_url: Option<String>,
    pub setup_file_name: Option<String>,
    pub releases_page_url: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateProgressPayload {
    phase: &'static str,
    downloaded: u64,
    total: Option<u64>,
    /// 0–100，保留两位小数；无 `Content-Length` 时为 `None`
    percent: Option<f64>,
}

#[tauri::command]
pub fn check_windows_release_update() -> Result<String, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let r = WindowsReleaseCheck {
            supported: false,
            error: None,
            has_update: None,
            latest_version: None,
            tag_name: None,
            setup_download_url: None,
            setup_file_name: None,
            releases_page_url: releases_page_url(),
        };
        serde_json::to_string(&r).map_err(|e| e.to_string())
    }
    #[cfg(target_os = "windows")]
    check_windows_release_update_inner()
}

#[cfg(target_os = "windows")]
fn check_windows_release_update_inner() -> Result<String, String> {
    let win_arch = match win_dist_cpu_suffix() {
        Ok(s) => s,
        Err(msg) => {
            let r = WindowsReleaseCheck {
                supported: true,
                error: Some(msg),
                has_update: None,
                latest_version: None,
                tag_name: None,
                setup_download_url: None,
                setup_file_name: None,
                releases_page_url: releases_page_url(),
            };
            return serde_json::to_string(&r).map_err(|e| e.to_string());
        }
    };

    let client = github_http_client()?;
    let api = format!("https://api.github.com/repos/{OWNER}/{REPO}/releases/latest");
    let response = client
        .get(&api)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .map_err(|e| format!("GitHub API request failed ({api}): {e}"))?;
    if !response.status().is_success() {
        let r = WindowsReleaseCheck {
            supported: true,
            error: Some(format!("GitHub API HTTP {}", response.status())),
            has_update: None,
            latest_version: None,
            tag_name: None,
            setup_download_url: None,
            setup_file_name: None,
            releases_page_url: releases_page_url(),
        };
        return serde_json::to_string(&r).map_err(|e| e.to_string());
    }
    let body: Value = response.json().map_err(|e| e.to_string())?;
    let tag_name = body
        .get("tag_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let tag_body = tag_name
        .strip_prefix('v')
        .or_else(|| tag_name.strip_prefix('V'))
        .unwrap_or(tag_name.as_str());
    let latest_ver = match semver::Version::parse(tag_body) {
        Ok(v) => v,
        Err(e) => {
            let r = WindowsReleaseCheck {
                supported: true,
                error: Some(format!("Invalid release tag {tag_name:?}: {e}")),
                has_update: None,
                latest_version: None,
                tag_name: Some(tag_name),
                setup_download_url: None,
                setup_file_name: None,
                releases_page_url: releases_page_url(),
            };
            return serde_json::to_string(&r).map_err(|e| e.to_string());
        }
    };

    let current = semver::Version::parse(env!("CARGO_PKG_VERSION"))
        .map_err(|e| format!("Invalid CARGO_PKG_VERSION: {e}"))?;

    let assets = body
        .get("assets")
        .and_then(|a| a.as_array())
        .cloned()
        .unwrap_or_default();

    let mut zip_url: Option<String> = None;
    let mut zip_name: Option<String> = None;

    if let Ok(want) = expected_portable_zip_name(tag_body) {
        for a in &assets {
            let name = a.get("name").and_then(|n| n.as_str()).unwrap_or("");
            if name == want {
                if let Some(u) = a.get("browser_download_url").and_then(|u| u.as_str()) {
                    zip_url = Some(u.to_string());
                    zip_name = Some(name.to_string());
                    break;
                }
            }
        }
    }

    if zip_url.is_none() {
        let prefix = format!("{DIST_BASE}-win-{win_arch}-v");
        let expected_suffix = format!("v{tag_body}.zip");
        for a in &assets {
            let name = a.get("name").and_then(|n| n.as_str()).unwrap_or("");
            if name.starts_with(prefix.as_str()) && name.ends_with(expected_suffix.as_str()) {
                if let Some(u) = a.get("browser_download_url").and_then(|u| u.as_str()) {
                    zip_url = Some(u.to_string());
                    zip_name = Some(name.to_string());
                    break;
                }
            }
        }
    }

    let newer = latest_ver > current;
    let has_update = newer && zip_url.is_some();
    let r = WindowsReleaseCheck {
        supported: true,
        error: if newer && zip_url.is_none() {
            Some(format!(
                "Latest GitHub release has no Windows portable zip matching `{DIST_BASE}-win-{win_arch}-v{{version}}.zip`."
            ))
        } else {
            None
        },
        has_update: Some(has_update),
        latest_version: Some(latest_ver.to_string()),
        tag_name: Some(tag_name),
        setup_download_url: zip_url,
        setup_file_name: zip_name,
        releases_page_url: releases_page_url(),
    };
    serde_json::to_string(&r).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_windows_release_update_setup(app: AppHandle) -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("Automatic update is only supported on Windows.".into())
    }
    #[cfg(target_os = "windows")]
    run_windows_release_update_setup_inner(app)
}

/// 若上次更新后已重启，读取并清除成功标记，返回新版本号。
#[tauri::command]
pub fn take_post_update_success_notice(app: AppHandle) -> Result<Option<String>, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Ok(None)
    }
    #[cfg(target_os = "windows")]
    take_post_update_success_notice_inner(app)
}

#[cfg(target_os = "windows")]
fn take_post_update_success_notice_inner(app: AppHandle) -> Result<Option<String>, String> {
    let root = crate::user_data::app_data_root(&app)?;
    let path = root.join(UPDATE_SUCCESS_MARKER);
    if !path.is_file() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&path);
    let v: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    Ok(v.get("version")
        .and_then(|x| x.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty()))
}

#[cfg(target_os = "windows")]
fn ps_single_quoted(s: &str) -> String {
    s.replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn round_percent(downloaded: u64, total: u64) -> f64 {
    if total == 0 {
        return 0.0;
    }
    let p = (downloaded as f64 / total as f64) * 100.0;
    (p * 100.0).round() / 100.0
}

#[cfg(target_os = "windows")]
fn emit_progress(app: &AppHandle, phase: &'static str, downloaded: u64, total: Option<u64>) {
    let percent = total
        .filter(|t| *t > 0)
        .map(|t| round_percent(downloaded, t));
    let payload = UpdateProgressPayload {
        phase,
        downloaded,
        total,
        percent,
    };
    let _ = app.emit(PROGRESS_EVENT, payload);
}

#[cfg(target_os = "windows")]
fn download_zip_with_progress(
    app: &AppHandle,
    client: &reqwest::blocking::Client,
    url: &str,
    dest: &std::path::Path,
) -> Result<(), String> {
    let mut response = client
        .get(url)
        .send()
        .map_err(|e| format!("Release zip download failed: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Zip download HTTP {}", response.status()));
    }
    let total = response.content_length();
    emit_progress(app, "downloading", 0, total);

    let mut file = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = response.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        downloaded += n as u64;
        emit_progress(app, "downloading", downloaded, total);
    }
    if let Some(t) = total {
        if downloaded < t {
            return Err(format!(
                "Zip download incomplete ({downloaded} of {t} bytes)."
            ));
        }
        emit_progress(app, "downloading", t, Some(t));
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn write_update_success_marker(app: &AppHandle, version: &str) -> Result<(), String> {
    let root = crate::user_data::app_data_root(app)?;
    let path = root.join(UPDATE_SUCCESS_MARKER);
    let payload = serde_json::json!({ "version": version });
    std::fs::write(&path, payload.to_string()).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn install_dir_from_exe() -> Result<std::path::PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    exe.parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| "Cannot resolve install directory from current executable.".to_string())
}

#[cfg(target_os = "windows")]
fn spawn_apply_update_script(
    pid: u32,
    extract_root: &std::path::Path,
    install_dir: &std::path::Path,
    zip_path: &std::path::Path,
) -> Result<(), String> {
    let exe_name = format!("{DIST_BASE}.exe");
    let script_path = std::env::temp_dir().join("minecraft-utilities-apply-update.ps1");
    let ps = format!(
        r#"$ErrorActionPreference='Stop'
$pidToWait = {pid}
$src = '{src}'
$dest = '{dest}'
$exeName = '{exe_name}'
$zipPath = '{zip}'
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Process -Id $pidToWait -ErrorAction SilentlyContinue) -and ((Get-Date) -lt $deadline)) {{
  Start-Sleep -Milliseconds 200
}}
Get-ChildItem -LiteralPath $src -Force | ForEach-Object {{
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dest $_.Name) -Force
}}
Start-Process -FilePath (Join-Path $dest $exeName)
Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $src -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue
"#,
        pid = pid,
        src = ps_single_quoted(&extract_root.to_string_lossy()),
        dest = ps_single_quoted(&install_dir.to_string_lossy()),
        exe_name = ps_single_quoted(&exe_name),
        zip = ps_single_quoted(&zip_path.to_string_lossy()),
    );
    std::fs::write(&script_path, ps).map_err(|e| e.to_string())?;
    std::process::Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script_path.to_string_lossy(),
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn run_windows_release_update_setup_inner(app: AppHandle) -> Result<(), String> {
    let raw = check_windows_release_update_inner()?;
    let j: WindowsReleaseCheck = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    if !j.supported {
        return Err("Update check is not supported on this platform.".into());
    }
    if let Some(err) = j.error {
        return Err(err);
    }
    if !j.has_update.unwrap_or(false) {
        return Err("NO_UPDATE".into());
    }
    let url = j
        .setup_download_url
        .ok_or_else(|| "Release has no portable zip download URL.".to_string())?;
    let version = j
        .latest_version
        .clone()
        .unwrap_or_else(|| env!("CARGO_PKG_VERSION").to_string());

    let client = github_http_client()?;
    let temp_zip = std::env::temp_dir().join("minecraft-utilities-update.zip");
    let _ = std::fs::remove_file(&temp_zip);
    download_zip_with_progress(&app, &client, &url, &temp_zip)?;

    emit_progress(&app, "extracting", 0, None);

    let extract_root = std::env::temp_dir().join("minecraft-utilities-update");
    let _ = std::fs::remove_dir_all(&extract_root);
    std::fs::create_dir_all(&extract_root).map_err(|e| e.to_string())?;

    let ps = format!(
        "$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
        ps_single_quoted(&temp_zip.to_string_lossy()),
        ps_single_quoted(&extract_root.to_string_lossy())
    );
    let st = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps])
        .stdin(Stdio::null())
        .status()
        .map_err(|e| {
            let _ = std::fs::remove_file(&temp_zip);
            e.to_string()
        })?;
    if !st.success() {
        let _ = std::fs::remove_file(&temp_zip);
        let _ = std::fs::remove_dir_all(&extract_root);
        return Err("Failed to extract update zip (Expand-Archive).".into());
    }

    emit_progress(&app, "applying", 0, None);

    let install_dir = install_dir_from_exe()?;
    write_update_success_marker(&app, &version)?;
    let pid = std::process::id();
    spawn_apply_update_script(pid, &extract_root, &install_dir, &temp_zip)?;

    Ok(())
}
