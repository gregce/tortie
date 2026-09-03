/**
 * Session lifecycle contract beyond the frozen base: restore (plus the
 * login item that shipped with it), activity facts, the durability
 * channels (queued notices, restart), and Past Sessions. Moved verbatim
 * from src/shared/ipc.ts (Phase 42 stage 2).
 */

import type { Unsubscribe } from './base';
import type { DurabilityNotice } from '../notice';

// ---------------------------------------------------------------------------
// APPENDED by the restore stream (Phase 6) — new channels/types only, nothing
// above was modified. All were declared OPTIONAL bridge extensions at the
// time, feature-detected by the renderer so the app still worked against an
// older preload. Phase 122 made every one of them required, because the
// preload and the renderer ship in the same asar and an older preload with a
// newer renderer is not a build that exists.
//
// Wiring (done by this phase): main registers the channels in
// src/main/restore/ipc.ts; preload adds the methods per the GmuxApi pattern.
// ---------------------------------------------------------------------------

import type { Session as RestoreSession } from '../types';

/**
 * Bring a session back with SpecStory turned off (Phase 119).
 *
 * ONE WORD, ONE MEANING, ON BOTH CHANNELS. `sessions:restore` and
 * `sessions:restart` both take this, and in both places `withoutCapture: true`
 * means the same thing: start this session again with no SpecStory wrapper
 * around it, so it no longer saves its history to the project folder.
 *
 * Why it exists. A captured session records its resume command wrapped in the
 * absolute path of the specstory binary it launched under, and restore types
 * that command back into the pane. Before this option there was no way to ask
 * for the inner command on its own. `armableResumeArgv` in
 * src/main/restore/restore.ts reached its bare arm only when the recorded
 * binary had gone missing, and a bundled binary is always on disk, so a person
 * whose wrapper misbehaved had no way around it.
 *
 * It is insurance rather than a repair. Phase 115 healed the bundled binary and
 * both verbs succeed today. This is what a person reaches for the next time a
 * wrapper breaks.
 *
 * ON RESTORE the choice is DURABLE. Main writes `specstory.enabled = false` and
 * the bare resume argv onto the row, because the harvest would otherwise put
 * the wrapper back around the resume command and the person would have to
 * decline again on every restore. On RESTART nothing is flipped, because the
 * old row is discarded and the replacement is born bare.
 *
 * Omitted, or `withoutCapture: false`, is the ordinary verb, unchanged.
 */
export interface CaptureChoice {
  /**
   * True to bring the session back with no SpecStory wrapper. A row that was
   * never captured ignores it: main returns the recorded command and writes
   * nothing, and the renderer does not offer the verb for such a row.
   */
  withoutCapture?: boolean;
  /**
   * True to bring the session back under the login CHOSEN for its provider
   * right now rather than the one it was started under (Phase 211, fix
   * round). This is the `Restart now` beside a switch: the replacement's row
   * carries the chosen login's NAME, as any create does when it names none,
   * so a person who switched accounts and pressed the control has the
   * session under the account they chose. Omitted, a restart keeps the login
   * the original ran under, exactly as Phase 202 built it. It names no login
   * itself: the choice is main's, read at the create.
   */
  underChosenLogin?: boolean;
}

/** New invoke channels appended by the restore stream. */
export interface RestoreInvokeChannelMap {
  /**
   * Recreate a 'restorable' session (FINAL-REPORT §2.4 Step 3): fresh tmux
   * session in the recorded cwd running $SHELL, prior scrollback snapshot
   * cat-ed as inert history, and the recorded resume command TYPED but not
   * executed (armed). Resolves to the refreshed Session (status 'running').
   * Idempotent for already-live sessions.
   */
  'sessions:restore': {
    req: [sessionId: string, options?: CaptureChoice];
    res: RestoreSession;
  };
  /**
   * Phase 141. Type the command that continues this session's conversation
   * onto the prompt of the session it is already running in, and read the
   * screen back to say whether it landed. THE PERSON PRESSES ENTER. Tortie
   * never does, on this channel or on any other.
   *
   * Main re-reads that one session at the moment of the press and refuses,
   * having typed nothing, when the session is not in the state the last poll
   * described. A poll answer up to two seconds old is not good enough to type
   * into a live session with. See {@link ResumeInPlaceResult}.
   *
   * It never creates, kills or renames anything, and it never touches a row's
   * conversation id. It always resolves: a refusal is an answer a person reads
   * rather than an error, and it comes back with a null landing and a
   * {@link ResumeInPlaceRefusal} that says why nothing was typed.
   */
  'sessions:resumeInPlace': {
    req: [sessionId: string];
    res: ResumeInPlaceResult;
  };
  /** Read the 'Launch gmux at login' state (app.getLoginItemSettings). */
  'app:getLoginItem': { req: []; res: { openAtLogin: boolean } };
  /**
   * Toggle 'Launch gmux at login' (app.setLoginItemSettings) and return the
   * OS-read-back state — the UI must render the readback, not the request.
   */
  'app:setLoginItem': { req: [openAtLogin: boolean]; res: { openAtLogin: boolean } };
}

/**
 * Extension to GmuxApi['sessions'].
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxSessionRestoreExtras {
  /**
   * Restore a 'restorable' session with an armed resume command.
   *
   * Phase 119: pass `{ withoutCapture: true }` to bring it back with SpecStory
   * turned off. See {@link CaptureChoice} for what that changes on the row.
   */
  restore(
    sessionId: string,
    options?: CaptureChoice
  ): Promise<RestoreSession>;
  /**
   * Phase 141. Put the command that continues this session's conversation back
   * on its own prompt, and say whether it landed. Nothing runs: the person
   * presses Enter.
   */
  resumeInPlace(sessionId: string): Promise<ResumeInPlaceResult>;
}

/**
 * Top-level extras on window.gmux (login item).
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxLoginItemExtras {
  getLoginItem(): Promise<{ openAtLogin: boolean }>;
  setLoginItem(openAtLogin: boolean): Promise<{ openAtLogin: boolean }>;
}

// ---------------------------------------------------------------------------
// APPENDED by the activity stream (Phase 13, research 18) — new channels and
// types only, plus the one existing line the GmuxInvokeChannelMap comment
// invites streams to intersect into.
//
// Activity detection moved ENTIRELY into the main process. The renderer used
// to derive working / needs-input / idle from the `term:data:<id>` byte
// stream, which only exists for the VISIBLE pane, and then pinned that value
// through a sticky override that outranked main — a session could read
// "working" for hours after going quiet. Main now reads agent-native oracles
// and tmux formats for EVERY session, attached or not, and these two channels
// carry the two things the byte stream used to supply on the side:
//
//   activity:changed  (main → renderer)  ⌘J excerpt + last-output timestamp,
//     batched to at most one message per poll tick. Status itself still
//     travels on the existing EVT_STATUS_CHANGED.
//   activity:noteInput (renderer → main) the user typed into a session, so
//     whatever it was blocked on has an answer — clears needs_input without
//     waiting for echo (the Phase 9.2 self-inflicted-input rule).
// ---------------------------------------------------------------------------

/** Main → renderer: per-session activity facts that are not the status. */
export const EVT_ACTIVITY_CHANGED = 'activity:changed' as const;

export interface SessionActivityInfo {
  sessionId: string;
  /** Last non-empty line of the session's screen (⌘J excerpt). */
  excerpt?: string;
  /** Epoch ms of the last output tmux saw in that pane. */
  lastActivityAt?: number;
  /**
   * Phase 141. Whether the agent Tortie watched in this session has left the
   * shell running, and what has happened since. See {@link SessionHandbackInfo}.
   *
   * IT IS NOT A STATUS AND IT NEVER BECOMES ONE. `SessionStatus` gains no
   * member for it and the status dot is not drawn from it.
   *
   * Absent means this update carries no news about the handback, exactly as an
   * absent `excerpt` does, and the renderer keeps what it already had. Main
   * sends an explicit `{ state: 'none' }` on the tick a session stops being
   * dropped, so the renderer never has to read a clear out of an absence.
   */
  handback?: SessionHandbackInfo;
}

/** New event channel appended by the activity stream. */
export interface ActivityEventPayloadMap {
  'activity:changed': [updates: SessionActivityInfo[]];
}

/** New invoke channel appended by the activity stream. */
export interface ActivityInvokeChannelMap {
  /** The user sent input to this session (clears needs_input immediately). */
  'activity:noteInput': { req: [sessionId: string]; res: void };
}

/**
 * Top-level extras on window.gmux. Without them the shell simply shows no
 * excerpts and no ages — status is unaffected.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxActivityExtras {
  onActivityChanged(cb: (updates: SessionActivityInfo[]) => void): Unsubscribe;
  noteTerminalInput(sessionId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 19 items 8 and 9 (durability) — two new channels and their
// preload extras. The existing lines touched above are the
// GmuxInvokeChannelMap intersection, the `scrollback:notice` payload and the
// `onNotice` callback signature, and each is annotated where it sits.
//
// WHY A PULL CHANNEL FOR NOTICES AT ALL: the loudest notice of the five fires
// while the manifest is being opened, which is BEFORE any window exists, so a
// broadcast at that instant reaches nobody. Main queues those and the renderer
// drains the queue once, immediately after it subscribes. Everything posted
// after that point is broadcast normally and is never queued, so a notice can
// never be shown twice.
// ---------------------------------------------------------------------------

/** New invoke channels appended by the durability stream. */
export interface DurabilityInvokeChannelMap {
  /**
   * Degraded-state notices that were posted before any renderer could hear
   * them. Called ONCE per renderer boot, right after `scrollback.onNotice` is
   * subscribed. Draining is destructive: the queue is empty afterwards.
   */
  'notice:pending': { req: []; res: DurabilityNotice[] };
  /**
   * Restart an ended session: create the replacement FIRST, and only then
   * remove the old row. Phase 19 item 8.
   *
   * This is one main-side call rather than the renderer's old
   * discard-then-create pair because the ordering is a durability invariant
   * and the renderer cannot hold it across a reload. It is also the only side
   * that can read the original launch flags, which live in the manifest row's
   * argv and are dropped by any caller that rebuilds the session from the
   * Session projection.
   *
   * Resolves to the replacement. Rejects with the create's own typed error and
   * nothing removed, which is the whole point.
   */
  'sessions:restart': {
    req: [sessionId: string, options?: CaptureChoice];
    res: RestoreSession;
  };
}

/**
 * Top-level extra on window.gmux. Without it the app simply never hears a
 * notice that was posted before the window existed, which is the behaviour
 * every build before Phase 19 had.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxNoticeExtras {
  notice: {
    pending(): Promise<DurabilityNotice[]>;
  };
}

/**
 * Extension to GmuxApi['sessions']. Without it the renderer falls back to
 * its own create-then-discard sequence, which keeps the ordering right but
 * cannot carry the launch flags.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxSessionRestartExtras {
  /**
   * Phase 119: pass `{ withoutCapture: true }` for a replacement that does not
   * save its history. Nothing is flipped on the old row, because the old row
   * is discarded and the replacement is born bare.
   */
  restart(
    sessionId: string,
    options?: CaptureChoice
  ): Promise<RestoreSession>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 29 (session history) — new channel/types only. The two
// existing lines touched above are the GmuxInvokeChannelMap intersection and
// the AnyMenuActionWithProjects alias, exactly the one-line folds their own
// comments prescribe.
//
// sessions:listRemoved — the Past Sessions panel's data: discarded rows from
//   every project, newest removal first by removedAt. Sorted in MAIN, so
//   there is one opinion about the order. There is deliberately no push event
//   for this list: the panel fetches on open and after its own restore verb,
//   and a removal cannot happen while the panel is open (the panel is a modal
//   and Remove lives behind it), so a stale list is not reachable.
//
// Restore from the panel reuses the existing `sessions:restore` channel — the
// Phase 26.3 machinery — and Remove keeps its shipped `sessions:discard`
// channel name while the handler behind it writes a tombstone instead of a
// DELETE. No new verb channels exist.
//
// MAIN: src/main/restore/ipc.ts, beside restore and discard.
// ---------------------------------------------------------------------------

/** Past Sessions data: discarded rows, newest removal first. */
export interface GmuxPastSessionsChannelMap {
  'sessions:listRemoved': { req: []; res: RestoreSession[] };
}

/**
 * Sessions extra. Without it the Past Sessions panel opens in its empty
 * state with no error, the same posture every extras consumer takes.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxPastSessionsExtras {
  listRemoved(): Promise<RestoreSession[]>;
}

/**
 * The Session menu gained "Past Sessions…". Appended as its own id union,
 * the same one-line shape ProjectMenuActionId used. Deliberately
 * unaccelerated: restoring starts a process, so the user reads a name first.
 */
export type PastSessionsMenuActionId = 'past-sessions';

// ---------------------------------------------------------------------------
// APPENDED by Phase 60 (the restore ask) — ONE new invoke channel. The one
// existing line touched above is the GmuxInvokeChannelMap intersection,
// exactly the one-line fold its own comment prescribes.
//
// sessions:askRestoreProject — the native question shown before a Past
//   Sessions restore opens a project that is not an open tab. The dialog is
//   `dialog.showMessageBox` in MAIN, parented to the app window, per the UI
//   rule that dialogs are native. Main stats the path itself: the renderer
//   sends only the name and path it already got from main's own
//   sessions:listRemoved rows, so main never trusts the renderer about what
//   is on disk. A restore into an OPEN project never reaches this channel.
//
// MAIN: src/main/restore/ask-open-project.ts, wired from
// src/main/restore/ipc.ts beside sessions:restore and sessions:listRemoved.
// ---------------------------------------------------------------------------

/** What the ask must name (sessions:askRestoreProject). */
export interface AskRestoreProjectInput {
  sessionName: string;
  projectPath: string;
}

/**
 * The user's answer. 'open' means open the project and restore into it.
 * The missing-folder dialog has one button, so it can only answer 'cancel'.
 */
export type AskRestoreProjectAnswer = 'open' | 'cancel';

/** New invoke channel appended by Phase 60. */
export interface AskRestoreProjectInvokeChannelMap {
  'sessions:askRestoreProject': {
    req: [input: AskRestoreProjectInput];
    res: AskRestoreProjectAnswer;
  };
}

/**
 * Sessions extra. Without it the restore keeps today's silent behavior, the
 * standing extras posture.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxAskRestoreProjectExtras {
  askRestoreProject(
    input: AskRestoreProjectInput
  ): Promise<AskRestoreProjectAnswer>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 81 (the session list stops waiting for the login shell) —
// ONE new invoke channel. The one existing line touched elsewhere is the
// GmuxInvokeChannelMap intersection, exactly the one-line fold this file's
// other streams prescribe.
//
// WHY THE RENDERER NEEDS TO ASK AT ALL. The session list used to arrive after
// the login shell had answered, because `ensureServer` awaited that answer and
// `sessions:list` sat behind `ensureServer`. It does not any more, so Restore
// is on screen about one second before Tortie can honour it. Main awaits the
// same promise, so a restore that slipped through would still be correct. This
// channel exists so the button can be honest rather than slow.
//
// MAIN: src/main/ipc.ts, beside sessions:attach. It does NOT boot the session
// core: asking whether the shell has answered must not itself start anything.
// ---------------------------------------------------------------------------

/** New invoke channel appended by Phase 81. */
export interface ShellPathInvokeChannelMap {
  /**
   * Resolves when Tortie has the PATH from the user's login shell and has
   * installed it in the main process. It starts the capture if nothing else
   * has. It always resolves, at worst on the 10,000 ms deadline, because the
   * capture falls back rather than failing.
   */
  'sessions:shellPathReady': { req: []; res: void };
}

/**
 * Extension to GmuxApi['sessions']. Without it the renderer treats the PATH
 * as ready from the start, which is exactly the behaviour every preload
 * before Phase 81 had.
 *
 * Phase 122 made every member required. There is one preload file and it
 * makes one `exposeInMainWorld` call, so the whole bridge can be absent and,
 * when it is present, these members are present with it. The renderer keeps
 * its own `typeof x === 'function'` checks, which now ask about a window
 * that has no preload at all.
 */
export interface GmuxShellPathExtras {
  shellPathReady(): Promise<void>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 141 (the drop to a plain shell, and the way back) — one
// optional field on the activity payload, one invoke channel, and one preload
// method. Nothing above was changed except the `handback` line inside
// SessionActivityInfo, which is annotated where it sits.
//
// WHY THE ACTIVITY PAYLOAD AND NOT THE SESSION PROJECTION. An agent that left
// its shell running is a runtime fact about a pane, in the same family as the
// excerpt and the last-output time that already ride this channel. It is NOT a
// status, and Phase 23 refusal 5 says nothing may set one. Carrying it here
// rather than on `Session` is what makes that refusal structural: there is no
// code path from this field to a status dot, because the field never reaches
// the manifest projection at all.
//
// WHY THE CHANNEL LIVES IN THE RESTORE MAP. `sessions:resumeInPlace` is
// registered in src/main/restore/ipc.ts beside `sessions:restore`, and it is
// the same verb aimed at a session that is still alive. It is folded into
// GmuxInvokeChannelMap through RestoreInvokeChannelMap, so src/shared/ipc/
// index.ts needs no edit for it.
// ---------------------------------------------------------------------------

/**
 * What Tortie can say about an agent that left the shell running.
 *
 * There are four answers and no fifth, and none of them is a status.
 *
 * - `none`: nothing to say. Either an agent is running, or this session was
 *   always a shell, or Tortie never watched an agent alive in it.
 * - `left`: the process Tortie watched being the agent has gone, and nothing
 *   has run in that session since. This is the only state that offers the
 *   verb.
 * - `returning`: something is running in that session again and Tortie has not
 *   been told which conversation it is in yet.
 * - `unconfirmed`: something is running and Tortie could not confirm that it
 *   is the conversation the row holds. The row stays unadopted and says so,
 *   because adopting the wrong conversation is the worst outcome here.
 *
 * A RESTORED SESSION SITTING WITH ITS COMMAND ARMED AND UNPRESSED IS `none`.
 * That session's own program is the login shell and its shape is byte for byte
 * the shape of a session whose agent left, so the rule behind this field reads
 * a witness, being a specific process Tortie watched alive, and never a shape.
 * Tortie never watched an agent alive in a session it has only just restored,
 * so there is no witness to lose and the field stays `none`.
 */
export type SessionHandbackState = 'none' | 'left' | 'returning' | 'unconfirmed';

/**
 * The handback fact for one session, plus the one time a person is told.
 *
 * `leftAt` is the epoch ms at which the witnessed process went away. It is
 * present for `left`, `returning` and `unconfirmed`, and absent for `none`.
 * The renderer prints it as a time and never as a duration or a count.
 */
export interface SessionHandbackInfo {
  state: SessionHandbackState;
  /** Epoch ms the witnessed process went away. Absent while the state is `none`. */
  leftAt?: number;
}

/**
 * Landing of one `sessions:resumeInPlace` call: what the session's own screen
 * showed after Tortie typed.
 *
 * These are the four answers `decideArmLanding` in
 * src/main/machines/remote-arm.ts has produced since Phase 89, and there is no
 * fifth. `absent` is a screen Tortie READ and did not find the command on;
 * `unknown` is a screen Tortie could not read. Telling a person a thing is not
 * there when nobody looked is a different claim from telling them it is not
 * there, and the two are kept apart here for the same reason the restore gate
 * keeps them apart.
 *
 * A REFUSAL IS NOT A LANDING. When Tortie types nothing there is no screen to
 * read, so the landing is null and {@link ResumeInPlaceRefusal} says why.
 *
 * NOTHING IN THIS UNION MEANS A COMMAND RAN. Tortie types and never presses
 * Enter, on this channel as on every other.
 */
export type ResumeInPlaceLanding = 'armed' | 'twice' | 'absent' | 'unknown';

/**
 * Why Tortie typed nothing. A token rather than a sentence, because every
 * sentence a person reads about resume lives with the rest of the resume copy
 * in the renderer.
 *
 * Four of these six come from the re-read of that ONE session at the moment of
 * the press, and that re-read is the guard the whole design turns on: a poll
 * answer up to two seconds old is not good enough to type into a live session
 * with. An earlier candidate armed from a stale poll and an adversary measured
 * the armed text landing inside a running agent's input box.
 *
 * THIS UNION IS WRITTEN DOWN TWICE, here and in
 * src/main/sessions/resume-in-place.ts, because a renderer file cannot import
 * main. `npm run conformance:handback` reads both and fails when they drift,
 * which is the only thing that keeps two hand kept copies honest.
 */
export type ResumeInPlaceRefusal =
  /** The row is not one that dropped, so there is nothing to put back. */
  | 'not-dropped'
  /** The session has no live pane on this Mac, or it is on another machine. */
  | 'not-here'
  /** The row records no conversation, so there is nothing to arm. */
  | 'no-conversation'
  /** Something is running in the session. Tortie types into nobody's program. */
  | 'running'
  /** The agent is back on its own. Nothing needs putting back. */
  | 'agent-back'
  /** Tortie could not compose a command out of its own compiled catalogue. */
  | 'not-composed';

/**
 * What one press did. The renderer composes the sentence, so every word a
 * person reads about this verb lives with the rest of the resume copy.
 *
 * EXACTLY ONE OF `landing` AND `refusal` IS SET. A landing means Tortie typed
 * and then looked at the screen. A refusal means Tortie typed nothing, and
 * there was no screen to look at.
 *
 * `before` and `after` are how many times the composed command was found on
 * the session's screen, read once before the send and once after. They are
 * what the landing was decided from, and they are returned so a probe can
 * check the decision rather than trust it.
 */
export interface ResumeInPlaceResult {
  /** Null when the command was refused before anything was sent. */
  landing: ResumeInPlaceLanding | null;
  /** Null when something was typed. */
  refusal: ResumeInPlaceRefusal | null;
  /** Copies of the command on the screen before the send. */
  before: number;
  /** Copies after. */
  after: number;
}
