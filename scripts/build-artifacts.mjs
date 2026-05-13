/**
 * 构建产物路径约定（均在仓库根 `REPO_ROOT` 下的 `build/` 内，便于 .gitignore）：
 *
 * | 产物 | 路径 | 说明 |
 * |------|------|------|
 * | Web 前端 bundle | `build/web/` | Vite `outDir`，与 `src-tauri/tauri.conf.json` 的 `build.frontendDist` 一致 |
 * | Rust 编译目录 | `build/cargo-target/` | 由 `src-tauri/.cargo/config.toml` 的 `build.target-dir` 指定 |
 * | 可执行文件 / DLL | `build/cargo-target/release/` | Cargo release 输出 |
 * | Tauri `bundle/`（按需） | `build/cargo-target/release/bundle/` | `bundle.active: false` 时不默认生成安装包；CI 在 mac 使用 **`--bundles dmg`** |
 * | 免安装 / 便携包 | `build/desktop/` | Windows zip、Linux tar.gz（`pack-*`）；mac DMG 由 Tauri 写入 `bundle/dmg/` 后由工作流复制到 `upload/` |
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, '..');

/** @param {string} rel */
function abs(rel) {
  return path.join(REPO_ROOT, ...rel.split('/'));
}

export const BuildArtifacts = {
  /** Vite 前端输出目录 */
  webDist: () => abs('build/web'),
  /** Cargo `target-dir` 根目录（含 debug/release 等） */
  cargoTargetRoot: () => abs('build/cargo-target'),
  /** Tauri / Cargo release 产物根目录 */
  tauriRelease: () => abs('build/cargo-target/release'),
  /** Windows zip、Linux tar.gz 等免安装包输出目录 */
  desktopPackages: () => abs('build/desktop'),
};
