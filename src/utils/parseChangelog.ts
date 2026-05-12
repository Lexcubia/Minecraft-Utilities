/** 与根目录 CHANGELOG.md 对齐：已发布版本为 `## [semver]`（配合 CI），`## Unreleased` 可无方括号；小节标题兼容 Keep a Changelog 与 TFG 式 `### Changes` 等。 */

export type ChangelogSection = {
  /** 版本标识：方括号内如 `0.1.0`，或 `Unreleased` */
  version: string;
  /** 整行二级标题原文 */
  headingLine: string;
  /** 标题下至下一 `## ` 之前的正文（已去掉发布用 HTML 注释行） */
  body: string;
};

const HEADING_BRACKET = /^## \[([^\]]+)\]\s*(.*)$/;
const HEADING_UNRELEASED = /^##\s+Unreleased\s*$/i;

/**
 * 解析 `## [version]` 与 `## Unreleased` 二级标题小节；首个 `## [` 或 `## Unreleased` 之前的序言不形成小节。
 */
export function parseKeepAChangelog(markdown: string): ChangelogSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;

  for (const line of lines) {
    const bm = line.match(HEADING_BRACKET);
    if (bm) {
      if (current) {
        sections.push(finishSection(current));
      }
      current = {
        version: bm[1].trim(),
        headingLine: line.trimEnd(),
        body: '',
      };
    } else if (HEADING_UNRELEASED.test(line)) {
      if (current) {
        sections.push(finishSection(current));
      }
      current = {
        version: 'Unreleased',
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

/** `Unreleased` 小节：`## [Unreleased]` 或 `## Unreleased`（大小写不敏感） */
export function isUnreleasedChangelogVersion(version: string): boolean {
  return version.trim().toLowerCase() === 'unreleased';
}

/** 与 GitHub `tag_name`（如 `v0.2.0`）或小节版本号对齐 */
export function normalizeReleaseVersionForChangelogMatch(tagOrVersion: string): string {
  return tagOrVersion.trim().replace(/^v/i, '').toLowerCase();
}

/** 排除 `[Unreleased]`，仅保留已发布版本小节 */
export function parseKeepAChangelogPublished(markdown: string): ChangelogSection[] {
  return parseKeepAChangelog(markdown).filter((s) => !isUnreleasedChangelogVersion(s.version));
}

/** 按 `tag_name` 查找 CHANGELOG 正文；无匹配返回 `null` */
export function findChangelogBodyForTag(
  sections: readonly ChangelogSection[],
  tagName: string,
): string | null {
  const key = normalizeReleaseVersionForChangelogMatch(tagName);
  for (const sec of sections) {
    if (isUnreleasedChangelogVersion(sec.version)) continue;
    if (normalizeReleaseVersionForChangelogMatch(sec.version) === key) {
      const b = sec.body.trim();
      return b.length ? b : null;
    }
  }
  return null;
}
