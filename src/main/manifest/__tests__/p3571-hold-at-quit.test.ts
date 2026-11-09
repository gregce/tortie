/**
 * Phase 357.1 — the session list is never closed at the quit
 * (build/p3571/SPEC.md D1, D3; research 143 §2.3).
 *
 * A page cache can be damaged in a way no read sees: research 143 planted the
 * crash's own state and every read went on answering while the close crashed
 * in `pcache1EnforceMaxPage`, his frame. So the quit holds every session list
 * connection open (`holdManifestClosesAtQuit`, set once on the ordered
 * disposer's first lines) and the process ends at `will-quit` without a close.
 * This file drives the SHIPPING `ManifestStore` over scratch manifests, through
 * the hold, in every latch state:
 *
 *   1. BEFORE the quit, `close` is the close it always was: a healthy store
 *      closes (its `-wal` and `-shm` go with the last close), a stopped store
 *      whose file is damaged or unreadable closes, and only a stopped store
 *      whose file is fine holds, counted once (Phase 357's D10 and D11).
 *   2. AT the quit, `close` holds EVERY connection: no `Database#close` call,
 *      the connection still open, its `-wal` and `-shm` still on disk, counted
 *      once each however many times the quit asks, and said once in app.log.
 *   3. A hard exit after the hold loses nothing: the files the held connection
 *      leaves on disk, copied byte for byte while it is still open (which is
 *      what a SIGKILL leaves, because nothing is written after the hold), open
 *      through the shipping store and its integrity gate with every row, the
 *      rows only the write ahead log held among them.
 *
 * Every store comes from a FRESH store module (`vi.resetModules`), because the
 * hold is module state that only the process's end clears: a module imported
 * here is a launch. Every database is under a scratch directory this file made
 * and removed, and every connection a test opened is closed after it (none of
 * these caches is damaged, so closing them here is safe).
 */

import Database from 'better-sqlite3';
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  statSync,
  writeSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestOperation, ManifestSessionRecord, ManifestStore as Store } from '../store';

interface Logged {
  scope: string;
  level: string;
  event?: string;
  msg: string;
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

// The log is captured, not written.
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const scoped = (scope: string) => {
    const at =
      (level: string) =>
      (msg: string): void => {
        recorded.logged.push({ scope, level, msg });
      };
    return { error: at('error'), warn: at('warn'), info: at('info'), debug: at('debug') };
  };
  return {
    ...real,
    getLog: scoped,
    logEvent: (scope: string, level: string, event: string, msg: string): void => {
      recorded.logged.push({ scope, level, event, msg });
    }
  };
});

type StoreModule = typeof import('../store');

/** The two lines `close` may say when it holds, and nothing else. */
const QUIT_LINE = 'the session list connection is left open at quit, so no close walks its cache';
const STOPPED_LINE = 'the session list connection is left open so nothing closes a damaged cache';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const dirs: string[] = [];
const connections: Database.Database[] = [];
const lockedFiles: string[] = [];

function scratchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gmux-p3571-hold-'));
  dirs.push(dir);
  return dir;
}

/** A store module as a launch has it: no hold, nothing held. */
async function freshModule(): Promise<StoreModule> {
  vi.resetModules();
  const mod = await import('../store');
  // A renderer is listening, so a notice goes out through the broadcast.
  (await import('../../notice')).takePendingNotices();
  expect(mod.manifestConnectionsLeftOpen()).toBe(0);
  return mod;
}

function record(i: number): ManifestSessionRecord {
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
    argv: ['/usr/local/bin/claude', '--session-id', id]
  };
}

interface Built {
  dbPath: string;
  store: Store;
  /** The newest row's id. */
  live: string;
}

/** The shipping store over a scratch file, `rows` sessions written and read once. */
function build(mod: StoreModule, rows: number): Built {
  const dbPath = join(scratchDir(), 'manifest.db');
  const store = new mod.ManifestStore(dbPath);
  connections.push(connectionOf(store));
  for (let i = 0; i < rows; i++) store.insertSession(record(i));
  store.upsertProject({ id: 'p1', path: '/p/0', name: 'p0' });
  expect(store.listSessions()).toHaveLength(rows);
  return { dbPath, store, live: record(rows - 1).id };
}

function connectionOf(store: Store): Database.Database {
  return (store as unknown as { db: Database.Database }).db;
}

/** A harness hook that throws SQLite's own error once, at one operation. */
function oneShot(operation: ManifestOperation): (asked: ManifestOperation) => void {
  let armed = true;
  return (asked) => {
    if (!armed || asked !== operation) return;
    armed = false;
    throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
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

/** Stop the store through the seam while its file stays fine (the memory-shaped case). */
function stopWithFileFine(mod: StoreModule, b: Built): void {
  mod.setManifestFaultHook(oneShot('listSessions'));
  expect(mod.isManifestStopped(caughtFrom(() => b.store.listSessions()))).toBe(true);
  mod.setManifestFaultHook(null);
  expect(b.store.stoppedReading()).toBe(true);
}

/** Stop the store through the seam while the check cannot read its file. */
function stopWithFileUnreadable(mod: StoreModule, b: Built): void {
  chmodSync(b.dbPath, 0o000);
  lockedFiles.push(b.dbPath);
  mod.setManifestFaultHook(oneShot('getSession'));
  expect(mod.isManifestStopped(caughtFrom(() => b.store.getSession(b.live)))).toBe(true);
  mod.setManifestFaultHook(null);
  chmodSync(b.dbPath, 0o644);
  expect(b.store.stoppedReading()).toBe(true);
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

/**
 * Stop the store on REAL damage (Phase 357's M1, row K1): a second connection
 * checkpoints, a sessions leaf's type byte is written over and proved changed,
 * and the live connection reads it from disk again.
 */
function stopWithFileDamaged(mod: StoreModule, b: Built): void {
  const w = new Database(b.dbPath);
  connections.push(w);
  const [result] = w.pragma('wal_checkpoint(TRUNCATE)') as { busy: number }[];
  expect(result?.busy).toBe(0);
  const pageSize = w.pragma('page_size', { simple: true }) as number;
  const leaf = w
    .prepare<[], { pageno: number }>(
      "SELECT pageno FROM dbstat WHERE name = 'sessions' AND pagetype = 'leaf' ORDER BY pageno"
    )
    .get();
  expect(leaf?.pageno).toBeGreaterThan(1);
  const offset = (leaf!.pageno - 1) * pageSize;
  const before = readAt(b.dbPath, offset, 1);
  const fd = openSync(b.dbPath, 'r+');
  try {
    writeSync(fd, Buffer.from([0x00]), 0, 1, offset);
  } finally {
    closeSync(fd);
  }
  expect(readAt(b.dbPath, offset, 1).equals(before)).toBe(false);
  connectionOf(b.store).pragma('shrink_memory');
  expect(mod.isManifestStopped(caughtFrom(() => b.store.listSessions()))).toBe(true);
  expect(b.store.stoppedReading()).toBe(true);
}

/** The lines `close` said when it held. */
function holdLines(): string[] {
  return recorded.logged
    .filter((l) => l.scope === 'manifest' && l.level === 'info' && l.msg.startsWith('the session list connection is left open'))
    .map((l) => l.msg);
}

function stopFileVerdict(): unknown {
  return (recorded.sent.find((s) => (s.payload as { kind?: unknown }).kind === 'manifest-stopped')?.payload as {
    fileFine?: unknown;
  })?.fileFine;
}

beforeEach(() => {
  recorded.sent.length = 0;
  recorded.logged.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const path of lockedFiles.splice(0)) {
    try {
      chmodSync(path, 0o644);
    } catch {
      /* already gone */
    }
  }
  for (const db of connections.splice(0)) {
    if (db.open) db.close();
  }
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. Before the quit: the close it always was
// ---------------------------------------------------------------------------

describe('before the quit, close() is the close it always was', () => {
  it('a store that never stopped closes, and its -wal and -shm go with the last close', async () => {
    const mod = await freshModule();
    const b = build(mod, 5);
    expect(existsSync(`${b.dbPath}-wal`)).toBe(true);
    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
    expect(existsSync(`${b.dbPath}-wal`)).toBe(false);
    expect(existsSync(`${b.dbPath}-shm`)).toBe(false);
    expect(mod.manifestConnectionsLeftOpen()).toBe(0);
    expect(holdLines()).toEqual([]);
  });

  it('a store stopped with its file damaged closes (357’s D11, unchanged)', { timeout: 60_000 }, async () => {
    const mod = await freshModule();
    const b = build(mod, 200);
    stopWithFileDamaged(mod, b);
    expect(stopFileVerdict()).toBe(false);
    expect(mod.manifestConnectionsLeftOpen()).toBe(0);
    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
    expect(mod.manifestConnectionsLeftOpen()).toBe(0);
  });

  it('a store stopped with its file unreadable closes (unchanged)', async () => {
    const mod = await freshModule();
    const b = build(mod, 5);
    stopWithFileUnreadable(mod, b);
    expect(stopFileVerdict()).toBe(null);
    b.store.close();
    expect(connectionOf(b.store).open).toBe(false);
    expect(mod.manifestConnectionsLeftOpen()).toBe(0);
  });

  it('a store stopped with its file fine holds, once, and says so once (357’s D10, unchanged)', async () => {
    const mod = await freshModule();
    const b = build(mod, 5);
    stopWithFileFine(mod, b);
    expect(stopFileVerdict()).toBe(true);
    // The latch holds it the moment it stops.
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
    b.store.close();
    b.store.close();
    expect(connectionOf(b.store).open).toBe(true);
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
    expect(holdLines()).toEqual([STOPPED_LINE]);
  });
});

// ---------------------------------------------------------------------------
// 2. At the quit: every close holds
// ---------------------------------------------------------------------------

describe('at the quit, close() holds every connection open (D1)', () => {
  it('a store that never stopped: no Database#close, still open, -wal and -shm on disk, counted and said once', async () => {
    const mod = await freshModule();
    const b = build(mod, 5);
    const walBefore = statSync(`${b.dbPath}-wal`).size;
    expect(walBefore).toBeGreaterThan(0);
    const closes = vi.spyOn(Database.prototype, 'close');

    mod.holdManifestClosesAtQuit();
    b.store.close();

    expect(closes).not.toHaveBeenCalled();
    expect(connectionOf(b.store).open).toBe(true);
    expect(existsSync(`${b.dbPath}-wal`)).toBe(true);
    expect(existsSync(`${b.dbPath}-shm`)).toBe(true);
    // Nothing was checkpointed: the close ran no SQL at all.
    expect(statSync(`${b.dbPath}-wal`).size).toBe(walBefore);
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
    expect(holdLines()).toEqual([QUIT_LINE]);

    // However many times the quit asks: one connection, one line.
    b.store.close();
    b.store.close();
    expect(closes).not.toHaveBeenCalled();
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
    expect(holdLines()).toEqual([QUIT_LINE]);
  });

  it('the hold does not touch a store until it is asked to close', async () => {
    const mod = await freshModule();
    const b = build(mod, 3);
    mod.holdManifestClosesAtQuit();
    expect(mod.manifestConnectionsLeftOpen()).toBe(0);
    // The store still answers: holding is about the close, not the reads.
    expect(b.store.listSessions()).toHaveLength(3);
    b.store.close();
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
  });

  it('a store stopped with its file fine is still counted once, not twice', async () => {
    const mod = await freshModule();
    const b = build(mod, 5);
    stopWithFileFine(mod, b);
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
    mod.holdManifestClosesAtQuit();
    b.store.close();
    b.store.close();
    expect(connectionOf(b.store).open).toBe(true);
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
    expect(holdLines()).toEqual([STOPPED_LINE]);
  });

  it('a store stopped with its file damaged is held too, because the quit holds every close', { timeout: 60_000 }, async () => {
    const mod = await freshModule();
    const b = build(mod, 200);
    stopWithFileDamaged(mod, b);
    expect(mod.manifestConnectionsLeftOpen()).toBe(0);
    mod.holdManifestClosesAtQuit();
    b.store.close();
    expect(connectionOf(b.store).open).toBe(true);
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
    expect(holdLines()).toEqual([STOPPED_LINE]);
  });

  it('a store stopped with its file unreadable is held too', async () => {
    const mod = await freshModule();
    const b = build(mod, 5);
    stopWithFileUnreadable(mod, b);
    mod.holdManifestClosesAtQuit();
    b.store.close();
    expect(connectionOf(b.store).open).toBe(true);
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
  });

  it('two stores at the quit: two connections held, one line each', async () => {
    const mod = await freshModule();
    const one = build(mod, 2);
    const two = build(mod, 2);
    mod.holdManifestClosesAtQuit();
    one.store.close();
    two.store.close();
    one.store.close();
    expect(connectionOf(one.store).open).toBe(true);
    expect(connectionOf(two.store).open).toBe(true);
    expect(mod.manifestConnectionsLeftOpen()).toBe(2);
    expect(holdLines()).toEqual([QUIT_LINE, QUIT_LINE]);
  });

  it('a connection closed before the hold has nothing to hold when the quit asks again', async () => {
    const mod = await freshModule();
    const early = build(mod, 2);
    early.store.close();
    expect(connectionOf(early.store).open).toBe(false);
    mod.holdManifestClosesAtQuit();
    // The double close the core's dispose already tolerates: nothing is open,
    // so nothing is counted and nothing is said.
    early.store.close();
    expect(mod.manifestConnectionsLeftOpen()).toBe(0);
    expect(holdLines()).toEqual([]);
    const late = build(mod, 2);
    late.store.close();
    expect(connectionOf(late.store).open).toBe(true);
    expect(mod.manifestConnectionsLeftOpen()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. A hard exit after the hold loses nothing
// ---------------------------------------------------------------------------

describe('a hard exit after the hold loses nothing (SPEC §0.1 item 3, research 143 §6)', () => {
  it('the files the held connection leaves open through the gate with every row, the WAL’s own rows included', async () => {
    const mod = await freshModule();
    const b = build(mod, 40);
    // A write after the last read, so the newest rows live in the WAL alone.
    b.store.setStatus(b.live, 'idle');
    const live = b.store.listSessions();
    expect(live).toHaveLength(40);

    mod.holdManifestClosesAtQuit();
    b.store.close();
    expect(connectionOf(b.store).open).toBe(true);
    expect(statSync(`${b.dbPath}-wal`).size).toBeGreaterThan(0);

    // What a SIGKILL leaves: the three files as they are, with nothing written
    // after the hold. Copied byte for byte while the connection is still open.
    const after = join(scratchDir(), 'after-the-quit');
    mkdirSync(after);
    for (const suffix of ['', '-wal', '-shm']) {
      copyFileSync(`${b.dbPath}${suffix}`, join(after, `manifest.db${suffix}`));
    }

    // Control: the main file alone is missing rows, so the WAL really held them
    // and the replay below is what brings them back.
    const mainOnly = join(scratchDir(), 'main-only');
    mkdirSync(mainOnly);
    copyFileSync(b.dbPath, join(mainOnly, 'manifest.db'));
    const bare = new Database(join(mainOnly, 'manifest.db'));
    connections.push(bare);
    const bareCount = (() => {
      try {
        return (bare.prepare('SELECT COUNT(*) AS c FROM sessions').get() as { c: number }).c;
      } catch {
        return 0; // the main file does not even hold the table yet
      }
    })();
    expect(bareCount).toBeLessThan(40);

    // The next launch: the shipping store, its integrity gate first.
    recorded.sent.length = 0;
    const next = await freshModule();
    const reopened = new next.ManifestStore(join(after, 'manifest.db'));
    connections.push(connectionOf(reopened));
    expect(reopened.listSessions()).toEqual(live);
    expect(reopened.getSession(b.live)?.status).toBe('idle');
    expect(reopened.listProjects().map((p) => p.path)).toEqual(['/p/0']);
    // The gate found nothing to quarantine and nothing to say.
    expect(recorded.sent).toEqual([]);
    expect(reopened.stoppedReading()).toBe(false);
  });
});
