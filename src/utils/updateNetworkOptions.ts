import type { UpdateChannel } from '@/stores/settings';

export type UpdateNetworkOptionsPayload = {
  updateChannel: UpdateChannel;
  updateProxy: string;
};

export function buildUpdateNetworkOptionsJson(channel: UpdateChannel, proxy: string): string {
  const payload: UpdateNetworkOptionsPayload = {
    updateChannel: channel,
    updateProxy: proxy.trim(),
  };
  return JSON.stringify(payload);
}
