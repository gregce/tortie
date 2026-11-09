/**
 * Phase 357.1, gap 2: the backup ring's change test stops the session list
 * when it meets a broken connection, instead of folding SQLite's error into a
 * fingerprint (build/p3571/SPEC.md §1.1 D4, §2.5, §4.2; research 143 §6).
 *
 * THE GAP, MEASURED AT THE PARENT (357 as landed, SPEC §2.5). The ring asks
 * `ManifestStore.contentFingerprint()` every minute once five have passed since
 * its last copy, and that reads EVERY table through the store's own
 * connection. `digestOneTable` (../../db/digest.ts) turned `SQLITE_CORRUPT`
 * into the text `unreadable: <message>`, so the latch never saw it. With one
 * page of `migrations` damaged in that connection while the file read fine,
 * the fingerprint answered a sha256 for an hour of polls, the store never
 * stopped, no notice was shown and `listSessions` read fine throughout,
 * because no list read touches that table. With `sessions` damaged the same
 * way, the poll answered a sha256 and only a later list read stopped it.
 *
 * THE DAMAGE IS MEMORY SHAPED, as his was (the spec step's method). A page of
 * the file is written over and proved changed; the store's OWN connection is
 * made to read it by a read that does not pass the latch, so the damaged page
 * sits in that connection's cache; the file is written back and proved
 * restored. A fresh connection's `integrity_check` then reads ok while the
 * store's connection answers `SQLITE_CORRUPT`.
 *
 * WHAT IS DRIVEN. The SHIPPING `ManifestStore`, `ManifestRingSchedule` and
 * take (`ringFromRecovery` over the real capture, into a scratch ring folder)
 * on a fake clock; the quit's ring test through the function the core calls
 * (../../sessions/quit-generation.ts); and `snapshotDatabase` and
 * `readDatabaseEvidence` over files this test damaged.
 *
 * WHAT IS ASSERTED. The first poll that asks the change test stops the store,
 * once: one `manifest.stopped` record naming `contentFingerprint`, SQLite's
 * code and a fine file, one notice, the connection held. The stopped store then
 * answers the fingerprint it last answered, so the ring takes no copy for the
 * hour or at the quit, and the generation on disk keeps its bytes. Every error
 * that is not a broken connection keeps its text inside the fingerprint and
 * stops nothing; the same read failing with a broken connection's code stops
 * it, so the code decides and the words do not. A snapshot of a genuinely
 * damaged file still refuses and leaves nothing at its target.
 *
 * `P3571_DIGEST_READINGS=<file>` writes every case's readings there; unset,
 * nothing is written. Every database and ring here is under a scratch folder
 * this file made, and every connection is closed after each case, a held one
 * included: the damage in a cache here is a page's content, and research 143
 * §2.3 measured that close clean.
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
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVT_SCROLLBACK_NOTICE } from '@shared/ipc';
import type { DurabilityNotice } from '@shared/notice';
import { checkDatabaseIntegrity, isBrokenConnectionError } from '../../db/integrity';
import type { ManifestSessionRecord, ManifestStore as Store } from '../store';
import type { ManifestRingSchedule as Schedule, RingReason } from '../ring-schedule';

interface Logged {
  scope: string;
  level: string;
  event?: string;
  msg: string;
  fields?: Record<string, unknown>;
}

const recorded = vi.hoisted(() => ({
  sent: [] as { channel: string; payload: unknown }[],
  logged: [] as Logged[]
}));

vi.mock('../../typed-events', () => ({
  broadcastEvent: (channel: string, payload: unknown) => {
    recorded.sent.push({ channel, payload });
  }
}));

// Captured, not written: the latch's record, the notice's line, the ring's.
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const scoped = (scope: string) => {
    const at =
      (level: string) =>
      (msg: string, fields?: Record<string, unknown>): void => {
        recorded.logged.push({ scope, level, msg, fields });
      };
    return { error: at('error'), warn: at('warn'), info: at('info'), debug: at('debug') };
  };
  return {
    ...real,
    getLog: scoped,
    logEvent: (
      scope: string,
      level: string,
      event: string,
      msg: string,
      fields?: Record<string, unknown>
    ): void => {
      recorded.logged.push({ scope, level, event, msg, fields });
    }
  };
});

const { ManifestStore, isManifestStopped, manifestConnectionsLeftOpen } = await import(
  '../store'
);
const { ManifestRingSchedule, ringFromRecovery } = await import('../ring-schedule');
const { backupBodyPath, readBackupIndex, readDatabaseEvidence, snapshotDatabase } =
  await import('../recovery');
const { takeManifestGenerationOnQuit } = await import('../../sessions/quit-generation');
const { resetDurabilityNoticesForTests, takePendingNotices } = await import('../../notice');

const MINUTE = 60_000;
/** The real cadence: one poll a minute, for an hour. */
const POLLS = 60;
/** The first poll past the ring's five minute floor, after the launch take. */
const FIRST_ASK = 5;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const dirs: string[] = [];
const stores: Store[] = [];
const extra: Database.Database[] = [];
const readings: Record<string, unknown> = {};

beforeEach(() => {
  recorded.sent.length = 0;
  recorded.logged.length = 0;
  resetDurabilityNoticesForTests();
  // A renderer is listening, so a notice goes out through the broadcast.
  takePendingNotices();
});

afterEach(() => {
  for (const store of stores.splice(0)) {
    const db = connectionOf(store);
    if (db.open) db.close();
  }
  for (const db of extra.splice(0)) if (db.open) db.close();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

afterAll(() => {
  const out = process.env['P3571_DIGEST_READINGS'];
  if (out !== undefined && out !== '') writeFileSync(out, `${JSON.stringify(readings, null, 1)}\n`);
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gmux-p3571-digest-'));
  dirs.push(dir);
  return dir;
}

function record(i: number): ManifestSessionRecord {
  const id = `d-${String(i).padStart(4, '0')}-${'x'.repeat(24)}`;
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

/** The shipping store over a scratch file, `rows` sessions and one project. */
function filled(rows: number): { dir: string; dbPath: string; store: Store } {
  const dir = scratch();
  const dbPath = join(dir, 'manifest.db');
  const store = new ManifestStore(dbPath);
  stores.push(store);
  for (let i = 0; i < rows; i++) store.insertSession(record(i));
  store.upsertProject({ id: 'p1', path: '/p/0', name: 'p0' });
  return { dir, dbPath, store };
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
  takes: Take[];
  /** How many times the schedule asked the change test. */
  asks: { n: number };
}

/** A filled store and the shipping ring over it, on a fake clock. */
function world(rows = 120): World {
  const { dir, dbPath, store } = filled(rows);
  const ring = join(dir, 'backups');
  mkdirSync(ring);
  const clock = { t: 1_800_000_000_000 };
  const takes: Take[] = [];
  const asks = { n: 0 };
  const shipping = ringFromRecovery({ source: dbPath, dir: ring });
  const schedule = new ManifestRingSchedule({
    take: async (reason) => {
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
  return { dbPath, ring, store, schedule, clock, takes, asks };
}

/** The launch take, healthy, and the fingerprint it recorded. */
async function launched(w: World): Promise<string> {
  w.clock.t += MINUTE;
  expect((await w.schedule.maybeTake('launch'))?.ok).toBe(true);
  const healthy = w.store.contentFingerprint();
  expect(healthy).toMatch(/^[0-9a-f]{64}$/);
  return healthy as string;
}

interface Generation {
  generation: number;
  sha256: string;
}

/** The ring as it is on disk: every recorded generation and its body's bytes. */
function ringNow(ring: string): Generation[] {
  return readBackupIndex(ring).map((c) => {
    const path = backupBodyPath(c.generation, ring);
    return {
      generation: c.generation,
      sha256: existsSync(path)
        ? createHash('sha256').update(readFileSync(path)).digest('hex')
        : 'missing'
    };
  });
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

function pagesOf(db: Database.Database, name: string): { pageno: number; pagetype: string }[] {
  return db
    .prepare<[string], { pageno: number; pagetype: string }>(
      'SELECT pageno, pagetype FROM dbstat WHERE name = ? ORDER BY pageno'
    )
    .all(name);
}

/** 'ok', or the code of what the call threw. */
function codeOf(fn: () => unknown): string {
  try {
    fn();
    return 'ok';
  } catch (err) {
    return String((err as { code?: unknown }).code ?? (err as Error).name);
  }
}

function caughtFrom(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to throw');
}

function stopRecords(): Logged[] {
  return recorded.logged.filter((l) => l.event === 'manifest.stopped');
}

function stopNotices(): { channel: string; payload: DurabilityNotice }[] {
  return recorded.sent.filter(
    (s): s is { channel: string; payload: DurabilityNotice } =>
      (s.payload as { kind?: unknown }).kind === 'manifest-stopped'
  );
}

interface Planted {
  page: number;
  /** What the store's connection answered reading the damaged page. */
  bypass: string;
  /** A fresh connection's check of the FILE, after it was written back. */
  freshOk: boolean;
  /** What the store's connection answers now, from its cache. */
  stillCached: string;
}

/**
 * Leave one page of `table` damaged in the store's own connection while the
 * file is fine again (the spec step's method, SPEC §2.5).
 */
function damageInMemory(dbPath: string, store: Store, table: string): Planted {
  const second = new Database(dbPath);
  extra.push(second);
  const [checkpoint] = second.pragma('wal_checkpoint(TRUNCATE)') as { busy: number }[];
  expect(checkpoint?.busy).toBe(0);
  const pageSize = second.pragma('page_size', { simple: true }) as number;
  const pages = pagesOf(second, table);
  const target = pages.find((p) => p.pagetype === 'leaf') ?? pages[0];
  expect(target).toBeDefined();
  expect(target!.pageno).toBeGreaterThan(1);
  const offset = (target!.pageno - 1) * pageSize;
  const original = readAt(dbPath, offset, pageSize);
  const damaged = Buffer.from(original);
  // A b-tree page type SQLite does not know.
  damaged[0] = 0xff;
  writeAt(dbPath, offset, damaged);
  // The store's connection drops its clean copy and reads the damaged page by a
  // read that does not pass the latch, so the damage is in its cache.
  const db = connectionOf(store);
  db.pragma('shrink_memory');
  const bypass = codeOf(() => db.prepare(`SELECT * FROM "${table}"`).all());
  // The file is written back, and proved changed back.
  writeAt(dbPath, offset, original);
  const fresh = checkDatabaseIntegrity(dbPath);
  const stillCached = codeOf(() => db.prepare(`SELECT * FROM "${table}"`).all());
  return { page: target!.pageno, bypass, freshOk: fresh.ok, stillCached };
}

/** The memory-shaped premise, before anything is asked to notice. */
function expectHiddenDamage(p: Planted, store: Store): void {
  expect(p.bypass).toBe('SQLITE_CORRUPT');
  expect(p.freshOk).toBe(true);
  expect(p.stillCached).toBe('SQLITE_CORRUPT');
  expect(store.stoppedReading()).toBe(false);
  expect(stopRecords()).toHaveLength(0);
  expect(stopNotices()).toHaveLength(0);
}

/** The one stop: its record names the change test, SQLite's code and a fine file, and no row. */
function expectOneStopByTheChangeTest(code: string): void {
  const records = stopRecords();
  expect(records).toHaveLength(1);
  expect(records[0]!.scope).toBe('manifest');
  expect(records[0]!.level).toBe('error');
  expect(records[0]!.fields).toMatchObject({
    operation: 'contentFingerprint',
    code,
    file: 'fine',
    check: 'integrity_check',
    detail: 'ok'
  });
  expect(typeof records[0]!.fields!['checkMs']).toBe('number');
  expect(JSON.stringify(records[0]!.fields)).not.toMatch(/name-|d-0|\/p\//);
  expect(stopNotices()).toEqual([
    { channel: EVT_SCROLLBACK_NOTICE, payload: { kind: 'manifest-stopped', fileFine: true } }
  ]);
}

/** One poll of the timer, a minute after the last. */
async function poll(w: World): Promise<void> {
  w.clock.t += MINUTE;
  await w.schedule.maybeTake('interval');
}

// ---------------------------------------------------------------------------
// The ring meets the damage first
// ---------------------------------------------------------------------------

// Each world writes its rows through the shipping insertSession, a durable
// commit apiece, and the launch take is a durable copy, so a loaded runner
// gets more than the suite's 15 s ceiling.
describe('the ring’s change test meets a broken connection first', { timeout: 120_000 }, () => {
  it('migrations, damaged in the store’s connection with the file fine: the first ask stops the store once, and no copy is taken for the hour or at the quit', async () => {
    const w = world();
    const healthy = await launched(w);
    const preStop = ringNow(w.ring);
    expect(preStop.map((g) => g.generation)).toEqual([1]);
    const heldBefore = manifestConnectionsLeftOpen();

    const planted = damageInMemory(w.dbPath, w.store, 'migrations');
    expectHiddenDamage(planted, w.store);
    // The parent's blind spot: no list read touches the table.
    expect(w.store.listSessions()).toHaveLength(120);
    expect(w.store.stoppedReading()).toBe(false);

    let stoppedAt: number | null = null;
    let personsWrite: unknown = null;
    for (let minute = 1; minute <= POLLS; minute++) {
      await poll(w);
      if (stoppedAt === null && w.store.stoppedReading()) stoppedAt = minute;
      // A status write the person would cause, which at the parent moved the
      // sessions digest and took a generation the next minute.
      if (minute === 30) personsWrite = caughtFrom(() => w.store.setStatus(record(3).id, 'idle'));
    }

    expect(stoppedAt).toBe(FIRST_ASK);
    expectOneStopByTheChangeTest('SQLITE_CORRUPT');
    expect(manifestConnectionsLeftOpen()).toBe(heldBefore + 1);
    expect(isManifestStopped(personsWrite)).toBe(true);
    expect(isManifestStopped(caughtFrom(() => w.store.listSessions()))).toBe(true);
    // Asked at every poll past the floor, and every answer read "unchanged".
    expect(w.asks.n).toBeGreaterThanOrEqual(1 + POLLS - FIRST_ASK + 1);
    expect(w.store.contentFingerprint()).toBe(healthy);
    expect(w.takes.map((t) => [t.reason, t.ok, t.generation])).toEqual([['launch', true, 1]]);

    const quit = await takeManifestGenerationOnQuit({
      manifest: w.store,
      liveIds: new Map<string, string>(),
      ringSchedule: () => w.schedule
    });
    expect(quit).toBeNull();
    expect(w.takes).toHaveLength(1);
    expect(ringNow(w.ring)).toEqual(preStop);
    // Still once, after sixty more asks and the quit's.
    expect(stopRecords()).toHaveLength(1);
    expect(stopNotices()).toHaveLength(1);

    readings['migrations-hidden'] = {
      planted,
      stoppedAt,
      record: stopRecords()[0]!.fields,
      notices: stopNotices().map((n) => n.payload),
      asks: w.asks.n,
      takes: w.takes,
      quit,
      ringBefore: preStop,
      ringAfter: ringNow(w.ring),
      answersTheLastFingerprint: w.store.contentFingerprint() === healthy
    };
  });

  it('sessions, damaged the same way and met by the poll before any list read: the poll stops the store, not a later list read', async () => {
    const w = world();
    const healthy = await launched(w);
    const planted = damageInMemory(w.dbPath, w.store, 'sessions');
    expectHiddenDamage(planted, w.store);

    let stoppedAt: number | null = null;
    for (let minute = 1; minute <= FIRST_ASK && stoppedAt === null; minute++) {
      await poll(w);
      if (w.store.stoppedReading()) stoppedAt = minute;
    }

    expect(stoppedAt).toBe(FIRST_ASK);
    expectOneStopByTheChangeTest('SQLITE_CORRUPT');
    expect(w.store.contentFingerprint()).toBe(healthy);
    // The list read after it refuses before SQLite and records nothing more.
    expect(isManifestStopped(caughtFrom(() => w.store.listSessions()))).toBe(true);
    expect(stopRecords()).toHaveLength(1);
    expect(stopNotices()).toHaveLength(1);
    expect(w.takes).toHaveLength(1);

    readings['sessions-met-by-the-poll'] = {
      planted,
      stoppedAt,
      record: stopRecords()[0]!.fields,
      takes: w.takes
    };
  });
});

// ---------------------------------------------------------------------------
// The code decides, the words do not
// ---------------------------------------------------------------------------

/**
 * Make the digest's read of one table fail with `err`, on the store's own
 * connection only. The latch's fresh check of the file opens its own
 * connection, which this does not touch, so the file reads fine there.
 */
function failDigestRead(store: Store, table: string, err: unknown): void {
  const db = connectionOf(store);
  const prepare = db.prepare.bind(db) as (sql: string) => Database.Statement;
  const read = `SELECT * FROM "${table}"`;
  Object.assign(db, {
    prepare: (sql: string): Database.Statement => {
      if (sql.startsWith(read)) throw err;
      return prepare(sql);
    }
  });
}

const BROKEN = [
  ['SQLITE_CORRUPT', 'database disk image is malformed'],
  ['SQLITE_CORRUPT_INDEX', 'database disk image is malformed'],
  ['SQLITE_NOTADB', 'file is not a database']
] as const;

const NOT_BROKEN: readonly { name: string; make: () => Error }[] = [
  {
    name: 'SQLITE_IOERR_READ',
    make: () => new Database.SqliteError('disk I/O error', 'SQLITE_IOERR_READ')
  },
  {
    name: 'SQLITE_BUSY',
    make: () => new Database.SqliteError('database is locked', 'SQLITE_BUSY')
  },
  {
    name: 'a plain Error naming SQLITE_CORRUPT in SQLite’s own words',
    make: () =>
      Object.assign(new Error('database disk image is malformed'), { code: 'SQLITE_CORRUPT' })
  },
  { name: 'a TypeError', make: () => new TypeError('not a question about pages') }
];

describe('the same read, only the error differs: the code decides', () => {
  NOT_BROKEN.forEach((row, i) => {
    it(`${row.name}: the fingerprint keeps the table’s text, and nothing stops`, () => {
      const { store } = filled(20);
      const heldBefore = manifestConnectionsLeftOpen();
      const healthy = store.contentFingerprint();
      expect(healthy).toMatch(/^[0-9a-f]{64}$/);
      const thrown = row.make();
      expect(isBrokenConnectionError(thrown)).toBe(false);
      failDigestRead(store, 'migrations', thrown);

      const answer = store.contentFingerprint();
      expect(answer).toMatch(/^[0-9a-f]{64}$/);
      // The table's text is in it now, exactly as before this phase.
      expect(answer).not.toBe(healthy);
      expect(store.contentFingerprint()).toBe(answer);
      expect(store.stoppedReading()).toBe(false);
      expect(stopRecords()).toHaveLength(0);
      expect(stopNotices()).toHaveLength(0);
      expect(manifestConnectionsLeftOpen()).toBe(heldBefore);
      expect(store.listSessions()).toHaveLength(20);
      readings[`not-broken-${String(i)}`] = { name: row.name, stopped: store.stoppedReading() };
    });
  });

  for (const [code, message] of BROKEN) {
    it(`${code}: the same read stops the store once, and the fingerprint is the last it answered`, () => {
      const { store } = filled(20);
      const heldBefore = manifestConnectionsLeftOpen();
      const healthy = store.contentFingerprint();
      expect(healthy).toMatch(/^[0-9a-f]{64}$/);
      failDigestRead(store, 'migrations', new Database.SqliteError(message, code));

      expect(store.contentFingerprint()).toBe(healthy);
      expect(store.stoppedReading()).toBe(true);
      expectOneStopByTheChangeTest(code);
      expect(manifestConnectionsLeftOpen()).toBe(heldBefore + 1);
      expect(store.contentFingerprint()).toBe(healthy);
      expect(isManifestStopped(caughtFrom(() => store.listSessions()))).toBe(true);
      expect(stopRecords()).toHaveLength(1);
      readings[`broken-${code}`] = { record: stopRecords()[0]!.fields };
    });
  }
});

// ---------------------------------------------------------------------------
// A fresh connection over a damaged file
// ---------------------------------------------------------------------------

/** A SQLite varint at `at`: its value and where the next field starts. */
function varint(buf: Buffer, at: number): { value: number; next: number } {
  let value = 0;
  for (let i = 0; i < 8; i++) {
    const byte = buf[at + i]!;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, next: at + i + 1 };
  }
  return { value: value * 256 + buf[at + 8]!, next: at + 9 };
}

/** A manifest the shipping store wrote and closed, and one table's pages. */
function closedManifest(table: string): {
  dir: string;
  dbPath: string;
  pageSize: number;
  pages: { pageno: number; pagetype: string }[];
} {
  const { dir, dbPath, store } = filled(120);
  store.close();
  const look = new Database(dbPath, { readonly: true, fileMustExist: true });
  const pageSize = look.pragma('page_size', { simple: true }) as number;
  const pages = pagesOf(look, table);
  look.close();
  return { dir, dbPath, pageSize, pages };
}

function expectNothingAt(path: string): void {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    expect(existsSync(`${path}${suffix}`)).toBe(false);
  }
}

describe('a snapshot of a genuinely damaged file still refuses', { timeout: 60_000 }, () => {
  it('a sessions leaf written over: the copy refuses with SQLite’s error and leaves nothing behind', () => {
    const m = closedManifest('sessions');
    const leaf = m.pages.find((p) => p.pagetype === 'leaf');
    expect(leaf).toBeDefined();
    writeAt(m.dbPath, (leaf!.pageno - 1) * m.pageSize, Buffer.from([0xff]));
    expect(checkDatabaseIntegrity(m.dbPath).ok).toBe(false);

    const to = join(m.dir, 'copy.db');
    const err = caughtFrom(() => snapshotDatabase({ from: m.dbPath, to }));
    expect(err).toBeInstanceOf(Database.SqliteError);
    expect(isBrokenConnectionError(err)).toBe(true);
    expectNothingAt(to);
    readings['snapshot-page'] = { code: (err as { code?: unknown }).code };
  });

  it('a migrations record’s header written over, which VACUUM INTO copies without reading: the digest’s own SQLITE_CORRUPT refuses the copy now', () => {
    const m = closedManifest('migrations');
    const root = m.pages[0];
    expect(root).toBeDefined();
    expect(root!.pagetype).toBe('leaf');
    const offset = (root!.pageno - 1) * m.pageSize;
    const page = readAt(m.dbPath, offset, m.pageSize);
    // A table leaf: its first cell is a payload size, a rowid, then the
    // record, whose first byte is the size of its own header.
    expect(page[0]).toBe(0x0d);
    expect(page.readUInt16BE(3)).toBeGreaterThan(0);
    const cell = page.readUInt16BE(8);
    const payload = varint(page, cell);
    const rowid = varint(page, payload.next);
    expect(payload.value).toBeLessThan(0x7f);
    expect(page[rowid.next]).toBeLessThan(0x7f);
    // A header longer than the whole record.
    writeAt(m.dbPath, offset + rowid.next, Buffer.from([0x7f]));

    // The premise: the file is damaged, a count still answers, and VACUUM INTO
    // copies the record without reading it, so what refuses below is the
    // digest. At the parent this snapshot came back ok, both sides reading the
    // table as `unreadable: database disk image is malformed`.
    expect(checkDatabaseIntegrity(m.dbPath).ok).toBe(false);
    const look = new Database(m.dbPath, { readonly: true, fileMustExist: true });
    extra.push(look);
    expect(codeOf(() => look.prepare('SELECT COUNT(*) FROM migrations').get())).toBe('ok');
    const byHand = join(m.dir, 'by-hand.db');
    expect(codeOf(() => look.exec(`VACUUM INTO '${byHand}'`))).toBe('ok');
    expect(existsSync(byHand)).toBe(true);
    look.close();

    const to = join(m.dir, 'copy.db');
    const err = caughtFrom(() => snapshotDatabase({ from: m.dbPath, to }));
    expect(err).toBeInstanceOf(Database.SqliteError);
    expect((err as { code?: unknown }).code).toBe('SQLITE_CORRUPT');
    expectNothingAt(to);

    // The evidence read says it could not read the file, where it used to
    // hand back the table's text beside the others' hashes.
    const evidence = readDatabaseEvidence(m.dbPath);
    expect(evidence).toEqual({
      counts: {},
      digests: {},
      error: 'database disk image is malformed'
    });
    readings['snapshot-record'] = { code: (err as { code?: unknown }).code, evidence };
  });
});
