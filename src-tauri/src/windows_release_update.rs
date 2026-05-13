//! Windows：从 GitHub `releases/latest` 查找与本机构建架构一致的免安装 zip，下载后解压到临时目录并打开资源管理器。
//! 其他桌面系统：`check_windows_release_update` 返回 `supported: false`，不发起网络请求。

use serde::Serialize;
#[cfg(target_os = "windows")]
use serde_json::Value;
#[cfg(target_os = "windows")]
use std::process::Stdio;
#[cfg(target_os = "windows")]
use std::time::Duration;

const OWNER: &str = "Lexcubia";
const REPO: &str = "Minecraft-Utilities";
#[cfg(target_os = "windows")]
const DIST_BASE: &str = "minecraft-utilities";

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
pub fn run_windows_release_update_setup() -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        Err("Automatic update is only supported on Windows.".into())
    }
    #[cfg(target_os = "windows")]
    run_windows_release_update_setup_inner()
}

#[cfg(target_os = "windows")]
fn ps_single_quoted_path(p: &std::path::Path) -> String {
    p.to_string_lossy().replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn run_windows_release_update_setup_inner() -> Result<(), String> {
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

    let client = github_http_client()?;
    let response = client
        .get(&url)
        .send()
        .map_err(|e| format!("Release zip download failed: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Zip download HTTP {}", response.status()));
    }
    let bytes = response.bytes().map_err(|e| e.to_string())?;

    let temp_zip = std::env::temp_dir().join("minecraft-utilities-update.zip");
    std::fs::write(&temp_zip, &bytes).map_err(|e| e.to_string())?;

    let extract_root = std::env::temp_dir().join("minecraft-utilities-update");
    let _ = std::fs::remove_dir_all(&extract_root);
    std::fs::create_dir_all(&extract_root).map_err(|e| e.to_string())?;

    let ps = format!(
        "$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
        ps_single_quoted_path(&temp_zip),
        ps_single_quoted_path(&extract_root)
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

    std::process::Command::new("explorer.exe")
        .arg(&extract_root)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}
