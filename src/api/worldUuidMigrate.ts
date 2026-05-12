import { invoke } from '@tauri-apps/api/core';
import { appLog, truncatePath } from '@/utils/appLog';

export type WorldPlayerRow = {
  uuid: string;
  name: string;
  read_ok: boolean;
  data_version: number | null;
};

function normalizePlayerRow(entry: unknown): WorldPlayerRow {
  const o = entry as Record<string, unknown>;
  const nameRaw = o.name ?? o.Name;
  const readOkRaw = o.read_ok ?? o.readOk;
  const dvRaw = o.data_version ?? o.dataVersion;
  let dataVersion: number | null = null;
  if (typeof dvRaw === 'number' && Number.isFinite(dvRaw)) {
    dataVersion = dvRaw;
  }
  return {
    uuid: typeof o.uuid === 'string' ? o.uuid : String(o.uuid ?? ''),
    name: typeof nameRaw === 'string' ? nameRaw : '',
    read_ok: readOkRaw === true,
    data_version: dataVersion,
  };
}

export async function worldUuidListPlayers(
  worldDir: string,
  usercachePath: string,
): Promise<WorldPlayerRow[]> {
  try {
    const raw = await invoke<string>('world_uuid_list_players', {
      worldDir,
      usercachePath: usercachePath.trim() || null,
    });
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizePlayerRow);
  } catch (e) {
    appLog(
      'uuid_migrate',
      'error',
      'world_uuid_list_players',
      e instanceof Error ? e.message : String(e),
    );
    throw e;
  }
}

export async function worldUuidMigrateBatch(
  worldDir: string,
  pairs: { from: string; to: string }[],
  dryRun: boolean,
): Promise<string> {
  appLog(
    'uuid_migrate',
    'debug',
    `uuid-migrate-batch: ${pairs.length} mapping(s), dry_run=${dryRun}`,
    truncatePath(worldDir),
  );
  try {
    return await invoke<string>('world_uuid_migrate_batch', {
      worldDir,
      pairsJson: JSON.stringify(pairs),
      dryRun,
    });
  } catch (e) {
    appLog(
      'uuid_migrate',
      'error',
      'world_uuid_migrate_batch',
      e instanceof Error ? e.message : String(e),
    );
    throw e;
  }
}
