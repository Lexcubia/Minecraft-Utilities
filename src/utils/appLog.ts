import type { AppLogLevel, AppLogModule } from '@/stores/app-log';
import { useAppLogStore } from '@/stores/app-log';

export function appLog(
  module: AppLogModule,
  level: AppLogLevel,
  message: string,
  detail?: string,
): void {
  useAppLogStore().push({ module, level, message, detail });
}

export function truncatePath(s: string, max = 96): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const keep = max - 3;
  const head = Math.ceil(keep * 0.55);
  const tail = keep - head;
  return `${t.slice(0, head)}...${t.slice(-tail)}`;
}
