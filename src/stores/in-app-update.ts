import {
  cancelWindowsReleaseUpdateSetup,
  checkInAppUpdate,
  downloadAndInstallAppUpdate,
  listenWindowsReleaseUpdateProgress,
  WINDOWS_RELEASE_UPDATE_CANCELLED_MESSAGE,
  type WindowsReleaseUpdateProgress,
} from '@/composables/useInAppUpdater';
import { i18n } from '@/i18n';
import { IN_APP_UPDATE_PROGRESS_ID, useAppNotificationsStore } from '@/stores/app-notifications';
import { useSettingsStore } from '@/stores/settings';
import { appSnackbar } from '@/utils/appSnackbar';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { openExternal } from '@/utils/openExternal';
import { invoke } from '@tauri-apps/api/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

function tt(key: string, values?: Record<string, unknown>): string {
  return i18n.global.t(key, values ?? {});
}

export const useInAppUpdateStore = defineStore('in-app-update', () => {
  const settings = useSettingsStore();
  const notifications = useAppNotificationsStore();

  const checkingUpdate = ref(false);
  const downloadingUpdate = ref(false);
  /** 用户已关闭进度通知：在取消生效前忽略进度事件，避免条目被重新插入 */
  const progressInboxUserDismissed = ref(false);
  const updateConfirmOpen = ref(false);
  const updatePendingVersion = ref('');
  const updatePendingTag = ref('');

  const updateNetwork = computed(() => ({
    updateChannel: settings.updateChannel,
    updateProxy: settings.updateProxy,
  }));

  function openUpdateConfirm(version: string, tagName: string) {
    updatePendingVersion.value = version;
    updatePendingTag.value = tagName;
    updateConfirmOpen.value = true;
  }

  function cancelPendingUpdate() {
    updateConfirmOpen.value = false;
    updatePendingVersion.value = '';
    updatePendingTag.value = '';
  }

  /** 与 Rust 端节流配合，避免重复 push 触发过量 Vue 更新 */
  let lastDownloadPercentFloor = -1;
  let lastSpeedSample: { downloaded: number; at: number } | null = null;

  function formatDownloadSpeed(bps: number): string {
    if (bps >= 1048576) {
      return tt('notifications.speedMibPerSec', { v: (bps / 1048576).toFixed(1) });
    }
    if (bps >= 1024) {
      return tt('notifications.speedKibPerSec', { v: (bps / 1024).toFixed(0) });
    }
    return tt('notifications.speedBPerSec', { v: bps.toFixed(0) });
  }

  const progressNotificationDismiss = {
    dismissible: true as const,
    onDismiss: () => {
      progressInboxUserDismissed.value = true;
      void cancelWindowsReleaseUpdateSetup();
    },
  };

  function applyProgressToInbox(p: WindowsReleaseUpdateProgress) {
    if (progressInboxUserDismissed.value) return;
    let progressLabel = '';
    let speedLabel: string | undefined;
    let progressPercent: number | null = null;
    let progressIndeterminate = false;
    if (p.phase === 'downloading') {
      if (p.percent != null) {
        const floor = Math.floor(p.percent);
        if (floor === lastDownloadPercentFloor && floor < 100) {
          return;
        }
        lastDownloadPercentFloor = floor;
        progressPercent = p.percent;
        progressLabel = tt('settings.updates.inAppDownloadPercent', {
          percent: p.percent.toFixed(2),
        });

        const now = Date.now();
        if (lastSpeedSample && now > lastSpeedSample.at) {
          const dt = (now - lastSpeedSample.at) / 1000;
          const dd = p.downloaded - lastSpeedSample.downloaded;
          if (dt >= 0.08 && dd >= 0) {
            speedLabel = formatDownloadSpeed(dd / dt);
          }
        }
        lastSpeedSample = { downloaded: p.downloaded, at: now };
      } else {
        lastDownloadPercentFloor = -1;
        progressPercent = null;
        progressIndeterminate = true;
        progressLabel = tt('settings.updates.inAppDownloadingIndeterminate');
        const now = Date.now();
        if (lastSpeedSample && now > lastSpeedSample.at) {
          const dt = (now - lastSpeedSample.at) / 1000;
          const dd = p.downloaded - lastSpeedSample.downloaded;
          if (dt >= 0.08 && dd >= 0) {
            speedLabel = formatDownloadSpeed(dd / dt);
          }
        }
        lastSpeedSample = { downloaded: p.downloaded, at: now };
      }
    } else if (p.phase === 'extracting') {
      lastDownloadPercentFloor = -1;
      lastSpeedSample = null;
      progressPercent = null;
      progressIndeterminate = true;
      progressLabel = tt('settings.updates.inAppExtracting');
    } else if (p.phase === 'applying') {
      lastDownloadPercentFloor = -1;
      lastSpeedSample = null;
      progressPercent = 100;
      progressIndeterminate = false;
      progressLabel = tt('settings.updates.inAppApplying');
    }
    notifications.pushMessage({
      id: IN_APP_UPDATE_PROGRESS_ID,
      title: tt('settings.updates.inAppProgressTitle'),
      body: undefined,
      variant: 'info',
      read: true,
      progressPercent,
      progressLabel,
      speedLabel,
      progressIndeterminate,
      ...progressNotificationDismiss,
    });
  }

  async function checkForUpdatesManual() {
    if (!isTauriRuntime()) {
      appSnackbar.show({
        text: tt('settings.updates.inAppUnsupported'),
        timeout: 5200,
        rounded: 'md',
        color: 'surface-variant',
      });
      return;
    }
    checkingUpdate.value = true;
    try {
      const pre = await checkInAppUpdate(updateNetwork.value);
      if (pre.kind === 'none') {
        appSnackbar.show({
          text: tt('settings.updates.inAppNoUpdate'),
          timeout: 5200,
          rounded: 'md',
        });
        return;
      }
      if (pre.kind === 'unsupportedPlatform') {
        appSnackbar.show({
          text: tt('settings.updates.inAppUnsupportedPlatform'),
          timeout: 7200,
          rounded: 'md',
          color: 'surface-variant',
          actions: [
            {
              label: tt('settings.updates.openReleasesPage'),
              run: () => {
                void openExternal(pre.releasesPageUrl);
              },
            },
          ],
        });
        return;
      }
      if (pre.kind === 'error' || pre.kind === 'unsupported') {
        const msg = pre.kind === 'error' ? pre.message : tt('settings.updates.inAppUnsupported');
        appSnackbar.show({
          text: tt('settings.updates.inAppError', { msg }),
          timeout: 5200,
          rounded: 'md',
          color: 'error',
        });
        return;
      }
      openUpdateConfirm(pre.version, pre.tagName);
    } finally {
      checkingUpdate.value = false;
    }
  }

  /** 启动后静默检查；有新版本则推送到消息中心 */
  async function runStartupUpdateCheck() {
    if (!isTauriRuntime() || !settings.autoCheckAppUpdates) return;
    try {
      const pre = await checkInAppUpdate(updateNetwork.value);
      if (pre.kind !== 'available') return;
      const id = `in-app-update-available:${pre.tagName}`;
      notifications.pushMessage({
        id,
        title: tt('notifications.startupUpdateAvailableTitle', { version: pre.version }),
        body: tt('notifications.startupUpdateAvailableBody'),
        variant: 'info',
        read: false,
        dismissible: true,
        action: {
          labelKey: 'notifications.actionOpenUpdates',
          routeName: 'settings-updates',
        },
      });
    } catch {
      /* 静默失败 */
    }
  }

  async function confirmDownloadAndInstallUpdate() {
    if (!isTauriRuntime()) return;
    updateConfirmOpen.value = false;
    downloadingUpdate.value = true;
    progressInboxUserDismissed.value = false;
    lastDownloadPercentFloor = -1;
    lastSpeedSample = null;
    notifications.removeById(IN_APP_UPDATE_PROGRESS_ID);
    notifications.pushMessage({
      id: IN_APP_UPDATE_PROGRESS_ID,
      title: tt('settings.updates.inAppProgressTitle'),
      body: undefined,
      variant: 'info',
      read: true,
      progressPercent: null,
      progressLabel: tt('settings.updates.inAppDownloadStarting'),
      speedLabel: undefined,
      progressIndeterminate: true,
      ...progressNotificationDismiss,
    });
    let unlistenProgress: (() => void) | undefined;
    try {
      unlistenProgress = await listenWindowsReleaseUpdateProgress(applyProgressToInbox);
      const r = await downloadAndInstallAppUpdate(updateNetwork.value);
      if (!r.ok) {
        notifications.removeById(IN_APP_UPDATE_PROGRESS_ID);
        if (r.message === WINDOWS_RELEASE_UPDATE_CANCELLED_MESSAGE) {
          return;
        }
        const msg = r.message === 'NO_UPDATE' ? tt('settings.updates.inAppNoUpdate') : r.message;
        notifications.pushMessage({
          id: `in-app-update-error:${Date.now()}`,
          title: tt('settings.updates.inAppErrorTitle'),
          body: tt('settings.updates.inAppError', { msg }),
          variant: 'error',
          read: false,
          dismissible: true,
          action: {
            labelKey: 'notifications.actionOpenUpdates',
            routeName: 'settings-updates',
          },
        });
        return;
      }
      await invoke('exit_app');
    } finally {
      unlistenProgress?.();
      downloadingUpdate.value = false;
      notifications.removeById(IN_APP_UPDATE_PROGRESS_ID);
      updatePendingVersion.value = '';
      updatePendingTag.value = '';
    }
  }

  return {
    checkingUpdate,
    downloadingUpdate,
    updateConfirmOpen,
    updatePendingVersion,
    updatePendingTag,
    updateNetwork,
    checkForUpdatesManual,
    runStartupUpdateCheck,
    cancelPendingUpdate,
    confirmDownloadAndInstallUpdate,
    openUpdateConfirm,
  };
});
