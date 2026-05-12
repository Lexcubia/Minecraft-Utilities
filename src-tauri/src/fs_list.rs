//! 供前端枚举 `.minecraft/saves`、`versions`、服务端存档目录等（不引入 fs 插件）。

use std::fs;
use std::path::PathBuf;

/// 列出 `parent_path` 下的一层子目录名（已排序）。
pub fn list_subdirs(parent_path: &str) -> Result<Vec<String>, String> {
    let p = PathBuf::from(parent_path);
    if !p.is_dir() {
        return Err(format!("不是目录: {}", p.display()));
    }
    let mut out: Vec<String> = fs::read_dir(&p)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    out.sort();
    Ok(out)
}

/// 列出 `server_root` 下含 `level.dat` 的子目录名（已排序），用于选 `world` 等存档根。
pub fn list_server_world_dirs(server_root: &str) -> Result<Vec<String>, String> {
    let root = PathBuf::from(server_root);
    if !root.is_dir() {
        return Err(format!("不是目录: {}", root.display()));
    }
    let mut out: Vec<String> = Vec::new();
    for ent in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let ent = ent.map_err(|e| e.to_string())?;
        if ent.path().is_dir() && ent.path().join("level.dat").is_file() {
            out.push(ent.file_name().to_string_lossy().into_owned());
        }
    }
    out.sort();
    Ok(out)
}
