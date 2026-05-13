/** 与 `v-navigation-drawer` 的 `location` 一致（LTR 下 start=左、end=右） */
export const DRAWER_LOCATIONS = ['start', 'end'] as const;

export type DrawerLocation = (typeof DRAWER_LOCATIONS)[number];

export const DEFAULT_DRAWER_LOCATION: DrawerLocation = 'start';

export function isDrawerLocation(value: string): value is DrawerLocation {
  return (DRAWER_LOCATIONS as readonly string[]).includes(value);
}
