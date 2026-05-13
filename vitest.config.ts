import path from 'node:path';
import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'config'),
    },
  },
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
  },
});
