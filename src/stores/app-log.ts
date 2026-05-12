import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const APP_LOG_MODULES = [
  'app',
  'filesystem',
  'uuid_migrate',
  'network',
  'tray',
] as const;

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
  }): void {
    const row: AppLogEntry = {
      id: newId(),
      ts: Date.now(),
      module: p.module,
      level: p.level,
      message: p.message,
      detail: p.detail,
    };
    entries.value = [row, ...entries.value].slice(0, MAX_ENTRIES);
  }

  function clear(): void {
    entries.value = [];
  }

  return { entries, count, push, clear };
});
