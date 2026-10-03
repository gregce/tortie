/**
 * Phase 320.1, the second build: the attach host asks the key router about a
 * REMOTE client's keystroke before it writes it, and never about a local one
 * (build/p3201/SPEC.md §6.4, D6 to D8).
 *
 * What it pins, against the SHIPPING ../attach-host.ts with the fakes
 * `attach-host.test.ts` settled on (a recording ipcMain, a recording node-pty,
 * a recording WebContents):
 *
 *  - a local client's keystroke never reaches the hook, and is written to its
 *    pty exactly as before;
 *  - a remote client's keystroke reaches the hook, synchronously, inside the
 *    listener, with the session id and the text, BEFORE anything is written to
 *    the pty;
 *  - `true` means the hook has written it elsewhere: the pty gets nothing;
 *  - `false`, or no hook at all, and the pty gets it, as today;
 *  - input from another WebContents, after the client is gone, or that is not
 *    a non-empty string reaches neither the hook nor the pty.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { termInputChannel } from '@shared/ipc';
import type { RemoteMachineContext } from '../../machines/context';

type Listener = (event: unknown, ...args: unknown[]) => void;

const ipcListeners = new Map<string, Listener[]>();

const fakeIpcMain = {
  on: vi.fn((channel: string, fn: Listener) => {
    const list = ipcListeners.get(channel) ?? [];
    list.push(fn);
    ipcListeners.set(channel, list);
  }),
  removeListener: vi.fn((channel: string, fn: Listener) => {
    const list = ipcListeners.get(channel) ?? [];
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
    ipcListeners.set(channel, list);
  })
};

vi.mock('electron', () => ({ ipcMain: fakeIpcMain }));

/** Everything that happened, in order, across the hook and every pty. */
const events: string[] = [];

interface FakePty {
  write: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  onData: (cb: (data: string) => void) => void;
  onExit: (cb: (e: { exitCode: number; signal?: number }) => void) => void;
}

const spawnedPtys: FakePty[] = [];

vi.mock('node-pty', () => ({
  spawn: vi.fn(() => {
    const pty: FakePty = {
      write: vi.fn((data: string) => {
        events.push(`pty:${data}`);
      }),
      resize: vi.fn(),
      kill: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      onData: () => undefined,
      onExit: () => undefined
    };
    spawnedPtys.push(pty);
    return pty;
  })
}));

vi.mock('../../tmux/resolve', () => ({
  findTmuxBinary: () => '/usr/bin/false',
  resolveConfPath: () => '/dev/null',
  resolveTmux: () => ({
    path: '/usr/bin/false',
    source: 'dev-path',
    packaged: false,
    detail: '/usr/bin/false'
  }),
  tmuxUnavailableError: () => new Error('no tmux'),
  activeTmuxSocket: () => 'gmux-p3201-route',
  assertConfUsable: () => undefined
}));
vi.mock('../../tmux/supervisor', () => ({ TMUX_SOCKET: 'gmux' }));
vi.mock('../../tmux/env', () => ({
  withUtf8Locale: (env: Record<string, string | undefined>) => env
}));

const { AttachHost } = await import('../attach-host');

interface FakeSender {
  isDestroyed: () => boolean;
  once: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

function makeSender(): FakeSender {
  return {
    isDestroyed: () => false,
    once: vi.fn(),
    removeListener: vi.fn(),
    send: vi.fn()
  };
}

const MACHINE: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p3201-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: {
    tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
    user: '/Users/x/.ssh/known_hosts'
  }
};

const SID = 'sess-p3201';

function fire(sender: FakeSender, data: unknown): void {
  for (const fn of ipcListeners.get(termInputChannel(SID)) ?? []) fn({ sender }, data);
}

/** A host whose hook records its calls and answers `answer`. */
function hostWith(answer: boolean | null): {
  host: InstanceType<typeof AttachHost>;
  calls: [string, string][];
} {
  const calls: [string, string][] = [];
  const host = new AttachHost({
    tmuxBin: '/opt/fake/tmux',
    confPath: '/opt/fake/gmux-tmux.conf',
    socketName: 'gmux-p3201-route',
    ...(answer === null
      ? {}
      : {
          routeRemoteInput: (sessionId: string, data: string): boolean => {
            calls.push([sessionId, data]);
            events.push(`hook:${data}`);
            return answer;
          }
        })
  });
  return { host, calls };
}

function attachLocal(host: InstanceType<typeof AttachHost>, sender: FakeSender): void {
  host.attach({ sessionId: SID, tmuxName: 'proj--one', sender: sender as never });
}

function attachRemote(host: InstanceType<typeof AttachHost>, sender: FakeSender): void {
  host.attach({ sessionId: SID, tmuxName: 'proj--one', sender: sender as never, machine: MACHINE });
}

beforeEach(() => {
  ipcListeners.clear();
  spawnedPtys.length = 0;
  events.length = 0;
  vi.clearAllMocks();
});

describe('the remote input hook', () => {
  it('a local client: the hook is never asked, even one that would say true, and the pty gets every key', () => {
    const { host, calls } = hostWith(true);
    const sender = makeSender();
    attachLocal(host, sender);
    fire(sender, 'ls\r');
    fire(sender, 'é');
    expect(calls).toEqual([]);
    expect(spawnedPtys[0]?.write.mock.calls).toEqual([['ls\r'], ['é']]);
  });

  it('a remote client, hook false: asked first, synchronously, then the pty gets the key', () => {
    const { host, calls } = hostWith(false);
    const sender = makeSender();
    attachRemote(host, sender);
    fire(sender, 'x');
    // No await between the listener and these lines.
    expect(calls).toEqual([[SID, 'x']]);
    expect(events).toEqual(['hook:x', 'pty:x']);
  });

  it('a remote client, hook true: the pty gets nothing', () => {
    const { host, calls } = hostWith(true);
    const sender = makeSender();
    attachRemote(host, sender);
    fire(sender, 'fix');
    fire(sender, '\r');
    expect(calls).toEqual([
      [SID, 'fix'],
      [SID, '\r']
    ]);
    expect(spawnedPtys[0]?.write).not.toHaveBeenCalled();
    expect(events).toEqual(['hook:fix', 'hook:\r']);
  });

  it('a remote client with no hook: the pty gets the key, as today', () => {
    const { host } = hostWith(null);
    const sender = makeSender();
    attachRemote(host, sender);
    fire(sender, 'q');
    expect(spawnedPtys[0]?.write.mock.calls).toEqual([['q']]);
  });

  it('another WebContents, a detached client, and anything that is not a non-empty string reach neither', () => {
    const { host, calls } = hostWith(false);
    const sender = makeSender();
    attachRemote(host, sender);
    fire(makeSender(), 'stranger');
    fire(sender, '');
    fire(sender, 42);
    fire(sender, null);
    expect(calls).toEqual([]);
    expect(spawnedPtys[0]?.write).not.toHaveBeenCalled();
    const listener = ipcListeners.get(termInputChannel(SID))?.[0];
    host.detach(SID);
    listener?.({ sender }, 'late');
    expect(calls).toEqual([]);
    expect(spawnedPtys[0]?.write).not.toHaveBeenCalled();
  });
});
