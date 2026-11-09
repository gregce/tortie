/**
 * Phase 365: main's host, over a fake watcher process (build/p365/SPEC.md
 * §4.1, D5 to D8, §9.3).
 *
 * Check type: contract test over an injected process and vitest's fake clock.
 * Nothing here forks a process or opens an FSEvents stream. The fork's own
 * options are read from the real branch by giving this process a stand-in
 * `process.versions.electron` for one test and a mocked `utilityProcess`.
 *
 * What it pins:
 *  - the fork: lazy, once, `join(__dirname, 'watcher-process.js')`, an
 *    environment of exactly `TORTIE_WATCHER`, `stdio: 'ignore'`, the service
 *    name;
 *  - a watch's three answers: a `FolderWatch` with `startedAfterMs`, `null`,
 *    and the library's words as a rejection; a flagged RegExp refused before
 *    anything is sent;
 *  - events routed by the CURRENT process's subscription id;
 *  - an exit: one line, a new process after the backoff, every live watch
 *    bound again, ONE re-scan notice each, after its bind answered, which
 *    `isRescanRequired` matches; the backoff by consecutive exits; the give-up
 *    after five exits in ten minutes, with ONE word to every live watch that
 *    it has ended, which `isRescanRequired` does not match (the fix round);
 *  - a first watch a dead or replaced process held, asked again of the next
 *    process and answered there, and answered null only at the give-up (the
 *    fix round);
 *  - each reply bound: one line, the process replaced, every close it held
 *    settled;
 *  - the end of a forked process: a SIGKILL to its pid only when Electron's
 *    own process list names it, then Electron's kill() (the fix round;
 *    `process.kill` is a spy, so no signal leaves the test);
 *  - every close tracked for the quit's drains;
 *  - a malformed message dropped whole and counted;
 *  - no line naming a watched path;
 *  - THE QUIT, with the real `lifecycle.ts`: `null` for a new watch, every
 *    close settled at once with NOTHING posted, the process ended at the first
 *    call that saw the quit, a watch still starting answered null, and no
 *    restart (the fix round).
 */

import { dirname, join } from 'node:path';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToWatcher } from '../process/wire';
import type { WatcherChild, WatcherHostLog } from '../host';

const fork = vi.hoisted(() => ({
  calls: [] as unknown[][],
  children: [] as (EventEmitter & { pid: number; postMessage: (m: unknown) => void; kill: () => boolean })[],
  nextSub: 1,
  /** Folders a forked stand-in never answers a watch for. */
  silent: new Set<string>(),
  /** Electron's `kill()` of a forked stand-in, counted. */
  kills: 0,
  /** What the stand-in `app.getAppMetrics()` answers. Empty unless a test names a pid. */
  metrics: [] as { pid: number; type: string; name?: string }[]
}));

vi.mock('electron', async () => {
  const { EventEmitter: Emitter } = await import('node:events');
  return {
    app: { getAppMetrics: () => fork.metrics },
    utilityProcess: {
      fork: (...args: unknown[]) => {
        fork.calls.push(args);
        const child = Object.assign(new Emitter(), {
          pid: 4242,
          postMessage: (message: unknown) => {
            const m = message as ToWatcher;
            if (m.kind === 'watch' && fork.silent.has(m.dir)) return;
            // Answer like a process would, on a later turn.
            setImmediate(() => {
              if (m.kind === 'watch') {
                child.emit('message', { kind: 'watching', req: m.req, sub: fork.nextSub, waitedMs: 0 });
                fork.nextSub += 1;
              } else {
                child.emit('message', { kind: 'closed', req: m.req });
              }
            });
          },
          kill: () => {
            fork.kills += 1;
            return true;
          }
        });
        fork.children.push(child);
        return child;
      }
    }
  };
});

const logged = vi.hoisted(() => [] as { level: string; msg: string; fields?: Record<string, unknown> }[]);
vi.mock('../../log', () => ({
  getLog: () => ({
    error: (msg: string, fields?: Record<string, unknown>) => logged.push({ level: 'error', msg, fields }),
    warn: (msg: string, fields?: Record<string, unknown>) => logged.push({ level: 'warn', msg, fields }),
    info: (msg: string, fields?: Record<string, unknown>) => logged.push({ level: 'info', msg, fields }),
    debug: () => undefined
  })
}));

const host = await import('../host');
const { pendingWatcherCloseCount } = await import('../teardown');
const { isRescanRequired } = await import('../repo-watcher');

const {
  WATCHER_FIRST_WATCH_ASKS,
  WATCHER_GAVE_UP_ERROR,
  WATCHER_GIVE_UP_EXITS,
  WATCHER_GIVE_UP_WINDOW_MS,
  WATCHER_LINES,
  WATCHER_RESTART_BACKOFF_MS,
  WATCHER_RESTART_ERROR,
  WATCHER_STEADY_MS,
  WATCH_CLOSE_REPLY_MS,
  WATCH_START_REPLY_MS,
  createWatcherHost
} = host;

/** One real event-loop turn. The fake clock fakes setTimeout and Date only. */
const turn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const turns = async (n = 6): Promise<void> => {
  for (let i = 0; i < n; i += 1) await turn();
};

/** A watched folder name no log line may carry. */
const SECRET_DIR = '/scratch/p365-host/a folder only the site may name';

interface FakeProc {
  readonly pid: number;
  readonly posted: ToWatcher[];
  killed: boolean;
  /** The process says something to main. */
  say(message: unknown): void;
  /** The process ends. */
  exit(code: number | null): void;
}

/**
 * A spawner of fake processes. With `answer` on, each one answers a watch with
 * a fresh subscription id and a close with `closed`, on a later turn.
 */
function fakeProcesses(options: { answer: boolean; answerFor?: (message: ToWatcher) => unknown } = { answer: true }) {
  const procs: FakeProc[] = [];
  let nextSub = 1;
  let nextPid = 9_000;
  const spawn = (): WatcherChild => {
    const listeners: ((message: unknown) => void)[] = [];
    const exits: ((code: number | null) => void)[] = [];
    let ended = false;
    const proc: FakeProc = {
      pid: nextPid,
      posted: [],
      killed: false,
      say: (message) => {
        if (!ended) for (const listener of listeners) listener(message);
      },
      exit: (code) => {
        if (ended) return;
        ended = true;
        for (const listener of exits) listener(code);
      }
    };
    nextPid += 1;
    procs.push(proc);
    return {
      pid: proc.pid,
      post: (message) => {
        proc.posted.push(structuredClone(message));
        if (!options.answer) return;
        setImmediate(() => {
          const custom = options.answerFor?.(message);
          if (custom !== undefined) {
            proc.say(custom);
            return;
          }
          if (message.kind === 'watch') {
            proc.say({ kind: 'watching', req: message.req, sub: nextSub, waitedMs: 0 });
            nextSub += 1;
          } else {
            proc.say({ kind: 'closed', req: message.req });
          }
        });
      },
      onMessage: (listener) => {
        listeners.push(listener);
      },
      onExit: (listener) => {
        exits.push(listener);
      },
      kill: () => {
        proc.killed = true;
        setImmediate(() => proc.exit(null));
      }
    };
  };
  return { procs, spawn };
}

function captureLog(): { lines: { level: string; msg: string; fields?: Record<string, unknown> }[]; log: WatcherHostLog } {
  const lines: { level: string; msg: string; fields?: Record<string, unknown> }[] = [];
  return {
    lines,
    log: {
      info: (msg, fields) => lines.push({ level: 'info', msg, fields }),
      warn: (msg, fields) => lines.push({ level: 'warn', msg, fields })
    }
  };
}

/** The sub id the latest `watch` message for `dir` was answered with, read from what was posted. */
function watchesOf(proc: FakeProc): (ToWatcher & { kind: 'watch' })[] {
  return proc.posted.filter((m): m is ToWatcher & { kind: 'watch' } => m.kind === 'watch');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the fork', () => {
  it('forks lazily, once, with one variable of environment, stdio ignore and the service name', async () => {
    expect(fork.calls).toHaveLength(0);
    const versions = process.versions as Record<string, string | undefined>;
    Object.defineProperty(versions, 'electron', { value: '43.3.0', configurable: true, enumerable: true });
    try {
      const watch = await host.watchFolder('/scratch/p365-fork', {}, () => undefined);
      await host.watchFolder('/scratch/p365-fork-2', {}, () => undefined);
      expect(fork.calls).toHaveLength(1);
      const [path, args, forkOptions] = fork.calls[0]!;
      const hostDir = dirname(new URL(import.meta.url).pathname.replace('/__tests__/p365-host.test.ts', '/host.ts'));
      expect(path).toBe(join(hostDir, 'watcher-process.js'));
      expect(args).toEqual([]);
      expect(forkOptions).toEqual({ env: { TORTIE_WATCHER: '1' }, stdio: 'ignore', serviceName: 'Tortie Watcher' });
      // A V8 fatal error in the process reaches main as an `error` event,
      // which must never throw there.
      expect(() => fork.children[0]!.emit('error', 'FatalError', 'here', '{}')).not.toThrow();
      expect(watch).not.toBeNull();
      expect(host.watcherProcessObservation()).toMatchObject({ pid: 4242, restarts: 0, gaveUp: false, live: 2 });
      await watch?.close();
    } finally {
      delete versions['electron'];
    }
  });

  // The fix round (rule 7 of the host's header): Electron's kill() waits on
  // main's thread up to 2 s for a child that does not die of SIGTERM (2,005 ms
  // measured for a stopped one), so the forked process is sent SIGKILL first,
  // by the pid Electron's own process list names, and kill() only reaps it.
  // process.kill is a spy here: no signal leaves this test.
  for (const named of [true, false]) {
    it(`ends a process that does not answer by ${named ? 'a SIGKILL to the pid Electron names, then' : 'Electron alone when Electron names no such pid:'} Electron's kill()`, async () => {
      const versions = process.versions as Record<string, string | undefined>;
      Object.defineProperty(versions, 'electron', { value: '43.3.0', configurable: true, enumerable: true });
      const signals = vi.spyOn(process, 'kill').mockImplementation(() => true);
      const dir = `/scratch/p365-silent-${String(named)}`;
      fork.silent.add(dir);
      fork.metrics = named ? [{ pid: 4242, type: 'Utility', name: 'Tortie Watcher' }] : [{ pid: 4242, type: 'Utility', name: 'Network Service' }];
      const killsBefore = fork.kills;
      try {
        const { lines, log } = captureLog();
        const h = createWatcherHost({ log });
        const asked = h.watchFolder(dir, {}, () => undefined);
        asked.catch(() => undefined);
        await turns();
        expect(signals).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(WATCH_START_REPLY_MS);
        expect(lines.filter((l) => l.msg.startsWith(WATCHER_LINES.noAnswer))).toHaveLength(1);
        expect(signals.mock.calls).toEqual(named ? [[4242, 'SIGKILL']] : []);
        expect(fork.kills - killsBefore).toBe(1);
      } finally {
        signals.mockRestore();
        fork.silent.delete(dir);
        fork.metrics = [];
        delete versions['electron'];
      }
    });
  }
});

describe('a watch and its answers', () => {
  it('starts nothing until the first watch, then answers with the watch and its start time', async () => {
    const fake = fakeProcesses();
    const { log } = captureLog();
    const h = createWatcherHost({ spawn: fake.spawn, log });
    expect(fake.procs).toHaveLength(0);
    expect(h.observation()).toEqual({ pid: null, restarts: 0, gaveUp: false, live: 0 });
    const asked = h.watchFolder('/scratch/a', { ignore: ['/scratch/a/.git', /^vendor(?:\/|$)/] }, () => undefined);
    await turns();
    const watch = await asked;
    expect(fake.procs).toHaveLength(1);
    expect(watch).toMatchObject({ dir: '/scratch/a' });
    expect(watch!.startedAfterMs).toBeGreaterThanOrEqual(0);
    expect(watchesOf(fake.procs[0]!)[0]).toEqual({
      kind: 'watch',
      req: 1,
      dir: '/scratch/a',
      ignorePaths: ['/scratch/a/.git'],
      ignorePatterns: ['^vendor(?:\\/|$)']
    });
    expect(h.observation()).toMatchObject({ pid: 9_000, live: 1 });
  });

  it('measures the start from the ask, so a slow start reads as one', async () => {
    const fake = fakeProcesses({ answer: false });
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const asked = h.watchFolder('/scratch/slow', {}, () => undefined);
    await turns();
    await vi.advanceTimersByTimeAsync(700);
    const req = watchesOf(fake.procs[0]!)[0]!.req;
    fake.procs[0]!.say({ kind: 'watching', req, sub: 5, waitedMs: 650 });
    const watch = await asked;
    expect(watch!.startedAfterMs).toBe(700);
  });

  it('answers null for nothing to watch, and rejects with the library words for a refusal', async () => {
    const fake = fakeProcesses({
      answer: true,
      answerFor: (m) =>
        m.kind === 'watch' && m.dir === '/scratch/none'
          ? { kind: 'watching', req: m.req, sub: null, waitedMs: 0 }
          : m.kind === 'watch' && m.dir === '/scratch/denied'
            ? { kind: 'refused', req: m.req, error: 'Permission denied' }
            : undefined
    });
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const none = h.watchFolder('/scratch/none', {}, () => undefined);
    const denied = h.watchFolder('/scratch/denied', {}, () => undefined);
    denied.catch(() => undefined); // observed below; never an unhandled rejection
    await turns();
    expect(await none).toBeNull();
    await expect(denied).rejects.toThrow('Permission denied');
    expect(h.observation().live).toBe(0);
  });

  it('refuses a RegExp with a flag before anything is sent, in the library words', async () => {
    const fake = fakeProcesses();
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    await expect(h.watchFolder('/scratch/a', { ignore: [/x/i] }, () => undefined)).rejects.toThrow(
      'RegExp ignore patterns must not have flags (got /x/i). Flags are not supported by the native matcher.'
    );
    expect(fake.procs).toHaveLength(0);
  });

  it('refuses, before anything is sent, a watch the process would drop', async () => {
    const fake = fakeProcesses();
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    await expect(h.watchFolder(`/${'x'.repeat(5_000)}`, {}, () => undefined)).rejects.toThrow(
      'the watch asked for is larger than the file watcher takes'
    );
    await expect(h.watchFolder('/scratch/a', { ignore: [''] }, () => undefined)).rejects.toThrow(
      'the watch asked for is larger than the file watcher takes'
    );
    expect(fake.procs).toHaveLength(0);
  });

  it('delivers a batch to the watch its CURRENT subscription names, and nothing after the close', async () => {
    const fake = fakeProcesses();
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const seenA: unknown[] = [];
    const seenB: unknown[] = [];
    const a = h.watchFolder('/scratch/a', {}, (err, events) => seenA.push({ err: err?.message ?? null, events }));
    const b = h.watchFolder('/scratch/b', {}, (err, events) => seenB.push({ err: err?.message ?? null, events }));
    await turns();
    const watchA = await a;
    await b;
    const proc = fake.procs[0]!;
    proc.say({ kind: 'events', sub: 1, error: null, events: [{ type: 'create', path: '/scratch/a/x' }] });
    proc.say({ kind: 'events', sub: 2, error: 'Events were dropped by the kernel. File system must be re-scanned.', events: [] });
    proc.say({ kind: 'events', sub: 77, error: null, events: [{ type: 'create', path: '/scratch/elsewhere' }] });
    expect(seenA).toEqual([{ err: null, events: [{ type: 'create', path: '/scratch/a/x' }] }]);
    expect(seenB).toEqual([{ err: 'Events were dropped by the kernel. File system must be re-scanned.', events: [] }]);
    const closing = watchA!.close();
    proc.say({ kind: 'events', sub: 1, error: null, events: [{ type: 'update', path: '/scratch/a/late' }] });
    await turns();
    await closing;
    expect(seenA).toHaveLength(1);
    expect(proc.posted.at(-1)).toMatchObject({ kind: 'close', sub: 1 });
  });

  it('tracks every close for the quit, until the process answers it', async () => {
    const fake = fakeProcesses({ answer: false });
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const asked = h.watchFolder('/scratch/a', {}, () => undefined);
    await turns();
    const proc = fake.procs[0]!;
    proc.say({ kind: 'watching', req: watchesOf(proc)[0]!.req, sub: 1, waitedMs: 0 });
    const watch = await asked;
    const before = pendingWatcherCloseCount();
    const closing = watch!.close();
    expect(watch!.close()).toBe(closing);
    expect(pendingWatcherCloseCount()).toBe(before + 1);
    const close = proc.posted.find((m) => m.kind === 'close')!;
    proc.say({ kind: 'closed', req: close.req });
    await closing;
    await turns(2);
    expect(pendingWatcherCloseCount()).toBe(before);
  });

  it('drops a malformed message whole, counts it, and carries on', async () => {
    const fake = fakeProcesses({ answer: false });
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const asked = h.watchFolder('/scratch/a', {}, () => undefined);
    await turns();
    const proc = fake.procs[0]!;
    const req = watchesOf(proc)[0]!.req;
    proc.say({ kind: 'watching', req, sub: 'one', waitedMs: 0 });
    proc.say({ kind: 'events', sub: 1, error: null, events: [{ type: 'rename', path: '/x' }] });
    proc.say(null);
    expect(h.droppedMessages()).toBe(3);
    proc.say({ kind: 'watching', req, sub: 1, waitedMs: 0 });
    expect(await asked).not.toBeNull();
  });
});

describe('a crash, and the restart', () => {
  it('logs the exit, starts again after the first backoff, binds every live watch again and hands each ONE re-scan notice', async () => {
    const fake = fakeProcesses();
    const { lines, log } = captureLog();
    const h = createWatcherHost({ spawn: fake.spawn, log });
    const seen: Record<string, string[]> = { a: [], b: [] };
    const a = h.watchFolder('/scratch/a', {}, (err) => err !== null && seen['a']!.push(err.message));
    const b = h.watchFolder('/scratch/b', {}, (err) => err !== null && seen['b']!.push(err.message));
    await turns();
    await Promise.all([a, b]);
    fake.procs[0]!.exit(139);
    expect(lines.filter((l) => l.msg.startsWith(WATCHER_LINES.exited))).toEqual([
      { level: 'warn', msg: `${WATCHER_LINES.exited} (code 139)`, fields: { code: 139, generation: 1 } }
    ]);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]! - 1);
    expect(fake.procs).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await turns();
    expect(fake.procs).toHaveLength(2);
    expect(watchesOf(fake.procs[1]!).map((m) => m.dir)).toEqual(['/scratch/a', '/scratch/b']);
    expect(seen).toEqual({ a: [WATCHER_RESTART_ERROR], b: [WATCHER_RESTART_ERROR] });
    expect(isRescanRequired(new Error(WATCHER_RESTART_ERROR))).toBe(true);
    expect(lines.filter((l) => l.msg.startsWith(WATCHER_LINES.restarted))).toEqual([
      {
        level: 'info',
        msg: `${WATCHER_LINES.restarted} (generation 2, 2 watches re-bound)`,
        fields: { generation: 2, rebound: 2, gone: 0 }
      }
    ]);
    expect(h.observation()).toMatchObject({ pid: 9_001, restarts: 1, live: 2 });
  });

  it('hands the notice only once the new stream has started, so the re-read covers what was missed', async () => {
    let holdRebind = false;
    const fake = fakeProcesses({
      answer: true,
      answerFor: (m) => (holdRebind && m.kind === 'watch' ? { kind: 'ready' } : undefined)
    });
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const notices: string[] = [];
    await Promise.all([h.watchFolder('/scratch/a', {}, (err) => err !== null && notices.push(err.message)), turns()]);
    holdRebind = true;
    fake.procs[0]!.exit(1);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    const rebind = watchesOf(fake.procs[1]!)[0]!;
    expect(notices).toEqual([]);
    fake.procs[1]!.say({ kind: 'watching', req: rebind.req, sub: 40, waitedMs: 0 });
    expect(notices).toEqual([WATCHER_RESTART_ERROR]);
    // A re-bind that finds the folder gone still owes, and gets, its one notice.
    fake.procs[1]!.exit(1);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[1]!);
    await turns();
    const again = watchesOf(fake.procs[2]!)[0]!;
    fake.procs[2]!.say({ kind: 'watching', req: again.req, sub: null, waitedMs: 0 });
    expect(notices).toEqual([WATCHER_RESTART_ERROR, WATCHER_RESTART_ERROR]);
  });

  it('routes a batch by the NEW process subscription id, and ignores the old process', async () => {
    const fake = fakeProcesses();
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const seen: string[] = [];
    await Promise.all([
      h.watchFolder('/scratch/a', {}, (_err, events) => seen.push(...events.map((e) => e.path))),
      turns()
    ]);
    const old = fake.procs[0]!;
    old.exit(1);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    const fresh = fake.procs[1]!;
    old.say({ kind: 'events', sub: 1, error: null, events: [{ type: 'create', path: '/scratch/a/old' }] });
    // The new process answered the re-bind with sub 2.
    fresh.say({ kind: 'events', sub: 1, error: null, events: [{ type: 'create', path: '/scratch/a/stale-id' }] });
    fresh.say({ kind: 'events', sub: 2, error: null, events: [{ type: 'create', path: '/scratch/a/new' }] });
    expect(seen).toEqual(['/scratch/a/new']);
  });

  it('asks the next process for a first watch the dead process held, and answers it there (the fix round)', async () => {
    let answering = false;
    const fake = fakeProcesses({ answer: true, answerFor: (m) => (!answering && m.kind === 'watch' ? { kind: 'ready' } : undefined) });
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    let settled = false;
    const asked = h.watchFolder('/scratch/a', {}, () => undefined);
    void asked.then(() => {
      settled = true;
    });
    await turns();
    fake.procs[0]!.exit(1);
    await turns();
    // At the parent a slow subscribe never dropped a watch, so neither does a dead process here.
    expect(settled).toBe(false);
    answering = true;
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    expect(watchesOf(fake.procs[1]!).map((m) => m.dir)).toEqual(['/scratch/a']);
    const watch = await asked;
    expect(watch).not.toBeNull();
    expect(watch!.startedAfterMs).toBeGreaterThanOrEqual(WATCHER_RESTART_BACKOFF_MS[0]!);
    expect(h.observation().live).toBe(1);
  });

  it('answers a first watch null once the second process it was asked of has ended too, and gives nothing else up', async () => {
    expect(WATCHER_FIRST_WATCH_ASKS).toBe(2);
    // A folder whose watch is never answered, by any process: a poison folder.
    const fake = fakeProcesses({ answer: true, answerFor: (m) => (m.kind === 'watch' && m.dir === '/scratch/poison' ? { kind: 'ready' } : undefined) });
    const { lines, log } = captureLog();
    const h = createWatcherHost({ spawn: fake.spawn, log });
    const kept = await Promise.all([h.watchFolder('/scratch/kept', {}, () => undefined), turns()]).then(([w]) => w);
    expect(kept).not.toBeNull();
    let answer: unknown = 'unanswered';
    void h.watchFolder('/scratch/poison', {}, () => undefined).then((w) => {
      answer = w;
    });
    await turns();
    // The first process ends with it unanswered: it is asked of the next.
    await vi.advanceTimersByTimeAsync(WATCH_START_REPLY_MS);
    await turns();
    expect(answer).toBe('unanswered');
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    expect(watchesOf(fake.procs[1]!).map((m) => m.dir).sort()).toEqual(['/scratch/kept', '/scratch/poison']);
    // The second one ends with it unanswered too: null, and it is asked of no third.
    await vi.advanceTimersByTimeAsync(WATCH_START_REPLY_MS);
    await turns();
    expect(answer).toBeNull();
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[1]!);
    await turns();
    expect(fake.procs).toHaveLength(3);
    expect(watchesOf(fake.procs[2]!).map((m) => m.dir)).toEqual(['/scratch/kept']);
    // Two exits, no give-up: every other watch goes on.
    expect(h.observation()).toMatchObject({ gaveUp: false, live: 1, restarts: 2 });
    expect(lines.filter((l) => l.msg.startsWith(WATCHER_LINES.gaveUp))).toEqual([]);
  });

  it('answers a first watch null once the second process it was asked of has crashed too', async () => {
    const fake = fakeProcesses({ answer: true, answerFor: (m) => (m.kind === 'watch' ? { kind: 'ready' } : undefined) });
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    let answer: unknown = 'unanswered';
    void h.watchFolder('/scratch/a', {}, () => undefined).then((w) => {
      answer = w;
    });
    await turns();
    fake.procs[0]!.exit(1);
    await turns();
    expect(answer).toBe('unanswered');
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    expect(watchesOf(fake.procs[1]!).map((m) => m.dir)).toEqual(['/scratch/a']);
    fake.procs[1]!.exit(1);
    await turns();
    expect(answer).toBeNull();
    expect(h.observation()).toMatchObject({ gaveUp: false, live: 0 });
  });

  it('backs off 250 ms, 1 s, 5 s and 30 s by consecutive exits, then gives up at five in ten minutes', async () => {
    const fake = fakeProcesses();
    const { lines, log } = captureLog();
    const h = createWatcherHost({ spawn: fake.spawn, log });
    const notices: string[] = [];
    await Promise.all([h.watchFolder('/scratch/a', {}, (err) => err !== null && notices.push(err.message)), turns()]);
    for (const [index, backoff] of WATCHER_RESTART_BACKOFF_MS.entries()) {
      fake.procs.at(-1)!.exit(1);
      await vi.advanceTimersByTimeAsync(backoff - 1);
      await turns();
      expect(fake.procs).toHaveLength(index + 1);
      await vi.advanceTimersByTimeAsync(1);
      await turns();
      expect(fake.procs).toHaveLength(index + 2);
    }
    expect(WATCHER_GIVE_UP_EXITS).toBe(WATCHER_RESTART_BACKOFF_MS.length + 1);
    fake.procs.at(-1)!.exit(1);
    await vi.advanceTimersByTimeAsync(WATCHER_GIVE_UP_WINDOW_MS);
    await turns();
    expect(fake.procs).toHaveLength(WATCHER_GIVE_UP_EXITS);
    const gaveUp = lines.filter((l) => l.msg.startsWith(WATCHER_LINES.gaveUp));
    expect(gaveUp).toHaveLength(1);
    expect(gaveUp[0]!.level).toBe('warn');
    expect(h.observation()).toMatchObject({ gaveUp: true, pid: null, live: 1 });
    // One re-scan notice per completed re-bind, then ONE word at the give-up
    // that the watch has ended, which is not a re-scan (the fix round: the
    // live watches used to go quiet with nothing said).
    expect(notices).toEqual([...WATCHER_RESTART_BACKOFF_MS.map(() => WATCHER_RESTART_ERROR), WATCHER_GAVE_UP_ERROR]);
    expect(isRescanRequired(new Error(WATCHER_GAVE_UP_ERROR))).toBe(false);
    // Every later watch is nothing to watch, and nothing starts.
    expect(await h.watchFolder('/scratch/later', {}, () => undefined)).toBeNull();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fake.procs).toHaveLength(WATCHER_GIVE_UP_EXITS);
    expect(notices).toHaveLength(WATCHER_RESTART_BACKOFF_MS.length + 1);
  });

  it('starts the backoff again from its first step after a process that ran steadily', async () => {
    const fake = fakeProcesses();
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    await Promise.all([h.watchFolder('/scratch/a', {}, () => undefined), turns()]);
    fake.procs[0]!.exit(1);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    expect(fake.procs).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(WATCHER_STEADY_MS);
    fake.procs[1]!.exit(1);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    expect(fake.procs).toHaveLength(3);
  });

  it('does not start a process after an exit with nothing to watch, and the next watch starts one', async () => {
    const fake = fakeProcesses();
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const watch = await Promise.all([h.watchFolder('/scratch/a', {}, () => undefined), turns()]).then(([w]) => w);
    await Promise.all([watch!.close(), turns()]);
    fake.procs[0]!.exit(1);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    expect(fake.procs).toHaveLength(1);
    const again = h.watchFolder('/scratch/b', {}, () => undefined);
    await turns();
    expect(fake.procs).toHaveLength(2);
    expect(await again).not.toBeNull();
  });

  it('settles a close at once when its watch is being bound again, and closes the late subscription quietly', async () => {
    let holdRebind = false;
    const fake = fakeProcesses({
      answer: true,
      answerFor: (m) => (holdRebind && m.kind === 'watch' ? { kind: 'ready' } : undefined)
    });
    const h = createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const watch = await Promise.all([h.watchFolder('/scratch/a', {}, () => undefined), turns()]).then(([w]) => w);
    holdRebind = true;
    fake.procs[0]!.exit(1);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    const fresh = fake.procs[1]!;
    const rebind = watchesOf(fresh)[0]!;
    await watch!.close();
    fresh.say({ kind: 'watching', req: rebind.req, sub: 31, waitedMs: 0 });
    expect(fresh.posted.at(-1)).toMatchObject({ kind: 'close', sub: 31 });
    expect(h.observation().live).toBe(0);
  });
});

describe('the reply bounds', () => {
  it('replaces a process that does not answer a watch in time, with one line, and asks the next process for that watch (the fix round)', async () => {
    let answering = false;
    const fake = fakeProcesses({ answer: true, answerFor: (m) => (!answering && m.kind === 'watch' ? { kind: 'ready' } : undefined) });
    const { lines, log } = captureLog();
    const h = createWatcherHost({ spawn: fake.spawn, log });
    let settled = false;
    const asked = h.watchFolder('/scratch/a', {}, () => undefined);
    void asked.then(() => {
      settled = true;
    });
    await turns();
    await vi.advanceTimersByTimeAsync(WATCH_START_REPLY_MS - 1);
    expect(lines).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(lines).toEqual([
      {
        level: 'warn',
        msg: `${WATCHER_LINES.noAnswer} a watch within ${WATCH_START_REPLY_MS} ms, so it was replaced`,
        fields: { op: 'watch', boundMs: WATCH_START_REPLY_MS, generation: 1 }
      }
    ]);
    expect(fake.procs[0]!.killed).toBe(true);
    // The exit of the process it ended is not a second line.
    await turns();
    expect(lines).toHaveLength(1);
    // Not answered null: the project would stay unwatched until its tab opened again.
    expect(settled).toBe(false);
    answering = true;
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    expect(watchesOf(fake.procs[1]!).map((m) => m.dir)).toEqual(['/scratch/a']);
    const watch = await asked;
    expect(watch).not.toBeNull();
    // Measured from the ask, so the site reads once for what the wait missed (D9).
    expect(watch!.startedAfterMs).toBeGreaterThanOrEqual(WATCH_START_REPLY_MS);
  });

  it('replaces a process that does not answer a close in time; the close settles and the live watch is bound again', async () => {
    let answerCloses = false;
    const fake = fakeProcesses({
      answer: true,
      answerFor: (m) => (m.kind === 'close' && !answerCloses ? { kind: 'ready' } : undefined)
    });
    const { lines, log } = captureLog();
    const h = createWatcherHost({ spawn: fake.spawn, log });
    const notices: string[] = [];
    const [one] = await Promise.all([
      h.watchFolder('/scratch/one', {}, () => undefined),
      h.watchFolder('/scratch/two', {}, (err) => err !== null && notices.push(err.message)),
      turns()
    ]);
    let settled = false;
    void one!.close().then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(WATCH_CLOSE_REPLY_MS - 1);
    await turns(1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await turns(1);
    expect(settled).toBe(true);
    expect(lines.filter((l) => l.msg.startsWith(WATCHER_LINES.noAnswer))).toEqual([
      {
        level: 'warn',
        msg: `${WATCHER_LINES.noAnswer} a close within ${WATCH_CLOSE_REPLY_MS} ms, so it was replaced`,
        fields: { op: 'close', boundMs: WATCH_CLOSE_REPLY_MS, generation: 1 }
      }
    ]);
    answerCloses = true;
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    expect(fake.procs).toHaveLength(2);
    expect(watchesOf(fake.procs[1]!).map((m) => m.dir)).toEqual(['/scratch/two']);
    expect(notices).toEqual([WATCHER_RESTART_ERROR]);
  });

  it('keeps the close bound under the disposer 3 s wedge guard', () => {
    expect(WATCH_CLOSE_REPLY_MS).toBeLessThan(3_000);
    expect(WATCH_START_REPLY_MS).toBeLessThanOrEqual(30_000);
  });
});

describe('the lines', () => {
  it('never names a watched path, in a message or a field', async () => {
    const fake = fakeProcesses({
      answer: true,
      answerFor: (m) => (m.kind === 'close' ? { kind: 'ready' } : undefined)
    });
    const { lines, log } = captureLog();
    const h = createWatcherHost({ spawn: fake.spawn, log });
    const [watch] = await Promise.all([h.watchFolder(SECRET_DIR, { ignore: [`${SECRET_DIR}/.git`] }, () => undefined), turns()]);
    fake.procs[0]!.say({ kind: 'note', what: 'turn-wait', op: 'watch', waitedMs: 2_500, behind: 4 });
    void watch!.close();
    await vi.advanceTimersByTimeAsync(WATCH_CLOSE_REPLY_MS);
    const watch2 = h.watchFolder(SECRET_DIR, {}, () => undefined);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[0]!);
    await turns();
    await watch2;
    fake.procs.at(-1)!.exit(134);
    await vi.advanceTimersByTimeAsync(WATCHER_RESTART_BACKOFF_MS[1]!);
    await turns();
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines.some((l) => l.msg.startsWith(WATCHER_LINES.turnWait))).toBe(true);
    for (const line of lines) {
      expect(`${line.msg} ${JSON.stringify(line.fields ?? {})}`).not.toContain('a folder only the site may name');
    }
  });
});

describe('the quit, with the real lifecycle', () => {
  it('answers a new watch null, settles every close at once, posts nothing, ends the process, and starts nothing again (the fix round)', async () => {
    vi.resetModules();
    const fresh = await import('../host');
    const lifecycle = await import('../../lifecycle');
    const fresh2 = await import('../teardown');
    const fake = fakeProcesses({
      answer: true,
      answerFor: (m) => (m.kind === 'close' ? { kind: 'ready' } : m.kind === 'watch' && m.dir === '/scratch/starting' ? { kind: 'ready' } : undefined)
    });
    const h = fresh.createWatcherHost({ spawn: fake.spawn, log: captureLog().log });
    const [watch, kept] = await Promise.all([
      h.watchFolder('/scratch/a', {}, () => undefined),
      // Still live when the process is ended below, so only the quit stops a restart.
      h.watchFolder('/scratch/kept', {}, () => undefined),
      turns()
    ]);
    expect(kept).not.toBeNull();
    // A watch still starting when the quit comes.
    let starting: unknown = 'unanswered';
    void h.watchFolder('/scratch/starting', {}, () => undefined).then((w) => {
      starting = w;
    });
    await turns();
    const proc = fake.procs[0]!;
    const postedBefore = proc.posted.length;

    lifecycle.markAppQuitting();

    // The process never answers this close, and it settles anyway, now.
    let settled = false;
    void watch!.close().then(() => {
      settled = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(true);
    // Nothing more was posted: no close can be left in the process's queue
    // when a teardown runs (16 of 45 graceful quits aborted the process that way).
    expect(proc.posted).toHaveLength(postedBefore);
    // The process was ended, by the host, at the first call that saw the quit.
    expect(proc.killed).toBe(true);
    // The watch still starting is answered null, and nothing is left for the drains.
    await turns();
    expect(starting).toBeNull();
    expect(fresh2.pendingWatcherCloseCount()).toBe(0);
    // A later close and a later watch settle at once too, and post nothing.
    await kept!.close();
    expect(await h.watchFolder('/scratch/b', {}, () => undefined)).toBeNull();
    expect(proc.posted).toHaveLength(postedBefore);

    // Its exit while quitting starts nothing again.
    await vi.advanceTimersByTimeAsync(60_000);
    await turns();
    expect(fake.procs).toHaveLength(1);
  });
});
