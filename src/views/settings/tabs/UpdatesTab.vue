<script setup lang="ts">
import { APP_VERSION, REPO_URL } from '@/constants/app-meta';
import AppGlassSectionCard from '@/components/ui/AppGlassSectionCard.vue';
import {
  checkInAppUpdate,
  downloadAndInstallAppUpdate,
  listenWindowsReleaseUpdateProgress,
  type WindowsReleaseUpdateProgress,
} from '@/composables/useInAppUpdater';
import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { useGithubReleases } from '@/composables/useGithubReleases';
import type { UpdateChannel } from '@/stores/settings';
import { useSettingsStore } from '@/stores/settings';
import type { GitHubRelease } from '@/types/github-release';
import { openExternal } from '@/utils/openExternal';
import { appSnackbar } from '@/utils/appSnackbar';
import { findChangelogBodyForTag, parseKeepAChangelogPublished } from '@/utils/parseChangelog';
import { renderMarkdownToSafeHtml } from '@/utils/renderMarkdown';
import { compareTagToAppVersion } from '@/utils/semverTagCompare';
import changelogSource from '../../../../CHANGELOG.md?raw';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();
const settings = useSettingsStore();
const { filteredReleases, loading, error, load } = useGithubReleases();

const updateNetwork = computed(() => ({
  updateChannel: settings.updateChannel,
  updateProxy: settings.updateProxy,
}));

const proxyDialogOpen = ref(false);
const proxyDraft = ref('');

function openProxyDialog() {
  proxyDraft.value = settings.updateProxy;
  proxyDialogOpen.value = true;
}

function saveProxyDialog() {
  settings.updateProxy = proxyDraft.value.trim();
  proxyDialogOpen.value = false;
  void load();
}

function clearProxyAndSave() {
  proxyDraft.value = '';
  saveProxyDialog();
}

const changelogPublished = computed(() => parseKeepAChangelogPublished(changelogSource));

const channelOptions = computed((): { label: string; value: UpdateChannel }[] => [
  { label: t('settings.updates.channelStable'), value: 'stable' },
  { label: t('settings.updates.channelBeta'), value: 'beta' },
]);

/** 仅使用内置 CHANGELOG 与 `tag_name` 对齐的正文，不回退 GitHub Release 正文。 */
function releaseNotesBody(rel: GitHubRelease): string {
  return findChangelogBodyForTag(changelogPublished.value, rel.tag_name)?.trim() ?? '';
}

const releaseNotesHtmlMap = computed((): Record<number, string> => {
  const m: Record<number, string> = {};
  for (const rel of filteredReleases.value) {
    const body = releaseNotesBody(rel);
    if (body.trim()) m[rel.id] = renderMarkdownToSafeHtml(body);
  }
  return m;
});

const checkingUpdate = ref(false);
const downloadingUpdate = ref(false);
const updateConfirmOpen = ref(false);
const updatePendingVersion = ref('');
const updatePendingTag = ref('');
const updateProgressPhase = ref<WindowsReleaseUpdateProgress['phase'] | null>(null);
const updateProgressPercent = ref<number | null>(null);
const updateProgressLabel = ref('');

function resetUpdateProgress() {
  updateProgressPhase.value = null;
  updateProgressPercent.value = null;
  updateProgressLabel.value = '';
}

function applyUpdateProgress(p: WindowsReleaseUpdateProgress) {
  updateProgressPhase.value = p.phase;
  if (p.phase === 'downloading' && p.percent != null) {
    updateProgressPercent.value = p.percent;
    updateProgressLabel.value = t('settings.updates.inAppDownloadPercent', {
      percent: p.percent.toFixed(2),
    });
    return;
  }
  if (p.phase === 'extracting') {
    updateProgressPercent.value = null;
    updateProgressLabel.value = t('settings.updates.inAppExtracting');
    return;
  }
  if (p.phase === 'applying') {
    updateProgressPercent.value = 100;
    updateProgressLabel.value = t('settings.updates.inAppApplying');
  }
}

const updateConfirmNotesHtml = computed(() => {
  const tag = updatePendingTag.value.trim();
  if (!tag) return '';
  const body = findChangelogBodyForTag(changelogPublished.value, tag);
  if (!body?.trim()) return '';
  return renderMarkdownToSafeHtml(body);
});

function formatPublishedAt(iso: string | null): string {
  if (!iso) return '—';
  try {
    const lang = locale.value === 'en' ? 'en' : 'zh-CN';
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

type ReleaseVersionBadge = {
  text: string;
  color: string;
  variant: 'flat' | 'tonal';
  tone: 'current' | 'newer';
  icon?: string;
};

function versionBadge(release: GitHubRelease): ReleaseVersionBadge | null {
  const rel = compareTagToAppVersion(release.tag_name, APP_VERSION);
  if (rel === 'equal') {
    return {
      text: t('settings.updates.badgeCurrent'),
      color: 'success',
      variant: 'tonal',
      tone: 'current',
      icon: 'mdi-check-circle',
    };
  }
  if (rel === 'newer') {
    return {
      text: t('settings.updates.badgeNewer'),
      color: 'primary',
      variant: 'tonal',
      tone: 'newer',
      icon: 'mdi-arrow-up-circle-outline',
    };
  }
  return null;
}

const releaseVersionBadgeMap = computed((): Record<number, ReleaseVersionBadge | null> => {
  const m: Record<number, ReleaseVersionBadge | null> = {};
  for (const rel of filteredReleases.value) {
    m[rel.id] = versionBadge(rel);
  }
  return m;
});

function openChangelogOnGithub() {
  void openExternal(`${REPO_URL}/blob/main/CHANGELOG.md`);
}

async function checkForUpdatesOnly() {
  checkingUpdate.value = true;
  try {
    const pre = await checkInAppUpdate(updateNetwork.value);
    if (pre.kind === 'none') {
      appSnackbar.show({ text: t('settings.updates.inAppNoUpdate'), timeout: 5200, rounded: 'md' });
      return;
    }
    if (pre.kind === 'unsupportedPlatform') {
      appSnackbar.show({
        text: t('settings.updates.inAppUnsupportedPlatform'),
        timeout: 7200,
        rounded: 'md',
        color: 'surface-variant',
        actions: [
          {
            label: t('settings.updates.openReleasesPage'),
            run: () => {
              void openExternal(pre.releasesPageUrl);
            },
          },
        ],
      });
      return;
    }
    if (pre.kind === 'error' || pre.kind === 'unsupported') {
      const msg =
        pre.kind === 'error' ? pre.message : t('settings.updates.inAppUnsupported');
      appSnackbar.show({
        text: t('settings.updates.inAppError', { msg }),
        timeout: 5200,
        rounded: 'md',
        color: 'error',
      });
      return;
    }
    updatePendingVersion.value = pre.version;
    updatePendingTag.value = pre.tagName;
    updateConfirmOpen.value = true;
  } finally {
    checkingUpdate.value = false;
  }
}

function cancelPendingUpdate() {
  updateConfirmOpen.value = false;
  updatePendingVersion.value = '';
  updatePendingTag.value = '';
}

async function confirmDownloadAndInstallUpdate() {
  updateConfirmOpen.value = false;
  downloadingUpdate.value = true;
  resetUpdateProgress();
  let unlistenProgress: (() => void) | undefined;
  try {
    unlistenProgress = await listenWindowsReleaseUpdateProgress(applyUpdateProgress);
    const r = await downloadAndInstallAppUpdate(updateNetwork.value);
    if (!r.ok) {
      const msg = r.message === 'NO_UPDATE' ? t('settings.updates.inAppNoUpdate') : r.message;
      appSnackbar.show({
        text: t('settings.updates.inAppError', { msg }),
        timeout: 5200,
        rounded: 'md',
        color: 'error',
      });
      return;
    }
    if (isTauriRuntime()) {
      await invoke('exit_app');
    }
  } finally {
    unlistenProgress?.();
    downloadingUpdate.value = false;
    resetUpdateProgress();
    updatePendingVersion.value = '';
    updatePendingTag.value = '';
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <AppGlassSectionCard>
      <div class="d-flex flex-column gap-4">
        <div>
          <div class="text-body-1 font-weight-medium mb-2">{{ t('settings.updates.channelLabel') }}</div>
          <div class="flex flex-wrap gap-2">
            <v-btn
              v-for="opt in channelOptions"
              :key="opt.value"
              min-width="96"
              :variant="settings.updateChannel === opt.value ? 'flat' : 'tonal'"
              :color="settings.updateChannel === opt.value ? 'primary' : 'surface-variant'"
              @click="settings.updateChannel = opt.value"
            >
              {{ opt.label }}
            </v-btn>
          </div>
        </div>

        <v-divider class="border-opacity-25" />

        <div>
          <div class="d-flex flex-wrap align-center justify-space-between gap-2 mb-2">
            <div class="d-flex align-center gap-2 min-w-0">
              <v-icon icon="mdi-download-circle-outline" color="primary" size="20" />
              <span class="text-body-2 font-weight-medium">{{ t('settings.updates.inAppTitle') }}</span>
            </div>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              prepend-icon="mdi-lan-connect"
              @click="openProxyDialog"
            >
              {{ t('settings.updates.proxyButton') }}
            </v-btn>
          </div>
          <p v-if="settings.updateProxy" class="text-caption text-medium-emphasis mb-2">
            {{ t('settings.updates.proxyActive', { url: settings.updateProxy }) }}
          </p>
          <v-btn
            color="primary"
            variant="flat"
            size="default"
            rounded="md"
            class="mb-2"
            :loading="checkingUpdate"
            :disabled="downloadingUpdate"
            prepend-icon="mdi-cloud-download-outline"
            @click="checkForUpdatesOnly"
          >
            {{ t('settings.updates.inAppCheckButton') }}
          </v-btn>
          <template v-if="downloadingUpdate">
            <v-progress-linear
              class="mt-2 rounded"
              height="4"
              color="primary"
              :indeterminate="updateProgressPercent == null"
              :model-value="updateProgressPercent ?? 0"
            />
            <div v-if="updateProgressLabel" class="text-caption text-medium-emphasis mt-1">
              {{ updateProgressLabel }}
            </div>
          </template>
        </div>
      </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard body-padding="none">
      <template #head>
        <div class="d-flex flex-wrap align-start gap-2 pa-3 pb-1">
          <div class="grow min-width-0">
            <div class="app-section-title">
              {{ t('settings.updates.releasesTitle') }}
            </div>
          </div>
          <div class="d-flex flex-wrap justify-end gap-1 updates-releases-actions">
            <v-btn variant="text" size="small" color="primary" @click="openChangelogOnGithub">
              {{ t('settings.about.changelogFull') }}
            </v-btn>
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              rounded="md"
              :loading="loading"
              prepend-icon="mdi-refresh"
              @click="load()"
            >
              {{ t('settings.updates.refresh') }}
            </v-btn>
          </div>
        </div>
      </template>

      <div class="px-4 pb-4 pt-0">
        <v-progress-linear v-if="loading" class="mb-3" indeterminate color="primary" rounded height="4" />

        <v-alert v-if="error" type="warning" variant="tonal" density="comfortable" rounded="md" class="text-body-2">
          {{ error }}
        </v-alert>

        <v-alert
          v-else-if="!loading && filteredReleases.length === 0"
          type="info"
          variant="tonal"
          density="comfortable"
          rounded="md"
          class="text-body-2"
        >
          {{ t('settings.updates.empty') }}
        </v-alert>

        <v-sheet
          v-else-if="filteredReleases.length > 0"
          class="release-panels-wrap rounded-md"
          color="surface"
          border
        >
          <v-expansion-panels variant="accordion" multiple flat class="release-panels">
            <v-expansion-panel
              v-for="rel in filteredReleases"
              :key="rel.id"
              class="release-panel"
              elevation="0"
            >
              <v-expansion-panel-title class="release-panel-title app-linear-list-row px-4 py-2">
                <div class="release-panel-title__main">
                  <div class="release-row-icon shrink-0" aria-hidden="true">
                    <v-icon icon="mdi-tag-outline" size="18" color="primary" />
                  </div>
                  <div class="release-panel-title__text min-width-0">
                    <div class="font-weight-medium text-body-2 text-truncate">
                      {{ rel.tag_name }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatPublishedAt(rel.published_at) }}
                      <template v-if="rel.prerelease"> · {{ t('settings.updates.prerelease') }}</template>
                    </div>
                  </div>
                </div>
                <v-chip
                  v-if="releaseVersionBadgeMap[rel.id]"
                  size="x-small"
                  rounded="pill"
                  :color="releaseVersionBadgeMap[rel.id]!.color"
                  :variant="releaseVersionBadgeMap[rel.id]!.variant"
                  :prepend-icon="releaseVersionBadgeMap[rel.id]!.icon"
                  :class="[
                    'release-version-badge shrink-0',
                    `release-version-badge--${releaseVersionBadgeMap[rel.id]!.tone}`,
                  ]"
                  @click.stop
                >
                  {{ releaseVersionBadgeMap[rel.id]!.text }}
                </v-chip>
              </v-expansion-panel-title>
              <v-expansion-panel-text class="release-panel-text pa-0">
                <div class="release-notes-shell pa-4 pa-sm-5">
                  <div class="text-overline text-medium-emphasis letter-spacing-normal mb-3">
                    {{ t('settings.updates.releaseNotesHeading') }}
                  </div>
                  <div
                    v-if="releaseNotesHtmlMap[rel.id]"
                    class="release-notes-md markdown-body text-body-2"
                    v-html="releaseNotesHtmlMap[rel.id]"
                  />
                  <div v-else class="text-body-2 text-medium-emphasis">
                    {{ t('settings.about.changelogEmpty') }}
                  </div>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-sheet>
      </div>
    </AppGlassSectionCard>

    <v-dialog v-model="updateConfirmOpen" max-width="520" scrollable>
      <v-card rounded="lg">
        <v-card-title class="text-h6 font-weight-semibold pe-8">
          {{ t('settings.updates.inAppConfirmTitle') }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">
            {{ t('settings.updates.inAppConfirmIntro', { version: updatePendingVersion }) }}
          </p>
          <div
            v-if="updateConfirmNotesHtml"
            class="update-confirm-notes markdown-body text-body-2 rounded-md pa-3"
            v-html="updateConfirmNotesHtml"
          />
          <p v-else class="text-caption text-medium-emphasis mb-0">
            {{ t('settings.about.changelogEmpty') }}
          </p>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" :disabled="downloadingUpdate" @click="cancelPendingUpdate">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="downloadingUpdate"
            @click="confirmDownloadAndInstallUpdate"
          >
            {{ t('settings.updates.inAppConfirmOk') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="proxyDialogOpen" max-width="480" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-h6 font-weight-semibold">
          {{ t('settings.updates.proxyDialogTitle') }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-3">
            {{ t('settings.updates.proxyDialogHint') }}
          </p>
          <v-text-field
            v-model="proxyDraft"
            :label="t('settings.updates.proxyLabel')"
            :placeholder="t('settings.updates.proxyPlaceholder')"
            variant="outlined"
            density="compact"
            hide-details="auto"
            clearable
            autocomplete="off"
          />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-btn variant="text" @click="proxyDialogOpen = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-spacer />
          <v-btn variant="tonal" @click="clearProxyAndSave">
            {{ t('settings.updates.proxyClear') }}
          </v-btn>
          <v-btn color="primary" variant="flat" @click="saveProxyDialog">
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.updates-releases-actions {
  align-self: flex-start;
}

.release-panels-wrap {
  overflow: hidden;
  border-color: rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.9)) !important;
}

.release-panels {
  background: transparent;
}

.release-panels :deep(.v-expansion-panel) {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.release-panels :deep(.v-expansion-panel:last-child) {
  border-bottom: none;
}

.release-panel-title {
  gap: 10px;
}

.release-panel-title :deep(.v-expansion-panel-title__overlay) {
  border-radius: 0;
}

/* 标题区与右侧展开箭头之间留白，避免版本标记贴住下拉箭头 */
.release-panel-title :deep(.v-expansion-panel-title__icon) {
  margin-inline-start: 6px;
}

.release-row-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--app-radius-sm);
  background: var(--app-primary-06);
}

.release-panel-title__main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
}

.release-panel-title__text {
  min-width: 0;
}

.release-version-badge {
  flex: 0 0 auto;
  align-self: center;
  margin-inline-end: 4px;
  font-size: 0.6875rem !important;
  font-weight: 600;
  letter-spacing: 0.01em;
  padding-inline: 9px !important;
  height: 22px !important;
}

.release-version-badge :deep(.v-chip__prepend .v-icon) {
  font-size: 0.875rem !important;
  opacity: 0.95;
}

.release-version-badge--current {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-success)) 38%, transparent);
}

.release-version-badge--newer {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 32%, transparent);
}

.release-panel-text {
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.release-notes-shell {
  border-top: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
}

.release-notes-md :deep(h1),
.release-notes-md :deep(h2),
.release-notes-md :deep(h3),
.release-notes-md :deep(h4) {
  margin: 0.75rem 0 0.35rem;
  font-weight: 600;
  line-height: 1.35;
}

.release-notes-md :deep(h1:first-child),
.release-notes-md :deep(h2:first-child),
.release-notes-md :deep(h3:first-child),
.release-notes-md :deep(h4:first-child) {
  margin-top: 0;
}

.release-notes-md :deep(p) {
  margin: 0.4rem 0;
  line-height: 1.55;
}

.release-notes-md :deep(ul),
.release-notes-md :deep(ol) {
  margin: 0.35rem 0 0.5rem;
  padding-left: 1.25rem;
}

.release-notes-md :deep(li) {
  margin: 0.2rem 0;
  line-height: 1.5;
}

.release-notes-md :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.release-notes-md :deep(a:hover) {
  text-decoration: underline;
}

.release-notes-md :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.88em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.release-notes-md :deep(pre) {
  margin: 0.6rem 0;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  overflow-x: auto;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.release-notes-md :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: 0.85em;
}

.release-notes-md :deep(blockquote) {
  margin: 0.5rem 0;
  padding: 0.35rem 0 0.35rem 0.85rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.45);
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.release-notes-md :deep(hr) {
  margin: 0.75rem 0;
  border: none;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.release-notes-md :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
  font-size: 0.92em;
}

.release-notes-md :deep(th),
.release-notes-md :deep(td) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 0.35rem 0.5rem;
  text-align: left;
}

.release-notes-md :deep(th) {
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-weight: 600;
}

.update-confirm-notes {
  max-height: 240px;
  overflow-y: auto;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.update-confirm-notes :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.update-confirm-notes :deep(a:hover) {
  text-decoration: underline;
}
</style>
