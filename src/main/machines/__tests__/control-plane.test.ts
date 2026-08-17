/**
 * The control plane per machine (Phase 71, M4).
 *
 * NOTHING HERE OPENS A CONNECTION. The exec plane is replaced by a function that
 * records the argv it was handed, and the control client is replaced by a fake
 * whose events this file emits. That is the point rather than a convenience:
 * every property below is about what Tortie SENDS and what it refuses to open,
 * and a test that opened a connection to find out would be the defect it is
 * testing for.
 *
 * The properties, and each one is load bearing on this rung:
 *
 *  - the carriage is the CONTROL row of research 51 section 4.1, composed by the
 *    one composer, with the scratch socket and never a literal `gmux`
 *  - `-u` is NOT on it, which is what the dialect probe measured
 *  - ONE connection per machine, never per session
 *  - a version with no control measurement gets NO connection and the refusal
 *    names the versions that do have one
 *  - the precheck is a READ over the exec plane and never anything that could
 *    start a server, on this Mac or on that machine
 *  - a machine that did not answer the precheck opens nothing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { GmuxError } from '../../errors';
import type { RemoteMachineContext } from '../context';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'studio',
  sshBin: '/usr/bin/ssh',
  host: 'studio.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p71-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

/** Every argv the exec plane was handed, in order. */
let sent: string[][] = [];
/** What `display-message` answers with. A version string, or an Error. */
let versionAnswer: string | Error = 'tmux 3.6a\n';
/** Whether a context is registered at all, and whether its PATH was captured. */
let registered = true;
let remotePath: string | null = '/usr/bin:/bin';

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
    if (versionAnswer instanceof Error) return Promise.reject(versionAnswer);
    return Promise.resolve(versionAnswer);
  }
}));

/** The fake control client, so nothing spawns. */
class FakeClient extends EventEmitter {
  static made: FakeClient[] = [];
  connected = false;
  stopped = false;
  started = 0;
  constructor(readonly transport: { machineId: string }) {
    super();
    FakeClient.made.push(this);
  }
  start(): Promise<void> {
    this.started += 1;
    return Promise.resolve();
  }
  stop(): void {
    this.stopped = true;
  }
  get machineId(): string {
    return this.transport.machineId;
  }
}

vi.mock('../../tmux/control-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tmux/control-client')>()),
  TmuxControlClient: FakeClient
}));

const {
  CONTROL_DIALECT_UNMEASURED,
  assertControlDialectMeasured,
  closeControlPlane,
  everyMachineLinkFacts,
  isControlPlaneLive,
  machineLinkFacts,
  noteMachineAnswered,
  noteMachineRefused,
  openControlPlane,
  openControlPlaneCount,
  remoteControlTransport,
  resetControlPlanesForTests,
  setControlPlaneSink
} = await import('../control-plane');

beforeEach(() => {
  sent = [];
  versionAnswer = 'tmux 3.6a\n';
  registered = true;
  remotePath = '/usr/bin:/bin';
  FakeClient.made = [];
  resetControlPlanesForTests();
});

afterEach(() => {
  resetControlPlanesForTests();
});

/** The one client this test made, or a failure that says so. */
function onlyClient(): FakeClient {
  const client = FakeClient.made[0];
  if (client === undefined) throw new Error('no control client was made');
  return client;
}

describe('the carriage', () => {
  it('is the CONTROL row of research 51 section 4.1, one quoted argument', async () => {
    const plan = await remoteControlTransport('studio').plan();
    expect(plan.file).toBe('/usr/bin/ssh');
    const remoteCommand = plan.argv[plan.argv.length - 1] ?? '';
    expect(remoteCommand).toBe(
      "/usr/bin/tmux -L gmux-p71-unit -f /dev/null -C new-session -A -s gmux-control"
    );
  });

  it('carries the scratch socket and never the literal gmux', async () => {
    const plan = await remoteControlTransport('studio').plan();
    const text = plan.argv.join(' ');
    expect(text).toContain('gmux-p71-unit');
    expect(/(^|\s)-L gmux(\s|$)/.test(text)).toBe(false);
  });

  it('does NOT carry -u, which is what the dialect probe measured', async () => {
    const plan = await remoteControlTransport('studio').plan();
    expect(plan.argv.join(' ')).not.toContain(' -u ');
  });

  it('carries every keepalive option the exec plane carries', async () => {
    const plan = await remoteControlTransport('studio').plan();
    const text = plan.argv.join(' ');
    for (const option of [
      'BatchMode=yes',
      'StrictHostKeyChecking=yes',
      'ControlMaster=auto',
      'ServerAliveInterval=5',
      'ServerAliveCountMax=3'
    ]) {
      expect(text).toContain(option);
    }
  });
});

describe('the precheck', () => {
  it('is one read and never anything that could start a server', async () => {
    await remoteControlTransport('studio').precheck();
    expect(sent).toEqual([['display-message', '-p', '#{version}']]);
  });

  it('refuses when the version has no control measurement', async () => {
    versionAnswer = 'tmux 3.2a\n';
    const err = await remoteControlTransport('studio')
      .precheck()
      .catch((one: unknown) => one);
    expect(err).toBeInstanceOf(GmuxError);
    expect((err as GmuxError).payload.message).toBe(CONTROL_DIALECT_UNMEASURED);
  });

  it('names the versions that do have one, in the detail', () => {
    const err = (() => {
      try {
        assertControlDialectMeasured('studio', '3.2a');
        return null;
      } catch (one) {
        return one as GmuxError;
      }
    })();
    expect(err).toBeInstanceOf(GmuxError);
    expect(String(err?.payload.detail)).toContain('3.6a');
    expect(String(err?.payload.detail)).toContain('3.7b');
  });

  it('refuses a version it could not read at all', () => {
    expect(() => assertControlDialectMeasured('studio', null)).toThrow(GmuxError);
  });
});

describe('opening', () => {
  it('opens ONE connection per machine, never per session', async () => {
    expect(await openControlPlane('studio')).toBe(true);
    expect(await openControlPlane('studio')).toBe(true);
    expect(await openControlPlane('studio')).toBe(true);
    expect(openControlPlaneCount()).toBe(1);
    expect(FakeClient.made).toHaveLength(1);
    expect(onlyClient().started).toBe(1);
  });

  it('opens NOTHING for a version with no control measurement', async () => {
    versionAnswer = 'tmux 3.2a\n';
    expect(await openControlPlane('studio')).toBe(false);
    expect(openControlPlaneCount()).toBe(0);
    expect(FakeClient.made).toHaveLength(0);
    // The machine still works, on the timer feed, and the link says so.
    expect(machineLinkFacts('studio').link).toBe('polling');
    expect(machineLinkFacts('studio').reason).toBe(
      'runs a version Tortie has not measured'
    );
  });

  it('opens nothing for a machine that did not answer the read', async () => {
    versionAnswer = new Error('no answer from that machine');
    expect(await openControlPlane('studio')).toBe(false);
    expect(openControlPlaneCount()).toBe(0);
  });

  it('opens nothing for a machine Tortie has not signed in to', async () => {
    registered = false;
    expect(await openControlPlane('studio')).toBe(false);
    expect(sent).toEqual([]);
  });

  it('opens nothing before the program search list has been read', async () => {
    remotePath = null;
    expect(await openControlPlane('studio')).toBe(false);
    expect(sent).toEqual([]);
  });
});

describe('the link a surface reads', () => {
  it('starts as connecting and reaches connected on the event', async () => {
    await openControlPlane('studio');
    expect(machineLinkFacts('studio').link).toBe('connecting');
    onlyClient().connected = true;
    onlyClient().emit('connected');
    expect(machineLinkFacts('studio').link).toBe('connected');
    expect(isControlPlaneLive('studio')).toBe(true);
  });

  it('goes quiet when the connection drops, and tells the sink once', async () => {
    const lost: string[] = [];
    setControlPlaneSink({
      connected: () => undefined,
      sessionsChanged: () => undefined,
      sessionRenamed: () => undefined,
      lost: (id) => lost.push(id)
    });
    await openControlPlane('studio');
    onlyClient().connected = true;
    onlyClient().emit('connected');
    onlyClient().connected = false;
    onlyClient().emit('disconnected', true);

    expect(lost).toEqual(['studio']);
    expect(machineLinkFacts('studio').link).toBe('quiet');
    expect(isControlPlaneLive('studio')).toBe(false);
  });

  it('records the answer time from when the command was issued', () => {
    noteMachineAnswered('studio', 1_700_000_000_000);
    const facts = machineLinkFacts('studio');
    expect(facts.everAnswered).toBe(true);
    expect(facts.lastAnsweredAt).toBe(1_700_000_000_000);
    expect(facts.link).toBe('polling');
  });

  it('reads quiet for a machine nothing has touched, and never throws', () => {
    const facts = machineLinkFacts('never-touched');
    expect(facts.link).toBe('quiet');
    expect(facts.everAnswered).toBe(false);
    expect(facts.lastAnsweredAt).toBeNull();
  });

  it('lists every machine it has touched, oldest id first', async () => {
    noteMachineAnswered('studio', 1);
    noteMachineRefused('attic', 'runs a version Tortie has not measured');
    expect(everyMachineLinkFacts().map((one) => one.machineId)).toEqual([
      'attic',
      'studio'
    ]);
    expect(everyMachineLinkFacts()[0]?.link).toBe('refused');
  });

  it('composes no sentence a person reads, only one clause', () => {
    noteMachineRefused('attic', 'runs a version Tortie has not measured');
    const reason = machineLinkFacts('attic').reason ?? '';
    // No transport word may appear. The renderer's own vocabulary audit checks
    // the sentences; this checks the clause main hands it.
    for (const word of ['ssh', 'tmux', 'socket', 'pane', 'prefix']) {
      expect(reason.toLowerCase()).not.toContain(word);
    }
  });
});

describe('closing', () => {
  it('stops the client and forgets it', async () => {
    await openControlPlane('studio');
    const client = onlyClient();
    closeControlPlane('studio');
    expect(client.stopped).toBe(true);
    expect(openControlPlaneCount()).toBe(0);
  });

  it('sends nothing to the machine when it closes', async () => {
    await openControlPlane('studio');
    sent = [];
    closeControlPlane('studio');
    expect(sent).toEqual([]);
  });
});
