/**
 * Phase 340, D7 and D8 as revised by §Attack: one Add press binds the same hash
 * `machines:add` recomputes, and accepts a version Tortie has not measured when
 * the check read one.
 *
 * What this file holds, each red if its clause is taken out of `ipc.ts`:
 *
 *  1. The whole chain through the registrar: a draft check (node-pty a
 *     stand-in fed the check's block) answers a sheet carrying
 *     `acceptedTmuxVersion`, the renderer echoes THAT field into `machines:add`,
 *     and the add writes the row with the version, records the agreement with
 *     the fifth line, and the row is confirmed.
 *  2. The same add without the version refuses, because the hash binds it.
 *  3. A version the pattern refuses, or one Tortie HAS measured, refuses with
 *     NOTHING written: no row, no agreement. An acceptance of a measured version
 *     is dropped from the lines and kept in the hash text (Phase 324), so a
 *     person would agree to a line they never saw.
 *  4. An add with no version, absent or null, writes the same row and the same
 *     hash it wrote before this phase, byte for byte.
 *
 * Nothing is spawned and no machine is contacted.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import type { MachineTestEvent, MachineTestOutcome } from '@shared/ipc';

let userData = '';
const MARKER = ' tortie-add-version ';

interface SpawnRecord {
  args: string[];
  data: ((chunk: string) => void) | null;
  exit: ((event: { exitCode: number }) => void) | null;
}
const spawned: SpawnRecord[] = [];

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

vi.mock('node-pty', () => ({
  spawn: (_file: string, args: string[]) => {
    const record: SpawnRecord = { args, data: null, exit: null };
    spawned.push(record);
    return {
      pid: 525252,
      onData: (cb: (chunk: string) => void) => {
        record.data = cb;
      },
      onExit: (cb: (event: { exitCode: number }) => void) => {
        record.exit = cb;
      },
      write: () => undefined,
      kill: () => undefined
    };
  }
}));

vi.mock('../../menu', () => ({ openFolderOnMachine: () => true }));

const { registerMachinesIpc } = await import('../ipc');
const { describeMachine, isMachineConfirmed, listMachineConfirmations } = await import(
  '../confirm'
);
const { loadMachines, machineFieldsOf, machinesPath, resetMachinesStoreForTests } =
  await import('../store');
const { resetMachineTestForTests } = await import('../connection-test');
const { CHECK_MARKER } = await import('../check-script');
const { REMOTE_PATH_MARKER } = await import('../carriage');
const { trustedInvokeEvent } = await import('../../security/__tests__/trusted-test-sender');

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();
const fakeIpc = {
  handle: (channel: string, fn: Handler) => {
    handlers.set(channel, fn);
  }
} as unknown as IpcMain;

/** What the window that started a test was sent. */
const sent: MachineTestEvent[] = [];

function event(): IpcMainInvokeEvent {
  const base = trustedInvokeEvent();
  const sender = base.sender as unknown as Record<string, unknown>;
  sender['isDestroyed'] = () => false;
  sender['send'] = (_channel: string, payload: MachineTestEvent) => {
    sent.push(payload);
  };
  sender['once'] = () => undefined;
  return base;
}

function call<T>(channel: string, ...args: unknown[]): T {
  const fn = handlers.get(channel);
  if (fn === undefined) throw new Error(`${channel} was never registered`);
  return fn(event(), ...args) as T;
}

const DRAFT = { id: 'studio', host: '127.0.0.1', user: 'greg', port: 2222, remoteTmuxPath: null };
const FIFTH = 'Accepts this version of the program, which Tortie has not measured: 3.9z';

/** One check's block, as the far script prints it through a terminal. */
function block(path: string, version: string): string {
  return (
    [
      CHECK_MARKER,
      'user=greg',
      'os=Darwin',
      'login=read',
      `cand=login ${path}`,
      'count=1',
      `version=tmux ${version}`,
      `${REMOTE_PATH_MARKER}${path}${REMOTE_PATH_MARKER}`,
      CHECK_MARKER
    ].join('\r\n') + '\r\n'
  );
}

/** Run a draft check to its end against the stand-in, and hand back its outcome. */
function check(path: string, version: string): MachineTestOutcome {
  call('machines:test', { mode: 'draft', draft: DRAFT });
  const pty = spawned[spawned.length - 1];
  if (pty === undefined) throw new Error('nothing was started');
  pty.data?.(block(path, version));
  pty.exit?.({ exitCode: 0 });
  const end = sent.find((e) => e.kind === 'end');
  if (end === undefined || end.kind !== 'end') throw new Error('no end event');
  return end.outcome;
}

/** What the renderer sends from a sheet, the version echoed from the sheet itself. */
function addFrom(outcome: MachineTestOutcome): Record<string, unknown> {
  const sheet = outcome.sheet;
  if (sheet === null || sheet === undefined) throw new Error('no sheet');
  return {
    id: DRAFT.id,
    label: 'Studio',
    color: 'cyan',
    host: DRAFT.host,
    user: DRAFT.user,
    port: DRAFT.port,
    remoteTmuxPath: outcome.resolvedPath,
    hashRead: sheet.hash,
    linesRead: [...sheet.lines],
    acceptedTmuxVersion: sheet.acceptedTmuxVersion ?? null
  };
}

function fileRows(): Record<string, unknown>[] {
  if (!existsSync(machinesPath())) return [];
  const parsed = JSON.parse(readFileSync(machinesPath(), 'utf8')) as {
    machines: Record<string, unknown>[];
  };
  return parsed.machines;
}

/** Nothing was written: no row in the file and no agreement on record. */
function expectNothingWritten(): void {
  expect(fileRows()).toEqual([]);
  expect(loadMachines('reload').rows).toEqual([]);
  expect(listMachineConfirmations()).toEqual([]);
}

/** Every scratch data directory this file made, removed after each test. */
const made: string[] = [];

/** A fresh data directory, store and registrar, as a new launch would have. */
function freshWorld(): void {
  userData = mkdtempSync(join(tmpdir(), 'tortie-p340-add-version-'));
  made.push(userData);
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  spawned.length = 0;
  sent.length = 0;
  handlers.clear();
  resetMachinesStoreForTests();
  resetMachineTestForTests();
  registerMachinesIpc(fakeIpc);
  loadMachines('boot');
}

beforeEach(() => {
  freshWorld();
});

afterEach(() => {
  resetMachineTestForTests();
  resetMachinesStoreForTests();
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('one Add press accepts the version the check read (D7)', () => {
  it('the sheet binds 3.9z, the add writes it, records the fifth line and confirms', () => {
    const outcome = check('/odd/tmux', '3.9z');
    expect(outcome.class).toBe('ok');
    expect(outcome.check?.versionKind).toBe('unmeasured');
    expect(outcome.sheet?.acceptedTmuxVersion).toBe('3.9z');
    expect(outcome.sheet?.lines).toContain(FIFTH);

    const view = call<{ state: string; acceptedTmuxVersion: string | null }>(
      'machines:add',
      addFrom(outcome)
    );
    expect(view.state).toBe('confirmed');
    expect(view.acceptedTmuxVersion).toBe('3.9z');

    const rows = fileRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.['acceptedTmuxVersion']).toBe('3.9z');
    expect(rows[0]?.['remoteTmuxPath']).toBe('/odd/tmux');

    const records = listMachineConfirmations();
    expect(records).toHaveLength(1);
    expect(records[0]?.hash).toBe(outcome.sheet?.hash);
    expect(records[0]?.lines).toContain(FIFTH);

    const row = loadMachines('reload').rows[0];
    if (row === undefined) throw new Error('no row');
    expect(isMachineConfirmed(row.id, machineFieldsOf(row))).toBe(true);
    // Nothing but the check itself was started.
    expect(spawned).toHaveLength(1);
  });

  it('the same add with the version dropped refuses, because the hash binds it', () => {
    const outcome = check('/odd/tmux', '3.9z');
    const input = { ...addFrom(outcome), acceptedTmuxVersion: null };
    expect(() => call('machines:add', input)).toThrow(/changed after it was shown/);
    expectNothingWritten();
  });

  it('a different accepted version than the sheet bound refuses', () => {
    const outcome = check('/odd/tmux', '3.9z');
    const input = { ...addFrom(outcome), acceptedTmuxVersion: '3.9y' };
    expect(() => call('machines:add', input)).toThrow(/changed after it was shown/);
    expectNothingWritten();
  });
});

describe('a version the add may not accept refuses with nothing written (D7)', () => {
  const base = {
    id: 'studio',
    label: 'Studio',
    color: 'cyan',
    host: '127.0.0.1',
    user: 'greg',
    port: 2222,
    remoteTmuxPath: '/odd/tmux'
  };

  it('a value the version pattern refuses', () => {
    for (const bad of ['', 'latest', '3.9z; rm -rf ~', 'v3.9z', '3'.repeat(40), 39]) {
      // A sheet that bound the very string, so only the pattern can refuse it.
      const sheet = describeMachine('studio', {
        host: base.host,
        user: base.user,
        port: base.port,
        remoteTmuxPath: base.remoteTmuxPath
      });
      expect(
        () =>
          call('machines:add', {
            ...base,
            hashRead: sheet.hash,
            linesRead: [...sheet.lines],
            acceptedTmuxVersion: bad
          }),
        String(bad)
      ).toThrow(/not a version Tortie can read/);
      expectNothingWritten();
    }
  });

  it('a version Tortie HAS measured, even with a sheet whose hash binds it', () => {
    const fields = {
      host: base.host,
      user: base.user,
      port: base.port,
      remoteTmuxPath: base.remoteTmuxPath,
      acceptedTmuxVersion: '3.6a'
    };
    const sheet = describeMachine('studio', fields);
    // The measured acceptance is not drawn as a line, which is the reason it
    // must not be recorded.
    expect(sheet.lines.join('\n')).not.toContain('3.6a');
    expect(() =>
      call('machines:add', {
        ...base,
        hashRead: sheet.hash,
        linesRead: [...sheet.lines],
        acceptedTmuxVersion: '3.6a'
      })
    ).toThrow(/which Tortie has measured/);
    expectNothingWritten();
  });

  it('a measured version is refused before the hash is compared', () => {
    expect(() =>
      call('machines:add', {
        ...base,
        hashRead: 'a hash from nowhere',
        linesRead: [],
        acceptedTmuxVersion: '3.6a'
      })
    ).toThrow(/which Tortie has measured/);
    expectNothingWritten();
  });
});

describe('an add with no version writes what it wrote before this phase (D16)', () => {
  it('a measured version: the sheet binds none, and the add writes no version key', () => {
    const outcome = check('/usr/local/bin/tmux', '3.6a');
    expect(outcome.check?.versionKind).toBe('measured');
    expect(outcome.sheet?.acceptedTmuxVersion).toBeNull();
    expect(outcome.sheet?.versionHonesty).toBeNull();
    // Today's base hash for the same id and fields, with no version at all.
    const before = describeMachine('studio', {
      host: DRAFT.host,
      user: DRAFT.user,
      port: DRAFT.port,
      remoteTmuxPath: '/usr/local/bin/tmux'
    });
    expect(outcome.sheet?.hash).toBe(before.hash);
    expect(outcome.sheet?.lines).toEqual([...before.lines]);

    call('machines:add', addFrom(outcome));
    const rows = fileRows();
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(
      ['color', 'host', 'id', 'label', 'port', 'remoteTmuxPath', 'user'].sort()
    );
    expect(listMachineConfirmations()[0]?.hash).toBe(before.hash);
  });

  it('absent and null are the same add, and the same hash', () => {
    const fields = {
      host: DRAFT.host,
      user: DRAFT.user,
      port: DRAFT.port,
      remoteTmuxPath: '/usr/local/bin/tmux'
    };
    const sheet = describeMachine('studio', fields);
    const input = {
      id: 'studio',
      label: 'Studio',
      color: 'cyan',
      ...fields,
      hashRead: sheet.hash,
      linesRead: [...sheet.lines]
    };
    call('machines:add', input);
    const absent = readFileSync(machinesPath(), 'utf8');
    const absentHash = listMachineConfirmations()[0]?.hash;

    // The same add, with the version sent as null, in a launch of its own.
    freshWorld();
    expect(fileRows()).toEqual([]);
    call('machines:add', { ...input, acceptedTmuxVersion: null });
    expect(readFileSync(machinesPath(), 'utf8')).toBe(absent);
    expect(listMachineConfirmations()[0]?.hash).toBe(absentHash);
    expect(absentHash).toBe(sheet.hash);
  });
});
