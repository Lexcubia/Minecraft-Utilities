import pkg from '../../package.json';

export const APP_VERSION = pkg.version;
export const APP_NAME = pkg.name;
export const APP_DESCRIPTION = pkg.description;

/** 全名：窗口标题、首页标题、面包屑首页等 */
export const APP_TITLE = 'Minecraft Utilities';

export { APP_LOGO_URL, APP_README_HERO_LOGO_SRC } from './app-icons';

/** 仓库主页（Issue、源码入口） */
export const REPO_URL = 'https://github.com/Lexcubia/Minecraft-Utilities';

/** 中文文档索引（GitHub 上浏览） */
export const DOCS_ZH_CN_README_URL = `${REPO_URL}/blob/main/docs/zh-cn/README.md`;
