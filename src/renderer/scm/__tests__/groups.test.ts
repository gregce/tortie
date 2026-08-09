import { describe, expect, it } from 'vitest';
import type { GitFileStatus } from '@shared/types';
import { dirtyCount, groupFiles, isConflict } from '../groups';

const f = (
  path: string,
  indexState: GitFileStatus['indexState'],
  worktreeState: GitFileStatus['worktreeState'],
  origPath?: string
): GitFileStatus => ({
  path,
  indexState,
  worktreeState,
  ...(origPath !== undefined ? { origPath } : {})
});

describe('groupFiles', () => {
  it('splits staged / changes / untracked', () => {
    const groups = groupFiles([
      f('staged.ts', 'M', '.'),
      f('changed.ts', '.', 'M'),
      f('new.ts', '?', '?')
    ]);
    expect(groups.staged.map((x) => x.path)).toEqual(['staged.ts']);
    expect(groups.changes.map((x) => x.path)).toEqual(['changed.ts']);
    expect(groups.untracked.map((x) => x.path)).toEqual(['new.ts']);
    expect(groups.merge).toEqual([]);
  });

  it('puts MM files in Staged AND Changes (VS Code behavior)', () => {
    const groups = groupFiles([f('both.ts', 'M', 'M')]);
    expect(groups.staged.map((x) => x.path)).toEqual(['both.ts']);
    expect(groups.changes.map((x) => x.path)).toEqual(['both.ts']);
  });

  it('routes all unmerged XY shapes to Merge only', () => {
    const shapes: [GitFileStatus['indexState'], GitFileStatus['worktreeState']][] =
      [
        ['U', 'U'],
        ['A', 'U'],
        ['U', 'A'],
        ['D', 'U'],
        ['U', 'D'],
        ['A', 'A'],
        ['D', 'D']
      ];
    const groups = groupFiles(
      shapes.map(([i, w], n) => f(`c${n}.ts`, i, w))
    );
    expect(groups.merge).toHaveLength(shapes.length);
    expect(groups.staged).toEqual([]);
    expect(groups.changes).toEqual([]);
    expect(groups.untracked).toEqual([]);
  });

  it('keeps added/deleted/renamed letters on the right side', () => {
    const groups = groupFiles([
      f('added.ts', 'A', '.'),
      f('renamed.ts', 'R', '.', 'old.ts'),
      f('deleted.ts', '.', 'D')
    ]);
    expect(groups.staged.map((x) => x.path)).toEqual([
      'added.ts',
      'renamed.ts'
    ]);
    expect(groups.changes.map((x) => x.path)).toEqual(['deleted.ts']);
  });

  it('skips ignored entries and sorts each group by path', () => {
    const groups = groupFiles([
      f('z.ts', '.', 'M'),
      f('a.ts', '.', 'M'),
      f('ignored.log', '!', '!')
    ]);
    expect(groups.changes.map((x) => x.path)).toEqual(['a.ts', 'z.ts']);
    expect(groups.untracked).toEqual([]);
  });
});

describe('isConflict', () => {
  it('does not flag plain staged adds or deletes', () => {
    expect(isConflict(f('a.ts', 'A', '.'))).toBe(false);
    expect(isConflict(f('d.ts', 'D', '.'))).toBe(false);
    expect(isConflict(f('dd.ts', 'D', 'D'))).toBe(true);
  });
});

describe('dirtyCount', () => {
  it('is 0 for null status', () => {
    expect(dirtyCount(null)).toBe(0);
  });
});
