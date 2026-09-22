/**
 * Sessions — the renderer's projection of main's session list, plus every
 * verb the UI has for it: create, rename, end, restart, remove, restore,
 * Past Sessions, and the ⌘J attention bookkeeping.
 *
 * PHASE 293 gave five of those verbs a second form. `endSession`,
 * `removeSession`, `restoreSession`, `restartSession` and `renameSession` each
 * raise a stacked confirm, a toast, or both, which is right for a row, a strip
 * and a menu. The session manager draws its confirmations and its failures
 * INSIDE itself, under the row they are about, so beside each shipped verb
 * there is a `*Now` verb that raises neither and ANSWERS what happened. The
 * two forms share one core each, so there is one call to the bridge per verb
 * and the shipped verbs do today exactly what they did.
 *
 * Session status is MAIN's, full stop (Phase 13). The renderer used to derive
 * working / needs-input / idle itself from the `term:data:<id>` byte stream
 * and hold it in a `statusOverrides` map that outranked main — but bytes only
 * flow for the VISIBLE pane and the override was never cleared while a
 * session lived, so a session that had once produced output read "working"
 * forever. Detection now runs in main for every session, attached or not
 * (src/main/activity), and this slice just renders what it is told.
 */

import type { StateCreator } from 'zustand';
import type {
  AgentKind,
  LaunchableAgentKind,
  Session,
  SessionStatus
} from '@shared/types';
import type {
  CaptureChoice,
  InstalledGmuxApi,
  InstalledSessionsApi,
  MachineSessionLinesResult,
  SavedSessionOutput
} from '@shared/ipc';
// PHASE 312. The option rows the agent drew, for the sessions at a choice.
import type { SessionChoiceInfo } from '@shared/ipc/sessions';
// PHASE 100. The depth the panel opens on. It is a value rather than a type, so
// the panel and the store cannot disagree about what "the default" is.
import { REMOTE_SESSION_LINES_DEFAULT } from '@shared/ipc';
// PHASE 203. A finished sign in says it finished. Nothing about how a session
// lives or dies changes; one sentence is posted when the sign in session ends.
import { loginProviderForAgent } from '@shared/logins';
import { settleSignIns, watchSignIn } from './sign-in-watch';
import { setLoginSwitchedListener, setLoginTooLargeListener } from './logins';
import { offerRestartNow, sayLoginTooLarge } from './login-switch';
// Pure over Session fields; resume.ts imports only types, state/agents and
// (Phase 293) src/shared/workspace-target, and neither of those imports this
// store, so no cycle closes here.
import {
  LIFECYCLE_BRIDGE_MISSING,
  LIFECYCLE_SESSION_CHANGED,
  SHELL_PATH_PENDING_TITLE,
  bareRestartConfirm,
  bareRestoreConfirm,
  endSessionConfirm,
  removeSessionConfirm,
  restoreLandedNote,
  resumeInPlaceAnswerNote,
  resumeInPlaceLanded,
  sessionActionGates,
  showsResumeVerb
} from './resume';
import type {
  LifecycleResult,
  RestoreOutcome,
  ResumeInPlaceLanding,
  ResumeInPlaceRefusal,
  SessionActionGates,
  SessionHandback
} from './resume';
// Every sentence about a machine comes from one file, which is the one the
// vocabulary audit reads.
import { remoteTabOpened } from '../machines/project-tab';
// PHASE 94. The label a person gave the tab's machine, for the one refusal
// sentence below. It falls back to the machine's id when no row is held, so the
// sentence never has a hole in it.
import { machineLabelFor } from './machines-slice';
// PHASE 90.3. A session belongs to a tab when the PAIR matches, being the
// machine and the folder. A bare path comparison is correct on one computer and
// wrong on two, and it put a session on another machine under a tab whose
// sidebars were showing this Mac.
import {
  isLocalTarget,
  localTarget,
  sameTarget,
  targetKey,
  targetOfProject,
  targetOfSession
} from '@shared/workspace-target';
// Direct module import (NOT ../settings barrel): the barrel re-exports
// integration.ts which imports the app store — presets.ts itself does not.
import { defaultLaunchArgsFor } from '../settings/presets';
import { captureDefaultForAgent } from './specstory';
import { errorText } from './errors';
import type { AppState } from './app-state';
import { gmuxBridge } from '../bridge';

export interface SessionsSlice {
  sessions: Session[];
  /** Remembered selected session per project id. */
  activeSessionByProject: Record<string, string>;

  /** When a session flipped to needs_input (epoch ms) — ⌘J sort + ages. */
  attentionSince: Record<string, number>;
  /** Last non-empty terminal line per session (⌘J excerpt). */
  excerpts: Record<string, string>;
  /**
   * PHASE 311. What the agent in a session is asking, keyed by session id.
   *
   * Main composes it from the hook body it already receives, redacts it and
   * clips it before it is sent, and a row draws it INSTEAD of the excerpt when
   * there is one. The excerpt is the last inked line of the screen, which for
   * every committed Claude dialog is the hint row, so the question is the
   * better of the two whenever main has one.
   *
   * IT IS NOT A STATUS AND IT NEVER BECOMES ONE. It arrives on the activity
   * channel beside the excerpt and the last output time, which is the channel
   * for per session facts that are not the status, and no code path leads from
   * this record to `statusVisual`, to the dot or to `SessionStatus`.
   *
   * An id is absent when main has said nothing about that session's question,
   * which is every session of the other fourteen agents and every Claude
   * session that is not sitting at a dialog. Absent draws the excerpt, which
   * is what every row drew before this phase.
   */
  questions: Record<string, string>;
  /** Last observed output activity per session (epoch ms). */
  lastActivity: Record<string, number>;
  /**
   * PHASE 48. When THIS window saw a session stop (epoch ms), for the
   * sessions it also saw running.
   *
   * The ended block asks one question of it: did this session start and then
   * stop within five seconds? The session projection carries `createdAt` and
   * no death time at all, so the answer has to be observed rather than read.
   *
   * An id is absent when the window never saw that session alive, which is
   * every session that was already over when the window opened and every
   * session after a reload. Absent means the block draws exactly what it drew
   * before this phase, which is the honest answer: Tortie did not watch that
   * one start. The observed time is at or after the real one, so the error
   * can only hide a fast death and can never invent one.
   */
  endedSeenAt: Record<string, number>;

  /**
   * PHASE 141. The sessions whose agent has left, keyed by session id.
   *
   * A record exists for a session only while main says one of the three
   * handback states holds for it. Main clears it by sending `none`, and this
   * store deletes the key rather than holding a fourth state, so "there is no
   * record" and "nothing has happened here" are the same fact and cannot
   * disagree.
   *
   * IT IS NOT A STATUS AND IT NEVER BECOMES ONE. It arrives on the activity
   * channel beside the excerpt and the last output time, which is the channel
   * for per session facts that are not the status, and no code path leads from
   * this record to `statusVisual`, to the dot or to `SessionStatus`. That is
   * what keeps Phase 23 refusal 5 structural rather than promised.
   */
  handbacks: Record<string, SessionHandback>;

  /**
   * PHASE 312. The option rows the agent drew, for the sessions sitting at a
   * numbered choice, keyed by session id.
   *
   * A record exists for a session only while main says the choice holds for it.
   * Main clears it by sending `{ atChoice: false }`, and this store deletes the
   * key rather than holding a third state, so "there is no record" and "this
   * session is not at a choice" are the same fact and cannot disagree — the
   * same rule the handback above states, for the same reason.
   *
   * IT IS NOT A STATUS AND IT NEVER BECOMES ONE. It arrives on the activity
   * channel beside the excerpt and the handback, no code path leads from this
   * record to `statusVisual`, to the dot or to `SessionStatus`, and no surface
   * reads it except through `choiceOptionsFor` in `src/renderer/choice.ts`.
   */
  choices: Record<string, SessionChoiceInfo>;

  /**
   * PHASE 141. Put the command that continues this session's conversation on
   * its own prompt, and press nothing.
   *
   * Offered only for a session that has a `left` record, on this Mac, and main
   * re-reads that one session before it types anything. Every answer is a
   * sentence a person reads, including the three that mean nothing landed.
   */
  resumeInPlace(sessionId: string): Promise<void>;

  setActiveSession(sessionId: string): void;
  cycleSession(delta: 1 | -1): void;
  /**
   * Terminal region reports which session panes are mounted right now (the
   * active surface's leaves — several at once under splits, S4A). Purely a
   * layout fact since Phase 13: status no longer depends on what is visible.
   */
  visibleSessionIds: string[];
  setVisibleSessions(sessionIds: string[]): void;

  /**
   * Adopt a full session list from main (boot hydration, sessions:changed,
   * a post-verb refresh) and keep the ⌘J bookkeeping and the per-project
   * selection valid against it. Subscription entry point (Phase 42 stage 4:
   * ./subscriptions calls this so the handler and the actions share one
   * body); components have no reason to call it.
   */
  applySessions(sessions: Session[]): void;
  /**
   * Adopt main's per-session status flip (sessions:status). Same posture as
   * `applySessions`: a subscription entry point, not a component verb.
   */
  applySessionStatus(sessionId: string, status: SessionStatus): void;

  createSession(input: {
    name: string;
    /** Phase 10: any launchable registry agent, not just the frozen trio. */
    agent: LaunchableAgentKind;
    cwd?: string;
    /**
     * Launch-flag preset tokens (shared/settings.ts catalogs). Main threads
     * these into BOTH argv and resume_argv (buildLaunchSpec), so a resumed
     * session keeps the flags it launched with.
     */
    extraArgs?: string[];
    /**
     * Phase 15: run this session under SpecStory capture. It rides through to
     * CreateSessionInput.capture, where main wraps BOTH argv and resume_argv.
     *
     * It is a named field rather than a spread-in extra for a reason worth
     * keeping: object spreads bypass TypeScript's excess-property check, so a
     * `capture` the store did not declare was accepted at the call site and
     * dropped here in silence — the create sheet's switch did nothing at all.
     */
    capture?: boolean;
    /**
     * PHASE 48: skip the structural preflight in main and launch the argv it
     * refused. It is the `Start it anyway` button in the create sheet and
     * nothing else sets it.
     *
     * A named field for the same reason `capture` is one: an object spread
     * bypasses TypeScript's excess-property check, so a field the store did
     * not declare would be accepted at the call site and dropped in silence
     * here.
     */
    startAnyway?: boolean;
    /**
     * PHASE 70: create this session on another machine. Omitted means this
     * Mac, which is every create before this release.
     *
     * A named field for the same reason `capture` and `startAnyway` are named
     * ones: an object spread bypasses TypeScript's excess-property check, so a
     * field the store did not declare would be accepted at the call site and
     * dropped in silence here. Dropping this one would create the session on
     * this Mac while the sheet said it was creating it somewhere else.
     */
    machineId?: string;
    /**
     * PHASE 202: which vendor login this session runs under, by NAME, and
     * whether this create is the vendor's own sign in.
     *
     * `login` omitted means the login CHOSEN for that provider, which is what
     * every ordinary create sends. Add login is the one caller that names one,
     * because it has just created a directory nobody has chosen yet.
     *
     * Named fields for the reason `capture` and `startAnyway` are named ones:
     * an object spread bypasses TypeScript's excess property check, so a field
     * the store did not declare would be accepted at the call site and dropped
     * in silence here. Dropping these two would open a sign in under the wrong
     * credential directory, which is the one mistake this phase must not make.
     */
    login?: string;
    signIn?: boolean;
  }): Promise<boolean>;
  /** §6.2 one-click create. Widened with createSession (Phase 12): the
   *  no-sessions fleet launches ANY launchable registry agent, not the trio. */
  quickCreate(agent: LaunchableAgentKind): Promise<void>;
  renameSession(sessionId: string, name: string): Promise<void>;
  endSession(sessionId: string): void;
  /**
   * PHASE 119. `options.withoutCapture` starts the replacement with SpecStory
   * turned off, whatever the old row's capture setting says. Omitted is every
   * restart before this release, byte for byte.
   */
  restartSession(sessionId: string, options?: CaptureChoice): Promise<void>;
  removeSession(sessionId: string): Promise<void>;
  /** Whether the optional sessions:discard bridge method exists. */
  canDiscard(): boolean;
  // -- the verbs that answer instead of raising (Phase 293) --------------------
  //
  // THE RULE OF THE PRESS, held here as well as in the sheet. Each of these
  // takes a session ID and nothing else. It re-reads that row from this store
  // at the moment of the call and asks the verb's OWN field of
  // `sessionActionGates` over it, and when the row is gone or the gate is
  // false it reaches no bridge and answers `LIFECYCLE_SESSION_CHANGED`. A sheet
  // is the first surface where a row can sit on screen for minutes while
  // another window, a machine reconnecting or the session itself changes it,
  // and a stale Restart is the one press that ends in a hard delete.
  //
  // None of them raises a confirm. None of them raises an error toast. Each
  // answers `LIFECYCLE_BRIDGE_MISSING` when the bridge method it needs is not
  // there, read at CALL time, the way `machinesExtras` below reads its own.
  /**
   * End one live session and say whether it ended. Gate: `canEnd`. The kill is
   * awaited, so a refusal from main is this verb's answer rather than a toast
   * that arrives after the caller has moved on.
   */
  endSessionNow(sessionId: string): Promise<LifecycleResult>;
  /**
   * Remove one ended session to Past Sessions, then apply main's list and
   * refetch the removed list. Gate: `canRemove`. It is the only route in the
   * renderer's session manager to `sessions:discard`.
   */
  removeSessionNow(sessionId: string): Promise<LifecycleResult>;
  /**
   * Rename one session by id, which works whether or not its project has a
   * tab. Gate: `canRename`. An empty name sends nothing.
   */
  renameSessionNow(sessionId: string, name: string): Promise<LifecycleResult>;
  /**
   * Restart one ended session on this Mac. Gate: `offersRestart`, and
   * `offersBare` as well for the form without SpecStory. It is `runRestart`
   * without the bare confirm and without the error toast; the one sentence the
   * bare form says on success is kept, because it is the only place a person
   * learns the replacement saves no history.
   */
  restartSessionNow(
    sessionId: string,
    options?: CaptureChoice
  ): Promise<LifecycleResult>;
  /**
   * Restore one ended session and answer what happened. Gate: `canRestoreNow`,
   * and `offersBare` as well for the form without SpecStory. It sets the
   * restoring flag, restores, and applies main's list. IT NEVER LANDS: it calls
   * neither `setActiveSession` nor `setActiveProject`, because the sheet stays
   * open and the person chooses whether to go there.
   */
  restoreSessionNow(
    sessionId: string,
    options?: CaptureChoice
  ): Promise<RestoreOutcome>;
  /**
   * Read main's session list, APPLY it, and answer it. Null when it could not
   * be read, which is a throw or a build with no bridge. It never throws. The
   * batch End reads this before every single call, so it never ends a session
   * on the strength of a list it did not just read.
   */
  refreshSessions(): Promise<Session[] | null>;
  // -- restore (Phase 6) ------------------------------------------------------
  /** Session ids with a restore in flight (buttons show progress). */
  restoringIds: Record<string, boolean>;
  /** Whether the optional sessions:restore bridge method exists. */
  canRestore(): boolean;
  /**
   * PHASE 81. False until main says the login shell PATH is installed.
   *
   * The session list arrives before the shell answers now, so Restore is on
   * screen about one second before Tortie can honour it. Main awaits the same
   * promise, so a restore that slipped through would still be correct. This
   * flag exists so the button is honest rather than slow.
   *
   * An older preload has no such call. In that case this is true from the
   * start, which is exactly the behaviour that preload had.
   */
  shellPathReady: boolean;
  /**
   * Adopt main's answer. Subscription entry point (./subscriptions calls it),
   * never a component verb, and it only ever sets the flag to true.
   */
  applyShellPathReady(): void;
  /**
   * Restore one 'restorable' session: recreate it in tmux with its saved
   * scrollback replayed and the resume command ARMED (typed, not run).
   *
   * PHASE 119. `options.withoutCapture` brings the session back with SpecStory
   * turned off and writes that choice onto the row, so a later restore is bare
   * too. It asks first, because Tortie offers no way to turn saving back on.
   * Omitted is every restore before this release, byte for byte.
   */
  restoreSession(sessionId: string, options?: CaptureChoice): Promise<void>;
  /** Restore every restorable session in the active project (sequential). */
  restoreAllSessions(): Promise<void>;
  // -- past sessions (Phase 29) -----------------------------------------------
  //
  // PHASE 293. The Past Sessions panel was a modal of its own with an open
  // flag here. It is the second tab of the session manager now, so whether it
  // is on screen is `sessionSheet` in ./session-manager-slice and this slice
  // keeps the DATA: the rows, the loading flag and the two verbs over them.
  /**
   * Discarded rows from every project, exactly as main sorted them (newest
   * removal first). The panel never re-sorts.
   */
  pastSessions: Session[];
  /** True while a fetch is in flight, so the empty copy never flashes. */
  pastLoading: boolean;
  /**
   * Fetch the removed rows through the optional sessions:listRemoved bridge
   * method. A missing method means an empty list with no error, the same
   * posture every extras consumer takes.
   *
   * It never throws and it raises no toast. There is no push for this list, so
   * the sheet calls this on every change to the session list while it is open,
   * and a toast per failed read would be a toast per change. A read that failed
   * keeps the rows already held and, while the sheet is open, says so in the
   * sheet's own read-failure state.
   */
  refreshPastSessions(): Promise<void>;
  /**
   * Restore one discarded row through the existing Phase 26.3 verb (no new
   * channel), and answer what happened.
   *
   * PHASE 293 REWROTE IT IN PLACE. It used to ask through a native dialog,
   * close the panel and land on the restored session, and it answered nothing.
   * It now asks nothing, closes nothing, lands nowhere and raises no toast: the
   * sheet asks inline, stays open, and offers the way to the session. Gate:
   * `canRestorePastNow`, over the row re-read by id from `pastSessions`. A
   * failure re-fetches the list, as it always did, because main kept the row
   * 'discarded' and a failed restore is not a second loss.
   */
  restorePastSession(sessionId: string): Promise<RestoreOutcome>;
  // -- saved output (Phase 72) -----------------------------------------------
  /**
   * The session whose saved output panel is open, or null when it is closed.
   *
   * The panel is opened from one session menu item and from nowhere else. It
   * exists because a remote restore does NOT put the saved output back into
   * the recreated session on the other machine, so this is where that output
   * is, and because the capture time is the fact that stops a person reading
   * an hours old screen as live.
   */
  savedOutputSessionId: string | null;
  /** What main answered for that session, or null while there is no answer. */
  savedOutput: SavedSessionOutput | null;
  /** True while the one read is in flight, so the empty copy never flashes. */
  savedOutputLoading: boolean;
  /**
   * Open the saved output panel for one session. It reads through the optional
   * `scrollback.saved` bridge method; a preload without it opens the panel in
   * its empty state with no error, the same posture every extras consumer
   * takes.
   */
  openSavedOutput(sessionId: string): void;
  /** Close it and drop the text, so a body is not held after it is read. */
  closeSavedOutput(): void;
  // -- the last lines of a session on another machine (Phase 100) -------------
  /**
   * The session whose last lines panel is open, or null when it is closed.
   *
   * A session on another machine has no scrollbar in this window, because its
   * history is on that machine and not in the session server on this Mac.
   * Research 57 section 3.1 refused a real remote scrollbar. This panel is what
   * a person gets instead, being one read at one instant, and it is opened from
   * the button in both bands above the terminal and from one session menu item.
   */
  remoteLinesSessionId: string | null;
  /** What main answered for the last read, or null while there is no answer. */
  remoteLines: MachineSessionLinesResult | null;
  /** True while the one read is in flight, so the empty copy never flashes. */
  remoteLinesLoading: boolean;
  /**
   * True when the last read was REJECTED rather than answered.
   *
   * It is its own field because a rejected call and a preload with no bridge
   * method are two different facts and the panel says a different sentence for
   * each. The first build of this phase left both of them holding a null
   * result, so a build that has the bridge and whose call failed was told that
   * it cannot read a session on another machine at all.
   */
  remoteLinesFailed: boolean;
  /** The depth the panel last asked for, so the buttons can show which is on. */
  remoteLinesDepth: number;
  /**
   * Raised on every read, and it is the guard the saved output block does not
   * need. Two reads of the SAME session can be in flight at once, because a
   * person can press a deeper button while a shallower read is still running.
   * Without this number a 25,000 line read started first and finishing last
   * would land in a panel that now says it is showing the screen alone, and the
   * counts sentence would then describe a different body from the one on
   * screen.
   */
  remoteLinesRequest: number;
  /** Open the panel for one session and read at the default depth. */
  openRemoteLines(sessionId: string): void;
  /** Read the same session again at a depth. */
  readRemoteLines(lines: number): void;
  /** Close it and drop the text, which can be several megabytes. */
  closeRemoteLines(): void;
  /**
   * User input (keystrokes/mouse reports) went to a terminal: whatever it was
   * blocked on has an answer now. Pass the session id from the pty write
   * path; omitted → the active session (keydown fallback).
   */
  noteTerminalInput(sessionId?: string): void;

  // -- derived helpers ------------------------------------------------------
  projectSessions(projectId?: string | null): Session[];
  activeSession(): Session | null;
  effectiveStatus(session: Session): SessionStatus;
  attentionSessions(): Session[];
  /**
   * PHASE 90.3 gave this the machine as well. A count keyed on a bare path is
   * the count of two tabs added together the moment two machines hold the same
   * path. An omitted machine reads as this Mac, so every existing caller keeps
   * the answer it had.
   */
  attentionCountFor(projectPath: string, machineId?: string): number;
}

/** Next free `<base>-<n>` ordinal within a session list (S6 name prefill). */
export function nextOrdinal(sessions: Session[], base: string): number {
  let max = 0;
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  for (const s of sessions) {
    const m = re.exec(s.name);
    if (m && m[1] !== undefined) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/**
 * WHEN a session started needing input — ⌘J sorts by it and shows it as a
 * "waiting 4m" age. Main owns the verdict; the renderer only has to notice
 * the moment it arrived and forget it when the session moves on. Applied on
 * both status paths so the full-list refresh and the cheap per-session
 * event can never disagree.
 */
function withAttention(
  prev: Record<string, number>,
  sessions: readonly Session[]
): Record<string, number> {
  const next: Record<string, number> = {};
  const now = Date.now();
  let changed = false;
  for (const sess of sessions) {
    const was = prev[sess.id];
    if (sess.status !== 'needs_input') {
      if (was !== undefined) changed = true;
      continue;
    }
    next[sess.id] = was ?? now;
    if (was === undefined) changed = true;
  }
  if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
  return changed ? next : prev;
}

/**
 * PHASE 48. Stamp the moment a session this window was watching stopped.
 *
 * Same shape as {@link withAttention} and applied on both status paths for the
 * same reason: the full-list refresh and the cheap per-session event must not
 * be able to disagree. A stamp is written once and never moved, and a session
 * that leaves the list takes its stamp with it.
 *
 * A session that is ALREADY 'exited' in `before` gets no stamp, because this
 * window did not watch it stop. That is the case for every row that was over
 * when the window opened.
 */
function withEndedAt(
  prev: Record<string, number>,
  before: readonly Session[],
  after: readonly Session[]
): Record<string, number> {
  const aliveBefore = new Set<string>();
  for (const sess of before) {
    if (sess.status !== 'exited' && sess.status !== 'discarded') {
      aliveBefore.add(sess.id);
    }
  }
  const next: Record<string, number> = {};
  const now = Date.now();
  let changed = false;
  for (const sess of after) {
    const was = prev[sess.id];
    if (was !== undefined) {
      next[sess.id] = was;
      continue;
    }
    if (sess.status === 'exited' && aliveBefore.has(sess.id)) {
      next[sess.id] = now;
      changed = true;
    }
  }
  if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
  return changed ? next : prev;
}

/**
 * PHASE 90.3. Folders on machines that hold a session and have no tab yet.
 *
 * Main opens the tab. This is the window learning that it did. The project list
 * is a pull, so without this a session on a machine would sit in the list with
 * no tab to appear in until something else happened to re-read the projects.
 *
 * The set of folders it has already acted on is remembered, so a steady state
 * costs one comparison per session per broadcast and no calls at all. It is
 * module scope rather than store state because nothing renders from it.
 */
const tabsAskedFor = new Set<string>();

/** Re-read the project list once for each folder on a machine that has none. */
async function reconcileRemoteTabs(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void
): Promise<void> {
  const api = window.gmux?.projects;
  if (api === undefined) return;
  const state = get();
  const known = new Set(
    state.projects.map((p) => targetKey(targetOfProject(p) ?? localTarget(p.path)))
  );
  const wanted: string[] = [];
  for (const session of state.sessions) {
    const target = targetOfSession(session);
    if (target === null || isLocalTarget(target)) continue;
    const key = targetKey(target);
    if (known.has(key) || tabsAskedFor.has(key)) continue;
    tabsAskedFor.add(key);
    wanted.push(key);
  }
  if (wanted.length === 0) return;
  try {
    set({ projects: await api.list() });
  } catch {
    // A read that failed changes nothing on screen and is retried the next
    // time a folder with no tab appears. The keys stay remembered on purpose:
    // retrying on every broadcast would be a call per poll for a list that is
    // not coming back any sooner.
  }
}

export const createSessionsSlice: StateCreator<
  AppState,
  [],
  [],
  SessionsSlice
> = (set, get) => {
  const gmux = gmuxBridge();

  // PHASE 211, FIX ROUND. A login switch made from any surface ends with the
  // sentence and the `Restart now` in ./login-switch, which needs this store's
  // sessions, toast and restart. Installed here rather than imported from the
  // logins store, which cannot import this one back.
  setLoginSwitchedListener((provider, chosen) => offerRestartNow(get(), provider, chosen));

  // PHASE 287. And the other sentence a switch can end with, when the agent's
  // own keychain entry cannot take the sign in. It is installed beside the
  // switched one and the store posts exactly one of the two.
  setLoginTooLargeListener((provider, chosen, outcome) =>
    sayLoginTooLarge(get(), provider, chosen, outcome)
  );

  const activityExtras = gmux ?? null;

  const sessionExtras = gmux ? gmux.sessions : null;

  // Phase 72: the saved output read. It is on the top-level scrollback surface
  // rather than on `sessions`, because it is the fourth pull of the same kind
  // as the three the Settings card already makes.
  const scrollbackExtras = gmux ? (gmux.scrollback ?? null) : null;

  // PHASE 100. The one read this slice makes of another machine. It is read at
  // call time rather than captured here, because the panel can be opened long
  // after the store was built and a captured null would outlive the reason for
  // it.
  const machinesExtras = (): InstalledGmuxApi['machines'] | null => {
    const api = gmuxBridge();
    if (api === undefined) return null;
    return api.machines ?? null;
  };

  // -------------------------------------------------------------------------
  // PHASE 141. The one press back into an agent that left.
  //
  // WHY THE CALL IS FEATURE DETECTED AT CALL TIME. `sessions:resumeInPlace` is
  // the phase's only new invoke channel, and a build whose preload predates it
  // simply never offers the verb: the row draws nothing, the menu row is
  // absent, and the menu bar item returns in silence. That is the same posture
  // `canRestore` and `canDiscard` above already take, and it is why no surface
  // in this phase asks main a question it might not be able to answer.
  //
  // WHAT MAIN DOES WITH IT, so nothing here re-decides it. Main re-reads that
  // ONE session at the moment of the press and refuses when the pane's own
  // process no longer holds the terminal, when something is running under it,
  // or when the witnessed process somehow came back. It then types the command
  // through the Phase 89 arming door, which never presses Enter, and reads the
  // screen back. The renderer's whole job is to say which of the four things
  // happened.
  // -------------------------------------------------------------------------
  // EXACTLY ONE OF THE TWO IS SET. A landing means main typed and then read
  // the screen. A refusal means main re-read that one session at the moment of
  // the press, found it was not in the state the last poll described, and typed
  // nothing at all. Both are sentences a person reads rather than errors, which
  // is why the channel resolves in both cases.
  interface ResumeInPlaceAnswer {
    landing: ResumeInPlaceLanding | null;
    refusal?: ResumeInPlaceRefusal | null;
  }
  type ResumeInPlaceCall = (sessionId: string) => Promise<ResumeInPlaceAnswer>;

  const resumeInPlaceCall = (): ResumeInPlaceCall | null => {
    const api = gmuxBridge()?.sessions as
      | { resumeInPlace?: unknown }
      | undefined;
    const fn = api?.resumeInPlace;
    return typeof fn === 'function' ? (fn as ResumeInPlaceCall) : null;
  };

  /**
   * One press at a time per session.
   *
   * This is not a spinner, it is a safety guard. The one landing that means
   * something went wrong on screen is `twice`, being two copies of the command
   * on one line, and the cheapest way to produce it is two presses of a word
   * that is one pointer move from the status dot. A second press while the
   * first is in the air does nothing at all.
   */
  const armingInFlight = new Set<string>();

  // -------------------------------------------------------------------------
  // PHASE 293. The cores the shipped verbs and the `*Now` verbs share.
  //
  // Each verb has two forms now, one that raises a confirm and a toast and one
  // that answers. Two copies of the bridge call would be two places for the
  // Phase 19 ordering rule or the Phase 119 option to drift, so each call is
  // written once below and both forms read it. A core raises NOTHING. It
  // answers, and its caller decides what a person sees.
  //
  // THE BRIDGE IS READ AT CALL TIME in every core, not captured when the store
  // was built. A `*Now` verb has to be able to say this build cannot change
  // sessions, and a captured null would say it for ever.
  // -------------------------------------------------------------------------

  /** The installed sessions bridge right now, or null when there is none. */
  const sessionsBridge = (): InstalledSessionsApi | null =>
    gmuxBridge()?.sessions ?? null;

  /**
   * Whether the restored or restarted session belongs to the project a person
   * is looking at, and the landing when it does.
   *
   * PHASE 293, A CORRECTION FOR EVERY CALLER. `runRestore` and `runRestart`
   * called `setActiveSession` with no condition, and that verb writes the
   * ACTIVE project's slot whatever project the session belongs to. No surface
   * could restore a session outside the active project, so nothing met it. The
   * session manager is the first that can, and without this guard restoring a
   * session of project B from the sheet would have moved project A's selection
   * to an id that is not in project A. The pair is compared, being the machine
   * and the folder, so the same path on another machine is not this project.
   */
  const landWhenActive = (landed: Session): void => {
    const active = get().activeProject();
    if (active === null) return;
    if (!sameTarget(targetOfSession(landed), targetOfProject(active))) return;
    get().setActiveSession(landed.id);
  };

  /** The gates for one row of this store, read at this instant. */
  const gatesNow = (session: Session): SessionActionGates =>
    sessionActionGates(session, get().effectiveStatus(session), {
      canRestore: get().canRestore(),
      canDiscard: get().canDiscard(),
      shellPathReady: get().shellPathReady,
      handback: get().handbacks[session.id]
    });

  /**
   * THE RULE OF THE PRESS, for a `*Now` verb. Re-read the row BY ID from the
   * list that holds it, and ask `allows` of its gates. Null means the row is
   * gone or the verb is no longer offered, and the caller reaches no bridge.
   *
   * It takes an id because the closure that called it may be seconds old: a
   * native menu runs the item that was built when the menu was drawn, and a
   * confirmation can stand on screen while another window changes the row.
   */
  const freshSession = (
    sessionId: string,
    from: 'sessions' | 'pastSessions',
    allows: (gates: SessionActionGates) => boolean
  ): Session | null => {
    if (sessionId.length === 0) return null;
    const session = get()[from].find((x) => x.id === sessionId);
    if (session === undefined) return null;
    return allows(gatesNow(session)) ? session : null;
  };

  /** Read main's list and apply it. False when it could not be read. */
  const applyFreshList = async (): Promise<boolean> => {
    try {
      const api = sessionsBridge();
      if (api === null || typeof api.list !== 'function') return false;
      get().applySessions(await api.list());
      return true;
    } catch {
      // The verb before this read already happened. `sessions:changed` brings
      // the same list a moment later, so a failed read here loses nothing.
      return false;
    }
  };

  /** End one session by id. */
  const killCore = async (sessionId: string): Promise<LifecycleResult> => {
    const api = sessionsBridge();
    if (api === null || typeof api.kill !== 'function') {
      return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
    }
    try {
      await api.kill(sessionId);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: errorText(err) };
    }
  };

  /** Remove one session by id, then apply main's list. */
  const discardCore = async (sessionId: string): Promise<LifecycleResult> => {
    const api = sessionsBridge();
    if (api === null || typeof api.discard !== 'function') {
      return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
    }
    try {
      await api.discard(sessionId);
      get().applySessions(await api.list());
      return { ok: true };
    } catch (err) {
      return { ok: false, message: errorText(err) };
    }
  };

  /** Rename one session by id. The caller has already trimmed the name. */
  const renameCore = async (
    sessionId: string,
    name: string
  ): Promise<LifecycleResult> => {
    const api = sessionsBridge();
    if (api === null || typeof api.rename !== 'function') {
      return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
    }
    try {
      await api.rename({ sessionId, name });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: errorText(err) };
    }
  };

  /**
   * PHASE 119. The one restore runner, shared by the ordinary restore, the
   * declined one and, since Phase 293, the two verbs the sheet calls, so the
   * in-flight guard and the error handling exist once. `withoutCapture` changes
   * exactly two things: the option it sends to main, and which sentence the
   * note carries.
   *
   * It lands nowhere and says nothing. `after` runs while the restoring flag is
   * still up, so a caller that re-reads the list does it before the row's
   * button can read Restore again.
   */
  const restoreCore = async (
    before: Session,
    withoutCapture: boolean,
    after?: () => Promise<void>
  ): Promise<RestoreOutcome> => {
    const sessionId = before.id;
    const api = sessionsBridge();
    if (api === null || typeof api.restore !== 'function') {
      return { kind: 'failed', message: LIFECYCLE_BRIDGE_MISSING };
    }
    if (get().restoringIds[sessionId] === true) return { kind: 'busy' };
    set((s) => ({
      restoringIds: { ...s.restoringIds, [sessionId]: true }
    }));
    try {
      const restored = await api.restore(
        sessionId,
        withoutCapture ? { withoutCapture: true } : undefined
      );
      if (after !== undefined) await after();
      return {
        kind: 'restored',
        session: restored,
        note: restoreLandedNote(before, restored, withoutCapture)
      };
    } catch (err) {
      return { kind: 'failed', message: errorText(err) };
    } finally {
      set((s) => {
        const restoringIds = { ...s.restoringIds };
        delete restoringIds[sessionId];
        return { restoringIds };
      });
    }
  };

  /**
   * The shipped restore: the core, then the landing and the toast. The
   * sentences are `restoreLandedNote`'s, which is where Phase 293 moved them,
   * verbatim, so the sheet's one toast and this one cannot say two things.
   */
  const runRestore = async (
    session: Session,
    withoutCapture: boolean
  ): Promise<void> => {
    const outcome = await restoreCore(session, withoutCapture);
    if (outcome.kind === 'busy') return;
    if (outcome.kind === 'failed') {
      get().toast('error', outcome.message, { sticky: true });
      return;
    }
    landWhenActive(outcome.session);
    const { note } = outcome;
    get().toast(note.kind, note.text, note.sticky ? { sticky: true } : undefined);
  };

  /**
   * PHASE 119. The one restart runner, for the same reason. The four-step
   * order below is Phase 19 item 8 and nothing about it moved: nothing is
   * discarded until the replacement exists.
   *
   * PHASE 293. It ANSWERS a failure rather than toasting it, so the shipped
   * verb and the sheet's verb are one runner, and it lands only in the active
   * project (`landWhenActive`). The success sentence of the bare form stays
   * here, because it is the only place a person is told the replacement saves
   * no history and both callers owe it.
   */
  const runRestart = async (
    session: Session,
    options: CaptureChoice | undefined
  ): Promise<LifecycleResult> => {
    const api = sessionsBridge();
    if (api === null) return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
    const withoutCapture = options?.withoutCapture === true;
    try {
      if (typeof api.restart === 'function') {
        // PHASE 211, FIX ROUND. The whole option rides through, so a
        // `Restart now` beside a switch reaches main with `underChosenLogin`
        // and the replacement comes back under the chosen login.
        const created = await api.restart(
          session.id,
          options !== undefined && (withoutCapture || options.underChosenLogin === true)
            ? options
            : undefined
        );
        landWhenActive(created);
        if (withoutCapture) {
          get().toast(
            'success',
            `'${session.name}' started fresh and does not save its history.`
          );
        }
        return { ok: true };
      }
      // PHASE 90.3. The fallback below sends no machine, so it would start a
      // process on THIS Mac in a folder path that names a folder over there.
      // A session on a machine is restarted by main, through the extra above,
      // or not at all.
      if (session.machine !== undefined) {
        return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
      }
      const created = await api.create({
        name: session.name,
        projectPath: session.projectPath,
        cwd: session.cwd,
        agent: session.agent,
        // The capture choice is the one setting the projection does carry.
        // PHASE 119: a declined restart drops it, which is the whole verb on
        // this path. An older preload cannot carry the option to main, and it
        // does not need to, because this branch composes the create itself.
        ...(!withoutCapture && session.capture !== undefined
          ? { capture: true }
          : {})
      });
      // Only now. A discard before this line is the defect.
      if (typeof api.discard === 'function') {
        await api.discard(session.id);
      }
      landWhenActive(created);
      if (withoutCapture) {
        get().toast(
          'success',
          `'${session.name}' started fresh and does not save its history.`
        );
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, message: errorText(err) };
    }
  };

  /**
   * The shipped restart: the runner, and its failure as a sticky toast. A build
   * that cannot restart at all stays SILENT here, as it always has. That is the
   * posture every extras consumer takes, and only a caller that asked for an
   * answer is given one.
   */
  const runRestartLoud = async (
    session: Session,
    options: CaptureChoice | undefined
  ): Promise<void> => {
    const result = await runRestart(session, options);
    if (result.ok || result.message === LIFECYCLE_BRIDGE_MISSING) return;
    get().toast('error', result.message, { sticky: true });
  };

  /**
   * One read of the removed list at a time wins. A person can remove a session
   * while the debounced refetch for the last change is still in the air, and
   * the older answer must not land over the newer one.
   */
  let pastRequestSeq = 0;

  return {
    sessions: [],
    activeSessionByProject: {},

    attentionSince: {},
    excerpts: {},
    questions: {},
    lastActivity: {},
    endedSeenAt: {},
    handbacks: {},
    choices: {},

    setActiveSession(sessionId) {
      const { activeProjectId } = get();
      if (activeProjectId === null) return;
      set((s) => ({
        activeSessionByProject: {
          ...s.activeSessionByProject,
          [activeProjectId]: sessionId
        }
      }));
    },

    cycleSession(delta) {
      const sessions = get().projectSessions();
      if (sessions.length < 2) return;
      const active = get().activeSession();
      const cur = sessions.findIndex((x) => x.id === active?.id);
      const next = sessions[(cur + delta + sessions.length) % sessions.length];
      if (next) get().setActiveSession(next.id);
    },

    visibleSessionIds: [],

    setVisibleSessions(sessionIds) {
      const prev = get().visibleSessionIds;
      const same =
        prev.length === sessionIds.length &&
        prev.every((id, i) => id === sessionIds[i]);
      if (!same) set({ visibleSessionIds: sessionIds });
    },

    applySessions(sessions) {
      set((s) => ({
        sessions,
        attentionSince: withAttention(s.attentionSince, sessions),
        endedSeenAt: withEndedAt(s.endedSeenAt, s.sessions, sessions)
      }));
      // PHASE 203. THE ROUTE A FINISHED SIGN IN ACTUALLY TAKES. A sign in
      // session runs one command that exits cleanly, `remain-on-exit failed`
      // closes the pane and the session together, and the activity monitor
      // only reaps sessions that still have a pane, so reconcile is what
      // settles it and it lands on `restorable`. Both routes are watched, and
      // this is the one that fires.
      settleSignIns(sessions, (kind, text) => get().toast(kind, text));
      // PHASE 90.3. A session on a machine whose folder has no tab yet.
      //
      // Main opens that tab, in `remote-rehome.ts`, when a machine's list comes
      // back. The project list is a PULL, so the window would not learn about
      // the new tab until something else re-read it, and the session would be
      // in the list with nowhere to appear. One re-read closes that, and the
      // guard below means it happens once per new folder rather than once per
      // poll.
      void reconcileRemoteTabs(get, set);
      // Keep per-project selection valid.
      const s = get();
      const { activeProjectId, activeSessionByProject } = s;
      if (activeProjectId !== null) {
        const proj = s.projects.find((p) => p.id === activeProjectId);
        if (proj) {
          const target = targetOfProject(proj);
          const inProject = sessions.filter((x) =>
            sameTarget(targetOfSession(x), target)
          );
          const selected = activeSessionByProject[activeProjectId];
          if (
            selected === undefined ||
            !inProject.some((x) => x.id === selected)
          ) {
            const fallback = inProject[inProject.length - 1];
            if (fallback) {
              set((st) => ({
                activeSessionByProject: {
                  ...st.activeSessionByProject,
                  [activeProjectId]: fallback.id
                }
              }));
            }
          }
        }
      }
    },

    applySessionStatus(sessionId, status) {
      set((s) => {
        const sessions = s.sessions.map((x) =>
          x.id === sessionId ? { ...x, status } : x
        );
        return {
          sessions,
          attentionSince: withAttention(s.attentionSince, sessions),
          endedSeenAt: withEndedAt(s.endedSeenAt, s.sessions, sessions)
        };
      });
      // The second route, for a sign in whose session is reported ended
      // directly rather than through a whole list.
      settleSignIns(get().sessions, (kind, text) => get().toast(kind, text));
    },

    async createSession({
      name,
      agent,
      cwd,
      extraArgs,
      capture,
      startAnyway,
      machineId,
      login,
      signIn
    }) {
      const project = get().activeProject();
      if (!gmux || !project) return false;
      // PHASE 94. A tab whose files are on a machine already knows which
      // machine a new session belongs on. Every create surface reaches this one
      // function, being the ⌘T sheet, the agent board, the per-agent hotkeys,
      // the terminal menu's new session verb and the empty state, so the rule is
      // written here once. A guard written into one surface covers that surface
      // and misses the next one added, which is the failure mode Phase 84 found
      // in Restart.
      const tabMachineId = project.machineId ?? 'local';
      // The sheet names a machine, and in a remote tab its Machine field is
      // locked to the tab's machine, so this rule only ever changes a create
      // that named none. A caller asking for this Mac from a tab whose files are
      // on a machine is asking for a session in a folder this Mac does not have,
      // and no surface in this build means to ask for that.
      const effectiveMachineId =
        machineId !== undefined && machineId !== 'local'
          ? machineId
          : tabMachineId !== 'local'
            ? tabMachineId
            : undefined;
      if (
        effectiveMachineId !== undefined &&
        effectiveMachineId !== machineId
      ) {
        // The tab's machine is about to be used because the caller named none,
        // so it is checked first. The answer is read from the same place the ⌘T
        // sheet reads it, being main's own rows with `usable` true. The store's
        // machineStates copy would be a second answer, and it is empty until the
        // first read completes. Measured on a cold boot, the link read `quiet`
        // at 1 ms and `connected` at 504 ms, so a hotkey pressed inside that
        // window would be refused against a machine that is fine. This call
        // reads memory in main and starts nothing. `machines` is a required
        // member of the installed bridge, so there is no missing-member case to
        // write here.
        let usable = false;
        try {
          const result = await gmux.machines.rows();
          usable = result.rows.some(
            (row) => row.id === effectiveMachineId && row.usable
          );
        } catch {
          // A read that failed. It cannot say the machine is usable, so the
          // create is refused. That is the sheet's behaviour too, where a
          // failed read sets the list to empty and the Create button goes off.
          usable = false;
        }
        if (!usable) {
          const label = machineLabelFor(get().machineStates, effectiveMachineId);
          get().toast(
            'error',
            `Tortie is not connected to ${label}, so it started nothing. ` +
              'The files in this tab are on that machine, so a session on this ' +
              'Mac would run in a folder this Mac does not have. Open Settings ' +
              'and then Machines to prepare it, then try again.',
            { sticky: true }
          );
          return false;
        }
      }
      // Silent display-name dedupe within the project (S6).
      const existing = new Set(
        get()
          .projectSessions()
          .map((x) => x.name)
      );
      let finalName = name;
      for (let n = 2; existing.has(finalName); n++) {
        finalName = `${name}-${n}`;
      }
      const session = await gmux.sessions.create({
        name: finalName,
        projectPath: project.path,
        // PHASE 90.3. Which machine `projectPath` is a path on. Main cannot tell
        // the two remote creates apart without it: a create from a tab that is
        // itself on the machine sends a far path, and a create from a tab on
        // this Mac sends a path that means nothing over there.
        ...(project.machineId !== undefined && project.machineId !== 'local'
          ? { projectMachineId: project.machineId }
          : {}),
        // INTEGRATOR (Phase 10): CreateSessionInput.agent is still the frozen
        // AgentKind trio; shared/types.ts's registry-stream note widens it to
        // LaunchableAgentKind at reconciliation (main's buildLaunchSpec
        // already switches on every launchable id). Until then the wire cast
        // lives HERE, in exactly one place.
        agent: agent as AgentKind,
        ...(cwd !== undefined && cwd !== project.path ? { cwd } : {}),
        ...(extraArgs !== undefined && extraArgs.length > 0
          ? { extraArgs }
          : {}),
        // Only ever sent when it is ON: absent is the uncaptured session every
        // pre-Phase-15 build created, and main reads exactly `=== true`.
        ...(capture === true ? { capture: true } : {}),
        // Phase 48. Same rule: absent is every create that has not been
        // refused by the preflight, and main reads exactly `=== true`.
        ...(startAnyway === true ? { startAnyway: true } : {}),
        // Phase 70. Same rule again: absent is this Mac. Main refuses the id
        // unless that machine is confirmed and its version is one Tortie has
        // measured, so this field can ask for a machine and can never grant
        // one.
        //
        // PHASE 94. The value is the effective machine decided above, which is
        // the caller's when it named one and the tab's machine when it did not.
        ...(effectiveMachineId !== undefined
          ? { machineId: effectiveMachineId }
          : {}),
        // Phase 202. Same rule again: absent is the chosen login, which is
        // every ordinary create, and main reads exactly `=== true` for the
        // sign in. The value here is a NAME and never a directory, so nothing
        // a renderer sends can decide where Tortie reads a credential.
        ...(login !== undefined && login.length > 0 ? { login } : {}),
        ...(signIn === true ? { signIn: true } : {})
      });
      // PHASE 90.3. A session started on a machine FROM A TAB ON THIS MAC has
      // its own tab over there, because main opened one for the folder the
      // person named. Without this the session would be created, be correct,
      // and be invisible: it belongs to a tab this window has not read yet.
      //
      // It runs only for that one case. A create in a tab that is already on
      // that machine lands in the tab it was started from, and a create on this
      // Mac never touches this branch at all.
      //
      // PHASE 94. It reads the effective machine, which in this branch is the
      // caller's own value: the branch only runs when the tab is on this Mac,
      // and the tab machine rule above changes nothing in that case.
      if (
        effectiveMachineId !== undefined &&
        (project.machineId ?? 'local') === 'local'
      ) {
        try {
          const list = await gmux.projects.list();
          set({ projects: list });
          const target = targetOfSession(session);
          const opened = list.find((p) => sameTarget(targetOfProject(p), target));
          if (opened !== undefined) {
            get().setActiveProject(opened.id);
            get().toast(
              'info',
              remoteTabOpened(
                session.projectPath,
                session.machine?.label ?? effectiveMachineId
              )
            );
          }
        } catch {
          // The session is running over there either way. The list is re-read
          // by `reconcileRemoteTabs` on the next broadcast, so the tab still
          // appears; what is lost is landing on it and the one sentence.
        }
      }
      // PHASE 203. WATCH THE SIGN IN, so that the moment it ends a sentence
      // says whether a credential now exists and the login list behind it is
      // re read. It watches nothing else: an ordinary create registers no
      // watch at all.
      const signInProvider = signIn === true ? loginProviderForAgent(agent) : null;
      if (signInProvider !== null && login !== undefined && login.length > 0) {
        watchSignIn(session.id, signInProvider, login);
      }
      get().setActiveSession(session.id);
      return true;
    },

    async quickCreate(agent) {
      try {
        const base = agent === 'shell' ? 'shell' : agent;
        const n = nextOrdinal(get().projectSessions(), base);
        // §6.2 quick-create bypasses the ⌘T modal, so Settings → Launch
        // defaults apply here directly (S13; the modal instead PRE-CHECKS
        // them and sends its own final selection). Cycle-safe import: the
        // presets module never imports this store.
        //
        // No confirmation is asked for here, and that is deliberate: a flag
        // that turns a safeguard off can only be in this list because the
        // user switched it on in the Settings window, which is enforced
        // where the settings are read rather than here (Phase 18.5 — the
        // danger seal in src/main/settings/store.ts). Enforcing it at the
        // launch path would have covered this function and missed the two
        // other modal-less paths: the per-agent hotkey in
        // settings/integration.ts and the ⌘T sheet's pre-checks. Main strips
        // an unsealed danger flag before any renderer sees it, so all three
        // are covered by one check and a fourth cannot be added by mistake.
        const defaults = defaultLaunchArgsFor(agent);
        // SpecStory capture follows the same rule as those flags (Phase 15,
        // research 13 §3.1): the sheet PRE-CHECKS the sticky per-agent answer
        // and sends its own, a no-modal create inherits it silently. Without
        // this line the ˅ board and the per-agent hotkeys would quietly
        // create UNcaptured sessions for an agent the user had switched on.
        // An inheritance the CLI can no longer honour is declined by main
        // with the reason said once, not swallowed.
        const capture = captureDefaultForAgent(agent);
        await get().createSession({
          name: `${base}-${n}`,
          agent,
          ...(defaults.length > 0 ? { extraArgs: defaults } : {}),
          ...(capture ? { capture: true } : {})
        });
      } catch (err) {
        get().toast('error', errorText(err), { sticky: true });
      }
    },

    async renameSession(sessionId, name) {
      if (!gmux) return;
      const trimmed = name.trim();
      if (trimmed.length === 0) return;
      const result = await renameCore(sessionId, trimmed);
      if (!result.ok) get().toast('error', result.message, { sticky: true });
    },

    endSession(sessionId) {
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || !gmux) return;
      // PHASE 293. The words moved to `endSessionConfirm` in ./resume, byte for
      // byte, with the three phases of reasons that were written here. The
      // sheet draws the same title and body under a row, and one author for
      // them is what stops the two surfaces saying two things.
      const ask = endSessionConfirm(session);
      get().setConfirm({
        title: ask.title,
        body: ask.body,
        confirmLabel: ask.confirmLabel,
        destructive: true,
        onConfirm: () => {
          void killCore(sessionId).then((result) => {
            if (!result.ok) get().toast('error', result.message, { sticky: true });
          });
        }
      });
    },

    /**
     * Phase 19 item 8. NOTHING IS DISCARDED UNTIL THE REPLACEMENT EXISTS.
     *
     * This used to call `discard(sessionId)` first and create second, with a
     * comment saying it was so the replacement could take back its display
     * name. Discard deletes the manifest row, the scrollback snapshot and the
     * hook settings file, so a create that then failed — the agent binary gone
     * after an upgrade, the project folder unmounted, a full disk — left the
     * user with nothing, from a button that has no undo. The name collision it
     * was avoiding lasts for the length of one create and is invisible: both
     * rows carry the same display name for that moment, and the sanitized tmux
     * name, which no part of the UI shows, is the only thing that differs.
     *
     * The whole operation is one main-side call when the bridge offers it,
     * because main is the only side that can read the original launch flags
     * (they live in the manifest row's argv, not in the Session projection)
     * and because a renderer cannot hold an ordering invariant across a
     * window reload. The fallback below keeps the ordering right against an
     * older preload but cannot carry the flags.
     */
    async restartSession(sessionId, options) {
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || !gmux) return;
      // PHASE 119. The declined restart asks first, for the same reason the
      // declined restore does. The replacement is bare from birth and there is
      // no way to turn saving back on for it.
      if (options?.withoutCapture === true) {
        const ask = bareRestartConfirm(session);
        get().setConfirm({
          title: ask.title,
          body: ask.body,
          confirmLabel: ask.confirmLabel,
          onConfirm: () => {
            void runRestartLoud(session, options);
          }
        });
        return;
      }
      await runRestartLoud(session, options);
    },

    async removeSession(sessionId) {
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || typeof sessionExtras?.discard !== 'function') return;
      // PHASE 293. The words moved to `removeSessionConfirm` in ./resume,
      // unchanged, for the reason `endSession` above gives.
      const ask = removeSessionConfirm(session);
      get().setConfirm({
        title: ask.title,
        body: ask.body,
        confirmLabel: ask.confirmLabel,
        destructive: true,
        onConfirm: () => {
          void discardCore(sessionId).then((result) => {
            if (!result.ok) get().toast('error', result.message, { sticky: true });
          });
        }
      });
    },

    // -- the verbs that answer instead of raising (Phase 293) ------------------

    async endSessionNow(sessionId) {
      if (typeof sessionsBridge()?.kill !== 'function') {
        return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
      }
      if (freshSession(sessionId, 'sessions', (g) => g.canEnd) === null) {
        return { ok: false, message: LIFECYCLE_SESSION_CHANGED };
      }
      return killCore(sessionId);
    },

    async removeSessionNow(sessionId) {
      if (typeof sessionsBridge()?.discard !== 'function') {
        return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
      }
      // THE GATE THAT MATTERS MOST HERE. `sessions:discard` tombstones a row
      // and kills nothing, so a Remove over a row that turned live leaves a
      // process running with no row pointing at it. Main refuses that for a
      // row on this Mac since this phase; this is the lock in front of it.
      if (freshSession(sessionId, 'sessions', (g) => g.canRemove) === null) {
        return { ok: false, message: LIFECYCLE_SESSION_CHANGED };
      }
      const result = await discardCore(sessionId);
      // The row has just joined the removed list, and there is no push for
      // that list, so it is refetched at once rather than on the next change.
      if (result.ok) await get().refreshPastSessions();
      return result;
    },

    async renameSessionNow(sessionId, name) {
      if (typeof sessionsBridge()?.rename !== 'function') {
        return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
      }
      if (freshSession(sessionId, 'sessions', (g) => g.canRename) === null) {
        return { ok: false, message: LIFECYCLE_SESSION_CHANGED };
      }
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        // Main's own words for the same refusal (`renameSessionAdmitted`), said
        // without the round trip. The shipped verb returns in silence here; a
        // verb that answers has to answer something.
        return { ok: false, message: 'Session name cannot be empty.' };
      }
      return renameCore(sessionId, trimmed);
    },

    async restartSessionNow(sessionId, options) {
      if (sessionsBridge() === null) {
        return { ok: false, message: LIFECYCLE_BRIDGE_MISSING };
      }
      // THE ONE VERB HERE THAT ENDS IN A HARD DELETE. Main kills the old
      // session and deletes its row once the replacement exists, so a stale
      // pick over a row that has turned live would end a person's running work
      // and leave nothing to restore. It is offered for an ended row on this
      // Mac and it is RUN for nothing else.
      const bare = options?.withoutCapture === true;
      const session = freshSession(
        sessionId,
        'sessions',
        (g) => g.offersRestart && (!bare || g.offersBare)
      );
      if (session === null) {
        return { ok: false, message: LIFECYCLE_SESSION_CHANGED };
      }
      return runRestart(session, options);
    },

    async restoreSessionNow(sessionId, options) {
      if (typeof sessionsBridge()?.restore !== 'function') {
        return { kind: 'failed', message: LIFECYCLE_BRIDGE_MISSING };
      }
      const bare = options?.withoutCapture === true;
      const offered = freshSession(
        sessionId,
        'sessions',
        (g) => g.offersRestore && (!bare || g.offersBare)
      );
      if (offered === null) {
        return { kind: 'failed', message: LIFECYCLE_SESSION_CHANGED };
      }
      // Offered and not yet enabled is its own answer: the row did not change,
      // Tortie is still waiting for the login shell, and the sentence every
      // Restore control already carries says exactly that.
      if (!get().shellPathReady) {
        return { kind: 'failed', message: SHELL_PATH_PENDING_TITLE };
      }
      return restoreCore(offered, bare, async () => {
        await applyFreshList();
      });
    },

    async refreshSessions() {
      try {
        const api = sessionsBridge();
        if (api === null || typeof api.list !== 'function') return null;
        const sessions = await api.list();
        get().applySessions(sessions);
        return sessions;
      } catch {
        // Null is the whole report. The batch End reads it as "I could not
        // read the list, so I did not end this one" and goes on to the next.
        return null;
      }
    },

    canDiscard() {
      return typeof sessionExtras?.discard === 'function';
    },

    // -- restore (Phase 6) -----------------------------------------------------

    restoringIds: {},

    canRestore() {
      return typeof sessionExtras?.restore === 'function';
    },

    // PHASE 81. False on a build whose preload can answer the question, true
    // from the start on one that cannot. The five Restore controls read it.
    shellPathReady: typeof sessionExtras?.shellPathReady !== 'function',

    applyShellPathReady() {
      set({ shellPathReady: true });
    },

    // PHASE 141 ------------------------------------------------------------

    async resumeInPlace(sessionId) {
      const call = resumeInPlaceCall();
      if (call === null) return;
      const session = get().sessions.find((x) => x.id === sessionId);
      if (session === undefined) return;
      // THE SAME PREDICATE THE ROW AND THE TWO MENUS READ, asked again here and
      // deliberately not re-derived. The Session menu in the menu bar is always
      // present and acts on whichever session is active, so this is the one
      // path where the verb can be reached for a session it was never offered
      // for: a remote row, an ended row, a row Tortie cannot see, or a row with
      // something running in it again. Every one of those returns in silence,
      // which is what `end-session` in the same menu already does for a session
      // that has ended.
      const handback = get().handbacks[sessionId];
      const status = get().effectiveStatus(session);
      if (!showsResumeVerb(session, handback, status)) return;
      if (armingInFlight.has(sessionId)) return;
      armingInFlight.add(sessionId);
      try {
        const answer = await call(sessionId);
        const note = resumeInPlaceAnswerNote(answer);
        // The three landings that mean nothing is on the prompt stay on screen
        // until the person dismisses them, because each one asks them to look
        // at the session before they press anything. Every refusal stays for
        // the same reason: nothing was typed and the person needs to know why.
        if (answer.landing !== null && resumeInPlaceLanded(answer.landing)) {
          get().toast('success', note);
        } else {
          get().toast('info', note, { sticky: true });
        }
      } catch (err) {
        // Main writes the sentence for every case it refuses, and echoing it is
        // what keeps the log and the screen saying the same thing. This file
        // does not rewrite a refusal it did not decide.
        get().toast('error', errorText(err), { sticky: true });
      } finally {
        armingInFlight.delete(sessionId);
      }
    },

    async restoreSession(sessionId, options) {
      if (typeof sessionExtras?.restore !== 'function') return;
      const session = get().sessions.find((x) => x.id === sessionId);
      if (!session || get().restoringIds[sessionId] === true) return;
      // PHASE 119. The declined restore asks first. The choice is written onto
      // the row by main and Tortie offers no way to turn saving back on, so the
      // person reads that before the button, not after it. Everything after the
      // answer is the ordinary restore, called with one option, so there is one
      // restore path and not two.
      if (options?.withoutCapture === true) {
        const ask = bareRestoreConfirm(session);
        get().setConfirm({
          title: ask.title,
          body: ask.body,
          confirmLabel: ask.confirmLabel,
          // Not destructive. Nothing on disk is deleted and a red button would
          // say otherwise.
          onConfirm: () => {
            void runRestore(session, true);
          }
        });
        return;
      }
      await runRestore(session, false);
    },

    async restoreAllSessions() {
      // Sequential on purpose: parallel tmux new-session calls can race the
      // name dedupe, and one toast per session stays readable.
      const targets = get()
        .projectSessions()
        .filter((x) => x.status === 'restorable');
      for (const t of targets) {
        await get().restoreSession(t.id);
      }
    },

    // -- past sessions (Phase 29) ------------------------------------------------

    pastSessions: [],
    pastLoading: false,

    async refreshPastSessions() {
      const request = ++pastRequestSeq;
      const api = sessionsBridge();
      if (api === null || typeof api.listRemoved !== 'function') {
        // Older preload: the list is empty, with no error.
        set({ pastSessions: [], pastLoading: false });
        return;
      }
      set({ pastLoading: true });
      try {
        const rows = await api.listRemoved();
        // A newer read is in the air and its answer is the one that counts.
        if (request !== pastRequestSeq) return;
        set({ pastSessions: rows, pastLoading: false });
      } catch (err) {
        if (request !== pastRequestSeq) return;
        // The rows already held are kept: a failed read is not an empty list.
        set({ pastLoading: false });
        // While the sheet is open it has a state for exactly this, and that is
        // where the failure is said. With the sheet closed nothing draws this
        // list, so there is nobody to tell.
        const sheet = get().sessionSheet;
        if (sheet !== null) {
          set({ sessionSheet: { ...sheet, listError: errorText(err) } });
        }
      }
    },

    async restorePastSession(sessionId) {
      if (typeof sessionsBridge()?.restore !== 'function') {
        return { kind: 'failed', message: LIFECYCLE_BRIDGE_MISSING };
      }
      // PHASE 293. The row is re-read BY ID from the removed list at the press,
      // and the gate is the one main's own restore asks: removed, a machine
      // that is still here when it names one, and a build that can restore.
      const removed = freshSession(
        sessionId,
        'pastSessions',
        (g) => g.canRestorePastNow
      );
      if (removed === null) {
        const waiting =
          !get().shellPathReady &&
          get().pastSessions.some((x) => x.id === sessionId);
        return {
          kind: 'failed',
          message: waiting ? SHELL_PATH_PENDING_TITLE : LIFECYCLE_SESSION_CHANGED
        };
      }
      // NO ASK, NO CLOSE, NO LANDING, NO TOAST. Phase 60's native ask and the
      // landing that followed it belonged to a modal that closed itself. The
      // sheet asks inline before it calls this, stays open after, and offers
      // the way to the session, so this verb restores and answers.
      const outcome = await restoreCore(removed, false, async () => {
        await applyFreshList();
      });
      // Either way the removed list has moved or must be shown still to hold
      // the row. A failed restore is not a second loss: main kept the row
      // 'discarded', and the re-fetch shows it still there.
      if (outcome.kind !== 'busy') await get().refreshPastSessions();
      return outcome;
    },

    // -- saved output (Phase 72) -------------------------------------------------

    savedOutputSessionId: null,
    savedOutput: null,
    savedOutputLoading: false,

    openSavedOutput(sessionId) {
      const saved = scrollbackExtras?.saved;
      if (typeof saved !== 'function') {
        // Older preload: the panel opens and says it has nothing, with no
        // error. It is the same posture Past Sessions takes.
        set({
          savedOutputSessionId: sessionId,
          savedOutput: null,
          savedOutputLoading: false
        });
        return;
      }
      set({
        savedOutputSessionId: sessionId,
        savedOutput: null,
        savedOutputLoading: true
      });
      void saved.call(scrollbackExtras, sessionId).then(
        (found) => {
          // A second open before the first answered wins. Without this check
          // the older answer would land in the newer panel.
          if (get().savedOutputSessionId !== sessionId) return;
          set({ savedOutput: found, savedOutputLoading: false });
        },
        (err: unknown) => {
          if (get().savedOutputSessionId !== sessionId) return;
          set({ savedOutputLoading: false });
          get().toast('error', errorText(err));
        }
      );
    },

    closeSavedOutput() {
      // The body is dropped rather than kept. A saved screen can be several
      // megabytes and there is no reason to hold it after the panel is shut.
      set({
        savedOutputSessionId: null,
        savedOutput: null,
        savedOutputLoading: false
      });
    },

    // -- the last lines of a session on another machine (Phase 100) -------------

    remoteLinesSessionId: null,
    remoteLines: null,
    remoteLinesLoading: false,
    remoteLinesFailed: false,
    remoteLinesDepth: REMOTE_SESSION_LINES_DEFAULT,
    remoteLinesRequest: 0,

    openRemoteLines(sessionId) {
      set({
        remoteLinesSessionId: sessionId,
        remoteLines: null,
        remoteLinesLoading: false,
        remoteLinesFailed: false,
        remoteLinesDepth: REMOTE_SESSION_LINES_DEFAULT
      });
      get().readRemoteLines(REMOTE_SESSION_LINES_DEFAULT);
    },

    readRemoteLines(lines) {
      const sessionId = get().remoteLinesSessionId;
      if (sessionId === null) return;
      const machines = machinesExtras();
      if (machines === null || typeof machines.readSessionLines !== 'function') {
        // Older preload: the panel opens and says this build cannot read a
        // session on another machine, with no error and no crash. It is the
        // same posture every other extras consumer takes.
        set({
          remoteLines: null,
          remoteLinesLoading: false,
          remoteLinesFailed: false,
          remoteLinesDepth: lines
        });
        return;
      }
      const request = get().remoteLinesRequest + 1;
      set({
        remoteLinesLoading: true,
        remoteLinesFailed: false,
        remoteLinesDepth: lines,
        remoteLinesRequest: request
      });
      void machines.readSessionLines({ sessionId, lines }).then(
        (found) => {
          // BOTH guards. The first is the panel's session, which a second open
          // can change. The second is this read's own number, because two reads
          // of the SAME session can be in flight at once and the older one must
          // not land in the newer panel.
          const now = get();
          if (now.remoteLinesSessionId !== sessionId) return;
          if (now.remoteLinesRequest !== request) return;
          set({
            remoteLines: found,
            remoteLinesLoading: false,
            remoteLinesFailed: false
          });
        },
        (err: unknown) => {
          const now = get();
          if (now.remoteLinesSessionId !== sessionId) return;
          if (now.remoteLinesRequest !== request) return;
          // The older answer is dropped along with the loading flag. Keeping it
          // would leave a body read at one depth under a depth row showing the
          // one that was just pressed and failed, which is the mismatch the
          // request number above exists to stop.
          set({
            remoteLines: null,
            remoteLinesLoading: false,
            remoteLinesFailed: true
          });
          get().toast('error', errorText(err));
        }
      );
    },

    closeRemoteLines() {
      // The body is dropped rather than kept, for the same reason the saved
      // output block drops its own. A read of 25,000 lines is several megabytes
      // and there is no reason to hold it after the panel is shut.
      set({
        remoteLinesSessionId: null,
        remoteLines: null,
        remoteLinesLoading: false,
        remoteLinesFailed: false
      });
    },

    noteTerminalInput(sessionId) {
      const id = sessionId ?? get().activeSession()?.id;
      if (id === undefined) return;
      // Fires from xterm's onData, i.e. once per keystroke, so it must not
      // cross the bridge on every character. The only thing main does with
      // it is release `needs_input` early, so nothing is lost by asking only
      // when the session is actually flagged — the monitor's own poll
      // handles every other case within a tick.
      const session = get().sessions.find((x) => x.id === id);
      if (session?.status !== 'needs_input') return;
      void activityExtras?.noteTerminalInput?.(id).catch(() => undefined);
    },

    // -- derived --------------------------------------------------------------

    projectSessions(projectId) {
      const s = get();
      const id = projectId === undefined ? s.activeProjectId : projectId;
      const project = s.projects.find((p) => p.id === id);
      if (!project) return [];
      const target = targetOfProject(project);
      return s.sessions.filter((x) => sameTarget(targetOfSession(x), target));
    },

    activeSession() {
      const s = get();
      if (s.activeProjectId === null) return null;
      const selected = s.activeSessionByProject[s.activeProjectId];
      const sessions = s.projectSessions();
      return (
        sessions.find((x) => x.id === selected) ??
        sessions[sessions.length - 1] ??
        null
      );
    },

    effectiveStatus(session) {
      return session.status;
    },

    attentionSessions() {
      const s = get();
      return s.sessions
        .filter((x) => s.effectiveStatus(x) === 'needs_input')
        .sort(
          (a, b) =>
            (s.attentionSince[b.id] ?? b.createdAt) -
            (s.attentionSince[a.id] ?? a.createdAt)
        );
    },

    attentionCountFor(projectPath, machineId) {
      const s = get();
      const target = targetOfProject({ path: projectPath, machineId });
      return s.sessions.filter(
        (x) =>
          sameTarget(targetOfSession(x), target) &&
          s.effectiveStatus(x) === 'needs_input'
      ).length;
    }
  };
};
