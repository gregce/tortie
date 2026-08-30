/**
 * Unit tests for src/main/diagnostics/top-stream.ts (Phase 170 fix round).
 *
 * The claims under test: the first block of every child is thrown away, a
 * block is complete on the next header or on quiet, each sample is handed
 * out once, close kills the child synchronously and answers every waiter
 * with null, a child that ran its count is replaced and one that died
 * without answering is not, and after close there is no timer at all.
 */

import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  openTopStream,
  topStreamArgs,
  TOP_STREAM_SAMPLES,
  type TopStream
} from '../top-stream';

const BLOCK_BOOT = `Processes: 3 total, 1 running, 2 sleeping, 30 threads
2026/08/30 16:11:44
Load Avg: 3.83, 6.77, 9.24

PID    %CPU POWER MEM
376    88.1 91.4  1402M-
99587  0.0  0.0   2080K
`;

function block(cpu376: number, mem376 = '1402M'): string {
  return `Processes: 3 total, 1 running, 2 sleeping, 30 threads
2026/08/30 16:11:46
Load Avg: 3.83, 6.77, 9.24

PID    %CPU POWER MEM
376    ${String(cpu376)} 40.0  ${mem376}
99587  0.0  0.0   2080K
`;
}

interface FakeChild extends EventEmitter {
  pid: number;
  stdout: EventEmitter & { setEncoding(): void; destroy(): void };
  exitCode: number | null;
  argv: readonly string[];
}

interface Harness {
  children: FakeChild[];
  killed: FakeChild[];
  tracked: number;
  untracked: number;
  stream: TopStream;
}

function makeHarness(opts: { failSpawn?: boolean } = {}): Harness {
  const h: Harness = {
    children: [],
    killed: [],
    tracked: 0,
    untracked: 0,
    stream: undefined as unknown as TopStream
  };
  h.stream = openTopStream({
    intervalMs: 2_000,
    quietMs: 250,
    spawn: (args) => {
      if (opts.failSpawn === true) throw new Error('ENOENT');
      const stdout = Object.assign(new EventEmitter(), {
        setEncoding: () => undefined,
        destroy: () => undefined
      });
      const child = Object.assign(new EventEmitter(), {
        pid: 1000 + h.children.length,
        stdout,
        exitCode: null,
        argv: args
      }) as FakeChild;
      h.children.push(child);
      return child as unknown as ChildProcess;
    },
    kill: (child) => {
      h.killed.push(child as unknown as FakeChild);
    },
    track: () => {
      h.tracked += 1;
      return () => {
        h.untracked += 1;
      };
    }
  });
  return h;
}

function feed(child: FakeChild, text: string): void {
  child.stdout.emit('data', text);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
}

describe('topStreamArgs', () => {
  it('names a finite sample count and the interval in whole seconds', () => {
    assert.deepEqual(topStreamArgs(2_000), [
      '-l',
      String(TOP_STREAM_SAMPLES),
      '-s',
      '2',
      '-stats',
      'pid,cpu,power,mem'
    ]);
    // Never `-l 0`: a child nobody closed must still end on its own.
    assert.notEqual(topStreamArgs(2_000)[1], '0');
    // Never a zero delay: that is the one shot shape, not a stream.
    assert.equal(topStreamArgs(100)[3], '1');
  });
});

describe('openTopStream', () => {
  let h: Harness;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    h.stream.close();
    vi.useRealTimers();
  });

  it('starts one child and names its pid', () => {
    h = makeHarness();
    assert.equal(h.children.length, 1);
    assert.equal(h.stream.pid, 1000);
    assert.equal(h.tracked, 1);
    assert.equal(h.stream.open, true);
  });

  it('throws the first block away and hands the second to a waiting take', async () => {
    h = makeHarness();
    const child = h.children[0]!;
    const taken = h.stream.take(10_000);
    feed(child, BLOCK_BOOT);
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    // Still waiting: the since boot block is not a sample.
    let resolved = false;
    void taken.then(() => {
      resolved = true;
    });
    await settle();
    assert.equal(resolved, false);
    feed(child, block(39.0));
    await vi.advanceTimersByTimeAsync(250);
    const sample = await taken;
    assert.ok(sample !== null);
    assert.equal(sample.cpuByPid.get(376), 39.0);
    assert.equal(sample.memBytesByPid?.get(376), 1402 * 1024 * 1024);
  });

  it('a block is complete when the next header arrives, before any quiet', async () => {
    h = makeHarness();
    const child = h.children[0]!;
    // Boot block and the first real block arrive glued together, and the
    // second real block's header lands in the same chunk as well.
    feed(child, BLOCK_BOOT + block(12.5) + block(20.0));
    // No clock advance: two blocks closed by headers; the third waits on quiet.
    const first = await h.stream.take(10_000);
    assert.ok(first !== null);
    assert.equal(first.cpuByPid.get(376), 12.5);
    const second = h.stream.take(10_000);
    await vi.advanceTimersByTimeAsync(250);
    const s2 = await second;
    assert.ok(s2 !== null);
    assert.equal(s2.cpuByPid.get(376), 20.0);
  });

  it('hands each sample out once: a second take waits for a new block', async () => {
    h = makeHarness();
    const child = h.children[0]!;
    feed(child, BLOCK_BOOT);
    await vi.advanceTimersByTimeAsync(250);
    feed(child, block(5.0));
    await vi.advanceTimersByTimeAsync(250);
    const one = await h.stream.take(10_000);
    assert.equal(one?.cpuByPid.get(376), 5.0);
    let two: unknown = 'unsettled';
    void h.stream.take(1_000).then((s) => {
      two = s;
    });
    await vi.advanceTimersByTimeAsync(500);
    await settle();
    assert.equal(two, 'unsettled');
    feed(child, block(6.0));
    await vi.advanceTimersByTimeAsync(250);
    await settle();
    const got = two as unknown as { cpuByPid: Map<number, number> };
    assert.equal(got.cpuByPid.get(376), 6.0);
  });

  it('a take past its deadline answers null and leaves no waiter behind', async () => {
    h = makeHarness();
    const taken = h.stream.take(1_000);
    await vi.advanceTimersByTimeAsync(1_000);
    assert.equal(await taken, null);
    // A sample arriving later is held for the next take, not lost.
    const child = h.children[0]!;
    feed(child, BLOCK_BOOT);
    await vi.advanceTimersByTimeAsync(250);
    feed(child, block(7.0));
    await vi.advanceTimersByTimeAsync(250);
    const later = await h.stream.take(1_000);
    assert.equal(later?.cpuByPid.get(376), 7.0);
  });

  it('CLOSE KILLS THE CHILD SYNCHRONOUSLY, answers every waiter null, and leaves no timer', async () => {
    h = makeHarness();
    const child = h.children[0]!;
    feed(child, BLOCK_BOOT);
    const waiting = [h.stream.take(10_000), h.stream.take(10_000)];
    h.stream.close();
    assert.deepEqual(h.killed, [child]);
    assert.equal(h.stream.open, false);
    assert.equal(h.stream.pid, null);
    assert.equal(h.untracked, 1);
    assert.equal(vi.getTimerCount(), 0);
    assert.deepEqual(await Promise.all(waiting), [null, null]);
    // A take after close is null at once, and a late chunk starts nothing.
    assert.equal(await h.stream.take(10_000), null);
    feed(child, block(1.0));
    await vi.advanceTimersByTimeAsync(1_000);
    assert.equal(vi.getTimerCount(), 0);
    assert.equal(h.children.length, 1);
    h.stream.close();
    assert.equal(h.killed.length, 1);
  });

  it('a child that ran its count is replaced; one that answered nothing is not', async () => {
    h = makeHarness();
    const first = h.children[0]!;
    feed(first, BLOCK_BOOT);
    await vi.advanceTimersByTimeAsync(250);
    feed(first, block(3.0));
    await vi.advanceTimersByTimeAsync(250);
    assert.equal((await h.stream.take(1_000))?.cpuByPid.get(376), 3.0);
    first.emit('exit', 0, null);
    assert.equal(h.children.length, 2);
    assert.equal(h.stream.pid, 1001);
    // The replacement's first block is since boot again and is dropped.
    const second = h.children[1]!;
    feed(second, BLOCK_BOOT);
    await vi.advanceTimersByTimeAsync(250);
    feed(second, block(4.0));
    await vi.advanceTimersByTimeAsync(250);
    assert.equal((await h.stream.take(1_000))?.cpuByPid.get(376), 4.0);
    // Now a child that dies without one valid sample: no third spawn.
    second.emit('exit', 0, null);
    assert.equal(h.children.length, 3);
    const third = h.children[2]!;
    third.emit('exit', 1, null);
    assert.equal(h.children.length, 3);
    assert.equal(h.stream.pid, null);
    assert.equal(await h.stream.take(1_000), null);
  });

  it('a spawn that throws answers null at once and never throws itself', async () => {
    h = makeHarness({ failSpawn: true });
    assert.equal(h.children.length, 0);
    assert.equal(h.stream.pid, null);
    assert.equal(await h.stream.take(10_000), null);
    h.stream.close();
    assert.equal(h.killed.length, 0);
  });

  it('a stray tail with no header is ignored, not a sample', async () => {
    h = makeHarness();
    const child = h.children[0]!;
    feed(child, BLOCK_BOOT);
    await vi.advanceTimersByTimeAsync(250);
    feed(child, '376    99.0 40.0  1402M\n');
    await vi.advanceTimersByTimeAsync(250);
    let settled: unknown = 'unsettled';
    void h.stream.take(500).then((s) => {
      settled = s;
    });
    await vi.advanceTimersByTimeAsync(500);
    await settle();
    assert.equal(settled, null);
  });
});
