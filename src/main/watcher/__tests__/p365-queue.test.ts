/**
 * Phase 365: the ONE queue, its server and its wire, over fakes
 * (build/p365/SPEC.md §4.1, D2 to D4, §9.3).
 *
 * Check type: contract test over an injected native module, an injected
 * existence check and an injected clock. Nothing here opens an FSEvents stream;
 * `p365-process.native.test.ts` is the same queue over the real module.
 *
 * What it pins:
 *  - ONE chain, FIFO, ONE native call in flight, over 400 mixed operations
 *    whose native calls settle after a random number of event-loop turns;
 *  - the existence check asked AT THE TURN, so a folder removed while its
 *    watch waited is "nothing to watch" and the native module is never called;
 *  - the grace: a close whose folder is gone is not on the chain before
 *    `WATCH_GONE_GRACE_MS`, never holds it, and a watch of the SAME folder
 *    made during the grace joins after that close;
 *  - the note at `WATCH_TURN_NOTE_MS`, at most once a minute per kind;
 *  - a native subscribe that throws or rejects answers `refused`;
 *  - the server: `ready` first, a batch never before its `watching`, nothing
 *    after a close, a graced close answered at once, a malformed message
 *    dropped whole and counted, and `stop` closing what it holds;
 *  - the wire's two validators, field by field.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WATCH_GONE_GRACE_MS,
  WATCH_TURN_NOTE_EVERY_MS,
  WATCH_TURN_NOTE_MS,
  createWatchQueue,
  serveWatchQueue,
  type NativeCallback,
  type NativeSubscription,
  type NativeWatcher,
  type TurnNote,
  type WatchQueueDeps
} from '../process/queue';
import {
  WIRE_ERROR_MAX_CHARS,
  errorText,
  fromWatcherOf,
  toWatcherOf,
  type FromWatcher
} from '../process/wire';

/** One real event-loop turn. Fake timers in this file fake setTimeout and Date only. */
const turn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const turns = async (n: number): Promise<void> => {
  for (let i = 0; i < n; i += 1) await turn();
};

interface Recorded {
  dir: string;
  callback: NativeCallback;
  ignore: (string | RegExp)[];
  unsubscribed: boolean;
}

/**
 * A native module that records every call, how many are in flight at once,
 * and settles each call after `delay()` event-loop turns.
 */
function recordingNative(delay: () => number = () => 0): NativeWatcher & {
  calls: string[];
  subs: Recorded[];
  inFlight: number;
  maxInFlight: number;
} {
  const native = {
    calls: [] as string[],
    subs: [] as Recorded[],
    inFlight: 0,
    maxInFlight: 0,
    async subscribe(
      dir: string,
      callback: NativeCallback,
      options: { ignore: (string | RegExp)[] }
    ): Promise<NativeSubscription> {
      native.inFlight += 1;
      native.maxInFlight = Math.max(native.maxInFlight, native.inFlight);
      native.calls.push(`subscribe ${dir}`);
      const rec: Recorded = { dir, callback, ignore: options.ignore, unsubscribed: false };
      native.subs.push(rec);
      await turns(delay());
      native.inFlight -= 1;
      return {
        unsubscribe: async (): Promise<void> => {
          native.inFlight += 1;
          native.maxInFlight = Math.max(native.maxInFlight, native.inFlight);
          native.calls.push(`unsubscribe ${dir}`);
          await turns(delay());
          rec.unsubscribed = true;
          native.inFlight -= 1;
        }
      };
    }
  };
  return native;
}

function depsOver(native: NativeWatcher, over: Partial<WatchQueueDeps> = {}): WatchQueueDeps {
  return {
    native,
    exists: () => true,
    now: () => Date.now(),
    setTimeout: (callback, ms) => setTimeout(callback, ms),
    note: () => undefined,
    ...over
  };
}

describe('the one queue', () => {
  it('runs 400 mixed operations one native call at a time, in the order they were asked', async () => {
    let seed = 365;
    const random = (): number => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    const native = recordingNative(() => Math.floor(random() * 4));
    const queue = createWatchQueue(depsOver(native));
    const asked: string[] = [];
    const live: number[] = [];
    const pending: Promise<unknown>[] = [];
    for (let i = 0; i < 400; i += 1) {
      // About half are closes of a watch already answered; the rest are watches.
      if (live.length > 0 && random() < 0.5) {
        const index = Math.floor(random() * live.length);
        const sub = live.splice(index, 1)[0]!;
        const dir = native.subs.find((_, n) => n === sub - 1)?.dir ?? '';
        asked.push(`unsubscribe ${dir}`);
        pending.push(queue.close(sub));
      } else {
        const dir = `/scratch/f${i}`;
        asked.push(`subscribe ${dir}`);
        pending.push(
          queue.watch(dir, [], () => undefined).then((answer) => {
            if (answer.kind === 'watching' && answer.sub !== null) live.push(answer.sub);
          })
        );
      }
      // Some operations are asked in a burst, some after the chain moved.
      if (random() < 0.3) await turns(Math.floor(random() * 3));
    }
    await Promise.all(pending);
    await turns(4);
    expect(native.maxInFlight).toBe(1);
    // A close is only asked once its watch has answered, so every native call
    // is in exactly the order it was asked.
    expect(native.calls).toEqual(asked);
    expect(queue.observe().onChain).toBe(0);
  });

  it('asks whether the folder exists AT THE TURN, and a folder that is not there costs no native call', async () => {
    const native = recordingNative();
    let release!: () => void;
    const slow: NativeWatcher = {
      subscribe: (dir, callback, options) => {
        if (dir === '/scratch/slow') {
          return new Promise<NativeSubscription>((resolve) => {
            release = () => resolve({ unsubscribe: () => Promise.resolve() });
          });
        }
        return native.subscribe(dir, callback, options);
      }
    };
    const present = new Set(['/scratch/slow', '/scratch/b']);
    const asked: string[] = [];
    const queue = createWatchQueue(
      depsOver(slow, {
        exists: (dir) => {
          asked.push(dir);
          return present.has(dir);
        }
      })
    );
    const first = queue.watch('/scratch/slow', [], () => undefined);
    const second = queue.watch('/scratch/b', [], () => undefined);
    await turns(3);
    // The second is queued behind the first and has not been asked about yet.
    expect(asked).toEqual(['/scratch/slow']);
    present.delete('/scratch/b');
    release();
    expect(await first).toMatchObject({ kind: 'watching', sub: 1 });
    expect(await second).toMatchObject({ kind: 'watching', sub: null });
    expect(asked).toEqual(['/scratch/slow', '/scratch/b']);
    expect(native.calls).toEqual([]);
  });

  it('calls the native subscribe in the same synchronous stretch as the check, with nothing awaited between', async () => {
    // Anything queued while the check answers runs only if the turn yields
    // before the subscribe. It must not.
    let between = false;
    let sawBetween: boolean | null = null;
    const native: NativeWatcher = {
      subscribe: () => {
        sawBetween = between;
        return Promise.resolve({ unsubscribe: () => Promise.resolve() });
      }
    };
    const queue = createWatchQueue(
      depsOver(native, {
        exists: () => {
          queueMicrotask(() => {
            between = true;
          });
          return true;
        }
      })
    );
    await queue.watch('/scratch/a', [], () => undefined);
    expect(sawBetween).toBe(false);
  });

  it('answers a folder that is there with its subscription, the ignore list passed whole', async () => {
    const native = recordingNative();
    const queue = createWatchQueue(depsOver(native));
    const ignore = ['/scratch/a/.git', /^vendor(?:\/|$)/];
    const answer = await queue.watch('/scratch/a', ignore, () => undefined);
    expect(answer).toMatchObject({ kind: 'watching', sub: 1 });
    expect(native.subs[0]!.ignore).toEqual(ignore);
    expect(queue.observe().live).toBe(1);
    await queue.close(1);
    expect(native.subs[0]!.unsubscribed).toBe(true);
    expect(queue.observe().live).toBe(0);
  });

  it('hands every watch a callback of its own, because the library keys callbacks by identity', async () => {
    const native = recordingNative();
    const queue = createWatchQueue(depsOver(native));
    const same = (): void => undefined;
    await queue.watch('/scratch/a', [], same);
    await queue.watch('/scratch/a', [], same);
    expect(native.subs[0]!.callback).not.toBe(native.subs[1]!.callback);
  });

  it('answers refused, with the message, when the native subscribe throws or rejects', async () => {
    const thrower: NativeWatcher = {
      subscribe: (dir) => {
        if (dir === '/scratch/sync') throw new Error('Expected a string');
        return Promise.reject(new Error('Permission denied'));
      }
    };
    const queue = createWatchQueue(depsOver(thrower));
    expect(await queue.watch('/scratch/sync', [], () => undefined)).toMatchObject({
      kind: 'refused',
      error: 'Expected a string'
    });
    expect(await queue.watch('/scratch/async', [], () => undefined)).toMatchObject({
      kind: 'refused',
      error: 'Permission denied'
    });
    // The chain is not stuck behind a refusal.
    expect(queue.observe()).toEqual({ live: 0, onChain: 0, graced: 0 });
  });

  it("keeps a consumer's throw away from the library's callback", async () => {
    const native = recordingNative();
    const queue = createWatchQueue(depsOver(native));
    await queue.watch('/scratch/a', [], () => {
      throw new Error('a site bug');
    });
    expect(() => native.subs[0]!.callback(null, [{ type: 'create', path: '/scratch/a/x' }])).not.toThrow();
  });
});

describe('the grace', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('puts a close whose folder is gone on the chain only after the grace, and holds nothing else', async () => {
    const native = recordingNative();
    const present = new Set(['/scratch/gone', '/scratch/other']);
    const queue = createWatchQueue(depsOver(native, { exists: (dir) => present.has(dir) }));
    const watched = await queue.watch('/scratch/gone', [], () => undefined);
    expect(watched).toMatchObject({ sub: 1 });
    present.delete('/scratch/gone');
    let graced = false;
    let closed = false;
    void queue.close(1, () => {
      graced = true;
    }).then(() => {
      closed = true;
    });
    // Told at once, synchronously, that this close waits.
    expect(graced).toBe(true);
    expect(queue.observe().graced).toBe(1);
    // A watch of ANOTHER folder made during the grace is answered before it.
    const other = await queue.watch('/scratch/other', [], () => undefined);
    expect(other).toMatchObject({ kind: 'watching', sub: 2 });
    await turns(4);
    expect(native.calls).toEqual(['subscribe /scratch/gone', 'subscribe /scratch/other']);
    expect(closed).toBe(false);
    await vi.advanceTimersByTimeAsync(WATCH_GONE_GRACE_MS - 1);
    await turns(4);
    expect(native.calls).not.toContain('unsubscribe /scratch/gone');
    await vi.advanceTimersByTimeAsync(1);
    await turns(4);
    expect(native.calls.at(-1)).toBe('unsubscribe /scratch/gone');
    expect(closed).toBe(true);
    expect(queue.observe().graced).toBe(0);
  });

  it('closes a folder that is still there at once, with no grace', async () => {
    const native = recordingNative();
    const queue = createWatchQueue(depsOver(native));
    await queue.watch('/scratch/here', [], () => undefined);
    let graced = false;
    await queue.close(1, () => {
      graced = true;
    });
    expect(graced).toBe(false);
    expect(native.calls).toEqual(['subscribe /scratch/here', 'unsubscribe /scratch/here']);
  });

  it('makes a watch of the SAME folder made during its graced close join after that close', async () => {
    // The library shares one native watcher per folder and ignore set, and a
    // deleted root's stream has already been stopped by the FSEvents thread.
    // A subscribe before the old one is dropped would join that dead stream.
    const native = recordingNative();
    const present = new Set(['/scratch/slot']);
    const queue = createWatchQueue(depsOver(native, { exists: (dir) => present.has(dir) }));
    await queue.watch('/scratch/slot', [], () => undefined);
    present.delete('/scratch/slot');
    const closing = queue.close(1);
    present.add('/scratch/slot'); // made again
    const again = queue.watch('/scratch/slot', [], () => undefined);
    await turns(4);
    expect(native.calls).toEqual(['subscribe /scratch/slot']);
    await vi.advanceTimersByTimeAsync(WATCH_GONE_GRACE_MS);
    await closing;
    expect(await again).toMatchObject({ kind: 'watching', sub: 2 });
    expect(native.calls).toEqual(['subscribe /scratch/slot', 'unsubscribe /scratch/slot', 'subscribe /scratch/slot']);
  });

  it('answers a second close of one subscription with the first close', async () => {
    const native = recordingNative();
    const present = new Set(['/scratch/a']);
    const queue = createWatchQueue(depsOver(native, { exists: (dir) => present.has(dir) }));
    await queue.watch('/scratch/a', [], () => undefined);
    present.delete('/scratch/a');
    const one = queue.close(1);
    const two = queue.close(1);
    expect(two).toBe(one);
    await vi.advanceTimersByTimeAsync(WATCH_GONE_GRACE_MS);
    await one;
    expect(native.calls.filter((c) => c.startsWith('unsubscribe'))).toHaveLength(1);
    // An unknown subscription closes nothing and settles.
    await expect(queue.close(99)).resolves.toBeUndefined();
  });
});

describe('the turn note', () => {
  it('notes a turn that waited past the bound, once a minute per kind of turn', async () => {
    let clock = 1_000_000;
    const notes: TurnNote[] = [];
    let release!: () => void;
    let held = false;
    const native: NativeWatcher = {
      subscribe: () => {
        if (!held) {
          held = true;
          return new Promise<NativeSubscription>((resolve) => {
            release = () => resolve({ unsubscribe: () => Promise.resolve() });
          });
        }
        return Promise.resolve({ unsubscribe: () => Promise.resolve() });
      }
    };
    const queue = createWatchQueue(
      depsOver(native, { now: () => clock, note: (note) => notes.push(note) })
    );
    const first = queue.watch('/scratch/held', [], () => undefined);
    const second = queue.watch('/scratch/behind', [], () => undefined);
    await turns(2);
    clock += WATCH_TURN_NOTE_MS + 500;
    release();
    await first;
    expect(await second).toMatchObject({ waitedMs: WATCH_TURN_NOTE_MS + 500 });
    expect(notes).toEqual([{ op: 'watch', waitedMs: WATCH_TURN_NOTE_MS + 500, behind: 1 }]);

    // A turn that waited exactly the bound is not noted.
    held = false;
    const third = queue.watch('/scratch/held2', [], () => undefined);
    const fourth = queue.watch('/scratch/behind2', [], () => undefined);
    await turns(2);
    clock += WATCH_TURN_NOTE_MS;
    release();
    await Promise.all([third, fourth]);
    expect(notes).toHaveLength(1);

    // A long wait inside the same minute is not noted again for the same kind.
    held = false;
    const fifth = queue.watch('/scratch/held3', [], () => undefined);
    const sixth = queue.watch('/scratch/behind3', [], () => undefined);
    await turns(2);
    clock += WATCH_TURN_NOTE_MS * 2;
    release();
    await Promise.all([fifth, sixth]);
    expect(notes).toHaveLength(1);

    // A minute later it is.
    clock += WATCH_TURN_NOTE_EVERY_MS;
    held = false;
    const seventh = queue.watch('/scratch/held4', [], () => undefined);
    const eighth = queue.watch('/scratch/behind4', [], () => undefined);
    await turns(2);
    clock += WATCH_TURN_NOTE_MS + 1;
    release();
    await Promise.all([seventh, eighth]);
    expect(notes).toHaveLength(2);
    expect(notes[1]).toMatchObject({ op: 'watch', waitedMs: WATCH_TURN_NOTE_MS + 1 });
  });

  it('notes a close that waited, as its own kind', async () => {
    let clock = 0;
    const notes: TurnNote[] = [];
    let release!: () => void;
    let held = false;
    const native: NativeWatcher = {
      subscribe: () => {
        if (held) {
          return new Promise<NativeSubscription>((resolve) => {
            release = () => resolve({ unsubscribe: () => Promise.resolve() });
          });
        }
        return Promise.resolve({ unsubscribe: () => Promise.resolve() });
      }
    };
    const queue = createWatchQueue(
      depsOver(native, { now: () => clock, note: (note) => notes.push(note) })
    );
    await queue.watch('/scratch/a', [], () => undefined);
    held = true;
    const blocking = queue.watch('/scratch/b', [], () => undefined);
    const closing = queue.close(1);
    await turns(2);
    clock += WATCH_TURN_NOTE_MS + 10;
    release();
    await Promise.all([blocking, closing]);
    expect(notes).toEqual([{ op: 'close', waitedMs: WATCH_TURN_NOTE_MS + 10, behind: 1 }]);
  });
});

describe('the server, the process side of the wire', () => {
  function serve(over: { exists?: (dir: string) => boolean; native?: NativeWatcher } = {}) {
    const native = recordingNative();
    const posted: FromWatcher[] = [];
    const server = serveWatchQueue(
      {
        native: over.native ?? native,
        exists: over.exists ?? (() => true),
        now: () => Date.now(),
        setTimeout: (callback, ms) => setTimeout(callback, ms)
      },
      (message) => posted.push(structuredClone(message))
    );
    return { native, posted, server };
  }

  it('says ready first, answers a watch, and forwards a batch reduced to its two fields', async () => {
    const { native, posted, server } = serve();
    expect(posted).toEqual([{ kind: 'ready' }]);
    server.receive({ kind: 'watch', req: 7, dir: '/scratch/a', ignorePaths: ['/scratch/a/.git'], ignorePatterns: ['^x(?:\\/|$)'] });
    await turns(4);
    expect(posted[1]).toMatchObject({ kind: 'watching', req: 7, sub: 1 });
    // The pattern crossed as a source and is a RegExp again on this side.
    expect(native.subs[0]!.ignore[0]).toBe('/scratch/a/.git');
    expect(native.subs[0]!.ignore[1]).toBeInstanceOf(RegExp);
    expect((native.subs[0]!.ignore[1] as RegExp).source).toBe('^x(?:\\/|$)');
    native.subs[0]!.callback(null, [{ type: 'update', path: '/scratch/a/f', extra: 1 } as never]);
    native.subs[0]!.callback(new Error('Events were dropped by the FSEvents client. File system must be re-scanned.'), []);
    expect(posted.slice(2)).toEqual([
      { kind: 'events', sub: 1, error: null, events: [{ type: 'update', path: '/scratch/a/f' }] },
      {
        kind: 'events',
        sub: 1,
        error: 'Events were dropped by the FSEvents client. File system must be re-scanned.',
        events: []
      }
    ]);
  });

  it('never posts a batch before its watching answer: one that came first is held, then sent in order', async () => {
    let early!: NativeCallback;
    const native: NativeWatcher = {
      subscribe: (_dir, callback) => {
        early = callback;
        // The stream started and delivered before the subscribe settled.
        callback(null, [{ type: 'create', path: '/scratch/a/1' }]);
        return Promise.resolve({ unsubscribe: () => Promise.resolve() });
      }
    };
    const { posted, server } = serve({ native });
    server.receive({ kind: 'watch', req: 1, dir: '/scratch/a', ignorePaths: [], ignorePatterns: [] });
    await turns(4);
    early(null, [{ type: 'create', path: '/scratch/a/2' }]);
    expect(posted.map((m) => m.kind)).toEqual(['ready', 'watching', 'events', 'events']);
    expect(posted[2]).toMatchObject({ events: [{ path: '/scratch/a/1' }] });
    expect(posted[3]).toMatchObject({ events: [{ path: '/scratch/a/2' }] });
  });

  it('answers a missing folder with sub null and asks the native module nothing', async () => {
    const { native, posted, server } = serve({ exists: () => false });
    server.receive({ kind: 'watch', req: 3, dir: '/scratch/none', ignorePaths: [], ignorePatterns: [] });
    await turns(4);
    expect(posted[1]).toEqual({ kind: 'watching', req: 3, sub: null, waitedMs: expect.any(Number) as number });
    expect(native.calls).toEqual([]);
  });

  it('answers refused with the library words when the native subscribe fails', async () => {
    const native: NativeWatcher = { subscribe: () => Promise.reject(new Error('Permission denied')) };
    const { posted, server } = serve({ native });
    server.receive({ kind: 'watch', req: 4, dir: '/scratch/p', ignorePaths: [], ignorePatterns: [] });
    await turns(4);
    expect(posted[1]).toEqual({ kind: 'refused', req: 4, error: 'Permission denied' });
  });

  it('closes, and sends nothing of that subscription after the close was asked', async () => {
    const { native, posted, server } = serve();
    server.receive({ kind: 'watch', req: 1, dir: '/scratch/a', ignorePaths: [], ignorePatterns: [] });
    await turns(4);
    server.receive({ kind: 'close', req: 2, sub: 1 });
    native.subs[0]!.callback(null, [{ type: 'update', path: '/scratch/a/late' }]);
    await turns(4);
    expect(posted.map((m) => m.kind)).toEqual(['ready', 'watching', 'closed']);
    expect(posted[2]).toEqual({ kind: 'closed', req: 2 });
    expect(native.subs[0]!.unsubscribed).toBe(true);
  });

  it('answers a graced close at once, and runs its native close after the grace', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      const present = new Set(['/scratch/g']);
      const { native, posted, server } = serve({ exists: (dir) => present.has(dir) });
      server.receive({ kind: 'watch', req: 1, dir: '/scratch/g', ignorePaths: [], ignorePatterns: [] });
      await turns(4);
      present.delete('/scratch/g');
      server.receive({ kind: 'close', req: 2, sub: 1 });
      // Synchronously: main's 2 s close bound must never meet a 2 s grace.
      expect(posted.at(-1)).toEqual({ kind: 'closed', req: 2 });
      expect(native.subs[0]!.unsubscribed).toBe(false);
      await vi.advanceTimersByTimeAsync(WATCH_GONE_GRACE_MS);
      await turns(4);
      expect(native.subs[0]!.unsubscribed).toBe(true);
      expect(posted.filter((m) => m.kind === 'closed')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a malformed message whole and counts it', () => {
    const { native, posted, server } = serve();
    server.receive({ kind: 'watch', req: 1, dir: '/scratch/a', ignorePaths: [], ignorePatterns: ['('] });
    server.receive({ kind: 'watch', req: -1, dir: '/scratch/a', ignorePaths: [], ignorePatterns: [] });
    server.receive({ kind: 'close', req: 1 });
    server.receive({ kind: 'snapshot', req: 1, dir: '/scratch/a' });
    server.receive('watch /scratch/a');
    expect(server.dropped()).toBe(5);
    expect(posted).toEqual([{ kind: 'ready' }]);
    expect(native.calls).toEqual([]);
  });

  it('closes everything it holds when it is stopped, and posts nothing after', async () => {
    const { native, posted, server } = serve();
    server.receive({ kind: 'watch', req: 1, dir: '/scratch/a', ignorePaths: [], ignorePatterns: [] });
    server.receive({ kind: 'watch', req: 2, dir: '/scratch/b', ignorePaths: [], ignorePatterns: [] });
    await turns(6);
    const before = posted.length;
    server.stop();
    native.subs[0]!.callback(null, [{ type: 'update', path: '/scratch/a/x' }]);
    server.receive({ kind: 'watch', req: 3, dir: '/scratch/c', ignorePaths: [], ignorePatterns: [] });
    await turns(6);
    expect(native.subs.every((s) => s.unsubscribed)).toBe(true);
    expect(native.calls).not.toContain('subscribe /scratch/c');
    expect(posted).toHaveLength(before);
  });
});

describe('the wire', () => {
  it('rebuilds a good message from exactly the fields its type names', () => {
    expect(
      toWatcherOf({ kind: 'watch', req: 1, dir: '/a', ignorePaths: ['/a/.git'], ignorePatterns: ['^x$'], extra: true })
    ).toEqual({ kind: 'watch', req: 1, dir: '/a', ignorePaths: ['/a/.git'], ignorePatterns: ['^x$'] });
    expect(toWatcherOf({ kind: 'close', req: 2, sub: 9, extra: true })).toEqual({ kind: 'close', req: 2, sub: 9 });
    expect(fromWatcherOf({ kind: 'watching', req: 1, sub: null, waitedMs: 0, extra: 1 })).toEqual({
      kind: 'watching',
      req: 1,
      sub: null,
      waitedMs: 0
    });
    expect(
      fromWatcherOf({ kind: 'events', sub: 1, error: null, events: [{ type: 'delete', path: '/a/b', inode: 4 }] })
    ).toEqual({ kind: 'events', sub: 1, error: null, events: [{ type: 'delete', path: '/a/b' }] });
    expect(fromWatcherOf({ kind: 'note', what: 'turn-wait', op: 'close', waitedMs: 2_100, behind: 3 })).toEqual({
      kind: 'note',
      what: 'turn-wait',
      op: 'close',
      waitedMs: 2_100,
      behind: 3
    });
  });

  it('refuses every malformed message whole', () => {
    const toBad: unknown[] = [
      null,
      [],
      { kind: 'watch', req: 1.5, dir: '/a', ignorePaths: [], ignorePatterns: [] },
      { kind: 'watch', req: 1, dir: '', ignorePaths: [], ignorePatterns: [] },
      { kind: 'watch', req: 1, dir: 'x'.repeat(4097), ignorePaths: [], ignorePatterns: [] },
      { kind: 'watch', req: 1, dir: '/a', ignorePaths: [''], ignorePatterns: [] },
      { kind: 'watch', req: 1, dir: '/a', ignorePaths: [/x/], ignorePatterns: [] },
      { kind: 'watch', req: 1, dir: '/a', ignorePaths: [], ignorePatterns: ['[unclosed'] },
      { kind: 'watch', req: 1, dir: '/a', ignorePaths: 'nope', ignorePatterns: [] },
      { kind: 'close', req: 1, sub: '1' },
      { kind: 'subscribe', req: 1, dir: '/a' }
    ];
    for (const bad of toBad) expect(toWatcherOf(bad)).toBeNull();
    const fromBad: unknown[] = [
      { kind: 'watching', req: 1, sub: -1, waitedMs: 0 },
      { kind: 'watching', req: 1, sub: 1 },
      { kind: 'refused', req: 1, error: 'x'.repeat(WIRE_ERROR_MAX_CHARS + 1) },
      { kind: 'events', sub: 1, error: null, events: [{ type: 'rename', path: '/a' }] },
      { kind: 'events', sub: 1, error: null, events: [{ type: 'create', path: '' }] },
      { kind: 'events', sub: 1, error: 4, events: [] },
      { kind: 'note', what: 'other', op: 'watch', waitedMs: 1, behind: 0 },
      { kind: 'note', what: 'turn-wait', op: 'snapshot', waitedMs: 1, behind: 0 },
      { kind: 'closed' },
      { kind: 'exit' }
    ];
    for (const bad of fromBad) expect(fromWatcherOf(bad)).toBeNull();
  });

  it('clips an error to the bound and never throws on a strange one', () => {
    expect(errorText(new Error('x'.repeat(WIRE_ERROR_MAX_CHARS + 50)))).toHaveLength(WIRE_ERROR_MAX_CHARS);
    expect(errorText('plain')).toBe('plain');
    const hostile = {
      toString(): string {
        throw new Error('no');
      }
    };
    expect(errorText(hostile)).toBe('unknown error');
  });
});
