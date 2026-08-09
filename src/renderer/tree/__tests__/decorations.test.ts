import { describe, expect, it } from 'vitest';
import type { GitFileStatus } from '@shared/types';
import {
  buildStatusIndex,
  decorationFor,
  isIgnored,
  openModeFor
} from '../decorations';

const st = (
  indexState: GitFileStatus['indexState'],
  worktreeState: GitFileStatus['worktreeState'],
  path = 'src/a.ts'
): GitFileStatus => ({ path, indexState, worktreeState });

describe('decorationFor', () => {
  it('maps worktree modifications to M in --git-modified', () => {
    expect(decorationFor(st('.', 'M'))).toEqual({
      letter: 'M',
      colorVar: '--git-modified',
      strike: false
    });
    expect(decorationFor(st('M', '.'))?.letter).toBe('M');
    expect(decorationFor(st('M', 'M'))?.letter).toBe('M');
  });

  it('maps untracked to U in --git-added', () => {
    expect(decorationFor(st('?', '?'))).toEqual({
      letter: 'U',
      colorVar: '--git-added',
      strike: false
    });
  });

  it('maps staged adds to A, including add-then-edit (AM)', () => {
    expect(decorationFor(st('A', '.'))?.letter).toBe('A');
    expect(decorationFor(st('A', 'M'))?.letter).toBe('A');
    expect(decorationFor(st('A', '.'))?.colorVar).toBe('--git-added');
  });

  it('maps deletions to D with strikethrough', () => {
    expect(decorationFor(st('.', 'D'))).toEqual({
      letter: 'D',
      colorVar: '--git-deleted',
      strike: true
    });
    expect(decorationFor(st('D', '.'))?.strike).toBe(true);
  });

  it('maps renames to R', () => {
    expect(decorationFor(st('R', '.'))).toEqual({
      letter: 'R',
      colorVar: '--git-renamed',
      strike: false
    });
    // rename-then-edit still reads as a rename
    expect(decorationFor(st('R', 'M'))?.letter).toBe('R');
  });

  it('flags conflicts (any U side, AA, DD) as ! in --git-conflict', () => {
    for (const s of [st('U', 'U'), st('A', 'A'), st('D', 'D'), st('.', 'U')]) {
      expect(decorationFor(s)).toEqual({
        letter: '!',
        colorVar: '--git-conflict',
        strike: false
      });
    }
  });

  it('returns null for unchanged, ignored, and missing statuses', () => {
    expect(decorationFor(st('.', '.'))).toBeNull();
    expect(decorationFor(st('!', '!'))).toBeNull();
    expect(decorationFor(undefined)).toBeNull();
  });

  it('detects ignored on either side', () => {
    expect(isIgnored(st('!', '!'))).toBe(true);
    expect(isIgnored(st('.', 'M'))).toBe(false);
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

describe('buildStatusIndex', () => {
  it('indexes by path and propagates dirt to every ancestor dir', () => {
    const idx = buildStatusIndex([
      st('.', 'M', 'src/routes/auth.ts'),
      st('?', '?', 'migrations/003_users.sql')
    ]);
    expect(idx.byPath.get('src/routes/auth.ts')?.worktreeState).toBe('M');
    expect(idx.dirtyDirs.has('src')).toBe(true);
    expect(idx.dirtyDirs.has('src/routes')).toBe(true);
    expect(idx.dirtyDirs.has('migrations')).toBe(true);
    expect(idx.dirtyDirs.has('')).toBe(false);
    expect(idx.dirtyDirs.has('src/lib')).toBe(false);
  });

  it('does not propagate ignored files', () => {
    const idx = buildStatusIndex([st('!', '!', 'dist/bundle.js')]);
    expect(idx.byPath.has('dist/bundle.js')).toBe(true);
    expect(idx.dirtyDirs.size).toBe(0);
  });

  it('root-level files decorate no directories', () => {
    const idx = buildStatusIndex([st('.', 'M', 'README.md')]);
    expect(idx.dirtyDirs.size).toBe(0);
  });
});
