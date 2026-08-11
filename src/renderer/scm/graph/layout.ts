/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * The swimlane fold — a port of `toISCMHistoryItemViewModelArray()` from
 * microsoft/vscode, `src/vs/workbench/contrib/scm/browser/scmHistory.ts`
 * (MIT, header above kept intact). Behaviour was read from that file and
 * re-measured against real repositories in docs/research/24-git-graph.md;
 * this is assembly of a known-good algorithm, per CLAUDE.md's
 * "assemble, never reimplement".
 *
 * NOTHING here derives from mhutchie/vscode-git-graph. Its LICENSE withholds
 * derivative-work rights (GitHub reports NOASSERTION), so it may not be
 * ported or transcribed — and its whole-graph, multi-row-polyline model is the
 * wrong shape anyway: you cannot draw row 400 without rows 1–399, which rules
 * out row virtualization.
 *
 * ## The model, in one sentence
 *
 * A lane is a PROMISE to draw a specific SHA, and the algorithm is a single
 * left fold whose entire state is the previous row's output lanes.
 *
 * For each commit, walk the input lanes left to right:
 *  - the FIRST lane awaiting this SHA becomes the commit's column, and its
 *    promise is replaced by the commit's first parent;
 *  - any FURTHER lane awaiting the same SHA is a child that has already been
 *    drawn, so its column closes and everything right of it shifts left — that
 *    is a merge JOIN;
 *  - parents beyond the first append new lanes at the right edge — that is a
 *    branch SPLIT, and because it is a plain loop over `parents[1..n]`, an
 *    octopus merge needs no special case at any layer.
 *
 * ## Stability — the property Phase 14.5 actually demands
 *
 * "Lanes must not reshuffle under the user's eyes as they scroll."
 *
 * It falls out of the fold being a LEFT fold with no lookahead: row *n*'s
 * lanes are a pure function of commits `0..n`. Appending a page cannot change
 * a row already on screen, because nothing after row *n* is an input to row
 * *n*. Colour is stable for the same reason: the cycler's state
 * (`lastUsed[slot]`) is also advanced strictly left to right.
 *
 * Three things WOULD break it, and all three are contracts on the caller:
 *
 *  1. **The ref set must not change between pages.** Pin it: the data layer
 *     echoes the resolved refnames back as `GitGraphLogResult.refs`, and the
 *     next page must be requested with `GitGraphLogInput.refs` set to exactly
 *     that list. Changing scope is a full relayout, not an append.
 *  2. **The ordering flag must not change between pages** — `--topo-order`,
 *     always.
 *  3. **`roleOf` must answer the same way for the same commit across pages.**
 *     It is derived from the divergence snapshot; reuse the snapshot that came
 *     with the page rather than re-resolving per render.
 *
 * Given those, `layout(first 200)` and `layout(first 400)` agree on every field
 * of the first 200 rows — asserted directly in `__tests__/stability.test.ts`
 * against a real 400-commit merge tangle, not argued.
 *
 * ## Two defects in the reference, fixed here
 *
 *  - **Root-commit lane wipe.** VS Code guards the whole input walk with
 *    `if (parentIds.length > 0)`, so a parentless commit emits EMPTY output
 *    lanes and silently kills every other live lane below it. Harmless when
 *    the single root is the last row; wrong for multi-root repos, grafts and
 *    shallow clones. Here the walk always runs and the root's own lane simply
 *    closes, because there is no first parent to hand it to.
 *  - **Duplicate lanes for an already-awaited parent.** VS Code appends
 *    `parents[i]` without checking whether that SHA is already promised by
 *    another column, opening a phantom parallel lane that converges later.
 *    Measured on getspecstory at 752 commits: 1264 duplicate lane-slots, max
 *    lanes 17 → 14 once deduped (research 24 §4.3).
 */

import { createLaneCycler } from './colors';
import type {
  GraphCommit,
  GraphLayout,
  GraphRow,
  Lane,
  LaneColor,
  RoleResolver
} from './types';

const NO_LANES: readonly Lane[] = Object.freeze([]);
const NO_TARGETS: readonly number[] = Object.freeze([]);

export interface LayoutOptions {
  /**
   * Maps a commit to a fixed role colour, or `undefined` to let its lane keep
   * the colour it inherited. Build one with `makeRoleResolver` in `roles.ts`.
   */
  roleOf?: RoleResolver;
  /** Rotating hue count. Only tests should pass this. */
  cycleLength?: number;
}

/**
 * Lay out a topologically ordered commit list into swimlanes.
 *
 * `commits` MUST come from a `--topo-order` (or `--date-order`) walk: the fold
 * assumes a parent never precedes any of its children. Git's default
 * reverse-chronological walk does not guarantee that — clock skew alone breaks
 * it — which is why the ordering flag is a correctness requirement and not a
 * nicety. Rows are 1:1 with `commits`, in the same order, always.
 *
 * O(rows × lanes) with tiny constants: measured at 1.3 ms for 932 rows,
 * negligible beside the git process spawn.
 */
export function layoutGraph(
  commits: readonly GraphCommit[],
  options: LayoutOptions = {}
): GraphLayout {
  const roleOf = options.roleOf;
  const cycler = createLaneCycler(options.cycleLength);

  // Membership of the loaded window, so a lane pointing at a commit we do not
  // have can be reported honestly instead of drawn as if it ended.
  const loaded = new Set<string>();
  for (const commit of commits) loaded.add(commit.hash);

  const rows: GraphRow[] = [];
  let inLanes: readonly Lane[] = NO_LANES;
  let maxLanes = 0;
  let index = 0;

  for (const commit of commits) {
    const firstParent = commit.parents.length > 0 ? commit.parents[0] : undefined;
    const roleColor = colorForRole(roleOf?.(commit.hash));

    const out: Lane[] = [];
    let circle = -1;
    let dotColor: LaneColor | undefined = roleColor;

    // 1. Walk the input lanes, preserving column order.
    //    No `parents.length > 0` guard — see "Root-commit lane wipe" above.
    for (const lane of inLanes) {
      if (lane.sha !== commit.hash) {
        out.push(lane);
        continue;
      }
      if (circle === -1) {
        // Nothing before this matched, so `out.length` is this lane's column
        // in `in` — the continuation keeps the commit's column, which is what
        // makes a straight run of commits draw as one unbroken line.
        circle = out.length;
        dotColor = dotColor ?? lane.color;
        if (firstParent !== undefined) {
          out.push({ sha: firstParent, color: dotColor });
        }
        // A root closes its lane here: no promise replaces the kept one.
        continue;
      }
      // A further lane awaiting the same SHA is a second child converging.
      // Dropping it is the JOIN: columns to its right shift one left.
    }

    // 2. Nothing awaited it — a branch tip entering the window. Open a lane
    //    one past the right edge rather than stealing a column.
    if (circle === -1) {
      circle = out.length;
      dotColor = dotColor ?? cycler.next(index, out, out.length);
      if (firstParent !== undefined) {
        out.push({ sha: firstParent, color: dotColor });
      }
    }

    // 3. Second and later parents. Generic in n, so octopus merges are free.
    let mergeTargets: readonly number[] = NO_TARGETS;
    if (commit.parents.length > 1) {
      const targets: number[] = [];
      for (let p = 1; p < commit.parents.length; p++) {
        const sha = commit.parents[p];
        if (sha === undefined) continue;
        // Already promised by a live column? Route into it instead of opening
        // a phantom parallel lane that converges a few rows later.
        const existing = out.findIndex((lane) => lane.sha === sha);
        if (existing !== -1) {
          targets.push(existing);
          continue;
        }
        const parentColor =
          colorForRole(roleOf?.(sha)) ?? cycler.next(index, out, out.length);
        targets.push(out.length);
        out.push({ sha, color: parentColor });
      }
      mergeTargets = targets;
    }

    cycler.touch(index, out);

    let openEnded = false;
    for (const lane of out) {
      if (!loaded.has(lane.sha)) {
        openEnded = true;
        break;
      }
    }

    const width = Math.max(inLanes.length, out.length, circle + 1);
    if (width > maxLanes) maxLanes = width;

    rows.push({
      index,
      hash: commit.hash,
      in: inLanes,
      out,
      circle,
      // `dotColor` is assigned on every path above; the fallback only exists
      // to keep the type honest.
      color: dotColor ?? { kind: 'cycle', slot: 0 },
      mergeTargets,
      openEnded,
      isMerge: commit.parents.length > 1,
      isRoot: commit.parents.length === 0
    });

    inLanes = out;
    index++;
  }

  return { rows, tailLanes: inLanes, maxLanes };
}

function colorForRole(
  role: ReturnType<RoleResolver> | undefined
): LaneColor | undefined {
  return role === undefined ? undefined : { kind: 'role', role };
}
