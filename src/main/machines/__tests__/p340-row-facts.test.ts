/**
 * Phase 340, D24 as revised by §Attack R14: what the Settings row knows from
 * main, held in memory and never in machines.json.
 *
 *  1. `./row-facts.ts` itself: the last Prepare's answer (the version kept when
 *     a later Prepare read none) and the system name, a listener told on every
 *     change and only on a change, and a forget that clears both.
 *  2. The writers: `prepareMachine` records every return of
 *     `prepareMachineOnce`, whoever called it; `./remote-image.ts` records
 *     `uname -s` where `machine-facts` is parsed.
 *  3. The registrar: `viewOf` carries `link`, `linkDetail`, `signIn` and `os`
 *     on every row, and a fact that changes re-broadcasts the state event the
 *     Settings window already refreshes on.
 *  4. The file: nothing of it reaches machines.json, and the module names no
 *     file system, manifest or store.
 *
 * node-pty is replaced and never called; the far read is a stand-in; nothing
 * is spawned and no machine is contacted.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';

let userData = '';
const MARKER = ' tortie-row-facts ';

/** Every push a window received, by channel. */
const pushed: { channel: string; payload: unknown }[] = [];

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  BrowserWindow: {
    getAllWindows: () => [
      {
        isDestroyed: () => false,
        webContents: {
          send: (channel: string, payload: unknown) => {
            pushed.push({ channel, payload });
          }
        }
      }
    ]
  },
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

vi.mock('node-pty', () => ({
  spawn: () => {
    throw new Error('this file must start nothing');
  }
}));

vi.mock('../../menu', () => ({ openFolderOnMachine: () => true }));

/** The far read, replaced: what `machine-facts` printed, and who asked. */
const far = vi.hoisted(() => ({ payload: '', asked: [] as string[] }));
vi.mock('../remote-run', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-run')>()),
  runRemoteRead: (ctx: { machineId: string }, script: string) => {
    far.asked.push(`${ctx.machineId}:${script}`);
    return Promise.resolve({ payload: far.payload });
  }
}));
vi.mock('../ready-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ready-context')>()),
  readyRemoteContext: (machineId: string) => ({ machineId })
}));

const facts = await import('../row-facts');
const { prepareMachine } = await import('../prepare');
const { readRemoteMachineFacts, remoteMachineHomeAnswer } = await import('../remote-image');
const { registerMachinesIpc } = await import('../ipc');
const { MACHINE_CONFIRM_ACKNOWLEDGEMENT, confirmMachine, describeMachine } = await import(
  '../confirm'
);
const { loadMachines, machineFieldsOf, machinesPath, resetMachinesStoreForTests } =
  await import('../store');
const { resetMachineTestForTests } = await import('../connection-test');
const { ensureConfigDir } = await import('../../config/paths');
const { trustedInvokeEvent } = await import('../../security/__tests__/trusted-test-sender');
const { EVT_MACHINE_STATE } = await import('@shared/ipc');

const ROW = {
  id: 'studio',
  label: 'Studio',
  color: 'cyan' as const,
  host: '127.0.0.1',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/local/bin/tmux'
};

const PREPARED = {
  class: 'prepared' as const,
  version: '3.6a',
  headline: 'This machine is ready.',
  detail: 'Tortie started the program.'
};

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-p340-row-facts-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  facts.resetRowFactsForTests();
  pushed.length = 0;
  far.asked.length = 0;
  far.payload = '';
  resetMachinesStoreForTests();
  resetMachineTestForTests();
});

afterEach(() => {
  facts.resetRowFactsForTests();
  resetMachinesStoreForTests();
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. The module
// ---------------------------------------------------------------------------

describe('row-facts holds two facts per machine, in memory', () => {
  it('records the last Prepare: class, time, version, headline and detail', () => {
    facts.noteRowSignIn('studio', PREPARED, 1_000);
    expect(facts.rowSignInOf('studio')).toEqual({
      class: 'prepared',
      at: 1_000,
      version: '3.6a',
      headline: 'This machine is ready.',
      detail: 'Tortie started the program.',
      // PHASE 342's fix round: a prepared answer's one appended sentence,
      // null when it carried none.
      note: null
    });
    expect(facts.rowSignInOf('other')).toBeNull();
  });

  it('keeps the version a later Prepare did not read', () => {
    facts.noteRowSignIn('studio', PREPARED, 1_000);
    facts.noteRowSignIn(
      'studio',
      { class: 'unreachable', version: null, headline: 'h', detail: 'd' },
      2_000
    );
    const now = facts.rowSignInOf('studio');
    expect(now?.class).toBe('unreachable');
    expect(now?.at).toBe(2_000);
    expect(now?.version).toBe('3.6a');
    facts.noteRowSignIn('studio', { ...PREPARED, version: '3.7c' }, 3_000);
    expect(facts.rowSignInOf('studio')?.version).toBe('3.7c');
  });

  it('records the system name, ignoring an empty answer', () => {
    facts.noteRowOs('studio', 'Darwin\n');
    expect(facts.rowOsOf('studio')).toBe('Darwin');
    facts.noteRowOs('studio', '   ');
    expect(facts.rowOsOf('studio')).toBe('Darwin');
    expect(facts.rowOsOf('other')).toBeNull();
  });

  it('tells a listener on every change, and not on a repeat of the same system', () => {
    let told = 0;
    const off = facts.onRowFactsChanged(() => {
      told += 1;
    });
    facts.noteRowOs('studio', 'Darwin');
    facts.noteRowOs('studio', 'Darwin');
    facts.noteRowSignIn('studio', PREPARED);
    expect(told).toBe(2);
    off();
    facts.noteRowOs('studio', 'Linux');
    expect(told).toBe(2);
  });

  it('a listener that throws stops neither the others nor the writer', () => {
    let second = 0;
    const offA = facts.onRowFactsChanged(() => {
      throw new Error('boom');
    });
    const offB = facts.onRowFactsChanged(() => {
      second += 1;
    });
    expect(() => facts.noteRowSignIn('studio', PREPARED)).not.toThrow();
    expect(second).toBe(1);
    offA();
    offB();
  });

  it('forgets both facts for one machine, and only that machine', () => {
    facts.noteRowSignIn('studio', PREPARED);
    facts.noteRowOs('studio', 'Darwin');
    facts.noteRowOs('other', 'Linux');
    let told = 0;
    const off = facts.onRowFactsChanged(() => {
      told += 1;
    });
    facts.forgetRowFacts('studio');
    expect(facts.rowSignInOf('studio')).toBeNull();
    expect(facts.rowOsOf('studio')).toBeNull();
    expect(facts.rowOsOf('other')).toBe('Linux');
    expect(told).toBe(1);
    facts.forgetRowFacts('studio');
    expect(told).toBe(1);
    off();
  });

  it('names no file system, no manifest, no store and nothing that spawns', () => {
    const text = readFileSync(join(__dirname, '..', 'row-facts.ts'), 'utf8');
    const imports = [...text.matchAll(/^import[^;]*from '([^']+)';/gm)].map((m) => m[1]);
    expect(imports).toEqual(['@shared/ipc']);
    expect(text).toMatch(/^import type \{/m);
    // Comments blanked, because the header says in words what the module does
    // not open, and the rule is about code.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(
      /node:fs|child_process|manifest|\.\/store|node-pty|require\(|import\(/
    );
    // Every import is type only, so nothing of `@shared/ipc` runs here either.
    expect(code.match(/^import /gm)).toHaveLength(1);
    expect(code).toMatch(/^import type \{[^}]*\} from '@shared\/ipc';$/m);
  });
});

// ---------------------------------------------------------------------------
// 2. The writers
// ---------------------------------------------------------------------------

describe('prepareMachine records every answer, whoever called it', () => {
  it('records a refusal from the gate, which is an answer like any other', async () => {
    const result = await prepareMachine({
      machineId: 'studio',
      fields: machineFieldsOf(ROW),
      tortieHostKeys: join(userData, 'known-machines')
    });
    // Nobody confirmed this machine, so the gate refused before anything ran.
    expect(result.class).toBe('unknown');
    const noted = facts.rowSignInOf('studio');
    expect(noted?.class).toBe(result.class);
    expect(noted?.headline).toBe(result.headline);
    expect(noted?.detail).toBe(result.detail);
    expect(noted?.version).toBeNull();
  });

  it('is a wrapper: the body is prepareMachineOnce and the one note is after it', () => {
    const text = readFileSync(join(__dirname, '..', 'prepare.ts'), 'utf8');
    const wrapper = /export async function prepareMachine\([\s\S]*?\n\}/.exec(text)?.[0] ?? '';
    expect(wrapper).toContain('const result = await prepareMachineOnce(input);');
    expect(wrapper).toContain('noteRowSignIn(input.machineId, result);');
    expect(text).toContain('export async function prepareMachineOnce(');
  });
});

describe('remote-image records the system where machine-facts is parsed', () => {
  it('readRemoteMachineFacts notes uname', async () => {
    far.payload = 'home=/Users/greg\nuname=Darwin\n';
    const out = await readRemoteMachineFacts('studio');
    expect(out.uname).toBe('Darwin');
    expect(facts.rowOsOf('studio')).toBe('Darwin');
    expect(far.asked).toEqual(['studio:machine-facts']);
  });

  it('the home read, which Prepare’s agent scan reaches, notes it too', async () => {
    far.payload = 'home=/home/greg\nuname=Linux\n';
    const answer = await remoteMachineHomeAnswer({ machineId: 'box' } as never);
    expect(answer).toEqual({ asked: true, home: '/home/greg' });
    expect(facts.rowOsOf('box')).toBe('Linux');
  });

  it('a machine that names no system leaves the fact unrecorded', async () => {
    far.payload = 'home=/Users/greg\n';
    await readRemoteMachineFacts('quiet');
    expect(facts.rowOsOf('quiet')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. The registrar
// ---------------------------------------------------------------------------

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();
const fakeIpc = {
  handle: (channel: string, fn: Handler) => {
    handlers.set(channel, fn);
  }
} as unknown as IpcMain;

function call<T>(channel: string, ...args: unknown[]): T {
  const fn = handlers.get(channel);
  if (fn === undefined) throw new Error(`${channel} was never registered`);
  return fn(trustedInvokeEvent(), ...args) as T;
}

function writeRows(): void {
  ensureConfigDir();
  writeFileSync(machinesPath(), JSON.stringify({ schema: 1, machines: [ROW] }, null, 2));
}

describe('the row view carries the facts, and a change re-broadcasts the state', () => {
  beforeEach(() => {
    handlers.clear();
    registerMachinesIpc(fakeIpc);
    writeRows();
    loadMachines('boot');
  });

  interface Row {
    id: string;
    link?: string | null;
    linkDetail?: string | null;
    signIn?: { note?: string | null } | null;
    os?: string | null;
  }

  it('an unprepared row carries every field, each reading unknown', () => {
    const rows = call<{ rows: Row[] }>('machines:rows').rows;
    expect(rows).toHaveLength(1);
    const row = rows[0] as Row;
    expect(row.signIn).toBeNull();
    expect(row.os).toBeNull();
    // An unconfirmed row is `refused` by the link composer, which is the
    // same answer `machines:state` gives for it.
    const states = call<{ id: string; link: string; detail: string | null }[]>(
      'machines:state'
    );
    expect(row.link).toBe(states[0]?.link);
    expect(row.linkDetail).toBe(states[0]?.detail ?? null);
  });

  it('carries the last sign in and the system once they are known', () => {
    facts.noteRowSignIn('studio', PREPARED, 5_000);
    facts.noteRowOs('studio', 'Darwin');
    const row = call<{ rows: Row[] }>('machines:rows').rows[0] as Row;
    expect(row.signIn).toEqual({
      class: 'prepared',
      at: 5_000,
      version: '3.6a',
      headline: 'This machine is ready.',
      detail: 'Tortie started the program.',
      note: null
    });
    expect(row.os).toBe('Darwin');
  });

  it("carries a prepared answer's note to the row view, and drops an empty one (Phase 342's fix round)", () => {
    facts.noteRowSignIn('studio', { ...PREPARED, note: 'A session there can look a little different.' }, 6_000);
    let row = call<{ rows: Row[] }>('machines:rows').rows[0] as Row;
    expect(row.signIn?.note).toBe('A session there can look a little different.');
    facts.noteRowSignIn('studio', { ...PREPARED, note: '   ' }, 7_000);
    row = call<{ rows: Row[] }>('machines:rows').rows[0] as Row;
    expect(row.signIn?.note).toBeNull();
  });

  it('a confirm answers a view with the same fields', () => {
    const sheet = describeMachine(ROW.id, machineFieldsOf(ROW));
    facts.noteRowOs('studio', 'Darwin');
    const view = call<Row>('machines:confirm', {
      id: 'studio',
      hashRead: sheet.hash,
      linesRead: [...sheet.lines]
    });
    expect(view.os).toBe('Darwin');
    expect('link' in view).toBe(true);
  });

  it('a fact that changes sends the state event again, the whole list', () => {
    pushed.length = 0;
    facts.noteRowSignIn('studio', PREPARED);
    const states = pushed.filter((p) => p.channel === EVT_MACHINE_STATE);
    expect(states).toHaveLength(1);
    expect(Array.isArray(states[0]?.payload)).toBe(true);
    pushed.length = 0;
    facts.noteRowOs('studio', 'Darwin');
    expect(pushed.filter((p) => p.channel === EVT_MACHINE_STATE)).toHaveLength(1);
  });

  it('subscribes once, however often the registrar is called', () => {
    registerMachinesIpc(fakeIpc);
    registerMachinesIpc(fakeIpc);
    pushed.length = 0;
    facts.noteRowOs('studio', 'Linux');
    expect(pushed.filter((p) => p.channel === EVT_MACHINE_STATE)).toHaveLength(1);
  });

  it('writes nothing of either fact into machines.json', () => {
    const sheet = describeMachine(ROW.id, machineFieldsOf(ROW));
    confirmMachine('studio', machineFieldsOf(ROW), {
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: sheet.hash,
      linesRead: [...sheet.lines]
    });
    facts.noteRowSignIn('studio', PREPARED);
    facts.noteRowOs('studio', 'Darwin');
    call('machines:rows');
    const file = readFileSync(machinesPath(), 'utf8');
    for (const word of ['signIn', 'os', 'link', 'Darwin', 'prepared', 'linkDetail']) {
      expect(file, word).not.toContain(`"${word}"`);
    }
    expect(file).not.toContain('Darwin');
  });
});
