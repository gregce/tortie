/**
 * Unit tests for src/main/tmux/control-client.ts (Phase 71, M4).
 *
 * THERE WAS NO TEST FOR THIS CLASS BEFORE THIS RUNG, only one for the parser
 * beside it. Injecting the transport is what made one possible: the class used
 * to name `ensureServer()` and `tmuxArgs()` inside `start()`, so driving it
 * meant starting a real tmux server.
 *
 * NOTHING HERE SPAWNS A PROCESS. `node:child_process`'s `spawn` is replaced by a
 * fake child whose streams are in this file, so every property below is about
 * what the class DOES with the bytes rather than about tmux.
 *
 * What is checked, and each one is a property this rung depends on:
 *
 *  - the transport's precheck runs BEFORE the spawn, on the first start and on
 *    every reconnect, which is research 51 section 3's rule that a remote
 *    reconnect must never call a local `ensureServer()`
 *  - a precheck that rejects spawns nothing at all
 *  - the program and the argv come from the transport's plan and nowhere else
 *  - the FIVE line greeting the dialect probe measured leaves the client
 *    connected, with the three notifications after the block handled as
 *    notifications
 *  - a command sent before the greeting waits in the outbox and is written once
 *    the block closes
 *  - `%exit` fails every pending command with TMUX_UNREACHABLE and names the
 *    machine
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { GmuxError } from '../../errors';

// ---------------------------------------------------------------------------
// The fake child
// ---------------------------------------------------------------------------

class FakeStream extends EventEmitter {
  written: string[] = [];
  setEncoding(): void {
    /* the class calls it; nothing here needs it */
  }
  write(chunk: string): boolean {
    this.written.push(chunk);
    return true;
  }
}

class FakeChild extends EventEmitter {
  stdout = new FakeStream();
  stderr = new FakeStream();
  stdin = new FakeStream();
  killed = false;
  kill(): boolean {
    this.killed = true;
    return true;
  }
}

/** Every spawn this test file saw, in order. */
let spawns: { file: string; argv: string[]; env: NodeJS.ProcessEnv }[] = [];
let children: FakeChild[] = [];

vi.mock('node:child_process', () => ({
  spawn: (file: string, argv: string[], options: { env: NodeJS.ProcessEnv }) => {
    spawns.push({ file, argv: [...argv], env: options.env });
    const child = new FakeChild();
    children.push(child);
    return child;
  }
}));

// The local transport reaches the supervisor, which reaches Electron and the
// disk. No test here uses it, and replacing it keeps the import graph inert.
vi.mock('../supervisor', () => ({
  ensureServer: () => Promise.reject(new Error('the local transport is not used here')),
  tmuxArgs: () => []
}));

const { TmuxControlClient, CONTROL_ATTACH_ARGS } = await import('../control-client');
type Client = InstanceType<typeof TmuxControlClient>;

/** What the transport recorded, so the ORDER of precheck and spawn is testable. */
let order: string[] = [];
let precheckFails: Error | null = null;

function transport(machineId = 'studio'): {
  machineId: string;
  precheck: () => Promise<void>;
  plan: () => Promise<{ file: string; argv: readonly string[] }>;
  env: () => NodeJS.ProcessEnv;
} {
  return {
    machineId,
    precheck(): Promise<void> {
      order.push('precheck');
      return precheckFails === null
        ? Promise.resolve()
        : Promise.reject(precheckFails);
    },
    plan(): Promise<{ file: string; argv: readonly string[] }> {
      order.push('plan');
      return Promise.resolve({
        file: '/usr/bin/ssh',
        argv: ['-o', 'BatchMode=yes', 'studio.example', 'tmux -C new-session']
      });
    },
    env(): NodeJS.ProcessEnv {
      return { GMUX_FAKE: '1' };
    }
  };
}

/** Feed one chunk of stdout to the client's line reader. */
function feed(index: number, text: string): void {
  children[index]?.stdout.emit('data', text);
}

/** The five line greeting `build/probe-control-dialect.mjs` measured. */
const GREETING =
  '%begin 1786998987 275 0\n' +
  '%end 1786998987 275 0\n' +
  '%window-add @0\n' +
  '%sessions-changed\n' +
  '%session-changed $0 gmux-control\n';

let client: Client | null = null;

beforeEach(() => {
  spawns = [];
  children = [];
  order = [];
  precheckFails = null;
});

afterEach(() => {
  client?.stop();
  client = null;
  vi.useRealTimers();
});

describe('the injected transport', () => {
  it('runs the precheck before the spawn and uses the plan it returns', async () => {
    client = new TmuxControlClient(transport());
    await client.start();

    expect(order).toEqual(['precheck', 'plan']);
    expect(spawns).toHaveLength(1);
    expect(spawns[0]?.file).toBe('/usr/bin/ssh');
    expect(spawns[0]?.argv).toEqual([
      '-o',
      'BatchMode=yes',
      'studio.example',
      'tmux -C new-session'
    ]);
    expect(spawns[0]?.env).toEqual({ GMUX_FAKE: '1' });
  });

  it('names the machine, so a log line says which one', () => {
    client = new TmuxControlClient(transport('attic'));
    expect(client.machineId).toBe('attic');
  });

  it('spawns nothing when the precheck rejects', async () => {
    precheckFails = new Error('that machine did not answer');
    client = new TmuxControlClient(transport());
    await expect(client.start()).rejects.toThrow('that machine did not answer');
    expect(order).toEqual(['precheck']);
    expect(spawns).toHaveLength(0);
  });

  it('runs the precheck again on every reconnect', async () => {
    vi.useFakeTimers();
    client = new TmuxControlClient(transport());
    await client.start();
    expect(order).toEqual(['precheck', 'plan']);

    // The child dies. The backoff is 500 ms for the first retry.
    children[0]?.emit('exit');
    await vi.advanceTimersByTimeAsync(600);

    expect(order).toEqual(['precheck', 'plan', 'precheck', 'plan']);
    expect(spawns).toHaveLength(2);
  });

  it('carries the same attach arguments for every machine', () => {
    expect([...CONTROL_ATTACH_ARGS]).toEqual([
      '-C',
      'new-session',
      '-A',
      '-s',
      'gmux-control'
    ]);
  });
});

describe('the greeting the dialect probe measured', () => {
  it('reaches connected on the guard pair and keeps the three notifications', async () => {
    client = new TmuxControlClient(transport());
    const seen: string[] = [];
    client.on('connected', () => seen.push('connected'));
    client.on('sessions-changed', () => seen.push('sessions-changed'));
    client.on('notification', (event) => seen.push(`notification:${event.kind}`));
    await client.start();

    expect(client.connected).toBe(false);
    feed(0, GREETING);

    expect(client.connected).toBe(true);
    expect(seen[0]).toBe('connected');
    // The three lines AFTER the block are notifications, not block body.
    expect(seen).toContain('sessions-changed');
    expect(seen).toContain('notification:other-notification');
    expect(seen).toContain('notification:session-changed');
  });

  it('holds the first command in the outbox until the block closes', async () => {
    client = new TmuxControlClient(transport());
    await client.start();

    // `refresh-client -f no-output` is enqueued inside start(), before any
    // greeting has arrived. Nothing may be written yet.
    expect(children[0]?.stdin.written).toEqual([]);

    feed(0, GREETING);
    expect(children[0]?.stdin.written).toEqual(['refresh-client -f no-output\n']);
  });
});

describe('death', () => {
  it('fails every pending command with TMUX_UNREACHABLE and names the machine', async () => {
    client = new TmuxControlClient(transport('studio'));
    await client.start();
    feed(0, GREETING);

    const pending = client.sendCommand('list-sessions');
    feed(0, '%exit\n');

    const err = await pending.catch((one: unknown) => one);
    expect(err).toBeInstanceOf(GmuxError);
    expect((err as GmuxError).payload.code).toBe('TMUX_UNREACHABLE');
    expect((err as GmuxError).payload.message).toContain('studio');
  });

  it('refuses a command when there is no child, naming the machine', async () => {
    client = new TmuxControlClient(transport('attic'));
    const err = await client.sendCommand('list-sessions').catch((one: unknown) => one);
    expect(err).toBeInstanceOf(GmuxError);
    expect((err as GmuxError).payload.message).toContain('attic');
  });
});
