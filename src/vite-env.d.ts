/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 应用标题（可选） */
  readonly VITE_APP_TITLE?: string;
  /** 本机引擎 HTTP 基址，无尾部斜杠 */
  readonly VITE_ENGINE_API_BASE?: string;
  /** 是否在界面中展示调试信息 */
  readonly VITE_DEBUG_UI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.md?raw' {
  const src: string;
  export default src;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module '@config/app-icons.json' {
  const value: {
    brandLogoSvg: {
      webPath: string;
      viteIndexPlaceholder: string;
      outputsRelativeToRepoRoot: string[];
      readmeHeroSrc: string;
    };
    tauriBundleIcons: {
      pathsRelativeToSrcTauriDir: string[];
      trayPngRelativeToSrcTauriDir: string;
    };
  };
  export default value;
}
