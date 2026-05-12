/** 与 `src/styles/app-fonts.css` 中 `html[data-app-font]` 取值一致 */
export const UI_FONT_PRESET_IDS = [
  'minecraft',
  'system',
  'readable',
  'notoSc',
  'modern',
  'soft',
  'serif',
  'mono',
] as const;

export type UiFontPresetId = (typeof UI_FONT_PRESET_IDS)[number];

export const DEFAULT_UI_FONT_PRESET_ID: UiFontPresetId = 'minecraft';

export function isUiFontPresetId(v: unknown): v is UiFontPresetId {
  return typeof v === 'string' && (UI_FONT_PRESET_IDS as readonly string[]).includes(v);
}

/** 与 `app-fonts.css` 中 `:root --app-font-stack-*` 对应，用于预设按钮预览 */
export function uiFontStackVar(preset: UiFontPresetId): string {
  return `var(--app-font-stack-${preset})`;
}
