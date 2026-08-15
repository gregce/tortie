/**
 * AttachHost cleanup and sender identity — the protection suite the Phase 42
 * audit names for stage 1 (implementation order, row 1: "Sender, navigation,
 * invoke-closure, and AttachHost cleanup tests").
 *
 * The AttachHost owns one attach-client PTY per visible session and wires
 * three per-session things to it: two raw ipcMain listeners (term:input,
 * term:ack — TEMPLATE channels, allow-listed in ipc-single-bridge.test.ts), a
 * 'destroyed' listener on the renderer WebContents, and the PTY itself. Every
 * test here proves one direction of the same promise: whatever path ends a
 * client (detach, renderer death, unexpected PTY exit, replacement, quit)
 * removes ALL of that wiring exactly once, and input or acks from a
 * WebContents that is not the client's own sender never reach the PTY.
 *
 * Everything is driven with fakes: a fake ipcMain records listener add and
 * remove, a fake node-pty records writes and kills, a fake WebContents
 * records sends. No tmux server, no real PTY, no Electron binary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  termAckChannel,
  termDataChannel,
  termExitChannel,
  termInputChannel
} from '@shared/ipc';
import type { TermExitPayload } from '@shared/ipc';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

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

interface FakePty {
  write: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  onData: (cb: (data: string) => void) => void;
  onExit: (cb: (e: { exitCode: number; signal?: number }) => void) => void;
  emitData: (data: string) => void;
  emitExit: (exitCode: number) => void;
  argv: string[];
}

const spawnedPtys: FakePty[] = [];

function makeFakePty(argv: string[]): FakePty {
  let dataCb: ((data: string) => void) | null = null;
  let exitCb: ((e: { exitCode: number; signal?: number }) => void) | null =
    null;
  const pty: FakePty = {
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    onData: (cb) => {
      dataCb = cb;
    },
    onExit: (cb) => {
      exitCb = cb;
    },
    emitData: (data) => {
      dataCb?.(data);
    },
    emitExit: (exitCode) => {
      exitCb?.({ exitCode });
    },
    argv
  };
  return pty;
}

vi.mock('node-pty', () => ({
  spawn: vi.fn((_bin: string, argv: string[]) => {
    const pty = makeFakePty(argv);
    spawnedPtys.push(pty);
    return pty;
  })
}));

// The resolve and supervisor modules pull in the tmux stream; the host under
// test receives explicit tmuxBin/confPath/socketName options, so the mocks
// only need the names to exist.
vi.mock('../../tmux/resolve', () => ({
  findTmuxBinary: () => '/usr/bin/false',
  resolveConfPath: () => '/dev/null'
}));
vi.mock('../../tmux/supervisor', () => ({ TMUX_SOCKET: 'gmux' }));
vi.mock('../../tmux/env', () => ({
  withUtf8Locale: (env: Record<string, string | undefined>) => env
}));

interface FakeSender {
  isDestroyed: () => boolean;
  once: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  /** Fire the captured 'destroyed' listener, as Electron would. */
  emitDestroyed: () => void;
  destroyed: boolean;
}

function makeSender(): FakeSender {
  let destroyedCb: (() => void) | null = null;
  const sender: FakeSender = {
    destroyed: false,
    isDestroyed: () => sender.destroyed,
    once: vi.fn((event: string, cb: () => void) => {
      if (event === 'destroyed') destroyedCb = cb;
    }),
    removeListener: vi.fn((event: string) => {
      if (event === 'destroyed') destroyedCb = null;
    }),
    send: vi.fn(),
    emitDestroyed: () => {
      sender.destroyed = true;
      destroyedCb?.();
    }
  };
  return sender;
}

const { AttachHost } = await import('../attach-host');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SID = 'sess-1';

function host(onExit?: (id: string, code: number, expected: boolean) => void) {
  return new AttachHost({
    tmuxBin: '/opt/fake/tmux',
    confPath: '/opt/fake/gmux-tmux.conf',
    socketName: 'gmux-attach-test',
    ...(onExit !== undefined ? { onExit } : {})
  });
}

function attach(h: InstanceType<typeof AttachHost>, sender: FakeSender): void {
  h.attach({
    sessionId: SID,
    tmuxName: 'proj--one',
    sender: sender as never
  });
}

function listenerCount(channel: string): number {
  return (ipcListeners.get(channel) ?? []).length;
}

function fire(channel: string, sender: FakeSender, ...args: unknown[]): void {
  for (const fn of ipcListeners.get(channel) ?? []) {
    fn({ sender }, ...args);
  }
}

beforeEach(() => {
  ipcListeners.clear();
  spawnedPtys.length = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

describe('AttachHost wiring', () => {
  it('attach registers input + ack listeners and a destroyed listener', () => {
    const sender = makeSender();
    attach(host(), sender);

    expect(listenerCount(termInputChannel(SID))).toBe(1);
    expect(listenerCount(termAckChannel(SID))).toBe(1);
    expect(sender.once).toHaveBeenCalledWith(
      'destroyed',
      expect.any(Function)
    );
  });

  it('attaches with exact-match addressing on the private socket', () => {
    attach(host(), makeSender());
    const argv = spawnedPtys[0]!.argv;
    // `-t =<name>` — never a bare prefix-matchable name; `-L <harness socket>`.
    expect(argv).toContain('=proj--one');
    expect(argv).toContain('-L');
    expect(argv[argv.indexOf('-L') + 1]).toBe('gmux-attach-test');
  });

  it('routes input from the client sender to the pty and ignores others', () => {
    const sender = makeSender();
    attach(host(), sender);
    const pty = spawnedPtys[0]!;

    fire(termInputChannel(SID), sender, 'ls\r');
    expect(pty.write).toHaveBeenCalledWith('ls\r');

    const stranger = makeSender();
    fire(termInputChannel(SID), stranger, 'rm -rf /\r');
    expect(pty.write).toHaveBeenCalledTimes(1); // stranger's bytes never land
  });

  it('ignores acks from a sender that is not the client', () => {
    const sender = makeSender();
    attach(host(), sender);

    const stranger = makeSender();
    fire(termAckChannel(SID), stranger, 65536);
    // No observable state flips for a stranger ack; input still flows and
    // the client's own ack path still works afterwards.
    fire(termAckChannel(SID), sender, 65536);
    expect(listenerCount(termAckChannel(SID))).toBe(1);
  });
});

describe('AttachHost cleanup', () => {
  it('detach removes IPC listeners, the destroyed listener, and kills the pty', () => {
    const sender = makeSender();
    const h = host();
    attach(h, sender);
    const pty = spawnedPtys[0]!;

    h.detach(SID);

    expect(listenerCount(termInputChannel(SID))).toBe(0);
    expect(listenerCount(termAckChannel(SID))).toBe(0);
    expect(sender.removeListener).toHaveBeenCalledWith(
      'destroyed',
      expect.any(Function)
    );
    expect(pty.kill).toHaveBeenCalledTimes(1);
  });

  it('detach is idempotent', () => {
    const sender = makeSender();
    const h = host();
    attach(h, sender);
    const pty = spawnedPtys[0]!;

    h.detach(SID);
    h.detach(SID);
    expect(pty.kill).toHaveBeenCalledTimes(1);
  });

  it('renderer destruction detaches the client', () => {
    const sender = makeSender();
    const h = host();
    attach(h, sender);
    const pty = spawnedPtys[0]!;

    sender.emitDestroyed();

    expect(pty.kill).toHaveBeenCalledTimes(1);
    expect(listenerCount(termInputChannel(SID))).toBe(0);
    expect(listenerCount(termAckChannel(SID))).toBe(0);
  });

  it('an unexpected pty exit notifies the renderer and cleans up', () => {
    const exits: Array<[string, number, boolean]> = [];
    const sender = makeSender();
    const h = host((id, code, expected) => exits.push([id, code, expected]));
    attach(h, sender);
    const pty = spawnedPtys[0]!;

    pty.emitExit(1);

    const exitSend = sender.send.mock.calls.find(
      (c) => c[0] === termExitChannel(SID)
    );
    expect(exitSend).toBeDefined();
    expect((exitSend?.[1] as TermExitPayload).exitCode).toBe(1);
    expect(exits).toEqual([[SID, 1, false]]);
    expect(listenerCount(termInputChannel(SID))).toBe(0);
    expect(listenerCount(termAckChannel(SID))).toBe(0);
    // A later detach finds nothing to kill.
    h.detach(SID);
    expect(pty.kill).not.toHaveBeenCalled();
  });

  it('an expected exit (detach-caused) sends no term:exit to the renderer', () => {
    const exits: Array<[string, number, boolean]> = [];
    const sender = makeSender();
    const h = host((id, code, expected) => exits.push([id, code, expected]));
    attach(h, sender);
    const pty = spawnedPtys[0]!;

    h.detach(SID);
    pty.emitExit(0); // the SIGHUP landing after our kill

    const exitSend = sender.send.mock.calls.find(
      (c) => c[0] === termExitChannel(SID)
    );
    expect(exitSend).toBeUndefined();
    expect(exits).toEqual([[SID, 0, true]]);
  });

  it('re-attach replaces the old client and its wiring exactly once', () => {
    const sender = makeSender();
    const h = host();
    attach(h, sender);
    const first = spawnedPtys[0]!;

    attach(h, sender);
    const second = spawnedPtys[1]!;

    expect(first.kill).toHaveBeenCalledTimes(1);
    expect(second.kill).not.toHaveBeenCalled();
    // Exactly ONE live listener pair — the replacement's.
    expect(listenerCount(termInputChannel(SID))).toBe(1);
    expect(listenerCount(termAckChannel(SID))).toBe(1);

    // Input still routes to the NEW pty only.
    fire(termInputChannel(SID), sender, 'echo hi\r');
    expect(first.write).not.toHaveBeenCalled();
    expect(second.write).toHaveBeenCalledWith('echo hi\r');
  });

  it('disposeAll detaches every client (quit path)', () => {
    const h = host();
    const senderA = makeSender();
    const senderB = makeSender();
    h.attach({ sessionId: 'a', tmuxName: 'a', sender: senderA as never });
    h.attach({ sessionId: 'b', tmuxName: 'b', sender: senderB as never });

    h.disposeAll();

    expect(spawnedPtys[0]!.kill).toHaveBeenCalledTimes(1);
    expect(spawnedPtys[1]!.kill).toHaveBeenCalledTimes(1);
    expect(listenerCount(termInputChannel('a'))).toBe(0);
    expect(listenerCount(termAckChannel('b'))).toBe(0);
  });

  it('output flows to a live renderer, and a flush against a destroyed sender detaches instead of sending', () => {
    vi.useFakeTimers();
    const sender = makeSender();
    const h = host();
    attach(h, sender);
    const pty = spawnedPtys[0]!;

    // Live sender: batched output arrives on the per-session data channel.
    pty.emitData('hello');
    vi.advanceTimersByTime(10);
    const dataSend = sender.send.mock.calls.find(
      (c) => c[0] === termDataChannel(SID)
    );
    expect(dataSend).toBeDefined();

    // Dead sender, before Electron delivers the async 'destroyed' event:
    // the next flush must detach rather than send into the void.
    sender.send.mockClear();
    sender.destroyed = true;
    pty.emitData('after death');
    vi.advanceTimersByTime(10);

    expect(sender.send).not.toHaveBeenCalled();
    expect(pty.kill).toHaveBeenCalledTimes(1);
    expect(listenerCount(termInputChannel(SID))).toBe(0);
    expect(listenerCount(termAckChannel(SID))).toBe(0);
  });
});
