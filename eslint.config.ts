import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-web/**',
      'node_modules/**',
      'src-tauri/**',
      'coverage/**',
      'python/**',
      'tests/**',
      'docs/**',
      'commitlint.config.js',
      'lint-staged.config.js',
      'prettier.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'eslint.config.ts', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  eslintConfigPrettier,
  {
    files: ['src/views/settings/tabs/UpdatesTab.vue'],
    rules: {
      // 发布说明经 DOMPurify 清洗后注入；见 `renderMarkdownToSafeHtml`
      'vue/no-v-html': 'off',
    },
  },
);
