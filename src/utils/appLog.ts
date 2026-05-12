import { APP_LOG_BROADCAST_EVENT } from '@/constants/app-log-sync';
import type { AppLogLevel, AppLogModule } from '@/stores/app-log';
import { useAppLogStore } from '@/stores/app-log';
import { emit } from '@tauri-apps/api/event';
import { isTauriRuntime } from '@/utils/isTauriRuntime';

export function appLog(
  module: AppLogModule,
  level: AppLogLevel,
  message: string,
  detail?: string,
): void {
  const entry = useAppLogStore().push({ module, level, message, detail });
  if (isTauriRuntime()) {
    void emit(APP_LOG_BROADCAST_EVENT, entry);
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
