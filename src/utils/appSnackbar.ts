import type { AppSnackbarMessage } from '@/stores/snackbar-queue';
import { useSnackbarQueueStore } from '@/stores/snackbar-queue';

export type AppSnackbarShowOptions = AppSnackbarMessage;

/**
 * 全局 Snackbar 队列（`v-snackbar-queue`：`totalVisible` 与 `displayStrategy` 在 `AppSnackbarQueue` 中配置）。
 * 在 `App.vue` 中挂载 `AppSnackbarQueue` 后生效。
 */
export const appSnackbar = {
  show(opts: AppSnackbarShowOptions): string {
    return useSnackbarQueueStore().enqueue(opts);
  },

  brief(text: string, timeout = 3000): string {
    return useSnackbarQueueStore().enqueue({ text, timeout });
  },

  success(text: string, timeout = 3000): string {
    return useSnackbarQueueStore().enqueue({ text, color: 'success', timeout });
  },

  warning(text: string, timeout = 3000): string {
    return useSnackbarQueueStore().enqueue({ text, color: 'warning', timeout });
  },

  error(text: string, timeout = 3000): string {
    return useSnackbarQueueStore().enqueue({ text, color: 'error', timeout });
  },
};
