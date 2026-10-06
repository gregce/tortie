/**
 * Phase 340.1's fix round: a create on another machine that is out when a
 * person confirms CHANGED details for that machine (the reverify's arm D).
 *
 * The confirm retires the route (`retireMachineRoute`): the feed stops, the
 * context goes, and no list is issued until Prepare starts the feed again. A
 * create already out held its context in a local and went on; that much is
 * the parent's behaviour and is kept. Its LAST step, `startMachineFeed`, ran
 * after the retire, adopted the NEW route with no context to send a list over,
 * and its first list marked the machine as not answering, so the row read
 * Offline, "did not answer the last time Tortie asked", about a machine nothing
 * under the new details had asked. The reverify measured it in the app at the
 * parent and at the build. The create now reads the route epoch beside its
 * context and starts no feed at its end when it moved.
 *
 * NOTHING HERE RUNS A COMMAND. The harness is the in-flight create's
 * (`./p326-inflight-create.test.ts`): the exec plane records the argv it was
 * handed and answers with what a machine would print, and the manifest half
 * is a map. The context stand-in always answers, so the feed a late start
 * would run here lists rather than marking the machine quiet; what is
 * asserted is that no list and no timer follow the retire, and the control
 * beside it shows both following a create nobody overtook.
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
  socket: 'gmux-p3401-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/person' }
};

/** Every argv the plane was handed, in order. */
let sent: string[][] = [];
/** The uuid the last create put on its own new-session line. */
let createdUuid = '';
/** The held new-session, released by the test. */
let releaseNewSession: ((text: string) => void) | null = null;

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  machineContext: () => CTX,
  machineGeneration: () => ({ generation: 1, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    sent.push([...args]);
    if (args[0] === 'new-session') {
      const pair = args.find((one) => one.startsWith('GMUX_SESSION_ID=')) ?? '';
      createdUuid = pair.slice('GMUX_SESSION_ID='.length);
      return new Promise<string>((resolve) => {
        releaseNewSession = resolve;
      });
    }
    if (args[0] === 'list-sessions' && createdUuid !== '') {
      return Promise.resolve(listLine('$4', createdUuid));
    }
    return Promise.resolve('');
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
  machineRow: () => null
}));

const record = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>()
}));

vi.mock('../remote-record', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-record')>()),
  remoteManifestInstalled: () => false,
  noteRemoteRowSeen: () => undefined,
  writeRemoteRow: (input: { sessionId: string; machineId: string }) => {
    record.rows.set(input.sessionId, { ...input, id: input.sessionId, status: 'running' });
    return null;
  },
  remoteRecordOf: (id: string) => record.rows.get(id) ?? null,
  remoteRecordsForMachine: (machineId: string) =>
    [...record.rows.values()].filter((one) => one.machineId === machineId),
  unconfirmedRemoteRecords: () => [],
  markRemoteCreateUnconfirmed: () => undefined,
  remoteManifest: () => ({ deleteSession: (id: string) => record.rows.delete(id) })
}));

const { remoteCreate, remoteMachineFacts, resetRemoteSessionsForTests, retireMachineRoute } =
  await import('../remote-sessions');
const { machineLinkFacts, resetControlPlanesForTests } = await import('../control-plane');
const { resetRescueForTests } = await import('../pane-env-rescue');
const { resetRemoteCreateFlightsForTests } = await import('../create-inflight');

const MACHINE = 'popos';

/** One list line in the shipped format, quoted as tmux's own `#{q:...}` quotes it. */
function listLine(tmuxId: string, gmuxId: string): string {
  return [tmuxId, '1700000000', '1700000100', '0', gmuxId, 'shell', 'work', '/srv/repo', '/srv/repo', 'work']
    .map((value) => value.replace(/([ \\"'$;])/g, '\\$1'))
    .join(' ');
}

const CREATE = {
  machineId: MACHINE,
  name: 'work',
  projectPath: '/srv/repo',
  cwd: '/srv/repo',
  agent: 'shell'
} as const;

/**
 * Start a create and wait until its new-session is out and held. The create's
 * promise comes back inside an object, because an async function returning it
 * would wait for it, and it is held.
 */
async function heldCreate(): Promise<{ pending: Promise<unknown> }> {
  const pending = remoteCreate(CREATE).then(
    (session) => session,
    (err: unknown) => err
  );
  await vi.waitFor(() => {
    expect(releaseNewSession).not.toBeNull();
  });
  return { pending };
}

/** The verbs sent from index `from` on. */
function verbsFrom(from: number): string[] {
  return sent.slice(from).map((argv) => argv[0] ?? '');
}

beforeEach(() => {
  sent = [];
  createdUuid = '';
  releaseNewSession = null;
  record.rows = new Map();
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetRemoteCreateFlightsForTests();
});

afterEach(() => {
  resetRemoteSessionsForTests();
  resetControlPlanesForTests();
  resetRescueForTests();
  resetRemoteCreateFlightsForTests();
});

describe('a create held at new-session, then the route retired, then the answer', () => {
  it('starts no feed: no list and no timer follow the retire, and the link is not marked quiet', async () => {
    const { pending } = await heldCreate();
    const atRetire = sent.length;
    retireMachineRoute(MACHINE);
    releaseNewSession?.('$4\n');
    const outcome = await pending;

    const after = verbsFrom(atRetire);
    // The create's own stamps still go out, as at the parent: the session
    // exists over there and they are what names it.
    expect(after.filter((verb) => verb === 'set-option').length).toBe(4);
    // And nothing reads the machine for the new route.
    expect(after).not.toContain('list-sessions');
    expect(after).not.toContain('display-message');
    expect(remoteMachineFacts(MACHINE).timerArmed).toBe(false);
    expect(remoteMachineFacts(MACHINE).statusTimerArmed).toBe(false);
    expect(machineLinkFacts(MACHINE).link).not.toBe('quiet');
    // The create's own answer is the parent's: with no list, it cannot read
    // its row back (SPAWN_FAILED), a sentence this round does not change.
    expect(outcome).toBeInstanceOf(GmuxError);
    expect((outcome as GmuxError).payload.code).toBe('SPAWN_FAILED');
  });

  it('the control: a create nobody overtook starts its feed, lists, and returns its session', async () => {
    const { pending } = await heldCreate();
    const atRelease = sent.length;
    releaseNewSession?.('$4\n');
    const outcome = await pending;
    expect(verbsFrom(atRelease)).toContain('list-sessions');
    expect(outcome).not.toBeInstanceOf(Error);
    expect((outcome as { id: string }).id).toBe(createdUuid);
  });
});
