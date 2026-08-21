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
 * PHASE 110 adds which agents each machine has, and it is here for the same
 * reason again. What matters is that exactly one machine id and `fresh` true
 * crossed the bridge on a press, that nothing crossed it on a second press
 * while the first was still running, and that a read which failed left the
 * answer map byte for byte what it was. A row that flipped to `Not found`
 * because a machine was asleep would be a false claim about that machine.
 *
 * PHASE 79.1 adds the key install, and it is here rather than in a component
 * test for the same reason the add payload is. What matters is what crossed
 * the bridge: the hash main composed rather than one the renderer invented,
 * the machine the open test was about rather than whatever the form holds
 * now, and the password once and then never again. The last one is measured
 * by walking the whole store after the call and looking for the bytes.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MachineAcceptVersionInput,
  MachineAddInput,
  MachineAgentsView,
  MachineConfirmSheet,
  MachineKeyInstallInput,
  MachineKeyInstallResult,
  MachineKeySheet,
  MachinePrepareResult,
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
    'will run there with your files and your credentials.',
  // PHASE 101. Main answers this on every sheet. Null is the ordinary case,
  // being a machine nobody has let Tortie save files on.
  writeHonesty: null
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
  /** PHASE 83. Every acceptance that crossed the bridge, in order. */
  accepts: MachineAcceptVersionInput[];
  /** PHASE 83. Every machine id a prepare was asked for, in order. */
  prepares: string[];
  /** PHASE 110. Every agents read that crossed the bridge, in order. */
  agentReads: { id: string | null; fresh: boolean }[];
  /** PHASE 110. How many times the rows were re-read. */
  rowReads: number;
}

const recorded: Recorded = {
  tests: [],
  adds: [],
  installs: [],
  accepts: [],
  prepares: [],
  agentReads: [],
  rowReads: 0
};

/**
 * PHASE 110. What the two subscriptions were handed, so a test can push the
 * way main pushes rather than by writing the store itself.
 */
const pushes: {
  state: ((states: never[]) => void)[];
  agents: ((views: MachineAgentsView[]) => void)[];
} = { state: [], agents: [] };

/** PHASE 110. One machine's answer, as main composes it. */
function agentsView(
  over: Partial<MachineAgentsView> = {}
): MachineAgentsView {
  return {
    machineId: 'scratch-box',
    askedAt: 1_700_000_000_000,
    agents: [
      { agentId: 'claude', presence: 'present', path: '/usr/local/bin/claude' },
      { agentId: 'codex', presence: 'absent', path: null }
    ],
    ...over
  };
}

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

/** What Prepare answers for a machine that named a version nobody measured. */
const UNMEASURED: MachinePrepareResult = {
  id: 'scratch-box',
  class: 'version-unmeasured',
  alarm: false,
  headline: 'Tortie has not measured the program this machine runs.',
  detail: 'the detail main composed',
  version: '3.9a',
  supported: ['3.6a', '3.7b', '3.7c'],
  serverBorn: false,
  options: [],
  pathCaptured: false,
  durationMs: 500,
  acceptSheet: {
    hash: 'e5'.repeat(32),
    lines: [
      'Machine: 127.0.0.1',
      'Runs this program on that machine: /opt/homebrew/bin/tmux',
      'Accepts this version of the program, which Tortie has not measured: 3.9a'
    ],
    warning: 'the warning main owns',
    writeHonesty: null
  }
};

/** What Prepare answers once the version has been accepted. */
const PREPARED_AFTER_ACCEPT: MachinePrepareResult = {
  ...UNMEASURED,
  class: 'prepared',
  headline: 'This machine is ready.',
  serverBorn: true,
  acceptSheet: null
};

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
 * PHASE 110. What the fake `agents` call answers, or null for the ordinary
 * answer. A test that wants a refusal sets this instead of rebuilding the
 * whole bridge around one method.
 */
let agentsAnswer: (() => Promise<MachineAgentsView[]>) | null = null;

/**
 * A bridge that answers the way main does. The test hands the sheet back on
 * the outcome, because that is where main puts it.
 */
function installBridge(answer: () => MachineKeyInstallResult = installed): void {
  recorded.tests = [];
  recorded.adds = [];
  recorded.installs = [];
  recorded.accepts = [];
  recorded.prepares = [];
  recorded.agentReads = [];
  recorded.rowReads = 0;
  pushes.state = [];
  pushes.agents = [];
  const machines = {
    rows: async () => {
      recorded.rowReads += 1;
      return emptyRows();
    },
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
    // PHASE 83. Both calls the accept button makes, in the order it makes them.
    acceptVersion: async (input: MachineAcceptVersionInput) => {
      recorded.accepts.push(input);
      return { id: input.id } as unknown as never;
    },
    prepare: async (id: string) => {
      recorded.prepares.push(id);
      return PREPARED_AFTER_ACCEPT;
    },
    onTestEvent: () => () => undefined,
    // PHASE 110. The three methods `init` feature detects and the one call
    // the Rescan button makes. Each records what it was handed, so the test
    // reads the payload rather than the screen.
    state: async () => [],
    onStateChanged: (cb: (states: never[]) => void) => {
      pushes.state.push(cb);
      return () => undefined;
    },
    agents: async (id: string | null, fresh: boolean) => {
      recorded.agentReads.push({ id, fresh });
      if (agentsAnswer !== null) return agentsAnswer();
      return [agentsView({ machineId: id ?? 'scratch-box' })];
    },
    onAgentsChanged: (cb: (views: MachineAgentsView[]) => void) => {
      pushes.agents.push(cb);
      return () => undefined;
    }
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
    keyInstall: null,
    prepared: {},
    preparing: null,
    accepting: null,
    agentsByMachine: {},
    rescanning: {},
    rescanErrors: {}
  });
  agentsAnswer = null;
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

// ---------------------------------------------------------------------------
// PHASE 83. Accepting the version one machine reports
// ---------------------------------------------------------------------------
//
// The same rule this file was written for applies: what matters is the payload.
// The sheet is main's, and the store has to send back the hash it was drawn
// from and the lines that were on it, untouched. A renderer that composed
// either one would be a second composer, and main would refuse every acceptance
// with the sentence about a machine that changed after it was shown.

describe('accepting a version over the bridge', () => {
  beforeEach(() => {
    installBridge();
    reset();
    useMachinesStore.setState({ prepared: { 'scratch-box': UNMEASURED } });
  });

  it('sends the version, the hash and the lines main composed', async () => {
    const said = await useMachinesStore.getState().acceptVersion('scratch-box');
    expect(said).toBeNull();
    expect(recorded.accepts).toHaveLength(1);
    expect(recorded.accepts[0]).toEqual({
      id: 'scratch-box',
      version: '3.9a',
      hashRead: UNMEASURED.acceptSheet?.hash,
      linesRead: UNMEASURED.acceptSheet?.lines
    });
  });

  it('prepares the machine straight after, because that is what was asked for', async () => {
    await useMachinesStore.getState().acceptVersion('scratch-box');
    expect(recorded.prepares).toEqual(['scratch-box']);
    expect(useMachinesStore.getState().prepared['scratch-box']?.class).toBe(
      'prepared'
    );
  });

  it('sends nothing for a machine with no sheet to accept', async () => {
    useMachinesStore.setState({
      prepared: { 'scratch-box': { ...UNMEASURED, acceptSheet: null } }
    });
    expect(await useMachinesStore.getState().acceptVersion('scratch-box')).toBeNull();
    expect(recorded.accepts).toHaveLength(0);
    expect(recorded.prepares).toHaveLength(0);
  });

  it('leaves the button free again when the call was refused', async () => {
    (globalThis as { window?: unknown }).window = {
      gmux: {
        machines: {
          ...(globalThis as { window: { gmux: { machines: object } } }).window.gmux
            .machines,
          acceptVersion: async () => {
            throw new Error('Tortie did not accept that version for scratch-box.');
          },
          rows: async () => emptyRows()
        }
      }
    };
    const said = await useMachinesStore.getState().acceptVersion('scratch-box');
    expect(said).toContain('did not accept that version');
    expect(useMachinesStore.getState().accepting).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PHASE 110. Which agents each machine has
// ---------------------------------------------------------------------------
//
// `init` is idempotent behind a module level flag and `reset` deliberately does
// not touch it, so the three subscription tests take a fresh copy of the module
// rather than reaching in and clearing that flag. The fake bridge is on
// globalThis, so a fresh copy still finds it.

async function freshStore(): Promise<
  typeof import('../machines-store')['useMachinesStore']
> {
  vi.resetModules();
  const mod = await import('../machines-store');
  return mod.useMachinesStore;
}

/** Let the promise `init` started settle before reading what it wrote. */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('what init subscribes to, and what it reads once', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('reads the answer once from memory in main, and sends nothing anywhere', async () => {
    const store = await freshStore();
    store.getState().init();
    await settle();
    // `fresh` false is what makes this a memory read. `fresh` true would open
    // a connection to every machine the moment Settings opened.
    expect(recorded.agentReads).toEqual([{ id: null, fresh: false }]);
    expect(store.getState().agentsByMachine['scratch-box']?.agents).toHaveLength(2);
  });

  it('subscribes to the link state and to the answer, one each', async () => {
    const store = await freshStore();
    store.getState().init();
    await settle();
    expect(pushes.state).toHaveLength(1);
    expect(pushes.agents).toHaveLength(1);
  });

  it('re-reads the rows when a machine’s link state moved, and does nothing else', async () => {
    // This is the one line of plumbing. Without it the Rescan button's enabled
    // state is frozen at the moment Settings opened, because `ready` is
    // composed by main on every row it answers.
    const store = await freshStore();
    store.getState().init();
    await settle();
    const readsBefore = recorded.rowReads;
    const askedBefore = recorded.agentReads.length;
    pushes.state[0]?.([]);
    await settle();
    expect(recorded.rowReads).toBe(readsBefore + 1);
    // A state push must not ask any machine anything.
    expect(recorded.agentReads).toHaveLength(askedBefore);
  });

  it('replaces the whole answer map on a push, so a machine that left leaves it', async () => {
    const store = await freshStore();
    store.getState().init();
    await settle();
    expect(Object.keys(store.getState().agentsByMachine)).toEqual(['scratch-box']);
    pushes.agents[0]?.([agentsView({ machineId: 'pop' })]);
    expect(Object.keys(store.getState().agentsByMachine)).toEqual(['pop']);
  });
});

describe('the one call that reaches another computer', () => {
  beforeEach(() => {
    installBridge();
    reset();
  });

  it('asks one machine, once, with fresh true', async () => {
    await useMachinesStore.getState().rescanAgents('scratch-box');
    expect(recorded.agentReads).toEqual([{ id: 'scratch-box', fresh: true }]);
    expect(useMachinesStore.getState().rescanning).toEqual({});
    expect(
      useMachinesStore.getState().agentsByMachine['scratch-box']?.agents
    ).toHaveLength(2);
  });

  it('opens no second connection while the first read is still running', async () => {
    let answer!: (views: MachineAgentsView[]) => void;
    agentsAnswer = () =>
      new Promise<MachineAgentsView[]>((resolve) => {
        answer = resolve;
      });
    const first = useMachinesStore.getState().rescanAgents('scratch-box');
    await settle();
    expect(useMachinesStore.getState().rescanning).toEqual({ 'scratch-box': true });
    await useMachinesStore.getState().rescanAgents('scratch-box');
    expect(recorded.agentReads).toHaveLength(1);
    answer([agentsView()]);
    await first;
    expect(useMachinesStore.getState().rescanning).toEqual({});
  });

  it('lays one machine’s answer over the map and leaves every other alone', async () => {
    useMachinesStore.setState({
      agentsByMachine: { pop: agentsView({ machineId: 'pop' }) }
    });
    await useMachinesStore.getState().rescanAgents('scratch-box');
    expect(Object.keys(useMachinesStore.getState().agentsByMachine).sort()).toEqual([
      'pop',
      'scratch-box'
    ]);
  });

  it('records main’s sentence without the transport’s wrapper, and FLIPS NO ROW', async () => {
    const before = { 'scratch-box': agentsView() };
    useMachinesStore.setState({ agentsByMachine: before });
    agentsAnswer = () =>
      Promise.reject(
        new Error(
          "Error invoking remote method 'machines:agents': Error: Tortie has " +
            'not signed in to scratch-box in this run.'
        )
      );
    await useMachinesStore.getState().rescanAgents('scratch-box');
    expect(useMachinesStore.getState().rescanErrors['scratch-box']).toBe(
      'Tortie has not signed in to scratch-box in this run.'
    );
    // Byte for byte what it was. A read that failed is not evidence that an
    // agent is absent, so no row may flip to Not found because of one.
    expect(useMachinesStore.getState().agentsByMachine).toBe(before);
    expect(useMachinesStore.getState().rescanning).toEqual({});
  });

  it('draws main’s sentence and NOT the payload it travelled in', async () => {
    // The shape a real refusal has. `assertMachineIsConnected` throws a
    // GmuxError whose message is the JSON of {code, message, detail}, and
    // Electron puts its own prefix on the front. A person must read the
    // message field alone: not the code, not the braces, not the internal
    // script name in the detail.
    const payload = JSON.stringify({
      code: 'INVALID_INPUT',
      message: 'Tortie is not connected to scratch-box right now.',
      detail:
        'refused "agents-find" for machine scratch-box: its link reads down'
    });
    agentsAnswer = () =>
      Promise.reject(
        new Error(
          "Error invoking remote method 'machines:agents': GmuxError: " + payload
        )
      );
    await useMachinesStore.getState().rescanAgents('scratch-box');
    const shown = useMachinesStore.getState().rescanErrors['scratch-box'];
    expect(shown).toBe('Tortie is not connected to scratch-box right now.');
    expect(shown).not.toContain('INVALID_INPUT');
    expect(shown).not.toContain('{');
    expect(shown).not.toContain('agents-find');
    expect(shown).not.toContain('detail');
  });

  it('clears the last failure when the same machine is asked again', async () => {
    useMachinesStore.setState({ rescanErrors: { 'scratch-box': 'the old sentence' } });
    await useMachinesStore.getState().rescanAgents('scratch-box');
    expect(useMachinesStore.getState().rescanErrors).toEqual({});
  });

  it('returns and throws nothing on a build whose preload has no machines surface', async () => {
    (globalThis as { window?: unknown }).window = { gmux: {} };
    await expect(
      useMachinesStore.getState().rescanAgents('scratch-box')
    ).resolves.toBeUndefined();
    expect(recorded.agentReads).toHaveLength(0);
  });
});
