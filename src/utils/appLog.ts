import { APP_LOG_BROADCAST_EVENT } from '@/constants/app-log-sync';
import type { AppLogEntry, AppLogLevel, AppLogModule } from '@/stores/app-log';
import { useAppLogStore } from '@/stores/app-log';
import { emit } from '@tauri-apps/api/event';
import { isTauriRuntime } from '@/utils/isTauriRuntime';

function formatLogLine(entry: AppLogEntry): string {
  const ts = new Date(entry.ts).toISOString();
  const msg = entry.message.replace(/\r?\n/g, ' ');
  const detail = entry.detail ? entry.detail.replace(/\r?\n/g, ' ') : '';
  return `${ts}\t${entry.level}\t${entry.module}\t${msg}\t${detail}`;
}

export function appLog(
  module: AppLogModule,
  level: AppLogLevel,
  message: string,
  detail?: string,
): void {
  const entry = useAppLogStore().push({ module, level, message, detail });
  if (isTauriRuntime()) {
    void emit(APP_LOG_BROADCAST_EVENT, entry);
    void import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('user_data_append_log_line', { line: formatLogLine(entry) }))
      .catch(() => {});
  }
}

export function truncatePath(s: string, max = 96): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const keep = max - 3;
  const head = Math.ceil(keep * 0.55);
  const tail = keep - head;
  return `${t.slice(0, head)}...${t.slice(-tail)}`;
}
