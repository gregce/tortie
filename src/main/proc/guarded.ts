/**
 * guarded.ts — the ONE way gmux runs a short-lived child that answers a
 * question (a `--version` probe, a `create-chat` pre-assignment, the
 * login-shell PATH capture).
 *
 * Why this module exists (Phase 13.8, and the leak that triggered it): five
 * `/bin/zsh -lic printf '__GMUX_PATH__…'` processes were found alive on the
 * user's machine, the oldest 19 h 41 m, one per app launch. Every one of them
 * was a child whose caller had given up and walked away. Two Node facts make
 * that the DEFAULT outcome rather than an accident:
 *
 *  1. `execFile`'s callback fires on stdio CLOSE, not on exit. A child that
 *     forks a copy of itself (this machine's `zsh -lic` does) leaves the
 *     write end of stdout open in the fork, so the pipe never closes, so the
 *     promise NEVER SETTLES. The caller hangs; nobody reaps anything.
 *  2. `execFile`'s `timeout` sends one signal to the DIRECT child only, and
 *     it forwards only a whitelist of options to spawn — it silently DROPS
 *     `detached`, so there is not even a process group to aim at.
 *
 * So the contract here is deliberately narrow and total:
 *
 *  - **Always settles.** An independent deadline resolves the promise whatever
 *    the child's stdio is doing. Callers get an answer or a `timedOut` flag;
 *    they never get to hang.
 *  - **Always reaps.** The child is spawned `detached`, which makes its pid
 *    its own process-group id, so SIGTERM→SIGKILL can be aimed at the GROUP
 *    (`kill(-pid)`) and reach the forks too. Without `detached` the child
 *    sits in Electron's group and `kill(-pid)` would signal gmux itself.
 *  - **Nothing outlives the app.** Every live child is tracked; `reapGuarded
 *    Children()` on `before-quit` kills what is still running. That is the
 *    hole the 19-hour orphans came through: the deadline was pending, the
 *    user quit, and the timer died with the app.
 *
 * Killing by pgid stays safe after the leader exits: a pid is not reused
 * while it is still a live group's id, so `-pid` can never reach a stranger.
 *
 * Pure Node — no electron import — so it is unit-testable outside Electron.
 */

import { spawn, type ChildProcess } from 'node:child_process';

/** Grace between SIGTERM and SIGKILL for a child that overran its deadline. */
export const DEFAULT_KILL_GRACE_MS = 500;

/** Default cap on buffered output (a chatty rc file must not grow unbounded). */
const DEFAULT_MAX_OUTPUT = 256 * 1024;

// ---------------------------------------------------------------------------
// Group kill + the live-child registry
// ---------------------------------------------------------------------------

const liveChildren = new Set<ChildProcess>();

/**
 * SIGTERM the child's whole PROCESS GROUP, then SIGKILL what survives.
 *
 * The group, not the child, is the unit that matters: the observed leak was a
 * shell that FORKS A COPY OF ITSELF, and killing only the direct child leaves
 * the fork holding the inherited stdout write end open forever.
 *
 * The SIGKILL is UNCONDITIONAL rather than cancelled by the leader's `exit`:
 * the leader dying is exactly the case where a surviving fork would otherwise
 * be missed, and a `kill(-pid)` against an empty group is a caught ESRCH.
 *
 * Only ever call this on a child spawned `detached` — see the module note.
 */
export function killProcessGroup(
  child: ChildProcess,
  graceMs: number = DEFAULT_KILL_GRACE_MS
): void {
  const pid = child.pid;
  if (pid === undefined) return;
  const signalGroup = (signal: NodeJS.Signals): void => {
    try {
      process.kill(-pid, signal);
    } catch {
      // ESRCH — the group is already gone, which is the outcome we wanted.
    }
  };
  signalGroup('SIGTERM');
  const hardKill = setTimeout(() => {
    signalGroup('SIGKILL');
    // Drop our ends of the pipes too: a survivor we could not signal must not
    // keep the event loop (or an app quit) waiting on a read.
    child.stdout?.destroy();
    child.stderr?.destroy();
  }, graceMs);
  // Never hold a quit open for the escalation timer itself.
  hardKill.unref?.();
}

/**
 * Register a live guarded child so app quit can reap it. Returns the
 * un-register function; call it once the child is known to be gone.
 */
export function trackGuardedChild(child: ChildProcess): () => void {
  liveChildren.add(child);
  const forget = (): void => {
    liveChildren.delete(child);
  };
  child.once('exit', forget);
  return forget;
}

/** pids of the guarded children still running (diagnostics; read-only). */
export function guardedChildPids(): number[] {
  const pids: number[] = [];
  for (const child of liveChildren) {
    if (child.pid !== undefined && child.exitCode === null) pids.push(child.pid);
  }
  return pids;
}

/**
 * Kill every guarded child still running. Called from `before-quit` so a
 * probe in flight when the user quits cannot become tomorrow's orphan.
 * Returns how many groups were signalled (0 on the normal quit).
 */
export function reapGuardedChildren(): number {
  let killed = 0;
  for (const child of [...liveChildren]) {
    liveChildren.delete(child);
    if (child.exitCode !== null || child.pid === undefined) continue;
    killProcessGroup(child, 0);
    killed += 1;
  }
  return killed;
}

// ---------------------------------------------------------------------------
// runGuarded
// ---------------------------------------------------------------------------

export interface GuardedRunOptions {
  /** Hard deadline. The promise settles at this point no matter what. */
  timeoutMs: number;
  /** Child environment (defaults to the parent's). */
  env?: NodeJS.ProcessEnv;
  /** Working directory. */
  cwd?: string;
  /** Cap on buffered stdout/stderr; the HEAD is kept. Default 256 KB. */
  maxOutputBytes?: number;
  /** SIGTERM→SIGKILL grace on the timeout path. Default 500 ms. */
  killGraceMs?: number;
}

export interface GuardedRunResult {
  stdout: string;
  stderr: string;
  /** Exit code, or null when the child was signalled / never exited. */
  code: number | null;
  /** Signal that killed the child, if any. */
  signal: NodeJS.Signals | null;
  /** True when the deadline fired and the group was killed. */
  timedOut: boolean;
  /** Set when the child could not be spawned at all (ENOENT, EACCES…). */
  spawnError: string | null;
}

/**
 * Run `bin args…`, capture stdout/stderr, and ALWAYS settle within
 * `timeoutMs`. Never rejects: callers branch on `code` / `timedOut` /
 * `spawnError`, which keeps "the probe failed" out of the exception path
 * where it has historically been swallowed by a bare catch.
 */
export function runGuarded(
  bin: string,
  args: readonly string[],
  options: GuardedRunOptions
): Promise<GuardedRunResult> {
  const maxOutput = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;
  return new Promise<GuardedRunResult>((resolve) => {
    let settled = false;
    let stdout = '';
    let stderr = '';

    const finish = (partial: Partial<GuardedRunResult>): void => {
      if (settled) return;
      settled = true;
      resolve({
        stdout,
        stderr,
        code: null,
        signal: null,
        timedOut: false,
        spawnError: null,
        ...partial
      });
    };

    let child: ChildProcess;
    try {
      child = spawn(bin, [...args], {
        detached: true, // own process group ⇒ the forks are reachable too
        stdio: ['ignore', 'pipe', 'pipe'],
        ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
        ...(options.env !== undefined ? { env: options.env } : {})
      });
    } catch (err) {
      finish({ spawnError: (err as Error).message });
      return;
    }

    const untrack = trackGuardedChild(child);

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      if (stdout.length < maxOutput) stdout += chunk;
    });
    child.stderr?.on('data', (chunk: string) => {
      if (stderr.length < maxOutput) stderr += chunk;
    });
    // A destroyed pipe (the SIGKILL path) must not become an unhandled error.
    child.stdout?.on('error', () => undefined);
    child.stderr?.on('error', () => undefined);

    child.once('error', (err) => {
      untrack();
      finish({ spawnError: err.message });
    });

    // 'close' (not 'exit'): stdout has been fully drained by then.
    child.once('close', (code, signal) => {
      clearTimeout(deadline);
      untrack();
      finish({ code, signal });
    });

    const deadline = setTimeout(() => {
      killProcessGroup(child, options.killGraceMs ?? DEFAULT_KILL_GRACE_MS);
      finish({ timedOut: true });
      // Deliberately NOT untracked here: the group kill is in flight, and the
      // registry is what reaps it if the app quits before it lands.
    }, options.timeoutMs);
    // The deadline must not be the reason `vitest`/a CLI stays alive.
    deadline.unref?.();
  });
}
