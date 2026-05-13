//! 调用本仓库 Python CLI（`python -m modpack_updater.cli`），供 UUID 迁移等工具使用。
//!
//! - `MINECRAFT_UTILITIES_PYTHON`：Python 可执行文件路径（可选）。
//! - `MINECRAFT_UTILITIES_PYTHONPATH`：应包含 `modpack_updater` 包的目录（可选）。
//! - 若未设置 `PYTHONPATH` 且存在 `../python/modpack_updater`（相对 `src-tauri`），开发构建会自动注入。

use std::path::{Path, PathBuf};
use std::process::Command;

fn python_executable() -> String {
    std::env::var("MINECRAFT_UTILITIES_PYTHON").unwrap_or_else(|_| {
        if cfg!(target_os = "windows") {
            "python".into()
        } else {
            "python3".into()
        }
    })
}

fn pythonpath_for_dev() -> Option<PathBuf> {
    if std::env::var_os("MINECRAFT_UTILITIES_PYTHONPATH").is_some() {
        return None;
    }
    let dev = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("python")
        .join("modpack_updater");
    if dev.is_dir() {
        dev.parent().map(Path::to_path_buf)
    } else {
        None
    }
}

pub fn run_python_cli(args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new(python_executable());
    if let Ok(pp) = std::env::var("MINECRAFT_UTILITIES_PYTHONPATH") {
        cmd.env("PYTHONPATH", pp);
    } else if let Some(root) = pythonpath_for_dev() {
        cmd.env("PYTHONPATH", root);
    }
    // Windows 下控制台默认编码常导致中文写入 stdout 后被 Rust 按 UTF-8 解码乱码；强制 Python 使用 UTF-8。
    cmd.env("PYTHONUTF8", "1");
    cmd.env("PYTHONIOENCODING", "utf-8");
    cmd.arg("-u").arg("-m").arg("modpack_updater.cli");
    for a in args {
        cmd.arg(a);
    }
    let out = cmd.output().map_err(|e| {
        format!(
            "无法启动 Python（{e}）。请安装 Python 3.11+ 并加入 PATH，或设置环境变量 \
             MINECRAFT_UTILITIES_PYTHON / MINECRAFT_UTILITIES_PYTHONPATH。"
        )
    })?;
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
    if !out.status.success() {
        return Err(format!(
            "Python 退出码 {:?}。\n--- stderr ---\n{stderr}\n--- stdout ---\n{stdout}",
            out.status.code()
        ));
    }
    Ok(if stdout.is_empty() { stderr } else { stdout })
}
