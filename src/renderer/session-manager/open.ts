/**
 * The session manager's door, as an eager leaf (Phase 293).
 *
 * The sheet is its own chunk, fetched on first open (./lazy.tsx). What the
 * REST of the app needs from it is small and is needed on every keystroke and
 * every menu event: open it, close it and give the keyboard back, ask whether
 * it is the top layer, pull the keyboard back into it, and find the row F2
 * means. Those live here, in a file that imports the store and nothing drawn,
 * so `../app/keyboard.ts` and `../app/menu-actions.ts` can name it without
 * pulling the sheet into the entry chunk.
 *
 * THREE THINGS IN THIS FILE ARE EASY TO GET WRONG, and each was a finding:
 *
 *  1. `otherLayerOpen()` is every layer `modalLayerOpen()` names EXCEPT the
 *     sheet's own and the two that always sit under it (the fix round, W3),
 *     plus the two palettes. The first pass asked
 *     `layerOpen && sessionSheet === null`, which let the Session menu switch
 *     the sheet's tab while a confirmation or the ⌘J list covered it. It is
 *     spelled out here rather than imported from `../app/shell-actions.ts`,
 *     because that file is pinned at exactly four exports
 *     (p127-keyboard.test.ts), and builder F's test reads both bodies as text
 *     and holds that they differ by exactly those three fields.
 *  2. The give-back WAITS ONE FRAME after the store write. The close is a store
 *     write and React takes the sheet off the document after this task, and the
 *     sheet pulls a keyboard that leaves it straight back while it is the top
 *     layer (SPEC 2.13). Phase 289 measured the same lesson on the Catch Me Up
 *     page (`../overview/open-overview.ts`). Those helpers are module private
 *     and pinned by that phase's tests, so this one is written local and small;
 *     Phase 291 is the round that may fold the three into one.
 *  3. F2's target is re-read BY ID and gated by `canRename` over the fresh row.
 *     With no `data-session-id` bearer in the sheet, the shipped F2 branch fell
 *     through to the ACTIVE session and renamed the session behind the scrim.
 *
 * `focusChain` lives here too, and ./SessionManagerSheet.tsx re-exports it for
 * the name SPEC 2.13 gives it. It is here because ./actions.ts needs it and the
 * sheet imports ./actions.ts: a definition in the sheet's own file would close
 * a runtime import cycle, which `build/assert-no-runtime-cycles.mjs` refuses.
 */

import { focusTerminal } from '../app/session-focus';
import { useQuickOpen } from '../quickopen/store';
import { useSymbols } from '../search/symbols-store';
import { sessionActionGates } from '../state/resume';
import type { SessionSheetTab } from '../state/session-manager-slice';
import { effectiveStatusOf, useApp } from '../state/store';

/** The sheet's root. The reclaim and the give-back both ask about it. */
const SHEET_SELECTOR = '.session-sheet';

/**
 * The last stop of every focus chain: always drawn, never disabled. Exported
 * so every chain in the domain ends at the one spelling of it.
 */
export const SELECTED_TAB = '.session-sheet [role="tab"][aria-selected="true"]';

/**
 * A row's name button, by SESSION ID: the first stop of every focus return a
 * row makes. One spelling for the grid and ./actions.ts, which the integrator
 * found written twice. Inside a quoted attribute value only `"` and `\` need
 * escaping.
 */
export function nameSelector(id: string): string {
  return `[data-manage-name="${id.replace(/["\\]/g, '\\$&')}"]`;
}

/** Where the keyboard was at the opening gesture, or null when nowhere. */
let keyboardOrigin: HTMLElement | null = null;

/** Whether an element sits inside the sheet. `body` and null do not. */
function insideSheet(node: Element | null): boolean {
  if (node === null || node === document.body) return false;
  return typeof node.closest === 'function'
    ? node.closest(SHEET_SELECTOR) !== null
    : false;
}

/**
 * Give the keyboard to the first selector that is in the document, is not
 * disabled and TAKES it. Whether it took it is read off the document, because
 * `focus()` on an element that is not drawn is refused without a word.
 *
 * Every focus return in the sheet names a chain, and every chain ends at the
 * selected tab, which is always drawn and never disabled (SPEC 2.13). That is
 * what keeps the keyboard from falling to `body`, from where Tab reaches the
 * controls behind the scrim.
 */
export function focusChain(selectors: readonly string[]): boolean {
  for (const selector of selectors) {
    const node = document.querySelector<HTMLElement>(selector);
    if (node === null || !node.isConnected) continue;
    if ((node as { disabled?: boolean }).disabled === true) continue;
    node.focus({ preventScroll: true });
    if (document.activeElement === node) return true;
  }
  return false;
}

/**
 * True when a layer is open that the sheet may not open over, or that is
 * drawn OVER an open sheet: every field `modalLayerOpen()` names but three,
 * plus the two palettes, which open over any modal by the ladder's own design.
 *
 * THE THREE IT DOES NOT NAME, and why each is safe to leave out (the Phase 293
 * fix round, finding W3 of the no-regression verifier):
 *
 *  - the sheet's own field, because the sheet is never its own other layer;
 *  - the Catch Me Up page (`overview`), because it is a page and not a modal:
 *    it draws at `--z-overview` under every modal, so an open sheet is always
 *    above it, and today's Past Sessions opened over it and closed back onto
 *    it. Refusing the door there was a silent no-op a person could not explain;
 *  - the New Session sheet (`createOpen`), because nothing opens it while the
 *    session manager is open (⌘T, the menu row and every button behind the
 *    scrim are refused or unreachable), so when both are open the create sheet
 *    was there FIRST and the manager is drawn above it, one mount later in
 *    App.tsx. Its Escape rung in ../app/keyboard.ts yields to the manager for
 *    exactly that reason.
 *
 * So the door opens over either of them, `sheetIsTopLayer()` stays true while
 * one sits under the sheet, and the keyboard is still pulled back into the
 * sheet from anything drawn beneath it.
 */
export function otherLayerOpen(): boolean {
  const s = useApp.getState();
  return (
    s.confirm !== null ||
    s.newProjectOpen ||
    s.remoteProjectOpen ||
    s.shortcutsOpen ||
    s.attentionOpen ||
    useQuickOpen.getState().open ||
    useSymbols.getState().open
  );
}

/** The sheet is open and nothing is drawn over it. */
export function sheetIsTopLayer(): boolean {
  return useApp.getState().sessionSheet !== null && !otherLayerOpen();
}

/**
 * Open the sheet on a tab, or switch the tab of an open one.
 *
 * The keyboard's place is recorded only on the gesture that OPENS the sheet,
 * and only when it is a place: neither `body` nor inside the sheet. A second
 * press arrives with the keyboard inside the sheet, so it keeps the first
 * record. Switching is the store's verb, which refuses while a batch runs and
 * closes an armed confirmation, so this door can never strand either.
 */
export function openSessionManager(tab: SessionSheetTab): void {
  const s = useApp.getState();
  if (s.sessionSheet === null) {
    const active = document.activeElement as HTMLElement | null;
    keyboardOrigin =
      active !== null && active !== document.body && !insideSheet(active)
        ? active
        : null;
  }
  s.openSessionSheet(tab);
}

/**
 * Close the sheet and say who gets the keyboard.
 *
 *  - `origin` (the default): the element that held it at the opening gesture
 *    when it is still in the document and takes it, otherwise the visible
 *    terminal. It is the close button, the scrim and Escape.
 *  - `terminal`: the visible terminal. Go to session and the tray's door use
 *    it, because `jumpToSession`'s own hand-over can fire while the sheet is
 *    still drawn, and the sheet would take the keyboard straight back.
 *  - `nobody`: no one. For a verb that takes the keyboard itself, as the Catch
 *    Me Up page's flight does.
 *
 * An open saved-output expansion is closed with the sheet. `SavedOutputModal`
 * answers null only WHILE the sheet is open, so a saved output left open in
 * the store would stack as a modal the moment the sheet went away.
 */
export function closeSessionManager(opts?: {
  give?: 'origin' | 'terminal' | 'nobody';
}): void {
  const s = useApp.getState();
  if (s.sessionSheet === null) return;
  if (s.sessionSheet.inline?.kind === 'output') s.closeSavedOutput();
  const give = opts?.give ?? 'origin';
  const origin = keyboardOrigin;
  keyboardOrigin = null;
  s.closeSessionSheet();
  if (give === 'nobody') return;
  requestAnimationFrame(() => {
    // Reopened inside the frame: the keyboard belongs to the sheet again.
    if (useApp.getState().sessionSheet !== null) return;
    if (give === 'origin' && origin !== null && origin.isConnected) {
      origin.focus({ preventScroll: true });
      if (document.activeElement === origin) return;
    }
    focusTerminal();
  });
}

/**
 * A door a person can use TODAY over the old Past Sessions panel, pressed
 * while the manager is open: close the manager, then run the door.
 *
 * WHY THIS AND NOT A REFUSAL (the Phase 293 fix round, finding W6). Today ⌘J,
 * ⌘/, Session → End Session… and Project → Close Project… each draw a usable
 * layer ABOVE Past Sessions. The first build refused them under the sheet, so
 * a person pressing them got nothing and no word, which is worse than today.
 * Stacking them on the sheet is the other thing the spec refuses (§9, no modal
 * above the sheet). Closing first gives the person the layer they asked for,
 * drawn over the app rather than over a list it would act behind, and leaves
 * nothing stacked: after it closes, Escape and the keyboard behave exactly as
 * they do with no manager at all.
 *
 * The keyboard goes to NOBODY here, because the door's own layer takes it on
 * its mount, and a give-back one frame later would pull it out of that layer.
 * A door whose result today is hidden BEHIND the panel (⌘T, New Session…,
 * Resume Conversation, Catch Me Up, New Project…, the split arrows, an agent
 * hotkey) stays refused under the sheet instead: that is a hazard today, not
 * a capability.
 */
export function leaveSessionManagerFor(run: () => void): void {
  closeSessionManager({ give: 'nobody' });
  run();
}

/**
 * Pull the keyboard back into the sheet, from the window-capture ladder's Tab
 * rung. True, and the selected tab is focused, only when the sheet is the top
 * layer and the keyboard is OUTSIDE it, which is where it falls when the node
 * that held it unmounts. Inside the sheet it answers false and `trapTabKey`
 * does the wrap. It answers true while the chunk is still in flight too, so a
 * Tab pressed then reaches nothing behind the scrim.
 */
export function reclaimSessionSheetFocus(): boolean {
  if (!sheetIsTopLayer()) return false;
  if (insideSheet(document.activeElement)) return false;
  focusChain([SELECTED_TAB]);
  return true;
}

/**
 * Where the keyboard was INSIDE the sheet: the element, the row it sits in,
 * and the verb a visible button carried when it took the keyboard.
 */
export interface SheetFocusMark {
  el: HTMLElement;
  row: string | null;
  verb: string | null;
}

/** Mark where the keyboard is, as the sheet's `focusin` sees it arrive. */
export function markSheetFocus(el: HTMLElement): SheetFocusMark {
  const row = el.closest('[data-manage-row]')?.getAttribute('data-manage-row');
  return {
    el,
    row: row === undefined || row === null || row === '' ? null : row,
    verb: el.getAttribute('data-verb')
  };
}

/**
 * Give the keyboard back to the sheet after it fell OUT of it (the Phase 293
 * fix round, the press attack's P4, and the leak its P1 and P3 measured).
 *
 * The first build always gave it to the selected tab, so a person whose
 * focused End turned into Restore under the finger, or whose keyboard a
 * terminal behind the scrim took for a moment, lost their place in a long
 * list. Now, in order: back to the element that had it, when it is still
 * drawn, enabled and in the sheet, and is NOT a visible button whose verb
 * changed since (an Enter meant for End must never restore, SPEC 2.7); then
 * that row's name; then the selected tab, which is always drawn. The selected
 * tab is still the end of the chain, so the keyboard can never rest on `body`.
 */
export function reclaimSheetKeyboard(last: SheetFocusMark | null): void {
  if (last !== null) {
    const { el, row, verb } = last;
    const flipped =
      el.getAttribute('data-manage-primary') !== null &&
      el.getAttribute('data-verb') !== verb;
    const usable =
      el.isConnected &&
      insideSheet(el) &&
      (el as { disabled?: boolean }).disabled !== true;
    if (!flipped && usable) {
      el.focus({ preventScroll: true });
      if (document.activeElement === el) return;
    }
    if (row !== null && focusChain([nameSelector(row)])) return;
  }
  focusChain([SELECTED_TAB]);
}

/** The session id of the sheet row that holds the keyboard, or null. */
export function focusedManageRowId(): string | null {
  const active = document.activeElement;
  if (active === null || typeof active.closest !== 'function') return null;
  const id = active
    .closest('[data-manage-row]')
    ?.getAttribute('data-manage-row');
  // Nothing without a session id is ever a target.
  return id === undefined || id === null || id === '' ? null : id;
}

/**
 * F2, and Session then Rename, while the sheet is open: the rename expansion
 * of the FOCUSED SHEET ROW, and never the session behind the scrim.
 *
 * It is the rule of the press in small: the id off the DOM, the row re-read
 * from the store by that id, that verb's own gate over the fresh row, and
 * nothing at all when the row is gone or the gate is false. It says nothing
 * when it does nothing, because a key that does not apply to a row is not a
 * row that changed. The store refuses the expansion over a busy verb and
 * while a batch runs.
 */
export function renameFocusedManageRow(): void {
  const s = useApp.getState();
  const sheet = s.sessionSheet;
  if (sheet === null) return;
  const id = focusedManageRowId();
  if (id === null) return;
  if (s.restoringIds[id] === true) return;
  const list = sheet.tab === 'past' ? s.pastSessions : s.sessions;
  const session = list.find((one) => one.id === id);
  if (session === undefined) return;
  const gates = sessionActionGates(session, effectiveStatusOf(session), {
    canRestore: s.canRestore(),
    canDiscard: s.canDiscard(),
    shellPathReady: s.shellPathReady,
    handback: s.handbacks[id]
  });
  if (!gates.canRename) return;
  s.setSessionSheetInline({ id, kind: 'rename' });
}
