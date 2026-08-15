/**
 * The one place a gh process is created (Phase 46, spec section 3.1).
 *
 * `runGh` calls `assertReadOnlyArgv` FIRST, synchronously, before it resolves
 * a binary and before it touches the environment. A mutating command line
 * therefore never reaches a spawn, and the test proves it by handing `runGh`
 * a mutating argv with a fake spawner and asserting the spawner was never
 * called.
 *
 * The child itself is run through `runGuarded` (src/main/proc/guarded.ts),
 * which is the existing way Tortie runs a short lived child that answers a
 * question. It always settles, it owns its process group so a kill reaches
 * any fork, and it is reaped by `reapGuardedChildren` if the user quits with
 * a read in flight.
 *
 * TIMEOUTS. 3 s for `auth status`, which matches the clone preflight's gh
 * probe. 10 s for `run list` and `run view`, against a measured 0.64 s on
 * 2026-08-15. The kill grace is 2 s, so a child that ignores SIGTERM is
 * SIGKILLed two seconds later.
 *
 * THE ENVIRONMENT. The process environment, then PATH replaced by the login
 * shell PATH, then four gh variables so gh cannot ask a question or paint a
 * line nobody asked for. Tortie never sets `GH_TOKEN` and never reads a
 * token. If the user's own environment carries one, that is their own
 * configuration and gh's own precedence.
 */

import type { ActionsHealth } from '@shared/actions';
import { getLog } from '../log';
import { runGuarded } from '../proc/guarded';
import { getUserPath } from '../tmux/resolve';
import { assertReadOnlyArgv } from './argv';
import { ghBinaryPath } from './resolve';

const actionsLog = getLog('actions');

/** The auth probe's ceiling, matching src/main/projects/clone.ts. */
export const AUTH_TIMEOUT_MS = 3_000;

/** The ceiling for a read, about 15 times the measured 0.64 s. */
export const READ_TIMEOUT_MS = 10_000;

/** SIGTERM, then SIGKILL this long after. */
const KILL_GRACE_MS = 2_000;

/** Cap on gh's own output. A run list of 50 rows is about 20 KB. */
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

/** How much of gh's own words the last rung of the ladder may show. */
export const STDERR_DETAIL_CAP = 200;

/** What one gh process did. Never a rejection. */
export interface GhRunResult {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
  spawnError: string | null;
}

/** The spawn seam. The real one is `guardedSpawner`; tests pass their own. */
export type GhSpawner = (
  bin: string,
  argv: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }
) => Promise<GhRunResult>;

export interface RunGhOptions {
  /** The working directory. gh still gets an explicit --repo. */
  cwd: string;
  timeoutMs: number;
  /** Test seam: skip the real spawn. */
  spawner?: GhSpawner;
  /** Test seam: skip binary resolution and the login shell PATH capture. */
  bin?: string;
}

/** What a caller gets back: the bytes, or the rung of the ladder to draw. */
export type GhOutcome =
  | { ok: true; stdout: string }
  | { ok: false; health: ActionsHealth };

const guardedSpawner: GhSpawner = async (bin, argv, options) =>
  runGuarded(bin, argv, {
    cwd: options.cwd,
    env: options.env,
    timeoutMs: options.timeoutMs,
    killGraceMs: KILL_GRACE_MS,
    maxOutputBytes: MAX_OUTPUT_BYTES
  });

/** The four gh variables, on top of the inherited environment. */
async function ghEnv(): Promise<NodeJS.ProcessEnv> {
  return {
    ...process.env,
    PATH: await getUserPath(),
    GH_PROMPT_DISABLED: '1',
    GH_NO_UPDATE_NOTIFIER: '1',
    GH_PAGER: '',
    NO_COLOR: '1'
  };
}

/**
 * Run one gh command and classify what happened.
 *
 * Never rejects for a gh failure. It rejects only when the argv itself is
 * refused, which is a programming error in this directory rather than
 * anything the user did.
 */
export async function runGh(
  argv: readonly string[],
  options: RunGhOptions
): Promise<GhOutcome> {
  // FIRST, and synchronously. Nothing below this line may run for an argv
  // that is not one of the four read only shapes.
  assertReadOnlyArgv(argv);

  const spawner = options.spawner ?? guardedSpawner;
  const bin = options.bin ?? (await ghBinaryPath());
  if (bin === null) return { ok: false, health: { state: 'missing' } };

  const env =
    options.spawner === undefined ? await ghEnv() : { ...process.env };
  const result = await spawner(bin, argv, {
    cwd: options.cwd,
    env,
    timeoutMs: options.timeoutMs
  });

  if (result.spawnError === null && result.code === 0 && !result.timedOut) {
    return { ok: true, stdout: result.stdout };
  }

  const health = classifyGhFailure(result);
  actionsLog.debug('a gh read did not succeed', {
    verb: `${argv[0] ?? ''} ${argv[1] ?? ''}`,
    code: result.code,
    timedOut: result.timedOut,
    state: health.state
  });
  return { ok: false, health };
}

/** Network words gh prints when it cannot reach github.com. */
const NETWORK_RE =
  /dial tcp|no such host|could not resolve host|connection refused|network is (un)?reachable|i\/o timeout|tls handshake|context deadline exceeded|operation timed out|EOF$/im;

/** The words gh prints when there is no usable token for this host. */
const LOGGED_OUT_RE =
  /gh auth login|not logged in|no accounts? (are )?logged|authentication token|requires authentication|bad credentials/i;

/**
 * The rung of the degrade ladder for one failed gh process.
 *
 * RATE LIMIT IS CHECKED FIRST and it is checked by text. gh's exit code on a
 * rate limited response has never been measured, here or in research 45, so
 * this is the one rung whose detection is a guess stated out loud. A miss
 * falls through to the last rung, which shows gh's own first line.
 */
export function classifyGhFailure(result: GhRunResult): ActionsHealth {
  if (result.spawnError !== null) {
    return /ENOENT/.test(result.spawnError)
      ? { state: 'missing' }
      : { state: 'offline' };
  }
  if (result.timedOut) return { state: 'offline' };

  const stderr = result.stderr;
  if (/rate limit/i.test(stderr)) return { state: 'rate-limited' };
  if (result.code === 4 || LOGGED_OUT_RE.test(stderr)) {
    return { state: 'logged-out' };
  }
  if (NETWORK_RE.test(stderr)) return { state: 'offline' };
  return { state: 'error', detail: firstStderrLine(stderr) };
}

/** gh's own first non empty line, capped, for the last rung of the ladder. */
export function firstStderrLine(stderr: string): string {
  for (const line of stderr.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    return trimmed.length > STDERR_DETAIL_CAP
      ? trimmed.slice(0, STDERR_DETAIL_CAP)
      : trimmed;
  }
  return 'gh printed nothing.';
}
