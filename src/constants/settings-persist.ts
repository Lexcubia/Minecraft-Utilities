export const SETTINGS_STORAGE_KEY = 'minecraft-utilities-settings-v1';

/** 多 Webview 间同步：任意窗口持久化后广播，其它窗口据此 hydrate（localStorage 可能隔离） */
export const SETTINGS_PERSIST_BROADCAST_EVENT = 'settings-persist-broadcast';
