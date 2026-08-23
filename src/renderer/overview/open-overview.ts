/**
 * The four gestures onto the Catch Me Up page, and the level decision
 * (Phase 137).
 *
 * The chord and the menu row both land here, so the row and the keys
 * printed on it cannot do two different things. The read starts at the
 * gesture, before the flight, so the answer is usually there when the page
 * lands. The commit happens at the end of the flight, through the token the
 * slice hands out, so the layer and the chrome swap in one frame.
 */

import { useApp } from '../state/store';
import type { OverviewRequest } from '../state/overview-slice';
import { nextOverviewToken } from '../state/overview-slice';
import { activeFillRegion } from '../app/fill-chord';
import { focusedSessionRowId } from '../app/shell-actions';
import { focusTerminal, jumpToSession } from '../app/session-focus';
import { useSettingsStore } from '../settings/settings-store';
import { enterOverviewFlight, leaveOverviewFlight } from './overview-flight';
import { decideOverviewLevel } from './level';
import { recordedOverviewChordOwner } from './overview-chord';
import { OPEN_A_PROJECT_FIRST } from './copy';

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

/** The one way out. The keyboard goes back to the visible terminal. */
function leaveAndReturnKeyboard(): void {
  leaveOverviewFlight(() => {
    useApp.getState().closeOverview();
  });
  focusTerminal();
}
