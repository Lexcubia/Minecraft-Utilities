/**
 * 应用壳背景预设（CSS background-*，随 Vuetify 主题变量变化）。
 * 均为矢量/渐变，不引入外链图片，便于离线打包。
 */
export const APP_BACKGROUND_PRESETS = [
  {
    id: 'none',
    style: {} as Record<string, string>,
  },
  {
    id: 'mist',
    style: {
      backgroundImage: `linear-gradient(
        160deg,
        rgb(var(--v-theme-background)) 0%,
        rgba(var(--v-theme-primary), 0.14) 45%,
        rgba(var(--v-theme-secondary), 0.1) 100%
      )`,
      backgroundAttachment: 'fixed',
    },
  },
  {
    id: 'sunset',
    style: {
      backgroundImage: `linear-gradient(
        125deg,
        rgb(var(--v-theme-background)) 0%,
        rgba(255, 152, 0, 0.12) 35%,
        rgba(233, 30, 99, 0.1) 70%,
        rgb(var(--v-theme-background)) 100%
      )`,
      backgroundAttachment: 'fixed',
    },
  },
  {
    id: 'aurora',
    style: {
      backgroundImage: `linear-gradient(
        135deg,
        rgb(var(--v-theme-surface)) 0%,
        rgba(var(--v-theme-primary), 0.18) 38%,
        rgba(0, 188, 212, 0.12) 62%,
        rgba(var(--v-theme-secondary), 0.14) 100%
      )`,
      backgroundAttachment: 'fixed',
    },
  },
  {
    id: 'blocks',
    style: {
      backgroundColor: 'rgb(var(--v-theme-background))',
      /* 须略强于「细线 + 主区毛玻璃」叠层后的可见度；色值用 design-tokens 的 on-surface 档位 */
      backgroundImage: [
        `linear-gradient(var(--app-on-surface-12) 1px, transparent 1px)`,
        `linear-gradient(90deg, var(--app-on-surface-12) 1px, transparent 1px)`,
      ].join(', '),
      backgroundSize: '22px 22px, 22px 22px',
      backgroundPosition: '0 0, 0 0',
      backgroundRepeat: 'repeat, repeat',
      /* fixed 与主区 backdrop-filter 叠在一起时，部分 WebView 会吞掉根背景图案 */
      backgroundAttachment: 'scroll, scroll',
    },
  },
] as const;

export type AppBackgroundPresetId = (typeof APP_BACKGROUND_PRESETS)[number]['id'];

export const DEFAULT_APP_BACKGROUND_PRESET_ID: AppBackgroundPresetId = 'none';

const byId = Object.fromEntries(APP_BACKGROUND_PRESETS.map((p) => [p.id, p])) as Record<
  AppBackgroundPresetId,
  (typeof APP_BACKGROUND_PRESETS)[number]
>;

export function isAppBackgroundPresetId(value: string): value is AppBackgroundPresetId {
  return value in byId;
}

export function getAppBackgroundStyle(id: AppBackgroundPresetId): Record<string, string> {
  return { ...(byId[id] ?? byId[DEFAULT_APP_BACKGROUND_PRESET_ID]).style };
}
