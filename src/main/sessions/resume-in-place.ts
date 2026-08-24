/**
 * Phase 141 — the agent left, and the one press back into its conversation.
 *
 * ## What this module is for
 *
 * A person starts an agent inside a Tortie session and then ends the agent
 * while the shell lives on, with Control C or the agent's own quit verb. The
 * session is still there and the conversation is still on disk, and until this
 * phase Tortie said nothing about either. This module holds the verb that puts
 * the resume command back on that person's prompt, the guard that runs at the
 * moment of the press, and the rule that decides whether the conversation that
 * comes back may be written onto the row.
 *
 * ## The one finding that decides the whole design
 *
 * A session Tortie has just restored, sitting with its command armed and
 * unpressed, is byte for byte the same shape as one whose agent has left.
 * `../restore/restore.ts` creates a restored session whose own program is the
 * login shell and then types the resume without pressing Enter. So ANY rule
 * that reads the SHAPE of a session, being a screen capture or a process
 * table, fires on every restored session and announces that an agent left when
 * no agent ever ran.
 *
 * The rule therefore reads a WITNESS rather than a shape. Tortie remembers the
 * specific process it watched being the agent in that session, and reacts when
 * THAT process goes away. The watching is in `../activity`, which owns the one
 * second poll. This module owns everything after the edge, and a session this
 * module was never told about is a session it says nothing about.
 *
 * ## The four things it does
 *
 *  1. It holds the per session handback record, which is a FACT and never a
 *     status. Nothing here calls `applyDetectedStatus`, nothing here touches
 *     `SessionStatus`, and the record reaches a window on the activity facts
 *     event beside the excerpt and the age. That is Phase 23 refusal 5 kept
 *     structurally rather than promised.
 *  2. On the press it re-reads that ONE session, refuses when anything at all
 *     is running in it, composes the command through the same rule the remote
 *     arm composes by, types it with NO Enter, and reads the screen back to
 *     say whether it landed. The person presses Enter. Nothing here starts a
 *     process.
 *  3. When a process appears in a session that dropped, it waits for that
 *     process to still be there a moment later, then asks the agent which
 *     conversation it is in.
 *  4. It writes a conversation id in exactly one case out of five, and that
 *     write goes through `claimConversationId`.
 *
 * ## Why the return confirmer is its own reader
 *
 * It cannot be `watchForSessionId`. Every descriptor in
 * `../manifest/harvest/stores.ts` is built to find a record CREATED at or
 * after a given time, and a resume of an existing conversation creates no new
 * record: research 64 section 5.4 measured codex keeping one file and one id
 * across a resume. A harvest watch started at the moment of the return would
 * find nothing. So the sources below are read directly, cheapest first, and a
 * later answer overrules an earlier one.
 *
 * ## What is deliberately not here
 *
 * Nothing is ever typed into a session unasked. No status, no badge, no count.
 * No column is added to the manifest, so a drop that happened while Tortie was
 * closed is not detected at all: the witness is in memory, and that is exactly
 * what makes it immune to the restore shape.
 */

import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { ManifestSessionRecord } from '../manifest';
// DIRECT leaf imports, for the same reason `./core.ts` reaches into
// `../machines/store`: the barrel above these two files pulls in the whole
// harvest layer, and all this module wants is one pattern and one probe.
import { UUID_RE } from '../manifest/harvest/process-table';
import { agyOwnedConversations } from '../manifest/harvest/agy-owner';
// Trap 1 of claude's registry, which is that the `tmux` field's session NAME
// goes stale after a rename and the pane id does not. Imported rather than
// written a second time.
import { parsePaneIdFromTmuxField } from '../activity/claude-registry';
import {
  binaryCandidatesFor,
  commandNamesAgent
} from '../activity/state-machine';
// The edge the one second poll reports, declared where the poll lives. A type
// only import, so nothing new is loaded at run time.
import type { HandbackFact, HandbackOutcome } from '../activity';
// The pure parts of the Phase 89 arming door. They are already exported, so
// nothing is extracted and nothing is copied. The remote typing door itself is
// deliberately not named here, not even in prose: gate 65 of
// build/conformance-machines.mjs pins the two files that may carry its name,
// and it reads bytes rather than code, so a comment counts. The local send is
// a local send.
import {
  composeArmedResumeText,
  countOccurrences,
  decideArmLanding,
  type RemoteArmLanding
} from '../machines/remote-arm';
import { buildArmedCommand } from '../restore/command';
// The SAME two functions the local restore uses, so the command this types and
// the command a restore arms cannot drift into two different quotings.
import { armableResume, typeIntoPane } from '../restore/restore';
import { isWrappedArgv, unwrapArgv } from '../specstory';
import { getLog } from '../log';
import { admitConfirmedConversationId, type IdHarvestDeps } from './id-harvest';
import { LOCAL_MACHINE } from './reconcile-plan';

/** Scope "sessions", the same scope the rest of this directory writes under. */
const sessionsLog = getLog('sessions');

const execFileP = promisify(execFile);

// ---------------------------------------------------------------------------
// The fact a window is told, which is not a status
// ---------------------------------------------------------------------------

/**
 * What Tortie can say about the agent that used to be in this session.
 *
 * IT IS NOT A STATUS AND IT NEVER BECOMES ONE. `SessionStatus` gains no member
 * for it, `statusVisual` is not edited, and there is no code path from this
 * value to a dot. The verb is offered on exactly one of these five.
 *
 *  - `none`         nothing to say. Every session starts here and most stay.
 *  - `left`         the process Tortie watched being the agent has gone and
 *                   nothing has run in the session since. THE ONLY VALUE THAT
 *                   OFFERS THE VERB.
 *  - `returning`    something is running in the session again and Tortie has
 *                   not yet been told which conversation it is.
 *  - `unconfirmed`  something is running and Tortie could not confirm that it
 *                   is the conversation the row holds. The row stays unadopted
 *                   and says so, because adopting the wrong conversation is the
 *                   worst outcome available here.
 *
 * A CONVERSATION THAT IS CONFIRMED AND IS NOT THE ROW'S reads `unconfirmed`
 * too, and the log names the other conversation. There are four answers on the
 * wire and no fifth, so the difference lives in the log rather than in a state
 * a renderer would have to learn.
 *
 * THIS UNION IS WRITTEN DOWN TWICE, here and as `SessionHandbackState` in
 * src/shared/ipc/sessions.ts, because a renderer file cannot import main.
 */
export type HandbackState = 'none' | 'left' | 'returning' | 'unconfirmed';

/**
 * One session's handback fact, as a window receives it.
 *
 * `leftAt` is the moment the witnessed process went away, and a renderer prints
 * it as a time rather than as a duration or a count. It is absent while the
 * state is `none`, because there is nothing to have a time for.
 */
export interface SessionHandbackUpdate {
  sessionId: string;
  handback: { state: HandbackState; leftAt?: number };
}

/**
 * What the activity poll saw, handed over on the edge and never on the level.
 *
 * IT IS THE MONITOR'S OWN TYPE, imported rather than declared a second time.
 * The poll is the only thing that watches processes every second, so it
 * detects the edge and reports it; every decision after the edge is made here.
 * It carries no target and no process of its own for the session, because both
 * are read fresh at the moment they matter, which is the guard the whole design
 * turns on.
 */
export type HandbackObservation = HandbackFact;

// ---------------------------------------------------------------------------
// The press, and what comes back from it
// ---------------------------------------------------------------------------

/**
 * Why nothing was typed. A token rather than a sentence, because every
 * sentence a person reads about resume lives with the rest of the resume copy
 * in the renderer.
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

/** What the press did, with the two counts the landing was decided from. */
export interface ResumeInPlaceResult {
  /** Null when the command was refused before anything was sent. */
  readonly landing: RemoteArmLanding | null;
  /** Null when something was typed. */
  readonly refusal: ResumeInPlaceRefusal | null;
  /** Copies of the command on the screen before the send. For the log. */
  readonly before: number;
  /** Copies after. For the log. */
  readonly after: number;
}

// ---------------------------------------------------------------------------
// The single conversation write
// ---------------------------------------------------------------------------

/**
 * What the write rule decided. It refuses in four of the five cases, and that
 * is the point of it rather than a shortfall.
 */
export type ConversationClaimOutcome =
  /** The confirmed id is the one the row already holds. Nothing was wrong. */
  | 'already-ours'
  /** The row held none, one was confirmed, and it was written. */
  | 'written'
  /** Another row holds that conversation. Nothing was written. */
  | 'held-by-another'
  /** The confirmed id is not the row's. Nothing was written and he is asked. */
  | 'different'
  /** Nothing confirmed an id. Nothing was written. */
  | 'not-confirmed';

/**
 * THE ONE FUNCTION THAT MAY BIND A CONVERSATION TO A ROW ON THIS PATH.
 *
 * Every case is here, in one place, so an unconfirmed press can never overwrite
 * a saved id. That is what one of the three refuted candidate designs gave
 * away: it re-pointed `agent_session_id` on a single unconfirmed press, moved
 * the old value to a column nothing read, and never rebuilt the resume argv,
 * so the row would name one conversation on screen and arm a different one on
 * the next restart.
 *
 * ONLY ONE ARM TOUCHES THE MANIFEST. `written` goes through
 * {@link admitConfirmedConversationId}, which claims the conversation first and
 * rebuilds the resume argv in the same durable write.
 */
export function claimAgentConversationId(
  deps: IdHarvestDeps,
  rec: ManifestSessionRecord,
  confirmedId: string | null,
  at: number
): ConversationClaimOutcome {
  if (confirmedId === null || confirmedId.length === 0) return 'not-confirmed';
  if (rec.agent === 'shell') return 'not-confirmed';
  if (rec.agentSessionId === confirmedId) return 'already-ours';
  if (rec.agentSessionId !== undefined) {
    // He is the only one who knows whether he meant to change which
    // conversation this session holds, so he is asked and nothing moves.
    sessionsLog.warn(
      `session ${rec.id} came back on ${rec.agent} conversation ` +
        `${confirmedId} and the row records ${rec.agentSessionId}. Nothing ` +
        'was written and the row says a different conversation is open.'
    );
    return 'different';
  }
  const admission = admitConfirmedConversationId(deps, rec, confirmedId, at);
  switch (admission) {
    case 'written':
      return 'written';
    case 'claim-refused':
      return 'held-by-another';
    default:
      return 'not-confirmed';
  }
}

// ---------------------------------------------------------------------------
// The targeted reads
// ---------------------------------------------------------------------------

/** The three one process reads this module makes, behind a seam for the test. */
export interface ProcessReader {
  /**
   * `ps -o stat=,ppid= -p <pid>`, measured at 2.5 ms as the median of 15 runs.
   * Null means the process is gone, which is the whole drop rule.
   */
  stat(pid: number): Promise<{ stat: string; ppid: number } | null>;
  /** `pgrep -P <pid>`, measured at 14.6 ms. Empty when nothing is under it. */
  children(pid: number): Promise<number[]>;
  /** `ps -o command= -p <pid>`, measured at 2.3 ms. Empty when it is gone. */
  command(pid: number): Promise<string>;
}

/**
 * The real reads. Absolute program paths, because this runs in a packaged app
 * whose PATH is whatever the login shell handed it.
 */
export const liveProcessReader: ProcessReader = {
  async stat(pid) {
    try {
      const { stdout } = await execFileP(
        '/bin/ps',
        ['-o', 'stat=,ppid=', '-p', String(pid)],
        { timeout: 5_000 }
      );
      const fields = stdout.trim().split(/\s+/u);
      const stat = fields[0];
      const ppid = Number(fields[1]);
      if (stat === undefined || !Number.isInteger(ppid)) return null;
      return { stat, ppid };
    } catch {
      // A non zero exit from `ps -p` IS the answer: there is no such process.
      return null;
    }
  },
  async children(pid) {
    try {
      const { stdout } = await execFileP('/usr/bin/pgrep', ['-P', String(pid)], {
        timeout: 5_000
      });
      return stdout
        .split('\n')
        .map((line) => Number(line.trim()))
        .filter((value) => Number.isInteger(value) && value > 0);
    } catch {
      // pgrep exits 1 when it matched nothing, which is an empty answer.
      return [];
    }
  },
  async command(pid) {
    try {
      const { stdout } = await execFileP(
        '/bin/ps',
        ['-o', 'command=', '-p', String(pid)],
        { timeout: 5_000, maxBuffer: 1024 * 1024 }
      );
      return stdout.trim();
    } catch {
      return '';
    }
  }
};

/** The four facts one targeted tmux read gives about a session's own pane. */
interface PaneNow {
  paneId: string;
  panePid: number;
  dead: boolean;
  currentCommand: string;
}

/**
 * The format of the one read at the moment of the press, measured at 4.1 ms.
 *
 * It is a SESSION target, so tmux resolves it to that session's active pane,
 * which is the only pane a Tortie session ever has. Tab separated and
 * positional, exactly like `../activity/panes.ts`, and `pane_current_command`
 * goes last because it is the one field whose content is arbitrary.
 */
const PANE_NOW_FORMAT = [
  '#{pane_id}',
  '#{pane_pid}',
  '#{pane_dead}',
  '#{pane_current_command}'
].join('\t');

function parsePaneNow(stdout: string): PaneNow | null {
  const fields = stdout.trim().split('\t');
  if (fields.length < 4) return null;
  const paneId = fields[0] ?? '';
  const panePid = Number(fields[1]);
  if (paneId.length === 0 || !Number.isInteger(panePid) || panePid <= 0) {
    return null;
  }
  return {
    paneId,
    panePid,
    dead: fields[2] === '1',
    currentCommand: fields[3] ?? ''
  };
}

// ---------------------------------------------------------------------------
// Asking the agent which conversation it is in
// ---------------------------------------------------------------------------

/**
 * SOURCE 1 — the new process's own command line.
 *
 * Free, and it works for ANY agent, but only when the person typed or pasted a
 * command carrying an id, which is the ordinary case because six of the eleven
 * agents print their resume command as they leave. It may never stand alone
 * past the settle wait, because two live codex processes on the operator's own
 * machine name no conversation at all.
 *
 * PURE. `UUID_RE` is the pattern the harvest layer already holds, imported
 * rather than written again.
 */
export function conversationIdFromCommand(command: string): string | null {
  for (const raw of command.split(/\s+/u)) {
    // `--resume=<id>` and `--session-id=<id>` are as ordinary as the spaced
    // forms, so the flag in front of an `=` is dropped before the test.
    const equals = raw.indexOf('=');
    const token = equals === -1 ? raw : raw.slice(equals + 1);
    if (UUID_RE.test(token)) return token;
  }
  return null;
}

/**
 * SOURCE 2 — claude's own record, measured at 0.80 s after the person's Enter.
 *
 * Claude writes `~/.claude/sessions/<pid>.json` for every interactive session
 * and keeps it current. The file names the conversation, the folder and the
 * pane, and until this phase Tortie parsed it for a status and threw all three
 * away.
 *
 * The match is on the PANE ID and not on the session name, because the name
 * goes stale after a rename and the pane id does not. A file whose pid is the
 * process that just appeared is accepted too, which is the shape a resume
 * inside a surviving shell actually takes.
 *
 * TWO RULES ADDED IN THE PHASE 141 FIX ROUND, because claude does not always
 * delete its own file. A claude ended with SIGKILL, or one that crashed, leaves
 * the record behind naming a pane that is still there.
 *
 *  1. The record whose pid IS the process that just appeared wins outright. It
 *     is the strongest evidence available and a pane match cannot overrule it.
 *  2. A pane match is believed only while its own process is still alive. A
 *     record left behind by a dead claude used to answer for the pane and
 *     overrule the id read off the process that was really running, so Tortie
 *     said the conversation was back when a different one was open.
 */
export async function claudeConversationFor(
  dir: string,
  paneId: string,
  newPid: number,
  isAlive: (pid: number) => boolean = pidIsAlive
): Promise<string | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  let fromPane: string | null = null;
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(join(dir, name), 'utf8'));
    } catch {
      continue;
    }
    if (raw === null || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    if (obj['kind'] !== 'interactive') continue;
    const sessionId = obj['sessionId'];
    if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) continue;
    const pid = obj['pid'];
    if (typeof pid === 'number' && pid === newPid) return sessionId;
    if (fromPane !== null) continue;
    if (parsePaneIdFromTmuxField(obj['tmux']) !== paneId) continue;
    if (typeof pid !== 'number' || !isAlive(pid)) continue;
    fromPane = sessionId;
  }
  return fromPane;
}

/**
 * Is this process id still on the machine? Signal 0 delivers nothing and only
 * asks the question, which is the cheapest liveness answer there is.
 */
function pidIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means it is there and owned by somebody else, which is still there.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * SOURCE 3 — an open descriptor on the conversation.
 *
 * The tree has exactly one such reader and it is antigravity specific: the
 * owning `agy` holds descriptors inside `brain/<id>` and is a descendant of
 * its own pane. There is no equivalent reader for codex or for cursor in this
 * tree, and writing one is not in this phase.
 *
 * Two ids held open is not an answer, so it returns null rather than guessing.
 */
export async function agyConversationFor(
  brainRoot: string,
  panePid: number
): Promise<string | null> {
  const owned = await agyOwnedConversations(brainRoot, panePid);
  if (!owned.ok || owned.ownedIds.size !== 1) return null;
  const [only] = [...owned.ownedIds];
  return only ?? null;
}

// ---------------------------------------------------------------------------
// The service
// ---------------------------------------------------------------------------

/**
 * How long the confirmation waits for the returned process to still be there.
 *
 * MEASURED, and it is the reason the wait exists. Two resume commands typed
 * with fake ids both had their processes gone by 1.092 s and 1.641 s, so a
 * resume that fails looks exactly like a resume that never happened about a
 * second later. Nothing is written until the process has outlived that.
 */
const RETURN_SETTLE_MS = 1_800;

/**
 * How often this module says again what is already true (added at integration).
 *
 * THE PUBLISH IS OTHERWISE AN EDGE, and an edge is lost on anybody who was not
 * listening when it went out. A window that reloads while a session is sitting
 * dropped starts with an empty map and would never hear about it again, because
 * a dropped session is quiet by definition and produces no further edges. So the
 * whole map, which holds one small entry per dropped session and is usually
 * empty, is repeated on this cadence.
 *
 * IT READS NOTHING TO DO IT. There is no screen read, no process read and no
 * tmux call on this path: it repeats records this module already holds, so the
 * rule that a drop is decided from a witness and never from a shape is
 * untouched.
 */
const HANDBACK_HEARTBEAT_MS = 10_000;

/** The cap the arming door holds too, asked here so the refusal is a token. */
const ARMED_TEXT_MAX_CHARS = 1_000;
/** How long to wait before the first read back, and before the second. */
const FIRST_READ_WAIT_MS = 150;
const SECOND_READ_WAIT_MS = 350;


/**
 * How often the identity sources are re-asked while a return is unconfirmed.
 * An agent publishes its conversation between 0.06 s and about 2 s after the
 * person's Enter, so this is well inside every measured answer.
 */
const RETURN_POLL_MS = 1_000;

/**
 * How long the return waits before it gives up and says so.
 *
 * THIS NUMBER IS A CHOICE AND NOT A MEASUREMENT, and research 64 section 13.3
 * says so plainly: nobody has measured how long an agent can take to publish
 * its conversation after a resume. Whatever it ends up being, the answer at the
 * end of it is that Tortie cannot tell which conversation is open, never a
 * guess.
 */
const RETURN_CONFIRM_WINDOW_MS = 120_000;

/** What the service needs from the session core. */
export interface ResumeInPlaceDeps {
  /**
   * The conversation feed's own dependency object, which already carries the
   * manifest, the live id map, the disposed flag and the broadcast. Taking it
   * whole is what keeps the write on this path going through the same door the
   * harvest writes go through.
   */
  readonly harvest: IdHarvestDeps;
  /** One tmux command against the private server. */
  exec(args: readonly string[]): Promise<string>;
  /** Push the handback facts to every window. Never a status. */
  publish(updates: readonly SessionHandbackUpdate[]): void;
  /**
   * Told when a handback closes, so the poll's own state closes with it.
   *
   * ADDED AT INTEGRATION. The poll holds a handback state of its own, and
   * nothing was telling it when a return had been decided, so a session it had
   * seen come back stayed `returning` in the poll for the rest of the run while
   * the window had long since been told the answer. Two states for one fact and
   * only one of them moving is how they end up disagreeing.
   */
  onResolved?(sessionId: string, outcome: HandbackOutcome): void;
  /** The targeted process reads. Injected so the test spawns nothing. */
  readProcess?: ProcessReader;
  /** Types one line with NO Enter. Injected so the test types nowhere. */
  typeInto?(target: string, text: string): Promise<void>;
  /** claude's registry directory. Injected so the test never reads a home. */
  claudeSessionsDir?: string;
  /** antigravity's brain directory. Injected for the same reason. */
  agyBrainRoot?: string;
  now?(): number;
}

/**
 * One session this module has something to say about.
 *
 * IT HOLDS NO TARGET AND NO PROCESS OF ITS OWN FOR THE SESSION. Both are read
 * again at the moment they matter, which is the guard a refuted candidate
 * lacked: it armed from a state a poll had decided up to two seconds earlier,
 * and an adversary measured the armed text landing inside a running agent's
 * input box.
 */
interface HandbackRecord {
  state: HandbackState;
  /**
   * TRUE when a conversation was confirmed here and it is not the one the row
   * holds. It never reaches a window on its own, because the wire has four
   * answers and no fifth. It is kept so the log and a later phase can tell the
   * two ways of being unconfirmed apart.
   */
  differentConversation: boolean;
  /** Epoch ms the process Tortie watched being the agent went away. */
  leftAt: number;
  /** The process id whose return is being confirmed, when one is. */
  confirmingPid: number | null;
  /** Its whole command line, read once at the return. */
  confirmingCommand: string;
  /** Epoch ms the confirmation started, for the window above. */
  confirmingSince: number;
  /** The timer for the next confirmation step, so dispose can end it. */
  timer: NodeJS.Timeout | null;
}

export class ResumeInPlaceService {
  private readonly records = new Map<string, HandbackRecord>();
  private readonly proc: ProcessReader;
  private readonly now: () => number;
  private readonly claudeDir: string;
  private readonly agyRoot: string;
  private disposed = false;
  /** When the whole map was last repeated. See HANDBACK_HEARTBEAT_MS. */
  private heartbeatAt = 0;

  constructor(private readonly deps: ResumeInPlaceDeps) {
    this.proc = deps.readProcess ?? liveProcessReader;
    this.now = deps.now ?? ((): number => Date.now());
    this.claudeDir =
      deps.claudeSessionsDir ?? join(homedir(), '.claude', 'sessions');
    this.agyRoot =
      deps.agyBrainRoot ??
      join(homedir(), '.gemini', 'antigravity-cli', 'brain');
  }

  dispose(): void {
    this.disposed = true;
    for (const record of this.records.values()) {
      if (record.timer !== null) clearTimeout(record.timer);
    }
    this.records.clear();
  }

  /** What a window should be told about this session. */
  handbackOf(sessionId: string): HandbackState {
    return this.records.get(sessionId)?.state ?? 'none';
  }

  /**
   * Every session this module has something to say about, for a window that
   * has just subscribed and holds none of the updates that already went out.
   */
  handbackSnapshot(): SessionHandbackUpdate[] {
    const out: SessionHandbackUpdate[] = [];
    for (const [sessionId, record] of this.records) {
      if (record.state === 'none') continue;
      out.push({
        sessionId,
        handback: { state: record.state, leftAt: record.leftAt }
      });
    }
    return out;
  }

  /**
   * Repeat what is already true, at most once every
   * {@link HANDBACK_HEARTBEAT_MS}, so a window that reloaded after a drop
   * learns about it without waiting for an edge that will never come.
   *
   * It sweeps first, so a session that has since been killed or removed has its
   * record cleared here even if nothing else ever calls in again.
   *
   * IT COSTS NOTHING WHEN NOTHING HAS DROPPED, which is the ordinary case: the
   * map is empty and this returns on its second line.
   */
  heartbeat(): void {
    if (this.disposed) return;
    if (this.records.size === 0) return;
    const now = this.now();
    if (now - this.heartbeatAt < HANDBACK_HEARTBEAT_MS) return;
    this.heartbeatAt = now;
    this.sweep();
    const updates = this.handbackSnapshot();
    if (updates.length > 0) this.deps.publish(updates);
  }

  /**
   * The activity poll saw an edge. THE ONLY WAY A DROP EVER BECOMES A VERB.
   *
   * There is no level here and no shape read: a session with no observation is
   * a session this module says nothing about, which is exactly what makes a
   * freshly restored session with its command armed and unpressed silent.
   */
  noteHandback(sessionId: string, fact: HandbackObservation): void {
    if (this.disposed) return;
    this.sweep();
    if (fact.kind === 'left') this.markLeft(sessionId, fact.leftAt);
    else this.markReturning(sessionId, fact);
  }

  /**
   * Drop the record of any session that no longer has a live pane on this Mac.
   *
   * The poll reports edges and never a clearing, and a session that is killed,
   * removed or reaped simply stops being in the live id map. Sweeping here
   * rather than subscribing to four lifecycle paths keeps the clearing in one
   * place, and the map it walks holds at most one entry per dropped session.
   */
  private sweep(): void {
    for (const sessionId of [...this.records.keys()]) {
      if (!this.deps.harvest.liveIds.has(sessionId)) this.forget(sessionId);
    }
  }

  /**
   * THE FREE ACCELERATOR, and it is never a dependency.
   *
   * Claude's own SessionEnd hook reaches the core the instant a claude session
   * ends, which removes the poll wait for the agent the operator uses most.
   * Every other agent takes the ordinary tick, and claude takes it too when the
   * hook is not installed.
   *
   * IT CANNOT INVENT A DROP. The hook only fires because a claude actually ran
   * and actually ended in that session, which is the same proof the witness is.
   * A session that was restored and never pressed has run no claude, so no hook
   * is ever sent for it.
   */
  noteAgentEnded(sessionId: string): void {
    if (this.disposed) return;
    const rec = this.deps.harvest.manifest.getSession(sessionId);
    if (rec === undefined || rec.agent === 'shell') return;
    const target = this.deps.harvest.liveIds.get(sessionId);
    if (target === undefined) return;
    const existing = this.records.get(sessionId);
    if (existing !== undefined && existing.state !== 'none') return;
    void this.acceleratedDrop(sessionId, target).catch((err: unknown) => {
      sessionsLog.warn(
        `could not check ${sessionId} after its agent ended: ` +
          (err as Error).message
      );
    });
  }

  private async acceleratedDrop(
    sessionId: string,
    target: string
  ): Promise<void> {
    const pane = await this.readPaneNow(target);
    if (pane === null || pane.dead || this.disposed) return;
    // The session's own process must hold the terminal and have nothing under
    // it. Anything else means the agent is still winding down, and the poll
    // sees the edge a second later without this help.
    const own = await this.proc.stat(pane.panePid);
    if (own === null || !own.stat.includes('+')) return;
    const kids = await this.proc.children(pane.panePid);
    if (kids.length > 0 || this.disposed) return;
    const existing = this.records.get(sessionId);
    if (existing !== undefined && existing.state !== 'none') return;
    this.markLeft(sessionId, this.now());
  }

  private markLeft(sessionId: string, leftAt: number): void {
    const before = this.records.get(sessionId);
    if (before?.timer != null) clearTimeout(before.timer);
    this.records.set(sessionId, {
      state: 'left',
      differentConversation: false,
      leftAt,
      confirmingPid: null,
      confirmingCommand: '',
      confirmingSince: 0,
      timer: null
    });
    if (before?.state !== 'left') this.publish(sessionId, 'left');
  }

  private markReturning(
    sessionId: string,
    fact: Extract<HandbackObservation, { kind: 'returning' }>
  ): void {
    const record = this.records.get(sessionId);
    // A session Tortie never saw drop is not a session Tortie may adopt back.
    if (record === undefined || record.state === 'none') return;
    if (record.confirmingPid !== null) return; // one confirmation at a time
    record.confirmingPid = fact.pid;
    record.confirmingCommand = fact.command;
    record.confirmingSince = fact.at;
    record.state = 'returning';
    this.publish(sessionId, 'returning');
    record.timer = this.later(RETURN_SETTLE_MS, () => {
      void this.confirmReturn(sessionId);
    });
  }

  /**
   * The return, confirmed over time rather than on one reading.
   *
   * The settle wait comes first, because a resume that fails looks exactly like
   * a resume that never happened about a second later. Only then are the
   * identity sources asked, cheapest first, a later answer overruling an
   * earlier one.
   */
  private async confirmReturn(sessionId: string): Promise<void> {
    if (this.disposed) return;
    const record = this.records.get(sessionId);
    if (record === undefined || record.confirmingPid === null) return;
    const pid = record.confirmingPid;
    const target = this.deps.harvest.liveIds.get(sessionId);
    const rec = this.deps.harvest.manifest.getSession(sessionId);
    if (target === undefined || rec === undefined) {
      this.forget(sessionId);
      return;
    }
    const pane = await this.readPaneNow(target);
    if (this.disposed) return;

    const alive = await this.proc.stat(pid);
    if (this.disposed) return;
    if (alive === null || pane === null || alive.ppid !== pane.panePid) {
      // It did not survive, or the process id was reused by something that is
      // not in this session. The session is back where it was, so the verb
      // comes back with it and nothing at all was written.
      record.confirmingPid = null;
      record.confirmingCommand = '';
      record.state = 'left';
      this.publish(sessionId, 'left');
      return;
    }

    const confirmed = await this.askWhichConversation(record, rec, pane);
    if (this.disposed) return;
    const outcome = claimAgentConversationId(
      this.deps.harvest,
      rec,
      confirmed,
      this.now()
    );
    switch (outcome) {
      case 'already-ours':
      case 'written':
        // Management adoption AND the conversation binding. Nothing is drawn
        // about this row again, which is the quiet answer the Zen asks for.
        this.deps.onResolved?.(sessionId, 'adopted');
        this.forget(sessionId);
        return;
      case 'different':
        // Nothing is written and nothing is guessed. The row says Tortie
        // cannot confirm which conversation is open, and the log above named
        // the other one, which is where a person who wants to know finds it.
        record.differentConversation = true;
        this.giveUpOnThisReturn(sessionId, record);
        return;
      case 'held-by-another':
        this.giveUpOnThisReturn(sessionId, record);
        return;
      case 'not-confirmed':
        if (this.now() - record.confirmingSince >= RETURN_CONFIRM_WINDOW_MS) {
          this.giveUpOnThisReturn(sessionId, record);
          return;
        }
        record.timer = this.later(RETURN_POLL_MS, () => {
          void this.confirmReturn(sessionId);
        });
        return;
    }
  }

  /**
   * Tortie could not be sure which conversation is open here, so it says so and
   * writes nothing.
   *
   * THE THREE WAYS OF ARRIVING HERE ARE ONE ENDING, extracted at integration
   * because they were three copies of the same four lines and a fourth was one
   * edit away. What the person reads is the same in all three, and the
   * difference between them is in the log.
   */
  private giveUpOnThisReturn(sessionId: string, record: HandbackRecord): void {
    record.confirmingPid = null;
    record.state = 'unconfirmed';
    this.publish(sessionId, 'unconfirmed');
    this.deps.onResolved?.(sessionId, 'unconfirmed');
  }

  /**
   * The identity sources, cheapest first, a later answer overruling an earlier
   * one.
   *
   * SOURCE 4, being muse's own record naming the pane, is NOT read here. Every
   * store descriptor in the harvest layer finds a record created after a given
   * time, and a resume creates no new record, so reading muse needs a reader
   * that walks its store by pane rather than by time and that reader is not in
   * this tree. Muse therefore confirms only when the pasted command carries the
   * id, and the phase says so rather than claiming the wider coverage.
   */
  private async askWhichConversation(
    record: HandbackRecord,
    rec: ManifestSessionRecord,
    pane: PaneNow
  ): Promise<string | null> {
    let answer = this.idFromAgentCommand(record.confirmingCommand, rec);
    if (record.confirmingCommand.length === 0 && record.confirmingPid !== null) {
      answer = this.idFromAgentCommand(
        await this.proc.command(record.confirmingPid),
        rec
      );
    }
    // `ManifestSessionRecord.agent` is declared as the three member AgentKind
    // even though every configured agent id is written into that column, so the
    // id is widened here rather than compared against a type that cannot hold
    // it. Reading it as a string is the honest shape of the column.
    const agent: string = rec.agent;
    if (agent === 'claude') {
      const fromClaude = await claudeConversationFor(
        this.claudeDir,
        pane.paneId,
        record.confirmingPid ?? 0
      );
      if (fromClaude !== null) answer = fromClaude;
    }
    if (agent === 'antigravity') {
      const fromAgy = await agyConversationFor(this.agyRoot, pane.panePid);
      if (fromAgy !== null) answer = fromAgy;
    }
    return answer;
  }

  /**
   * SOURCE 1, and the process must be the AGENT before its id is read.
   *
   * WITHOUT THIS CHECK THE WORST OUTCOME THE PHASE EXISTS TO PREVENT IS ONE
   * ORDINARY COMMAND AWAY. A session whose agent left and whose row holds no
   * conversation used to bind itself to any conversation id that appeared as a
   * bare word on any command line, as long as that process was still there 1.8
   * seconds later. `rg <id> ~/.claude/projects` was driven end to end and wrote
   * that conversation onto the row, so a later Restore would have brought back
   * a conversation nobody ever resumed and hidden the real one.
   *
   * The list is the registry's own, being the same one the witness matches on,
   * so the two ends of this feature cannot disagree about what the agent is
   * called.
   */
  private idFromAgentCommand(
    command: string,
    rec: ManifestSessionRecord
  ): string | null {
    const agent: string = rec.agent;
    if (!commandNamesAgent(command, binaryCandidatesFor(agent))) return null;
    return conversationIdFromCommand(command);
  }

  // -------------------------------------------------------------------------
  // The press
  // -------------------------------------------------------------------------

  /**
   * Put the command that continues this conversation on the person's prompt.
   *
   * THE RE-READ AT THE MOMENT OF THE PRESS is the guard the refuted candidates
   * lacked. One of them armed from a poll up to two seconds old, and an
   * adversary measured the armed text landing inside a running agent's input
   * box, where the person's next Enter sends it to a model as a message. This
   * reads the one session again, at 4.1 ms, and refuses on anything at all.
   *
   * ENTER IS SENT ZERO TIMES.
   */
  async resumeInPlace(sessionId: string): Promise<ResumeInPlaceResult> {
    const refuse = (refusal: ResumeInPlaceRefusal): ResumeInPlaceResult => ({
      landing: null,
      refusal,
      before: 0,
      after: 0
    });
    const record = this.records.get(sessionId);
    if (record === undefined || record.state !== 'left') {
      return refuse('not-dropped');
    }
    const rec = this.deps.harvest.manifest.getSession(sessionId);
    if (rec === undefined || rec.agent === 'shell') return refuse('not-dropped');
    if (rec.agentSessionId === undefined) return refuse('no-conversation');
    const target = this.deps.harvest.liveIds.get(sessionId);
    if (target === undefined) return refuse('not-here');

    const pane = await this.readPaneNow(target);
    if (pane === null || pane.dead) return refuse('not-here');
    const own = await this.proc.stat(pane.panePid);
    // `+` in the STAT means this process holds the terminal. Without it some
    // other program does, and typing into another program's terminal is how
    // text reaches a raw mode reader with no Enter at all.
    if (own === null || !own.stat.includes('+')) return refuse('running');
    // A background job makes this refuse as well. That is deliberate: it fails
    // toward doing nothing, which is the only direction worth failing in here.
    //
    // THE WITNESS IS NOT RE-READ, and it does not need to be. An agent that
    // came back between the last poll and this press is a process under the
    // session's own process, so it is caught here. The one extra read below is
    // what tells the person WHICH of the two happened, because "your agent is
    // already back" and "something is running" are different news.
    const kids = await this.proc.children(pane.panePid);
    if (kids.length > 0) {
      const first = kids[0];
      const running = first === undefined ? '' : await this.proc.command(first);
      return refuse(namesThisAgent(running, rec) ? 'agent-back' : 'running');
    }

    const text = await this.composeLocalArmedText(rec, target);
    if (text === null) return refuse('not-composed');
    return this.armAndReadBack(rec, target, text);
  }

  /**
   * The command to type, composed by the same rule the remote arm composes by.
   *
   * RULE 1, being that every element after the program path is either a token
   * Tortie's own compiled build holds or this row's own conversation id, is
   * applied to the AGENT'S OWN argv. When the row is captured, the SpecStory
   * wrapper around that argv is Tortie's own record of its own bundled binary,
   * and the text that is typed is the one a restore of this row would type, so
   * the two cannot drift.
   */
  private async composeLocalArmedText(
    rec: ManifestSessionRecord,
    target: string
  ): Promise<string | null> {
    const armable = await armableResume(rec);
    const argv = armable.argv;
    if (argv.length === 0) return null;
    const inner = isWrappedArgv(argv) ? unwrapArgv(argv) : argv;
    const composed = composeArmedResumeText({
      machineId: LOCAL_MACHINE,
      target,
      agent: rec.agent,
      agentSessionId: rec.agentSessionId ?? '',
      recordedResumeArgv: inner,
      binOnMachine: inner[0] ?? ''
    });
    if (composed.text === null) {
      sessionsLog.warn(
        `Tortie composed no resume command for ${rec.agent} in session ` +
          `${rec.id}: ${composed.detail}`
      );
      return null;
    }
    const text = buildArmedCommand(argv);
    // The same two checks the composer makes, applied to the text that is
    // really typed rather than to the agent's half of it. A newline typed this
    // way IS Enter, and this path never presses Enter.
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code < 0x20 || code === 0x7f) {
        sessionsLog.warn(
          `the resume command for session ${rec.id} carries the character ` +
            `${String(code)} at position ${String(i)}, so nothing was typed`
        );
        return null;
      }
    }
    if (text.length === 0 || text.length > ARMED_TEXT_MAX_CHARS) return null;
    return text;
  }

  /**
   * Read the screen, type the line, read the screen again, and say which of the
   * four landings happened.
   *
   * The counting ignores every space on both sides, which is the whole fix for
   * a line the shell wrapped itself. On the operator's own Mac an armed resume
   * that HAD landed was reported absent before that fix, because zsh writes its
   * own line break and `capture-pane -J` has nothing to join.
   */
  private async armAndReadBack(
    rec: ManifestSessionRecord,
    target: string,
    text: string
  ): Promise<ResumeInPlaceResult> {
    let readFailed = false;
    let before = 0;
    try {
      before = countOccurrences(await this.readScreen(target), text);
    } catch (err) {
      readFailed = true;
      sessionsLog.warn(
        `could not read session ${rec.id} before arming it: ` +
          (err as Error).message
      );
    }
    let sendDetail = '';
    try {
      await (this.deps.typeInto ?? localTypeInto)(target, text);
    } catch (err) {
      sendDetail = (err as Error).message;
    }
    await wait(FIRST_READ_WAIT_MS);
    let after = before;
    try {
      after = countOccurrences(await this.readScreen(target), text);
    } catch (err) {
      readFailed = true;
      sendDetail = sendDetail === '' ? (err as Error).message : sendDetail;
    }
    if (!readFailed && after - before === 0) {
      // A shell echoes what tmux delivered a moment after it delivers it, so a
      // screen read too early would report absent for a command on its way.
      await wait(SECOND_READ_WAIT_MS);
      try {
        after = countOccurrences(await this.readScreen(target), text);
      } catch (err) {
        readFailed = true;
        sendDetail = sendDetail === '' ? (err as Error).message : sendDetail;
      }
    }
    const landing = decideArmLanding(before, after, readFailed);
    sessionsLog.info(
      `armed a resume in place for ${rec.agent} session ${rec.id}: landing ` +
        `${landing}, copies before ${String(before)}, copies after ` +
        `${String(after)}, target ${target}` +
        (sendDetail === '' ? '' : `, tmux reported ${sendDetail}`)
    );
    return { landing, refusal: null, before, after };
  }

  // -------------------------------------------------------------------------

  private async readPaneNow(target: string): Promise<PaneNow | null> {
    try {
      return parsePaneNow(
        await this.deps.exec([
          'display-message',
          '-p',
          '-t',
          target,
          PANE_NOW_FORMAT
        ])
      );
    } catch {
      return null;
    }
  }

  /**
   * `-p` prints the screen and writes nothing, `-J` joins a line the terminal
   * wrapped, and there is no `-e`, so no escape sequences come back to be
   * counted.
   */
  private readScreen(target: string): Promise<string> {
    return this.deps.exec(['capture-pane', '-p', '-J', '-t', target]);
  }

  /**
   * Drop this session's record and tell every window it is gone.
   *
   * PUBLIC SINCE INTEGRATION, because the session lifecycle in ./core.ts must
   * be able to clear a record the moment a session is killed, removed or
   * reaped, rather than leaving it for the next sweep. Calling it for a session
   * with no record does nothing at all.
   */
  forget(sessionId: string): void {
    const record = this.records.get(sessionId);
    if (record === undefined) return;
    if (record.timer !== null) clearTimeout(record.timer);
    this.records.delete(sessionId);
    if (record.state !== 'none') this.publish(sessionId, 'none');
  }

  private publish(sessionId: string, state: HandbackState): void {
    if (this.disposed) return;
    const leftAt = this.records.get(sessionId)?.leftAt;
    this.deps.publish([
      {
        sessionId,
        handback:
          state === 'none' || leftAt === undefined
            ? { state }
            : { state, leftAt }
      }
    ]);
  }

  private later(ms: number, fn: () => void): NodeJS.Timeout {
    const timer = setTimeout(fn, ms);
    // Never hold the process open for a confirmation nobody is waiting on.
    timer.unref?.();
    return timer;
  }
}

/**
 * Does this command line name the agent this row records, or its conversation?
 *
 * PURE, and it is only ever asked about a process that is already refusing the
 * press. It decides which of two refusals a person reads and it decides nothing
 * else, so a wrong answer costs one word and never a keystroke.
 */
function namesThisAgent(command: string, rec: ManifestSessionRecord): boolean {
  if (command.length === 0) return false;
  if (
    rec.agentSessionId !== undefined &&
    command.includes(rec.agentSessionId)
  ) {
    return true;
  }
  const agent: string = rec.agent;
  return command.split(/\s+/u).some((word) => {
    const slash = word.lastIndexOf('/');
    return (slash === -1 ? word : word.slice(slash + 1)) === agent;
  });
}

/**
 * The local send. It reuses the restore path's own `send-keys -l` with no
 * Enter, which is the same door and the same quoting the armed restore has
 * always used.
 */
function localTypeInto(target: string, text: string): Promise<void> {
  return typeIntoPane(target, text, false);
}

function wait(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
