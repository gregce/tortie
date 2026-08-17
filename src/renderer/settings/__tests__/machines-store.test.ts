/**
 * Phase 68. What the Add flow actually sends over the bridge.
 *
 * WHY THIS FILE EXISTS, and it is worth being blunt about it. The first build
 * of this phase passed every component test in add-machine.test.tsx and could
 * not add a single machine. The button was drawn, the button was enabled, the
 * lines were on screen, and the call under it sent `hashRead: ''`. Main
 * compared that against the hash it had just computed and refused with the
 * sentence about a machine that changed after it was shown. Nothing on screen
 * was wrong. What was wrong was the payload, and no test looked at the
 * payload.
 *
 * So these tests hold the payload. They stand a fake `window.gmux.machines` up,
 * run the store's own calls, and read what arrived on the other side.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
  MachineAddInput,
  MachineConfirmSheet,
  MachineTestInput,
  MachineTestStarted,
  MachinesResult
} from '@shared/ipc';
import { emptyForm, useMachinesStore } from '../machines-store';

const SHEET: MachineConfirmSheet = {
  hash: 'a1b2'.repeat(16),
  lines: [
    'Machine: 127.0.0.1',
    'Port: 2222',
    'Runs this program on that machine: /opt/homebrew/bin/tmux'
  ],
  warning:
    'This names a machine Tortie will sign in to as you, and a program it ' +
    'will run there with your files and your credentials.'
};

const STARTED: MachineTestStarted = {
  testId: 't-1',
  commandLine: '/usr/bin/ssh 127.0.0.1',
  sshPath: '/usr/bin/ssh'
};

interface Recorded {
  tests: MachineTestInput[];
  adds: MachineAddInput[];
}

const recorded: Recorded = { tests: [], adds: [] };

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

/**
 * A bridge that answers the way main does. The test hands the sheet back on
 * the outcome, because that is where main puts it.
 */
function installBridge(): void {
  recorded.tests = [];
  recorded.adds = [];
  const machines = {
    rows: async () => emptyRows(),
    reload: async () => emptyRows(),
    tailscaleNames: async () => ({
      binary: null,
      source: 'missing' as const,
      peers: [],
      note: null
    }),
    test: async (input: MachineTestInput) => {
      recorded.tests.push(input);
      return STARTED;
    },
    testInput: async () => undefined,
    testCancel: async () => undefined,
    add: async (input: MachineAddInput) => {
      recorded.adds.push(input);
      throw new Error('the fake bridge never writes a row');
    },
    confirm: async () => {
      throw new Error('not used');
    },
    forget: async () => {
      throw new Error('not used');
    },
    remove: async () => emptyRows(),
    onTestEvent: () => () => undefined
  };
  (globalThis as { window?: unknown }).window = { gmux: { machines } };
}

/** Put the store back where it starts, without touching the module flag. */
function reset(): void {
  useMachinesStore.setState({
    machines: null,
    busy: null,
    adding: false,
    form: emptyForm(),
    tailscale: null,
    tailscaleBusy: false,
    test: null
  });
}

/** The end event main sends, applied the way the subscription would. */
function testEnded(sheet: MachineConfirmSheet | null, resolvedPath: string | null): void {
  const live = useMachinesStore.getState().test;
  if (live === null) throw new Error('there is no live test to end');
  useMachinesStore.setState({
    test: {
      ...live,
      running: false,
      outcome: {
        testId: live.started.testId,
        class: resolvedPath === null ? 'unreachable' : 'ok',
        alarm: false,
        headline: 'headline',
        detail: 'detail',
        resolvedPath,
        exitCode: 0,
        durationMs: 900,
        sheet
      }
    }
  });
}

describe('the values the Add flow sends over the bridge', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('sends the machine id with the draft, so main can compose the sheet', async () => {
    useMachinesStore.getState().setForm({ host: '127.0.0.1', label: 'Scratch box' });
    await useMachinesStore.getState().startDraftTest();
    expect(recorded.tests).toHaveLength(1);
    const sent = recorded.tests[0];
    expect(sent?.mode).toBe('draft');
    expect(sent?.mode === 'draft' ? sent.draft.id : null).toBe('scratch-box');
    expect(useMachinesStore.getState().test?.draftId).toBe('scratch-box');
  });

  it('sends main’s own hash and main’s own lines, never an empty hash', async () => {
    useMachinesStore
      .getState()
      .setForm({ host: '127.0.0.1', label: 'Scratch box', port: '2222' });
    await useMachinesStore.getState().startDraftTest();
    testEnded(SHEET, '/opt/homebrew/bin/tmux');

    await useMachinesStore.getState().addMachine();
    expect(recorded.adds).toHaveLength(1);
    const add = recorded.adds[0];
    expect(add?.hashRead).toBe(SHEET.hash);
    expect(add?.linesRead).toEqual(SHEET.lines);
    expect(add?.id).toBe('scratch-box');
    expect(add?.host).toBe('127.0.0.1');
    expect(add?.port).toBe(2_222);
    expect(add?.remoteTmuxPath).toBe('/opt/homebrew/bin/tmux');
  });

  it('sends nothing at all when main sent no sheet back', async () => {
    useMachinesStore.getState().setForm({ host: '127.0.0.1', label: 'Scratch box' });
    await useMachinesStore.getState().startDraftTest();
    testEnded(null, '/opt/homebrew/bin/tmux');

    const said = await useMachinesStore.getState().addMachine();
    expect(recorded.adds).toEqual([]);
    expect(said).toContain('Run the connection test first.');
  });

  it('writes the row for the address that was tested, not the one in the form', async () => {
    // A name typed after the test is presentation and is not in the hash, so
    // it lands on the row. The address is in the hash, so editing it drops the
    // test entirely and there is nothing left to add.
    useMachinesStore.getState().setForm({ host: '127.0.0.1', label: 'Scratch box' });
    await useMachinesStore.getState().startDraftTest();
    testEnded(SHEET, '/opt/homebrew/bin/tmux');

    useMachinesStore.getState().setForm({ label: 'Renamed after the test' });
    expect(useMachinesStore.getState().test).not.toBeNull();
    await useMachinesStore.getState().addMachine();
    expect(recorded.adds[0]?.label).toBe('Renamed after the test');
    expect(recorded.adds[0]?.host).toBe('127.0.0.1');
  });

  it('drops a finished test when the address it was run against is edited', async () => {
    useMachinesStore.getState().setForm({ host: '127.0.0.1', label: 'Scratch box' });
    await useMachinesStore.getState().startDraftTest();
    testEnded(SHEET, '/opt/homebrew/bin/tmux');

    useMachinesStore.getState().setForm({ host: '127.0.0.2' });
    expect(useMachinesStore.getState().test).toBeNull();
    const said = await useMachinesStore.getState().addMachine();
    expect(recorded.adds).toEqual([]);
    expect(said).toContain('Run the connection test first.');
  });
});
