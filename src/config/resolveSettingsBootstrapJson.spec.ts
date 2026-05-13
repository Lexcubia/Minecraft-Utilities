import { describe, expect, it } from 'vitest';

import {
  isDiskSettingsEmptyOrInvalid,
  resolveSettingsBootstrapJson,
} from './resolveSettingsBootstrapJson';

describe('resolveSettingsBootstrapJson', () => {
  it('shallow-merges localStorage over disk when both have keys', () => {
    expect(resolveSettingsBootstrapJson('{"colorScheme":"dark"}', '{"colorScheme":"light"}')).toBe(
      '{"colorScheme":"light"}',
    );
  });

  it('treats disk {} as empty and falls back to localStorage', () => {
    expect(resolveSettingsBootstrapJson('{}', '{"colorScheme":"light"}')).toBe(
      '{"colorScheme":"light"}',
    );
  });

  it('uses localStorage when disk is invalid JSON', () => {
    expect(resolveSettingsBootstrapJson('not-json', '{"uiLanguage":"en"}')).toBe(
      '{"uiLanguage":"en"}',
    );
  });

  it('returns {} when both sides empty', () => {
    expect(resolveSettingsBootstrapJson('', '')).toBe('{}');
  });
});

describe('isDiskSettingsEmptyOrInvalid', () => {
  it('true when disk empty or {}', () => {
    expect(isDiskSettingsEmptyOrInvalid(null)).toBe(true);
    expect(isDiskSettingsEmptyOrInvalid('{}')).toBe(true);
  });

  it('false when disk has keys', () => {
    expect(isDiskSettingsEmptyOrInvalid('{"a":1}')).toBe(false);
  });
});
