/**
 * Sessions that live on another machine (Phase 70, M3, then Phase 71, M4;
 * research 51 sections 4.1, 4.3, 4.4 and 4.6).
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
 * The status ladder moved out of this file. `./status-truth.ts` is now the only
 * place research 51 section 4.4's case table is written, and every status this
 * feed writes for a whole machine comes from `machineTruth`. Two behaviours
 * changed because of it. A row a completed list stopped reporting now reads
 * `restorable` rather than `exited`, because the machine answered and its answer
 * did not hold that session. And a lost link writes `unknown` on every row of
 * that machine and of no other machine.
 *
 * ## The rule that shapes everything else
 *
 * > Nothing about a remote session is ever written to the manifest. No row, no
 * > resume line, no snapshot, no capsule, no tombstone.
 *
 * The scope fence for this rung forbids the `machine_id` migration, and a
 * manifest row with no machine column cannot say which machine its session is
 * on. Writing one would produce a row that a later restore could read as local
 * and recreate on this Mac. So this file imports nothing from
 * `src/main/manifest/`, and a later reader can check that by reading the import
 * list rather than by reading every function.
 *
 * ## Where the truth lives instead
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
 * ## What is NOT true, and no surface may imply otherwise
 *
 *  - A remote session that ends while Tortie is not running leaves no trace on
 *    this Mac. Past Sessions never holds a remote row.
 *  - There is no saved scrollback, no resume command and no launch snapshot for
 *    a remote session, so Restore is refused for every one of them.
 *  - A remote row's status comes from one format field, `#{session_activity}`.
 *    It is evidence that the session printed something. It is not the local
 *    attention verdict, and no remote row ever says `needs input`.
 *
 * ## Two safety properties, and they are the reason this file exists at all
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
import { getLaunchableEntry, launchArgvFor } from '../agents/registry';
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
import { execOn } from './exec-plane';
import { machineColorOf, machineLabelOf, machineRow } from './store';
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
  noteIssuedRemoteId,
  rescueNeeded,
  rescueRemoteRow
} from './pane-env-rescue';
// The live connection. This module hands it a context and a sink; it never
// resolves a context of its own and never holds a row.
import {
  noteMachineAnswered,
  noteMachineConnecting,
  noteMachineQuiet,
  closeEveryControlPlane,
  isControlPlaneLive,
  openControlPlane,
  setControlPlaneSink
} from './control-plane';
import {
  MACHINE_NOT_READY,
  REMOTE_DIR_MISSING,
  RESTORE_REFUSED,
  TARGET_UNBOUND,
  noRemoteRowFor
} from './remote-copy';

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
 */
export const REMOTE_LIST_FORMAT =
  '#{q:session_id} #{q:session_created} #{q:session_activity} ' +
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

/** The four options Tortie stamps on a session it created on a machine. */
export const REMOTE_STAMPS = [
  '@gmux-id',
  '@gmux-agent',
  '@gmux-name',
  '@gmux-project'
] as const;

// ---------------------------------------------------------------------------
// The cadence
// ---------------------------------------------------------------------------

/**
 * How often a machine is asked for its list while this window is in front.
 *
 * 5,000 ms. CHOSEN, NOT MEASURED, and the copy on the create sheet says so.
 * Nobody has measured what this costs over a tailnet with real packet loss.
 */
export const REMOTE_POLL_FOCUSED_MS = 5_000;

/** The same when no window has focus. 30,000 ms, chosen for the same reason. */
export const REMOTE_POLL_IDLE_MS = 30_000;

/** How long one poll gets before it is killed. */
export const REMOTE_POLL_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// The rows
// ---------------------------------------------------------------------------

/** One line of {@link REMOTE_LIST_FORMAT}, parsed. Pure data. */
export interface RemoteListRow {
  /** The far side's immutable identifier, e.g. `$4`. */
  readonly tmuxId: string;
  /** Epoch ms the session was created, from that machine's clock. */
  readonly createdAt: number;
  /** Epoch ms of the last activity, from that machine's clock. */
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
   * True while this machine has a live connection.
   *
   * It is what makes the two feeds exclusive. {@link armTimer} refuses to arm a
   * timer while it is true, and the connection's own `connected` handler clears
   * the timer, so one machine can never carry both feeds at once.
   */
  onControl: boolean;
  /** True while a pass is running, so a rescue cannot re-enter one. */
  passing: boolean;
}

const machines = new Map<string, MachineSessions>();

/** True while a window has focus. Decides which of the two cadences is used. */
let pollFocused = true;

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
    onControl: false,
    passing: false
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

/**
 * One value, with every tab and newline replaced by a single space.
 *
 * Applied to the display name and the project path before either is stamped on
 * the far side. A newline would end the line the poll reads, and a tab comes
 * back as an underscore from a client with no UTF-8 locale, which is measured in
 * the header of {@link REMOTE_LIST_FORMAT}. So the value Tortie writes is the
 * value Tortie reads back. A display name with a tab in it is something a paste
 * can produce, and it is worth one space rather than a value that changes on the
 * way home.
 */
export function oneLine(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ');
}

/** What a remote create needs. Every path in it belongs to the other machine. */
export interface RemoteCreateInput {
  readonly machineId: string;
  /** The display name the person typed. */
  readonly name: string;
  /** The project tab's path, ON THAT MACHINE. */
  readonly projectPath: string;
  /** The working directory, ON THAT MACHINE. */
  readonly cwd: string;
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
  readonly cwd: string;
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
    input.tmuxName,
    // Evaluated on the far side. The local existsSync check every local create
    // makes is deliberately skipped, per research 51 section 4.3: the folder is
    // not on this Mac, so this Mac cannot answer for it. A folder that is not
    // there fails the create with tmux's own sentence and Tortie prints a plain
    // one over it.
    '-c',
    input.cwd
  ];
  for (const [key, value] of Object.entries({
    ...managedPaneEnv(input.sessionId),
    ...input.env
  })) {
    args.push('-e', `${key}=${value}`);
  }
  if (input.argv.length > 0) args.push('--', ...input.argv);
  return args;
}

/** The list argv. Pure. */
export function remoteListArgs(): string[] {
  return ['list-sessions', '-F', REMOTE_LIST_FORMAT];
}

/** One stamp, aimed at an immutable identifier. Pure. */
export function remoteStampArgs(
  tmuxId: string,
  option: string,
  value: string
): string[] {
  return ['set-option', '-t', tmuxId, option, value];
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

/**
 * The status one poll gives one row.
 *
 * The whole ladder is here so the rule can be read in one place:
 *
 *   the row is there and activity moved      -> running
 *   the row is there and activity did not    -> idle
 *   the row is gone and the machine answered -> exited
 *   the machine did not answer               -> unknown
 *
 * A row seen for the first time is `idle`, because there is no previous poll for
 * anything to have moved since. `needs_input` is never produced here. The status
 * oracles read local disk and cannot run on another machine, and pretending
 * otherwise would be the one status rule Tortie does not break.
 */
export function remoteRowStatus(
  previousActivityAt: number | undefined,
  activityAt: number
): SessionStatus {
  if (previousActivityAt === undefined) return 'idle';
  return activityAt > previousActivityAt ? 'running' : 'idle';
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

/** What the badge draws for one machine. */
export function remoteSessionMachine(machineId: string): SessionMachine {
  const row = machineRow(machineId);
  const state = machines.get(machineId);
  return {
    id: machineId,
    label: row === null ? machineId : machineLabelOf(row),
    color: row === null ? 'blue' : machineColorOf(row),
    // A machine nobody has polled yet has not failed to answer, and drawing it
    // as quiet would be a claim Tortie cannot back.
    answering: state === undefined ? true : state.answering
  };
}

/** Every remote row, projected for the renderer, oldest machine id first. */
export function remoteSessions(): Session[] {
  const out: Session[] = [];
  for (const machineId of [...machines.keys()].sort()) {
    const state = stateOf(machineId);
    const machine = remoteSessionMachine(machineId);
    for (const row of state.rows.values()) {
      out.push(projectRow(row, machine, state));
    }
    for (const row of state.gone.values()) {
      out.push(projectRow(row, machine, state, true));
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
  machine: SessionMachine,
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
    machine
  };
}

// ---------------------------------------------------------------------------
// The four verbs
// ---------------------------------------------------------------------------

/**
 * The context for a machine Tortie has already signed in to, or a refusal.
 *
 * Two things are asked, and both have to be true. There has to be a registered
 * context, which only `prepareMachine` creates and which the confirm gate stands
 * in front of. And the machine's own program search list has to have been read
 * for the current connection, which is what `prepareMachine` step 5 does. The
 * exec plane refuses a mutating verb without the second one anyway; asking here
 * as well is what turns that into a sentence a person can act on.
 *
 * @throws GmuxError INVALID_INPUT with {@link MACHINE_NOT_READY}.
 */
export function readyRemoteContext(machineId: string): RemoteMachineContext {
  let ctx;
  try {
    ctx = machineContext(machineId);
  } catch {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `${machineId} has no registered connection in this run`
    );
  }
  if (ctx.kind !== 'remote') {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `${machineId} resolved to this Mac rather than to a machine`
    );
  }
  if (machineGeneration(machineId).remotePath === null) {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `no program search list is recorded for ${machineId}'s current connection`
    );
  }
  return ctx;
}

/**
 * The argv for one agent, by BARE NAME, and the reason is the opposite of the
 * local one.
 *
 * Locally an agent is launched by bare name so that a `pkill -f` over the
 * resolved path does not match every durable session (CLAUDE.md, Phase 12.7 F3).
 * Remotely it is bare name because the machine's own program search list, read
 * by `captureRemotePath` and written into that server's environment, is the only
 * thing that knows where that machine keeps its programs. No `command -v` runs
 * here and no argv is recorded anywhere. Per machine argv capture is Phase 72.
 */
function remoteLaunchArgv(
  agent: LaunchableAgentKind,
  extraArgs: readonly string[]
): string[] {
  if (agent === 'shell') return [];
  const merged = launchableAgentEntry(agent);
  if (merged === null) return launchArgvFor(getLaunchableEntry(agent), extraArgs);
  // Null means the row supplied nothing that can run, so there is nothing for a
  // person to have agreed to and nothing to refuse.
  if (merged.executionHash !== null) {
    assertConfigRowMayLaunch(merged.id, executionFieldsOf(merged));
  }
  return launchArgvFor(merged, extraArgs);
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

/**
 * Create a session on a machine.
 *
 * The order is fixed and every step is where it is on purpose:
 *
 *  1. Refuse unless the machine is signed in to and its program list was read.
 *  2. Compose the argv by bare name, asking the agent confirm gate on the way.
 *  3. Read the machine's list, and pick a name that collides with none of it.
 *  4. `new-session`, with both identity variables on the line itself.
 *  5. If that failed, ONE read of the environment, to see whether it ran anyway.
 *  6. Stamp the four options. A stamp that fails is logged and the create still
 *     succeeds, because the pane environment already carries the identity.
 *  7. Poll once, at once, so the row is on screen without waiting a cadence.
 */
export async function remoteCreate(input: RemoteCreateInput): Promise<Session> {
  if (input.name.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
  }
  const ctx = readyRemoteContext(input.machineId);
  const argv = remoteLaunchArgv(input.agent, input.extraArgs ?? []);
  const sessionId = randomUUID();
  // MEASURED 2026-08-17 against a scratch machine: without this read the first
  // create of a Tortie run picks a name from an empty set, and a machine that
  // already holds a session of that name refuses the whole create with tmux's
  // own "duplicate session". So the names are read first and the new one is
  // deduped against them, which is what a local create has always done. The
  // residual race, being a session created on that machine between this read and
  // the create below, still ends as tmux's own refusal, and that is honest: it is
  // also what makes new-session safe to run twice.
  await pollRemoteMachine(input.machineId);
  const tmuxName = dedupeSessionName(
    sanitizeSessionName(input.name),
    takenNames(input.machineId)
  );
  const args = remoteCreateArgs({
    tmuxName,
    cwd: input.cwd,
    sessionId,
    argv
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
    cwd: input.cwd,
    issuedAt: Date.now()
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
    const found = await confirmCreate(ctx, tmuxName, sessionId);
    if (found === null) throw createFailure(err, input.cwd);
    tmuxId = found;
    machinesLog.warn(
      `the create on ${input.machineId} lost its answer and the session was ` +
        `there: ${(err as Error).message}`
    );
  }
  if (!tmuxId.startsWith('$')) {
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
  return projectRow(
    row,
    remoteSessionMachine(input.machineId),
    stateOf(input.machineId)
  );
}

/** The one read a lost create answer gets. Returns the identifier, or null. */
async function confirmCreate(
  ctx: RemoteMachineContext,
  tmuxName: string,
  sessionId: string
): Promise<string | null> {
  try {
    const out = await execOn(ctx, [
      'show-environment',
      '-t',
      `=${tmuxName}`,
      'GMUX_SESSION_ID'
    ]);
    if (out.trim() !== `GMUX_SESSION_ID=${sessionId}`) return null;
    const listed = await execOn(ctx, remoteListArgs());
    for (const line of listed.split('\n')) {
      const row = parseRemoteListLine(line);
      if (row !== null && row.gmuxId === sessionId) return row.tmuxId;
      if (row !== null && row.tmuxName === tmuxName) return row.tmuxId;
    }
    return null;
  } catch {
    return null;
  }
}

/** A failed create, with the plain sentence over tmux's own where it fits. */
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
  announce();
  await pollRemoteMachine(row.machineId);
  return projectRow(
    remoteSessionRow(sessionId) ?? updated,
    remoteSessionMachine(row.machineId),
    state
  );
}

/**
 * Forget one remote row. Nothing is sent to any machine and nothing is written.
 *
 * This is what the person's Remove does to a remote row that has ended. Locally
 * a Remove writes a tombstone the person can undo from Past Sessions, and this
 * rung writes no manifest row of any kind, so there is nothing to tombstone and
 * nothing to bring back. Forgetting it is the honest whole of the verb, and the
 * surface says so.
 *
 * Returns false when the id names no remote row.
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

/**
 * Restore, refused for every remote row, before anything is composed.
 *
 * @throws GmuxError INVALID_INPUT with {@link RESTORE_REFUSED}.
 */
export function refuseRemoteRestore(sessionId: string): void {
  if (!isRemoteSessionId(sessionId)) return;
  throw gmuxError(
    'INVALID_INPUT',
    RESTORE_REFUSED,
    `${sessionId} lives on another machine and this release brings back no ` +
      `session that does`
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
      status: remoteRowStatus(previous?.activityAt, parsed.activityAt)
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
  const foreignBefore = state.foreign;
  state.rows = seen;
  state.names = names;
  state.foreign = foreign;
  state.snapshotAt = snapshotAt;
  applyMachineEvent(machineId, event);
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
      // THE TIMER GOES THE MOMENT THE CONNECTION IS UP. One machine never
      // carries both feeds, and `remoteMachineFacts` exposes both flags so a
      // test can count rather than trust this comment.
      clearTimer(state);
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
 *   control dialect measured, connection live   one list per event, no timer
 *   control dialect measured, connection down   the timer, until it is back
 *   control dialect unmeasured                  the timer, at Phase 70's cadences
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

function armTimer(machineId: string): void {
  const state = stateOf(machineId);
  clearTimer(state);
  // A machine on a live connection is TOLD what changed, so a timer beside it
  // would be a second feed asking the same question for nothing.
  if (state.onControl) return;
  const every = pollFocused ? REMOTE_POLL_FOCUSED_MS : REMOTE_POLL_IDLE_MS;
  state.timer = setInterval(() => {
    void pollRemoteMachine(machineId).catch(() => undefined);
  }, every);
  state.timer.unref?.();
}

/** Drop to the slower cadence when no window has focus. */
export function setRemotePollFocused(focused: boolean): void {
  if (focused === pollFocused) return;
  pollFocused = focused;
  for (const machineId of machines.keys()) {
    if (machines.get(machineId)?.timer !== null) armTimer(machineId);
  }
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
  /** True while a timer is armed for this machine. */
  timerArmed: boolean;
  /** True while this machine has a live connection. */
  onControl: boolean;
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
    onControl: state.onControl,
    evidence: state.truth.evidence
  };
}

/**
 * How many machines carry BOTH feeds at once. It must always be zero.
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
