import appIcons from '@config/app-icons.json';

/** 前端 `public/` 下 SVG 的 URL（与 `vite` 注入的 `index.html` favicon 一致） */
export const APP_LOGO_URL = appIcons.brandLogoSvg.webPath;

/** README 等仓库内 Markdown 引用的相对路径（与 `pnpm gen:logo` 输出之一一致） */
export const APP_README_HERO_LOGO_SRC = appIcons.brandLogoSvg.readmeHeroSrc;

export type AppIconsConfig = typeof appIcons;

/** 完整配置（调试或文档生成用） */
export const APP_ICONS_CONFIG: AppIconsConfig = appIcons;
