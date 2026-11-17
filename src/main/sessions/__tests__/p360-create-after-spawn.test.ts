/**
 * Phase 360 — a create whose later step fails answers the session it started
 * (build/p360/SPEC.md §2.1, D1 to D9).
 *
 * At the parent, `de9ea8f2`, every fault planted after the spawn's answer made
 * `createLocalSession` answer a failure while its session ran: the sheet stayed
 * open with the error, and a second press of Create started a second session.
 * This file is that matrix at HEAD. Each row plants a fault after the spawn
 * (the storm row plants one at every step at once) and asks five things:
 *
 *   1. the create RESOLVES with the session the spawn made: the row's id, and
 *      the name tmux applied (`<name>-2`, the fake's dedupe), even when the row
 *      could not record that name;
 *   2. the spawn ran once;
 *   3. nothing was ended: no kill reached tmux, and the row is still in the
 *      file, running;
 *   4. the log holds exactly one `sessions` warning per step that failed, in
 *      that step's own words, naming the session and the error's code;
 *   5. no line holds the error's message.
 *
 * The controls the guards must not move: a spawn that fails still answers its
 * own failure and removes its row, and a create on another machine that throws
 * still answers its failure and releases its folders. The expected words are
 * written here from SPEC §5, never read from the code.
 *
 * HOW IT IS DRIVEN (357's method, ./p357-stopped-list.test.ts). The store is
 * REAL: a `ManifestStore` over a scratch file. The session core's own
 * `listSessions`, `listProjects` and `broadcastSessions` are borrowed off
 * `GmuxCore.prototype` onto a host holding that store, with the REAL tray feed
 * installed on it, so a broadcast reads both lists as it does in the app. The
 * REAL `broadcastEvent` and `postDurabilityNotice` run over one fake window
 * whose `send` can be made to throw. Every fault is planted INSIDE the fake
 * spawn, so it lands after the row was written: through the store's own seam
 * (`setManifestFaultHook`, better-sqlite3's own `SqliteError` class at the next
 * call of the named operation), a REAL `SQLITE_BUSY` from a second connection
 * holding the write lock, a window `send` that throws, and a conversation watch
 * that throws.
 *
 * HERMETIC. Every file is under one temporary folder. tmux is a recorder, so no
 * server is contacted. The launch context scan, which reads an agent's
 * configuration folders, is held; the agent table names no folder of a real
 * home; no agent runs, not even for a version, and no agent store is read.
 * Nothing here reads a person's manifest.
 */

import Database from 'better-sqlite3';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateSessionInput, Session } from '@shared/types';

/** Planted in every error's message, so a line that carries one is found. */
const MARK = 'p360-planted-message-never-logged';

const root = mkdtempSync(join(tmpdir(), 'tortie-p360-create-'));
const userData = join(root, 'user-data');
mkdirSync(userData, { recursive: true });
const project = join(root, 'project');
mkdirSync(project, { recursive: true });
// A path for the codex row to resolve to. Never run: `startAnyway` skips the
// one read of it, and every resolve below is the fake's.
mkdirSync(join(root, 'bin'), { recursive: true });
const codexBin = join(root, 'bin', 'codex');
writeFileSync(codexBin, '#!/bin/sh\nexit 0\n');
chmodSync(codexBin, 0o755);

/** The one fake window, and the sends it is told to refuse. */
const win = vi.hoisted(() => ({
  sends: [] as string[],
  /** A channel whose send throws; a `kind` narrows a notice channel to one notice. */
  throwOn: [] as Array<{ channel: string; kind?: string }>,
  throwEvery: false
}));

vi.mock('electron', () => ({
  app: {
    isReady: () => true,
    isPackaged: false,
    getPath: () => userData,
    getAppPath: () => process.cwd(),
    getVersion: () => '0.0.0-p360'
  },
  BrowserWindow: {
    getAllWindows: () => [
      {
        isDestroyed: () => false,
        webContents: {
          send: (channel: string, payload?: { kind?: unknown }) => {
            win.sends.push(channel);
            const refused =
              win.throwEvery ||
              win.throwOn.some(
                (rule) =>
                  rule.channel === channel && (rule.kind === undefined || payload?.kind === rule.kind)
              );
            if (refused) {
              throw new Error(`Render frame was disposed before WebFrameMain could be accessed ${MARK}`);
            }
          }
        }
      }
    ]
  },
  dialog: { showErrorBox: () => undefined }
}));

/** What the fake tmux was asked to do. */
const tm = vi.hoisted(() => ({
  spawned: 0,
  killed: [] as string[],
  spawnFails: null as null | Error,
  /** Runs inside the spawn, after the row was written: where every fault is planted. */
  afterSpawn: null as null | (() => void),
  /** Runs while the create awaits the option mirror, the tail's one window for another writer. */
  duringMirror: null as null | (() => void),
  envProbe: null as null | { values: Record<string, string>; missing: string[]; probeFailed: boolean }
}));

vi.mock('../../tmux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux')>();
  return {
    ...actual,
    installUserPath: () => Promise.resolve('/usr/bin:/bin'),
    resolveBinary: () => Promise.resolve(codexBin),
    createSession: (input: { displayName: string }) => {
      tm.spawned += 1;
      if (tm.spawnFails !== null) return Promise.reject(tm.spawnFails);
      const n = tm.spawned;
      tm.afterSpawn?.();
      return Promise.resolve({
        sessionId: `$${String(n)}`,
        tmuxName: `${input.displayName}-2`,
        createdAt: 0,
        attached: false,
        windows: 1,
        panePid: 40_000 + n
      });
    },
    setSessionOption: (_target: string, option: string) => {
      if (option === '@gmux-agent') tm.duringMirror?.();
      return Promise.resolve();
    },
    killSession: (target: string) => {
      tm.killed.push(target);
      return Promise.resolve();
    },
    execTmux: (args: string[]) => {
      if (args.includes('kill-session') || args.includes('kill-server')) tm.killed.push(args.join(' '));
      return Promise.resolve('');
    },
    loginShellEnvFor: () =>
      Promise.resolve(tm.envProbe ?? { values: {}, missing: [], probeFailed: false })
  };
});

// The launch context walks an agent's configuration folders; nothing here may
// read them. Each ask is counted by session id (the fix round's D21).
const snap = vi.hoisted(() => ({ calls: [] as string[] }));
vi.mock('../../context/snapshot', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../context/snapshot')>()),
  recordLaunchContext: (_sink: unknown, input: { sessionId: string }) => {
    snap.calls.push(input.sessionId);
  }
}));

const settingsState = vi.hoisted(() => ({ shared: [] as string[] }));
vi.mock('../../settings/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../settings/store')>()),
  getSettings: () => ({
    envPassthrough: {},
    envPassthroughShared: [...settingsState.shared],
    launchDefaults: {},
    captureDefaults: {}
  })
}));

// The merged table's rows, looking in no folder of a real home.
vi.mock('../../config/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/store')>();
  const row = (id: string): ReturnType<typeof actual.agentEntry> => {
    const entry = actual.agentEntry(id);
    return entry === null ? null : { ...entry, extraProbeDirs: [], storeDirs: [] };
  };
  return {
    ...actual,
    agentEntry: row,
    launchableAgentEntry: (id: string) => {
      const entry = row(id);
      return entry === null || !entry.launchable || entry.launch === null
        ? null
        : (entry as ReturnType<typeof actual.launchableAgentEntry>);
    }
  };
});

/** Every line written through `getLog`, by scope, with its fields. */
const logged = vi.hoisted(() => ({
  lines: [] as Array<{ scope: string; level: string; msg: string; fields: Record<string, unknown> | null }>
}));

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  return {
    ...real,
    getLog: (scope: string) => {
      const inner = real.getLog(scope);
      const keep =
        (level: string, write: (msg: string, fields?: Record<string, unknown>) => void) =>
        (msg: string, fields?: Record<string, unknown>) => {
          logged.lines.push({ scope, level, msg, fields: fields ?? null });
          write(msg, fields);
        };
      return {
        error: keep('error', inner.error),
        warn: keep('warn', inner.warn),
        info: keep('info', inner.info),
        debug: keep('debug', inner.debug)
      };
    }
  };
});

/** SpecStory's sentence for a machine with no CLI: a capture the create declines. */
const DECLINED = 'SpecStory capture is off for this session: no SpecStory CLI was found.';
vi.mock('../../specstory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../specstory')>()),
  wrapForCapture: () => Promise.resolve({ argv: null, record: null, declined: DECLINED })
}));

/** The create on another machine, answered by the row under test. */
const remote = vi.hoisted(() => ({
  calls: 0,
  answer: null as null | (() => Promise<Session>)
}));
vi.mock('../../machines/remote-sessions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../machines/remote-sessions')>()),
  remoteCreate: () => {
    remote.calls += 1;
    return remote.answer === null ? Promise.reject(new Error('no answer planted')) : remote.answer();
  }
}));

/** The tab writes a create on another machine makes, counted and run for real. */
const rehome = vi.hoisted(() => ({ opened: 0, released: 0 }));
vi.mock('../../machines/remote-rehome', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../machines/remote-rehome')>();
  return {
    ...actual,
    openTabsForRemoteCreate: (...args: Parameters<typeof actual.openTabsForRemoteCreate>) => {
      rehome.opened += 1;
      return actual.openTabsForRemoteCreate(...args);
    },
    releaseFoldersAfterFailedRemoteCreate: (
      ...args: Parameters<typeof actual.releaseFoldersAfterFailedRemoteCreate>
    ) => {
      rehome.released += 1;
      return actual.releaseFoldersAfterFailedRemoteCreate(...args);
    }
  };
});

const { GmuxCore } = await import('../core');
const { ManifestStore, setManifestFaultHook } = await import('../../manifest/store');
const { installBlockedFeed, resetBlockedFeedForTests } = await import('../../tray/blocked-feed');
const { resetDurabilityNoticesForTests, takePendingNotices } = await import('../../notice');
const createLocal = await import('../create-local');
const { createLocalSession } = createLocal;

type Store = InstanceType<typeof ManifestStore>;
type Deps = Parameters<typeof createLocalSession>[1];

/** The core's real bodies, borrowed. Private members are on the prototype at run time. */
const proto = GmuxCore.prototype as unknown as {
  listSessions(this: unknown): Session[];
  listProjects(this: unknown): unknown[];
  broadcastSessions(this: unknown): void;
};

/** SPEC §5, written out: the words each step's line is written under. */
const WORDS = {
  record: 'the session started, and its tmux name and process id were not recorded',
  'login-notice':
    'the session started, and the notice that it fell back to the default login was not sent',
  'env-notice':
    'the session started, and the notice naming a shell variable it did not get was not sent',
  'id-capture': 'the session started, and its conversation id is not being watched for yet',
  'capture-notice': 'the session started, and the notice that capture was declined was not sent',
  broadcast: 'the session started, and the windows were not sent the new session list',
  'read-back':
    'the session started, and its row could not be read back, so the create answers the row it wrote'
} as const;
type Step = keyof typeof WORDS;
const STEP_OF = new Map<string, Step>(
  (Object.entries(WORDS) as Array<[Step, string]>).map(([step, words]) => [words, step])
);

const CORRUPT = { code: 'SQLITE_CORRUPT', message: `database disk image is malformed ${MARK}` };
const IOERR = { code: 'SQLITE_IOERR_READ', message: `disk I/O error ${MARK}` };
const BUSY = { code: 'SQLITE_BUSY', message: `database is locked ${MARK}` };
/** What each planted SQLite error reaches the create as: a latch answers the stopped refusal. */
const CODE_AT_CREATE: Record<string, string> = {
  SQLITE_CORRUPT: 'MANIFEST_STOPPED',
  SQLITE_IOERR_READ: 'SQLITE_IOERR_READ',
  SQLITE_BUSY: 'SQLITE_BUSY'
};

type Operation = 'updateSession' | 'listSessions' | 'listProjects' | 'getSession';

interface Plant {
  /** Each throws once, at the first call of its operation after the spawn. */
  readonly hooks?: ReadonlyArray<{ operation: Operation; code: string; message: string }>;
  /** A second connection holds the write lock from the spawn until the create answers. */
  readonly realBusy?: boolean;
  readonly sendThrows?: ReadonlyArray<{ channel: string; kind?: string }>;
  readonly sendThrowsEverywhere?: boolean;
  /** What the conversation watch throws, once. */
  readonly idCaptureThrows?: { value: unknown };
}

interface World {
  readonly agent?: 'shell' | 'codex';
  /** A login name nobody added, so the create falls back and says so. */
  readonly login?: string;
  /** A shell variable the person named and the login shell does not have. */
  readonly envMissing?: boolean;
  readonly capture?: boolean;
}

interface RowAfter {
  status: string;
  tmux_name: string;
  pane_pid: number | null;
}

interface Outcome {
  readonly name: string;
  readonly session: Session | null;
  readonly error: unknown;
  readonly spawned: number;
  readonly killed: readonly string[];
  readonly rows: readonly (RowAfter & { id: string })[];
  readonly deps: Deps;
}

let stores: Store[] = [];

beforeEach(() => {
  win.sends.length = 0;
  win.throwOn = [];
  win.throwEvery = false;
  tm.spawned = 0;
  tm.killed.length = 0;
  tm.spawnFails = null;
  tm.afterSpawn = null;
  tm.duringMirror = null;
  tm.envProbe = null;
  settingsState.shared = [];
  logged.lines.length = 0;
  remote.calls = 0;
  remote.answer = null;
  rehome.opened = 0;
  rehome.released = 0;
  snap.calls.length = 0;
  // A notice reaches a window only once a renderer is listening.
  resetDurabilityNoticesForTests();
  takePendingNotices();
  for (const method of ['error', 'warn', 'log', 'info', 'debug'] as const) {
    vi.spyOn(console, method).mockImplementation(() => undefined);
  }
});

afterEach(() => {
  setManifestFaultHook(null);
  resetBlockedFeedForTests();
  // A store stopped with its file fine closes nothing, by design (357 D10).
  for (const store of stores) store.close();
  stores = [];
  vi.restoreAllMocks();
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A fresh store, and a host whose broadcast is the core's own, with the tray feed on it. */
function world(): { store: Store; dbPath: string; broadcastSessions: () => void } {
  const dir = mkdtempSync(join(root, 'row-'));
  const dbPath = join(dir, 'manifest.db');
  const store = new ManifestStore(dbPath);
  stores.push(store);
  store.upsertProject({ id: 'p1', name: 'project', path: project } as never);
  const host: Record<string, unknown> = {
    manifest: store,
    lastCleanList: null,
    lastCleanProjects: null,
    onSessionsBroadcast: null
  };
  host.listSessions = () => proto.listSessions.call(host);
  host.listProjects = () => proto.listProjects.call(host);
  host.broadcastSessions = () => proto.broadcastSessions.call(host);
  installBlockedFeed(host as never);
  return { store, dbPath, broadcastSessions: () => proto.broadcastSessions.call(host) };
}

function depsOf(store: Store, broadcastSessions: () => void, plant: Plant): Deps {
  let idThrow = plant.idCaptureThrows;
  return {
    manifest: store,
    hookServer: {} as never,
    liveIds: new Map<string, string>(),
    byTmuxId: new Map<string, string>(),
    createsInFlight: new Map<string, number>(),
    broadcastSessions,
    startIdCapture: () => {
      if (idThrow === undefined) return;
      const planted = idThrow.value;
      idThrow = undefined;
      throw planted;
    },
    cachedAgentVersion: () => null,
    // Phase 368's ninth member: no pane has been fitted, so the create sends no size.
    lastFittedSize: () => null
  };
}

/** Every row in the file, read through a connection of this file's own. */
function rowsIn(dbPath: string): Array<RowAfter & { id: string }> {
  const db = new Database(dbPath, { readonly: true });
  try {
    return db.prepare('SELECT id, status, tmux_name, pane_pid FROM sessions').all() as Array<
      RowAfter & { id: string }
    >;
  } finally {
    db.close();
  }
}

/** One create on this Mac, with `plant` armed inside the spawn. */
async function createHere(name: string, w: World, plant: Plant): Promise<Outcome> {
  const { store, dbPath, broadcastSessions } = world();
  if (w.envMissing === true) {
    settingsState.shared = ['P360_TEST_UNSET'];
    tm.envProbe = { values: {}, missing: ['P360_TEST_UNSET'], probeFailed: false };
  }
  const held: { lock: Database.Database | null } = { lock: null };
  const pending = [...(plant.hooks ?? [])];
  let armed = false;
  tm.afterSpawn = () => {
    armed = true;
    if (plant.realBusy === true) {
      held.lock = new Database(dbPath);
      held.lock.exec('BEGIN IMMEDIATE');
    }
    win.throwOn = [...(plant.sendThrows ?? [])];
    win.throwEvery = plant.sendThrowsEverywhere === true;
  };
  setManifestFaultHook((operation) => {
    if (!armed) return;
    const at = pending.findIndex((fault) => fault.operation === operation);
    if (at < 0) return;
    const [fault] = pending.splice(at, 1);
    if (fault !== undefined) throw new Database.SqliteError(fault.message, fault.code);
  });
  const deps = depsOf(store, broadcastSessions, plant);
  const agent = w.agent ?? 'shell';
  const input: CreateSessionInput = {
    name,
    projectPath: project,
    agent: agent as CreateSessionInput['agent'],
    ...(agent === 'codex' ? { startAnyway: true } : {}),
    ...(w.login !== undefined ? { login: w.login } : {}),
    ...(w.capture === true ? { capture: true } : {})
  };
  let session: Session | null = null;
  let error: unknown = null;
  try {
    session = await createLocalSession(input, deps);
  } catch (err) {
    error = err;
  } finally {
    setManifestFaultHook(null);
    win.throwOn = [];
    win.throwEvery = false;
    if (held.lock !== null) {
      held.lock.exec('ROLLBACK');
      held.lock.close();
    }
  }
  return {
    name,
    session,
    error,
    spawned: tm.spawned,
    killed: [...tm.killed],
    rows: rowsIn(dbPath),
    deps
  };
}

/** The `sessions` warnings written in a step's words, in the order they were written. */
function failureLines(): Array<{ step: Step | undefined; fields: Record<string, unknown> | null }> {
  return logged.lines
    .filter((line) => line.scope === 'sessions' && line.level === 'warn' && STEP_OF.has(line.msg))
    .map((line) => ({ step: STEP_OF.get(line.msg), fields: line.fields }));
}

/** No line, in any scope, carries a planted message or SQLite's own words for the real lock. */
function expectNoMessageLogged(): void {
  const text = JSON.stringify(logged.lines);
  expect(text).not.toContain(MARK);
  expect(text).not.toContain('database is locked');
}

/**
 * The create answered the session the spawn made, ended nothing, kept its
 * row, and wrote exactly one line per failed step: `failed` in code order,
 * each with the code it should name.
 */
function expectAnswered(
  out: Outcome,
  failed: ReadonlyArray<readonly [Step, string]>,
  row: 'recorded' | 'predicted'
): void {
  expect(out.error).toBeNull();
  const session = out.session;
  expect(session).not.toBeNull();
  if (session === null) return;
  // 1. The session the spawn made, by its row's id and by the name tmux applied.
  expect(out.rows.map((r) => r.id)).toEqual([session.id]);
  expect(session.tmuxName).toBe(`${out.name}-2`);
  expect(session.name).toBe(out.name);
  expect(session.status).toBe('running');
  // 2 and 3. One spawn, no kill, the row still there and running, the binding kept.
  expect(out.spawned).toBe(1);
  expect(out.killed).toEqual([]);
  const [kept] = out.rows;
  expect(kept?.status).toBe('running');
  if (row === 'recorded') {
    expect(kept?.tmux_name).toBe(`${out.name}-2`);
    expect(kept?.pane_pid).toBe(40_001);
  } else {
    // D3: a record write that failed leaves the predicted name and no pid.
    expect(kept?.tmux_name).toBe(out.name);
    expect(kept?.pane_pid).toBeNull();
  }
  expect(out.deps.liveIds.get(session.id)).toBe('$1');
  expect(out.deps.byTmuxId.get('$1')).toBe(session.id);
  expect(out.deps.createsInFlight.size).toBe(0);
  // 4. One line per failed step, in its words, naming the session and the code.
  expect(failureLines()).toEqual(
    failed.map(([step, code]) => ({ step, fields: { sessionId: session.id, code } }))
  );
  // 5. And never a message.
  expectNoMessageLogged();
}

// ---------------------------------------------------------------------------
// §2.1 at HEAD: each step after the spawn made to throw in turn
// ---------------------------------------------------------------------------

describe('a create on this Mac answers the session its spawn made, whatever fails after it', () => {
  it('the control: nothing fails, and nothing is logged', async () => {
    const out = await createHere('p360-L0', {}, {});
    expectAnswered(out, [], 'recorded');
    expect(win.sends.filter((c) => c === 'sessions:changed')).toHaveLength(1);
    // The launch context is asked for once, as it always was.
    expect(snap.calls).toEqual([out.session?.id]);
  });

  const DATABASE: ReadonlyArray<readonly [Operation, typeof CORRUPT, ReadonlyArray<Step>, 'recorded' | 'predicted']> = [
    // The record write. A latch there stops the list, so the read-back refuses too.
    ['updateSession', CORRUPT, ['record', 'read-back'], 'predicted'],
    ['updateSession', IOERR, ['record'], 'predicted'],
    ['updateSession', BUSY, ['record'], 'predicted'],
    // The broadcast's session read. A latch there is D19's: it answers the last
    // clean list and the read-back meets the stopped list (entry item 3).
    ['listSessions', CORRUPT, ['read-back'], 'recorded'],
    ['listSessions', IOERR, ['broadcast'], 'recorded'],
    ['listSessions', BUSY, ['broadcast'], 'recorded'],
    // The tray feed's project read, inside the same broadcast.
    ['listProjects', CORRUPT, ['read-back'], 'recorded'],
    ['listProjects', IOERR, ['broadcast'], 'recorded'],
    ['listProjects', BUSY, ['broadcast'], 'recorded'],
    // The read-back itself.
    ['getSession', CORRUPT, ['read-back'], 'recorded'],
    ['getSession', IOERR, ['read-back'], 'recorded'],
    ['getSession', BUSY, ['read-back'], 'recorded']
  ];

  for (const [operation, fault, steps, row] of DATABASE) {
    it(`${operation} meets ${fault.code}`, async () => {
      const name = `p360-${operation}-${fault.code.replace('SQLITE_', '')}`;
      const out = await createHere(name, {}, { hooks: [{ operation, ...fault }] });
      const code = CODE_AT_CREATE[fault.code] ?? fault.code;
      expectAnswered(out, steps.map((step) => [step, code] as const), row);
    });
  }

  it('the record write meets a REAL SQLITE_BUSY: another connection holds the write lock', async () => {
    const out = await createHere('p360-real-busy', {}, { realBusy: true });
    expectAnswered(out, [['record', 'SQLITE_BUSY']], 'predicted');
  }, 30_000);

  it('the window cannot be sent the session list', async () => {
    const out = await createHere('p360-send-sessions', {}, {
      sendThrows: [{ channel: 'sessions:changed' }]
    });
    expectAnswered(out, [['broadcast', 'Error']], 'recorded');
  });

  it('the window cannot be sent the notice naming a shell variable the session did not get', async () => {
    const out = await createHere('p360-send-env', { envMissing: true }, {
      sendThrows: [{ channel: 'scrollback:notice', kind: 'env-unresolved' }]
    });
    expectAnswered(out, [['env-notice', 'Error']], 'recorded');
  });

  it('the window cannot be sent the notice that the session fell back to the default login', async () => {
    const out = await createHere('p360-send-login', { agent: 'codex', login: 'nobody-added-this' }, {
      sendThrows: [{ channel: 'scrollback:notice', kind: 'login-fell-back' }]
    });
    expectAnswered(out, [['login-notice', 'Error']], 'recorded');
  });

  it('the window cannot be sent the notice that capture was declined', async () => {
    const out = await createHere('p360-send-capture', { agent: 'codex', capture: true }, {
      sendThrows: [{ channel: 'capture:notice' }]
    });
    expectAnswered(out, [['capture-notice', 'Error']], 'recorded');
    // The decline itself is still said, as it always was.
    expect(logged.lines.some((line) => line.msg === `${DECLINED} (session "p360-send-capture")`)).toBe(true);
  });

  it('the read-back is the answer when it reads: a status written while the create was out is what it answers', async () => {
    // The option mirror is awaited, so another writer (the activity monitor, a
    // rename) can move the row before the read-back. The create answers what
    // the file holds then, with the name tmux applied.
    tm.duringMirror = () => {
      const [only] = stores.at(-1)?.listSessions() ?? [];
      if (only !== undefined) stores.at(-1)?.setStatus(only.id, 'idle');
    };
    const out = await createHere('p360-read-back', {}, {});
    expect(out.error).toBeNull();
    expect(out.session?.status).toBe('idle');
    expect(out.session?.tmuxName).toBe('p360-read-back-2');
    expect(out.rows.map((r) => r.status)).toEqual(['idle']);
    expect(failureLines()).toEqual([]);
  });

  it('the option mirror fails with no value at all: the create still answers its session', async () => {
    // The fix round (the attack lens's plant LT3). The mirror's catch read
    // `(err as Error).message`, which throws for a failure that carries no
    // value, and that throw left the catch and answered a failure for the
    // running session, at the parent and at the build alike.
    tm.duringMirror = () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- the shape under test
      throw undefined;
    };
    const out = await createHere('p360-mirror-undefined', {}, {});
    expectAnswered(out, [], 'recorded');
    expect(
      logged.lines.some(
        (line) => line.scope === 'sessions' && line.msg === 'could not mirror metadata into tmux options: undefined'
      )
    ).toBe(true);
  });

  it('the conversation watch will not start (codex, a harvesting agent)', async () => {
    const out = await createHere('p360-id-capture', { agent: 'codex' }, {
      idCaptureThrows: { value: new Error(`the conversation watch could not start ${MARK}`) }
    });
    expectAnswered(out, [['id-capture', 'Error']], 'recorded');
  });

  it('the storm: every step after the spawn fails at once, and each says so once', async () => {
    const out = await createHere(
      'p360-storm',
      { agent: 'codex', login: 'nobody-added-this', envMissing: true, capture: true },
      {
        hooks: [
          { operation: 'updateSession', ...IOERR },
          { operation: 'getSession', ...IOERR }
        ],
        sendThrowsEverywhere: true,
        idCaptureThrows: { value: new TypeError(`watch ${MARK}`) }
      }
    );
    expectAnswered(
      out,
      [
        ['record', 'SQLITE_IOERR_READ'],
        ['login-notice', 'Error'],
        ['env-notice', 'Error'],
        ['id-capture', 'TypeError'],
        ['capture-notice', 'Error'],
        ['broadcast', 'Error'],
        ['read-back', 'SQLITE_IOERR_READ']
      ],
      'predicted'
    );
  });
});

// ---------------------------------------------------------------------------
// The fix round (D21, lens A's minor): the launch context after a failed record
// ---------------------------------------------------------------------------

describe('the launch context is asked for only when the record write was made', () => {
  it('a record write that could not be made (stopped, I/O, busy) asks for no launch context: the store has just refused a write', async () => {
    for (const fault of [CORRUPT, IOERR, BUSY]) {
      snap.calls.length = 0;
      const out = await createHere(`p360-snap-${fault.code}`, {}, { hooks: [{ operation: 'updateSession', ...fault }] });
      expect(out.error).toBeNull();
      expect(out.session).not.toBeNull();
      expect(snap.calls).toEqual([]);
    }
  });

  it('a REAL held write lock: the create answers its session and asks for no launch context, whose own write would wait out the lock again', async () => {
    const out = await createHere('p360-snap-real-busy', {}, { realBusy: true });
    expectAnswered(out, [['record', 'SQLITE_BUSY']], 'predicted');
    expect(snap.calls).toEqual([]);
  }, 30_000);

  it('the record write made and a later step failing: the launch context is asked for once, as it always was', async () => {
    const out = await createHere('p360-snap-later', {}, { hooks: [{ operation: 'getSession', ...IOERR }] });
    expectAnswered(out, [['read-back', 'SQLITE_IOERR_READ']], 'recorded');
    expect(snap.calls).toEqual([out.session?.id]);
  });
});

describe('the line names the kind of failure in one word and never its text', () => {
  const SHAPES: ReadonlyArray<readonly [string, unknown, string]> = [
    ['an errno-style code', Object.assign(new Error(`open failed ${MARK}`), { code: 'EACCES' }), 'EACCES'],
    ['a TypeError, by its name', new TypeError(`no such member ${MARK}`), 'TypeError'],
    [
      'a code that is text rather than a code',
      Object.assign(new Error(`x ${MARK}`), { code: `the folder /Users/someone ${MARK}` }),
      'Error'
    ],
    [
      'a name that is text, with no code',
      Object.assign(new Error(`x ${MARK}`), { name: `a sentence ${MARK}` }),
      'unknown'
    ],
    ['a thrown string', `a bare string ${MARK}`, 'unknown'],
    ['a thrown null', null, 'unknown'],
    // The fix round (the attack lens's plant LT4): reading the code runs a
    // getter, and a getter that throws inside the guard's catch used to carry
    // that throw out and answer a failure for the running session.
    [
      'an error whose code cannot be read: its getter throws',
      Object.defineProperty(new Error(`x ${MARK}`), 'code', {
        get(): never {
          throw new Error(`the getter ${MARK}`);
        }
      }),
      'unreadable'
    ]
  ];
  for (const [what, value, code] of SHAPES) {
    it(what, async () => {
      const out = await createHere('p360-code', { agent: 'codex' }, { idCaptureThrows: { value } });
      expectAnswered(out, [['id-capture', code]], 'recorded');
    });
  }
});

// ---------------------------------------------------------------------------
// D9: the local create's remote branch, after `remoteCreate` answered
// ---------------------------------------------------------------------------

/** A session `remoteCreate` answers, with no list behind it. */
function remoteSession(name: string): Session {
  return {
    id: 'p360-remote-row',
    name,
    tmuxName: name,
    projectPath: '/far/proj',
    cwd: '/far/proj',
    agent: 'codex',
    status: 'running',
    createdAt: 1_000,
    machine: { id: 'popos', label: 'popos', color: 'blue', answering: true, canRestore: false } as never
  } as Session;
}

async function createThere(name: string, throwOn: ReadonlyArray<{ channel: string }>): Promise<{
  session: Session | null;
  error: unknown;
  made: Session;
}> {
  const { store, broadcastSessions } = world();
  const made = remoteSession(name);
  remote.answer = () => {
    // The far session exists from here on: the same moment the local fault lands.
    win.throwOn = [...throwOn];
    return Promise.resolve(made);
  };
  const input: CreateSessionInput = {
    name,
    projectPath: '/far/proj',
    machineId: 'popos',
    projectMachineId: 'popos',
    agent: 'codex' as CreateSessionInput['agent'],
    capture: true
  };
  let session: Session | null = null;
  let error: unknown = null;
  try {
    session = await createLocalSession(input, depsOf(store, broadcastSessions, {}));
  } catch (err) {
    error = err;
  } finally {
    win.throwOn = [];
  }
  return { session, error, made };
}

describe('a create on another machine that answered is answered, whatever this Mac fails at after it', () => {
  it('the control: the capture refusal is said, the list is sent, nothing else is logged', async () => {
    const out = await createThere('p360-far', []);
    expect(out.error).toBeNull();
    expect(out.session).toBe(out.made);
    expect(remote.calls).toBe(1);
    expect(rehome.opened).toBe(1);
    expect(rehome.released).toBe(0);
    expect(win.sends.filter((c) => c === 'capture:notice')).toHaveLength(1);
    expect(win.sends.filter((c) => c === 'sessions:changed')).toHaveLength(1);
    expect(
      logged.lines.some((line) => line.scope === 'sessions' && line.msg.endsWith('(session "p360-far")'))
    ).toBe(true);
    expect(failureLines()).toEqual([]);
  });

  it('the capture notice and the broadcast both throw: the create answers the session', async () => {
    const out = await createThere('p360-far-throws', [
      { channel: 'capture:notice' },
      { channel: 'sessions:changed' }
    ]);
    expect(out.error).toBeNull();
    expect(out.session).toBe(out.made);
    expect(remote.calls).toBe(1);
    expect(rehome.opened).toBe(1);
    expect(rehome.released).toBe(0);
    expect(failureLines()).toEqual([
      { step: 'capture-notice', fields: { sessionId: 'p360-remote-row', code: 'Error' } },
      { step: 'broadcast', fields: { sessionId: 'p360-remote-row', code: 'Error' } }
    ]);
    expectNoMessageLogged();
  });
});

// ---------------------------------------------------------------------------
// The controls: before the point of no return a failure is still true
// ---------------------------------------------------------------------------

describe('a failure before the spawn answered is still answered as a failure', () => {
  it('a spawn that fails answers its own error and removes the row it wrote', async () => {
    const refused = new Error(`tmux could not start the session ${MARK}`);
    tm.spawnFails = refused;
    const out = await createHere('p360-spawn-fails', {}, {});
    expect(out.session).toBeNull();
    expect(out.error).toBe(refused);
    expect(out.spawned).toBe(1);
    expect(out.rows).toEqual([]);
    expect(out.deps.createsInFlight.size).toBe(0);
    expect(failureLines()).toEqual([]);
  });

  it('a create on another machine that throws answers its error and releases its folders', async () => {
    const { store, broadcastSessions } = world();
    const refused = new Error(`that machine refused ${MARK}`);
    remote.answer = () => Promise.reject(refused);
    await expect(
      createLocalSession(
        {
          name: 'p360-far-refused',
          projectPath: '/far/proj',
          machineId: 'popos',
          projectMachineId: 'popos',
          agent: 'codex' as CreateSessionInput['agent'],
          capture: true
        },
        depsOf(store, broadcastSessions, {})
      )
    ).rejects.toBe(refused);
    expect(rehome.released).toBe(1);
    expect(rehome.opened).toBe(0);
    expect(win.sends).not.toContain('capture:notice');
    expect(failureLines()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The words and the order
// ---------------------------------------------------------------------------

describe('the words each step logs under, and the fault points', () => {
  it('AFTER_SPAWN_WORDS is SPEC §5 word for word, and frozen', () => {
    expect(createLocal.AFTER_SPAWN_WORDS).toEqual(WORDS);
    expect(Object.isFrozen(createLocal.AFTER_SPAWN_WORDS)).toBe(true);
  });

  it('every fault point keeps its name and its place (npm run smoke:fault drives them by name)', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../create-local.ts'), 'utf8');
    const points = [
      'create.before-declaration',
      'create.after-declaration',
      'create.after-spawn',
      'create.after-launch-record',
      'create.after-identity-stamp'
    ];
    const at = points.map((point) => source.indexOf(`faultPoint('${point}')`));
    for (const [i, point] of points.entries()) {
      expect(source.split(`faultPoint('${point}')`).length - 1, point).toBe(1);
      if (i > 0) expect(at[i], point).toBeGreaterThan(at[i - 1] ?? Infinity);
    }
  });
});
