import { describe, expect, it } from 'vitest';

import {
  changelogHeadingDisplay,
  findChangelogBodyForTag,
  isUnreleasedChangelogVersion,
  normalizeReleaseVersionForChangelogMatch,
  parseKeepAChangelog,
  parseKeepAChangelogPublished,
} from '@/utils/parseChangelog';

describe('parseKeepAChangelog', () => {
  it('parses version sections and strips release marker', () => {
    const md = `# X

## [Unreleased]

### Added

- a

## [1.0.0] - 2020-01-01

<!-- release:publish -->

### Fixed

- b
`;
    const s = parseKeepAChangelog(md);
    expect(s).toHaveLength(2);
    expect(s[0].version).toBe('Unreleased');
    expect(s[0].body).toContain('- a');
    expect(s[1].version).toBe('1.0.0');
    expect(s[1].body).toContain('- b');
    expect(s[1].body).not.toMatch(/release:publish/);
  });

  it('accepts ## Unreleased without brackets', () => {
    const md = `## Unreleased\n\n### Changes\n\n- a\n\n## [1.0.0]\n\n### Changes\n\n- b\n`;
    const s = parseKeepAChangelog(md);
    expect(s).toHaveLength(2);
    expect(s[0].version).toBe('Unreleased');
    expect(s[0].body).toContain('- a');
    expect(s[1].version).toBe('1.0.0');
    expect(s[1].body).toContain('- b');
  });
});

describe('changelogHeadingDisplay', () => {
  it('strips leading ##', () => {
    expect(changelogHeadingDisplay('## [0.1.0] - day')).toBe('[0.1.0] - day');
  });
});

describe('parseKeepAChangelogPublished', () => {
  it('drops Unreleased section', () => {
    const md = `## [Unreleased]\n\n- x\n\n## [1.0.0]\n\n- y\n`;
    const s = parseKeepAChangelogPublished(md);
    expect(s).toHaveLength(1);
    expect(s[0].version).toBe('1.0.0');
  });
});

describe('findChangelogBodyForTag', () => {
  const md = `## [Unreleased]\n\n- u\n\n## [0.2.0]\n\n### Added\n\n- a\n`;
  const published = parseKeepAChangelogPublished(md);

  it('matches v-prefixed tag to changelog version', () => {
    expect(findChangelogBodyForTag(published, 'v0.2.0')).toContain('- a');
  });

  it('returns null when no section matches', () => {
    expect(findChangelogBodyForTag(published, 'v9.9.9')).toBeNull();
  });
});

describe('isUnreleasedChangelogVersion', () => {
  it('is case-insensitive', () => {
    expect(isUnreleasedChangelogVersion('Unreleased')).toBe(true);
    expect(isUnreleasedChangelogVersion('unreleased')).toBe(true);
    expect(isUnreleasedChangelogVersion('0.1.0')).toBe(false);
  });
});

describe('normalizeReleaseVersionForChangelogMatch', () => {
  it('strips leading v', () => {
    expect(normalizeReleaseVersionForChangelogMatch('v1.0.0')).toBe('1.0.0');
    expect(normalizeReleaseVersionForChangelogMatch('1.0.0')).toBe('1.0.0');
  });
});
