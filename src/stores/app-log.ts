import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const APP_LOG_MODULES = ['app', 'filesystem', 'uuid_migrate', 'network', 'tray'] as const;

export type AppLogModule = (typeof APP_LOG_MODULES)[number];

export const APP_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type AppLogLevel = (typeof APP_LOG_LEVELS)[number];

export type AppLogEntry = {
  id: string;
  ts: number;
  module: AppLogModule;
  level: AppLogLevel;
  message: string;
  detail?: string;
};

const MAX_ENTRIES = 2500;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useAppLogStore = defineStore('app-log', () => {
  const entries = ref<AppLogEntry[]>([]);

  const count = computed(() => entries.value.length);

  function push(p: {
    module: AppLogModule;
    level: AppLogLevel;
    message: string;
    detail?: string;
  }): AppLogEntry {
    const row: AppLogEntry = {
      id: newId(),
      ts: Date.now(),
      module: p.module,
      level: p.level,
      message: p.message,
      detail: p.detail,
    };
    entries.value = [row, ...entries.value].slice(0, MAX_ENTRIES);
    return row;
  }

  /** 其它 Webview 广播来的单条（按 id 去重） */
  function ingestBroadcast(entry: AppLogEntry): void {
    if (entries.value.some((e) => e.id === entry.id)) return;
    entries.value = [entry, ...entries.value].slice(0, MAX_ENTRIES);
  }

  /** 主窗快照：整表替换（打开独立设置窗时对齐历史） */
  function applySnapshot(incoming: AppLogEntry[]): void {
    entries.value = incoming.slice(0, MAX_ENTRIES);
  }

  function clear(): void {
    entries.value = [];
  }

  return { entries, count, push, ingestBroadcast, applySnapshot, clear };
});
