import { describe, expect, it } from 'vitest';
import {
  commitCount,
  formatRelative,
  shortSha,
  shortenRemoteUrl,
  splitPath,
  syncTooltip
} from '../format';

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

describe('syncTooltip (Phase 12 item 3)', () => {
  it('says what the click will do, in commits, naming the upstream', () => {
    expect(syncTooltip(2, 1, 'origin/main')).toBe(
      'Sync — pull 1 commit from origin/main, then push 2 commits'
    );
    expect(syncTooltip(0, 3, 'origin/main')).toBe(
      'Pull 3 commits from origin/main'
    );
    expect(syncTooltip(1, 0, 'origin/main')).toBe('Push 1 commit to origin/main');
    expect(syncTooltip(0, 0, 'origin/main')).toBe(
      'Sync with origin/main — nothing to pull or push right now'
    );
  });

  it('never says "the remote" when it knows the upstream', () => {
    expect(syncTooltip(1, 0, null)).toBe('Push 1 commit to the remote');
  });
});

describe('commitCount', () => {
  it('pluralizes', () => {
    expect(commitCount(1)).toBe('1 commit');
    expect(commitCount(0)).toBe('0 commits');
    expect(commitCount(12)).toBe('12 commits');
  });
});

describe('shortenRemoteUrl', () => {
  it('collapses every remote form to host/owner/repo', () => {
    expect(shortenRemoteUrl('git@github.com:specstory/gmux.git')).toBe(
      'github.com/specstory/gmux'
    );
    expect(shortenRemoteUrl('https://github.com/specstory/gmux.git')).toBe(
      'github.com/specstory/gmux'
    );
    expect(shortenRemoteUrl('ssh://git@git.example.com:2222/team/repo.git')).toBe(
      'git.example.com:2222/team/repo'
    );
  });

  it('leaves a local path readable and never throws on junk', () => {
    expect(shortenRemoteUrl('/srv/git/bare.git')).toBe('/srv/git/bare.git');
    expect(shortenRemoteUrl('  not a url  ')).toBe('not a url');
  });
});
