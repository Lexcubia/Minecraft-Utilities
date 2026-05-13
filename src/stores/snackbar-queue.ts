import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  SnackbarMessage,
  SnackbarMessageDismissType,
} from 'vuetify/lib/components/VSnackbarQueue/VSnackbarQueue.js';

/** 与队列项关联，供 `#actions` 槽读取；不会作为合法 VSnackbar prop 使用 */
export const APP_SNACK_ID_KEY = '__appSnackId' as const;

export type AppSnackbarAction = {
  label: string;
  run?: () => void | Promise<void>;
};

export type AppSnackbarMessage = {
  id?: string;
  text: string;
  color?: string;
  /** 默认 3000ms；设为 `-1` 则仅手动关闭 */
  timeout?: number;
  multiLine?: boolean;
  elevation?: number | string;
  rounded?: boolean | string;
  actions?: AppSnackbarAction[];
  /** 默认 `true`；显式 `false` 时隐藏关闭操作（仅当有条目自定义 `actions` 时才有意义） */
  closable?: boolean;
  onDismiss?: (reason: SnackbarMessageDismissType) => void;
};

function genId(): string {
  return `snack-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function snackIdOf(m: SnackbarMessage): string | undefined {
  if (typeof m === 'string') return undefined;
  const v = (m as Record<string, unknown>)[APP_SNACK_ID_KEY];
  return typeof v === 'string' ? v : undefined;
}

export const useSnackbarQueueStore = defineStore('snackbar-queue', () => {
  const messages = ref<SnackbarMessage[]>([]);
  const actionsBySnackId = new Map<string, AppSnackbarAction[]>();

  const DEFAULT_TIMEOUT_MS = 3000;

  function getActionsFor(snackId: string | undefined): AppSnackbarAction[] {
    if (!snackId) return [];
    return actionsBySnackId.get(snackId) ?? [];
  }

  /**
   * 将消息追加到 `v-snackbar-queue` 的 `modelValue` 队列末尾（FIFO：队首先展示）。
   * @returns 内部 snack id（可用于 `payload.id` 去重）
   */
  function enqueue(payload: AppSnackbarMessage): string {
    const id = payload.id ?? genId();

    if (payload.id) {
      messages.value = messages.value.filter((m: SnackbarMessage) => snackIdOf(m) !== payload.id);
      actionsBySnackId.delete(payload.id);
    }

    const { actions, onDismiss: userOnDismiss, id: _pid, ...restSafe } = payload;
    void _pid;
    if (actions?.length) {
      actionsBySnackId.set(id, actions);
    }

    const queueItem = {
      ...restSafe,
      text: payload.text,
      timeout: payload.timeout ?? DEFAULT_TIMEOUT_MS,
      rounded: payload.rounded ?? 'lg',
      elevation: payload.elevation ?? 6,
      multiLine: payload.multiLine,
      closable: payload.closable ?? true,
      [APP_SNACK_ID_KEY]: id,
      onDismiss(reason: SnackbarMessageDismissType) {
        actionsBySnackId.delete(id);
        userOnDismiss?.(reason);
      },
    } as SnackbarMessage;

    messages.value = [...messages.value, queueItem];
    return id;
  }

  return {
    messages,
    enqueue,
    getActionsFor,
  };
});
