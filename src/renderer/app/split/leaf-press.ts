/**
 * Phase 86 — when a press inside a split leaf selects that leaf.
 *
 * The split surface used to select a leaf on `pointerdown`, anywhere in the
 * leaf including its header. That press is also the one that may start a
 * header drag, so the leaf about to be dragged out of the split became the
 * active session before the drag had moved a pixel. `popOut` then had nothing
 * left to decline, and the "keep me looking at the split" preference did
 * nothing at all.
 *
 * The rule this module holds: a press in the leaf's BODY selects at once,
 * because that is a click into a terminal and it must feel immediate. A press
 * on the leaf's HEADER selects on the click that follows instead, exactly the
 * way a strip tab and a dock row already do. `armPointerDrag` swallows the
 * click after a real drag, so a drop never also selects, and a right-click
 * opens the menu without selecting, which is what lets the menu's "Move to its
 * own tab" read the preference too.
 *
 * It imports nothing, so a test can hold the rule without mounting a surface.
 */

/** The header element of one split leaf. */
export const SPLIT_HEADER_SELECTOR = '.split-header';

/**
 * True when a primary press on `target` should select the leaf immediately.
 * False for a press on the header, which defers to the click.
 */
export function pressSelectsLeafNow(target: EventTarget | null): boolean {
  const el = target as { closest?: (s: string) => unknown } | null;
  if (el === null || typeof el.closest !== 'function') return true;
  return el.closest(SPLIT_HEADER_SELECTOR) == null;
}
