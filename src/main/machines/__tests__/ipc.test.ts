/**
 * The ten channels, and the three sentences that decide whether this phase is
 * safe.
 *
 *  1. `machines:test` in `saved` mode asks the gate BEFORE it spawns anything.
 *     A machine nobody confirmed refuses, and node-pty is never called.
 *  2. `machines:add` refuses a stale hash and writes NOTHING, so a sheet that
 *     went out of date cannot add a machine a person never read.
 *  3. `machines:rows` opens no file. It reads what the store already has.
 *
 * node-pty is replaced by a counter, so the test can say "zero" about spawning
 * rather than "it looked fine". The counter is the same shape the module's own
 * `machineSshSpawnCount` has, and the two are asserted against each other.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';

let userData = '';
let keystore = true;

const MARKER = ' tortie-test-key ';

/** Every node-pty spawn this file caused. It must stay empty in most tests. */
const spawned: { file: string; args: string[] }[] = [];

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  safeStorage: {
    isEncryptionAvailable: () => keystore,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

vi.mock('node-pty', () => ({
  spawn: (file: string, args: string[]) => {
    spawned.push({ file, args });
    return {
      pid: 424242,
      onData: () => undefined,
      onExit: () => undefined,
      write: () => undefined,
      kill: () => undefined
    };
  }
}));

const { registerMachinesIpc } = await import('../ipc');
const {
  MACHINE_CONFIRM_ACKNOWLEDGEMENT,
  confirmMachine,
  describeMachine
} = await import('../confirm');
const {
  addMachineRow,
  loadMachines,
  machineFieldsOf,
  machinesDiskReads,
  machinesPath,
  resetMachinesStoreForTests
} = await import('../store');
const { machineSshSpawnCount, resetMachineTestForTests } = await import(
  '../connection-test'
);
const { ensureConfigDir } = await import('../../config/paths');
const { trustedInvokeEvent } = await import(
  '../../security/__tests__/trusted-test-sender'
);

const POP = {
  id: 'pop-os',
  label: 'Pop OS',
  color: 'cyan' as const,
  host: '127.0.0.1',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux'
};

// ---------------------------------------------------------------------------
// A fake IpcMain that lets a test call a handler directly
// ---------------------------------------------------------------------------

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();

const fakeIpc = {
  handle: (channel: string, fn: Handler) => {
    handlers.set(channel, fn);
  }
} as unknown as IpcMain;

/** What main pushed to the window that started a test. */
const sent: { channel: string; payload: unknown }[] = [];

/**
 * An invoke event from a sender the trust registry accepts, with a `send` that
 * records rather than crossing a process boundary.
 *
 * Since Phase 42 stage 1 the typed wrapper refuses any invoke whose sender is
 * not a window Tortie created, so a test that calls a captured handler has to
 * present a trusted event.
 */
function makeEvent(): IpcMainInvokeEvent {
  const base = trustedInvokeEvent();
  const sender = base.sender as unknown as Record<string, unknown>;
  sender['isDestroyed'] = () => false;
  sender['send'] = (channel: string, payload: unknown) => {
    sent.push({ channel, payload });
  };
  return base;
}

let fakeEvent: IpcMainInvokeEvent;

function call<T>(channel: string, ...args: unknown[]): T {
  const fn = handlers.get(channel);
  if (fn === undefined) throw new Error(`${channel} was never registered`);
  return fn(fakeEvent, ...args) as T;
}

function writeFile(value: unknown): void {
  ensureConfigDir();
  writeFileSync(machinesPath(), JSON.stringify(value, null, 2), 'utf8');
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-machines-ipc-'));
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  keystore = true;
  spawned.length = 0;
  sent.length = 0;
  handlers.clear();
  resetMachinesStoreForTests();
  resetMachineTestForTests();
  registerMachinesIpc(fakeIpc);
  fakeEvent = makeEvent();
});

afterEach(() => {
  resetMachineTestForTests();
  resetMachinesStoreForTests();
  rmSync(userData, { recursive: true, force: true });
});

describe('every channel is registered, and only these eleven', () => {
  it('registers exactly the eleven machines channels', () => {
    expect([...handlers.keys()].sort()).toEqual([
      'machines:add',
      'machines:confirm',
      'machines:forget',
      // Phase 69's one new channel. It starts something on another machine, and
      // it is the only channel in the product that does.
      'machines:prepare',
      'machines:reload',
      'machines:remove',
      'machines:rows',
      'machines:tailscaleNames',
      'machines:test',
      'machines:testCancel',
      'machines:testInput'
    ]);
  });

  it('registers no channel that opens a session', () => {
    for (const channel of handlers.keys()) {
      expect(channel).not.toContain('connect');
      expect(channel).not.toContain('attach');
      expect(channel).not.toContain('create');
    }
  });
});

describe('machines:rows', () => {
  it('opens no file', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const before = machinesDiskReads();
    call('machines:rows');
    call('machines:rows');
    expect(machinesDiskReads()).toBe(before);
  });

  it('carries the honesty line and the warning from main', () => {
    loadMachines('boot');
    const out = call<{ honesty: string; warning: string }>('machines:rows');
    expect(out.honesty).toContain('It cannot seal');
    expect(out.warning).toContain('sign in to as you');
  });

  it('reports a machine nobody confirmed as not usable, with its sentence', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const out = call<{ rows: { state: string; usable: boolean; refusal: string | null }[] }>(
      'machines:rows'
    );
    expect(out.rows[0]?.state).toBe('never');
    expect(out.rows[0]?.usable).toBe(false);
    expect(out.rows[0]?.refusal).toContain('nobody has confirmed it');
  });

  it('names the field and the reason for a row it dropped', () => {
    writeFile({
      schema: 1,
      machines: [POP, { id: 'broken', host: '-oProxyCommand=x' }]
    });
    loadMachines('boot');
    const out = call<{ errors: { field: string; reason: string }[] }>('machines:rows');
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]?.field).toContain('host');
    expect(out.errors[0]?.reason).toContain('hyphen');
  });
});

describe('machines:test in saved mode', () => {
  it('refuses a machine nobody confirmed BEFORE it spawns anything', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    expect(() => call('machines:test', { mode: 'saved', id: 'pop-os' })).toThrow(
      /nobody has confirmed it/
    );
    expect(spawned).toHaveLength(0);
    expect(machineSshSpawnCount()).toBe(0);
  });

  it('refuses a machine whose details changed, before it spawns anything', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const sheet = describeMachine('pop-os', machineFieldsOf(POP));
    confirmMachine('pop-os', machineFieldsOf(POP), {
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    writeFile({ schema: 1, machines: [{ ...POP, host: '127.0.0.2' }] });
    loadMachines('reload');
    expect(() => call('machines:test', { mode: 'saved', id: 'pop-os' })).toThrow(
      /details changed/
    );
    expect(spawned).toHaveLength(0);
  });

  it('refuses an id no row carries', () => {
    loadMachines('boot');
    expect(() => call('machines:test', { mode: 'saved', id: 'nope' })).toThrow(
      /no machine called nope/
    );
    expect(spawned).toHaveLength(0);
  });

  it('starts one client for a machine a person confirmed', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const sheet = describeMachine('pop-os', machineFieldsOf(POP));
    confirmMachine('pop-os', machineFieldsOf(POP), {
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    const started = call<{ testId: string; commandLine: string }>('machines:test', {
      mode: 'saved',
      id: 'pop-os'
    });
    expect(started.testId.length).toBeGreaterThan(10);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.args).toContain('BatchMode=no');
    expect(started.commandLine).toContain('BatchMode=no');
  });
});

describe('machines:test in draft mode', () => {
  it('does not ask the gate, because there is nothing to have confirmed', () => {
    loadMachines('boot');
    const started = call<{ testId: string }>('machines:test', {
      mode: 'draft',
      draft: { host: '127.0.0.1', user: null, port: 2222, remoteTmuxPath: null }
    });
    expect(started.testId.length).toBeGreaterThan(10);
    expect(spawned).toHaveLength(1);
  });

  it('still refuses a typed address the file would refuse', () => {
    loadMachines('boot');
    expect(() =>
      call('machines:test', {
        mode: 'draft',
        draft: {
          host: '-oProxyCommand=x',
          user: null,
          port: null,
          remoteTmuxPath: null
        }
      })
    ).toThrow(/hyphen/);
    expect(spawned).toHaveLength(0);
  });

  it('cancels the first test when a second one starts', () => {
    loadMachines('boot');
    const draft = {
      mode: 'draft' as const,
      draft: { host: '127.0.0.1', user: null, port: null, remoteTmuxPath: null }
    };
    const first = call<{ testId: string }>('machines:test', draft);
    call<{ testId: string }>('machines:test', draft);
    const ends = sent.filter(
      (row) => (row.payload as { kind: string }).kind === 'end'
    );
    expect(ends).toHaveLength(1);
    const ended = ends[0]?.payload as {
      testId: string;
      outcome: { class: string; alarm: boolean };
    };
    expect(ended.testId).toBe(first.testId);
    expect(ended.outcome.class).toBe('cancelled');
    expect(ended.outcome.alarm).toBe(false);
  });
});

describe('the confirm sheet a draft test hands back', () => {
  /** Drive one draft test to its end event, and return the outcome. */
  function runDraft(draft: Record<string, unknown>): {
    class: string;
    sheet: { hash: string; lines: string[]; warning: string } | null | undefined;
    resolvedPath: string | null;
  } {
    const started = call<{ testId: string }>('machines:test', { mode: 'draft', draft });
    // The fake pty never speaks, so the test is ended the way a person's Cancel
    // ends it, and then again as if the machine had answered. The first branch
    // proves a failed test carries no sheet.
    call('machines:testCancel', started.testId);
    const end = sent
      .map((row) => row.payload as { kind: string; outcome?: unknown })
      .filter((payload) => payload.kind === 'end')
      .pop();
    return (end?.outcome ?? {}) as {
      class: string;
      sheet: { hash: string; lines: string[]; warning: string } | null | undefined;
      resolvedPath: string | null;
    };
  }

  it('carries no sheet when the test did not succeed', () => {
    loadMachines('boot');
    const outcome = runDraft({
      id: 'probe',
      host: '127.0.0.1',
      user: null,
      port: null,
      remoteTmuxPath: null
    });
    expect(outcome.class).toBe('cancelled');
    expect(outcome.sheet ?? null).toBeNull();
  });

  it('carries no sheet when the person has not named the machine', () => {
    loadMachines('boot');
    const outcome = runDraft({
      host: '127.0.0.1',
      user: null,
      port: null,
      remoteTmuxPath: null
    });
    expect(outcome.sheet ?? null).toBeNull();
  });
});

describe('machines:add', () => {
  const sheetFor = (row: typeof POP): { hash: string; lines: string[] } => {
    const summary = describeMachine(row.id, machineFieldsOf(row));
    return { hash: summary.hash, lines: [...summary.lines] };
  };

  it('writes the row and records the confirmation in one call', () => {
    loadMachines('boot');
    const sheet = sheetFor(POP);
    const view = call<{ state: string; usable: boolean }>('machines:add', {
      ...POP,
      hashRead: sheet.hash,
      linesRead: sheet.lines
    });
    expect(view.state).toBe('confirmed');
    expect(view.usable).toBe(true);
    expect(loadMachines('reload').rows.map((r) => r.id)).toEqual(['pop-os']);
  });

  it('spawns nothing', () => {
    loadMachines('boot');
    const sheet = sheetFor(POP);
    call('machines:add', { ...POP, hashRead: sheet.hash, linesRead: sheet.lines });
    expect(spawned).toHaveLength(0);
    expect(machineSshSpawnCount()).toBe(0);
  });

  it('refuses a stale hash and writes NOTHING', () => {
    loadMachines('boot');
    expect(() =>
      call('machines:add', {
        ...POP,
        hashRead: 'a hash from an older sheet',
        linesRead: []
      })
    ).toThrow(/changed after it/);
    expect(loadMachines('reload').rows).toEqual([]);
  });

  it('refuses a second machine with the same id', () => {
    loadMachines('boot');
    const sheet = sheetFor(POP);
    call('machines:add', { ...POP, hashRead: sheet.hash, linesRead: sheet.lines });
    expect(() =>
      call('machines:add', { ...POP, hashRead: sheet.hash, linesRead: sheet.lines })
    ).toThrow(/already a machine called pop-os/);
  });

  it('refuses a row the schema would drop, naming the field', () => {
    loadMachines('boot');
    const bad = { ...POP, host: '-oProxyCommand=x' };
    const sheet = sheetFor(bad);
    expect(() =>
      call('machines:add', { ...bad, hashRead: sheet.hash, linesRead: sheet.lines })
    ).toThrow(/hyphen/);
    expect(loadMachines('reload').rows).toEqual([]);
  });

  it('keeps the row when the keychain refuses to seal, and says so', () => {
    loadMachines('boot');
    const sheet = sheetFor(POP);
    keystore = false;
    expect(() =>
      call('machines:add', { ...POP, hashRead: sheet.hash, linesRead: sheet.lines })
    ).toThrow(/system keychain is unavailable/);
    // The machine a person just made is still there. It is not usable, which is
    // honest, and it was not deleted because of a keychain hiccup.
    expect(loadMachines('reload').rows.map((r) => r.id)).toEqual(['pop-os']);
  });
});

describe('machines:confirm, forget and remove', () => {
  it('confirms an existing row from the sheet it was drawn from', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const summary = describeMachine('pop-os', machineFieldsOf(POP));
    const view = call<{ state: string }>('machines:confirm', {
      id: 'pop-os',
      hashRead: summary.hash,
      linesRead: [...summary.lines]
    });
    expect(view.state).toBe('confirmed');
    expect(spawned).toHaveLength(0);
  });

  it('withdraws an agreement so the machine asks again', () => {
    writeFile({ schema: 1, machines: [POP] });
    loadMachines('boot');
    const summary = describeMachine('pop-os', machineFieldsOf(POP));
    call('machines:confirm', {
      id: 'pop-os',
      hashRead: summary.hash,
      linesRead: [...summary.lines]
    });
    const view = call<{ state: string; usable: boolean }>('machines:forget', 'pop-os');
    expect(view.state).toBe('never');
    expect(view.usable).toBe(false);
  });

  it('removes the row and its record together', () => {
    loadMachines('boot');
    addMachineRow(POP);
    const summary = describeMachine('pop-os', machineFieldsOf(POP));
    call('machines:confirm', {
      id: 'pop-os',
      hashRead: summary.hash,
      linesRead: [...summary.lines]
    });
    const out = call<{ rows: unknown[] }>('machines:remove', 'pop-os');
    expect(out.rows).toEqual([]);
    // Putting the same machine back leaves it unconfirmed, because the record
    // went with the row.
    addMachineRow(POP);
    const after = call<{ rows: { state: string }[] }>('machines:rows');
    expect(after.rows[0]?.state).toBe('never');
  });
});
