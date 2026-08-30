/**
 * The window of rows the Changes list draws (Phase 167).
 *
 * WHY THIS EXISTS. The list used to draw every row main sent, and main sends
 * up to 10,000 of them. Measured on 2026-08-29 with the Phase 163 instrument,
 * a churn of 96,000 untracked files in a watched project put 100,181 DOM
 * nodes on the page for those 10,000 rows, being 25 React fibers, 10
 * elements, 20 bound closures and 2 scrollable areas per row, and took the
 * renderer from 64 MB to 1,297 MB private while the files were written and
 * to 1,823 MB while they were deleted, with 51 long tasks totalling 8.2 s. It
 * all came back once the files were gone, so it was never a leak, but a
 * transient of that size is the audit's rule about one time allocations
 * stated the wrong way round: a person cannot use a list of 10,000 rows and
 * the page paid for every one of them on every 150 ms refresh through the
 * churn.
 *
 * WHAT IT DOES. Each group draws at most `SCM_ROW_WINDOW` rows, plus as many
 * more windows as a person has asked for through the Show more line, and one
 * line saying how many rows are left. Every other number on the surface is
 * unchanged: the section count, the rail badge and each group's own count
 * still read the whole list, and the group header's Stage all, Unstage all
 * and Mark all resolved still act on every file in the group. What moves is
 * only how many rows exist in the DOM at once.
 *
 * WHY A WINDOW AND NOT A VIRTUAL LIST. The local list scrolls with the whole
 * sidebar rather than in a box of its own, so a virtual list would need the
 * sidebar's scroll geometry and a fixed row height contract with it, which is
 * new machinery for a case a person meets once in a while. A window is a
 * slice and a count, and both are plain functions tested without a DOM.
 *
 * Pure module: no imports with side effects, unit tested in node.
 */

import type { ScmGroups } from './groups';
import { SCM_GROUP_ORDER } from './selection';
import type { ScmGroupId } from './selection';

/** Rows one group draws before it asks; each Show more adds this many. */
export const SCM_ROW_WINDOW = 200;

/** How many extra windows each group has been asked to show. Absent is 0. */
export type ShownWindows = Partial<Record<ScmGroupId, number>>;

export const NO_EXTRA_WINDOWS: ShownWindows = {};

export interface WindowedGroups {
  /** The rows to draw, per group, in the group's own order. */
  groups: ScmGroups;
  /** Rows per group that exist but are not drawn. */
  hidden: Record<ScmGroupId, number>;
}

/** How many rows a group may draw given its extra windows. */
export function rowsAllowed(extra: number | undefined): number {
  const windows = Number.isFinite(extra) && (extra ?? 0) > 0 ? Math.floor(extra ?? 0) : 0;
  return SCM_ROW_WINDOW * (1 + windows);
}

/**
 * Slice every group to its window. A group inside the window is returned as
 * the same array, so a memo over it keeps its identity and nothing under it
 * re-renders for a slice that changed nothing.
 */
export function windowGroups(
  groups: ScmGroups,
  shown: ShownWindows
): WindowedGroups {
  const out: ScmGroups = {
    merge: groups.merge,
    staged: groups.staged,
    changes: groups.changes,
    untracked: groups.untracked
  };
  const hidden: Record<ScmGroupId, number> = {
    merge: 0,
    staged: 0,
    changes: 0,
    untracked: 0
  };
  for (const g of SCM_GROUP_ORDER) {
    const all = groups[g];
    const allowed = rowsAllowed(shown[g]);
    if (all.length > allowed) {
      out[g] = all.slice(0, allowed);
      hidden[g] = all.length - allowed;
    }
  }
  return { groups: out, hidden };
}

/** One more window for a group; the rest of the record is kept as it was. */
export function showMore(shown: ShownWindows, group: ScmGroupId): ShownWindows {
  return { ...shown, [group]: (shown[group] ?? 0) + 1 };
}
