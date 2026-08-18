/**
 * Sessions on another machine (Phase 70, M3).
 *
 * NOTHING HERE RUNS A COMMAND. The exec plane is replaced by a function that
 * records the argv it was handed and answers with text a machine would have
 * printed. That is the point rather than a convenience: every property below is
 * about what Tortie SENDS and what it refuses to send, and a test that let a
 * command through to find out would be the defect it is testing for.
 *
 * ## The manifest claim, and how PHASE 72 CHANGED IT
 *
 * Phase 70's rule was that nothing about a remote session is ever written to the
 * manifest, and this file checked it as an import list. Phase 72 writes a row for
 * every session Tortie creates on a machine, so the rule moved rather than went
 * away: every one of those writes goes through `../remote-record.ts`, and this
 * file still asserts that `remote-sessions.ts` reaches the manifest through that
 * one module and no other. A reader asking what a remote path can do to the
 * manifest still reads one module.
 *
 * The byte half moved with it. `GMUX_SMOKE=remote-sessions` used to require zero
 * database files in the profile after a create, a rename and a kill. It now
 * requires the row to be there, to name the machine, and to carry the program
 * path that machine reported.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GmuxError } from '../../errors';
import type { RemoteMachineContext } from '../context';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p70-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Every argv the plane was handed, in order. */
let sent: string[][] = [];
/**
 * What each verb answers with, keyed by the verb. A function is called at the
 * moment the command is sent, so a list can answer with the uuid the create that
 * just ran generated.
 */
let answers: Record<string, string | Error | (() => string)> = {};
/** The uuid the last create put on its own new-session line. */
let createdUuid = '';
/** Whether the machine has a program search list recorded. */
let remotePath: string | null = '/usr/bin:/bin';
/** Whether a context is registered for the machine at all. */
let registered = true;

// Partial, because `../tmux/supervisor` re-exports `localMachineContext` from
// this module and a whole-module replacement would break every importer.
vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: (id: string) => {
    if (!registered) throw new Error(`no context for ${id}`);
    return CTX;
  },
  machineGeneration: () => ({ generation: 1, remotePath })
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    sent.push([...args]);
    if (args[0] === 'new-session') {
      const pair = args.find((one) => one.startsWith('GMUX_SESSION_ID=')) ?? '';
      createdUuid = pair.slice('GMUX_SESSION_ID='.length);
    }
    const answer = answers[args[0] ?? ''];
    if (answer instanceof Error) return Promise.reject(answer);
    if (typeof answer === 'function') return Promise.resolve(answer());
    return Promise.resolve(answer ?? '');
  }
}));

/**
 * The control client, replaced so nothing spawns.
 *
 * `startMachineFeed` opens a live connection when the machine's version has a
 * control measurement, and this file must never start one. The fake records
 * every client made and lets a test emit the events a real one would.
 */
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

const {
  MACHINE_NOT_READY,
  RESTORE_FORGOTTEN,
  TARGET_UNBOUND
} = await import('../remote-copy');

const {
  REMOTE_CREATE_FORMAT,
  REMOTE_LIST_FIELDS,
  REMOTE_LIST_FORMAT,
  boundRemoteRow,
  forgetRemoteRow,
  isRemoteSessionId,
  markMachineQuiet,
  oneLine,
  parseRemoteListLine,
  pollRemoteMachine,
  readyRemoteContext,
  refuseRemoteRestore,
  remoteCreate,
  remoteCreateArgs,
  remoteKill,
  remoteListArgs,
  remoteMachineFacts,
  remoteRename,
  remoteRowStatus,
  remoteSessionRow,
  remoteSessions,
  resetRemoteSessionsForTests,
  splitQuotedLine,
  machinesWithBothFeeds,
  remoteMachinesWoke,
  startMachineFeed,
  stopMachineFeeds
} = await import('../remote-sessions');

const { resetControlPlanesForTests } = await import('../control-plane');
const { noteIssuedRemoteId, resetRescueForTests } = await import(
  '../pane-env-rescue'
);

const MACHINE = 'popos';

/**
 * One list line in the shipped format, quoted the way tmux's own `#{q:...}`
 * quotes it. MEASURED on 3.6a: a space, a backslash, a double quote, a single
 * quote, a dollar and a semicolon each get a backslash in front of them.
 */
function quoteField(value: string): string {
  return value.replace(/([ \\"'$;])/g, '\\$1');
}

function line(row: {
  tmuxId: string;
  created?: number;
  activity?: number;
  attached?: number;
  gmuxId?: string;
  agent?: string;
  tmuxName?: string;
  project?: string;
  cwd?: string;
  name?: string;
}): string {
  return [
    row.tmuxId,
    String(row.created ?? 1_700_000_000),
    String(row.activity ?? 1_700_000_100),
    String(row.attached ?? 0),
    row.gmuxId ?? '',
    row.agent ?? 'shell',
    row.tmuxName ?? 'work',
    row.project ?? '/srv/repo',
    row.cwd ?? '/srv/repo',
    row.name ?? 'work'
  ]
    .map(quoteField)
    .join(' ');
}

beforeEach(() => {
  sent = [];
  answers = {};
  createdUuid = '';
  remotePath = '/usr/bin:/bin';
  registered = true;
  FakeControlClient.made = [];
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
});

afterEach(() => {
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
});

/** The refusal a call produced, or null when it did not refuse. */
async function refusalOf(
  work: () => Promise<unknown>
): Promise<GmuxError['payload'] | null> {
  try {
    await work();
    return null;
  } catch (err) {
    return err instanceof GmuxError ? err.payload : null;
  }
}

describe('the list format', () => {
  it('carries no tab, because a tab does not survive the trip', () => {
    // MEASURED 2026-08-17 on tmux 3.6a: a tab in a format comes back as an
    // underscore when the client has no UTF-8 locale, and a command sent over a
    // connection has no locale unless both sides were configured to forward one.
    expect(REMOTE_LIST_FORMAT).not.toContain('\t');
    expect(REMOTE_CREATE_FORMAT).not.toContain('\t');
  });

  it('quotes every field with tmux’s own quoting, and separates with a space', () => {
    const fields = REMOTE_LIST_FORMAT.split(' ');
    expect(fields).toHaveLength(REMOTE_LIST_FIELDS);
    expect(fields.every((one) => one.startsWith('#{q:'))).toBe(true);
  });

  it('puts every free-form field last', () => {
    // With every field quoted this is no longer load bearing. It is kept because
    // a reader should not have to know about the quoting to see that the format
    // is safe.
    const fields = REMOTE_LIST_FORMAT.split(' ');
    const freeForm = [
      '#{q:session_name}',
      '#{q:@gmux-project}',
      '#{q:session_path}',
      '#{q:@gmux-name}'
    ];
    const firstFree = fields.findIndex((one) => freeForm.includes(one));
    expect(fields.slice(firstFree).every((one) => freeForm.includes(one))).toBe(true);
  });

  it('reads a row whose name holds spaces', () => {
    const parsed = parseRemoteListLine(line({ tmuxId: '$3', name: 'the zen of tortie' }));
    expect(parsed?.name).toBe('the zen of tortie');
  });

  it('undoes the quoting tmux applies, character for character', () => {
    // MEASURED on 3.6a: `#{q:session_name}` turned a b\c"d'e$f;g into
    // a\ b\\c\"d\'e\$f\;g.
    expect(splitQuotedLine('a\\ b\\\\c\\"d\\$e')).toEqual(['a b\\c"d$e']);
    expect(splitQuotedLine('one two')).toEqual(['one', 'two']);
    // An option nobody set prints as nothing at all, which is an empty field.
    expect(splitQuotedLine('a  b')).toEqual(['a', '', 'b']);
  });

  it('drops a line that does not carry every field', () => {
    expect(parseRemoteListLine('$3 1 2')).toBeNull();
    expect(parseRemoteListLine('')).toBeNull();
    expect(parseRemoteListLine(`not-an-id ${'x '.repeat(8)}y`)).toBeNull();
  });

  it('keeps a row that is not Tortie’s readable and marks it as not ours', () => {
    const parsed = parseRemoteListLine(line({ tmuxId: '$9', gmuxId: '' }));
    expect(parsed?.gmuxId).toBe('');
  });
});

describe('the create argv', () => {
  const args = remoteCreateArgs({
    tmuxName: 'work',
    cwd: '/srv/repo',
    sessionId: 'uuid-1',
    argv: ['claude', '--model', 'opus']
  });

  it('detaches, asks for the identifier back, and names the folder', () => {
    expect(args[0]).toBe('new-session');
    expect(args).toContain('-d');
    expect(args).toContain('-P');
    expect(args[args.indexOf('-F') + 1]).toContain('#{session_id}');
    expect(args[args.indexOf('-c') + 1]).toBe('/srv/repo');
  });

  it('carries both identity variables on the new-session line itself', () => {
    // This is what makes a lost answer survivable. A create whose reply never
    // arrived still produced a session that can be identified by reading its
    // environment back.
    const pairs = args.filter((_, index) => args[index - 1] === '-e');
    expect(pairs).toContain('GMUX_MANAGED=1');
    expect(pairs).toContain('GMUX_SESSION_ID=uuid-1');
  });

  it('separates the command with -- and launches by bare name', () => {
    expect(args.slice(args.indexOf('--'))).toEqual([
      '--',
      'claude',
      '--model',
      'opus'
    ]);
  });
});

describe('the status ladder', () => {
  it('is idle the first time a row is seen, because nothing has moved yet', () => {
    expect(remoteRowStatus(undefined, 10)).toBe('idle');
  });

  it('is running when the activity moved and idle when it did not', () => {
    expect(remoteRowStatus(10, 20)).toBe('running');
    expect(remoteRowStatus(20, 20)).toBe('idle');
  });
});

describe('one value, on one line', () => {
  it('replaces a tab and a newline with a space', () => {
    expect(oneLine('a\tb\nc')).toBe('a b c');
    expect(oneLine('plain')).toBe('plain');
  });
});

describe('the readiness refusal', () => {
  it('refuses a machine with no registered connection', async () => {
    registered = false;
    const payload = await refusalOf(async () =>
      Promise.resolve().then(() => readyRemoteContext(MACHINE))
    );
    expect(payload?.message).toBe(MACHINE_NOT_READY);
  });

  it('refuses a machine whose program search list was never read', async () => {
    remotePath = null;
    const payload = await refusalOf(async () =>
      Promise.resolve().then(() => readyRemoteContext(MACHINE))
    );
    expect(payload?.message).toBe(MACHINE_NOT_READY);
  });

  it('refuses a create on that machine, and sends nothing', async () => {
    remotePath = null;
    const payload = await refusalOf(() =>
      remoteCreate({
        machineId: MACHINE,
        name: 'work',
        projectPath: '/srv/repo',
        cwd: '/srv/repo',
        agent: 'shell'
      })
    );
    expect(payload?.message).toBe(MACHINE_NOT_READY);
    expect(sent).toEqual([]);
  });
});

describe('create, list, rename and end', () => {
  /** One create, with the machine listing back the session it just made. */
  async function createOne(name = 'work'): Promise<string> {
    answers['new-session'] = '$4\n';
    // Empty until the create has run, so the read that picks a name sees the
    // machine as it was and the read after the create sees the new session.
    answers['list-sessions'] = () =>
      createdUuid === '' ? '' : line({ tmuxId: '$4', gmuxId: createdUuid, name });
    const session = await remoteCreate({
      machineId: MACHINE,
      name,
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    });
    return session.id;
  }

  it('stamps all four options, in order, against the identifier it got back', async () => {
    const id = await createOne();
    const stamps = sent.filter((argv) => argv[0] === 'set-option');
    expect(stamps.map((argv) => argv[3])).toEqual([
      '@gmux-id',
      '@gmux-agent',
      '@gmux-name',
      '@gmux-project'
    ]);
    expect(stamps.every((argv) => argv[2] === '$4')).toBe(true);
    expect(stamps[0]?.[4]).toBe(id);
    expect(stamps[2]?.[4]).toBe('work');
    expect(stamps[3]?.[4]).toBe('/srv/repo');
  });

  it('projects the row the poll reported, with the machine beside it', async () => {
    const id = await createOne();
    const rows = remoteSessions();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(id);
    expect(rows[0]?.machine?.id).toBe(MACHINE);
    expect(rows[0]?.machine?.answering).toBe(true);
    expect(rows[0]?.projectPath).toBe('/srv/repo');
    expect(rows[0]?.status).toBe('idle');
    expect(isRemoteSessionId(id)).toBe(true);
  });

  it('writes the display name with every tab turned into a space', async () => {
    // The list is tab separated, so a tab inside a value would move every field
    // after it. A display name with a tab in it is something a paste produces,
    // and it is worth one space rather than a row nothing can read.
    answers['new-session'] = '$4\n';
    answers['list-sessions'] = () =>
      createdUuid === ''
        ? ''
        : line({ tmuxId: '$4', gmuxId: createdUuid, name: 'two names' });
    await remoteCreate({
      machineId: MACHINE,
      name: 'two\tnames',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    });
    const stamp = sent.find(
      (argv) => argv[0] === 'set-option' && argv[3] === '@gmux-name'
    );
    expect(stamp?.[4]).toBe('two names');
  });

  it('never shows a session on that machine that Tortie did not create', async () => {
    answers['list-sessions'] = [
      line({ tmuxId: '$1', gmuxId: 'ours-1' }),
      line({ tmuxId: '$2', gmuxId: '', name: 'somebody else' })
    ].join('\n');
    await pollRemoteMachine(MACHINE);
    expect(remoteSessions().map((one) => one.id)).toEqual(['ours-1']);
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
  });

  it('moves a row to running when its activity moved', async () => {
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1', activity: 100 });
    await pollRemoteMachine(MACHINE);
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1', activity: 200 });
    await pollRemoteMachine(MACHINE);
    expect(remoteSessions()[0]?.status).toBe('running');
  });

  it('marks a row the machine stopped reporting restorable, and keeps it', async () => {
    // PHASE 71 CHANGED THIS ANSWER, and the change is the case table. Phase 70
    // wrote `exited`. Research 51 section 4.4 says `restorable`, because a
    // completed pass that did not hold the session is evidence the session is
    // not running and is NOT evidence about how it ended. Restore is still
    // refused for every remote row in this release, so the label a person reads
    // is the coming one rather than a button.
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    answers['list-sessions'] = '';
    await pollRemoteMachine(MACHINE);
    expect(remoteSessions()[0]?.status).toBe('restorable');
    expect(remoteSessionRow('ours-1')?.status).toBe('restorable');
  });

  it('keeps a proven absence when the link later drops', async () => {
    // A completed pass is evidence, and a later lost link does not un-prove it.
    // Only the LIVE rows on that machine go to `unknown`.
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    answers['list-sessions'] = '';
    await pollRemoteMachine(MACHINE);
    markMachineQuiet(MACHINE);
    expect(remoteSessions()[0]?.status).toBe('restorable');
  });

  it('renames on the far side and moves the name stamp with it', async () => {
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1', tmuxName: 'work' });
    await pollRemoteMachine(MACHINE);
    sent = [];
    await remoteRename('ours-1', 'the new name');
    const rename = sent.find((argv) => argv[0] === 'rename-session');
    expect(rename).toEqual(['rename-session', '-t', '$1', 'the new name']);
    const stamp = sent.find(
      (argv) => argv[0] === 'set-option' && argv[3] === '@gmux-name'
    );
    expect(stamp?.[4]).toBe('the new name');
  });

  it('kills by the identifier the machine reported, never by a name', async () => {
    answers['list-sessions'] = line({ tmuxId: '$7', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    sent = [];
    await remoteKill('ours-1');
    expect(sent[0]).toEqual(['kill-session', '-t', '$7']);
  });

  it('forgets a row rather than writing a tombstone for it', async () => {
    answers['list-sessions'] = line({ tmuxId: '$7', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    expect(forgetRemoteRow('ours-1')).toBe(true);
    expect(remoteSessions()).toEqual([]);
    expect(forgetRemoteRow('ours-1')).toBe(false);
  });

  it('refuses to invent a row when the machine lists none back', async () => {
    answers['new-session'] = '$4\n';
    answers['list-sessions'] = '';
    const id = await remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    }).catch(() => null);
    expect(id).toBeNull();
    expect(remoteSessions()).toEqual([]);
  });

  it('reads the environment back once when the create loses its answer', async () => {
    // A create can run on the far side and lose its reply. ONE read asks whether
    // the session this call just asked for exists, and it only ever accepts a
    // uuid this call itself generated seconds ago.
    answers['new-session'] = new Error('the link went');
    answers['show-environment'] = () => `GMUX_SESSION_ID=${createdUuid}\n`;
    answers['list-sessions'] = () =>
      createdUuid === '' ? '' : line({ tmuxId: '$4', gmuxId: createdUuid });
    const session = await remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    });
    expect(session.id).toBe(createdUuid);
    expect(sent.filter((argv) => argv[0] === 'show-environment')).toHaveLength(1);
  });

  it('adopts nothing when that read answers with a different session', async () => {
    answers['new-session'] = new Error('the link went');
    answers['show-environment'] = 'GMUX_SESSION_ID=somebody-else\n';
    answers['list-sessions'] = '';
    const failed = await remoteCreate({
      machineId: MACHINE,
      name: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    }).catch(() => null);
    expect(failed).toBeNull();
    expect(remoteSessions()).toEqual([]);
  });
});

describe('the two refusals this rung pins', () => {
  it('refuses a kill aimed at a session no completed list reported', async () => {
    const payload = await refusalOf(() => remoteKill('never-listed'));
    expect(payload?.message).toBe(TARGET_UNBOUND);
    expect(sent).toEqual([]);
  });

  it('refuses a rename the same way, and sends nothing', async () => {
    const payload = await refusalOf(() => remoteRename('never-listed', 'x'));
    expect(payload?.message).toBe(TARGET_UNBOUND);
    expect(sent).toEqual([]);
  });

  it('refuses a verb aimed at a row that has already ended', async () => {
    // An ended row is held in memory so the person can still read it, and it is
    // NOT a target: the machine has stopped reporting it, so nothing can say
    // which session an identifier would land on now.
    answers['list-sessions'] = line({ tmuxId: '$7', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    answers['list-sessions'] = '';
    await pollRemoteMachine(MACHINE);
    sent = [];
    const payload = await refusalOf(() => remoteKill('ours-1'));
    expect(payload?.message).toBe(TARGET_UNBOUND);
    expect(sent).toEqual([]);
    expect(() => boundRemoteRow('ours-1')).toThrow();
  });

  /**
   * PHASE 72 CHANGED WHAT THIS ASSERTS, and the change is the rung.
   *
   * Phase 70 refused restore for every remote row with one sentence. The gate
   * asks six conditions now, and in this file NONE of them can hold. This test
   * writes no machines file, so the FIRST arm is the one that fires, and the
   * order is what decides which sentence a person reads: a machine Tortie has no
   * row for is a machine that was removed or never added, and telling them the
   * link is down would send them to fix something that is not the problem.
   *
   * The offered case needs a machines row, a signed in connection and a live
   * feed, none of which a unit test can produce honestly. It is watched in
   * `GMUX_SMOKE=remote-sessions` and graded by the ten row matrix.
   */
  it('refuses restore for a remote row on a machine it has no row for', async () => {
    answers['list-sessions'] = line({ tmuxId: '$7', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    const payload = await refusalOf(async () =>
      Promise.resolve().then(() => {
        refuseRemoteRestore('ours-1');
      })
    );
    expect(payload?.message).toBe(RESTORE_FORGOTTEN);
    expect(() => refuseRemoteRestore('a-local-row')).not.toThrow();
  });
});

describe('a machine that stops answering', () => {
  it('puts every one of its rows in unknown, and touches none of them', async () => {
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    expect(remoteSessions()[0]?.status).toBe('idle');

    answers['list-sessions'] = new Error('ssh: connect to host port 22: Operation timed out');
    await pollRemoteMachine(MACHINE);
    const rows = remoteSessions();
    expect(rows[0]?.status).toBe('unknown');
    expect(rows[0]?.machine?.answering).toBe(false);
    // The row is still there. A link that went is not a session that ended.
    expect(remoteSessionRow('ours-1')).not.toBeNull();
  });

  it('never reads a failed list as an empty one', async () => {
    // This is the Phase 67 defect in a new place. A timeout proves nothing about
    // what is running, and reading one as zero sessions would end every row
    // while the agents are still working.
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    answers['list-sessions'] = new Error('Operation timed out');
    await pollRemoteMachine(MACHINE);
    expect(remoteSessionRow('ours-1')?.status).not.toBe('exited');
  });

  it('comes back on the next completed poll', async () => {
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await pollRemoteMachine(MACHINE);
    markMachineQuiet(MACHINE);
    expect(remoteSessions()[0]?.status).toBe('unknown');
    answers['list-sessions'] = line({
      tmuxId: '$1',
      gmuxId: 'ours-1',
      activity: 1_700_000_500
    });
    await pollRemoteMachine(MACHINE);
    expect(remoteSessions()[0]?.status).toBe('running');
  });
});


// ---------------------------------------------------------------------------
// The feed (Phase 71, M4)
// ---------------------------------------------------------------------------

describe('the feed picks one shape and never both', () => {
  /** The one client `startMachineFeed` made, or a failure that says so. */
  function onlyClient(): FakeControlClient {
    const client = FakeControlClient.made[0];
    if (client === undefined) throw new Error('no control client was made');
    return client;
  }

  it('keeps the timer for a machine whose dialect has no measurement', async () => {
    // The mock answers `display-message` with nothing, so the version cannot be
    // read and the control gate refuses. That is the fails closed answer.
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await startMachineFeed(MACHINE);
    const facts = remoteMachineFacts(MACHINE);
    expect(facts.timerArmed).toBe(true);
    expect(facts.onControl).toBe(false);
    expect(FakeControlClient.made).toHaveLength(0);
    stopMachineFeeds();
  });

  it('clears the timer the moment a connection reaches connected', async () => {
    answers['display-message'] = 'tmux 3.6a\n';
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await startMachineFeed(MACHINE);
    // Opened, and the timer still carries the machine until it connects.
    expect(remoteMachineFacts(MACHINE).timerArmed).toBe(true);

    onlyClient().connected = true;
    onlyClient().emit('connected');
    await Promise.resolve();

    const facts = remoteMachineFacts(MACHINE);
    expect(facts.onControl).toBe(true);
    expect(facts.timerArmed).toBe(false);
    expect(machinesWithBothFeeds()).toEqual([]);
    stopMachineFeeds();
  });

  it('arms the timer again the moment the connection drops', async () => {
    answers['display-message'] = 'tmux 3.6a\n';
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await startMachineFeed(MACHINE);
    onlyClient().connected = true;
    onlyClient().emit('connected');
    await Promise.resolve();

    onlyClient().connected = false;
    onlyClient().emit('disconnected', true);

    const facts = remoteMachineFacts(MACHINE);
    expect(facts.onControl).toBe(false);
    expect(facts.timerArmed).toBe(true);
    expect(machinesWithBothFeeds()).toEqual([]);
    // Every row on that machine reads unknown, which is the transport-lost arm.
    expect(remoteSessions()[0]?.status).toBe('unknown');
    stopMachineFeeds();
  });

  it('lists once because the machine said something changed', async () => {
    answers['display-message'] = 'tmux 3.6a\n';
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await startMachineFeed(MACHINE);
    onlyClient().connected = true;
    onlyClient().emit('connected');
    await Promise.resolve();
    await Promise.resolve();

    const before = sent.filter((argv) => argv[0] === 'list-sessions').length;
    onlyClient().emit('sessions-changed');
    await Promise.resolve();
    await Promise.resolve();
    const after = sent.filter((argv) => argv[0] === 'list-sessions').length;
    expect(after).toBeGreaterThan(before);
    stopMachineFeeds();
  });

  it('reads one list over either feed through one parser', async () => {
    // The same recorded line, read once on the timer feed and once because the
    // connection said something changed, produces the same row field by field.
    const recorded = line({ tmuxId: '$1', gmuxId: 'ours-1', name: 'the work' });
    answers['list-sessions'] = recorded;
    await pollRemoteMachine(MACHINE);
    const onTimer = { ...remoteSessionRow('ours-1') };

    resetRemoteSessionsForTests();
    resetControlPlanesForTests();
    answers['display-message'] = 'tmux 3.6a\n';
    answers['list-sessions'] = recorded;
    await startMachineFeed(MACHINE);
    onlyClient().connected = true;
    onlyClient().emit('connected');
    await Promise.resolve();
    await Promise.resolve();
    const onControl = { ...remoteSessionRow('ours-1') };

    expect(onControl).toEqual(onTimer);
    stopMachineFeeds();
  });
});

describe('one machine never moves another machine rows', () => {
  it('writes unknown on the machine that went and on no other', async () => {
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await pollRemoteMachine('studio');
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'theirs-1' });
    await pollRemoteMachine('attic');

    markMachineQuiet('studio');

    const byId = new Map(remoteSessions().map((one) => [one.id, one]));
    expect(byId.get('ours-1')?.status).toBe('unknown');
    expect(byId.get('theirs-1')?.status).toBe('idle');
  });

  it('writes unknown on every machine when this Mac wakes', async () => {
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'ours-1' });
    await pollRemoteMachine('studio');
    answers['list-sessions'] = line({ tmuxId: '$1', gmuxId: 'theirs-1' });
    await pollRemoteMachine('attic');

    remoteMachinesWoke();

    for (const row of remoteSessions()) expect(row.status).toBe('unknown');
    expect(remoteMachineFacts('studio').evidence).toContain('power event');
  });
});

describe('the pane environment rescue', () => {
  it('re-binds a session this run issued and could not account for', async () => {
    // The case: a create whose link died between the new-session line and the
    // option stamp. The session is running with the pane stamp and no option
    // stamp, so every pass counts it as foreign until the rescue reads it back.
    noteIssuedRemoteId({
      id: 'lost-1',
      machineId: MACHINE,
      name: 'the interrupted one',
      agent: 'claude',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      issuedAt: 1
    });
    let listed = line({ tmuxId: '$9', gmuxId: '', tmuxName: 'orphan' });
    answers['list-sessions'] = () => listed;
    answers['show-environment'] = 'GMUX_SESSION_ID=lost-1\n';
    answers['set-option'] = () => {
      // The re-stamp lands, so the next list reports the row as ours.
      listed = line({ tmuxId: '$9', gmuxId: 'lost-1', tmuxName: 'orphan' });
      return '';
    };

    await pollRemoteMachine(MACHINE);

    expect(remoteSessions().map((one) => one.id)).toEqual(['lost-1']);
    const probe = sent.find((argv) => argv[0] === 'show-environment');
    expect(probe).toEqual(['show-environment', '-t', '$9']);
  });

  it('never adopts a session whose stamp names an id nobody issued', async () => {
    answers['list-sessions'] = line({ tmuxId: '$9', gmuxId: '', tmuxName: 'theirs' });
    answers['show-environment'] = 'GMUX_SESSION_ID=nobody-issued-this\n';

    await pollRemoteMachine(MACHINE);

    expect(remoteSessions()).toEqual([]);
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    // NOT OURS is never killed and never renamed.
    expect(sent.some((argv) => argv[0] === 'kill-session')).toBe(false);
    expect(sent.some((argv) => argv[0] === 'set-option')).toBe(false);
  });

  it('asks once per session rather than once per pass', async () => {
    answers['list-sessions'] = line({ tmuxId: '$9', gmuxId: '', tmuxName: 'theirs' });
    answers['show-environment'] = 'GMUX_SESSION_ID=nobody-issued-this\n';

    await pollRemoteMachine(MACHINE);
    await pollRemoteMachine(MACHINE);
    await pollRemoteMachine(MACHINE);

    const probes = sent.filter((argv) => argv[0] === 'show-environment');
    expect(probes).toHaveLength(1);
  });

  it('records the id BEFORE the create line is sent', async () => {
    // An id recorded on the answer would not be recorded for exactly the create
    // that needs rescuing, which is the one whose answer never arrived.
    answers['new-session'] = new Error('the link went');
    answers['show-environment'] = '';
    answers['list-sessions'] = '';
    await remoteCreate({
      machineId: MACHINE,
      name: 'interrupted',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell'
    }).catch(() => undefined);

    const { issuedRemoteIdsFor } = await import('../pane-env-rescue');
    const issued = issuedRemoteIdsFor(MACHINE);
    expect(issued).toHaveLength(1);
    expect(issued[0]?.name).toBe('interrupted');
  });
});

describe('what this module is allowed to import', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'remote-sessions.ts'),
    'utf8'
  );

  it('reaches the manifest through one module and no other', () => {
    // PHASE 72. Every write a remote path makes goes through `./remote-record.ts`,
    // so a reader auditing what this layer can do to the manifest reads that one
    // module. Stated as an import list, that rule is checkable rather than
    // asserted, and this is the check.
    //
    // The one direct import allowed is a TYPE, being the tombstone shape, which
    // compiles to nothing and can write no row.
    const manifestImports = [...source.matchAll(/from '(\.\.\/manifest[^']*)'/g)].map(
      (match) => match[1]
    );
    expect(manifestImports).toEqual(['../manifest/codecs']);
    expect(source).toMatch(/import type \{[\s\S]*?\} from '\.\.\/manifest\/codecs'/);
    expect(source).toContain("from './remote-record'");
    expect(source).not.toMatch(/from '\.\.\/restore/);
  });

  it('imports nothing under attach, and no terminal binding', () => {
    // Phase 69 found that one constant read across this boundary put node-pty
    // into the import graph of the manifest store and crashed the contract
    // inventory. This rung adds a remote attach, so it is exactly the rung that
    // can undo that.
    expect(source).not.toMatch(/from '\.\.\/attach/);
    expect(source).not.toContain('node-pty');
    expect(source).not.toContain('child_process');
  });

  it('names the list argv in one place', () => {
    expect(remoteListArgs()).toEqual(['list-sessions', '-F', REMOTE_LIST_FORMAT]);
  });
});
