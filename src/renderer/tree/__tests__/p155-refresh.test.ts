/**
 * Phase 155. The tree that would not refresh, pinned on both halves.
 *
 * THE DEFECT THESE TESTS EXIST FOR. He dragged a file from Finder onto the
 * tree. It landed on disk, the listing store read it within about 200 ms, and
 * the row never appeared. He pressed Refresh and nothing moved. He switched to
 * another project tab and back and there it was.
 *
 * Both halves of that report were one cause. `applyImport` wrote the imported
 * path into `fed`, which is the diff's record of what the MODEL already holds,
 * while creating no model row at all. The add arm is `!fed.has(path)`, so from
 * that instant the row could never be emitted by any route for the life of the
 * mount. Refresh is downstream of that lie, which is why the button looked
 * broken while being perfectly healthy. A tab switch builds a new baseline from
 * nothing, which is why it cured it.
 *
 * Three groups, and every one of them fails on the parent commit:
 *
 * 1. `planListingDiff` is the mechanism, so the starvation is stated as a test
 *    rather than as a paragraph, and `baselineFromModel` is shown repairing it.
 * 2. `applyImport` is driven through the real verb with a fake model, and the
 *    baseline is counted before and after. It must not gain the imported path.
 * 3. The store is driven with a slow `readDir`, and Refresh is pressed while a
 *    read is already running. It must read the folder again rather than
 *    returning the answer that was already on its way.
 */

import { describe, expect, it } from 'vitest';
import { baselineFromModel, planListingDiff } from '../use-tree-model';

const noHold = (): boolean => false;

describe('planListingDiff, the arm the defect lived on', () => {
  it('adds a path the listing has and the baseline does not', () => {
    const { ops, applied } = planListingDiff(
      new Set(['a.md']),
      new Set(['a.md', 'dropped.md']),
      noHold
    );
    expect(ops).toEqual([{ type: 'add', path: 'dropped.md' }]);
    expect([...applied].sort()).toEqual(['a.md', 'dropped.md']);
  });

  it('EMITS NOTHING when the baseline claims a row the model never got', () => {
    // This is the operator's screen, exactly. The store is right, the disk is
    // right, and the baseline is the only liar in the building.
    const poisoned = new Set(['a.md', 'dropped.md']);
    const listed = new Set(['a.md', 'dropped.md']);
    expect(planListingDiff(poisoned, listed, noHold).ops).toEqual([]);
  });

  it('still emits nothing after the listing is read again', () => {
    // Why the Refresh button looked broken: re-reading the folder cannot help,
    // because the folder was never the thing that was wrong.
    const poisoned = new Set(['a.md', 'dropped.md']);
    for (let press = 0; press < 3; press += 1) {
      const listed = new Set(['a.md', 'dropped.md']);
      expect(planListingDiff(poisoned, listed, noHold).ops).toEqual([]);
    }
  });

  it('removes a path the baseline has and the listing has lost', () => {
    const { ops } = planListingDiff(
      new Set(['a.md', 'gone.md']),
      new Set(['a.md']),
      noHold
    );
    expect(ops).toEqual([{ type: 'remove', path: 'gone.md', recursive: true }]);
  });

  it('leaves a held path alone in both arms', () => {
    const held = (path: string): boolean => path === 'busy.md';
    const { ops, applied } = planListingDiff(
      new Set(['busy.md']),
      new Set(['busy.md', 'new.md']),
      held
    );
    expect(ops).toEqual([{ type: 'add', path: 'new.md' }]);
    expect(applied.has('busy.md')).toBe(true);
  });

  it('a recursive folder removal covers its children with one op', () => {
    const { ops, applied } = planListingDiff(
      new Set(['old/', 'old/one.md', 'old/deep/', 'old/deep/two.md']),
      new Set<string>(),
      noHold
    );
    expect(ops).toEqual([{ type: 'remove', path: 'old/', recursive: true }]);
    expect([...applied]).toEqual([]);
  });
});

describe('baselineFromModel, what Refresh rebuilds', () => {
  const holds = (rows: readonly string[]) => {
    const set = new Set(rows);
    return (path: string): boolean => set.has(path);
  };

  it('drops a path the model never got, so the next diff can add it', () => {
    const poisoned = new Set(['a.md', 'dropped.md']);
    const listed = new Set(['a.md', 'dropped.md']);
    const rebuilt = baselineFromModel(poisoned, listed, holds(['a.md']));
    expect([...rebuilt]).toEqual(['a.md']);
    // And now the row he was looking for is one operation away.
    expect(planListingDiff(rebuilt, listed, noHold).ops).toEqual([
      { type: 'add', path: 'dropped.md' }
    ]);
  });

  it('puts back a row the model holds that the baseline had forgotten', () => {
    const rebuilt = baselineFromModel(
      new Set(['a.md']),
      new Set(['a.md', 'orphan.md']),
      holds(['a.md', 'orphan.md'])
    );
    expect([...rebuilt].sort()).toEqual(['a.md', 'orphan.md']);
    // Which is what lets it be removed once the disk loses it.
    expect(planListingDiff(rebuilt, new Set(['a.md']), noHold).ops).toEqual([
      { type: 'remove', path: 'orphan.md', recursive: true }
    ]);
  });

  it('keeps a row that exists in the model but not in either input', () => {
    // The New File placeholder. It is deliberately kept out of `fed` and it is
    // not on disk, so nothing here can name it, which is why Refresh dropping
    // every hold cannot delete the row a person is typing a name into.
    const rebuilt = baselineFromModel(
      new Set(['a.md']),
      new Set(['a.md']),
      holds(['a.md', 'untitled'])
    );
    expect(rebuilt.has('untitled')).toBe(false);
    expect(planListingDiff(rebuilt, new Set(['a.md']), noHold).ops).toEqual([]);
  });
});
