import { describe, expect, it } from 'vitest';
import type { GitFileStatus } from '@shared/types';
import { groupFiles } from '../groups';
import {
  NO_SELECTION,
  discardCopy,
  flattenRows,
  moveCursor,
  pathsOf,
  pruneToRows,
  selectModeFor,
  selectRow,
  selectWholeGroup,
  selectedRows,
  targetRows,
  verbsFor
} from '../selection';
import type { ScmRow, ScmSelection } from '../selection';

const f = (
  path: string,
  indexState: GitFileStatus['indexState'],
  worktreeState: GitFileStatus['worktreeState']
): GitFileStatus => ({ path, indexState, worktreeState });

/** merge:c.ts · staged:a.ts · changes:b.ts, d.ts · untracked:new.ts */
const ROWS: ScmRow[] = flattenRows(
  groupFiles([
    f('c.ts', 'U', 'U'),
    f('a.ts', 'M', '.'),
    f('b.ts', '.', 'M'),
    f('d.ts', '.', 'M'),
    f('new.ts', '?', '?')
  ])
);

const KEYS = ROWS.map((r) => r.key);
const sel = (keys: string[], cursor: string, anchor: string): ScmSelection => ({
  keys,
  cursor,
  anchor
});

describe('flattenRows', () => {
  it('walks merge → staged → changes → untracked', () => {
    expect(KEYS).toEqual([
      'merge:c.ts',
      'staged:a.ts',
      'changes:b.ts',
      'changes:d.ts',
      'untracked:new.ts'
    ]);
  });

  it('gives an MM file two distinct rows', () => {
    const rows = flattenRows(groupFiles([f('both.ts', 'M', 'M')]));
    expect(rows.map((r) => r.key)).toEqual(['staged:both.ts', 'changes:both.ts']);
  });
});

describe('selectModeFor', () => {
  it('reads the modifiers, shift beating cmd', () => {
    const m = (shiftKey: boolean, metaKey: boolean, ctrlKey = false): string =>
      selectModeFor({ shiftKey, metaKey, ctrlKey });
    expect(m(false, false)).toBe('replace');
    expect(m(false, true)).toBe('toggle');
    expect(m(false, false, true)).toBe('toggle');
    expect(m(true, false)).toBe('range');
    expect(m(true, true)).toBe('range');
  });
});

describe('selectRow', () => {
  it('replaces on a plain click', () => {
    const s = selectRow(NO_SELECTION, ROWS, KEYS[2] as string, 'replace');
    expect(s).toEqual({ keys: [KEYS[2]], cursor: KEYS[2], anchor: KEYS[2] });
  });

  it('shift-click takes the inclusive range and leaves the anchor alone', () => {
    const first = selectRow(NO_SELECTION, ROWS, KEYS[1] as string, 'replace');
    const ranged = selectRow(first, ROWS, KEYS[3] as string, 'range');
    expect(ranged.keys).toEqual([KEYS[1], KEYS[2], KEYS[3]]);
    expect(ranged.anchor).toBe(KEYS[1]);
    expect(ranged.cursor).toBe(KEYS[3]);
    // Re-measuring from the SAME anchor, not ratcheting outward.
    const back = selectRow(ranged, ROWS, KEYS[0] as string, 'range');
    expect(back.keys).toEqual([KEYS[0], KEYS[1]]);
    expect(back.anchor).toBe(KEYS[1]);
  });

  it('cmd-click toggles one row and re-anchors there', () => {
    const a = selectRow(NO_SELECTION, ROWS, KEYS[0] as string, 'replace');
    const b = selectRow(a, ROWS, KEYS[3] as string, 'toggle');
    expect([...b.keys].sort()).toEqual([KEYS[0], KEYS[3]].sort());
    expect(b.anchor).toBe(KEYS[3]);
    const c = selectRow(b, ROWS, KEYS[0] as string, 'toggle');
    expect(c.keys).toEqual([KEYS[3]]);
  });

  it('ranges upward as happily as downward', () => {
    const s = selectRow(sel([KEYS[3] as string], KEYS[3] as string, KEYS[3] as string), ROWS, KEYS[1] as string, 'range');
    expect(s.keys).toEqual([KEYS[1], KEYS[2], KEYS[3]]);
  });
});

describe('moveCursor', () => {
  it('carries a fresh single selection without shift', () => {
    const s = moveCursor(sel([KEYS[0] as string], KEYS[0] as string, KEYS[0] as string), ROWS, 1, false);
    expect(s.keys).toEqual([KEYS[1]]);
    expect(s.cursor).toBe(KEYS[1]);
  });

  it('extends from the anchor with shift', () => {
    let s = selectRow(NO_SELECTION, ROWS, KEYS[1] as string, 'replace');
    s = moveCursor(s, ROWS, 1, true);
    s = moveCursor(s, ROWS, 1, true);
    expect(s.keys).toEqual([KEYS[1], KEYS[2], KEYS[3]]);
    expect(s.anchor).toBe(KEYS[1]);
  });

  it('shift+arrow back over the anchor shrinks, then grows the other way', () => {
    let s = selectRow(NO_SELECTION, ROWS, KEYS[2] as string, 'replace');
    s = moveCursor(s, ROWS, 1, true);
    expect(s.keys).toEqual([KEYS[2], KEYS[3]]);
    s = moveCursor(s, ROWS, -1, true);
    expect(s.keys).toEqual([KEYS[2]]);
    s = moveCursor(s, ROWS, -1, true);
    expect(s.keys).toEqual([KEYS[1], KEYS[2]]);
  });

  it('clamps at both ends', () => {
    const top = moveCursor(sel([KEYS[0] as string], KEYS[0] as string, KEYS[0] as string), ROWS, -1, false);
    expect(top.cursor).toBe(KEYS[0]);
    const last = KEYS[KEYS.length - 1] as string;
    const bottom = moveCursor(sel([last], last, last), ROWS, 1, false);
    expect(bottom.cursor).toBe(last);
  });
});

describe('selectWholeGroup', () => {
  it('takes the cursor row’s group only', () => {
    const s = selectWholeGroup(
      sel([KEYS[2] as string], KEYS[2] as string, KEYS[2] as string),
      ROWS
    );
    expect(s.keys).toEqual(['changes:b.ts', 'changes:d.ts']);
  });

  it('falls back to the first group when nothing is selected', () => {
    expect(selectWholeGroup(NO_SELECTION, ROWS).keys).toEqual(['merge:c.ts']);
  });

  it('is a no-op on an empty list', () => {
    expect(selectWholeGroup(NO_SELECTION, [])).toEqual(NO_SELECTION);
  });
});

describe('pruneToRows', () => {
  it('keeps rows that survive a refresh and drops the rest', () => {
    const before = sel(
      [KEYS[1] as string, KEYS[2] as string, KEYS[3] as string],
      KEYS[3] as string,
      KEYS[1] as string
    );
    // b.ts and d.ts got staged: their `changes` rows are gone.
    const after = flattenRows(
      groupFiles([f('a.ts', 'M', '.'), f('b.ts', 'M', '.'), f('d.ts', 'M', '.')])
    );
    const pruned = pruneToRows(before, after);
    expect(pruned.keys).toEqual(['staged:a.ts']);
    expect(pruned.cursor).toBe('staged:a.ts');
    expect(pruned.anchor).toBe('staged:a.ts');
  });

  it('clears to nothing when every selected file is gone', () => {
    const before = sel([KEYS[2] as string], KEYS[2] as string, KEYS[2] as string);
    expect(pruneToRows(before, [])).toEqual(NO_SELECTION);
  });

  it('returns the same object when nothing changed (no render churn)', () => {
    const before = sel([KEYS[2] as string], KEYS[2] as string, KEYS[2] as string);
    expect(pruneToRows(before, ROWS)).toBe(before);
  });
});

describe('targetRows', () => {
  const selection = sel(
    [KEYS[1] as string, KEYS[2] as string],
    KEYS[2] as string,
    KEYS[1] as string
  );

  it('acts on the whole selection from inside it', () => {
    const row = ROWS[1] as ScmRow;
    expect(targetRows(selection, ROWS, row).map((r) => r.key)).toEqual([
      KEYS[1],
      KEYS[2]
    ]);
  });

  it('acts on one row alone from outside it', () => {
    const row = ROWS[4] as ScmRow;
    expect(targetRows(selection, ROWS, row)).toEqual([row]);
  });
});

describe('verbsFor', () => {
  it('splits a mixed selection by what git can do to it', () => {
    const verbs = verbsFor(selectedRows(sel(KEYS as string[], KEYS[0] as string, KEYS[0] as string), ROWS));
    expect(verbs.unstage.map((r) => r.file.path)).toEqual(['a.ts']);
    expect(verbs.merge.map((r) => r.file.path)).toEqual(['c.ts']);
    expect(verbs.stage.map((r) => r.file.path)).toEqual([
      'c.ts',
      'b.ts',
      'd.ts',
      'new.ts'
    ]);
    expect(verbs.discard.map((r) => r.file.path)).toEqual([
      'b.ts',
      'd.ts',
      'new.ts'
    ]);
    expect(verbs.untracked).toBe(1);
  });

  it('never offers to discard a staged or conflicted row', () => {
    const verbs = verbsFor(ROWS.filter((r) => r.group === 'staged' || r.group === 'merge'));
    expect(verbs.discard).toEqual([]);
  });
});

describe('pathsOf', () => {
  it('de-duplicates the MM file staged and changed at once', () => {
    const rows = flattenRows(groupFiles([f('both.ts', 'M', 'M')]));
    expect(pathsOf(rows)).toEqual(['both.ts']);
  });
});

describe('discardCopy', () => {
  const changes = (n: number): ScmRow[] =>
    flattenRows(
      groupFiles(Array.from({ length: n }, (_, i) => f(`x${i}.ts`, '.', 'M')))
    );
  const untracked = (n: number): ScmRow[] =>
    flattenRows(
      groupFiles(Array.from({ length: n }, (_, i) => f(`n${i}.ts`, '?', '?')))
    );

  it('keeps the single-file copy the app already had', () => {
    expect(discardCopy(changes(1)).title).toBe("Discard changes to 'x0.ts'?");
    expect(discardCopy(untracked(1)).title).toBe("Delete 'n0.ts'?");
  });

  it('names the count on a multi-file discard', () => {
    const copy = discardCopy(changes(4));
    expect(copy.title).toBe('Discard changes in 4 files?');
    expect(copy.confirmLabel).toBe('Discard changes');
  });

  it('says DELETE when the whole selection is untracked', () => {
    expect(discardCopy(untracked(3)).title).toBe('Delete 3 files?');
    expect(discardCopy(untracked(3)).confirmLabel).toBe('Delete files');
  });

  it('warns about the untracked share of a mixed selection', () => {
    const copy = discardCopy([...changes(3), ...untracked(1)]);
    expect(copy.title).toBe('Discard changes in 4 files?');
    expect(copy.body).toContain('One of them is untracked');
    expect(discardCopy([...changes(2), ...untracked(2)]).body).toContain(
      '2 of them are untracked'
    );
  });
});
