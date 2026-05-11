import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readAppIcons() {
  const raw = readFileSync(path.join(__dirname, 'config', 'app-icons.json'), 'utf8');
  return JSON.parse(raw) as {
    brandLogoSvg: { webPath: string; viteIndexPlaceholder: string };
  };
}

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'config'),
    },
  },
  plugins: [
    {
      name: 'inject-app-icons-index-html',
      transformIndexHtml(html) {
        const icons = readAppIcons();
        return html.replaceAll(icons.brandLogoSvg.viteIndexPlaceholder, icons.brandLogoSvg.webPath);
      },
    },
    vue(),
    vuetify({ autoImport: true }),
    tailwindcss(),
  ],
  // 与仓库根 Python/hatch 的 dist/ 区分，避免产物目录冲突
  build: {
    outDir: 'dist-web',
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
}));
