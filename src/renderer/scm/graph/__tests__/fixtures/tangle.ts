/**
 * Small, hand-checkable DAGs for the cases that break lane algorithms.
 *
 * The first one is not hand-written: it was captured from a REAL git
 * repository built in the scratchpad on 2026-08-11 (never in a user repo),
 * because "octopus merge" and "three-parent commit" are easy to get subtly
 * wrong when invented on paper. The rest are minimal synthetic DAGs aimed at
 * one hazard each.
 */

import type { GraphCommit } from '../../types';

/** `hash parent…` lines → commits, newest first. */
function dag(spec: string): readonly GraphCommit[] {
  const commits: GraphCommit[] = [];
  for (const line of spec.split('\n')) {
    const parts = line.trim().split(/\s+/).filter((p) => p.length > 0);
    const [hash, ...parents] = parts;
    if (hash === undefined) continue;
    commits.push({ hash, parents });
  }
  return commits;
}

/**
 * A real repository with a three-parent octopus merge, a real remote, a real
 * root, and local 7 ahead / 2 behind `origin/main`.
 *
 * Built and captured with:
 *
 *     git log --topo-order --format='%h %p' refs/heads/main refs/remotes/origin/main
 *
 * `git log --graph --oneline --topo-order` on the same scope, verbatim — the
 * ground truth every assertion in `layout.test.ts` is checked against:
 *
 *     *-.   38cb869 Octopus merge featB+featC
 *     |\ \
 *     | | * f3535c7 c1
 *     | * | f272f38 b1
 *     | |/
 *     * |   a858630 Merge featA
 *     |\ \
 *     | |/
 *     |/|
 *     | * 71e849b a2
 *     | * fdac9ea a1
 *     |/
 *     * 9a8b6e5 local1
 *     | * 0cf2956 remote2
 *     | * fdc0d15 remote1
 *     |/
 *     * f75df4e base2
 *     * 332ede8 base1
 */
export const OCTOPUS_REPO: readonly GraphCommit[] = dag(`
  38cb869 a858630 f272f38 f3535c7
  f3535c7 9a8b6e5
  f272f38 9a8b6e5
  a858630 9a8b6e5 71e849b
  71e849b fdac9ea
  fdac9ea 9a8b6e5
  9a8b6e5 f75df4e
  0cf2956 fdc0d15
  fdc0d15 f75df4e
  f75df4e 332ede8
  332ede8
`);

/** HEAD's tip — `refs/heads/main`, the octopus merge. */
export const OCTOPUS_HEAD = '38cb869';
/** The upstream's tip — `refs/remotes/origin/main`. */
export const OCTOPUS_UPSTREAM = '0cf2956';
/** `git merge-base main origin/main`. */
export const OCTOPUS_BASE = 'f75df4e';
/** `git rev-list --left-right --count main...origin/main` → `7  2`. */
export const OCTOPUS_AHEAD_BEHIND = { ahead: 7, behind: 2 } as const;

/**
 * TWO roots, with the first one in the middle of the window.
 *
 * This is the case the VS Code reference gets wrong: its input walk is guarded
 * by `if (parentIds.length > 0)`, so a parentless commit emits empty output
 * lanes and every other live lane below it silently disappears. Real repos hit
 * it — grafted histories, `git checkout --orphan` docs branches, subtree
 * merges of a project that had its own root, and shallow clones where the
 * boundary commits are parentless by construction.
 *
 *     A ── B ── D ── (root)      and      C ── E ── (root)
 */
export const TWO_ROOTS: readonly GraphCommit[] = dag(`
  A B
  C E
  B D
  D
  E
`);

/**
 * A window that stops mid-history: `X` and `Y`'s parents are outside it.
 *
 * Nothing may be invented here — no join, no synthetic terminator. Both lanes
 * stay open and the last row's `out` is what the "load more" placeholder draws
 * so the graph reads as continuing rather than amputated.
 */
export const OFF_WINDOW: readonly GraphCommit[] = dag(`
  T1 X
  T2 Y
`);

/**
 * A merge whose second parent is ALREADY promised by a live lane.
 *
 * The reference appends it unconditionally, opening a phantom parallel lane
 * that converges a few rows later — 1264 such slots on getspecstory at 752
 * commits (research 24 §4.3).
 *
 * `X` opens a lane for `P`. One row later `Y` merges `P` too, and that lane is
 * still live: the edge must route into the existing column instead of opening
 * a second lane for the same commit. Row 1 is the assertion that matters.
 */
export const DUPLICATE_PARENT: readonly GraphCommit[] = dag(`
  X Y P
  Y Z P
  Z R
  P R
  R
`);

/** A commit that is its own merge parent twice — legal via `git commit-tree`. */
export const REPEATED_PARENT: readonly GraphCommit[] = dag(`
  M P P
  P R
  R
`);

/** Nothing at all. The fold must not special-case it. */
export const EMPTY: readonly GraphCommit[] = [];
