import { describe, expect, it } from 'vitest';
import { layoutGraph } from '../layout';
import { makeRoleResolver } from '../roles';
import type { GraphCommit } from '../types';
import { assertGraphInvariants, renderAscii } from './invariants';
import {
  DUPLICATE_PARENT,
  EMPTY,
  OCTOPUS_BASE,
  OCTOPUS_HEAD,
  OCTOPUS_REPO,
  OCTOPUS_UPSTREAM,
  OFF_WINDOW,
  REPEATED_PARENT,
  TWO_ROOTS
} from './fixtures/tangle';
import {
  GETSPECSTORY_HEAD,
  GETSPECSTORY_MERGE_BASE,
  GETSPECSTORY_TANGLE,
  GETSPECSTORY_UPSTREAM,
  GIT_MAX_LANES
} from './fixtures/getspecstory';

const asCommits = (
  entries: readonly { hash: string; parents: readonly string[] }[]
): readonly GraphCommit[] => entries;

describe('layoutGraph — ground truth against `git log --graph`', () => {
  const roleOf = makeRoleResolver({
    headSha: OCTOPUS_HEAD,
    upstreamSha: OCTOPUS_UPSTREAM,
    mergeBase: OCTOPUS_BASE
  });

  it('reproduces the topology git itself draws for a real octopus repo', () => {
    const layout = layoutGraph(OCTOPUS_REPO, { roleOf });
    assertGraphInvariants(OCTOPUS_REPO, layout);

    // git's own picture of the same scope, for side-by-side reading:
    //
    //     *-.   38cb869 Octopus merge featB+featC
    //     |\ \
    //     | | * f3535c7 c1
    //     | * | f272f38 b1
    //     | |/
    //     * |   a858630 Merge featA
    //     |\ \
    //     | |/
    //     |/|
    //     | * 71e849b a2
    //     | * fdac9ea a1
    //     |/
    //     * 9a8b6e5 local1
    //     | * 0cf2956 remote2
    //     | * fdc0d15 remote1
    //     |/
    //     * f75df4e base2
    //     * 332ede8 base1
    //
    // Same commits, same relative depths, same convergence points. The one
    // difference is width, and it is a rendering choice rather than a topology
    // difference: git frees a column WITHIN the row that frees it (its `|/`
    // rows), while a swimlane holds the slot until the next row — the honest
    // price of one self-contained SVG per row (research 24 §4.2).
    expect(renderAscii(layout)).toEqual([
      '◍ │ │    38cb869',
      '│ │ ●    f3535c7',
      '│ ● │    f272f38',
      '◍ │ │ │  a858630',
      '│ │ │ ●  71e849b',
      '│ │ │ ●  fdac9ea',
      '● │ │ │  9a8b6e5',
      '│ ●      0cf2956',
      '│ ●      fdc0d15',
      '● │      f75df4e',
      '◎        332ede8'
    ]);
  });

  it('routes all three octopus parents without a special case', () => {
    const layout = layoutGraph(OCTOPUS_REPO, { roleOf });
    const octopus = layout.rows[0];
    expect(octopus?.isMerge).toBe(true);
    // Three parents → the dot's own lane plus TWO appended at the right edge,
    // opened by the same generic `parents[1..n]` loop a two-parent merge uses.
    expect(octopus?.mergeTargets).toEqual([1, 2]);
    expect(octopus?.out.map((lane) => lane.sha)).toEqual([
      'a858630',
      'f272f38',
      'f3535c7'
    ]);
  });

  it('puts the upstream on its own lane, converging at the merge base', () => {
    const layout = layoutGraph(OCTOPUS_REPO, { roleOf });
    // This IS ask #1: `origin/main` is a visibly separate line of history that
    // rejoins where the two branches last agreed, rather than a pill floating
    // on a row of your own commits.
    const remoteTip = layout.rows[7];
    expect(remoteTip?.hash).toBe(OCTOPUS_UPSTREAM);
    expect(remoteTip?.circle).toBe(1);
    expect(remoteTip?.color).toEqual({ kind: 'role', role: 'remote' });

    const base = layout.rows[9];
    expect(base?.hash).toBe(OCTOPUS_BASE);
    expect(base?.circle).toBe(0);
    // Two lanes arrive, one leaves: below the merge base the history is shared,
    // and the lane recolours to say so.
    expect(base?.in).toHaveLength(2);
    expect(base?.out).toHaveLength(1);
    expect(base?.color).toEqual({ kind: 'role', role: 'base' });

    // Everything above the base on column 0 is the local lane.
    expect(layout.rows[0]?.color).toEqual({ kind: 'role', role: 'local' });
    expect(layout.rows[6]?.color).toEqual({ kind: 'role', role: 'local' });
  });
});

describe('layoutGraph — the cases that break lane algorithms', () => {
  it('does not wipe live lanes at a root commit', () => {
    const layout = layoutGraph(TWO_ROOTS);
    assertGraphInvariants(TWO_ROOTS, layout);

    // Row 3 is the first root, and `E`'s lane must survive it. The VS Code
    // reference guards its whole input walk with `parentIds.length > 0` and
    // therefore emits NO output lanes here, silently deleting the second root's
    // line of history — visible on grafted, orphan-branch and shallow repos.
    const firstRoot = layout.rows[3];
    expect(firstRoot?.hash).toBe('D');
    expect(firstRoot?.isRoot).toBe(true);
    expect(firstRoot?.out.map((lane) => lane.sha)).toEqual(['E']);

    expect(layout.rows[4]?.hash).toBe('E');
    expect(layout.rows[4]?.circle).toBe(0);
    expect(layout.tailLanes).toEqual([]);
  });

  it('keeps parents outside the window open instead of inventing a join', () => {
    const layout = layoutGraph(OFF_WINDOW);
    assertGraphInvariants(OFF_WINDOW, layout);

    // Two tips whose parents were not loaded. Nothing converges — a join here
    // would be a fabrication, and a hard stop would read as "this branch ends".
    expect(layout.rows.every((row) => row.openEnded)).toBe(true);
    expect(layout.tailLanes.map((lane) => lane.sha)).toEqual(['X', 'Y']);
    // The two open lanes get DIFFERENT hues: the placeholder row below the last
    // commit draws both, and identical strokes would read as one branch.
    expect(layout.tailLanes[0]?.color).not.toEqual(layout.tailLanes[1]?.color);
  });

  it('routes a merge into an existing lane instead of duplicating it', () => {
    const layout = layoutGraph(DUPLICATE_PARENT);
    assertGraphInvariants(DUPLICATE_PARENT, layout);

    // `X` already opened a lane for `P`. `Y` merges `P` one row later, and the
    // edge must land in that column — not open a second `P` lane that runs in
    // parallel and converges a row later (1264 such slots on getspecstory at
    // 752 commits before this fix; max lanes 17 → 14, research 24 §4.3).
    const merge = layout.rows[1];
    expect(merge?.hash).toBe('Y');
    expect(merge?.mergeTargets).toEqual([1]);
    expect(merge?.out.map((lane) => lane.sha)).toEqual(['Z', 'P']);
    expect(layout.maxLanes).toBe(2);
  });

  it('handles a commit listed as its own parent twice', () => {
    const layout = layoutGraph(REPEATED_PARENT);
    assertGraphInvariants(REPEATED_PARENT, layout);
    // Legal via `git commit-tree`, and it must not open a phantom second lane.
    expect(layout.rows[0]?.mergeTargets).toEqual([0]);
    expect(layout.maxLanes).toBe(1);
  });

  it('lays out an empty window', () => {
    const layout = layoutGraph(EMPTY);
    assertGraphInvariants(EMPTY, layout);
    expect(layout).toEqual({ rows: [], tailLanes: [], maxLanes: 0 });
  });

  it('lays out a single root commit', () => {
    const one: readonly GraphCommit[] = [{ hash: 'R', parents: [] }];
    const layout = layoutGraph(one);
    assertGraphInvariants(one, layout);
    expect(layout.rows[0]?.circle).toBe(0);
    expect(layout.rows[0]?.out).toEqual([]);
    expect(layout.maxLanes).toBe(1);
  });
});

describe('layoutGraph — a real 400-commit merge tangle (getspecstory)', () => {
  const commits = asCommits(GETSPECSTORY_TANGLE);
  const roleOf = makeRoleResolver({
    headSha: GETSPECSTORY_HEAD,
    upstreamSha: GETSPECSTORY_UPSTREAM,
    mergeBase: GETSPECSTORY_MERGE_BASE
  });

  it('satisfies every structural invariant at 50, 200 and 400 commits', () => {
    for (const window of [50, 200, 400]) {
      const slice = commits.slice(0, window);
      assertGraphInvariants(slice, layoutGraph(slice, { roleOf }));
    }
  });

  it('stays within a lane budget the sidebar can render', () => {
    // Regression ceilings. The right-hand column is what `git log --graph`
    // itself drew on the same capture; ours may exceed it by the §4.2
    // within-row compaction gap and by nothing else, so a jump here means the
    // fold started leaking lanes.
    const measured: Record<number, number> = {};
    for (const window of [50, 200, 400]) {
      measured[window] = layoutGraph(commits.slice(0, window), {
        roleOf
      }).maxLanes;
    }
    expect(measured).toEqual({ 50: 4, 200: 11, 400: 14 });
    for (const window of [50, 200, 400]) {
      expect(measured[window]).toBeGreaterThanOrEqual(
        GIT_MAX_LANES[window] ?? 0
      );
    }
  });

  it('has the merge topology the fixture claims (not a linear history)', () => {
    const layout = layoutGraph(commits, { roleOf });
    // 79 merges in 400 rows — this really is a tangle, so the invariants above
    // are being exercised rather than trivially satisfied by a straight line.
    expect(layout.rows.filter((row) => row.isMerge).length).toBe(79);
    // Rows where SEVERAL children converge on one commit: the columns to the
    // right shift left, which is where lane bookkeeping actually fails.
    const joins = layout.rows.filter(
      (row) => row.in.filter((lane) => lane.sha === row.hash).length > 1
    );
    expect(joins.length).toBeGreaterThan(10);
    // And rows still carrying an unresolved promise off the bottom of the
    // window — 11 lanes are still open after 400 commits.
    expect(layout.tailLanes.length).toBe(11);
    expect(layout.rows.at(-1)?.openEnded).toBe(true);
  });

  it('marks the upstream tip, HEAD and the merge base with role colours', () => {
    const layout = layoutGraph(commits, { roleOf });
    const byHash = new Map(layout.rows.map((row) => [row.hash, row]));
    expect(byHash.get(GETSPECSTORY_UPSTREAM)?.color).toEqual({
      kind: 'role',
      role: 'remote'
    });
    // At capture time HEAD *is* the merge base (0 ahead / 1 behind): the row
    // reads as your branch, not as a merge base, because there is no
    // divergence for a base colour to describe.
    expect(GETSPECSTORY_HEAD).toBe(GETSPECSTORY_MERGE_BASE);
    expect(byHash.get(GETSPECSTORY_HEAD)?.color).toEqual({
      kind: 'role',
      role: 'local'
    });
  });

  it('lays out 400 rows fast enough to be irrelevant beside the git spawn', () => {
    const started = performance.now();
    for (let i = 0; i < 10; i++) layoutGraph(commits, { roleOf });
    const perRun = (performance.now() - started) / 10;
    // Measured ~1 ms; the bound is loose so it flags an algorithmic regression
    // (an accidental O(n²)) rather than machine noise.
    expect(perRun).toBeLessThan(40);
  });
});
