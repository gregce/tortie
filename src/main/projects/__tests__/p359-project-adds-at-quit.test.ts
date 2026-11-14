/**
 * Phase 359, the fix round (build/p359/SPEC.md "### The fix round"): a project
 * made or cloned around the quit.
 *
 * THE FINDING (the attack lens, its arm XP). A `projects:create` admitted just
 * before ⌘Q, and a clone whose git exited just before it, each add their
 * project through the session core AFTER their own work: the create after its
 * folder and `git init`, the clone after its rename and its HEAD read. The
 * quit's project step (`disposeProjectCloneIpc`, which the ordered disposer
 * awaits on the line before the core's shutdown) joined neither: a create was
 * never tracked, and a clone leaves the engine's run map on the first line of
 * its finish. So each add asked `getGmuxCore()` for the first time after the
 * core's shutdown. At the parent that booted a second core inside the quitting
 * process, which wrote the row. With Phase 359's check the ask is refused, the
 * folder stays on disk and the relaunch lists no project: worse than today.
 *
 * THE FIX. The project step tells every add already admitted that the quit has
 * begun and joins it, inside the clone step's own three second bound: a create
 * still in `git init` stops waiting for git (`quitBegun`, the way a failed
 * `git init` already does), a clone already renamed into place stops waiting
 * for its branch (`closed`), the engine keeps a finished run joinable until its
 * last frame is sent (`finishing`), the creates are tracked from their
 * admission (`creates`), and a clone start still preparing spawns no git
 * (`closing`). The add then reaches the core that is still running, before its
 * shutdown and so before the quit generation, however long git or the disk
 * takes after it.
 *
 * EVERYTHING HERE IS HERMETIC. No process starts: every child_process call is
 * a stand-in or throws, and git's runner is a stand-in. No login shell is
 * asked for a PATH. The folders are in a scratch directory removed after each
 * case.
 *
 *   1. the clone engine: (a) a clone that finished just before the quit is
 *      joined until its add answers and its last frame is sent; (b) bounded;
 *      (c) a running clone is cancelled and joined, as before; (d) a start
 *      still preparing when the quit began spawns no git, removes its
 *      temporary folder and says cancelled; (e) a clone whose HEAD read is
 *      still held when the quit begins adds its project at once, with no
 *      branch, and the read is never waited for;
 *   2. `projects:create` through its registered handler: (a) a create still in
 *      `git init` when the quit begins adds its project at once and the step
 *      waits for that add, git still running; (b) bounded: a folder the disk
 *      never makes holds the step for the bound and no longer; (c) a create
 *      that fails is joined, the renderer still gets its refusal, and nothing
 *      rejects unhandled; (d) a create asked after the press is refused at the
 *      door, so the step's set only shrinks; (e) with no quit a create waits
 *      for git as it always has;
 *   3. end to end, over the SHIPPING core and lifecycle and the real
 *      `defaultDeps()` (its folder, its git runner, its lazy import and its
 *      `getGmuxCore()`), with `GmuxCore.boot` spied, the disposer's two lines
 *      in their order: (a) THE ATTACK LENS'S XP: git init and the HEAD read held
 *      until AFTER the core's shutdown, and both adds still land on the running
 *      core before it, with one boot; (b) THE STATED RESIDUAL: a folder not made
 *      and a rename not done inside the bound reach the core after its shutdown
 *      and are refused, boot nothing and leave the folders on disk, with one
 *      bound for the whole step; (c) THE ABLATION: copies of ../index.ts,
 *      ../clone.ts and ../create.ts with the fix round taken out lose 3a's
 *      projects exactly as the parent's step does at HEAD, and the same copies
 *      with nothing taken out keep them, so the copies are faithful;
 *   4. his ruled round (2026-11-14): (a) a clone that failed for sign-in,
 *      its `gh auth status` taking 2.5 s, does not hold the quit's project
 *      step, and its message still comes once gh answers; (b) the ablation: a
 *      copy of ../clone.ts that joins every finished run, as the fix round
 *      had it, holds the step until gh ends, and the same copy unedited does
 *      not.
 */

import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CloneDone, CloneProgress, CreateProjectResult } from '@shared/ipc';
import type { Project } from '@shared/types';
import { gmuxErrorPayloadOf } from '../../errors';
import type { GmuxCore } from '../../sessions/core';
import type { CloneSink } from '../clone';
import { CloneEngine } from '../clone';
import { CLONE_GH_HINT } from '../clone-parse';
import type { ProjectCreateDeps } from '../create';

/** A promise and its two ends. */
interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(err: unknown): void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** The world this file holds: each hold is null until a case sets it. */
const seams = vi.hoisted(() => ({
  /** Every child_process call made, in order. */
  spawned: [] as string[],
  /** The stand-in for the next spawn, handed the spawn's arguments; with none, a spawn throws. */
  child: null as null | ((...args: unknown[]) => unknown),
  /** What `resolveBinary('gh')` answers (his ruled round's stand-in gh); with none, no gh. */
  gh: null as null | string,
  /** The login shell's PATH, held when set. */
  userPath: null as null | { promise: Promise<string> },
  /** The project folder's mkdir, held when set; and how many were asked. */
  mkdir: null as null | { promise: Promise<void> },
  mkdirAsked: 0,
  /** A clone's `.git/HEAD` read, held when set; and how many were asked. */
  head: null as null | { promise: Promise<void> },
  headAsked: 0,
  /** A clone's rename into its folder, held when set; and how many were asked. */
  rename: null as null | { promise: Promise<void> },
  renameAsked: 0,
  /** `git init` through the shipping runner, held when set; and how many were asked. */
  git: null as null | { promise: Promise<void> },
  gitAsked: 0
}));

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:child_process')>();
  const refused =
    (name: string) =>
    (...args: unknown[]): never => {
      seams.spawned.push(`${name} ${String(args[0])}`);
      throw new Error(`p359 fix round: ${name} was called`);
    };
  return {
    ...real,
    spawn: (...args: unknown[]): unknown => {
      seams.spawned.push(`spawn ${String(args[0])}`);
      if (seams.child === null) throw new Error('p359 fix round: a spawn with no stand-in');
      return seams.child(...args);
    },
    spawnSync: refused('spawnSync'),
    exec: refused('exec'),
    execSync: refused('execSync'),
    execFile: refused('execFile'),
    execFileSync: refused('execFileSync'),
    fork: refused('fork')
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>();
  const mkdir = (async (...args: Parameters<typeof real.mkdir>) => {
    seams.mkdirAsked += 1;
    if (seams.mkdir !== null) await seams.mkdir.promise;
    return real.mkdir(...args);
  }) as typeof real.mkdir;
  const readFile = (async (...args: Parameters<typeof real.readFile>) => {
    if (String(args[0]).endsWith('/.git/HEAD')) {
      seams.headAsked += 1;
      if (seams.head !== null) await seams.head.promise;
    }
    return real.readFile(...args);
  }) as typeof real.readFile;
  const rename = (async (...args: Parameters<typeof real.rename>) => {
    if (String(args[1]).endsWith('/cloned')) {
      seams.renameAsked += 1;
      if (seams.rename !== null) await seams.rename.promise;
    }
    return real.rename(...args);
  }) as typeof real.rename;
  return { ...real, default: { ...real, mkdir, readFile, rename }, mkdir, readFile, rename };
});

// The PATH a clone hands git comes from a login shell; never start one here.
// A failed sign-in's message asks for `gh` (clone.ts `ghHintFor`), which is
// answered by the case's stand-in and never looked for on this Mac.
vi.mock('../../tmux/resolve', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...real,
    getUserPath: (): Promise<string> =>
      seams.userPath !== null ? seams.userPath.promise : Promise.resolve('/usr/bin:/bin'),
    resolveBinary: (bin: string, probeFirst?: readonly string[]): Promise<string | null> =>
      bin === 'gh' ? Promise.resolve(seams.gh) : real.resolveBinary(bin, probeFirst)
  };
});

// `git init` through the shipping runner, which would spawn git: a stand-in
// that succeeds when let go, so the real `defaultDeps()` can be driven.
vi.mock('../../git/exec', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../git/exec')>();
  return {
    ...real,
    runGitOrThrow: async (): Promise<{ code: number; stdout: Buffer; stderr: string }> => {
      seams.gitAsked += 1;
      if (seams.git !== null) await seams.git.promise;
      return { code: 0, stdout: Buffer.alloc(0), stderr: '' };
    }
  };
});

// The registered handlers are called directly, by a sender no window owns.
vi.mock('../../security/trusted-window', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../security/trusted-window')>();
  return { ...real, assertTrustedIpcSender: (): void => undefined };
});

type ProjectsModule = typeof import('../index');
type CoreModule = typeof import('../../sessions/core');
type LifecycleModule = typeof import('../../lifecycle');

/** `src/main`. */
const MAIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The quit refusal's sentence (core.ts's SHUTDOWN_REFUSAL). */
const REFUSAL = 'Tortie is quitting, so this action was not started.';

/** Lets every pending promise and the next timer turn run. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 25));

/** Waits until `test` holds, or fails naming `what`. */
async function until(test: () => boolean, what: string, ms = 5_000): Promise<void> {
  const started = Date.now();
  while (!test()) {
    if (Date.now() - started > ms) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** A git child that exits when the case says so. */
class StandInGit extends EventEmitter {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly signals: string[] = [];
  readonly pid = 4_242;
  kill(signal?: NodeJS.Signals | number): boolean {
    this.signals.push(String(signal ?? 'SIGTERM'));
    return true;
  }
}

/** A window's sink: every frame it was sent, in order. */
function windowSink(key = 'wc:1'): { sink: CloneSink; frames: (CloneProgress | CloneDone)[] } {
  const frames: (CloneProgress | CloneDone)[] = [];
  return { sink: { key, alive: () => true, send: (_id, frame) => frames.push(frame) }, frames };
}
const lastDone = (frames: readonly (CloneProgress | CloneDone)[]): CloneDone | undefined => {
  const last = frames.at(-1);
  return last !== undefined && 'cloneId' in last && last.done === true ? (last as CloneDone) : undefined;
};

const projectAt = (path: string, id = `p-${basename(path)}`): Project => ({ id, path, name: basename(path) });

let scratch = '';
let copies = '';
let copyCount = 0;
let current: CoreModule | null = null;
/** Holds a case leaves set are let go after it, so nothing waits on past the file. */
const toRelease: Deferred<void>[] = [];

beforeAll(() => {
  copies = mkdtempSync(join(tmpdir(), 'tortie-p359-projects-copy-'));
});

afterAll(() => {
  rmSync(copies, { recursive: true, force: true });
});

afterEach(async () => {
  for (const d of toRelease.splice(0)) d.resolve();
  await settle();
  await current?.shutdownGmuxCore();
  current = null;
  seams.spawned.length = 0;
  seams.child = null;
  seams.gh = null;
  seams.userPath = null;
  seams.mkdir = null;
  seams.mkdirAsked = 0;
  seams.head = null;
  seams.headAsked = 0;
  seams.rename = null;
  seams.renameAsked = 0;
  seams.git = null;
  seams.gitAsked = 0;
  if (scratch !== '') rmSync(scratch, { recursive: true, force: true });
  scratch = '';
  vi.restoreAllMocks();
});

/** A hold the case sets, let go after it whatever happened. */
function hold(): Deferred<void> {
  const d = deferred<void>();
  toRelease.push(d);
  return d;
}

/** A scratch parent folder for one case's projects. */
function parentFolder(): string {
  scratch = mkdtempSync(join(tmpdir(), 'tortie-p359-projects-'));
  return scratch;
}

/** The input a clone dialog sends. */
const cloneInput = (parentDir: string, cloneId: string, name = 'cloned') => ({
  cloneId,
  url: 'https://github.com/example/p359',
  parentDir,
  name
});

// ---------------------------------------------------------------------------
// 1. The clone engine
// ---------------------------------------------------------------------------

describe('1. the clone engine joins a clone’s add at the quit', () => {
  it('1a. a clone that finished just before the quit is joined until its add answers and its last frame is sent', async () => {
    const parentDir = parentFolder();
    const git = new StandInGit();
    seams.child = () => git;
    const add = deferred<Project>();
    const asked: string[] = [];
    const engine = new CloneEngine((path) => {
      asked.push(path);
      return add.promise;
    });
    const { sink, frames } = windowSink();
    await engine.start(cloneInput(parentDir, 'c-1a'), sink);
    git.emit('close', 0);
    await until(() => asked.length === 1, 'the clone’s add');

    let joined = false;
    const step = engine.dispose(5_000).then(() => {
      joined = true;
    });
    await settle();
    // The parent's engine had already forgotten this run and returned here.
    expect(joined, 'the quit’s step waits for the add').toBe(false);
    add.resolve(projectAt(join(parentDir, 'cloned')));
    await step;
    expect(lastDone(frames)).toMatchObject({ done: true, path: join(parentDir, 'cloned'), project: { id: 'p-cloned' } });
    expect(git.signals, 'a finished clone is not signalled').toEqual([]);
    expect(seams.spawned).toEqual(['spawn git']);
  });

  it('1b. bounded: an add that never answers holds the step for the bound and no longer', async () => {
    const parentDir = parentFolder();
    const git = new StandInGit();
    seams.child = () => git;
    const add = deferred<Project>();
    const engine = new CloneEngine(() => add.promise);
    const { sink, frames } = windowSink();
    await engine.start(cloneInput(parentDir, 'c-1b'), sink);
    git.emit('close', 0);
    await until(() => seams.headAsked === 1, 'the clone’s HEAD read');
    await settle();

    const t0 = performance.now();
    await engine.dispose(120);
    const waited = performance.now() - t0;
    expect(waited).toBeGreaterThanOrEqual(100);
    expect(waited).toBeLessThan(2_000);
    // Answered later, its frame is still sent.
    add.resolve(projectAt(join(parentDir, 'cloned')));
    await until(() => lastDone(frames) !== undefined, 'the late frame');
    expect(lastDone(frames)).toMatchObject({ project: { id: 'p-cloned' } });
  });

  it('1c. a running clone is cancelled and joined, as before, and adds nothing', async () => {
    const parentDir = parentFolder();
    const git = new StandInGit();
    seams.child = () => git;
    const asked: string[] = [];
    const engine = new CloneEngine(async (path) => {
      asked.push(path);
      return projectAt(path);
    });
    const { sink, frames } = windowSink();
    await engine.start(cloneInput(parentDir, 'c-1c'), sink);

    let joined = false;
    const step = engine.dispose(5_000).then(() => {
      joined = true;
    });
    await settle();
    expect(git.signals).toEqual(['SIGTERM']);
    expect(joined, 'the step waits for the cancelled clone').toBe(false);
    git.emit('close', null);
    await step;
    expect(lastDone(frames)).toMatchObject({ done: true, cancelled: true });
    expect(asked).toEqual([]);
    expect(readdirSync(parentDir).filter((n) => n.startsWith('.tortie-clone-'))).toEqual([]);
  });

  it('1d. a start still preparing when the quit began spawns no git, removes its temporary folder and says cancelled', async () => {
    const parentDir = parentFolder();
    seams.child = () => new StandInGit();
    const path = deferred<string>();
    seams.userPath = path;
    const engine = new CloneEngine(async (p) => projectAt(p));
    const { sink, frames } = windowSink();
    const started = engine.start(cloneInput(parentDir, 'c-1d'), sink);
    await settle();

    // The quit: nothing is running yet, so the step has nothing to wait for.
    await engine.dispose(5_000);
    path.resolve('/usr/bin:/bin');
    await expect(started).resolves.toBe('c-1d');
    await until(() => lastDone(frames) !== undefined, 'the cancelled frame');
    expect(lastDone(frames)).toEqual({ cloneId: 'c-1d', done: true, cancelled: true });
    expect(seams.spawned, 'no git after the quit began').toEqual([]);
    expect(readdirSync(parentDir)).toEqual([]);
  });

  it('1e. a clone whose HEAD read is still held when the quit begins adds its project at once, with no branch', async () => {
    const parentDir = parentFolder();
    const git = new StandInGit();
    seams.child = () => git;
    seams.head = hold();
    const asked: string[] = [];
    const engine = new CloneEngine(async (path) => {
      asked.push(path);
      return projectAt(path);
    });
    const { sink, frames } = windowSink();
    await engine.start(cloneInput(parentDir, 'c-1e'), sink);
    git.emit('close', 0);
    await until(() => seams.headAsked === 1, 'the clone’s HEAD read');
    await settle();
    expect(asked, 'the add waits for the branch until the quit').toEqual([]);

    await engine.dispose(5_000);
    // The read was never let go, and the add happened all the same.
    expect(asked).toEqual([join(parentDir, 'cloned')]);
    expect(lastDone(frames)).toMatchObject({ done: true, project: { id: 'p-cloned' }, defaultBranch: null });
  });
});

// ---------------------------------------------------------------------------
// 2. projects:create through its registered handler
// ---------------------------------------------------------------------------

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;

function fakeIpc(): { ipc: IpcMain; handlers: Map<string, Handler> } {
  const handlers = new Map<string, Handler>();
  const ipc = {
    handle: (channel: string, fn: Handler) => {
      if (handlers.has(channel)) throw new Error(`${channel} registered twice`);
      handlers.set(channel, fn);
    }
  } as unknown as IpcMain;
  return { ipc, handlers };
}

const EVENT = {} as IpcMainInvokeEvent;

/** A window that asked for a clone: its frames, and the event its invoke carries. */
function cloneWindow(): { event: IpcMainInvokeEvent; frames: (CloneProgress | CloneDone)[] } {
  const frames: (CloneProgress | CloneDone)[] = [];
  const sender = {
    id: 7,
    once: (): void => undefined,
    isDestroyed: (): boolean => false,
    send: (_channel: string, frame: CloneProgress | CloneDone): void => {
      frames.push(frame);
    }
  };
  return { event: { sender } as unknown as IpcMainInvokeEvent, frames };
}

/** Deps for a create whose folder and `git init` answer when the case says. */
function createDeps(
  parts: { makeDirectory?: Promise<void>; gitInit?: Promise<void>; add: (path: string) => Promise<Project> }
): ProjectCreateDeps {
  return {
    exists: async () => false,
    isDirectory: async () => true,
    makeDirectory: () => parts.makeDirectory ?? Promise.resolve(),
    gitInit: () => parts.gitInit ?? Promise.resolve(),
    addProject: parts.add
  };
}

async function freshProjects(): Promise<{ lifecycle: LifecycleModule; projects: ProjectsModule }> {
  vi.resetModules();
  const lifecycle = await import('../../lifecycle');
  const projects = await import('../index');
  expect(lifecycle.appLifecycleState()).toBe('running');
  return { lifecycle, projects };
}

describe('2. projects:create is joined at the quit', () => {
  it('2a. a create still in git init when the quit begins adds its project at once, and the step waits for that add', async () => {
    const { lifecycle, projects } = await freshProjects();
    const { ipc, handlers } = fakeIpc();
    const git = hold();
    const add = deferred<Project>();
    const asked: string[] = [];
    projects.registerProjectCreateIpc(
      ipc,
      createDeps({
        gitInit: git.promise,
        add: (path) => {
          asked.push(path);
          return add.promise;
        }
      })
    );
    const answer = handlers.get('projects:create')!(EVENT, { parentDir: '/p359', name: 'made', gitInit: true }) as Promise<CreateProjectResult>;
    await settle();
    expect(asked, 'before the quit the create waits for git').toEqual([]);
    lifecycle.markAppQuitting();

    let joined = false;
    const step = projects.disposeProjectCloneIpc(5_000).then(() => {
      joined = true;
    });
    await until(() => asked.length === 1, 'the create’s add');
    // git is still running, and the step waits for the add itself.
    await settle();
    expect(joined).toBe(false);
    add.resolve(projectAt('/p359/made'));
    await step;
    expect(asked).toEqual(['/p359/made']);
    // The folder opens as a project either way; git finishes its own init.
    await expect(answer).resolves.toEqual({ project: projectAt('/p359/made'), path: '/p359/made', isRepo: false });
  });

  it('2b. bounded: a folder the disk never makes holds the step for the bound and no longer', async () => {
    const { lifecycle, projects } = await freshProjects();
    const { ipc, handlers } = fakeIpc();
    const asked: string[] = [];
    projects.registerProjectCreateIpc(
      ipc,
      createDeps({
        makeDirectory: hold().promise,
        add: async (path) => {
          asked.push(path);
          return projectAt(path);
        }
      })
    );
    void handlers.get('projects:create')!(EVENT, { parentDir: '/p359', name: 'made', gitInit: true });
    lifecycle.markAppQuitting();
    const t0 = performance.now();
    await projects.disposeProjectCloneIpc(120);
    const waited = performance.now() - t0;
    expect(waited).toBeGreaterThanOrEqual(100);
    expect(waited).toBeLessThan(2_000);
    expect(asked).toEqual([]);
  });

  it('2c. a create that fails is joined, the renderer still gets its refusal, and nothing rejects unhandled', async () => {
    const { lifecycle, projects } = await freshProjects();
    const { ipc, handlers } = fakeIpc();
    const git = deferred<void>();
    projects.registerProjectCreateIpc(
      ipc,
      createDeps({
        gitInit: git.promise,
        add: async () => {
          throw new Error('p359: the add was refused');
        }
      })
    );
    const answer = handlers.get('projects:create')!(EVENT, { parentDir: '/p359', name: 'made', gitInit: true }) as Promise<CreateProjectResult>;
    const refused = answer.then(
      () => null,
      (err: unknown) => (err as Error).message
    );
    lifecycle.markAppQuitting();
    const step = projects.disposeProjectCloneIpc(5_000);
    git.resolve();
    await step;
    expect(await refused).toBe('p359: the add was refused');
  });

  it('2d. a create asked after the press is refused at the door, so the step’s set only shrinks', async () => {
    const { lifecycle, projects } = await freshProjects();
    const { ipc, handlers } = fakeIpc();
    const asked: string[] = [];
    projects.registerProjectCreateIpc(
      ipc,
      createDeps({
        add: async (path) => {
          asked.push(path);
          return projectAt(path);
        }
      })
    );
    lifecycle.markAppQuitting();
    let err: unknown = null;
    try {
      handlers.get('projects:create')!(EVENT, { parentDir: '/p359', name: 'late', gitInit: false });
    } catch (e) {
      err = e;
    }
    expect(gmuxErrorPayloadOf(err)?.code).toBe('SHUTTING_DOWN');
    await projects.disposeProjectCloneIpc(5_000);
    expect(asked).toEqual([]);
  });

  it('2e. with no quit a create waits for git as it always has', async () => {
    const { projects } = await freshProjects();
    const { ipc, handlers } = fakeIpc();
    const git = deferred<void>();
    const asked: string[] = [];
    projects.registerProjectCreateIpc(
      ipc,
      createDeps({
        gitInit: git.promise,
        add: async (path) => {
          asked.push(path);
          return projectAt(path);
        }
      })
    );
    const answer = handlers.get('projects:create')!(EVENT, { parentDir: '/p359', name: 'made', gitInit: true }) as Promise<CreateProjectResult>;
    await settle();
    expect(asked).toEqual([]);
    git.resolve();
    await expect(answer).resolves.toEqual({ project: projectAt('/p359/made'), path: '/p359/made', isRepo: true });
  });
});

// ---------------------------------------------------------------------------
// 3. End to end over the shipping core and lifecycle
// ---------------------------------------------------------------------------

/** Every step the quit's one shutdown runs, in Phase 116's order (p359-no-boot-at-quit.test.ts's TEARDOWN). */
const TEARDOWN = ['begin-shutdown', 'join', 'snapshot:app-quit', 'drain', 'ring', 'dispose', 'join-hook'] as const;
const whole = (tag: string): string[] => TEARDOWN.map((step) => `${tag}:${step}`);

/**
 * A stand-in for a booted core: the shutdown's steps (p359-no-boot-at-quit's
 * shape) and `addProject`, which records the folder and refuses once the
 * core's shutdown has begun, as the real one does (core.ts `addProject`).
 */
function standIn(order: string[], tag: string): GmuxCore {
  let down = false;
  const at = (step: string): void => {
    order.push(`${tag}:${step}`);
  };
  const core = {
    beginShutdown: (): void => {
      down = true;
      at('begin-shutdown');
    },
    joinAdmitted: async (): Promise<void> => at('join'),
    snapshotAllSessions: async (reason?: string): Promise<void> => at(`snapshot:${reason ?? 'app-quit'}`),
    captureSyncsIdle: async (): Promise<void> => at('drain'),
    takeManifestGenerationOnQuit: async (): Promise<null> => {
      at('ring');
      return null;
    },
    dispose: (): void => at('dispose'),
    joinHookShutdown: async (): Promise<void> => at('join-hook'),
    addProject: (path: string): Project => {
      if (down) throw new Error(`${tag} refused an add during its shutdown`);
      at(`add ${basename(path)}`);
      return projectAt(path, `${tag}-${basename(path)}`);
    }
  };
  return core as unknown as GmuxCore;
}

interface World {
  readonly lifecycle: LifecycleModule;
  readonly core: CoreModule;
  readonly projects: ProjectsModule;
}

/**
 * The shipping lifecycle and core, and the projects module (the shipping one,
 * or a copy), imported fresh, with the running app's core booted.
 */
async function world(projectsFile?: string): Promise<World & { order: string[]; boots: () => number }> {
  vi.resetModules();
  const lifecycle = await import('../../lifecycle');
  const core = await import('../../sessions/core');
  const projects =
    projectsFile === undefined
      ? await import('../index')
      : ((await import(/* @vite-ignore */ projectsFile)) as ProjectsModule);
  current = core;
  expect(lifecycle.appLifecycleState()).toBe('running');
  expect(core.coreLifecycleState()).toBe('empty');
  const order: string[] = [];
  let n = 0;
  const boot = vi.spyOn(core.GmuxCore, 'boot').mockImplementation(async () => {
    n += 1;
    const tag = `core${String(n)}`;
    order.push(`boot ${tag}`);
    return standIn(order, tag);
  });
  await core.getGmuxCore();
  expect(boot).toHaveBeenCalledTimes(1);
  return { lifecycle, core, projects, order, boots: () => n };
}

/**
 * A create through the real `defaultDeps()` and a clone through the registered
 * handler, both admitted before the press, each held where `holds` says; then
 * the press. `git` holds the create's `git init`, `mkdir` its folder, `head` the
 * clone's HEAD read and `rename` its rename into place.
 */
async function twoAddsInFlight(
  w: World,
  parentDir: string,
  holds: { git?: Deferred<void>; mkdir?: Deferred<void>; head?: Deferred<void>; rename?: Deferred<void> }
) {
  const { ipc, handlers } = fakeIpc();
  w.projects.registerProjectCreateIpc(ipc);
  w.projects.registerProjectCloneIpc(ipc);
  seams.git = holds.git ?? null;
  seams.mkdir = holds.mkdir ?? null;
  const made = handlers.get('projects:create')!(EVENT, { parentDir, name: 'made', gitInit: true }) as Promise<CreateProjectResult>;
  const createOutcome = made.then(
    (v) => ({ ok: true as const, value: v }),
    (err: unknown) => ({ ok: false as const, err })
  );
  if (holds.mkdir !== undefined) await until(() => seams.mkdirAsked === 1, 'the create’s folder');
  else await until(() => seams.gitAsked === 1, 'the create’s git init');

  seams.head = holds.head ?? null;
  seams.rename = holds.rename ?? null;
  const git = new StandInGit();
  seams.child = () => git;
  const win = cloneWindow();
  await handlers.get('projects:clone')!(win.event, cloneInput(parentDir, 'c-3'));
  git.emit('close', 0);
  if (holds.rename !== undefined) await until(() => seams.renameAsked === 1, 'the clone’s rename');
  else await until(() => seams.headAsked === 1, 'the clone’s HEAD read');

  w.lifecycle.markAppQuitting();
  return { createOutcome, cloneFrames: win.frames };
}

/** The adds the stand-in cores recorded, as `<core>:add <folder>`, sorted. */
const addsOf = (order: readonly string[]): string[] => order.filter((s) => s.includes(':add ')).sort();

describe('3. end to end: the adds reach the running core before its shutdown', () => {
  it('3a. the attack lens’s XP: git init and the HEAD read held until after the core’s shutdown, and both adds still land on the running core before it, with one boot', async () => {
    const parentDir = parentFolder();
    const w = await world();
    const git = hold();
    const head = hold();
    const inFlight = await twoAddsInFlight(w, parentDir, { git, head });

    // The ordered disposer's two lines, in their order; nothing is let go first.
    await w.projects.disposeProjectCloneIpc(5_000);
    expect(addsOf(w.order)).toEqual(['core1:add cloned', 'core1:add made']);
    await w.core.shutdownGmuxCore();
    // XP let its holds go after the shutdown; here that changes nothing.
    git.resolve();
    head.resolve();
    await settle();

    // The running core's boot, both adds (in either order), then its whole teardown.
    expect(w.order[0]).toBe('boot core1');
    expect(w.order.slice(1, 3).sort()).toEqual(['core1:add cloned', 'core1:add made']);
    expect(w.order.slice(3)).toEqual(whole('core1'));
    expect(w.boots(), 'no second core').toBe(1);
    const created = await inFlight.createOutcome;
    expect(created.ok && created.value).toMatchObject({ isRepo: false, project: { id: 'core1-made' } });
    expect(lastDone(inFlight.cloneFrames)).toMatchObject({ done: true, project: { id: 'core1-cloned' }, defaultBranch: null });
  });

  it('3b. the stated residual: a folder not made and a rename not done inside the bound are refused after the shutdown, boot nothing and stay on disk; one bound covers the step', async () => {
    const parentDir = parentFolder();
    const w = await world();
    const mkdir = hold();
    const rename = hold();
    const inFlight = await twoAddsInFlight(w, parentDir, { mkdir, rename });

    const t0 = performance.now();
    await w.projects.disposeProjectCloneIpc(300);
    const waited = performance.now() - t0;
    // One bound for the step: the create's join and the clone's race the same 300 ms.
    expect(waited).toBeGreaterThanOrEqual(280);
    expect(waited).toBeLessThan(590);
    await w.core.shutdownGmuxCore();
    mkdir.resolve();
    rename.resolve();
    const created = await inFlight.createOutcome;
    await until(() => lastDone(inFlight.cloneFrames) !== undefined, 'the clone’s last frame');

    expect(addsOf(w.order)).toEqual([]);
    expect(w.boots(), 'no second core').toBe(1);
    expect(created.ok).toBe(false);
    expect(gmuxErrorPayloadOf(created.ok ? null : created.err)).toEqual({ code: 'SHUTTING_DOWN', message: REFUSAL, detail: 'getGmuxCore' });
    const done = lastDone(inFlight.cloneFrames);
    expect(done?.project).toBeUndefined();
    expect(done?.error?.message).toBe(`The repository was cloned to ${join(parentDir, 'cloned')}, but Tortie could not open it as a project.`);
    expect(existsSync(join(parentDir, 'made'))).toBe(true);
    expect(existsSync(join(parentDir, 'cloned'))).toBe(true);
  });

  it('3c. the ablation: without the fix round 3a’s projects are lost, as at the parent; the same copies unedited keep them', async () => {
    // Without it: the parent's step and waits, at HEAD.
    const cloneCut = writeCopy('projects/clone.ts', [
      ['const pending = [...this.runs.values(), ...this.finishing].map(', 'const pending = [...this.runs.values()].map('],
      ['const defaultBranch = await Promise.race([\n      readHeadBranch(run.finalPath),\n      this.closed.then(() => null)\n    ]);', 'const defaultBranch = await readHeadBranch(run.finalPath);']
    ]);
    const createCut = writeCopy('projects/create.ts', [
      ['const ran =\n        quitBegun === undefined\n          ? await init\n          : await Promise.race([init, quitBegun.then(() => null)]);', 'const ran = await init;']
    ]);
    const indexCut = writeCopy('projects/index.ts', [['  const adds = [...creates];\n', '  const adds: Promise<void>[] = [];\n']], { './clone': cloneCut, './create': createCut });
    {
      const parentDir = parentFolder();
      const w = await world(indexCut);
      const git = hold();
      const head = hold();
      const inFlight = await twoAddsInFlight(w, parentDir, { git, head });
      await w.projects.disposeProjectCloneIpc(5_000);
      await w.core.shutdownGmuxCore();
      git.resolve();
      head.resolve();
      const created = await inFlight.createOutcome;
      await until(() => lastDone(inFlight.cloneFrames) !== undefined, 'the clone’s last frame');
      expect(addsOf(w.order), 'the adds came after the shutdown').toEqual([]);
      expect(w.boots(), 'and Phase 359 booted no second core for them').toBe(1);
      expect(created.ok).toBe(false);
      expect(lastDone(inFlight.cloneFrames)?.project).toBeUndefined();
      await w.core.shutdownGmuxCore();
      current = null;
      rmSync(parentDir, { recursive: true, force: true });
      scratch = '';
    }
    // The same copies, nothing taken out: faithful, so the difference is the fix round.
    const cloneSame = writeCopy('projects/clone.ts', []);
    const createSame = writeCopy('projects/create.ts', []);
    const indexSame = writeCopy('projects/index.ts', [], { './clone': cloneSame, './create': createSame });
    {
      const parentDir = parentFolder();
      seams.mkdirAsked = 0;
      seams.headAsked = 0;
      seams.gitAsked = 0;
      const w = await world(indexSame);
      const inFlight = await twoAddsInFlight(w, parentDir, { git: hold(), head: hold() });
      await w.projects.disposeProjectCloneIpc(5_000);
      await w.core.shutdownGmuxCore();
      expect(addsOf(w.order)).toEqual(['core1:add cloned', 'core1:add made']);
      expect(w.boots()).toBe(1);
      expect((await inFlight.createOutcome).ok).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. His ruled round (2026-11-14): a clone that failed does not hold the quit
// ---------------------------------------------------------------------------

/** The stand-in `gh` a failed sign-in's message asks for, and how long its `auth status` takes (the reverify's V6). */
const GH = '/p359/stand-in/gh';
const GH_MS = 2_500;

/** The fix round's line in clone.ts `finish()`, as his ruled round narrowed it. */
const JOINS_ONLY_AN_ADD =
  '    if (!run.cancelled && outcome.code === 0 && outcome.spawnErrorCode === undefined) {\n      this.finishing.add(run);\n    }';

/**
 * A clone that failed for sign-in, asked through the registered handler, with
 * the quit pressed while its `gh auth status` runs; then the quit's project
 * step at its own bound, timed. Waits for the failure's last frame, so nothing
 * of the case outlives it.
 */
async function failedSignInAtQuit(lifecycle: LifecycleModule, projects: ProjectsModule, parentDir: string, cloneId: string) {
  const { ipc, handlers } = fakeIpc();
  projects.registerProjectCloneIpc(ipc);
  const git = new StandInGit();
  const gh = { endedAt: null as number | null };
  seams.gh = GH;
  seams.child = (bin: unknown) => {
    if (bin === 'git') return git;
    if (bin !== GH) throw new Error(`p359 ruled round: a spawn of ${String(bin)}`);
    const child = new StandInGit();
    setTimeout(() => {
      gh.endedAt = performance.now();
      child.emit('close', 0);
    }, GH_MS);
    return child;
  };
  const win = cloneWindow();
  await handlers.get('projects:clone')!(win.event, cloneInput(parentDir, cloneId));
  // The line git dies on when no credential helper can answer (clone-parse.ts).
  git.stderr.write('fatal: unable to get password from user\n');
  await settle();
  git.emit('close', 128);
  await until(() => seams.spawned.includes(`spawn ${GH}`), 'the sign-in check');

  lifecycle.markAppQuitting();
  const t0 = performance.now();
  await projects.disposeProjectCloneIpc();
  const stepMs = performance.now() - t0;
  const ghEndedFirst = gh.endedAt !== null;
  await until(() => lastDone(win.frames) !== undefined, 'the failure’s last frame', 3 * GH_MS);
  return { stepMs, ghEndedFirst, done: lastDone(win.frames)! };
}

describe('4. his ruled round: a clone that failed does not hold the quit’s project step', () => {
  it('4a. a clone that failed for sign-in, its gh check taking 2.5 s, leaves the step at once, and its message still comes', async () => {
    const parentDir = parentFolder();
    const { lifecycle, projects } = await freshProjects();
    const r = await failedSignInAtQuit(lifecycle, projects, parentDir, 'c-4a');
    // The fix round's step waited for gh here: 2,427 ms against the parent's 167 ms in the reverify's V6.
    expect(r.ghEndedFirst, 'the step did not wait for gh').toBe(false);
    expect(r.stepMs).toBeLessThan(1_000);
    expect(r.done).toMatchObject({ cloneId: 'c-4a', done: true, error: { kind: 'unauthenticated' } });
    expect(r.done.error?.message, 'the message waited for gh, the step did not').toContain(CLONE_GH_HINT);
    expect(r.done.project).toBeUndefined();
    expect(seams.spawned).toEqual(['spawn git', `spawn ${GH}`]);
    expect(readdirSync(parentDir), 'its temporary folder is gone').toEqual([]);
  });

  it('4b. the ablation: with every finished run joined, as the fix round had it, the same quit waits for gh; the same copies unedited do not', async () => {
    const drive = async (cloneFile: string, cloneId: string) => {
      const indexFile = writeCopy('projects/index.ts', [], { './clone': cloneFile });
      vi.resetModules();
      const lifecycle = await import('../../lifecycle');
      const projects = (await import(/* @vite-ignore */ indexFile)) as ProjectsModule;
      const parentDir = parentFolder();
      seams.spawned.length = 0;
      const r = await failedSignInAtQuit(lifecycle, projects, parentDir, cloneId);
      rmSync(parentDir, { recursive: true, force: true });
      scratch = '';
      return r;
    };
    const cut = await drive(writeCopy('projects/clone.ts', [[JOINS_ONLY_AN_ADD, '    this.finishing.add(run);']]), 'c-4b-cut');
    expect(cut.ghEndedFirst, 'without the ruled line the step waits for gh').toBe(true);
    expect(cut.stepMs).toBeGreaterThanOrEqual(1_000);
    expect(cut.done).toMatchObject({ done: true, error: { kind: 'unauthenticated' } });
    const same = await drive(writeCopy('projects/clone.ts', []), 'c-4b-same');
    expect(same.ghEndedFirst, 'the copies are faithful: the difference is the ruled line').toBe(false);
    expect(same.stepMs).toBeLessThan(1_000);
  }, 20_000);
});

/**
 * Writes a copy of `src/main/<rel>` with `edits` made (each must find its text
 * exactly once) and its relative imports, static and dynamic, made absolute,
 * so it resolves the very modules the shipping file does, the stand-ins
 * included; a specifier named in `swaps` points at the given copy instead.
 * Answers its path. (p359-no-boot-at-quit.test.ts's `writeCopy`, with the
 * dynamic import and the swap added.)
 */
function writeCopy(
  rel: string,
  edits: readonly (readonly [string, string])[],
  swaps: Readonly<Record<string, string>> = {}
): string {
  let text = readFileSync(join(MAIN, rel), 'utf8');
  for (const [from, to] of edits) {
    expect(text.split(from).length - 1, `the ablation finds its text once: ${from}`).toBe(1);
    text = text.replace(from, () => to);
  }
  const absolute = (spec: string): string => swaps[spec] ?? resolve(dirname(join(MAIN, rel)), spec);
  text = text
    .replace(/from '(\.\.?\/[^']+)'/g, (_m, spec: string) => `from '${absolute(spec)}'`)
    .replace(/import\('(\.\.?\/[^']+)'\)/g, (_m, spec: string) => `import('${absolute(spec)}')`);
  copyCount += 1;
  const file = join(copies, `${String(copyCount)}-${basename(rel)}`);
  writeFileSync(file, text);
  return file;
}
