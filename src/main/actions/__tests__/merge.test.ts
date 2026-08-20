/**
 * The fold of two run list answers into one list (Phase 120).
 *
 * Both functions are pure, so these tests are the whole truth about them.
 * What they cannot show is that the two gh queries actually run and land
 * here; service.test.ts and remote-runs.test.ts hold that shape, and
 * `npm run probe:p120` measures it against a real repository.
 */

import { describe, expect, it } from 'vitest';
import type { ActionsRun } from '@shared/actions';
import { capRuns, mergeRunQueries } from '../merge';

/** One run row with every field present and easy to override. */
function run(over: Partial<ActionsRun> = {}): ActionsRun {
  return {
    id: 1,
    number: 1,
    workflowName: 'CI',
    displayTitle: 'a change',
    status: 'completed',
    statusRaw: 'completed',
    conclusion: 'success',
    conclusionRaw: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: 'a'.repeat(40),
    createdAt: 1_000,
    startedAt: 1_005,
    updatedAt: 1_100,
    url: 'https://github.com/owner/repo/actions/runs/1',
    ...over
  };
}

describe('mergeRunQueries', () => {
  it('holds the union of two disjoint answers', () => {
    const merged = mergeRunQueries(
      [run({ id: 1 }), run({ id: 2 })],
      [run({ id: 3 })]
    );
    expect(merged.map((row) => row.id).sort()).toEqual([1, 2, 3]);
  });

  it('holds a run both queries returned exactly once', () => {
    // A run at the tip whose head branch is the branch is returned by BOTH
    // queries. The two answers are never assumed disjoint.
    const merged = mergeRunQueries(
      [run({ id: 7 }), run({ id: 8 })],
      [run({ id: 7 })]
    );
    expect(merged.filter((row) => row.id === 7)).toHaveLength(1);
    expect(merged).toHaveLength(2);
  });

  it('keeps the commit query’s copy when both return the same id', () => {
    // The commit query ran second, so its copy of the run is the newer read.
    const merged = mergeRunQueries(
      [run({ id: 7, statusRaw: 'in_progress', status: 'in_progress' })],
      [run({ id: 7, statusRaw: 'completed', status: 'completed' })]
    );
    expect(merged[0]?.statusRaw).toBe('completed');
  });

  it('sorts descending by start time', () => {
    const merged = mergeRunQueries(
      [run({ id: 1, startedAt: 100 }), run({ id: 2, startedAt: 300 })],
      [run({ id: 3, startedAt: 200 })]
    );
    expect(merged.map((row) => row.id)).toEqual([2, 3, 1]);
  });

  it('falls back to createdAt for a queued run that has not started', () => {
    const merged = mergeRunQueries(
      [run({ id: 1, startedAt: null, createdAt: 400 })],
      [run({ id: 2, startedAt: 300, createdAt: 100 })]
    );
    expect(merged.map((row) => row.id)).toEqual([1, 2]);
  });

  it('breaks a time tie by id descending, so the order is stable', () => {
    const merged = mergeRunQueries(
      [run({ id: 4, startedAt: 500 }), run({ id: 9, startedAt: 500 })],
      [run({ id: 6, startedAt: 500 })]
    );
    expect(merged.map((row) => row.id)).toEqual([9, 6, 4]);
  });

  it('answers an empty list for two empty answers', () => {
    expect(mergeRunQueries([], [])).toEqual([]);
    expect(mergeRunQueries([run({ id: 1 })], [])).toHaveLength(1);
    expect(mergeRunQueries([], [run({ id: 2 })])).toHaveLength(1);
  });
});

describe('capRuns', () => {
  const tip = 'f'.repeat(40);

  it('keeps at most the limit', () => {
    const rows = [run({ id: 3 }), run({ id: 2 }), run({ id: 1 })];
    expect(capRuns(rows, 2, null).map((row) => row.id)).toEqual([3, 2]);
  });

  it('keeps a tip row past the limit', () => {
    const rows = [
      run({ id: 5 }),
      run({ id: 4 }),
      run({ id: 3 }),
      run({ id: 2, headSha: tip }),
      run({ id: 1, headSha: tip })
    ];
    const kept = capRuns(rows, 2, tip);
    expect(kept.map((row) => row.id)).toEqual([5, 4, 2, 1]);
  });

  it('exempts nothing when the tip sha is null', () => {
    const rows = [run({ id: 2, headSha: tip }), run({ id: 1, headSha: tip })];
    expect(capRuns(rows, 1, null)).toHaveLength(1);
  });

  it('answers an empty list for an empty list', () => {
    expect(capRuns([], 10, tip)).toEqual([]);
  });
});
