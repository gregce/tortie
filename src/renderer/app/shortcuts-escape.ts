/**
 * The shortcuts overlay's share of Escape, as a leaf (Phase 165).
 *
 * The Escape ladder in `./keyboard.ts` asks the overlay first whether the
 * press emptied a non-empty search field, which is the press the overlay
 * consumed, before it closes the sheet. That question used to be answered by
 * a function exported from `./ShortcutsOverlay.tsx`, which kept the whole
 * overlay in the entry chunk of every launch for one closure. The closure and
 * its two verbs live here now. The overlay registers the closure while it is
 * open and drops it on close, so the answer is false whenever no overlay is
 * up, exactly as before.
 */

let clearSearchField: (() => boolean) | null = null;

/** Asked by the Escape ladder. True when the press emptied the search field. */
export function shortcutSearchTookEscape(): boolean {
  return clearSearchField?.() ?? false;
}

/** Called by the overlay while it is open, and with null on close. */
export function setShortcutSearchClear(clear: (() => boolean) | null): void {
  clearSearchField = clear;
}
