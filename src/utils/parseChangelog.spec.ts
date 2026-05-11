import { describe, expect, it } from 'vitest';

import { changelogHeadingDisplay, parseKeepAChangelog } from '@/utils/parseChangelog';

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
});

describe('changelogHeadingDisplay', () => {
  it('strips leading ##', () => {
    expect(changelogHeadingDisplay('## [0.1.0] - day')).toBe('[0.1.0] - day');
  });
});
