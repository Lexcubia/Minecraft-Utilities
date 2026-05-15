//! GitHub Releases API 共用：代理、按渠道解析可升级版本。

use serde::Deserialize;
use serde_json::Value;
use std::time::Duration;

pub const GITHUB_OWNER: &str = "Lexcubia";
pub const GITHUB_REPO: &str = "Minecraft-Utilities";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNetworkOptions {
    /// `stable` | `beta`
    #[serde(default = "default_channel")]
    pub update_channel: String,
    /// 如 `http://127.0.0.1:7890`；空则不用代理
    #[serde(default)]
    pub update_proxy: String,
}

fn default_channel() -> String {
    "stable".to_string()
}

impl UpdateNetworkOptions {
    pub fn parse_json(raw: Option<&str>) -> Self {
        let Some(s) = raw.map(str::trim).filter(|t| !t.is_empty()) else {
            return Self {
                update_channel: default_channel(),
                update_proxy: String::new(),
            };
        };
        serde_json::from_str(s).unwrap_or_else(|_| Self {
            update_channel: default_channel(),
            update_proxy: String::new(),
        })
    }

    pub fn proxy_url(&self) -> Option<&str> {
        let t = self.update_proxy.trim();
        if t.is_empty() {
            None
        } else {
            Some(t)
        }
    }

    pub fn is_beta_channel(&self) -> bool {
        self.update_channel.eq_ignore_ascii_case("beta")
    }
}

pub fn github_user_agent(suffix: &str) -> String {
    format!(
        "{}/{} ({})",
        env!("CARGO_PKG_NAME"),
        env!("CARGO_PKG_VERSION"),
        suffix
    )
}

pub fn build_github_client(proxy_url: Option<&str>, user_agent_suffix: &str) -> Result<reqwest::blocking::Client, String> {
    let mut builder = reqwest::blocking::Client::builder()
        .user_agent(github_user_agent(user_agent_suffix))
        .timeout(Duration::from_secs(90))
        .connect_timeout(Duration::from_secs(25));
    if let Some(url) = proxy_url {
        let proxy = reqwest::Proxy::all(url).map_err(|e| format!("Invalid proxy URL: {e}"))?;
        builder = builder.proxy(proxy);
    }
    builder.build().map_err(|e| e.to_string())
}

pub fn fetch_releases_json(client: &reqwest::blocking::Client) -> Result<Vec<Value>, String> {
    let api = format!(
        "https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases?per_page=40"
    );
    let response = client
        .get(&api)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .map_err(|e| format!("GitHub API request failed ({api}): {e}"))?;
    if !response.status().is_success() {
        return Err(format!("GitHub API HTTP {}", response.status()));
    }
    let body: Value = response.json().map_err(|e| e.to_string())?;
    body.as_array()
        .cloned()
        .ok_or_else(|| "Invalid releases response: expected array".to_string())
}

fn tag_to_version(tag_name: &str) -> Result<semver::Version, String> {
    let body = tag_name
        .strip_prefix('v')
        .or_else(|| tag_name.strip_prefix('V'))
        .unwrap_or(tag_name);
    semver::Version::parse(body).map_err(|e| format!("Invalid release tag {tag_name:?}: {e}"))
}

/// 在候选 Release 中选出 semver 最大且大于 `current` 的一条（已按渠道过滤 draft/prerelease）。
pub fn pick_newest_release(
    releases: &[Value],
    beta_channel: bool,
    current: &semver::Version,
) -> Option<Value> {
    let mut best: Option<(semver::Version, Value)> = None;
    for rel in releases {
        if rel.get("draft").and_then(|v| v.as_bool()).unwrap_or(false) {
            continue;
        }
        if !beta_channel && rel.get("prerelease").and_then(|v| v.as_bool()).unwrap_or(false) {
            continue;
        }
        let tag = rel
            .get("tag_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let ver = match tag_to_version(tag) {
            Ok(v) => v,
            Err(_) => continue,
        };
        if ver <= *current {
            continue;
        }
        match &best {
            Some((b, _)) if ver <= *b => {}
            _ => best = Some((ver, rel.clone())),
        }
    }
    best.map(|(_, v)| v)
}

pub fn releases_page_url() -> String {
    format!("https://github.com/{GITHUB_OWNER}/{GITHUB_REPO}/releases")
}
