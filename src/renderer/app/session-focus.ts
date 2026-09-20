/**
 * Landing the user IN a session — the one implementation.
 *
 * Two surfaces ask for it: the ⌘J attention overlay's rows, and (Phase 12.85)
 * the menu-bar sentinel's rows, which arrive as `focus-session:<id>` menu
 * actions. Both mean the same act: switch to the session's project tab,
 * select the session, hand it the keyboard.
 *
 * PHASE 93 MADE IT ALWAYS ANSWER. It used to switch tabs only when a tab
 * already matched the session's folder, and then set the active session
 * anyway. A session whose folder had no tab therefore got a silent press: the
 * store's active session changed, the tab did not, and the person kept looking
 * at whatever was already in front of them. The operator hit that with three
 * agents he could see in the ⌘J list and could not reach.
 *
 * The rule now is that the call ends in exactly one of three outcomes and
 * never in nothing.
 *
 *   a tab already matches      switch to it, select the session, focus it
 *   no tab, folder reachable   open the folder as a tab, then do the above
 *   the open was refused       one sentence naming what could not be reached
 *
 * WHAT DECIDES "a tab already matches" DID NOT CHANGE. It is the Phase 90.3
 * pair, being `sameTarget(targetOfProject(p), targetOfSession(session))`.
 * Nothing here compares bare paths, because the same path on two computers is
 * two folders.
 *
 * IT NEVER ENDS ANYTHING. Every refusal says so out loud, because a person who
 * asked to be taken to an agent and was refused reads the refusal as the agent
 * being gone. The verb that ends a session is on the row itself, next to the
 * refusal they just read.
 */

import type { Session } from '@shared/types';
import type { WorkspaceTarget } from '@shared/workspace-target';
import {
  sameTarget,
  targetOfProject,
  targetOfSession,
  workspaceTarget
} from '@shared/workspace-target';
import { useApp } from '../state/store';
import type { OpenTargetResult } from '../state/projects-slice';
import { machineLabelFor } from '../state/machines-slice';
import { displayPath } from '../format';
import { addRemoteRefusal } from '../machines/project-tab';
import { FOCUSED_LEAF_TEXTAREA_SELECTOR } from './focus-flight';
import {
  NO_SUCH_SESSION,
  cannotOpenOnMachine,
  couldNotReachMachine,
  folderGone,
  folderRefused,
  tabOpenedForSession
} from './reach-copy';

/**
 * Hand the keyboard to the visible terminal.
 *
 * PHASE 289 MADE IT THE OUTLINED ONE. It asked for the first
 * `.gmux-terminal-mount textarea` in document order, which in a split is the
 * first pane whichever pane is selected. So Enter on a session row put the
 * keyboard in one pane while the outline sat on another, and the menu path
 * into session focus, which Phase 286 taught to land in the outlined pane,
 * disagreed with it from the same seat (that phase's reverify, finding N1).
 * It asks Phase 286's selector first, imported rather than spelled again, so
 * the two doors cannot drift apart.
 *
 * Document order is still the answer when nothing is marked, and when the
 * marked pane draws no terminal because its session ended: the compound
 * selector matches nothing there, and the keyboard goes where it always went
 * rather than nowhere. Measured in the running app on 2026-09-18 with the
 * outlined session ended: the outline stays on the ended pane, and every door
 * gives the keyboard to the first LIVE pane in document order, which is not
 * the outlined one. Whether an ended pane should take nothing instead is the
 * operator's to rule, and is not ruled here.
 *
 * The signature is as it was, and so is every caller it had. Five doors that
 * asked document order for themselves call it since this phase, and
 * __tests__/p289-focus-terminal.test.ts names them and keeps a sixth from
 * being written.
 */
export function focusTerminal(): void {
  const target =
    document.querySelector<HTMLElement>(FOCUSED_LEAF_TEXTAREA_SELECTOR) ??
    document.querySelector<HTMLElement>('.gmux-terminal-mount textarea');
  target?.focus();
}

/**
 * What one jump did.
 *
 * The message is carried as well as toasted, so a caller can decide what to do
 * with the panel it is drawing. The ⌘J overlay stays open on a refusal, with
 * the row still selected, so the person can end the session they could not
 * reach without finding it again.
 */
export type JumpResult = { ok: true } | { ok: false; message: string };

/** The name Tortie has for the computer a session's folder is on. */
function labelOf(session: Session, target: WorkspaceTarget): string {
  const fromRow = session.machine?.label;
  if (fromRow !== undefined && fromRow !== '') return fromRow;
  return machineLabelFor(useApp.getState().machineStates, target.machineId);
}

/** Select the session and give its terminal the keyboard. */
function land(sessionId: string): void {
  useApp.getState().setActiveSession(sessionId);
  // After the tab switch has rendered the session's terminal.
  requestAnimationFrame(focusTerminal);
}

/**
 * Whether this person closed a tab for this session's folder themselves.
 *
 * PHASE 93 ITEM 3 writes that record, and it is read exactly here. A tab the
 * person closed coming back needs no explanation, because the session is in
 * front of them and that is what they asked for. A tab appearing for a folder
 * that has never been a tab does need one.
 *
 * It is read off the row defensively rather than through the field's type. The
 * column is written by main and every row an older build wrote carries nothing,
 * so "absent" is the ordinary answer rather than an error.
 */
function hadATabBefore(session: Session): boolean {
  return (
    (session as { closedProject?: unknown }).closedProject !== undefined
  );
}

/**
 * The sentence for a tab that could not be opened.
 *
 * PHASE 293 EXTRACTED IT, and no word of it moved. It was the last expression
 * of `jumpToSession` below, which still reads it. The session manager sheet
 * opens a closed project's tab before it restores a session into it, and when
 * that open is refused the sheet has to say why, under the row, in the words a
 * person already reads on a refused jump. A second mapping from main's refusal
 * to a sentence would be a second answer to one question.
 *
 * `shown` is the folder as the ⌘J row draws it, and `machineLabel` is the name
 * Tortie has for the computer it is on. Both are passed in rather than read
 * here, so the function is pure and the two callers say where each came from.
 * A refusal on this Mac never reads the label.
 *
 * The remote arm used to be handed `target.path` where it is now handed
 * `shown`, and they are the same string there: `displayPath` draws a path on
 * another machine exactly as that machine states it, and only a target on
 * another machine can be refused with `kind: 'remote'`.
 *
 * `gone` is the folder-gone sentence, and it is the one thing a caller may
 * choose, because only its SECOND sentence is about the session: a jump is
 * reaching a session that is running, and a restore is bringing back one that
 * runs nowhere. The session manager's restore passes `noFolderThere`, so its
 * failed panel never says the session "is still running" (the integrator's
 * round, found by probe:p293 arm 6). Which refusal is which stays here, once.
 */
export function targetOpenRefusal(
  result: Extract<OpenTargetResult, { ok: false }>,
  shown: string,
  machineLabel: string,
  gone: (shown: string) => string = folderGone
): string {
  if (result.kind === 'local') {
    return result.code === 'INVALID_INPUT' || result.code === 'PROJECT_NOT_FOUND'
      ? gone(shown)
      : folderRefused(shown, result.message);
  }
  return result.kind === 'remote'
    ? couldNotReachMachine(addRemoteRefusal(result.reason, shown, machineLabel))
    : cannotOpenOnMachine(machineLabel);
}

/** Reveal a session wherever it lives, or say what could not be reached. */
export async function jumpToSession(sessionId: string): Promise<JumpResult> {
  const s = useApp.getState();
  const session = s.sessions.find((x) => x.id === sessionId);
  if (!session) {
    s.toast('error', NO_SUCH_SESSION, { sticky: true });
    return { ok: false, message: NO_SUCH_SESSION };
  }
  // PHASE 90.3. The pair, so a session on another machine lands in that
  // machine's tab rather than in a tab on this Mac that happens to have the
  // same folder path.
  const target =
    targetOfSession(session) ??
    workspaceTarget(session.projectPath, session.machine?.id);
  const project = s.projects.find((p) => sameTarget(targetOfProject(p), target));
  if (project) {
    s.setActiveProject(project.id);
    land(session.id);
    return { ok: true };
  }

  // No tab names this folder on this computer, so one is opened. The path a
  // person reads is the same string the ⌘J row draws.
  const shown = displayPath(target.path, target.machineId);
  const result = await s.openTargetProject(target);
  if (result.ok) {
    if (!hadATabBefore(session)) {
      useApp
        .getState()
        .toast('info', tabOpenedForSession(shown, session.name));
    }
    land(session.id);
    return { ok: true };
  }

  const message = targetOpenRefusal(result, shown, labelOf(session, target));
  useApp.getState().toast('error', message, { sticky: true });
  return { ok: false, message };
}
