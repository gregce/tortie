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
 * ## What the SECOND fix round added, and why the first one was not the whole
 *
 * The first round fixed the shape that returns every time and left the shape the
 * entry named as candidate 1 open. A list is issued at T, the person presses the
 * x at T+5 ms and Remove at T+10 ms, and the list answers at T+60 ms holding the
 * membership the machine had BEFORE the close. The pass wrote that answer over
 * `rows` wholesale with nothing comparing its age against the moment of the
 * Remove, so the row came back and a second Remove was needed. Measured over 200
 * lives it came back 200 times at the first round's HEAD and 200 times at its
 * parent, so that round neither caused it nor cured it. Arms G to J drive it.
 *
 * IT MUST BE ABLE TO FAIL. Revert any part of the Phase 187 fix and an arm below
 * goes red: restore the `||` in `forgetRemoteRow` and arms A and K report 25
 * returns out of 25, drop the `gone` delete from the pass and arm D reports 25
 * rows drawn twice, and drop the removal instant from the pass and arm G reports
 * 25 returns out of 25.
 *
 * Arm K is why `overlapRemoteRowForTests` exists. With the pass keeping the two
 * maps disjoint there is no route left through the feed that puts an id in both,
 * so the belt in `forgetRemoteRow` could be deleted with every other arm still
 * green. That seam puts an id in both by the same route the ghost arm of
 * `probe:p187` used on the real app, so the belt can go red too.
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

/**
 * One list deliberately HELD OPEN, so a Remove can happen while it is in flight.
 * That is the honest product timeline arms G to J drive, and it is the only way
 * a list issued before a close can answer after it.
 */
let held: { resolve: (text: string) => void } | null = null;

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    if (args[0] === 'list-sessions' && held !== null) {
      const gate = held;
      held = null;
      return new Promise<string>((resolve) => {
        gate.resolve = resolve;
      });
    }
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
  overlapRemoteRowForTests,
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
  held = null;
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

/**
 * Issue a list and hold its answer open, so the caller can act on the row while
 * the machine's answer is still on the wire.
 */
async function listInFlight(): Promise<{
  readonly landed: Promise<void>;
  readonly answer: (text: string) => void;
}> {
  const gate: { resolve: (text: string) => void } = {
    resolve: () => undefined
  };
  held = gate;
  const landed = pollRemoteMachine(MACHINE);
  // One turn, so the pass has stamped its `snapshotAt` and issued the list.
  await new Promise((resolve) => setImmediate(resolve));
  return { landed, answer: (text: string) => { gate.resolve(text); } };
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

  it('G. a list in flight over the close does not put the row back', async () => {
    const cameBack: string[] = [];
    const stillThere: string[] = [];
    const secondRemoveFound: string[] = [];
    for (let trial = 0; trial < N; trial += 1) {
      const id = `ours-g-${trial}`;
      resetRemoteSessionsForTests();
      machineHolds(id);
      await pollRemoteMachine(MACHINE);
      // The status list goes out at T, holding the session.
      const flight = await listInFlight();
      // The x at T+5 ms and the person's Remove at T+10 ms.
      machineHolds(null);
      expect(forgetRemoteRow(id)).toBe(true);
      expect(drawnRows(id)).toBe(0);
      // The machine answers at T+60 ms with what it saw BEFORE the close.
      flight.answer(line(id));
      await flight.landed;
      if (drawnRows(id) > 0 || remoteSessionRow(id) !== null) cameBack.push(id);
      for (let pass = 0; pass < 10; pass += 1) await pollRemoteMachine(MACHINE);
      if (drawnRows(id) > 0 || remoteSessionRow(id) !== null) stillThere.push(id);
      if (forgetRemoteRow(id)) secondRemoveFound.push(id);
    }
    expect(cameBack).toEqual([]);
    expect(stillThere).toEqual([]);
    expect(secondRemoveFound).toEqual([]);
  });

  it('H. a list issued AFTER the Remove is a fresh answer and is trusted', async () => {
    // Nothing here makes a session on that machine permanently invisible. A
    // Remove is not a kill, and the far side may still be holding the session.
    const id = 'ours-h';
    machineHolds(id);
    await pollRemoteMachine(MACHINE);
    forgetRemoteRow(id);
    expect(drawnRows(id)).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 3));
    await pollRemoteMachine(MACHINE);
    expect(drawnRows(id)).toBe(1);
  });

  it('I. the removal instant is forgotten, so nothing grows without bound', async () => {
    const id = 'ours-i';
    machineHolds(id);
    await pollRemoteMachine(MACHINE);
    const realNow = Date.now;
    let offset = 0;
    Date.now = (): number => realNow() + offset;
    try {
      forgetRemoteRow(id);
      expect(drawnRows(id)).toBe(0);
      // Well past REMOVAL_MEMORY_MS, so the instant answers nothing any more and
      // a list holding the session is believed again.
      offset = 60_000;
      await pollRemoteMachine(MACHINE);
      expect(drawnRows(id)).toBe(1);
    } finally {
      Date.now = realNow;
    }
  });

  it('J. two rows removed in the same tick both stay removed', async () => {
    answers['list-sessions'] = () => `${line('ours-j1')}\n${line('ours-j2')}`;
    await pollRemoteMachine(MACHINE);
    expect(drawnRows('ours-j1') + drawnRows('ours-j2')).toBe(2);
    const flight = await listInFlight();
    forgetRemoteRow('ours-j1');
    forgetRemoteRow('ours-j2');
    flight.answer(`${line('ours-j1')}\n${line('ours-j2')}`);
    await flight.landed;
    expect([drawnRows('ours-j1'), drawnRows('ours-j2')]).toEqual([0, 0]);
    expect(remoteMachineFacts(MACHINE).rows).toBe(0);
    expect(remoteMachineFacts(MACHINE).gone).toBe(0);
  });

  it('K. a Remove clears an id held in BOTH maps, whatever put it there', async () => {
    // THE BELT, driven by the one route that is not a pass. Restore the `||` in
    // `forgetRemoteRow` and this arm reports 25 returns out of 25.
    const returned: string[] = [];
    for (let trial = 0; trial < N; trial += 1) {
      const id = `ours-k-${trial}`;
      resetRemoteSessionsForTests();
      machineHolds(id);
      await pollRemoteMachine(MACHINE);
      expect(overlapRemoteRowForTests(MACHINE, id)).toBe(true);
      expect(remoteRowsInBothMaps()).toEqual([`${MACHINE}/${id}`]);
      expect(forgetRemoteRow(id)).toBe(true);
      if (remoteSessionRow(id) !== null || drawnRows(id) > 0) returned.push(id);
      if (remoteRowsInBothMaps().length > 0) returned.push(`${id}/both`);
    }
    expect(returned).toEqual([]);
  });

  it('F. a Remove that names no row still answers false', () => {
    expect(forgetRemoteRow('nothing-holds-this')).toBe(false);
  });
});
