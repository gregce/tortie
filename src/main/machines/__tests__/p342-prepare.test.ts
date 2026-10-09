/**
 * Phase 342: what Prepare answers about a machine whose tmux Tortie will not
 * use as it is, and the one sentence it adds about a refused optional setting
 * (build/p342/SPEC.md D3, D7, D9, D10, and the fix round's minors).
 *
 * Driven through the SHIPPING `machines:prepare` handler, store, confirmation
 * record, context registry, feed, control plane and far-tmux leaf, as
 * p3401-late-prepare.test.ts drives it, with the exec plane, the server set-up
 * and the live connection replaced by stand-ins that record. Five answers:
 *
 *  - a warm 3.5a server beside a 3.6b program, a pair nobody measured: the
 *    set-up and the feed ran, no live connection was opened, and the answer is
 *    `program-refused` with the pair sentence, which the row draws as Not
 *    usable (D3, D4b, D18);
 *  - a server that refused a setting Tortie cannot do without: sentence (1),
 *    never "could not reach" (D6, D10);
 *  - a server Tortie started that runs as another version than its program
 *    said: sentence (4), the row's version the one it RUNS (the fix round);
 *  - a refused optional setting the measurement did not predict: prepared,
 *    with sentence (2) at the end of the detail and alone as `note`, which the
 *    Ready hover draws (D7 and the fix round), and none when every refusal was
 *    expected;
 *  - a failure the taxonomy places: the hover never draws a gmux error's JSON
 *    payload, the ssh command line inside it (the fix round).
 *
 * NOTHING HERE RUNS A COMMAND: the exec plane and the control client are
 * stand-ins, node-pty spawns nothing, and every file is under one temporary
 * folder removed after each test.
 */

import { EventEmitter } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

const ptySpawns = vi.hoisted(() => [] as string[]);
vi.mock('node-pty', () => ({
  spawn: (file: string) => {
    ptySpawns.push(file);
    return { pid: 1, onData: () => undefined, onExit: () => undefined, write: () => undefined, kill: () => undefined };
  }
}));

/**
 * The machine, as the exec plane would read it: the running server's
 * version (`display-message`), the program's own `-V` (the one login-shell
 * read Prepare makes), and every call recorded.
 */
const plane = vi.hoisted(() => ({
  calls: [] as string[],
  server: 'tmux 3.7c\n' as string | Error,
  program: 'tmux 3.7c\n' as string | Error
}));
function answer(args: readonly string[]): Promise<string> {
  plane.calls.push(args.join(' '));
  const verb = args[0] ?? '';
  if (verb.startsWith('shell:')) {
    // A program read that reached nothing (the second fix round's case).
    if (plane.program instanceof Error) {
      return verb.includes(' -V') ? Promise.reject(plane.program) : Promise.resolve('');
    }
    return Promise.resolve(plane.program);
  }
  if (verb === 'display-message') {
    return plane.server instanceof Error ? Promise.reject(plane.server) : Promise.resolve(plane.server);
  }
  return Promise.resolve('');
}
vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => answer(args),
  execRemoteShell: (_ctx: unknown, script: string) => answer([`shell:${script.slice(0, 40)}`])
}));

/**
 * The server set-up, answering what each test says: the result, or one of the
 * refusals the real one throws. It records the search list as the real one
 * does, so a Prepare that completes reads Ready.
 */
const setUp = vi.hoisted(() => ({
  refused: [] as { name: string; expected: boolean; outcome: 'fallback' | 'skipped' }[],
  throws: null as null | ((real: typeof import('../remote-server')) => unknown)
}));
vi.mock('../remote-server', async (importOriginal) => {
  const context = await import('../context');
  const real = await importOriginal<typeof import('../remote-server')>();
  return {
    ...real,
    ensureRemoteServer: async (ctx: { machineId: string }) => {
      await answer(['set-environment', '-g', 'PATH', '/usr/bin:/bin']);
      if (setUp.throws !== null) throw setUp.throws(real);
      context.setMachineRemotePath(ctx.machineId, '/usr/bin:/bin');
      return { born: false, remotePath: '/usr/bin:/bin', options: [], disagreed: [], refused: setUp.refused };
    },
    remoteServerVerdict: () => Promise.resolve('running')
  };
});

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
const { forgetMachineRuntime } = await import('../context');
const { rowSignInOf, resetRowFactsForTests } = await import('../row-facts');
const { resetRemoteSessionsForTests } = await import('../remote-sessions');
const { resetControlPlanesForTests } = await import('../control-plane');
const { resetSignInRetryForTests } = await import('../sign-in-retry');
const { assertFarPairUsable, farPairBlocksLive, farPairOf, resetFarTmuxForTests } = await import('../far-tmux');
const { gmuxError } = await import('../../errors');
const {
  MACHINE_TMUX_DISAGREES_HEADLINE,
  MACHINE_TMUX_TOO_OLD_HEADLINE,
  MACHINE_TMUX_UPDATED_HEADLINE,
  machineTmuxSettingRefused
} = await import('../errors');
const { machineStatusOf } = await import('../../../renderer/settings/machine-status');

const ID = 'deb13';
const ROW = {
  id: ID,
  label: 'Debian 13',
  color: 'cyan' as const,
  host: '127.0.0.1',
  user: 'tortie',
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

function rowView(): MachineRowView {
  const row = call<{ rows: MachineRowView[] }>('machines:rows').rows.find((one) => one.id === ID);
  if (row === undefined) throw new Error('no row');
  return row;
}

/** The program's own -V reads Prepare sent (the agent scan is a login shell too). */
function programReads(): string[] {
  return plane.calls.filter((line) => line.startsWith('shell:') && line.includes(' -V'));
}

async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

async function prepare(): Promise<MachinePrepareResult> {
  ensureConfigDir();
  writeFileSync(machinesPath(), JSON.stringify({ schema: 1, machines: [ROW] }, null, 2), 'utf8');
  loadMachines('boot');
  const now = machineRow(ID);
  if (now === null) throw new Error('not in the file');
  const summary = describeMachine(ID, machineFieldsOf(now));
  call('machines:confirm', { id: ID, hashRead: summary.hash, linesRead: [...summary.lines] });
  const result = await call<Promise<MachinePrepareResult>>('machines:prepare', ID);
  await settle();
  return result;
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-p342-prepare-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  plane.calls.length = 0;
  plane.server = 'tmux 3.7c\n';
  plane.program = 'tmux 3.7c\n';
  setUp.refused = [];
  setUp.throws = null;
  ptySpawns.length = 0;
  FakeControlClient.made = [];
  handlers.clear();
  resetMachinesStoreForTests();
  resetMachineTestForTests();
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRowFactsForTests();
  resetFarTmuxForTests();
  registerMachinesIpc(fakeIpc);
  fakeEvent = trustedInvokeEvent();
});

afterEach(() => {
  resetSignInRetryForTests();
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRowFactsForTests();
  resetFarTmuxForTests();
  forgetMachineRuntime(ID);
  resetMachineTestForTests();
  resetMachinesStoreForTests();
  rmSync(userData, { recursive: true, force: true });
});

describe('a program updated beside a server that kept running (D3, sentence 3)', () => {
  it('runs the set-up and the feed, opens no live connection, and answers the pair sentence', async () => {
    plane.server = 'tmux 3.5a\n';
    plane.program = 'tmux 3.6b\n';
    const result = await prepare();
    expect(result.class).toBe('program-refused');
    expect(result.alarm).toBe(false);
    expect(result.headline).toBe(MACHINE_TMUX_UPDATED_HEADLINE);
    expect(result.detail).toBe(
      'Tortie has not measured tmux 3.6b with the tmux 3.5a that still runs them, so it opens no ' +
        'session there. After that machine restarts, Tortie can restore them.'
    );
    expect(result.detail).not.toMatch(/could not reach/i);
    // The program was read once, beside the server, and the set-up ran.
    expect(programReads()).toHaveLength(1);
    expect(plane.calls).toContain('set-environment -g PATH /usr/bin:/bin');
    // The verdict is recorded against the server it was read beside, and an
    // attach is refused with its first line before anything spawns.
    expect(farPairOf(ID)).toEqual({ server: '3.5a', program: '3.6b', kind: 'refused' });
    expect(() => assertFarPairUsable(ID)).toThrow(MACHINE_TMUX_UPDATED_HEADLINE);
    // No live connection is opened across a pair that never greets.
    expect(FakeControlClient.made).toHaveLength(0);
    expect(ptySpawns).toEqual([]);
    // The row reads Not usable with main's own first sentence (D18).
    const status = machineStatusOf(rowView(), { preparing: false });
    expect(status.chip).toBe('not-usable');
    expect(status.next).toBeNull();
    expect(rowSignInOf(ID)?.class).toBe('program-refused');
  });

  it('a program measured with that server (3.3a under 3.5a) is prepared, with no sentence', async () => {
    plane.server = 'tmux 3.3a\n';
    plane.program = 'tmux 3.5a\n';
    setUp.refused = [
      { name: 'copy-mode-position-format', expected: true, outcome: 'skipped' },
      { name: 'mode-style', expected: true, outcome: 'fallback' }
    ];
    const result = await prepare();
    expect(result.class).toBe('prepared');
    expect(result.note ?? null).toBeNull();
    expect(farPairOf(ID)).toEqual({ server: '3.3a', program: '3.5a', kind: 'measured' });
    expect(() => assertFarPairUsable(ID)).not.toThrow();
  });

  // PHASE 342'S SECOND FIX ROUND. The verifier's ablation M5 recorded an
  // unreached program read as `unreadable`, which keeps the machine off its
  // live connection for the rest of the run, and nothing went red. A read that
  // reached nothing learnt nothing about the pair: no verdict is recorded,
  // and one an earlier Prepare recorded against the same server stands.
  it('a program read beside a warm 3.5a server that reached nothing records no verdict and blocks nothing', async () => {
    plane.server = 'tmux 3.5a\n';
    plane.program = gmuxError(
      'TMUX_UNREACHABLE',
      'Tortie could not reach deb13.',
      'refused: ssh: connect to host 127.0.0.1 port 2222: Connection refused'
    );
    const result = await prepare();
    expect(programReads()).toHaveLength(1);
    expect(farPairOf(ID)).toBeNull();
    expect(farPairBlocksLive(ID)).toBe(false);
    expect(() => assertFarPairUsable(ID)).not.toThrow();
    expect(result.class).toBe('prepared');
  });

  it('a program read that reached nothing leaves the verdict an earlier Prepare recorded standing', async () => {
    plane.server = 'tmux 3.5a\n';
    plane.program = 'tmux 3.6b\n';
    await prepare();
    expect(farPairOf(ID)?.kind).toBe('refused');
    plane.program = gmuxError(
      'TMUX_UNREACHABLE',
      'Tortie could not reach deb13.',
      'refused: ssh: connect to host 127.0.0.1 port 2222: Connection refused'
    );
    const again = await call<Promise<MachinePrepareResult>>('machines:prepare', ID);
    await settle();
    expect(again.class).toBe('program-refused');
    expect(farPairOf(ID)).toEqual({ server: '3.5a', program: '3.6b', kind: 'refused' });
  });

  it('a machine from 3.6 on is sent no program read at all', async () => {
    plane.server = 'tmux 3.6a\n';
    const result = await prepare();
    expect(result.class).toBe('prepared');
    expect(programReads()).toHaveLength(0);
    expect(farPairOf(ID)?.kind).toBe('server-only');
  });
});

describe('a server that refused a setting Tortie cannot do without (D6, sentence 1)', () => {
  it('answers program-refused with the version and the purpose, never "could not reach"', async () => {
    setUp.throws = (real) =>
      new real.RemoteTmuxRefused(
        { kind: 'required', name: 'remain-on-exit', purpose: 'failed-screen', version: '3.7c', lines: 25_000 },
        false
      );
    const result = await prepare();
    expect(result.class).toBe('program-refused');
    expect(result.alarm).toBe(false);
    expect(result.headline).toBe(MACHINE_TMUX_TOO_OLD_HEADLINE);
    expect(result.detail).toBe(
      "tmux 3.7c would not keep a session's screen when its program fails, so Tortie will not start sessions there."
    );
    expect(`${result.headline} ${result.detail}`).not.toMatch(/could not reach|recognise the reason/i);
    expect(machineStatusOf(rowView(), { preparing: false }).chip).toBe('not-usable');
  });
});

describe('a server Tortie started that is not the version its program said (D9, sentence 4)', () => {
  it('answers sentence (4) and draws the version the server RUNS (the fix round)', async () => {
    plane.server = new Error('no server running on /tmp/tmux-1000/gmux');
    plane.program = 'tmux 3.7c\n';
    setUp.throws = (real) => new real.RemoteTmuxRefused({ kind: 'disagrees', said: '3.7c', ran: '3.2a' }, true);
    const result = await prepare();
    expect(result.class).toBe('program-refused');
    expect(result.headline).toBe(MACHINE_TMUX_DISAGREES_HEADLINE);
    expect(result.detail).toBe('It says 3.7c and runs as 3.2a, so Tortie will not use it.');
    expect(result.version).toBe('3.2a');
    expect(result.serverBorn).toBe(true);
  });
});

/**
 * PHASE 342'S SECOND FIX ROUND (the second verifier's nit). The next Prepare
 * of a warm server whose program this run saw lie about its version reads the
 * same program beside it: it is said as sentence (4) again, with the version
 * the server RUNS, never "updated while its sessions kept running … After that
 * machine restarts, Tortie can restore them", which is false of it.
 */
describe('the next Prepare beside a server whose program lied (the second fix round)', () => {
  it('says sentence (4) and the version it runs, never the update sentence', async () => {
    plane.server = 'tmux 3.2a\n';
    plane.program = 'tmux 3.7c\n';
    // What the set-up that started this server recorded (the stand-in set-up
    // here does not run it).
    const leaf = await import('../far-tmux');
    leaf.noteFarServerVersion(ID, '3.2a');
    leaf.noteFarDisagreement(ID, '3.7c', '3.2a');
    const result = await prepare();
    expect(result.class).toBe('program-refused');
    expect(result.headline).toBe(MACHINE_TMUX_DISAGREES_HEADLINE);
    expect(result.detail).toBe('It says 3.7c and runs as 3.2a, so Tortie will not use it.');
    expect(result.version).toBe('3.2a');
    expect(`${result.headline} ${result.detail}`).not.toMatch(/updated|restarts/);
    expect(() => assertFarPairUsable(ID)).toThrow(MACHINE_TMUX_DISAGREES_HEADLINE);
  });

  it('a program nobody saw lie, beside the same server, is still said as an update', async () => {
    plane.server = 'tmux 3.2a\n';
    plane.program = 'tmux 3.7c\n';
    const result = await prepare();
    expect(result.headline).toBe(MACHINE_TMUX_UPDATED_HEADLINE);
  });
});

describe('a refused optional setting (D7, sentence 2, and the fix round)', () => {
  it('one the measurement did not predict: prepared, the sentence at the end of the detail and alone as note', async () => {
    setUp.refused = [{ name: 'allow-passthrough', expected: false, outcome: 'skipped' }];
    const result = await prepare();
    const note = machineTmuxSettingRefused('3.7c');
    expect(result.class).toBe('prepared');
    expect(result.note).toBe(note);
    expect(result.detail.endsWith(note)).toBe(true);
    // The row carries it, and the Ready hover draws it after its own sentence.
    const row = rowView();
    expect(row.signIn?.note).toBe(note);
    expect(rowSignInOf(ID)?.note).toBe(note);
    const status = machineStatusOf({ ...row, ready: true, link: 'connected' }, { preparing: false });
    expect(status.chip).toBe('ready');
    expect(status.hover.endsWith(note)).toBe(true);
  });

  it('only refusals the row lacks: prepared, with no sentence anywhere', async () => {
    plane.server = 'tmux 3.2a\n';
    plane.program = 'tmux 3.2a\n';
    setUp.refused = [
      { name: 'allow-passthrough', expected: true, outcome: 'skipped' },
      { name: 'copy-mode-position-format', expected: true, outcome: 'skipped' },
      { name: 'mode-style', expected: true, outcome: 'fallback' }
    ];
    const result = await prepare();
    expect(result.class).toBe('prepared');
    expect(result.note ?? null).toBeNull();
    expect(result.detail).not.toContain("too old for one of Tortie's settings");
    expect(rowView().signIn?.note ?? null).toBeNull();
  });
});

describe("a failure the taxonomy places never draws a gmux error's JSON (the fix round)", () => {
  it("the exec plane's catch-all, whose message is the failed command line, draws the taxonomy's sentence", async () => {
    setUp.throws = () =>
      gmuxError(
        'UNKNOWN',
        "/usr/bin/ssh -o BatchMode=yes -p 2222 tortie@127.0.0.1 '/usr/bin/tmux' -L gmux set-option -g mouse off",
        'something nobody recognises'
      );
    const result = await prepare();
    expect(result.class).not.toBe('prepared');
    expect(result.detail).not.toMatch(/\/usr\/bin\/ssh|BatchMode|\{"code"/);
  });

  it('a gmux error that carries a sentence for a person draws that sentence, never its payload', async () => {
    setUp.throws = () => gmuxError('INVALID_INPUT', 'That machine would not report its program search list.', 'detail for the log');
    const result = await prepare();
    expect(result.detail).toBe('That machine would not report its program search list.');
    expect(result.detail).not.toContain('{');
  });
});
