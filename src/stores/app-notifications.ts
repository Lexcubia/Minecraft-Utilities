import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type AppNotificationVariant = 'info' | 'success' | 'warning' | 'error';

export type AppNotification = {
  id: string;
  createdAt: number;
  title: string;
  body?: string;
  variant: AppNotificationVariant;
  read: boolean;
  progressPercent?: number | null;
  progressLabel?: string;
  /** 下载阶段瞬时速度，与 progressLabel 分行展示在进度条下方 */
  speedLabel?: string;
  progressIndeterminate?: boolean;
  /** 为 true 时在列表项右侧显示关闭按钮 */
  dismissible?: boolean;
  /** 点击关闭时调用（在从列表移除之前）；如取消应用内下载 */
  onDismiss?: () => void;
  /** 在收件箱中展示次要操作 */
  action?: { labelKey: string; routeName: string };
};

const MAX_ITEMS = 40;

export const IN_APP_UPDATE_PROGRESS_ID = 'in-app-update-progress';

export const useAppNotificationsStore = defineStore('app-notifications', () => {
  const items = ref<AppNotification[]>([]);
  const inboxOpen = ref(false);

  const unreadCount = computed(() => items.value.filter((i) => !i.read).length);

  const showInboxButton = computed(() => items.value.length > 0);

  function setInboxOpen(open: boolean) {
    inboxOpen.value = open;
    if (open) {
      for (const it of items.value) {
        it.read = true;
      }
    }
  }

  function pushMessage(input: Omit<AppNotification, 'createdAt' | 'read'> & { read?: boolean }) {
    const now = Date.now();
    const row: AppNotification = {
      ...input,
      createdAt: now,
      read: input.read ?? false,
    };
    const idx = items.value.findIndex((i) => i.id === row.id);
    if (idx >= 0) {
      const prev = items.value[idx]!;
      const merged: AppNotification = { ...prev, ...row, createdAt: prev.createdAt };
      if (!('onDismiss' in input) && prev.onDismiss) {
        merged.onDismiss = prev.onDismiss;
      }
      if (!('dismissible' in input) && prev.dismissible === true) {
        merged.dismissible = true;
      }
      items.value.splice(idx, 1, merged);
      return;
    }
    items.value.unshift(row);
    if (items.value.length > MAX_ITEMS) {
      items.value.length = MAX_ITEMS;
    }
  }

  function removeById(id: string) {
    const idx = items.value.findIndex((i) => i.id === id);
    if (idx >= 0) items.value.splice(idx, 1);
  }

  function clearAll() {
    const snapshot = [...items.value];
    for (const it of snapshot) {
      it.onDismiss?.();
    }
    items.value = [];
    inboxOpen.value = false;
  }

  return {
    items,
    inboxOpen,
    unreadCount,
    showInboxButton,
    setInboxOpen,
    pushMessage,
    removeById,
    clearAll,
  };
});
