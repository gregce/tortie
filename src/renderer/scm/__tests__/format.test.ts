import { describe, expect, it } from 'vitest';
import { formatRelative, shortSha, splitPath } from '../format';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatRelative', () => {
  const now = 1_700_000_000_000;
  it('covers the full range', () => {
    expect(formatRelative(now - 10_000, now)).toBe('now');
    expect(formatRelative(now - 4 * MIN, now)).toBe('4m');
    expect(formatRelative(now - 2 * HOUR, now)).toBe('2h');
    expect(formatRelative(now - 3 * DAY, now)).toBe('3d');
    expect(formatRelative(now - 15 * DAY, now)).toBe('2w');
    expect(formatRelative(now - 100 * DAY, now)).toBe('3mo');
    expect(formatRelative(now - 800 * DAY, now)).toBe('2y');
  });
  it('never goes negative', () => {
    expect(formatRelative(now + 5 * MIN, now)).toBe('now');
  });
});

describe('splitPath', () => {
  it('splits dir and base', () => {
    expect(splitPath('src/routes/auth.ts')).toEqual({
      dir: 'src/routes',
      base: 'auth.ts'
    });
    expect(splitPath('README.md')).toEqual({ dir: '', base: 'README.md' });
  });
});

describe('shortSha', () => {
  it('is 7 chars', () => {
    expect(shortSha('0123456789abcdef')).toBe('0123456');
  });
});
