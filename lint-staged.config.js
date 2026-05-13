function shellQuote(file) {
  if (!/[ \t'"]/u.test(file)) return file;
  return `"${file.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export default {
  // Match `pnpm format`: Prettier formats `src/**/*.ts`; Vue SFCs stay ESLint-only (AGENTS.md).
  'src/**/*.ts': (files) =>
    files.length
      ? [
          `eslint --fix ${files.map(shellQuote).join(' ')}`,
          `prettier --write ${files.map(shellQuote).join(' ')}`,
        ]
      : [],
  'scripts/**/*.mjs': (files) =>
    files.length
      ? [
          `eslint --fix ${files.map(shellQuote).join(' ')}`,
          `prettier --write ${files.map(shellQuote).join(' ')}`,
        ]
      : [],
  'src/**/*.{vue,js}': (files) =>
    files.length ? `eslint --fix ${files.map(shellQuote).join(' ')}` : [],
  'src/**/*.css': (files) =>
    files.length ? `prettier --write ${files.map(shellQuote).join(' ')}` : [],
  '*.config.ts': (files) =>
    files.length ? `prettier --write ${files.map(shellQuote).join(' ')}` : [],
  '*.{json,yml,yaml,js,cjs}': (files) =>
    files.length ? `prettier --write ${files.map(shellQuote).join(' ')}` : [],
  '*.md': (files) => (files.length ? `prettier --write ${files.map(shellQuote).join(' ')}` : []),
};
