/**
 * Phase 270, BUILDER B. A create on ANOTHER MACHINE, driven end to end for the
 * one property Phase 269 left unproved: a named shell variable is either put on
 * the far side's own `new-session` line, or the person is told which name was
 * not — and either way the create SUCCEEDS.
 *
 * NOTHING HERE RUNS A COMMAND. The exec plane is replaced by a function that
 * records the argv it was handed, the same way `./remote-sessions.test.ts` does,
 * and for the same reason: every property below is about what Tortie SENDS and
 * what it refuses to send, and a test that let a command through to find out
 * would be the defect it is testing for. No ssh runs, no tmux server is started,
 * no machine is contacted and no shell is spawned on either side.
 *
 * ## THIS FILE IS THE CONTRACT BETWEEN THE TWO BUILDERS OF THIS PHASE
 *
 * It is RED at the parent by construction — `../remote-env-carriage` and
 * `../remote-env-probe` do not exist there, and `remoteCreate` asks nothing
 * about a variable. It goes green when BUILDER A's half lands against the API
 * pinned in `build/p270/SPEC.md` section 3. If it is still red after that half
 * lands, the two halves disagree about the API and the integrator's job is to
 * pick one spelling, never two.
 *
 * NO VALUE APPEARS ANYWHERE IN THIS FILE, and none could: the names travel and
 * the far machine's own login shell expands them, on that machine, into the
 * argv of that machine's own tmux. This Mac composes no value at all, which is
 * the sentence that bounds the whole phase.
 */

import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { gmuxError } from '../../errors';
import type { DurabilityNotice } from '@shared/notice';
import type { RemoteMachineContext } from '../context';

const MACHINE = 'popos';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: MACHINE,
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p270-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Every argv the plane was handed, in order. */
let sent: string[][] = [];
/** The options the plane was handed beside each argv, in the same order. */
let sentOptions: Record<string, unknown>[] = [];
/** What each verb answers with, keyed by the verb. */
let answers: Record<string, string | Error | (() => string)> = {};
/** The uuid the last create put on its own new-session line. */
let createdUuid = '';
/** Every login-shell command the plane was handed, in order. */
let shellCommands: string[] = [];

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation: 1, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../exec-plane')>()),
  execOn: (
    _ctx: unknown,
    args: readonly string[],
    options: Record<string, unknown> = {}
  ) => {
    sent.push([...args]);
    sentOptions.push({ ...options });
    if (args[0] === 'new-session') {
      const pair = args.find((one) => one.startsWith('GMUX_SESSION_ID=')) ?? '';
      createdUuid = pair.slice('GMUX_SESSION_ID='.length);
    }
    const answer = answers[args[0] ?? ''];
    if (answer instanceof Error) return Promise.reject(answer);
    if (typeof answer === 'function') return Promise.resolve(answer());
    return Promise.resolve(answer ?? '');
  },
  // THE VERIFIER'S ROUND ADDED THIS ARM. `ensureRemoteServer` captures the
  // machine's PATH through the login-shell door, and the create path now makes
  // that call on the branch that has names, so this file has to answer it. It
  // records nothing into `sent`, which holds tmux argv and not shell text.
  execRemoteShell: (_ctx: unknown, command: string) => {
    shellCommands.push(command);
    // The marker pair `../carriage.ts` defines, because `parseRemotePath`
    // reads between them and refuses anything else.
    return Promise.resolve('__TORTIE_PATH__/usr/bin:/bin__TORTIE_PATH__');
  }
}));

/** The control client, replaced so nothing spawns. */
class FakeControlClient extends EventEmitter {
  connected = false;
  constructor(readonly transport: { machineId: string }) {
    super();
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

/** No database is opened anywhere in this file. */
const record = vi.hoisted(() => ({
  rows: new Map<string, { id: string; machineId: string; status: string }>()
}));

vi.mock('../remote-record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-record')>()),
  remoteManifestInstalled: () => false,
  noteRemoteRowSeen: () => undefined,
  writeRemoteRow: (input: { sessionId: string; machineId: string }) => {
    record.rows.set(input.sessionId, {
      id: input.sessionId,
      machineId: input.machineId,
      status: 'running'
    });
    return null;
  },
  remoteRecordOf: (id: string) => record.rows.get(id) ?? null,
  remoteRecordsForMachine: () => [...record.rows.values()],
  unconfirmedRemoteRecords: () => [],
  markRemoteCreateUnconfirmed: () => undefined,
  remoteManifest: () => ({ deleteSession: (id: string) => record.rows.delete(id) })
}));

/** Every notice a create posted, in order. */
const posted: DurabilityNotice[] = [];

vi.mock('../../notice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../notice')>()),
  postDurabilityNotice: (notice: DurabilityNotice) => {
    posted.push(notice);
    return true;
  }
}));

/**
 * The two halves BUILDER A owns, replaced so this file decides what the far
 * machine answered without contacting one.
 *
 * `remoteEnvNamesFor` is the union rule the local create already uses, read
 * through the seal-checked settings door. It is replaced rather than driven so
 * that a test can name a variable without writing a settings file.
 * `probeRemoteEnvNames` is the ONE round trip that asks the far machine which of
 * those names it has a usable value for. It answers NAMES, never a value.
 */
const far = vi.hoisted(() => ({
  names: [] as string[],
  answer: {
    resolved: [] as string[],
    missing: [] as string[],
    probeFailed: false
  },
  /** Every name list the probe was asked about, in order. */
  asked: [] as string[][]
}));

// THE INTEGRATOR'S ROUND MOVED `remoteEnvNamesFor` OUT OF THE CARRIAGE, so
// both replacements now live on the one mock. It reads the settings door, so it
// is impure and belongs beside the probe; in the carriage it put
// `settings/store` into `../context`'s graph, which every LOCAL session goes
// through and which reached no settings module at the parent.
vi.mock('../remote-env-probe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-env-probe')>()),
  // The union rule reads the settings door, which needs an Electron. It is
  // replaced so a test can name a variable without writing a settings file;
  // the REAL filter is driven at the foot of this file.
  remoteEnvNamesFor: () => [...far.names],
  probeRemoteEnvNames: (_ctx: unknown, names: readonly string[]) => {
    far.asked.push([...names]);
    return Promise.resolve({
      resolved: [...far.answer.resolved],
      missing: [...far.answer.missing],
      probeFailed: far.answer.probeFailed
    });
  }
}));

const { REMOTE_ENV_SLOT } = await import('../remote-env-carriage');
const { remoteCreate, resetRemoteSessionsForTests } = await import(
  '../remote-sessions'
);

/** One create, with the machine listing back the session it just made. */
async function createOne(name = 'work'): Promise<{ id: string }> {
  answers['new-session'] = '$4\n';
  answers['list-sessions'] = () =>
    createdUuid === ''
      ? ''
      : [
          '$4',
          '1700000000',
          '1700000000',
          '0',
          createdUuid,
          'shell',
          name,
          '/srv/repo',
          '/srv/repo',
          name
        ].join(' ');
  const session = await remoteCreate({
    machineId: MACHINE,
    name,
    projectPath: '/srv/repo',
    cwd: '/srv/repo',
    agent: 'shell'
  });
  return { id: session.id };
}

/** The `new-session` argv the create composed, or null. */
function createArgv(): string[] | null {
  return sent.find((argv) => argv[0] === 'new-session') ?? null;
}

beforeEach(() => {
  sent = [];
  sentOptions = [];
  answers = {};
  createdUuid = '';
  shellCommands = [];
  posted.length = 0;
  record.rows.clear();
  far.names = [];
  far.asked = [];
  far.answer = { resolved: [], missing: [], probeFailed: false };
  resetRemoteSessionsForTests();
});

describe('a name the far machine has a value for', () => {
  beforeEach(() => {
    far.names = ['ANTHROPIC_API_KEY'];
    far.answer = {
      resolved: ['ANTHROPIC_API_KEY'],
      missing: [],
      probeFailed: false
    };
  });

  it('asks the machine about it exactly once, in ONE round trip', async () => {
    await createOne();
    expect(far.asked).toEqual([['ANTHROPIC_API_KEY']]);
  });

  /**
   * The injection is a SLOT the far side's own login shell replaces with
   * `-e NAME=<value>` pairs it expands itself. This Mac composes no value, so
   * the proof that the variable is injected is the slot, and the proof that no
   * value crossed is that no pair for that name is composed here.
   */
  it('puts one slot on the far side’s new-session line and no pair of its own', async () => {
    await createOne();
    const argv = createArgv();
    expect(argv).not.toBeNull();
    expect((argv ?? []).filter((one) => one === REMOTE_ENV_SLOT)).toHaveLength(1);
    expect(
      (argv ?? []).some((one) => one.startsWith('ANTHROPIC_API_KEY='))
    ).toBe(false);
  });

  /** The slot stands BEFORE the stamps, so `managedPaneEnv` still wins last. */
  it('keeps the two identity stamps after the slot', async () => {
    await createOne();
    const argv = createArgv() ?? [];
    const slotAt = argv.indexOf(REMOTE_ENV_SLOT);
    const stampAt = argv.findIndex((one) => one.startsWith('GMUX_'));
    expect(slotAt).toBeGreaterThanOrEqual(0);
    expect(stampAt).toBeGreaterThan(slotAt);
  });

  it('hands the plane the names, and a deadline wide enough for a login shell', async () => {
    await createOne();
    const at = sent.findIndex((argv) => argv[0] === 'new-session');
    const options = sentOptions[at] ?? {};
    expect(options['envNames']).toEqual(['ANTHROPIC_API_KEY']);
    expect(Number(options['timeoutMs'])).toBeGreaterThanOrEqual(20_000);
  });

  it('says nothing to the person, because there is nothing to say', async () => {
    await createOne();
    expect(posted).toEqual([]);
  });
});

describe('a name that is unset on the remote machine', () => {
  beforeEach(() => {
    far.names = ['ANTHROPIC_API_KEY', 'FIREWORKS_API_KEY'];
    far.answer = {
      resolved: ['ANTHROPIC_API_KEY'],
      missing: ['FIREWORKS_API_KEY'],
      probeFailed: false
    };
  });

  /** The silence is the bug this phase exists to end. */
  it('raises the notice, naming the variable', async () => {
    const session = await createOne();
    const notice = posted.find((one) => one.kind === 'env-unresolved');
    expect(notice).toBeDefined();
    expect(notice).toMatchObject({
      kind: 'env-unresolved',
      sessionId: session.id,
      sessionName: 'work',
      names: ['FIREWORKS_API_KEY'],
      probeFailed: false
    });
  });

  it('still SUCCEEDS, and the session is usable', async () => {
    const session = await createOne();
    expect(session.id).not.toBe('');
    expect(record.rows.get(session.id)?.machineId).toBe(MACHINE);
  });
});

describe('a probe that could not run at all', () => {
  beforeEach(() => {
    far.names = ['ANTHROPIC_API_KEY'];
    // The shape the REAL probe produces when it could not ask: every name it
    // was asked about comes back as missing, so the notice can name one. The
    // test below this describe holds that invariant against the real function,
    // because `remoteCreate` posts `envProbe.missing` verbatim and a notice
    // naming nothing is a notice that says nothing.
    far.answer = {
      resolved: [],
      missing: ['ANTHROPIC_API_KEY'],
      probeFailed: true
    };
  });

  it('raises the notice, names the variable anyway, and says the probe failed', async () => {
    await createOne();
    const notice = posted.find((one) => one.kind === 'env-unresolved');
    expect(notice).toMatchObject({
      names: ['ANTHROPIC_API_KEY'],
      probeFailed: true
    });
  });

  it('still SUCCEEDS', async () => {
    const session = await createOne();
    expect(session.id).not.toBe('');
  });

  /**
   * A deadline that fires is the ordinary way this happens, and it must not
   * reject: `probeRemoteEnvNames` never rejects, so the create never sees an
   * error from it at all.
   */
  it('composes the slot anyway, because a name may have appeared since', async () => {
    await createOne();
    const argv = createArgv() ?? [];
    expect(argv.filter((one) => one === REMOTE_ENV_SLOT)).toHaveLength(1);
  });
});

describe('an agent nobody configured', () => {
  it('asks the machine nothing, composes no slot, and says nothing', async () => {
    far.names = [];
    await createOne();
    const argv = createArgv() ?? [];
    expect(far.asked).toEqual([]);
    expect(argv.includes(REMOTE_ENV_SLOT)).toBe(false);
    expect(posted).toEqual([]);
  });

  /** A create with no names keeps every number it had before this phase. */
  it('keeps the create’s own deadline', async () => {
    far.names = [];
    await createOne();
    const at = sent.findIndex((argv) => argv[0] === 'new-session');
    const options = sentOptions[at] ?? {};
    expect(options['timeoutMs']).toBeUndefined();
  });
});

describe('a name that could never be a variable', () => {
  /**
   * The alphabet is `^[A-Za-z_][A-Za-z0-9_]{0,63}$`, tested on THIS Mac before
   * anything is composed. A name that fails it is dropped whole — it is never
   * sent, and it never reaches the composer.
   */
  const HOSTILE = [
    "A'B",
    'A;id',
    'A$(id)',
    'A`id`',
    'A B',
    'A\nB',
    'A|B',
    'A>B',
    'A}',
    '${IFS}',
    '1ABC',
    '',
    'A'.repeat(300)
  ];

  it('never reaches composition, for any of the thirteen shapes', async () => {
    const { filterRemoteEnvNames } = await import('../remote-env-carriage');
    expect(filterRemoteEnvNames(HOSTILE)).toEqual([]);
  });

  it('is dropped before the far machine is asked anything', async () => {
    // The union rule is replaced above, so this drives the REAL filter and
    // then asserts the composed line carries none of the hostile bytes.
    const { filterRemoteEnvNames } = await import('../remote-env-carriage');
    far.names = filterRemoteEnvNames([...HOSTILE, 'ANTHROPIC_API_KEY']);
    expect(far.names).toEqual(['ANTHROPIC_API_KEY']);
    await createOne();
    const line = (createArgv() ?? []).join(' ');
    for (const one of HOSTILE) {
      if (one.length === 0) continue;
      expect(line.includes(one)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// THE VERIFIER'S ROUND. The cold server, which is the one finding that blocked.
// ---------------------------------------------------------------------------

/**
 * A create that carries names reaches the far side as
 * `"$SHELL" -lc <script> … tmux … new-session`, and on a machine with no server
 * on Tortie's socket that login shell is the process that EXECS tmux — so tmux
 * seeds its GLOBAL environment from it, and every later pane on that machine
 * inherits the person's exported values, including panes for agents that named
 * nothing.
 *
 * MEASURED LIVE on the operator's Mac Pro, 2026-09-14, on a socket killed first
 * so it was cold: `show-environment -g | grep -c '^<the name>'` read 1, and a
 * second session created on that same server carrying NO names read the value
 * back. On a warm server the same reading is 0.
 *
 * The fix is the call `restoreRemoteSession` already makes at its step 3:
 * `ensureRemoteServer` boots through the PLAIN ssh exec rather than a login
 * shell, so the server it starts holds no rc-exported value, and the login
 * shell below is then a tmux CLIENT which seeds nothing.
 *
 * These rules pin the ORDER, which is the whole property: the assertion has to
 * happen BEFORE the create line, not after it.
 */
describe('the far server is booted before a create that carries names', () => {
  /** Where in `sent` the create's own new-session line is. */
  function createAt(): number {
    return sent.findIndex((argv) => argv[0] === 'new-session');
  }

  it('asserts the server BEFORE the create line', async () => {
    far.names = ['ANTHROPIC_API_KEY'];
    far.answer = { resolved: ['ANTHROPIC_API_KEY'], missing: [], probeFailed: false };
    await createOne();
    const pathAt = sent.findIndex(
      (argv) => argv[0] === 'set-environment' && argv.includes('PATH')
    );
    expect(pathAt).toBeGreaterThanOrEqual(0);
    expect(createAt()).toBeGreaterThan(pathAt);
    // The PATH came from the machine's own login shell. (The other login-shell
    // command in this create is the program search `remoteBinFor` already ran.)
    expect(
      shellCommands.filter((one) => one.includes('__TORTIE_PATH__'))
    ).toHaveLength(1);
  });

  it('STARTS the server when the machine has none, before the create line', async () => {
    far.names = ['ANTHROPIC_API_KEY'];
    far.answer = { resolved: ['ANTHROPIC_API_KEY'], missing: [], probeFailed: false };
    // THE SOCKET IS COLD UNTIL SOMETHING BOOTS IT. Every list answers tmux's
    // own "no server running" sentence until a `start-server` has been sent,
    // which is what a machine with no server on Tortie's socket really does.
    // Counting calls instead would not model it: `dedupeSessionName` already
    // lists once before the server is ever asserted.
    const listing = () =>
      createdUuid === ''
        ? ''
        : [
            '$4',
            '1700000000',
            '1700000000',
            '0',
            createdUuid,
            'shell',
            'work',
            '/srv/repo',
            '/srv/repo',
            'work'
          ].join(' ');
    answers['new-session'] = '$4\n';
    answers['list-sessions'] = () => {
      if (!sent.some((argv) => argv[0] === 'start-server')) {
        // The shape `serverProbeVerdict` reads: tmux's own sentence, on the
        // code the exec plane raises for a machine that would not answer.
        throw gmuxError(
          'TMUX_UNREACHABLE',
          'the machine did not answer',
          'no server running on /tmp/tortie-501/gmux-p270-unit'
        );
      }
      return listing();
    };
    await remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    });
    const bootAt = sent.findIndex((argv) => argv[0] === 'start-server');
    expect(bootAt).toBeGreaterThanOrEqual(0);
    expect(createAt()).toBeGreaterThan(bootAt);
  });

  it('asserts NOTHING for an agent nobody configured', async () => {
    far.names = [];
    await createOne();
    // No login shell was asked for a PATH, and no global was written, because
    // a create with no names never goes through a login shell on the far side
    // and so cannot carry an rc-exported value into the server's globals.
    expect(
      shellCommands.filter((one) => one.includes('__TORTIE_PATH__'))
    ).toHaveLength(0);
    expect(sent.some((argv) => argv[0] === 'set-environment')).toBe(false);
    expect(sent.some((argv) => argv[0] === 'start-server')).toBe(false);
  });
});

/**
 * PHASE 342'S FIX ROUND (major 1 and the minor on plain errors). Prepare told
 * the person "so Tortie will not start sessions there" about a server that
 * would not keep a setting Tortie cannot do without, and the verifier then
 * started a session there from the sheet: the set-up had captured the PATH
 * before it wrote the options, and a create that carries no names never runs
 * the set-up again. The set-up now records the refusal, keyed by the server's
 * version, and the create asks it beside the pair, before its create line.
 * And a refusal met by the create's own set-up reaches the person as the
 * structured error whose message is the sentence, never as Electron's prefix
 * and a class name in front of it.
 */
describe('Phase 342: a create on a machine whose tmux would not keep a setting Tortie needs', () => {
  const SENTENCE =
    "tmux 3.7c would not keep a session's screen when its program fails, so Tortie will not start sessions there.";

  it('is refused with sentence (1) before anything is created, when the set-up recorded the refusal', async () => {
    const leaf = await import('../far-tmux');
    leaf.resetFarTmuxForTests();
    leaf.noteFarServerVersion(MACHINE, '3.7c');
    leaf.noteFarSettingsRefused(MACHINE, { server: '3.7c', name: 'remain-on-exit', sentence: SENTENCE });
    far.names = [];
    answers['new-session'] = '$4\n';
    const err = await remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    }).catch((one: unknown) => one);
    const { gmuxErrorPayloadOf } = await import('../../errors');
    expect(gmuxErrorPayloadOf(err)?.code).toBe('INVALID_INPUT');
    expect(gmuxErrorPayloadOf(err)?.message).toBe(SENTENCE);
    expect(createArgv()).toBeNull();
    expect(record.rows.size).toBe(0);
    leaf.resetFarTmuxForTests();
  });

  it('a refusal met by the create’s own set-up is the structured error with the sentence, and a later create is refused too', async () => {
    const leaf = await import('../far-tmux');
    leaf.resetFarTmuxForTests();
    leaf.noteFarServerVersion(MACHINE, '3.7c');
    far.names = ['ANTHROPIC_API_KEY'];
    far.answer = { resolved: ['ANTHROPIC_API_KEY'], missing: [], probeFailed: false };
    answers['new-session'] = '$4\n';
    // tmux's own refusal of the row written first, history-limit.
    answers['set-option'] = gmuxError('TMUX_UNREACHABLE', 'set-option failed', 'invalid option: history-limit');
    const err = await remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    }).catch((one: unknown) => one);
    const { gmuxErrorPayloadOf } = await import('../../errors');
    const payload = gmuxErrorPayloadOf(err);
    expect(payload?.code).toBe('INVALID_INPUT');
    expect(payload?.message).toMatch(/^tmux 3\.7c would not keep [\d,]+ lines of each session, so Tortie will not start sessions there\.$/);
    expect(String((err as Error).message)).not.toContain('RemoteTmuxRefused');
    expect(createArgv()).toBeNull();
    // Nothing was sent after the refused row.
    const setAt = sent.findIndex((argv) => argv[0] === 'set-option');
    expect(sent.slice(setAt + 1)).toEqual([]);
    // The refusal was recorded, so a create with no names is refused as well.
    expect(leaf.farSettingsRefusal(MACHINE)?.name).toBe('history-limit');
    far.names = [];
    delete answers['set-option'];
    const again = await remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    }).catch((one: unknown) => one);
    expect(gmuxErrorPayloadOf(again)?.code).toBe('INVALID_INPUT');
    expect(createArgv()).toBeNull();
    leaf.resetFarTmuxForTests();
  });
});
