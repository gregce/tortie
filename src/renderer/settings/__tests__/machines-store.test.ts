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
 *
 * PHASE 79 adds one field to the same file, being when the last look at
 * Tailscale finished. The panel says it on screen, so it has to be true on
 * both paths, and a look that threw is still a look.
 *
 * PHASE 79.1 adds the key install, and it is here rather than in a component
 * test for the same reason the add payload is. What matters is what crossed
 * the bridge: the hash main composed rather than one the renderer invented,
 * the machine the open test was about rather than whatever the form holds
 * now, and the password once and then never again. The last one is measured
 * by walking the whole store after the call and looking for the bytes.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
  MachineAddInput,
  MachineConfirmSheet,
  MachineKeyInstallInput,
  MachineKeyInstallResult,
  MachineKeySheet,
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
  installs: MachineKeyInstallInput[];
}

const recorded: Recorded = { tests: [], adds: [], installs: [] };

/** The password the tests type. It must exist in exactly one place. */
const PASSWORD = 'correct-horse-battery-staple';

/** Main's key sheet, as a fixture. Main composes it beside the hash. */
const KEY_SHEET: MachineKeySheet = {
  hash: 'c4'.repeat(32),
  lines: [
    'Machine: 127.0.0.1',
    'Port: 2222',
    'Writes this file on that machine: ~/.ssh/authorized_keys',
    'Keeps the private half of the key on this Mac, at: /scratch/keys/machine-3f2a91c04d7b'
  ],
  warning: 'the warning main owns',
  notes: ['the first note', 'the second note']
};

/** What main answers when the key went on. */
function installed(
  over: Partial<MachineKeyInstallResult> = {}
): MachineKeyInstallResult {
  return {
    id: 'scratch-box',
    class: 'key-installed',
    alarm: false,
    headline: 'The key is on that machine.',
    detail: 'Tortie added its key to that machine and is testing it now.',
    wrote: 'added',
    keyMade: true,
    fingerprint: 'SHA256:aaaa',
    transcript: 'Password:\n__TORTIE_KEY__added__TORTIE_KEY__\n',
    durationMs: 2_000,
    ...over
  };
}

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
function installBridge(answer: () => MachineKeyInstallResult = installed): void {
  recorded.tests = [];
  recorded.adds = [];
  recorded.installs = [];
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
    installKey: async (input: MachineKeyInstallInput) => {
      recorded.installs.push(input);
      return answer();
    },
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
    tailscaleReadAt: null,
    test: null,
    keyInstall: null
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

/** The end event for a machine that turned the sign in down. */
function testRefused(keySheet: MachineKeySheet | null): void {
  const live = useMachinesStore.getState().test;
  if (live === null) throw new Error('there is no live test to end');
  useMachinesStore.setState({
    test: {
      ...live,
      running: false,
      outcome: {
        testId: live.started.testId,
        class: 'auth-refused',
        alarm: false,
        headline: 'That machine turned the sign in down.',
        detail: 'The machine answered and would not let Tortie in.',
        resolvedPath: null,
        exitCode: 255,
        durationMs: 900,
        sheet: null,
        keySheet
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

describe('when the last look at Tailscale happened', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('is null before anything has looked', () => {
    expect(useMachinesStore.getState().tailscaleReadAt).toBeNull();
  });

  it('is a clock reading once a look has come back', async () => {
    const before = Date.now();
    await useMachinesStore.getState().findTailnet();
    const at = useMachinesStore.getState().tailscaleReadAt;
    expect(typeof at).toBe('number');
    expect(at ?? 0).toBeGreaterThanOrEqual(before);
    expect(useMachinesStore.getState().tailscaleBusy).toBe(false);
  });

  it('is a clock reading when the look threw, because a look happened', async () => {
    const api = (globalThis as { window?: { gmux?: { machines?: unknown } } })
      .window?.gmux?.machines as { tailscaleNames(): Promise<unknown> };
    api.tailscaleNames = async () => {
      throw new Error('the program was not there');
    };
    await useMachinesStore.getState().findTailnet();
    expect(typeof useMachinesStore.getState().tailscaleReadAt).toBe('number');
    expect(useMachinesStore.getState().tailscaleBusy).toBe(false);
  });
});

describe('setting up a key on one machine', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  /** One draft test that ended with the machine turning the sign in down. */
  async function draftWasRefused(
    keySheet: MachineKeySheet | null = KEY_SHEET
  ): Promise<void> {
    useMachinesStore
      .getState()
      .setForm({ host: '127.0.0.1', label: 'Scratch box', port: '2222' });
    await useMachinesStore.getState().startDraftTest();
    testRefused(keySheet);
  }

  it('sends main’s own hash and main’s own lines, never ones it wrote', async () => {
    await draftWasRefused();
    await useMachinesStore.getState().installKey(PASSWORD);
    expect(recorded.installs).toHaveLength(1);
    const sent = recorded.installs[0];
    expect(sent?.hashRead).toBe(KEY_SHEET.hash);
    expect(sent?.linesRead).toEqual(KEY_SHEET.lines);
  });

  it('sends the machine the open test was about, with the same id', async () => {
    await draftWasRefused();
    await useMachinesStore.getState().installKey(PASSWORD);
    const target = recorded.installs[0]?.target;
    expect(target?.mode).toBe('draft');
    expect(target?.mode === 'draft' ? target.draft.host : null).toBe('127.0.0.1');
    expect(target?.mode === 'draft' ? target.draft.port : null).toBe(2_222);
    expect(target?.mode === 'draft' ? target.draft.id : null).toBe('scratch-box');
  });

  it('sends the row when the test belonged to a saved row', async () => {
    await useMachinesStore.getState().startSavedTest('pop-os');
    testRefused(KEY_SHEET);
    await useMachinesStore.getState().installKey(PASSWORD);
    const target = recorded.installs[0]?.target;
    expect(target).toEqual({ mode: 'saved', id: 'pop-os' });
    expect(useMachinesStore.getState().keyInstall?.savedId).toBe('pop-os');
  });

  it('sends the password once and keeps it nowhere at all', async () => {
    await draftWasRefused();
    await useMachinesStore.getState().installKey(PASSWORD);
    expect(recorded.installs[0]?.password).toBe(PASSWORD);
    // The whole store, walked. The password crosses one call as an argument
    // and is never set into any field of this store, so no snapshot of it can
    // carry the bytes.
    const whole = JSON.stringify(useMachinesStore.getState());
    expect(whole).not.toContain(PASSWORD);
  });

  it('asks the machine itself once the key is on it', async () => {
    await draftWasRefused();
    await useMachinesStore.getState().installKey(PASSWORD);
    // Two tests: the one that refused, and the one that runs now. Tortie
    // saying the key is installed is not the machine signing Tortie in.
    expect(recorded.tests).toHaveLength(2);
    expect(recorded.tests[1]?.mode).toBe('draft');
    expect(useMachinesStore.getState().keyInstall?.result?.class).toBe(
      'key-installed'
    );
  });

  it('asks nothing again when the key did not go on', async () => {
    installBridge(() =>
      installed({ class: 'auth-refused', wrote: null, keyMade: false })
    );
    reset();
    await draftWasRefused();
    await useMachinesStore.getState().installKey(PASSWORD);
    expect(recorded.tests).toHaveLength(1);
    expect(useMachinesStore.getState().keyInstall?.result?.class).toBe(
      'auth-refused'
    );
  });

  it('sends nothing when main offered no key sheet', async () => {
    await draftWasRefused(null);
    const said = await useMachinesStore.getState().installKey(PASSWORD);
    expect(recorded.installs).toEqual([]);
    expect(said).toBeNull();
    expect(useMachinesStore.getState().keyInstall).toBeNull();
  });

  it('sends nothing with an empty field, and says what to type', async () => {
    await draftWasRefused();
    const said = await useMachinesStore.getState().installKey('');
    expect(recorded.installs).toEqual([]);
    expect(said).toContain('password first');
  });

  it('drops the answer when the address it was done to is edited', async () => {
    await draftWasRefused();
    await useMachinesStore.getState().installKey(PASSWORD);
    expect(useMachinesStore.getState().keyInstall).not.toBeNull();
    useMachinesStore.getState().setForm({ host: '127.0.0.2' });
    expect(useMachinesStore.getState().keyInstall).toBeNull();
  });

  it('keeps main’s sentence when the call was refused', async () => {
    installBridge(() => {
      throw new Error('Tortie did not set up a key, because the machine changed.');
    });
    reset();
    await draftWasRefused();
    const said = await useMachinesStore.getState().installKey(PASSWORD);
    expect(said).toContain('because the machine changed');
    expect(useMachinesStore.getState().keyInstall?.running).toBe(false);
    expect(useMachinesStore.getState().keyInstall?.result).toBeNull();
    expect(recorded.tests).toHaveLength(1);
  });
});
