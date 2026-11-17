/**
 * A create on another machine answers the session it started (Phase 360,
 * build/p360/SPEC.md §2.2, D10 to D13).
 *
 * THE DEFECT, measured by the spec step at the parent `de9ea8f2` on these same
 * fakes (§2.2): every row in which the far command had run answered a failure.
 * An answer whose first line was a login file's own text dropped the row and
 * said nothing was changed while the session ran (R5a, R5b); a session the
 * create's own list did not show was answered "Nothing was changed." (R6, R6c);
 * a feed whose manifest write failed answered that write's error (R6b). A
 * person reading any of those presses Create again and gets a second session.
 *
 * WHAT HOLDS NOW, one row each, every row graded on what the fakes recorded
 * rather than on what the create reported about itself:
 *
 *  - an answer that is not exactly one session id is read by the create's own
 *    id (Phase 117's read), and binds the session it names, or, only when that
 *    machine answers that it holds none, drops the row and says so with no far
 *    text in the sentence, the detail or any log line;
 *  - once the machine has answered, nothing after it throws into the answer:
 *    the feed start, a list that has not shown the session, the env notice and
 *    the projection each log once in their own words, and the create answers
 *    the session;
 *  - nothing here ever ends a session (no kill is ever sent), and nothing
 *    starts twice (one `new-session` per create).
 *
 * NOTHING HERE RUNS A COMMAND. The harness is `./p326-inflight-create.test.ts`'s:
 * the exec plane records every argv and answers what a machine would print, the
 * manifest half is a map, and the control client spawns nothing. Every log line
 * any module writes is captured, so "no far text in any log line" is read over
 * all of them rather than over the lines this phase wrote.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GmuxError } from '../../errors';
import type { RemoteMachineContext } from '../context';
import type { DurabilityNotice } from '@shared/notice';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p360-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Everything a test arranges and everything the fakes recorded. */
const world = vi.hoisted(() => ({
  /** Every argv the plane was handed, in order. */
  sent: [] as string[][],
  /** What each verb answers with; `set-option @x` answers one stamp alone. */
  answers: {} as Record<
    string,
    string | Error | ((args: readonly string[]) => string | Promise<string>)
  >,
  /** The uuid the last create put on its own new-session line. */
  createdUuid: '',
  /** Every log line any module wrote, as `<level> <message>`. */
  logged: [] as string[],
  /** Every notice a create posted. */
  posted: [] as unknown[],
  /** When true the next notice throws, which is a window that went away. */
  noticeThrows: false,
  /** The names the create could not carry, which raise the env notice. */
  envDropped: [] as string[],
  /** When true the machines file read throws, which is a later round's badge. */
  machineRowThrows: false,
  /** The manifest half: the rows, the drops and the next write that fails. */
  rows: new Map<
    string,
    {
      id: string;
      machineId: string;
      status: string;
      name: string;
      projectPath: string;
      cwd: string;
      agent: string;
      createdAt: number;
    }
  >(),
  droppedRows: [] as string[],
  throwOnSeen: null as Error | null
}));

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string, fields?: Record<string, unknown>): void => {
      world.logged.push(
        `${level} ${msg}${fields === undefined ? '' : ` ${JSON.stringify(fields)}`}`
      );
    };
  return {
    ...real,
    getLog: () => ({
      error: capture('error'),
      warn: capture('warn'),
      info: capture('info'),
      debug: capture('debug')
    })
  };
});

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation: 1, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    world.sent.push([...args]);
    if (args[0] === 'new-session') {
      const pair = args.find((one) => one.startsWith('GMUX_SESSION_ID=')) ?? '';
      world.createdUuid = pair.slice('GMUX_SESSION_ID='.length);
    }
    const key =
      args[0] === 'set-option' &&
      world.answers[`set-option ${args[3] ?? ''}`] !== undefined
        ? `set-option ${args[3] ?? ''}`
        : (args[0] ?? '');
    const answer = world.answers[key];
    if (answer instanceof Error) return Promise.reject(answer);
    if (typeof answer === 'function') {
      try {
        return Promise.resolve(answer(args));
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return Promise.resolve(answer ?? '');
  }
}));

vi.mock('../../tmux/control-client', async (importOriginal) => {
  const { EventEmitter } = await import('node:events');
  class FakeControlClient extends EventEmitter {
    connected = false;
    start(): Promise<void> {
      return Promise.resolve();
    }
    stop(): void {
      this.connected = false;
    }
  }
  return {
    ...(await importOriginal<typeof import('../../tmux/control-client')>()),
    TmuxControlClient: FakeControlClient
  };
});

vi.mock('../store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../store')>()),
  // No machine is named in the machines file, as in the p326 harness by
  // default; a test can make the read throw once the create has answered.
  machineRow: () => {
    if (world.machineRowThrows) throw new Error('the machines file could not be read');
    return null;
  }
}));

vi.mock('../remote-record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-record')>()),
  remoteManifestInstalled: () => true,
  noteRemoteRowSeen: (id: string, status: string) => {
    if (world.throwOnSeen !== null) {
      const err = world.throwOnSeen;
      world.throwOnSeen = null;
      throw err;
    }
    const row = world.rows.get(id);
    if (row !== undefined) row.status = status;
  },
  writeRemoteRow: (input: {
    sessionId: string;
    machineId: string;
    name: string;
    projectPath: string;
    cwd: string;
    agent: string;
    createdAt: number;
  }) => {
    world.rows.set(input.sessionId, {
      id: input.sessionId,
      machineId: input.machineId,
      status: 'running',
      name: input.name,
      projectPath: input.projectPath,
      cwd: input.cwd,
      agent: input.agent,
      createdAt: input.createdAt
    });
    return null;
  },
  remoteRecordOf: (id: string) => world.rows.get(id) ?? null,
  remoteRecordsForMachine: (machineId: string) =>
    [...world.rows.values()].filter((one) => one.machineId === machineId),
  unconfirmedRemoteRecords: () =>
    [...world.rows.values()].filter((one) => one.status === 'unknown'),
  markRemoteCreateUnconfirmed: (id: string) => {
    const row = world.rows.get(id);
    if (row !== undefined) row.status = 'unknown';
  },
  remoteManifest: () => ({
    deleteSession: (id: string) => {
      world.droppedRows.push(id);
      world.rows.delete(id);
    }
  })
}));

vi.mock('../../notice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../notice')>()),
  postDurabilityNotice: (notice: DurabilityNotice) => {
    if (world.noticeThrows) {
      throw new Error('Render frame was disposed before WebFrameMain could be accessed');
    }
    world.posted.push(notice);
    return true;
  }
}));

vi.mock('../remote-env-probe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-env-probe')>()),
  remoteEnvNamesFor: () => [],
  remoteEnvNamesDroppedFor: () => [...world.envDropped]
}));

const { CREATE_ANSWER_LOST, REMOTE_DIR_MISSING, remoteCreateNotStarted } =
  await import('../remote-copy');
const { remoteCreate, remoteSessionRow, resetRemoteSessionsForTests } =
  await import('../remote-sessions');
const { resetControlPlanesForTests } = await import('../control-plane');
const { issuedRemoteIdHeld, resetRescueForTests } = await import('../pane-env-rescue');
const { remoteCreateInFlight, resetRemoteCreateFlightsForTests } = await import(
  '../create-inflight'
);
// His third ruling (D27): the stopped store's own refusal, exactly as the store makes it.
const { isManifestStopped, manifestStoppedError } = await import('../../manifest/store');

const MACHINE = 'popos';

const CREATE = {
  machineId: MACHINE,
  name: 'work',
  projectPath: '/srv/repo',
  cwd: '/srv/repo',
  agent: 'shell'
} as const;

/** What the spec step's far shells printed before tmux did (§2.2 R5a, R5b). */
const NOISE_LOGIN = 'Last login: Sun Nov  8 19:00:00 on ttys001';
const NOISE_PROFILE = '/home/x/.profile:3: no such file or directory: /opt/x/env';

/** One list line in the shipped format, quoted as tmux's own `#{q:...}` quotes it. */
function line(row: { tmuxId: string; gmuxId?: string; tmuxName?: string }): string {
  return [
    row.tmuxId,
    '1700000000',
    '1700000100',
    '0',
    row.gmuxId ?? '',
    'shell',
    row.tmuxName ?? 'work',
    '/srv/repo',
    '/srv/repo',
    'work'
  ]
    .map((value) => value.replace(/([ \\"'$;])/g, '\\$1'))
    .join(' ');
}

/** The verbs the create sent, in order. */
function verbs(): string[] {
  return world.sent.map((argv) => argv[0] ?? '');
}

/** The `$-id` every stamp was aimed at. */
function stampTargets(): string[] {
  return world.sent.filter((argv) => argv[0] === 'set-option').map((argv) => argv[2] ?? '');
}

/** The lines Phase 360 writes after the machine answered, by their own words. */
function linesSaying(words: string): string[] {
  return world.logged.filter((one) => one.includes(words));
}

/** The refusal a call produced, with its message and detail, or null when it resolved. */
async function refusalOf(
  work: () => Promise<unknown>
): Promise<GmuxError['payload'] | null> {
  try {
    await work();
    return null;
  } catch (err) {
    if (err instanceof GmuxError) return err.payload;
    return { code: 'UNKNOWN', message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * The confirmation read answers the create's own id once the create has run,
 * and the list names `$4` under the create's tmux name, stamped once the stamp
 * has gone out (which is what the far side would answer).
 */
function farHoldsTheSession(tmuxId = '$4'): void {
  world.answers['show-environment'] = () =>
    `TERM=xterm\nGMUX_SESSION_ID=${world.createdUuid}\nGMUX_MANAGED=1\n`;
  world.answers['list-sessions'] = () => {
    if (world.createdUuid === '') return '';
    const stamped = world.sent.some(
      (argv) => argv[0] === 'set-option' && argv[3] === '@gmux-id'
    );
    return line({ tmuxId, gmuxId: stamped ? world.createdUuid : '' });
  };
}

/** No byte of a far line in any log line, any sentence or any detail. */
function expectNoFarText(payload: GmuxError['payload'] | null, ...noise: string[]): void {
  for (const text of noise) {
    for (const fragment of [text, text.slice(0, 12), text.slice(-12)]) {
      expect(world.logged.filter((one) => one.includes(fragment))).toEqual([]);
      expect(payload?.message ?? '').not.toContain(fragment);
      expect(payload?.detail ?? '').not.toContain(fragment);
    }
  }
}

beforeEach(() => {
  world.sent = [];
  world.answers = {};
  world.createdUuid = '';
  world.logged = [];
  world.posted = [];
  world.noticeThrows = false;
  world.envDropped = [];
  world.machineRowThrows = false;
  world.rows = new Map();
  world.droppedRows = [];
  world.throwOnSeen = null;
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetRemoteCreateFlightsForTests();
});

afterEach(() => {
  // Every row: nothing ends a session, nothing starts twice, and the flight ends.
  expect(verbs()).not.toContain('kill-session');
  expect(verbs()).not.toContain('kill-server');
  expect(verbs().filter((verb) => verb === 'new-session').length).toBeLessThanOrEqual(1);
  if (world.createdUuid !== '') expect(remoteCreateInFlight(world.createdUuid)).toBe(false);
  vi.restoreAllMocks();
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetRemoteCreateFlightsForTests();
});

// ---------------------------------------------------------------------------
// The control
// ---------------------------------------------------------------------------

describe('the control: one session id, listed back', () => {
  it('binds `$4`, stamps it, answers the listed row, and asks nothing about its identity', async () => {
    world.answers['new-session'] = '$4\n';
    farHoldsTheSession();
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(session.machine?.id).toBe(MACHINE);
    expect(stampTargets()).toEqual(['$4', '$4', '$4', '$4']);
    expect(verbs()).not.toContain('show-environment');
    expect(remoteSessionRow(world.createdUuid)?.tmuxId).toBe('$4');
    expect(linesSaying('the session started on')).toEqual([]);
  });

  /** CRLF and blanks around the one id are still the one id (CA4). */
  it('reads `$4` through a carriage return and blank lines, with no identity read', async () => {
    world.answers['new-session'] = '\r\n $4 \r\n\r\n';
    farHoldsTheSession();
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(stampTargets()).toEqual(['$4', '$4', '$4', '$4']);
    expect(verbs()).not.toContain('show-environment');
  });
});

// ---------------------------------------------------------------------------
// Item 5: an answer that is not exactly one session id (D10, D11)
// ---------------------------------------------------------------------------

describe('item 5: an answer whose first line a login file printed', () => {
  it('R5a: a login line then `$4` binds `$4` by the create’s own id, and no byte of the line is logged', async () => {
    world.answers['new-session'] = `${NOISE_LOGIN}\n$4\n`;
    farHoldsTheSession();
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    // The identity read ran once, by the exact name, and bound the listed id.
    expect(world.sent.filter((argv) => argv[0] === 'show-environment')).toEqual([
      ['show-environment', '-t', '=work']
    ]);
    expect(stampTargets()).toEqual(['$4', '$4', '$4', '$4']);
    expect(world.rows.has(world.createdUuid)).toBe(true);
    expect(world.droppedRows).toEqual([]);
    expect(issuedRemoteIdHeld(world.createdUuid)).toBe(false);
    expect(
      linesSaying('answered 2 line(s), none of them a session, and its id was found there')
    ).toHaveLength(1);
    expectNoFarText(null, NOISE_LOGIN);
  });

  it('R5b: a login line naming a missing file then `$4` binds `$4`, and never reads as a missing folder', async () => {
    world.answers['new-session'] = `${NOISE_PROFILE}\n$4\n`;
    farHoldsTheSession();
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(stampTargets()).toEqual(['$4', '$4', '$4', '$4']);
    expect(world.rows.has(world.createdUuid)).toBe(true);
    expect(world.droppedRows).toEqual([]);
    expectNoFarText(null, NOISE_PROFILE);
  });

  /** A noise line shaped like an id before tmux's own would have stamped somebody else's session. */
  it('two id shaped lines bind the id the machine lists the create under, never the first', async () => {
    world.answers['new-session'] = '$3\n$5\n';
    farHoldsTheSession('$5');
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(stampTargets()).toEqual(['$5', '$5', '$5', '$5']);
    expect(stampTargets()).not.toContain('$3');
  });

  it('a login file that ended the shell first: the machine holds none, so the row goes and the sentence says so, with only a count in the detail', async () => {
    world.answers['new-session'] = 'far login file: leaving early\n';
    world.answers['show-environment'] = new GmuxError(
      'UNKNOWN',
      'tmux show-environment failed',
      'no such session: =work'
    );
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.code).toBe('SPAWN_FAILED');
    expect(payload?.message).toBe(remoteCreateNotStarted('work'));
    expect(payload?.message).toBe(
      'That machine did not start a session called work. Nothing was changed.'
    );
    expect(payload?.detail).toBe('popos answered 1 line(s) and none named a session');
    expect(world.droppedRows).toEqual([world.createdUuid]);
    expect(world.rows.size).toBe(0);
    expect(stampTargets()).toEqual([]);
    expect(
      linesSaying(
        'answered 1 line(s), none of them a session, and the machine holds no session with its id, so the row is removed'
      )
    ).toHaveLength(1);
    expectNoFarText(payload, 'far login file: leaving early');
  });

  /**
   * The far text matches `createFailure`'s folder pattern, and at the parent it
   * rode the detail. A proven absence after it names the session and a count,
   * and never the folder sentence.
   */
  it('a missing-file login line and a proven absence: not the folder sentence, and no far text anywhere', async () => {
    world.answers['new-session'] = `${NOISE_PROFILE}\n`;
    world.answers['show-environment'] = new GmuxError(
      'TMUX_UNREACHABLE',
      'The Tortie session server is not running.',
      'no server running on /tmp/tortie-1000/gmux'
    );
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.code).toBe('SPAWN_FAILED');
    expect(payload?.message).toBe(remoteCreateNotStarted('work'));
    expect(payload?.message).not.toBe(REMOTE_DIR_MISSING);
    expect(payload?.detail).toBe('popos answered 1 line(s) and none named a session');
    expect(world.droppedRows).toEqual([world.createdUuid]);
    expectNoFarText(payload, NOISE_PROFILE);
  });

  it('an answer that named nothing and a confirmation that read another session’s id: absent for this create', async () => {
    world.answers['new-session'] = '';
    world.answers['show-environment'] = 'GMUX_SESSION_ID=somebody-else\n';
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.message).toBe(remoteCreateNotStarted('work'));
    expect(payload?.detail).toBe('popos answered 0 line(s) and none named a session');
    expect(world.droppedRows).toEqual([world.createdUuid]);
  });

  it('an answer that could not be read and a confirmation nobody could read: the row is kept unknown, as a lost answer is', async () => {
    world.answers['new-session'] = `${NOISE_LOGIN}\n$4\n`;
    world.answers['show-environment'] = new Error('socket hang up');
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.code).toBe('TMUX_UNREACHABLE');
    expect(payload?.message).toBe(CREATE_ANSWER_LOST);
    expect(payload?.detail).toBe('popos: the machine did not answer: socket hang up');
    expect(world.rows.get(world.createdUuid)?.status).toBe('unknown');
    expect(world.droppedRows).toEqual([]);
    expect(issuedRemoteIdHeld(world.createdUuid)).toBe(true);
    expect(stampTargets()).toEqual([]);
    // Phase 117's own line, word for word.
    expect(
      linesSaying('could not be confirmed, so the row is kept and marked unknown')
    ).toHaveLength(1);
    expectNoFarText(payload, NOISE_LOGIN);
  });

  it('the session proved there and its list unreadable: kept unknown, as a lost answer is', async () => {
    world.answers['new-session'] = `${NOISE_LOGIN}\n`;
    world.answers['show-environment'] = () => `GMUX_SESSION_ID=${world.createdUuid}\n`;
    world.answers['list-sessions'] = () =>
      world.createdUuid === '' ? '' : Promise.reject(new Error('the list went'));
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.message).toBe(CREATE_ANSWER_LOST);
    expect(world.rows.get(world.createdUuid)?.status).toBe('unknown');
    expect(world.droppedRows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Item 6 and the steps after the answer (D12, D13)
// ---------------------------------------------------------------------------

describe('after the machine answered, the create answers its session', () => {
  it('R6: `$4` and a list that never shows it: the session, unknown, the row kept, one line', async () => {
    world.answers['new-session'] = '$4\n';
    world.answers['list-sessions'] = '';
    const session = await remoteCreate(CREATE);
    expect(session).toEqual({
      id: world.createdUuid,
      name: 'work',
      tmuxName: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell',
      status: 'unknown',
      createdAt: expect.any(Number),
      machine: expect.objectContaining({ id: MACHINE })
    });
    expect(stampTargets()).toEqual(['$4', '$4', '$4', '$4']);
    expect(world.rows.has(world.createdUuid)).toBe(true);
    expect(world.droppedRows).toEqual([]);
    expect(linesSaying('the session started on popos')).toEqual([
      'warn the session started on popos as $4, and no list has shown it yet, so the create answers it from what it sent'
    ]);
  });

  it('R6b: the create’s own feed pass throws from its manifest write: the listed session, one line naming the code alone', async () => {
    world.answers['new-session'] = '$4\n';
    farHoldsTheSession();
    // The last stamp arms a refused write, so the pass inside the feed start
    // throws, after it put the row in memory: a busy store, which is not the
    // stopped list (his third ruling lets that one through, below). The
    // message is SQLite's own and must not reach the log.
    world.answers['set-option @gmux-project'] = () => {
      world.throwOnSeen = Object.assign(new Error('a sentence: database is locked'), { code: 'SQLITE_BUSY' });
      return '';
    };
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(session.machine?.id).toBe(MACHINE);
    // The pass put the row in memory before its write failed, so the session
    // is answered as the list showed it (D13's first arm), the same reading
    // the window's list draws, and not from what the create sent.
    expect(remoteSessionRow(world.createdUuid)?.tmuxId).toBe('$4');
    expect(session.status).toBe(remoteSessionRow(world.createdUuid)?.status);
    expect(world.rows.has(world.createdUuid)).toBe(true);
    expect(linesSaying('the session started on popos')).toEqual([
      'warn the session started on popos, and its list could not be started: SQLITE_BUSY'
    ]);
    expect(world.logged.filter((one) => one.includes('a sentence'))).toEqual([]);
  });

  it('R6c: `$4` and the feed’s list timing out: the session, unknown, one line', async () => {
    let created = false;
    world.answers['new-session'] = () => {
      created = true;
      return '$4\n';
    };
    world.answers['list-sessions'] = () =>
      created ? Promise.reject(new Error('the list timed out')) : '';
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(session.status).toBe('unknown');
    expect(world.rows.has(world.createdUuid)).toBe(true);
    expect(linesSaying('the session started on popos')).toEqual([
      'warn the session started on popos as $4, and no list has shown it yet, so the create answers it from what it sent'
    ]);
  });

  it('the env notice that cannot be sent: the session, and one line naming the failure and no message', async () => {
    world.answers['new-session'] = '$4\n';
    farHoldsTheSession();
    world.envDropped = ['FIREWORKS_API_KEY'];
    world.noticeThrows = true;
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(world.posted).toEqual([]);
    expect(linesSaying('the session started on popos')).toEqual([
      'warn the session started on popos, and the notice naming a shell variable it did not get was not sent: Error'
    ]);
    expect(world.logged.filter((one) => one.includes('Render frame'))).toEqual([]);
  });

  it('the env notice’s control: a window that is there gets it, once, naming the variable', async () => {
    world.answers['new-session'] = '$4\n';
    farHoldsTheSession();
    world.envDropped = ['FIREWORKS_API_KEY'];
    const session = await remoteCreate(CREATE);
    expect(world.posted).toEqual([
      {
        kind: 'env-unresolved',
        sessionId: session.id,
        sessionName: 'work',
        names: ['FIREWORKS_API_KEY'],
        probeFailed: false
      }
    ]);
    expect(linesSaying('the session started on popos')).toEqual([]);
  });

  /** The parent never sent the notice for a session not listed back, because it threw first. */
  it('a session not listed back still gets its env notice, because it exists', async () => {
    world.answers['new-session'] = '$4\n';
    world.answers['list-sessions'] = '';
    world.envDropped = ['FIREWORKS_API_KEY'];
    const session = await remoteCreate(CREATE);
    expect(session.status).toBe('unknown');
    expect(world.posted).toHaveLength(1);
  });

  /**
   * D13's fallbacks. The badge reads memory today, so a throw is planted in the
   * machines file read once the create's own list has answered: the projection
   * of the listed row throws, the machine level badge throws, and the create
   * still answers its session from what it sent, with no machine.
   */
  it('a projection and a badge that both throw: the session from what it sent, with no machine', async () => {
    world.answers['new-session'] = '$4\n';
    world.answers['show-environment'] = () => `GMUX_SESSION_ID=${world.createdUuid}\n`;
    world.answers['list-sessions'] = () => {
      if (world.createdUuid === '') return '';
      world.machineRowThrows = true;
      return line({ tmuxId: '$4', gmuxId: world.createdUuid });
    };
    const session = await remoteCreate(CREATE);
    world.machineRowThrows = false;
    expect(session).toEqual({
      id: world.createdUuid,
      name: 'work',
      tmuxName: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell',
      status: 'unknown',
      createdAt: expect.any(Number)
    });
    expect(session.machine).toBeUndefined();
    expect(linesSaying('the session started on popos')).toEqual([
      'warn the session started on popos, and its listed row could not be drawn, so the create answers it from what it sent: Error',
      'warn the session started on popos, and its machine could not be read for the answer: Error'
    ]);
    expect(world.logged.filter((one) => one.includes('machines file'))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// His third ruling (2026-11-17, "360 a then ship 115.0", D27): the session list
// stopped before this machine's create returned, so the create answers the
// stopped list's own refusal, as the parent did
// ---------------------------------------------------------------------------

describe('his third ruling: the stopped list met by the create’s own feed goes through, as at the parent', () => {
  /** What the create answered, and every line it wrote after that machine answered. */
  async function stoppedAnswer(): Promise<unknown> {
    try {
      await remoteCreate(CREATE);
      return null;
    } catch (err) {
      return err;
    }
  }

  it('RF’s shape: the list showed the session, then its write met the stopped store: that very refusal, the row kept, nothing ended, no line of a step after the answer', async () => {
    world.answers['new-session'] = '$4\n';
    farHoldsTheSession();
    const stopped = manifestStoppedError('getSession');
    world.answers['set-option @gmux-project'] = () => {
      world.throwOnSeen = stopped;
      return '';
    };
    const err = await stoppedAnswer();
    // The store's own refusal, the same object, so the sheet draws its one
    // sentence ("Restart Tortie, then try again") and the window does not move.
    expect(err).toBe(stopped);
    expect(isManifestStopped(err)).toBe(true);
    // The session started over there and was stamped; its row stays, as every
    // stopped case leaves it, and nothing was sent that ends it (afterEach).
    expect(stampTargets()).toEqual(['$4', '$4', '$4', '$4']);
    expect(world.rows.has(world.createdUuid)).toBe(true);
    expect(world.droppedRows).toEqual([]);
    // The parent's create wrote nothing here, and neither does this one: no
    // line that the list could not start (D13) and none answering from what it
    // sent (D12), because the refusal goes through before either.
    expect(linesSaying('the session started on popos')).toEqual([]);
  });

  it('RN’s shape: the create’s own list timed out and the machine’s verdict write met the stopped store: that very refusal, never an answer from what it sent', async () => {
    const stopped = manifestStoppedError('listSessions');
    let created = false;
    world.answers['new-session'] = () => {
      created = true;
      return '$4\n';
    };
    world.answers['list-sessions'] = () => {
      if (!created) return '';
      // The list after the create does not come back: the feed marks the
      // machine unknown and writes that verdict into the rows it owns, which
      // is where the stopped store refuses.
      world.throwOnSeen = stopped;
      return Promise.reject(new Error('the list timed out'));
    };
    const err = await stoppedAnswer();
    expect(err).toBe(stopped);
    expect(world.rows.has(world.createdUuid)).toBe(true);
    expect(world.droppedRows).toEqual([]);
    // No list showed it, and the create never reached the step that would
    // answer it from what it sent (D12): the parent's answer, not D26's.
    expect(remoteSessionRow(world.createdUuid)).toBeNull();
    expect(linesSaying('the session started on popos')).toEqual([]);
  });

  it('any other error the feed meets is still logged once and the session answered (R6b’s rule stands)', async () => {
    world.answers['new-session'] = '$4\n';
    farHoldsTheSession();
    world.answers['set-option @gmux-project'] = () => {
      world.throwOnSeen = Object.assign(new Error('disk I/O error'), { code: 'SQLITE_IOERR_WRITE' });
      return '';
    };
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(linesSaying('the session started on popos')).toEqual([
      'warn the session started on popos, and its list could not be started: SQLITE_IOERR_WRITE'
    ]);
  });
});

// ---------------------------------------------------------------------------
// Phase 117's lost answer, through the moved read, unchanged
// ---------------------------------------------------------------------------

describe('a lost answer takes the same road it always did', () => {
  it('present: binds the listed id and logs Phase 117’s own line', async () => {
    world.answers['new-session'] = new Error('the link went');
    farHoldsTheSession();
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(world.createdUuid);
    expect(stampTargets()).toEqual(['$4', '$4', '$4', '$4']);
    expect(
      linesSaying('lost its answer and the session was there: the link went')
    ).toHaveLength(1);
  });

  it('proven absent: drops the row and throws the create’s own failure, never the new sentence', async () => {
    world.answers['new-session'] = new Error('the link went');
    world.answers['show-environment'] = new GmuxError(
      'SESSION_NOT_FOUND',
      'Session not found.',
      "can't find session: work"
    );
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.message).not.toBe(remoteCreateNotStarted('work'));
    expect(payload?.message).toBe('the link went');
    expect(world.droppedRows).toEqual([world.createdUuid]);
  });

  it('unreachable: keeps the row unknown with the lost sentence and the same detail', async () => {
    world.answers['new-session'] = new Error('the link went');
    world.answers['show-environment'] = new Error('socket hang up');
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.code).toBe('TMUX_UNREACHABLE');
    expect(payload?.message).toBe(CREATE_ANSWER_LOST);
    expect(payload?.detail).toBe('popos: the machine did not answer: socket hang up');
    expect(world.rows.get(world.createdUuid)?.status).toBe('unknown');
  });
});
