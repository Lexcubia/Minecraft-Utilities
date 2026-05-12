import type { InjectionKey, Ref } from 'vue';
import { inject, ref } from 'vue';

/** `standalone`：独立 Webview 窗口（无侧栏）；`embedded`：主窗口内 */
export type SettingsUiMode = 'embedded' | 'standalone';

export const settingsUiModeKey: InjectionKey<Ref<SettingsUiMode>> = Symbol('settingsUiMode');

const fallbackMode = ref<SettingsUiMode>('embedded');

export function useSettingsUiMode(): Ref<SettingsUiMode> {
  return inject(settingsUiModeKey, fallbackMode);
}
