import {
  CUSTOM_THEME_PRESET_ID,
  DEFAULT_CUSTOM_THEME_COLORS,
  getThemeColorPreset,
  isBuiltInThemeColorPresetId,
  type ThemeColorPresetId,
  type ThemeColorSchemePair,
} from '@/constants/theme-color-presets';
import type { useTheme } from 'vuetify';

/**
 * 将预设或自定义主色写入 Vuetify 的 light / dark 主题（运行时）。
 */
export function applyVuetifyThemeColors(
  theme: Pick<ReturnType<typeof useTheme>, 'themes'>,
  presetId: ThemeColorPresetId,
  custom?: ThemeColorSchemePair,
): void {
  const light = theme.themes.value.light;
  const dark = theme.themes.value.dark;
  if (!light?.colors || !dark?.colors) return;

  let pair: ThemeColorSchemePair;
  if (presetId === CUSTOM_THEME_PRESET_ID) {
    pair = custom ?? DEFAULT_CUSTOM_THEME_COLORS;
  } else if (isBuiltInThemeColorPresetId(presetId)) {
    const p = getThemeColorPreset(presetId);
    pair = { light: { ...p.light }, dark: { ...p.dark } };
  } else {
    const p = getThemeColorPreset('forest');
    pair = { light: { ...p.light }, dark: { ...p.dark } };
  }

  light.colors.primary = pair.light.primary;
  light.colors.secondary = pair.light.secondary;
  dark.colors.primary = pair.dark.primary;
  dark.colors.secondary = pair.dark.secondary;
}
