/**
 * Phase 320.1, the one scroll runner a machine's control connection hands out
 * (build/p3201/SPEC.md D2, D6; research 130 §4).
 *
 * NOTHING HERE OPENS A CONNECTION. The exec plane answers the version read from
 * a variable and the control client is a fake whose events this file emits, in
 * the shape `control-plane.test.ts` settled on. What is pinned:
 *
 *  - `none` for a machine whose tmux the control gate refused at the last
 *    attempt, and for one that missed the greeting; `allowControlPlaneAgain`
 *    and a fresh attempt take it back to `waiting`;
 *  - `waiting` for a machine never opened, opened but not greeted, and dropped;
 *  - `live` on a connected client: ordered, named for its machine, writing the
 *    quoted line through that client and nothing else;
 *  - a reconnect, or a new client, between the runner's making and its call
 *    refuses with ZERO writes;
 *  - the generation moves BEFORE the feed hears `connected`;
 *  - the module's exports are the parent's plus `remoteScrollRunner` alone, and
 *    it names no `send-keys`;
 *  - the ruled round (GONE): a keystroke's ask for one more connection to a
 *    machine that missed its greeting goes past the Phase 83 set once, through
 *    the precheck and the gate, waits like any other client, takes the machine
 *    off the set when it greets, and leaves it `none` with nothing retried when
 *    it misses too.
 */

import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'studio',
  sshBin: '/usr/bin/ssh',
  host: 'studio.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p3201-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' },
  acceptedTmuxVersion: null
};

let versionAnswer = 'tmux 3.6a\n';

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation: 1, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', () => ({
  execOn: () => Promise.resolve(versionAnswer)
}));

/** The fake control client. `sendCommand` records and answers from `answer`. */
class FakeClient extends EventEmitter {
  static made: FakeClient[] = [];
  connected = false;
  sent: string[] = [];
  answer: string[] = ['1 7 9000 40 0 0 120 '];
  constructor(readonly transport: { machineId: string }) {
    super();
    FakeClient.made.push(this);
  }
  start(): Promise<void> {
    return Promise.resolve();
  }
  stop(): void {
    this.connected = false;
  }
  sendCommand(line: string): Promise<string[]> {
    this.sent.push(line);
    return Promise.resolve(this.answer);
  }
}

vi.mock('../../tmux/control-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tmux/control-client')>()),
  TmuxControlClient: FakeClient
}));

const controlPlane = await import('../control-plane');
const {
  allowControlPlaneAgain,
  closeControlPlane,
  openControlPlane,
  remoteScrollRunner,
  resetControlPlanesForTests,
  setControlPlaneSink
} = controlPlane;

const { REMOTE_STATE_FORMAT } = await import('../../tmux/scroll');

const READ = ['display-message', '-p', '-t', '$4', '-F', REMOTE_STATE_FORMAT];

function onlyClient(): FakeClient {
  const client = FakeClient.made[0];
  if (client === undefined) throw new Error('no control client was made');
  return client;
}

/** Open the machine and bring its client to connected. */
async function connected(): Promise<FakeClient> {
  expect(await openControlPlane('studio')).toBe(true);
  const client = onlyClient();
  client.connected = true;
  client.emit('connected');
  return client;
}

beforeEach(() => {
  versionAnswer = 'tmux 3.6a\n';
  FakeClient.made = [];
  resetControlPlanesForTests();
});

afterEach(() => {
  resetControlPlanesForTests();
});

describe('none: no connection this run', () => {
  it('for a tmux the control gate refused, until a fresh attempt or a prepare', async () => {
    // PHASE 342 measured 3.2a, so the version nobody measured is 3.0a now.
    versionAnswer = 'tmux 3.0a\n';
    expect(await openControlPlane('studio')).toBe(false);
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'none' });
    // Prepared again: the refusal is forgotten and the machine waits.
    allowControlPlaneAgain('studio');
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'waiting' });
    // Refused again, then a fresh attempt on a measured tmux.
    expect(await openControlPlane('studio')).toBe(false);
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'none' });
    versionAnswer = 'tmux 3.7b\n';
    const opening = openControlPlane('studio');
    // Cleared at the TOP of the attempt, before the version is read.
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'waiting' });
    expect(await opening).toBe(true);
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'waiting' });
  });

  it('for a machine that missed the greeting', async () => {
    const client = await connected();
    expect(remoteScrollRunner('studio').kind).toBe('live');
    setControlPlaneSink({
      connected: () => undefined,
      sessionsChanged: () => undefined,
      sessionRenamed: () => undefined,
      linkFailed: () => undefined,
      lost: () => undefined
    });
    client.emit('greeting-timeout');
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'none' });
  });

  it('is forgotten by the test reset', async () => {
    versionAnswer = 'tmux 3.0a\n';
    await openControlPlane('studio');
    expect(remoteScrollRunner('studio').kind).toBe('none');
    resetControlPlanesForTests();
    expect(remoteScrollRunner('studio').kind).toBe('waiting');
  });
});

describe('waiting: no connected client right now', () => {
  it('never opened, opened but not greeted, and dropped', async () => {
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'waiting' });
    await openControlPlane('studio');
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'waiting' });
    const client = onlyClient();
    client.connected = true;
    client.emit('connected');
    expect(remoteScrollRunner('studio').kind).toBe('live');
    client.connected = false;
    client.emit('disconnected', true);
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'waiting' });
  });
});

describe('live', () => {
  it('is ordered, names its machine, and writes the quoted line through that client', async () => {
    const client = await connected();
    const carriage = remoteScrollRunner('studio');
    if (carriage.kind !== 'live') throw new Error(`expected live, read ${carriage.kind}`);
    expect(carriage.run.ordered).toBe(true);
    expect(carriage.run.server).toBe('machine:studio');
    expect(carriage.generation).toBe(1);
    expect(await carriage.run(READ)).toBe('1 7 9000 40 0 0 120 ');
    expect(client.sent).toEqual([`display-message -p -t $4 -F '${REMOTE_STATE_FORMAT}'`]);
  });

  it('refuses a hostile argv with no write', async () => {
    const client = await connected();
    const carriage = remoteScrollRunner('studio');
    if (carriage.kind !== 'live') throw new Error('expected live');
    const refused = await carriage.run(['send-keys', '-t', '$4', '-X', 'copy-pipe-and-cancel', 'touch x']).catch(
      (err: unknown) => err as { payload?: { code?: string } }
    );
    expect(refused).toMatchObject({ payload: { code: 'INVALID_INPUT' } });
    expect(client.sent).toEqual([]);
  });

  it('refuses with ZERO writes when the connection reconnected after it was made', async () => {
    const client = await connected();
    const carriage = remoteScrollRunner('studio');
    if (carriage.kind !== 'live') throw new Error('expected live');
    client.connected = false;
    client.emit('disconnected', true);
    client.connected = true;
    client.emit('connected');
    const refused = await carriage.run(READ).catch((err: unknown) => err as { payload?: { code?: string } });
    expect(refused).toMatchObject({ payload: { code: 'TMUX_UNREACHABLE' } });
    expect(client.sent).toEqual([]);
    // A runner made now is on the new connection and writes.
    const fresh = remoteScrollRunner('studio');
    if (fresh.kind !== 'live') throw new Error('expected live');
    expect(fresh.generation).toBe(2);
    await fresh.run(READ);
    expect(client.sent).toHaveLength(1);
  });

  it('refuses with ZERO writes when the machine has a different client now', async () => {
    const first = await connected();
    const carriage = remoteScrollRunner('studio');
    if (carriage.kind !== 'live') throw new Error('expected live');
    closeControlPlane('studio');
    // The first client object still says connected and the generation has not
    // moved, because the machine's new client has not greeted yet. Only the
    // identity of the client tells the runner it is no longer the machine's.
    first.connected = true;
    expect(await openControlPlane('studio')).toBe(true);
    const second = FakeClient.made[1];
    if (second === undefined) throw new Error('no second client');
    const refused = await carriage.run(READ).catch((err: unknown) => err as { payload?: { code?: string } });
    expect(refused).toMatchObject({ payload: { code: 'TMUX_UNREACHABLE' } });
    expect(first.sent).toEqual([]);
    expect(second.sent).toEqual([]);
    // Once the new client greets, the old runner is refused by the generation too.
    second.connected = true;
    second.emit('connected');
    await carriage.run(READ).catch(() => undefined);
    expect(first.sent).toEqual([]);
    expect(second.sent).toEqual([]);
  });

  it('refuses with ZERO writes while the same client is between connections', async () => {
    const client = await connected();
    const carriage = remoteScrollRunner('studio');
    if (carriage.kind !== 'live') throw new Error('expected live');
    client.connected = false;
    const refused = await carriage.run(READ).catch((err: unknown) => err as { payload?: { code?: string } });
    expect(refused).toMatchObject({ payload: { code: 'TMUX_UNREACHABLE' } });
    expect(client.sent).toEqual([]);
  });
});

describe('the generation moves before the feed hears connected', () => {
  it('a runner made on the old connection is already refused inside the sink', async () => {
    await openControlPlane('studio');
    const client = onlyClient();
    client.connected = true;
    client.emit('connected');
    const old = remoteScrollRunner('studio');
    if (old.kind !== 'live') throw new Error('expected live');
    const inSink: { oldRefused: boolean; freshGeneration: number | null }[] = [];
    const pending: Promise<void>[] = [];
    setControlPlaneSink({
      connected: () => {
        const fresh = remoteScrollRunner('studio');
        pending.push(
          old.run(READ).then(
            () => {
              inSink.push({ oldRefused: false, freshGeneration: fresh.kind === 'live' ? fresh.generation : null });
            },
            () => {
              inSink.push({ oldRefused: true, freshGeneration: fresh.kind === 'live' ? fresh.generation : null });
            }
          )
        );
      },
      sessionsChanged: () => undefined,
      sessionRenamed: () => undefined,
      linkFailed: () => undefined,
      lost: () => undefined
    });
    client.connected = false;
    client.emit('disconnected', true);
    client.connected = true;
    client.emit('connected');
    await Promise.all(pending);
    expect(inSink).toEqual([{ oldRefused: true, freshGeneration: 2 }]);
    expect(client.sent).toEqual([]);
  });
});

describe('a keystroke asks a machine that missed its greeting once more (the ruled round, GONE)', () => {
  // The reverifier's GONE row: a pane Tortie scrolled back, then the machine's
  // reconnect missed Phase 83's greeting deadline, and the pane stayed in copy
  // mode for the rest of the run with every later key lost. A key over such a
  // pane asks for ONE more connection, through openControlPlane's own steps.
  const QUIET_SINK = {
    connected: (): void => undefined,
    sessionsChanged: (): void => undefined,
    sessionRenamed: (): void => undefined,
    linkFailed: (): void => undefined,
    lost: (): void => undefined
  };

  async function missed(): Promise<void> {
    const client = await connected();
    setControlPlaneSink(QUIET_SINK);
    client.emit('greeting-timeout');
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'none' });
    expect(controlPlane.missedGreetingThisRun('studio')).toBe(true);
  }

  it('a plain open is still refused; a keystroke\'s ask makes one client, past the set, and leaves the set as it is', async () => {
    await missed();
    const made = FakeClient.made.length;
    expect(await openControlPlane('studio')).toBe(false);
    expect(FakeClient.made.length).toBe(made);
    expect(await openControlPlane('studio', { keystroke: true })).toBe(true);
    expect(FakeClient.made.length).toBe(made + 1);
    expect(controlPlane.missedGreetingThisRun('studio')).toBe(true);
  });

  it('while that client waits for its greeting the machine is waiting, not none', async () => {
    await missed();
    await openControlPlane('studio', { keystroke: true });
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'waiting' });
  });

  it('when it greets: live, and the machine comes off the set', async () => {
    await missed();
    await openControlPlane('studio', { keystroke: true });
    const client = FakeClient.made[FakeClient.made.length - 1];
    if (client === undefined) throw new Error('no client');
    client.connected = true;
    client.emit('connected');
    expect(remoteScrollRunner('studio').kind).toBe('live');
    expect(controlPlane.missedGreetingThisRun('studio')).toBe(false);
  });

  it('when it misses too: none again, and nothing is made until something asks', async () => {
    await missed();
    await openControlPlane('studio', { keystroke: true });
    const client = FakeClient.made[FakeClient.made.length - 1];
    if (client === undefined) throw new Error('no client');
    const made = FakeClient.made.length;
    client.emit('greeting-timeout');
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'none' });
    expect(controlPlane.missedGreetingThisRun('studio')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(FakeClient.made.length).toBe(made);
  });

  it('a keystroke\'s ask still stands behind the precheck and the gate', async () => {
    await missed();
    versionAnswer = 'tmux 3.0a\n';
    const made = FakeClient.made.length;
    expect(await openControlPlane('studio', { keystroke: true })).toBe(false);
    expect(FakeClient.made.length).toBe(made);
    expect(remoteScrollRunner('studio')).toEqual({ kind: 'none' });
  });
});

describe('the module surface', () => {
  const REPO = join(__dirname, '../../../..');

  it('exports the parent\'s names plus remoteScrollRunner, and nothing else', () => {
    expect(Object.keys(controlPlane).sort()).toEqual(
      [
        'CONTROL_DIALECT_UNMEASURED',
        'CONTROL_GREETING_DEADLINE',
        'CONTROL_GREETING_DEADLINE_REASON',
        'CONTROL_PRECHECK_TIMEOUT_MS',
        'allowControlPlaneAgain',
        'assertControlDialectMeasured',
        'closeControlPlane',
        'closeEveryControlPlane',
        'everyMachineLinkFacts',
        'isControlPlaneLive',
        'machineLinkFacts',
        'missedGreetingThisRun',
        'noteMachineAnswered',
        'noteMachineConnecting',
        'noteMachineFeedMissed',
        'noteMachineFeedUnknown',
        'noteMachineLinkFailed',
        'noteMachineQuiet',
        'noteMachineRefused',
        'onMachineLinkChanged',
        'openControlPlane',
        'openControlPlaneCount',
        'remoteContextFor',
        'remoteControlTransport',
        'remoteScrollRunner',
        'resetControlPlanesForTests',
        'setControlPlaneSink',
        'setMachineFactsForHarness'
      ].sort()
    );
    expect('clients' in controlPlane).toBe(false);
    expect('sendCommand' in controlPlane).toBe(false);
  });

  it('names no send-keys, and hands the send to the guarded composer alone', () => {
    const source = readFileSync(join(REPO, 'src/main/machines/control-plane.ts'), 'utf8');
    expect(source.includes('send-keys')).toBe(false);
    expect(source.match(/\.sendCommand\(/g)).toHaveLength(1);
    expect(source).toMatch(/guardedScrollRunner\(\{\s*send: \(line\) => client\.sendCommand\(line\)/);
  });
});
