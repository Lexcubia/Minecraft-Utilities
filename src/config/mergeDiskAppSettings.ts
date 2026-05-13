import defaultAppSettings from './settings.json';

/** 将磁盘上的部分设置与源码内置 `settings.json` 合并，避免空文件或 `{}` 导致界面异常。 */
export function mergeDiskAppSettingsJson(diskJson: string): string {
  let disk: Record<string, unknown>;
  try {
    disk = JSON.parse(diskJson.trim() || '{}') as Record<string, unknown>;
  } catch {
    disk = {};
  }
  const base = { ...(defaultAppSettings as Record<string, unknown>) };
  const merged: Record<string, unknown> = { ...base, ...disk };
  const dct = disk.customThemeColors;
  if (dct && typeof dct === 'object' && !Array.isArray(dct)) {
    const bct = base.customThemeColors as Record<string, unknown> | undefined;
    const dco = dct as Record<string, unknown>;
    const dl = dco.light;
    const dd = dco.dark;
    merged.customThemeColors = {
      light: {
        ...((bct?.light as Record<string, unknown> | undefined) ?? {}),
        ...(typeof dl === 'object' && dl !== null && !Array.isArray(dl)
          ? (dl as Record<string, unknown>)
          : {}),
      },
      dark: {
        ...((bct?.dark as Record<string, unknown> | undefined) ?? {}),
        ...(typeof dd === 'object' && dd !== null && !Array.isArray(dd)
          ? (dd as Record<string, unknown>)
          : {}),
      },
    };
  }
  return JSON.stringify(merged);
}
