<script setup lang="ts">
import { APP_VERSION } from '@/constants/app-meta';
import { GITHUB_RELEASES_WEB } from '@/constants/github-repo';
import { useGithubReleases } from '@/composables/useGithubReleases';
import type { UpdateChannel } from '@/stores/settings';
import { useSettingsStore } from '@/stores/settings';
import type { GitHubRelease } from '@/types/github-release';
import { openExternal } from '@/utils/openExternal';
import { formatAssetSize, pickPreferredInstallAsset } from '@/utils/pickReleaseAsset';
import { compareTagToAppVersion } from '@/utils/semverTagCompare';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();
const settings = useSettingsStore();
const { filteredReleases, loading, error, load } = useGithubReleases();

const channelOptions = computed((): { label: string; value: UpdateChannel }[] => [
  { label: t('settings.updates.channelStable'), value: 'stable' },
  { label: t('settings.updates.channelBeta'), value: 'beta' },
]);

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

function preferredAsset(release: GitHubRelease) {
  return pickPreferredInstallAsset(release.assets);
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <v-card color="surface" variant="flat" rounded="lg" elevation="1">
      <v-card-title class="text-subtitle-1">{{ t('settings.updates.cardTitle') }}</v-card-title>
      <v-card-text class="d-flex flex-column gap-5">
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
      </v-card-text>
    </v-card>

    <v-card color="surface" variant="flat" rounded="lg" elevation="1">
      <v-card-title class="d-flex flex-wrap align-center gap-2 text-subtitle-1">
        <span>{{ t('settings.updates.releasesTitle') }}</span>
        <v-spacer />
        <v-btn
          variant="tonal"
          color="surface-variant"
          size="small"
          :loading="loading"
          prepend-icon="mdi-refresh"
          @click="load()"
        >
          {{ t('settings.updates.refresh') }}
        </v-btn>
      </v-card-title>
      <v-card-text class="d-flex flex-column gap-3">
        <v-progress-linear v-if="loading" indeterminate color="primary" rounded height="4" />

        <v-alert v-if="error" type="warning" variant="flat" density="comfortable" class="text-body-2">
          {{ error }}
        </v-alert>

        <v-alert
          v-else-if="!loading && filteredReleases.length === 0"
          type="info"
          variant="flat"
          density="comfortable"
          class="text-body-2"
        >
          {{ t('settings.updates.empty') }}
        </v-alert>

        <v-list v-else-if="filteredReleases.length > 0" bg-color="transparent" class="pa-0" density="comfortable">
          <v-list-item
            v-for="rel in filteredReleases"
            :key="rel.id"
            class="release-row px-0"
            rounded="lg"
          >
            <template #prepend>
              <v-avatar color="primary" size="40" variant="tonal" rounded="lg">
                <v-icon icon="mdi-tag-outline" color="primary" />
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ rel.tag_name }}
              <span v-if="rel.name" class="text-medium-emphasis text-body-2"> · {{ rel.name }}</span>
            </v-list-item-title>
            <v-list-item-subtitle class="text-wrap">
              {{ formatPublishedAt(rel.published_at) }}
              <template v-if="rel.prerelease">
                · {{ t('settings.updates.prerelease') }}
              </template>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex flex-column flex-sm-row align-stretch align-sm-center gap-2 ms-2">
                <v-chip
                  v-if="versionBadge(rel)"
                  size="small"
                  :color="versionBadge(rel)!.color"
                  variant="flat"
                  class="text-caption"
                >
                  {{ versionBadge(rel)!.text }}
                </v-chip>
                <div class="d-flex flex-wrap gap-1 justify-end">
                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    @click="openExternal(rel.html_url)"
                  >
                    {{ t('settings.updates.openRelease') }}
                  </v-btn>
                  <v-btn
                    v-if="preferredAsset(rel)"
                    size="small"
                    variant="flat"
                    color="primary"
                    @click="openExternal(preferredAsset(rel)!.browser_download_url)"
                  >
                    {{ t('settings.updates.download') }}
                    <span class="text-caption ms-1 opacity-80">
                      ({{ formatAssetSize(preferredAsset(rel)!.size) }})
                    </span>
                  </v-btn>
                  <v-tooltip v-else location="top">
                    <template #activator="{ props: tipProps }">
                      <span v-bind="tipProps">
                        <v-btn size="small" variant="text" disabled>
                          {{ t('settings.updates.noAssets') }}
                        </v-btn>
                      </span>
                    </template>
                    {{ t('settings.updates.noAssetsHint') }}
                  </v-tooltip>
                </div>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <v-btn variant="text" size="small" color="primary" class="align-self-start" @click="openExternal(GITHUB_RELEASES_WEB)">
          {{ t('settings.updates.openReleasesPage') }}
        </v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.release-row {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.release-row:last-child {
  border-bottom: none;
}
</style>
