/**
 * Phase 357 — a session list that goes bad while Tortie runs, as the session
 * core meets it (build/p357/SPEC.md D19, D20, D22).
 *
 * On his Mac 0.114.0's main process threw `database disk image is malformed`
 * from `ManifestStore.listSessions` on every refresh, through
 * `scheduleSessionsBroadcast`'s timer and `broadcastSessions`, with nothing
 * catching it. From this phase the store latches on the first broken
 * connection and refuses every later call before SQLite with one typed
 * refusal, `MANIFEST_STOPPED`. These are the core's halves of that:
 *
 *   - `listSessions` answers the last list that read cleanly (or an empty
 *     list) and never throws the refusal, so a broadcast from a timer cannot
 *     throw; any other error is rethrown unchanged;
 *   - `listProjects` does the same for the project list, because the tray's
 *     blocked feed reads it inside EVERY broadcast: measured here with the
 *     real feed installed, a broadcast after the stop threw `MANIFEST_STOPPED`
 *     out of `listProjects` until it did;
 *   - the five event paths that read or write one row hold the refusal and
 *     rethrow anything else: `handleExternalRename`, `applyDetectedStatus`,
 *     `reapDeadSession`, `handleUnexpectedAttachExit` and the `server-exit`
 *     snapshot chain;
 *   - `manifestStopped()` is a read of the store's latch itself.
 *
 * HOW IT IS DRIVEN. The real bodies are borrowed off `GmuxCore.prototype` and
 * called against small hosts holding only what each body touches, the shape
 * `./session-history-core.test.ts` and `./p344-core-closed-folders.test.ts`
 * set. The store is REAL: a `ManifestStore` over a scratch file, stopped
 * through the store's own harness seam (`setManifestFaultHook`), which throws
 * better-sqlite3's own `SqliteError` class inside the store's `through`, so the
 * refusal every body meets here is the one real damage produces. Nothing here
 * reads a person's manifest, starts tmux or opens a window.
 */

import Database from 'better-sqlite3';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Session, SessionStatus } from '@shared/types';
import { EVT_SESSIONS_CHANGED, EVT_STATUS_CHANGED } from '@shared/ipc';

/** Every event the code under test broadcast, in order. */
const sent: unknown[][] = [];

vi.mock('../../typed-events', () => ({
  broadcastEvent: (...args: unknown[]): void => {
    sent.push(args);
  },
  sendEvent: (): void => undefined
}));

const { GmuxCore } = await import('../core');
const { ManifestStore, isManifestStopped, setManifestFaultHook } = await import(
  '../../manifest/store'
);
const { installBlockedFeed, resetBlockedFeedForTests } = await import('../../tray/blocked-feed');
type Store = InstanceType<typeof ManifestStore>;

/** The real bodies, borrowed. Private members are on the prototype at run time. */
const proto = GmuxCore.prototype as unknown as {
  listSessions(this: unknown): Session[];
  listProjects(this: unknown): Project[];
  broadcastSessions(this: unknown): void;
  scheduleSessionsBroadcast(this: unknown): void;
  manifestStopped(this: unknown): boolean;
  applyDetectedStatus(this: unknown, id: string, status: SessionStatus): void;
  handleExternalRename(this: unknown, tmuxId: string, tmuxName: string): void;
  reapDeadSession(
    this: unknown,
    id: string,
    exitCode: number | undefined,
    signal: string | undefined
  ): Promise<void>;
  handleUnexpectedAttachExit(this: unknown, id: string): Promise<void>;
  wireControlEvents(this: unknown): void;
  snapshotAllSessions(this: unknown, reason?: string): Promise<void>;
};

let dir = '';
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tortie-p357-core-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
  sent.length = 0;
  // The latch writes one error record and posts one notice; neither is what
  // this file is about, and both print to the console.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  setManifestFaultHook(null);
  resetBlockedFeedForTests();
  // A store stopped with its file fine closes nothing, by design (D10). The
  // file goes with the folder all the same; the held connection ends with the
  // test worker.
  store.close();
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** One local session row, the shape every create writes. */
function insert(id: string, status: SessionStatus = 'running'): void {
  store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status,
    createdAt: 1_000,
    argv: ['/bin/zsh'],
    lastSeen: 1_000
  });
}

/**
 * Stop the store the way damage would: the next call of `operation` throws
 * better-sqlite3's own class with SQLite's own code, the store's classifier
 * reads it, and the store latches. Every later call refuses before SQLite.
 */
function stopStore(operation: 'listSessions' | 'getSession' = 'listSessions'): void {
  setManifestFaultHook((op) => {
    if (op === operation) {
      throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
    }
  });
  try {
    if (operation === 'listSessions') store.listSessions();
    else store.getSession('anything');
  } catch (err) {
    expect(isManifestStopped(err)).toBe(true);
  }
  setManifestFaultHook(null);
  expect(store.stoppedReading()).toBe(true);
}

/** A manifest whose every read throws something that is NOT the refusal. */
function brokenOtherwise(message: string): unknown {
  const boom = (): never => {
    throw new Error(message);
  };
  return { listSessions: boom, getSession: boom, setStatus: boom, renameSession: boom };
}

// ---------------------------------------------------------------------------
// D19: the list the window keeps
// ---------------------------------------------------------------------------

describe('listSessions once the store has stopped (D19)', () => {
  it('answers the last list that read cleanly, a copy each time, and does not throw', () => {
    insert('s1');
    insert('s2');
    const host = { manifest: store };
    const clean = proto.listSessions.call(host);
    expect(clean.map((s) => s.id).sort()).toEqual(['s1', 's2']);
    stopStore();
    const first = proto.listSessions.call(host);
    const second = proto.listSessions.call(host);
    expect(first).toEqual(clean);
    expect(second).toEqual(clean);
    // A copy: a caller that edits its answer cannot edit the next caller's.
    expect(first).not.toBe(clean);
    expect(second).not.toBe(first);
    first.length = 0;
    expect(proto.listSessions.call(host).map((s) => s.id).sort()).toEqual(['s1', 's2']);
  });

  it('keeps a copy of the clean answer: a caller that sorts or splices the array it was handed changes nothing a stopped list answers (the fix round)', () => {
    insert('s1');
    insert('s2');
    insert('s3');
    const host = { manifest: store };
    const clean = proto.listSessions.call(host);
    const composed = clean.map((s) => s.id);
    expect([...composed].sort()).toEqual(['s1', 's2', 's3']);
    // The caller edits the very array it was handed, in place, before the stop.
    clean.sort((a, b) => b.id.localeCompare(a.id));
    clean.splice(0, 1);
    clean.push(clean[0]!);
    stopStore();
    // The stopped answer is the list as it was composed, in its own order.
    expect(proto.listSessions.call(host).map((s) => s.id)).toEqual(composed);
  });

  it('answers an empty list when no list ever read cleanly', () => {
    insert('s1');
    stopStore('getSession');
    expect(proto.listSessions.call({ manifest: store })).toEqual([]);
  });

  it('answers an empty list on a host that ran no field initializer', () => {
    // The seam tests borrow this body onto `Object.create` hosts; the field
    // reads undefined there, which must read as "never composed".
    insert('s1');
    stopStore();
    const host = Object.assign(Object.create(GmuxCore.prototype) as object, {
      manifest: store
    });
    expect(proto.listSessions.call(host)).toEqual([]);
  });

  it('keeps answering the list it composed before the stop, never a later one', () => {
    insert('s1');
    const host = { manifest: store };
    proto.listSessions.call(host);
    // A write before the stop is in the next compose; after the stop nothing
    // composes, so the window keeps the last list that read cleanly.
    insert('s2');
    expect(proto.listSessions.call(host).map((s) => s.id).sort()).toEqual(['s1', 's2']);
    stopStore();
    expect(proto.listSessions.call(host).map((s) => s.id).sort()).toEqual(['s1', 's2']);
  });

  it('rethrows any other error unchanged, and the store does not stop for it', () => {
    insert('s1');
    const host = { manifest: store };
    proto.listSessions.call(host);
    // An I/O error is the OS refusing one call, not a broken connection (D2):
    // the store rethrows it unchanged and so does the core, as today.
    setManifestFaultHook((op) => {
      if (op === 'listSessions') throw new Database.SqliteError('disk I/O error', 'SQLITE_IOERR_READ');
    });
    expect(() => proto.listSessions.call(host)).toThrow('disk I/O error');
    setManifestFaultHook(null);
    expect(store.stoppedReading()).toBe(false);
    expect(() => proto.listSessions.call({ manifest: brokenOtherwise('boom') })).toThrow('boom');
  });

  it('a broadcast after the stop sends that list, and the tray hears the same one', () => {
    insert('s1');
    const tray = vi.fn();
    const host = {
      manifest: store,
      listSessions: proto.listSessions,
      onSessionsBroadcast: tray
    };
    const clean = host.listSessions();
    stopStore();
    expect(() => proto.broadcastSessions.call(host)).not.toThrow();
    expect(sent).toEqual([[EVT_SESSIONS_CHANGED, clean]]);
    expect(tray).toHaveBeenCalledWith(clean);
  });

  it('the coalescing timer, his stack, no longer throws out of its callback', () => {
    vi.useFakeTimers();
    try {
      insert('s1');
      const host = {
        manifest: store,
        disposed: false,
        sessionsBroadcastTimer: null as NodeJS.Timeout | null,
        listSessions: proto.listSessions,
        broadcastSessions: proto.broadcastSessions,
        onSessionsBroadcast: null
      };
      host.listSessions();
      stopStore();
      proto.scheduleSessionsBroadcast.call(host);
      // A throw inside the timer's callback would surface here.
      expect(() => vi.runAllTimers()).not.toThrow();
      expect(sent.map((one) => one[0])).toEqual([EVT_SESSIONS_CHANGED]);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// The project list, and the tray's feed inside every broadcast (new: see the
// header of GmuxCore.listProjects)
// ---------------------------------------------------------------------------

describe('listProjects once the store has stopped', () => {
  it('answers the last projects that read cleanly, a copy each time, and does not throw', () => {
    store.upsertProject({ id: 'p-w', path: '/w', name: 'w' });
    const host = { manifest: store };
    const clean = proto.listProjects.call(host);
    expect(clean.map((p) => p.path)).toEqual(['/w']);
    stopStore();
    const first = proto.listProjects.call(host);
    expect(first).toEqual(clean);
    expect(first).not.toBe(clean);
    first.length = 0;
    expect(proto.listProjects.call(host).map((p) => p.path)).toEqual(['/w']);
  });

  it('keeps a copy of the clean projects: a caller that edits the array it was handed changes nothing a stopped list answers (the fix round)', () => {
    store.upsertProject({ id: 'p-a', path: '/a', name: 'a' });
    store.upsertProject({ id: 'p-b', path: '/b', name: 'b' });
    const host = { manifest: store };
    const clean = proto.listProjects.call(host);
    const composed = clean.map((p) => p.path);
    expect([...composed].sort()).toEqual(['/a', '/b']);
    clean.reverse();
    clean.splice(0, 1);
    stopStore();
    expect(proto.listProjects.call(host).map((p) => p.path)).toEqual(composed);
  });

  it('answers an empty list when none ever read cleanly, and rethrows any other error', () => {
    stopStore();
    expect(proto.listProjects.call({ manifest: store })).toEqual([]);
    const boom = { manifest: { listProjects: (): never => { throw new Error('boom'); } } };
    expect(() => proto.listProjects.call(boom)).toThrow('boom');
  });

  it('a broadcast through the REAL tray feed after the stop throws nothing, and the feed hears the last lists', () => {
    // The tray's blocked feed takes the core's one broadcast slot and reads
    // the project list inside EVERY broadcast (../../tray/blocked-feed.ts), so
    // a list that answered while the project list threw would still throw out
    // of the timer that broadcast it.
    store.upsertProject({ id: 'p-w', path: '/w', name: 'w' });
    insert('s1');
    const host = {
      manifest: store,
      onSessionsBroadcast: null as ((s: Session[]) => void) | null,
      listSessions: proto.listSessions,
      listProjects: proto.listProjects
    };
    installBlockedFeed(host);
    stopStore();
    expect(() => proto.broadcastSessions.call(host)).not.toThrow();
    expect(sent.map((one) => one[0])).toEqual([EVT_SESSIONS_CHANGED]);
    expect((sent[0]?.[1] as Session[]).map((one) => one.id)).toEqual(['s1']);
  });
});

// ---------------------------------------------------------------------------
// D22's core half: the latch, read
// ---------------------------------------------------------------------------

describe('manifestStopped (D22)', () => {
  it('reads the store latch, false before and true after, whichever call latched it', () => {
    insert('s1');
    const host = { manifest: store };
    expect(proto.manifestStopped.call(host)).toBe(false);
    stopStore('getSession');
    expect(proto.manifestStopped.call(host)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D20: the five event paths
// ---------------------------------------------------------------------------

describe('the event paths hold the refusal and rethrow anything else (D20)', () => {
  it('applyDetectedStatus writes no flip on a stopped list, and still writes one on a healthy list', () => {
    insert('s1', 'running');
    const schedule = vi.fn();
    const host = { manifest: store, scheduleSessionsBroadcast: schedule };
    // The control: today's behaviour, unchanged.
    proto.applyDetectedStatus.call(host, 's1', 'idle');
    expect(store.getSession('s1')?.status).toBe('idle');
    expect(sent).toEqual([[EVT_STATUS_CHANGED, 's1', 'idle']]);
    expect(schedule).toHaveBeenCalledTimes(1);
    sent.length = 0;
    stopStore();
    expect(() => proto.applyDetectedStatus.call(host, 's1', 'running')).not.toThrow();
    expect(sent).toEqual([]);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(() =>
      proto.applyDetectedStatus.call(
        { manifest: brokenOtherwise('boom'), scheduleSessionsBroadcast: schedule },
        's1',
        'idle'
      )
    ).toThrow('boom');
  });

  it('handleExternalRename records nothing on a stopped list, throws nothing, and still records on a healthy one', () => {
    insert('s1');
    const broadcastSessions = vi.fn();
    const host = {
      manifest: store,
      byTmuxId: new Map([['$1', 's1']]),
      broadcastSessions
    };
    proto.handleExternalRename.call(host, '$1', 'renamed-outside');
    expect(store.getSession('s1')?.name).toBe('renamed-outside');
    expect(broadcastSessions).toHaveBeenCalledTimes(1);
    stopStore();
    // At the parent this throw escaped the control client's line loop (2 of 2
    // renames measured), which also dropped the rest of that chunk's lines.
    expect(() => proto.handleExternalRename.call(host, '$1', 'renamed-again')).not.toThrow();
    expect(broadcastSessions).toHaveBeenCalledTimes(1);
    expect(() =>
      proto.handleExternalRename.call(
        { manifest: brokenOtherwise('boom'), byTmuxId: host.byTmuxId, broadcastSessions },
        '$1',
        'x'
      )
    ).toThrow('boom');
  });

  it('reapDeadSession resolves on a stopped list without touching the session, and rejects anything else', async () => {
    insert('s1');
    stopStore();
    const detach = vi.fn();
    const host = {
      manifest: store,
      attachHost: { detach },
      liveIds: new Map<string, string>(),
      byTmuxId: new Map<string, string>()
    };
    await expect(proto.reapDeadSession.call(host, 's1', 1, undefined)).resolves.toBeUndefined();
    expect(detach).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
    await expect(
      proto.reapDeadSession.call({ ...host, manifest: brokenOtherwise('boom') }, 's1', 1, undefined)
    ).rejects.toThrow('boom');
  });

  it('handleUnexpectedAttachExit resolves on a stopped list without a refresh, and rejects anything else', async () => {
    insert('s1');
    const scheduleRefresh = vi.fn();
    const host = { manifest: store, liveIds: new Map<string, string>(), scheduleRefresh };
    // The control: an unbound live row is handed to the refresh, as today.
    await proto.handleUnexpectedAttachExit.call(host, 's1');
    expect(scheduleRefresh).toHaveBeenCalledTimes(1);
    stopStore();
    await expect(proto.handleUnexpectedAttachExit.call(host, 's1')).resolves.toBeUndefined();
    expect(scheduleRefresh).toHaveBeenCalledTimes(1);
    await expect(
      proto.handleUnexpectedAttachExit.call({ ...host, manifest: brokenOtherwise('boom') }, 's1')
    ).rejects.toThrow('boom');
  });

  it('the server-exit snapshot pass refused by a stopped list is held, and the refresh still runs', async () => {
    insert('s1');
    stopStore();
    const scheduleRefresh = vi.fn();
    const host = {
      control: new EventEmitter(),
      // The REAL pass, over the stopped store, so the refusal is the one its
      // first line, a list of every row, really meets.
      quitDeps: { manifest: store, liveIds: new Map<string, string>(), ringSchedule: () => null },
      snapshotAllSessions: proto.snapshotAllSessions,
      scheduleRefresh,
      handleExternalRename: vi.fn()
    };
    proto.wireControlEvents.call(host);
    host.control.emit('server-exit');
    // Two turns of the microtask queue settle the catch and the finally. An
    // unhandled rejection here fails the run.
    await new Promise((resolve) => setImmediate(resolve));
    expect(scheduleRefresh).toHaveBeenCalledTimes(1);
  });

  it('a server-exit pass that fails for any other reason still rejects, after the refresh', async () => {
    // Every promise the chain makes is a Tracked, so the LAST one, which the
    // handler leaves unhandled by design, can be observed rather than left to
    // fail the run.
    const made: Promise<unknown>[] = [];
    class Tracked<T> extends Promise<T> {
      constructor(
        executor: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
      ) {
        super(executor);
        made.push(this);
      }
    }
    const scheduleRefresh = vi.fn();
    const host = {
      control: new EventEmitter(),
      snapshotAllSessions: (): Promise<void> => Tracked.reject(new Error('boom')) as Promise<void>,
      scheduleRefresh,
      handleExternalRename: vi.fn()
    };
    proto.wireControlEvents.call(host);
    host.control.emit('server-exit');
    const last = made[made.length - 1];
    expect(last).toBeDefined();
    const reason = await (last as Promise<unknown>).then(
      () => null,
      (err: unknown) => err
    );
    expect(reason).toBeInstanceOf(Error);
    expect((reason as Error).message).toBe('boom');
    expect(scheduleRefresh).toHaveBeenCalledTimes(1);
  });
});
