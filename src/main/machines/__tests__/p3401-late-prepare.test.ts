/**
 * Phase 340.1, item 2: a Prepare already running when CHANGED details are
 * confirmed.
 *
 * Phase 340's ruled round made `machines:confirm` retire the route a Prepare
 * signed in with when the details it was built from moved
 * (`retireMachineRoute`). Its reverify then raced it: a Prepare whose version
 * read was still out kept the context in a local, so when the read came back
 * it started the server over the OLD details and its late `startMachineFeed`
 * re-armed the feed with no context to send a list over, which marked the
 * machine as not answering. The row read Offline about a machine nothing had
 * asked. This file drives exactly that through the SHIPPING handlers, store,
 * confirmation record, context registry, feed and control plane:
 *
 *   a Prepare held on a deferred version read, then Confirm of the changed
 *   details, then the read resolves.
 *
 * and asks three things of what follows: nothing reaches ssh after the
 * confirm (the exec plane is the one door every ssh of a Prepare, a feed and a
 * list goes through, and the live connection is the other), the row never
 * reads Ready, and it never reads Offline. The chip is read with the
 * renderer's own `machineStatusOf` over the row `machines:rows` answers, as
 * p104-remote-commit.test.ts reads a renderer module, so "never Offline" is
 * the chip and not a guess at its inputs. The same questions are asked with
 * the confirm landing during the server set-up and during the live
 * connection's precheck, after a window's focus and the Mac's wake, and the
 * launch sign-in's half is read from its body, as p232 reads that method.
 *
 * NOTHING HERE RUNS A COMMAND: the exec plane and the control client are
 * stand-ins that record, node-pty spawns nothing, and every file is under one
 * temporary folder removed after each test.
 */

import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { MachinePrepareResult, MachineRowView } from '@shared/ipc';

let userData = '';
const MARKER = ' tortie-test-key ';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  BrowserWindow: { getAllWindows: () => [] },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

/** Every node-pty spawn. It must stay empty: no check runs in this file. */
const ptySpawns = vi.hoisted(() => [] as string[]);
vi.mock('node-pty', () => ({
  spawn: (file: string) => {
    ptySpawns.push(file);
    return { pid: 1, onData: () => undefined, onExit: () => undefined, write: () => undefined, kill: () => undefined };
  }
}));

/**
 * The exec plane: every call is one ssh this Mac would have started. A test
 * can hold the Nth call of a verb on a deferred promise and release it later.
 */
const plane = vi.hoisted(() => ({
  calls: [] as string[],
  /** Hold the next call whose first word is this, once. */
  holdVerb: null as string | null,
  held: null as null | {
    resolve: (text: string) => void;
    reject: (err: Error) => void;
    verb: string;
  }
}));
function answer(args: readonly string[]): Promise<string> {
  const line = args.join(' ');
  plane.calls.push(line);
  const verb = args[0] ?? '';
  if (plane.holdVerb !== null && verb === plane.holdVerb) {
    plane.holdVerb = null;
    return new Promise((resolve, reject) => {
      plane.held = { resolve, reject, verb };
    });
  }
  if (verb === 'display-message') return Promise.resolve('tmux 3.6a\n');
  // A running server holding nothing: the list answers with no lines.
  return Promise.resolve('');
}
vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => answer(args),
  execRemoteShell: (_ctx: unknown, script: string) => answer([`shell:${script.slice(0, 40)}`])
}));

/**
 * The server set-up, replaced by one that goes through the same exec plane
 * stand-in (so it is counted, and can be held) and records the search list
 * the way the real one does, so a Prepare that completes reads Ready.
 */
vi.mock('../remote-server', async (importOriginal) => {
  const context = await import('../context');
  const real = await importOriginal<typeof import('../remote-server')>();
  return {
    ...real,
    // The fix round: it asks the caller's question after its one command, as
    // the real one does after every command (driven over the real one in
    // p3401-server-setup-stop.test.ts), and says it had started the server, so
    // a test can see Prepare carry that out of the stop.
    ensureRemoteServer: async (
      ctx: { machineId: string },
      how: { stillRouted?: () => boolean } = {}
    ) => {
      await answer(['set-environment', '-g', 'PATH', '/usr/bin:/bin']);
      if (how.stillRouted !== undefined && !how.stillRouted()) {
        throw new real.RemoteServerSetUpStopped(true);
      }
      context.setMachineRemotePath(ctx.machineId, '/usr/bin:/bin');
      return { born: false, remotePath: '/usr/bin:/bin', options: [], disagreed: [] };
    },
    remoteServerVerdict: () => Promise.resolve('running')
  };
});

/** The live connection, replaced so nothing spawns. Each one made is counted. */
class FakeControlClient extends EventEmitter {
  static made: FakeControlClient[] = [];
  connected = false;
  constructor(readonly transport: { machineId: string }) {
    super();
    FakeControlClient.made.push(this);
  }
  start(): Promise<void> {
    return Promise.resolve();
  }
  stop(): void {
    this.connected = false;
  }
}
vi.mock('../../tmux/control-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tmux/control-client')>()),
  TmuxControlClient: FakeControlClient
}));

/** The removal opens the manifest; nothing here removes a machine. */
vi.mock('../removal', () => ({
  removeMachineCompletely: () => ({ tombstoned: 0, commandsSent: 0 as const }),
  machineSessionCount: () => 0
}));

const { registerMachinesIpc } = await import('../ipc');
const { describeMachine } = await import('../confirm');
const { loadMachines, machineFieldsOf, machineRow, machinesPath, resetMachinesStoreForTests } =
  await import('../store');
const { resetMachineTestForTests } = await import('../connection-test');
const { ensureConfigDir } = await import('../../config/paths');
const { trustedInvokeEvent } = await import('../../security/__tests__/trusted-test-sender');
const { registeredMachineIds, forgetMachineRuntime } = await import('../context');
const { rowSignInOf, resetRowFactsForTests } = await import('../row-facts');
const {
  remoteMachineFacts,
  remoteMachinesWoke,
  remoteSessions,
  resetRemoteSessionsForTests,
  setRemotePollFocused
} = await import('../remote-sessions');
const { machineLinkFacts, resetControlPlanesForTests } = await import('../control-plane');
const { markMachineQuiet } = await import('../remote-sessions');
const { armSignInRetry, armedSignInRetries, resetSignInRetryForTests } = await import('../sign-in-retry');
const { MACHINE_PREPARE_OVERTAKEN_HEADLINE, noteMachineClass } = await import('../errors');
const { machineStatusOf } = await import('../../../renderer/settings/machine-status');

const ID = 'pop-os';
const POP = {
  id: ID,
  label: 'Pop OS',
  color: 'cyan' as const,
  host: '127.0.0.1',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux'
};

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();
const fakeIpc = {
  handle: (channel: string, fn: Handler) => {
    handlers.set(channel, fn);
  }
} as unknown as IpcMain;
let fakeEvent: IpcMainInvokeEvent;

function call<T>(channel: string, ...args: unknown[]): T {
  const fn = handlers.get(channel);
  if (fn === undefined) throw new Error(`${channel} was never registered`);
  return fn(fakeEvent, ...args) as T;
}

function writeFile(rows: unknown[]): void {
  ensureConfigDir();
  writeFileSync(machinesPath(), JSON.stringify({ schema: 1, machines: rows }, null, 2), 'utf8');
  loadMachines('boot');
}

/** Confirm the row as the file holds it now, from the sheet drawn of it. */
function confirmAsItIs(): MachineRowView {
  const now = machineRow(ID);
  if (now === null) throw new Error(`${ID} is not in the file`);
  const summary = describeMachine(ID, machineFieldsOf(now));
  return call('machines:confirm', { id: ID, hashRead: summary.hash, linesRead: [...summary.lines] });
}

/** The row as Settings draws it, and its chip by the renderer's own rule. */
function chip(): string {
  const row = call<{ rows: MachineRowView[] }>('machines:rows').rows.find((one) => one.id === ID);
  if (row === undefined) throw new Error('no row');
  return machineStatusOf(row, { preparing: false }).chip;
}

/** Let every promise already settled run its continuation. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

/** A first Prepare that completes: the machine reads Ready over a link that answered. */
async function prepareToReady(): Promise<void> {
  writeFile([POP]);
  confirmAsItIs();
  const first = await call<Promise<MachinePrepareResult>>('machines:prepare', ID);
  expect(first.class).toBe('prepared');
  await settle();
  expect(chip()).toBe('ready');
}

/**
 * Start a Prepare whose call of `verb` is held, and wait until it is out. The
 * Prepare's promise comes back inside an object, because an async function
 * returning it would wait for it, and it is held.
 */
async function heldPrepare(verb: string): Promise<{ pending: Promise<MachinePrepareResult> }> {
  plane.holdVerb = verb;
  const pending = call<Promise<MachinePrepareResult>>('machines:prepare', ID);
  await vi.waitFor(() => {
    expect(plane.held?.verb).toBe(verb);
  });
  return { pending };
}

/** Rewrite the port on disk and Confirm the new details; the chip right after. */
function confirmChangedPort(): string {
  writeFile([{ ...POP, port: 2223 }]);
  expect(call<{ rows: MachineRowView[] }>('machines:rows').rows[0]?.state).toBe('changed');
  const view = confirmAsItIs();
  expect(view.state).toBe('confirmed');
  return chip();
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-p3401-late-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  plane.calls.length = 0;
  plane.holdVerb = null;
  plane.held = null;
  ptySpawns.length = 0;
  FakeControlClient.made = [];
  handlers.clear();
  resetMachinesStoreForTests();
  resetMachineTestForTests();
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRowFactsForTests();
  registerMachinesIpc(fakeIpc);
  fakeEvent = trustedInvokeEvent();
});

afterEach(() => {
  resetSignInRetryForTests();
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRowFactsForTests();
  forgetMachineRuntime(ID);
  resetMachineTestForTests();
  resetMachinesStoreForTests();
  rmSync(userData, { recursive: true, force: true });
});

describe('a Prepare held on its version read, overtaken by Confirm of changed details', () => {
  it('starts nothing after the confirm, and the row reads Not ready, never Ready, never Offline', async () => {
    await prepareToReady();
    const { pending } = await heldPrepare('display-message');

    const atConfirm = plane.calls.length;
    const clientsAtConfirm = FakeControlClient.made.length;
    expect(confirmChangedPort()).toBe('not-ready');

    // The version read comes back, under the old details.
    plane.held?.resolve('tmux 3.6a\n');
    const result = await pending;
    await settle();

    // Nothing reached ssh after the confirm: no server set-up, no list, no
    // live connection, no check.
    expect(plane.calls.slice(atConfirm)).toEqual([]);
    expect(FakeControlClient.made.length).toBe(clientsAtConfirm);
    expect(ptySpawns).toEqual([]);
    // The Prepare says it stopped, and it is not the row's last sign-in.
    expect(result.class).not.toBe('prepared');
    expect(result.headline).toBe(MACHINE_PREPARE_OVERTAKEN_HEADLINE);
    expect(rowSignInOf(ID)).toBeNull();
    // No route under the old details, no feed armed for it, and the link is
    // not a machine that did not answer.
    expect(registeredMachineIds()).not.toContain(ID);
    expect(remoteMachineFacts(ID).timerArmed).toBe(false);
    expect(remoteMachineFacts(ID).statusTimerArmed).toBe(false);
    expect(machineLinkFacts(ID).link).not.toBe('quiet');
    expect(chip()).toBe('not-ready');

    // A window's focus and the Mac's wake ask every machine for its list. A
    // retired route is asked nothing, and is not marked as not answering.
    setRemotePollFocused(false);
    setRemotePollFocused(true);
    remoteMachinesWoke();
    await settle();
    expect(plane.calls.slice(atConfirm)).toEqual([]);
    expect(machineLinkFacts(ID).link).not.toBe('quiet');
    expect(chip()).toBe('not-ready');

    // Prepare under the new details is what brings it back.
    const again = await call<Promise<MachinePrepareResult>>('machines:prepare', ID);
    expect(again.class).toBe('prepared');
    await settle();
    expect(chip()).toBe('ready');
    expect(rowSignInOf(ID)?.class).toBe('prepared');
  });

  it('a Prepare nobody overtook is unchanged: it completes, signs the row in and reads Ready', async () => {
    // The control. The same held read, released with no confirm in between.
    await prepareToReady();
    const { pending } = await heldPrepare('display-message');
    const atRelease = plane.calls.length;
    plane.held?.resolve('tmux 3.6a\n');
    const result = await pending;
    await settle();
    expect(result.class).toBe('prepared');
    expect(plane.calls.slice(atRelease).length).toBeGreaterThan(0);
    expect(chip()).toBe('ready');
    expect(rowSignInOf(ID)?.class).toBe('prepared');
  });
});

describe('the confirm landing later in the same Prepare', () => {
  it('during the server set-up: no feed is started, and the row reads Not ready', async () => {
    await prepareToReady();
    const { pending } = await heldPrepare('set-environment');
    const atConfirm = plane.calls.length;
    const clientsAtConfirm = FakeControlClient.made.length;
    expect(confirmChangedPort()).toBe('not-ready');
    plane.held?.resolve('');
    const result = await pending;
    await settle();
    expect(result.headline).toBe(MACHINE_PREPARE_OVERTAKEN_HEADLINE);
    // The fix round: the set-up itself stopped, and said it had started the
    // server, which the Prepare's answer carries.
    expect(result.serverBorn).toBe(true);
    expect(plane.calls.slice(atConfirm)).toEqual([]);
    expect(FakeControlClient.made.length).toBe(clientsAtConfirm);
    expect(remoteMachineFacts(ID).timerArmed).toBe(false);
    expect(machineLinkFacts(ID).link).not.toBe('quiet');
    expect(chip()).toBe('not-ready');
  });

  it('during the live connection’s precheck: no connection is made, no list is issued, and the link does not stay at connecting', async () => {
    await prepareToReady();
    // The first Prepare's live connection is dropped, so the held Prepare's
    // feed opens one again and its precheck is a call this test can hold.
    resetControlPlanesForTests();
    const before = plane.calls.length;
    const pending = call<Promise<MachinePrepareResult>>('machines:prepare', ID);
    // The version read is already out and answers at once; hold the next
    // display-message, which is the precheck in front of the live connection.
    plane.holdVerb = 'display-message';
    await vi.waitFor(() => {
      expect(plane.held?.verb).toBe('display-message');
    });
    expect(plane.calls.slice(before)).toEqual([
      'display-message -p #{version}',
      'set-environment -g PATH /usr/bin:/bin',
      'display-message -p #{version}'
    ]);
    expect(machineLinkFacts(ID).link).toBe('connecting');
    const atConfirm = plane.calls.length;
    const clientsAtConfirm = FakeControlClient.made.length;
    expect(confirmChangedPort()).toBe('not-ready');
    plane.held?.resolve('tmux 3.6a\n');
    const result = await pending;
    await settle();
    expect(result.headline).toBe(MACHINE_PREPARE_OVERTAKEN_HEADLINE);
    expect(plane.calls.slice(atConfirm)).toEqual([]);
    expect(FakeControlClient.made.length).toBe(clientsAtConfirm);
    expect(remoteMachineFacts(ID).timerArmed).toBe(false);
    // A sign-in under the old details left the link at connecting, and
    // nothing of it will move it now: it reads as a closed connection's does.
    expect(machineLinkFacts(ID).link).toBe('polling');
    expect(chip()).toBe('not-ready');
  });
});

describe('a failure under the old details, arriving after the confirm', () => {
  /**
   * What ssh prints when the machine declines the port, carrying the class
   * the exec plane records beside its errors, so the list reads it as the
   * link's own failure, which marks the machine as not answering.
   */
  const REFUSED = 'ssh: connect to host 127.0.0.1 port 2222: Connection refused';
  const refused = (): Error => noteMachineClass(new Error(REFUSED), 'refused');

  it('a server set-up that fails is not reported as this machine’s failure', async () => {
    await prepareToReady();
    const { pending } = await heldPrepare('set-environment');
    expect(confirmChangedPort()).toBe('not-ready');
    plane.held?.reject(refused());
    const result = await pending;
    await settle();
    expect(result.headline).toBe(MACHINE_PREPARE_OVERTAKEN_HEADLINE);
    expect(result.class).not.toBe('refused');
    expect(chip()).toBe('not-ready');
  });

  it('a list already in flight that fails marks nothing, so the row never reads Offline', async () => {
    await prepareToReady();
    // The held Prepare's own feed issues the list; the live connection made
    // by the first Prepare is still there, so its open asks nothing.
    const { pending } = await heldPrepare('list-sessions');
    const atConfirm = plane.calls.length;
    expect(confirmChangedPort()).toBe('not-ready');
    plane.held?.reject(refused());
    const result = await pending;
    await settle();
    expect(result.headline).toBe(MACHINE_PREPARE_OVERTAKEN_HEADLINE);
    expect(plane.calls.slice(atConfirm)).toEqual([]);
    expect(machineLinkFacts(ID).link).not.toBe('quiet');
    expect(chip()).toBe('not-ready');
  });

  it('a list already in flight that answers writes nothing: the old route does not speak for the machine', async () => {
    await prepareToReady();
    const { pending } = await heldPrepare('list-sessions');
    expect(confirmChangedPort()).toBe('not-ready');
    // One of Tortie's sessions, in the shipped list format (`$` quoted as
    // tmux's `#{q:...}` quotes it), answered over the old details.
    plane.held?.resolve('\\$1 1700000000 1700000100 0 ours-1 shell work /srv/repo /srv/repo work\n');
    await pending;
    await settle();
    expect(remoteSessions().filter((row) => row.id === 'ours-1')).toEqual([]);
    expect(chip()).toBe('not-ready');
  });
});

describe('the launch sign-in overtaken by the same confirm (read from its body, as p232 reads it)', () => {
  it('reads the route epoch around prepareMachine and returns before marking quiet or arming a retry', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'sessions', 'core.ts'),
      'utf8'
    );
    const start = src.indexOf('private async signInToConfirmedMachines()');
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, src.indexOf('\n  }', start));
    const read = body.indexOf('const routeEpoch = machineRouteEpoch(row.id);');
    const prepare = body.indexOf('await prepareMachine(');
    const ask = body.indexOf('if (machineRouteEpoch(row.id) !== routeEpoch) {');
    const quiet = body.indexOf('markMachineQuiet(row.id);');
    const retry = body.indexOf('armSignInRetry(row.id);');
    expect(read).toBeGreaterThan(-1);
    expect(read).toBeLessThan(prepare);
    expect(ask).toBeGreaterThan(prepare);
    expect(ask).toBeLessThan(quiet);
    expect(ask).toBeLessThan(retry);
    expect(body.slice(ask, quiet)).toContain('return;');
    // And the arm a thrown sign-in takes asks the same before it marks.
    const caught = body.indexOf('} catch (err) {');
    const caughtAsk = body.indexOf('if (machineRouteEpoch(row.id) !== routeEpoch) return;', caught);
    const caughtQuiet = body.indexOf('markMachineQuiet(row.id);', caught);
    expect(caught).toBeGreaterThan(ask);
    expect(caughtAsk).toBeGreaterThan(caught);
    expect(caughtAsk).toBeLessThan(caughtQuiet);
  });
});

describe('a link with no record yet, overtaken by the same confirm (the fix round, the reverify’s arm C)', () => {
  /**
   * The launch sign-in writes no link until its feed starts, and neither does
   * a first Prepare before its version read comes back, so a confirm that
   * overtakes either finds no record. `machineLinkFacts` reads a missing
   * record as `quiet`, which the row draws as Offline, and the reverify
   * measured exactly that after the confirm: "has not been signed in to in
   * this run", where the entry says Not ready.
   */
  it('reads Not ready after the confirm, not Offline, and nothing reaches ssh', async () => {
    writeFile([POP]);
    confirmAsItIs();
    const { pending } = await heldPrepare('display-message');
    // The version read is out and nothing has written the link: the launch's case.
    expect(machineLinkFacts(ID).reason).toBe('has not been signed in to in this run');
    expect(chip()).toBe('offline');

    const atConfirm = plane.calls.length;
    expect(confirmChangedPort()).toBe('not-ready');
    expect(machineLinkFacts(ID)).toMatchObject({
      link: 'polling',
      reason: 'is not on a live connection'
    });

    plane.held?.resolve('tmux 3.6a\n');
    const result = await pending;
    await settle();
    expect(result.headline).toBe(MACHINE_PREPARE_OVERTAKEN_HEADLINE);
    expect(plane.calls.slice(atConfirm)).toEqual([]);
    expect(FakeControlClient.made).toEqual([]);
    expect(chip()).toBe('not-ready');

    const again = await call<Promise<MachinePrepareResult>>('machines:prepare', ID);
    expect(again.class).toBe('prepared');
    await settle();
    expect(chip()).toBe('ready');
  });

  it('the control: a link that did not answer when it was asked stays quiet, as before this phase', async () => {
    writeFile([POP]);
    confirmAsItIs();
    markMachineQuiet(ID);
    expect(machineLinkFacts(ID).link).toBe('quiet');
    confirmChangedPort();
    expect(machineLinkFacts(ID)).toMatchObject({
      link: 'quiet',
      reason: 'did not answer the last time Tortie asked'
    });
  });
});

describe('an armed launch retry, and a confirm that moves the link (the fix round)', () => {
  /**
   * An armed retry hears every link change and signs in when a link starts
   * answering. The retire moves a link with no record to `polling`, which
   * answers, and the confirm records the new details BEFORE it retires, so a
   * retry still armed then would sign in under them, from Confirm. The
   * confirm stops the retry first.
   */
  it('signs in to nothing, and the retry is gone', async () => {
    writeFile([POP]);
    confirmAsItIs();
    armSignInRetry(ID);
    expect(armedSignInRetries()).toContain(ID);
    expect(machineLinkFacts(ID).reason).toBe('has not been signed in to in this run');

    const atConfirm = plane.calls.length;
    expect(confirmChangedPort()).toBe('not-ready');
    await settle();
    expect(plane.calls.slice(atConfirm)).toEqual([]);
    expect(registeredMachineIds()).not.toContain(ID);
    expect(armedSignInRetries()).not.toContain(ID);
  });
});

describe('a restore overtaken by the same confirm (read from its body; no test drives a whole restore)', () => {
  it('reads the route epoch beside its context and starts its feed only when it has not moved', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'remote-restore.ts'),
      'utf8'
    );
    const start = src.indexOf('export async function restoreRemoteSession(');
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start);
    const ctx = body.indexOf('const ctx = readyRemoteContext(machineId);');
    const read = body.indexOf('const routeEpoch = machineRouteEpoch(machineId);');
    const server = body.indexOf('await ensureRemoteServer(ctx)');
    const guard = body.indexOf('if (machineRouteEpoch(machineId) === routeEpoch) {');
    const feed = body.indexOf('await startMachineFeed(machineId);');
    expect(ctx).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(ctx);
    expect(read).toBeLessThan(server);
    expect(guard).toBeGreaterThan(server);
    // The one feed start sits inside the guard's block.
    expect(feed).toBeGreaterThan(guard);
    expect(body.slice(guard, feed)).not.toContain('}');
    expect(src.split('startMachineFeed(').length - 1).toBe(1);
  });
});
