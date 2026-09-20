/**
 * Phase 293. The two refusals main makes for itself, `endRefusal` and
 * `removeRefusal`, and the two places ../core.ts asks them.
 *
 * WHAT WAS WRONG AT THE PARENT, and both halves are driven below rather than
 * described:
 *
 *  - `killSessionAdmitted` had no status gate. An End that landed on a row
 *    another window had just removed wrote `exited` over `discarded` while
 *    `removed_at` stayed set. The row left Past Sessions and came back under the
 *    managed list with its saved output already deleted.
 *  - `removeSession` had no status gate on its local path. A Remove that landed
 *    on a row that had turned live tombstoned it and killed nothing, so the
 *    process ran on with no row pointing at it.
 *
 * THREE INSTRUMENTS.
 *
 * The first is the pure table, over `SESSION_STATUSES` itself, so a status
 * added to the alphabet meets a decision here rather than a default.
 *
 * The second and third take the real bodies off `GmuxCore.prototype` and run
 * them against a small object holding what each body touches, with a REAL
 * `ManifestStore` on disk behind it, read back through a SECOND handle. That is
 * the shape ./remote-lifecycle.test.ts gives its reasons for: booting a core
 * needs a session server, an attach host and a control client, so a functional
 * boot would prove the mocks rather than the method.
 *
 * The machine layer's memory half is stubbed for one reason only, which is to
 * prove ORDER: the end refusal runs ABOVE the remote branch, so a removed row
 * that some feed map still holds reaches no machine at all.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_STATUSES, type SessionStatus } from '@shared/types';
import { LOCAL_MACHINE_ID } from '@shared/workspace-target';

/** Ids the stubbed feed claims to hold, and everything sent towards a machine. */
const feedRows = new Set<string>();
let remoteCalls: string[] = [];

vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-sessions')
  >();
  return {
    ...actual,
    isRemoteSessionId: (id: string): boolean => feedRows.has(id),
    remoteSessionRow: (): null => null,
    forgetRemoteRow: (id: string): boolean => feedRows.delete(id),
    remoteKill: (id: string): Promise<void> => {
      remoteCalls.push(`remoteKill:${id}`);
      return Promise.resolve();
    }
  };
});

vi.mock('../../machines/remote-capsule', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-capsule')
  >();
  return {
    ...actual,
    captureRemoteSessionNow: (id: string): Promise<boolean> => {
      remoteCalls.push(`capture:${id}`);
      return Promise.resolve(true);
    }
  };
});

// The kill's last act is a push to every window, and there is no Electron here.
vi.mock('../../typed-events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../typed-events')>();
  return { ...actual, broadcastEvent: (): void => undefined };
});

const { GmuxCore } = await import('../core');
const { ManifestStore } = await import('../../manifest/store');
const { LOCAL_MACHINE_ROW } = await import('../../manifest/codecs');
const { setRemoteManifest } = await import('../../machines/remote-record');
const { gmuxErrorPayloadOf } = await import('../../errors');
const { endRefusal, removeRefusal } = await import('../lifecycle-gate');
import type { ManifestSessionRecord } from '../../manifest/store';

// The sentences, byte for byte. The renderer draws them verbatim, so they are
// pinned as text here and not read back out of the module under test.
const END_REMOVED =
  'This session was removed, so there is nothing to end. Nothing was changed.';
const REMOVE_LIVE =
  'This session is still running, so it was not removed. End it first.';
const REMOVE_UNKNOWN =
  'Tortie cannot see whether this session is running, so it was not removed.';

// ---------------------------------------------------------------------------
// Instrument one: the table
// ---------------------------------------------------------------------------

describe('endRefusal', () => {
  it('refuses a removed row with its sentence', () => {
    expect(endRefusal({ status: 'discarded' })).toBe(END_REMOVED);
  });

  it.each(SESSION_STATUSES.filter((s) => s !== 'discarded'))(
    'passes %s',
    (status) => {
      expect(endRefusal({ status })).toBeNull();
    }
  );

  it('passes no record at all, which is a row only a machine’s feed holds', () => {
    expect(endRefusal(undefined)).toBeNull();
  });
});

describe('removeRefusal', () => {
  const EXPECTED: Record<SessionStatus, string | null> = {
    running: REMOVE_LIVE,
    idle: REMOVE_LIVE,
    needs_input: REMOVE_LIVE,
    unknown: REMOVE_UNKNOWN,
    exited: null,
    restorable: null,
    // Removing a removed row is what it always was. Nothing offers it.
    discarded: null
  };

  it('has an answer for every status in the alphabet', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...SESSION_STATUSES].sort());
  });

  it.each(SESSION_STATUSES)(
    'a row on this Mac reading %s, with the machine written out',
    (status) => {
      expect(removeRefusal({ status, machineId: LOCAL_MACHINE_ROW })).toBe(
        EXPECTED[status]
      );
    }
  );

  it.each(SESSION_STATUSES)(
    'a row on this Mac reading %s, written before machines existed',
    (status) => {
      expect(removeRefusal({ status })).toBe(EXPECTED[status]);
    }
  );

  it.each(SESSION_STATUSES)(
    'a row on another machine reading %s passes, because its column is not the truth',
    (status) => {
      expect(removeRefusal({ status, machineId: 'm1' })).toBeNull();
    }
  );

  it('reads “this Mac” the way the manifest writes it', () => {
    // The gate imports the shared leaf so it stays pure, and the manifest
    // writes its own copy of the same five characters. If they ever part, a
    // local row would read as remote here and every refusal above would pass.
    expect(LOCAL_MACHINE_ROW).toBe(LOCAL_MACHINE_ID);
  });
});

// ---------------------------------------------------------------------------
// The real store, and the borrowed bodies
// ---------------------------------------------------------------------------

const killSessionAdmitted = (
  GmuxCore.prototype as unknown as {
    killSessionAdmitted: (this: unknown, sessionId: string) => Promise<void>;
  }
).killSessionAdmitted;

const removeSession = (
  GmuxCore.prototype as unknown as {
    removeSession: (this: unknown, sessionId: string) => void;
  }
).removeSession;

/** The real lookup too, so “Session not found.” is the product’s own. */
const mustGetSession = (
  GmuxCore.prototype as unknown as {
    mustGetSession: (this: unknown, sessionId: string) => ManifestSessionRecord;
  }
).mustGetSession;

let dir: string;
let dbPath: string;
let store: InstanceType<typeof ManifestStore>;
/** Everything a borrowed body asked the core itself to do, in order. */
let calls: string[];
/** How many times a harvest watch on the row was cancelled. */
let watchCancels: number;

function host(): unknown {
  return {
    manifest: store,
    idCaptureWatches: new Map<string, { cancel: () => void }>([
      ['watched', { cancel: (): void => void (watchCancels += 1) }]
    ]),
    // No live binding, so the kill never reaches the session server: a row
    // with nothing bound still ends, which is what ../core.ts says it does.
    liveIds: new Map<string, string>(),
    byTmuxId: new Map<string, string>(),
    attachHost: {
      detach: (id: string): void => void calls.push(`detach:${id}`)
    },
    activity: { forget: (): void => undefined },
    resumeInPlace: { forget: (): void => undefined },
    hookServer: { revoke: (): void => undefined },
    queueCaptureSync: (): void => void calls.push('sync'),
    releaseSessionResources: (id: string): void =>
      void calls.push(`release:${id}`),
    broadcastSessions: (): void => void calls.push('broadcast'),
    mustGetSession
  };
}

function row(over: Partial<ManifestSessionRecord>): ManifestSessionRecord {
  return store.insertSession({
    id: 'seed',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'shell',
    status: 'exited',
    createdAt: 1,
    argv: ['/bin/zsh', '-l'],
    lastSeen: 1,
    ...over
  } as ManifestSessionRecord);
}

/**
 * A removal a minute old. It has to be RECENT: opening the second handle below
 * prunes tombstones past their 90 days, so a small literal here reads back as
 * no row at all and the assertion would be about the prune.
 */
const REMOVED_AT = Date.now() - 60_000;

/** What the DISK says, through a handle opened after the write. */
function onDisk(
  sessionId: string
): { status: SessionStatus; removedAt: number | undefined } | null {
  const second = new ManifestStore(dbPath);
  try {
    const rec = second.getSession(sessionId);
    return rec === undefined
      ? null
      : { status: rec.status, removedAt: rec.removedAt };
  } finally {
    second.close();
  }
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  return null;
}

function thrownBy(run: () => void): unknown {
  try {
    run();
  } catch (err) {
    return err;
  }
  return null;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tortie-p293-gate-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
  setRemoteManifest(store);
  feedRows.clear();
  remoteCalls = [];
  calls = [];
  watchCancels = 0;
});

afterEach(() => {
  setRemoteManifest(null);
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Instrument two: End
// ---------------------------------------------------------------------------

describe('ending a row another window has just removed', () => {
  it('keeps the tombstone: still discarded, removed_at untouched, and main says why', async () => {
    row({ id: 'gone-1' });
    store.markSessionRemoved('gone-1', REMOVED_AT);

    const err = await rejectionOf(killSessionAdmitted.call(host(), 'gone-1'));

    // RED AT THE PARENT, where the kill resolved and this read `exited`.
    expect(onDisk('gone-1')).toEqual({
      status: 'discarded',
      removedAt: REMOVED_AT
    });
    expect(gmuxErrorPayloadOf(err)).toMatchObject({
      code: 'INVALID_INPUT',
      message: END_REMOVED,
      detail: 'gone-1'
    });
    // Nothing else moved either. No surface was told a session ended.
    expect(calls).toEqual([]);
  });

  it('asks FIRST, above the remote branch, so a removed row some feed still holds reaches no machine', async () => {
    row({ id: 'gone-remote', machineId: 'm1', status: 'running' });
    store.markSessionRemoved('gone-remote', REMOVED_AT);
    feedRows.add('gone-remote');

    const err = await rejectionOf(
      killSessionAdmitted.call(host(), 'gone-remote')
    );

    expect(gmuxErrorPayloadOf(err)?.message).toBe(END_REMOVED);
    expect(remoteCalls).toEqual([]);
    expect(calls).toEqual([]);
    expect(onDisk('gone-remote')).toEqual({
      status: 'discarded',
      removedAt: REMOVED_AT
    });
  });

  it('still ends a row that was not removed', async () => {
    row({ id: 'live-1', status: 'idle' });

    await killSessionAdmitted.call(host(), 'live-1');

    expect(onDisk('live-1')?.status).toBe('exited');
    expect(calls).toEqual(['detach:live-1', 'sync', 'broadcast']);
  });

  it('still ends a restorable row, which the durability harness does on purpose', async () => {
    row({ id: 'saved-1', status: 'restorable' });

    await killSessionAdmitted.call(host(), 'saved-1');

    expect(onDisk('saved-1')?.status).toBe('exited');
  });

  it('passes a row only a machine’s feed holds, which has no record to ask', async () => {
    feedRows.add('legacy-1');

    await killSessionAdmitted.call(host(), 'legacy-1');

    expect(remoteCalls).toEqual(['capture:legacy-1', 'remoteKill:legacy-1']);
  });

  it('an id nothing holds is refused in the verb’s own words, not the gate’s', async () => {
    const err = await rejectionOf(killSessionAdmitted.call(host(), 'nobody'));
    expect(gmuxErrorPayloadOf(err)).toMatchObject({
      code: 'SESSION_NOT_FOUND',
      message: 'Session not found.'
    });
  });
});

// ---------------------------------------------------------------------------
// Instrument three: Remove
// ---------------------------------------------------------------------------

describe('removing a row on this Mac that has turned live', () => {
  it.each(['running', 'idle', 'needs_input'] as const)(
    'a %s row is NOT tombstoned and keeps its status',
    (status) => {
      row({ id: 'watched', status });

      const err = thrownBy(() => removeSession.call(host(), 'watched'));

      // RED AT THE PARENT, where this read `discarded` with a process behind it.
      expect(onDisk('watched')).toEqual({ status, removedAt: undefined });
      expect(gmuxErrorPayloadOf(err)).toMatchObject({
        code: 'INVALID_INPUT',
        message: REMOVE_LIVE,
        detail: 'watched'
      });
      // Asked directly after the lookup: the saved output is still there and
      // the harvest watch on a session that is still running is still running.
      expect(calls).toEqual([]);
      expect(watchCancels).toBe(0);
    }
  );

  it('a row Tortie cannot see is NOT tombstoned either, and says so differently', () => {
    row({ id: 'watched', status: 'unknown' });

    const err = thrownBy(() => removeSession.call(host(), 'watched'));

    expect(onDisk('watched')).toEqual({
      status: 'unknown',
      removedAt: undefined
    });
    expect(gmuxErrorPayloadOf(err)?.message).toBe(REMOVE_UNKNOWN);
    expect(calls).toEqual([]);
    expect(watchCancels).toBe(0);
  });

  it.each(['exited', 'restorable'] as const)(
    'a %s row is removed exactly as it always was',
    (status) => {
      row({ id: 'watched', status });

      removeSession.call(host(), 'watched');

      expect(onDisk('watched')?.status).toBe('discarded');
      expect(onDisk('watched')?.removedAt).toBeTypeOf('number');
      expect(calls).toEqual(['release:watched']);
      expect(watchCancels).toBe(1);
    }
  );
});

describe('removing a row on another machine', () => {
  it.each(SESSION_STATUSES.filter((s) => s !== 'discarded'))(
    'a record reading %s is tombstoned, because nothing here can see that machine’s truth',
    (status) => {
      row({ id: 'remote-1', machineId: 'm1', status });
      feedRows.add('remote-1');

      removeSession.call(host(), 'remote-1');

      expect(onDisk('remote-1')?.status).toBe('discarded');
      // The Phase 84 order, unchanged: the durable half, then the memory half.
      expect(calls).toEqual(['release:remote-1', 'broadcast']);
      expect(feedRows.has('remote-1')).toBe(false);
    }
  );
});

// ---------------------------------------------------------------------------
// The one harness line that moves with `endRefusal`
// ---------------------------------------------------------------------------

describe('the smoke-keeper cleanup in the durability harness', () => {
  // Source shape, because that loop runs inside a booted Electron and nowhere
  // else. It reads `listSessionRecords()`, which includes tombstones, and its
  // kill is UNCAUGHT on purpose. So a leftover tombstone named smoke-keeper
  // would now abort `smoke:t1` at its first step unless the condition skips it.
  const src = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'harness',
      'durability.ts'
    ),
    'utf8'
  );
  const start = src.indexOf('for (const rec of core.listSessionRecords())');
  const loop = src.slice(start, src.indexOf('core.discardSession(rec.id)', start));

  it('never asks main to end a removed row', () => {
    expect(start).toBeGreaterThan(-1);
    const kill = loop.indexOf('await core.killSession(rec.id)');
    expect(kill).toBeGreaterThan(-1);
    const condition = loop.slice(0, kill);
    expect(condition).toContain("rec.status !== 'discarded'");
    expect(condition).toContain("rec.status !== 'exited'");
  });

  it('still hard deletes every leftover, the tombstone included', () => {
    // The delete is outside the kill's condition, guarded by the name alone.
    const after = src.slice(start + loop.length - 60, start + loop.length + 40);
    expect(after).toContain('if (rec.name === SMOKE_KEEPER) core.discardSession(rec.id)');
  });
});
