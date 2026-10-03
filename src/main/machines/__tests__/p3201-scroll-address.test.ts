/**
 * Phase 320.1, the live-row target (build/p3201/SPEC.md D4).
 *
 * A session on another machine may be scrolled only at a `$N` that a list issued
 * on the machine's CURRENT live connection reported. tmux ids are monotonic for
 * a server's life, so a `$N` names somebody else's session only after a far
 * restart, which ends the connection; the epoch rule is what stops a list from
 * before the reconnect addressing anything after it. Never a gone row, and never
 * `remoteSessionRow`, which answers gone rows.
 *
 * Two halves:
 *
 *  - `scrollAddressOf`, PURE, over its whole matrix;
 *  - the real feed, driven through the real control plane's sink with a fake
 *    client and an exec plane that answers from text (the harness
 *    `remote-close.test.ts` uses): the epoch moves on `connected`, and only a
 *    pass that STARTED after it catches the rows up. A pass that started before
 *    and finishes after puts them back to waiting.
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';
import type { RemoteSessionRow } from '../remote-sessions';

const MACHINE = 'popos';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: MACHINE,
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p3201-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** What the machine lists. */
let listed = '';
/** How many of the next lists to hold open, and the releases of those held. */
let holdNext = 0;
let heldLists: ((text: string) => void)[] = [];

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation: 1, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    if (args[0] === 'display-message') return Promise.resolve('tmux 3.6a\n');
    if (args[0] === 'list-sessions') {
      if (holdNext > 0) {
        holdNext -= 1;
        return new Promise<string>((resolve) => {
          heldLists.push(resolve);
        });
      }
      return Promise.resolve(listed);
    }
    return Promise.resolve('');
  }
}));

class FakeControlClient extends EventEmitter {
  static made: FakeControlClient[] = [];
  connected = false;
  constructor() {
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
  forgetRemoteRow,
  pollRemoteMachine,
  remoteMachineFacts,
  remoteScrollAddress,
  resetRemoteSessionsForTests,
  scrollAddressOf,
  startMachineFeed
} = await import('../remote-sessions');
const { resetControlPlanesForTests } = await import('../control-plane');
const { resetRescueForTests } = await import('../pane-env-rescue');

/** One list line in the shipped format, quoted the way tmux's `#{q:...}` does. */
function line(gmuxId: string, tmuxId = '$1'): string {
  return [tmuxId, '1700000000', '1700000100', '0', gmuxId, 'shell', 'work', '/srv/repo', '/srv/repo', 'work']
    .map((value) => value.replace(/([ \\"'$;])/g, '\\$1'))
    .join(' ');
}

/** Let the passes the sink started finish. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function client(): FakeControlClient {
  const one = FakeControlClient.made[FakeControlClient.made.length - 1];
  if (one === undefined) throw new Error('no control client was made');
  return one;
}

function connect(): void {
  client().connected = true;
  client().emit('connected');
}

function drop(): void {
  client().connected = false;
  client().emit('disconnected', true);
}

const ROW: RemoteSessionRow = {
  id: 'sess',
  machineId: MACHINE,
  tmuxId: '$7',
  tmuxName: 'work',
  name: 'work',
  agent: 'shell',
  projectPath: '/srv/repo',
  cwd: '/srv/repo',
  createdAt: 1,
  activityAt: 1,
  status: 'idle',
  movedAt: 0
};

beforeEach(() => {
  listed = '';
  holdNext = 0;
  heldLists = [];
  FakeControlClient.made = [];
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
});

afterEach(() => {
  for (const release of heldLists) release('');
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
});

describe('scrollAddressOf, pure, over its matrix', () => {
  const base = { live: ROW, gone: false, onControl: true, controlEpoch: 3, rowsEpoch: 3 };

  it('live only for a live row, on a connection, listed on THIS connection', () => {
    expect(scrollAddressOf(base)).toEqual({ kind: 'live', machineId: MACHINE, tmuxId: '$7' });
  });

  it('waiting when the connection is down, whatever the epochs say', () => {
    expect(scrollAddressOf({ ...base, onControl: false })).toEqual({ kind: 'waiting', machineId: MACHINE });
  });

  it('waiting when the rows came from a pass on an earlier connection', () => {
    expect(scrollAddressOf({ ...base, rowsEpoch: 2 })).toEqual({ kind: 'waiting', machineId: MACHINE });
    expect(scrollAddressOf({ ...base, rowsEpoch: 4 })).toEqual({ kind: 'waiting', machineId: MACHINE });
    expect(scrollAddressOf({ ...base, onControl: false, rowsEpoch: 2 })).toEqual({
      kind: 'waiting',
      machineId: MACHINE
    });
  });

  it('ended for a gone row, even if a live row were present too', () => {
    expect(scrollAddressOf({ ...base, live: undefined, gone: true })).toEqual({ kind: 'ended' });
    expect(scrollAddressOf({ ...base, gone: true })).toEqual({ kind: 'ended' });
  });

  it('unknown when no machine holds it', () => {
    expect(scrollAddressOf({ ...base, live: undefined })).toEqual({ kind: 'unknown' });
    expect(
      scrollAddressOf({ live: undefined, gone: false, onControl: false, controlEpoch: 0, rowsEpoch: 0 })
    ).toEqual({ kind: 'unknown' });
  });
});

describe('the real feed: the epoch moves on connected, and a pass catches it up only if it started after', () => {
  it('a machine on the timer is waiting, and its first connected pass makes it live', async () => {
    listed = line('sess', '$4');
    await startMachineFeed(MACHINE);
    expect(remoteMachineFacts(MACHINE)).toMatchObject({ rows: 1, onControl: false, controlEpoch: 0, rowsEpoch: 0 });
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'waiting', machineId: MACHINE });

    // The pass `connected` issues is held: the epoch has moved and the rows
    // have not caught up, so nothing may be addressed yet.
    holdNext = 1;
    connect();
    await settle();
    expect(remoteMachineFacts(MACHINE)).toMatchObject({ onControl: true, controlEpoch: 1, rowsEpoch: 0 });
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'waiting', machineId: MACHINE });

    heldLists.shift()?.(listed);
    await settle();
    expect(remoteMachineFacts(MACHINE)).toMatchObject({ controlEpoch: 1, rowsEpoch: 1 });
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'live', machineId: MACHINE, tmuxId: '$4' });
  });

  it('a pass that started BEFORE a reconnect and finishes after it does not address anything', async () => {
    listed = line('sess', '$4');
    await startMachineFeed(MACHINE);
    connect();
    await settle();
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'live', machineId: MACHINE, tmuxId: '$4' });

    // A pass issued on connection 1 and held open over a reconnect.
    holdNext = 1;
    const before = pollRemoteMachine(MACHINE);
    drop();
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'waiting', machineId: MACHINE });
    // The far server restarted: the same Tortie id now sits at another `$N`.
    listed = line('sess', '$0');
    connect();
    await settle();
    // The pass `connected` issued started on connection 2 and completed.
    expect(remoteMachineFacts(MACHINE)).toMatchObject({ controlEpoch: 2, rowsEpoch: 2 });
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'live', machineId: MACHINE, tmuxId: '$0' });

    // The old pass lands last, holding what connection 1 saw. Its rows are
    // written, and the epoch it started on refuses them as a target.
    heldLists.shift()?.(line('sess', '$4'));
    await before;
    expect(remoteMachineFacts(MACHINE)).toMatchObject({ controlEpoch: 2, rowsEpoch: 1 });
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'waiting', machineId: MACHINE });

    // The next pass, started on connection 2, catches up.
    await pollRemoteMachine(MACHINE);
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'live', machineId: MACHINE, tmuxId: '$0' });
  });

  it('a row the machine stopped listing is ended, and a Remove makes it unknown', async () => {
    listed = line('sess', '$4');
    await startMachineFeed(MACHINE);
    connect();
    await settle();
    listed = '';
    await pollRemoteMachine(MACHINE);
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'ended' });
    forgetRemoteRow('sess');
    expect(remoteScrollAddress('sess')).toEqual({ kind: 'unknown' });
  });
});
