function shellQuote(file) {
  if (!/[ \t'"]/u.test(file)) return file;
  return `"${file.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

export default {
  'src/**/*.{ts,vue,js}': (files) =>
    files.length ? `eslint --fix ${files.map(shellQuote).join(' ')}` : [],
  'src/**/*.css': (files) =>
    files.length ? `prettier --write ${files.map(shellQuote).join(' ')}` : [],
  '*.config.ts': (files) =>
    files.length ? `prettier --write ${files.map(shellQuote).join(' ')}` : [],
  '*.{json,yml,yaml,js,cjs}': (files) =>
    files.length ? `prettier --write ${files.map(shellQuote).join(' ')}` : [],
  '*.md': (files) => (files.length ? `prettier --write ${files.map(shellQuote).join(' ')}` : []),
};
