<script setup lang="ts">
import { APP_VERSION, REPO_URL } from '@/constants/app-meta';
import AppGlassSectionCard from '@/components/ui/AppGlassSectionCard.vue';
import { checkInAppUpdate, downloadAndInstallAppUpdate } from '@/composables/useInAppUpdater';
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

const changelogPublished = computed(() => parseKeepAChangelogPublished(changelogSource));

const channelOptions = computed((): { label: string; value: UpdateChannel }[] => [
  { label: t('settings.updates.channelStable'), value: 'stable' },
  { label: t('settings.updates.channelBeta'), value: 'beta' },
]);

const releaseNotesHtmlMap = computed((): Record<number, string> => {
  const m: Record<number, string> = {};
  for (const rel of filteredReleases.value) {
    const body = releaseNotesBody(rel);
    if (body.trim()) m[rel.id] = renderMarkdownToSafeHtml(body);
  }
  return m;
});

const inAppBusy = ref(false);

function formatPublishedAt(iso: string | null): string {
  if (!iso) return '—';
  try {
    const lang = locale.value === 'en' ? 'en' : 'zh-CN';
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function versionBadge(release: GitHubRelease): { text: string; color: string } | null {
  const rel = compareTagToAppVersion(release.tag_name, APP_VERSION);
  if (rel === 'equal') return { text: t('settings.updates.badgeCurrent'), color: 'success' };
  if (rel === 'newer') return { text: t('settings.updates.badgeNewer'), color: 'primary' };
  if (rel === 'older') return { text: t('settings.updates.badgeOlder'), color: 'secondary' };
  return { text: t('settings.updates.badgeUnknown'), color: 'default' };
}

/** 内置 CHANGELOG 优先，否则 GitHub Release 正文 */
function releaseNotesBody(rel: GitHubRelease): string {
  const fromLog = findChangelogBodyForTag(changelogPublished.value, rel.tag_name);
  if (fromLog) return fromLog;
  return (rel.body ?? '').trim();
}

function openChangelogOnGithub() {
  void openExternal(`${REPO_URL}/blob/main/CHANGELOG.md`);
}

async function runInAppUpdate() {
  inAppBusy.value = true;
  const pre = await checkInAppUpdate();
  if (pre.kind === 'none') {
    inAppBusy.value = false;
    appSnackbar.show({ text: t('settings.updates.inAppNoUpdate'), timeout: 5200, rounded: 'md' });
    return;
  }
  if (pre.kind === 'unsupportedPlatform') {
    inAppBusy.value = false;
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
    inAppBusy.value = false;
    const msg =
      pre.kind === 'error'
        ? pre.message
        : t('settings.updates.inAppUnsupported');
    appSnackbar.show({
      text: t('settings.updates.inAppError', { msg }),
      timeout: 5200,
      rounded: 'md',
      color: 'error',
    });
    return;
  }

  const r = await downloadAndInstallAppUpdate();
  inAppBusy.value = false;
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
  appSnackbar.show({
    text: t('settings.updates.inAppDone'),
    timeout: 5200,
    rounded: 'md',
    color: 'success',
  });
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <AppGlassSectionCard>
      <div class="d-flex flex-column gap-5">
        <div>
          <div class="text-body-1 font-weight-medium mb-2">{{ t('settings.updates.checkTitle') }}</div>
          <div class="flex flex-wrap gap-2">
            <v-btn
              min-width="96"
              :variant="settings.autoCheckUpdates ? 'flat' : 'tonal'"
              :color="settings.autoCheckUpdates ? 'primary' : 'surface-variant'"
              @click="settings.autoCheckUpdates = true"
            >
              {{ t('common.on') }}
            </v-btn>
            <v-btn
              min-width="96"
              :variant="!settings.autoCheckUpdates ? 'flat' : 'tonal'"
              :color="!settings.autoCheckUpdates ? 'primary' : 'surface-variant'"
              @click="settings.autoCheckUpdates = false"
            >
              {{ t('common.off') }}
            </v-btn>
          </div>
        </div>

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
          <div class="d-flex align-center gap-2 mb-2">
            <v-icon icon="mdi-download-circle-outline" color="primary" size="22" />
            <span class="text-body-1 font-weight-medium">{{ t('settings.updates.inAppTitle') }}</span>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-4">{{ t('settings.updates.inAppHint') }}</p>
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            rounded="md"
            class="mb-2"
            :loading="inAppBusy"
            prepend-icon="mdi-update"
            @click="runInAppUpdate()"
          >
            {{ t('settings.updates.inAppApply') }}
          </v-btn>
          <v-progress-linear
            v-if="inAppBusy"
            class="mt-2 rounded"
            height="6"
            color="primary"
            indeterminate
          />
        </div>
      </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard body-padding="none">
      <template #head>
        <div class="d-flex flex-wrap align-start gap-3 pa-4 pb-2">
          <v-avatar color="primary" variant="tonal" size="48" rounded="md" class="shrink-0">
            <v-icon icon="mdi-rocket-launch-outline" size="28" />
          </v-avatar>
          <div class="grow min-width-0 ps-2">
            <div class="text-h6 font-weight-semibold">
              {{ t('settings.updates.releasesTitle') }}
            </div>
            <div class="text-body-2 text-medium-emphasis text-wrap">
              {{ t('settings.updates.releasesListHint') }}
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
        <p class="text-caption text-medium-emphasis mb-3">{{ t('settings.about.changelogHint') }}</p>

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
              <v-expansion-panel-title class="release-panel-title px-4 py-4">
                <div class="d-flex flex-wrap align-center gap-3 grow min-width-0">
                  <v-avatar color="primary" size="42" variant="tonal" rounded="md" class="shrink-0">
                    <v-icon icon="mdi-tag-outline" size="22" />
                  </v-avatar>
                  <div class="grow min-width-0">
                    <div class="font-weight-semibold text-body-1 text-truncate">
                      {{ rel.tag_name }}
                      <span v-if="rel.name" class="text-medium-emphasis font-weight-regular text-body-2">
                        · {{ rel.name }}
                      </span>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatPublishedAt(rel.published_at) }}
                      <template v-if="rel.prerelease"> · {{ t('settings.updates.prerelease') }}</template>
                    </div>
                  </div>
                  <v-chip
                    v-if="versionBadge(rel)"
                    size="small"
                    :color="versionBadge(rel)!.color"
                    variant="flat"
                    class="text-caption shrink-0"
                    label
                    @click.stop
                  >
                    {{ versionBadge(rel)!.text }}
                  </v-chip>
                </div>
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

.release-panel-title :deep(.v-expansion-panel-title__overlay) {
  border-radius: 0;
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
</style>
