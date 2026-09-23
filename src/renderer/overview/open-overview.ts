/**
 * The four gestures onto the Catch Me Up page, and the level decision
 * (Phase 137).
 *
 * The chord and the menu row both land here, so the row and the keys
 * printed on it cannot do two different things. The read starts at the
 * gesture, before the flight, so the answer is usually there when the page
 * lands. The commit happens at the end of the flight, through the token the
 * slice hands out, so the layer and the chrome swap in one frame.
 *
 * THE KEYBOARD SINCE PHASE 289. Leaving gives the keyboard back to whatever
 * held it when the page was asked for, which is nearly always the session,
 * and to the session when that place has gone. It does so after the close has
 * reached the DOM, because nothing the page hid can take it before then. The
 * account is over `leaveAndReturnKeyboard` at the foot of this file. The jump
 * out through ⏎ on a turn is not part of it: `jumpToSession` owns that
 * keyboard.
 */

import { useApp } from '../state/store';
import type { OverviewRequest } from '../state/overview-slice';
import { nextOverviewToken } from '../state/overview-slice';
import { activeFillRegion } from '../app/fill-chord';
import { focusedSessionRowId } from '../app/shell-actions';
import { focusTerminal, jumpToSession } from '../app/session-focus';
import { useSettingsStore } from '../settings/settings-store';
import {
  afterOverviewLeavesTheDom,
  enterOverviewFlight,
  leaveOverviewFlight
} from './overview-flight';
import { decideOverviewLevel } from './level';
import { recordedOverviewChordOwner } from './overview-chord';
import { OPEN_A_PROJECT_FIRST } from '@shared/overview-copy';

export { decideOverviewLevel } from './level';
export type { LevelDecision, LevelInput } from './level';
export { recordedOverviewChordOwner } from './overview-chord';

/**
 * The live read the keyboard map's ⇧⌘U branch uses, over the shared
 * settings store. True when a recorded per-agent hotkey owns the overview
 * chord, in which case the branch does nothing and the person's own menu
 * accelerator fires. The decision itself, and the reason the person wins,
 * live in ./overview-chord.ts.
 */
export function overviewChordYields(): boolean {
  const hotkeys = useSettingsStore.getState().settings.hotkeys;
  return recordedOverviewChordOwner(hotkeys) !== null;
}

/**
 * ⇧⌘U, and View > Catch Me Up. Opens the page at the level focus decides,
 * or closes the open page. The chord and the menu do the same thing, which
 * is why the source parameter is unread today. It stays in the signature so
 * a later phase that gives the menu a spoken refusal does not have to change
 * every call site.
 */
export async function toggleOverview(_source: 'chord' | 'menu'): Promise<void> {
  const app = useApp.getState();
  if (app.overview !== null) {
    leaveAndReturnKeyboard();
    return;
  }
  const project = app.activeProject();
  if (project === null) {
    app.toast('info', OPEN_A_PROJECT_FIRST);
    return;
  }
  // Phase 289. A leave may still be waiting to hand the keyboard back. The
  // page is what was asked for, so that wait ends here, and where the
  // keyboard is now is where the next leave returns it.
  rememberKeyboardAtTheGesture();
  const decision = decideOverviewLevel({
    region: activeFillRegion(),
    visibleIds: app.visibleSessionIds,
    focusedRowId: focusedSessionRowId(),
    activeId: app.activeSession()?.id ?? null
  });
  const req: OverviewRequest = {
    level: decision.level,
    projectPath: project.path,
    sessionIds: decision.sessionIds,
    openedFromProject: false
  };
  // The read runs under the 200 ms fade. The token names the commit that
  // has not happened yet, and the slice holds the answer for it.
  const token = nextOverviewToken();
  void app.loadOverview(req, token);
  await enterOverviewFlight(() => {
    useApp.getState().openOverview(req);
  });
}

/**
 * The session menu's "Catch me up…" row (Phase 137.2). Opens the one
 * session view for exactly this session, which need not be the focused one,
 * so the row lands where the chord lands for that session. While the page
 * is closed it takes the same flight and token dance toggleOverview takes.
 * While the page is already open it swaps in place the way
 * showOverviewSession does. `openedFromProject` is false either way, so
 * Escape leaves the page rather than stepping to the project view.
 */
export async function openOverviewForSession(
  sessionId: string,
  projectPath: string
): Promise<void> {
  const app = useApp.getState();
  // Phase 289. The same rule toggleOverview keeps: a gesture that opens the
  // page ends a leave's wait for the keyboard. Over a page that is already
  // open the keyboard is the page's, so the place recorded when it opened
  // stands.
  if (app.overview === null) rememberKeyboardAtTheGesture();
  else dropKeyboardReturn();
  const req: OverviewRequest = {
    level: 'session',
    projectPath,
    sessionIds: [sessionId],
    openedFromProject: false
  };
  if (app.overview !== null) {
    const token = app.openOverview(req);
    await app.loadOverview(req, token);
    return;
  }
  const token = nextOverviewToken();
  void app.loadOverview(req, token);
  await enterOverviewFlight(() => {
    useApp.getState().openOverview(req);
  });
}

/** ⏎ on a project line. The page stays up and shows that conversation. */
export async function showOverviewSession(sessionId: string): Promise<void> {
  const app = useApp.getState();
  const open = app.overview;
  if (open === null) return;
  const req: OverviewRequest = {
    level: 'session',
    projectPath: open.projectPath,
    sessionIds: [sessionId],
    openedFromProject: true
  };
  const token = app.openOverview(req);
  await app.loadOverview(req, token);
}

/**
 * Escape. A conversation opened from the project view goes back to the
 * project view. Anything else leaves the page, and leaving never refuses.
 */
export async function backOrLeaveOverview(): Promise<void> {
  const app = useApp.getState();
  const open = app.overview;
  if (open === null) return;
  if (open.openedFromProject) {
    const req: OverviewRequest = {
      level: 'project',
      projectPath: open.projectPath,
      sessionIds: [],
      openedFromProject: false
    };
    const token = app.openOverview(req);
    await app.loadOverview(req, token);
    return;
  }
  leaveAndReturnKeyboard();
}

/** ⏎ on a turn. Leaves the page and lands in that session. */
export async function leaveOverviewAndJump(sessionId: string): Promise<void> {
  if (useApp.getState().overview === null) return;
  leaveOverviewFlight(() => {
    useApp.getState().closeOverview();
  });
  await jumpToSession(sessionId);
}

/**
 * The layer `./OverviewLayer.tsx` draws, which holds the keyboard while the
 * page is open. p289-leave-keyboard.test.ts reads both spellings.
 */
const LAYER_SELECTOR = '.overview-layer';

/**
 * The cancel for a keyboard return that is still waiting for the close to
 * reach the DOM (Phase 289), and null whenever nothing is waiting.
 */
let keyboardReturn: (() => void) | null = null;

/**
 * Stop waiting. Every gesture that OPENS the page calls it at the gesture and
 * not at the commit 200 ms later, because a person who has asked for the page
 * has said where the keyboard goes, and a terminal that took it for the
 * length of the fade would take their next keys with it.
 */
function dropKeyboardReturn(): void {
  keyboardReturn?.();
  keyboardReturn = null;
}

/**
 * Whether the keyboard is still where the leave left it: on nothing, which
 * the document reports as `body`, or on the layer, which goes in the same
 * React commit as the class. Anywhere else is somewhere the person put it
 * between the leave and the commit, and it is theirs.
 */
function keyboardIsUnclaimed(): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body) return true;
  return active.closest(LAYER_SELECTOR) !== null;
}

/**
 * What held the keyboard when the page was asked for, and null when nothing
 * did (Phase 289's fix round).
 *
 * WHY IT IS KEPT. The page takes the keyboard when it opens, so the page is
 * what gives it back, to the place it took it from. That is the rule
 * ../app/focus-flight.ts keeps for the other surface that hides the work: a
 * keyboard inside the surface is given back as it was, and one elsewhere is
 * left alone. The first build of this phase sent every leave to the terminal
 * instead. Its attack verifier typed into an open file, pressed ⇧⌘U and then
 * Escape, and carried on typing: the line and its Enter went to the outlined
 * session, whose shell RAN it, where the parent had sent them nowhere. A
 * session is somewhere a person's words are acted on, so it takes the
 * keyboard only when it had it, or when the place that had it has gone.
 */
let keyboardOrigin: HTMLElement | null = null;

/**
 * The opening gesture's half. It reads the keyboard BEFORE the flight, which
 * is the only moment the element still has it: the commit un-draws everything
 * outside the layer, and the layer then takes it for itself.
 *
 * A leave that still OWES the keyboard has not given it back, so the document
 * says `body` or the layer, and neither is a place. The element it was owed
 * to is still the answer, and is kept. That is Escape and ⇧⌘U pressed back to
 * back under reduced motion, where the open commits before the close was
 * ever drawn.
 *
 * A jump out through ⏎ on a turn leaves its record behind, because
 * `jumpToSession` owns that keyboard and asks nothing of this. Every gesture
 * that opens the page comes through here and writes over it.
 */
function rememberKeyboardAtTheGesture(): void {
  const owed = keyboardReturn !== null;
  dropKeyboardReturn();
  if (owed) return;
  const active = document.activeElement as HTMLElement | null;
  keyboardOrigin =
    active !== null &&
    active !== document.body &&
    active.closest(LAYER_SELECTOR) === null
      ? active
      : null;
}

/**
 * Give the keyboard to `origin`, and to the visible terminal when `origin`
 * cannot take it: nothing was recorded, it has left the document, or it is
 * not drawn. Whether it took the keyboard is read off the document, because
 * `focus()` on an element that is not drawn is refused without a word.
 * `preventScroll` because a return moves the keyboard and nothing else.
 */
function giveKeyboardBack(origin: HTMLElement | null): void {
  if (origin !== null && origin.isConnected) {
    origin.focus({ preventScroll: true });
    if (document.activeElement === origin) return;
  }
  focusTerminal();
}

/**
 * The one way out. The keyboard goes back where it was, and to the visible
 * terminal when that place is gone.
 *
 * PHASE 289 MADE THAT TRUE. The close is a store write, and React takes
 * `overview-open` off the shell after this task, so the call below was made
 * while ./overview.css still held the work area at `display: none` and the
 * terminal's textarea refused it. Measured on 2026-09-18, identically at HEAD
 * and at the parent: `body` after Escape, no `focusin` at all, and a typed
 * string arriving in no session. It is the rule Phase 286 wrote down for the
 * focus flight, in the other surface that hides the work: an element that is
 * not drawn cannot take the keyboard. ../app/focus-mode.css un-draws the
 * sidebar, the session list and the editor under the same class, so the rule
 * binds every place the keyboard can have come from, and one wait serves
 * them all.
 *
 * The call stays where it was for a shell that does not carry the class, and
 * costs nothing when it is refused. When the class is still on, the same call
 * is made again from the one place that knows it has gone, which is
 * `afterOverviewLeavesTheDom`. A project with no session has no textarea, so
 * with nothing recorded both calls find nothing and nothing is focused or
 * said.
 */
function leaveAndReturnKeyboard(): void {
  dropKeyboardReturn();
  const origin = keyboardOrigin;
  leaveOverviewFlight(() => {
    useApp.getState().closeOverview();
  });
  giveKeyboardBack(origin);
  keyboardReturn = afterOverviewLeavesTheDom(() => {
    keyboardReturn = null;
    keyboardOrigin = null;
    // A door that does not come through this file opened the page again.
    // The keyboard is the page's.
    if (useApp.getState().overview !== null) return;
    if (!keyboardIsUnclaimed()) return;
    giveKeyboardBack(origin);
  });
  // Nothing is owed: the shell did not carry the class, so the call above
  // was answered in this task.
  if (keyboardReturn === null) keyboardOrigin = null;
}
