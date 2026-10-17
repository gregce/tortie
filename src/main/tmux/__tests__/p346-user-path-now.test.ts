/**
 * `userPathNow()` (Phase 346, build/p346/SPEC.md §4.5, D8): the captured
 * login-shell PATH once a capture SETTLED, and null before, read
 * synchronously and starting nothing. The phone's offer reads it so it can say
 * what is installed without starting a login shell.
 *
 * NO SHELL RUNS HERE. `node:child_process`'s `spawn` is replaced by a fake
 * child this file answers by hand, so the capture's marker parse is the
 * shipping code and the process is not, and the test can hold a capture open
 * to prove the answer is null until it settles and that a capture a reset
 * left behind never writes it.
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeChild extends EventEmitter {
  pid: number;
  exitCode: number | null;
  stdout: EventEmitter & { setEncoding(): void };
  stderr: EventEmitter;
  kill(): boolean;
  /** The printf the capture asked for, so the answer carries its markers. */
  format: string;
}

const spawned: FakeChild[] = [];

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:child_process')>();
  return {
    ...real,
    spawn: (_file: string, args: readonly string[]) => {
      const child = new EventEmitter() as FakeChild;
      child.pid = 90_000 + spawned.length;
      child.exitCode = null;
      const stdout = new EventEmitter() as FakeChild['stdout'];
      stdout.setEncoding = () => undefined;
      child.stdout = stdout;
      child.stderr = new EventEmitter();
      child.kill = () => true;
      child.format = args[1] ?? '';
      spawned.push(child);
      return child;
    }
  };
});

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const quiet = (): void => undefined;
  return { ...real, getLog: () => ({ error: quiet, warn: quiet, info: quiet, debug: quiet }) };
});

const resolve = await import('../resolve');

/** Answer one fake capture with a PATH, between the markers its printf names, then close it. */
function answer(child: FakeChild, path: string): void {
  const m = /^printf '(.*)%s(.*)' "\$PATH"$/.exec(child.format);
  if (m === null) throw new Error(`the capture asked for an unexpected command: ${child.format}`);
  child.stdout.emit('data', `${m[1] ?? ''}${path}${m[2] ?? ''}`);
  child.exitCode = 0;
  child.emit('exit', 0, null);
  child.emit('close', 0, null);
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 4; i += 1) await new Promise((r) => setImmediate(r));
};

beforeEach(() => {
  spawned.length = 0;
  resolve.resetUserPathCache();
});

afterEach(() => {
  // Close anything a test left open, so no deadline timer outlives it.
  for (const child of spawned) if (child.exitCode === null) answer(child, '/left/open');
  resolve.resetUserPathCache();
});

describe('userPathNow (Phase 346, D8)', () => {
  it('answers null before any capture, and asking it starts nothing', () => {
    expect(resolve.userPathNow()).toBeNull();
    expect(resolve.userPathNow()).toBeNull();
    expect(spawned).toHaveLength(0);
  });

  it('answers null while the capture runs, and the captured PATH once it settled', async () => {
    const pending = resolve.getUserPath();
    expect(spawned).toHaveLength(1);
    expect(resolve.userPathNow()).toBeNull();
    const child = spawned[0];
    if (child === undefined) throw new Error('no capture');
    answer(child, '/scratch/one:/scratch/two');
    const path = await pending;
    await settle();
    expect(path.startsWith('/scratch/one:/scratch/two')).toBe(true);
    // The very string getUserPath answered, unchanged by the slot.
    expect(resolve.userPathNow()).toBe(path);
    // Asking again starts nothing.
    expect(resolve.userPathNow()).toBe(path);
    expect(spawned).toHaveLength(1);
  });

  it('is cleared by a reset, and a capture the reset left behind never writes it', async () => {
    const first = resolve.getUserPath();
    const old = spawned[0];
    if (old === undefined) throw new Error('no capture');
    resolve.resetUserPathCache();
    const second = resolve.getUserPath();
    const fresh = spawned[1];
    if (fresh === undefined) throw new Error('no second capture');
    // The OLD capture settles first: it is not the slot's any more.
    answer(old, '/stale/bin');
    await first;
    await settle();
    expect(resolve.userPathNow()).toBeNull();
    answer(fresh, '/fresh/bin');
    const path = await second;
    await settle();
    expect(resolve.userPathNow()).toBe(path);
    expect(path.startsWith('/fresh/bin')).toBe(true);
    resolve.resetUserPathCache();
    expect(resolve.userPathNow()).toBeNull();
  });

  it('is declared synchronous and starts no capture of its own', () => {
    // A function that answers a value, never a promise.
    expect(resolve.userPathNow.constructor.name).toBe('Function');
    expect(resolve.userPathNow.length).toBe(0);
    resolve.userPathNow();
    expect(spawned).toHaveLength(0);
  });
});
