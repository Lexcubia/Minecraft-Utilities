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
import '@/styles/linear-density.css';
import { i18n } from '@/i18n';
import { mergeDiskAppSettingsJson } from '@/config/mergeDiskAppSettings';
import { resolveSettingsBootstrapJson } from '@/config/resolveSettingsBootstrapJson';
import { loadUserDataPaths } from '@/composables/useUserDataPaths';
import { SETTINGS_STORAGE_KEY } from '@/constants/settings-persist';
import { useSettingsStore } from '@/stores/settings';
import App from '@/App.vue';
import router from '@/router';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

function isTauriShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function bootstrap() {
  const pinia = createPinia();
  const app = createApp(App);
  app.use(pinia);

  try {
    if (isTauriShell()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('user_data_init_defaults');
      let fileJson: string | null = null;
      try {
        fileJson = await invoke<string>('user_data_read_app_settings');
      } catch (e) {
        console.warn('[bootstrap] read app-settings from disk failed', e);
      }
      const ls =
        typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
      const base = resolveSettingsBootstrapJson(fileJson, ls);
      const merged = mergeDiskAppSettingsJson(base);
      const settings = useSettingsStore();
      settings.hydrateFromRemoteJson(merged);
      try {
        await invoke('user_data_write_app_settings', {
          json: settings.serializePersistedPayload(),
        });
      } catch (e) {
        console.warn('[bootstrap] sync settings.json to disk failed', e);
      }
      await loadUserDataPaths();
    } else {
      useSettingsStore().hydrateFromDisk();
    }
  } catch (e) {
    console.error('[bootstrap] user data init failed', e);
    if (isTauriShell()) {
      try {
        useSettingsStore().hydrateFromRemoteJson(mergeDiskAppSettingsJson('{}'));
      } catch {
        /* ignore */
      }
    }
  }

  app.use(i18n);
  app.use(router);
  app.use(vuetify);
  app.mount('#app');
}

void bootstrap();
