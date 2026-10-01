/**
 * The creates on another machine that are running in this process (Phase 326).
 *
 * THE DEFECT. `remoteCreate` sends `new-session` and then stamps `@gmux-id` as a
 * second command. A list that ran over there inside that window read the new
 * session with no stamp, counted it as a session Tortie did not create, left it
 * out of the feed and handed it to Phase 117's rescue while the create was still
 * stamping it. The attach that followed found no row, and the new session's
 * screen never drew.
 *
 * NOTHING HERE RUNS A COMMAND. The exec plane is replaced by a function that
 * records the argv it was handed and answers with what a machine would print,
 * the same fake `./remote-sessions.test.ts` uses. An answer may be a function,
 * called with the argv at the moment the command is sent, and it may return a
 * promise, which is how a test holds a list or a stamp open and runs a pass
 * inside the window.
 *
 * Each rule is asserted with a CONTROL beside it where the rule narrows what the
 * parent did: the control shows the parent's count, probe or write happening
 * when no flight exists, so a test that passes cannot be passing because the
 * path it guards never ran.
 */

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
  socket: 'gmux-p326-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Every argv the plane was handed, in order. */
let sent: string[][] = [];
/** What each verb answers with, keyed by the verb. */
let answers: Record<
  string,
  string | Error | ((args: readonly string[]) => string | Promise<string>)
> = {};
/** The uuid the last create put on its own new-session line. */
let createdUuid = '';
/** The machine's connection generation, as `./context.ts` would report it. */
let generation = 1;
/** Whether the machines file names the machine (only the status ladder asks). */
let machineKnown = false;

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    sent.push([...args]);
    if (args[0] === 'new-session') {
      const pair = args.find((one) => one.startsWith('GMUX_SESSION_ID=')) ?? '';
      createdUuid = pair.slice('GMUX_SESSION_ID='.length);
    }
    // A stamp can be answered per option, so one stamp can fail alone.
    const key =
      args[0] === 'set-option' && answers[`set-option ${args[3] ?? ''}`] !== undefined
        ? `set-option ${args[3] ?? ''}`
        : (args[0] ?? '');
    const answer = answers[key];
    if (answer instanceof Error) return Promise.reject(answer);
    if (typeof answer === 'function') return Promise.resolve(answer(args));
    return Promise.resolve(answer ?? '');
  }
}));

/** The control client, replaced so nothing spawns (the same fake the sibling file uses). */
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
  machineRow: (id: string) =>
    machineKnown && id === 'popos' ? { id, host: CTX.host } : null
}));

/** The manifest half, replaced so the writes can be counted. No database opens. */
const record = vi.hoisted(() => ({
  installed: false,
  /** When true the next `noteRemoteRowSeen` throws, which is how a feed start fails. */
  throwOnSeen: false,
  seen: [] as { id: string; status: string; at: number }[],
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
  dropped: [] as string[]
}));

vi.mock('../remote-record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-record')>()),
  remoteManifestInstalled: () => record.installed,
  noteRemoteRowSeen: (id: string, status: string, at: number) => {
    if (record.throwOnSeen) {
      record.throwOnSeen = false;
      throw new Error('the manifest refused the write');
    }
    record.seen.push({ id, status, at });
    const row = record.rows.get(id);
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
    record.rows.set(input.sessionId, {
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
  remoteRecordOf: (id: string) => record.rows.get(id) ?? null,
  remoteRecordsForMachine: (machineId: string) =>
    [...record.rows.values()].filter((one) => one.machineId === machineId),
  unconfirmedRemoteRecords: () =>
    [...record.rows.values()].filter((one) => one.status === 'unknown'),
  markRemoteCreateUnconfirmed: (id: string) => {
    const row = record.rows.get(id);
    if (row !== undefined) row.status = 'unknown';
  },
  remoteManifest: () => ({
    deleteSession: (id: string) => {
      record.dropped.push(id);
      record.rows.delete(id);
    }
  })
}));

const { CREATE_ANSWER_LOST, ATTACH_NOT_HEARD } = await import('../remote-copy');
const {
  FLIGHT_MEMORY_MS,
  awaitRemoteCreateSettled,
  beginRemoteCreate,
  remoteCreateFlightsFor,
  remoteCreateInFlight,
  resetRemoteCreateFlightsForTests
} = await import('../create-inflight');
const {
  pollRemoteMachine,
  projectRemoteRecord,
  remoteCreate,
  remoteListCompletedSince,
  remoteMachineFacts,
  remoteSessionRow,
  remoteSessions,
  resetRemoteSessionsForTests
} = await import('../remote-sessions');
const { resetControlPlanesForTests } = await import('../control-plane');
const { issuedRemoteIdHeld, noteIssuedRemoteId, resetRescueForTests } =
  await import('../pane-env-rescue');

const MACHINE = 'popos';

/** One list line in the shipped format, quoted as tmux's own `#{q:...}` quotes it. */
function line(row: {
  tmuxId: string;
  gmuxId?: string;
  tmuxName?: string;
  name?: string;
}): string {
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
    row.name ?? 'work'
  ]
    .map((value) => value.replace(/([ \\"'$;])/g, '\\$1'))
    .join(' ');
}

/** The probes the rescue sent, by the `$-id` each one named. */
function probed(): string[] {
  return sent
    .filter((argv) => argv[0] === 'show-environment')
    .map((argv) => argv[2] ?? '');
}

/** A promise a test resolves by hand, so an answer can be held open. */
function held(): { promise: Promise<string>; answer(text: string): void } {
  let answer: (text: string) => void = () => undefined;
  const promise = new Promise<string>((resolve) => {
    answer = resolve;
  });
  return { promise, answer };
}

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

const CREATE = {
  machineId: MACHINE,
  name: 'work',
  projectPath: '/srv/repo',
  cwd: '/srv/repo',
  agent: 'shell'
} as const;

/** A manifest row for a session on this machine, as `writeRemoteRow` leaves it. */
function plantRow(id: string, status: string): void {
  record.rows.set(id, {
    id,
    machineId: MACHINE,
    status,
    name: 'work',
    projectPath: '/srv/repo',
    cwd: '/srv/repo',
    agent: 'shell',
    createdAt: 1_700_000_000_000
  });
}

/** The same id in the issued set, as the create's `noteIssuedRemoteId` leaves it. */
function issue(id: string): void {
  noteIssuedRemoteId({
    id,
    machineId: MACHINE,
    name: 'work',
    agent: 'shell',
    projectPath: '/srv/repo',
    cwd: '/srv/repo',
    issuedAt: Date.now()
  });
}

beforeEach(() => {
  sent = [];
  answers = {};
  createdUuid = '';
  generation = 1;
  machineKnown = false;
  record.installed = false;
  record.throwOnSeen = false;
  record.seen = [];
  record.rows = new Map();
  record.dropped = [];
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetRemoteCreateFlightsForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetRemoteCreateFlightsForTests();
});

// ---------------------------------------------------------------------------
// The registry, alone
// ---------------------------------------------------------------------------

describe('the flight registry', () => {
  it('settles a waiter when the create ends, and leaves no timer and no listener', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, 'addEventListener');
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const flight = beginRemoteCreate('s1', MACHINE);
    const waiting = awaitRemoteCreateSettled('s1', 60_000, controller.signal);
    // The timer the wait made is unref'd, so a wait never holds this process open.
    const timer = setTimeoutSpy.mock.results.at(-1)?.value as NodeJS.Timeout;
    expect(timer.hasRef()).toBe(false);
    flight.end();
    await expect(waiting).resolves.toBe('settled');
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[1]).toBe(add.mock.calls[0]?.[1]);
    expect(remoteCreateInFlight('s1')).toBe(false);
  });

  it('answers none at once for an id with no live create, and makes no timer', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    await expect(awaitRemoteCreateSettled('never', 60_000)).resolves.toBe('none');
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.end();
    await expect(awaitRemoteCreateSettled('s1', 60_000)).resolves.toBe('none');
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('answers timeout when the deadline passes first, and clears everything', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const flight = beginRemoteCreate('s1', MACHINE);
    const waiting = awaitRemoteCreateSettled('s1', 7_000, controller.signal);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(6_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(waiting).resolves.toBe('timeout');
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledTimes(1);
    // The create is still running; a timeout ends the wait, never the create.
    expect(remoteCreateInFlight('s1')).toBe(true);
    // A later end settles nobody twice and throws nothing.
    flight.end();
    expect(remoteCreateInFlight('s1')).toBe(false);
  });

  it('answers aborted when the signal fires first, and clears the timer', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    beginRemoteCreate('s1', MACHINE);
    const waiting = awaitRemoteCreateSettled('s1', 7_000, controller.signal);
    controller.abort();
    await expect(waiting).resolves.toBe('aborted');
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('answers aborted at once for a signal that has already fired', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    controller.abort();
    beginRemoteCreate('s1', MACHINE);
    await expect(
      awaitRemoteCreateSettled('s1', 7_000, controller.signal)
    ).resolves.toBe('aborted');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('replaces a live flight for the same id, settling the first one’s waiters', async () => {
    const first = beginRemoteCreate('s1', MACHINE);
    const waiting = awaitRemoteCreateSettled('s1', 60_000);
    const second = beginRemoteCreate('s1', MACHINE);
    await expect(waiting).resolves.toBe('settled');
    expect(remoteCreateInFlight('s1')).toBe(true);
    // The first handle ending again does not end the one that replaced it.
    first.end();
    expect(remoteCreateInFlight('s1')).toBe(true);
    second.end();
    expect(remoteCreateInFlight('s1')).toBe(false);
  });

  it('considers a flight only for the lists issued before it ended', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000_000);
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    vi.setSystemTime(1_000_500);
    flight.end();
    // Issued before the end: that list may have run over there before the stamp.
    expect(remoteCreateFlightsFor(MACHINE, 1_000_499, 1).beingBound.has('$5')).toBe(true);
    // Issued in the same millisecond: the tie goes to the flight.
    expect(remoteCreateFlightsFor(MACHINE, 1_000_500, 1).owns('s1')).toBe(true);
    // Issued after the end: the list saw whatever the create left, and speaks for it.
    const after = remoteCreateFlightsFor(MACHINE, 1_000_501, 1);
    expect(after.owns('s1')).toBe(false);
    expect(after.beingBound.size).toBe(0);
  });

  it('forgets an ended flight after FLIGHT_MEMORY_MS and not before', () => {
    const flight = beginRemoteCreate('s1', MACHINE, 1_000);
    flight.answered('$5', 1);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(2_000);
    flight.end();
    const at = (now: number) => remoteCreateFlightsFor(MACHINE, 0, 1, now).owns('s1');
    expect(at(2_000 + FLIGHT_MEMORY_MS)).toBe(true);
    expect(at(2_000 + FLIGHT_MEMORY_MS + 1)).toBe(false);
    // Pruned, not merely filtered: an earlier `now` does not bring it back.
    expect(at(2_000)).toBe(false);
  });

  it('holds FLIGHT_MEMORY_MS at twice the list timeout or more', async () => {
    const { REMOTE_POLL_TIMEOUT_MS } = await import('../remote-sessions');
    expect(FLIGHT_MEMORY_MS).toBeGreaterThanOrEqual(2 * REMOTE_POLL_TIMEOUT_MS);
  });

  it('binds an answered `$-id` only in the generation it was answered in', () => {
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    expect(remoteCreateFlightsFor(MACHINE, 0, 1).beingBound.has('$5')).toBe(true);
    const reborn = remoteCreateFlightsFor(MACHINE, 0, 2);
    expect(reborn.beingBound.has('$5')).toBe(false);
    expect(reborn.owns('s1')).toBe(true);
  });

  it('binds nothing before the answer, and takes the first answer only', () => {
    const flight = beginRemoteCreate('s1', MACHINE);
    const before = remoteCreateFlightsFor(MACHINE, 0, 1);
    expect(before.beingBound.size).toBe(0);
    expect(before.owns('s1')).toBe(true);
    flight.answered('$5', 1);
    flight.answered('$9', 1);
    expect([...remoteCreateFlightsFor(MACHINE, 0, 1).beingBound]).toEqual(['$5']);
  });

  it('carries no deferral: the fix round removed `awaitingAnswer`', () => {
    beginRemoteCreate('s1', MACHINE);
    expect(Object.keys(remoteCreateFlightsFor(MACHINE, 0, 1)).sort()).toEqual([
      'beingBound',
      'owns'
    ]);
  });

  it('never reads a flight on another machine', () => {
    const flight = beginRemoteCreate('s1', 'attic');
    flight.answered('$5', 1);
    beginRemoteCreate('s2', 'attic');
    const flights = remoteCreateFlightsFor(MACHINE, 0, 1);
    expect(flights.beingBound.size).toBe(0);
    expect(flights.owns('s1')).toBe(false);
  });

  it('ignores an answer given after the end', () => {
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.end();
    flight.answered('$5', 1);
    flight.end();
    const flights = remoteCreateFlightsFor(MACHINE, 0, 1);
    expect(flights.beingBound.size).toBe(0);
    // Remembered, so a list issued before the end still sees it owned.
    expect(flights.owns('s1')).toBe(true);
  });

  it('stops claiming the `$-id` once left to the rescue, and stays live and owned', () => {
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    flight.leftToRescue();
    const flights = remoteCreateFlightsFor(MACHINE, 0, 1);
    expect(flights.beingBound.has('$5')).toBe(false);
    expect(flights.owns('s1')).toBe(true);
    expect(remoteCreateInFlight('s1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Every exit of remoteCreate ends its flight
// ---------------------------------------------------------------------------

describe('every exit of a remote create ends its flight', () => {
  /**
   * Starts a wait on the create's flight at the moment `new-session` is sent,
   * which is inside the flight, and says whether the flight was live then.
   */
  function watchTheFlight(newSession: string | Error): {
    liveAtSend: () => boolean;
    settled: () => Promise<string>;
  } {
    let live = false;
    let waiting: Promise<string> = Promise.resolve('never asked');
    answers['new-session'] = () => {
      live = remoteCreateInFlight(createdUuid);
      waiting = awaitRemoteCreateSettled(createdUuid, 60_000);
      if (newSession instanceof Error) return Promise.reject(newSession);
      return newSession;
    };
    return { liveAtSend: () => live, settled: () => waiting };
  }

  it('ends it on the return', async () => {
    const watch = watchTheFlight('$4\n');
    answers['list-sessions'] = () =>
      createdUuid === '' ? '' : line({ tmuxId: '$4', gmuxId: createdUuid });
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(createdUuid);
    expect(watch.liveAtSend()).toBe(true);
    await expect(watch.settled()).resolves.toBe('settled');
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
  });

  it('ends it on SPAWN_FAILED for an answer that is not an identifier', async () => {
    const watch = watchTheFlight('garbage\n');
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.code).toBe('SPAWN_FAILED');
    expect(record.dropped).toEqual([createdUuid]);
    expect(watch.liveAtSend()).toBe(true);
    await expect(watch.settled()).resolves.toBe('settled');
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
  });

  it('ends it when the confirmation proves nothing ran and the row is dropped', async () => {
    record.installed = true;
    const watch = watchTheFlight(new Error('the link went'));
    answers['show-environment'] = new GmuxError(
      'SESSION_NOT_FOUND',
      'Session not found.',
      "can't find session: work"
    );
    await refusalOf(() => remoteCreate(CREATE));
    expect(record.dropped).toEqual([createdUuid]);
    await expect(watch.settled()).resolves.toBe('settled');
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
  });

  it('ends it when the answer is lost and the row is kept unknown', async () => {
    record.installed = true;
    const watch = watchTheFlight(new Error('the link went'));
    answers['show-environment'] = new Error('socket hang up');
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.message).toBe(CREATE_ANSWER_LOST);
    expect(record.rows.get(createdUuid)?.status).toBe('unknown');
    await expect(watch.settled()).resolves.toBe('settled');
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
    // Phase 117 is untouched: the id stays issued for the rescue.
    expect(issuedRemoteIdHeld(createdUuid)).toBe(true);
  });

  it('ends it when the feed start throws', async () => {
    record.installed = true;
    const watch = watchTheFlight('$4\n');
    answers['list-sessions'] = () =>
      createdUuid === '' ? '' : line({ tmuxId: '$4', gmuxId: createdUuid });
    // The last stamp arms a write failure, so the create's own pass, inside
    // `startMachineFeed`, throws from its manifest write.
    answers['set-option @gmux-project'] = () => {
      record.throwOnSeen = true;
      return '';
    };
    const failed = await remoteCreate(CREATE).then(
      () => null,
      (err: unknown) => err as Error
    );
    expect(failed?.message).toContain('the manifest refused the write');
    await expect(watch.settled()).resolves.toBe('settled');
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
  });

  it('ends it when the machine does not list the session back', async () => {
    const watch = watchTheFlight('$4\n');
    answers['list-sessions'] = '';
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.code).toBe('SPAWN_FAILED');
    expect(payload?.detail).toContain('did not list it back');
    await expect(watch.settled()).resolves.toBe('settled');
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
  });

  it('ends it when a stamp fails and the create still returns', async () => {
    const watch = watchTheFlight('$4\n');
    answers['list-sessions'] = () =>
      createdUuid === '' ? '' : line({ tmuxId: '$4', gmuxId: createdUuid });
    answers['set-option @gmux-agent'] = new Error('the agent stamp was refused');
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(createdUuid);
    await expect(watch.settled()).resolves.toBe('settled');
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
  });

  it('registers no flight for an id a past run issued', async () => {
    record.installed = true;
    plantRow('from-the-last-run', 'unknown');
    answers['list-sessions'] = line({ tmuxId: '$9' });
    answers['show-environment'] = 'GMUX_SESSION_ID=somebody-else\n';
    await pollRemoteMachine(MACHINE);
    // Seeded into the issued set by the first pass of this run...
    expect(issuedRemoteIdHeld('from-the-last-run')).toBe(true);
    // ...and it has no flight, because nothing is running for it.
    expect(remoteCreateInFlight('from-the-last-run')).toBe(false);
    expect(remoteCreateFlightsFor(MACHINE, 0, 1).owns('from-the-last-run')).toBe(false);
    // So the pass counted and probed the unstamped row exactly as Phase 117 does.
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    expect(probed()).toEqual(['$9']);
  });
});

// ---------------------------------------------------------------------------
// The pass
// ---------------------------------------------------------------------------

describe('a pass over a machine where a create is binding a session', () => {
  it('skips the create’s own `$-id`: not counted, not probed, not shown', async () => {
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    answers['list-sessions'] = line({ tmuxId: '$5' });
    await pollRemoteMachine(MACHINE);
    expect(remoteMachineFacts(MACHINE).foreign).toBe(0);
    expect(probed()).toEqual([]);
    expect(remoteSessions()).toEqual([]);
    expect(remoteSessionRow('s1')).toBeNull();
    // Its name is still taken, so a create beside it cannot pick it.
    expect(remoteMachineFacts(MACHINE).names).toBe(1);
  });

  it('CONTROL: with no flight the same row is counted and probed, as at the parent', async () => {
    answers['list-sessions'] = line({ tmuxId: '$5' });
    await pollRemoteMachine(MACHINE);
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    expect(probed()).toEqual(['$5']);
  });

  it('handles the same `$-id` under another generation as today', async () => {
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    generation = 2;
    answers['list-sessions'] = line({ tmuxId: '$5' });
    await pollRemoteMachine(MACHINE);
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    expect(probed()).toEqual(['$5']);
  });

  it('counts and probes a stranger that carries the create’s own NAME', async () => {
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    answers['list-sessions'] = [
      line({ tmuxId: '$5', tmuxName: 'work' }),
      line({ tmuxId: '$6', tmuxName: 'work', name: 'work' })
    ].join('\n');
    answers['show-environment'] = 'GMUX_SESSION_ID=somebody-else\n';
    await pollRemoteMachine(MACHINE);
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    expect(probed()).toEqual(['$6']);
    // Nothing is ever composed against the stranger.
    expect(sent.some((argv) => argv[0] === 'set-option')).toBe(false);
    expect(sent.some((argv) => argv[0] === 'kill-session')).toBe(false);
  });

  it('while a create waits on its answer, counts and probes a never-probed row as the parent does', async () => {
    // First, a pass with no flight settles `$7` as somebody else's.
    answers['list-sessions'] = line({ tmuxId: '$7', tmuxName: 'theirs' });
    answers['show-environment'] = 'GMUX_SESSION_ID=somebody-else\n';
    await pollRemoteMachine(MACHINE);
    expect(probed()).toEqual(['$7']);
    // Then a create is sent and has not been answered.
    beginRemoteCreate('s1', MACHINE);
    answers['list-sessions'] = [
      line({ tmuxId: '$7', tmuxName: 'theirs' }),
      line({ tmuxId: '$8', tmuxName: 'work' })
    ].join('\n');
    await pollRemoteMachine(MACHINE);
    // THE FIX ROUND. The build deferred `$8` here (not counted, not probed)
    // because it might be the create's own session. That is removed: `$8` is
    // counted and probed at once, and `$7` stays memoised.
    expect(remoteMachineFacts(MACHINE).foreign).toBe(2);
    expect(probed()).toEqual(['$7', '$8']);
  });

  it('THE REGRESSION THE FIX ROUND REMOVED: another lost-answer session of this run is rescued while a create waits on its answer', async () => {
    // A create of this run lost its answer and its confirmation: its row is kept
    // `unknown` and its id stays issued for Phase 117's rescue.
    record.installed = true;
    issue('lost');
    plantRow('lost', 'unknown');
    // A second create on the same machine has been sent and not answered.
    issue('s1');
    beginRemoteCreate('s1', MACHINE);
    // The lost session is running over there, unstamped, its pane environment
    // naming its own id; once re-stamped, the next list reports it.
    answers['list-sessions'] = () =>
      sent.some((argv) => argv[0] === 'set-option' && argv[3] === '@gmux-id')
        ? line({ tmuxId: '$8', gmuxId: 'lost' })
        : line({ tmuxId: '$8' });
    answers['show-environment'] = 'GMUX_SESSION_ID=lost\n';
    await pollRemoteMachine(MACHINE);
    // The parent binds it in this very pass; the build deferred it until the
    // OTHER create's answer arrived (up to that create's own timeout).
    expect(probed()).toEqual(['$8']);
    expect(remoteSessionRow('lost')?.tmuxId).toBe('$8');
    expect(issuedRemoteIdHeld('lost')).toBe(false);
    // The waiting create's own row is still neither written over nor dropped.
    expect(issuedRemoteIdHeld('s1')).toBe(true);
  });

  it('a pass holding an unprobed row while a create waits stays rescue-pending, as at the parent', async () => {
    record.installed = true;
    issue('waiting');
    plantRow('waiting', 'unknown');
    beginRemoteCreate('s1', MACHINE);
    answers['list-sessions'] = line({ tmuxId: '$8' });
    await pollRemoteMachine(MACHINE);
    // `$8` is probed (its environment names nothing of ours), and the pass that
    // held it unclaimed wrote nothing over the issued row and dropped nothing.
    expect(probed()).toEqual(['$8']);
    expect(issuedRemoteIdHeld('waiting')).toBe(true);
    expect(record.seen.filter((one) => one.id === 'waiting')).toEqual([]);
  });

  it('CONTROL: a pass with nothing pending drops that id and writes restorable, as at the parent', async () => {
    record.installed = true;
    issue('waiting');
    plantRow('waiting', 'unknown');
    answers['list-sessions'] = '';
    await pollRemoteMachine(MACHINE);
    expect(issuedRemoteIdHeld('waiting')).toBe(false);
    expect(record.rows.get('waiting')?.status).toBe('restorable');
  });

  it('reads the flights after the list answered, so an answer that arrived meanwhile counts', async () => {
    const flight = beginRemoteCreate('s1', MACHINE);
    const list = held();
    answers['list-sessions'] = () => list.promise;
    answers['show-environment'] = 'GMUX_SESSION_ID=somebody-else\n';
    const pass = pollRemoteMachine(MACHINE);
    // The create's answer lands while the list is out.
    flight.answered('$5', 1);
    list.answer([line({ tmuxId: '$5' }), line({ tmuxId: '$6', tmuxName: 'x' })].join('\n'));
    await pass;
    // `$5` is skipped as being bound, and `$6` is a stranger, counted and probed
    // at once.
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    expect(probed()).toEqual(['$6']);
  });

  it('skips the row for a list issued before the create ended and parsed after', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(5_000_000);
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    const list = held();
    answers['list-sessions'] = () => list.promise;
    const pass = pollRemoteMachine(MACHINE);
    vi.setSystemTime(5_000_300);
    flight.end();
    list.answer(line({ tmuxId: '$5' }));
    await pass;
    expect(remoteMachineFacts(MACHINE).foreign).toBe(0);
    expect(probed()).toEqual([]);
  });

  it('LENS 1 X5: judges the flights by when the list was ISSUED, with the clock moved past the end before the parse', async () => {
    // The create's durable row, its `@gmux-id` stamp landed (so its id has left
    // the issued set), and its session read unstamped by a list that was issued
    // before the stamp and answered after the create ended.
    record.installed = true;
    plantRow('s1', 'running');
    answers['show-environment'] = 'GMUX_SESSION_ID=somebody-else\n';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(5_000_000);
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    const list = held();
    answers['list-sessions'] = () => list.promise;
    const pass = pollRemoteMachine(MACHINE);
    vi.setSystemTime(5_000_300);
    flight.end();
    // The parse happens well after the end, so a pass that judged the flights
    // by its parse instant would not see this create at all.
    vi.setSystemTime(5_000_600);
    list.answer(line({ tmuxId: '$5' }));
    await pass;
    expect(remoteMachineFacts(MACHINE).foreign).toBe(0);
    expect(probed()).toEqual([]);
    expect(record.seen.filter((one) => one.id === 's1')).toEqual([]);
    expect(record.rows.get('s1')?.status).toBe('running');
  });

  it('handles the row as the parent does for a list issued before an unanswered create ended and parsed after', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(5_000_000);
    const flight = beginRemoteCreate('s1', MACHINE);
    const list = held();
    answers['list-sessions'] = () => list.promise;
    answers['show-environment'] = 'GMUX_SESSION_ID=somebody-else\n';
    const pass = pollRemoteMachine(MACHINE);
    vi.setSystemTime(5_000_300);
    flight.end();
    list.answer(line({ tmuxId: '$5' }));
    await pass;
    // No answer ever named `$5`, so nothing binds it here: counted and probed.
    // The build deferred it, which is what made a waiting attach's own list,
    // issued in the millisecond such a create ended, defer its own session.
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    expect(probed()).toEqual(['$5']);
  });

  it('treats the row as today for a list issued after the create ended, inside the memory window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(5_000_000);
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    flight.end();
    // One millisecond later: this list saw whatever the create left behind.
    vi.setSystemTime(5_000_001);
    answers['list-sessions'] = line({ tmuxId: '$5' });
    await pollRemoteMachine(MACHINE);
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    expect(probed()).toEqual(['$5']);
  });

  it('CONTROL: a list issued after the memory window treats the row as today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(5_000_000);
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    flight.end();
    vi.setSystemTime(5_000_000 + FLIGHT_MEMORY_MS + 1);
    answers['list-sessions'] = line({ tmuxId: '$5' });
    await pollRemoteMachine(MACHINE);
    expect(remoteMachineFacts(MACHINE).foreign).toBe(1);
    expect(probed()).toEqual(['$5']);
  });
});

// ---------------------------------------------------------------------------
// No pass writes over, or forgets, a create that is running
// ---------------------------------------------------------------------------

describe('no pass writes over or forgets a running create', () => {
  it('never writes restorable over the row of a create that is binding its session', async () => {
    record.installed = true;
    issue('s1');
    plantRow('s1', 'running');
    const flight = beginRemoteCreate('s1', MACHINE);
    flight.answered('$5', 1);
    answers['list-sessions'] = line({ tmuxId: '$5' });
    await pollRemoteMachine(MACHINE);
    expect(record.seen.filter((one) => one.id === 's1')).toEqual([]);
    expect(record.rows.get('s1')?.status).toBe('running');
  });

  it('CONTROL: with no flight and nothing pending, the parent writes restorable over it', async () => {
    record.installed = true;
    plantRow('s1', 'running');
    answers['list-sessions'] = '';
    await pollRemoteMachine(MACHINE);
    expect(record.rows.get('s1')?.status).toBe('restorable');
  });

  it('never drops the issued id of a create that is running', async () => {
    record.installed = true;
    issue('s1');
    // A machine that went quiet mid-create writes `unknown` on every row it owns.
    plantRow('s1', 'unknown');
    beginRemoteCreate('s1', MACHINE).answered('$5', 1);
    answers['list-sessions'] = '';
    // The row is seeded as unconfirmed too, which is what the first pass reads.
    await pollRemoteMachine(MACHINE);
    expect(issuedRemoteIdHeld('s1')).toBe(true);
    expect(record.rows.get('s1')?.status).toBe('unknown');
  });

  it('CONTROL: with no flight that same id is dropped, as at the parent', async () => {
    record.installed = true;
    issue('s1');
    plantRow('s1', 'unknown');
    answers['list-sessions'] = '';
    await pollRemoteMachine(MACHINE);
    expect(issuedRemoteIdHeld('s1')).toBe(false);
  });
});

describe('the status a running create reads', () => {
  function projected(id: string): string {
    return projectRemoteRecord({
      id,
      name: 'work',
      tmuxName: 'work',
      projectPath: '/srv/repo',
      cwd: '/srv/repo',
      agent: 'shell',
      status: 'running',
      createdAt: 1_700_000_000_000,
      machineId: MACHINE
    }).status;
  }

  it('reads unknown while its flight is live, and restorable once it ends unlisted', async () => {
    machineKnown = true;
    answers['list-sessions'] = '';
    await pollRemoteMachine(MACHINE);
    const flight = beginRemoteCreate('s1', MACHINE);
    expect(issuedRemoteIdHeld('s1')).toBe(false);
    expect(projected('s1')).toBe('unknown');
    flight.end();
    expect(projected('s1')).toBe('restorable');
  });
});

// ---------------------------------------------------------------------------
// The window itself, driven through a real create
// ---------------------------------------------------------------------------

describe('a list that lands inside the create’s own window', () => {
  it('before the answer: the new session is counted and rescued as at the parent, and the create returns it', async () => {
    let inside: { foreign: number; probes: string[]; bound: string | null } | null =
      null;
    // What the pass had counted at the moment the rescue probed the row.
    let countedAtProbe: number | null = null;
    const stampedLine = () =>
      sent.some((argv) => argv[0] === 'set-option' && argv[3] === '@gmux-id')
        ? line({ tmuxId: '$4', gmuxId: createdUuid })
        : line({ tmuxId: '$4' });
    answers['show-environment'] = () => {
      countedAtProbe ??= remoteMachineFacts(MACHINE).foreign;
      return `GMUX_SESSION_ID=${createdUuid}\n`;
    };
    answers['new-session'] = async () => {
      // The session now exists over there with no stamp, and a list is parsed
      // before this create has its answer, so nothing knows its `$-id` yet.
      answers['list-sessions'] = stampedLine;
      await pollRemoteMachine(MACHINE);
      inside = {
        foreign: remoteMachineFacts(MACHINE).foreign,
        probes: probed(),
        bound: remoteSessionRow(createdUuid)?.tmuxId ?? null
      };
      return '$4\n';
    };
    answers['list-sessions'] = '';
    const session = await remoteCreate(CREATE);
    // THE FIX ROUND. The build deferred this row. The parent counts it, and
    // Phase 117's rescue binds it by the id its pane environment carries, which
    // this create issued before `new-session` was sent. The rescue runs inside
    // that pass and lists the machine again once it has re-bound a row, so by
    // the time the pass returns the session is bound and no longer counted. The
    // create then stamps and lists it as always, and returns the same session.
    expect(countedAtProbe).toBe(1);
    expect(inside).toEqual({ foreign: 0, probes: ['$4'], bound: '$4' });
    expect(session.id).toBe(createdUuid);
    expect(remoteSessionRow(createdUuid)?.tmuxId).toBe('$4');
  });

  it('records the answered `$-id` and the generation it was answered in, before the first stamp', async () => {
    generation = 3;
    let atStamp: { now: boolean; other: boolean } | null = null;
    answers['new-session'] = '$4\n';
    answers['list-sessions'] = () =>
      createdUuid === '' ? '' : line({ tmuxId: '$4', gmuxId: createdUuid });
    answers['set-option @gmux-id'] = () => {
      atStamp = {
        now: remoteCreateFlightsFor(MACHINE, 0, 3).beingBound.has('$4'),
        other: remoteCreateFlightsFor(MACHINE, 0, 1).beingBound.has('$4')
      };
      return '';
    };
    await remoteCreate(CREATE);
    expect(atStamp).toEqual({ now: true, other: false });
  });

  it('between the answer and the stamp: the new session is skipped, and the create binds it', async () => {
    let inside: { foreign: number; probes: string[]; rescued: boolean } | null =
      null;
    answers['new-session'] = '$4\n';
    let stamped = false;
    answers['list-sessions'] = () =>
      createdUuid === ''
        ? ''
        : stamped
          ? line({ tmuxId: '$4', gmuxId: createdUuid })
          : line({ tmuxId: '$4' });
    answers['set-option @gmux-id'] = async () => {
      // The list the live connection starts the moment the machine reports the
      // new session, landing before the identity stamp.
      await pollRemoteMachine(MACHINE);
      inside = {
        foreign: remoteMachineFacts(MACHINE).foreign,
        probes: probed(),
        rescued: remoteSessionRow(createdUuid) !== null
      };
      stamped = true;
      return '';
    };
    const session = await remoteCreate(CREATE);
    // At the parent this pass read foreign 1 and probed `$4` while the create
    // was stamping it.
    expect(inside).toEqual({ foreign: 0, probes: [], rescued: false });
    expect(session.id).toBe(createdUuid);
    expect(probed()).toEqual([]);
  });

  it('a create whose `@gmux-id` stamp failed is rescued by its own list and returns, as at the parent', async () => {
    answers['new-session'] = '$4\n';
    let stamped = false;
    answers['list-sessions'] = () =>
      createdUuid === ''
        ? ''
        : stamped
          ? line({ tmuxId: '$4', gmuxId: createdUuid })
          : line({ tmuxId: '$4' });
    let idStamps = 0;
    answers['set-option @gmux-id'] = () => {
      idStamps += 1;
      // The create's own stamp fails; the rescue's later one lands.
      if (idStamps === 1) return Promise.reject(new Error('the stamp was lost'));
      stamped = true;
      return '';
    };
    answers['show-environment'] = () => `GMUX_SESSION_ID=${createdUuid}\n`;
    const session = await remoteCreate(CREATE);
    expect(session.id).toBe(createdUuid);
    expect(probed()).toEqual(['$4']);
    expect(issuedRemoteIdHeld(createdUuid)).toBe(false);
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
  });

  it('a create whose stamp failed and whose own list failed is rescued by the first pass after its flight ends', async () => {
    answers['new-session'] = '$4\n';
    let stamped = false;
    let listFails = false;
    answers['list-sessions'] = () => {
      if (listFails) return Promise.reject(new Error('the list timed out'));
      if (createdUuid === '') return '';
      return stamped
        ? line({ tmuxId: '$4', gmuxId: createdUuid })
        : line({ tmuxId: '$4' });
    };
    let idStamps = 0;
    answers['set-option @gmux-id'] = () => {
      idStamps += 1;
      if (idStamps === 1) {
        listFails = true;
        return Promise.reject(new Error('the link hiccuped'));
      }
      stamped = true;
      return '';
    };
    answers['show-environment'] = () => `GMUX_SESSION_ID=${createdUuid}\n`;
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.code).toBe('SPAWN_FAILED');
    expect(remoteCreateInFlight(createdUuid)).toBe(false);
    expect(issuedRemoteIdHeld(createdUuid)).toBe(true);
    listFails = false;
    await pollRemoteMachine(MACHINE);
    expect(probed()).toEqual(['$4']);
    expect(remoteSessionRow(createdUuid)?.tmuxId).toBe('$4');
  });
});

// ---------------------------------------------------------------------------
// A pane already waiting when its create loses its answer and its confirmation
// ---------------------------------------------------------------------------

describe('a pane already waiting when its create loses its answer AND its confirmation', () => {
  it('LENS 1, THE TIE: the attach’s own list, issued in the millisecond the create ended, binds the running session', async () => {
    const { awaitFarBinding, defaultFarAttachDeps, REMOTE_ATTACH_BIND_WAIT_MS } =
      await import('../../sessions/far-attach');
    record.installed = true;
    machineKnown = true;
    // The clock is frozen, so the create's end and the attach's own list share
    // one millisecond, which is the tie the attack verifier measured: the build
    // deferred this very session there and answered Try again in 9 of 10.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(7_000_000);
    let waiting: ReturnType<typeof awaitFarBinding> | null = null;
    answers['new-session'] = () => {
      // The pane mounted while the create ran, and its attach is waiting on it.
      waiting = awaitFarBinding(defaultFarAttachDeps(), {
        sessionId: createdUuid,
        machineId: MACHINE,
        budgetMs: REMOTE_ATTACH_BIND_WAIT_MS,
        live: () => true,
        signal: new AbortController().signal
      });
      // The session was made over there and the answer never came back.
      return Promise.reject(new Error('the link went'));
    };
    // The confirmation reads by exact NAME and is lost too (Phase 117 keeps the
    // row `unknown`); the rescue reads by `$-id` and is answered.
    answers['show-environment'] = (args) =>
      (args[2] ?? '').startsWith('=')
        ? Promise.reject(new Error('socket hang up'))
        : `GMUX_SESSION_ID=${createdUuid}\n`;
    answers['list-sessions'] = () =>
      createdUuid === ''
        ? ''
        : sent.some((argv) => argv[0] === 'set-option' && argv[3] === '@gmux-id')
          ? line({ tmuxId: '$4', gmuxId: createdUuid })
          : line({ tmuxId: '$4' });
    const payload = await refusalOf(() => remoteCreate(CREATE));
    expect(payload?.message).toBe(CREATE_ANSWER_LOST);
    expect(waiting).not.toBeNull();
    const verdict = await (waiting as unknown as ReturnType<typeof awaitFarBinding>);
    expect(verdict.kind).toBe('row');
    expect(verdict.kind === 'row' ? verdict.row.tmuxId : null).toBe('$4');
    expect(verdict.kind === 'row' ? verdict.row.id : null).toBe(createdUuid);
    // Bound by the rescue, by `$-id`, exactly once. The one read by exact NAME
    // is Phase 117's confirmation, which was lost.
    expect(probed().filter((target) => target.startsWith('$'))).toEqual(['$4']);
    expect(probed().filter((target) => !target.startsWith('$'))).toEqual(['=work']);
    expect(issuedRemoteIdHeld(createdUuid)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Whether a list issued at or after an instant has completed
// ---------------------------------------------------------------------------

describe('remoteListCompletedSince', () => {
  it('is false for a machine nobody has listed', () => {
    expect(remoteListCompletedSince(MACHINE, 0)).toBe(false);
  });

  it('answers by the instant the completed list was issued', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(9_000_000);
    const list = held();
    answers['list-sessions'] = () => list.promise;
    const pass = pollRemoteMachine(MACHINE);
    // The list is answered later; what counts is when it was ISSUED.
    vi.setSystemTime(9_000_400);
    list.answer('');
    await pass;
    expect(remoteListCompletedSince(MACHINE, 8_999_999)).toBe(true);
    expect(remoteListCompletedSince(MACHINE, 9_000_000)).toBe(true);
    expect(remoteListCompletedSince(MACHINE, 9_000_001)).toBe(false);
  });

  it('is not moved by a list that failed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(9_000_000);
    answers['list-sessions'] = '';
    await pollRemoteMachine(MACHINE);
    vi.setSystemTime(9_000_500);
    answers['list-sessions'] = new Error('the list timed out');
    await pollRemoteMachine(MACHINE);
    expect(remoteListCompletedSince(MACHINE, 9_000_000)).toBe(true);
    expect(remoteListCompletedSince(MACHINE, 9_000_500)).toBe(false);
  });

  it('is false while every list of that machine has failed', async () => {
    answers['list-sessions'] = new Error('the list timed out');
    await pollRemoteMachine(MACHINE);
    expect(remoteListCompletedSince(MACHINE, 0)).toBe(false);
  });
});

describe('the sentence an attach says when the machine has not answered', () => {
  it('is the pinned text and names no tmux word', () => {
    expect(ATTACH_NOT_HEARD).toBe(
      'That machine has not told Tortie about this session yet. It may still be starting there.'
    );
    for (const word of ['pane', 'window', 'prefix', 'tmux', 'server']) {
      expect(ATTACH_NOT_HEARD.toLowerCase()).not.toContain(word);
    }
  });
});
