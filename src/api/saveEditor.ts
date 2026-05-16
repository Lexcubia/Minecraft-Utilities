import { invoke } from '@tauri-apps/api/core';
import { appLog, truncatePath } from '@/utils/appLog';

export type DatFileRow = {
  relative_path: string;
  size: number;
  read_ok: boolean;
};

export type NbtTreeNode = {
  name: string;
  tag: string;
  path: string;
  value?: unknown;
  display?: string;
  children?: NbtTreeNode[];
  truncated?: boolean;
  total_count?: number;
};

export type DatInspectResult = {
  path: string;
  read_ok: boolean;
  gzipped: boolean | null;
  file_size: number;
  data_version: number | null;
  tree: NbtTreeNode | null;
  error: string | null;
};

function normalizeDatRow(entry: unknown): DatFileRow {
  const o = entry as Record<string, unknown>;
  const rel = o.relative_path ?? o.relativePath;
  const readOk = o.read_ok ?? o.readOk;
  const sizeRaw = o.size;
  return {
    relative_path: typeof rel === 'string' ? rel : String(rel ?? ''),
    size: typeof sizeRaw === 'number' && Number.isFinite(sizeRaw) ? sizeRaw : 0,
    read_ok: readOk === true,
  };
}

function normalizeTreeNode(raw: unknown): NbtTreeNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const childrenRaw = o.children;
  let children: NbtTreeNode[] | undefined;
  if (Array.isArray(childrenRaw)) {
    children = childrenRaw
      .map((c) => normalizeTreeNode(c))
      .filter((c): c is NbtTreeNode => c !== null);
  }
  const totalRaw = o.total_count ?? o.totalCount;
  return {
    name: typeof o.name === 'string' ? o.name : '',
    tag: typeof o.tag === 'string' ? o.tag : 'Unknown',
    path: typeof o.path === 'string' ? o.path : '',
    value: o.value,
    display: typeof o.display === 'string' ? o.display : undefined,
    children: children?.length ? children : undefined,
    truncated: o.truncated === true,
    total_count: typeof totalRaw === 'number' && Number.isFinite(totalRaw) ? totalRaw : undefined,
  };
}

function normalizeInspect(parsed: unknown): DatInspectResult {
  const o = (parsed ?? {}) as Record<string, unknown>;
  const dvRaw = o.data_version ?? o.dataVersion;
  let dataVersion: number | null = null;
  if (typeof dvRaw === 'number' && Number.isFinite(dvRaw)) {
    dataVersion = dvRaw;
  }
  const gzRaw = o.gzipped;
  let gzipped: boolean | null = null;
  if (gzRaw === true || gzRaw === false) gzipped = gzRaw;
  const errRaw = o.error;
  return {
    path: typeof o.path === 'string' ? o.path : '',
    read_ok: o.read_ok === true || o.readOk === true,
    gzipped,
    file_size:
      typeof o.file_size === 'number'
        ? o.file_size
        : typeof o.fileSize === 'number'
          ? o.fileSize
          : 0,
    data_version: dataVersion,
    tree: normalizeTreeNode(o.tree),
    error: typeof errRaw === 'string' ? errRaw : errRaw == null ? null : String(errRaw),
  };
}

export async function saveEditorListDats(worldDir: string): Promise<DatFileRow[]> {
  try {
    const raw = await invoke<string>('save_editor_list_dats', { worldDir: worldDir.trim() });
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeDatRow);
  } catch (e) {
    appLog(
      'save_editor',
      'error',
      'save_editor_list_dats',
      `${e instanceof Error ? e.message : String(e)} — ${truncatePath(worldDir)}`,
    );
    throw e;
  }
}

export async function saveEditorInspectDat(datPath: string): Promise<DatInspectResult> {
  try {
    const raw = await invoke<string>('save_editor_inspect_dat', { datPath: datPath.trim() });
    return normalizeInspect(JSON.parse(raw));
  } catch (e) {
    appLog(
      'save_editor',
      'error',
      'save_editor_inspect_dat',
      `${e instanceof Error ? e.message : String(e)} — ${truncatePath(datPath)}`,
    );
    throw e;
  }
}
