/**
 * PHASE 101. What crosses the bridge when a person lets Tortie save on one
 * machine.
 *
 * WHY THIS FILE EXISTS, and the reason is the one machines-store.test.ts gives
 * for itself. What matters here is the PAYLOAD. A confirmation whose hash the
 * renderer composed would cover lines nobody read, and that is the one thing
 * the confirm gate exists to prevent. So these tests stand a fake bridge up,
 * run the store's own calls, and read what arrived on the other side.
 *
 * FOUR THINGS ARE HELD.
 *
 *  1. Reading the sheet sends the folder and nothing else, and the sheet that
 *     comes back is main's, held whole.
 *  2. The confirmation sends back main's hash and main's lines, both untouched.
 *  3. A folder main's validator refused leaves NO sheet behind, so there is
 *     nothing to press and no stale hash to send.
 *  4. A sheet read for one folder is never sent with another. The hash covers
 *     the folder, so the two travel together or neither does.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MachineAllowWritesInput,
  MachineConfirmSheet,
  MachineWriteSheetInput,
  MachinesResult
} from '@shared/ipc';
import { useMachinesStore } from '../machines-store';

const SHEET: MachineConfirmSheet = {
  hash: 'c3d4'.repeat(16),
  lines: [
    'Machine: 127.0.0.1',
    'Runs this program on that machine: /opt/homebrew/bin/tmux',
    'May replace files under this folder on that machine: /Users/gdc'
  ],
  warning: 'the warning main owns',
  writeHonesty: 'the paragraph main owns'
};

const recorded = {
  sheets: [] as MachineWriteSheetInput[],
  allows: [] as MachineAllowWritesInput[]
};

/** Main's own refusal for a folder that did not validate. */
let sheetThrows: string | null = null;

function emptyRows(): MachinesResult {
  return {
    rows: [],
    errors: [],
    directory: '/scratch/config',
    path: '/scratch/config/machines.json',
    present: false,
    honesty: 'honesty',
    warning: 'warning',
    ssh: { path: '/usr/bin/ssh', source: 'pinned' }
  };
}

function installBridge(): void {
  recorded.sheets = [];
  recorded.allows = [];
  sheetThrows = null;
  const machines = {
    rows: async () => emptyRows(),
    reload: async () => emptyRows(),
    onTestEvent: () => () => undefined,
    state: async () => [],
    onStateChanged: () => () => undefined,
    writeSheet: async (input: MachineWriteSheetInput) => {
      recorded.sheets.push(input);
      if (sheetThrows !== null) throw new Error(sheetThrows);
      return SHEET;
    },
    allowWrites: async (input: MachineAllowWritesInput) => {
      recorded.allows.push(input);
      return { id: input.id } as unknown as never;
    }
  };
  vi.stubGlobal('window', { gmux: { machines } });
}

beforeEach(() => {
  installBridge();
  useMachinesStore.setState({ writeSheets: {}, allowing: null });
});

describe('reading the sheet', () => {
  it('sends the folder and holds what main answered', async () => {
    const error = await useMachinesStore.getState().writeSheet('m1', '/Users/gdc');
    expect(error).toBe(null);
    expect(recorded.sheets).toEqual([{ id: 'm1', writeRoot: '/Users/gdc' }]);
    expect(useMachinesStore.getState().writeSheets.m1).toEqual({
      root: '/Users/gdc',
      sheet: SHEET
    });
  });

  it('composes no line and no hash of its own', async () => {
    await useMachinesStore.getState().writeSheet('m1', '/Users/gdc');
    const held = useMachinesStore.getState().writeSheets.m1;
    expect(held?.sheet.lines).toBe(SHEET.lines);
    expect(held?.sheet.hash).toBe(SHEET.hash);
    expect(held?.sheet.writeHonesty).toBe('the paragraph main owns');
  });

  it('leaves no sheet behind when main refused the folder', async () => {
    await useMachinesStore.getState().writeSheet('m1', '/Users/gdc');
    sheetThrows = 'writeRoot must be an absolute path.';
    const error = await useMachinesStore.getState().writeSheet('m1', 'Users/gdc');
    expect(error).toBe('writeRoot must be an absolute path.');
    // A sheet left standing under a field the person has since corrected would
    // be a hash bound to the folder they typed first.
    expect(useMachinesStore.getState().writeSheets.m1).toBeUndefined();
  });
});

describe('turning saving on', () => {
  it('sends main\'s hash and main\'s lines, both untouched', async () => {
    await useMachinesStore.getState().writeSheet('m1', '/Users/gdc');
    const error = await useMachinesStore.getState().allowWrites('m1');
    expect(error).toBe(null);
    expect(recorded.allows).toEqual([
      {
        id: 'm1',
        writeRoot: '/Users/gdc',
        hashRead: SHEET.hash,
        linesRead: SHEET.lines
      }
    ]);
  });

  it('sends nothing at all when no sheet was read', async () => {
    const error = await useMachinesStore.getState().allowWrites('m1');
    expect(error).toBe(null);
    expect(recorded.allows).toEqual([]);
  });

  it('forgets the sheet once the confirmation landed', async () => {
    await useMachinesStore.getState().writeSheet('m1', '/Users/gdc');
    await useMachinesStore.getState().allowWrites('m1');
    expect(useMachinesStore.getState().writeSheets.m1).toBeUndefined();
  });

  it('never sends one machine\'s sheet under another machine', async () => {
    await useMachinesStore.getState().writeSheet('m1', '/Users/gdc');
    await useMachinesStore.getState().allowWrites('m2');
    expect(recorded.allows).toEqual([]);
  });

  it('drops the sheet when the field is closed', async () => {
    await useMachinesStore.getState().writeSheet('m1', '/Users/gdc');
    useMachinesStore.getState().clearWriteSheet('m1');
    expect(useMachinesStore.getState().writeSheets.m1).toBeUndefined();
  });
});
