/**
 * The probe half of `npm run conformance:watcher` (Phase 151, widened by
 * Phase 365).
 *
 * It prints, as JSON, what the worktree exclusion planner produces for a
 * range of ignored root counts, so the checker beside it
 * (`conformance-watcher.mjs`) can assert the eight path budget executably
 * rather than by reading the constant. It also asks every overflow entry what
 * it actually MATCHES, over a set of directory names that are not plain
 * identifiers, which is the half the first version of this gate was missing.
 *
 * PHASE 365 (build/p365/SPEC.md §4.3, §7.1, D12) adds THE DRIVES, because "one
 * at a time" is a property of runs and not of text. For every variant the gate
 * hands it on standard input (the shipping source, and one copy per W365 plant,
 * each a set of in-memory file texts laid over the tree), it loads
 * `src/main/watcher/process/queue.ts` and `src/main/watcher/host.ts` through a
 * loader of its own (the TypeScript compiler's transpiler, one module cache per
 * drive, so every drive starts from a fresh host and a fresh lifecycle) and
 * drives them over fakes:
 *
 *   - the queue over a FAKE NATIVE MODULE that records how many calls are in
 *     flight at once and in what order they start (W365-3), what a folder that
 *     is not there answers and whether the subscribe follows the check in the
 *     same synchronous turn (W365-4), and a close whose folder is gone, over a
 *     fake clock (W365-5);
 *   - the host over a FAKE `utilityProcess` and a fake log, with the REAL
 *     `src/main/lifecycle.ts` and `src/main/watcher/teardown.ts`, every timer
 *     and clock in the loaded modules replaced by one fake clock: whether main
 *     loads the in-process path or the native module (W365-2), what each reply
 *     bound does when the process never answers (W365-6), what an unexpected
 *     exit does, its backoff, its give-up and a quit (W365-8), and what a quit
 *     does to a watch and a close (W365-9).
 *
 * THE HOST IS DRIVEN AS MAIN RUNS IT. The drives call the module's own
 * `watchFolder` export, so the host they reach is the one production builds
 * (its default spawner, the `process.versions.electron` branch, its real
 * timers and its `getLog('watcher')`), with Electron's `utilityProcess`, the
 * log and the clock faked underneath it. They never use the host's injection
 * seam (`createWatcherHost`), which is what the unit tests drive; a defect in
 * how production composes the host is therefore in reach here.
 *
 * The native module and the in-process path are STUBS here and are never
 * loaded for real: the probe records that a module asked for them and that is
 * all. Nothing waits on a real clock but a ceiling that stops a planted
 * deadlock from hanging the gate. A process the drives identify is the one the
 * host ASKED for a watch, never merely the latest fork.
 *
 * `--root <dir>` reads another tree's sources (a verifier's hostile copy), and
 * runs that tree's watcher code in this process to drive it; the default is
 * the checkout this file is in.
 *
 * IT SPAWNS NOTHING. It opens no FSEvents stream, loads no native module,
 * starts no tmux server, launches no Electron, runs no git and touches nothing
 * under the person's home.
 *
 * IT SENDS NO SIGNAL (the fix round). The host now ends a process by a SIGKILL
 * to its pid once Electron's own process list names it, and the fake children
 * carry made-up pids that may name a real process on this machine. So every
 * loaded module sees a `process` whose `kill` only RECORDS (`FakeWorld.kill`,
 * or a throw in a drive with no world), and the fake Electron's
 * `app.getAppMetrics()` names only the fake children still up. A plant that
 * drops the host's guard therefore signals nothing either.
 */

import { EventEmitter } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const argv = process.argv.slice(2);
const rootFlag = argv.indexOf('--root');
const ROOT =
  rootFlag >= 0 && argv[rootFlag + 1] !== undefined
    ? resolve(argv[rootFlag + 1] as string)
    : resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Phase 151: the planner, over synthetic input.
// ---------------------------------------------------------------------------

interface IgnoredRootsModule {
  EXCLUSION_PATH_BUDGET: number;
  overflowMatcher(name: string): RegExp;
  parseIgnoredRoots(z: string): string[];
  planWorktreeIgnore(root: string, rels: string[]): {
    paths: string[];
    overflow: RegExp[];
    ignore: (string | RegExp)[];
  };
}

const irNamespace = (await import(
  pathToFileURL(join(ROOT, 'src/main/watcher/ignored-roots.ts')).href
)) as Partial<IgnoredRootsModule> & { default?: Partial<IgnoredRootsModule> };
const ir = (
  typeof irNamespace.planWorktreeIgnore === 'function' ? irNamespace : irNamespace.default
) as IgnoredRootsModule;

const COUNTS = [0, 1, 6, 7, 8, 9, 12, 30, 100];

const rels = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `root${String(i).padStart(3, '0')}`);

/**
 * Ask an overflow matcher the question the watcher really asks it.
 *
 * `node_modules/@parcel/watcher/wrapper.js` takes the RegExp's SOURCE, wraps
 * it as `^[\s\S]*(?:<source>)[\s\S]*$` so the C++ side's full string
 * `std::regex_match` behaves like `.test()`, and `Watcher::isIgnored` runs the
 * result against the path RELATIVE to the watch root.
 */
const excludes = (m: RegExp, rel: string): boolean =>
  new RegExp(`^[\\s\\S]*(?:${m.source})[\\s\\S]*$`).test(rel);

/**
 * Directory names a person can really create, each one previously miscompiled
 * when an overflow entry was the glob string `<name>/**`. The sibling is the
 * innocent directory the old glob hit instead.
 */
const HOSTILE: ReadonlyArray<{ name: string; sibling: string }> = [
  { name: '!archive', sibling: 'archive' },
  { name: 'build (old)', sibling: 'build old' },
  { name: '{x,src}', sibling: 'src' },
  { name: '@(src)', sibling: 'src' },
  { name: 'nor*mal', sibling: 'normal' },
  { name: '.tmp', sibling: 'atmp' },
  { name: '[cache]', sibling: 'c' },
  { name: 'a+b', sibling: 'aab' }
];

/** Paths that must NEVER be excluded by any single ignored root. */
const NEVER = ['src/main.ts', 'README.md', 'a', 'a/b', 'deep/deep/f'];

// ---------------------------------------------------------------------------
// Phase 365: the loader, the fake clock and the fake process.
// ---------------------------------------------------------------------------

const QUEUE = 'src/main/watcher/process/queue.ts';
const HOST = 'src/main/watcher/host.ts';
const LIFECYCLE = 'src/main/lifecycle.ts';
const TEARDOWN = 'src/main/watcher/teardown.ts';

/** The stub keys: a bare specifier, or a module's path under src/ with no extension. */
const NATIVE = '@parcel/watcher';
const IN_PROCESS = 'main/watcher/process/in-process';

/** A fake folder tree root. Nothing under it exists; no drive reads the disk. */
const D = '/p365-gate';

/** A realistic epoch for the fake clock, so nothing reads 0 as "never". */
const T0 = 1_800_000_000_000;

/**
 * The longest one drive may take in REAL time before it is reported stuck.
 * A drive takes milliseconds; the ceiling is generous so a loaded machine
 * never reads as a stuck drive.
 */
const CEILING_MS = 20_000;

type Overlay = Record<string, string>;

const relOf = (abs: string): string => relative(ROOT, abs).split(sep).join('/');

/**
 * What the code under test threw where no request could see it: out of a
 * listener the fake process called, out of a timer the fake clock fired, or as
 * an uncaught exception or an unhandled rejection of its own. Collected rather
 * than allowed to end the probe, so one broken variant (a planted one, or a
 * verifier's hostile copy) is reported as that drive's finding and every other
 * variant is still driven.
 */
const STRAYS: string[] = [];
const strayText = (err: unknown): string => (err instanceof Error ? `${err.name}: ${err.message}` : String(err));
const onStray = (err: unknown): void => {
  STRAYS.push(strayText(err));
};

const flush = async (rounds = 8): Promise<void> => {
  for (let i = 0; i < rounds; i += 1) {
    await new Promise<void>((done) => setImmediate(done));
  }
};

interface FakeTimer {
  id: number;
  at: number;
  fn: (...a: unknown[]) => unknown;
  args: unknown[];
  every: number | null;
}

/** One clock for every module a drive loads: timers fire only when the drive says. */
class FakeClock {
  t = T0;
  private seq = 0;
  private readonly timers = new Map<number, FakeTimer>();
  readonly thrown: string[] = [];

  now = (): number => this.t;

  private add(fn: unknown, ms: unknown, args: unknown[], repeat: boolean): object {
    const n = Number(ms);
    const delay = n >= 1 && n <= 2_147_483_647 ? n : 1;
    this.seq += 1;
    const id = this.seq;
    const entry: FakeTimer = {
      id,
      at: this.t + delay,
      fn: typeof fn === 'function' ? (fn as (...a: unknown[]) => unknown) : () => undefined,
      args,
      every: repeat ? delay : null
    };
    this.timers.set(id, entry);
    const handle = {
      id,
      unref: () => handle,
      ref: () => handle,
      hasRef: () => true,
      refresh: () => {
        entry.at = this.t + delay;
        return handle;
      },
      [Symbol.toPrimitive]: () => id
    };
    return handle;
  }

  setTimeout = (fn: unknown, ms?: unknown, ...args: unknown[]): object => this.add(fn, ms, args, false);
  setInterval = (fn: unknown, ms?: unknown, ...args: unknown[]): object => this.add(fn, ms, args, true);
  clearTimeout = (handle: unknown): void => {
    if (handle !== null && typeof handle === 'object' && 'id' in handle) {
      this.timers.delete((handle as { id: number }).id);
    } else if (typeof handle === 'number') {
      this.timers.delete(handle);
    }
  };
  clearInterval = (handle: unknown): void => this.clearTimeout(handle);

  /** Move time forward, firing every due timer in order, settling between them. */
  async advance(ms: number): Promise<void> {
    const end = this.t + ms;
    for (;;) {
      await flush();
      let next: FakeTimer | null = null;
      for (const e of this.timers.values()) {
        if (e.at <= end && (next === null || e.at < next.at || (e.at === next.at && e.id < next.id))) next = e;
      }
      if (next === null) break;
      this.t = Math.max(this.t, next.at);
      if (next.every === null) this.timers.delete(next.id);
      else next.at = this.t + next.every;
      try {
        next.fn(...next.args);
      } catch (err) {
        this.thrown.push(strayText(err));
        onStray(err);
      }
    }
    this.t = end;
    await flush();
  }

  /** `Date` for the loaded modules: `Date.now()` and `new Date()` read this clock. */
  makeDate(): DateConstructor {
    const clock = this;
    class FakeDate extends Date {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(clock.t);
        else super(...(args as [number]));
      }
      static override now(): number {
        return clock.t;
      }
    }
    return FakeDate as unknown as DateConstructor;
  }

  makePerformance(): { now(): number; timeOrigin: number } {
    return { now: () => this.t - T0, timeOrigin: T0 };
  }
}

interface LogLine {
  scope: string;
  level: string;
  msg: string;
  at: number;
}

type Policy = (child: FakeChild, message: Record<string, unknown>) => boolean;

/** Electron's `utilityProcess`, as far as the host can see it. */
class FakeWorld {
  readonly forks: FakeChild[] = [];
  /** Answer this message? Every drive sets its own. */
  policy: Policy = () => true;
  /** Folders the process answers "nothing to watch" for. */
  readonly missing = new Set<string>();
  /**
   * Every signal the code under test asked for, RECORDED AND NEVER SENT: the
   * loaded modules see a `process` whose `kill` is this, so a planted host
   * that signals a fake pid signals nothing on this machine (the fix round).
   */
  readonly signals: { pid: number; signal: string }[] = [];
  /** Every end in order: `signal <SIG> <pid>` and `kill <pid>` (Electron's own kill()). */
  readonly trail: string[] = [];

  constructor(readonly clock: FakeClock) {}

  fork = (modulePath: unknown, args?: unknown, options?: unknown): FakeChild => {
    const child = new FakeChild(this, this.forks.length + 1, String(modulePath), args, options);
    this.forks.push(child);
    return child;
  };

  /** Electron's own process list: every fake child still up, under the name the host forks it with. */
  metrics = (): { pid: number; type: string; name: string; serviceName: string }[] =>
    this.forks
      .filter((c) => !c.exited)
      .map((c) => ({
        pid: c.pid,
        type: 'Utility',
        name: String((c.options as { serviceName?: unknown } | undefined)?.serviceName ?? ''),
        serviceName: 'node.mojom.NodeService'
      }));

  /** `process.kill` as the loaded modules see it: recorded, and a SIGKILL ends that fake child. */
  kill = (pid: unknown, signal?: unknown): boolean => {
    const sig = signal === undefined ? 'SIGTERM' : String(signal);
    this.signals.push({ pid: Number(pid), signal: sig });
    this.trail.push(`signal ${sig} ${String(pid)}`);
    const child = this.forks.find((c) => c.pid === Number(pid));
    if (child !== undefined && sig === 'SIGKILL') child.signalled();
    return true;
  };
}

class FakeChild extends EventEmitter {
  readonly pid: number;
  readonly sent: Record<string, unknown>[] = [];
  readonly subs = new Map<string, number>();
  readonly stdout = null;
  readonly stderr = null;
  killed = false;
  /** Electron's `kill()` calls. */
  kills = 0;
  exited = false;
  private nextSub: number;

  constructor(
    private readonly world: FakeWorld,
    readonly index: number,
    readonly modulePath: string,
    readonly args: unknown,
    readonly options: unknown
  ) {
    super();
    this.pid = 70_000 + index;
    this.nextSub = index * 100 + 1;
    queueMicrotask(() => {
      if (this.exited) return;
      this.fire('spawn');
      this.send({ kind: 'ready' });
    });
  }

  /** Emit to the host's listeners; what they throw is a stray, never the probe's end. */
  private fire(event: string, ...args: unknown[]): void {
    try {
      this.emit(event, ...args);
    } catch (err) {
      onStray(err);
    }
  }

  postMessage(message: unknown): void {
    if (this.exited) return;
    const m = JSON.parse(JSON.stringify(message ?? null)) as Record<string, unknown> | null;
    if (m === null || typeof m !== 'object') return;
    this.sent.push(m);
    if (!this.world.policy(this, m)) return;
    if (m['kind'] === 'watch') {
      const dir = String(m['dir']);
      let sub: number | null = null;
      if (!this.world.missing.has(dir)) {
        sub = this.nextSub;
        this.nextSub += 1;
        this.subs.set(dir, sub);
      }
      this.send({ kind: 'watching', req: m['req'], sub, waitedMs: 0 });
    } else if (m['kind'] === 'close') {
      this.send({ kind: 'closed', req: m['req'] });
    }
  }

  send(message: Record<string, unknown>): void {
    queueMicrotask(() => {
      if (!this.exited) this.fire('message', message);
    });
  }

  /** One batch of events for a folder this process is watching. */
  events(dir: string, events: { type: string; path: string }[]): boolean {
    const sub = this.subs.get(dir);
    if (sub === undefined) return false;
    this.send({ kind: 'events', sub, error: null, events });
    return true;
  }

  /** Electron's `kill()`: ended a moment later, and counted. */
  kill(): boolean {
    this.kills += 1;
    this.world.trail.push(`kill ${String(this.pid)}`);
    if (this.exited) return false;
    this.killed = true;
    // The exit of a killed process arrives a moment later, on the fake clock,
    // so a drive can read what the host did BEFORE it learnt of the exit.
    this.world.clock.setTimeout(() => this.exit(null), 5);
    return true;
  }

  /** A SIGKILL to this pid, recorded by the world: the same end as kill(), without the count. */
  signalled(): void {
    if (this.exited) return;
    this.killed = true;
    this.world.clock.setTimeout(() => this.exit(null), 5);
  }

  crash(code: number): void {
    queueMicrotask(() => this.exit(code));
  }

  private exit(code: number | null): void {
    if (this.exited) return;
    this.exited = true;
    this.fire('exit', code);
  }
}

const transpiled = new Map<string, string>();

function transpile(abs: string, text: string): string {
  const key = `${abs}\0${text}`;
  const hit = transpiled.get(key);
  if (hit !== undefined) return hit;
  const js = ts.transpileModule(text, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      isolatedModules: true
    },
    fileName: abs
  }).outputText;
  transpiled.set(key, js);
  return js;
}

interface Loader {
  load(rel: string): Record<string, unknown>;
  /** The stub keys a loaded module asked for. */
  readonly hits: Set<string>;
  /** Every module loaded for real, by its path under the root. */
  loaded(): string[];
}

/**
 * Load a module of the tree, and what it imports, from text: the overlay's
 * text when the variant has one, else the file's. Relative and `@shared/`
 * imports are loaded the same way; a stub key is answered by the stub; Node's
 * built-ins are required as they are. Every module sees the drive's clock.
 */
function makeLoader(
  overlay: Overlay,
  clock: FakeClock,
  given: Record<string, unknown>,
  signal: (pid: unknown, sig?: unknown) => boolean = () => {
    throw new Error('the watcher gate sends no signal, and this drive gave the code under test none to record');
  }
): Loader {
  // THE FIX ROUND. Every loaded module sees this `process`: the real one, with
  // `kill` replaced by the drive's recorder. The host now ends its process by a
  // SIGKILL to a pid, and the fake children's pids are numbers that may name a
  // real process on this machine, so a plant (or a defect) that signals one
  // must reach the recorder and never the kernel.
  const guardedProcess = new Proxy(process, {
    get: (target, name) => (name === 'kill' ? signal : Reflect.get(target, name))
  });
  // Node's timer modules are the drive's clock too, so a module that imports
  // its timers rather than using the globals is still driven, not waited on.
  const timers = {
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    setInterval: clock.setInterval,
    clearInterval: clock.clearInterval,
    setImmediate,
    clearImmediate
  };
  const timerPromises = {
    setTimeout: (ms: number, value?: unknown) => new Promise((done) => clock.setTimeout(() => done(value), ms)),
    setImmediate: (value?: unknown) => new Promise((done) => setImmediate(() => done(value)))
  };
  const stubs: Record<string, unknown> = {
    'node:timers': timers,
    timers,
    'node:timers/promises': timerPromises,
    'timers/promises': timerPromises,
    'node:process': guardedProcess,
    process: guardedProcess,
    ...given
  };
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const hits = new Set<string>();
  const has = (abs: string): boolean =>
    Object.prototype.hasOwnProperty.call(overlay, relOf(abs)) || existsSync(abs);
  const read = (abs: string): string => {
    const rel = relOf(abs);
    return Object.prototype.hasOwnProperty.call(overlay, rel) ? (overlay[rel] as string) : readFileSync(abs, 'utf8');
  };
  const srcKey = (abs: string): string =>
    relative(join(ROOT, 'src'), abs).split(sep).join('/').replace(/\.(?:tsx?|js)$/, '').replace(/\/index$/, '');
  const FakeDate = clock.makeDate();
  const performance = clock.makePerformance();

  const load = (abs: string): Record<string, unknown> => {
    const cached = cache.get(abs);
    if (cached !== undefined) return cached.exports;
    const js = transpile(abs, read(abs));
    const module = { exports: {} as Record<string, unknown> };
    cache.set(abs, module);
    const req = (spec: string): unknown => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) {
        hits.add(spec);
        return stubs[spec];
      }
      let base: string | null = null;
      if (spec.startsWith('@shared/')) base = join(ROOT, 'src', 'shared', spec.slice('@shared/'.length));
      else if (spec.startsWith('.')) base = resolve(dirname(abs), spec);
      if (base === null) return createRequire(abs)(spec);
      const stem = base.replace(/\.(?:tsx?|js)$/, '');
      const key = srcKey(stem);
      if (Object.prototype.hasOwnProperty.call(stubs, key)) {
        hits.add(key);
        return stubs[key];
      }
      for (const candidate of [`${stem}.ts`, `${stem}.tsx`, join(stem, 'index.ts')]) {
        if (has(candidate)) return load(candidate);
      }
      throw new Error(`${relOf(abs)} imports '${spec}', which names no .ts file`);
    };
    const run = new Function(
      'require', 'module', 'exports', '__filename', '__dirname',
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'process',
      js
    );
    run(
      req, module, module.exports, abs, dirname(abs),
      clock.setTimeout, clock.clearTimeout, clock.setInterval, clock.clearInterval, FakeDate, performance, guardedProcess
    );
    return module.exports;
  };

  return {
    load: (rel) => load(join(ROOT, rel)),
    hits,
    loaded: () => [...cache.keys()].map(relOf)
  };
}

interface Tracked {
  settled: boolean;
  ok: boolean;
  value: unknown;
  error: string | null;
  at: number | null;
  /** Settles with the call, never rejects. */
  done: Promise<void>;
}

/** Follow a promise without awaiting it, so a drive never hangs on one. */
function track(start: () => unknown, clock?: FakeClock): Tracked {
  let p: Promise<unknown>;
  try {
    p = Promise.resolve(start());
  } catch (err) {
    p = Promise.reject(err);
  }
  const t: Tracked = { settled: false, ok: false, value: undefined, error: null, at: null, done: Promise.resolve() };
  t.done = p.then(
    (value) => {
      t.settled = true;
      t.ok = true;
      t.value = value;
      t.at = clock === undefined ? null : clock.t;
    },
    (err: unknown) => {
      t.settled = true;
      t.error = err instanceof Error ? err.message : String(err);
      t.at = clock === undefined ? null : clock.t;
    }
  );
  return t;
}

/**
 * Run one drive under a real-time ceiling, reporting a throw or a stall as its
 * error, and anything the code under test threw where no request could see it
 * as the drive's `strays`.
 */
async function drive<T extends object>(name: string, body: () => Promise<T>): Promise<object> {
  let timer: NodeJS.Timeout | undefined;
  const straysBefore = STRAYS.length;
  let result: object;
  try {
    result = await Promise.race([
      body(),
      new Promise<{ error: string }>((done) => {
        timer = setTimeout(
          () => done({ error: `the ${name} drive did not finish within ${String(CEILING_MS)} ms of real time` }),
          CEILING_MS
        );
      })
    ]);
  } catch (err) {
    result = { error: err instanceof Error ? `${err.message}` : String(err) };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
  // A stray the drive's own last turns raised is still this drive's.
  await flush();
  const strays = STRAYS.slice(straysBefore);
  return strays.length === 0 ? result : { ...result, strays };
}

/** A watch answer's subscription id: a number, `null` for nothing to watch, else undefined. */
function subOf(answer: unknown): number | null | undefined {
  if (typeof answer === 'number') return answer;
  if (answer !== null && typeof answer === 'object' && 'sub' in answer) {
    const sub = (answer as { sub: unknown }).sub;
    if (sub === null || typeof sub === 'number') return sub;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// The queue drives (W365-3, W365-4, W365-5).
// ---------------------------------------------------------------------------

interface QueueApi {
  watch(dir: string, ignore: unknown[], onEvents: (...a: unknown[]) => void): Promise<unknown>;
  close(sub: number): Promise<unknown>;
}

function queueOf(loader: Loader, deps: Record<string, unknown>): QueueApi {
  const mod = loader.load(QUEUE);
  const create = mod['createWatchQueue'];
  if (typeof create !== 'function') throw new Error(`${QUEUE} exports no createWatchQueue`);
  return create(deps) as QueueApi;
}

const noop = (): void => undefined;

/** W365-3: 400 mixed operations, in bursts, over a native module that records overlap. */
async function driveFifo(overlay: Overlay): Promise<object> {
  const clock = new FakeClock();
  const loader = makeLoader(overlay, clock, { [NATIVE]: {} });
  const OPS = 400;
  let seed = 365;
  const rand = (): number => {
    seed = (seed * 1_103_515_245 + 12_345) & 0x7fffffff;
    return seed;
  };
  const pause = async (n: number): Promise<void> => {
    for (let i = 0; i < n; i += 1) await new Promise<void>((done) => setImmediate(done));
  };
  let inFlight = 0;
  let maxInFlight = 0;
  let nativeCalls = 0;
  const requested: string[] = [];
  const started: string[] = [];
  const enter = (what: string): void => {
    nativeCalls += 1;
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    started.push(what);
  };
  const native = {
    subscribe: async (dir: string): Promise<{ unsubscribe(): Promise<void> }> => {
      enter(`watch ${dir}`);
      try {
        await pause(1 + (rand() % 3));
      } finally {
        inFlight -= 1;
      }
      return {
        unsubscribe: async () => {
          enter(`close ${dir}`);
          try {
            await pause(1 + (rand() % 3));
          } finally {
            inFlight -= 1;
          }
        }
      };
    }
  };
  const q = queueOf(loader, { native, exists: () => true, now: clock.now, setTimeout: clock.setTimeout, note: noop });
  const live: { sub: number; dir: string }[] = [];
  const all: Tracked[] = [];
  let made = 0;
  while (made < OPS) {
    const burst = 1 + (rand() % 8);
    for (let k = 0; k < burst && made < OPS; k += 1, made += 1) {
      if (live.length > 0 && rand() % 3 === 0) {
        const [entry] = live.splice(rand() % live.length, 1);
        if (entry === undefined) continue;
        requested.push(`close ${entry.dir}`);
        all.push(track(() => q.close(entry.sub)));
      } else {
        const dir = `${D}/fifo/${String(made)}`;
        requested.push(`watch ${dir}`);
        const t = track(() => q.watch(dir, [], noop));
        all.push(t);
        void t.done.then(() => {
          const sub = subOf(t.value);
          if (typeof sub === 'number') live.push({ sub, dir });
        });
      }
    }
    await pause(1 + (rand() % 4));
  }
  for (let i = 0; i < 4000 && all.some((t) => !t.settled); i += 1) await pause(1);
  let firstDifference: string | null = null;
  for (let i = 0; i < Math.max(requested.length, started.length); i += 1) {
    if (requested[i] !== started[i]) {
      firstDifference = `operation ${String(i + 1)} asked ${requested[i] ?? 'nothing'} and the native module ran ${started[i] ?? 'nothing'}`;
      break;
    }
  }
  return {
    ops: requested.length,
    nativeCalls,
    maxInFlight,
    fifo: firstDifference === null,
    firstDifference,
    unanswered: all.filter((t) => !t.settled).length,
    failed: all.filter((t) => t.settled && !t.ok).length
  };
}

/** W365-4: a folder that is not there, and whether the subscribe follows the check at once. */
async function driveCheck(overlay: Overlay): Promise<object> {
  const clock = new FakeClock();
  const loader = makeLoader(overlay, clock, { [NATIVE]: {} });
  const gone = `${D}/check/gone`;
  const here = `${D}/check/here`;
  let lastCheck: { dir: string; stale: boolean } | null = null;
  let checksForHere = 0;
  let nativeForGone = 0;
  let nativeForHere = 0;
  let sameTurn: boolean | null = null;
  const exists = (dir: string): boolean => {
    const check = { dir, stale: false };
    lastCheck = check;
    // Marks the answer stale as soon as anything yields: an `await` between
    // the check and the subscribe lets this run first.
    queueMicrotask(() => {
      check.stale = true;
    });
    if (dir === here) checksForHere += 1;
    return dir !== gone;
  };
  const native = {
    subscribe: async (dir: string): Promise<{ unsubscribe(): Promise<void> }> => {
      if (dir === gone) nativeForGone += 1;
      if (dir === here) {
        nativeForHere += 1;
        const c = lastCheck as { dir: string; stale: boolean } | null;
        sameTurn = c !== null && c.dir === here && !c.stale;
      }
      return { unsubscribe: async () => undefined };
    }
  };
  const q = queueOf(loader, { native, exists, now: clock.now, setTimeout: clock.setTimeout, note: noop });
  const a = track(() => q.watch(gone, [], noop));
  await flush();
  const b = track(() => q.watch(here, [], noop));
  await flush();
  return {
    missingAnswered: a.settled && a.ok,
    missingSub: a.settled && a.ok ? (subOf(a.value) === undefined ? 'no sub' : subOf(a.value)) : a.error,
    nativeForGone,
    hereAnswered: b.settled && b.ok && typeof subOf(b.value) === 'number',
    checksForHere,
    nativeForHere,
    sameTurn,
    queuedGone: await driveQueuedGone(loader, clock)
  };
}

/**
 * W365-4, the probe review's half: a folder that IS there when its watch is asked and is gone
 * by the time its turn comes. A watch is held behind another (whose native subscribe does not
 * settle until this drive says), the folder is removed while it waits, and then the chain is let
 * go: a check asked AT the turn answers null and calls nothing. A check asked when the watch was
 * made, or an answer from then mixed into the turn's, reaches the native subscribe here, which
 * the folder-that-was-never-there drive above cannot see. `held` says the waiting watch really
 * waited (no native call and no answer of its own before the folder went), so a queue that does
 * not chain at all (W365-3's defect) is reported as not held, not as this rule's.
 */
async function driveQueuedGone(loader: Loader, clock: FakeClock): Promise<object> {
  const blocker = `${D}/check/blocker`;
  const queued = `${D}/check/queued`;
  const there = new Set([blocker, queued]);
  let release: (() => void) | null = null;
  let nativeForQueued = 0;
  const native = {
    subscribe: async (dir: string): Promise<{ unsubscribe(): Promise<void> }> => {
      if (dir === queued) nativeForQueued += 1;
      if (dir === blocker) {
        await new Promise<void>((done) => {
          release = done;
        });
      }
      return { unsubscribe: async () => undefined };
    }
  };
  const q = queueOf(loader, { native, exists: (dir: string) => there.has(dir), now: clock.now, setTimeout: clock.setTimeout, note: noop });
  const first = track(() => q.watch(blocker, [], noop));
  await flush();
  const second = track(() => q.watch(queued, [], noop));
  await flush();
  const held = release !== null && nativeForQueued === 0 && !second.settled;
  there.delete(queued);
  const go = release as (() => void) | null;
  if (go !== null) go();
  await flush();
  return {
    held,
    blockerAnswered: first.settled && first.ok && typeof subOf(first.value) === 'number',
    answered: second.settled && second.ok,
    sub: second.settled && second.ok ? (subOf(second.value) === undefined ? 'no sub' : subOf(second.value)) : second.settled ? `rejected: ${String(second.error)}` : 'pending',
    native: nativeForQueued
  };
}

/** W365-5: a close whose folder is gone waits the grace, off the chain. */
async function driveGrace(overlay: Overlay): Promise<object> {
  const clock = new FakeClock();
  const loader = makeLoader(overlay, clock, { [NATIVE]: {} });
  const gone = new Set<string>();
  const calls: { what: string; at: number }[] = [];
  const native = {
    subscribe: async (dir: string): Promise<{ unsubscribe(): Promise<void> }> => {
      calls.push({ what: `watch ${dir}`, at: clock.t });
      return {
        unsubscribe: async () => {
          calls.push({ what: `close ${dir}`, at: clock.t });
        }
      };
    }
  };
  const mod = loader.load(QUEUE);
  const graceMs = typeof mod['WATCH_GONE_GRACE_MS'] === 'number' ? (mod['WATCH_GONE_GRACE_MS'] as number) : null;
  const q = queueOf(loader, {
    native,
    exists: (dir: string) => !gone.has(dir),
    now: clock.now,
    setTimeout: clock.setTimeout,
    note: noop
  });
  const g = `${D}/grace/g`;
  const h = `${D}/grace/h`;
  const first = track(() => q.watch(g, [], noop));
  await flush();
  const gSub = subOf(first.value);
  if (typeof gSub !== 'number') return { setup: `the watch of a folder that is there answered ${JSON.stringify(first.value ?? first.error)}` };
  gone.add(g);
  const t0 = clock.t;
  const closing = track(() => q.close(gSub), clock);
  const during = track(() => q.watch(h, [], noop), clock);
  await flush();
  const watchDuringGraceDone = during.settled && typeof subOf(during.value) === 'number';
  await clock.advance(999);
  const closedBy999 = calls.some((c) => c.what === `close ${g}`);
  await clock.advance(Math.max(graceMs ?? 0, 1_000) + 1_000);
  const closeCall = calls.find((c) => c.what === `close ${g}`);

  // The fix round (the attack lens's ablation A2): the SAME folder, made again
  // and watched again while its graced close still waits. The new watch's
  // native subscribe must come AFTER that close's native unsubscribe, or it
  // joins the dead stream the library still holds for the deleted root and
  // hears nothing, ever (queue.ts's header, "ONE MORE RULE").
  const s = `${D}/grace/same`;
  const firstS = track(() => q.watch(s, [], noop));
  await flush();
  const sSub = subOf(firstS.value);
  let sameFolder: Record<string, unknown>;
  if (typeof sSub !== 'number') {
    sameFolder = { setup: `the watch of the folder that goes and comes back answered ${JSON.stringify(firstS.value ?? firstS.error)}` };
  } else {
    gone.add(s);
    track(() => q.close(sSub), clock);
    await flush();
    gone.delete(s);
    const again = track(() => q.watch(s, [], noop), clock);
    await flush();
    const settledDuringGrace = again.settled;
    await clock.advance(Math.max(graceMs ?? 0, 1_000) + 1_000);
    const closeS = calls.findIndex((c) => c.what === `close ${s}`);
    const watches = calls.map((c, i) => ({ ...c, i })).filter((c) => c.what === `watch ${s}`);
    const rewatch = watches[1];
    sameFolder = {
      closed: closeS !== -1,
      rewatched: rewatch !== undefined,
      rewatchAfterClose: closeS !== -1 && rewatch !== undefined && rewatch.i > closeS,
      settledDuringGrace,
      answered: again.settled && typeof subOf(again.value) === 'number'
    };
  }
  return {
    graceMs,
    watchDuringGraceDone,
    closedBefore1000: closedBy999,
    closedAfterGrace: closeCall !== undefined,
    closedAtMs: closeCall === undefined ? null : closeCall.at - t0,
    closeSettled: closing.settled,
    sameFolder
  };
}

// ---------------------------------------------------------------------------
// The host drives (W365-2, W365-6, W365-8, W365-9).
// ---------------------------------------------------------------------------

interface HostApi {
  watchFolder(dir: string, options: { ignore?: unknown[] }, onEvents: (err: Error | null, events: unknown[]) => void): Promise<unknown>;
  [name: string]: unknown;
}

interface Rig {
  clock: FakeClock;
  world: FakeWorld;
  loader: Loader;
  lines: LogLine[];
  host: HostApi;
  lifecycle: Record<string, unknown>;
  teardown: Record<string, unknown>;
  atLoad: { inProcess: boolean; native: boolean };
}

function inElectron(on: boolean): void {
  if (on) {
    Object.defineProperty(process.versions, 'electron', {
      value: '43.3.0',
      configurable: true,
      enumerable: true,
      writable: false
    });
  } else {
    delete (process.versions as Record<string, unknown>)['electron'];
  }
}

/** A fresh host, in Electron, over a fake process, with its own lifecycle and teardown. */
function rig(overlay: Overlay): Rig {
  const clock = new FakeClock();
  const world = new FakeWorld(clock);
  const lines: LogLine[] = [];
  const record = (scope: string, level: string) => (msg: unknown) => {
    lines.push({ scope, level, msg: String(msg), at: clock.t });
  };
  const logStub = new Proxy(
    {
      getLog: (scope: string) => ({
        error: record(scope, 'error'),
        warn: record(scope, 'warn'),
        info: record(scope, 'info'),
        debug: record(scope, 'debug')
      }),
      logEvent: (scope: string, level: string, _event: string, msg: unknown) => record(scope, level)(msg)
    } as Record<string | symbol, unknown>,
    {
      get: (target, name) => (name in target ? target[name] : typeof name === 'string' && name !== '__esModule' && name !== 'then' ? noop : undefined)
    }
  );
  const loader = makeLoader(
    overlay,
    clock,
    {
      electron: { utilityProcess: { fork: world.fork }, app: { getAppMetrics: world.metrics } },
      'main/log': logStub,
      [IN_PROCESS]: {},
      [NATIVE]: {}
    },
    world.kill
  );
  inElectron(true);
  const host = loader.load(HOST) as HostApi;
  const atLoad = { inProcess: loader.hits.has(IN_PROCESS), native: loader.hits.has(NATIVE) };
  if (typeof host.watchFolder !== 'function') throw new Error(`${HOST} exports no watchFolder`);
  return {
    clock,
    world,
    loader,
    lines,
    host,
    lifecycle: loader.load(LIFECYCLE),
    teardown: loader.load(TEARDOWN),
    atLoad
  };
}

const numberOf = (host: HostApi, name: string): number => {
  const v = host[name];
  if (typeof v !== 'number') throw new Error(`${HOST} exports no number ${name}`);
  return v;
};

/** Ask for a watch and let the fake process answer it. */
async function answered(r: Rig, dir: string, onEvents: (err: Error | null, events: unknown[]) => void = noop, ignore?: unknown[]): Promise<Tracked> {
  const t = track(() => r.host.watchFolder(dir, ignore === undefined ? {} : { ignore }, onEvents), r.clock);
  await flush();
  return t;
}

const isWatch = (v: unknown): v is { close(): Promise<void> } =>
  v !== null && typeof v === 'object' && typeof (v as { close?: unknown }).close === 'function';

/** The process the host asked to watch `dir`, the latest one that was asked: not merely the latest fork. */
function childOf(r: Rig, dir: string): FakeChild | null {
  for (let i = r.world.forks.length - 1; i >= 0; i -= 1) {
    const child = r.world.forks[i] as FakeChild;
    if (child.sent.some((m) => m['kind'] === 'watch' && m['dir'] === dir)) return child;
  }
  return null;
}

/** W365-2, driven: in Electron the host forks and loads neither the in-process path nor the native module. */
async function driveHostLoad(overlay: Overlay): Promise<object> {
  const r = rig(overlay);
  // Lazily: loading the host, and its lifecycle and teardown, forks nothing.
  await flush();
  const forksAtLoad = r.world.forks.length;
  const w = await answered(r, `${D}/load/a`);
  return {
    forksAtLoad,
    inProcessAtLoad: r.atLoad.inProcess,
    nativeAtLoad: r.atLoad.native,
    inProcess: r.loader.hits.has(IN_PROCESS),
    native: r.loader.hits.has(NATIVE),
    forks: r.world.forks.length,
    forkPath: r.world.forks[0]?.modulePath ?? null,
    answered: w.settled && w.ok && isWatch(w.value)
  };
}

/** W365-6, driven: a process that never answers a watch, then one that never answers a close. */
async function driveHostBounds(overlay: Overlay): Promise<object> {
  const out: Record<string, unknown> = {};
  for (const kind of ['watch', 'close'] as const) {
    const r = rig(overlay);
    const bound = numberOf(r.host, kind === 'watch' ? 'WATCH_START_REPLY_MS' : 'WATCH_CLOSE_REPLY_MS');
    const live = `${D}/bound/live`;
    const stuck = `${D}/bound/stuck`;
    // The first process the host asks answers everything but the one request
    // this drive holds. (By what it was asked, not by fork order, so a stray
    // fork elsewhere cannot move the held request.)
    let held: FakeChild | null = null;
    r.world.policy = (child, m) => {
      held ??= child;
      return !(child === held && ((kind === 'watch' && m['kind'] === 'watch' && m['dir'] === stuck) || (kind === 'close' && m['kind'] === 'close')));
    };
    const liveWatch = await answered(r, live);
    if (r.world.forks.length === 0) {
      out[kind] = { noFork: true };
      continue;
    }
    let request: Tracked;
    if (kind === 'watch') {
      request = track(() => r.host.watchFolder(stuck, {}, noop), r.clock);
    } else {
      const toClose = await answered(r, stuck);
      if (!isWatch(toClose.value)) {
        out[kind] = { setup: `the watch to close answered ${JSON.stringify(toClose.value ?? toClose.error)}` };
        continue;
      }
      const w = toClose.value;
      request = track(() => w.close(), r.clock);
    }
    await flush();
    const first = held as FakeChild | null;
    const forksBefore = r.world.forks.length;
    await r.clock.advance(bound - 1);
    const settledEarly = request.settled;
    const linesBefore = r.lines.length;
    await r.clock.advance(1);
    const boundLines = r.lines.slice(linesBefore).filter((l) => l.scope === 'watcher').length;
    const settledAtBound = request.settled;
    const value = request.settled ? (request.ok ? (request.value === undefined ? 'undefined' : request.value === null ? 'null' : typeof request.value) : `rejected: ${String(request.error)}`) : 'pending';
    const killed = first !== null && first.killed;
    await r.clock.advance(31_000);
    const later = r.world.forks.slice(forksBefore);
    // The fix round: a first watch the replaced process held is asked of the
    // next one and answered there, never null (null left that project unwatched
    // until its tab opened again, and the parent never drops a slow watch).
    const valueAfter = request.settled ? (request.ok ? (request.value === undefined ? 'undefined' : request.value === null ? 'null' : typeof request.value) : `rejected: ${String(request.error)}`) : 'pending';
    // How it was ended (the fix round): a SIGKILL to the pid Electron named, then Electron's kill().
    const endTrail = first === null ? [] : r.world.trail.filter((t) => t.endsWith(` ${String(first.pid)}`));
    out[kind] = {
      bound,
      liveAnswered: isWatch(liveWatch.value),
      settledEarly,
      settledAtBound,
      value,
      valueAfter,
      boundLines,
      killed,
      forksAfter: 1 + later.length,
      liveRebound: later.some((c) => c.sent.some((m) => m['kind'] === 'watch' && m['dir'] === live)),
      stuckRebound: later.some((c) => c.sent.some((m) => m['kind'] === 'watch' && m['dir'] === stuck)),
      endTrail
    };
  }
  return out;
}

/**
 * W365-6, driven (the fix round): a POISON folder, whose watch no process ever
 * answers. It is asked of WATCHER_FIRST_WATCH_ASKS processes, then answered
 * null, and the host does not give up. With no cap it is asked of process after
 * process until the give-up ends every watch. (Whether the kept watch is bound
 * to the process after them is the restart's promise, W365-8, and not read.)
 */
async function driveHostPoison(overlay: Overlay): Promise<object> {
  const r = rig(overlay);
  const startBound = numberOf(r.host, 'WATCH_START_REPLY_MS');
  const asks = typeof r.host['WATCHER_FIRST_WATCH_ASKS'] === 'number' ? (r.host['WATCHER_FIRST_WATCH_ASKS'] as number) : null;
  const poison = `${D}/poison/never`;
  const kept = `${D}/poison/kept`;
  r.world.policy = (_child, m) => !(m['kind'] === 'watch' && m['dir'] === poison);
  const keptWatch = await answered(r, kept);
  if (r.world.forks.length === 0) return { noFork: true };
  if (!isWatch(keptWatch.value)) return { setup: `the kept watch answered ${JSON.stringify(keptWatch.value ?? keptWatch.error)}` };
  const asked = track(() => r.host.watchFolder(poison, {}, noop), r.clock);
  await flush();
  // Long enough for the cap to be reached and passed, and short of the give-up's window.
  await r.clock.advance((startBound + 31_000) * 6);
  const observe = r.host['watcherProcessObservation'];
  const obs = typeof observe === 'function' ? (observe as () => { gaveUp?: boolean; live?: number }).call(null) : null;
  const askedOf = r.world.forks.filter((c) => c.sent.some((m) => m['kind'] === 'watch' && m['dir'] === poison)).length;
  return {
    asks,
    answer: asked.settled ? (asked.ok ? (asked.value === null ? 'null' : typeof asked.value) : `rejected: ${String(asked.error)}`) : 'pending',
    askedOf,
    gaveUp: obs?.gaveUp ?? null
  };
}

/** W365-8, driven: unexpected exits, the backoff, the re-bind and its notice, the give-up, and a quit. */
async function driveHostRestart(overlay: Overlay): Promise<object> {
  const r = rig(overlay);
  const restartError = r.host['WATCHER_RESTART_ERROR'];
  const gaveUpError = typeof r.host['WATCHER_GAVE_UP_ERROR'] === 'string' ? (r.host['WATCHER_GAVE_UP_ERROR'] as string) : null;
  const table = r.host['WATCHER_RESTART_BACKOFF_MS'];
  const giveUp = numberOf(r.host, 'WATCHER_GIVE_UP_EXITS');
  if (typeof restartError !== 'string') throw new Error(`${HOST} exports no string WATCHER_RESTART_ERROR`);
  if (!Array.isArray(table) || table.length === 0 || !table.every((n) => typeof n === 'number')) {
    throw new Error(`${HOST} exports no WATCHER_RESTART_BACKOFF_MS table of numbers`);
  }
  const heard: Record<string, { error: string | null; events: number }[]> = { a: [], b: [], c: [] };
  const hear = (name: string) => (err: Error | null, events: unknown[]) => {
    heard[name]?.push({ error: err === null ? null : err.message, events: Array.isArray(events) ? events.length : -1 });
  };
  const dirs = { a: `${D}/restart/a`, b: `${D}/restart/b`, c: `${D}/restart/c` };
  const a = await answered(r, dirs.a, hear('a'), [`${D}/restart/a/.git`, /^skip(?:\/|$)/]);
  const b = await answered(r, dirs.b, hear('b'));
  const c = await answered(r, dirs.c, hear('c'));
  if (r.world.forks.length === 0) return { noFork: true };
  if (!isWatch(a.value) || !isWatch(b.value) || !isWatch(c.value)) {
    return { setup: `the three watches answered ${JSON.stringify([a.value ?? a.error, b.value ?? b.error, c.value ?? c.error])}` };
  }
  const cWatch = c.value;
  track(() => cWatch.close());
  await flush();
  const firstA = childOf(r, dirs.a)?.sent.find((m) => m['kind'] === 'watch' && m['dir'] === dirs.a) ?? null;
  const steps: Record<string, unknown>[] = [];
  const notices = (name: string): number => (heard[name] ?? []).filter((h) => h.error === restartError).length;
  // The fix round: the give-up hands every live watch ONE word that it has ended.
  const endings = (name: string): number => (heard[name] ?? []).filter((h) => gaveUpError !== null && h.error === gaveUpError).length;
  const otherErrors = (name: string): number => (heard[name] ?? []).filter((h) => h.error !== null && h.error !== restartError && h.error !== gaveUpError).length;
  for (let exitNo = 1; exitNo <= giveUp; exitNo += 1) {
    // The process that holds the live watches now.
    const child = childOf(r, dirs.a) ?? (r.world.forks[r.world.forks.length - 1] as FakeChild);
    const forksBefore = r.world.forks.length;
    const before = { a: notices('a'), b: notices('b'), c: notices('c') };
    const endedBefore = { a: endings('a'), b: endings('b'), c: endings('c') };
    const linesBefore = r.lines.length;
    child.crash(1);
    await flush();
    if (exitNo === giveUp) {
      await r.clock.advance(Math.max(...(table as number[])) * 4 + 60_000);
      const late = track(() => r.host.watchFolder(`${D}/restart/late`, {}, noop), r.clock);
      await r.clock.advance(1_000);
      steps.push({
        exitNo,
        forkedAfter: r.world.forks.length > forksBefore,
        lateAnswer: late.settled ? (late.ok ? (late.value === null ? 'null' : typeof late.value) : `rejected: ${String(late.error)}`) : 'pending',
        forksAfterLate: r.world.forks.length - forksBefore,
        ended: { a: endings('a') - endedBefore.a, b: endings('b') - endedBefore.b, c: endings('c') - endedBefore.c },
        lines: r.lines.length - linesBefore
      });
      break;
    }
    const expected = table[Math.min(exitNo - 1, table.length - 1)] as number;
    await r.clock.advance(expected - 1);
    const early = r.world.forks.length > forksBefore;
    await r.clock.advance(1);
    const onTime = r.world.forks.length > forksBefore;
    if (!onTime) await r.clock.advance(5_000);
    const next = r.world.forks[r.world.forks.length - 1] as FakeChild;
    await flush();
    const rebound = next === child ? [] : next.sent.filter((m) => m['kind'] === 'watch').map((m) => String(m['dir'])).sort();
    const rebindOfA = next === child ? null : next.sent.find((m) => m['kind'] === 'watch' && m['dir'] === dirs.a) ?? null;
    const heardA = (heard['a'] ?? []).length;
    const routed = next !== child && next.events(dirs.a, [{ type: 'update', path: `${dirs.a}/f.txt` }]);
    await flush();
    const eventReachedA = routed && (heard['a'] ?? []).slice(heardA).some((h) => h.error === null && h.events === 1);
    steps.push({
      exitNo,
      expected,
      early,
      onTime,
      rebound,
      sameIgnore:
        firstA !== null && rebindOfA !== null &&
        JSON.stringify([firstA['ignorePaths'], firstA['ignorePatterns']]) === JSON.stringify([rebindOfA['ignorePaths'], rebindOfA['ignorePatterns']]),
      notices: { a: notices('a') - before.a, b: notices('b') - before.b, c: notices('c') - before.c },
      eventReachedA,
      lines: r.lines.length - linesBefore
    });
  }

  // A quit: no fork follows an exit once the app is quitting.
  const q = rig(overlay);
  await answered(q, `${D}/restart/q`);
  let quitForks: number | null = null;
  const quitChild = childOf(q, `${D}/restart/q`);
  if (quitChild !== null) {
    const markQuitting = q.lifecycle['markAppQuitting'];
    if (typeof markQuitting !== 'function') throw new Error(`${LIFECYCLE} exports no markAppQuitting`);
    markQuitting();
    const forksBefore = q.world.forks.length;
    quitChild.crash(1);
    await flush();
    await q.clock.advance(120_000);
    quitForks = q.world.forks.length - forksBefore;
  }
  return {
    restartError,
    gaveUpError,
    table,
    giveUp,
    steps,
    otherErrors: { a: otherErrors('a'), b: otherErrors('b'), c: otherErrors('c') },
    quitForks
  };
}

/** W365-9, driven: once quitting, a watch is null with no message and a close settles at once. */
async function driveHostQuit(overlay: Overlay): Promise<object> {
  // Quitting before anything was ever watched.
  const cold = rig(overlay);
  const markCold = cold.lifecycle['markAppQuitting'];
  if (typeof markCold !== 'function') throw new Error(`${LIFECYCLE} exports no markAppQuitting`);
  await flush();
  const coldForksBefore = cold.world.forks.length;
  markCold();
  const coldWatch = track(() => cold.host.watchFolder(`${D}/quit/cold`, {}, noop));
  await flush();

  // Quitting with a live watch, and one still starting.
  const r = rig(overlay);
  const live = await answered(r, `${D}/quit/live`);
  if (r.world.forks.length === 0) return { noFork: true };
  if (!isWatch(live.value)) return { setup: `the live watch answered ${JSON.stringify(live.value ?? live.error)}` };
  const liveWatch = live.value;
  const child = childOf(r, `${D}/quit/live`) as FakeChild;
  // The process answers nothing from here on: neither the watch still starting
  // nor a close may wait for it.
  r.world.policy = () => false;
  const starting = track(() => r.host.watchFolder(`${D}/quit/starting`, {}, noop));
  await flush();
  const forksBefore = r.world.forks.length;
  const sentBefore = child.sent.length;
  (r.lifecycle['markAppQuitting'] as () => void)();
  // The first call that sees the quit is this close: it settles at once, posts
  // nothing, and ends the process (the fix round; a close left in the process's
  // queue aborted it in its own teardown at 16 of 45 graceful quits).
  const closing = track(() => liveWatch.close());
  await flush();
  const closeSettled = closing.settled;
  const endedByClose = child.killed;
  const late = track(() => r.host.watchFolder(`${D}/quit/late`, {}, noop));
  await flush();
  await r.clock.advance(60_000);
  const pendingCount = r.teardown['pendingWatcherCloseCount'];
  return {
    cold: {
      answer: coldWatch.settled ? (coldWatch.ok ? (coldWatch.value === null ? 'null' : typeof coldWatch.value) : `rejected: ${String(coldWatch.error)}`) : 'pending',
      forks: cold.world.forks.length - coldForksBefore
    },
    endTrail: r.world.trail.filter((t) => t.endsWith(` ${String(child.pid)}`)),
    late: late.settled ? (late.ok ? (late.value === null ? 'null' : typeof late.value) : `rejected: ${String(late.error)}`) : 'pending',
    starting: starting.settled ? (starting.ok ? (starting.value === null ? 'null' : typeof starting.value) : `rejected: ${String(starting.error)}`) : 'pending',
    watchMessagesAfterQuit: child.sent.slice(sentBefore).filter((m) => m['kind'] === 'watch').length,
    messagesAfterQuit: child.sent.length - sentBefore,
    forksAfterQuit: r.world.forks.length - forksBefore,
    closeSettled,
    endedByClose,
    closePosted: child.sent.slice(sentBefore).some((m) => m['kind'] === 'close'),
    pendingCloses: typeof pendingCount === 'function' ? (pendingCount as () => number)() : null
  };
}

// ---------------------------------------------------------------------------
// Run every variant the gate asked for.
// ---------------------------------------------------------------------------

interface Variant {
  id: string;
  overlay: Overlay;
}

let variants: Variant[] = [{ id: 'shipping', overlay: {} }];
if (!process.stdin.isTTY) {
  // Read asynchronously: a synchronous read of a pipe the parent is still
  // writing answers EAGAIN.
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const input = Buffer.concat(chunks).toString('utf8').trim();
  if (input.length > 0) {
    const parsed = JSON.parse(input) as { variants?: Variant[] };
    if (Array.isArray(parsed.variants) && parsed.variants.length > 0) variants = parsed.variants;
  }
}

const drives: Record<string, unknown> = {};
process.on('uncaughtException', onStray);
process.on('unhandledRejection', onStray);
try {
  for (const v of variants) {
    const overlay = v.overlay ?? {};
    const present = (rel: string): boolean => Object.prototype.hasOwnProperty.call(overlay, rel) || existsSync(join(ROOT, rel));
    const missing = (rel: string) => async () => ({ missing: rel });
    drives[v.id] = {
      queue: {
        fifo: await drive('fifo', present(QUEUE) ? () => driveFifo(overlay) : missing(QUEUE)),
        check: await drive('check', present(QUEUE) ? () => driveCheck(overlay) : missing(QUEUE)),
        grace: await drive('grace', present(QUEUE) ? () => driveGrace(overlay) : missing(QUEUE))
      },
      host: {
        load: await drive('load', present(HOST) ? () => driveHostLoad(overlay) : missing(HOST)),
        bounds: await drive('bounds', present(HOST) ? () => driveHostBounds(overlay) : missing(HOST)),
        poison: await drive('poison', present(HOST) ? () => driveHostPoison(overlay) : missing(HOST)),
        restart: await drive('restart', present(HOST) ? () => driveHostRestart(overlay) : missing(HOST)),
        quit: await drive('quit', present(HOST) ? () => driveHostQuit(overlay) : missing(HOST))
      }
    };
  }
} finally {
  inElectron(false);
  process.off('uncaughtException', onStray);
  process.off('unhandledRejection', onStray);
}

process.stdout.write(
  JSON.stringify({
    budget: ir.EXCLUSION_PATH_BUDGET,
    plans: COUNTS.map((n) => {
      const plan = ir.planWorktreeIgnore('/repo', rels(n));
      return {
        roots: n,
        paths: plan.paths.length,
        overflow: plan.overflow.length,
        ignore: plan.ignore.length,
        dotGitFirst: plan.paths[0] === '/repo/.git',
        // Every overflow entry is a RegExp with no flags: wrapper.js throws on
        // any flag, and a plain string would be routed back to the
        // CoreServices array and would consume a slot.
        overflowAreRegExps: plan.overflow.every((m) => m instanceof RegExp && m.flags === ''),
        // Relative, because the matcher runs against the path relative to the
        // watch root. An absolute one matches nothing at all.
        overflowRelative: plan.overflow.every((m) => !m.source.startsWith('^/'))
      };
    }),
    // What an overflow entry MATCHES, which is the question that matters.
    hostile: HOSTILE.map(({ name, sibling }) => {
      const m = ir.overflowMatcher(name);
      return {
        name,
        sibling,
        source: m.source,
        self: excludes(m, name),
        deep: excludes(m, `${name}/deep/file.bin`),
        hitsSibling: excludes(m, sibling) || excludes(m, `${sibling}/keep.txt`),
        hitsNested: excludes(m, `vendor/${name}/file.bin`),
        hitsAnythingElse: NEVER.some((p) => excludes(m, p))
      };
    }),
    // The parser is the other place a slot can be wasted: an ignored FILE
    // must never consume one.
    parsed: ir.parseIgnoredRoots('.claude/\0.env\0bin/\0plane/node_modules/\0runstory\0scratch/\0.git/\0'),
    drives
  })
);
