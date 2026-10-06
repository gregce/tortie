/**
 * Phase 340.1's fix round: the server set-up stops part way when its caller's
 * route is retired (`../remote-server.ts`, `stillRouted`).
 *
 * The reverify's arm B held a Prepare inside `ensureRemoteServer`, at its
 * `set-environment`, and confirmed changed details there: the Prepare read Not
 * ready afterwards, but the set-up ran to its end first, 24 more commands to
 * the old details (12 `set-option`, 12 `show-options`). Prepare now hands the
 * set-up a question, asked after every command it sends, and a false answer
 * stops it before the next one.
 *
 * This drives the REAL `ensureRemoteServer`. The exec plane, the search list
 * capture and the settings are stand-ins that record, so nothing here runs a
 * command. Every case has a control beside it, so a pass cannot come from a
 * set-up that never ran.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

vi.mock('electron', () => ({
  app: { getPath: () => '/nonexistent', isReady: () => true, isPackaged: false },
  BrowserWindow: { getAllWindows: () => [] }
}));

vi.mock('../../settings/store', () => ({
  getSettings: () => ({ scrollbackLines: 50_000 })
}));

const plane = vi.hoisted(() => ({
  calls: [] as string[],
  /** The verdict's list answers with this; an Error means no server there. */
  list: '' as string | Error,
  /** Hold the next call whose first word is this, once. */
  holdVerb: null as string | null,
  held: null as null | { resolve: (text: string) => void; verb: string }
}));

vi.mock('../exec-plane', () => ({
  execOn: (_ctx: unknown, args: readonly string[]) => {
    plane.calls.push(args.join(' '));
    const verb = args[0] ?? '';
    if (plane.holdVerb !== null && verb === plane.holdVerb) {
      plane.holdVerb = null;
      return new Promise<string>((resolve) => {
        plane.held = { resolve, verb };
      });
    }
    if (verb === 'list-sessions' && plane.list instanceof Error) {
      return Promise.reject(plane.list);
    }
    if (verb === 'list-sessions') return Promise.resolve(plane.list);
    return Promise.resolve('');
  }
}));

vi.mock('../remote-path', () => ({
  captureRemotePath: () => {
    plane.calls.push('capture-path');
    return Promise.resolve('/usr/bin:/bin');
  }
}));

const { ensureRemoteServer, RemoteServerSetUpStopped } = await import('../remote-server');
const { remoteBootOptions } = await import('../../tmux/server-options');
const { gmuxError } = await import('../../errors');

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'p3401-setup',
  sshBin: '/usr/bin/ssh',
  host: '127.0.0.1',
  user: null,
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p3401-unit',
  controlPath: '/tmp/tortie-501/m-p3401',
  hostKeys: { tortie: '/t/known-machines', user: '/u/person' }
};

/** What tmux prints for a socket with nothing listening: the no-server answer. */
const NO_SERVER = gmuxError(
  'TMUX_UNREACHABLE',
  'Tortie could not reach tmux.',
  'no server running on /tmp/tmux-501/gmux-p3401-unit'
);

/** Commands of one verb sent so far. */
function count(verb: string): number {
  return plane.calls.filter((line) => line.split(' ')[0] === verb).length;
}

/** Wait until the call of `verb` is held. */
async function heldAt(verb: string): Promise<void> {
  await vi.waitFor(() => {
    expect(plane.held?.verb).toBe(verb);
  });
}

beforeEach(() => {
  plane.calls.length = 0;
  plane.list = '';
  plane.holdVerb = null;
  plane.held = null;
});

describe('a set-up nobody stops (the control)', () => {
  it('sends every option and reads every one back, with and without the question', async () => {
    const rows = remoteBootOptions().length;
    expect(rows).toBeGreaterThan(0);
    const plain = await ensureRemoteServer(CTX);
    expect(plain.born).toBe(false);
    expect(count('set-option')).toBe(rows);
    expect(count('show-options')).toBe(rows);
    plane.calls.length = 0;
    const asked = await ensureRemoteServer(CTX, { stillRouted: () => true });
    expect(asked.options).toHaveLength(rows);
    expect(count('set-option')).toBe(rows);
    expect(count('show-options')).toBe(rows);
  });
});

describe('a route retired while the set-up is out', () => {
  it('stops after the command in flight: no option is set or read back (the reverify’s arm B)', async () => {
    let routed = true;
    plane.holdVerb = 'set-environment';
    const pending = ensureRemoteServer(CTX, { stillRouted: () => routed }).then(
      () => null,
      (err: unknown) => err
    );
    await heldAt('set-environment');
    const atRetire = plane.calls.length;
    routed = false;
    plane.held?.resolve('');
    const err = await pending;
    expect(err).toBeInstanceOf(RemoteServerSetUpStopped);
    expect((err as InstanceType<typeof RemoteServerSetUpStopped>).born).toBe(false);
    expect(plane.calls.slice(atRetire)).toEqual([]);
    expect(count('set-option')).toBe(0);
    expect(count('show-options')).toBe(0);
  });

  it('says it had started the server when the stop came after the boot', async () => {
    plane.list = NO_SERVER;
    let routed = true;
    plane.holdVerb = 'start-server';
    const pending = ensureRemoteServer(CTX, { stillRouted: () => routed }).then(
      () => null,
      (err: unknown) => err
    );
    await heldAt('start-server');
    routed = false;
    plane.held?.resolve('');
    const err = await pending;
    expect(err).toBeInstanceOf(RemoteServerSetUpStopped);
    expect((err as InstanceType<typeof RemoteServerSetUpStopped>).born).toBe(true);
    // Nothing after the boot: no search list, no environment, no option.
    expect(plane.calls.at(-1)?.startsWith('start-server')).toBe(true);
    expect(count('capture-path')).toBe(0);
    expect(count('set-environment')).toBe(0);
  });

  it('stops inside the option loop too, at the next command', async () => {
    let routed = true;
    plane.holdVerb = 'set-option';
    const pending = ensureRemoteServer(CTX, { stillRouted: () => routed }).then(
      () => null,
      (err: unknown) => err
    );
    await heldAt('set-option');
    routed = false;
    plane.held?.resolve('');
    const err = await pending;
    expect(err).toBeInstanceOf(RemoteServerSetUpStopped);
    expect(count('set-option')).toBe(1);
    expect(count('show-options')).toBe(0);
  });

  it('a set-up whose caller passed no question runs to its end, as a restore’s and a create’s do', async () => {
    plane.holdVerb = 'set-environment';
    const pending = ensureRemoteServer(CTX);
    await heldAt('set-environment');
    plane.held?.resolve('');
    const result = await pending;
    expect(result.options).toHaveLength(remoteBootOptions().length);
    expect(count('set-option')).toBe(remoteBootOptions().length);
  });
});
