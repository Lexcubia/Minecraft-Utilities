/** @type {import('prettier').Config} */
export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'auto',
  overrides: [
    {
      files: ['*.md'],
      options: { tabWidth: 4, proseWrap: 'preserve' },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: { tabWidth: 2 },
    },
  ],
};
