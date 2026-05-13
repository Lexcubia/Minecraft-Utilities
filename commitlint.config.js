export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 默认 100：英文 + 反引号命令行时易超限；略放宽以减少误拦
    'body-max-line-length': [2, 'always', 160],
  },
};
