/**
 * Conversation continuity groundwork. Copying home the agent's own record for a
 * session on another machine, while connected, and saying when (Phase 73, M6,
 * the ladder note in docs/BACKLOG.md).
 *
 * ## The promise, and it is the whole module
 *
 * > Tortie never says a conversation is current. It says when it last copied
 * > it, and the person judges.
 *
 * That is last-sync staleness and nothing else. A machine that has been out of
 * reach for a day carries the same instant it carried a day ago, and the
 * sentence a person reads gets older rather than being refreshed. It is the
 * same shape the saved output panel already uses for a captured screen, which
 * is why the second line sits in that panel.
 *
 * ## What is NOT built, recorded rather than half made
 *
 * CROSS MACHINE RECONSTRUCTION IS NOT HERE. Taking a conversation file copied
 * from one machine and replanting it into a fresh store for an agent somewhere
 * else, then continuing it, is not in this rung. The reason is a measurement
 * that cannot be made: proving it needs a second real machine with a real agent
 * installed on it, and the only far side this rung has is this Mac pretending
 * to be a machine. A replant proven against this Mac would prove that Tortie
 * can copy a file into a directory on this Mac, which is not the claim. It is
 * recorded as its own future phase in docs/BACKLOG.md.
 *
 * ## Where the copies go, and why the instant is on disk
 *
 *   <userData>/gmux/remote-stores/<machineId>/<sessionId>/<basename>
 *   <userData>/gmux/remote-stores/<machineId>/<sessionId>/sync.json
 *
 * It is a sibling of `restore/snapshots` and `drop/dropped-images`, and it is
 * userData rather than a temporary directory for the same reason those two are:
 * macOS clears its own temporary directories on its own schedule, and a copy a
 * person may read tomorrow is a copy Tortie owns the lifetime of.
 *
 * The instant lives in `sync.json` beside the bytes rather than in a manifest
 * column. Two reasons, and the second is the one that decided it:
 *
 *  1. It needs no new column and no migration, so `docs/audits/contract-baseline.txt`
 *     does not move for it.
 *  2. It cannot claim a copy that does not exist. The record and the bytes are
 *     written together in one directory, so a person reading "last copied at"
 *     is reading a fact about a file that is right there.
 *
 * ## The numbers, all chosen rather than measured
 *
 * | Rule | Value |
 * | --- | --- |
 * | Machine cadence | 300,000 ms |
 * | Sessions copied in one pass | at most 2 |
 * | Largest file copied | 2,097,152 bytes |
 * | Largest directory per machine | 20,971,520 bytes |
 *
 * A file over the per file cap is NOT copied, and the record says it was not,
 * rather than storing a piece of a conversation that would read as a whole one.
 * When a machine's directory is over its cap the oldest session directory goes
 * first, the same way the drop store prunes.
 *
 * WHAT THOSE NUMBERS COST AT THE WORST. Two files of 2,097,152 bytes every
 * 300,000 ms is 4,194,304 bytes per five minutes per machine, which is about
 * 14,000 bytes a second. A conversation file is re-read whole on every pass it
 * is chosen for, because the far side's checksum arrives with the bytes rather
 * than before them, so there is no cheaper way to ask whether it changed. That
 * is the cost of the promise, and it is bounded by the two numbers above rather
 * than by how many sessions a machine holds.
 */

import { app } from 'electron';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, join } from 'node:path';
import { getLog } from '../log';
import { machineGeneration, type RemoteMachineContext } from './context';
import { onMachineLinkChanged } from './control-plane';
import {
  remoteHarvestClaims,
  type RemoteHarvestClaim
} from './remote-harvest';
// The small map every surface reads, and the two accessors that read it. It
// lives beside every other remote fact about a row so `./remote-sessions.ts`
// projects one row from one place. See its header for why the instant is not a
// manifest column.
import {
  forgetRemoteStoreRecord,
  noteRemoteStoreRecord,
  remoteStoreRecords,
  remoteStoreRecordOf,
  resetRemoteStoreRecordsForTests,
  type RemoteStoreRecord
} from './remote-record';
import { machineIsConnected, runRemoteRead } from './remote-run';
// The one word every script prints when it looked and found nothing.
import { REMOTE_SCRIPT_EMPTY } from './remote-scripts';
import { readyRemoteContext } from './remote-sessions';

const syncLog = getLog('restore');

// ---------------------------------------------------------------------------
// The numbers, all chosen
// ---------------------------------------------------------------------------

/** How long between passes for one machine. 300,000 ms. */
export const REMOTE_STORE_SYNC_MS = 300_000;

/** Sessions copied in one pass, at most. 2. */
export const REMOTE_STORE_SYNC_PER_PASS = 2;

/** The largest conversation file this will copy. 2 MB. */
export const REMOTE_STORE_MAX_FILE_BYTES = 2 * 1024 * 1024;

/** The largest one machine's copies may total. 20 MB. */
export const REMOTE_STORE_MAX_MACHINE_BYTES = 20 * 1024 * 1024;

/** How long one copy read gets. The file is capped, so this is generous. */
export const REMOTE_STORE_TIMEOUT_MS = 30_000;

/** The name of the record beside every copy. */
export const REMOTE_STORE_RECORD_NAME = 'sync.json';

// ---------------------------------------------------------------------------
// Where the copies live
// ---------------------------------------------------------------------------

let rootOverride: string | null = null;

/**
 * Point the store somewhere else. HARNESS AND PROBE ONLY.
 *
 * A probe runs outside Electron, where `app.getPath('userData')` is not a
 * question that can be asked. Production never calls it.
 */
export function setRemoteStoreRootForHarness(path: string | null): void {
  rootOverride = path;
  resetRemoteStoreRecordsForTests();
  indexed = false;
}

/** `<userData>/gmux/remote-stores`. */
export function remoteStoresDir(): string {
  if (rootOverride !== null) return rootOverride;
  return join(app.getPath('userData'), 'gmux', 'remote-stores');
}

/** The directory one session's copy lives in. */
export function remoteStoreSessionDir(
  machineId: string,
  sessionId: string
): string {
  return join(remoteStoresDir(), safeSegment(machineId), safeSegment(sessionId));
}

/**
 * A path segment that cannot leave the directory it is under.
 *
 * A machine id and a session id are both Tortie's own, so nothing hostile
 * reaches here today. The rule is still applied, because the cost is one
 * expression and the alternative is a path that depends on a value staying
 * well behaved for ever.
 */
function safeSegment(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^\.+/, '');
  return cleaned.length > 0 ? cleaned.slice(0, 80) : 'unnamed';
}

// ---------------------------------------------------------------------------
// The record beside the bytes
// ---------------------------------------------------------------------------

let indexed = false;

/**
 * Read every record already on disk, once.
 *
 * It is one walk of two directory levels and it happens when the cadence
 * starts. A person with no machines pays one `readdir` of a directory that is
 * not there, which fails at once and is the whole cost.
 *
 * The records go into `./remote-record.ts`, which is what every surface reads.
 * This module owns the directory and the format, and nothing else owns either.
 */
export function ensureIndexed(): void {
  if (indexed) return;
  indexed = true;
  let machines: string[];
  try {
    machines = readdirSync(remoteStoresDir());
  } catch {
    return; // nothing has been copied yet
  }
  for (const machineId of machines) {
    let sessions: string[];
    try {
      sessions = readdirSync(join(remoteStoresDir(), machineId));
    } catch {
      continue;
    }
    for (const sessionId of sessions) {
      const record = readRecord(join(remoteStoresDir(), machineId, sessionId));
      if (record !== null) noteRemoteStoreRecord(record);
    }
  }
}

/** One record from a session directory, or null. */
function readRecord(dir: string): RemoteStoreRecord | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(dir, REMOTE_STORE_RECORD_NAME), 'utf8')
    );
    if (parsed === null || typeof parsed !== 'object') return null;
    const record = parsed as RemoteStoreRecord;
    if (typeof record.sessionId !== 'string' || typeof record.at !== 'number') {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The answer from the machine, parsed
// ---------------------------------------------------------------------------

/** What the `store-copy` script printed, parsed. */
export interface StoreCopyAnswer {
  /** How many bytes the WHOLE file is on that machine. */
  readonly bytes: number;
  /** The far side's checksum of the whole file, or null when it had no tool. */
  readonly sha256: string | null;
  /** The bytes that came back, at most the cap that was asked for. */
  readonly body: Buffer;
}

/**
 * The format, stated here because it is a contract with the script catalogue.
 *
 * The payload is three fields separated by single spaces, being the whole
 * file's size in bytes, its checksum, and the base64 of its first N bytes where
 * N is the cap the caller asked for. The checksum is the literal word `nosum`
 * when the machine has neither `shasum` nor `sha256sum`. A file that is not
 * there answers with three empty words.
 *
 * THE SIZE IS THE WHOLE FILE'S SIZE, not the size of what was sent. That is
 * what lets this module tell a file that fits from a file that was cut, without
 * a second read of anything.
 */
export function parseStoreCopy(payload: string): StoreCopyAnswer | null {
  const fields = payload.trim().split(/\s+/);
  if (fields.length < 3) return null;
  const [size, sum, encoded] = fields as [string, string, string];
  if (size === REMOTE_SCRIPT_EMPTY) return null;
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return null;
  const body =
    encoded === REMOTE_SCRIPT_EMPTY ? Buffer.alloc(0) : Buffer.from(encoded, 'base64');
  return {
    bytes,
    sha256: sum === REMOTE_SCRIPT_EMPTY || sum === 'nosum' ? null : sum,
    body
  };
}

// ---------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------

const inFlight = new Set<string>();
const lastPassAt = new Map<string, number>();
let timer: NodeJS.Timeout | null = null;
let unlink: (() => void) | null = null;
let commandsSent = 0;

/** Start copying conversations home. Called once, from the capability installer. */
export function startRemoteStoreSync(): void {
  if (timer !== null) return;
  // The one disk read at boot. Without it a relaunch would answer null for
  // every session that HAS a copy, and the panel would say Tortie has no copy
  // of a conversation that is sitting on this Mac.
  ensureIndexed();
  timer = setInterval(() => {
    void syncEveryMachine().catch(() => undefined);
  }, REMOTE_STORE_SYNC_MS);
  timer.unref?.();
  unlink = onMachineLinkChanged(() => {
    void syncEveryMachine().catch(() => undefined);
  });
}

/** Stop copying. Called from the ordered disposer at quit. */
export function stopRemoteStoreSync(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  unlink?.();
  unlink = null;
}

/**
 * Stop copying one machine's conversations.
 *
 * IT DELETES NOTHING. A copy already on this Mac is what a person reads after
 * the machine is gone, which is the whole reason the copy is here rather than
 * there.
 *
 * WHAT ACTUALLY STOPS THE COPYING is `stopHarvestingMachine` in
 * `./remote-harvest.ts`, which drops that machine's claims, and a claim is what
 * names the file. `./tombstone.ts` calls that one first and this one second.
 * This call forgets the cadence, so a machine added again later is asked at
 * once rather than after a five minute wait.
 */
export function stopSyncingMachine(machineId: string): void {
  lastPassAt.delete(machineId);
}

/** One pass over every machine that has a claim. */
export async function syncEveryMachine(): Promise<number> {
  const machines = new Set<string>();
  for (const claim of remoteHarvestClaims()) machines.add(claim.machineId);
  let copied = 0;
  const now = Date.now();
  for (const machineId of [...machines].sort()) {
    if (now - (lastPassAt.get(machineId) ?? 0) < REMOTE_STORE_SYNC_MS) continue;
    copied += await syncMachineOnce(machineId);
  }
  return copied;
}

/**
 * One pass over one machine. Returns how many files it copied.
 *
 * CONNECTED ONLY, twice. The pass refuses at once when the link is not live,
 * and every read goes through the door in ./remote-run.ts, which refuses again
 * and also discards an answer whose connection was replaced while the read was
 * in flight.
 */
export async function syncMachineOnce(machineId: string): Promise<number> {
  if (inFlight.has(machineId)) return 0;
  if (!machineIsConnected(machineId)) return 0;
  let ctx;
  try {
    ctx = readyRemoteContext(machineId);
  } catch {
    return 0;
  }
  const generation = machineGeneration(machineId).generation;
  const targets = chooseSyncTargets(machineId);
  if (targets.length === 0) {
    lastPassAt.set(machineId, Date.now());
    return 0;
  }
  inFlight.add(machineId);
  let copied = 0;
  try {
    for (const claim of targets) {
      if (machineGeneration(machineId).generation !== generation) break;
      if (!machineIsConnected(machineId)) break;
      const record = await copyOne(ctx, claim);
      if (record === null) continue;
      noteRemoteStoreRecord(record);
      if (record.outcome === 'copied') copied += 1;
    }
    pruneMachine(machineId);
  } finally {
    inFlight.delete(machineId);
    lastPassAt.set(machineId, Date.now());
  }
  if (copied > 0) {
    syncLog.info(
      `copied ${String(copied)} conversation file(s) from ${machineId} to ` +
        `this Mac while connected to it`
    );
  }
  return copied;
}

/**
 * Which sessions this pass copies, in order.
 *
 * Only a session with a CLAIM is a candidate, because a claim is what names the
 * file. The oldest copy goes first, and a session that has never been copied
 * sorts first because zero is older than any instant. Ties break on the session
 * id, so the order is the same on every run and a test can hold it.
 */
export function chooseSyncTargets(machineId: string): RemoteHarvestClaim[] {
  ensureIndexed();
  const worth = remoteHarvestClaims().filter(
    (claim) => claim.machineId === machineId
  );
  worth.sort((a, b) => {
    const aAt = remoteStoreRecordOf(a.sessionId)?.at ?? 0;
    const bAt = remoteStoreRecordOf(b.sessionId)?.at ?? 0;
    if (aAt !== bAt) return aAt - bAt;
    return a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : 0;
  });
  return worth.slice(0, REMOTE_STORE_SYNC_PER_PASS);
}

/** One file, read over the connection and written here. Null when nothing was read. */
async function copyOne(
  ctx: RemoteMachineContext,
  claim: RemoteHarvestClaim
): Promise<RemoteStoreRecord | null> {
  let payload: string;
  try {
    commandsSent += 1;
    const answer = await runRemoteRead(
      ctx,
      'store-copy',
      [claim.storePath, String(REMOTE_STORE_MAX_FILE_BYTES)],
      {
        timeoutMs: REMOTE_STORE_TIMEOUT_MS,
        // Phase 118. Named for the ledger that owns the ssh child. A copy of a
        // conversation back to this Mac is not journaled: it is a read that the
        // next pass redoes, and it writes nothing on the other computer.
        execution: { kind: 'store-sync', subject: claim.sessionId }
      }
    );
    payload = answer.payload;
  } catch {
    return null;
  }
  const parsed = parseStoreCopy(payload);
  if (parsed === null) return null;

  const dir = remoteStoreSessionDir(claim.machineId, claim.sessionId);
  const name = basename(claim.storePath);
  const base = {
    at: Date.now(),
    machineId: claim.machineId,
    sessionId: claim.sessionId,
    remotePath: claim.storePath,
    name,
    remoteBytes: parsed.bytes,
    remoteSha256: parsed.sha256
  };

  // A file over the cap is not copied, and the record says so. Half a
  // conversation on disk would read as a whole one, and that is the one thing
  // a staleness promise may never do.
  if (parsed.bytes > REMOTE_STORE_MAX_FILE_BYTES) {
    const record: RemoteStoreRecord = {
      ...base,
      outcome: 'too-large',
      localBytes: 0,
      localSha256: null
    };
    writeRecord(dir, record);
    return record;
  }

  const localSha = createHash('sha256').update(parsed.body).digest('hex');
  const whole =
    parsed.body.byteLength === parsed.bytes &&
    (parsed.sha256 === null || parsed.sha256 === localSha);
  if (!whole) {
    const record: RemoteStoreRecord = {
      ...base,
      outcome: 'not-whole',
      localBytes: 0,
      localSha256: null
    };
    writeRecord(dir, record);
    return record;
  }

  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const part = join(dir, `${name}.part`);
    writeFileSync(part, parsed.body, { mode: 0o600 });
    renameSync(part, join(dir, name));
  } catch (err) {
    syncLog.warn(
      `could not keep a copy of ${claim.sessionId}'s conversation on this ` +
        `Mac: ${(err as Error).message}`
    );
    return null;
  }
  const record: RemoteStoreRecord = {
    ...base,
    outcome: 'copied',
    localBytes: parsed.body.byteLength,
    localSha256: localSha
  };
  writeRecord(dir, record);
  return record;
}

/** Write the record beside the bytes. A failure here is not a failed copy. */
function writeRecord(dir: string, record: RemoteStoreRecord): void {
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(
      join(dir, REMOTE_STORE_RECORD_NAME),
      `${JSON.stringify(record, null, 2)}\n`,
      { mode: 0o600 }
    );
  } catch {
    /* the bytes are what matter; the record is read back best effort */
  }
}

/**
 * Keep one machine's copies under the cap, oldest session directory first.
 *
 * It is the drop store's rule, applied to directories rather than to files,
 * because one session's conversation is one directory here.
 */
export function pruneMachine(machineId: string): number {
  const root = join(remoteStoresDir(), safeSegment(machineId));
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return 0;
  }
  const dirs: { path: string; at: number; bytes: number }[] = [];
  for (const name of names) {
    const path = join(root, name);
    let bytes = 0;
    let at = 0;
    try {
      for (const file of readdirSync(path)) {
        const st = statSync(join(path, file));
        bytes += st.size;
        at = Math.max(at, st.mtimeMs);
      }
    } catch {
      continue;
    }
    dirs.push({ path, at, bytes });
  }
  let total = dirs.reduce((sum, one) => sum + one.bytes, 0);
  if (total <= REMOTE_STORE_MAX_MACHINE_BYTES) return 0;
  dirs.sort((a, b) => a.at - b.at);
  let removed = 0;
  for (const dir of dirs) {
    if (total <= REMOTE_STORE_MAX_MACHINE_BYTES) break;
    try {
      rmSync(dir.path, { recursive: true, force: true });
      forgetRemoteStoreRecord(basename(dir.path));
      total -= dir.bytes;
      removed += 1;
    } catch {
      /* it will be tried again next pass */
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------
// What the tests, the smoke and the probe read
// ---------------------------------------------------------------------------

/** What this module has done. */
export function remoteStoreSyncFacts(): {
  /** Sessions with a record on disk, copied or refused. */
  records: number;
  /** Sessions whose conversation is on this Mac in one piece. */
  copied: number;
  /** Reads sent since the last reset. */
  commandsSent: number;
  /** True while the cadence is armed. */
  running: boolean;
} {
  ensureIndexed();
  const records = remoteStoreRecords();
  let copied = 0;
  for (const record of records) {
    if (record.outcome === 'copied') copied += 1;
  }
  return {
    records: records.length,
    copied,
    commandsSent,
    running: timer !== null
  };
}

/** Drop every memory, the timer and the subscription. Tests and the smoke. */
export function resetRemoteStoreSyncForTests(): void {
  stopRemoteStoreSync();
  resetRemoteStoreRecordsForTests();
  indexed = false;
  inFlight.clear();
  lastPassAt.clear();
  commandsSent = 0;
}
