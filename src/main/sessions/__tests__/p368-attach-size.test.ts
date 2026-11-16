/**
 * Phase 368 (build/p368/SPEC.md D1, D2, D3): every attach is spawned at the
 * size its pane sent, and an attach, a create or a restore that names no size
 * of its own is made at the last size a pane was fitted at, then at none.
 *
 * WHAT WAS WRONG (research 145 section 3.2, measured). Every attach spawned its
 * client at tmux's 80 by 24 and the pane pushed its fitted size afterwards; a
 * push a few milliseconds late told the session's program 80 by 24 for about
 * 250 ms, and a long reply drawn in between was left duplicated in the history.
 * Every session was made at 80 by 24 too, so the first attach was always one
 * size change for the program, whatever the attach did.
 *
 * HOW IT IS DRIVEN, in `p326-attach-far-unbound.test.ts`'s shape. The real
 * methods are borrowed off `GmuxCore.prototype` onto an `Object.create` object
 * holding the few things their bodies touch, which is also what proves the new
 * field reads as no size where no field initializer ran. The manifest is a real
 * `ManifestStore` in a temporary directory, so the far record answers for real.
 * The machine layer's feed, readiness and projection are stubbed, the far and
 * the local restore are recorders, and the create's two spawns, this Mac's
 * `tmux.createSession` and the far `remoteCreate`, are recorders too. Every
 * expected size below is written by hand.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WebContents } from 'electron';
import type { CreateSessionInput } from '@shared/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestSessionRecord } from '../../manifest/store';
import type { RemoteSessionRow } from '../far-attach';

const w = vi.hoisted(() => ({
  /** The far feed, by Tortie id. */
  feed: new Map<string, unknown>(),
  /** Machines this run knows. */
  known: new Set<string>(),
  /** Machines signed in. */
  ready: new Set<string>(),
  /** When the last completed list was asked, per machine. */
  completedAt: new Map<string, number>(),
  listeners: new Set<() => void>(),
  /** Every far restore: the id and the size it was handed. */
  remoteRestores: [] as { sessionId: string; size: unknown }[],
  /** Every local restore's options. */
  localRestores: [] as Record<string, unknown>[],
  /** Every local spawn the create handed this Mac's tmux. */
  localCreates: [] as Record<string, unknown>[],
  /** Every far create's input. */
  remoteCreates: [] as Record<string, unknown>[],
  /** The width table this Mac's server is said to draw with. */
  widths: null as null | '3.7b' | '3.6a'
}));

// The widths builder's reader of this Mac's server version, answered here so
// the list can be asked about each table.
vi.mock('../../tmux/version', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tmux/version')>()),
  localCellWidths: () => w.widths
}));

vi.mock('../../tmux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux')>();
  return {
    ...actual,
    listSessions: (): Promise<unknown[]> => Promise.resolve([]),
    installUserPath: (): Promise<string> => Promise.resolve('/usr/bin:/bin'),
    createSession: (input: Record<string, unknown>): Promise<unknown> => {
      w.localCreates.push(input);
      return Promise.resolve({
        sessionId: '$41',
        tmuxName: String(input['displayName']),
        createdAt: 0,
        attached: false,
        windows: 1,
        panePid: 41_000
      });
    },
    setSessionOption: (): Promise<void> => Promise.resolve(),
    execTmux: (): Promise<string> => Promise.resolve('')
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
  return {
    ...actual,
    remoteSessionRow: (id: string): unknown => w.feed.get(id) ?? null,
    isRemoteSessionId: (id: string): boolean => w.feed.has(id),
    readyRemoteContext: (machineId: string): unknown => {
      if (!w.ready.has(machineId)) throw new Error(`not ready: ${machineId}`);
      return { kind: 'remote', machineId, label: `ctx:${machineId}` };
    },
    pollRemoteMachine: (machineId: string): Promise<void> => {
      w.completedAt.set(machineId, Date.now());
      return Promise.resolve();
    },
    remoteListCompletedSince: (machineId: string, at: number): boolean =>
      (w.completedAt.get(machineId) ?? -1) >= at,
    projectRemoteRecord: (record: { id: string }): unknown => ({
      ...record,
      status: 'unknown'
    }),
    onRemoteSessionsChanged: (listener: () => void): (() => void) => {
      w.listeners.add(listener);
      return () => {
        w.listeners.delete(listener);
      };
    },
    // The gate is not what this file measures: every restore here is offered.
    refuseRemoteRestore: (): void => undefined,
    remoteCreate: (input: Record<string, unknown>): Promise<unknown> => {
      w.remoteCreates.push(input);
      return Promise.resolve({ id: 'far-made', machine: { id: input['machineId'] } });
    }
  };
});

vi.mock('../../machines/remote-restore', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-restore')
  >();
  return {
    ...actual,
    restoreRemoteSession: (sessionId: string, size: unknown): Promise<unknown> => {
      w.remoteRestores.push({ sessionId, size });
      return Promise.resolve({ session: { id: sessionId }, resumeNote: null, replayNote: null });
    }
  };
});

vi.mock('../../restore/restore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../restore/restore')>();
  return {
    ...actual,
    restoreSessionInTmux: (_rec: unknown, options: Record<string, unknown>): Promise<unknown> => {
      w.localRestores.push(options);
      // The failed arm, so the restore ends at once and records nothing live.
      return Promise.resolve({
        kind: 'failed',
        stage: 'create',
        reason: 'p368 stops here',
        error: new Error('p368 stops here')
      });
    }
  };
});

vi.mock('../../machines/remote-rehome', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../machines/remote-rehome')>()),
  openTabsForRemoteCreate: (): void => undefined,
  releaseFoldersAfterFailedRemoteCreate: (): void => undefined
}));

// The launch context walks the agent's configuration folders; nothing here may read them.
vi.mock('../../context/snapshot', () => ({ recordLaunchContext: () => undefined }));

// No person's settings: no passthrough, no defaults.
vi.mock('../../settings/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../settings/store')>()),
  getSettings: () => ({
    envPassthrough: {},
    envPassthroughShared: [],
    launchDefaults: {},
    captureDefaults: {}
  })
}));

const { GmuxCore } = await import('../core');
const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest } = await import('../../machines/remote-record');
const { beginRemoteCreate, resetRemoteCreateFlightsForTests } = await import(
  '../../machines/create-inflight'
);
const { createLocalSession } = await import('../create-local');

const LOCAL = 'local-1';
const FAR = 'far-1';
const MACHINE = 'studio';
const FITTED = { cols: 124, rows: 39 };

/** What the borrowed bodies may be called through. */
interface Borrowed {
  attachSession(sessionId: string, sender: WebContents, size?: unknown): Promise<void>;
  resizeSession(input: { sessionId: string; cols: number; rows: number }): void;
  restoreSession(sessionId: string, options?: Record<string, unknown>): Promise<unknown>;
  detachSession(sessionId: string): void;
}

interface Harness {
  core: Borrowed;
  attaches: Record<string, unknown>[];
  resizes: [string, number, number][];
}

let dir: string;
let store: InstanceType<typeof ManifestStore>;

function harness(): Harness {
  const attaches: Record<string, unknown>[] = [];
  const resizes: [string, number, number][] = [];
  const core = Object.create(GmuxCore.prototype) as Borrowed;
  Object.assign(core, {
    attachHost: {
      attach: (input: Record<string, unknown>): void => {
        attaches.push(input);
      },
      detach: (): void => undefined,
      resize: (sessionId: string, cols: number, rows: number): void => {
        resizes.push([sessionId, cols, rows]);
      }
    },
    activity: { noteGeometryChange: (): void => undefined },
    lastGeometry: new Map<string, string>(),
    liveIds: new Map<string, string>([[LOCAL, '$7']]),
    byTmuxId: new Map<string, string>([['$7', LOCAL]]),
    restoresInFlight: new Set<string>(),
    manifest: {
      getSession: (id: string): unknown => store.getSession(id),
      beginRestoreAttempt: (): number => 7,
      recordRestoreOutcome: (): void => undefined,
      finishRestoreAttempt: (): void => undefined
    },
    mustGetSession(sessionId: string): unknown {
      if (sessionId === LOCAL) {
        return { id: LOCAL, status: 'running', cwd: '/w', tmuxName: 'w', agent: 'shell' };
      }
      return { id: sessionId, status: 'restorable', cwd: '/w', tmuxName: 'r', agent: 'shell' };
    },
    scheduleRefresh: (): void => undefined,
    reportRemoteResume: (): void => undefined,
    reportRestoreStages: (): void => undefined,
    broadcastSessions: (): void => undefined
  });
  return { core, attaches, resizes };
}

/** A pane's web contents, alive. */
function sender(): WebContents {
  return { isDestroyed: () => false } as unknown as WebContents;
}

function farRecord(): ManifestSessionRecord {
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
    machineId: MACHINE
  } as ManifestSessionRecord);
}

function feedRow(tmuxId: string): RemoteSessionRow {
  return {
    id: FAR,
    machineId: MACHINE,
    tmuxId,
    tmuxName: 'far-one',
    name: 'far one',
    agent: 'shell',
    projectPath: '/srv/repo',
    cwd: '/srv/repo',
    createdAt: 1,
    activityAt: 1,
    status: 'running',
    movedAt: 0
  };
}

const machineCtx = { kind: 'remote', machineId: MACHINE, label: `ctx:${MACHINE}` };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(3_000_000);
  dir = mkdtempSync(join(tmpdir(), 'tortie-p368-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
  setRemoteManifest(store);
  w.feed.clear();
  w.known.clear();
  w.known.add(MACHINE);
  w.ready.clear();
  w.completedAt.clear();
  w.listeners.clear();
  w.remoteRestores.length = 0;
  w.localRestores.length = 0;
  w.localCreates.length = 0;
  w.remoteCreates.length = 0;
  resetRemoteCreateFlightsForTests();
});

afterEach(() => {
  resetRemoteCreateFlightsForTests();
  vi.useRealTimers();
  setRemoteManifest(null);
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. Every attach branch spawns at the size the pane sent (D1)
// ---------------------------------------------------------------------------

describe('every attach branch spawns its client at the size the pane sent', () => {
  it('this Mac: the local branch', async () => {
    const h = harness();
    const wc = sender();
    await h.core.attachSession(LOCAL, wc, FITTED);
    expect(h.attaches).toEqual([
      { sessionId: LOCAL, tmuxName: '$7', sender: wc, cwd: '/w', cols: 124, rows: 39 }
    ]);
  });

  it('another machine, a session a completed list reported', async () => {
    w.ready.add(MACHINE);
    w.feed.set(FAR, feedRow('$5'));
    const h = harness();
    const wc = sender();
    await h.core.attachSession(FAR, wc, FITTED);
    expect(h.attaches).toEqual([
      { sessionId: FAR, tmuxName: '$5', sender: wc, machine: machineCtx, cols: 124, rows: 39 }
    ]);
  });

  it('another machine, a session no list has reported yet: the waited attach spawns at the size too', async () => {
    farRecord();
    w.ready.add(MACHINE);
    const flight = beginRemoteCreate(FAR, MACHINE);
    const h = harness();
    const wc = sender();
    const done = h.core.attachSession(FAR, wc, FITTED);
    await vi.advanceTimersByTimeAsync(300);
    expect(h.attaches).toEqual([]);
    w.feed.set(FAR, feedRow('$12'));
    flight.end();
    await vi.advanceTimersByTimeAsync(0);
    await done;
    expect(h.attaches).toEqual([
      { sessionId: FAR, tmuxName: '$12', sender: wc, machine: machineCtx, cols: 124, rows: 39 }
    ]);
  });

  it('the bounds themselves are sizes: 2 by 1 and 1,000 by 500', async () => {
    const h = harness();
    await h.core.attachSession(LOCAL, sender(), { cols: 2, rows: 1 });
    await h.core.attachSession(LOCAL, sender(), { cols: 1000, rows: 500 });
    expect(h.attaches.map((a) => [a['cols'], a['rows']])).toEqual([
      [2, 1],
      [1000, 500]
    ]);
  });
});

// ---------------------------------------------------------------------------
// 2. A size that is not one falls back to the last fitted, then to none (D1, D2)
// ---------------------------------------------------------------------------

/** Every shape a renderer could send that is not a whole size in bounds. */
const NOT_SIZES: readonly unknown[] = [
  undefined,
  null,
  '124x39',
  [124, 39],
  {},
  { cols: 124 },
  { rows: 39 },
  { cols: 1, rows: 39 },
  { cols: 1001, rows: 39 },
  { cols: 124, rows: 0 },
  { cols: 124, rows: 501 },
  { cols: 124.5, rows: 39 },
  { cols: 124, rows: 39.25 },
  { cols: Number.NaN, rows: 39 },
  { cols: Number.POSITIVE_INFINITY, rows: 39 },
  { cols: '124', rows: '39' },
  { cols: -124, rows: 39 }
];

describe('a size that is not one', () => {
  it('with nothing fitted yet, spawns at no size of its own: the attach host keeps 80 by 24, as before this phase', async () => {
    const h = harness();
    for (const bad of NOT_SIZES) await h.core.attachSession(LOCAL, sender(), bad);
    expect(h.attaches).toHaveLength(NOT_SIZES.length);
    for (const attach of h.attaches) {
      expect('cols' in attach).toBe(false);
      expect('rows' in attach).toBe(false);
    }
  });

  it('after a pane sent a size, falls back to that size', async () => {
    const h = harness();
    await h.core.attachSession(LOCAL, sender(), FITTED);
    for (const bad of NOT_SIZES) await h.core.attachSession(LOCAL, sender(), bad);
    for (const attach of h.attaches) {
      expect([attach['cols'], attach['rows']]).toEqual([124, 39]);
    }
  });

  it('a newer valid size replaces the older one', async () => {
    const h = harness();
    await h.core.attachSession(LOCAL, sender(), FITTED);
    await h.core.attachSession(LOCAL, sender(), { cols: 97, rows: 39 });
    await h.core.attachSession(LOCAL, sender(), undefined);
    expect(h.attaches.map((a) => [a['cols'], a['rows']])).toEqual([
      [124, 39],
      [97, 39],
      [97, 39]
    ]);
  });
});

// ---------------------------------------------------------------------------
// 3. The fallback is learnt from resizeSession (D2)
// ---------------------------------------------------------------------------

describe('the last fitted size is learnt from every resize', () => {
  it('a resize with no client yet still teaches the next attach its size', async () => {
    const h = harness();
    h.core.resizeSession({ sessionId: LOCAL, cols: 100, rows: 30 });
    await h.core.attachSession(LOCAL, sender(), undefined);
    expect([h.attaches[0]?.['cols'], h.attaches[0]?.['rows']]).toEqual([100, 30]);
    // The resize itself still reached the attach host, as before.
    expect(h.resizes).toEqual([[LOCAL, 100, 30]]);
  });

  it('a resize that is not a size teaches nothing', async () => {
    const h = harness();
    h.core.resizeSession({ sessionId: LOCAL, cols: 100, rows: 30 });
    h.core.resizeSession({ sessionId: LOCAL, cols: 0, rows: 30 });
    h.core.resizeSession({ sessionId: LOCAL, cols: 100.5, rows: 30 });
    await h.core.attachSession(LOCAL, sender(), undefined);
    expect([h.attaches[0]?.['cols'], h.attaches[0]?.['rows']]).toEqual([100, 30]);
  });

  it('the last resize wins over an older attach', async () => {
    const h = harness();
    await h.core.attachSession(LOCAL, sender(), FITTED);
    h.core.resizeSession({ sessionId: LOCAL, cols: 162, rows: 39 });
    await h.core.attachSession(LOCAL, sender(), null);
    expect([h.attaches[1]?.['cols'], h.attaches[1]?.['rows']]).toEqual([162, 39]);
  });
});

// ---------------------------------------------------------------------------
// 4. A restore is made at its own size, then at the last fitted (D2, D3)
// ---------------------------------------------------------------------------

describe('a restore is made at the size it will be shown', () => {
  it('another machine: its own size', async () => {
    w.feed.set(FAR, feedRow('$5'));
    const h = harness();
    await h.core.restoreSession(FAR, { size: { cols: 90, rows: 20 } });
    expect(w.remoteRestores).toEqual([{ sessionId: FAR, size: { cols: 90, rows: 20 } }]);
  });

  it('another machine: no size of its own takes the last fitted, and with none, none', async () => {
    w.feed.set(FAR, feedRow('$5'));
    const h = harness();
    await h.core.restoreSession(FAR, {});
    h.core.resizeSession({ sessionId: LOCAL, cols: 140, rows: 40 });
    await h.core.restoreSession(FAR, { size: { cols: 0, rows: 20 } });
    expect(w.remoteRestores).toEqual([
      { sessionId: FAR, size: null },
      { sessionId: FAR, size: { cols: 140, rows: 40 } }
    ]);
  });

  it('this Mac: its own size reaches the restore, and none sends none', async () => {
    const h = harness();
    await expect(
      h.core.restoreSession('local-r', { size: { cols: 90, rows: 20 } })
    ).rejects.toThrow('p368 stops here');
    await expect(h.core.restoreSession('local-r', {})).rejects.toThrow('p368 stops here');
    expect(w.localRestores[0]?.['size']).toEqual({ cols: 90, rows: 20 });
    expect('size' in (w.localRestores[1] ?? {})).toBe(false);
  });

  it('this Mac: no size of its own takes the last fitted', async () => {
    const h = harness();
    h.core.resizeSession({ sessionId: LOCAL, cols: 140, rows: 40 });
    await expect(h.core.restoreSession('local-r', {})).rejects.toThrow('p368 stops here');
    expect(w.localRestores[0]?.['size']).toEqual({ cols: 140, rows: 40 });
  });

  it("a restore's size is a guess about a pane not yet shown, so it never becomes the last fitted size", async () => {
    w.feed.set(FAR, feedRow('$5'));
    const h = harness();
    await h.core.restoreSession(FAR, { size: { cols: 90, rows: 20 } });
    await h.core.attachSession(LOCAL, sender(), undefined);
    expect('cols' in (h.attaches[0] ?? {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. A row on this Mac carries this Mac's width table (D7, the seam to widths)
// ---------------------------------------------------------------------------

describe("a row on this Mac carries this Mac's width table, and a row on another machine none", () => {
  const listed = (): Record<string, unknown>[] =>
    (
      GmuxCore.prototype as unknown as { listSessions(this: unknown): Record<string, unknown>[] }
    ).listSessions.call({ manifest: store });

  beforeEach(() => {
    store.insertSession({
      id: 'mac-1',
      name: 'mac one',
      tmuxName: 'mac-one',
      projectPath: dir,
      cwd: dir,
      agent: 'shell',
      status: 'running',
      createdAt: 1,
      argv: ['/bin/zsh', '-l'],
      lastSeen: 1
    } as ManifestSessionRecord);
    farRecord();
  });

  afterEach(() => {
    w.widths = null;
  });

  for (const table of ['3.7b', '3.6a'] as const) {
    it(`a ${table} server: the row on this Mac says ${table}`, () => {
      w.widths = table;
      const rows = listed();
      expect(rows.find((row) => row['id'] === 'mac-1')?.['cellWidths']).toBe(table);
      expect('cellWidths' in (rows.find((row) => row['id'] === FAR) ?? {})).toBe(false);
    });
  }

  it('a server of no measured table: no row carries one, as before this phase', () => {
    w.widths = null;
    for (const row of listed()) expect('cellWidths' in row).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. A create is made at its own size, then at the last fitted (D2, D3)
// ---------------------------------------------------------------------------

function createDeps(last: { cols: number; rows: number } | null): Parameters<
  typeof createLocalSession
>[1] {
  return {
    manifest: {} as never,
    hookServer: {} as never,
    liveIds: new Map(),
    byTmuxId: new Map(),
    createsInFlight: new Map(),
    broadcastSessions: () => undefined,
    startIdCapture: () => undefined,
    cachedAgentVersion: () => null,
    lastFittedSize: () => last
  };
}

/** A recording manifest: just what the local create writes and reads back. */
function recordingManifest(): Parameters<typeof createLocalSession>[1]['manifest'] {
  const rows = new Map<string, ManifestSessionRecord>();
  return {
    insertSession: (rec: ManifestSessionRecord) => {
      rows.set(rec.id, { ...rec });
      return rec;
    },
    updateSession: (id: string, patch: Partial<ManifestSessionRecord>) => {
      const rec = rows.get(id);
      if (rec !== undefined) rows.set(id, { ...rec, ...patch });
    },
    getSession: (id: string) => rows.get(id),
    deleteSession: (id: string) => {
      rows.delete(id);
    }
  } as never;
}

function localCreate(projectPath: string, size?: unknown): CreateSessionInput {
  return {
    name: 'mac shell',
    projectPath,
    agent: 'shell',
    ...(size !== undefined ? { size } : {})
  } as CreateSessionInput;
}

function farCreate(size?: unknown): CreateSessionInput {
  return {
    name: 'far shell',
    projectPath: '/srv/repo',
    agent: 'shell',
    machineId: MACHINE,
    ...(size !== undefined ? { size } : {})
  } as CreateSessionInput;
}

describe("the create's size, decided once for both branches", () => {
  it('another machine: the request’s own size reaches the far create', async () => {
    await createLocalSession(farCreate({ cols: 124, rows: 39 }), createDeps(null));
    expect(w.remoteCreates[0]?.['size']).toEqual({ cols: 124, rows: 39 });
  });

  it('another machine: no size of its own takes the last fitted, and with none, none', async () => {
    await createLocalSession(farCreate(), createDeps({ cols: 140, rows: 40 }));
    await createLocalSession(farCreate({ cols: 5000, rows: 40 }), createDeps({ cols: 140, rows: 40 }));
    await createLocalSession(farCreate(), createDeps(null));
    expect(w.remoteCreates.map((c) => c['size'])).toEqual([
      { cols: 140, rows: 40 },
      { cols: 140, rows: 40 },
      undefined
    ]);
    expect('size' in (w.remoteCreates[2] ?? {})).toBe(false);
  });

  it('this Mac: the request’s own size, then the last fitted, then none, reaches this Mac’s tmux', async () => {
    const at = (last: { cols: number; rows: number } | null) => ({
      ...createDeps(last),
      manifest: recordingManifest()
    });
    await createLocalSession(localCreate(dir, { cols: 124, rows: 39 }), at({ cols: 140, rows: 40 }));
    await createLocalSession(localCreate(dir), at({ cols: 140, rows: 40 }));
    await createLocalSession(localCreate(dir, { cols: 124, rows: -1 }), at(null));
    await createLocalSession(localCreate(dir), at(null));
    expect(w.localCreates.map((c) => c['size'])).toEqual([
      { cols: 124, rows: 39 },
      { cols: 140, rows: 40 },
      undefined,
      undefined
    ]);
    expect('size' in (w.localCreates[3] ?? {})).toBe(false);
  });

  it("the core hands the create its last fitted size, read when the create runs", () => {
    const core = readFileSync(join(import.meta.dirname, '..', 'core.ts'), 'utf8');
    const deps = core.slice(core.indexOf('this.createDeps = {'));
    const block = deps.slice(0, deps.indexOf('};'));
    expect(block).toContain('lastFittedSize: () => this.lastFittedSize ?? null');
  });
});
