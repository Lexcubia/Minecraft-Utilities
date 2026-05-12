export type WindowTitlebarBuiltInAction = 'minimize' | 'maximize' | 'close';

/** 从左到右：内置三键之一，或 `{ slot: '名称' }` 对应 `<template #名称>` */
export type WindowTitlebarSegment = WindowTitlebarBuiltInAction | { slot: string };

export const DEFAULT_WINDOW_TITLEBAR_SEGMENTS: WindowTitlebarSegment[] = [
  'minimize',
  'maximize',
  'close',
];

export function isWindowTitlebarSlotSegment(
  segment: WindowTitlebarSegment,
): segment is { slot: string } {
  return typeof segment === 'object' && segment !== null && 'slot' in segment;
}
