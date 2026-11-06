/**
 * Phase 357. The manifest store stops when its connection breaks, once, and
 * from then on nothing it offers reaches SQLite.
 *
 * THE DAMAGE IS REAL. The shipping `ManifestStore` writes a scratch manifest
 * through its own `insertSession`, reads it once so every page sits in the
 * connection's cache, a second connection checkpoints the WAL into the main
 * file, a located structure of that file is written over, and the bytes are
 * proved changed BEFORE anything is asked to notice (the house rule from
 * ../../db/__tests__/integrity.test.ts). `PRAGMA shrink_memory` then makes the
 * live connection read from disk again. That is the spec step's M1 method
 * (build/p357/SPEC.md §2.1), and the three kinds here are three of its rows:
 * K1 a sessions leaf's type byte, K3 the interior page's right child past the
 * end (met by a create first, which is the case the repository used to wrap),
 * and K6 the header's magic.
 *
 * THE MEMORY-SHAPED CASE IS THE SEAM. Real page damage always leaves the FILE
 * damaged, and the operator's case was a fine file under a damaged cache. The
 * harness hook (`setManifestFaultHook`) throws better-sqlite3's own
 * `SqliteError` from inside `through`'s `try`, so the classifier meets exactly
 * what real damage hands it, while the file stays fine.
 *
 * WHAT IS ASSERTED, for each: one refusal of the typed shape naming the member
 * that met it, one `manifest.stopped` record with no row data, one notice
 * through the (mocked) broadcast, every member refusing afterwards with ZERO
 * calls into SQLite (spies on the connection and statement prototypes), the
 * three quiet members answering their fallbacks, and what `close` does: it
 * closes a damaged or unreadable file's connection, and holds a fine file's
 * open with its `-wal` and `-shm` still on disk.
 *
 * Every database here is under a scratch directory this file made.
 */

import Database from 'better-sqlite3';
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  writeSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVT_SCROLLBACK_NOTICE } from '@shared/ipc';
import { MANIFEST_STOPPED_REFUSAL } from '@shared/manifest-stopped-copy';
import type { DurabilityNotice } from '@shared/notice';
import { checkDatabaseIntegrity } from '../../db/integrity';
import type {
  ManifestOperation,
  ManifestSessionRecord,
  ManifestStore as Store
} from '../store';

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

// The log is captured, not written: every record the store and the notice
// module make lands in `recorded.logged`, typed records with their `event`.
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

const {
  ManifestStore,
  MANIFEST_OPERATIONS,
  STOPPED_FINGERPRINT,
  isManifestStopped,
  manifestConnectionsLeftOpen,
  setManifestFaultHook
} = await import('../store');
const { resetDurabilityNoticesForTests, takePendingNotices } = await import(
  '../../notice'
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const dirs: string[] = [];
const stores: Store[] = [];
const extraConnections: Database.Database[] = [];
const lockedFiles: string[] = [];

function scratchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gmux-p357-latch-'));
  dirs.push(dir);
  return dir;
}

/** M1's row: a name and argv long enough that 200 rows span many pages. */
function record(i: number, big = false): ManifestSessionRecord {
  const id = `s-${String(i).padStart(4, '0')}-${'x'.repeat(24)}`;
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
    argv: [
      '/usr/local/bin/claude',
      '--session-id',
      id,
      ...(big ? ['y'.repeat(14_000)] : [])
    ]
  };
}

interface Built {
  dbPath: string;
  store: Store;
  /** The newest row's id, in the last leaf. */
  live: string;
}

/** The shipping store over a scratch file, written and read once. */
function build(rows: number, bigRows = 0, make = (path: string) => new ManifestStore(path)): Built {
  const dir = scratchDir();
  const dbPath = join(dir, 'manifest.db');
  const store = make(dbPath);
  stores.push(store);
  for (let i = 0; i < rows; i++) store.insertSession(record(i, i < bigRows));
  store.upsertProject({ id: 'p1', path: '/p/0', name: 'p0' });
  // Warm: every sessions page is now in this connection's cache.
  expect(store.listSessions()).toHaveLength(rows);
  return { dbPath, store, live: record(rows - 1).id };
}

function connectionOf(store: Store): Database.Database {
  return (store as unknown as { db: Database.Database }).db;
}

/** A second connection that has checkpointed every page into the main file. */
function checkpointed(dbPath: string): Database.Database {
  const w = new Database(dbPath);
  extraConnections.push(w);
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

/** Make the live connection read its pages from disk again. */
function reread(store: Store): void {
  connectionOf(store).pragma('shrink_memory');
}

/** A harness hook that throws SQLite's own error once, at one operation. */
function oneShot(
  operation: ManifestOperation,
  code: string
): (asked: ManifestOperation) => void {
  let armed = true;
  return (asked) => {
    if (!armed || asked !== operation) return;
    armed = false;
    throw new Database.SqliteError(
      code === 'SQLITE_NOTADB' ? 'file is not a database' : 'database disk image is malformed',
      code
    );
  };
}

function caughtFrom(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to throw');
}

/** The typed refusal, naming `operation`, and nothing else. */
function expectRefusal(fn: () => unknown, operation: ManifestOperation): void {
  const err = caughtFrom(fn);
  expect(err).toBeInstanceOf(Error);
  expect(isManifestStopped(err)).toBe(true);
  expect((err as { code?: unknown }).code).toBe('MANIFEST_STOPPED');
  expect(JSON.parse((err as Error).message)).toEqual({
    code: 'MANIFEST_STOPPED',
    message: MANIFEST_STOPPED_REFUSAL,
    detail: operation
  });
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

/**
 * Count every call into SQLite from here on: the connection's own entry points
 * and every statement's. The control test below proves it counts.
 */
function countSqliteCalls(): () => number {
  const probe = new Database(':memory:');
  const statement = Object.getPrototypeOf(probe.prepare('SELECT 1')) as Record<
    'run' | 'get' | 'all' | 'iterate',
    (...args: unknown[]) => unknown
  >;
  probe.close();
  const spies = [
    vi.spyOn(Database.prototype, 'prepare'),
    vi.spyOn(Database.prototype, 'pragma'),
    vi.spyOn(Database.prototype, 'exec'),
    vi.spyOn(Database.prototype, 'transaction'),
    vi.spyOn(statement, 'run'),
    vi.spyOn(statement, 'get'),
    vi.spyOn(statement, 'all'),
    vi.spyOn(statement, 'iterate')
  ];
  return () => spies.reduce((n, spy) => n + spy.mock.calls.length, 0);
}

/**
 * One call of every member but `close`, with arguments that would reach
 * SQLite on a healthy store. Typed as a total map, so a member added to
 * `MANIFEST_OPERATIONS` without a row here is a compile error in this file.
 */
const CALLS: { readonly [K in Exclude<ManifestOperation, 'close'>]: (s: Store, live: string) => unknown } = {
  contentFingerprint: (s) => s.contentFingerprint(),
  schemaState: (s) => s.schemaState(),
  describeSchema: (s) => s.describeSchema(),
  insertSession: (s) => s.insertSession(record(9_000)),
  getSession: (s, live) => s.getSession(live),
  listSessions: (s) => s.listSessions(),
  updateSession: (s, live) => s.updateSession(live, { status: 'idle' }),
  setContextSnapshot: (s, live) => s.setContextSnapshot(live, { v: 1, at: 1 } as never),
  setResumeArgvColumn: (s, live) => s.setResumeArgvColumn(live, ['/usr/local/bin/claude', '--resume', 'r']),
  setEnvColumn: (s, live) => s.setEnvColumn(live, { P357: '1' }),
  renameSession: (s, live) => s.renameSession(live, 'renamed', 'renamed'),
  setStatus: (s, live) => s.setStatus(live, 'idle'),
  setAgentSessionId: (s, live) =>
    s.setAgentSessionId(live, 'agent-id', ['/usr/local/bin/claude', '--resume', 'agent-id']),
  clearAgentSessionId: (s, live) => s.clearAgentSessionId(live, 'failed' as never, {} as never),
  setResumeProvenance: (s, live) => s.setResumeProvenance(live, {} as never),
  setResumeCapture: (s, live) => s.setResumeCapture(live, 'failed' as never),
  deleteSession: (s, live) => s.deleteSession(live),
  markSessionRemoved: (s, live) => s.markSessionRemoved(live),
  markMachinesForgotten: (s) => s.markMachinesForgotten([]),
  markProjectTabClosed: (s) => s.markProjectTabClosed({ path: '/p/0' }, {} as never),
  clearProjectTabClosed: (s) => s.clearProjectTabClosed({ path: '/p/0' }),
  projectTabClosedFor: (s) => s.projectTabClosedFor({ path: '/p/0' }),
  closedRemoteFolder: (s) => s.closedRemoteFolder('m1', '/p/0'),
  setLastSeen: (s, live) => s.setLastSeen(live, 1_800_000_000_000),
  pruneDiscardedSessions: (s) => s.pruneDiscardedSessions(),
  setRestoreResult: (s, live) => s.setRestoreResult(live, { kind: 'armed', at: 1 }, 'idle'),
  recordRestoreOutcome: (s, live) => s.recordRestoreOutcome(live, { kind: 'armed', at: 1 }),
  beginRestoreAttempt: (s, live) => s.beginRestoreAttempt(live),
  noteRestoreTmuxId: (s) => s.noteRestoreTmuxId(1, '$1'),
  finishRestoreAttempt: (s) => s.finishRestoreAttempt(1, 'armed'),
  listUnfinishedRestoreAttempts: (s) => s.listUnfinishedRestoreAttempts(),
  getRestoreAttempt: (s) => s.getRestoreAttempt(1),
  pruneRestoreAttempts: (s) => s.pruneRestoreAttempts(),
  beginRemoteExecution: (s) =>
    s.beginRemoteExecution({ machineId: 'm1', machineLabel: 'm1', kind: 'copy', subject: '' } as never),
  finishRemoteExecution: (s) => s.finishRemoteExecution(1, 'completed' as never),
  listUnfinishedRemoteExecutions: (s) => s.listUnfinishedRemoteExecutions(),
  getRemoteExecution: (s) => s.getRemoteExecution(1),
  reconcile: (s) => s.reconcile([]),
  upsertProject: (s) => s.upsertProject({ id: 'p2', path: '/p/2', name: 'p2' }),
  getProjectByPath: (s) => s.getProjectByPath('/p/0'),
  upsertRemoteProject: (s) => s.upsertRemoteProject({ machineId: 'm1', path: '/p/0', name: 'p0' }),
  getRemoteProject: (s) => s.getRemoteProject('m1', '/p/0'),
  listRemoteProjects: (s) => s.listRemoteProjects(),
  listProjects: (s) => s.listProjects(),
  deleteProject: (s) => s.deleteProject('p1'),
  remoteFolderPin: (s) => s.remoteFolderPin('m1', '/p/0'),
  setRemoteFolderPin: (s) => s.setRemoteFolderPin('m1', '/p/0', '1:2')
};

/** The three that answer instead of refusing, and what they answer. */
const QUIET = ['contentFingerprint', 'schemaState', 'describeSchema'] as const;
const STOPPED_STATE = { applicationId: 0, userVersion: 0, minCompatible: null, lastOpenedBy: null };
const STOPPED_SENTENCE = 'session list: stopped reading';

const REFUSING = (Object.keys(CALLS) as Exclude<ManifestOperation, 'close'>[]).filter(
  (name) => !(QUIET as readonly string[]).includes(name)
);

/**
 * After a stop: every refusing member refuses with its OWN name, the quiet
 * three answer their fallbacks, and none of it asks the seam or reaches SQLite.
 * The fingerprint's fallback is the fingerprint the store last answered, or
 * `STOPPED_FINGERPRINT` when it never answered one, and never null (the fix
 * round: null is the backup ring's "take one").
 */
function expectEveryMemberStoppedBeforeSqlite(
  b: Built,
  fingerprint: string = STOPPED_FINGERPRINT
): void {
  const sqliteCalls = countSqliteCalls();
  const asked: ManifestOperation[] = [];
  setManifestFaultHook((operation) => {
    asked.push(operation);
  });
  for (const name of REFUSING) expectRefusal(() => CALLS[name](b.store, b.live), name);
  expect(b.store.contentFingerprint()).toBe(fingerprint);
  expect(b.store.contentFingerprint()).toBe(fingerprint);
  expect(b.store.schemaState()).toEqual(STOPPED_STATE);
  expect(b.store.describeSchema()).toBe(STOPPED_SENTENCE);
  expect(b.store.stoppedReading()).toBe(true);
  expect(sqliteCalls()).toBe(0);
  expect(asked).toEqual([]);
  setManifestFaultHook(null);
}

beforeEach(() => {
  recorded.sent.length = 0;
  recorded.logged.length = 0;
  resetDurabilityNoticesForTests();
  // A renderer is listening, so a notice goes out through the broadcast.
  takePendingNotices();
});

afterEach(() => {
  setManifestFaultHook(null);
  vi.restoreAllMocks();
  for (const path of lockedFiles.splice(0)) {
    try {
      chmodSync(path, 0o644);
    } catch {
      /* already gone */
    }
  }
  // Every connection a test opened is closed here, a held one included: the
  // cache in these tests is not damaged, so closing it is safe.
  for (const store of stores.splice(0)) {
    const db = connectionOf(store);
    if (db.open) db.close();
  }
  for (const db of extraConnections.splice(0)) {
    if (db.open) db.close();
  }
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Real damage
// ---------------------------------------------------------------------------

// Each case writes its rows through the shipping insertSession, a durable
// commit apiece (about 1.5 s for 200 on a quiet machine), so a loaded runner
// gets more than the suite's 15 s ceiling for this block.
describe('a real damaged file under the live connection (M1’s method)', { timeout: 60_000 }, () => {
  it('K1, a sessions leaf’s type byte: the first broken read latches once and nothing reaches SQLite after', () => {
    const b = build(200, 2);
    const heldBefore = manifestConnectionsLeftOpen();
    const w = checkpointed(b.dbPath);
    const pageSize = w.pragma('page_size', { simple: true }) as number;
    const leaves = pagesOf(w, 'sessions').filter((p) => p.pagetype === 'leaf');
    expect(leaves.length).toBeGreaterThan(2);
    const target = leaves[0]!;
    expect(target.pageno).toBeGreaterThan(1);
    writeAt(b.dbPath, (target.pageno - 1) * pageSize, Buffer.from([0x00]));
    reread(b.store);
    expect(b.store.stoppedReading()).toBe(false);

    expectRefusal(() => b.store.listSessions(), 'listSessions');

    const records = stopRecords();
    expect(records).toHaveLength(1);
    const fields = records[0]!.fields!;
    expect(records[0]!.scope).toBe('manifest');
    expect(records[0]!.level).toBe('error');
    expect(Object.keys(fields).sort()).toEqual(
      ['check', 'checkMs', 'code', 'detail', 'file', 'operation'].sort()
    );
    expect(fields).toMatchObject({
      operation: 'listSessions',
      code: 'SQLITE_CORRUPT',
      file: 'damaged',
      check: 'integrity_check'
    });
    expect(typeof fields['checkMs']).toBe('number');
    expect(String(fields['detail']).length).toBeLessThanOrEqual(160);
    expect(String(fields['detail'])).toMatch(/page/);
    // No row data: no name, no id, no folder of any row.
    const text = JSON.stringify(fields);
    expect(text).not.toMatch(/name-|s-0|\/p\//);

    expect(stopNotices()).toEqual([
      { channel: EVT_SCROLLBACK_NOTICE, payload: { kind: 'manifest-stopped', fileFine: false } }
    ]);
    expect(manifestConnectionsLeftOpen()).toBe(heldBefore);

    expectEveryMemberStoppedBeforeSqlite(b);
    // Still once: forty seven more calls added no record and no notice.
    expect(stopRecords()).toHaveLength(1);
    expect(stopNotices()).toHaveLength(1);

    // The file is damaged, so the quit closes this connection as before.
    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
    expect(manifestConnectionsLeftOpen()).toBe(heldBefore);
  });

  it('K3, the interior page’s right child past the end: a CREATE that meets it latches through the repository’s catch', () => {
    const b = build(200, 2);
    const w = checkpointed(b.dbPath);
    const pageSize = w.pragma('page_size', { simple: true }) as number;
    const interior = pagesOf(w, 'sessions').filter((p) => p.pagetype === 'internal');
    expect(interior.length).toBeGreaterThan(0);
    // Interior table page header: type(1) freeblock(2) cells(2) start(2)
    // fragments(1), then the right child (4) at offset 8.
    writeAt(
      b.dbPath,
      (interior[0]!.pageno - 1) * pageSize + 8,
      Buffer.from([0x00, 0x0f, 0xff, 0xff])
    );
    reread(b.store);

    // At the parent this create answered INVALID_INPUT "Could not record
    // session" and the store went on. Now SQLite's code reaches the latch.
    expectRefusal(() => b.store.insertSession(record(9_000)), 'insertSession');

    const records = stopRecords();
    expect(records).toHaveLength(1);
    expect(records[0]!.fields).toMatchObject({
      operation: 'insertSession',
      code: 'SQLITE_CORRUPT',
      file: 'damaged'
    });
    expect(stopNotices().map((n) => n.payload)).toEqual([
      { kind: 'manifest-stopped', fileFine: false }
    ]);

    expectEveryMemberStoppedBeforeSqlite(b);
    expect(stopRecords()).toHaveLength(1);

    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
  });

  it('K1 on five leaves: the record’s detail is the file check’s own text, clipped to 160 characters', () => {
    const b = build(200, 2);
    const w = checkpointed(b.dbPath);
    const pageSize = w.pragma('page_size', { simple: true }) as number;
    const leaves = pagesOf(w, 'sessions').filter((p) => p.pagetype === 'leaf');
    expect(leaves.length).toBeGreaterThan(5);
    for (const leaf of leaves.slice(0, 5)) {
      writeAt(b.dbPath, (leaf.pageno - 1) * pageSize, Buffer.from([0x00]));
    }
    reread(b.store);

    expectRefusal(() => b.store.listSessions(), 'listSessions');

    const full = checkDatabaseIntegrity(b.dbPath);
    expect(full.ok).toBe(false);
    expect(full.detail.length).toBeGreaterThan(160);
    expect(stopRecords()[0]!.fields!['detail']).toBe(full.detail.slice(0, 160));
  });

  it('K6, the header’s magic: SQLITE_NOTADB latches the same way', () => {
    const b = build(200, 2);
    checkpointed(b.dbPath);
    writeAt(b.dbPath, 0, Buffer.from('Not a database!!', 'latin1'));
    reread(b.store);

    expectRefusal(() => b.store.listSessions(), 'listSessions');

    const records = stopRecords();
    expect(records).toHaveLength(1);
    expect(records[0]!.fields).toMatchObject({
      operation: 'listSessions',
      code: 'SQLITE_NOTADB',
      file: 'damaged',
      check: 'integrity_check'
    });
    expect(stopNotices().map((n) => n.payload)).toEqual([
      { kind: 'manifest-stopped', fileFine: false }
    ]);

    expectEveryMemberStoppedBeforeSqlite(b);

    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
  });

  it('K6 met by the ring’s fingerprint first: it answers the fingerprint it last answered, never null, and the store has stopped', () => {
    const b = build(20);
    const healthy = b.store.contentFingerprint();
    expect(healthy).toMatch(/^[0-9a-f]{64}$/);
    checkpointed(b.dbPath);
    writeAt(b.dbPath, 0, Buffer.from('Not a database!!', 'latin1'));
    reread(b.store);

    // At the parent this was null: the ring took (or tried) a copy at every
    // poll past its floor. The latch's first build kept the null, which with
    // the file fine rotated the whole ring. Now the store stops and answers
    // the fingerprint it last answered, so the ring's change test reads
    // "unchanged" (the fix round).
    expect(b.store.contentFingerprint()).toBe(healthy);
    expect(b.store.stoppedReading()).toBe(true);
    expect(stopRecords()).toHaveLength(1);
    expect(stopRecords()[0]!.fields).toMatchObject({
      operation: 'contentFingerprint',
      code: 'SQLITE_NOTADB',
      file: 'damaged'
    });
    expect(b.store.contentFingerprint()).toBe(healthy);
    expectRefusal(() => b.store.listSessions(), 'listSessions');
    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
  });

  it('K6 met by diagnostics first: describeSchema says it stopped reading, never a schema it did not read', () => {
    const b = build(20);
    expect(b.store.describeSchema()).toMatch(/^session list schema \d+ /);
    checkpointed(b.dbPath);
    writeAt(b.dbPath, 0, Buffer.from('Not a database!!', 'latin1'));
    reread(b.store);

    expect(b.store.describeSchema()).toBe(STOPPED_SENTENCE);
    expect(stopRecords()).toHaveLength(1);
    expect(stopRecords()[0]!.fields).toMatchObject({
      operation: 'describeSchema',
      code: 'SQLITE_NOTADB'
    });
  });
});

// ---------------------------------------------------------------------------
// The memory-shaped case
// ---------------------------------------------------------------------------

describe('a fine file under a broken connection (the seam)', () => {
  it('latches with file fine, holds the connection open at close, and leaves the -wal and -shm on disk', () => {
    const b = build(5);
    const heldBefore = manifestConnectionsLeftOpen();
    setManifestFaultHook(oneShot('listSessions', 'SQLITE_CORRUPT'));

    expectRefusal(() => b.store.listSessions(), 'listSessions');

    const records = stopRecords();
    expect(records).toHaveLength(1);
    expect(records[0]!.fields).toMatchObject({
      operation: 'listSessions',
      code: 'SQLITE_CORRUPT',
      file: 'fine',
      check: 'integrity_check',
      detail: 'ok'
    });
    expect(stopNotices().map((n) => n.payload)).toEqual([
      { kind: 'manifest-stopped', fileFine: true }
    ]);
    expect(manifestConnectionsLeftOpen()).toBe(heldBefore + 1);

    expectEveryMemberStoppedBeforeSqlite(b);

    b.store.close();
    expect(connectionOf(b.store).open).toBe(true);
    expect(existsSync(`${b.dbPath}-wal`)).toBe(true);
    expect(existsSync(`${b.dbPath}-shm`)).toBe(true);
    const leftOpen = recorded.logged.filter(
      (l) => l.msg === 'the session list connection is left open so nothing closes a damaged cache'
    );
    expect(leftOpen).toHaveLength(1);
    expect(leftOpen[0]).toMatchObject({ scope: 'manifest', level: 'info' });
    // Said once, however many times the quit asks.
    b.store.close();
    expect(connectionOf(b.store).open).toBe(true);
    expect(
      recorded.logged.filter((l) => l.msg === leftOpen[0]!.msg)
    ).toHaveLength(1);
    expect(manifestConnectionsLeftOpen()).toBe(heldBefore + 1);
  });

  it('control: a store that never stopped closes, and its -wal and -shm go with the last close', () => {
    const b = build(5);
    expect(existsSync(`${b.dbPath}-wal`)).toBe(true);
    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
    expect(existsSync(`${b.dbPath}-wal`)).toBe(false);
    expect(existsSync(`${b.dbPath}-shm`)).toBe(false);
  });

  it('a file the check cannot read: file unreadable, a null in the notice, and close closes', () => {
    const b = build(5);
    const heldBefore = manifestConnectionsLeftOpen();
    chmodSync(b.dbPath, 0o000);
    lockedFiles.push(b.dbPath);
    setManifestFaultHook(oneShot('getSession', 'SQLITE_CORRUPT'));

    expectRefusal(() => b.store.getSession(b.live), 'getSession');

    expect(stopRecords()[0]!.fields).toMatchObject({
      operation: 'getSession',
      file: 'unreadable'
    });
    expect(stopNotices().map((n) => n.payload)).toEqual([
      { kind: 'manifest-stopped', fileFine: null }
    ]);
    expect(manifestConnectionsLeftOpen()).toBe(heldBefore);

    chmodSync(b.dbPath, 0o644);
    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
  });

  it('in a fresh run, one fine-file stop leaves exactly one connection open', async () => {
    vi.resetModules();
    const fresh = await import('../store');
    const freshNotice = await import('../../notice');
    freshNotice.takePendingNotices();
    expect(fresh.manifestConnectionsLeftOpen()).toBe(0);

    const b = build(3, 0, (path) => new fresh.ManifestStore(path));
    fresh.setManifestFaultHook(oneShot('setStatus', 'SQLITE_NOTADB'));
    const refusal = caughtFrom(() => b.store.setStatus(b.live, 'idle'));
    expect(fresh.isManifestStopped(refusal)).toBe(true);

    expect(fresh.manifestConnectionsLeftOpen()).toBe(1);
    b.store.close();
    expect(connectionOf(b.store).open).toBe(true);
    expect(fresh.manifestConnectionsLeftOpen()).toBe(1);
    fresh.setManifestFaultHook(null);
  });
});

// ---------------------------------------------------------------------------
// What does not latch
// ---------------------------------------------------------------------------

describe('errors that are not a broken connection go on as they were', () => {
  it('a missing session is today’s SESSION_NOT_FOUND, and the store keeps going', () => {
    const b = build(3);
    const err = caughtFrom(() => b.store.updateSession('no-such-session', { status: 'idle' }));
    expect(JSON.parse((err as Error).message)).toMatchObject({ code: 'SESSION_NOT_FOUND' });
    expect(b.store.stoppedReading()).toBe(false);
    expect(stopRecords()).toHaveLength(0);
    expect(stopNotices()).toHaveLength(0);
    expect(b.store.listSessions()).toHaveLength(3);
  });

  for (const code of ['SQLITE_IOERR_READ', 'SQLITE_BUSY', 'SQLITE_FULL']) {
    it(`${code} is rethrown as the same object and stops nothing (D2)`, () => {
      const b = build(3);
      const thrown = new Database.SqliteError('not a damaged page', code);
      setManifestFaultHook((operation) => {
        if (operation === 'listSessions') throw thrown;
      });
      expect(caughtFrom(() => b.store.listSessions())).toBe(thrown);
      setManifestFaultHook(null);
      expect(b.store.stoppedReading()).toBe(false);
      expect(stopRecords()).toHaveLength(0);
      expect(b.store.listSessions()).toHaveLength(3);
    });
  }

  it('a plain Error that names SQLITE_CORRUPT is not SQLite saying so', () => {
    const b = build(3);
    const thrown = Object.assign(new Error('database disk image is malformed'), {
      code: 'SQLITE_CORRUPT'
    });
    setManifestFaultHook((operation) => {
      if (operation === 'getSession') throw thrown;
    });
    expect(caughtFrom(() => b.store.getSession(b.live))).toBe(thrown);
    setManifestFaultHook(null);
    expect(b.store.stoppedReading()).toBe(false);
  });

  it('the fingerprint keeps today’s null for a failure that is not a broken connection, and stops nothing', () => {
    const b = build(3);
    // A closed connection: databaseFingerprint throws a TypeError, not SQLite.
    connectionOf(b.store).close();
    expect(b.store.contentFingerprint()).toBeNull();
    expect(b.store.stoppedReading()).toBe(false);
    expect(stopRecords()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Nesting, the quiet three, and the shape
// ---------------------------------------------------------------------------

describe('whichever member meets the break, the store stops once', () => {
  it('reconcile: its inner read latches, its refusal comes out unchanged, and the transaction is gone', () => {
    const b = build(3);
    setManifestFaultHook(oneShot('listSessions', 'SQLITE_CORRUPT'));
    expectRefusal(() => b.store.reconcile([]), 'listSessions');
    expect(connectionOf(b.store).inTransaction).toBe(false);
    expect(stopRecords()).toHaveLength(1);
    expect(stopRecords()[0]!.fields).toMatchObject({ operation: 'listSessions' });
    expectRefusal(() => b.store.reconcile([]), 'reconcile');
    expect(stopRecords()).toHaveLength(1);
  });

  it('reconcile: a raw SQLite error reaching the outer call after an inner latch records nothing more', () => {
    const b = build(3);
    setManifestFaultHook(oneShot('listSessions', 'SQLITE_CORRUPT'));
    // An override on the store sits inside reconcile's transaction (the house
    // seam the sqlite interleaving test uses). It lets the inner refusal pass
    // and then throws SQLite's own error, as a ROLLBACK that fails would.
    const inner = b.store.listSessions.bind(b.store);
    let innerRefusal: unknown = null;
    Object.assign(b.store, {
      listSessions: () => {
        innerRefusal = caughtFrom(() => inner());
        throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
      }
    });

    expectRefusal(() => b.store.reconcile([]), 'reconcile');

    expect(isManifestStopped(innerRefusal)).toBe(true);
    expect(stopRecords()).toHaveLength(1);
    expect(stopRecords()[0]!.fields).toMatchObject({ operation: 'listSessions', file: 'fine' });
    expect(stopNotices()).toHaveLength(1);
    expect(connectionOf(b.store).inTransaction).toBe(false);
  });

  it('a fine-file stop met twice by nested calls holds the connection once', async () => {
    vi.resetModules();
    const fresh = await import('../store');
    (await import('../../notice')).takePendingNotices();
    const b = build(3, 0, (path) => new fresh.ManifestStore(path));
    fresh.setManifestFaultHook(oneShot('listSessions', 'SQLITE_CORRUPT'));
    const inner = b.store.listSessions.bind(b.store);
    Object.assign(b.store, {
      listSessions: () => {
        caughtFrom(() => inner());
        throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
      }
    });
    expect(fresh.isManifestStopped(caughtFrom(() => b.store.reconcile([])))).toBe(true);
    expect(fresh.manifestConnectionsLeftOpen()).toBe(1);
    fresh.setManifestFaultHook(null);
  });

  it('the ring’s fingerprint, never asked before: it answers STOPPED_FINGERPRINT, never null, and the store has stopped for every other caller', () => {
    const b = build(3);
    setManifestFaultHook(oneShot('contentFingerprint', 'SQLITE_NOTADB'));
    expect(b.store.contentFingerprint()).toBe(STOPPED_FINGERPRINT);
    expect(b.store.contentFingerprint()).toBe(STOPPED_FINGERPRINT);
    expect(b.store.stoppedReading()).toBe(true);
    expect(stopRecords()[0]!.fields).toMatchObject({
      operation: 'contentFingerprint',
      code: 'SQLITE_NOTADB',
      file: 'fine'
    });
    expectRefusal(() => b.store.listSessions(), 'listSessions');
    expect(stopNotices()).toHaveLength(1);
  });

  it('the fingerprint a stopped store answers is the one it last answered, at every ask, whichever member stopped it (the fix round)', () => {
    const b = build(5);
    const first = b.store.contentFingerprint();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    // A write moves it, so the answer kept is the LAST one, not the first.
    b.store.insertSession(record(9_001));
    const last = b.store.contentFingerprint();
    expect(last).toMatch(/^[0-9a-f]{64}$/);
    expect(last).not.toBe(first);
    setManifestFaultHook(oneShot('listSessions', 'SQLITE_CORRUPT'));
    expectRefusal(() => b.store.listSessions(), 'listSessions');
    expect(stopRecords()[0]!.fields).toMatchObject({ operation: 'listSessions', file: 'fine' });
    expectEveryMemberStoppedBeforeSqlite(b, last!);
  });

  it('diagnostics: describeSchema and schemaState answer their own fallbacks when they meet it', () => {
    const one = build(2);
    setManifestFaultHook(oneShot('describeSchema', 'SQLITE_CORRUPT'));
    expect(one.store.describeSchema()).toBe(STOPPED_SENTENCE);
    expect(stopRecords()[0]!.fields).toMatchObject({ operation: 'describeSchema' });

    resetDurabilityNoticesForTests();
    takePendingNotices();
    recorded.logged.length = 0;
    const two = build(2);
    setManifestFaultHook(oneShot('schemaState', 'SQLITE_CORRUPT'));
    expect(two.store.schemaState()).toEqual(STOPPED_STATE);
    expect(stopRecords()[0]!.fields).toMatchObject({ operation: 'schemaState' });
  });
});

describe('every member passes through the latch under its own name', () => {
  it('MANIFEST_OPERATIONS is frozen, has 48 names, and is the class’s members exactly', () => {
    expect(Object.isFrozen(MANIFEST_OPERATIONS)).toBe(true);
    expect(MANIFEST_OPERATIONS).toHaveLength(48);
    expect(new Set(MANIFEST_OPERATIONS).size).toBe(48);
    const onThePrototype = Object.getOwnPropertyNames(ManifestStore.prototype).filter(
      (name) => !['constructor', 'stoppedReading', 'through', 'quiet', 'latch'].includes(name)
    );
    expect([...onThePrototype].sort()).toEqual([...MANIFEST_OPERATIONS].sort());
    expect(Object.keys(CALLS).sort()).toEqual(
      MANIFEST_OPERATIONS.filter((name) => name !== 'close').sort()
    );

    // The same, at compile time: every public member but the latch's own read
    // is a named operation, and every named operation is a public member.
    type Member = {
      [K in keyof Store]: Store[K] extends (...args: never[]) => unknown ? K : never;
    }[keyof Store];
    type Passing = Exclude<Member, 'stoppedReading'>;
    const exact: [Passing] extends [ManifestOperation]
      ? [ManifestOperation] extends [Passing]
        ? true
        : false
      : false = true;
    expect(exact).toBe(true);
  });

  it('control: the SQLite counter counts, and a healthy call asks the seam once, by its own name', () => {
    const b = build(2);
    const sqliteCalls = countSqliteCalls();
    const asked: ManifestOperation[] = [];
    setManifestFaultHook((operation) => {
      asked.push(operation);
    });
    expect(b.store.listSessions()).toHaveLength(2);
    expect(sqliteCalls()).toBeGreaterThan(0);
    expect(asked).toEqual(['listSessions']);
    for (const name of QUIET) {
      asked.length = 0;
      CALLS[name](b.store, b.live);
      expect(asked).toEqual([name]);
    }
    setManifestFaultHook(null);
    asked.length = 0;
    b.store.listSessions();
    expect(asked).toEqual([]);
    expect(b.store.stoppedReading()).toBe(false);
  });
});
