/**
 * Cloning a repository (Phase 18.6 item 5). Spec: research 35 §3.3 to §3.9.
 *
 * Tortie clones by spawning the SYSTEM git, which is the same model every
 * other git call in this application uses (research 06 §1.1, and VS Code's
 * `extensions/git/src/git.ts` for the precedent). Nine packages were
 * surveyed and every one of them either parses git's progress wrongly,
 * cannot reach the macOS keychain, or has an API that forces a choice
 * between progress and a responsive window. Research 35 §3.1 has the table.
 * Do not add a git dependency to make this shorter.
 *
 * WHY THIS IS NOT `GitService` / `runGit`. `GitService` is constructed with a
 * repository path and nearly every method calls `assertIsRepo()` first, and
 * a clone's target does not exist yet. Four properties of `runGit` also do
 * not fit, and a clone must not change them for every other caller: its cwd
 * is an existing repository, its stderr is buffered to 1 MiB and returned at
 * the end rather than streamed, it has one wall clock timeout of 30 s where
 * a 101 s clone is normal, and it kills with SIGKILL, which is the one
 * signal that leaves a half built repository on disk.
 *
 *   user picks parent /Users/me/src and the name "tortie"
 *                     |
 *                     v
 *   mkdtemp  ->  /Users/me/src/.tortie-clone-BfgUzn
 *                     |
 *              git clone --progress -- <url> <tempdir>
 *                     |
 *        exit 0 ------+------ non-zero, cancelled, or crash
 *           |                        |
 *           v                        v
 *   rename to /Users/me/src/tortie   rm -rf the temp dir
 *           |
 *           v
 *   addProject /Users/me/src/tortie
 *
 * The temporary sibling is what makes every "nothing was left behind"
 * sentence in clone-parse.ts true. A git repository is relocatable, the
 * rename is within one directory so it is atomic and copies nothing, and a
 * leftover is unambiguously ours because of the dotted prefix. Cloning
 * straight to the final path is simpler and was rejected: a crash then
 * leaves a broken repository at exactly the name the user asked for.
 *
 * WHAT THIS MODULE THROWS AND WHAT IT STREAMS. `start()` rejects only for a
 * request the dialog should never have sent (no clone id, a name the shared
 * validator refuses, a parent that is not a directory). Everything a user
 * can actually cause, including a folder that already exists, arrives as the
 * terminal frame on the stream, so the dialog has ONE place to render a
 * clone failure.
 */

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type {
  CloneDone,
  CloneFailureKind,
  ClonePhase,
  ClonePreflight,
  ClonePreflightInput,
  CloneProgress,
  CloneStartInput
} from '@shared/ipc';
import { CLONE_BAD_URL_MESSAGE, normalizeCloneUrl } from '@shared/clone-url';
import type { NormalizedCloneUrl } from '@shared/clone-url';
import type { Project } from '@shared/types';
import { projectPathFor, validateProjectName } from '@shared/project-create';
import { gmuxError } from '../errors';
import { getUserPath, resolveBinary } from '../tmux/resolve';
import type { CloneFrame } from './clone-parse';
import {
  CLONE_GH_HINT,
  classifyCloneFailure,
  cloneFailureMessage,
  parseCloneFrame,
  splitFrames
} from './clone-parse';

/** Leftovers are recognisable as ours by this prefix, and hidden by the dot. */
const TEMP_PREFIX = '.tortie-clone-';

/**
 * No byte on stderr for this long and the clone is stopped. It sits above
 * git's own 75 s connect timeout on purpose, so a slow connection is
 * reported by git rather than pre-empted by us. There is NO total timeout: a
 * 101 s clone is normal and a 20 minute clone of a large monorepo is normal.
 */
const STALL_TIMEOUT_MS = 120_000;

/** Same ceiling for the preflight, for the same reason. */
const PREFLIGHT_TIMEOUT_MS = 120_000;

/** `gh auth status` is a hint, not a dependency. It gets three seconds. */
const GH_PROBE_TIMEOUT_MS = 3_000;

/**
 * At most one frame per phase per 100 ms. Measured at roughly 30 frames a
 * second on a depth 1 clone of microsoft/TypeScript, so this is a ceiling
 * rather than a fix. A phase change and a phase's last frame are never held
 * back, because the phase word changing is what tells the user the bar reset.
 */
const FRAME_INTERVAL_MS = 100;

/** How much of git's own text is kept for `Show details`. */
const STDERR_TAIL_LINES = 40;

/** A temp directory older than this in a parent we chose is a crash leftover. */
const SWEEP_AGE_MS = 24 * 60 * 60 * 1000;

/** A cancelled clone that ignores SIGTERM this long is killed outright. */
const CANCEL_GRACE_MS = 5_000;

/**
 * The two `-c` overrides that go in front of every network git command here.
 *
 * `core.askPass=` is REQUIRED and it is the switch people miss. Git prefers
 * an askpass program over the terminal, and `GIT_TERMINAL_PROMPT=0` does not
 * disable askpass: with `core.askPass` set in the user's config, git ran the
 * askpass program anyway. An environment variable cannot clear a config
 * value, so it has to be an argument.
 *
 * `credential.interactive=false` is a precaution for third party helpers
 * such as Git Credential Manager, which read it. It is UNVERIFIED, because
 * that helper is not installed on the machine this was measured on, and
 * `osxkeychain` ignores it.
 */
const CREDENTIAL_ARGS: readonly string[] = [
  '-c',
  'core.askPass=',
  '-c',
  'credential.interactive=false'
];

/**
 * The environment for every git command in this module.
 *
 * FOUR CREDENTIAL SWITCHES ARE NEEDED TOGETHER, not one, and a clone that
 * hangs forever is worse than a clone that fails. Three of them are here and
 * the fourth is `core.askPass=` above.
 *
 * `GIT_TERMINAL_PROMPT=0` alone turns the hang into a failure in 143 ms, but
 * it is beaten by two other mechanisms, both proven by measurement: a
 * `GIT_ASKPASS` program, and `core.askPass` in the user's config.
 *
 * `HOME` MUST BE THE REAL HOME. `git-credential-osxkeychain` reads the login
 * keychain and macOS resolves the login keychain through the home directory.
 * The same private clone went from succeeding in 603 ms to failing with
 * "could not read Username" with only `HOME` changed. Never point this at a
 * sandbox.
 *
 * `GIT_CONFIG_NOSYSTEM` MUST NEVER BE SET. Setting it is a reasonable
 * instinct for a controlled environment and it would break every private
 * clone, because the keychain helper is configured in Xcode's system git
 * config and nowhere else.
 *
 * `PATH` comes from the login shell. A Finder launched macOS application
 * gets a minimal PATH with no `/opt/homebrew/bin` in it, so a Homebrew git
 * is invisible in the packaged application while working in development.
 */
export async function cloneGitEnv(): Promise<NodeJS.ProcessEnv> {
  return {
    ...process.env,
    PATH: await getUserPath(),
    HOME: process.env['HOME'] ?? homedir(),
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '',
    SSH_ASKPASS: '',
    GIT_OPTIONAL_LOCKS: '0',
    // Stable English text for the parser in clone-parse.ts. A non English
    // locale was not tested; this is a precaution and not a measured fix.
    LC_ALL: 'C'
  };
}

// ---------------------------------------------------------------------------
// A small buffered runner, for the two short commands a clone needs
// ---------------------------------------------------------------------------

interface Captured {
  code: number;
  stdout: string;
  stderr: string;
  /** errno from the spawn itself, e.g. ENOENT when git is not installed. */
  errorCode?: string;
}

/**
 * Run a command, buffer both streams, and never reject. The clone itself
 * cannot use this (its stderr is the progress stream), but `ls-remote` and
 * the `gh` probe are short and want an answer rather than frames.
 */
function runCaptured(
  bin: string,
  args: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }
): Promise<Captured> {
  return new Promise<Captured>((resolve) => {
    const child = spawn(bin, [...args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (result: Captured): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish({ code: -1, stdout, stderr });
    }, options.timeoutMs);

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      finish({
        code: -1,
        stdout,
        stderr,
        ...(err.code !== undefined ? { errorCode: err.code } : {})
      });
    });
    child.on('close', (code) => {
      finish({ code: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * The second line of the unauthenticated message, when `gh` is installed AND
 * already signed in to this host. Tortie does NOT configure `gh` as a
 * credential helper: adding a helper means changing how git authenticates
 * for a user who did not ask. This is a sentence and never an action.
 */
async function ghHintFor(host: string, env: NodeJS.ProcessEnv): Promise<string | undefined> {
  const gh = await resolveBinary('gh');
  if (gh === null) return undefined;
  const probe = await runCaptured(
    gh,
    ['auth', 'status', '--hostname', host],
    { cwd: homedir(), env, timeoutMs: GH_PROBE_TIMEOUT_MS }
  );
  return probe.code === 0 ? CLONE_GH_HINT : undefined;
}

/** The failure copy, with the `gh` line added when it applies. */
async function failureMessage(
  kind: CloneFailureKind,
  target: Pick<NormalizedCloneUrl, 'host' | 'owner' | 'repo'>,
  extra: { name?: string; stderr?: string; env?: NodeJS.ProcessEnv }
): Promise<string> {
  const ghHint =
    kind === 'unauthenticated'
      ? await ghHintFor(hostnameOf(target.host), extra.env ?? process.env)
      : undefined;
  return cloneFailureMessage(kind, {
    host: target.host,
    ...(target.owner !== undefined ? { owner: target.owner } : {}),
    ...(target.repo !== undefined ? { repo: target.repo } : {}),
    ...(extra.name !== undefined ? { name: extra.name } : {}),
    ...(extra.stderr !== undefined ? { stderr: extra.stderr } : {}),
    ...(ghHint !== undefined ? { ghHint } : {})
  });
}

/** `github.com:8443` → `github.com`, which is what `gh` wants. */
function hostnameOf(host: string): string {
  const colon = host.lastIndexOf(':');
  return colon > 0 ? host.slice(0, colon) : host;
}

/**
 * A structured error that also carries the `CloneFailureKind`.
 *
 * `projects:clonePreflight` is the one clone channel that answers by
 * rejecting rather than by a frame, and the renderer keeps every clone
 * sentence in one table keyed by kind. Without the kind on the rejection, an
 * address failure would print main's sentence while the same failure during
 * the clone printed the renderer's, and the two would drift apart.
 *
 * The frozen `GmuxErrorPayload` union in src/shared/types.ts is untouched.
 * `payload` still holds exactly its three fields, so `isGmuxError` and every
 * main-side reader behave as before; only the JSON on the wire gains a
 * fourth field, which the renderer reads defensively.
 */
function cloneError(
  kind: CloneFailureKind,
  code: 'INVALID_INPUT' | 'GIT_FAILED',
  message: string,
  detail?: string
): Error {
  const err = gmuxError(code, message, detail);
  err.message = JSON.stringify({ ...err.payload, kind });
  return err;
}

// ---------------------------------------------------------------------------
// Preflight
// ---------------------------------------------------------------------------

/**
 * Ask the server about the address before anything exists on disk. Measured
 * at 0.22 s to 0.23 s, and it answers three questions at once: whether the
 * URL resolves to a git repository, whether we can authenticate, and what
 * the default branch is called.
 *
 * NEVER call this when the dialog opens. The Repository field is prefilled
 * from the clipboard, so a preflight on open would send a request, along
 * with whatever credential the keychain offers for that host, to whatever
 * address happened to be on the clipboard. The user did not ask for that.
 */
export async function preflightClone(
  input: ClonePreflightInput
): Promise<ClonePreflight> {
  const target = normalizeCloneUrl(input?.raw ?? '');
  if (target === null) {
    throw cloneError('badUrl', 'INVALID_INPUT', CLONE_BAD_URL_MESSAGE);
  }

  const env = await cloneGitEnv();
  const result = await runCaptured(
    'git',
    [...CREDENTIAL_ARGS, 'ls-remote', '--symref', '--', target.url, 'HEAD'],
    // The user's home, because git must read the user's real config. It is
    // never a repository path: `ls-remote` with an explicit URL needs none.
    { cwd: homedir(), env, timeoutMs: PREFLIGHT_TIMEOUT_MS }
  );

  if (result.code !== 0) {
    const kind = classifyCloneFailure(result.stderr, result.errorCode);
    throw cloneError(
      kind,
      'GIT_FAILED',
      await failureMessage(kind, target, {
        name: target.suggestedName,
        stderr: result.stderr,
        env
      }),
      result.stderr.trim() || undefined
    );
  }

  const defaultBranch = parseSymrefHead(result.stdout);
  return {
    url: target.url,
    host: target.host,
    ...(target.owner !== undefined ? { owner: target.owner } : {}),
    ...(target.repo !== undefined ? { repo: target.repo } : {}),
    suggestedName: target.suggestedName,
    ...(defaultBranch !== undefined ? { defaultBranch } : {}),
    ...(target.rewrittenFromSsh === true ? { rewrittenFromSsh: true } : {}),
    ...(target.strippedCredential === true ? { strippedCredential: true } : {})
  };
}

/** `ref: refs/heads/main\tHEAD` → `main`. */
function parseSymrefHead(stdout: string): string | undefined {
  const match = /^ref:\s+refs\/heads\/(\S+)\s+HEAD$/m.exec(stdout);
  return match?.[1];
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

/** Where a clone's frames go. One per window, following SearchSink. */
export interface CloneSink {
  /** Stable identity of the destination, and the one-clone-per-window key. */
  readonly key: string;
  /** False once the window is gone. */
  alive(): boolean;
  send(cloneId: string, frame: CloneProgress | CloneDone): void;
}

interface CloneRun {
  id: string;
  sink: CloneSink;
  child: ChildProcess;
  tempPath: string;
  finalPath: string;
  name: string;
  target: NormalizedCloneUrl;
  buffered: string;
  stderrTail: string[];
  phase: ClonePhase;
  pending: CloneProgress | null;
  lastSentAt: number;
  flushTimer: NodeJS.Timeout | null;
  stallTimer: NodeJS.Timeout | null;
  killTimer: NodeJS.Timeout | null;
  cancelled: boolean;
  stalled: boolean;
  settled: boolean;
  /** Resolves when the terminal frame has been sent and the disk is tidy. */
  finished: Promise<void>;
  markFinished: () => void;
}

export class CloneEngine {
  private readonly runs = new Map<string, CloneRun>();

  /**
   * `addProject` is injected for the same reason create.ts injects its deps:
   * production passes nothing and gets the manifest-backed add that ⌘O
   * already goes through, and a test can drive a real clone without an
   * Electron main process behind it.
   */
  constructor(
    private readonly addProject: (path: string) => Promise<Project> = async (
      path
    ) => {
      // Lazy, like every other main module that needs the core: a project
      // channel must not drag tmux into the boot module graph.
      const { getGmuxCore } = await import('../sessions');
      return (await getGmuxCore()).addProject(path);
    }
  ) {}

  /**
   * Validate, make the temporary directory, spawn git. Resolves with the
   * clone id as soon as the child exists; everything after that is a frame.
   */
  async start(input: CloneStartInput, sink: CloneSink): Promise<string> {
    const cloneId =
      typeof input?.cloneId === 'string' ? input.cloneId.trim() : '';
    if (cloneId.length === 0) {
      throw gmuxError('INVALID_INPUT', 'A clone needs an id.');
    }
    if (this.runs.has(cloneId)) {
      throw gmuxError('INVALID_INPUT', 'That clone is already running.');
    }
    // One clone at a time, in the window that started it. The dialog blocks
    // while a clone runs so this should be unreachable; if it ever is
    // reached, the older clone cleans up rather than being orphaned.
    for (const run of [...this.runs.values()]) {
      if (run.sink.key === sink.key) this.cancel(run.id);
    }

    const target = normalizeCloneUrl(input.url ?? '');
    if (target === null) {
      throw cloneError('badUrl', 'INVALID_INPUT', CLONE_BAD_URL_MESSAGE);
    }

    // Trailing slashes are normalised away FIRST, the same way create.ts
    // does it, so the directory check and the created path reason about one
    // spelling of the parent.
    const rawParent = String(input.parentDir ?? '')
      .trim()
      .replace(/\/+$/, '');
    const parentDir =
      rawParent === '' && input.parentDir?.trim() === '/' ? '/' : rawParent;
    if (parentDir.length === 0 || !parentDir.startsWith('/')) {
      throw gmuxError('INVALID_INPUT', 'Choose a folder to clone it into.');
    }
    const name = String(input.name ?? '').trim();
    const nameError = validateProjectName(name);
    if (nameError !== null) throw gmuxError('INVALID_INPUT', nameError);
    if (!(await isDirectory(parentDir))) {
      throw gmuxError(
        'INVALID_INPUT',
        'That folder does not exist any more.',
        parentDir
      );
    }

    const finalPath = projectPathFor(parentDir, name);
    const env = await cloneGitEnv();

    if (await pathExists(finalPath)) {
      await this.failBeforeSpawn(sink, cloneId, 'destinationExists', target, {
        name,
        env
      });
      return cloneId;
    }

    // A crash or a SIGKILL is the one case git cannot clean up after, so the
    // parent the user chose is swept before we add another directory to it.
    await sweepStaleTempDirs(parentDir);

    let tempPath: string;
    try {
      tempPath = await mkdtemp(join(parentDir, TEMP_PREFIX));
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      const kind: CloneFailureKind =
        code === 'EACCES' || code === 'EPERM' || code === 'EROFS'
          ? 'permission'
          : code === 'ENOSPC'
            ? 'diskFull'
            : 'unknown';
      await this.failBeforeSpawn(sink, cloneId, kind, target, {
        name,
        env,
        stderr: (err as Error).message
      });
      return cloneId;
    }

    // Full clone, never `--depth`. Tortie exists for coding agents, and an
    // agent that runs `git log`, `git blame` or `git bisect` in a depth 1
    // clone gets a WRONG ANSWER rather than an error. Measured on
    // microsoft/TypeScript: depth 1 left 1 commit and 2 remote branches
    // where the repository has 36,770 and 372.
    //
    // Not `detached: true`. No measurement supported it, and it costs the
    // one hazard nobody asked for, which is a clone that outlives the
    // window. SIGTERM to a plain child left zero orphan processes and an
    // empty destination in every measured case.
    const child = spawn(
      'git',
      [
        ...CREDENTIAL_ARGS,
        'clone',
        // Without this git prints nothing at all when stderr is a pipe.
        '--progress',
        // Stops a URL beginning with a dash being read as an option.
        '--',
        target.url,
        tempPath
      ],
      {
        cwd: parentDir,
        env,
        // stdout is piped and discarded. Git writes its progress to stderr
        // and stdout was zero bytes on every measured clone; the pipe is
        // here so a future large file storage frame is not lost, and it is
        // drained so it can never fill and block the child.
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let markFinished = (): void => undefined;
    const finished = new Promise<void>((resolve) => {
      markFinished = resolve;
    });
    const run: CloneRun = {
      id: cloneId,
      sink,
      child,
      tempPath,
      finalPath,
      name,
      target,
      buffered: '',
      stderrTail: [],
      phase: 'starting',
      pending: null,
      lastSentAt: 0,
      flushTimer: null,
      stallTimer: null,
      killTimer: null,
      cancelled: false,
      stalled: false,
      settled: false,
      finished,
      markFinished
    };
    this.runs.set(cloneId, run);

    sink.send(cloneId, { cloneId, phase: 'starting' });
    this.wire(run, env);
    return cloneId;
  }

  /** SIGTERM the child. Never SIGKILL: it leaves a half built repository. */
  cancel(cloneId: string): void {
    const run = this.runs.get(cloneId);
    if (run === undefined || run.cancelled) return;
    run.cancelled = true;
    run.child.kill('SIGTERM');
    // Backstop only. Measured, git always exited on SIGTERM and removed its
    // destination. If one ever does not, the temporary directory is removed
    // by us on close either way, so quitting can never wedge on it.
    run.killTimer = setTimeout(() => {
      if (!run.settled) run.child.kill('SIGKILL');
    }, CANCEL_GRACE_MS);
  }

  /** The window went away: its clone goes with it. */
  cancelForSink(key: string): void {
    for (const run of [...this.runs.values()]) {
      if (run.sink.key === key) this.cancel(run.id);
    }
  }

  /**
   * Quit-time teardown. Cancelling on quit is the same code path as pressing
   * Cancel, which is what stops a hard kill leaving a repository mid write.
   * Bounded, because quit must never wait on a network.
   */
  async dispose(timeoutMs = 3_000): Promise<void> {
    const pending = [...this.runs.values()].map((run) => run.finished);
    for (const run of [...this.runs.values()]) this.cancel(run.id);
    if (pending.length === 0) return;
    await Promise.race([
      Promise.all(pending),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  }

  /** A failure found before git was spawned. Nothing exists on disk yet. */
  private async failBeforeSpawn(
    sink: CloneSink,
    cloneId: string,
    kind: CloneFailureKind,
    target: NormalizedCloneUrl,
    extra: { name: string; env: NodeJS.ProcessEnv; stderr?: string }
  ): Promise<void> {
    const message = await failureMessage(kind, target, extra);
    // Next tick, so the terminal frame cannot outrun this call's own reply.
    setImmediate(() => {
      if (!sink.alive()) return;
      sink.send(cloneId, {
        cloneId,
        done: true,
        error: {
          kind,
          message,
          ...(extra.stderr !== undefined ? { detail: extra.stderr } : {})
        }
      });
    });
  }

  private wire(run: CloneRun, env: NodeJS.ProcessEnv): void {
    const { child } = run;
    child.stdout?.resume();
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      this.armStall(run);
      run.buffered += chunk;
      const { lines, rest } = splitFrames(run.buffered);
      run.buffered = rest;
      for (const line of lines) {
        run.stderrTail.push(line);
        if (run.stderrTail.length > STDERR_TAIL_LINES) run.stderrTail.shift();
        const frame = parseCloneFrame(line);
        if (frame !== null) this.emit(run, frame);
      }
    });
    this.armStall(run);

    child.on('error', (err: NodeJS.ErrnoException) => {
      void this.finish(run, { spawnErrorCode: err.code ?? '', env });
    });
    child.on('close', (code) => {
      void this.finish(run, { code: code ?? -1, env });
    });
  }

  /** Reset the stall watchdog. Any byte on stderr counts as progress. */
  private armStall(run: CloneRun): void {
    if (run.stallTimer !== null) clearTimeout(run.stallTimer);
    run.stallTimer = setTimeout(() => {
      run.stalled = true;
      run.child.kill('SIGTERM');
    }, STALL_TIMEOUT_MS);
  }

  private emit(run: CloneRun, frame: CloneFrame): void {
    if (run.settled) return;
    const progress: CloneProgress = { cloneId: run.id, ...frame };
    // A phase change, and the frame that ends a phase, are never held back:
    // the phase word changing is what tells the user the bar reset.
    const immediate = frame.phase !== run.phase || frame.percent === 100;
    run.phase = frame.phase;
    if (immediate) {
      this.flush(run, progress);
      return;
    }
    const waited = Date.now() - run.lastSentAt;
    if (waited >= FRAME_INTERVAL_MS) {
      this.flush(run, progress);
      return;
    }
    run.pending = progress;
    if (run.flushTimer === null) {
      run.flushTimer = setTimeout(() => {
        run.flushTimer = null;
        const held = run.pending;
        run.pending = null;
        if (held !== null && !run.settled) this.flush(run, held);
      }, FRAME_INTERVAL_MS - waited);
    }
  }

  /**
   * Send one frame and drop anything the throttle was still holding.
   *
   * Dropping the held frame is the whole point rather than tidiness. Without
   * it a phase change is sent immediately, the 100 ms timer then fires and
   * delivers the frame from BEFORE it, and the bar goes backwards under a
   * phase word that has already moved on. Measured on a full clone of
   * expressjs/express: one such regression in nineteen frames.
   */
  private flush(run: CloneRun, progress: CloneProgress): void {
    if (run.flushTimer !== null) {
      clearTimeout(run.flushTimer);
      run.flushTimer = null;
    }
    run.pending = null;
    run.lastSentAt = Date.now();
    if (run.sink.alive()) run.sink.send(run.id, progress);
  }

  /** The child is gone. Tidy the disk, then send exactly one last frame. */
  private async finish(
    run: CloneRun,
    outcome: { code?: number; spawnErrorCode?: string; env: NodeJS.ProcessEnv }
  ): Promise<void> {
    if (run.settled) return;
    run.settled = true;
    this.clearTimers(run);
    run.pending = null;
    this.runs.delete(run.id);

    // Whatever is still in the buffer is a line git wrote without a trailing
    // separator, and the line git dies on is exactly the one that classifies
    // the failure. Losing it would turn a known failure into 'unknown'.
    const trailing = run.buffered.trim();
    if (trailing.length > 0) run.stderrTail.push(trailing);
    const stderr = run.stderrTail.join('\n');
    try {
      if (run.cancelled) {
        const leftover = await removeTemp(run.tempPath);
        this.send(run, {
          cancelled: true,
          ...(leftover !== null ? { leftoverPath: leftover } : {})
        });
        return;
      }
      if (outcome.code === 0 && outcome.spawnErrorCode === undefined) {
        await this.succeed(run, stderr, outcome.env);
        return;
      }
      await removeTemp(run.tempPath);
      const kind = run.stalled
        ? 'interrupted'
        : classifyCloneFailure(stderr, outcome.spawnErrorCode);
      this.send(run, {
        error: {
          kind,
          message: await failureMessage(kind, run.target, {
            name: run.name,
            stderr,
            env: outcome.env
          }),
          ...(stderr.trim().length > 0 ? { detail: stderr.trim() } : {})
        }
      });
    } finally {
      run.markFinished();
    }
  }

  /** Rename into place, read the branch, and add it as a project. */
  private async succeed(
    run: CloneRun,
    stderr: string,
    env: NodeJS.ProcessEnv
  ): Promise<void> {
    try {
      await rename(run.tempPath, run.finalPath);
    } catch (err) {
      await removeTemp(run.tempPath);
      const code = (err as NodeJS.ErrnoException).code;
      const kind: CloneFailureKind =
        code === 'ENOTEMPTY' || code === 'EEXIST'
          ? 'destinationExists'
          : code === 'EACCES' || code === 'EPERM' || code === 'EROFS'
            ? 'permission'
            : 'unknown';
      this.send(run, {
        error: {
          kind,
          message: await failureMessage(kind, run.target, {
            name: run.name,
            stderr: (err as Error).message,
            env
          }),
          detail: (err as Error).message
        }
      });
      return;
    }

    const defaultBranch = await readHeadBranch(run.finalPath);
    try {
      // The same add projects:create calls, so the manifest is written by
      // one function whichever way a project came into existence.
      const project = await this.addProject(run.finalPath);
      this.send(run, { project, path: run.finalPath, defaultBranch });
    } catch (err) {
      // The clone worked and the folder is on disk. Say what happened
      // instead of pretending the download failed, and leave the folder.
      this.send(run, {
        path: run.finalPath,
        defaultBranch,
        error: {
          kind: 'unknown',
          message: `The repository was cloned to ${run.finalPath}, but Tortie could not open it as a project.`,
          detail: (err as Error).message || stderr
        }
      });
    }
  }

  private send(run: CloneRun, frame: Omit<CloneDone, 'cloneId' | 'done'>): void {
    if (!run.sink.alive()) return;
    run.sink.send(run.id, { cloneId: run.id, done: true, ...frame });
  }

  private clearTimers(run: CloneRun): void {
    if (run.flushTimer !== null) clearTimeout(run.flushTimer);
    if (run.stallTimer !== null) clearTimeout(run.stallTimer);
    if (run.killTimer !== null) clearTimeout(run.killTimer);
    run.flushTimer = null;
    run.stallTimer = null;
    run.killTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Disk helpers
// ---------------------------------------------------------------------------

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove the temporary directory. Returns null when it is gone, or the path
 * when it is not, because the renderer must not claim a cleanup it did not
 * perform. Git removes its own destination on SIGTERM in every measured
 * case, so this is usually removing something that is already gone.
 */
async function removeTemp(path: string): Promise<string | null> {
  try {
    await rm(path, { recursive: true, force: true });
    return null;
  } catch {
    return (await pathExists(path)) ? path : null;
  }
}

/**
 * Remove `.tortie-clone-*` left in this parent by a crash or a SIGKILL more
 * than a day ago. A leftover is unambiguously ours because of the name and
 * the leading dot, so there is no risk of deleting something a user made.
 * Best effort: a sweep that fails must never stop a clone.
 */
async function sweepStaleTempDirs(parentDir: string): Promise<void> {
  try {
    const entries = await readdir(parentDir, { withFileTypes: true });
    const cutoff = Date.now() - SWEEP_AGE_MS;
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith(TEMP_PREFIX)) continue;
      const path = join(parentDir, entry.name);
      try {
        const info = await stat(path);
        if (info.mtimeMs < cutoff) await rm(path, { recursive: true, force: true });
      } catch {
        /* the next clone can try again */
      }
    }
  } catch {
    /* an unreadable parent fails later, with git's own message */
  }
}

/**
 * The branch a fresh clone checked out, read from `.git/HEAD` rather than by
 * spawning a sixth git. It is one line of cosmetic copy, so anything
 * unexpected returns null rather than failing the clone.
 */
async function readHeadBranch(repoPath: string): Promise<string | null> {
  try {
    const head = await readFile(join(repoPath, '.git', 'HEAD'), 'utf8');
    const match = /^ref:\s+refs\/heads\/(\S+)\s*$/m.exec(head);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
