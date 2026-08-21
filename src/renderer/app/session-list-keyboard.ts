/**
 * Who owns the keyboard while a session list is being used (Phase 129 item 2).
 *
 * ONE RULE, AND IT EXPLAINS BOTH HALVES OF THE DEFECT THE OPERATOR REPORTED.
 * The keyboard follows the pointer. The arrows do not move it.
 *
 *  - a click on a session selects it AND hands the keyboard to its terminal,
 *    which is what a click already meant and must keep meaning;
 *  - an arrow press in a session list moves the selection and leaves the
 *    keyboard on the list, so the next arrow moves the selection again;
 *  - Enter is the deliberate hand over, and it is the only key that moves the
 *    keyboard into the terminal.
 *
 * ## THE MEASURED CAUSE OF THE ARROW DEFECT
 *
 * `onListKeyDown` in ./SessionDock.tsx calls `setActiveSession`. That mounts a
 * pane for the newly selected session, `TerminalHost` passes `focused=true` to
 * it, and `TerminalPane.tsx` calls `term.focus()` in two places: once in the
 * effect that watches `focused`, and once again when the asynchronous attach
 * lands, which is hundreds of milliseconds later. Either call takes the
 * keyboard out of the list, so the second arrow press went to xterm instead of
 * to the list, and the person's selection stopped moving after one press.
 *
 * Measured by build/probe-p129-rail.mjs against the unmodified build, with
 * three real sessions and the pane on the right. After every one of the three
 * arrow presses, in both densities, `document.activeElement` was
 * `xterm-helper-textarea` and nothing was left inside the dock.
 *
 * The fix is `keyboardIsInASessionList()`, a DOM READ guarding both of those
 * focus calls. It is a read rather than a flag on purpose: the attach path
 * fires long after any timer would have expired, and a flag would therefore
 * have to be held for an interval nobody can name.
 *
 * ## WHY THE CLICK PATH THEN NEEDS `releaseSessionListKeyboard`
 *
 * A person's click on a row also focuses the list, because both lists are
 * `tabIndex={0}` and the browser focuses the nearest focusable ancestor on
 * mousedown. With the guard alone, the pane that the click just selected would
 * find the keyboard inside a session list and refuse to take it, and the click
 * would stop handing over. So the click path says out loud that it is done
 * with the keyboard: it blurs the list, and then asks for the terminal. Both
 * acts are DOM reads and writes with no timer in them.
 *
 * The order matters and it is the whole reason this is two functions rather
 * than one. `focusTerminal()` finds nothing when the pane it wants was mounted
 * by this very click, because xterm creates its textarea after an await. In
 * that case the blur is what makes the guard pass a moment later, and the
 * attach path finishes the hand over.
 *
 * Nothing here reads or writes a session's status. A person's own arrow key is
 * their input to Tortie and never to the session.
 */

/**
 * The two session lists, in both densities. `[data-slot="session-strip"]` is
 * the top strip, `[data-slot="session-dock"]` is the right hand dock and the
 * 48px rail it collapses to. One selector, so the rule cannot drift between
 * the densities.
 */
const SESSION_LIST_SLOTS =
  '[data-slot="session-strip"], [data-slot="session-dock"]';

/** True while the keyboard is inside the session strip or the session dock. */
export function keyboardIsInASessionList(): boolean {
  const el = document.activeElement;
  if (el === null) return false;
  return el.closest(SESSION_LIST_SLOTS) !== null;
}

/**
 * Give up the keyboard, if this list has it. Called by the click path and by
 * Enter, which are the two acts that mean "take me into the session".
 *
 * It blurs rather than focusing something else, because what happens next
 * depends on whether the pane already exists, and both answers are correct:
 * an existing pane is focused by the caller's own `focusTerminal()`, and a
 * pane that is still attaching focuses itself once `keyboardIsInASessionList()`
 * answers false.
 */
export function releaseSessionListKeyboard(): void {
  const el = document.activeElement;
  if (el === null) return;
  if (el.closest(SESSION_LIST_SLOTS) === null) return;
  // Duck typed rather than `instanceof HTMLElement`: an SVG element inside a
  // row can hold focus too, and the unit suite runs with a hand built document
  // where the constructor does not exist at all.
  const blur = (el as Partial<HTMLElement>).blur;
  if (typeof blur === 'function') blur.call(el);
}
