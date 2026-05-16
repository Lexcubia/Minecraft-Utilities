<script setup lang="ts">
import { joinPathSegments } from '@/api/tauriMinecraftLayout';
import {
  saveEditorInspectDat,
  saveEditorListDats,
  type DatFileRow,
  type DatInspectResult,
  type NbtTreeNode,
} from '@/api/saveEditor';
import AppGlassSectionCard from '@/components/ui/AppGlassSectionCard.vue';
import { appSnackbar } from '@/utils/appSnackbar';
import { isTauriRuntime } from '@/utils/isTauriRuntime';
import { appLog, truncatePath } from '@/utils/appLog';
import { open } from '@tauri-apps/plugin-dialog';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'SaveEditorView' });

const { t } = useI18n();

type VTreeItem = {
  id: string;
  title: string;
  children?: VTreeItem[];
  raw: NbtTreeNode;
};

const folderRoot = ref('');

const datFiles = ref<DatFileRow[]>([]);
const selectedDatRel = ref<string | null>(null);
const inspectResult = ref<DatInspectResult | null>(null);
const loadingList = ref(false);
const loadingInspect = ref(false);
const activated = ref<string[]>([]);

const canUse = computed(() => isTauriRuntime());
const hasFolder = computed(() => Boolean(folderRoot.value.trim()));

const folderBasename = computed(() => {
  const raw = folderRoot.value.trim();
  if (!raw) return '';
  const norm = raw.replace(/\\/g, '/');
  const segs = norm.split('/').filter(Boolean);
  return segs.length ? segs[segs.length - 1] : norm;
});

const selectedDatFullPath = computed(() => {
  if (!selectedDatRel.value || !folderRoot.value.trim()) return '';
  return joinPathSegments(folderRoot.value.trim(), selectedDatRel.value);
});

const treeItems = computed((): VTreeItem[] => {
  const tree = inspectResult.value?.tree;
  if (!tree) return [];
  return [mapNodeToTreeItem(tree, 'root')];
});

const selectedNode = computed((): NbtTreeNode | null => {
  const id = activated.value[0];
  if (!id || !inspectResult.value?.tree) return inspectResult.value?.tree ?? null;
  return findNodeById(inspectResult.value.tree, id);
});

const selectedNodeJson = computed(() => {
  const n = selectedNode.value;
  if (!n) return '';
  return JSON.stringify(n, null, 2);
});

const exportJson = computed(() => {
  if (!inspectResult.value) return '';
  return JSON.stringify(inspectResult.value, null, 2);
});

const showFileList = computed(() => hasFolder.value);
const showTreePanel = computed(() => Boolean(inspectResult.value || loadingInspect.value));

function setError(msg: string) {
  void appSnackbar.show({
    text: msg,
    color: 'error',
    timeout: 12_000,
    multiLine: true,
    rounded: 'md',
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

function nodeTitle(n: NbtTreeNode): string {
  const label = n.name || t('tools.saveEditor.treeRoot');
  if (n.children?.length || n.truncated) {
    let suffix = `<${n.tag}>`;
    if (n.truncated && n.total_count != null) {
      const shown = n.children?.length ?? 0;
      suffix += ` (${shown}/${n.total_count})`;
    }
    return `${label} ${suffix}`;
  }
  const val = n.display ?? formatScalar(n.value);
  return `${label}: ${val} <${n.tag}>`;
}

function mapNodeToTreeItem(n: NbtTreeNode, fallbackId: string): VTreeItem {
  const id = n.path || fallbackId;
  const item: VTreeItem = {
    id,
    title: nodeTitle(n),
    raw: n,
  };
  if (n.children?.length) {
    item.children = n.children.map((c, i) => mapNodeToTreeItem(c, `${id}-${i}`));
  }
  return item;
}

function findNodeById(root: NbtTreeNode, id: string): NbtTreeNode | null {
  if ((root.path || '') === id || (id === 'root' && !root.path)) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const hit = findNodeById(c, id);
    if (hit) return hit;
  }
  return null;
}

function resetInspect() {
  selectedDatRel.value = null;
  inspectResult.value = null;
  activated.value = [];
}

function resetFolderState() {
  folderRoot.value = '';
  datFiles.value = [];
  resetInspect();
}

async function openFolder() {
  const selected = await open({
    directory: true,
    multiple: false,
    title: t('tools.saveEditor.openFolderTitle'),
  });
  if (selected === null) return;
  const path = typeof selected === 'string' ? selected : selected[0];
  folderRoot.value = path;
  resetInspect();
  appLog('save_editor', 'info', t('tools.saveEditor.logOpenFolder'), truncatePath(path));
  await refreshDatList();
}

async function openFile() {
  const selected = await open({
    directory: false,
    multiple: false,
    title: t('tools.saveEditor.openFileTitle'),
    filters: [{ name: 'NBT .dat', extensions: ['dat'] }],
  });
  if (selected === null) return;
  const path = typeof selected === 'string' ? selected : selected[0];
  resetFolderState();
  await loadInspect(path);
}

async function refreshDatList() {
  resetInspect();
  if (!folderRoot.value.trim()) return;
  loadingList.value = true;
  try {
    datFiles.value = await saveEditorListDats(folderRoot.value.trim());
    appLog(
      'save_editor',
      'info',
      t('tools.saveEditor.logListedDats', { n: datFiles.value.length }),
      truncatePath(folderRoot.value.trim()),
    );
    if (!datFiles.value.length) {
      setError(t('tools.saveEditor.errNoDats'));
    }
  } catch (e) {
    datFiles.value = [];
    setError(e instanceof Error ? e.message : String(e));
  } finally {
    loadingList.value = false;
  }
}

async function onDatSelected(rel: string | null) {
  selectedDatRel.value = rel;
  inspectResult.value = null;
  activated.value = [];
  if (!rel) return;
  const full = selectedDatFullPath.value;
  if (!full) return;
  await loadInspect(full);
}

async function loadInspect(datPath: string) {
  loadingInspect.value = true;
  try {
    const result = await saveEditorInspectDat(datPath);
    inspectResult.value = result;
    if (!result.read_ok || !result.tree) {
      setError(result.error ?? t('tools.saveEditor.errParse'));
    } else {
      activated.value = [result.tree.path || 'root'];
      appLog('save_editor', 'info', t('tools.saveEditor.logInspectOk'), truncatePath(datPath));
    }
  } catch (e) {
    inspectResult.value = null;
    setError(e instanceof Error ? e.message : String(e));
  } finally {
    loadingInspect.value = false;
  }
}

async function copyExportJson() {
  const body = exportJson.value;
  if (!body) return;
  try {
    await navigator.clipboard.writeText(body);
    void appSnackbar.show({ text: t('tools.saveEditor.copyOk'), color: 'success', timeout: 4000 });
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e));
  }
}

function downloadExportJson() {
  const body = exportJson.value;
  if (!body) return;
  const base =
    selectedDatRel.value?.replace(/[^\w.-]+/g, '_') ||
    inspectResult.value?.path.split(/[/\\]/).pop()?.replace(/\.dat$/i, '') ||
    'nbt-export';
  const blob = new Blob([body], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="save-editor-page mx-auto px-3 px-sm-4 py-4">
    <header class="save-editor-page-head mb-3">
      <h1 class="save-editor-page-title text-subtitle-1 font-weight-semibold mb-0">
        {{ t('tools.saveEditor.title') }}
      </h1>
    </header>

    <AppGlassSectionCard v-if="canUse" class="mb-3 save-editor-toolbar-card">
      <div class="d-flex flex-wrap align-center gap-2">
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          rounded="lg"
          prepend-icon="mdi-folder-open-outline"
          @click="openFolder"
        >
          {{ t('tools.saveEditor.openFolder') }}
        </v-btn>
        <v-btn
          variant="tonal"
          color="secondary"
          size="small"
          rounded="lg"
          prepend-icon="mdi-file-document-outline"
          @click="openFile"
        >
          {{ t('tools.saveEditor.openFile') }}
        </v-btn>
        <v-btn
          v-if="hasFolder"
          variant="text"
          size="small"
          :loading="loadingList"
          prepend-icon="mdi-refresh"
          @click="refreshDatList"
        >
          {{ t('tools.saveEditor.reloadDats') }}
        </v-btn>
      </div>
    </AppGlassSectionCard>

    <v-row v-if="canUse && (showFileList || showTreePanel)" class="ga-3">
      <v-col v-if="showFileList" cols="12" md="4">
        <AppGlassSectionCard body-padding="none">
          <template #head>
            <div class="save-editor-section-head pa-3 pb-1">
              <div class="text-body-2 font-weight-medium">{{ t('tools.saveEditor.datListTitle') }}</div>
              <div v-if="folderBasename" class="text-caption text-medium-emphasis">
                {{ t('tools.saveEditor.currentFolderChip', { name: folderBasename }) }}
              </div>
            </div>
          </template>
          <v-list
            v-if="datFiles.length"
            density="compact"
            nav
            class="save-editor-dat-list"
            :selected="selectedDatRel ? [selectedDatRel] : []"
          >
            <v-list-item
              v-for="row in datFiles"
              :key="row.relative_path"
              :value="row.relative_path"
              :title="row.relative_path"
              :subtitle="
                formatBytes(row.size) +
                (row.read_ok ? '' : ` · ${t('tools.saveEditor.datUnreadable')}`)
              "
              :disabled="!row.read_ok"
              rounded="md"
              @click="onDatSelected(row.relative_path)"
            />
          </v-list>
          <div v-else-if="!loadingList" class="pa-3 text-caption text-medium-emphasis">
            {{ t('tools.saveEditor.datListEmpty') }}
          </div>
          <div v-else class="pa-3 text-caption text-medium-emphasis">
            {{ t('tools.saveEditor.loadingDats') }}
          </div>
        </AppGlassSectionCard>
      </v-col>

      <v-col v-if="showTreePanel" cols="12" :md="showFileList ? 8 : 12">
        <AppGlassSectionCard body-padding="none" class="mb-3">
          <template #head>
            <div class="save-editor-section-head d-flex flex-wrap align-center gap-2 pa-3 pb-1">
              <div class="text-body-2 font-weight-medium flex-grow-1">
                {{ t('tools.saveEditor.treeTitle') }}
              </div>
              <v-btn
                size="small"
                variant="tonal"
                :disabled="!exportJson"
                prepend-icon="mdi-content-copy"
                @click="copyExportJson"
              >
                {{ t('tools.saveEditor.copyJson') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                :disabled="!exportJson"
                prepend-icon="mdi-download"
                @click="downloadExportJson"
              >
                {{ t('tools.saveEditor.saveJson') }}
              </v-btn>
            </div>
            <div v-if="inspectResult?.read_ok" class="px-3 pb-2 text-caption text-medium-emphasis">
              {{
                t('tools.saveEditor.inspectMeta', {
                  dv: inspectResult.data_version ?? '—',
                  gzip: inspectResult.gzipped
                    ? t('tools.saveEditor.gzipYes')
                    : t('tools.saveEditor.gzipNo'),
                  size: formatBytes(inspectResult.file_size),
                })
              }}
            </div>
          </template>
          <div v-if="loadingInspect" class="pa-3 text-caption text-medium-emphasis">
            {{ t('tools.saveEditor.loadingTree') }}
          </div>
          <v-treeview
            v-else-if="treeItems.length"
            v-model:activated="activated"
            :items="treeItems"
            item-value="id"
            item-title="title"
            item-children="children"
            activatable
            density="compact"
            open-all
            class="save-editor-tree pa-2 font-monospace"
          />
          <div v-else class="pa-3 text-caption text-medium-emphasis">
            {{ t('tools.saveEditor.treeEmpty') }}
          </div>
        </AppGlassSectionCard>

        <AppGlassSectionCard v-if="selectedNodeJson" body-padding="none">
          <template #head>
            <div class="save-editor-section-head pa-3 pb-1 text-body-2 font-weight-medium">
              {{ t('tools.saveEditor.nodeDetailTitle') }}
            </div>
          </template>
          <pre class="save-editor-json pa-3 ma-0 text-caption">{{ selectedNodeJson }}</pre>
        </AppGlassSectionCard>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.save-editor-page-title {
  font-size: var(--app-text-subtitle-1-size, 1rem);
  line-height: var(--app-text-subtitle-1-line-height, 1.375rem);
}

.save-editor-toolbar-card :deep(.app-glass-section-card__body) {
  padding: 0.75rem 1rem;
}

.save-editor-tree {
  max-height: min(52vh, 520px);
  overflow: auto;
}

.save-editor-json {
  max-height: min(40vh, 360px);
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--app-font-mono, ui-monospace, monospace);
}

.save-editor-dat-list {
  max-height: min(52vh, 520px);
  overflow: auto;
}
</style>
