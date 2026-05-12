#!/usr/bin/env node
/**
 * 从 Git 提交说明文件中移除 Cursor 注入的 Co-authored-by 尾注，
 * 避免 `Co-authored-by: Cursor <cursoragent@cursor.com>` 等进入仓库历史。
 *
 * 由 `.husky/commit-msg` 调用：`node scripts/strip-cursor-coauthor.mjs "$1"`
 */
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('strip-cursor-coauthor: missing path to commit message file');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8');
const lines = raw.split(/\r?\n/);

/** @param {string} line */
function shouldDropCoauthor(line) {
  const t = line.trimStart();
  if (!/^co-authored-by:/i.test(t)) return false;
  if (/cursoragent@cursor\.com/i.test(t)) return true;
  // "Co-authored-by: Cursor ..." / "Co-authored-by: Cursor<..."
  if (/^co-authored-by:\s*cursor(\s|<|$)/i.test(t)) return true;
  return false;
}

const kept = lines.filter((line) => !shouldDropCoauthor(line));
const out = kept.join('\n').replace(/\s+$/, '');
fs.writeFileSync(file, `${out}\n`, 'utf8');
