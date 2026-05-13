/**
 * 是否在 Tauri WebView 内运行。
 * 不可依赖 `import.meta.env.TAURI_ENVIRONMENT`：生产构建走 `vite build` 时该变量不会被注入。
 */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
