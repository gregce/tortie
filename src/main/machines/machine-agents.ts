/**
 * Which agents one machine has, held in memory per connection (Phase 109,
 * research 58).
 *
 * ## What this module is
 *
 * One answer per machine about the agents Tortie can launch, read in ONE
 * batched `agents-find` call, stamped with that machine's connection
 * generation, written to no disk and to no manifest. The renderer reads it
 * over `machines:agents` and is pushed `machines:agentsChanged`, and the only
 * thing the answer ever decides is what a TILE looks like. `remoteBinFor` and
 * the restore path keep asking `program-find` at create time and at restore
 * time, so nothing here can put a path into a manifest row.
 *
 * ## The one ruling every reader must keep
 *
 * Per agent the renderer sees `present`, `absent` or `unknown`, and ONLY
 * `absent` may grey a tile. `unknown` covers a machine nobody asked, a scan
 * that failed, a home the machine would not state, and a `none` computed
 * while a folder on the search list could not be read. The two errors are not
 * symmetric: a false present costs one refusal that names the machine, and a
 * false absent removes a capability a person cannot argue with.
 *
 * ## The three triggers, and none of them is a clock
 *
 *  1. `prepareMachine` starts one scan when a machine becomes ready, with
 *     `void`, so nothing a person waits on awaits it.
 *  2. `machines:agents` with `fresh: true` is one person pressing Rescan.
 *  3. {@link noteMachineAgent} folds the create path's and the restore path's
 *     own single agent answers back in, on both arms. What actually ran is
 *     stronger evidence than the scan, and it costs zero round trips.
 *
 * There is no timer, no sweep, no scan when the create sheet opens, and no
 * probe of a machine that is not connected.
 *
 * ## Why memory and not disk
 *
 * A machine with no run time context cannot hold a session, so a persisted
 * answer could never be acted on before a fresh Prepare produced a fresh one.
 * The precedents in this layer are `homes` in `./remote-image.ts` and `walks`
 * in `./project-counterpart.ts`, both keyed the same way. The map is cleared
 * by `forgetMachineSessions` in `./tombstone.ts` when a machine is removed.
 */

import type { MachineAgentReading, MachineAgentsView } from '@shared/ipc';
import { gmuxError } from '../errors';
import { getLog } from '../log';
import { currentAgentTable } from '../config/store';
import {
  LOCAL_MACHINE_ID,
  machineContext,
  machineGeneration,
  onMachineGenerationBumped
} from './context';
import { MACHINE_NOT_READY } from './remote-copy';
import { rebaseRemoteDir, remoteSearchDirs } from './remote-argv';
import { remoteMachineHomeAnswer } from './remote-image';
import {
  assertMachineIsConnected,
  composeRemoteScriptCommand,
  runRemoteRead
} from './remote-run';
import {
  REMOTE_SCRIPT_MAX_BYTES,
  remoteScript,
  type RemoteScript
} from './remote-scripts';
import { currentMachines } from './store';

const agentsLog = getLog('machines');

/**
 * How long one batched read gets. 10,000 ms, the same budget every other
 * short read on this connection gets. The measured answer is 52 ms median on
 * a warm connection (research 58 section 2.1), so the budget is headroom and
 * not a target.
 */
export const REMOTE_AGENTS_TIMEOUT_MS = 10_000;

/** What one machine last said about one launch name. */
interface HeldReading {
  readonly presence: 'present' | 'absent';
  /** Absolute path on that machine. Null unless present. */
  readonly path: string | null;
}

/** One machine's held answer, bound to the connection that produced it. */
interface HeldMachineAgents {
  /** `machineGeneration(id).generation` at the time the answer landed. */
  generation: number;
  /** `Date.now()` when the machine last answered. */
  askedAt: number;
  /** Keyed by BARE LAUNCH NAME, not by agent id. */
  byName: Map<string, HeldReading>;
}

const held = new Map<string, HeldMachineAgents>();

type Listener = () => void;
let listeners: Listener[] = [];

/** Called after any machine's held answer changes. The overlay precedent. */
export function onMachineAgentsChanged(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function notify(): void {
  for (const cb of [...listeners]) cb();
}

// Phase 109 fix round. A generation bump makes every held answer for that
// machine read as unknown, because `machineAgentsView` binds a held answer to
// the generation that produced it. MEASURED before this line existed: after a
// failed Prepare, main answered 11 unknown and 0 absent while the open create
// sheet still greyed 9 tiles from the dead connection's answer, and the board
// healed only when the next scan answered or a fold back landed. The bump is
// the moment the old answer stops being true, so it is the moment the
// renderer is told.
onMachineGenerationBumped(() => notify());

// ---------------------------------------------------------------------------
// The names the scan asks about. Pure reads of the merged table.
// ---------------------------------------------------------------------------

/** One bare launch name, the agents that launch with it, and their folders. */
interface AskedName {
  name: string;
  agentIds: string[];
  probeDirs: string[];
}

/**
 * Every bare name a launchable agent starts with, deduped.
 *
 * The name is `launch.argv[0]`, because that is the only name that can start
 * a session (research 58 section 2.7). A configured agent whose `argv[0]` is
 * an absolute path is SKIPPED rather than asked: the path is the person's
 * own, `OVERLAY_BARE_BINARY_PATTERN` constrains only the bare form, and a
 * question about a path is not a question about a name.
 */
function askedNames(): AskedName[] {
  const byName = new Map<string, AskedName>();
  for (const entry of currentAgentTable()) {
    if (!entry.launchable || entry.launch === null) continue;
    const name = entry.launch.argv[0] ?? '';
    if (name.length === 0 || name.startsWith('/')) continue;
    const row = byName.get(name) ?? { name, agentIds: [], probeDirs: [] };
    row.agentIds.push(entry.id);
    for (const dir of entry.extraProbeDirs) {
      if (!row.probeDirs.includes(dir)) row.probeDirs.push(dir);
    }
    byName.set(name, row);
  }
  return [...byName.values()];
}

/**
 * One record line for one name. PURE.
 *
 * The bare name, one space, then that name's own folders rebased on the
 * machine's stated home, deduped and joined with colons. A name with no
 * usable folder is the name alone, which the script reads as an empty list.
 * `rebaseRemoteDir` refuses a folder holding a colon, which is what keeps the
 * join unambiguous.
 */
export function composeAgentRecord(
  name: string,
  probeDirs: readonly string[],
  home: string
): string {
  const dirs: string[] = [];
  const seen = new Set<string>();
  for (const entry of probeDirs) {
    const dir = rebaseRemoteDir(entry, home);
    if (dir === null || seen.has(dir)) continue;
    seen.add(dir);
    dirs.push(dir);
  }
  return dirs.length === 0 ? name : `${name} ${dirs.join(':')}`;
}

// ---------------------------------------------------------------------------
// Chunking. Pure, so the byte arithmetic is testable without a connection.
// ---------------------------------------------------------------------------

/** How the record lines were packed against the command byte cap. */
export interface AgentRecordChunks {
  /** Each inner array composes to a command at or under the cap. */
  readonly chunks: readonly (readonly string[])[];
  /** Records that alone exceed the cap. Not sent; their agents stay unknown. */
  readonly oversize: readonly string[];
}

/**
 * Pack record lines greedily so every composed command fits the far side's
 * one argument cap of {@link REMOTE_SCRIPT_MAX_BYTES} bytes.
 *
 * The compiled table composes about 1,700 bytes, being 1.3 % of the cap, so
 * this loop makes one chunk for everybody with no `agents.json`. It exists
 * because `OVERLAY_LIMITS` allows 32 rows with 16 folders of 512 characters
 * inside a 262,144 byte file, which can exceed the 131,072 byte command cap,
 * and step 6 of `runRemoteScript` would refuse the whole scan.
 */
export function chunkAgentRecords(
  script: RemoteScript,
  records: readonly string[],
  loginPath: string,
  sharedDirs: string
): AgentRecordChunks {
  const fits = (rows: readonly string[]): boolean => {
    const command = composeRemoteScriptCommand(script, [
      loginPath,
      sharedDirs,
      rows.join('\n')
    ]);
    return Buffer.byteLength(command, 'utf8') <= REMOTE_SCRIPT_MAX_BYTES;
  };
  const chunks: string[][] = [];
  const oversize: string[] = [];
  let current: string[] = [];
  for (const record of records) {
    if (!fits([record])) {
      oversize.push(record);
      continue;
    }
    if (current.length === 0 || fits([...current, record])) {
      current.push(record);
      continue;
    }
    chunks.push(current);
    current = [record];
  }
  if (current.length > 0) chunks.push(current);
  return { chunks, oversize };
}

// ---------------------------------------------------------------------------
// The parse. Pure.
// ---------------------------------------------------------------------------

/** What one chunk's payload said, with the downgrade already applied. */
export interface AgentsFindParse {
  /** Name to reading. A name that is not here stays unknown. */
  readonly byName: Map<string, HeldReading>;
  /** Folders the far side reported it could not read or enter. */
  readonly unreadable: readonly string[];
  /** How many `none` answers were downgraded to unknown by that section. */
  readonly downgraded: number;
}

/**
 * One `agents-find` payload into readings. PURE.
 *
 * Lines before a bare `unreadable` line are `<source> <name> <path>`, split
 * on the first two spaces, and the path is THE REST OF THE LINE because a
 * folder on another computer can hold a space in its name. A name that was
 * not asked is dropped rather than believed.
 *
 * THE DOWNGRADE IS THE PHASE'S ONE RULING APPLIED HERE. If the `unreadable`
 * section names any folder, every `none` in this chunk becomes unknown,
 * because an absent computed while a folder on the search list could not be
 * read is not a positive absent, and only a positive absent may grey a tile.
 * A found path stays present, because a find is its own proof.
 */
export function parseAgentsFind(
  payload: string,
  asked: ReadonlySet<string>
): AgentsFindParse {
  const byName = new Map<string, HeldReading>();
  const unreadable: string[] = [];
  let inUnreadable = false;
  for (const raw of payload.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!inUnreadable && line.trim() === 'unreadable') {
      inUnreadable = true;
      continue;
    }
    if (inUnreadable) {
      const folder = line.trim();
      if (folder.length > 0) unreadable.push(folder);
      continue;
    }
    const first = line.indexOf(' ');
    if (first <= 0) continue;
    const source = line.slice(0, first);
    const rest = line.slice(first + 1);
    const second = rest.indexOf(' ');
    if (second <= 0) continue;
    const name = rest.slice(0, second);
    const path = rest.slice(second + 1);
    if (!asked.has(name)) continue;
    if (source === 'path' || source === 'agent' || source === 'install') {
      if (path.startsWith('/')) {
        byName.set(name, { presence: 'present', path });
      }
      continue;
    }
    if (source === 'none') {
      byName.set(name, { presence: 'absent', path: null });
    }
  }
  let downgraded = 0;
  if (unreadable.length > 0) {
    for (const [name, reading] of [...byName]) {
      if (reading.presence === 'absent') {
        byName.delete(name);
        downgraded += 1;
      }
    }
  }
  return { byName, unreadable, downgraded };
}

// ---------------------------------------------------------------------------
// The views
// ---------------------------------------------------------------------------

/**
 * The held answer for one machine, as the shared view type.
 *
 * Presence is `unknown` for every launchable agent when nothing is held, and
 * when the held answer belongs to an older generation, because an answer from
 * a connection Tortie no longer has is not an answer about the machine it has
 * now.
 */
export function machineAgentsView(machineId: string): MachineAgentsView {
  const row = held.get(machineId);
  const current = machineGeneration(machineId).generation;
  const live = row !== undefined && row.generation === current ? row : null;
  const agents: MachineAgentReading[] = [];
  for (const entry of currentAgentTable()) {
    if (!entry.launchable || entry.launch === null) continue;
    const name = entry.launch.argv[0] ?? '';
    const reading =
      name.length === 0 || name.startsWith('/')
        ? undefined
        : live?.byName.get(name);
    agents.push({
      agentId: entry.id,
      presence: reading?.presence ?? 'unknown',
      path: reading?.presence === 'present' ? reading.path : null
    });
  }
  return { machineId, askedAt: live?.askedAt ?? null, agents };
}

/** One view per machine in the file. A removed machine never appears. */
export function allMachineAgentsViews(): MachineAgentsView[] {
  return currentMachines().rows.map((row) => machineAgentsView(row.id));
}

// ---------------------------------------------------------------------------
// The fold back and the forget
// ---------------------------------------------------------------------------

/**
 * Fold one real answer back into the map (Phase 109, the free third trigger).
 *
 * `remoteBinFor` and the restore path already learn the truth for one agent
 * by running the same file test, so both report here on both arms. Applied
 * only against the CURRENT generation: a result from a connection that is
 * gone says nothing about the one Tortie has now. When nothing is held yet, a
 * fresh record is created at the current generation, so the first create on a
 * machine teaches the board something even if the scan never ran.
 */
export function noteMachineAgent(
  machineId: string,
  bareName: string,
  found: { path: string } | null
): void {
  if (bareName.length === 0) return;
  const current = machineGeneration(machineId).generation;
  const row = held.get(machineId);
  const live =
    row !== undefined && row.generation === current
      ? row
      : {
          generation: current,
          askedAt: Date.now(),
          byName: new Map<string, HeldReading>()
        };
  live.byName.set(
    bareName,
    found === null
      ? { presence: 'absent', path: null }
      : { presence: 'present', path: found.path }
  );
  live.askedAt = Date.now();
  held.set(machineId, live);
  notify();
}

/**
 * Forget one machine's answer. `forgetMachineSessions` calls it, so a removed
 * machine leaves nothing behind, and a test calls it to start clean.
 */
export function forgetMachineAgents(machineId: string): void {
  if (held.delete(machineId)) notify();
}

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

/**
 * Ask one machine, once, which launchable agents it has.
 *
 * A read. It starts nothing on either computer and writes nothing anywhere.
 * The answer is stored only when the connection generation did not move while
 * the scan ran; a Prepare that lands mid scan starts its own scan and the
 * stale answer is dropped. Every failure leaves agents `unknown` rather than
 * absent, and the log line says which failure it was.
 *
 * @throws GmuxError INVALID_INPUT while the machine has no registered context
 *   or no captured program list, with {@link MACHINE_NOT_READY}, and with
 *   `MACHINE_NOT_CONNECTED` while it is not answering, so a Rescan press can
 *   read the refusal instead of silence. A chunk that fails MID SCAN throws
 *   nothing: its names stay unknown, the other chunks still land, and the
 *   log line carries the failure.
 */
export async function scanMachineAgents(
  machineId: string
): Promise<MachineAgentsView> {
  if (machineId === LOCAL_MACHINE_ID) {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `refused an agent scan for ${machineId}: this Mac answers from its own ` +
        `detection scan, not from a machine read`
    );
  }
  // Throws MACHINE_NOT_READY's sibling sentence for an unregistered id.
  const ctx = machineContext(machineId);
  if (ctx.kind !== 'remote') {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `refused an agent scan for ${machineId}: it is not a remote machine`
    );
  }
  const before = machineGeneration(machineId);
  if (before.remotePath === null) {
    throw gmuxError(
      'INVALID_INPUT',
      MACHINE_NOT_READY,
      `refused an agent scan for ${machineId}: no program search list is ` +
        `captured for its current connection`
    );
  }
  // The connected gate, asked out loud HERE as well as inside every read, so
  // a Rescan on a machine that stopped answering is a sentence rather than a
  // silent all-unknown view.
  assertMachineIsConnected(machineId, 'agents-find');
  const script = remoteScript('agents-find');
  if (script === null) {
    throw new Error('the catalogue holds no script called agents-find');
  }

  const asked = askedNames();
  if (asked.length === 0) return machineAgentsView(machineId);

  // Fix 3's teeth. A home Tortie could not ask for is a scan that does not
  // run, because a search narrowed to the two home free folders would report
  // absent for an agent that is installed under the home.
  const homeAnswer = await remoteMachineHomeAnswer(ctx);
  if (!homeAnswer.asked) {
    agentsLog.warn(
      `${machineId} did not say where its home folder is, so Tortie did not ` +
        `scan its agents. Every agent stays selectable there.`
    );
    return machineAgentsView(machineId);
  }
  const home = homeAnswer.home;
  const loginPath = before.remotePath;
  const sharedDirs = remoteSearchDirs([], home).dirs.join(':');
  const records = asked.map((one) =>
    composeAgentRecord(one.name, one.probeDirs, home)
  );
  const { chunks, oversize } = chunkAgentRecords(
    script,
    records,
    loginPath,
    sharedDirs
  );
  if (oversize.length > 0) {
    agentsLog.warn(
      `${machineId} was not asked about ${String(oversize.length)} agent ` +
        `name(s), because each of their record lines alone would compose a ` +
        `command over ${String(REMOTE_SCRIPT_MAX_BYTES)} bytes. They stay ` +
        `unknown.`
    );
  }

  const startedAt = Date.now();
  const scanned = new Map<string, HeldReading>();
  let commandBytes = 0;
  let downgraded = 0;
  let failedChunks = 0;
  let lastFailure = '';
  for (const chunk of chunks) {
    const args = [loginPath, sharedDirs, chunk.join('\n')];
    commandBytes += Buffer.byteLength(
      composeRemoteScriptCommand(script, args),
      'utf8'
    );
    try {
      const answer = await runRemoteRead(ctx, 'agents-find', args, {
        timeoutMs: REMOTE_AGENTS_TIMEOUT_MS
      });
      const names = new Set(
        chunk.map((line) => line.split(' ')[0] ?? '').filter((n) => n.length > 0)
      );
      const parsed = parseAgentsFind(answer.payload, names);
      downgraded += parsed.downgraded;
      for (const [name, reading] of parsed.byName) scanned.set(name, reading);
    } catch (err) {
      // A chunk that fails contributes unknown for its names and fails no
      // other chunk.
      failedChunks += 1;
      lastFailure = err instanceof Error ? err.message : String(err);
    }
  }

  if (chunks.length > 0 && failedChunks === chunks.length) {
    agentsLog.warn(
      `${machineId} did not answer the agent scan, so every agent stays ` +
        `selectable there: ${lastFailure}`
    );
    return machineAgentsView(machineId);
  }

  // The generation rule. An answer that outlived its connection is dropped;
  // the Prepare that bumped the generation starts its own scan.
  const after = machineGeneration(machineId);
  if (after.generation !== before.generation) {
    agentsLog.warn(
      `${machineId} moved to a new connection while the agent scan ran, so ` +
        `its answer was dropped. The fresh connection scans on its own.`
    );
    return machineAgentsView(machineId);
  }

  // Merge over what is already held for this generation, so a fold back from
  // a real create and the answers of an earlier scan survive a partial one.
  const prior = held.get(machineId);
  const byName =
    prior !== undefined && prior.generation === before.generation
      ? new Map(prior.byName)
      : new Map<string, HeldReading>();
  for (const [name, reading] of scanned) byName.set(name, reading);
  held.set(machineId, {
    generation: before.generation,
    askedAt: Date.now(),
    byName
  });
  notify();

  let found = 0;
  let absent = 0;
  for (const reading of scanned.values()) {
    if (reading.presence === 'present') found += 1;
    else absent += 1;
  }
  const ms = Date.now() - startedAt;
  const downgradeSentence =
    downgraded > 0
      ? ` ${String(downgraded)} answer(s) were kept as unknown because a ` +
        `folder on the search list could not be read.`
      : '';
  // The count is the names actually sent, not the names the table holds: an
  // oversize record was never asked and its own warn line said so above.
  const sent = asked.length - oversize.length;
  agentsLog.info(
    `${machineId} answered about ${String(sent)} agent name(s) in ` +
      `${String(ms)} ms. ${String(found)} were found and ${String(absent)} ` +
      `were not. The composed command was ${String(commandBytes)} bytes ` +
      `against a cap of ${String(REMOTE_SCRIPT_MAX_BYTES)}.${downgradeSentence}`
  );
  return machineAgentsView(machineId);
}
