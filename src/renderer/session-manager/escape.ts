/**
 * The session manager's share of Escape, as a leaf (Phase 293).
 *
 * The Escape ladder in `../app/keyboard.ts` is capture phase on `window` and
 * stops propagation, so nothing inside the sheet ever sees the key: not the
 * search field's own clear, not a panel's Cancel. The ladder therefore asks the
 * sheet, through this file, whether the press was consumed by a layer INSIDE
 * it (a non-empty search, a busy verb, a batch, an expansion), and closes the
 * sheet only when the answer is no.
 *
 * It is a leaf for the reason `../app/shortcuts-escape.ts` is one: the ladder
 * runs on every keystroke and lives in the entry chunk, and the sheet is its
 * own chunk fetched on first open. A function exported from the sheet would
 * pull the whole sheet into every launch for one closure. The sheet registers
 * the closure while it is mounted and drops it on unmount, so the answer is
 * false whenever no sheet is drawn, and the ladder then closes the store's
 * flag, which is the right thing for a sheet whose chunk is still in flight.
 *
 * It imports nothing.
 */

let takeEscape: (() => boolean) | null = null;

/** Asked by the Escape ladder. True when a layer inside the sheet took the press. */
export function sessionSheetTookEscape(): boolean {
  return takeEscape?.() ?? false;
}

/** Called by the sheet while it is mounted, and with null on unmount. */
export function setSessionSheetEscape(take: (() => boolean) | null): void {
  takeEscape = take;
}
