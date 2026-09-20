/**
 * Which rows the session manager's filters leave, in which order, and the ids a
 * verb may act on (Phase 293).
 *
 * Pure over the projection (./projection.ts): nothing here reads the store, the
 * DOM or the clock.
 *
 * THE INVARIANT THIS FILE SERVES: `checked ⊆ visibleIds(current filters)`. The
 * select-all box checks `visibleIds`, the prune in ./use-sheet-refresh.ts
 * unchecks whatever is not in it, and the batch intersects with it again when
 * it names and again at the press (./actions.ts). A row a person cannot see is
 * never ended by a batch, so `visibleIds` is the ONE answer to "which rows can
 * a person see", and it never holds an empty id: nothing without a session id
 * is ever a target.
 *
 * TWO RULES OF THE SORT, each a bug in the study that is not copied:
 *
 *  - A NULL SORTS LAST IN BOTH DIRECTIONS. The study sorted a missing count as
 *    -1, which put every shell first on an ascending Messages sort. A dash is
 *    not a small number; it is the absence of one. A `createdAt` that is not
 *    above 0 is such a null, because the Created cell draws a dash for it.
 *  - Sorting reorders rows INSIDE each group. Groups never reorder, because a
 *    group is a place (a folder on a computer) and a person finds it where it
 *    was.
 *
 * THE PAST TAB IS ONE LIST (the operator's ruling, 2026-09-19, option A). It is
 * drawn in main's order, newest removal first, exactly as today's Past Sessions
 * drew it, and it groups by project only when the project filter names one
 * project. The fix round ordered the GROUPS by their newest removal instead,
 * which kept only the newest removal on top: with removals alternating between
 * two projects, the second newest fell below every row of the newest one's
 * project, to row 22 of 22 behind twenty older removals.
 *
 * Search lowercases a haystack for display matching. That is not a path
 * comparison: nothing in this phase compares two paths case-folded
 * (`src/shared/workspace-target.ts`).
 */

import type { SessionStatus } from '@shared/types';
import type { SessionSheetState } from '../state/session-manager-slice';
import {
  drawnLastMessageAt,
  drawnMessageTotal,
  raisedLabel,
  type ManageSortKey
} from './copy';
import type { ManageGroup, ManageRow } from './projection';

/** The four controls of the toolbar, as the store holds them. */
export type ManageFilters = Pick<
  SessionSheetState,
  'search' | 'project' | 'tabFilter' | 'stateFilter'
>;

export type ManageSort = SessionSheetState['sort'];

/** What a fresh sheet filters by: nothing. */
export const DEFAULT_FILTERS: ManageFilters = {
  search: '',
  project: 'all',
  tabFilter: 'all',
  stateFilter: 'all'
};

/**
 * The state filter's table, SPEC 2.4. `Running` is THREE statuses, being every
 * status End acts on, and `Working` is one of them. `Ended` is the two statuses
 * Restore acts on.
 */
const STATE_FILTER_KEEPS: Record<
  Exclude<ManageFilters['stateFilter'], 'all'>,
  readonly SessionStatus[]
> = {
  running: ['running', 'needs_input', 'idle'],
  working: ['running'],
  'needs-input': ['needs_input'],
  idle: ['idle'],
  ended: ['exited', 'restorable'],
  unreachable: ['unknown']
};

export function stateFilterKeeps(
  filter: ManageFilters['stateFilter'],
  status: SessionStatus
): boolean {
  if (filter === 'all') return true;
  return STATE_FILTER_KEEPS[filter].includes(status);
}

/** Whether one row passes all four controls. They combine with AND. */
function rowPasses(
  row: ManageRow,
  group: ManageGroup,
  filters: ManageFilters,
  needle: string
): boolean {
  if (filters.project !== 'all' && group.key !== filters.project) return false;
  if (filters.tabFilter === 'open' && !group.tabOpen) return false;
  if (filters.tabFilter === 'closed' && group.tabOpen) return false;
  if (!stateFilterKeeps(filters.stateFilter, row.status)) return false;
  if (needle !== '' && !row.searchText.toLowerCase().includes(needle)) {
    return false;
  }
  return true;
}

/**
 * The value one column sorts a row by: a number, a string, or null where the
 * cell draws a dash. It reads the cells' own answers (./copy.ts), so a column
 * is sorted by exactly what a person reads in it.
 */
export function sortValue(
  row: ManageRow,
  key: ManageSortKey
): number | string | null {
  switch (key) {
    case 'name':
      return row.session.name;
    case 'state':
      return raisedLabel(row.visual.label);
    case 'created':
      return row.session.createdAt > 0 ? row.session.createdAt : null;
    case 'messages':
      return drawnMessageTotal(row.activity, row.session.agent, row.gates.remote);
    case 'last-message':
      return drawnLastMessageAt(row.activity, row.session.agent);
  }
}

/** Two sort values, the direction applied. Null is never passed here. */
function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Sort one group's rows. A null goes last whichever way the column points,
 * and rows that compare equal keep main's order, because the sort is stable
 * and every tie falls back to the incoming index.
 */
function sortRows(rows: readonly ManageRow[], sort: NonNullable<ManageSort>): ManageRow[] {
  const keyed = rows.map((row, index) => ({
    row,
    index,
    value: sortValue(row, sort.key)
  }));
  keyed.sort((a, b) => {
    if (a.value === null || b.value === null) {
      if (a.value === null && b.value === null) return a.index - b.index;
      return a.value === null ? 1 : -1;
    }
    const by = compareValues(a.value, b.value) * sort.dir;
    return by !== 0 ? by : a.index - b.index;
  });
  return keyed.map((one) => one.row);
}

/**
 * The groups the filters leave, each with the rows the filters leave, sorted
 * inside the group when a sort is chosen. Groups keep their order and a group
 * with no visible row is left out. The projection handed in is not reordered.
 */
export function visibleGroups(
  groups: readonly ManageGroup[],
  filters: ManageFilters,
  sort: ManageSort
): ManageGroup[] {
  const needle = filters.search.trim().toLowerCase();
  const out: ManageGroup[] = [];
  for (const group of groups) {
    const kept = group.rows.filter((row) =>
      rowPasses(row, group, filters, needle)
    );
    if (kept.length === 0) continue;
    out.push({
      ...group,
      rows: sort === null ? kept : sortRows(kept, sort)
    });
  }
  return out;
}

/** One row of the Past tab's single list, with the group its small line names. */
export interface PastEntry {
  row: ManageRow;
  group: ManageGroup;
}

/**
 * The Past tab under the All project filter: the rows the filters leave, as ONE
 * list in the order they came, which is main's (`ManageProjection.pastRows`).
 * Nothing here sorts. Null when the project filter names one project: then the
 * tab draws that project's group under its head, from `visibleGroups`, whose
 * rows keep the same order.
 */
export function visiblePastList(
  rows: readonly ManageRow[],
  groups: readonly ManageGroup[],
  filters: ManageFilters
): PastEntry[] | null {
  if (filters.project !== 'all') return null;
  const needle = filters.search.trim().toLowerCase();
  const groupOf = new Map(groups.map((group) => [group.key, group]));
  const out: PastEntry[] = [];
  for (const row of rows) {
    // Every row's group is in the projection it came from; this is for the type.
    const group = groupOf.get(row.groupKey);
    if (group === undefined) continue;
    if (rowPasses(row, group, filters, needle)) out.push({ row, group });
  }
  return out;
}

/** The ids of some rows, in their order, never an empty one. */
function idsOf(rows: readonly ManageRow[]): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    if (row.id.length > 0) ids.push(row.id);
  }
  return ids;
}

/**
 * The ids select-all checks and a batch is intersected with, in drawn order.
 * NEVER an empty id: a row that has none is drawn with no control, and nothing
 * without a session id is ever a target.
 */
export function visibleIds(groups: readonly ManageGroup[]): string[] {
  return idsOf(groups.flatMap((group) => group.rows));
}

/** The same ids for the Past tab's single list, in its order. */
export function pastListIds(list: readonly PastEntry[]): string[] {
  return idsOf(list.map((entry) => entry.row));
}

/** What the select-all box reads: none, some, or every visible row checked. */
export function selectAllState(
  visible: readonly string[],
  checked: Record<string, true>
): 'none' | 'some' | 'all' {
  const on = visible.filter((id) => checked[id] === true).length;
  if (on === 0) return 'none';
  return on === visible.length ? 'all' : 'some';
}

/**
 * What one click on the select-all box writes, by id.
 *
 * With NOTHING checked it checks every visible row. With ANYTHING checked,
 * some or all, it CLEARS. An indeterminate click that selected everything
 * would widen a batch a person had narrowed by hand, so it never does.
 */
export function selectAllWrite(
  visible: readonly string[],
  checked: Record<string, true>
): { ids: string[]; on: boolean } {
  const on = visible.filter((id) => checked[id] === true);
  if (on.length === 0) return { ids: [...visible], on: true };
  return { ids: on, on: false };
}
