import { describe, expect, it } from 'vitest';
import { compareTagToAppVersion, normalizeSemverString } from '@/utils/semverTagCompare';

describe('semverTagCompare', () => {
  it('normalizes v prefix', () => {
    expect(normalizeSemverString('v1.2.3')).toBe('1.2.3');
  });

  it('compares equal', () => {
    expect(compareTagToAppVersion('v0.1.0', '0.1.0')).toBe('equal');
  });

  it('compares newer and older', () => {
    expect(compareTagToAppVersion('1.0.0', '0.9.0')).toBe('newer');
    expect(compareTagToAppVersion('0.9.0', '1.0.0')).toBe('older');
  });
});
