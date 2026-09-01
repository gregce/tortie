/**
 * `npm run conformance:remoteclose`. A closed remote tab stays closed (Phase
 * 187).
 *
 * ## What it is for, in his words
 *
 * On 2026-08-31 he said that closing a remote machine tab tends to bring it back
 * AT LEAST ONCE. The reproduce round closed 90 remote sessions over a loopback
 * machine of its own and none of them came back, then found the shape that
 * returns every time: main held the same id in BOTH of a machine's per machine
 * maps, and one Remove cleared one of them.
 *
 * ## The two maps, and the property this file counts
 *
 * `remote-sessions.ts` keeps `rows`, which is what the last completed list
 * reported, and `gone`, which is what a completed list STOPPED reporting. No
 * session can honestly be in both. Until Phase 187 nothing ever took an id out
 * of `gone`, and a pass replaces `rows` wholesale, so a session that went away
 * and came back under the same `@gmux-id` sat in both for the rest of the run.
 * Tortie's own remote restore recreates a session with exactly that id.
 *
 * Two things went wrong while a row was in both, and this file drives each of
 * them N times rather than once, because the defect he reported is intermittent
 * and one clean close is not evidence:
 *
 *   the row drew TWICE, once live and once proven absent
 *   a Remove cleared ONE map, so the tab came back and a second Remove was needed
 *
 * ## What it costs and what it touches
 *
 * Nothing spawns. The exec plane is a function that answers with the text a
 * machine would have printed, no ssh runs, no tmux server is started, no
 * Electron is launched, no manifest is opened and no file under the person's
 * home is read. It is the cheap gate beside `npm run probe:p187`, which is the
 * same drive over a real loopback machine and takes minutes.
 *
 * IT MUST BE ABLE TO FAIL. Revert either half of the Phase 187 fix and every
 * arm below goes red: restore the `||` in `forgetRemoteRow` and arm A reports 25
 * returns out of 25, and drop the `gone` delete from the pass and arm D reports
 * 25 rows drawn twice.
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

/** How many closes each arm drives. The reproduce round's own cohort size. */
const N = 25;

const MACHINE = 'popos';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: MACHINE,
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p187-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** What the machine answers for each verb. A list is a function so it can flip. */
let answers: Record<string, string | (() => string)> = {};

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation: 1, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    const answer = answers[args[0] ?? ''];
    if (typeof answer === 'function') return Promise.resolve(answer());
    return Promise.resolve(answer ?? '');
  }
}));

/** The control client, replaced so no connection is ever opened. */
class FakeControlClient extends EventEmitter {
  connected = false;
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
  forgetRemoteRow,
  pollRemoteMachine,
  remoteKill,
  remoteMachineFacts,
  remoteRowsInBothMaps,
  remoteSessionRow,
  remoteSessions,
  resetRemoteSessionsForTests
} = await import('../remote-sessions');

const { resetControlPlanesForTests } = await import('../control-plane');
const { resetRescueForTests } = await import('../pane-env-rescue');

/** One list line in the shipped format, quoted the way tmux's `#{q:...}` does. */
function line(gmuxId: string, activity = 1_700_000_100): string {
  return [
    '$1',
    '1700000000',
    String(activity),
    '0',
    gmuxId,
    'shell',
    'work',
    '/srv/repo',
    '/srv/repo',
    'work'
  ]
    .map((value) => value.replace(/([ \\"'$;])/g, '\\$1'))
    .join(' ');
}

/** The machine holds this session, or holds nothing at all. */
function machineHolds(gmuxId: string | null): void {
  answers['list-sessions'] = gmuxId === null ? '' : line(gmuxId);
}

/** How many rows main's own list draws for one id. */
function drawnRows(sessionId: string): number {
  return remoteSessions().filter((one) => one.id === sessionId).length;
}

beforeEach(() => {
  answers = {};
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
});

afterEach(() => {
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
});

/**
 * The row's whole life up to the moment of the close, being listed, lost, and
 * listed again under the same id. That last step is what Tortie's own remote
 * restore does, and it is what used to put the id in both maps.
 */
async function restoredUnderTheSameId(sessionId: string): Promise<void> {
  machineHolds(sessionId);
  await pollRemoteMachine(MACHINE);
  machineHolds(null);
  await pollRemoteMachine(MACHINE);
  machineHolds(sessionId);
  await pollRemoteMachine(MACHINE);
}

describe(`a closed remote tab stays closed, over ${N} closes`, () => {
  it('A. a Remove on a session that was restored under the same id clears it', async () => {
    const returned: string[] = [];
    for (let trial = 0; trial < N; trial += 1) {
      const id = `ours-a-${trial}`;
      resetRemoteSessionsForTests();
      await restoredUnderTheSameId(id);
      // The person's Remove, which is what `../../sessions/core.ts` calls for
      // every remote row. Nothing is sent to any machine.
      expect(forgetRemoteRow(id)).toBe(true);
      if (remoteSessionRow(id) !== null || drawnRows(id) > 0) returned.push(id);
    }
    expect(returned).toEqual([]);
  });

  it('B. a Remove after the x on a live row clears it', async () => {
    const returned: string[] = [];
    for (let trial = 0; trial < N; trial += 1) {
      const id = `ours-b-${trial}`;
      resetRemoteSessionsForTests();
      machineHolds(id);
      await pollRemoteMachine(MACHINE);
      // The x on a live row is End, and the machine stops holding it.
      machineHolds(null);
      await remoteKill(id);
      forgetRemoteRow(id);
      if (remoteSessionRow(id) !== null || drawnRows(id) > 0) returned.push(id);
    }
    expect(returned).toEqual([]);
  });

  it('C. a Remove on a row a completed list stopped reporting clears it', async () => {
    const returned: string[] = [];
    for (let trial = 0; trial < N; trial += 1) {
      const id = `ours-c-${trial}`;
      resetRemoteSessionsForTests();
      machineHolds(id);
      await pollRemoteMachine(MACHINE);
      machineHolds(null);
      await pollRemoteMachine(MACHINE);
      forgetRemoteRow(id);
      if (remoteSessionRow(id) !== null || drawnRows(id) > 0) returned.push(id);
    }
    expect(returned).toEqual([]);
  });

  it('D. a session that keeps going away and coming back is never in both maps', async () => {
    const id = 'ours-d';
    const drawnTwice: number[] = [];
    const inBoth: number[] = [];
    machineHolds(id);
    await pollRemoteMachine(MACHINE);
    for (let cycle = 0; cycle < N; cycle += 1) {
      machineHolds(null);
      await pollRemoteMachine(MACHINE);
      machineHolds(id);
      await pollRemoteMachine(MACHINE);
      if (remoteRowsInBothMaps().length > 0) inBoth.push(cycle);
      if (drawnRows(id) !== 1) drawnTwice.push(cycle);
    }
    expect(inBoth).toEqual([]);
    expect(drawnTwice).toEqual([]);
    // The row a list is holding again reads live, not the proven absence the
    // pass before it wrote.
    expect(remoteSessions().find((one) => one.id === id)?.status).not.toBe(
      'restorable'
    );
    expect(remoteMachineFacts(MACHINE).gone).toBe(0);
  });

  it('E. one Remove is enough, and a second one has nothing left to do', async () => {
    const secondFound: string[] = [];
    for (let trial = 0; trial < N; trial += 1) {
      const id = `ours-e-${trial}`;
      resetRemoteSessionsForTests();
      await restoredUnderTheSameId(id);
      forgetRemoteRow(id);
      // FALSE is the whole point. Until Phase 187 the second Remove was the one
      // that worked, which is what "it comes back at least once" was.
      if (forgetRemoteRow(id)) secondFound.push(id);
    }
    expect(secondFound).toEqual([]);
  });

  it('F. a Remove that names no row still answers false', () => {
    expect(forgetRemoteRow('nothing-holds-this')).toBe(false);
  });
});
