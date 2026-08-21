/**
 * Phase 103. The grouping rule for a folder on ANOTHER machine.
 *
 * Git prints two characters per changed file. The first says what the index
 * holds, which is what the next commit would carry. The second says what the
 * folder on disk holds. Until this phase those two characters never reached
 * the renderer for a remote folder, so the panel could not tell a staged file
 * from an unstaged one and the two new verbs would have meant nothing.
 *
 * FIVE RULES ARE PROVED HERE, and each is a decision rather than a detail.
 *
 *  1. A file whose index character is not `.` is in Staged.
 *  2. A file whose worktree character is not `.` is in Changes.
 *  3. A file edited twice is in both, on two lines, exactly as the local panel
 *     draws it.
 *  4. A conflicted file is in Changes and in nowhere else. `groupFiles` sends
 *     one to Merge, and there is no Merge group on a remote tab, so copying
 *     that branch would drop the file off the panel.
 *  5. A row that reached this function with an untracked or an ignored index
 *     character is dropped, because it belongs to an array of its own.
 */

import { describe, expect, it } from 'vitest';
import type { MachineReviewFile } from '@shared/ipc';
import { groupFiles, groupRemoteFiles, isConflict } from '../groups';

/** One row, from an XY pair written the way git prints it. */
function pair(path: string, xy: string): MachineReviewFile {
  const x = (xy[0] ?? '.') as MachineReviewFile['indexState'];
  const y = (xy[1] ?? '.') as MachineReviewFile['worktreeState'];
  const folded = y !== '.' ? y : x;
  return {
    path,
    origPath: null,
    status: folded as MachineReviewFile['status'],
    indexState: x,
    worktreeState: y
  };
}

const names = (rows: readonly MachineReviewFile[]): string[] =>
  rows.map((one) => one.path);

describe('the two sides of the pair', () => {
  it('puts a staged only file in Staged and nowhere else', () => {
    const { staged, changes } = groupRemoteFiles([pair('src/a.ts', 'M.')]);
    expect(names(staged)).toEqual(['src/a.ts']);
    expect(names(changes)).toEqual([]);
  });

  it('puts an unstaged only file in Changes and nowhere else', () => {
    const { staged, changes } = groupRemoteFiles([pair('src/b.ts', '.M')]);
    expect(names(staged)).toEqual([]);
    expect(names(changes)).toEqual(['src/b.ts']);
  });

  it('puts a file edited twice in both groups', () => {
    const { staged, changes } = groupRemoteFiles([pair('src/c.ts', 'MM')]);
    expect(names(staged)).toEqual(['src/c.ts']);
    expect(names(changes)).toEqual(['src/c.ts']);
  });

  it('reads each side on its own for a mixed pair', () => {
    // A file staged as a change and then deleted on disk. Staged says M and
    // Changes says D, which is why the badge is read per group.
    const rows = [pair('src/d.ts', 'MD')];
    const { staged, changes } = groupRemoteFiles(rows);
    expect(staged[0]?.indexState).toBe('M');
    expect(changes[0]?.worktreeState).toBe('D');
  });

  it('handles every added, deleted, renamed and copied pair', () => {
    const rows = [
      pair('add.ts', 'A.'),
      pair('del.ts', 'D.'),
      pair('ren.ts', 'R.'),
      pair('cop.ts', 'C.'),
      pair('gone.ts', '.D'),
      pair('typ.ts', '.M')
    ];
    const { staged, changes } = groupRemoteFiles(rows);
    expect(names(staged)).toEqual(['add.ts', 'cop.ts', 'del.ts', 'ren.ts']);
    expect(names(changes)).toEqual(['gone.ts', 'typ.ts']);
  });
});

describe('a conflicted row', () => {
  const CONFLICTS = ['UU', 'AA', 'DD', 'AU', 'UD', 'DU', 'UA'];

  it('is in Changes and in nowhere else, for every unmerged pair', () => {
    for (const xy of CONFLICTS) {
      const row = pair(`merge/${xy}.ts`, xy);
      expect(isConflict(row), `${xy} should read as a conflict`).toBe(true);
      const { staged, changes } = groupRemoteFiles([row]);
      expect(names(staged), `${xy} must not reach Staged`).toEqual([]);
      expect(names(changes)).toEqual([`merge/${xy}.ts`]);
    }
  });

  it('is what the local rule sends to a group this view does not draw', () => {
    // The reason this function exists rather than reusing groupFiles. The
    // local rule puts a conflicted file in Merge, and no remote tab draws a
    // Merge group, so the file would be on no line at all.
    const local = groupFiles([
      { path: 'x.ts', indexState: 'U', worktreeState: 'U' }
    ]);
    expect(local.merge.map((one) => one.path)).toEqual(['x.ts']);
    expect(local.changes).toEqual([]);
  });
});

describe('rows that reached the wrong array', () => {
  it('drops an untracked pair, because it has an array of its own', () => {
    const { staged, changes } = groupRemoteFiles([pair('new.ts', '??')]);
    expect(staged).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('drops an ignored pair, which this store never sees at all', () => {
    const { staged, changes } = groupRemoteFiles([pair('out/x.js', '!!')]);
    expect(staged).toEqual([]);
    expect(changes).toEqual([]);
  });
});

describe('order and shape', () => {
  it('sorts both groups by path', () => {
    const { staged, changes } = groupRemoteFiles([
      pair('z.ts', 'MM'),
      pair('a.ts', 'MM'),
      pair('m.ts', 'MM')
    ]);
    expect(names(staged)).toEqual(['a.ts', 'm.ts', 'z.ts']);
    expect(names(changes)).toEqual(['a.ts', 'm.ts', 'z.ts']);
  });

  it('answers two empty arrays for no rows at all', () => {
    expect(groupRemoteFiles([])).toEqual({ staged: [], changes: [] });
  });

  it('keeps the rename path on the row it grouped', () => {
    const row = { ...pair('after.ts', 'R.'), origPath: 'before.ts' };
    const { staged } = groupRemoteFiles([row]);
    expect(staged[0]?.origPath).toBe('before.ts');
  });
});

describe('isConflict took a wider parameter and changed no answer', () => {
  it('answers the same for a local row and a remote row', () => {
    expect(isConflict({ indexState: 'U', worktreeState: 'U' })).toBe(true);
    expect(isConflict({ indexState: 'M', worktreeState: '.' })).toBe(false);
    expect(isConflict(pair('a.ts', 'UU'))).toBe(true);
    expect(isConflict(pair('a.ts', 'M.'))).toBe(false);
  });
});
