/**
 * Multi-select for the SCM Changes list (Phase 12.8 item 3) — VS Code parity:
 * click selects, shift-click ranges, ⌘-click toggles, ⌘A takes the group,
 * shift+arrows extend, and every verb (stage / unstage / discard / open) then
 * applies to the WHOLE selection rather than the row under the pointer.
 *
 * Pure module by design: the rules that are easy to get subtly wrong — where
 * a range starts, what a toggle does to the anchor, which rows a mixed
 * selection may discard, what survives a `git:changed` refresh — are all
 * plain functions over a flattened row list, unit-tested in node without a
 * repo or a DOM (./__tests__/selection.test.ts).
 *
 * Row identity is `${group}:${path}`, because ONE file legitimately appears
 * twice: `XY = MM` is both Staged and Changes, and staging the worktree half
 * must not silently drag its index twin along.
 */

import type { GitFileStatus } from '@shared/types';
import type { ScmGroups } from './groups';
import { splitPath } from './format';

/** The four resource groups, in render order. */
export type ScmGroupId = keyof ScmGroups;

export const SCM_GROUP_ORDER: readonly ScmGroupId[] = [
  'merge',
  'staged',
  'changes',
  'untracked'
];

export interface ScmRow {
  group: ScmGroupId;
  file: GitFileStatus;
  /** Unique within the flattened list (a file can be staged AND changed). */
  key: string;
}

export function scmRowKey(group: ScmGroupId, path: string): string {
  return `${group}:${path}`;
}

/** Groups → the single flat list the keyboard and the range logic walk. */
export function flattenRows(groups: ScmGroups): ScmRow[] {
  const rows: ScmRow[] = [];
  for (const group of SCM_GROUP_ORDER) {
    for (const file of groups[group]) {
      rows.push({ group, file, key: scmRowKey(group, file.path) });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Selection state
// ---------------------------------------------------------------------------

export interface ScmSelection {
  /** Selected row keys. Order is irrelevant; membership is the truth. */
  readonly keys: readonly string[];
  /** The lead row — what arrows move and what a plain Enter opens. */
  readonly cursor: string | null;
  /** Where a shift-range measures from; a range never moves it. */
  readonly anchor: string | null;
}

export const NO_SELECTION: ScmSelection = {
  keys: [],
  cursor: null,
  anchor: null
};

/** 'replace' = plain click, 'range' = shift, 'toggle' = ⌘ (or ctrl). */
export type SelectMode = 'replace' | 'range' | 'toggle';

export function selectModeFor(e: {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): SelectMode {
  // Shift wins over ⌘ when both are held, matching VS Code and Finder.
  if (e.shiftKey) return 'range';
  return e.metaKey || e.ctrlKey ? 'toggle' : 'replace';
}

export function isSelected(sel: ScmSelection, key: string): boolean {
  return sel.keys.includes(key);
}

/** The selected rows, in list order (never in click order). */
export function selectedRows(
  sel: ScmSelection,
  rows: readonly ScmRow[]
): ScmRow[] {
  const keys = new Set(sel.keys);
  return rows.filter((r) => keys.has(r.key));
}

function rangeKeys(
  rows: readonly ScmRow[],
  fromKey: string,
  toKey: string
): string[] {
  const a = rows.findIndex((r) => r.key === fromKey);
  const b = rows.findIndex((r) => r.key === toKey);
  if (a < 0 || b < 0) return b < 0 ? [] : [toKey];
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return rows.slice(lo, hi + 1).map((r) => r.key);
}

/**
 * Apply a click (or an equivalent gesture) to the selection.
 *
 * - replace: this row alone; it becomes both cursor and anchor.
 * - range:   anchor → this row, inclusive. The anchor STAYS PUT, so dragging
 *            the shift-click up and down re-measures from the same origin
 *            instead of ratcheting.
 * - toggle:  add/remove just this row; it becomes the new anchor so a
 *            following shift-click measures from where the user last was.
 */
export function selectRow(
  sel: ScmSelection,
  rows: readonly ScmRow[],
  key: string,
  mode: SelectMode
): ScmSelection {
  if (mode === 'range') {
    const anchor = sel.anchor ?? sel.cursor ?? key;
    return { keys: rangeKeys(rows, anchor, key), cursor: key, anchor };
  }
  if (mode === 'toggle') {
    const has = sel.keys.includes(key);
    const keys = has ? sel.keys.filter((k) => k !== key) : [...sel.keys, key];
    return { keys, cursor: key, anchor: key };
  }
  return { keys: [key], cursor: key, anchor: key };
}

/**
 * Arrow-key movement. `extend` (shift) grows the range from the anchor;
 * otherwise the cursor carries a fresh single selection with it.
 */
export function moveCursor(
  sel: ScmSelection,
  rows: readonly ScmRow[],
  delta: 1 | -1,
  extend: boolean
): ScmSelection {
  if (rows.length === 0) return NO_SELECTION;
  const at = rows.findIndex((r) => r.key === sel.cursor);
  const next =
    at < 0
      ? (delta === 1 ? rows[0] : rows[rows.length - 1])
      : rows[Math.min(Math.max(at + delta, 0), rows.length - 1)];
  if (next === undefined) return sel;
  return selectRow(sel, rows, next.key, extend ? 'range' : 'replace');
}

/**
 * ⌘A — every row of ONE group (the cursor's, else the first group with rows).
 * Group-scoped rather than list-wide because the groups take opposite verbs:
 * "select all" that spanned Staged and Changes would offer Stage and Unstage
 * in the same breath.
 */
export function selectWholeGroup(
  sel: ScmSelection,
  rows: readonly ScmRow[]
): ScmSelection {
  if (rows.length === 0) return NO_SELECTION;
  const cursorRow = rows.find((r) => r.key === sel.cursor);
  const group = cursorRow?.group ?? rows[0]?.group;
  if (group === undefined) return sel;
  const inGroup = rows.filter((r) => r.group === group);
  const first = inGroup[0];
  const last = inGroup[inGroup.length - 1];
  return {
    keys: inGroup.map((r) => r.key),
    cursor: sel.cursor ?? last?.key ?? null,
    anchor: first?.key ?? null
  };
}

/**
 * Reconcile with a fresh `git:changed` status: keep every selected row whose
 * file is still in the list, drop the rest. A staged file that got committed
 * simply leaves the selection; the cursor falls back to whatever is still
 * selected so the keyboard never lands nowhere.
 */
export function pruneToRows(
  sel: ScmSelection,
  rows: readonly ScmRow[]
): ScmSelection {
  const live = new Set(rows.map((r) => r.key));
  const keys = sel.keys.filter((k) => live.has(k));
  const cursor =
    sel.cursor !== null && live.has(sel.cursor) ? sel.cursor : (keys[0] ?? null);
  const anchor =
    sel.anchor !== null && live.has(sel.anchor) ? sel.anchor : cursor;
  if (
    keys.length === sel.keys.length &&
    cursor === sel.cursor &&
    anchor === sel.anchor
  ) {
    return sel;
  }
  return { keys, cursor, anchor };
}

/**
 * The rows a click/keystroke actually operates on: the selection when the
 * row is part of it, otherwise that row alone. Acting on an unselected row
 * must never touch the selection elsewhere in the list (Finder's rule, and
 * VS Code's).
 */
export function targetRows(
  sel: ScmSelection,
  rows: readonly ScmRow[],
  row: ScmRow
): ScmRow[] {
  return isSelected(sel, row.key) ? selectedRows(sel, rows) : [row];
}

// ---------------------------------------------------------------------------
// Which verbs a set of rows supports
// ---------------------------------------------------------------------------

export interface ScmVerbs {
  /** Rows `git add` applies to — everything not already staged. */
  stage: ScmRow[];
  /** Rows `git restore --staged` applies to. */
  unstage: ScmRow[];
  /** Conflicted rows; staging them is "mark resolved". */
  merge: ScmRow[];
  /** Rows discard applies to — tracked edits and untracked files. */
  discard: ScmRow[];
  /** How many of `discard` are untracked (deleted outright, not reverted). */
  untracked: number;
}

export function verbsFor(rows: readonly ScmRow[]): ScmVerbs {
  const verbs: ScmVerbs = {
    stage: [],
    unstage: [],
    merge: [],
    discard: [],
    untracked: 0
  };
  for (const row of rows) {
    if (row.group === 'staged') verbs.unstage.push(row);
    else verbs.stage.push(row);
    if (row.group === 'merge') verbs.merge.push(row);
    if (row.group === 'changes' || row.group === 'untracked') {
      verbs.discard.push(row);
      if (row.group === 'untracked') verbs.untracked += 1;
    }
  }
  return verbs;
}

/** Repo-relative paths, de-duplicated (one `git add` per gesture). */
export function pathsOf(rows: readonly ScmRow[]): string[] {
  return [...new Set(rows.map((r) => r.file.path))];
}

/** "4 files" / "1 file" — the count phrase every multi label shares. */
export function fileCount(n: number): string {
  return `${n} ${n === 1 ? 'file' : 'files'}`;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export interface DiscardCopy {
  title: string;
  body: string;
  confirmLabel: string;
}

/**
 * The discard confirmation. Naming the count is the point: "Discard changes?"
 * on a four-row selection is how someone loses three files they meant to keep.
 * Untracked rows are called out separately because they are DELETED, not
 * reverted, and no reflog will bring them back.
 */
export function discardCopy(rows: readonly ScmRow[]): DiscardCopy {
  const untracked = rows.filter((r) => r.group === 'untracked').length;
  const n = rows.length;
  const first = rows[0];

  if (n === 1 && first !== undefined) {
    const { base } = splitPath(first.file.path);
    return untracked === 1
      ? {
          title: `Delete '${base}'?`,
          body: 'This file is not tracked by git — deleting it cannot be undone.',
          confirmLabel: 'Delete file'
        }
      : {
          title: `Discard changes to '${base}'?`,
          body: 'This cannot be undone.',
          confirmLabel: 'Discard changes'
        };
  }
  if (untracked === n) {
    return {
      title: `Delete ${fileCount(n)}?`,
      body: 'These files are not tracked by git — deleting them cannot be undone.',
      confirmLabel: 'Delete files'
    };
  }
  const mixed =
    untracked === 1
      ? 'One of them is untracked and will be deleted outright, not reverted.'
      : `${untracked} of them are untracked and will be deleted outright, not reverted.`;
  return {
    title: `Discard changes in ${fileCount(n)}?`,
    body: untracked > 0 ? `${mixed} This cannot be undone.` : 'This cannot be undone.',
    confirmLabel: 'Discard changes'
  };
}
