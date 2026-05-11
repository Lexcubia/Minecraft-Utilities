/** 纯色预设：仅改 primary / secondary，深浅各一对 */
export const THEME_SOLID_PRESETS = [
  {
    id: 'forest',
    light: { primary: '#2e7d32', secondary: '#558b2f' },
    dark: { primary: '#81c784', secondary: '#aed581' },
  },
  {
    id: 'ocean',
    light: { primary: '#1565c0', secondary: '#0277bd' },
    dark: { primary: '#64b5f6', secondary: '#4fc3f7' },
  },
  {
    id: 'violet',
    light: { primary: '#5e35b1', secondary: '#7e57c2' },
    dark: { primary: '#b39ddb', secondary: '#ce93d8' },
  },
  {
    id: 'amber',
    light: { primary: '#e65100', secondary: '#f57c00' },
    dark: { primary: '#ffb74d', secondary: '#ffcc80' },
  },
  {
    id: 'rose',
    light: { primary: '#ad1457', secondary: '#c2185b' },
    dark: { primary: '#f48fb1', secondary: '#f8bbd0' },
  },
  {
    id: 'cyan',
    light: { primary: '#00695c', secondary: '#00838f' },
    dark: { primary: '#4db6ac', secondary: '#4dd0e1' },
  },
] as const;

/** 渐变预设：写入主题时仍用两端纯色作 primary / secondary；UI 用渐变展示 */
export const THEME_GRADIENT_PRESETS = [
  {
    id: 'gradient-sunrise',
    light: { primary: '#f57c00', secondary: '#c62828' },
    dark: { primary: '#ffcc80', secondary: '#ff8a65' },
  },
  {
    id: 'gradient-ocean',
    light: { primary: '#0277bd', secondary: '#00695c' },
    dark: { primary: '#4dd0e1', secondary: '#80cbc4' },
  },
  {
    id: 'gradient-aurora',
    light: { primary: '#6a1b9a', secondary: '#00838f' },
    dark: { primary: '#ce93d8', secondary: '#80deea' },
  },
  {
    id: 'gradient-slate',
    light: { primary: '#455a64', secondary: '#37474f' },
    dark: { primary: '#90a4ae', secondary: '#cfd8dc' },
  },
] as const;

export type ThemeColorPair = { primary: string; secondary: string };

export type ThemeColorSchemePair = { light: ThemeColorPair; dark: ThemeColorPair };

export type SolidPresetId = (typeof THEME_SOLID_PRESETS)[number]['id'];

export type GradientPresetId = (typeof THEME_GRADIENT_PRESETS)[number]['id'];

export type BuiltInThemeColorPresetId = SolidPresetId | GradientPresetId;

export const CUSTOM_THEME_PRESET_ID = 'custom' as const;

export type ThemeColorPresetId = BuiltInThemeColorPresetId | typeof CUSTOM_THEME_PRESET_ID;

export const DEFAULT_CUSTOM_THEME_COLORS: ThemeColorSchemePair = {
  light: { primary: '#2e7d32', secondary: '#558b2f' },
  dark: { primary: '#81c784', secondary: '#aed581' },
};

export const DEFAULT_THEME_COLOR_PRESET_ID: ThemeColorPresetId = 'forest';

type BuiltInEntry = (typeof THEME_SOLID_PRESETS)[number] | (typeof THEME_GRADIENT_PRESETS)[number];

const builtInById = Object.fromEntries(
  [...THEME_SOLID_PRESETS, ...THEME_GRADIENT_PRESETS].map((p) => [p.id, p]),
) as Record<BuiltInThemeColorPresetId, BuiltInEntry>;

export function isBuiltInThemeColorPresetId(value: string): value is BuiltInThemeColorPresetId {
  return value in builtInById;
}

export function isThemeColorPresetId(value: string): value is ThemeColorPresetId {
  return value === CUSTOM_THEME_PRESET_ID || isBuiltInThemeColorPresetId(value);
}

export function getThemeColorPreset(id: BuiltInThemeColorPresetId): BuiltInEntry {
  return builtInById[id] ?? builtInById.forest;
}

export function gradientSwatchStyle(light: ThemeColorPair): string {
  return `linear-gradient(135deg, ${light.primary}, ${light.secondary})`;
}

/** 内置「渐变」预设 id（不含自定义） */
export function isGradientThemePresetId(id: ThemeColorPresetId): boolean {
  return id.startsWith('gradient-');
}

/** 是否为按钮/头像等套用 primary→secondary 渐变：渐变预设或自定义双色主题 */
export function usesAccentControlGradient(id: ThemeColorPresetId): boolean {
  return id === CUSTOM_THEME_PRESET_ID || isGradientThemePresetId(id);
}
