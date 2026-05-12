import { invoke } from '@tauri-apps/api/core';
import { appLog, truncatePath } from '@/utils/appLog';

/** 与对话框返回路径保持相同分隔符，便于传给 Rust / Python。 */
export function joinPathSegments(base: string, ...segments: string[]): string {
  const sep = base.includes('\\') ? '\\' : '/';
  let out = base.replace(/[/\\]+$/, '');
  for (const seg of segments) {
    const s = seg.replace(/^[/\\]+|[/\\]+$/g, '');
    if (!s) continue;
    out = `${out}${sep}${s}`;
  }
  return out;
}

export async function listSubdirs(parentPath: string): Promise<string[]> {
  const out = await invoke<string[]>('list_subdirs', { parentPath });
  appLog('filesystem', 'debug', 'list_subdirs', truncatePath(parentPath));
  return out;
}

export async function listServerWorldDirs(serverRoot: string): Promise<string[]> {
  const out = await invoke<string[]>('list_server_world_dirs', { serverRoot });
  appLog('filesystem', 'debug', 'list_server_world_dirs', truncatePath(serverRoot));
  return out;
}

export async function pathIsFile(path: string): Promise<boolean> {
  return invoke<boolean>('path_is_file', { path });
}
