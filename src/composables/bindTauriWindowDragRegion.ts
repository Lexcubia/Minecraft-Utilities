import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { getCurrentWindow } from '@tauri-apps/api/window';

/** 略大于「误抖」像素，避免 pointerdown 立即拖窗吞掉双击最大化 */
export const TAURI_WINDOW_DRAG_THRESHOLD_PX = 5;

/**
 * 在宿主元素上绑定拖窗：仅在指针移动超过阈值后调用 `startDragging()`，
 * 以便顶栏等区域仍能收到双击（如最大化）。
 */
export function bindTauriWindowDragRegion(
  host: HTMLElement,
  options?: { thresholdPx?: number },
): () => void {
  if (!isTauriRuntime()) return () => {};

  const thresholdPx = options?.thresholdPx ?? TAURI_WINDOW_DRAG_THRESHOLD_PX;
  const sq = thresholdPx * thresholdPx;

  let down = false;
  let startX = 0;
  let startY = 0;

  const removeMoveEnd = () => {
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerup', onPointerUp);
    host.removeEventListener('pointercancel', onPointerUp);
  };

  const onPointerUp = () => {
    down = false;
    removeMoveEnd();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!down) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (dx * dx + dy * dy < sq) return;
    removeMoveEnd();
    down = false;
    void getCurrentWindow().startDragging();
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-tauri-drag-region-exclude]')) return;
    down = true;
    startX = e.clientX;
    startY = e.clientY;
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerUp);
  };

  host.addEventListener('pointerdown', onPointerDown);
  return () => {
    host.removeEventListener('pointerdown', onPointerDown);
    removeMoveEnd();
  };
}
