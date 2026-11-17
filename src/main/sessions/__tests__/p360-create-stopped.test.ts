/**
 * Phase 360, his ruled round (2026-11-14, "360 a"): a create during which the
 * session list stopped answers as the parent does, with the stopped list's own
 * refusal, and the decision is main's, read from the store's own latch once
 * the create has ended (build/p360/SPEC.md D24).
 *
 * WHY. The fix round answered the session such a create started and asked the
 * window not to land on it, by a flag the window set when it heard the
 * stopped notice. The reverify measured the create's answer overtaking that
 * notice in a busy window: the window landed on the new session, which main
 * does not open while the list is stopped, drew "Can't connect to this
 * session" and had closed the session in use (7 of 7; the parent stayed in 3
 * of 3). He ruled to keep today's behaviour for that one case: nothing is
 * lost, because the session keeps running and a second Create is refused
 * before anything starts. These are the core's halves:
 *
 *   - the store stopped at any point of the create (its record write, its own
 *     broadcast, its read-back, or a timer's read while it waited): the create
 *     answers `MANIFEST_STOPPED` with the stopped sentence, the parent's answer,
 *     the row it wrote stays in the file, and the core asks the store nothing
 *     and sends nothing of its own;
 *   - the store reads when the create ends: the create answers its session,
 *     which is the rest of the phase (./p360-create-after-spawn.test.ts drives
 *     the create's own steps);
 *   - the store stops after the create answered: the answer stands;
 *   - a create that fails passes its error through untouched, a create on a
 *     store that had already stopped is refused by its own row write before
 *     anything starts, and the ledger still refuses during shutdown.
 *
 * HIS SECOND RULING (2026-11-16, "360 a"): the check is asked of a create ON
 * THIS MAC alone. The reverify of the first ruling measured a create on
 * another machine whose list stopped after that machine answered (at the
 * create's tab write): the parent closed the sheet on the running session 7 of
 * 7, and the check made it say "Restart Tortie, then try again" 7 of 7. So a
 * create the create's own rule (`createMachineIdFor`) puts on another machine
 * answers its session whatever the latch says, as the parent does, from a tab
 * on this Mac with the sheet's Machine field set (R7L), from the machine's own
 * tab (R7), and through the tab rule alone; a machine named `local` is this
 * Mac by the same rule. The phone's start reaches this one method, so it
 * answers `done` for such a create and `failed` for this Mac's, as the parent.
 *
 * HIS THIRD RULING (2026-11-17, "360 a then ship 115.0", D27): when the list
 * stopped BEFORE that machine's create returned, the create's own feed meets
 * the stopped store and `remoteCreate` lets that refusal through, as the
 * parent did; the core passes it on untouched and never reaches its check, and
 * the phone's start answers `failed`, as the parent. Every far row here has a
 * name and a tmux name that differ from its id, so the check's row read is
 * shown to ask by id.
 *
 * HOW IT IS DRIVEN (357's method, ./p357-stopped-list.test.ts). The real
 * bodies run on a host made with `Object.create(GmuxCore.prototype)`, which
 * runs no field initializer, holding a REAL `ManifestStore` over a scratch
 * file. The store is stopped through its own harness seam
 * (`setManifestFaultHook`), which throws better-sqlite3's own `SqliteError`
 * inside the store's `through`, so the latch and the refusal are the ones real
 * damage produces.
 *
 * The create is a STAND-IN: `createLocalSession` is replaced in this file
 * only. It does to the store what the create does: it writes the row first
 * (§2.4 Step 0), the store stops where the case says, and it answers the row it
 * wrote, which is what the create answers when its read-back refuses (D5).
 * Nothing here reads a person's manifest, starts tmux or opens a window.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVT_SESSIONS_CHANGED } from '@shared/ipc';
import { MANIFEST_STOPPED_REFUSAL } from '@shared/manifest-stopped-copy';
import type { CreateSessionInput, Session } from '@shared/types';

/** Every event the code under test broadcast, in order. */
const win = vi.hoisted(() => ({ sent: [] as unknown[][] }));

vi.mock('../../typed-events', () => ({
  broadcastEvent: (...args: unknown[]): void => {
    win.sent.push(args);
  },
  sendEvent: (): void => undefined
}));

/** The deps the stand-in create reads: the two members the real create uses here. */
interface StandInDeps {
  manifest: InstanceType<typeof import('../../manifest/store').ManifestStore>;
  broadcastSessions(): void;
}

/** The create stand-in, and what it was handed. */
const create = vi.hoisted(() => ({
  impl: null as null | ((input: CreateSessionInput, deps: StandInDeps) => Promise<Session>),
  calls: [] as { input: CreateSessionInput; deps: unknown }[]
}));

/**
 * D26: which sessions a list of their machine has shown, the row main opens a
 * session on another machine from (`remoteSessionRow`). Every other export of
 * the machines layer is its own.
 */
const listed = vi.hoisted(() => ({ ids: new Set<string>(), asked: [] as string[] }));

vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../machines/remote-sessions')>();
  return {
    ...real,
    remoteSessionRow: (id: string) => {
      listed.asked.push(id);
      return listed.ids.has(id) ? ({ id, machineId: 'popos' } as unknown as ReturnType<typeof real.remoteSessionRow>) : null;
    }
  };
});

vi.mock('../create-local', async (importOriginal) => {
  const real = await importOriginal<typeof import('../create-local')>();
  return {
    ...real,
    createLocalSession: async (input: CreateSessionInput, deps: unknown): Promise<Session> => {
      create.calls.push({ input, deps });
      if (create.impl === null) throw new Error('this test set no create stand-in');
      return create.impl(input, deps as StandInDeps);
    }
  };
});

const { GmuxCore } = await import('../core');
const { ManifestStore, isManifestStopped, setManifestFaultHook } = await import(
  '../../manifest/store'
);
const { toSession } = await import('../../manifest');
const { GmuxError, gmuxError } = await import('../../errors');
type Store = InstanceType<typeof ManifestStore>;
type Row = Parameters<Store['insertSession']>[0];

/** The real bodies, reached through the prototype. */
interface Host {
  manifest: Store;
  createDeps: StandInDeps;
  lastCleanList?: Session[] | null;
  listSessions(): Session[];
  broadcastSessions(): void;
  createSession(input: CreateSessionInput): Promise<Session>;
  beginShutdown(): void;
}

/** The Phase 116 refusal, as core-singleton.test.ts pins it. */
const SHUTTING_DOWN = 'Tortie is quitting, so this action was not started.';

let dir = '';
let dbPath = '';
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tortie-p360-stopped-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
  win.sent.length = 0;
  create.impl = null;
  create.calls.length = 0;
  listed.ids.clear();
  listed.asked.length = 0;
  // The latch writes one error record and posts one notice; neither is what
  // this file is about, and both print to the console.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  setManifestFaultHook(null);
  // A store stopped with its file fine closes nothing, by design (357 D10).
  // The file goes with the folder all the same.
  store.close();
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** A host over the real store, as the core's own constructor would hand the create its deps. */
function hostOver(over: Store): Host {
  const host = Object.create(GmuxCore.prototype) as Host;
  host.manifest = over;
  host.createDeps = {
    manifest: over,
    broadcastSessions: () => {
      host.broadcastSessions();
    }
  };
  return host;
}

/** One local session row, the shape every create writes before its spawn. */
function insert(id: string, into: Store = store): Row {
  const record: Row = {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status: 'running',
    createdAt: 1_000,
    argv: ['/bin/zsh'],
    lastSeen: 1_000
  };
  into.insertSession(record);
  return record;
}

/** The input the window sends for one session. */
function inputFor(name: string): CreateSessionInput {
  return { name, projectPath: '/w', agent: 'shell' };
}

/** The one other machine these cases name. */
const FAR = 'popos';

/**
 * The row a create on another machine writes before its line goes out
 * (`writeRemoteRow`, Phase 72), every path that machine's.
 *
 * HIS THIRD RULED ROUND: its name and its tmux name are NOT its id, so a check
 * that asked `remoteSessionRow(session.name)` where it must ask
 * `remoteSessionRow(session.id)` reads red here and not only in the gate (the
 * last reverify's plant P2 left this file 19 of 19 green while every far row's
 * name was its id).
 */
function insertRemote(id: string, into: Store = store): Row {
  const record: Row = {
    id,
    name: `${id} on pop`,
    tmuxName: `${id}-pop`,
    projectPath: '/far/proj',
    cwd: '/far/proj',
    agent: 'shell',
    status: 'running',
    createdAt: 1_000,
    argv: ['/bin/zsh'],
    lastSeen: 1_000,
    machineId: FAR
  };
  into.insertSession(record);
  return record;
}

/**
 * The store operations a create meets after its row, by the member it calls.
 * `clearProjectTabClosed` is a create on another machine's: its tab write,
 * after that machine answered (`openTabsForRemoteCreate`).
 */
type StopAt = 'updateSession' | 'listSessions' | 'getSession' | 'clearProjectTabClosed';

/**
 * Stop the store the way damage would: the next call of `operation` throws
 * better-sqlite3's own class with SQLite's own code, the store's classifier
 * reads it, and the store latches. Every later call refuses before SQLite.
 */
function stopStoreAt(operation: StopAt, id = 'anything'): void {
  setManifestFaultHook((op) => {
    if (op === operation) {
      throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
    }
  });
  try {
    if (operation === 'updateSession') store.updateSession(id, { panePid: 40001 });
    else if (operation === 'listSessions') store.listSessions();
    else if (operation === 'clearProjectTabClosed') store.clearProjectTabClosed({ path: '/far/proj', machineId: FAR });
    else store.getSession(id);
  } catch (err) {
    expect(isManifestStopped(err)).toBe(true);
  }
  setManifestFaultHook(null);
  expect(store.stoppedReading()).toBe(true);
}

/**
 * From here on, every member of the store the host's own bodies reach, by
 * name, in order: the host's `manifest` becomes a recording view of the same
 * store. Answers the list it fills.
 */
function askedOf(host: Host): string[] {
  const asked: string[] = [];
  const real = host.manifest;
  host.manifest = new Proxy(real, {
    get(target, prop, receiver) {
      const value: unknown = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      asked.push(String(prop));
      return (value as (...args: unknown[]) => unknown).bind(target);
    }
  });
  return asked;
}

/** The sessions:changed broadcasts, each as its list of ids. */
function sessionsSent(): string[][] {
  return win.sent
    .filter((one) => one[0] === EVT_SESSIONS_CHANGED)
    .map((one) => (one[1] as Session[]).map((s) => s.id));
}

/** What a promise rejected with, or null when it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (err: unknown) => err
  );
}

/** The payload a typed refusal carries to the renderer: its message is a JSON `GmuxErrorPayload`. */
function payloadOf(err: unknown): { code: string; message: string; detail?: string } {
  return JSON.parse((err as Error).message) as { code: string; message: string; detail?: string };
}

/** The session rows the FILE holds, read through a connection of its own. */
function rowsOnDisk(): string[] {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return (db.prepare("select id from sessions where status != 'discarded' order by id").all() as { id: string }[]).map(
      (r) => r.id
    );
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// The store stopped while the create ran: the parent's answer
// ---------------------------------------------------------------------------

describe('a create during which the session list stopped answers the stopped refusal, as the parent does (D24)', () => {
  for (const [where, at] of [
    ['its record write (L1)', 'updateSession'],
    ['its own broadcast’s read (§2.1 item 3, L2)', 'listSessions'],
    ['its read-back', 'getSession']
  ] as const) {
    it(`the store stops at ${where}: MANIFEST_STOPPED with the stopped sentence, the row stays, and the core sends and asks nothing of its own`, async () => {
      insert('s1');
      const host = hostOver(store);
      const clean = host.listSessions();
      let answered: Session | null = null;
      create.impl = (input, deps) => {
        // The row before the spawn, written through the deps, as the create writes it.
        expect(deps.manifest).toBe(store);
        const record = insert(input.name, deps.manifest);
        stopStoreAt(at, record.id);
        // The create's own broadcast still runs (D4): D19 answers the last clean list.
        deps.broadcastSessions();
        answered = toSession(record);
        return Promise.resolve(answered);
      };
      const pending = host.createSession(inputFor('new'));
      // The stand-in ran to its answer inside that call; the core's own step
      // has not run yet. From here every member the core reaches is recorded,
      // and everything sent so far was the create's own.
      const sentAtAnswer = win.sent.length;
      const asked = askedOf(host);
      const err = await rejectionOf(pending);
      expect(answered).not.toBeNull();
      expect(isManifestStopped(err)).toBe(true);
      expect(payloadOf(err)).toEqual({
        code: 'MANIFEST_STOPPED',
        message: MANIFEST_STOPPED_REFUSAL,
        detail: 'getSession'
      });
      // Once the create had ended the core read the latch and nothing else
      // (no member that reaches SQLite, so nothing the stopped store could
      // write through its damaged cache), and sent nothing of its own.
      expect(asked).toEqual(['stoppedReading']);
      expect(win.sent.length).toBe(sentAtAnswer);
      // Exactly the parent's list: the create's own broadcast, D19's last
      // clean list, without the session, and nothing grows it.
      expect(sessionsSent()).toEqual([['s1']]);
      setManifestFaultHook(null);
      expect(host.listSessions()).toEqual(clean);
      // The session's row stays in the file, so a relaunch reads it back.
      expect(rowsOnDisk()).toEqual(['new', 's1']);
      expect(create.calls).toHaveLength(1);
      expect(create.calls[0]?.deps).toBe(host.createDeps);
    });
  }

  it('a timer’s read stops the store while the create waits on its spawn: the same refusal', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input) => {
      const record = insert(input.name);
      // A status tick's read meets the broken connection during the spawn.
      stopStoreAt('getSession');
      return Promise.resolve(toSession(record));
    };
    const err = await rejectionOf(host.createSession(inputFor('new')));
    expect(isManifestStopped(err)).toBe(true);
    expect(payloadOf(err).message).toBe(MANIFEST_STOPPED_REFUSAL);
    expect(rowsOnDisk()).toEqual(['new', 's1']);
  });

  it('a second Create once the list is stopped is refused by its own row write, before anything starts, as today', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    let spawned = 0;
    create.impl = (input, deps) => {
      // The real create's first store call is its row; on a stopped store it refuses.
      const record = insert(input.name, deps.manifest);
      spawned += 1;
      return Promise.resolve(toSession(record));
    };
    stopStoreAt('getSession');
    const err = await rejectionOf(host.createSession(inputFor('again')));
    expect(isManifestStopped(err)).toBe(true);
    expect(payloadOf(err)).toEqual({ code: 'MANIFEST_STOPPED', message: MANIFEST_STOPPED_REFUSAL, detail: 'insertSession' });
    expect(spawned).toBe(0);
    expect(rowsOnDisk()).toEqual(['s1']);
  });

  it('a create that fails passes its error through untouched, the store stopped or not', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    const failure = gmuxError('SPAWN_FAILED', 'tmux could not start the session.');
    create.impl = () => {
      stopStoreAt('getSession');
      return Promise.reject(failure);
    };
    expect(await rejectionOf(host.createSession(inputFor('new')))).toBe(failure);
    expect(sessionsSent()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The store reads when the create ends: the rest of the phase
// ---------------------------------------------------------------------------

describe('a create that ends while the store reads answers the session it started', () => {
  it('answers the very session the create answered, and sends only what the create sent', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    let made: Session | null = null;
    create.impl = (input, deps) => {
      const record = insert(input.name);
      deps.broadcastSessions();
      made = toSession(record);
      return Promise.resolve(made);
    };
    const session = await host.createSession(inputFor('new'));
    expect(session).toBe(made);
    expect(sessionsSent()).toEqual([['s1', 'new']]);
    expect(store.stoppedReading()).toBe(false);
  });

  it('the store stopping AFTER the create answered changes nothing it answered: the latch is read once, when the create ends', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input) => Promise.resolve(toSession(insert(input.name)));
    const session = await host.createSession(inputFor('new'));
    stopStoreAt('getSession');
    expect(session.id).toBe('new');
  });

  it('still refuses during shutdown, before the create runs (the Phase 116 ledger)', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input) => Promise.resolve(toSession(insert(input.name)));
    host.beginShutdown();
    const err = await rejectionOf(host.createSession(inputFor('new')));
    expect(err).toBeInstanceOf(GmuxError);
    expect((err as InstanceType<typeof GmuxError>).payload.code).toBe('SHUTTING_DOWN');
    expect((err as InstanceType<typeof GmuxError>).payload.detail).toBe('createSession');
    expect((err as InstanceType<typeof GmuxError>).payload.message).toBe(SHUTTING_DOWN);
    // Nothing ran: no create, no row, no broadcast.
    expect(create.calls).toEqual([]);
    expect(win.sent).toEqual([]);
    expect(rowsOnDisk()).toEqual(['s1']);
  });
});

// ---------------------------------------------------------------------------
// His second ruling (2026-11-16): on another machine, only the create no list
// has shown is refused (D25, D26)
// ---------------------------------------------------------------------------

describe('his second ruling: a create on another machine during which the list stopped answers its session when a list has shown it, as the parent does', () => {
  for (const [how, machine] of [
    ['from a tab on this Mac with the sheet’s Machine field set (R7L)', { machineId: FAR }],
    ['from the machine’s own tab (R7)', { machineId: FAR, projectMachineId: FAR }],
    ['by the tab rule alone, a create that names the project’s machine only', { projectMachineId: FAR }]
  ] as const) {
    it(`${how}: the list stops at the create’s tab write after that machine answered and listed it, and the create answers the session`, async () => {
      insert('s1');
      const host = hostOver(store);
      host.listSessions();
      let answered: Session | null = null;
      create.impl = (input, deps) => {
        // The row that machine's create wrote before its line went out, the
        // machine's own list showing it, then the tab write after it answered
        // meets the stop (guarded there), and the branch's broadcast answers
        // D19's last clean list.
        const record = insertRemote(input.name, deps.manifest);
        listed.ids.add(record.id);
        stopStoreAt('clearProjectTabClosed');
        deps.broadcastSessions();
        answered = toSession(record);
        return Promise.resolve(answered);
      };
      const pending = host.createSession({ ...inputFor('far'), projectPath: '/far/proj', ...machine });
      const sentAtAnswer = win.sent.length;
      const asked = askedOf(host);
      const session = await pending;
      expect(answered).not.toBeNull();
      expect(session).toBe(answered);
      // The latch and the row main would open it from: nothing that reaches SQLite, nothing sent.
      expect(asked).toEqual(['stoppedReading']);
      expect(listed.asked).toEqual(['far']);
      expect(win.sent.length).toBe(sentAtAnswer);
      expect(store.stoppedReading()).toBe(true);
      // The row stays, as every stopped case leaves it.
      expect(rowsOnDisk()).toEqual(['far', 's1']);
      expect(create.calls).toHaveLength(1);
    });
  }

  it('D26: a create on another machine NO LIST HAS SHOWN, the list stopped while it ran: the stopped refusal, as the parent answers a failure there, and the row stays', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input, deps) => {
      // The create answered from its own facts (D12): no list showed it, and
      // main would not open it while the list is stopped.
      const record = insertRemote(input.name, deps.manifest);
      stopStoreAt('getSession');
      return Promise.resolve({ ...toSession(record), status: 'unknown' });
    };
    const err = await rejectionOf(
      host.createSession({ ...inputFor('far'), projectPath: '/far/proj', machineId: FAR, projectMachineId: FAR })
    );
    expect(isManifestStopped(err)).toBe(true);
    expect(payloadOf(err)).toEqual({ code: 'MANIFEST_STOPPED', message: MANIFEST_STOPPED_REFUSAL, detail: 'getSession' });
    expect(listed.asked).toEqual(['far']);
    expect(rowsOnDisk()).toEqual(['far', 's1']);
  });

  it('D26 asks nothing of a store that reads: a create on another machine no list has shown answers its session (D12, R6)', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    let answered: Session | null = null;
    create.impl = (input, deps) => {
      answered = { ...toSession(insertRemote(input.name, deps.manifest)), status: 'unknown' };
      return Promise.resolve(answered);
    };
    const session = await host.createSession({ ...inputFor('far'), projectPath: '/far/proj', machineId: FAR });
    expect(session).toBe(answered);
    expect(store.stoppedReading()).toBe(false);
    // The latch answered no, so the row was never asked.
    expect(listed.asked).toEqual([]);
  });

  it('a machine named local is this Mac by the same rule, so the stopped refusal stands', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input, deps) => {
      const record = insert(input.name, deps.manifest);
      // Even a row the machines layer would list: this Mac's check never asks it.
      listed.ids.add(record.id);
      stopStoreAt('updateSession', record.id);
      return Promise.resolve(toSession(record));
    };
    const err = await rejectionOf(
      host.createSession({ ...inputFor('here'), machineId: 'local', projectMachineId: 'local' })
    );
    expect(isManifestStopped(err)).toBe(true);
    expect(payloadOf(err)).toEqual({ code: 'MANIFEST_STOPPED', message: MANIFEST_STOPPED_REFUSAL, detail: 'getSession' });
    expect(listed.asked).toEqual([]);
  });

  it('a create on another machine that fails still passes its error through untouched', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    const failure = gmuxError('TMUX_UNREACHABLE', 'Tortie could not tell whether the session started.');
    create.impl = () => {
      stopStoreAt('getSession');
      return Promise.reject(failure);
    };
    expect(await rejectionOf(host.createSession({ ...inputFor('far'), machineId: FAR }))).toBe(failure);
  });

  /**
   * HIS THIRD RULING (2026-11-17, "360 a then ship 115.0"; D27): the list
   * stopped BEFORE that machine's create returned, so the create's own feed
   * met the stopped store and `remoteCreate` lets that refusal through, as the
   * parent did. The core passes that very refusal on, asks the store nothing,
   * sends nothing and never reaches its check, so the sheet draws the parent's
   * sentence and the window stays where it was (the reverify's RF and RFL).
   */
  it('his third ruling: a create on another machine whose list stopped before that machine’s create returned answers the stopped list’s own refusal, untouched by the core', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    let refusal: unknown = null;
    create.impl = (input, deps) => {
      const record = insertRemote(input.name, deps.manifest);
      // The create's own list showed it (RF), then the store stopped, and the
      // feed's write for that row met the stopped store.
      listed.ids.add(record.id);
      stopStoreAt('listSessions');
      try {
        deps.manifest.setStatus(record.id, 'idle');
      } catch (err) {
        refusal = err;
      }
      return Promise.reject(refusal);
    };
    const pending = host.createSession({ ...inputFor('far'), projectPath: '/far/proj', machineId: FAR, projectMachineId: FAR });
    const sentAtAnswer = win.sent.length;
    const asked = askedOf(host);
    const err = await rejectionOf(pending);
    expect(err).not.toBeNull();
    expect(err).toBe(refusal);
    expect(payloadOf(err)).toEqual({ code: 'MANIFEST_STOPPED', message: MANIFEST_STOPPED_REFUSAL, detail: 'setStatus' });
    // The core's check never ran: the create had already refused.
    expect(asked).toEqual([]);
    expect(listed.asked).toEqual([]);
    expect(win.sent.length).toBe(sentAtAnswer);
    expect(rowsOnDisk()).toEqual(['far', 's1']);
  });
});

describe('the phone’s start reaches this one method and answers as the parent does', () => {
  const projects = [
    { id: 'p-far', path: '/far/proj', name: 'proj', machineId: FAR },
    { id: 'p-here', path: '/w', name: 'w' }
  ];
  async function startOver(host: Host, project: string): Promise<unknown> {
    const { createPocketStart } = await import('../pocket-start');
    const { getFlagCatalogViews } = await import('../../settings/ipc');
    const { defaultGmuxSettings } = await import('@shared/settings');
    const starter = createPocketStart({
      core: () => ({
        listProjects: () => projects,
        listSessions: () => [],
        createSession: (input: CreateSessionInput) => host.createSession(input)
      }),
      settings: () => defaultGmuxSettings(),
      catalogs: () => getFlagCatalogViews(),
      localAgents: () => ['claude'],
      machineAgents: (id) => (id === FAR ? ['claude'] : null),
      machineReady: (id) => id === FAR,
      machineLabel: () => 'Pop'
    });
    return starter.start({ project, agent: 'claude' }, () => true);
  }

  it('a project on another machine whose list stops at the tab write after that machine answered and listed it: done, with the session it started', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input, deps) => {
      // The phone composes the window's quickCreate input: both machine fields.
      expect(input.machineId).toBe(FAR);
      expect(input.projectMachineId).toBe(FAR);
      const record = insertRemote(input.name, deps.manifest);
      listed.ids.add(record.id);
      stopStoreAt('clearProjectTabClosed');
      deps.broadcastSessions();
      return Promise.resolve(toSession(record));
    };
    const out = (await startOver(host, 'p-far')) as { outcome: string; session?: { id: string; name: string } };
    expect(out.outcome).toBe('done');
    expect(out.session?.id).toBe(create.calls[0]?.input.name);
    expect(store.stoppedReading()).toBe(true);
  });

  it('a project on another machine no list has shown, the list stopped while it ran (D26): failed, as the parent', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input, deps) => {
      const record = insertRemote(input.name, deps.manifest);
      stopStoreAt('getSession');
      return Promise.resolve({ ...toSession(record), status: 'unknown' });
    };
    const { START_FAILED } = await import('@shared/start-copy');
    expect(await startOver(host, 'p-far')).toEqual({ outcome: 'failed', sentence: START_FAILED });
  });

  it('his third ruling: a project on another machine whose list stopped before that machine’s create returned (the feed’s write): failed, as the parent', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input, deps) => {
      const record = insertRemote(input.name, deps.manifest);
      listed.ids.add(record.id);
      stopStoreAt('listSessions');
      try {
        deps.manifest.setStatus(record.id, 'idle');
        return Promise.resolve(toSession(record));
      } catch (err) {
        return Promise.reject(err);
      }
    };
    const { START_FAILED } = await import('@shared/start-copy');
    expect(await startOver(host, 'p-far')).toEqual({ outcome: 'failed', sentence: START_FAILED });
    // The session's row stays, as every stopped case leaves it.
    expect(rowsOnDisk()).toEqual([String(create.calls[0]?.input.name), 's1'].sort());
  });

  it('a project on this Mac whose list stops during the create: failed, the start’s one failure sentence', async () => {
    insert('s1');
    const host = hostOver(store);
    host.listSessions();
    create.impl = (input, deps) => {
      expect(input.machineId).toBeUndefined();
      const record = insert(input.name, deps.manifest);
      stopStoreAt('updateSession', record.id);
      deps.broadcastSessions();
      return Promise.resolve(toSession(record));
    };
    const { START_FAILED } = await import('@shared/start-copy');
    expect(await startOver(host, 'p-here')).toEqual({ outcome: 'failed', sentence: START_FAILED });
  });
});
