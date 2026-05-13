<script setup lang="ts">
import AppGlassSectionCard from '@/components/ui/AppGlassSectionCard.vue';
import { APP_LOG_CLEAR_EVENT } from '@/constants/app-log-sync';
import {
  APP_LOG_LEVELS,
  APP_LOG_MODULES,
  useAppLogStore,
  type AppLogEntry,
  type AppLogLevel,
  type AppLogModule,
} from '@/stores/app-log';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { appSnackbar } from '@/utils/appSnackbar';
import { emit } from '@tauri-apps/api/event';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();
const logStore = useAppLogStore();

const moduleFilter = ref<AppLogModule[]>([]);
const levelFilter = ref<'all' | AppLogLevel>('all');
const search = ref('');
const detailOpen = ref(false);
const detailText = ref('');

/** 级别筛选：下拉项固定英文（与日志行内 `e.level` 一致，便于对照）。 */
const LEVEL_FILTER_LABELS: Record<'all' | AppLogLevel, string> = {
  all: 'All',
  debug: 'Debug',
  info: 'Info',
  warn: 'Warning',
  error: 'Error',
};

const levelItems = computed(() => [
  { title: LEVEL_FILTER_LABELS.all, value: 'all' as const },
  ...APP_LOG_LEVELS.map((lv) => ({
    title: LEVEL_FILTER_LABELS[lv],
    value: lv,
  })),
]);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const mods = new Set(moduleFilter.value);
  const useMod = mods.size > 0;
  const lv = levelFilter.value;
  return logStore.entries.filter((e) => {
    if (useMod && !mods.has(e.module)) return false;
    if (lv !== 'all' && e.level !== lv) return false;
    if (!q) return true;
    const hay = `${e.message}\n${e.detail ?? ''}`.toLowerCase();
    return hay.includes(q);
  });
});

function formatTs(ts: number): string {
  try {
    const lang = locale.value === 'en' ? 'en' : 'zh-CN';
    return new Intl.DateTimeFormat(lang, {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString();
  }
}

function levelColor(lv: AppLogLevel): string {
  if (lv === 'error') return 'error';
  if (lv === 'warn') return 'warning';
  if (lv === 'debug') return 'secondary';
  return 'primary';
}

function levelIcon(lv: AppLogLevel): string {
  if (lv === 'error') return 'mdi-close-circle-outline';
  if (lv === 'warn') return 'mdi-alert-outline';
  if (lv === 'debug') return 'mdi-bug-outline';
  return 'mdi-information-outline';
}

function formatEntry(e: AppLogEntry): string {
  const head = `[${formatTs(e.ts)}] [${t(`settings.logs.modules.${e.module}`)}] [${e.level}] ${e.message}`;
  return e.detail ? `${head}\n${e.detail}` : head;
}

function copyVisible() {
  const body = filtered.value.map(formatEntry).join('\n\n');
  if (!body) {
    appSnackbar.brief(t('settings.logs.copyEmpty'));
    return;
  }
  void navigator.clipboard.writeText(body).then(
    () => {
      appSnackbar.brief(t('settings.logs.copyOk'));
    },
    () => {
      appSnackbar.brief(t('settings.logs.copyFail'));
    },
  );
}

function clearAll() {
  logStore.clear();
  if (isTauriRuntime()) {
    void emit(APP_LOG_CLEAR_EVENT);
  }
}

function showDetail(e: AppLogEntry) {
  detailText.value = formatEntry(e);
  detailOpen.value = true;
}

function onRowClick(e: AppLogEntry) {
  if (e.detail) showDetail(e);
}

function toggleModule(m: AppLogModule) {
  const i = moduleFilter.value.indexOf(m);
  if (i === -1) moduleFilter.value = [...moduleFilter.value, m];
  else moduleFilter.value = moduleFilter.value.filter((x) => x !== m);
}

function clearModuleFilter() {
  moduleFilter.value = [];
}

</script>

<template>
  <div class="d-flex flex-column gap-4">
    <AppGlassSectionCard>
      <template #title>{{ t('settings.logs.cardTitle') }}</template>
      <div class="d-flex flex-column gap-4">
        <p class="text-body-2 text-medium-emphasis mb-0">{{ t('settings.logs.hint') }}</p>

        <div class="d-flex flex-wrap align-center gap-2">
          <span class="text-caption text-medium-emphasis me-1">{{ t('settings.logs.filterModule') }}</span>
          <v-chip
            v-for="m in APP_LOG_MODULES"
            :key="m"
            size="small"
            :variant="moduleFilter.includes(m) ? 'flat' : 'tonal'"
            :color="moduleFilter.includes(m) ? 'primary' : 'default'"
            @click="toggleModule(m)"
          >
            {{ t(`settings.logs.modules.${m}`) }}
          </v-chip>
          <v-btn v-if="moduleFilter.length" size="small" variant="text" @click="clearModuleFilter">
            {{ t('settings.logs.clearModuleFilter') }}
          </v-btn>
        </div>

        <div class="d-flex flex-column flex-sm-row flex-wrap gap-3 align-stretch align-sm-end">
          <v-select
            v-model="levelFilter"
            :items="levelItems"
            item-title="title"
            item-value="value"
            :label="t('settings.logs.filterLevel')"
            density="comfortable"
            variant="outlined"
            hide-details
            rounded="md"
            class="logs-filter-level"
          />
          <v-text-field
            v-model="search"
            :label="t('settings.logs.search')"
            density="comfortable"
            variant="outlined"
            hide-details
            rounded="md"
            clearable
            prepend-inner-icon="mdi-magnify"
            class="grow"
          />
        </div>

        <div class="d-flex flex-wrap gap-2">
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-content-copy" @click="copyVisible">
            {{ t('settings.logs.copyVisible') }}
          </v-btn>
          <v-btn color="error" variant="tonal" prepend-icon="mdi-delete-sweep-outline" @click="clearAll">
            {{ t('settings.logs.clearAll') }}
          </v-btn>
          <v-spacer class="d-none d-sm-flex" />
          <span class="text-caption text-medium-emphasis align-self-center">
            {{ t('settings.logs.showing', { n: filtered.length, total: logStore.count }) }}
          </span>
        </div>
      </div>
    </AppGlassSectionCard>

    <AppGlassSectionCard body-padding="none" class="logs-list-card">
        <div v-if="!filtered.length" class="pa-8 text-center text-medium-emphasis text-body-2">
          {{ t('settings.logs.empty') }}
        </div>
        <v-list v-else density="compact" class="logs-list py-0">
          <v-list-item
            v-for="e in filtered"
            :key="e.id"
            :class="['logs-list-item', e.detail ? 'logs-list-item--clickable' : '']"
            @click="onRowClick(e)"
          >
            <template #prepend>
              <v-icon :color="levelColor(e.level)" :icon="levelIcon(e.level)" size="22" />
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium text-wrap">
              {{ e.message }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption d-flex flex-wrap align-center gap-2 mt-1">
              <span>{{ formatTs(e.ts) }}</span>
              <v-chip size="x-small" variant="tonal" :color="levelColor(e.level)" label>
                {{ e.level }}
              </v-chip>
              <v-chip size="x-small" variant="outlined" label>
                {{ t(`settings.logs.modules.${e.module}`) }}
              </v-chip>
              <v-btn
                v-if="e.detail"
                size="x-small"
                variant="text"
                density="compact"
                prepend-icon="mdi-text-box-outline"
                @click.stop="showDetail(e)"
              >
                {{ t('settings.logs.detail') }}
              </v-btn>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
    </AppGlassSectionCard>

    <v-dialog v-model="detailOpen" max-width="720" scrollable>
      <AppGlassSectionCard body-padding="none">
        <template #title>{{ t('settings.logs.detailTitle') }}</template>
        <div class="pa-4 pt-2">
          <pre class="logs-detail-pre text-body-2">{{ detailText }}</pre>
        </div>
        <div class="d-flex flex-wrap justify-end gap-2 pa-4 pt-0">
          <v-btn variant="text" @click="detailOpen = false">{{ t('common.close') }}</v-btn>
        </div>
      </AppGlassSectionCard>
    </v-dialog>
  </div>
</template>

<style scoped>
.logs-filter-level {
  min-width: 10rem;
  max-width: 14rem;
}

.logs-list-card {
  max-height: min(60vh, 520px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.logs-list-card :deep(.app-glass-section-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.logs-list {
  max-height: min(60vh, 520px);
  overflow-y: auto;
}

.logs-list-item {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.logs-list-item--clickable {
  cursor: pointer;
}

.logs-detail-pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  margin: 0;
}
</style>
