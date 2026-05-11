/** 与根目录 CHANGELOG.md（Keep a Changelog）对齐的解析结果 */

export type ChangelogSection = {
  /** `## [...]` 中的方括号内容，如 `Unreleased`、`0.1.0` */
  version: string;
  /** 整行二级标题原文，如 `## [0.1.0] - 2026-05-11` */
  headingLine: string;
  /** 标题下至下一 `## [` 之前的正文（已去掉发布用 HTML 注释行） */
  body: string;
};

const HEADING = /^## \[([^\]]+)\]\s*(.*)$/;

/**
 * 解析 Keep a Changelog 风格的 `## [version]` 小节；忽略首个 `## [` 之前的序言。
 */
export function parseKeepAChangelog(markdown: string): ChangelogSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;

  for (const line of lines) {
    const m = line.match(HEADING);
    if (m) {
      if (current) {
        sections.push(finishSection(current));
      }
      current = {
        version: m[1].trim(),
        headingLine: line.trimEnd(),
        body: '',
      };
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) {
    sections.push(finishSection(current));
  }
  return sections;
}

function finishSection(sec: ChangelogSection): ChangelogSection {
  const body = sec.body.replace(/^\s*<!--\s*release:publish\s*-->\s*$/gim, '').trim();
  return { ...sec, body };
}

/** 用于侧栏标题展示：去掉行首 `## ` */
export function changelogHeadingDisplay(headingLine: string): string {
  return headingLine.replace(/^##\s+/, '').trim();
}
