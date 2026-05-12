/**
 * 抑制 WebView2 / Chromium 壳层快捷键（查找、历史、打印、整页全选等），更接近桌面应用。
 * 仅在 {@link isTauriRuntime} 为 true 时由壳层注册。
 *
 * `import.meta.env.DEV` 为真时（如 `vite` + `tauri dev`）仍允许 F12、Ctrl+Shift+I/J/C 等开发者工具快捷键。
 */

const DEVTOOLS_ALLOWED = import.meta.env.DEV;

function isActiveElementTextEditor(): boolean {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;

  if (el instanceof HTMLInputElement) {
    const ty = el.type;
    if (
      ty === 'button' ||
      ty === 'checkbox' ||
      ty === 'radio' ||
      ty === 'submit' ||
      ty === 'reset' ||
      ty === 'file' ||
      ty === 'hidden' ||
      ty === 'range' ||
      ty === 'color' ||
      ty === 'image'
    ) {
      return false;
    }
    if (el.disabled || el.readOnly) return false;
    return true;
  }
  if (el instanceof HTMLTextAreaElement) {
    if (el.disabled || el.readOnly) return false;
    return true;
  }
  return el.isContentEditable;
}

function swallow(e: KeyboardEvent): void {
  e.preventDefault();
  e.stopPropagation();
}

/** 浏览器壳层功能键（与页面内编辑无关） */
function isBrowserShellFunctionKey(e: KeyboardEvent): boolean {
  switch (e.key) {
    case 'F1':
    case 'F3':
    case 'F7':
    case 'F11':
      return true;
    case 'F12':
      return !DEVTOOLS_ALLOWED;
    default:
      return false;
  }
}

/** Ctrl+Shift+I / J / C / K 等打开开发者工具 */
function isDevtoolsChord(e: KeyboardEvent): boolean {
  if (DEVTOOLS_ALLOWED) return false;
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || !e.shiftKey || e.altKey) return false;
  const k = e.key;
  return (
    k === 'I' ||
    k === 'i' ||
    k === 'J' ||
    k === 'j' ||
    k === 'C' ||
    k === 'c' ||
    k === 'K' ||
    k === 'k'
  );
}

/** 在输入框里也会触发「页面级」行为的 Ctrl+ 组合（Chromium 默认） */
const CHROMIUM_PAGE_CTRL_KEYS_NO_SHIFT = new Set([
  'd',
  'h',
  'j',
  'l',
  'n',
  'o',
  'p',
  's',
  't',
  'u',
  'w',
]);

function isChromiumPageShortcut(e: KeyboardEvent): boolean {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || e.altKey) return false;

  if (mod && e.shiftKey && e.key === 'Delete') {
    return true;
  }

  if (e.key.length !== 1) return false;
  const c = e.key.toLowerCase();

  if ((c === 'f' || c === 'g') && !e.altKey) {
    return true;
  }

  if (CHROMIUM_PAGE_CTRL_KEYS_NO_SHIFT.has(c) && !e.shiftKey) {
    return true;
  }

  if ((c === 'b' || c === 'i') && !e.shiftKey && !isActiveElementTextEditor()) {
    return true;
  }

  return false;
}

/** Ctrl+A：仅非编辑区拦截，避免整页全选 */
function isSelectAllOutsideEditor(e: KeyboardEvent): boolean {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || e.shiftKey || e.altKey) return false;
  if (e.key !== 'a' && e.key !== 'A') return false;
  return !isActiveElementTextEditor();
}

function onWindowKeydownCapture(e: KeyboardEvent): void {
  if (isBrowserShellFunctionKey(e)) {
    swallow(e);
    return;
  }

  if (isDevtoolsChord(e)) {
    swallow(e);
    return;
  }

  if (e.repeat) return;

  if (isChromiumPageShortcut(e)) {
    swallow(e);
    return;
  }

  if (isSelectAllOutsideEditor(e)) {
    swallow(e);
  }
}

/** @returns 卸载函数 */
export function installTauriWebViewKeyboardGuards(): () => void {
  window.addEventListener('keydown', onWindowKeydownCapture, true);
  return () => window.removeEventListener('keydown', onWindowKeydownCapture, true);
}
