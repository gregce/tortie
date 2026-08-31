/**
 * Sessions that live on another machine (Phase 70, M3, then Phase 71, M4, then
 * Phase 72, M5; research 51 sections 4.1, 4.3, 4.4 and 4.6).
 *
 * This module owns four verbs, one feed, one registry and one projection. It is
 * the whole of what main knows about a session that is not on this Mac.
 *
 * ## What Phase 71 changed, and what it deliberately did not
 *
 * The poll became a FEED with two shapes. A machine whose version has a measured
 * control dialect gets one live connection, and a list is read because that
 * machine said something changed. Every other machine keeps the timer Phase 70
 * shipped, at the same two cadences. A machine never has both at once, which is
 * asserted by counting armed timers rather than promised in this comment.
 *
 * ## What Phase 85 added beside that, and it is not a third shape
 *
 * A connected machine now also gets a STATUS LIST on a timer, at the same two
 * cadences, and {@link armStatusTimer} owns it. The connection reports
 * membership and renames and never reports output, so a machine could sit with a
 * moving activity stamp that nobody re-read. The Phase 71 exclusivity is
 * unchanged and still counted: the FALLBACK timer and the connection are never
 * armed together, and {@link machinesWithBothFeeds} is the count.
 *
 * The status ladder moved out of this file. `./status-truth.ts` is now the only
 * place research 51 section 4.4's case table is written, and every status this
 * feed writes for a whole machine comes from `machineTruth`. Two behaviours
 * changed because of it. A row a completed list stopped reporting now reads
 * `restorable` rather than `exited`, because the machine answered and its answer
 * did not hold that session. And a lost link writes `unknown` on every row of
 * that machine and of no other machine.
 *
 * ## THE RULE THAT PHASE 72 CHANGED, stated in full because it was absolute
 *
 * Phase 70's rule was that nothing about a remote session is ever written to the
 * manifest, and this header carried it as an import list a reader could check.
 * It was right for a build with no `machine_id` column: a row that cannot say
 * which machine its session is on is a row a later restore reads as local and
 * recreates on this Mac, which is two agents on one conversation.
 *
 * Phase 71 added the column. Phase 72 moved `MANIFEST_MIN_COMPATIBLE_VERSION`
 * from 8 to 13 and deleted the refusal that stood in for it. A row can now say
 * which machine it belongs to, an older build is refused at the open rather than
 * trusted, and a session on another machine gets a manifest row written at
 * create time, before the create line is sent.
 *
 * THE IMPORT LIST IS STILL THE CHECK, and it still holds, because every one of
 * those writes goes through `./remote-record.ts` and this file imports nothing
 * else from `../manifest/`. A reader asking what a remote path can do to the
 * manifest reads that one module.
 *
 * ## Where the truth lives
 *
 * On that machine, beside the processes, exactly where research 51 section 4.3
 * puts it. Tortie stamps four session options on a session it creates there and
 * one poll reads all of them back:
 *
 *   @gmux-id       the uuid Tortie generated for this session
 *   @gmux-agent    claude, codex or shell, so the icon is right after a relaunch
 *   @gmux-name     the display name the person typed
 *   @gmux-project  the absolute path of the project tab it was created under
 *
 * The property that buys is worth stating plainly. Quit Tortie, start it again,
 * and the remote rows come back with their names, their agents and their tab,
 * because the machine held all of it. Nothing was restored and nothing was
 * recreated. The session never stopped running.
 *
 * The manifest row is the SECOND record, and it answers the questions the far
 * side cannot: which program path this session launched on that machine, what
 * Tortie last knew about a session whose machine ended up removed, and what to
 * compose when the machine answered and its answer no longer holds the session.
 * Where the two disagree about a live session, the machine wins, because the
 * machine is where the process is.
 *
 * ## What is NOT true, and no surface may imply otherwise
 *
 *  - A conversation comes back only for a row TWO answers prove, and Phase 89
 *    is what made that true. The arming gate in `./resume-arming.ts` reads the
 *    row's provenance, and the composer in `./remote-arm.ts` reads every word of
 *    the recorded resume command against Tortie's compiled catalogue. When both
 *    say yes the restore starts that machine's own shell, types the command into
 *    it and stops, and `resumeArmed` says whether Tortie read that command back
 *    off the screen. A row either answer refuses comes back with its folder and
 *    its program and no conversation, and a row the Phase 73 harvest could not
 *    prove still records `remote-not-collected` rather than nothing. Enter is
 *    never pressed on any of those paths.
 *  - A remote row's status comes from one format field, and PHASE 85 CHANGED
 *    WHICH ONE. It reads `#{window_activity}`. It used to read
 *    `#{session_activity}`, which does not move when a session prints, so a
 *    remote row could never read `running` because work happened.
 *
 *    MEASURED 2026-08-19 on this Mac, tmux 3.6a at /opt/homebrew/bin/tmux, over
 *    a scratch socket, one detached session with no client attached, through
 *    `list-sessions -F` because that is the call this module makes. Phase 83
 *    measured the same question through `display-message`, which is a different
 *    call, and that is why it was re-run:
 *
 *                                    session_activity   window_activity
 *      just created                  1787111236         1787111236
 *      after 3 idle seconds          1787111236         1787111236
 *      after the pane printed a line 1787111236         1787111239
 *      after 3 more idle seconds     1787111236         1787111239
 *      after a second line           1787111236         1787111243
 *
 *    Three things that settles. `#{window_activity}` resolves inside
 *    `list-sessions -F`, because tmux fills the window from the session's
 *    current window, so no second command is needed. It moves when a detached
 *    pane prints, with no client attached anywhere. And `#{session_activity}`
 *    did not move across 7 seconds and two prints.
 *
 *    WHAT IS NOT TRUE OF THAT MEASUREMENT. It was taken on this Mac and on tmux
 *    3.6a. Nobody has taken it on a machine that is not this one, and nobody has
 *    taken it on 3.7b or 3.7c, which are two of the three accepted versions.
 *    This Mac holds no key mac-pro trusts, and that key is Phase 79.1's work.
 *    `build/probe-real-unknowns.mjs` asks the question through the right call
 *    for the day a key exists.
 *
 *    This is finding 6 of docs/research/54-remote-parity.md, closed. It is still
 *    not the local attention verdict, and no remote row ever says `needs input`.
 *  - A REMOTE ROW READS `running` FOR ABOUT 9 SECONDS AFTER IT IS MADE, before
 *    the person has typed anything, and that is new with Phase 85. The shell
 *    that starts in the new session prints its prompt, `#{window_activity}`
 *    moves because of it, and the field cannot tell that output apart from an
 *    agent's. The worst case is the 5,000 ms list that observes the prompt plus
 *    the {@link REMOTE_WORKING_HOLD_MS} hold that follows it. It settles to
 *    `idle` on its own with nothing further to do. MEASURED by step 19 of
 *    `npm run smoke:remote` on 2026-08-19, over a scratch machine on the
 *    loopback address, across three runs. One run read `idle` within 2,000 ms
 *    of the create, and the other two took 6,278 ms and 6,528 ms. Nothing
 *    suppresses it, because the only suppression available would be a rule that
 *    ignores the first move on a new row, and that rule would also hide an
 *    agent that started working straight away.
 *  - A remote session created by 0.34 or 0.35 has no manifest row, because those
 *    builds wrote none. It is a feed row and nothing else, and it cannot be
 *    brought back.
 *
 * ## Three safety properties, and they are the reason this file exists at all
 *
 * A kill or a rename is composed only against an identifier a COMPLETED poll of
 * that machine reported, on a row whose `@gmux-id` equals the session being
 * acted on. With no such row the verb refuses and sends nothing. That is what
 * stops Tortie ending a session on somebody else's machine that happens to
 * share a name, and it is pinned as `machine.remote-target-unbound`.
 *
 * A create refuses unless `prepareMachine` has already signed in to that
 * machine in this run, which is what makes the version gate and the program
 * search list unavoidable. Tortie signs in on a launch, on a wake, or on a
 * person's click, and never because a file changed.
 *
 * A RESTORE is offered only when six facts hold at once, and the sixth is that
 * the machine's own last completed list does not hold the session. The facts are
 * gathered by {@link remoteRestoreFactsFor} here and judged by the pure table in
 * `./restore-gate.ts`. Nothing else in the product decides that question.
 */

import { randomUUID } from 'node:crypto';
import type {
  AgentKind,
  LaunchableAgentKind,
  Session,
  SessionMachine,
  SessionStatus
} from '@shared/types';
import { gmuxError, isGmuxError, GmuxError } from '../errors';
import { getLog } from '../log';
import { managedPaneEnv } from '../tmux/env';
// The one judgement about a failed list, shared with the local reconcile. Only a
// probe that COMPLETED and reported that nothing owns the socket may be read as
// zero sessions (Phase 67).
import { serverProbeVerdict } from '../tmux/errors';
import { dedupeSessionName, sanitizeSessionName } from '../tmux/names';
import {
  getLaunchableEntry,
  launchArgvFor,
  resumeArgvFor,
  type LaunchableEntryLike
} from '../agents/registry';
// The same three the local create path asks, in the same order, so a configured
// agent is confirmed before it can run on another machine as well as on this
// one. They are asked here rather than through `../manifest/agents.ts`'s own
// `launchEntryFor`, which is private to that file, because this rung's central
// rule is that nothing on a remote path touches the manifest. An import from
// there is the first thing a later reader would misread.
import { assertConfigRowMayLaunch } from '../config/confirm';
import { executionFieldsOf } from '../config/overlay';
import { launchableAgentEntry } from '../config/store';
// The wake hook. It runs when the Mac comes back from sleep, and it is the
// second of the three moments Tortie is allowed to sign in to a machine.
import { onMachineWake } from '../power';
import {
  machineContext,
  machineGeneration,
  type RemoteMachineContext
} from './context';
// Phase 123. Two leaves this file used to own, moved out so the six module
// runtime cycle under src/main/machines/ is gone. Both are re-exported below,
// so every caller of this module is unchanged. `./ready-context.ts` holds the
// readiness check `./dir-list.ts` and `./remote-image.ts` ask for, and
// `./remote-stamps.ts` holds the four stamp names and the two pure composers
// `./pane-env-rescue.ts` asks for. This file imports all three of those files,
// which is why it could not also be what they import.
import { readyRemoteContext } from './ready-context';
import { REMOTE_STAMPS, oneLine, remoteStampArgs } from './remote-stamps';
import { execOn } from './exec-plane';
import { machineColorOf, machineLabelOf, machineRow } from './store';
// Phase 72, widened in Phase 84. The per machine program path, captured on that
// machine and recorded against that machine's id. Since Phase 84 it is also
// what launches: a pane on the far side does not get that machine's login shell
// program list, and `-e PATH=` cannot give it one. See `remoteCreate` below.
import { findRemoteProgram, type RemoteProgramAnswer } from './remote-argv';
// Phase 109. The fold back: a create that really ran the file test teaches
// the per machine agent map, on both arms, for zero extra round trips.
import { noteMachineAgent } from './machine-agents';
// Phase 84, item 5. The folder is asked about before the create line is
// composed, because a create against a folder that is not there exits 0.
import { assertRemoteDirUsable } from './dir-list';
// Phase 72. The ONE place a remote session meets the manifest. This file imports
// nothing else from `../manifest/`, which is how the boundary stays checkable.
import {
  conversationSyncedAt,
  markRemoteCreateUnconfirmed,
  noteRemoteRowSeen,
  remoteManifest,
  remoteManifestInstalled,
  remoteRecordOf,
  remoteRecordsForMachine,
  unconfirmedRemoteRecords,
  writeRemoteRow,
  // Phase 118. A TYPE, re-exported by the one module this file reaches the
  // manifest through. The plan below is a list of these and it writes nothing.
  type MachineTombstoneEntry
} from './remote-record';
// Phase 117. The pure table that decides what one read at the end of a create is
// allowed to prove. This module composes the read and acts on the answer.
import {
  classifyConfirmationFailure,
  confirmationArgs,
  confirmationDisposition,
  confirmationWhy,
  readConfirmationEnvironment,
  type RemoteCreateConfirmation
} from './create-confirmation';
// Phase 72. The pure table that decides whether a session on another machine may
// be brought back. This module gathers the facts and nothing else.
import {
  remoteRestoreVerdict,
  type RemoteRestoreFacts,
  type RemoteRestoreVerdict
} from './restore-gate';
import type { MachineTombstone } from '../manifest/codecs';
// The case table, and the only place a machine level status is decided.
import {
  machineTruth,
  type MachineEvent,
  type MachineTruth
} from './status-truth';
// The rescue for a create whose link died between the new-session line and the
// option stamp, plus the set of ids this run issued.
import {
  clearIssuedRemoteId,
  foreignRemoteIds,
  forgetForeignMemo,
  issuedRemoteIdHeld,
  issuedRemoteIdsFor,
  noteIssuedRemoteId,
  rescueNeeded,
  rescueRemoteRow,
  seedIssuedRemoteIds
} from './pane-env-rescue';
// The live connection. This module hands it a context and a sink; it never
// resolves a context of its own and never holds a row.
import {
  noteMachineAnswered,
  noteMachineConnecting,
  noteMachineQuiet,
  closeControlPlane,
  closeEveryControlPlane,
  isControlPlaneLive,
  openControlPlane,
  setControlPlaneSink
} from './control-plane';
import {
  CREATE_ANSWER_LOST,
  REMOTE_DIR_MISSING,
  TARGET_UNBOUND,
  noRemoteRowFor
} from './remote-copy';
// Phase 73, item 2. The allowlist for the two names a create may put on a
// session on another machine. It is pure, so `remoteCreateArgs` stays a
// function the conformance gate can read without starting anything.
import { assertRemoteEnvAllowed } from './remote-env';

// The re-export half of the Phase 123 move. Every existing caller of these four
// names goes on reading them from this module.
export { readyRemoteContext };
export { REMOTE_STAMPS, oneLine, remoteStampArgs };

const machinesLog = getLog('config');

// ---------------------------------------------------------------------------
// The formats
// ---------------------------------------------------------------------------

/**
 * The list format. One space between fields, and every field quoted by tmux
 * itself with `#{q:...}`.
 *
 * ## Why not a tab, which is what research 51 section 4.3 drafted
 *
 * MEASURED 2026-08-17 with tmux 3.6a, first over a scratch connection and then
 * reproduced locally with `env -i`:
 *
 *   env -i tmux -f /dev/null new-session -d -P -F '#{session_id}<TAB>#{session_name}'
 *     printed  $0_p70 tabtest
 *
 *   env -i LC_ALL=en_US.UTF-8 tmux -f /dev/null new-session -d -P -F '...'
 *     printed  $0<TAB>p70 tabtest
 *
 * A tab in a format comes back as an underscore when the client has no UTF-8
 * locale, and a command sent over a connection has no locale unless both sides
 * were configured to forward one. That is Bug C from Phase 9.2 in a new place:
 * tmux classifies a client by string-scanning LC_ALL, LC_CTYPE and LANG for
 * "UTF-8", and a client it decides is not UTF-8 gets an underscore for anything
 * it will not pass through. The local `-u` flag fixes it for a client Tortie
 * spawns directly, and the exec plane cannot use it, because `-u` would stand
 * where the verb ledger reads the verb.
 *
 * So the separator is a single space, which every client passes through, and
 * every field is wrapped in tmux's own quoting. MEASURED on the same run:
 * `#{q:session_name}` turns `a b\c"d'e$f;g` into `a\ b\\c\"d\'e\$f\;g`, which is
 * printable ASCII whatever the locale is. {@link splitQuotedLine} undoes it.
 *
 * ## The field order
 *
 * The four free-form fields still stand LAST, in that order. With every field
 * quoted that is no longer load bearing, and it is kept because a reader should
 * not have to know about the quoting to see that the format is safe.
 *
 * ONE FIELD MORE THAN RESEARCH 51 SECTION 4.3 LISTS, being `#{session_name}`,
 * and the phase report names it. Two things need the name the far side actually
 * holds: picking a name for a new session that does not collide with one already
 * there, and knowing whether a rename would be a no-op. Neither can be answered
 * from `@gmux-name`, which is the display name a person typed.
 *
 * A row that does not split into exactly {@link REMOTE_LIST_FIELDS} parts is not
 * read at all.
 *
 * ## The third field, replaced in Phase 85
 *
 * It was `#{q:session_activity}` and it is now `#{q:window_activity}`. The
 * measurement is in this file's header. The field was REPLACED rather than
 * added to, for three reasons. Nothing else in the product reads
 * `#{session_activity}`. A tenth field is a tenth thing that can be quoted
 * wrongly. And leaving the old field in the format would leave this module and
 * `../activity/panes.ts` still disagreeing about what it means.
 *
 * {@link REMOTE_LIST_FIELDS} stays 10 and the four free-form fields stay last,
 * in the same order.
 */
export const REMOTE_LIST_FORMAT =
  '#{q:session_id} #{q:session_created} #{q:window_activity} ' +
  '#{q:session_attached} #{q:@gmux-id} #{q:@gmux-agent} ' +
  '#{q:session_name} #{q:@gmux-project} #{q:session_path} #{q:@gmux-name}';

/** How many fields {@link REMOTE_LIST_FORMAT} prints. */
export const REMOTE_LIST_FIELDS = 10;

/**
 * The create format. ONE field, so there is no separator to get wrong.
 *
 * `new-session -P -F` hands back the immutable identifier in the same call, so
 * there is no list round trip to race. The name is not asked for, because this
 * process chose it.
 */
export const REMOTE_CREATE_FORMAT = '#{session_id}';

// ---------------------------------------------------------------------------
// The cadence
// ---------------------------------------------------------------------------

/**
 * How often a machine is asked for its list while a Tortie window is in front.
 *
 * 5,000 ms. CHOSEN, NOT MEASURED. Nobody has measured what it costs over a
 * tailnet with real packet loss.
 *
 * SINCE PHASE 85 IT IS TRUE OF EVERY MACHINE. It used to apply only to a machine
 * on the fallback timer, and a machine on a live connection listed on that
 * machine's own events instead. Both feeds now carry it, which is what lets
 * `remoteStatusNote` in `../../renderer/machines/session-badge.ts` state one number on
 * a remote row's tooltip and have it be true whichever feed drew the row.
 */
export const REMOTE_POLL_FOCUSED_MS = 5_000;

/**
 * The same when no Tortie window has focus. 30,000 ms, chosen for the same
 * reason. Neither feed STOPS on a focus change, because a Tortie window can be
 * on screen without having focus and a person reads the dots in that state.
 */
export const REMOTE_POLL_IDLE_MS = 30_000;

/** How long one poll gets before it is killed. */
export const REMOTE_POLL_TIMEOUT_MS = 10_000;

/**
 * How long a row that moved keeps reading `running` with no further move.
 *
 * 4,000 ms. CHOSEN, NOT MEASURED, and it is a guard put in before the case it
 * guards against can occur. Two lists a cadence apart are what the delta rule
 * below was written for. Phase 85 puts a list on a timer BESIDE the live
 * connection, and the connection lists on its own events, so two lists can now
 * land 200 ms apart and the second would read no move and write idle over a row
 * that is working.
 *
 * The number is under the 5,000 ms focused cadence, so a row that stops printing
 * reads idle at the very next tick. It is over the gap between a timer list and
 * an event list that follows it, so a create or a rename on the machine cannot
 * blink a working row to idle and back.
 */
export const REMOTE_WORKING_HOLD_MS = 4_000;

/**
 * How often one row's `last_seen` is written to the manifest when nothing about
 * it moved.
 *
 * 15,000 ms. The number is copied from `ACTIVITY_WRITE_MS` in
 * `../activity/monitor.ts`, which is the same throttle this Mac's own tier
 * applies to the same kind of write.
 *
 * It exists because Phase 85 gave a connected machine a list every 5,000 ms.
 * Before this phase a connected machine completed a pass only when the machine
 * reported an event, so writing `last_seen` for every held row on every pass
 * cost almost nothing. On a cadence it would be 12 reads and 12 writes a minute
 * for every remote row. A row whose STATUS moved is written every time, whatever
 * this throttle says.
 */
export const REMOTE_LAST_SEEN_WRITE_MS = 15_000;

// ---------------------------------------------------------------------------
// The rows
// ---------------------------------------------------------------------------

/** One line of {@link REMOTE_LIST_FORMAT}, parsed. Pure data. */
export interface RemoteListRow {
  /** The far side's immutable identifier, e.g. `$4`. */
  readonly tmuxId: string;
  /** Epoch ms the session was created, from that machine's clock. */
  readonly createdAt: number;
  /**
   * Epoch ms of the last OUTPUT that machine's server saw for this session,
   * from that machine's clock.
   *
   * Since Phase 85 it is `#{window_activity}`, which is the same sentence
   * `PaneFacts.activityAt` in `../activity/panes.ts` already carries for this
   * Mac. It is only ever compared with another `activityAt` from the same
   * machine, per research 51 section 4.4's clock rule.
   */
  readonly activityAt: number;
  readonly attached: boolean;
  /** The `@gmux-id` stamp. Empty when the session is not Tortie's. */
  readonly gmuxId: string;
  readonly agent: string;
  /** The name that machine's own server holds. */
  readonly tmuxName: string;
  readonly projectPath: string;
  /** The far side's working directory for the session. */
  readonly cwd: string;
  /** The `@gmux-name` stamp, being the display name a person typed. */
  readonly name: string;
}

/** One remote session as this process remembers it between polls. */
export interface RemoteSessionRow {
  readonly id: string;
  readonly machineId: string;
  readonly tmuxId: string;
  readonly tmuxName: string;
  readonly name: string;
  readonly agent: AgentKind;
  readonly projectPath: string;
  readonly cwd: string;
  readonly createdAt: number;
  readonly activityAt: number;
  readonly status: SessionStatus;
  /**
   * THIS MAC'S clock, at the last list that saw this row's activity move.
   *
   * 0 until a move has been seen. It is a local instant on purpose, and it is
   * compared only with another local instant, so no far side time is ever
   * subtracted from one of this Mac's. It is what the hold window in
   * {@link remoteRowStatus} reads.
   */
  readonly movedAt: number;
}

/** What one machine's polling knows. */
interface MachineSessions {
  /** The rows the last completed poll reported, by `@gmux-id`. */
  rows: Map<string, RemoteSessionRow>;
  /**
   * Rows a completed poll stopped reporting. Held in memory for the rest of
   * this Tortie run, because a machine keeps no record of a session that ended
   * and this Mac writes none.
   */
  gone: Map<string, RemoteSessionRow>;
  /** True when the last pass completed, whatever it found. */
  answering: boolean;
  /** True once any pass has completed for this machine in this run. */
  everAnswered: boolean;
  /**
   * The last machine level verdict, from `./status-truth.ts`.
   *
   * It is the ONLY thing that decides a status for a whole machine. A row that
   * a completed pass proved absent keeps its own proven status instead, which is
   * what the `gone` map holds.
   */
  truth: MachineTruth;
  /** Epoch ms stamped BEFORE the command was issued, per research 51 §4.4. */
  snapshotAt: number;
  /** Sessions on that machine carrying no `@gmux-id`. Logged, never shown. */
  foreign: number;
  /**
   * EVERY session name that machine's server holds, Tortie's and not.
   *
   * It is separate from `rows` on purpose. A new session's name is deduped
   * against all of them, because tmux refuses a duplicate whoever created it,
   * and a session Tortie did not create is exactly the one its own registry
   * cannot see. That is what a local create has always done, through
   * `listSessions({ includeControl: true })`.
   */
  names: Set<string>;
  timer: NodeJS.Timeout | null;
  /**
   * The status list that runs BESIDE a live connection (Phase 85).
   *
   * It is a second, separately named timer rather than the fallback one, and
   * that is the whole reason it has its own field. The fallback timer and the
   * connection stay exclusive, which is what {@link machinesWithBothFeeds}
   * counts and what `./exec-smoke.ts` asserts. This one is armed only while
   * {@link MachineSessions.onControl} is true.
   *
   * It exists because the connection reports membership and renames and never
   * reports output, so a field that moves is no use until somebody re-reads it.
   */
  statusTimer: NodeJS.Timeout | null;
  /**
   * How many lists for this machine are in flight right now.
   *
   * The status timer skips a tick while it is above zero, so a machine that is
   * slow to answer gets one command outstanding rather than a queue. A list a
   * person or an event asked for is never skipped, which is why this is a count
   * rather than a flag: two outstanding lists must not be cleared by whichever
   * of them finishes first.
   */
  listsInFlight: number;
  /**
   * THIS MAC'S clock at the last `last_seen` write for each row, by Tortie id.
   *
   * It is what {@link REMOTE_LAST_SEEN_WRITE_MS} throttles against.
   *
   * IT IS PRUNED ON EVERY COMPLETED PASS. A completed pass reports the whole
   * membership of the machine, so a key that pass did not report names a
   * session that is no longer there and it is dropped. Without that the map
   * grew by one entry for every session that ever ran on the machine during a
   * run, and only removing the machine cleared it.
   */
  lastSeenWriteAt: Map<string, number>;
  /**
   * True while this machine has a live connection.
   *
   * It is what makes the two feeds exclusive. {@link armTimer} refuses to arm a
   * timer while it is true, and the connection's own `connected` handler clears
   * the timer, so one machine can never carry both feeds at once.
   */
  onControl: boolean;
  /** True while a pass is running, so a rescue cannot re-enter one. */
  passing: boolean;
  /**
   * The last machine level status this feed wrote to the manifest for this
   * machine, or null when it has written none (Phase 72).
   *
   * It exists so a machine that is down does not rewrite `unknown` over every
   * one of its rows every five seconds. The write itself already skips a row
   * whose status has not moved, and this skips the whole scan.
   */
  lastMachineStatus: SessionStatus | null;
  /**
   * True once this run has rebuilt the issued set for this machine from the
   * manifest (Phase 117).
   *
   * The seed runs once per machine, at the top of the first pass. It is here
   * rather than in `./remote-record.ts` because calling it from the manifest
   * side would make that module import `./pane-env-rescue.ts`, and that closes a
   * new runtime cycle the architecture audit is already counting six of.
   */
  seeded: boolean;
}

const machines = new Map<string, MachineSessions>();

/** True while a window has focus. Decides which of the two cadences is used. */
let pollFocused = true;

/**
 * This Mac's clock at the last list {@link pollOnFocusGain} issued, or 0.
 *
 * It is what stops a person switching between two programs from asking every
 * machine once per switch.
 */
let lastFocusPollAt = 0;

/** Called after any change a surface would draw. */
type Listener = () => void;
let listeners: Listener[] = [];

/** The wake hook's unsubscribe, so a reset leaves nothing registered. */
let unhookWake: (() => void) | null = null;

function stateOf(machineId: string): MachineSessions {
  const found = machines.get(machineId);
  if (found !== undefined) return found;
  const fresh: MachineSessions = {
    rows: new Map(),
    gone: new Map(),
    answering: false,
    everAnswered: false,
    // A machine nobody has asked yet is one Tortie cannot see, which is exactly
    // what the transport-lost arm says. It is not `listed`, because no list has
    // completed and reading a stale row as live would be the claim this rung
    // exists to stop.
    truth: machineTruth({ kind: 'transport-lost', at: 0, errorClass: 'not asked yet' }),
    snapshotAt: 0,
    foreign: 0,
    names: new Set(),
    timer: null,
    statusTimer: null,
    listsInFlight: 0,
    lastSeenWriteAt: new Map(),
    onControl: false,
    passing: false,
    lastMachineStatus: null,
    seeded: false
  };
  machines.set(machineId, fresh);
  return fresh;
}

/**
 * Apply one machine level event to one machine, and to no other machine.
 *
 * THIS IS THE PER MACHINE BOUNDARY, and it is one function on purpose. Every
 * transport fact enters here, gets its verdict from the one case table, and is
 * written against one key of one map. A machine cannot move another machine's
 * rows because there is no code path that reaches two keys.
 */
function applyMachineEvent(machineId: string, event: MachineEvent): MachineTruth {
  const state = stateOf(machineId);
  const truth = machineTruth(event);
  state.truth = truth;
  state.answering = event.kind === 'listed' || event.kind === 'no-server';
  if (state.answering) {
    state.everAnswered = true;
    noteMachineAnswered(machineId, event.at);
  }
  // PHASE 72. The same verdict, written to the manifest rows this machine owns.
  //
  // It matters across a relaunch rather than inside one. The projection below
  // computes a live status from this machine's current state on every read, so
  // the window shows the right thing without any of this. What the manifest
  // carries is what Tortie will believe at the NEXT launch, before any machine
  // has answered, and a row that says `running` about a machine that went away
  // an hour ago is the claim this whole rung exists to stop.
  //
  // Only a verdict that covers every row is written here. A `per-row` verdict is
  // written by the pass itself, row by row, because that is where the rows are.
  if (truth.rows.kind === 'status' && state.lastMachineStatus !== truth.rows.status) {
    state.lastMachineStatus = truth.rows.status;
    for (const record of remoteRecordsForMachine(machineId)) {
      noteRemoteRowSeen(record.id, truth.rows.status, event.at);
    }
  }
  if (truth.rows.kind === 'per-row') state.lastMachineStatus = null;
  return truth;
}

function announce(): void {
  for (const listener of [...listeners]) listener();
}

/** Subscribe to remote row changes. Returns the unsubscribe. */
export function onRemoteSessionsChanged(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((one) => one !== listener);
  };
}

// ---------------------------------------------------------------------------
// The pure composition
// ---------------------------------------------------------------------------

/** What a remote create needs. Every path in it belongs to the other machine. */
export interface RemoteCreateInput {
  readonly machineId: string;
  /** The display name the person typed. */
  readonly name: string;
  /** The project tab's path, ON THAT MACHINE. */
  readonly projectPath: string;
  /**
   * The working directory, ON THAT MACHINE. ABSENT means the person named none.
   *
   * PHASE 84 MADE IT OPTIONAL, and the old shape was a defect rather than a
   * simplification. `../sessions/core.ts` composed `input.cwd ?? input.projectPath`,
   * and `projectPath` is the project tab's path ON THIS MAC. So an empty
   * Directory field started the session in a folder named after this Mac's
   * project, on the other computer, or failed.
   *
   * When it is absent no `-c` is sent at all, and tmux's own fallback on that
   * machine is that machine's home directory. That is a fact about the machine
   * rather than a guess made here, which is why Tortie does not compose a home
   * path of its own to put in its place.
   */
  readonly cwd?: string;
  readonly agent: LaunchableAgentKind;
  readonly extraArgs?: readonly string[];
}

/**
 * The `new-session` argv, composed. Pure, so the conformance gate can read it
 * without starting anything.
 *
 * The two identity variables ride the `new-session` line itself, which is what
 * makes a lost answer survivable: a create whose reply never arrived still
 * produced a session that can be identified by reading its environment back.
 */
export function remoteCreateArgs(input: {
  readonly tmuxName: string;
  /** ABSENT sends no `-c` at all. See {@link RemoteCreateInput.cwd}. */
  readonly cwd?: string;
  readonly sessionId: string;
  readonly argv: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
}): string[] {
  const args = [
    'new-session',
    '-d',
    '-P',
    '-F',
    REMOTE_CREATE_FORMAT,
    '-s',
    input.tmuxName
  ];
  // PHASE 84. Evaluated on the far side, and sent only when the person named a
  // folder. The local existsSync check every local create makes is deliberately
  // skipped, per research 51 section 4.3: the folder is not on this Mac, so this
  // Mac cannot answer for it. `./dir-list.ts` asks the MACHINE instead, before
  // this function is called, because a create against a folder that is not there
  // exits 0 and leaves the pane in the home directory with no error at all.
  if (input.cwd !== undefined && input.cwd.length > 0) {
    args.push('-c', input.cwd);
  }
  // PHASE 73, item 2. Every name that reaches this loop is checked against the
  // three Tortie is allowed to put on a session on another machine. PHASE 84
  // added the third, being PATH, and `./remote-env.ts` writes out why the
  // argument below fails for it in every clause. The trace
  // behind the refusal is in docs/research/52-remote-env-and-review.md, and the
  // short version is that a value sent this way is one element of the argv of
  // the local ssh process and one element of the argv of that machine's own
  // tmux, so it stands in two process tables at once for the life of the
  // create. On this Mac an account cannot read another account's arguments. No
  // Linux machine was measured, so a passthrough is refused rather than offered
  // with a warning. It is asked BEFORE the loop, so a refused create composes
  // nothing and sends nothing.
  const env = { ...managedPaneEnv(input.sessionId), ...input.env };
  assertRemoteEnvAllowed(env);
  for (const [key, value] of Object.entries(env)) {
    args.push('-e', `${key}=${value}`);
  }
  if (input.argv.length > 0) args.push('--', ...input.argv);
  return args;
}

/** The list argv. Pure. */
export function remoteListArgs(): string[] {
  return ['list-sessions', '-F', REMOTE_LIST_FORMAT];
}

/**
 * Split one line of the list format into its fields, undoing tmux's own quoting.
 * Pure.
 *
 * The rule is the one `#{q:...}` writes: a backslash escapes the next character,
 * and an unescaped space ends a field. An empty field is an empty string, which
 * is what an option nobody set prints as.
 */
export function splitQuotedLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let escaped = false;
  for (const ch of line) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === ' ') {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

/**
 * Read one line of the list format. Pure. Null when the line is not readable.
 *
 * A row carrying no `@gmux-id` is NOT OURS. It is parsed, because the count of
 * them is worth a log line, and it is never shown, never adopted and never
 * killed.
 */
export function parseRemoteListLine(line: string): RemoteListRow | null {
  if (line.length === 0) return null;
  const parts = splitQuotedLine(line);
  if (parts.length !== REMOTE_LIST_FIELDS) return null;
  const tmuxId = parts[0] ?? '';
  if (!tmuxId.startsWith('$')) return null;
  const created = Number(parts[1]);
  const activity = Number(parts[2]);
  return {
    tmuxId,
    createdAt: Number.isFinite(created) ? created * 1000 : 0,
    activityAt: Number.isFinite(activity) ? activity * 1000 : 0,
    attached: Number(parts[3]) > 0,
    gmuxId: parts[4] ?? '',
    agent: parts[5] ?? '',
    tmuxName: parts[6] ?? '',
    projectPath: parts[7] ?? '',
    cwd: parts[8] ?? '',
    name: parts[9] ?? ''
  };
}

/** What the last completed list knew about one row, for the ladder below. */
export interface RemoteRowMemory {
  /** That machine's clock, from the last list that held this row. */
  readonly activityAt: number;
  /** THIS MAC'S clock, at the last list that saw the activity move. 0 if none. */
  readonly movedAt: number;
}

/** One row's status, and the instant the move behind it was seen. */
export interface RemoteRowVerdict {
  readonly status: SessionStatus;
  /** THIS MAC'S clock, carried forward so the hold window can be measured. */
  readonly movedAt: number;
}

/**
 * The status one list gives one row.
 *
 * The whole ladder is here so the rule can be read in one place:
 *
 *   the row is there and activity moved      -> running
 *   the row is there and it moved recently   -> running, for the hold window
 *   the row is there and neither is true     -> idle
 *   the row is gone and the machine answered -> restorable
 *   the machine did not answer               -> unknown
 *
 * PHASE 85 ADDED THE SECOND RUNG, and it is the only thing that changed. The
 * delta rule underneath is sound only when the two lists it compares are a
 * cadence apart, which was true while a connected machine listed on its own
 * events alone. It now lists on a 5,000 ms timer as well, so two lists can land
 * 200 ms apart and the second would read no move and write idle over a row that
 * is working. The hold window is {@link REMOTE_WORKING_HOLD_MS}.
 *
 * BOTH SIDES OF EVERY SUBTRACTION ARE THIS MAC'S CLOCK. `snapshotAt` is stamped
 * here before the list is issued and `movedAt` is a value this function wrote,
 * so no time from the far side is ever compared with a local one. That is
 * research 51 section 4.4's clock rule, and it is why the hold is measured in
 * local time rather than in the machine's own activity stamps.
 *
 * ## THE PHASE 173 RULING (2026-08-30), and it binds every stillness grader
 *
 * The fault matrix went red on rows 1 and 5 on 2026-08-24 with "a row moved
 * between idle and running" under transport loss and clock skew, and Phase
 * 173 adjudicated which side was wrong. The answer is neither the faults nor
 * this ladder: the ladder moved the rows, and it was telling the truth. Since
 * Phase 85 this function IS the promise that a row moves between idle and
 * running whenever the far side prints and stops printing. A freshly created
 * shell prints its prompt and settles to idle within seconds, and a session
 * the harness typed noise into settles the same way. Both red rows armed
 * their status watchers inside that settling window, timestamped in the
 * Phase 173 run at under seven seconds after the create and five seconds
 * after the noise, and then graded the settle as if the fault had moved the
 * row. Status truth had not drifted: the same run showed transport loss
 * writing unknown on the cut machine's rows in 175 ms and nothing anywhere
 * else, and a 48 hour skew moving no status, no capsule stamp and no
 * snapshot stamp, because both sides of every subtraction in this file are
 * this Mac's clock.
 *
 * So the ruling: a grader may assert stillness over this ladder only from a
 * SETTLED baseline, being idle for a quiet session and running for one that
 * keeps printing, and it must record that the baseline settled or fail. What
 * a fault may never write is unchanged and stays graded hard: a lost link
 * writes unknown on the machine it lost and touches nothing else, and a
 * skewed clock moves nothing at all. The measurement lives in
 * `../harness/remote-matrix.ts` and the graders in `build/remote-matrix.mjs`,
 * and both carry this ruling by name.
 *
 * A row seen for the first time is `idle`, because there is no previous list for
 * anything to have moved since. `needs_input` is never produced here. The status
 * oracles read local disk and cannot run on another machine, and pretending
 * otherwise would be the one status rule Tortie does not break.
 *
 * @param previous what the last completed list knew, or undefined on first sight
 * @param activityAt that machine's clock, from this list
 * @param snapshotAt this Mac's clock, stamped before this list was issued
 */
export function remoteRowStatus(
  previous: RemoteRowMemory | undefined,
  activityAt: number,
  snapshotAt: number,
  holdMs: number = REMOTE_WORKING_HOLD_MS
): RemoteRowVerdict {
  if (previous === undefined) return { status: 'idle', movedAt: 0 };
  if (activityAt > previous.activityAt) {
    return { status: 'running', movedAt: snapshotAt };
  }
  const held =
    previous.movedAt > 0 && snapshotAt - previous.movedAt < holdMs;
  return {
    status: held ? 'running' : 'idle',
    movedAt: previous.movedAt
  };
}

// ---------------------------------------------------------------------------
// The reads a caller makes
// ---------------------------------------------------------------------------

/** True when this id names a row on a machine rather than a manifest row. */
export function isRemoteSessionId(sessionId: string): boolean {
  return remoteSessionRow(sessionId) !== null;
}

/** One remote row by Tortie's id, live or ended. Null when nothing holds it. */
export function remoteSessionRow(sessionId: string): RemoteSessionRow | null {
  for (const state of machines.values()) {
    const live = state.rows.get(sessionId);
    if (live !== undefined) return live;
    const gone = state.gone.get(sessionId);
    if (gone !== undefined) return gone;
  }
  return null;
}

/**
 * What the badge draws for one machine, for one row.
 *
 * PHASE 72 MADE IT PER ROW. `canRestore` and `restoreReason` ride on this object
 * because that is where the renderer already looks, and two of the six
 * conditions behind them are facts about the row rather than about the machine.
 * A caller with no row in hand passes none and gets `canRestore: false` with the
 * machine level reason, which is the honest answer to "may I restore an
 * unnamed session".
 */
export function remoteSessionMachine(
  machineId: string,
  sessionId?: string
): SessionMachine {
  const row = machineRow(machineId);
  const state = machines.get(machineId);
  const verdict =
    sessionId === undefined
      ? remoteRestoreVerdict(machineFactsFor(machineId, 'unknown'))
      : remoteRestoreVerdictFor(sessionId, machineId);
  return {
    id: machineId,
    label: row === null ? machineId : machineLabelOf(row),
    color: row === null ? 'blue' : machineColorOf(row),
    // A machine nobody has polled yet has not failed to answer, and drawing it
    // as quiet would be a claim Tortie cannot back.
    answering: state === undefined ? true : state.answering,
    canRestore: verdict.offered,
    restoreReason: verdict.reason,
    // PHASE 73, item 5. A staleness statement and never a currency statement.
    // Null means there is no copy, which includes the case where a copy was
    // refused for being too large: a refusal is not a copy, and the panel says
    // what happened from the record beside the bytes rather than from a number
    // that would read as one.
    conversationSyncedAt:
      sessionId === undefined ? null : conversationSyncedAt(sessionId)
  };
}

/** Every remote FEED row, projected for the renderer, oldest machine id first. */
export function remoteSessions(): Session[] {
  const out: Session[] = [];
  for (const machineId of [...machines.keys()].sort()) {
    const state = stateOf(machineId);
    for (const row of state.rows.values()) {
      out.push(projectRow(row, state));
    }
    for (const row of state.gone.values()) {
      out.push(projectRow(row, state, true));
    }
  }
  return out;
}

/**
 * One row as a surface reads it.
 *
 * The machine's verdict decides the status of every LIVE row, and the verdict
 * comes from the one case table. A row a completed pass proved absent carries
 * its own status and keeps it, because a completed pass is evidence and a later
 * lost link does not un-prove it. That is the same shape Phase 70 gave `exited`,
 * with `restorable` in its place.
 */
function projectRow(
  row: RemoteSessionRow,
  state: MachineSessions,
  proven = false
): Session {
  const verdict = state.truth.rows;
  const status: SessionStatus =
    proven || verdict.kind === 'per-row' ? row.status : verdict.status;
  return {
    id: row.id,
    name: row.name,
    tmuxName: row.tmuxName,
    projectPath: row.projectPath,
    cwd: row.cwd,
    agent: row.agent,
    status,
    createdAt: row.createdAt,
    machine: remoteSessionMachine(row.machineId, row.id)
  };
}

/**
 * A MANIFEST row for a session on another machine, projected for the renderer
 * (Phase 72).
 *
 * ## Why the two sources are merged this way, and it is the part most likely to
 * go wrong
 *
 * After this rung a live remote session is in both places: the machine's own
 * list, read every pass, and a manifest row written at create time. The rule is
 * one row per id, and which source supplies which field is decided by which one
 * can be wrong.
 *
 * The MACHINE wins for everything about a session it is currently holding. The
 * name a person typed, the folder, the agent and the create instant all live on
 * the far side as session options, which is what makes them survive a Tortie
 * quit with nothing restored. So when the feed holds this id, this function
 * projects the feed row.
 *
 * The MANIFEST wins when the machine is not holding the session, which is every
 * case where restore is the question. It is the only place the program path on
 * that machine is recorded, and it is the only thing that survives the machine
 * being unreachable, being removed, or the session having ended while Tortie was
 * not running.
 *
 * The STATUS always comes from the machine's current state through the one case
 * table, never from the column. The column is what the next launch starts from,
 * before any machine has answered.
 */
export function projectRemoteRecord(record: {
  readonly id: string;
  readonly name: string;
  readonly tmuxName: string;
  readonly projectPath: string;
  readonly cwd: string;
  readonly agent: AgentKind;
  readonly status: SessionStatus;
  readonly createdAt: number;
  readonly machineId?: string;
}): Session {
  const machineId = record.machineId ?? '';
  const state = machines.get(machineId);
  const live = state?.rows.get(record.id);
  if (live !== undefined && state !== undefined) return projectRow(live, state);
  return {
    id: record.id,
    name: record.name,
    tmuxName: record.tmuxName,
    projectPath: record.projectPath,
    cwd: record.cwd,
    agent: record.agent,
    status: remoteRecordStatus(machineId, record.id, record.status),
    createdAt: record.createdAt,
    machine: remoteSessionMachine(machineId, record.id)
  };
}

/**
 * The status a manifest row for a remote session reads, from the machine's
 * current state (Phase 72).
 *
 * The ladder, and every arm is the case table's answer rather than a new one:
 *
 *   the feed lists it                 the feed's own status
 *   a completed list did not hold it  restorable
 *   the create was never confirmed    unknown
 *   the machine is not answering      unknown
 *   the machine was removed           whatever the row already says
 *
 * PHASE 117 ADDED THE THIRD ARM. Without it a machine that came back would draw
 * an unconfirmed row as `restorable` while the restore gate refused it for being
 * unconfirmed, and the two surfaces would contradict each other on one screen.
 *
 * The last arm is the tombstone's. A removal writes `discarded` on the row in a
 * durable commit, so the row already carries the answer and nothing here should
 * second guess it. A machine that is simply not registered in this run, which is
 * what an unprepared machine looks like, reaches the third arm instead, because
 * `stateOf` gives a machine nobody asked the transport lost verdict.
 */
function remoteRecordStatus(
  machineId: string,
  sessionId: string,
  recorded: SessionStatus
): SessionStatus {
  if (machineRow(machineId) === null) return recorded;
  const state = stateOf(machineId);
  const live = state.rows.get(sessionId);
  if (live !== undefined) return live.status;
  const proven = state.gone.get(sessionId);
  if (proven !== undefined) return proven.status;
  // PHASE 117. The create was never confirmed, so nothing has proved this
  // session either way. It is asked before the machine level arm because it is a
  // fact about the ROW, and a machine that is answering again does not settle it.
  if (issuedRemoteIdHeld(sessionId)) return 'unknown';
  if (state.truth.rows.kind === 'status') return state.truth.rows.status;
  // The machine answered, this pass decided per row, and the row was not in the
  // answer. That is `absent`, and the table gives it `restorable`.
  const absent = machineTruth({ kind: 'absent', at: state.snapshotAt });
  return absent.rows.kind === 'status' ? absent.rows.status : recorded;
}

// ---------------------------------------------------------------------------
// The four verbs
// ---------------------------------------------------------------------------

/**
 * The entry one agent launches from, with the confirm gate asked on the way.
 *
 * EXPORTED SINCE PHASE 84's FIX ROUND, for `./remote-restore.ts`. A restore
 * starts a process on another computer, so it asks the confirm gate the create
 * asks, and it reads the same `extraProbeDirs` the create hands to the program
 * search. Two answers to one question is how the restore came to launch by a
 * bare name the create had already proved does not resolve there.
 *
 * A compiled agent answers from the registry. A configured row answers from the
 * overlay, and its execution fields have to have been agreed to by a person
 * before anything composed from them can run. Null execution hash means the row
 * supplied nothing that can run, so there is nothing to have agreed to and
 * nothing to refuse.
 */
export function remoteLaunchEntry(
  agent: LaunchableAgentKind
): LaunchableEntryLike | null {
  // A plain shell is not an agent and the registry has no row for one. Null
  // rather than a stand in row, so nothing downstream can read an agent's
  // fields for a session that has no agent.
  if (agent === 'shell') return null;
  const merged = launchableAgentEntry(agent);
  if (merged === null) return getLaunchableEntry(agent);
  if (merged.executionHash !== null) {
    assertConfigRowMayLaunch(merged.id, executionFieldsOf(merged));
  }
  return merged;
}

/** True when this agent takes a conversation id on its own launch line. */
function preAssigns(entry: LaunchableEntryLike): boolean {
  return entry.resume.idCapture.mode === 'pre-assign';
}

/**
 * The argv for one agent, by bare name, before the program is found.
 *
 * The bare name is what the search in `./remote-argv.ts` is given. What
 * actually launches on the machine is this argv with `argv[0]` REPLACED by the
 * absolute path that search found, and the reason that is so is written on
 * {@link remoteCreate} because it reverses a rule this file used to state.
 *
 * PHASE 84 PASSES THE SESSION ID, for the agents that take a conversation id on
 * their own launch flag. `launchArgvFor` reads the flag off the same
 * `idCapture` record `../manifest/agents.ts` reads for a local create, so one
 * function owns id injection on both sides. An agent that does not pre-assign
 * is passed nothing and its argv is byte for byte what it was.
 */
function remoteLaunchArgv(
  entry: LaunchableEntryLike | null,
  extraArgs: readonly string[],
  agentSessionId?: string
): string[] {
  if (entry === null) return [];
  return launchArgvFor(entry, extraArgs, undefined, agentSessionId);
}

/**
 * Every name the last completed poll saw on one machine, Tortie's and not.
 *
 * MEASURED 2026-08-17 against a scratch machine: a create that deduped only
 * against Tortie's own rows was refused by tmux with "duplicate session",
 * because the name it picked belonged to a session Tortie did not create. tmux
 * refuses a duplicate whoever made it, so the dedupe has to see all of them.
 */
function takenNames(machineId: string): Set<string> {
  return new Set(stateOf(machineId).names);
}

/** Where a program was found on a machine, and the folder to put on the PATH. */
interface RemoteBin {
  /** The absolute path, or the empty string for a plain shell session. */
  readonly bin: string;
  /** The folder holding it, or the empty string when there is no program. */
  readonly dir: string;
}

/**
 * Where that machine keeps the program this create is about to launch
 * (Phase 72, widened in Phase 84).
 *
 * A read, not a mutation, so it runs before anything is created. Three answers:
 *
 *  - An empty argv is a plain shell session. Tortie chose no program, so there
 *    is nothing to record and the empty string says exactly that.
 *  - An `argv[0]` that is already an absolute path is a configured agent whose
 *    row names one. The person wrote that path and it is theirs, so it is
 *    recorded as given and no question is asked.
 *  - Anything else is a bare name, and the machine is asked where it keeps it.
 *    No answer is a refusal rather than a guess.
 *
 * PHASE 84 PASSES THE AGENT'S OWN PROBE FOLDERS with the question. Before this
 * the machine was asked one question, being what its login shell resolves, and
 * an agent installed anywhere else was reported absent. `./remote-argv.ts` now
 * walks the same three lists `../tmux/resolve.ts` walks on this Mac.
 */
async function remoteBinFor(
  ctx: RemoteMachineContext,
  entry: LaunchableEntryLike | null,
  argv: readonly string[]
): Promise<RemoteBin> {
  const bare = argv[0] ?? '';
  if (bare.length === 0) return { bin: '', dir: '' };
  if (bare.startsWith('/')) {
    const at = bare.lastIndexOf('/');
    return { bin: bare, dir: at > 0 ? bare.slice(0, at) : '/' };
  }
  let found: RemoteProgramAnswer;
  try {
    found = await findRemoteProgram(ctx, bare, entry?.extraProbeDirs ?? []);
  } catch (err) {
    // Phase 109, the free third trigger. A positive absent from a real create
    // is stronger evidence than any scan, so it is folded into the per
    // machine agent map before the refusal travels on. Only the walked-and-
    // found-nothing code is an absence; every other failure says nothing
    // about the agent.
    if (isGmuxError(err, 'AGENT_NOT_ON_MACHINE')) {
      noteMachineAgent(ctx.machineId, bare, null);
    }
    throw err;
  }
  noteMachineAgent(ctx.machineId, bare, { path: found.path });
  // Phase 109, fix 8. The sentence used to say the program was found "after N
  // folder(s) were tested" while N was computed BEFORE the call and the
  // script breaks on the first hit, so the honest number is the size of the
  // search list rather than a count of tests.
  machinesLog.info(
    `${ctx.machineId} keeps ${bare} at ${found.path}, found in its ` +
      `${found.source === 'path' ? 'own list of places it looks for programs' : 'install folders'}. ` +
      `The search list held ${String(found.searched)} folder(s).`
  );
  return { bin: found.path, dir: found.dir };
}

/**
 * True when a create on this machine would get past {@link readyRemoteContext}.
 *
 * PHASE 84, item 8. It asks exactly what that function asks and it asks nothing
 * of the machine, so the create sheet can draw a machine it cannot start a
 * session on as unavailable instead of letting a person pick it, type a name,
 * press Create and read a refusal that sends them back to the screen that just
 * refused them.
 *
 * It is NOT the same question as `usable` on a machine row. That one says a
 * person confirmed the machine, and Settings reads it to decide whether the
 * Prepare button is offered at all. A confirmed machine that is asleep has to
 * keep offering Prepare, because Prepare is the one button that fixes it.
 */
export function machineCanHoldSession(machineId: string): boolean {
  try {
    readyRemoteContext(machineId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a session on a machine.
 *
 * The order is fixed and every step is where it is on purpose:
 *
 *  1. Refuse unless the machine is signed in to and its program list was read.
 *  2. Compose the argv by bare name, asking the agent confirm gate on the way.
 *     An agent that takes a conversation id on its launch flag gets a fresh one
 *     here, which is what makes the row record which conversation it started.
 *  3. Read the machine's list, and pick a name that collides with none of it.
 *     PHASE 84 MOVED THIS AHEAD OF THE PROGRAM SEARCH. The searches below go
 *     through the one door in `./remote-run.ts`, which refuses a machine that
 *     has not answered in this run, and a completed list is what makes it
 *     answer. It is still a read and it still starts nothing.
 *  4. Ask the machine whether the folder is there, when a folder was named. A
 *     read. tmux does NOT refuse a folder that is not there, so this is the only
 *     place that question gets asked.
 *  5. Ask the machine where it keeps that program, walking its own three lists.
 *     A read, before any mutation.
 *  6. Put that absolute path at `argv[0]`. THIS REVERSES A RULE THIS FILE USED
 *     TO STATE, and section 3.4 below is why.
 *  7. Write the manifest row, BEFORE the create line, the same order a local
 *     create uses. A session that starts before its row exists is a session a
 *     crash can strand with a live agent and no record of it.
 *  8. `new-session`, with both identity variables on the line itself.
 *  9. If that failed, ONE read of the environment, to see whether it ran anyway.
 *     A create that truly failed takes its row back out.
 * 10. Stamp the four options. A stamp that fails is logged and the create still
 *     succeeds, because the pane environment already carries the identity.
 * 11. Poll once, at once, so the row is on screen without waiting a cadence.
 *
 * ## 3.4 Why `argv[0]` is an absolute path on a machine, and what that costs
 *
 * Locally an agent is launched by BARE NAME, so that a `pkill -f` over the
 * resolved path does not match every durable session. That is CLAUDE.md's rule
 * and it came from Phase 12.7 F3. Remotely this file used to do the same, on
 * the belief that the machine's own list of places it looks for programs was
 * what a pane gets.
 *
 * MEASURED, and the belief is false. On the operator's Mac Pro, 2026-08-18, a
 * pane gets `/usr/bin:/bin:/usr/sbin:/sbin` while the login shell's own list
 * holds ten folders, and `claude` is at `~/.local/bin/claude`, which is on
 * neither. So a bare name launch cannot work there at all. Two candidates were
 * written and ONE PROBE decided between them rather than an argument.
 *
 * | Candidate | Probe | Verdict |
 * | --- | --- | --- |
 * | Put the folder holding the program on the pane's own PATH with `-e PATH=` and keep the bare name | `build/probe-execplane.mjs` step 17c | REJECTED by measurement |
 * | Send the absolute path as `argv[0]` | none needed | TAKEN, as the recorded fallback |
 *
 * MEASURED 2026-08-18, step 17c, tmux 3.6a. A session was created with
 * `-e PATH=/p84-planted-85507:/usr/bin:/bin` and its pane printed
 * `/Users/gdc/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin`. A second measurement
 * on a scratch socket separated the two possible causes: `-e FOO=bar-planted`
 * DID reach the pane and `-e PATH=` on the same line did NOT, while
 * `show-environment` read both back. So tmux takes a pane's PATH from the
 * server rather than from the session environment, and PATH is the one name an
 * `-e` pair cannot set.
 *
 * ## THE COST, written down rather than absorbed
 *
 * A `pkill -f "$(command -v claude)"` run ON THAT MACHINE now matches every
 * durable Tortie agent on it. That is the failure Phase 12.7 F3 fixed on this
 * Mac, and this phase moves it to the machine. It is taken because the
 * alternative is that no agent can be started on that machine at all, and it is
 * recorded here, in the commit body and in the backlog so that a later round
 * closing it knows what it is closing.
 *
 * ## What is still not true
 *
 * The agent's own CHILDREN still get the pane's four directory PATH. An agent
 * on that machine that shells out to a program outside `/usr/bin` will not find
 * it. Nothing in this phase changes that, and no measurement in this phase says
 * otherwise.
 */
export async function remoteCreate(input: RemoteCreateInput): Promise<Session> {
  if (input.name.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
  }
  const ctx = readyRemoteContext(input.machineId);
  const sessionId = randomUUID();
  const entry = remoteLaunchEntry(input.agent);
  // PHASE 84, item 9. A fresh conversation id for the agents that take one on
  // their own launch flag, and nothing at all for the nine that do not. It is a
  // DIFFERENT value from the session id above, because they are two different
  // things: one names the session Tortie holds and one names the conversation
  // the agent holds. `pre-assign-cmd` is deliberately not done here, because
  // that mode runs a side command and the command would have to run on that
  // machine, which this phase does not build a route for.
  const agentSessionId =
    entry !== null && preAssigns(entry) ? randomUUID() : undefined;
  const argv = remoteLaunchArgv(entry, input.extraArgs ?? [], agentSessionId);
  // Step 3. MEASURED 2026-08-17 against a scratch machine: without this read the
  // first create of a Tortie run picks a name from an empty set, and a machine
  // that already holds a session of that name refuses the whole create with
  // tmux's own "duplicate session". So the names are read first and the new one
  // is deduped against them, which is what a local create has always done. The
  // residual race, being a session created on that machine between this read and
  // the create below, still ends as tmux's own refusal, and that is honest: it is
  // also what makes new-session safe to run twice.
  await pollRemoteMachine(input.machineId);
  const tmuxName = dedupeSessionName(
    sanitizeSessionName(input.name),
    takenNames(input.machineId)
  );
  // Step 4. Before anything is written and before the create line is composed.
  const cwd = input.cwd ?? '';
  await assertRemoteDirUsable(ctx, cwd);
  // Step 5. Before the create, because a machine with no copy of the program is
  // a machine where the create would produce a pane that prints an error and
  // dies, and a refusal naming the program is a better answer than that.
  const { bin } = await remoteBinFor(ctx, entry, argv);
  // Step 6. THE ABSOLUTE PATH IS WHAT LAUNCHES. See the header of this function
  // for the measurement that forced it and for what it costs.
  const launchArgv = bin.length > 0 ? [bin, ...argv.slice(1)] : argv;
  const args = remoteCreateArgs({
    tmuxName,
    ...(cwd.length > 0 ? { cwd } : {}),
    sessionId,
    argv: launchArgv
  });

  // BEFORE the line is sent, and not after. The failure this exists for is a
  // create whose link died between the new-session line and the option stamp
  // below, and an id recorded on the answer would not be recorded for exactly
  // the create that needs rescuing.
  noteIssuedRemoteId({
    id: sessionId,
    machineId: input.machineId,
    name: oneLine(input.name),
    agent: String(input.agent),
    projectPath: oneLine(input.projectPath),
    cwd,
    issuedAt: Date.now()
  });

  // PHASE 72, STEP 6. The durable row, written before the create line, which is
  // §2.4 Step 0 for a session on another machine. `argv[0]` is the path captured
  // ON THAT MACHINE, and every path in the row belongs to that machine.
  //
  // A create that then fails takes the row back out below. A create that runs
  // and loses its answer KEEPS it, because the session is there.
  //
  // PHASE 84. `cwd` is the empty string when the person named no folder, and
  // THE MANIFEST ROW RECORDS EXACTLY THAT. Tortie does NOT compose a home path
  // for the other computer to put in its place, because a recorded path has to
  // be a path a machine stated, and no folder was sent. tmux's own fallback put
  // the pane in that machine's home directory.
  //
  // THE ROW A PERSON READS IS NOT THIS ROW, and the fix round added this
  // sentence because the two were read as one and they disagreed. Once a
  // completed list comes back, `projectRemoteRecord` in this file draws the
  // session from the MACHINE'S row rather than from the manifest row, and the
  // machine reports the folder its pane is really in. So the manifest holds the
  // empty string, meaning Tortie sent no folder, and the session list on screen
  // shows the home directory that machine chose. Both are true and they are
  // answers to two different questions.
  //
  // The three resume fields are written only for an agent that took a
  // conversation id on its own launch line. For every other agent, and for
  // every shell, they are absent and the row says what it always said.
  const createdAt = Date.now();
  writeRemoteRow({
    sessionId,
    machineId: input.machineId,
    name: oneLine(input.name),
    tmuxName,
    projectPath: oneLine(input.projectPath),
    cwd,
    agent: String(input.agent),
    // The row records what ran, which since Phase 84 is the same array that was
    // sent rather than a second composition of it.
    argv: launchArgv,
    bin,
    createdAt,
    ...(entry !== null && agentSessionId !== undefined
      ? {
          agentSessionId,
          resumeArgv: resumeArgvFor(
            entry,
            agentSessionId,
            input.extraArgs ?? [],
            bin
          )
        }
      : {})
  });

  let tmuxId: string;
  try {
    const printed = await execOn(ctx, args);
    tmuxId = (printed.split('\n')[0] ?? '').trim();
  } catch (err) {
    // THE CONFIRMATION READ, and it is not the pane environment rescue.
    //
    // A create can run on the far side and lose its answer, so one read asks
    // whether the session this call just asked for exists. It only ever accepts
    // a uuid this call itself generated seconds ago, and it never looks at a
    // session it did not just ask for. The rescue that re-binds a marked session
    // found at reconcile time with no row pointing at it is Phase 71.
    //
    // PHASE 117 GAVE THAT READ THREE ANSWERS. It used to have two, being an
    // identifier or null, and every failure to read produced null. The caller
    // read null as nothing running and deleted the durable row, so a create that
    // really succeeded on the far side left nothing on this Mac recording it.
    // A machine that did not answer is not a machine that answered no.
    const confirmation = await confirmCreate(ctx, tmuxName, sessionId);
    const disposition = confirmationDisposition(confirmation);
    if (disposition === 'dropRow') {
      // Phase 72. Nothing is running, so the row is a claim about a session that
      // does not exist. The local create path removes its row on a failed spawn
      // for the same reason, and leaving one here would put a permanent
      // `restorable` row on screen for work that never started.
      //
      // PHASE 117 NARROWED WHAT REACHES THIS ARM to the two cases where tmux
      // itself answered, being a machine holding no server at all and a machine
      // that named the session as missing. This is the only caller of
      // `dropRemoteRow` on the confirmation path, and the conformance gate fails
      // on a second one.
      dropRemoteRow(sessionId);
      throw createFailure(err, cwd);
    }
    // The `kind` test is what narrows the answer for the compiler. The table
    // returns `bind` for a present confirmation and for nothing else, and the
    // conformance gate asserts that.
    if (disposition === 'keepUnknown' || confirmation.kind !== 'present') {
      // THE ROW IS KEPT. The session may be running on that machine right now,
      // and deleting the only record of it is the data loss this phase exists to
      // stop. The status column says unknown, the id stays in the issued set so
      // the pane environment rescue can still bind it, and the seed at the top
      // of the next run's first pass puts it back in that set after a restart.
      markRemoteCreateUnconfirmed(sessionId);
      machinesLog.warn(
        `the create on ${input.machineId} could not be confirmed, so the row ` +
          `is kept and marked unknown: ${confirmationWhy(confirmation)}`
      );
      // TMUX_UNREACHABLE rather than SPAWN_FAILED, because nothing here proved a
      // failed spawn. The person reads one sentence saying the state is unknown.
      throw gmuxError(
        'TMUX_UNREACHABLE',
        CREATE_ANSWER_LOST,
        `${input.machineId}: ${confirmationWhy(confirmation)}`
      );
    }
    tmuxId = confirmation.tmuxId;
    machinesLog.warn(
      `the create on ${input.machineId} lost its answer and the session was ` +
        `there: ${(err as Error).message}`
    );
  }
  if (!tmuxId.startsWith('$')) {
    dropRemoteRow(sessionId);
    throw gmuxError(
      'SPAWN_FAILED',
      noRemoteRowFor(input.name),
      `${input.machineId} answered ${JSON.stringify(tmuxId)}`
    );
  }

  // The four stamps, in the order {@link REMOTE_STAMPS} declares them, so the
  // list a reader checks and the list this loop sends are one list. A stamp that
  // fails is logged and the create still succeeds, because the pane environment
  // already carries the identity.
  const stamped: Record<(typeof REMOTE_STAMPS)[number], string> = {
    '@gmux-id': sessionId,
    '@gmux-agent': String(input.agent),
    '@gmux-name': oneLine(input.name),
    '@gmux-project': oneLine(input.projectPath)
  };
  let idStampLanded = false;
  for (const option of REMOTE_STAMPS) {
    try {
      await execOn(ctx, remoteStampArgs(tmuxId, option, stamped[option]));
      if (option === '@gmux-id') idStampLanded = true;
    } catch (err) {
      machinesLog.warn(
        `${input.machineId} did not keep ${option} on ${tmuxId}: ` +
          `${(err as Error).message}`
      );
    }
  }
  // The id is forgotten only when the OPTION stamp landed, because from then on
  // every list reports the session carrying `@gmux-id` and no pass can read it
  // as foreign. A stamp that did not land leaves the id in the issued set, which
  // is exactly what the rescue reads.
  if (idStampLanded) clearIssuedRemoteId(sessionId);

  // Once, at once, so the row is on screen without waiting a cadence, and the
  // machine's feed is running from here on.
  await startMachineFeed(input.machineId);
  const row = remoteSessionRow(sessionId);
  if (row === null) {
    throw gmuxError(
      'SPAWN_FAILED',
      noRemoteRowFor(input.name),
      `${input.machineId} created ${tmuxId} and did not list it back`
    );
  }
  return projectRow(row, stateOf(input.machineId));
}

/**
 * Take back a row written for a create that did not run (Phase 72).
 *
 * A hard delete rather than a tombstone, and the local create path does the
 * same. A tombstone is a record of a session that existed, and this one never
 * did, so leaving one would put a row in Past Sessions for work that was never
 * started.
 */
function dropRemoteRow(sessionId: string): void {
  if (remoteRecordOf(sessionId) === null) return;
  try {
    remoteManifest().deleteSession(sessionId);
  } catch (err) {
    machinesLog.warn(
      `the row for a create that did not run could not be removed: ` +
        `${(err as Error).message}`
    );
  }
}

/**
 * The one read a lost create answer gets (Phase 72, then Phase 117).
 *
 * It returns one of the three answers `./create-confirmation.ts` declares, and
 * the whole of Phase 117 is that the third one exists. The old shape returned an
 * identifier or null, and a broad catch turned every unreadable answer into
 * null, which the caller deleted a durable row on.
 *
 * TWO READS, and each one answers a different question. The environment read
 * asks whether the session this call just asked for is there, and it only ever
 * accepts the uuid this call itself generated seconds ago. The list read then
 * asks for the identifier the machine holds it under, because a kill or a rename
 * is only ever composed against an identifier a machine reported.
 *
 * A machine that answered the first read and could not answer the second is
 * `unreachable` rather than absent. The session was proved to be there, and the
 * only thing missing is the identifier.
 */
async function confirmCreate(
  ctx: RemoteMachineContext,
  tmuxName: string,
  sessionId: string
): Promise<RemoteCreateConfirmation> {
  let printed: string;
  try {
    printed = await execOn(ctx, confirmationArgs(tmuxName));
  } catch (err) {
    const reason = `${(err as Error).message}`;
    return classifyConfirmationFailure(err) === 'provenAbsent'
      ? {
          kind: 'provenAbsent',
          why: `the machine answered and holds no session called ${tmuxName}`
        }
      : { kind: 'unreachable', why: `the machine did not answer: ${reason}` };
  }
  if (readConfirmationEnvironment(printed, sessionId) === 'provenAbsent') {
    return {
      kind: 'provenAbsent',
      why:
        `the machine answered and no session called ${tmuxName} carries the ` +
        `id this create generated`
    };
  }
  let listed: string;
  try {
    listed = await execOn(ctx, remoteListArgs());
  } catch (err) {
    return {
      kind: 'unreachable',
      why:
        `the machine holds the session and did not answer the list that names ` +
        `it: ${(err as Error).message}`
    };
  }
  for (const line of listed.split('\n')) {
    const row = parseRemoteListLine(line);
    if (row === null) continue;
    if (row.gmuxId === sessionId || row.tmuxName === tmuxName) {
      return { kind: 'present', tmuxId: row.tmuxId };
    }
  }
  // The machine answered both reads and they disagree. The environment read is
  // the one that proves the session exists, so this is NOT read as an absence.
  return {
    kind: 'unreachable',
    why: 'the machine holds the session and its list did not name it'
  };
}

/**
 * A failed create, with the plain sentence over tmux's own where it fits.
 *
 * THE FOLDER ARM OF THIS WAS DEAD CODE UNTIL PHASE 84, and that was measured
 * rather than suspected. MEASURED 2026-08-18 on tmux 3.6a over a scratch socket:
 * `new-session -d -s NAME -c /a-path-that-is-not-there -P -F '#{session_id}'`
 * exits 0, prints `$0`, creates a live session and silently puts the pane in the
 * home directory. tmux prints nothing. A create that exits 0 throws nothing, so
 * the {@link REMOTE_DIR_MISSING} branch below never ran for the case it was
 * written for, and a person who typed a folder that is not on the far machine
 * got a session in the wrong place with no sentence saying so.
 *
 * PHASE 84 ASKS THE MACHINE INSTEAD, in `./dir-list.ts`, before the create line
 * is composed. That is where a missing folder is refused now, and this pattern
 * stays for the creates that really do throw, e.g. a machine that answered and
 * then would not start a server.
 */
function createFailure(err: unknown, cwd: string): Error {
  const text = err instanceof Error ? err.message : String(err);
  const detail = err instanceof GmuxError ? String(err.payload.detail ?? '') : '';
  if (/no such file or directory|can't find|not a directory/i.test(`${text}\n${detail}`)) {
    return gmuxError('INVALID_INPUT', REMOTE_DIR_MISSING, cwd);
  }
  return err instanceof Error ? err : new Error(text);
}

/**
 * The row a verb is allowed to act on, or a refusal.
 *
 * A remote kill or rename is composed only against an identifier a completed
 * poll of that machine reported, on a row whose `@gmux-id` equals the id being
 * acted on. With no such row, the verb refuses and sends nothing.
 *
 * @throws GmuxError INVALID_INPUT with {@link TARGET_UNBOUND}.
 */
export function boundRemoteRow(sessionId: string): RemoteSessionRow {
  for (const state of machines.values()) {
    const row = state.rows.get(sessionId);
    if (row !== undefined) return row;
  }
  throw gmuxError(
    'INVALID_INPUT',
    TARGET_UNBOUND,
    `no completed list reported a session carrying ${sessionId}`
  );
}

/** Kill a session on a machine, by an identifier that machine reported. */
export async function remoteKill(sessionId: string): Promise<void> {
  const row = boundRemoteRow(sessionId);
  const ctx = readyRemoteContext(row.machineId);
  await execOn(ctx, ['kill-session', '-t', row.tmuxId]).catch((err: unknown) => {
    // Killing a session that is already gone is the state that was asked for.
    if (isGmuxError(err, 'SESSION_NOT_FOUND')) return;
    throw err;
  });
  const state = stateOf(row.machineId);
  state.rows.delete(sessionId);
  state.gone.set(sessionId, { ...row, status: 'exited' });
  announce();
  await pollRemoteMachine(row.machineId);
}

/** Rename a session on a machine, and move `@gmux-name` with it. */
export async function remoteRename(
  sessionId: string,
  newDisplayName: string
): Promise<Session> {
  if (newDisplayName.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
  }
  const row = boundRemoteRow(sessionId);
  const ctx = readyRemoteContext(row.machineId);
  const taken = takenNames(row.machineId);
  taken.delete(row.tmuxName);
  const tmuxName = dedupeSessionName(sanitizeSessionName(newDisplayName), taken);
  if (tmuxName !== row.tmuxName) {
    await execOn(ctx, ['rename-session', '-t', row.tmuxId, tmuxName]);
  }
  // The display name survives a Tortie quit because it lives on the far side.
  await execOn(
    ctx,
    remoteStampArgs(row.tmuxId, '@gmux-name', oneLine(newDisplayName))
  ).catch((err: unknown) => {
    machinesLog.warn(
      `${row.machineId} did not keep the new name on ${row.tmuxId}: ` +
        `${(err as Error).message}`
    );
  });
  const state = stateOf(row.machineId);
  const updated: RemoteSessionRow = {
    ...row,
    name: oneLine(newDisplayName),
    tmuxName
  };
  state.rows.set(sessionId, updated);
  // Phase 72. The manifest row carries the name too now, and a rename that moved
  // it on the far side and not here would leave the two disagreeing the moment
  // the machine stopped answering, which is exactly when the manifest is read.
  if (remoteRecordOf(sessionId) !== null) {
    try {
      remoteManifest().renameSession(sessionId, oneLine(newDisplayName), tmuxName);
    } catch (err) {
      machinesLog.warn(
        `the new name landed on ${row.machineId} and not in the session list: ` +
          `${(err as Error).message}`
      );
    }
  }
  announce();
  await pollRemoteMachine(row.machineId);
  return projectRow(remoteSessionRow(sessionId) ?? updated, state);
}

/**
 * Forget one remote row.
 *
 * This is what the person's Remove does to a remote row that has ended. It drops
 * the row from memory and NOTHING IS SENT TO ANY MACHINE.
 *
 * Phase 72 gave a remote session a manifest row, so a Remove now writes the same
 * tombstone a local Remove writes, through the ordinary route: the caller in
 * `../sessions/core.ts` calls `markSessionRemoved` for a row that has one. This
 * function is the memory half, and it stays because a session created by 0.34 or
 * 0.35 has no manifest row and forgetting it is still the whole of what can be
 * done for it.
 *
 * Returns false when the id names no remote row in memory.
 */
export function forgetRemoteRow(sessionId: string): boolean {
  for (const state of machines.values()) {
    if (state.gone.delete(sessionId) || state.rows.delete(sessionId)) {
      announce();
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// A machine a person removed (Phase 72)
// ---------------------------------------------------------------------------

/** What Tortie last knew about one row on one machine. */
export interface RemoteRowLastKnown {
  readonly id: string;
  readonly status: SessionStatus;
  /** Local receipt ms of the last completed list that held it. 0 when none did. */
  readonly lastSeenAt: number;
}

/**
 * What Tortie last knew about every row on one machine, from memory and from the
 * manifest together.
 *
 * The memory half is authoritative about status while the app has been running,
 * because it holds what the last completed pass reported. The manifest half is
 * what a row carries across a relaunch, and it is the only half for a machine
 * nobody has signed in to in this run.
 */
export function remoteRowLastKnown(machineId: string): RemoteRowLastKnown[] {
  const out = new Map<string, RemoteRowLastKnown>();
  for (const record of remoteRecordsForMachine(machineId)) {
    out.set(record.id, {
      id: record.id,
      status: record.status,
      // `last_seen` on a remote row is written by every completed list that held
      // it, so it is already the answer, and it is a local receipt time.
      lastSeenAt: record.lastSeen
    });
  }
  const state = machines.get(machineId);
  if (state !== undefined) {
    for (const [id, row] of [...state.gone, ...state.rows]) {
      // A row the last completed pass HELD was seen at that pass's own instant.
      // A row it did not hold keeps whatever instant the manifest already has,
      // because a pass that did not report a session says nothing about when it
      // was last there.
      const lastSeenAt = state.rows.has(id)
        ? state.snapshotAt
        : (out.get(id)?.lastSeenAt ?? 0);
      out.set(id, { id, status: row.status, lastSeenAt });
    }
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * What ONE removal would write, composed and handed back. It writes nothing.
 *
 * PHASE 118 SPLIT THIS OUT OF `forgetMachineRows`. That function composed the
 * tombstones and wrote them one durable commit at a time, so a failure part way
 * through left some rows recorded and some not. The plan and the write are two
 * things now: this composes, `./remote-record.ts` writes every row of it in one
 * transaction, and `./removal.ts` is the one caller of both.
 *
 * The label is read from `machines.json` here, while the row is still in the
 * file, because the caller rewrites that file the moment the transaction
 * commits. A machine with no row at all is named by its id, which is the only
 * name left for it.
 *
 * ROWS WITH NO MANIFEST ROW ARE LEFT OUT, and that is the same answer the old
 * loop gave. A session Tortie only ever saw in a list from that machine was
 * created by a build that recorded nothing about it, so there is nothing to
 * tombstone and dropping it from memory is the whole of what can be done for it.
 * Leaving it in would make the transaction throw SESSION_NOT_FOUND and take a
 * removal down over a row that never existed.
 *
 * A row an earlier removal already tombstoned IS left in. The skip for it lives
 * in `ManifestStore.markMachinesForgotten`, which is what makes a retry after a
 * failure idempotent.
 *
 * NOTHING IS SENT TO THE MACHINE by this function, and nothing could be: it
 * reads two maps and one file on this Mac.
 */
export function machineTombstonePlan(
  machineId: string,
  forgottenAt: number = Date.now()
): MachineTombstoneEntry[] {
  const row = machineRow(machineId);
  const machineLabel = row === null ? machineId : machineLabelOf(row);
  const plan: MachineTombstoneEntry[] = [];
  for (const known of remoteRowLastKnown(machineId)) {
    if (remoteRecordOf(known.id) === null) continue;
    const tombstone: MachineTombstone = {
      v: 1,
      machineId,
      machineLabel,
      lastStatus: known.status,
      lastSeenAt: known.lastSeenAt,
      forgottenAt
    };
    plan.push({ sessionId: known.id, tombstone });
  }
  return plan;
}

/**
 * Let go of one machine in memory, after its record has been written.
 *
 * THREE THINGS HAPPEN AND A FOURTH DELIBERATELY DOES NOT.
 *
 *  1. The in memory rows for that machine are dropped, and both of its timers
 *     are cleared first.
 *  2. The link is closed and the remembered foreign ids go, so a machine added
 *     again later starts from nothing.
 *  3. The surfaces are told.
 *
 * NOTHING IS SENT TO THE MACHINE. Closing the link ends a connection this Mac
 * holds open, which is the same thing quitting Tortie does. No session is ended,
 * no server is stopped and nothing is read.
 *
 * PHASE 118 MADE THIS UNREACHABLE UNTIL THE RECORD IS SAFE. `./removal.ts`
 * calls it only after the tombstone transaction has committed, so a failed
 * removal leaves the machine exactly as it was rather than half forgotten.
 */
export function dropMachineRowsFromMemory(machineId: string): void {
  const state = machines.get(machineId);
  if (state !== undefined) {
    clearTimer(state);
    // PHASE 85. The key is deleted on the next line, so a status list left armed
    // would keep firing against a machine nobody holds and `stateOf` would build
    // the entry again on every tick.
    clearStatusTimer(state);
    state.rows.clear();
    state.gone.clear();
    state.names.clear();
    state.lastSeenWriteAt.clear();
    state.onControl = false;
    state.lastMachineStatus = null;
  }
  machines.delete(machineId);
  // The link goes with the rows. It closes a connection this Mac holds open and
  // sends nothing to the machine, which is the same thing quitting Tortie does.
  closeControlPlane(machineId);
  forgetForeignMemo(machineId);
  announce();
}

/** Tell every surface the remote rows changed. The announce, by its own name. */
export function notifyRemoteRowsChanged(): void {
  announce();
}

// ---------------------------------------------------------------------------
// The restore gate's facts (Phase 72)
// ---------------------------------------------------------------------------

/**
 * True once Tortie has signed in to this machine in this run AND read its own
 * list of places it looks for programs.
 *
 * The same two questions {@link readyRemoteContext} asks, without the throw, so
 * a projection running sixty times a second is not composing error objects for
 * a machine nobody prepared.
 */
function remoteContextReady(machineId: string): boolean {
  let ctx;
  try {
    ctx = machineContext(machineId);
  } catch {
    return false;
  }
  if (ctx.kind !== 'remote') return false;
  return machineGeneration(machineId).remotePath !== null;
}

/**
 * True when Tortie has a route to this machine right now (Phase 72 fix round).
 *
 * EITHER route counts, and that is the whole of this function. The live
 * connection is one. The other is that machine's last pass having COMPLETED
 * over the command route, which is the route a restore itself sends on.
 *
 * The live connection alone was the wrong question. `openControlPlane` opens it
 * only after a read proves the machine's own session server is already running,
 * because opening it against a machine with no server would create one carrying
 * none of Tortie's settings. So a machine whose server died can never have a
 * live connection, and asking for one refused restore for ever in exactly the
 * case restore exists for. Fault matrix row 7 measured that twice.
 */
function machineReachable(machineId: string): boolean {
  if (isControlPlaneLive(machineId)) return true;
  return machines.get(machineId)?.answering ?? false;
}

/** The four machine level facts, with no row in hand. */
function machineFactsFor(
  machineId: string,
  rowStatus: SessionStatus
): RemoteRestoreFacts {
  const state = machines.get(machineId);
  return {
    machineKnown: machineRow(machineId) !== null,
    contextReady: remoteContextReady(machineId),
    machineReachable: machineReachable(machineId),
    completedListSeen: state?.everAnswered ?? false,
    machineAnswering: state?.answering ?? false,
    // With no row in hand nothing can say the far side is not holding it, and
    // "cannot say" is refused rather than allowed.
    listedNow: true,
    // With no row in hand there is no create to have been left unconfirmed, and
    // this matches what the other row level facts above already do.
    createUnconfirmed: false,
    rowMachineId: machineId,
    targetMachineId: machineId,
    rowStatus
  };
}

/**
 * Every fact the restore gate needs about one session, gathered from the six
 * places that own them (Phase 72).
 *
 * It is here rather than in `./remote-restore.ts` because five of the six come
 * out of this module's own maps, and a second module reaching into them would be
 * a second opinion about what this feed knows.
 */
export function remoteRestoreFactsFor(
  sessionId: string,
  targetMachineId?: string
): RemoteRestoreFacts {
  const feed = remoteSessionRow(sessionId);
  // The manifest is asked ONLY when this run's own maps cannot answer. The
  // projection calls this for every row on every change, and a database read per
  // row per change would be the busiest read in the product for an answer the
  // feed already holds.
  const record = feed === null ? remoteRecordOf(sessionId) : null;
  const rowMachineId = feed?.machineId ?? record?.machineId ?? '';
  const target = targetMachineId ?? rowMachineId;
  const state = machines.get(rowMachineId);
  const status = feed?.status ?? record?.status ?? 'unknown';
  return {
    machineKnown: machineRow(target) !== null,
    contextReady: remoteContextReady(target),
    machineReachable: machineReachable(target),
    completedListSeen: state?.everAnswered ?? false,
    machineAnswering: state?.answering ?? false,
    // THE DOUBLE RUN GUARD'S OWN FACT. `rows` holds exactly what the machine's
    // last COMPLETED list reported. A session in it is a session that is
    // running, and `gone` is deliberately not consulted: a row that moved to
    // `gone` is a row a completed list stopped reporting, which is the case
    // restore exists for.
    listedNow: state?.rows.has(sessionId) ?? false,
    // PHASE 117, AND THE FIX ROUND WIDENED IT TO TWO SOURCES.
    //
    // An id leaves the issued set in exactly three ways, and every one of them
    // is proof: the create's own option stamp landed, a rescue's option stamp
    // landed, or a completed pass held no rescue candidate for it and its row
    // still read unknown. The first two bind the session and the third proves it
    // is not there. While the id is still held, nothing knows whether the
    // session is running, so the gate refuses rather than offering a verb that
    // could start a second agent.
    //
    // The issued set alone was not enough, and `npm run smoke:p117` measured it
    // on 2026-08-20. That set lives in memory for one run and is filled from the
    // manifest at the top of the first list pass on a machine. A person who
    // restarts Tortie and reaches for Restore before any pass has completed
    // therefore asked a set that was still empty, the fact read false, and the
    // gate answered with a sentence about signing in to the machine.
    //
    // The durable half is the row's own status column. `unknown` on a remote row
    // has exactly one writer, being `markRemoteCreateUnconfirmed`, and the
    // conformance gate fails on a second one, so a remote row reading `unknown`
    // is a create nobody could confirm and nothing else. The manifest is still
    // read only when this run's own maps cannot answer, which is the same rule
    // the `record` line above follows, so no read per row per change is added.
    createUnconfirmed:
      issuedRemoteIdHeld(sessionId) || record?.status === 'unknown',
    rowMachineId,
    targetMachineId: target,
    rowStatus: remoteRecordStatus(rowMachineId, sessionId, status)
  };
}

/** The gate's verdict for one session. Pure once the facts are gathered. */
export function remoteRestoreVerdictFor(
  sessionId: string,
  targetMachineId?: string
): RemoteRestoreVerdict {
  return remoteRestoreVerdict(
    remoteRestoreFactsFor(sessionId, targetMachineId)
  );
}

/**
 * Refuse a restore the gate does not offer, before anything is composed.
 *
 * PHASE 70 REFUSED EVERY REMOTE ROW HERE and said so in one sentence. Phase 72
 * asks the gate instead, so the same call now returns quietly for a row that may
 * come back and throws the gate's own sentence for one that may not. Every
 * caller reads it the same way it always did, being "this throws when Tortie
 * will not do it", and the partition harness's measurement of a cut link is
 * unchanged: a machine Tortie cannot see fails the `unseen` arm.
 *
 * A row that is not remote at all returns quietly, which is what keeps this
 * callable as the first line of the local restore.
 *
 * @throws GmuxError INVALID_INPUT carrying the gate's sentence.
 */
export function refuseRemoteRestore(sessionId: string): void {
  const record = remoteRecordOf(sessionId);
  const isRemote =
    isRemoteSessionId(sessionId) ||
    (record !== null &&
      record.machineId !== undefined &&
      record.machineId !== 'local');
  if (!isRemote) return;
  const verdict = remoteRestoreVerdictFor(sessionId);
  if (verdict.offered) return;
  throw gmuxError(
    'INVALID_INPUT',
    verdict.reason ?? '',
    `${sessionId} lives on another machine and the restore gate refused it ` +
      `with ${String(verdict.refusal)}`
  );
}

// ---------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------

/**
 * Ask one machine for its list, once, and apply the answer to that machine only.
 *
 * `snapshotAt` is stamped BEFORE the command is issued, never on receipt, per
 * research 51 section 4.4's clock rule. Remote times are only ever compared with
 * other remote times from the same machine.
 *
 * Every ending this function can reach goes through {@link applyMachineEvent},
 * so the case table is asked once per pass and the verdict is written against
 * one machine's key. The name stays `pollRemoteMachine` because a list over the
 * live connection and a list on the timer are the same read of the same format
 * through the same parser, and giving them two names would suggest there were
 * two answers to compare.
 */
export async function pollRemoteMachine(machineId: string): Promise<void> {
  const state = stateOf(machineId);
  // PHASE 85. Counted for the whole call, so the status timer's tick can see
  // that a list is already outstanding and skip. A machine that is slow to
  // answer gets one command outstanding rather than a backlog of them.
  state.listsInFlight += 1;
  try {
    await onePass(machineId, state);
  } finally {
    state.listsInFlight -= 1;
  }
}

/**
 * The pass itself, with the in-flight count held around it by the caller.
 *
 * It is split out for one reason only, which is that every ending of a pass has
 * to decrement that count and there are four of them.
 */
async function onePass(
  machineId: string,
  state: MachineSessions
): Promise<void> {
  // PHASE 117, ONCE PER MACHINE PER RUN. A create whose answer was lost kept its
  // durable row and wrote `unknown` into its status column. This is where those
  // rows go back into the issued set, so the rescue below binds the SAME
  // immutable id the first run generated rather than a second create being made.
  //
  // It is here rather than in `./remote-record.ts` for three reasons. This file
  // already imports both modules, so nothing new is coupled. It runs before the
  // rescue judgement of the pass that could need it and before the write back can
  // move the column. And it needs no boot wiring in `../sessions/core.ts`.
  if (!state.seeded) {
    state.seeded = true;
    seedUnconfirmedCreates(machineId);
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(machineId);
  } catch {
    markMachineQuiet(machineId);
    return;
  }
  const snapshotAt = Date.now();
  let printed: string;
  let event: MachineEvent = { kind: 'listed', at: snapshotAt };
  try {
    printed = await execOn(ctx, remoteListArgs(), {
      timeoutMs: REMOTE_POLL_TIMEOUT_MS
    });
  } catch (err) {
    // ONLY tmux's own "no server running on <path>" is read as a completed
    // answer of zero sessions. That is the same rule Phase 67 wrote for this
    // Mac, and it is the reason it exists: a timeout, a refused connection or a
    // missing socket file proves nothing about what is running, and reading one
    // of them as death flips every row to ended while the agents are still
    // working. `remote-server.ts` accepts a second sentence as well, and its own
    // header records that as owed to this rung. It is deliberately NOT accepted
    // here, because that function decides whether to START a server on a machine
    // holding nothing, and this one decides whether to tell a person their work
    // has ended.
    if (serverProbeVerdict(err) === 'no-server') {
      printed = '';
      event = { kind: 'no-server', at: snapshotAt };
    } else {
      markMachineQuiet(machineId, classOfListFailure(err));
      return;
    }
  }

  const seen = new Map<string, RemoteSessionRow>();
  const names = new Set<string>();
  const unclaimed: string[] = [];
  let foreign = 0;
  for (const line of printed.split('\n')) {
    const parsed = parseRemoteListLine(line);
    if (parsed === null) continue;
    if (parsed.tmuxName.length > 0) names.add(parsed.tmuxName);
    if (parsed.gmuxId.length === 0) {
      // NOT OURS until a probe says otherwise. Counted, never shown, never
      // adopted and never killed. The rescue below is the only thing allowed to
      // change that answer, and only for an id THIS run issued.
      foreign += 1;
      if (rescueNeeded(parsed, foreignRemoteIds(machineId))) {
        unclaimed.push(parsed.tmuxId);
      }
      continue;
    }
    const previous = state.rows.get(parsed.gmuxId);
    const verdict = remoteRowStatus(previous, parsed.activityAt, snapshotAt);
    seen.set(parsed.gmuxId, {
      id: parsed.gmuxId,
      machineId,
      tmuxId: parsed.tmuxId,
      tmuxName: parsed.tmuxName,
      name: nameOf(parsed),
      agent: agentOf(parsed.agent),
      projectPath: parsed.projectPath,
      cwd: parsed.cwd,
      createdAt: parsed.createdAt,
      activityAt: parsed.activityAt,
      status: verdict.status,
      movedAt: verdict.movedAt
    });
  }

  // A row a COMPLETED pass did not report. The case table calls that `absent`
  // and gives it `restorable`, which is a change from Phase 70's `exited`: the
  // machine answered, and its answer not holding the session is evidence the
  // session is not running rather than evidence about how it ended.
  const absent = machineTruth({ kind: 'absent', at: snapshotAt });
  const absentStatus =
    absent.rows.kind === 'status' ? absent.rows.status : 'restorable';
  for (const [id, row] of state.rows) {
    if (seen.has(id)) continue;
    // Held in memory for the rest of this run: nothing on this Mac records it,
    // and nothing on that machine does either.
    state.gone.set(id, { ...row, status: absentStatus });
  }
  // PHASE 117. A pass that found a session waiting to be re-bound must not write
  // "not running" over its row first. See {@link writeBackCompletedPass}.
  const rescuePending = unclaimed.length > 0;
  // THE SECOND EXIT FROM THE ISSUED SET, and the first is the option stamp
  // landing. A pass that completed, held no session waiting to be rescued and did
  // not report the row is proof the session is not there. The id is dropped, and
  // the write back below moves the row to `restorable` so it can be brought back
  // honestly. It runs BEFORE that write back, because it reads the status column
  // the write back is about to change.
  if (!rescuePending) dropProvenAbsentCreates(machineId, seen);
  const foreignBefore = state.foreign;
  // Captured before the two are overwritten, because the manifest writes below
  // are bounded by whether the machine's membership actually moved.
  const previousIds = new Set(state.rows.keys());
  // PHASE 85. What each held row read on the last completed pass, captured
  // before the overwrite, so the write back below can tell a row whose status
  // moved from a row that only needs its `last_seen` refreshed.
  const previousStatus = new Map(
    [...state.rows].map(([id, row]) => [id, row.status])
  );
  const firstCompletedPass = !state.everAnswered;
  state.rows = seen;
  state.names = names;
  state.foreign = foreign;
  state.snapshotAt = snapshotAt;
  applyMachineEvent(machineId, event);
  writeBackCompletedPass(machineId, {
    seen,
    previousStatus,
    absentStatus,
    snapshotAt,
    // A row appearing or disappearing is the only thing that can make a manifest
    // row absent, and the first completed pass of a run is the other, because
    // nothing before it had an answer to compare against.
    membershipMoved:
      firstCompletedPass ||
      previousIds.size !== seen.size ||
      [...seen.keys()].some((id) => !previousIds.has(id)),
    rescuePending
  });
  // Written when the COUNT MOVES, never on every pass. Phase 70 polled on a
  // timer, so this was one line every 5 s. Phase 71 lists on every event the
  // machine reports, so on a busy machine it was one line per event, saying the
  // same number each time and burying everything else in the log.
  if (foreign > 0 && foreign !== foreignBefore) {
    machinesLog.info(
      `${machineId} holds ${String(foreign)} session(s) Tortie did not create. ` +
        `They are not shown and nothing acts on them.`
    );
  }
  announce();
  if (unclaimed.length > 0) await rescueUnclaimed(machineId, ctx, unclaimed);
}

/**
 * The manifest half of one completed pass (Phase 72).
 *
 * TWO WRITES, and the difference between them is the point.
 *
 * A row this pass HELD gets `last_seen` through a one column statement, and its
 * status only when the status moved. `last_seen` is what the tombstone reads
 * later to say when Tortie last saw the session, so a value refreshed only on a
 * change would name the last time the status moved rather than the last time the
 * session was there.
 *
 * PHASE 85 THROTTLED THE FIRST WRITE, and the reason is arithmetic. Before this
 * phase a connected machine completed a pass only when the machine reported an
 * event, so a write per held row per pass cost almost nothing. Phase 85 gives a
 * connected machine a list every 5,000 ms, which would be 12 reads and 12 writes
 * a minute for every remote row. So a row whose status MOVED is written every
 * time, and a row that only needs its `last_seen` refreshed is written at most
 * once every {@link REMOTE_LAST_SEEN_WRITE_MS}. `./remote-record.ts` is
 * unchanged, and the throttle is here because this is where the cadence is.
 *
 * This also ends finding 20 of docs/research/54-remote-parity.md as a side
 * effect rather than as a purpose. "Last seen" froze on a connected machine
 * because only a completed pass wrote it and a completed pass only happened on
 * an event. A completed pass now happens on a cadence.
 *
 * A manifest row this COMPLETED pass did not hold gets the case table's `absent`
 * answer, which is `restorable`. That is the write that makes Restore offerable
 * after a relaunch, because without it a row would come back saying whatever it
 * said when Tortie last quit.
 *
 * THE SECOND WRITE IS BOUNDED, and that is deliberate. It reads every manifest
 * row for the machine, and a machine on a live connection reports an event every
 * time anything happens on it. Doing that scan per event would be the busiest
 * read in the product for an answer that only changes when a session appears or
 * disappears, so it runs on the first completed pass of a run and on a pass whose
 * membership moved, and on no others.
 *
 * Every one of these is a no-op for a session created by 0.34 or 0.35, which has
 * no manifest row at all.
 */
function writeBackCompletedPass(
  machineId: string,
  pass: {
    readonly seen: ReadonlyMap<string, RemoteSessionRow>;
    readonly previousStatus: ReadonlyMap<string, SessionStatus>;
    readonly absentStatus: SessionStatus;
    readonly snapshotAt: number;
    readonly membershipMoved: boolean;
    /** True when this pass found a session still waiting to be re-bound. */
    readonly rescuePending: boolean;
  }
): void {
  if (!remoteManifestInstalled()) return;
  const written = stateOf(machineId).lastSeenWriteAt;
  for (const [id, row] of pass.seen) {
    const moved = pass.previousStatus.get(id) !== row.status;
    const since = pass.snapshotAt - (written.get(id) ?? 0);
    if (!moved && since < REMOTE_LAST_SEEN_WRITE_MS) continue;
    written.set(id, pass.snapshotAt);
    noteRemoteRowSeen(id, row.status, pass.snapshotAt);
  }
  // A ROW THAT LEFT THE MACHINE LEAVES THIS MAP TOO. Without this line the map
  // holds one entry for every session that ever ran on the machine during this
  // run, and only removing the machine cleared it. A completed pass reports the
  // whole membership, so anything absent from it is gone and its last write
  // instant is worth nothing.
  if (written.size > pass.seen.size) {
    for (const id of [...written.keys()]) {
      if (!pass.seen.has(id)) written.delete(id);
    }
  }
  if (!pass.membershipMoved) return;
  for (const record of remoteRecordsForMachine(machineId)) {
    if (pass.seen.has(record.id)) continue;
    // PHASE 117. A row whose id is still waiting to be accounted for is left
    // alone while a rescue is pending. The reason is arithmetic rather than
    // taste: the rescue runs at the END of the pass, so without this rule the
    // pass that is about to re-bind the session writes "not running" over it
    // first, and a person watching the screen sees a live session called not
    // running for one cadence. Convergence is bounded at two passes, because the
    // foreign memo in `./pane-env-rescue.ts` settles a probed session for good,
    // so a pass after the probes has no unclaimed candidates and this write runs
    // normally.
    if (pass.rescuePending && issuedRemoteIdHeld(record.id)) continue;
    noteRemoteRowSeen(record.id, pass.absentStatus, pass.snapshotAt);
  }
}

/**
 * Put the ids a past run left unconfirmed on this machine back into the issued
 * set (Phase 117).
 *
 * It reads the manifest once per machine per run, and only rows whose status
 * column says the create was never confirmed. A row for this Mac can never be in
 * that list, and `seedIssuedRemoteIds` refuses one anyway.
 */
function seedUnconfirmedCreates(machineId: string): void {
  if (!remoteManifestInstalled()) return;
  const added = seedIssuedRemoteIds(
    unconfirmedRemoteRecords()
      .filter((record) => record.machineId === machineId)
      .map((record) => ({
        id: record.id,
        machineId,
        name: oneLine(record.name),
        agent: String(record.agent),
        projectPath: oneLine(record.projectPath),
        cwd: record.cwd,
        issuedAt: record.createdAt
      }))
  );
  if (added === 0) return;
  machinesLog.info(
    `${machineId} has ${String(added)} session(s) Tortie started and could not ` +
      `confirm in an earlier run. It will match them to that machine's own ` +
      `list before it decides anything about them.`
  );
}

/**
 * Drop the ids a COMPLETED pass proved are not on the machine (Phase 117).
 *
 * Only a row whose status column still reads `unknown` is dropped, and that is
 * deliberate. A create running right now also holds an issued id, and its row
 * reads `running` from the moment it is written, so a pass that lands in the
 * middle of a create cannot drop the id the rescue is about to need.
 *
 * The caller runs this only when the pass held no session waiting to be
 * rescued.
 */
function dropProvenAbsentCreates(
  machineId: string,
  seen: ReadonlyMap<string, RemoteSessionRow>
): void {
  if (!remoteManifestInstalled()) return;
  for (const one of issuedRemoteIdsFor(machineId)) {
    if (seen.has(one.id)) continue;
    if (remoteRecordOf(one.id)?.status !== 'unknown') continue;
    clearIssuedRemoteId(one.id);
  }
}

/**
 * Re-bind sessions on one machine that carry the pane stamp and no option stamp.
 *
 * The case this exists for is a create whose link died between the
 * `new-session` line and the `set-option @gmux-id` that follows it. The session
 * is then running on that machine with the pane environment Tortie put on the
 * create line and none of the four option stamps, so every later pass counts it
 * as foreign forever. Research 51 section 4.1's last bullet names it and this is
 * the rung that owes it.
 *
 * It never adopts a session whose pane stamp names an id this run did not issue.
 * A session carrying neither stamp, or a stamp naming nothing of ours, is NOT
 * OURS: it is counted, never shown, never adopted and never killed.
 *
 * One re-entry guard, because a successful rescue asks for one more pass and a
 * pass is what called this.
 */
async function rescueUnclaimed(
  machineId: string,
  ctx: RemoteMachineContext,
  tmuxIds: readonly string[]
): Promise<void> {
  const state = stateOf(machineId);
  if (state.passing) return;
  state.passing = true;
  let rebound = 0;
  try {
    for (const tmuxId of tmuxIds) {
      const match = await rescueRemoteRow(ctx, tmuxId);
      if (match !== null) rebound += 1;
    }
  } finally {
    state.passing = false;
  }
  if (rebound === 0) return;
  machinesLog.info(
    `${machineId} held ${String(rebound)} session(s) Tortie created and could ` +
      `not account for, and they are back on the list with their names.`
  );
  await pollRemoteMachine(machineId);
}

/**
 * The transport class for a failed list, in one clause and with no transport
 * words in it.
 *
 * It is what the case table records as evidence, so a log line and a bug report
 * say which kind of failure it was without a person reading a stack.
 */
function classOfListFailure(err: unknown): string {
  if (isGmuxError(err, 'TMUX_UNREACHABLE')) return 'no answer';
  if (isGmuxError(err, 'INVALID_INPUT')) return 'refused';
  return 'unreadable';
}

/**
 * The name a person reads.
 *
 * A session Tortie created carries the display name a person typed in
 * `@gmux-name`. A session carrying `@gmux-id` and no name stamp is one whose
 * stamp did not stick, so the name that machine's own server holds is used, and
 * that is a name rather than an identifier.
 */
export function nameOf(parsed: RemoteListRow): string {
  if (parsed.name.length > 0) return parsed.name;
  return parsed.tmuxName.length > 0 ? parsed.tmuxName : parsed.tmuxId;
}

/**
 * The agent stamp, widened the same way every other agent id in this codebase
 * is. `AgentKind` is frozen at three members and has carried the registry's
 * other ids at runtime since Phase 10, which is recorded in src/shared/types.ts.
 */
function agentOf(stamp: string): AgentKind {
  return (stamp.length > 0 ? stamp : 'shell') as AgentKind;
}

/**
 * The machine did not answer. Every row on it goes to `unknown`.
 *
 * It keeps its Phase 70 name because every caller reads it as the same fact.
 * What changed underneath is that the verdict now comes from the case table
 * rather than from a boolean this file owns, so `transport-lost` writes the same
 * status here, at the reconcile boundary and in the conformance gate.
 */
export function markMachineQuiet(machineId: string, errorClass = 'no answer'): void {
  const state = stateOf(machineId);
  if (state.answering) {
    machinesLog.warn(
      `${machineId} did not answer. Its sessions are untouched and Tortie ` +
        `cannot see them.`
    );
  }
  applyMachineEvent(machineId, {
    kind: 'transport-lost',
    at: Date.now(),
    errorClass
  });
  noteMachineQuiet(machineId, 'did not answer the last time Tortie asked');
  announce();
}

// ---------------------------------------------------------------------------
// The feed
// ---------------------------------------------------------------------------

/** True once the control plane has somewhere to send its events. */
let sinkInstalled = false;

/**
 * Hand the control plane the four things it should tell this module about.
 *
 * It is installed once per run rather than per machine, because there is one
 * feed and it keys everything it does by machine id.
 */
function installControlSink(): void {
  if (sinkInstalled) return;
  sinkInstalled = true;
  setControlPlaneSink({
    connected(machineId: string): void {
      const state = stateOf(machineId);
      state.onControl = true;
      // THE FALLBACK TIMER GOES THE MOMENT THE CONNECTION IS UP. One machine
      // never carries the fallback timer and the connection at once, and
      // `remoteMachineFacts` exposes every flag so a test can count rather than
      // trust this comment.
      clearTimer(state);
      // PHASE 85. The status list takes its place. The connection reports
      // membership and renames and never reports output, so without this a row
      // on a connected machine would only be re-read when something else
      // happened on the machine.
      armStatusTimer(machineId);
      void pollRemoteMachine(machineId).catch(() => undefined);
    },
    sessionsChanged(machineId: string): void {
      void pollRemoteMachine(machineId).catch(() => undefined);
    },
    sessionRenamed(machineId: string): void {
      void pollRemoteMachine(machineId).catch(() => undefined);
    },
    lost(machineId: string, reason: string): void {
      const state = stateOf(machineId);
      state.onControl = false;
      // PHASE 85. The status list belongs to the connection and goes with it.
      clearStatusTimer(state);
      markMachineQuiet(machineId, reason);
      // The timer is the fallback, armed the moment the connection drops, so a
      // machine is never left with no feed at all.
      if (state.timer === null) armTimer(machineId);
    }
  });
}

/**
 * Start one machine's feed, and resolve when its first list is done.
 *
 * The feed is one of two shapes and the machine's own version decides which:
 *
 *   control dialect measured, connection live   one list per event, plus the
 *                                               status list on the two cadences,
 *                                               and no fallback timer
 *   control dialect measured, connection down   the fallback timer, until it is
 *                                               back
 *   control dialect unmeasured                  the fallback timer, at Phase
 *                                               70's cadences
 *
 * The timer is armed here in every case, including the case where a connection
 * is about to open. `openControlPlane` resolves when the child is SPAWNED rather
 * than when it is connected, and a machine with no timer and a connection that
 * never completes would have no feed at all. The connection's own `connected`
 * handler is what clears it.
 */
export async function startMachineFeed(machineId: string): Promise<void> {
  installControlSink();
  hookWake();
  const state = stateOf(machineId);
  noteMachineConnecting(machineId);
  // It never throws. A machine with no registered connection, a machine that did
  // not answer and a machine whose dialect has no measurement all come back as
  // false, and all three keep the timer below.
  await openControlPlane(machineId);
  if (!isControlPlaneLive(machineId) && state.timer === null) armTimer(machineId);
  await pollRemoteMachine(machineId);
}

/**
 * The Phase 70 name for {@link startMachineFeed}.
 *
 * It is kept for one rung so the callers move in their own owner's commit rather
 * than in this file's. There is one implementation and one behaviour.
 */
export const startRemotePoll = startMachineFeed;

function clearTimer(state: MachineSessions): void {
  if (state.timer !== null) clearInterval(state.timer);
  state.timer = null;
}

function clearStatusTimer(state: MachineSessions): void {
  if (state.statusTimer !== null) clearInterval(state.statusTimer);
  state.statusTimer = null;
}

/** Whichever of the two cadences the window's focus asks for right now. */
function pollEvery(): number {
  return pollFocused ? REMOTE_POLL_FOCUSED_MS : REMOTE_POLL_IDLE_MS;
}

/**
 * Arm the status list that runs BESIDE a live connection (Phase 85).
 *
 * It is per machine, one list per tick, at the two cadences Phase 70 chose for
 * the fallback timer. No new cadence constant exists, because a person reading
 * a dot should not have to know which feed drew it.
 *
 * IT SLOWS TO {@link REMOTE_POLL_IDLE_MS} RATHER THAN STOPPING when no window
 * has focus, and that is deliberate. A Tortie window can be on screen without
 * having focus, and a person reads the dots in that state, so a timer that was
 * cleared would freeze exactly the reading this list exists to fix. It is also
 * the pattern the rest of this layer already follows, being 60,000 ms to
 * 300,000 ms for the connected harvest and 5,000 ms to 30,000 ms here. The cost
 * is one short lived local process and one round trip per machine every 30
 * seconds when nobody is looking, and `./ssh.ts` sets `ControlMaster=auto`, so a
 * list reuses the connection that is already open.
 *
 * A tick is SKIPPED while a list for this machine is still outstanding.
 */
function armStatusTimer(machineId: string): void {
  const state = stateOf(machineId);
  clearStatusTimer(state);
  // It belongs to the connection. A machine on the fallback timer already has a
  // list on the same cadence and does not need a second one.
  if (!state.onControl) return;
  state.statusTimer = setInterval(() => {
    const now = stateOf(machineId);
    if (now.listsInFlight > 0) return;
    void pollRemoteMachine(machineId).catch(() => undefined);
  }, pollEvery());
  state.statusTimer.unref?.();
}

/** Arm the FALLBACK timer, which is the feed a machine with no connection has. */
function armTimer(machineId: string): void {
  const state = stateOf(machineId);
  clearTimer(state);
  // A machine on a live connection already has a list on this cadence, from
  // {@link armStatusTimer}, so this one beside it would ask the same question
  // twice.
  if (state.onControl) return;
  state.timer = setInterval(() => {
    void pollRemoteMachine(machineId).catch(() => undefined);
  }, pollEvery());
  state.timer.unref?.();
}

/**
 * Move both feeds to the other cadence when the window's focus changes.
 *
 * PHASE 85 ADDED TWO THINGS. The status list moves with the fallback timer, so
 * one sentence is true of every machine whichever feed it is on. And gaining
 * focus runs one list at once, because without it a person coming back to the
 * window would read a dot up to 30 seconds old for a moment.
 *
 * Neither timer is CLEARED here. The reason is written at {@link armStatusTimer}.
 */
export function setRemotePollFocused(focused: boolean): void {
  if (focused === pollFocused) return;
  pollFocused = focused;
  for (const [machineId, state] of machines) {
    if (state.timer !== null) armTimer(machineId);
    if (state.statusTimer !== null) armStatusTimer(machineId);
  }
  if (focused) pollOnFocusGain();
}

/**
 * The one list a machine gets when a Tortie window comes back to the front.
 *
 * IT IS THROTTLED, AND IT SKIPS A MACHINE THAT ALREADY HAS A LIST OUTSTANDING.
 * Both rules exist for the same reason. Focus is a person's key press and not a
 * timer, so a person moving between Tortie and another program can raise this
 * many times a second. The first build of this asked every machine every time,
 * which would put more commands on a machine than the 5,000 ms cadence this
 * phase chose ever does.
 *
 * The throttle is {@link REMOTE_POLL_FOCUSED_MS}, which is the same 5,000 ms the
 * status list runs on while the window is in front. So the fastest a machine can
 * be asked stays 5,000 ms whatever the person does with their windows, and a
 * return to the window that arrives inside that window is answered by the list
 * that already ran.
 *
 * A machine with a list outstanding is skipped for the same reason the timer
 * skips it, which is that one command outstanding is the cap.
 */
function pollOnFocusGain(): void {
  const at = Date.now();
  if (at - lastFocusPollAt < REMOTE_POLL_FOCUSED_MS) return;
  lastFocusPollAt = at;
  for (const [machineId, state] of machines) {
    if (state.listsInFlight > 0) continue;
    void pollRemoteMachine(machineId).catch(() => undefined);
  }
}

/**
 * True while a window has focus (Phase 73).
 *
 * It exists so the connected harvest in `./remote-harvest.ts` follows the same
 * focus signal this feed does, without a second caller having to be wired
 * through `../sessions/core.ts`. There is one source of the fact and two
 * readers of it.
 */
export function remotePollIsFocused(): boolean {
  return pollFocused;
}

/** Ask every machine for its list, at once. */
export async function pollEveryRemoteMachine(): Promise<void> {
  await Promise.allSettled(
    [...machines.keys()].map((machineId) => pollRemoteMachine(machineId))
  );
}

/**
 * The Mac woke.
 *
 * Every remote row goes to `unknown` first, because a machine may have gone away
 * while this one was asleep and the last answer is about a world that may no
 * longer be the current one. Then every machine is asked at once. This is the
 * second of the three moments Tortie signs in, and it is a wake rather than a
 * file change, which is the line refusal 8 draws.
 *
 * The event kind is `woke` rather than `transport-lost`, because the case table
 * records what happened and a power event is not a link that dropped. Both arms
 * write the same status, and the evidence line is what tells them apart in a log.
 */
export function remoteMachinesWoke(): void {
  const at = Date.now();
  for (const machineId of machines.keys()) {
    applyMachineEvent(machineId, { kind: 'woke', at });
    noteMachineQuiet(machineId, 'has not answered since this Mac woke up');
  }
  announce();
  void pollEveryRemoteMachine().catch(() => undefined);
}

function hookWake(): void {
  if (unhookWake !== null) return;
  unhookWake = onMachineWake(remoteMachinesWoke);
}

/** Stop every feed, of both shapes. Called from the session core's dispose. */
export function stopMachineFeeds(): void {
  for (const state of machines.values()) {
    clearTimer(state);
    clearStatusTimer(state);
    state.onControl = false;
  }
  closeEveryControlPlane();
  unhookWake?.();
  unhookWake = null;
}

/** The Phase 70 name for {@link stopMachineFeeds}. One implementation. */
export const stopRemotePolls = stopMachineFeeds;

/** Drop every row, every timer and every connection. Tests and the smoke. */
export function resetRemoteSessionsForTests(): void {
  stopMachineFeeds();
  setControlPlaneSink(null);
  sinkInstalled = false;
  machines.clear();
  listeners = [];
  pollFocused = true;
  lastFocusPollAt = 0;
}

/**
 * What one machine's polling found, for the smoke and the tests. It reads
 * memory and asks the machine nothing.
 */
export function remoteMachineFacts(machineId: string): {
  rows: number;
  gone: number;
  foreign: number;
  names: number;
  answering: boolean;
  everAnswered: boolean;
  snapshotAt: number;
  /** True while the FALLBACK timer is armed for this machine. */
  timerArmed: boolean;
  /** True while the status list beside a live connection is armed (Phase 85). */
  statusTimerArmed: boolean;
  /** True while this machine has a live connection. */
  onControl: boolean;
  /**
   * How many rows the `last_seen` write throttle is still tracking (Phase 85).
   *
   * It is here so a test can prove the map is pruned when a row leaves the
   * machine, rather than growing for the length of a run.
   */
  lastSeenTracked: number;
  /**
   * How many creates on this machine are still waiting to be accounted for
   * (Phase 117).
   *
   * It is the size of the issued set for this machine, which is what the rescue
   * judges against and what the restore gate refuses on. It counts a create
   * running right now as well as one a past run left unconfirmed, because both
   * are ids nothing has settled yet.
   */
  unconfirmedCreates: number;
  /** What the case table last said about this machine. */
  evidence: string;
} {
  const state = stateOf(machineId);
  return {
    rows: state.rows.size,
    gone: state.gone.size,
    foreign: state.foreign,
    names: state.names.size,
    answering: state.answering,
    everAnswered: state.everAnswered,
    snapshotAt: state.snapshotAt,
    timerArmed: state.timer !== null,
    statusTimerArmed: state.statusTimer !== null,
    onControl: state.onControl,
    lastSeenTracked: state.lastSeenWriteAt.size,
    unconfirmedCreates: issuedRemoteIdsFor(machineId).length,
    evidence: state.truth.evidence
  };
}

/**
 * Every machine carrying the FALLBACK TIMER and the connection at once. It must
 * always be empty.
 *
 * READ THE NAME NARROWLY, because Phase 85 made a wider reading false. A machine
 * on a live connection now also has the status list armed, which is a second
 * timer, and that is the point of Phase 85 rather than a defect. What must never
 * happen is the Phase 70 fallback timer running beside a connection, because
 * those two are the same read of the same list and one of them would be for
 * nothing. This function counts that and only that.
 *
 * It is a counter rather than a comment because the exclusivity is the property
 * this rung has to keep, and a test that counts is evidence while a comment is
 * not.
 */
export function machinesWithBothFeeds(): string[] {
  const both: string[] = [];
  for (const [machineId, state] of machines) {
    if (state.timer !== null && state.onControl) both.push(machineId);
  }
  return both.sort();
}
