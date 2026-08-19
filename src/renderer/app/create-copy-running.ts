/**
 * Whether a copy onto another machine is running inside the create sheet
 * (Phase 90.2, item 3).
 *
 * ## Why this is a module and not a piece of the sheet's own state
 *
 * The create sheet already refuses Escape while a copy is in flight, in its own
 * `onKeyDown`. That guard never runs. `App.tsx`'s Escape ladder is a
 * capture-phase listener on `window`, so it sees the key first, and it calls
 * `stopPropagation`, so nothing inside the dialog is ever asked. The sheet was
 * closed by the ladder while a real copy was landing on the operator's Mac Pro,
 * which is the defect this module exists to remove.
 *
 * The ladder is also the right place for the decision. It is the one list in
 * the product that says which layer owns Escape, and every other layer's answer
 * is written there. So the ladder asks this function, and the sheet keeps the
 * flag true only while a copy is actually running. The answer is false whenever
 * no sheet is open, and false is the answer that closes the sheet.
 *
 * The same shape is already in `ShortcutsOverlay.tsx`, whose search field hands
 * the ladder a closure for the first Escape. This is that pattern with a
 * boolean instead of a closure.
 *
 * ## What it is not
 *
 * It is not a store and it holds nothing a person can see. Nothing subscribes
 * to it and nothing re-renders when it moves. It is read once, inside a key
 * handler, at the moment a key is pressed.
 */

let running = false;

/**
 * Record whether a copy is running. The create sheet is the only caller, and it
 * clears the flag when it unmounts.
 */
export function setCreateSheetCopyRunning(value: boolean): void {
  running = value;
}

/** True while a copy is running on another machine. */
export function createSheetCopyIsRunning(): boolean {
  return running;
}

/**
 * Whether Escape may close the create sheet right now.
 *
 * It may not while a copy is running, because closing would throw away the
 * answer to a write that is happening on somebody else's computer. The block
 * has one sentence on screen saying so.
 */
export function escapeMayCloseCreateSheet(): boolean {
  return !running;
}
