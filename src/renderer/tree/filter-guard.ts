/**
 * The rule that keeps the name filter alive when you click a result
 * (Phase 47 item 2).
 *
 * @pierre/trees closes its search on five paths. Read from the shipped
 * bundle (1.0.0-beta.6), they are:
 *
 *   render/rowClickPlan.js   `closeSearch: isSearchOpen` — a row click closes
 *                            the filter unconditionally, whatever the row is.
 *   render/FileTreeView.js   the input's own `onBlur`.
 *   render/FileTreeView.js   Escape while the filter is open.
 *   render/FileTreeView.js   Enter while the filter is open.
 *   model/FileTreeController.js  `startRenaming`, which closes the filter
 *                            before it opens the inline name editor.
 *
 * The library option `searchBlurBehavior: 'retain'` does not solve this,
 * because the row-click close is not a blur and is not conditional.
 *
 * gmux's answer is two guards. The blur is swallowed before the library sees
 * it. The other closes are allowed to happen and the filter is re-opened with
 * the same text, unless the close was one the user asked for. This module is
 * the decision, kept pure so it can be tested without a tree: FileTree.tsx
 * owns the listeners and the reopen call.
 *
 * A close is SANCTIONED when the user aimed at the filter itself: the header
 * toggle, the clear affordance, Escape, or starting a rename or a create. A
 * sanctioned close is stamped with a deadline rather than a boolean, so a
 * refused rename (canRename returns false, nothing closes) cannot leave a
 * flag behind that swallows the next real reopen.
 */

/** What the filter held at the moment a click or Enter was seen. */
export interface FilterStash {
  /** The filter text at that moment. */
  value: string;
  /** performance-free timestamp (Date.now) of the gesture. */
  at: number;
  /** The row the gesture landed on, if it landed on one. */
  row: { path: string; kind: 'file' | 'folder'; wasExpanded: boolean } | null;
}

export interface FilterCloseInput {
  /** The filter was open on the previous model emit. */
  wasOpen: boolean;
  /** It is open now. */
  isOpen: boolean;
  /** Deadline stamped by the last sanctioned gesture (0 when none). */
  sanctionedUntil: number;
  /** The last click or Enter seen while the filter was open. */
  stash: FilterStash | null;
  /** Date.now() at the moment of the decision. */
  now: number;
}

/**
 * How long a click or Enter can vouch for a close. The close arrives in the
 * same task as the gesture, so this is generous; it exists only so a close
 * that happens seconds later for some other reason is not attributed to a
 * gesture nobody remembers making.
 */
export const FILTER_STASH_MS = 200;

/** How long a sanctioned gesture stays sanctioned. */
export const FILTER_SANCTION_MS = 300;

/**
 * The filter text to re-open with, or null to leave the filter closed.
 *
 * Null covers every case the user meant: the filter was not open, it is still
 * open, the close was sanctioned, there was no gesture behind it, the gesture
 * is stale, or the text was empty and there is nothing to preserve.
 */
export function filterReopenValue(input: FilterCloseInput): string | null {
  const { wasOpen, isOpen, sanctionedUntil, stash, now } = input;
  if (!wasOpen || isOpen) return null;
  if (now < sanctionedUntil) return null;
  if (stash === null) return null;
  if (now - stash.at > FILTER_STASH_MS) return null;
  if (stash.value.length === 0) return null;
  return stash.value;
}

/**
 * What the clicked folder's expansion should be after the reopen.
 *
 * Closing the filter restores the expansion the tree had before the filter
 * opened (FileTreeController's `#restoreSearchExpandedPaths`), which undoes
 * the very toggle the click just performed. So the toggle is re-applied by
 * hand: a folder that was closed ends up open, and one that was open ends up
 * closed, which is what clicking a folder means with or without a filter.
 *
 * Null means there is nothing to do — the gesture was not a folder click.
 */
export function folderExpansionAfterReopen(
  stash: FilterStash | null
): { path: string; expand: boolean } | null {
  if (stash === null || stash.row === null) return null;
  if (stash.row.kind !== 'folder') return null;
  return { path: stash.row.path, expand: !stash.row.wasExpanded };
}
