/**
 * Connected-only harvest. Reading an agent's own store on another machine, and
 * only while Tortie is connected to it (Phase 73, M6, research 51 section 6
 * row M6).
 *
 * ## What it does
 *
 * The local harvest learns which conversation a session owns by watching an
 * agent's own store on this Mac. This module does the same for a machine Tortie
 * is connected to, by asking that machine for a directory listing and for the
 * first bytes of a candidate record. When one record proves out, the manifest
 * row for that session gets its conversation id, a resume command, and a record
 * of how good the evidence was.
 *
 * The DECISIONS are next door and pure, in `../manifest/harvest/remote.ts`.
 * This module owns the reads, the cadence and the writes, and nothing else. It
 * is the same seam ./remote-capsule.ts has, and its shape is copied from that
 * module on purpose.
 *
 * ## Connected only, stated as three properties
 *
 * 1. NO CLAIM WITHOUT A CONNECTION. Every read goes through `runRemoteRead` in
 *    ./remote-run.ts, which refuses when the link is not `connected` or
 *    `polling`. A machine that is not answering produces no listing, so it
 *    produces no claim, and the refusal is what fires rather than a silent
 *    absence.
 * 2. NO CLAIM THAT OUTLIVES ITS CONNECTION. Every claim carries the connection
 *    generation it was read under. When that number moves, every in memory
 *    claim for the machine is dropped in the same tick, and a pass in flight
 *    stops between reads and writes nothing more.
 * 3. A WRITTEN CLAIM IS A CLAIM ABOUT A MOMENT, AND IT SAYS WHICH MOMENT. The
 *    manifest row records `at`, `machineId` and the source
 *    `remote-store-harvest`. A row read tomorrow says when the id was collected
 *    and on which machine. Nothing in the product restates it as current.
 *
 * ## What this gives a person, stated honestly
 *
 * ONE agent of the thirteen gets an armed conversation resume on another
 * machine from this rung, and that agent is muse, whose records carry the pane
 * they ran in. Three more, being codex, deepseek and pi, get a recorded id that
 * `./resume-arming.ts` refuses to type, because their only ownership field is a
 * folder and a folder is not an identity. qwen and antigravity get nothing,
 * because both need a read of the far side's process table and this rung sends
 * none. The remaining seven pre-assign their id and need no harvest.
 *
 * ## The numbers, all chosen rather than measured
 *
 * | Rule | Value |
 * | --- | --- |
 * | Machine cadence while a window has focus | 60,000 ms |
 * | Machine cadence with no focus | 300,000 ms |
 * | Sessions asked about in one pass | at most 6 |
 * | Candidate records read in one pass, per session | at most 3 |
 * | Bytes read from one record | at most 8,192 |
 * | How long one read gets | 15,000 ms |
 * | Passes in flight per machine | 1 |
 *
 * No load test set any of them and no copy in the product implies otherwise.
 * `build/probe-remote-harvest.mjs` measures what they produce, being the bytes
 * read per pass and the wall clock of a pass at one session and at six.
 */

import type { LaunchableAgentId } from '@shared/types';
import type { AgentHarvestKey } from '../agents/registry';
import { getLog } from '../log';
import {
  confirmRemoteCandidate,
  decideRemoteHarvest,
  parseMachineFacts,
  parseRemoteListing,
  remoteHarvestRoots,
  remoteHarvestsId,
  rootOfRemotePath,
  type RemoteCandidate,
  type RemoteConfirmVerdict,
  type RemoteHarvestFacts
} from '../manifest/harvest/remote';
// The one window this rung walks back from a session's create instant. It is
// ./stores.ts's own constant rather than a second copy of the number, because
// two different 8 day windows in one product is how they come to disagree.
import { DATE_SHARD_WINDOW_MS } from '../manifest/harvest/stores';
import { machineGeneration, type RemoteMachineContext } from './context';
import { onMachineLinkChanged } from './control-plane';
import { remoteRecordOf, writeRemoteHarvest } from './remote-record';
// The second door. It is the ONLY way a command that is not a tmux verb reaches
// a machine, and connected-only lives inside it for every caller at once.
import { machineIsConnected, runRemoteRead } from './remote-run';
// The one word every script prints when it looked and found nothing. It is not
// a failure, and it must never be read as a payload.
import { REMOTE_SCRIPT_EMPTY } from './remote-scripts';
import {
  readyRemoteContext,
  remotePollIsFocused,
  remoteSessions,
  remoteSessionRow
} from './remote-sessions';

const harvestLog = getLog('config');

// ---------------------------------------------------------------------------
// The numbers, all chosen
// ---------------------------------------------------------------------------

/** How often a connected machine's stores are read while a window has focus. */
export const REMOTE_HARVEST_FOCUSED_MS = 60_000;

/** How often they are read when no window has focus. */
export const REMOTE_HARVEST_IDLE_MS = 300_000;

/** How many sessions one pass may ask about. */
export const REMOTE_HARVEST_PER_PASS = 6;

/** How many candidate records one session's pass may read. */
export const REMOTE_HARVEST_HEADS_PER_SESSION = 3;

/** How long one read gets. */
export const REMOTE_HARVEST_TIMEOUT_MS = 15_000;

/** The most head bytes one candidate read asks for. */
export const REMOTE_HARVEST_HEAD_BYTES = 8_192;

/**
 * The two statuses that mean the machine's last completed list held the row.
 *
 * A row the list did not hold has no pane on that machine, so muse's key cannot
 * be compared against anything and the session is not producing new records
 * either. Asking about it would spend a read for nothing.
 */
const LISTED_STATUSES = new Set(['running', 'idle']);

// ---------------------------------------------------------------------------
// What this module remembers
// ---------------------------------------------------------------------------

/** One conversation id read off a machine, and the connection it belongs to. */
export interface RemoteHarvestClaim {
  readonly sessionId: string;
  readonly machineId: string;
  /** The connection generation this answer was read under. */
  readonly generation: number;
  readonly agent: LaunchableAgentId;
  /** The conversation id the record carried. */
  readonly conversationId: string;
  /** The record's absolute path ON THAT MACHINE. */
  readonly storePath: string;
  /** The store root it was found under, on that machine. */
  readonly storeRoot: string;
  /** Local epoch ms this Mac accepted it. */
  readonly at: number;
}

/** The far side's own answer about itself, per machine and per generation. */
interface CachedFacts {
  readonly generation: number;
  readonly facts: RemoteHarvestFacts;
}

const claims = new Map<string, RemoteHarvestClaim>();
const facts = new Map<string, CachedFacts>();
/** Local epoch ms of the last completed pass, per machine. */
const lastPassAt = new Map<string, number>();
/** Local epoch ms this session was last asked about, per session id. */
const lastAskedAt = new Map<string, number>();
const inFlight = new Set<string>();

let timer: NodeJS.Timeout | null = null;
let unlink: (() => void) | null = null;
/** Reads sent since the last reset. The probe prints it. */
let commandsSent = 0;
/** Payload bytes read since the last reset. The probe prints it. */
let bytesRead = 0;

// ---------------------------------------------------------------------------
// The lifecycle
// ---------------------------------------------------------------------------

/**
 * Start reading stores on connected machines. Called once, from the capability
 * installer.
 *
 * Two things drive it. The timer is the cadence. The link subscription is what
 * makes a machine that just connected produce its first claim without waiting a
 * whole cadence, and it is also what drops the claims of a connection that just
 * went away.
 *
 * Calling it twice is the same as calling it once.
 */
export function startRemoteHarvest(): void {
  if (timer !== null) return;
  timer = setInterval(() => {
    void harvestEveryMachine().catch(() => undefined);
  }, REMOTE_HARVEST_FOCUSED_MS);
  timer.unref?.();
  unlink = onMachineLinkChanged(() => {
    // ORDER MATTERS. The claims of a connection that moved are dropped BEFORE
    // anything is read, so no answer from the old connection can be written
    // after the new one is up.
    dropClaimsOfMovedConnections();
    void harvestEveryMachine().catch(() => undefined);
  });
}

/** Stop reading stores. Called from the ordered disposer at quit. */
export function stopRemoteHarvest(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  unlink?.();
  unlink = null;
}

/**
 * Stop reading one machine's stores and forget what was read from it.
 *
 * Called when a person removes a machine in Settings. It sends nothing to that
 * machine and it changes no manifest row: an id already written is a record of
 * a moment that really happened, and removing the machine does not make it
 * untrue. What it drops is the in memory claim, the cached facts and the
 * cadence, at once.
 */
export function stopHarvestingMachine(machineId: string): void {
  facts.delete(machineId);
  lastPassAt.delete(machineId);
  for (const [sessionId, claim] of [...claims]) {
    if (claim.machineId === machineId) {
      claims.delete(sessionId);
      lastAskedAt.delete(sessionId);
    }
  }
}

/**
 * Drop every claim whose connection has been replaced.
 *
 * This is property 2 of connected only. A claim is bound to the generation it
 * was read under, and `machineGeneration` moves on every connect and on every
 * server birth. A number that moved means the connection this answer belongs to
 * is not the connection Tortie has now, so the answer is not Tortie's to hold.
 *
 * Returns how many were dropped, so a probe can print the count rather than
 * assert the behaviour.
 */
export function dropClaimsOfMovedConnections(): number {
  let dropped = 0;
  for (const [sessionId, claim] of [...claims]) {
    if (machineGeneration(claim.machineId).generation === claim.generation) {
      continue;
    }
    claims.delete(sessionId);
    dropped += 1;
  }
  if (dropped > 0) {
    harvestLog.info(
      `dropped ${String(dropped)} conversation id(s) read on a connection ` +
        `that has since been replaced`
    );
  }
  return dropped;
}

// ---------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------

/** Every machine that currently has rows Tortie could harvest, oldest id first. */
function machinesWithRows(): string[] {
  const ids = new Set<string>();
  for (const claim of claims.values()) ids.add(claim.machineId);
  for (const row of listedRows()) ids.add(row.machineId);
  return [...ids].sort();
}

/** One live remote row, with everything a harvest needs to ask about it. */
interface HarvestRow {
  readonly id: string;
  readonly machineId: string;
  readonly agent: LaunchableAgentId;
  readonly cwd: string;
  readonly createdAt: number;
  readonly tmuxId: string;
}

/**
 * Every row a pass could ask about, read out of the live feed.
 *
 * IT IS THE FEED RATHER THAN `remoteRowLastKnown`, and the reason is what a
 * harvest needs. That function answers with an id, a status and an instant, and
 * a harvest needs three more facts: which agent the session runs, which folder
 * it runs in on that machine, and the far side's own identifier for it. The
 * first two decide which directories are listed and the third is the whole of
 * muse's key. `./remote-capsule.ts` reads the same two sources in the same
 * order for the same reason.
 */
function listedRows(): HarvestRow[] {
  const out: HarvestRow[] = [];
  for (const projected of remoteSessions()) {
    const machineId = projected.machine?.id;
    if (machineId === undefined) continue;
    // The PROJECTED status, which is what every surface reads, so a machine
    // Tortie cannot see produces no read here for the same reason it produces
    // no Restore.
    if (!LISTED_STATUSES.has(projected.status)) continue;
    const row = remoteSessionRow(projected.id);
    if (row === null) continue;
    const agent = row.agent as LaunchableAgentId;
    if (!remoteHarvestsId(agent)) continue;
    out.push({
      id: row.id,
      machineId: row.machineId,
      agent,
      cwd: row.cwd,
      createdAt: row.createdAt,
      tmuxId: row.tmuxId
    });
  }
  return out;
}

/** One pass over every machine, one after another. */
export async function harvestEveryMachine(): Promise<number> {
  let written = 0;
  const dueMs = remotePollIsFocused()
    ? REMOTE_HARVEST_FOCUSED_MS
    : REMOTE_HARVEST_IDLE_MS;
  const now = Date.now();
  for (const machineId of machinesWithRows()) {
    const last = lastPassAt.get(machineId) ?? 0;
    if (now - last < dueMs) continue;
    written += await harvestMachineOnce(machineId);
  }
  return written;
}

/**
 * One pass over one machine. Returns how many conversation ids it wrote.
 *
 * Every refusal below is a silent zero rather than a throw. A harvest is a
 * convenience and it may never fail anything a person asked for.
 */
export async function harvestMachineOnce(machineId: string): Promise<number> {
  if (inFlight.has(machineId)) return 0;
  // CONNECTED ONLY, asked here as well as inside the door, so a pass that
  // cannot run costs nothing at all rather than costing a refusal per read.
  if (!machineIsConnected(machineId)) return 0;

  let ctx;
  try {
    ctx = readyRemoteContext(machineId);
  } catch {
    return 0;
  }

  const generation = machineGeneration(machineId).generation;
  const machineFacts = await machineFactsFor(machineId, ctx, generation);
  if (machineFacts === null) return 0;

  const targets = chooseHarvestTargets(machineId);
  if (targets.length === 0) {
    lastPassAt.set(machineId, Date.now());
    return 0;
  }

  inFlight.add(machineId);
  let written = 0;
  try {
    for (const target of targets) {
      // Asked again before EVERY session. A link that drops halfway through a
      // pass stops the pass here rather than after another five reads.
      if (machineGeneration(machineId).generation !== generation) break;
      if (!machineIsConnected(machineId)) break;
      lastAskedAt.set(target.id, Date.now());
      const claim = await harvestOneSession(ctx, machineId, generation, target, machineFacts);
      if (claim === null) continue;
      claims.set(target.id, claim);
      const record = writeRemoteHarvest({
        sessionId: target.id,
        machineId,
        agent: target.agent,
        conversationId: claim.conversationId,
        cwd: target.cwd,
        at: claim.at,
        key: claim.key,
        keyConfidence: claim.keyConfidence,
        rivals: claim.rivals,
        storePath: claim.storePath,
        storeRoot: claim.storeRoot
      });
      if (record !== null) written += 1;
    }
  } finally {
    inFlight.delete(machineId);
    lastPassAt.set(machineId, Date.now());
  }
  // A claim read under a connection that has since been replaced is dropped
  // here as well as on the link event, because a pass can outlive the link it
  // started on and the write above must not be the last word.
  dropClaimsOfMovedConnections();
  if (written > 0) {
    harvestLog.info(
      `read ${String(written)} conversation id(s) from ${machineId} while ` +
        `connected to it`
    );
  }
  return written;
}

/** What one session's pass needs to know. It is one live row of the feed. */
type HarvestTarget = HarvestRow;

/**
 * Which sessions this pass asks about, in order. Three rules, all of them
 * removing reads rather than adding them.
 *
 *  1. The agent has to be one a connection can harvest. Six of the thirteen
 *     have a store descriptor and four of those six can be read over a wire.
 *  2. The manifest row must have no conversation id yet. An id already written
 *     is never asked about again, so a pass costs nothing once a machine's rows
 *     are armed.
 *  3. The oldest question first, so six sessions on one machine are all reached
 *     within a pass each rather than the same six being asked twice.
 */
export function chooseHarvestTargets(machineId: string): HarvestTarget[] {
  const out: HarvestTarget[] = [];
  for (const row of listedRows()) {
    if (row.machineId !== machineId) continue;
    if (claims.has(row.id)) continue;
    const record = remoteRecordOf(row.id);
    if (record === null) continue;
    if (record.status === 'discarded') continue;
    const already = record.agentSessionId ?? '';
    if (already.length > 0) continue;
    out.push(row);
  }
  out.sort((a, b) => {
    const aAt = lastAskedAt.get(a.id) ?? 0;
    const bAt = lastAskedAt.get(b.id) ?? 0;
    if (aAt !== bAt) return aAt - bAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return out.slice(0, REMOTE_HARVEST_PER_PASS);
}

/** What one session's harvest produced, before it reaches the manifest. */
interface OneSessionClaim extends RemoteHarvestClaim {
  readonly key: AgentHarvestKey;
  readonly keyConfidence: 'exact' | 'weak';
  readonly rivals: number;
}

/**
 * One session, asked about on one machine. Null when nothing proved out.
 *
 * The order is the design. The listing comes first because it is one read for a
 * whole store. The head reads come second and there are at most three of them,
 * because a store with fifty records in the window is a store where the answer
 * is a guess anyway and reading fifty files would spend the link to find that
 * out.
 */
async function harvestOneSession(
  ctx: RemoteMachineContext,
  machineId: string,
  generation: number,
  target: HarvestTarget,
  machineFacts: RemoteHarvestFacts
): Promise<OneSessionClaim | null> {
  const plan = remoteHarvestRoots(target.agent, target.cwd, machineFacts);
  if (plan === null) return null;
  const sinceMs = Math.max(0, target.createdAt - DATE_SHARD_WINDOW_MS);
  const sinceSeconds = Math.floor(sinceMs / 1_000);

  const lines: string[] = [];
  for (const root of plan.roots) {
    if (machineGeneration(machineId).generation !== generation) return null;
    // ONE MORE THAN THE DESCRIPTOR'S NUMBER, and the reason is that the two
    // count from different places. `./watch.ts` calls its own walker with the
    // ROOT at depth 0 and lists the files it finds there, so a descriptor's
    // `maxDepth` of 0 means the direct children of the root. `find -maxdepth`
    // counts the root itself as 0, so the same reach is 1. codex's records sit
    // at `sessions/YYYY/MM/DD/<file>`, which is `find` depth 4 and descriptor
    // depth 3, and muse's sit one level deeper.
    const answer = await readOrNull(ctx, 'store-list', [
      root,
      String(plan.maxDepth + 1),
      String(sinceSeconds)
    ]);
    if (answer === null || answer === REMOTE_SCRIPT_EMPTY) continue;
    for (const line of answer.split('\n')) {
      if (line.trim().length > 0) lines.push(line);
    }
  }
  const candidates = parseRemoteListing(target.agent, lines, sinceMs);
  if (candidates.length === 0) return null;

  const ordered = [...candidates].sort((a, b) => a.orderTs - b.orderTs);
  const verdicts = new Map<string, RemoteConfirmVerdict>();
  for (const candidate of ordered.slice(0, REMOTE_HARVEST_HEADS_PER_SESSION)) {
    if (machineGeneration(machineId).generation !== generation) return null;
    const verdict = await confirmOne(ctx, target, candidate);
    verdicts.set(candidate.path, verdict);
    // An identity key that says yes ends the questioning. Reading two more
    // files could not make a proven match untrue and would spend the link.
    if (verdict === 'match') break;
  }

  const winner = decideRemoteHarvest(target.agent, candidates, verdicts);
  if (winner === null) return null;
  if (machineGeneration(machineId).generation !== generation) return null;
  return {
    sessionId: target.id,
    machineId,
    generation,
    agent: target.agent,
    conversationId: winner.candidate.sessionId,
    storePath: winner.candidate.path,
    storeRoot: rootOfRemotePath(winner.candidate.path, plan.roots),
    at: Date.now(),
    key: winner.key,
    keyConfidence: winner.keyConfidence,
    rivals: winner.rivals
  };
}

/** Read one record's head and ask the pure half what it says. */
async function confirmOne(
  ctx: RemoteMachineContext,
  target: HarvestTarget,
  candidate: RemoteCandidate
): Promise<RemoteConfirmVerdict> {
  const answer = await readOrNull(ctx, 'store-head', [
    candidate.path,
    String(REMOTE_HARVEST_HEAD_BYTES)
  ]);
  // A file that is not there and a file with nothing in it both answer with
  // the empty word, and neither is base64. Decoding it would produce four
  // arbitrary bytes and the confirm would then read them as a record.
  if (answer === null || answer === REMOTE_SCRIPT_EMPTY) return 'unknown';
  const head = Buffer.from(answer.replace(/\s+/g, ''), 'base64').toString('utf8');
  if (head.length === 0) return 'unknown';
  return confirmRemoteCandidate(target.agent, head, {
    cwd: target.cwd,
    remotePaneKey: target.tmuxId
  });
}

/**
 * One read through the second door, or null.
 *
 * Every refusal reaches here the same way: as a rejected promise. A machine
 * that stopped answering, a link that was replaced mid flight and a script that
 * printed nothing between its markers are all one answer to this module, being
 * that there is nothing to read. The next pass asks again.
 */
async function readOrNull(
  ctx: RemoteMachineContext,
  scriptId: string,
  args: readonly string[]
): Promise<string | null> {
  try {
    commandsSent += 1;
    const answer = await runRemoteRead(ctx, scriptId, args, {
      timeoutMs: REMOTE_HARVEST_TIMEOUT_MS,
      // Phase 118. Named for the ledger that owns the ssh child. A harvest is
      // not journaled: it is a read onto this Mac that the next pass redoes, so
      // a cut one leaves nothing on either computer for a person to deal with.
      execution: { kind: 'harvest', subject: ctx.machineId }
    });
    bytesRead += answer.bytes;
    return answer.payload;
  } catch {
    return null;
  }
}

/**
 * The far side's own home directory and the two environment names, read once
 * per connection.
 *
 * It is cached against the generation rather than against the machine, so a
 * machine that reconnects is asked again. A home directory does not usually
 * move, and a connection to a DIFFERENT account on the same address is exactly
 * the case where assuming it did not is how a listing gets asked for under
 * somebody else's home.
 */
async function machineFactsFor(
  machineId: string,
  ctx: RemoteMachineContext,
  generation: number
): Promise<RemoteHarvestFacts | null> {
  const held = facts.get(machineId);
  if (held !== undefined && held.generation === generation) return held.facts;
  const payload = await readOrNull(ctx, 'machine-facts', []);
  if (payload === null) return null;
  const parsed = parseMachineFacts(payload);
  if (parsed === null) return null;
  facts.set(machineId, { generation, facts: parsed });
  return parsed;
}

// ---------------------------------------------------------------------------
// What other modules read
// ---------------------------------------------------------------------------

/** Every claim this run holds, oldest session id first. */
export function remoteHarvestClaims(): RemoteHarvestClaim[] {
  return [...claims.values()].sort((a, b) => a.sessionId.localeCompare(b.sessionId));
}

/** The claim for one session, or null. */
export function remoteHarvestClaim(sessionId: string): RemoteHarvestClaim | null {
  return claims.get(sessionId) ?? null;
}

/** The far side's own facts for one machine, or null. The store sync reads it. */
export function remoteMachineHarvestFacts(machineId: string): RemoteHarvestFacts | null {
  return facts.get(machineId)?.facts ?? null;
}

/** What this module has done, for the tests, the smoke and the probe. */
export function remoteHarvestFacts(): {
  /** Machines with cached facts or a claim. */
  machines: number;
  /** Sessions holding a claim right now. */
  claims: number;
  /** Reads sent since the last reset. */
  commandsSent: number;
  /** Payload bytes read since the last reset. */
  bytesRead: number;
  /** True while the cadence is armed. */
  running: boolean;
} {
  const machines = new Set<string>();
  for (const machineId of facts.keys()) machines.add(machineId);
  for (const claim of claims.values()) machines.add(claim.machineId);
  return {
    machines: machines.size,
    claims: claims.size,
    commandsSent,
    bytesRead,
    running: timer !== null
  };
}

/** Drop every claim, every cache, the timer and the subscription. Tests only. */
export function resetRemoteHarvestForTests(): void {
  stopRemoteHarvest();
  claims.clear();
  facts.clear();
  lastPassAt.clear();
  lastAskedAt.clear();
  inFlight.clear();
  commandsSent = 0;
  bytesRead = 0;
}

/**
 * Replace the far side's own answer about itself. HARNESS AND PROBE ONLY.
 *
 * WHY IT EXISTS, said plainly. In every harness on this rung the other machine
 * is this same Mac, so the far side's real `HOME` is the operator's own home
 * directory. Planting a fake agent record there to drive a harvest would write
 * a conversation file into a store the operator's own agents read. This seam
 * points the roots at a scratch directory instead, so every read below it is
 * real, over a real connection, against real files, and none of them is in the
 * operator's home.
 *
 * WHAT IT DOES NOT PROVE, and the probe says so in its own output: it does not
 * prove that the `machine-facts` script returns the right home. The probe reads
 * the real facts first, prints them, and then substitutes.
 */
export function setRemoteHarvestFactsForHarness(
  machineId: string,
  next: RemoteHarvestFacts
): void {
  facts.set(machineId, {
    generation: machineGeneration(machineId).generation,
    facts: next
  });
}
