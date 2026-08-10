import { describe, expect, it } from 'vitest';
import type { GitFileStatus } from '@shared/types';
import {
  isConflicted,
  isIgnored,
  openModeFor,
  pierreGitStatus
} from '../decorations';

const st = (
  indexState: GitFileStatus['indexState'],
  worktreeState: GitFileStatus['worktreeState'],
  path = 'src/a.ts'
): GitFileStatus => ({ path, indexState, worktreeState });

describe('pierreGitStatus (porcelain XY → @pierre/trees git lane)', () => {
  it('maps worktree/index modifications to modified', () => {
    expect(pierreGitStatus(st('.', 'M'))).toBe('modified');
    expect(pierreGitStatus(st('M', '.'))).toBe('modified');
    expect(pierreGitStatus(st('M', 'M'))).toBe('modified');
  });

  it('maps untracked to untracked', () => {
    expect(pierreGitStatus(st('?', '?'))).toBe('untracked');
  });

  it('maps staged adds to added, including add-then-edit (AM)', () => {
    expect(pierreGitStatus(st('A', '.'))).toBe('added');
    expect(pierreGitStatus(st('A', 'M'))).toBe('added');
  });

  it('maps deletions to deleted', () => {
    expect(pierreGitStatus(st('.', 'D'))).toBe('deleted');
    expect(pierreGitStatus(st('D', '.'))).toBe('deleted');
  });

  it('maps renames and copies to renamed', () => {
    expect(pierreGitStatus(st('R', '.'))).toBe('renamed');
    // rename-then-edit still reads as a rename
    expect(pierreGitStatus(st('R', 'M'))).toBe('renamed');
    expect(pierreGitStatus(st('C', '.'))).toBe('renamed');
  });

  it('maps ignored to ignored (dim lane, no letter)', () => {
    expect(pierreGitStatus(st('!', '!'))).toBe('ignored');
  });

  it('rides conflicts on the modified lane (Pierre has no conflict state)', () => {
    for (const s of [st('U', 'U'), st('A', 'A'), st('D', 'D'), st('.', 'U')]) {
      expect(pierreGitStatus(s)).toBe('modified');
      expect(isConflicted(s)).toBe(true);
    }
  });

  it('returns null for unchanged and missing statuses', () => {
    expect(pierreGitStatus(st('.', '.'))).toBeNull();
    expect(pierreGitStatus(undefined)).toBeNull();
  });

  it('detects ignored on either side', () => {
    expect(isIgnored(st('!', '!'))).toBe(true);
    expect(isIgnored(st('.', 'M'))).toBe(false);
    expect(isConflicted(st('A', 'M'))).toBe(false);
  });
});

describe('openModeFor (P4 default gesture)', () => {
  it('diffs tracked changes', () => {
    expect(openModeFor(st('.', 'M'))).toBe('diff');
    expect(openModeFor(st('A', '.'))).toBe('diff');
    expect(openModeFor(st('R', 'M'))).toBe('diff');
    expect(openModeFor(st('U', 'U'))).toBe('diff');
  });

  it('opens untracked, ignored, unchanged, and unknown files plain', () => {
    expect(openModeFor(st('?', '?'))).toBe('plain');
    expect(openModeFor(st('!', '!'))).toBe('plain');
    expect(openModeFor(st('.', '.'))).toBe('plain');
    expect(openModeFor(undefined)).toBe('plain');
  });
});
