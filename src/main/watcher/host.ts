/**
 * MAIN'S SIDE OF THE WATCHER PROCESS, and the one thing Tortie's five watch
 * sites call (Phase 365, build/p365/SPEC.md §4.1, D5 to D8).
 *
 * Since this phase `@parcel/watcher` runs only in a `utilityProcess` main forks
 * (`./watcher-process.ts`), behind one queue that runs every subscribe and
 * unsubscribe one at a time and never subscribes to a folder that is not there
 * (`./process/queue.ts`). Main never loads `watcher.node`. The spec step
 * measured why: the library's overlapping calls damaged main's own heap under a
 * storm of folders created and removed while watched, and with the watcher out
 * of main, main never faulted in any shape it drove (research 143 §2.5, §7;
 * the spec's §2). Each site asks `watchFolder()`, which forwards to the process
 * and answers with a `FolderWatch`, or with `null` for "nothing to watch".
 *
 * ## The rules, each written as code below
 *
 *  1. **Lazy, and one variable of environment.** The process is forked at the
 *     first `watchFolder()`, never before, with `env: { TORTIE_WATCHER: '1' }`
 *     (Electron 43 reads `env: {}` as unset and hands the child main's whole
 *     environment: Phase 330's measurement, `src/main/pocket/bind.ts`),
 *     `stdio: 'ignore'` as a string (Electron PR #53278 fixes an out of bounds
 *     read for a short stdio ARRAY in 43.5.0, not in our 43.3.0) and the
 *     service name `Tortie Watcher`, which `app.getAppMetrics()` shows.
 *  2. **Plain Node runs the same queue in this process.** Where
 *     `process.versions.electron` is undefined (vitest, the tsx probes) there
 *     is no `utilityProcess`, so the process is `./process/in-process.ts`,
 *     reached through a dynamic `import()` in that branch alone. Main's built
 *     bundle therefore requires `@parcel/watcher` nowhere at load.
 *  3. **Every request is bounded, with one line.** A watch has
 *     `WATCH_START_REPLY_MS` to be answered and a close `WATCH_CLOSE_REPLY_MS`.
 *     Past either: one line, the process is ended and replaced, a close it held
 *     settles as done, and a first watch it held is asked again of the
 *     replacement and answered there, exactly as a live watch is bound again
 *     (the fix round: answering it `null` left that project unwatched until its
 *     tab opened again, which the parent never does). A crash does the same. A
 *     first watch is asked of at most `WATCHER_FIRST_WATCH_ASKS` processes, so
 *     a folder whose own watch stops or crashes each one costs that one watch,
 *     never the give-up of every other. The close bound sits
 *     under the disposer's 3 s wedge guard (`capabilities.ts`), so a wedged
 *     process can never hold the quit's drains.
 *  4. **A crash costs a re-read, not a watch.** An exit is one line. A new
 *     process follows after the backoff (`WATCHER_RESTART_BACKOFF_MS`, by
 *     consecutive exits), every live watch is bound again through its queue,
 *     so the existence check runs again, and once its bind has answered each
 *     live callback is handed ONE `new Error(WATCHER_RESTART_ERROR)`. Its text
 *     ends "File system must be re-scanned.", so `isRescanRequired` matches it
 *     and every site already answers it with a re-read, because the events
 *     between the crash and the new stream are lost. Five exits inside ten
 *     minutes and it stops: one line, `null` for every later watch, and every
 *     live watch is handed ONE `new Error(WATCHER_GAVE_UP_ERROR)`, which is the
 *     library's own way of saying a subscription has ended (a fatal error, not
 *     a re-scan), so each site can say it has stopped watching rather than go
 *     quiet (the fix round).
 *  5. **The quit.** From the moment `appLifecycleState()` says quitting, a new
 *     watch is `null`, a close settles here at once, nothing more is posted,
 *     and the first of those calls ENDS the process (`endWatcherChild` below);
 *     it is never started again. The fix round measured why it may not be left
 *     to end with main: at a quit that runs Node's teardown, a close still in
 *     the process's queue met `node::FreeEnvironment` there and aborted it (16
 *     of 45 quits), Phase 36's crash moved into the helper, and its dump reads
 *     as an unclean exit at the next launch. A process ended by a signal runs
 *     no teardown and holds nothing durable, so `capabilities.ts` and
 *     `index.ts` still gain no step.
 *  6. **Every close is tracked.** Each `FolderWatch.close()` is wrapped in
 *     `trackWatcherClose` here, once, so a site never wraps it again, and the
 *     quit's drains keep their meaning: a watcher close now settles within
 *     `WATCH_CLOSE_REPLY_MS` whatever the process does.
 *  7. **Ending the process never holds main's thread.** Electron's own
 *     `kill()` sends SIGTERM and then waits on main's thread, up to 2 s, for
 *     the child to die (`base::EnsureProcessTerminated`): 2,005 ms measured for
 *     a stopped child. So the process is first sent SIGKILL by its pid, and
 *     only when Electron's own process list names that pid as this app's
 *     watcher process right now; Electron's `kill()` then only reaps it (2.5
 *     to 2.8 ms, exit code 0, and no `child-process-gone` record, measured over
 *     a running and a stopped child alike).
 *
 * Its log lines (scope `watcher`, words in `WATCHER_LINES`) name no watched
 * path: only counts, codes, operations and generations. The sites' own lines,
 * which name their folders, are theirs.
 */

import { join } from 'node:path';
import { app, utilityProcess } from 'electron';
import { appLifecycleState } from '../lifecycle';
import { getLog } from '../log';
import { trackWatcherClose } from './teardown';
import { fromWatcherOf, toWatcherOf, type ToWatcher, type WatcherEvent } from './process/wire';

// ---------------------------------------------------------------------------
// What the sites see
// ---------------------------------------------------------------------------

export interface FolderEvent {
  type: 'create' | 'update' | 'delete';
  path: string;
}

/** A watch's callback, in `@parcel/watcher`'s own shape. */
export type FolderEvents = (err: Error | null, events: FolderEvent[]) => void;

export interface FolderWatch {
  /** The folder, as the site wrote it. */
  readonly dir: string;
  /**
   * From the ask to the stream's start, measured here. A stream sees nothing
   * from before it started, so a site whose watch took longer than its own
   * debounce window reads once (D9).
   */
  readonly startedAfterMs: number;
  /** Stop watching. Tracked for the quit; settles within `WATCH_CLOSE_REPLY_MS`. */
  close(): Promise<void>;
}

/** A watch has this long to be answered before the process is replaced. */
export const WATCH_START_REPLY_MS = 10_000;
/** A close has this long. Under the disposer's 3 s wedge guard on purpose. */
export const WATCH_CLOSE_REPLY_MS = 2_000;
/** The wait before a new process, by consecutive exits; the last repeats. */
export const WATCHER_RESTART_BACKOFF_MS: readonly number[] = Object.freeze([250, 1_000, 5_000, 30_000]);
/** This many exits inside the window and no process is started again. */
export const WATCHER_GIVE_UP_EXITS = 5;
export const WATCHER_GIVE_UP_WINDOW_MS = 600_000;
/** Handed once to every live watch after a restart. `isRescanRequired` matches it. */
export const WATCHER_RESTART_ERROR = 'The file watcher restarted. File system must be re-scanned.';
/**
 * Handed once to every live watch when the host gives up. A FATAL error in the
 * library's sense (its `Watcher::notifyError`): the watch has ended. So
 * `isRescanRequired` must NOT match it, because a re-scan says the stream goes
 * on, and it does not.
 */
export const WATCHER_GAVE_UP_ERROR =
  'The file watcher kept exiting, so Tortie stopped it. This folder is not watched until Tortie starts again.';
/** The process's name in Electron's own process list, `app.getAppMetrics()`. */
export const WATCHER_SERVICE_NAME = 'Tortie Watcher';
/** A process that ran this long before it exited starts the backoff again from its first step. */
export const WATCHER_STEADY_MS = 60_000;
/**
 * A first watch is asked of at most this many processes. When the last of them
 * ends (a crash, or a bound that ended it) with the watch still unanswered, it
 * is answered `null`, so a folder whose own watch stops or crashes every
 * process it is asked of costs two exits and that one watch, never the five
 * exits of the give-up and every other watch with them (the fix round).
 */
export const WATCHER_FIRST_WATCH_ASKS = 2;

/** The host's log lines, word for word. The probe reads them from this file. */
export const WATCHER_LINES = Object.freeze({
  exited: 'the watcher process exited',
  restarted: 'the watcher process restarted',
  gaveUp: 'the watcher process kept exiting, so Tortie stopped restarting it',
  turnWait: 'a watcher turn waited',
  noAnswer: 'the watcher process did not answer',
  couldNotStart: 'the watcher process could not start'
});

export interface WatcherProcessObservation {
  /** The process's id, or null with no process (or the in-process stand-in). */
  readonly pid: number | null;
  /** Processes started after the first. */
  readonly restarts: number;
  readonly gaveUp: boolean;
  /** Watches a site holds. */
  readonly live: number;
}

// ---------------------------------------------------------------------------
// The process, as the host drives it
// ---------------------------------------------------------------------------

/**
 * One watcher process, as main sees it: the forked one, or in plain Node the
 * in-process one. Tests and the gate pass a fake through `createWatcherHost`.
 */
export interface WatcherChild {
  readonly pid: number | undefined;
  post(message: ToWatcher): void;
  onMessage(listener: (message: unknown) => void): void;
  onExit(listener: (code: number | null) => void): void;
  /** End it now, running none of its own teardown, and never wait for it on main's thread. */
  kill(): void;
}

/** What starts one. One call, one process, one life. */
export type WatcherSpawner = () => WatcherChild | Promise<WatcherChild>;

export interface WatcherHostLog {
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
}

export interface WatcherHostDeps {
  readonly spawn: WatcherSpawner;
  readonly now: () => number;
  readonly setTimeout: (callback: () => void, ms: number) => unknown;
  readonly clearTimeout: (timer: unknown) => void;
  readonly log: WatcherHostLog;
}

export interface WatcherHost {
  watchFolder(
    dir: string,
    options: { ignore?: readonly (string | RegExp)[] },
    onEvents: FolderEvents
  ): Promise<FolderWatch | null>;
  observation(): WatcherProcessObservation;
  /** Messages from a process that did not validate, dropped whole. A number, never what they held. */
  droppedMessages(): number;
}

/**
 * The real process. `utilityProcess.fork` exists only in Electron's main once
 * the app is ready, which is the only place a watch is asked for; the
 * configuration watches, the first ones, start inside `whenReady`.
 */
function forkWatcherProcess(): WatcherChild {
  const child = utilityProcess.fork(join(__dirname, 'watcher-process.js'), [], {
    env: { TORTIE_WATCHER: '1' },
    stdio: 'ignore',
    serviceName: WATCHER_SERVICE_NAME
  });
  // Electron 43.3.0 hands every channel but `exit`, `stdout` and `stderr` to
  // the emitter's own `emit` (read from the shipped framework's
  // `ForkUtilityProcess`), so a V8 fatal error in the watcher process is
  // `emit('error', 'FatalError', ...)`, and an emitter with no listener for
  // it THROWS in main. The `exit` that always follows is what this host acts on.
  child.on('error', () => undefined);
  // An end asked for before the process has a pid is carried out the moment it
  // has one, or a process forked just before the quit would outlive it.
  let endAsked = false;
  child.on('spawn', () => {
    if (endAsked) endWatcherChild(child);
  });
  return {
    get pid() {
      return child.pid;
    },
    post: (message) => child.postMessage(message),
    onMessage: (listener) => {
      child.on('message', listener);
    },
    onExit: (listener) => {
      child.on('exit', (code) => listener(code));
    },
    kill: () => {
      endAsked = true;
      endWatcherChild(child);
    }
  };
}

/**
 * True when Electron's own process list names `pid`, right now, as this app's
 * watcher process: a utility process carrying `WATCHER_SERVICE_NAME`. It is
 * what lets a signal go to a pid at all. A pid Electron does not name, or a
 * stand-in Electron (a test's, the gate's) that keeps no process list, is never
 * signalled.
 */
function electronNamesWatcher(pid: number): boolean {
  try {
    return app.getAppMetrics().some((m) => m.pid === pid && m.type === 'Utility' && m.name === WATCHER_SERVICE_NAME);
  } catch {
    return false;
  }
}

/**
 * End the watcher process now (rule 7 of the header). SIGKILL first, by the pid
 * Electron names, so a stopped or wedged process dies at once and none of its
 * own teardown runs; then Electron's `kill()`, which finds it already dead and
 * only reaps it. Without the first step `kill()` waits on main's thread for up
 * to 2 s. Never throws.
 */
function endWatcherChild(child: ReturnType<typeof utilityProcess.fork>): void {
  const pid = child.pid;
  if (pid === undefined) return; // not spawned, or already gone: the 'spawn' listener covers the first
  if (electronNamesWatcher(pid)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  try {
    child.kill();
  } catch {
    /* already gone */
  }
}

/** Electron forks the process; plain Node runs the same queue here. */
async function startWatcherProcess(): Promise<WatcherChild> {
  if (process.versions.electron === undefined) {
    const { inProcessWatcher } = await import('./process/in-process');
    return inProcessWatcher();
  }
  return forkWatcherProcess();
}

const watcherLog = getLog('watcher');

const DEFAULT_DEPS: WatcherHostDeps = {
  spawn: startWatcherProcess,
  now: () => Date.now(),
  setTimeout: (callback, ms) => {
    const timer = setTimeout(callback, ms);
    // A bound or a backoff must never keep a script alive on its own.
    timer.unref?.();
    return timer;
  },
  clearTimeout: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
  log: watcherLog
};

// ---------------------------------------------------------------------------
// The host
// ---------------------------------------------------------------------------

interface Entry {
  readonly id: number;
  readonly dir: string;
  readonly ignorePaths: readonly string[];
  readonly ignorePatterns: readonly string[];
  readonly onEvents: FolderEvents;
  readonly askedAt: number;
  /** pending: the first bind has not answered. live: a site holds it. closed: forgotten. */
  state: 'pending' | 'live' | 'closed';
  /** The CURRENT process's subscription id, or null when it is not bound to it. */
  sub: number | null;
  /** The request in flight for this watch's bind, or null. */
  binding: number | null;
  /** A process ended since this watch was last bound: one notice is owed. */
  owesNotice: boolean;
  /** Processes this watch was asked of while still pending (`WATCHER_FIRST_WATCH_ASKS`). */
  asks: number;
  /** The first bind's answer, while pending. */
  answer: ((outcome: FolderWatch | null | Error) => void) | null;
  closing: Promise<void> | null;
}

interface Proc {
  readonly generation: number;
  readonly child: WatcherChild;
  readonly startedAt: number;
  retired: boolean;
}

interface Request {
  readonly generation: number;
  readonly op: 'watch' | 'close';
  readonly timer: unknown;
  /** The watch being bound (op `watch`). */
  readonly entry: Entry | null;
  /** The close's waiter (op `close`). */
  readonly done: (() => void) | null;
}

/** A restart's re-binds, counted until every one has answered. */
interface RebindWave {
  readonly generation: number;
  readonly waiting: Set<number>;
  rebound: number;
  gone: number;
}

const FLAGGED = (pattern: RegExp): string =>
  `RegExp ignore patterns must not have flags (got /${pattern.source}/${pattern.flags}). ` +
  'Flags are not supported by the native matcher.';

/**
 * A host over the given parts. Production uses the one built from the real
 * parts below; the tests and `conformance:watcher` build one over a fake
 * process and a fake clock. The quit is always read from the real
 * `../lifecycle`.
 */
export function createWatcherHost(overrides: Partial<WatcherHostDeps> = {}): WatcherHost {
  const deps: WatcherHostDeps = { ...DEFAULT_DEPS, ...overrides };
  const quitting = (): boolean => appLifecycleState() === 'quitting';

  const entries = new Map<number, Entry>();
  const bySub = new Map<number, Entry>();
  const requests = new Map<number, Request>();
  const exitTimes: number[] = [];
  let current: Proc | null = null;
  let spawning = false;
  let restartTimer: unknown = null;
  let gaveUp = false;
  let generation = 0;
  let restarts = 0;
  let consecutive = 0;
  let wave: RebindWave | null = null;
  let nextEntry = 1;
  let nextReq = 1;
  let dropped = 0;

  function send(proc: Proc, message: ToWatcher): void {
    if (proc.retired) return;
    try {
      proc.child.post(message);
    } catch {
      /* a process that has gone takes nothing, and says so by its exit */
    }
  }

  function safeKill(child: WatcherChild): void {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
  }

  function notify(entry: Entry): void {
    try {
      entry.onEvents(new Error(WATCHER_RESTART_ERROR), []);
    } catch {
      /* a site's throw is its own */
    }
  }

  /**
   * A first watch that will not be served is answered "nothing to watch", and
   * marked closed so a late answer can never make it live.
   */
  function dropPending(entry: Entry): void {
    entry.state = 'closed';
    entries.delete(entry.id);
    const answer = entry.answer;
    entry.answer = null;
    answer?.(null);
  }

  /** Every first watch nobody can serve any more. */
  function abandonPending(): void {
    for (const entry of [...entries.values()]) {
      if (entry.state === 'pending') dropPending(entry);
    }
  }

  function anythingToBind(): boolean {
    for (const entry of entries.values()) if (entry.state !== 'closed') return true;
    return false;
  }

  // -- the process's life ---------------------------------------------------

  function startProcess(): void {
    if (spawning || current !== null || gaveUp || quitting()) return;
    spawning = true;
    let started: Promise<WatcherChild>;
    try {
      started = Promise.resolve(deps.spawn());
    } catch (err) {
      started = Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
    void started.then(adopt, couldNotStart);
  }

  function adopt(child: WatcherChild): void {
    spawning = false;
    if (quitting() || gaveUp) {
      safeKill(child);
      abandonPending();
      return;
    }
    generation += 1;
    if (generation > 1) restarts += 1;
    const proc: Proc = { generation, child, startedAt: deps.now(), retired: false };
    current = proc;
    child.onMessage((message) => receive(proc, message));
    child.onExit((code) => exited(proc, code));
    const live = [...entries.values()].filter((entry) => entry.state === 'live');
    if (generation > 1) {
      wave = { generation, waiting: new Set(live.map((entry) => entry.id)), rebound: 0, gone: 0 };
      waveMaybeDone();
    }
    for (const entry of [...entries.values()]) {
      if (entry.state !== 'closed' && entry.binding === null && entry.sub === null) bind(proc, entry);
    }
  }

  function couldNotStart(err: unknown): void {
    spawning = false;
    deps.log.warn(WATCHER_LINES.couldNotStart, { error: err instanceof Error ? err.name : typeof err });
    afterExit(null);
  }

  function exited(proc: Proc, code: number | null): void {
    if (proc.retired) return; // a replacement this host asked for, already counted
    if (!quitting()) {
      deps.log.warn(`${WATCHER_LINES.exited} (code ${String(code)})`, { code, generation: proc.generation });
    }
    retire(proc, false);
  }

  /**
   * The process is done: its closes settle, its live watches are owed a re-bind
   * and a notice, and a first watch it was still binding is asked again of the
   * next process.
   */
  function retire(proc: Proc, kill: boolean): void {
    if (proc.retired) return;
    proc.retired = true;
    if (current === proc) current = null;
    if (wave !== null && wave.generation === proc.generation) wave = null;
    for (const [req, request] of [...requests]) {
      if (request.generation !== proc.generation) continue;
      requests.delete(req);
      deps.clearTimeout(request.timer);
      if (request.op === 'close') {
        request.done?.();
        continue;
      }
      const entry = request.entry;
      if (entry === null) continue;
      // A first watch it held stays pending and is bound on the next process
      // (`adopt` binds every watch with no bind in flight), so its site is
      // answered there. Answered null only once it has been asked of
      // `WATCHER_FIRST_WATCH_ASKS` processes, or by the give-up and the quit
      // (`abandonPending`).
      if (entry.binding === req) entry.binding = null;
      if (entry.state === 'pending' && entry.asks >= WATCHER_FIRST_WATCH_ASKS) dropPending(entry);
    }
    for (const entry of entries.values()) {
      if (entry.state !== 'live') continue;
      entry.owesNotice = true;
      entry.sub = null;
    }
    bySub.clear();
    if (kill) safeKill(proc.child);
    afterExit(proc.startedAt);
  }

  /** Count the exit, then give up, wait out the backoff, or stop for the quit. */
  function afterExit(startedAt: number | null): void {
    const now = deps.now();
    if (startedAt !== null && now - startedAt >= WATCHER_STEADY_MS) consecutive = 0;
    consecutive += 1;
    exitTimes.push(now);
    while (exitTimes.length > 0 && now - (exitTimes[0] ?? now) > WATCHER_GIVE_UP_WINDOW_MS) exitTimes.shift();
    if (quitting()) {
      abandonPending();
      return;
    }
    if (exitTimes.length >= WATCHER_GIVE_UP_EXITS) {
      giveUp();
      return;
    }
    const steps = WATCHER_RESTART_BACKOFF_MS;
    const backoff = steps[Math.min(consecutive, steps.length) - 1] ?? steps[steps.length - 1] ?? 0;
    if (restartTimer !== null) deps.clearTimeout(restartTimer);
    restartTimer = deps.setTimeout(() => {
      restartTimer = null;
      if (quitting() || gaveUp) {
        abandonPending();
        return;
      }
      // Nothing to watch: the next `watchFolder()` starts one, lazily.
      if (anythingToBind()) startProcess();
    }, backoff);
  }

  function giveUp(): void {
    gaveUp = true;
    if (restartTimer !== null) {
      deps.clearTimeout(restartTimer);
      restartTimer = null;
    }
    deps.log.warn(
      `${WATCHER_LINES.gaveUp} (${exitTimes.length} exits in ${WATCHER_GIVE_UP_WINDOW_MS / 60_000} minutes); ` +
        'folders are not watched until Tortie starts again',
      { exits: exitTimes.length, windowMs: WATCHER_GIVE_UP_WINDOW_MS }
    );
    abandonPending();
    // Each live watch is told ONCE that it has ended, in the library's own way
    // (a fatal error), so a site can say it stopped watching. Not a re-scan:
    // that says the stream goes on, and it does not. The fix round measured
    // the give-up under research 143's storm (6 exits in 862 s), after which a
    // held folder heard nothing for 338 s and no site had been told.
    for (const entry of [...entries.values()]) {
      entry.sub = null;
      if (entry.state !== 'live') continue;
      entry.owesNotice = false;
      try {
        entry.onEvents(new Error(WATCHER_GAVE_UP_ERROR), []);
      } catch {
        /* a site's throw is its own */
      }
    }
  }

  // -- requests -------------------------------------------------------------

  function bind(proc: Proc, entry: Entry): void {
    const req = nextReq;
    nextReq += 1;
    // Registered BEFORE it is posted: an answer can come back inside the post.
    const timer = deps.setTimeout(() => noAnswer(proc, req), WATCH_START_REPLY_MS);
    requests.set(req, { generation: proc.generation, op: 'watch', timer, entry, done: null });
    entry.binding = req;
    if (entry.state === 'pending') entry.asks += 1;
    send(proc, {
      kind: 'watch',
      req,
      dir: entry.dir,
      ignorePaths: entry.ignorePaths,
      ignorePatterns: entry.ignorePatterns
    });
  }

  function noAnswer(proc: Proc, req: number): void {
    const request = requests.get(req);
    if (request === undefined || proc.retired || current !== proc) return;
    const boundMs = request.op === 'watch' ? WATCH_START_REPLY_MS : WATCH_CLOSE_REPLY_MS;
    const outcome = quitting() ? 'ended' : 'replaced';
    deps.log.warn(`${WATCHER_LINES.noAnswer} a ${request.op} within ${boundMs} ms, so it was ${outcome}`, {
      op: request.op,
      boundMs,
      generation: proc.generation
    });
    retire(proc, true);
  }

  /** A close nobody waits for: one for a watch closed while it was being bound. */
  function closeQuietly(proc: Proc, sub: number): void {
    const req = nextReq;
    nextReq += 1;
    send(proc, { kind: 'close', req, sub });
  }

  function waveMaybeDone(): void {
    if (wave === null || wave.waiting.size > 0) return;
    const done = wave;
    wave = null;
    deps.log.info(`${WATCHER_LINES.restarted} (generation ${done.generation}, ${done.rebound} watches re-bound)`, {
      generation: done.generation,
      rebound: done.rebound,
      gone: done.gone
    });
  }

  function leaveWave(entry: Entry, bound: boolean | null): void {
    if (wave === null || !wave.waiting.delete(entry.id)) return;
    if (bound === true) wave.rebound += 1;
    if (bound === false) wave.gone += 1;
    waveMaybeDone();
  }

  function answered(req: number, sub: number | null, error: string | null): void {
    const request = requests.get(req);
    if (request === undefined || request.op !== 'watch' || request.entry === null) return;
    requests.delete(req);
    deps.clearTimeout(request.timer);
    const entry = request.entry;
    if (entry.binding === req) entry.binding = null;
    const proc = current;
    if (entry.state === 'closed') {
      // Closed while it was being bound: the process holds a watch nobody wants.
      if (sub !== null && proc !== null) closeQuietly(proc, sub);
      return;
    }
    if (sub !== null) {
      entry.sub = sub;
      bySub.set(sub, entry);
    }
    if (entry.state === 'pending') {
      if (error !== null) {
        entry.state = 'closed';
        entries.delete(entry.id);
        const answer = entry.answer;
        entry.answer = null;
        answer?.(new Error(error));
        return;
      }
      if (sub === null) {
        dropPending(entry);
        return;
      }
      const answer = entry.answer;
      entry.answer = null;
      entry.state = 'live';
      answer?.(folderWatchOf(entry, Math.max(0, deps.now() - entry.askedAt)));
      return;
    }
    // A re-bind after a restart. Its notice comes now, after the new stream
    // started, so the re-read it causes covers everything the stream missed.
    if (entry.owesNotice) {
      entry.owesNotice = false;
      notify(entry);
    }
    leaveWave(entry, sub !== null);
  }

  function closed(req: number): void {
    const request = requests.get(req);
    if (request === undefined || request.op !== 'close') return;
    requests.delete(req);
    deps.clearTimeout(request.timer);
    request.done?.();
  }

  function deliver(sub: number, error: string | null, events: readonly WatcherEvent[]): void {
    const entry = bySub.get(sub);
    if (entry === undefined || entry.state !== 'live') return;
    try {
      entry.onEvents(
        error === null ? null : new Error(error),
        events.map((event) => ({ type: event.type, path: event.path }))
      );
    } catch {
      // In main a site's throw used to reach the native callback, which ends
      // the process. Here it is the site's own.
    }
  }

  function receive(proc: Proc, raw: unknown): void {
    if (proc.retired || current !== proc) return;
    const message = fromWatcherOf(raw);
    if (message === null) {
      dropped += 1;
      return;
    }
    switch (message.kind) {
      case 'ready':
        return;
      case 'watching':
        answered(message.req, message.sub, null);
        return;
      case 'refused':
        answered(message.req, null, message.error);
        return;
      case 'closed':
        closed(message.req);
        return;
      case 'events':
        deliver(message.sub, message.error, message.events);
        return;
      case 'note':
        deps.log.info(
          `${WATCHER_LINES.turnWait} ${message.waitedMs} ms for its turn (${message.op}, ${message.behind} ahead of it)`,
          { op: message.op, waitedMs: message.waitedMs, behind: message.behind, generation: proc.generation }
        );
        return;
    }
  }

  /**
   * THE QUIT ENDS THE PROCESS (rule 5 of the header, the fix round). Called by
   * the first watch or close that finds the app quitting: nothing more is
   * posted, every request the process held settles (a first watch with null,
   * through `afterExit`'s quitting arm), and the process is ended by
   * `endWatcherChild`, so no close is still in its queue when a teardown runs.
   */
  function endForQuit(): void {
    const proc = current;
    if (proc === null || proc.retired) return;
    retire(proc, true);
  }

  // -- a watch's life --------------------------------------------------------

  function closeEntry(entry: Entry): Promise<void> {
    if (entry.closing !== null) return entry.closing;
    entry.state = 'closed';
    entries.delete(entry.id);
    leaveWave(entry, null);
    const sub = entry.sub;
    entry.sub = null;
    if (sub !== null) bySub.delete(sub);
    const proc = current;
    let done: Promise<void>;
    if (quitting()) {
      // THE QUIT: settled here, now, with nothing posted; the process ends.
      endForQuit();
      done = Promise.resolve();
    } else if (sub === null || proc === null || proc.retired) {
      done = Promise.resolve();
    } else {
      done = new Promise<void>((resolve) => {
        const req = nextReq;
        nextReq += 1;
        const timer = deps.setTimeout(() => noAnswer(proc, req), WATCH_CLOSE_REPLY_MS);
        requests.set(req, { generation: proc.generation, op: 'close', timer, entry: null, done: resolve });
        send(proc, { kind: 'close', req, sub });
      });
    }
    entry.closing = trackWatcherClose(done);
    return entry.closing;
  }

  function folderWatchOf(entry: Entry, startedAfterMs: number): FolderWatch {
    return { dir: entry.dir, startedAfterMs, close: () => closeEntry(entry) };
  }

  async function watchFolder(
    dir: string,
    options: { ignore?: readonly (string | RegExp)[] },
    onEvents: FolderEvents
  ): Promise<FolderWatch | null> {
    // THE QUIT, and a host that gave up: nothing to watch, and nothing sent.
    if (quitting()) {
      endForQuit();
      return null;
    }
    if (gaveUp) return null;
    const ignorePaths: string[] = [];
    const ignorePatterns: string[] = [];
    for (const entry of options.ignore ?? []) {
      if (entry instanceof RegExp) {
        // Refused before it leaves main, as the library's wrapper refuses it.
        if (entry.flags !== '') throw new Error(FLAGGED(entry));
        ignorePatterns.push(entry.source);
      } else {
        ignorePaths.push(entry);
      }
    }
    // The process's own validator, asked here, so it never drops what main meant.
    if (toWatcherOf({ kind: 'watch', req: 0, dir, ignorePaths, ignorePatterns }) === null) {
      throw new Error('the watch asked for is larger than the file watcher takes');
    }
    const entry: Entry = {
      id: nextEntry,
      dir,
      ignorePaths,
      ignorePatterns,
      onEvents,
      askedAt: deps.now(),
      state: 'pending',
      sub: null,
      binding: null,
      owesNotice: false,
      asks: 0,
      answer: null,
      closing: null
    };
    nextEntry += 1;
    const outcome = new Promise<FolderWatch | null | Error>((resolve) => {
      entry.answer = resolve;
    });
    entries.set(entry.id, entry);
    if (current !== null) bind(current, entry);
    else if (restartTimer === null) startProcess();
    // Otherwise a process is starting, or the backoff is running: it binds
    // every waiting watch when it is up.
    const result = await outcome;
    if (result instanceof Error) throw result;
    return result;
  }

  return {
    watchFolder,
    observation(): WatcherProcessObservation {
      let live = 0;
      for (const entry of entries.values()) if (entry.state === 'live') live += 1;
      return { pid: current?.child.pid ?? null, restarts, gaveUp, live };
    },
    droppedMessages: () => dropped
  };
}

// ---------------------------------------------------------------------------
// The one host main has
// ---------------------------------------------------------------------------

let mainHost: WatcherHost | null = null;

function theHost(): WatcherHost {
  mainHost ??= createWatcherHost();
  return mainHost;
}

/**
 * Watch `dir` for changes, through the watcher process. Answers `null` when
 * there is nothing to watch: the folder is not there at the watch's turn, the
 * app is quitting, or the watcher has stopped restarting. Rejects when the
 * library refuses the watch, with its words, as a direct subscribe did.
 */
export function watchFolder(
  dir: string,
  options: { ignore?: readonly (string | RegExp)[] },
  onEvents: FolderEvents
): Promise<FolderWatch | null> {
  return theHost().watchFolder(dir, options, onEvents);
}

/** For the probe and the tests: the process's id, its restarts, whether it gave up, the live watches. */
export function watcherProcessObservation(): WatcherProcessObservation {
  return theHost().observation();
}
