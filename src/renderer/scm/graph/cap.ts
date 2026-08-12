/**
 * Degrading a wide graph into a narrow pane (Phase 14.5, research 24 §8).
 *
 * gmux's sidebar is 280 px by default and legal down to 220. Measured lane
 * counts on a real repo reach 11 at a 200-commit page and 17 at 752, so the
 * graph MUST fold rather than clip — BACKLOG 14.5 says so explicitly, and a
 * clipped graph silently lies about topology.
 *
 * Three properties, all of which come from this being a pure post-pass over a
 * full-fidelity layout rather than a change to the fold:
 *
 *  - **Uncapping is a re-render, not a relayout.** Lane assignment is
 *    untouched, so widening the pane cannot reshuffle anything.
 *  - **The gutter is a function of the CAP, never of the current maximum.**
 *    Size it once from `cap`; if it tracked `layout.maxLanes`, every
 *    "load 50 more" would reflow the subject column and the whole list would
 *    jump under the user's cursor.
 *  - **The dot is never dropped.** A commit whose column is past the cap draws
 *    ON the bundle column instead of vanishing — losing a row's dot would make
 *    the history unreadable, which is worse than an approximate column.
 */

import type { GraphLayout, GraphRow, Lane } from './types';

/**
 * Columns to show before folding, when the caller does not compute one.
 *
 * In the app it always does: `geometry.ts`'s `laneCap(maxLanes, width)`
 * derives the cap from the pane's measured width, which is the right answer at
 * 220 px as well as at 400 px. This exists so `capRow` is usable and testable
 * on its own — and `laneCap` imports it rather than restating the 6, so the
 * standalone default and the width-derived ceiling cannot drift apart.
 */
export const DEFAULT_LANE_CAP = 6;

export interface CappedRow {
  /** Input lanes that survive the cap, in order. */
  readonly in: readonly Lane[];
  /** Output lanes that survive the cap, in order. */
  readonly out: readonly Lane[];
  /** Dot column, clamped onto the bundle column when it overflowed. */
  readonly circle: number;
  /** Merge targets, clamped and deduped onto surviving columns. */
  readonly mergeTargets: readonly number[];
  /**
   * Column hosting the fold marker, or -1 when the row fits. Drawn as a
   * doubled stroke in `--text-muted` — a distinct MARK, not a lane colour, so
   * it never reads as a real line of history.
   */
  readonly bundleColumn: number;
  /** Input lanes folded into the marker. */
  readonly bundledIn: number;
  /** Output lanes folded into the marker. */
  readonly bundledOut: number;
}

/**
 * Fold one row to at most `cap` columns.
 *
 * Returns the row's own arrays untouched when it already fits, so the common
 * case allocates nothing and referential equality survives for memoisation.
 */
export function capRow(row: GraphRow, cap: number = DEFAULT_LANE_CAP): CappedRow {
  const limit = Math.max(2, Math.trunc(cap));
  const fits =
    row.in.length <= limit && row.out.length <= limit && row.circle < limit;
  if (fits) {
    return {
      in: row.in,
      out: row.out,
      circle: row.circle,
      mergeTargets: row.mergeTargets,
      bundleColumn: -1,
      bundledIn: 0,
      bundledOut: 0
    };
  }

  // The last visible column becomes the marker, so `keep` real lanes survive.
  const keep = limit - 1;
  const mergeTargets: number[] = [];
  for (const target of row.mergeTargets) {
    const clamped = Math.min(target, keep);
    if (!mergeTargets.includes(clamped)) mergeTargets.push(clamped);
  }

  return {
    in: row.in.slice(0, keep),
    out: row.out.slice(0, keep),
    circle: Math.min(row.circle, keep),
    mergeTargets,
    bundleColumn: keep,
    bundledIn: Math.max(0, row.in.length - keep),
    bundledOut: Math.max(0, row.out.length - keep)
  };
}

/**
 * Columns the gutter must reserve. `Math.min(maxLanes, cap)` — a repo that
 * never exceeds three lanes should not pay for six, but a repo that does must
 * not grow the gutter as the user pages.
 */
export function gutterColumns(
  layout: GraphLayout,
  cap: number = DEFAULT_LANE_CAP
): number {
  const limit = Math.max(2, Math.trunc(cap));
  return Math.max(1, Math.min(layout.maxLanes, limit));
}
