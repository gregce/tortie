/**
 * Phase 293 — what the session manager DOES when a person presses something.
 *
 * The sheet draws; this file acts. Every handler a row, a panel, a menu pick or
 * the batch confirmation reaches is here, and every one of them keeps ONE rule.
 *
 * THE RULE OF THE PRESS (build/p293/SPEC.md §4.0). A sheet is the first surface
 * where a row can sit on screen for minutes while another window, a machine
 * reconnecting or the session itself changes it. A `Session` captured when a
 * row was drawn, a native menu was built or a panel was opened is stale by the
 * time it is used, and at the parent a stale `exited` row whose menu said
 * Restart would, once restored elsewhere, have had main kill the live session
 * and hard delete its row. So:
 *
 *  1. every handler here takes a SESSION ID and nothing else;
 *  2. at the press it re-reads the row by that id from the store;
 *  3. it asks THAT VERB'S OWN field of `sessionActionGates` over the fresh row
 *     and the fresh environment;
 *  4. when the row is gone or the gate is false, NOTHING is called, the row's
 *     own panel closes, and one info toast says `SESSION_CHANGED`;
 *  5. Retry re-enters at the gate, and never calls a lifecycle verb directly;
 *  6. a row that is busy accepts no press at all.
 *
 * `freshRow` is the one function that does steps 2 to 4, and no function in
 * this file reads a session off a drawn row: `conformance:manager` reads this
 * source as text to hold that.
 *
 * NO SECOND POLICY. Which verbs a row offers is `sessionMenuItems`'s answer,
 * and the gates are `sessionActionGates`'s. The sheet presents them: the host
 * below changes what a menu row's `run` does, and nothing about which rows
 * exist. The batch is NARROWER than the policy in one named case (a machine
 * this run holds no row for) and never wider.
 *
 * A CONTINUATION WRITES ONLY INTO ITS OWN PANEL. A verb that was confirmed in a
 * panel marks that panel busy through the store, and its answer lands through
 * `settleSessionSheetInline`, which writes only while that id's panel is still
 * busy. When it is not, because the sheet closed or the panel went, a failure
 * is one sticky error toast carrying main's sentence and a success is whatever
 * the shipped verb says, which for End is nothing. Nobody who confirmed a verb
 * and pressed Escape is left believing it worked when it did not.
 */

import type { CaptureChoice } from '@shared/ipc';
import type { Session } from '@shared/types';
import {
  sameTarget,
  targetOfProject,
  targetOfSession,
  workspaceTarget
} from '@shared/workspace-target';
import type { WorkspaceTarget } from '@shared/workspace-target';
import { sessionGateEnv, sessionMenuItems } from '../app/session-actions';
import type { SessionActionHost } from '../app/session-actions';
import { noFolderThere } from '../app/reach-copy';
import { jumpToSession, targetOpenRefusal } from '../app/session-focus';
import { displayPath } from '../format';
import type { AppState } from '../state/app-state';
import { machineLabelFor } from '../state/machines-slice';
import {
  restoreNeedsOpenAsk,
  sessionActionGates
} from '../state/resume';
import type {
  RestoreNote,
  RestoreOutcome,
  SessionActionGates
} from '../state/resume';
import type {
  SessionSheetInline,
  SessionSheetRetry,
  SessionSheetTab
} from '../state/session-manager-slice';
import type { MenuItemSpec } from '../state/store';
import { effectiveStatusOf, errorPayload, errorText, useApp } from '../state/store';
import { canReadDir, readDir } from '../tree/fs-bridge';
import { batchEligibility, runBatchEnd } from './batch-end';
import {
  batchClosedToast,
  batchEndedToast,
  batchWhere,
  GO_TO_SESSION,
  SESSION_CHANGED,
  SESSION_DETAILS
} from './copy';
// `SELECTED_TAB` is the last stop of every chain: the selected tab, always
// drawn and never disabled (SPEC §2.3). A chain that ends anywhere else can end
// at `body`, and from `body` Tab reaches the controls behind the scrim. It and
// `nameSelector` have ONE spelling, in ./open.ts, which the grid reads too.
import {
  closeSessionManager,
  focusChain,
  nameSelector as rowNameSelector,
  SELECTED_TAB
} from './open';
import type { ManageGroup, ManageRow } from './projection';
import { selectManageProjection } from './use-sheet-refresh';
import { visibleGroups, visibleIds } from './view';

// ---------------------------------------------------------------------------
// Where the keyboard goes back to
// ---------------------------------------------------------------------------

/** `CSS.escape` where the platform has it; an id is a uuid in practice. */
function cssEscape(value: string): string {
  const css = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS;
  return typeof css?.escape === 'function'
    ? css.escape(value)
    : value.replace(/["\\]/g, '\\$&');
}

/**
 * Hand the keyboard down a chain one frame after the store write, because the
 * node a chain names is drawn by the render that write causes. With no
 * document (a unit test under node) there is nothing to hand it to.
 */
function focusAfter(selectors: readonly string[]): void {
  const raf = (globalThis as { requestAnimationFrame?: (fn: () => void) => number })
    .requestAnimationFrame;
  if (typeof raf !== 'function' || typeof document === 'undefined') return;
  raf(() => {
    if (useApp.getState().sessionSheet === null) return;
    focusChain(selectors);
  });
}

/** The row's name, then the selected tab. Every panel that closes goes here. */
function focusRowName(id: string): void {
  focusAfter([rowNameSelector(id), SELECTED_TAB]);
}

/** The panel's own element, once, after the render that moved it. */
function followPanel(id: string): void {
  const raf = (globalThis as { requestAnimationFrame?: (fn: () => void) => number })
    .requestAnimationFrame;
  if (typeof raf !== 'function' || typeof document === 'undefined') return;
  raf(() => {
    const node = document.querySelector<HTMLElement>(
      `[data-manage-inline="${cssEscape(id)}"]`
    );
    node?.scrollIntoView?.({ block: 'nearest' });
  });
}

// ---------------------------------------------------------------------------
// The rule of the press
// ---------------------------------------------------------------------------

/** One verb's own gate, asked of the gates over the fresh row. */
export type PressGate = (gates: SessionActionGates) => boolean;

/** Go to session, and its menu row: the row can be reached. */
const REACHABLE: PressGate = (g) => !g.unknown && !g.removed;
const CAN_END: PressGate = (g) => g.canEnd;
const CAN_REMOVE: PressGate = (g) => g.canRemove;
const CAN_RENAME: PressGate = (g) => g.canRename;

/** What a press finds when it reads the row again. */
export interface FreshRow {
  session: Session;
  gates: SessionActionGates;
}

/**
 * The gates over one row, with the environment read from the store NOW, by
 * the same reader the policy itself uses, so the menu a row draws and the
 * press that re-checks it can never be handed two different environments.
 */
function gatesOf(session: Session): SessionActionGates {
  return sessionActionGates(
    session,
    effectiveStatusOf(session),
    sessionGateEnv(session.id)
  );
}

/** The row by id from the tab's own list, with its gates. No toast. */
function readRow(s: AppState, id: string, tab: SessionSheetTab): FreshRow | null {
  if (id.length === 0) return null;
  const list = tab === 'past' ? s.pastSessions : s.sessions;
  const found = list.find((one) => one.id === id);
  return found === undefined ? null : { session: found, gates: gatesOf(found) };
}

/**
 * Steps 2 to 4 of the rule of the press, for every caller in this file.
 *
 * It re-reads the row BY ID from `sessions`, or `pastSessions` for a Past row,
 * computes the gates over it and the environment as it is now, and asks the
 * verb's own gate when one is given. When the row is gone or the gate says no,
 * it closes that row's panel if one is open and not busy, raises ONE info toast
 * saying the session changed, and answers null, so the caller calls nothing.
 * The row already shows its new state in front of the person.
 */
export function freshRow(
  id: string,
  tab: SessionSheetTab,
  gate?: PressGate
): FreshRow | null {
  const s = useApp.getState();
  const fresh = readRow(s, id, tab);
  if (fresh !== null && (gate === undefined || gate(fresh.gates))) return fresh;
  const inline = s.sessionSheet?.inline ?? null;
  if (inline !== null && inline.id === id && inline.busy !== true) {
    s.setSessionSheetInline(null);
    focusRowName(id);
  }
  s.toast('info', SESSION_CHANGED);
  return null;
}

/** The tab the sheet is on, which is the tab every open row menu was drawn on. */
function currentTab(): SessionSheetTab {
  return useApp.getState().sessionSheet?.tab ?? 'managed';
}

/**
 * A row accepts no press while it is restoring or while its own panel is busy
 * (SPEC §2.7). The sheet draws its controls disabled; this is the same refusal
 * for a press that arrives anyway, a menu pick or a key.
 */
function rowBusy(id: string): boolean {
  const s = useApp.getState();
  if (s.restoringIds[id] === true) return true;
  if (probingFolder.has(id)) return true;
  const inline = s.sessionSheet?.inline ?? null;
  return inline !== null && inline.id === id && inline.busy === true;
}

/**
 * Open one panel under one row. The store refuses it over a busy panel and
 * while a batch runs or reports, and answers whether it opened.
 */
function openPanel(next: SessionSheetInline): boolean {
  const opened = useApp.getState().setSessionSheetInline(next);
  if (opened) followPanel(next.id);
  return opened;
}

/**
 * Where a verb's failure is said. Into its own busy panel when that is still
 * there; otherwise ONE sticky error toast with the failing layer's sentence,
 * which is what every shipped verb does when it fails.
 */
function settleFailure(
  id: string,
  retry: SessionSheetRetry,
  message: string,
  options?: CaptureChoice
): void {
  const s = useApp.getState();
  const wrote = s.settleSessionSheetInline(id, {
    id,
    kind: 'failed',
    retry,
    message,
    ...(options === undefined ? {} : { options })
  });
  if (!wrote) s.toast('error', message, { sticky: true });
}

/**
 * A verb pressed on the row itself, with no panel of its own (the visible
 * Restore, a menu Restart). Its failure opens the `failed` panel under ITS row
 * only when no other panel is open there to be replaced; a person reading
 * another row's panel keeps it, and reads the failure in a sticky toast.
 */
function failWithoutPanel(
  id: string,
  retry: SessionSheetRetry,
  message: string,
  options?: CaptureChoice
): void {
  const s = useApp.getState();
  const inline = s.sessionSheet?.inline ?? null;
  const free = s.sessionSheet !== null && (inline === null || (inline.id === id && inline.busy !== true));
  const opened =
    free &&
    openPanel({
      id,
      kind: 'failed',
      retry,
      message,
      ...(options === undefined ? {} : { options })
    });
  if (!opened) s.toast('error', message, { sticky: true });
}

// ---------------------------------------------------------------------------
// The host: the policy's menu, the sheet's presentation
// ---------------------------------------------------------------------------

/** Rows with a Restart in the air, so a second pick starts nothing. */
const restarting = new Set<string>();

/**
 * What the policy's verbs do on the sheet. Every method takes an ID, because a
 * native menu runs the closure that was built when it was drawn, which can be
 * seconds old; each one re-reads and re-checks at the pick.
 */
export const sheetHost: SessionActionHost = {
  rename(sessionId) {
    if (rowBusy(sessionId)) return;
    if (freshRow(sessionId, currentTab(), CAN_RENAME) === null) return;
    openPanel({ id: sessionId, kind: 'rename' });
  },

  restore(sessionId, options) {
    void beginRestore(sessionId, currentTab(), options, 'press');
  },

  restart(sessionId, options) {
    if (rowBusy(sessionId) || restarting.has(sessionId)) return;
    // Plain Restart acts at once, as it does on every other surface (ruling
    // R7). It is the one verb here that ends in a hard delete of the old row,
    // so its gate is asked again inside the call that runs it.
    if (options?.withoutCapture !== true) {
      void restartUnpanelled(sessionId);
      return;
    }
    // The bare form is the one that asks, because it turns saving off for good.
    const fresh = freshRow(
      sessionId,
      'managed',
      (g) => g.offersRestart && g.offersBare
    );
    if (fresh === null) return;
    openPanel({ id: sessionId, kind: 'restart-bare', options });
  },

  end(sessionId) {
    if (rowBusy(sessionId)) return;
    if (freshRow(sessionId, 'managed', CAN_END) === null) return;
    openPanel({ id: sessionId, kind: 'end' });
  },

  remove(sessionId) {
    if (rowBusy(sessionId)) return;
    if (freshRow(sessionId, 'managed', CAN_REMOVE) === null) return;
    openPanel({ id: sessionId, kind: 'remove' });
  },

  savedOutput(sessionId) {
    if (rowBusy(sessionId)) return;
    if (freshRow(sessionId, currentTab()) === null) return;
    // The panel first: the store refuses it over a busy panel or a batch, and
    // a read with nowhere to draw it would open the modal the moment the sheet
    // closed.
    if (openPanel({ id: sessionId, kind: 'output' })) {
      useApp.getState().openSavedOutput(sessionId);
    }
  },

  leaveThen(run) {
    closeSessionManager({ give: 'nobody' });
    run();
  },

  goThen(sessionId, run, needs) {
    // The verb's own gate is the one it names, for the one row that has one
    // (Resume conversation types into the session). The two rows that only
    // read are offered on every row that is not removed, an unreachable one
    // included, and so they go wherever the policy offered them.
    jumpThen(
      sessionId,
      (g) => !g.removed && (needs === undefined || g[needs]),
      run
    );
  }
};

/**
 * Go to the session, and only when the jump answered ok close the sheet and
 * run. The sheet closes with the keyboard given to the terminal one frame
 * after the close, because the landing's own hand-over can fire while the
 * sheet is still drawn, and the sheet takes a keyboard that leaves it straight
 * back.
 */
function jumpThen(sessionId: string, gate: PressGate, run: () => void): void {
  if (rowBusy(sessionId)) return;
  if (freshRow(sessionId, 'managed', gate) === null) return;
  void jumpToSession(sessionId).then((result) => {
    // A refused jump has already said its own sticky sentence. The sheet
    // stays, the row stays, and nothing runs.
    if (!result.ok) {
      focusRowName(sessionId);
      return;
    }
    if (useApp.getState().sessionSheet !== null) {
      closeSessionManager({ give: 'terminal' });
    }
    run();
  });
}

/** A Restart with no panel of its own: the menu row, which acts at once. */
async function restartUnpanelled(id: string): Promise<void> {
  if (freshRow(id, 'managed', (g) => g.offersRestart) === null) return;
  restarting.add(id);
  try {
    const result = await useApp.getState().restartSessionNow(id);
    if (!result.ok) failWithoutPanel(id, 'restart', result.message);
  } finally {
    restarting.delete(id);
  }
}

/**
 * The menu a row's ellipsis opens: the sheet's two own rows, then the policy's
 * menu for the row as it is NOW, unchanged in set, order, label, glyph, hint,
 * sublabel, `disabled` and `destructive`.
 *
 * The two own rows carry no glyph on purpose. No mark in `MENU_CODICONS` is
 * true of "open this expansion", and `terminal` is already worn by
 * `Resume conversation` in the same menu, so a mark on Go to session would say
 * two things.
 */
export function manageMenuItems(row: ManageRow): (MenuItemSpec | 'sep')[] {
  const { id, tab } = row;
  const fresh = freshRow(id, tab);
  if (fresh === null) return [];
  const { session, gates } = fresh;
  const own: MenuItemSpec[] = [
    { label: SESSION_DETAILS, run: () => openDetails(id, tab) }
  ];
  if (tab === 'managed' && REACHABLE(gates)) {
    own.push({ label: GO_TO_SESSION, run: () => goToSession(id) });
  }
  return [...own, 'sep', ...sessionMenuItems(session, `manage:${id}`, sheetHost)];
}

/** Draw a row's menu natively under its ellipsis. There is no DOM menu. */
export function openRowMenu(
  row: ManageRow,
  rect: { left: number; bottom: number }
): void {
  if (rowBusy(row.id)) return;
  const items = manageMenuItems(row);
  if (items.length === 0) return;
  useApp.getState().setMenu({
    x: Math.round(rect.left),
    y: Math.round(rect.bottom),
    items
  });
}

// ---------------------------------------------------------------------------
// The row's own controls
// ---------------------------------------------------------------------------

/**
 * The ONE visible button.
 *
 * `verb` is the verb the button was DRAWN with, and the press asks that verb's
 * own gate over the fresh row. The button can change verb under a finger: a
 * row that ends by itself flips `End session…` to `Restore` in place, and a
 * press meant for End must not restore. So a drawn verb the row no longer
 * offers is a row that changed, and nothing is done. With no drawn verb the
 * row's present verb is used, End only on a live row and Restore only on a row
 * that offers it.
 */
export function runPrimary(
  id: string,
  tab: SessionSheetTab,
  verb?: 'end' | 'restore'
): void {
  if (rowBusy(id)) return;
  if (tab === 'managed' && verb !== 'restore') {
    const fresh = freshRow(
      id,
      'managed',
      verb === 'end' ? CAN_END : (g) => g.canEnd || g.canRestoreNow
    );
    if (fresh === null) return;
    const { gates } = fresh;
    if (gates.canEnd) {
      sheetHost.end(id);
      return;
    }
  }
  void beginRestore(id, tab, undefined, 'press');
}

/** Details under a row. A second press on the same row closes it. */
export function openDetails(id: string, tab: SessionSheetTab): void {
  const s = useApp.getState();
  const inline = s.sessionSheet?.inline ?? null;
  if (inline !== null && inline.id === id && inline.kind === 'details') {
    cancelInline();
    return;
  }
  if (freshRow(id, tab) === null) return;
  openPanel({ id, kind: 'details' });
}

/** Go to session, from the menu and from a restore's toast. Closes on `ok` only. */
export function goToSession(id: string): void {
  // Going there is acting on the row, so an unreachable row is refused here
  // exactly as every other surface refuses it.
  jumpThen(id, REACHABLE, () => undefined);
}

// ---------------------------------------------------------------------------
// Restore, one path for the button, the menu row and Retry, on both tabs
// ---------------------------------------------------------------------------

/**
 * How a restore attempt reached this call. It decides which asks have already
 * been answered, and nothing else: every entry starts at the gate.
 */
type RestoreEntry = 'press' | 'bare-confirmed' | 'open-confirmed' | 'retry';

/** Rows whose folder is being asked about before the restore-open ask. */
const probingFolder = new Set<string>();

/**
 * Whether a closed project's folder is GONE from this Mac, asked before the
 * restore-open ask is drawn (the Phase 293 fix round, finding W7).
 *
 * Today's Past Sessions asked main, whose native question statted the folder
 * first and said on the FIRST press that it no longer exists. The inline ask
 * (ruling R1) asked nothing, promised "A fresh shell opens in the same folder"
 * over a folder that was not there, and said the truth only after the second
 * press. So the one read the tree already has for a folder, `fs:readDir`, is
 * asked here, and ONLY an answer that says the folder is not there (ENOENT, or
 * ENOTDIR for a path that is now a file, which today's stat counted as gone
 * too) is read as gone. Any other failure, and a build with no reader, answers
 * false, and the ask is drawn exactly as before: this can only make the first
 * answer truer, never refuse a restore that would have worked.
 */
async function folderIsGone(path: string): Promise<boolean> {
  try {
    await readDir(path);
    return false;
  } catch (err) {
    const detail = errorPayload(err)?.detail ?? '';
    return /\b(ENOENT|ENOTDIR)\b/.test(detail);
  }
}

/** The verb's own gate for the tab the row is on. */
function restoreGate(tab: SessionSheetTab, bare: boolean): PressGate {
  return tab === 'past'
    ? (g) => g.canRestorePastNow
    : (g) => g.canRestoreNow && (!bare || g.offersBare);
}

async function beginRestore(
  id: string,
  tab: SessionSheetTab,
  options: CaptureChoice | undefined,
  entry: RestoreEntry
): Promise<void> {
  const panelled = entry !== 'press';
  if (!panelled && rowBusy(id)) return;
  const bare = options?.withoutCapture === true;
  // Step 1. RETRY STARTS HERE, like every other entry.
  const fresh = freshRow(id, tab, restoreGate(tab, bare));
  if (fresh === null) return;
  const { session } = fresh;
  // Step 2. Restoring without SpecStory turns saving off for good, so it
  // asks, inline, and its Confirm comes back through step 1.
  if (bare && entry === 'press') {
    openPanel({ id, kind: 'restore-bare', options });
    return;
  }
  // Step 3. A closed project's tab is opened first, and that is asked too
  // (ruling R1). A row on another machine never asks: main re-homes it.
  const s = useApp.getState();
  const openTargets = s.projects
    .map(targetOfProject)
    .filter((one): one is WorkspaceTarget => one !== null);
  const needsOpen = restoreNeedsOpenAsk(session, openTargets);
  if (needsOpen && entry !== 'open-confirmed') {
    // The fix round (W7). A folder that is gone is said on THIS press, as
    // today's Past Sessions said it, and no ask promising a shell in it is
    // drawn. `restoreNeedsOpenAsk` is true only for a row on this Mac, so the
    // path is this Mac's. A build with no reader asks nothing and draws the
    // ask at once, as before.
    let gone = false;
    if (canReadDir()) {
      if (probingFolder.has(id)) return;
      probingFolder.add(id);
      try {
        gone = await folderIsGone(session.projectPath);
      } finally {
        probingFolder.delete(id);
      }
    }
    if (gone) {
      const message = noFolderThere(displayPath(session.projectPath));
      const retry: SessionSheetRetry = bare ? 'restore-bare' : 'restore';
      if (panelled) {
        openPanel({
          id,
          kind: 'failed',
          retry,
          message,
          ...(options === undefined ? {} : { options })
        });
      } else {
        failWithoutPanel(id, retry, message, options);
      }
      return;
    }
    // From a panel the person pressed in, this replaces it: it is theirs.
    openPanel({
      id,
      kind: 'restore-open',
      ...(options === undefined ? {} : { options })
    });
    return;
  }
  const retry: SessionSheetRetry = bare ? 'restore-bare' : 'restore';
  if (panelled && !s.markSessionSheetInlineBusy(id)) return;
  // Step 4. Open the tab, and restore nothing when it is refused.
  let reactivate: string | null = null;
  if (needsOpen) {
    const before = s.activeProjectId;
    const target =
      targetOfSession(session) ??
      workspaceTarget(session.projectPath, session.machine?.id);
    const opened = await useApp.getState().openTargetProject(target);
    if (!opened.ok) {
      const label =
        session.machine?.label ??
        machineLabelFor(useApp.getState().machineStates, target.machineId);
      // The folder-gone arm without Go to session's "still running": the
      // session being restored runs nowhere (reach-copy.ts `noFolderThere`).
      settleFailure(
        id,
        retry,
        targetOpenRefusal(
          opened,
          displayPath(target.path, target.machineId),
          label,
          noFolderThere
        ),
        options
      );
      return;
    }
    reactivate = before;
    // The group has just moved to the open section. Follow it once.
    followPanel(id);
  }
  // Step 5. The verb.
  let outcome: RestoreOutcome;
  try {
    outcome =
      tab === 'past'
        ? await useApp.getState().restorePastSession(id)
        : await useApp.getState().restoreSessionNow(id, options);
  } catch (err) {
    outcome = { kind: 'failed', message: errorText(err) };
  }
  landRestore(id, tab, outcome, retry, options, panelled, reactivate);
}

/** Say what a restore did, where the person is looking. */
function landRestore(
  id: string,
  tab: SessionSheetTab,
  outcome: RestoreOutcome,
  retry: SessionSheetRetry,
  options: CaptureChoice | undefined,
  panelled: boolean,
  reactivate: string | null
): void {
  const s = useApp.getState();
  if (outcome.kind === 'busy') {
    if (panelled) s.settleSessionSheetInline(id, null);
    return;
  }
  if (outcome.kind === 'failed') {
    // The row keeps its place, and the project that was in front of the
    // person before this attempt opened a tab comes back, when it is open.
    if (
      reactivate !== null &&
      s.activeProjectId !== reactivate &&
      s.projects.some((p) => p.id === reactivate)
    ) {
      s.setActiveProject(reactivate);
    }
    if (panelled) settleFailure(id, retry, outcome.message, options);
    else failWithoutPanel(id, retry, outcome.message, options);
    return;
  }
  if (panelled) s.settleSessionSheetInline(id, null);
  const { session: restored } = outcome;
  if (tab === 'past') {
    landPastRestore(restored, outcome.note);
    return;
  }
  void s.refreshSessionSheet();
  // ONE toast, and the way to the session is in it. The Managed tab stays
  // open: a person managing sessions restores one and goes on to the next.
  s.toast(outcome.note.kind, outcome.note.text, {
    sticky: outcome.note.sticky,
    action: { label: GO_TO_SESSION, run: () => goToSession(restored.id) }
  });
  // The row is still there, now live.
  focusAfter([rowNameSelector(id), SELECTED_TAB]);
}

/**
 * A removed session came back from the Past tab: the sheet closes and the
 * person lands in it, as today's Past Sessions did (the Phase 293 fix round,
 * finding W1).
 *
 * Today one press on Restore closed the panel, switched to the session's
 * project when it had an open tab, selected the session and left the keyboard
 * in its terminal. The first build kept the sheet open and offered the way
 * there only in a toast that went in five seconds, so bringing back the
 * session you just removed by mistake, the panel's whole use, took more steps
 * than it does today. The landing is the one today's panel made, by the pair
 * `sameTarget(targetOfProject, targetOfSession)`: the project is switched to
 * and the session selected, and the terminal takes the keyboard itself when
 * its pane mounts, so the close gives it to nobody (a give-back one frame
 * later could hand it to another live pane before the restored one has
 * mounted, which is ruling R16's hazard). The one exception is a session
 * that is already the one in front, said where it is decided. With no open
 * tab for it, which is a
 * row on another machine that main re-homes, the sheet still closes, as
 * today's did, the keyboard goes back where it was, and the toast keeps
 * Go to session.
 */
function landPastRestore(restored: Session, note: RestoreNote): void {
  const s = useApp.getState();
  const target = targetOfSession(restored);
  const project = s.projects.find((p) => sameTarget(targetOfProject(p), target));
  // Whether the restored session is ALREADY the one in front: its tab was
  // opened for this restore and its slot still named it, so its pane mounted
  // while the sheet was open and its own focus went into the sheet. Nothing
  // below changes the selection then, so the pane will not take the keyboard
  // again by itself, and the close hands it to the visible terminal, which is
  // that pane (probe:p293 arm 5 measured `body` without this). Otherwise the
  // selection moves, the pane mounts after the close and takes it itself.
  const alreadyInFront =
    project !== undefined &&
    s.activeProjectId === project.id &&
    s.activeSessionByProject[project.id] === restored.id;
  closeSessionManager({
    give: project === undefined ? 'origin' : alreadyInFront ? 'terminal' : 'nobody'
  });
  if (project !== undefined) {
    const now = useApp.getState();
    now.setActiveProject(project.id);
    now.setActiveSession(restored.id);
  }
  useApp.getState().toast(note.kind, note.text, {
    sticky: note.sticky,
    ...(project === undefined
      ? { action: { label: GO_TO_SESSION, run: () => goToSession(restored.id) } }
      : {})
  });
}

// ---------------------------------------------------------------------------
// The panels' buttons
// ---------------------------------------------------------------------------

/** The panel's destructive or primary button. It acts once per panel. */
export function confirmInline(): void {
  const inline = useApp.getState().sessionSheet?.inline ?? null;
  if (inline === null || inline.busy === true) return;
  const { id, kind, options } = inline;
  switch (kind) {
    case 'end':
      void endConfirmed(id);
      return;
    case 'remove':
      void removeConfirmed(id);
      return;
    case 'restore-open':
      void beginRestore(id, currentTab(), options, 'open-confirmed');
      return;
    case 'restore-bare':
      void beginRestore(id, currentTab(), options, 'bare-confirmed');
      return;
    case 'restart-bare':
      void restartConfirmed(id, { withoutCapture: true }, 'restart-bare');
      return;
    default:
      // details, output and rename have no confirm of their own here; a failed
      // panel's primary is Retry.
      return;
  }
}

/** Retry on a `failed` panel. It re-enters its verb AT THE GATE. */
export function retryInline(): void {
  const inline = useApp.getState().sessionSheet?.inline ?? null;
  if (inline === null || inline.busy === true || inline.kind !== 'failed') return;
  const { id, retry, options } = inline;
  switch (retry) {
    case 'end':
      void endConfirmed(id);
      return;
    case 'remove':
      void removeConfirmed(id);
      return;
    case 'restore':
      void beginRestore(id, currentTab(), undefined, 'retry');
      return;
    case 'restore-bare':
      void beginRestore(id, currentTab(), { withoutCapture: true }, 'retry');
      return;
    case 'restart':
      void restartConfirmed(id, options, 'restart');
      return;
    case 'restart-bare':
      void restartConfirmed(id, { withoutCapture: true }, 'restart-bare');
      return;
    default:
      return;
  }
}

/** Close the one panel. A busy one stays: its answer is about to land in it. */
export function cancelInline(): void {
  const s = useApp.getState();
  const inline = s.sessionSheet?.inline ?? null;
  if (inline === null || inline.busy === true) return;
  if (!s.setSessionSheetInline(null)) return;
  // The saved copy is dropped with its panel, as the modal drops it on Close:
  // a saved screen can be megabytes, and a copy left open in the store would
  // draw as a modal the moment the sheet closed.
  if (inline.kind === 'output') useApp.getState().closeSavedOutput();
  focusRowName(inline.id);
}

/** End, confirmed in its panel or retried from its failure. */
async function endConfirmed(id: string): Promise<void> {
  if (freshRow(id, 'managed', CAN_END) === null) return;
  const s = useApp.getState();
  // False is a second press, a double click or a repeating Enter.
  if (!s.markSessionSheetInlineBusy(id)) return;
  const result = await s.endSessionNow(id);
  if (result.ok) {
    // No success toast: the row reads ended, with Restore, in front of them.
    if (useApp.getState().settleSessionSheetInline(id, null)) {
      useApp.getState().setSessionSheetChecked([id], false);
      focusRowName(id);
    }
    return;
  }
  settleFailure(id, 'end', result.message);
}

/** Remove, confirmed in its panel or retried from its failure. */
async function removeConfirmed(id: string): Promise<void> {
  if (freshRow(id, 'managed', CAN_REMOVE) === null) return;
  const s = useApp.getState();
  if (!s.markSessionSheetInlineBusy(id)) return;
  const result = await s.removeSessionNow(id);
  if (result.ok) {
    // The row has left Managed and its name with it.
    if (useApp.getState().settleSessionSheetInline(id, null)) {
      focusAfter([SELECTED_TAB]);
    }
    return;
  }
  settleFailure(id, 'remove', result.message);
}

/** A Restart that has a panel: the bare form's Confirm, or a Retry. */
async function restartConfirmed(
  id: string,
  options: CaptureChoice | undefined,
  retry: 'restart' | 'restart-bare'
): Promise<void> {
  const bare = options?.withoutCapture === true;
  if (
    freshRow(id, 'managed', (g) => g.offersRestart && (!bare || g.offersBare)) ===
    null
  ) {
    return;
  }
  const s = useApp.getState();
  if (!s.markSessionSheetInlineBusy(id)) return;
  const result = await s.restartSessionNow(id, options);
  if (result.ok) {
    // The old row is replaced by a new one, so its name is gone.
    if (useApp.getState().settleSessionSheetInline(id, null)) {
      focusAfter([SELECTED_TAB]);
    }
    return;
  }
  settleFailure(id, retry, result.message, options);
}

/**
 * Save a new name from the rename panel. The name must be non-empty once
 * trimmed and different from the row's name as it is NOW. A failure is the
 * panel's own error line and the panel stays open.
 */
export function saveRename(id: string, name: string): void {
  void saveRenameNow(id, name);
}

async function saveRenameNow(id: string, name: string): Promise<void> {
  const inline = useApp.getState().sessionSheet?.inline ?? null;
  if (inline === null || inline.id !== id || inline.busy === true) return;
  const fresh = freshRow(id, currentTab(), CAN_RENAME);
  if (fresh === null) return;
  const { session } = fresh;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed === session.name) return;
  const s = useApp.getState();
  if (!s.markSessionSheetInlineBusy(id)) return;
  const result = await s.renameSessionNow(id, trimmed);
  const now = useApp.getState();
  if (result.ok) {
    if (now.settleSessionSheetInline(id, null)) focusRowName(id);
    return;
  }
  const wrote = now.settleSessionSheetInline(id, {
    id,
    kind: 'rename',
    message: result.message
  });
  if (!wrote) now.toast('error', result.message, { sticky: true });
}

// ---------------------------------------------------------------------------
// Batch End
// ---------------------------------------------------------------------------

/**
 * The Managed tab as the sheet draws it now: the groups the filters leave.
 *
 * The projection is the grid's own (`selectManageProjection`, memoised on the
 * same inputs), so a batch names from the picture a person is looking at and
 * a new projection input cannot reach one and miss the other. The filters are
 * applied here rather than read off `selectSheetView`, because that answers
 * the CURRENT tab and this is always the Managed one.
 */
function managedView(s: AppState): ManageGroup[] {
  const sheet = s.sessionSheet;
  if (sheet === null) return [];
  const projection = selectManageProjection(s);
  return visibleGroups(
    projection.managed,
    {
      search: sheet.search,
      project: sheet.project,
      tabFilter: sheet.tabFilter,
      stateFilter: sheet.stateFilter,
      lifecycle: sheet.lifecycle
    },
    sheet.sort
  );
}

/**
 * Whether Tortie holds a row for this machine in this run. Before the list
 * has loaded it holds none, and every remote target is skipped, which is the
 * safe direction.
 */
function machineKnownIn(s: AppState): (machineId: string) => boolean {
  const known = new Set(s.machineStates.map((one) => one.id));
  return (machineId) => known.has(machineId);
}

/** `batchEligibility` over a row as it is in the store right now. */
function eligibleNow(
  s: AppState,
  row: FreshRow
): ReturnType<typeof batchEligibility> {
  const { session, gates } = row;
  return batchEligibility(session, gates, machineKnownIn(s));
}

/**
 * `End selected sessions…`: NAME the targets.
 *
 * `named` is every checked id that is also VISIBLE and ELIGIBLE at this
 * instant, in drawn order, by session id. It is an UPPER BOUND that never
 * grows: the confirmation may shrink while it is open and never widens, so a
 * machine that reconnects cannot turn `End 3` into `End 8`. The rest of the
 * selection is counted by reason.
 */
export function startBatch(): void {
  const s = useApp.getState();
  const sheet = s.sessionSheet;
  if (sheet === null || sheet.tab !== 'managed') return;
  if (sheet.batch !== null || sheet.inline?.busy === true) return;
  const named: { id: string; where: string }[] = [];
  const skippedAtOpen = { ended: 0, unreachable: 0 };
  for (const group of managedView(s)) {
    for (const row of group.rows) {
      const { id } = row;
      // A row a person cannot see is never ended by a batch, and the prune is
      // not trusted to have run: only drawn rows are asked at all.
      if (id.length === 0 || sheet.checked[id] !== true) continue;
      const fresh = readRow(s, id, 'managed');
      if (fresh === null) continue;
      const answer = eligibleNow(s, fresh);
      if (answer === 'yes') {
        named.push({ id, where: batchWhere(group.label, group.machineLabel) });
      } else if (answer === 'ended') {
        skippedAtOpen.ended += 1;
      } else if (answer === 'unreachable') {
        skippedAtOpen.unreachable += 1;
      }
      // `gone` cannot be a drawn Managed row: a row in this list is live,
      // ended or unreachable. It is counted once it leaves a named list.
    }
  }
  if (s.openSessionSheetBatch({ named, skippedAtOpen })) {
    const raf = (globalThis as { requestAnimationFrame?: (fn: () => void) => number })
      .requestAnimationFrame;
    if (typeof raf === 'function' && typeof document !== 'undefined') {
      raf(() => {
        document
          .querySelector<HTMLElement>('section.sm-batch')
          ?.scrollIntoView?.({ block: 'nearest' });
      });
    }
  }
}

/**
 * The ids a press would end now: named ∩ checked ∩ visible ∩ eligible, in
 * drawn order. Read from the store and never from a copy kept on the batch.
 */
export function batchTargetsNow(): string[] {
  const s = useApp.getState();
  const sheet = s.sessionSheet;
  const batch = sheet?.batch ?? null;
  if (sheet === null || batch === null) return [];
  const named = new Set(batch.named.map((one) => one.id));
  const targets: string[] = [];
  for (const id of visibleIds(managedView(s))) {
    if (!named.has(id) || sheet.checked[id] !== true) continue;
    const fresh = readRow(s, id, 'managed');
    if (fresh === null || eligibleNow(s, fresh) !== 'yes') continue;
    targets.push(id);
  }
  return targets;
}

/**
 * `End <n> sessions`: FREEZE the targets, then end them one at a time.
 *
 * Everything up to the run id is synchronous, so a second press, a held Enter
 * or a double click finds the batch already running and starts nothing. An id
 * that was not named is never a target, however eligible it has become; an id
 * that was named and is no longer eligible is not one either.
 */
export async function confirmBatch(): Promise<void> {
  const s = useApp.getState();
  if (s.sessionSheet?.batch?.phase !== 'confirm') return;
  const targets = batchTargetsNow();
  const runId = s.beginSessionSheetBatchRun(targets);
  if (runId === null) return;
  const frozen = useApp.getState().sessionSheet?.batch?.targets ?? targets;
  const summary = await runBatchEnd({
    targetIds: frozen,
    list: () => useApp.getState().refreshSessions(),
    // The SAME predicate over the SAME gates the confirmation named with,
    // asked of the row main just answered.
    eligibility: (session) => {
      return eligibleNow(useApp.getState(), { session, gates: gatesOf(session) });
    },
    end: (sessionId) => useApp.getState().endSessionNow(sessionId),
    // BOUND TO THIS RUN. A closed sheet reads as stop, and so does a sheet
    // that was closed and reopened with a NEW batch, whose clear flag this
    // loop must never read as its own.
    stopRequested: () => {
      const batch = useApp.getState().sessionSheet?.batch ?? null;
      return !(batch !== null && batch.runId === runId && !batch.stopRequested);
    },
    report: (sessionId, outcome) =>
      useApp.getState().reportSessionSheetBatch(runId, sessionId, outcome)
  });
  const now = useApp.getState();
  if (now.sessionSheet?.batch?.runId !== runId) {
    // The manager closed while the batch ran. The call in flight finished and
    // nothing after it was ended; say how many, once, where it stays.
    now.toast('info', batchClosedToast(summary.ended, frozen.length, summary.notRun), {
      sticky: true
    });
    return;
  }
  now.finishSessionSheetBatch(runId);
  if (useApp.getState().sessionSheet?.batch === null) {
    // Every target ended: the panel has closed itself and the selection with
    // it. Under the Running filter the grid has just been replaced, so the
    // chain passes Clear filters before the tab.
    now.toast('success', batchEndedToast(summary.ended));
    focusAfter(['#sm-select-all', '[data-sm="clear-filters"]', SELECTED_TAB]);
  }
}

/** `Stop`, and Escape over a running batch. After the call in flight. */
export function stopBatch(): void {
  useApp.getState().requestSessionSheetBatchStop();
}

/** `Done` on the report. Failed and not-run targets stay checked. */
export function dismissBatch(): void {
  if (useApp.getState().closeSessionSheetBatch()) {
    focusAfter(['[data-sm="end-selected"]', '#sm-select-all', SELECTED_TAB]);
  }
}

/** Cancel on the confirmation, by either control or Escape. KEEPS the selection. */
export function cancelBatch(): void {
  const s = useApp.getState();
  if (s.sessionSheet?.batch?.phase !== 'confirm') return;
  if (s.closeSessionSheetBatch()) {
    focusAfter(['[data-sm="end-selected"]', '#sm-select-all', SELECTED_TAB]);
  }
}
