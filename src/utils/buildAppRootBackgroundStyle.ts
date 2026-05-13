import {
  getAppBackgroundStyle,
  type AppBackgroundPresetId,
} from '@/constants/app-background-presets';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { convertFileSrc } from '@tauri-apps/api/core';

const IMAGE_SCRIM = 'linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.12))';

export function resolveCustomBackgroundDisplayUrl(params: {
  customAppBackgroundPath: string;
  customBackgroundObjectUrl: string;
}): string {
  if (params.customBackgroundObjectUrl) return params.customBackgroundObjectUrl;
  if (!params.customAppBackgroundPath) return '';
  if (isTauriRuntime()) {
    return convertFileSrc(params.customAppBackgroundPath);
  }
  return '';
}

/**
 * `v-app` 根背景：预设与自定义图片可叠加（图片为最底层，预设与轻遮罩在上）。
 */
export function buildAppRootBackgroundStyle(
  presetId: AppBackgroundPresetId,
  customDisplayUrl: string,
): Record<string, string> {
  const preset = getAppBackgroundStyle(presetId);
  if (!customDisplayUrl) {
    return { ...preset };
  }

  const topFirst: string[] = [];
  if (preset.backgroundImage) topFirst.push(preset.backgroundImage);
  topFirst.push(IMAGE_SCRIM);
  const safeUrl = customDisplayUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  topFirst.push(`url('${safeUrl}')`);

  const sizes: string[] = [];
  const positions: string[] = [];
  const attachments: string[] = [];
  const repeats: string[] = [];

  if (preset.backgroundImage) {
    if (presetId === 'blocks') {
      const cell = preset.backgroundSize?.includes(',')
        ? preset.backgroundSize.split(',')[0].trim()
        : preset.backgroundSize || '22px 22px';
      const attach = preset.backgroundAttachment?.includes(',')
        ? preset.backgroundAttachment.split(',')[0].trim()
        : preset.backgroundAttachment || 'scroll';
      sizes.push(cell, cell);
      positions.push('0 0', '0 0');
      attachments.push(attach, attach);
      repeats.push('repeat', 'repeat');
    } else {
      sizes.push(preset.backgroundSize || 'auto');
      positions.push(preset.backgroundPosition || 'center');
      attachments.push(preset.backgroundAttachment || 'fixed');
      repeats.push(preset.backgroundRepeat || 'no-repeat');
    }
  }
  sizes.push('auto', 'cover');
  positions.push('center', 'center');
  attachments.push('fixed', 'fixed');
  repeats.push('no-repeat', 'no-repeat');

  return {
    ...preset,
    backgroundImage: topFirst.join(', '),
    backgroundSize: sizes.join(', '),
    backgroundPosition: positions.join(', '),
    backgroundAttachment: attachments.join(', '),
    backgroundRepeat: repeats.join(', '),
  };
}
