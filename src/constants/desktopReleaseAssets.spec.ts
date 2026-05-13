import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MAIN_BINARY_NAME } from './desktopReleaseAssets';

describe('desktopReleaseAssets', () => {
  it('MAIN_BINARY_NAME matches src-tauri/tauri.conf.json mainBinaryName', () => {
    const raw = readFileSync(join(process.cwd(), 'src-tauri', 'tauri.conf.json'), 'utf8');
    const tauri = JSON.parse(raw) as { mainBinaryName: string };
    expect(tauri.mainBinaryName).toBe(MAIN_BINARY_NAME);
  });
});
