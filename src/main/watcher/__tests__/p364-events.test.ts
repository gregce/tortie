/**
 * Phase 364: the watcher host's diagnostic records (build/p364/SPEC.md §4.3,
 * D9).
 *
 * Check type: contract test over the REAL host (`createWatcherHost`), the REAL
 * flag (`../../diagnostic-build/flag`) and the REAL record composer
 * (`../../diagnostic-build/events`), with the log module mocked so the record
 * `logEvent` is handed can be read. The define is the global the flag reads,
 * stubbed per load: `vi.stubGlobal('__TORTIE_DIAGNOSTIC__', …)`, then a fresh
 * module graph (vitest turns a config `define` into exactly that global, so a
 * stub wins over it).
 *
 * What it pins, at the four points D9 names in host.ts:
 *  - a request (`send`): op, request id and generation, and never the folder;
 *  - a process start: its pid and generation, written at the process's first
 *    word (`ready`), because in Electron 43.8.7 a forked process has no pid at
 *    `adopt` and none in its `exit` listener (measured by this builder in one
 *    scratch Electron: undefined right after the fork and after 1 and 3
 *    microtasks, a number at `spawn` and at the first message, undefined
 *    inside the `exit` listener and after it);
 *  - an exit (the exit listener): generation and code, for an exit the host
 *    did not ask for and for one it did;
 *  - a restart (the wave's end): generation and the watches bound again;
 *  - with the define off, the same drive writes no record at all;
 *  - an Electron-shaped fork, with exactly those pid lifetimes: the start
 *    record names the pid and the exit record names none.
 *
 * Nothing here forks a process or opens an FSEvents stream: the processes are
 * fakes, or a mocked `utilityProcess.fork`.
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToWatcher } from '../process/wire';
import type { WatcherChild, WatcherHostLog } from '../host';

interface LogRecord {
  readonly scope: string;
  readonly level: string;
  readonly event: string;
  readonly msg: string;
  readonly fields: Record<string, unknown> | undefined;
}

const records = vi.hoisted(() => [] as LogRecord[]);

vi.mock('../../log', () => ({
  getLog: () => ({ error: () => undefined, warn: () => undefined, info: () => undefined, debug: () => undefined }),
  logEvent: (scope: string, level: string, event: string, msg: string, fields?: Record<string, unknown>) => {
    records.push({ scope, level, event, msg, fields });
  }
}));

/** An Electron-shaped `utilityProcess.fork`: no pid until the test emits `spawn`. */
const forked = vi.hoisted(() => ({
  children: [] as (EventEmitter & { pid: number | undefined; posted: unknown[]; postMessage: (m: unknown) => void; kill: () => boolean })[]
}));

vi.mock('electron', async () => {
  const { EventEmitter: Emitter } = await import('node:events');
  return {
    app: { getAppMetrics: () => [] },
    utilityProcess: {
      fork: () => {
        const child = Object.assign(new Emitter(), {
          pid: undefined as number | undefined,
          posted: [] as unknown[],
          postMessage: (message: unknown) => {
            child.posted.push(message);
          },
          kill: () => true
        });
        forked.children.push(child);
        return child;
      }
    }
  };
});

/** A watched folder no record may carry. */
const SECRET_DIR = '/scratch/p364-events/a folder only the site may name';

/** The host module, loaded fresh under the define. */
async function hostWith(diagnostic: boolean): Promise<typeof import('../host')> {
  vi.resetModules();
  vi.stubGlobal('__TORTIE_DIAGNOSTIC__', diagnostic);
  return import('../host');
}

/** The diagnostic records, in the order they were written. */
const diagnostic = (): LogRecord[] => records.filter((r) => r.event.startsWith('diagnostic.'));

/** A record as diagnosticEvent composes it (src/main/diagnostic-build/events.ts). */
const record = (what: string, fields: Record<string, number | string>): LogRecord => ({
  scope: 'diagnostic',
  level: 'info',
  event: 'diagnostic.watcher',
  msg: `watcher ${what}`,
  fields: { ...fields, what }
});

const turn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const turns = async (n = 6): Promise<void> => {
  for (let i = 0; i < n; i += 1) await turn();
};

interface FakeProc {
  readonly pid: number;
  readonly posted: ToWatcher[];
  killed: boolean;
  exit(code: number | null): void;
}

/**
 * Fake processes that say `ready` once they are up, as the real one does
 * (`serveWatchQueue` posts it first), and answer a watch with a subscription
 * and a close with `closed`, unless `silent` names the folder.
 */
function fakeProcesses(silent: ReadonlySet<string> = new Set()) {
  const procs: FakeProc[] = [];
  let nextSub = 1;
  let nextPid = 9_000;
  const spawn = (): WatcherChild => {
    const listeners: ((message: unknown) => void)[] = [];
    const exits: ((code: number | null) => void)[] = [];
    let ended = false;
    const say = (message: unknown): void => {
      if (!ended) for (const listener of listeners) listener(message);
    };
    const proc: FakeProc = {
      pid: nextPid,
      posted: [],
      killed: false,
      exit: (code) => {
        if (ended) return;
        ended = true;
        for (const listener of exits) listener(code);
      }
    };
    nextPid += 1;
    procs.push(proc);
    setImmediate(() => say({ kind: 'ready' }));
    return {
      pid: proc.pid,
      post: (message) => {
        proc.posted.push(structuredClone(message));
        if (message.kind === 'watch' && silent.has(message.dir)) return;
        setImmediate(() => {
          if (message.kind === 'watch') {
            say({ kind: 'watching', req: message.req, sub: nextSub, waitedMs: 0 });
            nextSub += 1;
          } else {
            say({ kind: 'closed', req: message.req });
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

const quiet: WatcherHostLog = { info: () => undefined, warn: () => undefined };

/**
 * One drive through every point: a watch, a crash and the restart that binds
 * it again, its close, then a watch no process answers, which the host ends
 * by its bound (an exit the host asked for).
 */
async function drive(host: typeof import('../host')) {
  const silent = new Set(['/scratch/p364-events/never answered']);
  const fake = fakeProcesses(silent);
  const h = host.createWatcherHost({ spawn: fake.spawn, log: quiet });
  const asked = h.watchFolder(SECRET_DIR, { ignore: [`${SECRET_DIR}/.git`] }, () => undefined);
  await turns();
  const watch = await asked;
  fake.procs[0]!.exit(139);
  await vi.advanceTimersByTimeAsync(host.WATCHER_RESTART_BACKOFF_MS[0]!);
  await turns();
  await watch!.close();
  const never = h.watchFolder('/scratch/p364-events/never answered', {}, () => undefined);
  never.catch(() => undefined);
  await turns();
  await vi.advanceTimersByTimeAsync(host.WATCH_START_REPLY_MS);
  await turns();
  return { fake, h };
}

beforeEach(() => {
  records.length = 0;
  forked.children.length = 0;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the diagnostic build', () => {
  it('records each request, start, exit and restart, with the fields D9 names and nothing else', async () => {
    const host = await hostWith(true);
    const { fake } = await drive(host);
    // The drive did what it says: two processes, the first crashed, the second ended by the bound.
    expect(fake.procs).toHaveLength(2);
    expect(fake.procs[1]!.killed).toBe(true);
    expect(diagnostic()).toEqual([
      // The first watch is posted as the process is adopted, before it says it is up.
      record('send', { op: 'watch', req: 1, generation: 1 }),
      record('start', { generation: 1, pid: 9_000 }),
      // A crash, by its code.
      record('exit', { generation: 1, code: 139 }),
      record('send', { op: 'watch', req: 2, generation: 2 }),
      record('start', { generation: 2, pid: 9_001 }),
      record('restart', { generation: 2, rebound: 1 }),
      record('send', { op: 'close', req: 3, generation: 2 }),
      record('send', { op: 'watch', req: 4, generation: 2 }),
      // The exit the host asked for: no code, because the fake ends with none.
      record('exit', { generation: 2 })
    ]);
  });

  it('writes one start per process, however often it speaks', async () => {
    const host = await hostWith(true);
    const fake = fakeProcesses();
    const h = host.createWatcherHost({ spawn: fake.spawn, log: quiet });
    const watches = [h.watchFolder('/scratch/p364-events/a', {}, () => undefined), h.watchFolder('/scratch/p364-events/b', {}, () => undefined)];
    await turns();
    await Promise.all(watches);
    expect(fake.procs).toHaveLength(1);
    expect(diagnostic().filter((r) => r.msg === 'watcher start')).toEqual([record('start', { generation: 1, pid: 9_000 })]);
  });

  it('never names a folder or an ignore entry in a record', async () => {
    const host = await hostWith(true);
    await drive(host);
    expect(diagnostic().length).toBeGreaterThan(0);
    for (const r of diagnostic()) {
      const text = JSON.stringify(r);
      expect(text).not.toContain('a folder only the site may name');
      expect(text).not.toContain('never answered');
      expect(text).not.toContain('.git');
    }
  });

  it('names the pid of a real fork at its first word, where Electron has given it one, and never at its exit', async () => {
    const host = await hostWith(true);
    const versions = process.versions as Record<string, string | undefined>;
    Object.defineProperty(versions, 'electron', { value: '43.8.7', configurable: true, enumerable: true });
    try {
      const h = host.createWatcherHost({ log: quiet });
      const asked = h.watchFolder('/scratch/p364-events/forked', {}, () => undefined);
      await turns();
      expect(forked.children).toHaveLength(1);
      const child = forked.children[0]!;
      // Adopted and asked, and still no pid: nothing has started yet.
      expect(diagnostic()).toEqual([record('send', { op: 'watch', req: 1, generation: 1 })]);
      // Electron's measured order: a pid at 'spawn', then the process's first word.
      child.pid = 4_242;
      child.emit('spawn');
      child.emit('message', { kind: 'ready' });
      const posted = child.posted[0] as ToWatcher;
      child.emit('message', { kind: 'watching', req: posted.req, sub: 1, waitedMs: 0 });
      await asked;
      // And no pid inside the 'exit' listener (measured: undefined there).
      child.pid = undefined;
      child.emit('exit', 9);
      expect(diagnostic()).toEqual([
        record('send', { op: 'watch', req: 1, generation: 1 }),
        record('start', { generation: 1, pid: 4_242 }),
        record('exit', { generation: 1, code: 9 })
      ]);
    } finally {
      delete versions['electron'];
    }
  });
});

describe('the normal build', () => {
  it('writes no record for the same drive', async () => {
    const host = await hostWith(false);
    const { fake } = await drive(host);
    // The same work was done, so "no record" is not a drive that did nothing.
    expect(fake.procs).toHaveLength(2);
    expect(fake.procs[0]!.posted.length + fake.procs[1]!.posted.length).toBe(4);
    expect(diagnostic()).toEqual([]);
    expect(records).toEqual([]);
  });
});
