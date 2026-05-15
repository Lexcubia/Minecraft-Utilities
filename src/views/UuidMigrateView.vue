<script setup lang="ts">
import {
  joinPathSegments,
  listServerWorldDirs,
  listSubdirs,
  pathIsFile,
} from '@/api/tauriMinecraftLayout';
import {
  worldUuidListPlayers,
  worldUuidMigrateBatch,
  type WorldPlayerRow,
} from '@/api/worldUuidMigrate';
import AppGlassSectionCard from '@/components/ui/AppGlassSectionCard.vue';
import { appSnackbar } from '@/utils/appSnackbar';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { appLog, truncatePath } from '@/utils/appLog';
import { open } from '@tauri-apps/plugin-dialog';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'UuidMigrateView' });

const { t, locale } = useI18n();

/** 非桌面环境：页内提示 */
const bannerNeedDesktop = ref('');
/** 桌面环境：备份警告，页内固定展示 */
const bannerBackupWarn = ref('');

function setUuidError(msg: string) {
  void appSnackbar.show({
    text: msg,
    color: 'error',
    timeout: 12_000,
    multiLine: true,
    rounded: 'md',
  });
}

const ISOLATED_KEY = 'mu-uuid-migrate-client-isolated';

type UuidMode = 'client' | 'server';

const mode = ref<UuidMode>('client');
const clientIsolated = ref(true);

function setClientIsolatedFromToggle(v: string | string[] | null | undefined) {
  const raw = Array.isArray(v) ? v[0] : v;
  clientIsolated.value = raw === 'on';
}

const clientRoot = ref('');
const serverRoot = ref('');

const versionOptions = ref<string[]>([]);
const selectedVersionId = ref<string | null>(null);
const saveOptions = ref<string[]>([]);
const selectedSaveName = ref<string | null>(null);

const serverWorldOptions = ref<string[]>([]);
const selectedServerWorld = ref<string | null>(null);

const worldFullPath = ref('');
const usercacheFullPath = ref('');
const usercacheExists = ref(false);

const rows = ref<(WorldPlayerRow & { toUuid: string })[]>([]);
const loading = ref(false);
const logText = ref('');

const canUse = computed(() => isTauriRuntime());

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isValidUuid(s: string): boolean {
  const x = s.trim();
  if (!x) return false;
  if (UUID_RE.test(x)) return true;
  const h = x.replace(/-/g, '');
  return h.length === 32 && /^[0-9a-fA-F]+$/.test(h);
}

function normalizeUuid(s: string): string {
  const x = s.trim();
  const h = x.replace(/-/g, '').toLowerCase();
  if (h.length !== 32 || !/^[0-9a-f]+$/.test(h)) return '';
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function displayPlayerName(r: WorldPlayerRow & { toUuid: string }): string {
  const n = (r.name ?? '').trim();
  if (n) return n;
  return t('tools.uuidMigrate.nameUnknown');
}

const validPairs = computed(() => {
  const out: { from: string; to: string }[] = [];
  for (const r of rows.value) {
    const to = r.toUuid.trim();
    if (!to || !isValidUuid(to)) continue;
    const toCanon = normalizeUuid(to);
    if (!toCanon) continue;
    const from = r.uuid.toLowerCase();
    if (from === toCanon) continue;
    out.push({ from, to: toCanon });
  }
  return out;
});

const worldBasename = computed(() => {
  const raw = worldFullPath.value.trim();
  if (!raw) return '';
  const norm = raw.replace(/\\/g, '/');
  const segs = norm.split('/').filter(Boolean);
  return segs.length ? segs[segs.length - 1] : norm;
});

function resetSelections() {
  versionOptions.value = [];
  selectedVersionId.value = null;
  saveOptions.value = [];
  selectedSaveName.value = null;
  serverWorldOptions.value = [];
  selectedServerWorld.value = null;
  worldFullPath.value = '';
  rows.value = [];
  logText.value = '';
}

watch(mode, () => {
  resetSelections();
  clientRoot.value = '';
  serverRoot.value = '';
  usercacheFullPath.value = '';
  usercacheExists.value = false;
});

watch(clientIsolated, () => {
  localStorage.setItem(ISOLATED_KEY, clientIsolated.value ? '1' : '0');
  if (mode.value !== 'client' || !clientRoot.value) return;
  resetSelections();
  void bootstrapClientDirs().then(() => {
    updateClientUsercachePath();
    void checkUsercache();
  });
});

onMounted(() => {
  const v = localStorage.getItem(ISOLATED_KEY);
  clientIsolated.value = v !== '0';
});

watch([canUse, locale], ([cu]) => {
  bannerNeedDesktop.value = '';
  bannerBackupWarn.value = '';
  if (!cu) {
    bannerNeedDesktop.value = t('tools.uuidMigrate.needDesktop');
  } else {
    bannerBackupWarn.value = t('tools.uuidMigrate.backupWarn');
  }
}, { immediate: true });

async function checkUsercache() {
  if (!usercacheFullPath.value.trim()) {
    usercacheExists.value = false;
    return;
  }
  try {
    usercacheExists.value = await pathIsFile(usercacheFullPath.value.trim());
  } catch {
    usercacheExists.value = false;
  }
}

/** 客户端：非隔离用 .minecraft/usercache.json；隔离用 versions/版本目录/usercache.json */
function updateClientUsercachePath() {
  if (!clientRoot.value) {
    usercacheFullPath.value = '';
    return;
  }
  if (clientIsolated.value) {
    if (selectedVersionId.value) {
      usercacheFullPath.value = joinPathSegments(
        clientRoot.value,
        'versions',
        selectedVersionId.value,
        'usercache.json',
      );
    } else {
      usercacheFullPath.value = '';
    }
  } else {
    usercacheFullPath.value = joinPathSegments(clientRoot.value, 'usercache.json');
  }
}

async function bootstrapClientDirs() {
  if (!clientRoot.value) return;
  try {
    if (clientIsolated.value) {
      versionOptions.value = await listSubdirs(joinPathSegments(clientRoot.value, 'versions'));
      saveOptions.value = [];
      selectedVersionId.value = null;
      selectedSaveName.value = null;
    } else {
      saveOptions.value = await listSubdirs(joinPathSegments(clientRoot.value, 'saves'));
      versionOptions.value = [];
      selectedVersionId.value = null;
      selectedSaveName.value = null;
    }
  } catch (e) {
    setUuidError(e instanceof Error ? e.message : String(e));
  }
}

async function pickClientMinecraft() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: t('tools.uuidMigrate.pickMinecraftTitle'),
  });
  if (selected === null) return;
  const path = typeof selected === 'string' ? selected : selected[0];
  resetSelections();
  clientRoot.value = path;
  appLog('uuid_migrate', 'info', t('tools.uuidMigrate.logPickClient'), truncatePath(path));
  await bootstrapClientDirs();
  updateClientUsercachePath();
  await checkUsercache();
}

async function onVersionSelected(id: string | null) {
  selectedVersionId.value = id;
  selectedSaveName.value = null;
  worldFullPath.value = '';
  rows.value = [];
  if (!id || !clientRoot.value) {
    saveOptions.value = [];
    updateClientUsercachePath();
    await checkUsercache();
    return;
  }
  try {
    const savesDir = joinPathSegments(clientRoot.value, 'versions', id, 'saves');
    saveOptions.value = await listSubdirs(savesDir);
  } catch (e) {
    saveOptions.value = [];
    setUuidError(e instanceof Error ? e.message : String(e));
  }
  updateClientUsercachePath();
  await checkUsercache();
}

async function onSaveSelected(name: string | null) {
  selectedSaveName.value = name;
  worldFullPath.value = '';
  rows.value = [];
  if (!name || !clientRoot.value) return;
  if (clientIsolated.value) {
    if (!selectedVersionId.value) return;
    worldFullPath.value = joinPathSegments(
      clientRoot.value,
      'versions',
      selectedVersionId.value,
      'saves',
      name,
    );
  } else {
    worldFullPath.value = joinPathSegments(clientRoot.value, 'saves', name);
  }
  await refreshPlayers();
}

async function pickServerRoot() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: t('tools.uuidMigrate.pickServerTitle'),
  });
  if (selected === null) return;
  const path = typeof selected === 'string' ? selected : selected[0];
  resetSelections();
  serverRoot.value = path;
  appLog('uuid_migrate', 'info', t('tools.uuidMigrate.logPickServer'), truncatePath(path));
  usercacheFullPath.value = joinPathSegments(path, 'usercache.json');
  await checkUsercache();
  try {
    serverWorldOptions.value = await listServerWorldDirs(path);
  } catch (e) {
    serverWorldOptions.value = [];
    setUuidError(e instanceof Error ? e.message : String(e));
  }
}

async function onServerWorldSelected(name: string | null) {
  selectedServerWorld.value = name;
  worldFullPath.value = '';
  rows.value = [];
  if (!name || !serverRoot.value) return;
  worldFullPath.value = joinPathSegments(serverRoot.value, name);
  await refreshPlayers();
}

async function refreshPlayers() {
  logText.value = '';
  if (!worldFullPath.value.trim() || !usercacheFullPath.value.trim()) {
    return;
  }
  loading.value = true;
  try {
    await checkUsercache();
    const list = await worldUuidListPlayers(
      worldFullPath.value.trim(),
      usercacheFullPath.value.trim(),
    );
    rows.value = list.map((p) => ({ ...p, toUuid: '' }));
    if (list.length) {
      appLog(
        'uuid_migrate',
        'info',
        t('tools.uuidMigrate.logLoadedPlayers', { n: list.length }),
        truncatePath(worldFullPath.value.trim()),
      );
    }
    if (!list.length) {
      setUuidError(t('tools.uuidMigrate.errNoPlayers'));
    }
  } catch (e) {
    setUuidError(e instanceof Error ? e.message : String(e));
    rows.value = [];
    appLog(
      'uuid_migrate',
      'error',
      t('tools.uuidMigrate.logLoadPlayersFailed'),
      e instanceof Error ? e.message : String(e),
    );
  } finally {
    loading.value = false;
  }
}

async function runMigrate(dryRun: boolean) {
  logText.value = '';
  if (!worldFullPath.value.trim()) {
    setUuidError(t('tools.uuidMigrate.errNoWorld'));
    return;
  }
  const pairs = validPairs.value;
  if (!pairs.length) {
    setUuidError(t('tools.uuidMigrate.errNoMappings'));
    return;
  }
  loading.value = true;
  try {
    const out = await worldUuidMigrateBatch(worldFullPath.value.trim(), pairs, dryRun);
    logText.value = out;
    appLog(
      'uuid_migrate',
      'info',
      t('tools.uuidMigrate.logMigrateDone', {
        mode: dryRun ? t('tools.uuidMigrate.dryRun') : t('tools.uuidMigrate.apply'),
      }),
      out || undefined,
    );
  } catch (e) {
    setUuidError(e instanceof Error ? e.message : String(e));
    appLog(
      'uuid_migrate',
      'error',
      t('tools.uuidMigrate.logMigrateFailed'),
      e instanceof Error ? e.message : String(e),
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="uuid-migrate-page mx-auto px-3 px-sm-6 py-6 py-md-8">
    <header class="uuid-hero mb-6 mb-md-8">
      <div class="d-flex flex-column flex-sm-row align-start gap-4">
        <v-avatar class="uuid-hero-icon flex-shrink-0" color="primary" variant="tonal" size="52" rounded="xl">
          <v-icon icon="mdi-swap-horizontal" size="30" />
        </v-avatar>
        <div class="min-width-0 flex-grow-1">
          <h1 class="text-h4 text-sm-h3 font-weight-bold mb-2">{{ t('tools.uuidMigrate.title') }}</h1>
          <p class="text-body-2 text-md-body-1 text-medium-emphasis mb-0 uuid-intro">
            {{ t('tools.uuidMigrate.intro') }}
          </p>
        </div>
      </div>
    </header>

    <section
      class="uuid-page-banners d-flex flex-column ga-3 mb-5"
      role="region"
      :aria-label="t('tools.uuidMigrate.pageBannersAria')"
    >
      <v-alert
        v-if="bannerNeedDesktop"
        type="info"
        variant="tonal"
        density="comfortable"
        rounded="lg"
        class="uuid-page-banner mb-0"
      >
        {{ bannerNeedDesktop }}
      </v-alert>
      <v-alert
        v-if="bannerBackupWarn"
        type="warning"
        variant="tonal"
        density="comfortable"
        rounded="lg"
        class="uuid-page-banner mb-0"
      >
        {{ bannerBackupWarn }}
      </v-alert>
    </section>

    <AppGlassSectionCard v-if="canUse" class="mb-5" body-padding="none">
      <template #head>
        <div class="d-flex flex-wrap align-start gap-3 pa-4 pt-5 pb-2">
          <v-icon icon="mdi-folder-cog-outline" color="primary" size="26" class="flex-shrink-0 mt-0" />
          <div class="flex-grow-1 min-width-0 ps-1">
            <div class="text-h6 font-weight-semibold">
              {{ t('tools.uuidMigrate.sectionSetup') }}
            </div>
            <div class="text-body-2 text-medium-emphasis text-wrap">
              {{ t('tools.uuidMigrate.modeLabel') }}
            </div>
          </div>
        </div>
      </template>

      <div class="px-5 pb-5 pt-0">
        <v-btn-toggle
          v-model="mode"
          mandatory
          divided
          color="primary"
          density="compact"
          class="uuid-mode-toggle app-btn-toggle-segmented mb-5"
        >
          <v-btn value="client" variant="tonal" prepend-icon="mdi-monitor">
            {{ t('tools.uuidMigrate.modeClient') }}
          </v-btn>
          <v-btn value="server" variant="tonal" prepend-icon="mdi-server">
            {{ t('tools.uuidMigrate.modeServer') }}
          </v-btn>
        </v-btn-toggle>

        <template v-if="mode === 'client'">
          <div class="d-flex flex-column flex-sm-row flex-wrap align-stretch align-sm-center gap-3 gap-sm-4 mb-4">
            <v-btn
              color="primary"
              variant="flat"
              size="large"
              rounded="lg"
              class="uuid-primary-btn"
              :disabled="loading"
              prepend-icon="mdi-folder-open-outline"
              @click="pickClientMinecraft"
            >
              {{ t('tools.uuidMigrate.pickMinecraft') }}
            </v-btn>
            <div class="uuid-client-isolated-toggle flex-grow-1 flex-sm-grow-0 d-flex flex-column gap-1">
              <div class="text-caption text-medium-emphasis">{{ t('tools.uuidMigrate.clientIsolated') }}</div>
              <v-btn-toggle
                :model-value="clientIsolated ? 'on' : 'off'"
                mandatory
                divided
                density="compact"
                color="primary"
                variant="outlined"
                class="uuid-client-isolated-toggle__btns app-btn-toggle-segmented"
                @update:model-value="setClientIsolatedFromToggle"
              >
                <v-btn value="on" variant="tonal" min-width="64">{{ t('common.on') }}</v-btn>
                <v-btn value="off" variant="tonal" min-width="64">{{ t('common.off') }}</v-btn>
              </v-btn-toggle>
            </div>
          </div>
          <v-sheet
            v-if="clientRoot"
            class="uuid-path-box rounded-lg pa-3 mb-4"
            color="surface-variant"
            variant="tonal"
          >
            <div class="text-caption text-medium-emphasis mb-1">{{ t('tools.uuidMigrate.pickMinecraft') }}</div>
            <div class="text-body-2 font-mono text-break">{{ clientRoot }}</div>
          </v-sheet>
          <v-row dense class="mb-1">
            <v-col v-if="clientRoot && clientIsolated && versionOptions.length" cols="12" md="6">
              <v-select
                v-model="selectedVersionId"
                :items="versionOptions"
                :label="t('tools.uuidMigrate.selectVersion')"
                density="comfortable"
                variant="outlined"
                hide-details
                rounded="lg"
                clearable
                prepend-inner-icon="mdi-tag-outline"
                @update:model-value="onVersionSelected"
              />
            </v-col>
            <v-col v-if="clientRoot && saveOptions.length && (!clientIsolated || selectedVersionId)" cols="12" md="6">
              <v-select
                v-model="selectedSaveName"
                :items="saveOptions"
                :label="t('tools.uuidMigrate.selectSave')"
                density="comfortable"
                variant="outlined"
                hide-details
                rounded="lg"
                clearable
                prepend-inner-icon="mdi-book-outline"
                @update:model-value="onSaveSelected"
              />
            </v-col>
          </v-row>
        </template>

        <template v-else>
          <div class="mb-4">
            <v-btn
              color="primary"
              variant="flat"
              size="large"
              rounded="lg"
              class="uuid-primary-btn"
              :disabled="loading"
              prepend-icon="mdi-folder-open-outline"
              @click="pickServerRoot"
            >
              {{ t('tools.uuidMigrate.pickServer') }}
            </v-btn>
          </div>
          <v-sheet
            v-if="serverRoot"
            class="uuid-path-box rounded-lg pa-3 mb-4"
            color="surface-variant"
            variant="tonal"
          >
            <div class="text-caption text-medium-emphasis mb-1">{{ t('tools.uuidMigrate.pickServer') }}</div>
            <div class="text-body-2 font-mono text-break">{{ serverRoot }}</div>
          </v-sheet>
          <v-select
            v-if="serverRoot && serverWorldOptions.length"
            v-model="selectedServerWorld"
            :items="serverWorldOptions"
            :label="t('tools.uuidMigrate.selectServerWorld')"
            density="comfortable"
            variant="outlined"
            hide-details
            rounded="lg"
            clearable
            prepend-inner-icon="mdi-earth"
            class="max-w-md"
            @update:model-value="onServerWorldSelected"
          />
        </template>

        <v-divider class="my-5 border-opacity-25" />

        <div class="d-flex flex-column flex-sm-row flex-wrap align-start align-sm-center gap-2 gap-sm-3 mb-2">
          <div class="d-flex align-center gap-2 text-subtitle-2 font-weight-medium">
            <v-icon icon="mdi-file-document-outline" size="20" class="text-medium-emphasis" />
            {{ t('tools.uuidMigrate.usercachePathLabel') }}
          </div>
          <v-chip
            v-if="usercacheFullPath"
            size="small"
            :color="usercacheExists ? 'success' : 'warning'"
            variant="tonal"
            class="font-weight-medium"
            :prepend-icon="usercacheExists ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'"
          >
            {{ usercacheExists ? t('tools.uuidMigrate.usercacheOk') : t('tools.uuidMigrate.usercacheMissing') }}
          </v-chip>
        </div>
        <v-sheet class="uuid-path-box uuid-path-box--sm rounded-lg pa-3 mb-3" color="surface-variant" variant="tonal">
          <span class="text-body-2 font-mono text-break">{{ usercacheFullPath || '—' }}</span>
        </v-sheet>
        <v-btn
          v-if="worldFullPath"
          variant="tonal"
          color="primary"
          rounded="lg"
          :disabled="loading"
          prepend-icon="mdi-refresh"
          @click="refreshPlayers"
        >
          {{ t('tools.uuidMigrate.reload') }}
        </v-btn>
      </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard
      v-if="canUse && worldFullPath"
      class="uuid-player-card mb-4 overflow-hidden"
      body-padding="none"
    >
      <template #overline>
        <v-progress-linear v-if="loading" indeterminate color="primary" class="uuid-progress" />
      </template>
      <template #head>
        <div class="uuid-player-header py-4 px-5">
          <div class="d-flex flex-wrap align-start gap-3">
            <v-icon icon="mdi-account-multiple-outline" color="primary" size="26" class="flex-shrink-0" />
            <div class="flex-grow-1 min-width-0 ps-1">
              <div class="text-h6 font-weight-semibold d-flex flex-wrap align-center gap-2">
                {{ t('tools.uuidMigrate.sectionPlayers') }}
                <v-chip
                  v-if="worldBasename"
                  size="small"
                  variant="tonal"
                  color="primary"
                  class="font-weight-medium"
                  prepend-icon="mdi-folder-outline"
                >
                  {{ t('tools.uuidMigrate.currentWorldChip', { name: worldBasename }) }}
                </v-chip>
                <v-spacer class="d-none d-sm-flex" />
                <span v-if="rows.length" class="text-caption text-medium-emphasis ms-sm-auto">
                  {{ t('tools.uuidMigrate.playerCount', { n: rows.length }) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-if="rows.length" class="uuid-player-list pa-3 pa-sm-4">
        <div
          v-for="(r, i) in rows"
          :key="r.uuid + String(i)"
          class="uuid-player-row d-flex flex-column flex-md-row flex-wrap align-stretch align-md-center gap-3 px-4 py-4 rounded-md mb-3"
        >
          <div class="uuid-player-identity d-flex flex-grow-1 align-center gap-3 min-width-0">
            <v-avatar size="40" color="primary" variant="tonal" rounded="lg" class="flex-shrink-0">
              <v-icon icon="mdi-account" size="22" />
            </v-avatar>
            <div class="min-width-0 flex-grow-1">
              <div class="text-body-1 font-weight-semibold text-truncate">{{ displayPlayerName(r) }}</div>
              <v-chip
                label
                size="small"
                variant="tonal"
                color="primary"
                class="uuid-chip font-mono text-caption mt-1"
              >
                {{ r.uuid }}
              </v-chip>
            </div>
          </div>
          <v-text-field
            v-model="r.toUuid"
            density="comfortable"
            variant="outlined"
            hide-details
            rounded="lg"
            :label="t('tools.uuidMigrate.colTo')"
            :placeholder="t('tools.uuidMigrate.toPlaceholder')"
            class="uuid-replace-field"
            prepend-inner-icon="mdi-identifier"
            style="flex: 1 1 280px; max-width: 100%"
            @click.stop
          />
        </div>
      </div>

      <div v-else-if="loading" class="py-12 text-center">
        <v-progress-circular indeterminate color="primary" size="40" width="3" class="mb-3" />
        <div class="text-body-2 text-medium-emphasis">{{ t('tools.uuidMigrate.loadingPlayers') }}</div>
      </div>

      <div v-else class="py-12 text-center">
        <v-icon icon="mdi-account-off-outline" size="48" class="text-disabled mb-2" />
        <div class="text-body-2 text-medium-emphasis">{{ t('tools.uuidMigrate.waitOrEmpty') }}</div>
      </div>

      <v-divider v-if="rows.length" class="border-opacity-10" />

      <div v-if="rows.length" class="uuid-player-actions pa-4 pa-sm-5 flex-wrap gap-3 d-flex">
        <v-btn
          color="primary"
          variant="tonal"
          size="large"
          rounded="lg"
          :disabled="loading"
          prepend-icon="mdi-eye-outline"
          @click="runMigrate(true)"
        >
          {{ t('tools.uuidMigrate.dryRun') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          size="large"
          rounded="lg"
          :disabled="loading"
          prepend-icon="mdi-play"
          @click="runMigrate(false)"
        >
          {{ t('tools.uuidMigrate.apply') }}
        </v-btn>
        <v-spacer class="d-none d-md-flex" />
        <span class="text-caption text-medium-emphasis align-self-center">
          {{ t('tools.uuidMigrate.mappingCount', { n: validPairs.length }) }}
        </span>
      </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard v-if="logText" class="mb-5">
      <template #title>
        <span class="d-inline-flex align-center gap-2">
          <v-icon icon="mdi-text-box-outline" size="22" />
          <span>{{ t('tools.uuidMigrate.logTitle') }}</span>
        </span>
      </template>
      <div>
        <p class="text-caption text-medium-emphasis mb-3">{{ t('tools.uuidMigrate.logScopeHint') }}</p>
        <pre class="log-pre text-body-2">{{ logText }}</pre>
      </div>
    </AppGlassSectionCard>
  </div>
</template>

<style scoped>
.uuid-migrate-page {
  max-width: 920px;
}

.uuid-hero-icon {
  box-shadow: 0 2px 12px rgba(var(--v-theme-primary), 0.22);
}

.uuid-intro {
  line-height: 1.55;
  max-width: 52rem;
}

.uuid-mode-toggle {
  display: flex;
  width: 100%;
  max-width: 22rem;
}

.uuid-mode-toggle :deep(.v-btn) {
  flex: 1 1 0;
}

.uuid-primary-btn {
  min-width: 8.5rem;
}

.uuid-client-isolated-toggle {
  min-width: 0;
}

.uuid-client-isolated-toggle__btns {
  align-self: flex-start;
}

.uuid-path-box {
  border: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.85));
}

.uuid-path-box--sm {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
}

.uuid-player-header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.log-pre {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 360px;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  border-radius: var(--app-radius-sm);
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.uuid-player-row {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.uuid-player-row:hover {
  border-color: rgba(var(--v-theme-primary), 0.35);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
}

.uuid-chip {
  max-width: min(100%, 22rem);
  overflow: hidden;
  text-overflow: ellipsis;
}

.uuid-replace-field :deep(.v-field) {
  margin-bottom: 0;
}

.uuid-progress {
  margin: 0;
}

.uuid-player-actions {
  background: rgba(var(--v-theme-on-surface), 0.02);
}
</style>
