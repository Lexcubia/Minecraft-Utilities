/**
 * 桌面打包脚本的共享上下文（版本号、二进制名、路径约定）。
 * 与 `scripts/build-artifacts.mjs` 搭配使用。
 */
import fs from 'node:fs';
import path from 'node:path';

import { BuildArtifacts, REPO_ROOT } from '../build-artifacts.mjs';

/**
 * @typedef {object} DesktopPackContext
 * @property {string} root
 * @property {string} mainBinaryName
 * @property {string} productName
 * @property {string} version
 * @property {typeof BuildArtifacts} artifacts
 */

/** @returns {DesktopPackContext} */
export function loadDesktopPackContext() {
  const root = REPO_ROOT;
  const tauriConf = JSON.parse(
    fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'),
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return {
    root,
    mainBinaryName: tauriConf.mainBinaryName,
    productName: tauriConf.productName,
    version: pkg.version,
    artifacts: BuildArtifacts,
  };
}
