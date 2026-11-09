/**
 * Phase 302 (build/p353/SPEC.md §4.1 step 4, D302-2, D302-3). A session ended
 * and then removed keeps its tombstone, whatever is in flight.
 *
 * THE DEFECT, measured at the parent (build/p353/SPEC.md §2.4, M302). Both
 * writers of a terminal status wrote `exited` over a tombstone that landed
 * inside their awaits, keeping `removed_at`, so the row left Past Sessions for
 * the managed list with its saved output already deleted:
 *
 *  - `killSessionAdmitted`, the End, for an `exited` or `restorable` row with a
 *    live binding: its gate at the top reads the row before the hang-up, and a
 *    Remove is accepted on an ended row.
 *  - `reapDeadSession`, for a `restorable` row with a live binding, and for a
 *    reap entered on a row ALREADY removed with no binding and no await at all:
 *    the activity monitor reads its sessions before its awaits and reports a
 *    dead pane after them, and the reap's only guard asks for `exited`.
 *
 * Both now re-read immediately before their write (and Phase 302's clause in
 * ../../manifest/sessions-repository.ts keeps the status of a removed row
 * whatever any writer patches, which ../../manifest/__tests__/p302-status-over-
 * tombstone.test.ts proves on its own). So every cell here reads the WHOLE of
 * what a writer did: the row on DISK through a second connection, the LIST the
 * product's own `listSessions` and `listRemovedSessions` put it in, and whether
 * an `exited` was sent to the windows. The repository clause alone keeps the
 * status, so a writer whose re-read is gone still reads red here: it writes the
 * rest of its patch and tells every window a removed session ended.
 *
 * THE RIG is M302's, committed: the REAL `reapDeadSession`,
 * `killSessionAdmitted`, `removeSession`, `releaseSessionResources`,
 * `mustGetSession`, `listSessions`, `listRemovedSessions` and
 * `activitySessions` bodies off `GmuxCore.prototype` (the shape
 * ./p293-lifecycle-gate.test.ts gives its reasons for), over a REAL
 * `ManifestStore`. The capture and the hang-up each take a known width on a
 * FAKE clock, so the window is exact rather than hoped for, and the Remove is
 * fired at each interval of the grid. The second half drives the REAL
 * activity monitor: a tick reads its sessions, an End and a Remove land while
 * its pane read is in flight, and the dead pane it then reports reaches the
 * real reap.
 *
 * THE EXPECTED TABLE IS DERIVED BY HAND, from build/p353/SPEC.md §2.4 and
 * D302-2, D302-3, before the run, and committed below. The timing model it is
 * derived from: a bound reap writes at 60 ms (capture 30, hang-up 30); a bound
 * End writes at 60 ms for a live row and at 30 ms for an ended one (an ended
 * row is not captured again); an unbound writer has no await and writes before
 * any timer fires; a Remove is accepted on `exited`, `restorable` and
 * `discarded` and refused on the four live words. No interval of the grid
 * equals 30 or 60, so no cell is a tie.
 *
 * RULE IDS, in the titles, which `ablation:p293` reads: R302b is the reap's
 * re-read, R302c is the End's.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVT_STATUS_CHANGED } from '@shared/ipc';
import type { SessionStatus } from '@shared/types';

const CAPTURE_MS = 30;
const HANGUP_MS = 30;
/** How long the monitor's pane read is in flight in the second half. */
const PANE_READ_MS = 200;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Everything sent to the windows, in order: [channel, ...payload]. */
const events: unknown[][] = [];
const scratch = mkdtempSync(join(tmpdir(), 'tortie-p302-sweep-'));

vi.mock('../../restore/snapshots', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../restore/snapshots')>();
  return {
    ...actual,
    captureSessionSnapshot: async (
      _target: string,
      _id: string,
      opts?: { onPaneText?: (text: string) => void }
    ): Promise<void> => {
      await wait(CAPTURE_MS);
      opts?.onPaneText?.('the last line it printed\n');
    },
    deleteSnapshot: async (): Promise<void> => undefined,
    // No snapshot directory exists in a unit test.
    savedOutputAt: (): null => null,
    snapshotMaterialExists: (): boolean => false
  };
});

vi.mock('../../tmux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux')>();
  return { ...actual, killSession: async (): Promise<void> => wait(HANGUP_MS) };
});

vi.mock('../../typed-events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../typed-events')>();
  return {
    ...actual,
    broadcastEvent: (channel: unknown, ...payload: unknown[]): void => {
      events.push([channel, ...payload]);
    }
  };
});

// Every row here is on this Mac: no machine's feed holds anything.
vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../machines/remote-sessions')>();
  return {
    ...actual,
    isRemoteSessionId: (): boolean => false,
    remoteSessionRow: (): null => null,
    remoteSessions: (): never[] => [],
    forgetRemoteRow: (): boolean => false
  };
});

// The record path resolver walks agent stores; nothing here may read one.
vi.mock('../record-path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../record-path')>();
  return { ...actual, stampRecordLocations: <T>(rows: T): T => rows };
});

// The hook settings file of a removed row, under this test's own folder.
vi.mock('../../activity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../activity')>();
  return {
    ...actual,
    claudeHookSettingsPath: (id: string): string => join(scratch, `${id}.json`)
  };
});

const { GmuxCore } = await import('../core');
const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest } = await import('../../machines/remote-record');
const { SessionActivityMonitor } = await import('../../activity');
import type { ManifestSessionRecord } from '../../manifest/store';
import type { Session } from '@shared/types';

type Body = (this: unknown, ...args: unknown[]) => unknown;
const proto = GmuxCore.prototype as unknown as Record<string, Body>;
const borrowed = (name: string): Body => {
  const fn = proto[name];
  if (typeof fn !== 'function') throw new Error(`GmuxCore has no ${name}`);
  return fn;
};
const reap = borrowed('reapDeadSession');
const end = borrowed('killSessionAdmitted');
const removeSession = borrowed('removeSession');
const releaseSessionResources = borrowed('releaseSessionResources');
const mustGetSession = borrowed('mustGetSession');
const listSessions = borrowed('listSessions');
const listRemovedSessions = borrowed('listRemovedSessions');
const activitySessions = borrowed('activitySessions');

let store: InstanceType<typeof ManifestStore>;
/** A second connection to the same file: every reading is the DISK. */
let disk: InstanceType<typeof ManifestStore>;
let rowCount = 0;

beforeAll(() => {
  const dbPath = join(scratch, 'manifest.db');
  store = new ManifestStore(dbPath);
  disk = new ManifestStore(dbPath);
  setRemoteManifest(store);
});

afterAll(() => {
  setRemoteManifest(null);
  disk.close();
  store.close();
  rmSync(scratch, { recursive: true, force: true });
});

beforeEach(() => {
  vi.useFakeTimers();
  events.length = 0;
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

/** The `$-id` a bound row's session has: one per row, so no two cells share one. */
const tmuxIdOf = (id: string): string => `$${id.slice('p302-'.length)}`;

/** The object a borrowed body runs against: what the bodies touch, and no more. */
function hostFor(id: string, bound: boolean, activity: { forget(id: string): void }): Record<string, unknown> {
  const tmuxId = tmuxIdOf(id);
  const host: Record<string, unknown> = {
    manifest: store,
    shuttingDown: false,
    disposed: false,
    idCaptureWatches: new Map<string, { cancel(): void }>(),
    liveIds: new Map<string, string>(bound ? [[id, tmuxId]] : []),
    byTmuxId: new Map<string, string>(bound ? [[tmuxId, id]] : []),
    attachHost: { detach: (): void => undefined },
    activity,
    resumeInPlace: { forget: (): void => undefined },
    hookServer: { revoke: (): void => undefined },
    queueCaptureSync: (): void => undefined,
    broadcastSessions: (): void => undefined,
    scheduleSessionsBroadcast: (): void => undefined,
    readEndTree: async (): Promise<null> => null,
    endAfterHangup: (): void => undefined,
    mustGetSession,
    releaseSessionResources
  };
  return host;
}

function newRow(status: SessionStatus): string {
  rowCount += 1;
  const id = `p302-${String(rowCount)}`;
  store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'shell',
    status,
    createdAt: rowCount,
    argv: ['/bin/zsh', '-l'],
    lastSeen: rowCount
  } as ManifestSessionRecord);
  return id;
}

/** `exited` events sent for this id. */
const exitedEvents = (id: string): number =>
  events.filter((e) => e[0] === EVT_STATUS_CHANGED && e[1] === id && e[2] === 'exited').length;

/** The row, its list and what the windows were told. */
function readingOf(id: string): string {
  const rec = disk.getSession(id);
  const pair = rec === undefined ? 'GONE' : `${rec.status},${rec.removedAt === undefined ? '-' : 'removed_at'}`;
  const lists = { manifest: disk };
  const managed = (listSessions.call(lists) as Session[]).some((s) => s.id === id);
  const past = (listRemovedSessions.call(lists) as Session[]).some((s) => s.id === id);
  const list = managed && past ? 'BOTH' : managed ? 'managed' : past ? 'Past' : 'neither';
  return `${pair} ${list} exited-sent=${String(exitedEvents(id))}`;
}

// ---------------------------------------------------------------------------
// The sweep over the borrowed bodies
// ---------------------------------------------------------------------------

type Writer = 'reap' | 'end';
type Order = 'end-then-remove' | 'remove-then-end';

const INTERVALS = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500] as const;
const STATUSES = ['running', 'idle', 'needs_input', 'unknown', 'exited', 'restorable'] as const;

/**
 * The cell readings, by letter. Each is the row on disk, its list, how many
 * `exited` events the windows were sent, what the Remove answered and what the
 * writer did.
 */
const LEGEND: Readonly<Record<string, string>> = {
  // The writer wrote `exited`; the Remove could not land (the row was live).
  X: 'exited,- managed exited-sent=1 remove=refused writer=resolved',
  // The writer wrote `exited` first; then the Remove tombstoned the ended row.
  P: 'discarded,removed_at Past exited-sent=1 remove=accepted writer=resolved',
  // The Remove landed first and the writer KEPT the tombstone: nothing written
  // over it and nothing sent. Also a reap that returned at its `exited` guard.
  K: 'discarded,removed_at Past exited-sent=0 remove=accepted writer=resolved',
  // The Remove landed first and the End was refused at its gate at the top.
  G: 'discarded,removed_at Past exited-sent=0 remove=accepted writer=refused'
};

/**
 * THE HAND-DERIVED TABLE: `writer order status binding` → one letter per
 * interval of {@link INTERVALS}. At the parent the K cells of a writer that
 * re-reads read `exited,removed_at managed exited-sent=1`, the defect.
 */
const EXPECTED: Readonly<Record<string, string>> = {
  // The reap, entered first; the Remove at the interval. A bound reap writes at
  // 60 ms, so the Remove before it meets a live row, or for `restorable` a row
  // it may tombstone, which the re-read then keeps.
  'reap end-then-remove running bound': 'XXXXXXXPPP',
  'reap end-then-remove running unbound': 'PPPPPPPPPP',
  'reap end-then-remove idle bound': 'XXXXXXXPPP',
  'reap end-then-remove idle unbound': 'PPPPPPPPPP',
  'reap end-then-remove needs_input bound': 'XXXXXXXPPP',
  'reap end-then-remove needs_input unbound': 'PPPPPPPPPP',
  'reap end-then-remove unknown bound': 'XXXXXXXPPP',
  'reap end-then-remove unknown unbound': 'PPPPPPPPPP',
  // `exited`: the reap returns at its guard, so the Remove lands on its own.
  'reap end-then-remove exited bound': 'KKKKKKKKKK',
  'reap end-then-remove exited unbound': 'KKKKKKKKKK',
  'reap end-then-remove restorable bound': 'KKKKKKKPPP',
  'reap end-then-remove restorable unbound': 'PPPPPPPPPP',
  // The Remove first; the reap entered at the interval, on a row that is
  // refused (live) or already tombstoned (ended), which is the monitor's
  // dead pane reported after a Remove.
  'reap remove-then-end running bound': 'XXXXXXXXXX',
  'reap remove-then-end running unbound': 'XXXXXXXXXX',
  'reap remove-then-end idle bound': 'XXXXXXXXXX',
  'reap remove-then-end idle unbound': 'XXXXXXXXXX',
  'reap remove-then-end needs_input bound': 'XXXXXXXXXX',
  'reap remove-then-end needs_input unbound': 'XXXXXXXXXX',
  'reap remove-then-end unknown bound': 'XXXXXXXXXX',
  'reap remove-then-end unknown unbound': 'XXXXXXXXXX',
  'reap remove-then-end exited bound': 'KKKKKKKKKK',
  'reap remove-then-end exited unbound': 'KKKKKKKKKK',
  'reap remove-then-end restorable bound': 'KKKKKKKKKK',
  'reap remove-then-end restorable unbound': 'KKKKKKKKKK',
  // The End, entered first; the Remove at the interval. A bound End writes at
  // 60 ms for a live row and at 30 ms for an ended one.
  'end end-then-remove running bound': 'XXXXXXXPPP',
  'end end-then-remove running unbound': 'PPPPPPPPPP',
  'end end-then-remove idle bound': 'XXXXXXXPPP',
  'end end-then-remove idle unbound': 'PPPPPPPPPP',
  'end end-then-remove needs_input bound': 'XXXXXXXPPP',
  'end end-then-remove needs_input unbound': 'PPPPPPPPPP',
  'end end-then-remove unknown bound': 'XXXXXXXPPP',
  'end end-then-remove unknown unbound': 'PPPPPPPPPP',
  'end end-then-remove exited bound': 'KKKKKKPPPP',
  'end end-then-remove exited unbound': 'PPPPPPPPPP',
  'end end-then-remove restorable bound': 'KKKKKKPPPP',
  'end end-then-remove restorable unbound': 'PPPPPPPPPP',
  // The Remove first; the End at the interval, refused at its gate when the
  // Remove was accepted (Phase 293's gate, at both builds).
  'end remove-then-end running bound': 'XXXXXXXXXX',
  'end remove-then-end running unbound': 'XXXXXXXXXX',
  'end remove-then-end idle bound': 'XXXXXXXXXX',
  'end remove-then-end idle unbound': 'XXXXXXXXXX',
  'end remove-then-end needs_input bound': 'XXXXXXXXXX',
  'end remove-then-end needs_input unbound': 'XXXXXXXXXX',
  'end remove-then-end unknown bound': 'XXXXXXXXXX',
  'end remove-then-end unknown unbound': 'XXXXXXXXXX',
  'end remove-then-end exited bound': 'GGGGGGGGGG',
  'end remove-then-end exited unbound': 'GGGGGGGGGG',
  'end remove-then-end restorable bound': 'GGGGGGGGGG',
  'end remove-then-end restorable unbound': 'GGGGGGGGGG'
};

/** The monitor stands in for nothing in the sweep: its forget is the reap's. */
const NO_ACTIVITY = { forget: (): void => undefined };

async function cell(writer: Writer, order: Order, status: SessionStatus, bound: boolean, at: number): Promise<string> {
  const id = newRow(status);
  const host = hostFor(id, bound, NO_ACTIVITY);
  let removeAnswer = 'not-fired';
  const remove = (): void => {
    try {
      removeSession.call(host, id);
      removeAnswer = 'accepted';
    } catch {
      removeAnswer = 'refused';
    }
  };
  let writerAnswer = 'resolved';
  const enter = (): Promise<void> =>
    (writer === 'reap' ? (reap.call(host, id, 0, undefined) as Promise<void>) : (end.call(host, id) as Promise<void>)).then(
      () => undefined,
      () => {
        writerAnswer = 'refused';
      }
    );
  let writing: Promise<void>;
  if (order === 'end-then-remove') {
    writing = enter();
    setTimeout(remove, at);
  } else {
    remove();
    writing = new Promise<void>((resolve) => {
      setTimeout(() => {
        void enter().then(resolve);
      }, at);
    });
  }
  await vi.advanceTimersByTimeAsync(at + CAPTURE_MS + HANGUP_MS + 500);
  await writing;
  return `${readingOf(id)} remove=${removeAnswer} writer=${writerAnswer}`;
}

describe.each([
  ['R302b', 'reap'],
  ['R302c', 'end']
] as const)('%s: a Remove landing at each interval around the %s', (rule, writer) => {
  for (const order of ['end-then-remove', 'remove-then-end'] as const) {
    for (const status of STATUSES) {
      for (const bound of [true, false]) {
        const key = `${writer} ${order} ${status} ${bound ? 'bound' : 'unbound'}`;
        it(`${rule}: ${key}`, async () => {
          const letters = EXPECTED[key];
          expect(letters, `the hand-derived table has a row for ${key}`).toHaveLength(INTERVALS.length);
          const read: string[] = [];
          for (const at of INTERVALS) read.push(`@${String(at)}ms ${await cell(writer, order, status, bound, at)}`);
          const want = INTERVALS.map((at, i) => `@${String(at)}ms ${LEGEND[letters?.[i] ?? '?'] ?? '(no letter)'}`);
          expect(read).toEqual(want);
        });
      }
    }
  }
});

describe('the table itself', () => {
  it('has one row for every writer, order, status and binding, and only legend letters', () => {
    expect(Object.keys(EXPECTED)).toHaveLength(2 * 2 * STATUSES.length * 2);
    for (const letters of Object.values(EXPECTED)) {
      expect(letters).toMatch(/^[XPKG]{10}$/);
    }
  });

  it('no interval is a tie with a write', () => {
    for (const at of INTERVALS) {
      expect(at).not.toBe(HANGUP_MS);
      expect(at).not.toBe(CAPTURE_MS + HANGUP_MS);
    }
  });
});

// ---------------------------------------------------------------------------
// The reap entered through a dead pane the REAL monitor reports after a Remove
// ---------------------------------------------------------------------------

/** One pane line in the order the monitor's list-panes format asks for. */
function deadPaneLine(tmuxId: string): string {
  return [tmuxId, '%1', '4242', '1', '1', '0', '', String(Math.floor(Date.now() / 1000)), '0', '0', '0', '0', '25000', 'zsh', ''].join('\t');
}

type Interleave = 'end and remove' | 'nothing' | 'remove alone';

/**
 * The hand-derived readings. An End at 1 ms writes `exited` at 61 ms and
 * unbinds the row; a Remove at 100 ms is accepted on it; the pane read the
 * tick began before both answers at 200 ms with the pane dead, and the reap
 * meets the tombstone with no binding and no await. At the parent it wrote
 * `exited` over it: `exited,removed_at managed exited-sent=2`.
 */
const MONITOR_EXPECTED: Readonly<Record<Interleave, string>> = {
  'end and remove': 'discarded,removed_at Past exited-sent=1 remove=accepted reaps=1',
  nothing: 'exited,- managed exited-sent=1 remove=not-fired reaps=1',
  'remove alone': 'exited,- managed exited-sent=1 remove=refused reaps=1'
};

describe('R302b: the reap entered through a dead pane the monitor reports after a Remove', () => {
  for (const status of ['running', 'idle', 'needs_input'] as const) {
    for (const interleave of ['end and remove', 'nothing', 'remove alone'] as const) {
      it(`R302b: ${status}, ${interleave} during the tick`, async () => {
        const id = newRow(status);
        const reaps: Promise<unknown>[] = [];
        const claudeDir = mkdtempSync(join(scratch, 'claude-'));
        // eslint-disable-next-line prefer-const
        let host: Record<string, unknown>;
        const monitor = new SessionActivityMonitor({
          sessions: () => activitySessions.call(host) as never,
          exec: (async (args: readonly string[]) => {
            if (args[0] !== 'list-panes') throw new Error(`unexpected ${String(args[0])}`);
            await wait(PANE_READ_MS);
            // The pane the tick asked about, which the End has hung up meanwhile:
            // a pane kept by `remain-on-exit` still answers, and answers dead.
            return deadPaneLine(tmuxIdOf(id));
          }) as never,
          run: async () => '',
          readProc: async () => null,
          readWitness: async () => ({ found: false, stat: '', ppid: null }),
          readCommand: async () => null,
          readChildren: async () => [],
          claudeSessionsDir: claudeDir,
          onStatus: () => undefined,
          onActivity: () => undefined,
          onDead: (sid, code, signal) => {
            reaps.push(reap.call(host, sid, code, signal) as Promise<unknown>);
          },
          now: () => Date.now()
        });
        host = hostFor(id, true, monitor);
        let removeAnswer = 'not-fired';
        const remove = (): void => {
          try {
            removeSession.call(host, id);
            removeAnswer = 'accepted';
          } catch {
            removeAnswer = 'refused';
          }
        };
        const ticking = monitor.tick();
        let ending: Promise<unknown> = Promise.resolve();
        if (interleave === 'end and remove') {
          setTimeout(() => {
            ending = end.call(host, id) as Promise<unknown>;
          }, 1);
        }
        if (interleave !== 'nothing') setTimeout(remove, 100);
        await vi.advanceTimersByTimeAsync(PANE_READ_MS + CAPTURE_MS + HANGUP_MS + 500);
        await ticking;
        await ending;
        await Promise.all(reaps);
        expect(`${readingOf(id)} remove=${removeAnswer} reaps=${String(reaps.length)}`).toBe(MONITOR_EXPECTED[interleave]);
      });
    }
  }
});
