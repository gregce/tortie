/**
 * Phase 357's fix round (build/p357/SPEC.md, "Fix round"): what the backup ring
 * does once the session list's store has stopped.
 *
 * THE DEFECT. The latch's first build answered null from a stopped store's
 * `contentFingerprint`, and the ring reads null as "take one"
 * (../ring-schedule.ts, `maybeTake`). So once the store had stopped, every poll
 * past the five minute floor took a generation, and with the FILE fine each
 * copy was good, so the ring's five slots filled with copies made after the
 * stop and every generation from before it was rotated out. The attack lens
 * drove the shipping ring across a file-fine stop: five ticks took five
 * generations and none from before the stop survived. Over the same damage
 * the parent takes one at most, because its digest answers one fixed text for
 * a table it cannot read, the take records that text, and every later poll
 * equals it. No write reaches the file through a stopped store, so every one
 * of those copies was also a copy of nothing new.
 *
 * WHAT IS DRIVEN. The SHIPPING `ManifestStore` over a scratch file, the
 * SHIPPING `ManifestRingSchedule` with the SHIPPING take (`ringFromRecovery`
 * over `captureManifestBackup`, into a scratch ring folder), and a fake clock.
 * The ring is filled first: the launch take and five more, each after a real
 * change, so its five slots hold generations 2 to 6, each read back by its
 * file name and the sha256 of its bytes. Then an hour of polls with nothing
 * changed (the control), then writes the ring has not seen, then the stop:
 * REAL damage written over the file as the spec's M1 measured it (a checkpoint
 * from a second connection, the bytes written over and proved changed, then
 * that connection's write so the store's own connection reads the file again)
 * or the harness seam with the file fine. Then an hour of the real cadence
 * (sixty polls a minute apart), the sleep's ring test and the quit's ring
 * test, both through the functions the core calls
 * (../../sessions/quit-generation.ts).
 *
 * WHAT IS ASSERTED. After the stop no take is attempted, and every generation
 * present at the stop is still in the ring, its file and its sha256 unchanged.
 * Two cases are named where one take follows a stop, each held to one: the
 * take before the stop FAILED, or the store stopped before its run's first
 * take. In both the stopped store's fingerprint is one no generation holds, so
 * the ring takes it once and never again, which is the one take the parent
 * makes too; with a full ring that one take moves the oldest generation out.
 *
 * `P357_RING_READINGS=<file>` writes every case's readings there (the fix
 * round's report and a verifier's re-derivation read them); unset, nothing is
 * written. Every database and ring here is under a scratch folder this file
 * made, removed after each case.
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  writeFileSync,
  writeSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord, ManifestStore as Store } from '../store';
import type { ManifestRingSchedule as Schedule, RingReason, RingTakeResult } from '../ring-schedule';

vi.mock('../../typed-events', () => ({
  broadcastEvent: (): void => undefined
}));

// The latch's record, the ring's warnings and the notice's line are not what
// this file is about; they are swallowed, not written.
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const quiet = () => ({
    error: (): void => undefined,
    warn: (): void => undefined,
    info: (): void => undefined,
    debug: (): void => undefined
  });
  return { ...real, getLog: quiet, logEvent: (): void => undefined };
});

const { ManifestStore, STOPPED_FINGERPRINT, setManifestFaultHook } = await import('../store');
const { ManifestRingSchedule, ringFromRecovery } = await import('../ring-schedule');
const { backupBodyPath, readBackupIndex } = await import('../recovery');
const { takeManifestGenerationOnQuit, takeManifestGenerationOnSuspend } = await import(
  '../../sessions/quit-generation'
);
const { resetDurabilityNoticesForTests } = await import('../../notice');

const MINUTE = 60_000;
const FIVE_MIN = 5 * MINUTE;
/** The real cadence: one poll a minute (RING_POLL_MS), for an hour. */
const POLLS = 60;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const dirs: string[] = [];
const stores: Store[] = [];
const extra: Database.Database[] = [];
const readings: Record<string, unknown> = {};

beforeEach(() => {
  resetDurabilityNoticesForTests();
});

afterEach(() => {
  setManifestFaultHook(null);
  // Every connection is closed here, a held one included: the damage in these
  // cases is in the FILE or nowhere, so closing is safe.
  for (const store of stores.splice(0)) {
    const db = connectionOf(store);
    if (db.open) db.close();
  }
  for (const db of extra.splice(0)) if (db.open) db.close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

afterAll(() => {
  const out = process.env['P357_RING_READINGS'];
  if (out !== undefined && out !== '') writeFileSync(out, `${JSON.stringify(readings, null, 1)}\n`);
});

function record(i: number): ManifestSessionRecord {
  const id = `r-${String(i).padStart(4, '0')}-${'x'.repeat(24)}`;
  const at = 1_700_000_000_000 + i;
  return {
    id,
    name: `name-${String(i)}-${'n'.repeat(40)}`,
    tmuxName: `t-${String(i)}`,
    projectPath: `/p/${String(i % 7)}`,
    cwd: `/p/${String(i % 7)}`,
    agent: 'claude',
    status: 'running',
    createdAt: at,
    lastSeen: at,
    argv: ['/usr/local/bin/claude', '--session-id', id]
  };
}

function connectionOf(store: Store): Database.Database {
  return (store as unknown as { db: Database.Database }).db;
}

interface Take {
  reason: RingReason;
  at: number;
  ok: boolean;
  generation: number | null;
}

interface World {
  dbPath: string;
  ring: string;
  store: Store;
  schedule: Schedule;
  clock: { t: number };
  /** Every take the schedule asked for, in order, with what it answered. */
  takes: Take[];
  /** How many times the schedule asked the change test. */
  asks: { n: number };
  /** Make the next take fail, once, as a full volume would. */
  failNext: { value: boolean };
  /** The next row number to write. */
  next: { i: number };
  live: string;
}

/** One run: a store over `dbPath` and a schedule over `ring`, on a fake clock. */
function run(dbPath: string, ring: string, clock: { t: number }): World {
  const store = new ManifestStore(dbPath);
  stores.push(store);
  const takes: Take[] = [];
  const asks = { n: 0 };
  const failNext = { value: false };
  const shipping = ringFromRecovery({ source: dbPath, dir: ring });
  const schedule = new ManifestRingSchedule({
    take: async (reason): Promise<RingTakeResult> => {
      if (failNext.value) {
        failNext.value = false;
        takes.push({ reason, at: clock.t, ok: false, generation: null });
        return { ok: false, detail: 'a planted failure, as a full volume answers', ms: 0 };
      }
      const out = await shipping(reason);
      takes.push({ reason, at: clock.t, ok: out.ok, generation: out.generation ?? null });
      return out;
    },
    fingerprint: () => {
      asks.n += 1;
      return store.contentFingerprint();
    },
    now: () => clock.t,
    log: (): void => undefined
  });
  return { dbPath, ring, store, schedule, clock, takes, asks, failNext, next: { i: 0 }, live: '' };
}

/** A fresh scratch folder, a store over it holding `rows` sessions and one project. */
function world(rows = 120): World {
  const dir = mkdtempSync(join(tmpdir(), 'gmux-p357-ring-'));
  dirs.push(dir);
  const ring = join(dir, 'backups');
  mkdirSync(ring);
  const w = run(join(dir, 'manifest.db'), ring, { t: 1_800_000_000_000 });
  for (let i = 0; i < rows; i++) w.store.insertSession(record(i));
  w.store.upsertProject({ id: 'p1', path: '/p/0', name: 'p0' });
  w.next.i = rows;
  w.live = record(rows - 1).id;
  return w;
}

/** One poll of the timer, a minute after the last. */
async function poll(w: World): Promise<RingTakeResult | null> {
  w.clock.t += MINUTE;
  return w.schedule.maybeTake('interval');
}

async function anHour(w: World): Promise<void> {
  for (let i = 0; i < POLLS; i++) await poll(w);
}

/** The launch take, then five more, each after a real change: the five slots hold 2 to 6. */
async function fillRing(w: World): Promise<void> {
  w.clock.t += MINUTE;
  expect((await w.schedule.maybeTake('launch'))?.ok).toBe(true);
  for (let g = 0; g < 5; g++) {
    w.store.insertSession(record(w.next.i++));
    w.clock.t += FIVE_MIN;
    expect((await w.schedule.maybeTake('interval'))?.ok).toBe(true);
  }
  // The control: an hour with nothing changed and no stop takes nothing.
  const before = w.takes.length;
  await anHour(w);
  expect(w.takes.length).toBe(before);
}

/** Writes the ring has not seen: a person keeps working after the last poll. */
function unseenWrites(w: World, n = 3): void {
  for (let i = 0; i < n; i++) w.store.insertSession(record(w.next.i++));
}

interface Generation {
  generation: number;
  file: string;
  sha256: string;
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** The ring as it is on disk: every recorded generation, its body's file name and its bytes' sha256. */
function ringNow(ring: string): Generation[] {
  return readBackupIndex(ring).map((c) => {
    const path = backupBodyPath(c.generation, ring);
    return {
      generation: c.generation,
      file: basename(path),
      sha256: existsSync(path) ? sha256(path) : 'missing'
    };
  });
}

// --- The damage, M1's method -------------------------------------------------

/** A second connection that has checkpointed every page into the main file. */
function checkpointed(dbPath: string): Database.Database {
  const w = new Database(dbPath);
  extra.push(w);
  const [result] = w.pragma('wal_checkpoint(TRUNCATE)') as { busy: number }[];
  expect(result?.busy).toBe(0);
  return w;
}

function pagesOf(w: Database.Database, name: string): { pageno: number; pagetype: string }[] {
  return w
    .prepare<[string], { pageno: number; pagetype: string }>(
      'SELECT pageno, pagetype FROM dbstat WHERE name = ? ORDER BY pageno'
    )
    .all(name);
}

function readAt(path: string, offset: number, length: number): Buffer {
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(length);
    readSync(fd, buf, 0, length, offset);
    return buf;
  } finally {
    closeSync(fd);
  }
}

/** Write over the file, then prove the bytes changed. */
function writeAt(path: string, offset: number, bytes: Buffer): void {
  const before = readAt(path, offset, bytes.length);
  const fd = openSync(path, 'r+');
  try {
    writeSync(fd, bytes, 0, bytes.length, offset);
  } finally {
    closeSync(fd);
  }
  const after = readAt(path, offset, bytes.length);
  expect(after.equals(bytes)).toBe(true);
  expect(before.equals(after)).toBe(false);
}

/** The second connection writes, so the store's own connection drops its cache and reads the file again. */
function writeFromSecond(w: Database.Database): void {
  const out = w.prepare("UPDATE projects SET name = name WHERE id = 'p1'").run();
  expect(out.changes).toBe(1);
}

/** Every leaf of one tree, its type byte written over. */
function damageLeaves(w: World, tree: string): Database.Database {
  const second = checkpointed(w.dbPath);
  const pageSize = second.pragma('page_size', { simple: true }) as number;
  const leaves = pagesOf(second, tree).filter((p) => p.pagetype === 'leaf');
  expect(leaves.length).toBeGreaterThan(0);
  for (const leaf of leaves) {
    expect(leaf.pageno).toBeGreaterThan(1);
    writeAt(w.dbPath, (leaf.pageno - 1) * pageSize, Buffer.from([0x00]));
  }
  writeFromSecond(second);
  return second;
}

/** A harness hook that throws SQLite's own error once, at one operation: the file stays fine. */
function oneShot(operation: string): (asked: string) => void {
  let armed = true;
  return (asked) => {
    if (!armed || asked !== operation) return;
    armed = false;
    throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
  };
}

function refused(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch (err) {
    return (err as { code?: unknown }).code === 'MANIFEST_STOPPED';
  }
}

// --- One measurement ---------------------------------------------------------

interface Reading {
  preLatch: Generation[];
  stoppedFingerprint: string | null;
  polls: number;
  asks: number;
  attempts: Take[];
  suspend: RingTakeResult | null;
  quit: RingTakeResult | null;
  postLatch: Generation[];
  survivors: Generation[];
  movedOut: Generation[];
}

/**
 * From the stop on: an hour of polls, the sleep's ring test and the quit's,
 * each through the function the core calls, then the ring read again.
 */
async function afterTheStop(w: World, name: string, preLatch: Generation[]): Promise<Reading> {
  expect(w.store.stoppedReading()).toBe(true);
  const takesAtStop = w.takes.length;
  const asksAtStop = w.asks.n;
  const stoppedFingerprint = w.store.contentFingerprint();
  await anHour(w);
  const deps = { manifest: w.store, liveIds: new Map<string, string>(), ringSchedule: () => w.schedule };
  const suspend = await takeManifestGenerationOnSuspend(deps);
  const quit = await takeManifestGenerationOnQuit(deps);
  const postLatch = ringNow(w.ring);
  const byGeneration = new Map(postLatch.map((g) => [g.generation, g]));
  const survivors = preLatch.filter((g) => {
    const now = byGeneration.get(g.generation);
    return now !== undefined && now.file === g.file && now.sha256 === g.sha256;
  });
  const reading: Reading = {
    preLatch,
    stoppedFingerprint,
    polls: POLLS,
    asks: w.asks.n - asksAtStop,
    attempts: w.takes.slice(takesAtStop),
    suspend,
    quit,
    postLatch,
    survivors,
    movedOut: preLatch.filter((g) => !survivors.includes(g))
  };
  readings[name] = reading;
  return reading;
}

/** No take attempted after the stop, and every generation present at the stop still there, byte for byte. */
function expectRingKept(r: Reading): void {
  expect(r.preLatch.map((g) => g.generation)).toEqual([6, 5, 4, 3, 2]);
  expect(r.stoppedFingerprint).not.toBeNull();
  // The change test was still asked at every poll past the floor; it answered "unchanged".
  expect(r.asks).toBeGreaterThanOrEqual(POLLS - 5);
  expect(r.attempts).toEqual([]);
  expect(r.suspend).toBeNull();
  expect(r.quit).toBeNull();
  expect(r.survivors).toEqual(r.preLatch);
  expect(r.postLatch).toEqual(r.preLatch);
}

// ---------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------

// A filled ring is eleven durable takes and some hundred durable commits, so a
// loaded runner gets more than the suite's 15 s ceiling.
describe('the backup ring once the store has stopped (the fix round)', { timeout: 120_000 }, () => {
  it('real damage, every sessions leaf (M1’s K1), met by the list: no take after the stop, every generation kept', async () => {
    const w = world();
    await fillRing(w);
    const preLatch = ringNow(w.ring);
    unseenWrites(w);
    damageLeaves(w, 'sessions');
    expect(refused(() => w.store.listSessions())).toBe(true);
    expectRingKept(await afterTheStop(w, 'K1-sessions-leaves', preLatch));
  });

  it('real damage, the primary key index (M1’s K8), met by a point read: no take after the stop, every generation kept', async () => {
    const w = world();
    await fillRing(w);
    const preLatch = ringNow(w.ring);
    unseenWrites(w);
    damageLeaves(w, 'sqlite_autoindex_sessions_1');
    expect(refused(() => w.store.getSession(w.live))).toBe(true);
    expectRingKept(await afterTheStop(w, 'K8-primary-key-index', preLatch));
  });

  it('real damage, the header (M1’s K6), met by the ring’s own change test: it answers the fingerprint it last answered, and takes nothing', async () => {
    const w = world();
    await fillRing(w);
    const preLatch = ringNow(w.ring);
    const lastAnswered = w.store.contentFingerprint();
    expect(lastAnswered).toMatch(/^[0-9a-f]{64}$/);
    checkpointed(w.dbPath);
    writeAt(w.dbPath, 0, Buffer.from('Not a database!!', 'latin1'));
    // A second connection cannot write past a header that says "not a
    // database", so the store's own connection is made to read again by M1's
    // other trigger, which measured the same answers.
    connectionOf(w.store).pragma('shrink_memory');
    expect(w.store.stoppedReading()).toBe(false);
    // The first poll past the floor is what meets it.
    const met = await poll(w);
    const r = await afterTheStop(w, 'K6-header-met-by-the-ring', preLatch);
    expect(met).toBeNull();
    expect(r.stoppedFingerprint).toBe(lastAnswered);
    expectRingKept(r);
  });

  it('the seam, the file fine (the attack lens’s case): no take after the stop, every generation kept', async () => {
    const w = world();
    await fillRing(w);
    const preLatch = ringNow(w.ring);
    unseenWrites(w);
    setManifestFaultHook(oneShot('listSessions'));
    expect(refused(() => w.store.listSessions())).toBe(true);
    setManifestFaultHook(null);
    expectRingKept(await afterTheStop(w, 'seam-file-fine', preLatch));
  });

  it('named case: the take just before the stop FAILED: one take after it, of the content that take missed, and never another', async () => {
    const w = world();
    await fillRing(w);
    const preLatch = ringNow(w.ring);
    // A change, and the take that should hold it fails.
    w.store.insertSession(record(w.next.i++));
    w.failNext.value = true;
    w.clock.t += FIVE_MIN;
    expect((await w.schedule.maybeTake('interval'))?.ok).toBe(false);
    setManifestFaultHook(oneShot('listSessions'));
    expect(refused(() => w.store.listSessions())).toBe(true);
    setManifestFaultHook(null);
    const r = await afterTheStop(w, 'named-take-before-the-stop-failed', preLatch);
    expect(r.attempts.map((a) => [a.reason, a.ok, a.generation])).toEqual([['interval', true, 7]]);
    expect(r.suspend).toBeNull();
    expect(r.quit).toBeNull();
    // With five slots full, that one take moves the oldest out, as the
    // parent's one take does.
    expect(r.postLatch.map((g) => g.generation)).toEqual([7, 6, 5, 4, 3]);
    expect(r.movedOut.map((g) => g.generation)).toEqual([2]);
    expect(r.survivors.map((g) => g.generation)).toEqual([6, 5, 4, 3]);
  });

  it('named case: the store stopped before its run’s first take: that launch take is the one take, and never another', async () => {
    // A first run fills the ring and ends cleanly.
    const first = world();
    await fillRing(first);
    const preLatch = ringNow(first.ring);
    first.store.close();
    // The next run, over the same file and ring, stops before it ever asked.
    const next = run(first.dbPath, first.ring, first.clock);
    setManifestFaultHook(oneShot('listSessions'));
    expect(refused(() => next.store.listSessions())).toBe(true);
    setManifestFaultHook(null);
    expect(next.store.contentFingerprint()).toBe(STOPPED_FINGERPRINT);
    next.clock.t += MINUTE;
    const launch = await next.schedule.maybeTake('launch');
    expect(launch?.ok).toBe(true);
    const r = await afterTheStop(next, 'named-stopped-before-the-first-take', preLatch);
    expect(r.attempts).toEqual([]);
    expect(r.suspend).toBeNull();
    expect(r.quit).toBeNull();
    expect(r.postLatch.map((g) => g.generation)).toEqual([7, 6, 5, 4, 3]);
    expect(r.survivors.map((g) => g.generation)).toEqual([6, 5, 4, 3]);
  });

  it('control: a store that never stopped still takes a generation when its content changes, past the floor and at the quit', async () => {
    const w = world();
    await fillRing(w);
    unseenWrites(w, 1);
    const taken = w.takes.length;
    let answered: RingTakeResult | null = null;
    for (let i = 0; i < 5 && answered === null; i++) answered = await poll(w);
    expect(answered?.ok).toBe(true);
    expect(w.takes.length).toBe(taken + 1);
    unseenWrites(w, 1);
    const quit = await takeManifestGenerationOnQuit({
      manifest: w.store,
      liveIds: new Map<string, string>(),
      ringSchedule: () => w.schedule
    });
    expect(quit?.ok).toBe(true);
    expect(ringNow(w.ring).map((g) => g.generation)).toEqual([8, 7, 6, 5, 4]);
    expect(w.store.stoppedReading()).toBe(false);
  });
});
