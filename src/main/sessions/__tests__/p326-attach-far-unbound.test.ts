/**
 * Phase 326 — `attachSessionAdmitted` never looks for a session on another
 * machine on this Mac's server, waits for that machine instead, and spawns
 * nothing for a pane that has gone.
 *
 * WHAT WAS WRONG. A session whose record names another machine, and which no
 * completed list of that machine had reported yet, fell through to the LOCAL
 * branch: `this.mustGetSession`, `tmux.listSessions()` of THIS Mac's server,
 * and "This session is no longer running." over a session that was running on
 * the other machine. Phase 320's logs held 16 of those refusals.
 *
 * HOW IT IS DRIVEN, in `remote-lifecycle.test.ts`'s shape. The real methods
 * are borrowed off `GmuxCore.prototype` onto an `Object.create` object holding
 * the few things their bodies touch, which is also what proves the lazy ticket
 * and dependency holders work where no field initializer ran. The manifest is
 * a real `ManifestStore` in a temporary directory, so `remoteRecordOf` and
 * `isRemoteRecord` answer for real. The flight registry is the real
 * `../../machines/create-inflight`, so a create is registered and ended the way
 * `remoteCreate` does it. The machine layer's feed, readiness, list and
 * projection are stubbed, because planting a row in them needs a machine. And
 * `../../tmux` is this Mac's tmux with `listSessions` a spy, so "never asks
 * this Mac" is a count, not a reading of the code. The clock is vitest's.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WebContents } from 'electron';
import type { SessionStatus } from '@shared/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord } from '../../manifest/store';
import type { RemoteSessionRow } from '../far-attach';

/** This Mac's server and the far machine, as the stubs answer for them. */
const w = vi.hoisted(() => ({
  /** What `tmux.listSessions()` on THIS Mac answers. */
  local: [] as { sessionId: string; gmuxId: string }[],
  localCalls: 0,
  /** The far feed, by Tortie id. */
  feed: new Map<string, unknown>(),
  /** Machines this run knows. */
  known: new Set<string>(),
  /** Machines signed in, and the context each answers. */
  ready: new Set<string>(),
  /** What the machine does when a list is asked of it. */
  onPoll: null as null | ((machineId: string) => Promise<void>),
  polls: [] as string[],
  /** When the last list that completed was asked, per machine. */
  completedAt: new Map<string, number>(),
  /** What each record projects, by Tortie id. */
  projected: new Map<string, string>(),
  listeners: new Set<() => void>()
}));

vi.mock('../../tmux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux')>();
  return {
    ...actual,
    listSessions: (): Promise<unknown[]> => {
      w.localCalls += 1;
      return Promise.resolve(w.local);
    }
  };
});

vi.mock('../../machines/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../machines/store')>();
  return {
    ...actual,
    machineRow: (id: string): unknown => (w.known.has(id) ? { id } : null)
  };
});

vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-sessions')
  >();
  const { gmuxError } = await import('../../errors');
  const { MACHINE_NOT_READY } = await import('../../machines/remote-copy');
  return {
    ...actual,
    remoteSessionRow: (id: string): unknown => w.feed.get(id) ?? null,
    isRemoteSessionId: (id: string): boolean => w.feed.has(id),
    readyRemoteContext: (machineId: string): unknown => {
      if (!w.ready.has(machineId)) {
        throw gmuxError('INVALID_INPUT', MACHINE_NOT_READY, machineId);
      }
      return { kind: 'remote', machineId, label: `ctx:${machineId}` };
    },
    pollRemoteMachine: async (machineId: string): Promise<void> => {
      w.polls.push(machineId);
      const issuedAt = Date.now();
      if (w.onPoll !== null) await w.onPoll(machineId);
      w.completedAt.set(machineId, issuedAt);
    },
    remoteListCompletedSince: (machineId: string, at: number): boolean =>
      (w.completedAt.get(machineId) ?? -1) >= at,
    projectRemoteRecord: (record: { id: string; status: string }): unknown => ({
      ...record,
      status: w.projected.get(record.id) ?? 'unknown'
    }),
    onRemoteSessionsChanged: (listener: () => void): (() => void) => {
      w.listeners.add(listener);
      return () => {
        w.listeners.delete(listener);
      };
    }
  };
});

const { GmuxCore } = await import('../core');
const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest } = await import('../../machines/remote-record');
const { ATTACH_NOT_HEARD, MACHINE_NOT_READY } = await import(
  '../../machines/remote-copy'
);
const { REMOTE_ATTACH_BIND_WAIT_MS, defaultFarAttachDeps } = await import(
  '../far-attach'
);
const { beginRemoteCreate, resetRemoteCreateFlightsForTests } = await import(
  '../../machines/create-inflight'
);
const { GmuxError } = await import('../../errors');

const FAR = 'far-1';
const MACHINE = 'studio';

/** What the borrowed bodies may be called through. */
interface Borrowed {
  attachSession(sessionId: string, sender: WebContents): Promise<void>;
  detachSession(sessionId: string): void;
  beginShutdown(): void;
  joinAdmitted(deadlineMs: number): Promise<void>;
  disposed?: boolean;
  farAttachDepsSlot?: unknown;
}

interface Harness {
  core: Borrowed;
  attaches: Record<string, unknown>[];
  detaches: string[];
  /** Every call the borrowed bodies made on the core itself, in order. */
  calls: string[];
}

let dir: string;
let store: InstanceType<typeof ManifestStore>;

function harness(): Harness {
  const attaches: Record<string, unknown>[] = [];
  const detaches: string[] = [];
  const calls: string[] = [];
  const core = Object.create(GmuxCore.prototype) as Borrowed;
  Object.assign(core, {
    attachHost: {
      attach: (input: Record<string, unknown>): void => {
        attaches.push(input);
      },
      detach: (sessionId: string): void => {
        detaches.push(sessionId);
      }
    },
    lastGeometry: new Map<string, string>(),
    liveIds: new Map<string, string>(),
    byTmuxId: new Map<string, string>(),
    mustGetSession(sessionId: string): ManifestSessionRecord {
      calls.push(`mustGet:${sessionId}`);
      const rec = store.getSession(sessionId);
      if (rec === undefined) throw new Error(`No session ${sessionId}.`);
      return rec;
    },
    scheduleRefresh(): void {
      calls.push('scheduleRefresh');
    }
  });
  return { core, attaches, detaches, calls };
}

/** A pane's web contents, alive until the case says otherwise. */
function sender(): { wc: WebContents; destroy(): void } {
  let destroyed = false;
  return {
    wc: { isDestroyed: () => destroyed } as unknown as WebContents,
    destroy(): void {
      destroyed = true;
    }
  };
}

function record(over: Partial<ManifestSessionRecord>): ManifestSessionRecord {
  return store.insertSession({
    id: FAR,
    name: 'far one',
    tmuxName: 'far-one',
    projectPath: '/srv/repo',
    cwd: '/srv/repo',
    agent: 'shell',
    status: 'unknown',
    createdAt: 1,
    argv: ['/bin/zsh', '-l'],
    lastSeen: 1,
    machineId: MACHINE,
    ...over
  } as ManifestSessionRecord);
}

function feedRow(over?: Partial<RemoteSessionRow>): RemoteSessionRow {
  return {
    id: FAR,
    machineId: MACHINE,
    tmuxId: '$12',
    tmuxName: 'far-one',
    name: 'far one',
    agent: 'shell',
    projectPath: '/srv/repo',
    cwd: '/srv/repo',
    createdAt: 1,
    activityAt: 1,
    status: 'running',
    movedAt: 0,
    ...over
  };
}

interface Outcome {
  done: boolean;
  rejected: boolean;
  error: unknown;
}

/** How an attach that resolved quietly reads: done, not rejected, no error. */
const QUIET: Outcome = { done: true, rejected: false, error: undefined };

/** Start an attach and record how it ended, without awaiting it. */
function attach(
  h: Harness,
  wc: WebContents,
  id: string = FAR
): { outcome: Outcome; promise: Promise<void> } {
  const outcome: Outcome = { done: false, rejected: false, error: undefined };
  const promise = h.core.attachSession(id, wc).then(
    () => {
      outcome.done = true;
    },
    (err: unknown) => {
      outcome.done = true;
      outcome.rejected = true;
      outcome.error = err;
    }
  );
  return { outcome, promise };
}

function payloadOf(err: unknown): { code: string; message: string; detail?: string } {
  expect(err).toBeInstanceOf(GmuxError);
  return (err as InstanceType<typeof GmuxError>).payload;
}

const machineCtx = { kind: 'remote', machineId: MACHINE, label: `ctx:${MACHINE}` };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(2_000_000);
  dir = mkdtempSync(join(tmpdir(), 'tortie-p326-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
  setRemoteManifest(store);
  w.local = [];
  w.localCalls = 0;
  w.feed.clear();
  w.known.clear();
  w.known.add(MACHINE);
  w.ready.clear();
  w.onPoll = null;
  w.polls = [];
  w.completedAt.clear();
  w.projected.clear();
  w.listeners.clear();
  resetRemoteCreateFlightsForTests();
});

afterEach(() => {
  resetRemoteCreateFlightsForTests();
  vi.useRealTimers();
  setRemoteManifest(null);
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('a session on another machine that no list has reported yet', () => {
  it('waits for its create and attaches with the $-id the feed reports', async () => {
    record({});
    w.ready.add(MACHINE);
    const flight = beginRemoteCreate(FAR, MACHINE);
    const h = harness();
    const pane = sender();
    const { outcome } = attach(h, pane.wc);
    await vi.advanceTimersByTimeAsync(400);
    expect(outcome.done).toBe(false);
    expect(h.attaches).toEqual([]);
    // The create's own list reports the stamped row, then its `finally` ends it.
    w.feed.set(FAR, feedRow({ tmuxId: '$12' }));
    flight.end();
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual(QUIET);
    expect(h.attaches).toEqual([
      { sessionId: FAR, tmuxName: '$12', sender: pane.wc, machine: machineCtx }
    ]);
    // Nothing of this Mac was asked, and no list of the machine either: the
    // create's own list was enough.
    expect(w.localCalls).toBe(0);
    expect(h.calls).toEqual([]);
    expect(w.polls).toEqual([]);
  });

  it('with no create running, asks the machine one list of its own and attaches from it', async () => {
    record({});
    w.ready.add(MACHINE);
    w.onPoll = async (): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, 90));
      w.feed.set(FAR, feedRow({ tmuxId: '$31' }));
    };
    const h = harness();
    const pane = sender();
    const { outcome } = attach(h, pane.wc);
    await vi.advanceTimersByTimeAsync(90);
    expect(outcome).toEqual(QUIET);
    expect(w.polls).toEqual([MACHINE]);
    expect(h.attaches).toEqual([
      { sessionId: FAR, tmuxName: '$31', sender: pane.wc, machine: machineCtx }
    ]);
    expect(w.localCalls).toBe(0);
  });

  it('never calls tmux.listSessions or mustGetSession, even when it ends unanswered', async () => {
    record({ status: 'running' });
    // A local session carrying the far one's id: the old local branch would
    // have found and attached THIS, which is exactly what may never happen.
    w.local = [{ sessionId: '$4', gmuxId: FAR }];
    const h = harness();
    const { outcome } = attach(h, sender().wc);
    await vi.advanceTimersByTimeAsync(REMOTE_ATTACH_BIND_WAIT_MS);
    expect(outcome.done).toBe(true);
    const payload = payloadOf(outcome.error);
    expect(payload.code).toBe('TMUX_UNREACHABLE');
    expect(payload.message).toBe(ATTACH_NOT_HEARD);
    expect(payload.detail).toBe(
      `${MACHINE} far-one: nothing answered within ${String(REMOTE_ATTACH_BIND_WAIT_MS)} ms`
    );
    expect(w.localCalls).toBe(0);
    expect(h.calls).toEqual([]);
    expect(h.attaches).toEqual([]);
  });

  it('answers SESSION_NOT_FOUND in the remote words when its own list proves it absent', async () => {
    record({});
    w.ready.add(MACHINE);
    w.onPoll = (): Promise<void> => {
      w.projected.set(FAR, 'restorable');
      return Promise.resolve();
    };
    const h = harness();
    const { outcome } = attach(h, sender().wc);
    await vi.advanceTimersByTimeAsync(0);
    const payload = payloadOf(outcome.error);
    expect(payload.code).toBe('SESSION_NOT_FOUND');
    expect(payload.message).toBe('This session is not running right now.');
    expect(payload.message).not.toBe('This session is no longer running.');
    expect(payload.detail?.startsWith(`${MACHINE} far-one: `)).toBe(true);
    expect(h.attaches).toEqual([]);
    expect(w.localCalls).toBe(0);
  });

  it('answers SESSION_NOT_FOUND when its create took the record back', async () => {
    record({});
    w.ready.add(MACHINE);
    const flight = beginRemoteCreate(FAR, MACHINE);
    const h = harness();
    const { outcome } = attach(h, sender().wc);
    await vi.advanceTimersByTimeAsync(250);
    store.deleteSession(FAR);
    flight.end();
    await vi.advanceTimersByTimeAsync(0);
    const payload = payloadOf(outcome.error);
    expect(payload.code).toBe('SESSION_NOT_FOUND');
    expect(payload.message).toBe('This session is not running right now.');
    expect(w.polls).toEqual([]);
    expect(w.localCalls).toBe(0);
  });

  it('answers the existing not-signed-in sentence for a machine this run does not know', async () => {
    record({ machineId: 'gone-machine' });
    const h = harness();
    const { outcome } = attach(h, sender().wc);
    await vi.advanceTimersByTimeAsync(0);
    const payload = payloadOf(outcome.error);
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toBe(MACHINE_NOT_READY);
    expect(w.localCalls).toBe(0);
    expect(h.calls).toEqual([]);
  });
});

describe('a waited attach spawns nothing for a pane that has gone', () => {
  it('detachSession during the wait', async () => {
    record({});
    const flight = beginRemoteCreate(FAR, MACHINE);
    const h = harness();
    const { outcome } = attach(h, sender().wc);
    await vi.advanceTimersByTimeAsync(300);
    h.core.detachSession(FAR);
    w.feed.set(FAR, feedRow());
    flight.end();
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual(QUIET);
    expect(h.attaches).toEqual([]);
    expect(h.detaches).toEqual([FAR]);
  });

  it('a newer attach for the same session during the wait: only the newer one spawns', async () => {
    record({});
    const flight = beginRemoteCreate(FAR, MACHINE);
    const h = harness();
    const older = sender();
    const newer = sender();
    const first = attach(h, older.wc);
    await vi.advanceTimersByTimeAsync(100);
    const second = attach(h, newer.wc);
    await vi.advanceTimersByTimeAsync(100);
    w.ready.add(MACHINE);
    w.feed.set(FAR, feedRow());
    flight.end();
    await vi.advanceTimersByTimeAsync(0);
    expect(first.outcome).toEqual(QUIET);
    expect(second.outcome).toEqual(QUIET);
    expect(h.attaches).toHaveLength(1);
    expect(h.attaches[0]?.['sender']).toBe(newer.wc);
  });

  it('beginShutdown during the wait: no attach, and the promise and the join resolve at once', async () => {
    record({});
    beginRemoteCreate(FAR, MACHINE);
    const h = harness();
    const { outcome } = attach(h, sender().wc);
    await vi.advanceTimersByTimeAsync(500);
    expect(outcome.done).toBe(false);
    h.core.beginShutdown();
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual(QUIET);
    let joined = false;
    void h.core.joinAdmitted(10_000).then(() => {
      joined = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(joined).toBe(true);
    expect(h.attaches).toEqual([]);
  });

  it('a destroyed sender during the wait', async () => {
    record({});
    const flight = beginRemoteCreate(FAR, MACHINE);
    const h = harness();
    const pane = sender();
    const { outcome } = attach(h, pane.wc);
    await vi.advanceTimersByTimeAsync(200);
    pane.destroy();
    w.ready.add(MACHINE);
    w.feed.set(FAR, feedRow());
    flight.end();
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual(QUIET);
    expect(h.attaches).toEqual([]);
  });
});

describe('the liveness check right before the spawn, with no await between', () => {
  // The wait answered `row` with its own liveness check passing, and the pane
  // went in the gap between that answer and the spawn. The dependency that
  // answers the row ends the pane AFTER the wait's own check, so only the check
  // in `attachFarUnbound` itself can stop the spawn.
  const cases: [string, (h: Harness, pane: { destroy(): void }) => void][] = [
    ['the ticket moved by a detach', (h) => h.core.detachSession(FAR)],
    ['the sender destroyed', (_h, pane) => pane.destroy()],
    ['shutdown begun', (h) => h.core.beginShutdown()],
    [
      'the core disposed',
      (h) => {
        h.core.disposed = true;
      }
    ]
  ];
  for (const [label, endPane] of cases) {
    it(label, async () => {
      record({});
      w.ready.add(MACHINE);
      const h = harness();
      const pane = sender();
      const real = defaultFarAttachDeps();
      h.core.farAttachDepsSlot = {
        ...real,
        row: (id: string): RemoteSessionRow | null => {
          if (id !== FAR) return real.row(id);
          endPane(h, pane);
          return feedRow();
        }
      };
      const { outcome } = attach(h, pane.wc);
      await vi.advanceTimersByTimeAsync(0);
      expect(outcome).toEqual(QUIET);
      expect(h.attaches).toEqual([]);
    });
  }

  it('control: nothing ended, the same row spawns', async () => {
    record({});
    w.ready.add(MACHINE);
    const h = harness();
    const pane = sender();
    const real = defaultFarAttachDeps();
    h.core.farAttachDepsSlot = { ...real, row: (): RemoteSessionRow => feedRow() };
    const { outcome } = attach(h, pane.wc);
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toEqual(QUIET);
    expect(h.attaches).toHaveLength(1);
  });
});

describe('the immediate remote branch is unchanged', () => {
  it('attaches at once to the listed $-id, through the machine context, asking nothing else', async () => {
    w.ready.add(MACHINE);
    w.feed.set(FAR, feedRow({ tmuxId: '$5' }));
    const h = harness();
    const pane = sender();
    await h.core.attachSession(FAR, pane.wc);
    expect(h.attaches).toEqual([
      { sessionId: FAR, tmuxName: '$5', sender: pane.wc, machine: machineCtx }
    ]);
    expect(w.polls).toEqual([]);
    expect(w.localCalls).toBe(0);
    expect(h.calls).toEqual([]);
  });

  it('refuses an exited row with the remote sentence and its status', async () => {
    w.ready.add(MACHINE);
    w.feed.set(FAR, feedRow({ status: 'exited' }));
    const h = harness();
    const payload = payloadOf(
      await h.core.attachSession(FAR, sender().wc).catch((err: unknown) => err)
    );
    expect(payload).toMatchObject({
      code: 'SESSION_NOT_FOUND',
      message: 'This session is not running right now.',
      detail: 'status: exited'
    });
    expect(h.attaches).toEqual([]);
  });

  it('lets the readiness refusal through unchanged', async () => {
    w.feed.set(FAR, feedRow());
    const h = harness();
    const payload = payloadOf(
      await h.core.attachSession(FAR, sender().wc).catch((err: unknown) => err)
    );
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toBe(MACHINE_NOT_READY);
    expect(h.attaches).toEqual([]);
  });
});

describe('a session on this Mac takes the local branch exactly as before', () => {
  function local(status: SessionStatus): void {
    record({ id: 'local-1', machineId: 'local', status, tmuxName: 'here', cwd: '/here' });
  }

  it('attaches through liveIds with its cwd, listing nothing', async () => {
    local('running');
    const h = harness();
    (h.core as unknown as { liveIds: Map<string, string> }).liveIds.set('local-1', '$3');
    const pane = sender();
    await h.core.attachSession('local-1', pane.wc);
    expect(h.calls).toEqual(['mustGet:local-1']);
    expect(w.localCalls).toBe(0);
    expect(h.attaches).toEqual([
      { sessionId: 'local-1', tmuxName: '$3', sender: pane.wc, cwd: '/here' }
    ]);
  });

  it('with no binding, reads this Mac’s server by identity and binds what it finds', async () => {
    local('running');
    w.local = [{ sessionId: '$8', gmuxId: 'local-1' }];
    const h = harness();
    const pane = sender();
    await h.core.attachSession('local-1', pane.wc);
    expect(w.localCalls).toBe(1);
    expect(h.attaches).toEqual([
      { sessionId: 'local-1', tmuxName: '$8', sender: pane.wc, cwd: '/here' }
    ]);
    expect((h.core as unknown as { liveIds: Map<string, string> }).liveIds.get('local-1')).toBe('$8');
    expect((h.core as unknown as { byTmuxId: Map<string, string> }).byTmuxId.get('$8')).toBe('local-1');
  });

  it('not on this Mac’s server: the local sentence and a refresh, as before', async () => {
    local('running');
    const h = harness();
    const payload = payloadOf(
      await h.core.attachSession('local-1', sender().wc).catch((err: unknown) => err)
    );
    expect(payload).toMatchObject({
      code: 'SESSION_NOT_FOUND',
      message: 'This session is no longer running.',
      detail: 'here'
    });
    expect(w.localCalls).toBe(1);
    expect(h.calls).toEqual(['mustGet:local-1', 'scheduleRefresh']);
  });

  it('a restorable row: the not-running sentence with its status, listing nothing', async () => {
    local('restorable');
    const h = harness();
    const payload = payloadOf(
      await h.core.attachSession('local-1', sender().wc).catch((err: unknown) => err)
    );
    expect(payload).toMatchObject({
      code: 'SESSION_NOT_FOUND',
      message: 'This session is not running right now.',
      detail: 'status: restorable'
    });
    expect(w.localCalls).toBe(0);
  });

  it('a row written before machines existed is local', async () => {
    record({ id: 'old-1', machineId: undefined, status: 'running', tmuxName: 'old' });
    expect(store.getSession('old-1')?.machineId).toBe('local');
    const h = harness();
    await h.core.attachSession('old-1', sender().wc).catch(() => undefined);
    expect(h.calls[0]).toBe('mustGet:old-1');
    expect(w.localCalls).toBe(1);
  });
});
