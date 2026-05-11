import type { InjectionKey } from 'vue';

/** 顶栏窗口控件：关闭（含托盘隐藏）、最小化、托盘退出（仅 Tauri 注入）。 */
export type ShellWindowControl = {
  /** 最小化到任务栏 */
  minimizeWindow: () => Promise<void>;
  /** 关闭键：开启「最小化到托盘」时隐藏到托盘，否则走退出确认/退出 */
  onCloseButton: () => Promise<void>;
  /** 托盘菜单「关闭」：仅退出应用（含 Vue 二次确认） */
  requestAppExit: () => Promise<void>;
};

export const shellWindowControlKey: InjectionKey<ShellWindowControl> = Symbol('shellWindowControl');
