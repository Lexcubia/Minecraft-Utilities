import '@/styles/app-fonts.css';
import '@/styles/tailwind.css';
import vuetify from '@/plugins/vuetify';
import '@/styles/design-tokens.css';
import '@/styles/app-ui.css';
import '@/styles/app-glass-card.css';
import '@/styles/app-shell-scroll.css';
import '@/styles/app-context-menu-surface.css';
import '@/styles/shell-glass.css';
import '@/styles/accent-gradient.css';
import { i18n, mergeDiskLocalesIntoI18n } from '@/i18n';
import { mergeDiskAppSettingsJson } from '@/config/mergeDiskAppSettings';
import { loadUserDataPaths } from '@/composables/useUserDataPaths';
import { SETTINGS_STORAGE_KEY } from '@/constants/settings-persist';
import { useSettingsStore } from '@/stores/settings';
import App from '@/App.vue';
import router from '@/router';
import { createPinia, setActivePinia } from 'pinia';
import { createApp } from 'vue';

function isTauriShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function bootstrap() {
  const pinia = createPinia();
  setActivePinia(pinia);

  if (isTauriShell()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('user_data_init_defaults');
    let diskJson = await invoke<string>('user_data_read_settings');
    const ls =
      typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    if (ls) {
      try {
        const parsed = JSON.parse(diskJson.trim() || '{}') as Record<string, unknown>;
        const isEmpty = Object.keys(parsed).length === 0;
        if (isEmpty) {
          await invoke('user_data_write_settings', { json: ls });
          diskJson = ls;
        }
      } catch {
        /* ignore */
      }
    }
    diskJson = mergeDiskAppSettingsJson(diskJson);
    useSettingsStore().hydrateFromRemoteJson(diskJson);
    await loadUserDataPaths();
  } else {
    useSettingsStore().hydrateFromDisk();
  }

  const app = createApp(App);
  app.use(pinia);
  app.use(i18n);
  if (isTauriShell()) {
    await mergeDiskLocalesIntoI18n();
  }
  app.use(router);
  app.use(vuetify);
  app.mount('#app');
}

void bootstrap();
