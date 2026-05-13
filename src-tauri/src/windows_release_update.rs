//! Windows：从 GitHub `releases/latest` 查找 NSIS 安装包并可选下载后静默启动。
//! 其他桌面系统：`check_windows_release_update` 返回 `supported: false`，不发起网络请求。

use serde::Serialize;
use serde_json::Value;
use std::process::Stdio;

const OWNER: &str = "Lexcubia";
const REPO: &str = "Minecraft-Utilities";

fn github_user_agent() -> String {
    format!(
        concat!(
            env!("CARGO_PKG_NAME"),
            "/",
            env!("CARGO_PKG_VERSION"),
            " (windows-release-update)"
        )
    )
}

fn releases_page_url() -> String {
    format!("https://github.com/{OWNER}/{REPO}/releases")
}

#[derive(Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsReleaseCheck {
    pub supported: bool,
    pub error: Option<String>,
    pub has_update: Option<bool>,
    pub latest_version: Option<String>,
    pub tag_name: Option<String>,
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
        return serde_json::to_string(&r).map_err(|e| e.to_string());
    }
    #[cfg(target_os = "windows")]
    check_windows_release_update_inner()
}

#[cfg(target_os = "windows")]
fn check_windows_release_update_inner() -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(github_user_agent())
        .build()
        .map_err(|e| e.to_string())?;
    let api = format!("https://api.github.com/repos/{OWNER}/{REPO}/releases/latest");
    let response = client.get(&api).send().map_err(|e| e.to_string())?;
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

    let mut setup_url: Option<String> = None;
    let mut setup_name: Option<String> = None;
    for a in &assets {
        let name = a.get("name").and_then(|n| n.as_str()).unwrap_or("");
        if name.ends_with("_x64-setup.exe") && name.contains("Minecraft-Utilities") {
            if let Some(u) = a.get("browser_download_url").and_then(|u| u.as_str()) {
                setup_url = Some(u.to_string());
                setup_name = Some(name.to_string());
                break;
            }
        }
    }
    if setup_url.is_none() {
        for a in &assets {
            let name = a.get("name").and_then(|n| n.as_str()).unwrap_or("");
            if name.ends_with("-setup.exe") && !name.contains(".sig") {
                if let Some(u) = a.get("browser_download_url").and_then(|u| u.as_str()) {
                    setup_url = Some(u.to_string());
                    setup_name = Some(name.to_string());
                    break;
                }
            }
        }
    }

    let newer = latest_ver > current;
    let has_update = newer && setup_url.is_some();
    let r = WindowsReleaseCheck {
        supported: true,
        error: if newer && setup_url.is_none() {
            Some(
                "Latest GitHub release has no Windows NSIS installer (*_x64-setup.exe or *-setup.exe)."
                    .into(),
            )
        } else {
            None
        },
        has_update: Some(has_update),
        latest_version: Some(latest_ver.to_string()),
        tag_name: Some(tag_name),
        setup_download_url: setup_url,
        setup_file_name: setup_name,
        releases_page_url: releases_page_url(),
    };
    serde_json::to_string(&r).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn run_windows_release_update_setup() -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Automatic update is only supported on Windows.".into());
    }
    #[cfg(target_os = "windows")]
    run_windows_release_update_setup_inner()
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
        .ok_or_else(|| "Release has no setup download URL.".to_string())?;

    let client = reqwest::blocking::Client::builder()
        .user_agent(github_user_agent())
        .build()
        .map_err(|e| e.to_string())?;
    let response = client.get(&url).send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Installer download HTTP {}", response.status()));
    }
    let bytes = response.bytes().map_err(|e| e.to_string())?;

    let temp = std::env::temp_dir().join("Minecraft-Utilities-update-x64-setup.exe");
    std::fs::write(&temp, &bytes).map_err(|e| e.to_string())?;

    // NSIS：/S 静默；若需当前用户安装可再加 /CURRENTUSER（依安装包脚本而定）
    std::process::Command::new(&temp)
        .arg("/S")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| {
            let _ = std::fs::remove_file(&temp);
            e.to_string()
        })?;

    Ok(())
}
