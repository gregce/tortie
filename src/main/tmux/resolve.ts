/**
 * resolve.ts — THE single resolution module (growth guardrail 3).
 *
 * Everything that answers "where is this binary / config on THIS machine"
 * lives here, shared by the supervisor, the attach host, the agent
 * availability probe, and (Phase 10) the agent detection service:
 *
 *  1. Login-shell PATH capture. gmux.app is launched by launchd with a
 *     minimal GUI PATH (/usr/bin:/bin:…) — agent CLIs live in ~/.local/bin,
 *     /opt/homebrew/bin, npm-global, etc. We ask the user's real shell once
 *     (`$SHELL -lic 'printf …$PATH…'`, 10 s timeout since Phase 48) and fall
 *     back to a sane default when the shell is slow/broken. The captured PATH
 *     is written into THIS process's environment at boot
 *     (supervisor.ensureServer), and a pane takes its PATH from the tmux
 *     client, which is this process. See `PATH_CAPTURE_TIMEOUT_MS` for the
 *     budget and `ensureServer` for the client rule.
 *
 *  1b. Login-shell env capture BY NAME (Phase 33, captureLoginShellEnv). Same
 *     probe shape as the PATH capture, run once per launch and once per
 *     restore for a row that names variables under `launch.envPassthrough`.
 *     The values go to that one pane and are written nowhere.
 *
 *  2. Binary resolution: argv[0] → absolute path against the captured PATH
 *     plus the known install dirs GUI apps miss. The manifest stores ONLY
 *     absolute paths (argv and resume_argv), so restores survive PATH drift.
 *
 *  3. tmux binary + gmux-tmux.conf resolution (moved from supervisor.ts and
 *     attach-host.ts — one module, two consumers, zero duplication).
 *     Phase 41 put the bundled tmux here too: a packaged Tortie runs the copy
 *     at Contents/Resources/bin/tmux and nothing else, and a development build
 *     keeps the old PATH search with GMUX_TMUX_BIN in front of it. See
 *     `resolveTmux` for the rules and for why the packaged branch refuses the
 *     override.
 *
 * Pure Node except resolveConfPath and the packaged test (both reach electron
 * through a lazy require, which keeps this module unit-testable outside
 * Electron: outside it, nothing is packaged).
 */

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, isAbsolute, join } from 'node:path';
import { killProcessGroup, trackGuardedChild } from '../proc/guarded';
import { gmuxError, type GmuxError } from '../errors';

import { getLog } from '../log';

/**
 * Scope "tmux" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const tmuxLog = getLog('tmux');

// ---------------------------------------------------------------------------
// Login-shell PATH capture
// ---------------------------------------------------------------------------

/**
 * How long the login shell gets to print its PATH before we fall back.
 *
 * 10,000 ms since Phase 48. It was 3,000 ms.
 *
 * WHAT THE MISS COSTS, which is why the number is generous. A miss returns
 * {@link fallbackPath}, which carries no version managed node directory at
 * all, so Tortie can still find an agent whose shim sits in one of
 * {@link extraBinDirs} and can no longer find that shim's interpreter. The
 * pane then opens and dies at once with exit 127. That is the failure this
 * whole phase exists for, and 7 extra seconds of deadline on a machine whose
 * shell never answers is a smaller cost than producing it. VS Code allows its
 * own login shell probe 10,000 ms.
 *
 * WHAT IS NOT TRUE, corrected in the Phase 48 fix round. The commit that
 * raised this number recorded five captures at 2837, 3077, 3089, 3145 and
 * 3511 ms and said four of the five missed the old budget. Two later runs of
 * the same probe, `zsh -lic` printing $PATH between the markers, on the same
 * machine and the same shell, measured 1165, 1069, 1082, 1050 and 1074 ms and
 * 1110, 1090, 1080, 1070 and 1110 ms. That is 0 of 10 over 3,000 ms. The
 * operator's own live boot line also read 1227 ms. Nobody has explained the
 * first set of numbers, so the honest statement is that the raise is cheap
 * insurance against a slow shell and not a fix for a miss anyone can currently
 * reproduce.
 *
 * THE ONE COST, stated so it is not discovered later. A machine whose login
 * shell never prints now waits 10 s instead of 3 s before the first session can
 * be created, because `getUserPath` is awaited on the create path. Nothing else
 * gets slower: a shell that answers settles on the markers, and this number is
 * only the deadline.
 */
export const PATH_CAPTURE_TIMEOUT_MS = 10_000;

/** Cap on buffered probe output (a chatty rc file must not grow unbounded). */
const PATH_PROBE_MAX_OUTPUT = 1024 * 1024;

/**
 * Marker pair around the PATH so rc-file noise (echo/neofetch/etc. printed
 * by interactive shells) can never corrupt the capture.
 *
 * Exported because it doubles as an OWNERSHIP TAG: it appears in the probe's
 * command line, no other program on earth spells it, and proc/orphans.ts uses
 * exactly that to recognise a stranded probe from an older gmux as ours and
 * safe to reap.
 */
export const PATH_MARKER = '__GMUX_PATH__';
const PATH_CAPTURE_RE = /__GMUX_PATH__(.*?)__GMUX_PATH__/s;

/**
 * Install dirs GUI-launched apps typically miss. Used both as the PATH
 * fallback tail and as the extra probe dirs for binary resolution
 * (superset of the agent registry's extraDirs — research 11).
 */
export function extraBinDirs(): string[] {
  const home = homedir();
  return [
    join(home, '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    join(home, 'bin'),
    // `claude install` (native build) symlinks here.
    join(home, '.claude', 'local'),
    // Default npm-global prefix locations.
    join(home, '.npm-global', 'bin'),
    join(home, '.bun', 'bin'),
    // Cursor CLI self-install location (registry pathProbe).
    join(home, '.cursor', 'bin')
  ];
}

/** System baseline every PATH must keep, whatever the capture said. */
const SYSTEM_PATH_DIRS = ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];

/** Join dir lists into a PATH string, deduped, order-preserving. */
export function mergePathDirs(...groups: readonly (readonly string[])[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const dir of group) {
      if (dir.length === 0 || seen.has(dir)) continue;
      seen.add(dir);
      out.push(dir);
    }
  }
  return out.join(delimiter);
}

/**
 * The no-shell-needed fallback PATH: the process's own PATH (whatever
 * launchd gave us) + the known install dirs + the system baseline.
 */
export function fallbackPath(env: NodeJS.ProcessEnv = process.env): string {
  return mergePathDirs(
    (env['PATH'] ?? '').split(delimiter),
    extraBinDirs(),
    SYSTEM_PATH_DIRS
  );
}

export interface CapturePathOptions {
  /** Shell to interrogate; default $SHELL, then /bin/zsh. */
  shell?: string;
  /** Capture timeout; default PATH_CAPTURE_TIMEOUT_MS (10 s). */
  timeoutMs?: number;
  /** Env for the fallback computation (tests). */
  env?: NodeJS.ProcessEnv;
}

/**
 * Ask the user's login shell for its PATH. `-lic` = login + interactive +
 * command, matching what the user's terminal sessions actually see (zsh
 * sources .zprofile AND .zshrc this way; bash and fish accept the same
 * flags). Marker-delimited so rc noise can't break parsing.
 *
 * WHY `-i` STAYS, given `-i` is what makes the shell fork and hang (Phase
 * 13.8 re-examined this, because dropping it would delete the whole failure
 * class). MEASURED on the reporting machine 2026-08-11: `zsh -lc` returns in
 * 24 ms and `zsh -lic` in 957 ms, and the two PATHs contain the IDENTICAL SET
 * of directories — so here `-i` buys nothing but latency. It is kept anyway,
 * because the sets are equal by luck of this user's dotfiles, not by
 * construction: `-l` sources .zshenv/.zprofile/.zlogin, `-i` adds .zshrc, and
 * .zshrc is where nvm/rbenv/pyenv/conda init lines conventionally live. `-lic`
 * is a SUPERSET of `-lc` for every user; dropping `-i` can only lose PATH
 * entries, and a lost entry means "agent CLI not found" — a correctness bug —
 * while a slow probe costs at most `timeoutMs` and falls back cleanly. The
 * price of keeping `-i` is that the probe MUST be reaped on the deadline,
 * which is what killProcessGroup + the guarded-child registry are for.
 *
 * NEVER rejects, and — since Phase 13.5.1 — never HANGS either, which is the
 * same promise the docstring has always made and did not keep. The only path
 * to settlement used to be execFile's callback, which fires on stdio CLOSE,
 * and execFile's `timeout` option SIGTERMs the direct child alone. On a
 * machine whose `zsh -lic` FORKS A COPY OF ITSELF, the fork inherits the
 * stdout write end, so the pipe never closes and the promise never settles:
 * MEASURED 2026-08-11, a `npm run conformance:resume` sat 9 minutes with zero
 * cases started, and `kill -9` on the two zsh descendants released it inside a
 * second. Every resolveBinary() caller — session create, agent detection, the
 * conformance harness — blocks behind this. Three changes, in order of what
 * each buys:
 *
 *  1. SETTLE ON THE MARKERS, not on close. printf runs last, so once both
 *    markers are in the buffer the answer is complete no matter what else the
 *    shell is still holding open. On the affected machine this turns "hang for
 *    the whole budget then use the fallback PATH" into "capture the user's REAL
 *    PATH in ~200 ms" — the leak was costing correctness, not just time. The
 *    budget was 3 s when this was written and is 10 s since Phase 48, which
 *    makes settling on the markers worth more rather than less.
 *  2. AN INDEPENDENT DEADLINE that resolves to the fallback whatever the child
 *     does, so no future stdio surprise can wedge the app again.
 *  3. `spawn(..., { detached: true })` so the probe owns its process group and
 *     can be killed as a GROUP, which is what reaches the fork. It has to be
 *     spawn: `execFile` forwards only a whitelist of options to spawn and
 *     silently DROPS `detached` — verified here, the probe kept gmux's own
 *     pgid, where `kill(-pid)` would have signalled the app itself.
 *
 * (Five orphaned probes from earlier launches were alive on the reporting
 * machine when this was written, the oldest 11 h 38 m.)
 */
export function captureLoginShellPath(
  options: CapturePathOptions = {}
): Promise<string> {
  const env = options.env ?? process.env;
  const shell = options.shell ?? env['SHELL'] ?? '/bin/zsh';
  const timeoutMs = options.timeoutMs ?? PATH_CAPTURE_TIMEOUT_MS;
  // Phase 48. Started before the spawn, so the reported figure is the wall
  // clock of the whole capture and not of the parse.
  const startedAt = Date.now();
  return new Promise<string>((resolve) => {
    let settled = false;
    const finish = (captured: string | null): void => {
      if (settled) return;
      settled = true;
      const capturedDirs =
        captured === null ? [] : captured.split(delimiter).filter(Boolean);
      // Captured dirs first (user's own ordering wins), then the safety net.
      const merged = mergePathDirs(
        capturedDirs,
        (env['PATH'] ?? '').split(delimiter),
        extraBinDirs(),
        SYSTEM_PATH_DIRS
      );
      // PHASE 48. Say what every pane is about to get, and how long it took to
      // find out. The existing `warn` on the deadline says the probe was
      // killed. This says what was used instead, and it is the record that
      // turns "the agent died at once" into a question somebody can answer.
      // `info` is the default file transport level, so it lands in
      // <userData>/logs/app.log on a packaged build. It fires once per app
      // process, because `getUserPath` caches the promise.
      const elapsedMs = Date.now() - startedAt;
      const source = captured === null ? 'fallback' : 'login shell';
      const dirCount = merged.split(delimiter).filter(Boolean).length;
      tmuxLog.info(
        `login-shell PATH capture: ${source}, ${String(elapsedMs)} ms, ` +
          `${String(dirCount)} directories, budget ${String(timeoutMs)} ms. ` +
          `Every pane gets this PATH: ${merged}`,
        { source, elapsedMs, dirCount, budgetMs: timeoutMs, path: merged }
      );
      resolve(merged);
    };
    try {
      const child = spawn(
        shell,
        ['-lic', `printf '${PATH_MARKER}%s${PATH_MARKER}' "$PATH"`],
        { detached: true, stdio: ['ignore', 'pipe', 'pipe'] }
      );

      // Tracked so `before-quit` reaps a probe still in flight: the five
      // orphans on the reporting machine (oldest 19 h 41 m) were each a probe
      // whose deadline timer died with the app that scheduled it.
      const untrack = trackGuardedChild(child);

      let out = '';
      child.stdout?.setEncoding('utf8');
      child.stdout?.on('data', (chunk: string) => {
        out += chunk;
        // Keep the TAIL: printf is the last thing to run, so an rc file that
        // floods the pipe can push noise out but never the answer.
        if (out.length > PATH_PROBE_MAX_OUTPUT) {
          out = out.slice(out.length - PATH_PROBE_MAX_OUTPUT);
        }
        const m = PATH_CAPTURE_RE.exec(out);
        if (m !== null && m[1] !== undefined && m[1].length > 0) finish(m[1]);
      });
      child.stdout?.on('error', () => undefined); // destroy() on the kill path
      child.stderr?.on('data', () => undefined); // drain; rc noise is not ours
      child.stderr?.on('error', () => undefined);

      // The deadline outlives an early settle on purpose: settling is about
      // the caller, reaping is about the machine, and the leak this fixes was
      // a probe nobody was waiting for any more.
      //
      // It is cleared on 'close', NEVER on 'exit'. 'exit' means the shell we
      // spawned is gone; 'close' means its stdout is gone too, which is the
      // only evidence that no fork is still holding the pipe. Cancelling on
      // 'exit' reopened the original bug in miniature: a shell that forks and
      // then exits WITHOUT printing the markers would clear the deadline,
      // never fire 'close', and leave the promise unsettled AND the fork
      // alive — exactly the two symptoms 13.5.1 set out to kill.
      const deadline = setTimeout(() => {
        tmuxLog.warn(
          `login-shell PATH probe still running after ${timeoutMs} ms ` +
            `(${shell}) — killing its process group`
        );
        killProcessGroup(child);
        finish(null);
      }, timeoutMs);
      child.once('close', () => {
        clearTimeout(deadline);
        untrack();
        finish(null);
      });

      // A spawn failure (missing shell) arrives as an event, not a throw.
      child.once('error', (err) => {
        clearTimeout(deadline);
        untrack();
        tmuxLog.warn(
          `login-shell PATH capture failed (${shell}): ${err.message} — using fallback`
        );
        finish(null);
      });
    } catch (err) {
      tmuxLog.warn(
        `login-shell PATH capture threw (${shell}): ${(err as Error).message} — using fallback`
      );
      finish(null);
    }
  });
}

// ---------------------------------------------------------------------------
// Login-shell env capture, by name (Phase 33)
// ---------------------------------------------------------------------------

/**
 * The longest resolved value Tortie will hand to a pane.
 *
 * A resolved value rides a tmux command line, so it cannot be unbounded. It is
 * refused WHOLE rather than truncated: a truncated credential is a credential
 * that fails somewhere far away with a message about the provider, and the
 * user would have no way to connect that to a length. A name over the cap is
 * reported as unresolved, which is a sentence they can act on.
 */
export const ENV_CAPTURE_MAX_VALUE_BYTES = 4096;

/** Environment variable names the probe will interpolate into its script. */
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** What one login-shell environment capture answered. */
export interface CaptureEnvResult {
  /** Name to value, only for names that resolved non empty and under the cap. */
  values: Record<string, string>;
  /** Names that were unset, empty, or over the 4096 byte cap. Sorted. */
  missing: string[];
  /** True when the shell failed to spawn, timed out, or printed no markers. */
  probeFailed: boolean;
}

/**
 * Read named variables out of the user's login shell (Phase 33).
 *
 * WHY THIS EXISTS. A fresh agent pane runs its argv directly, with no shell in
 * between, so no startup file ever runs in it. A provider key exported in
 * ~/.zshrc reaches the user's own terminal and reaches nothing Tortie starts.
 * An agent row may name variables under `launch.envPassthrough`, and this is
 * how their values are found, once per launch and once per restore. The values
 * are handed to that one pane and are written nowhere.
 *
 * IT IS THE SAME PROBE SHAPE AS {@link captureLoginShellPath}, deliberately and
 * line for line, because that shape is what Phase 13.5.1 paid for. `spawn` with
 * `detached: true` so the probe owns its process group, settle on the markers
 * rather than on stdio close, an independent deadline that resolves whatever
 * the child does, a group kill on that deadline, and the deadline cleared on
 * `close` and never on `exit`. Read the long note on that function for what
 * each of those five buys. A shell that forks a copy of itself is the case
 * they exist for, and it is a real machine rather than a hypothetical one.
 *
 * TWO THINGS ARE DIFFERENT, and both are about the values.
 *
 * The marker carries a fresh 8 byte nonce per probe. The PATH capture can use
 * a fixed marker because it also doubles as an ownership tag for the orphan
 * reaper. Here the framing has to survive rc output that an agent could have
 * written, and a static marker would let that output forge a record.
 *
 * An unset name, an empty name and a name whose value is over
 * {@link ENV_CAPTURE_MAX_VALUE_BYTES} are all reported as MISSING rather than
 * injected. Never an empty string: a pane holding `FIREWORKS_API_KEY=` fails
 * later with a message about the provider, and nothing would ever say that the
 * shell had no value for it.
 *
 * NEVER REJECTS, and never hangs. It resolves for every input, including an
 * empty name list, which spawns nothing at all.
 */
export function captureLoginShellEnv(
  names: readonly string[],
  options: CapturePathOptions = {}
): Promise<CaptureEnvResult> {
  // A name the caller should never have passed. The loader already refuses
  // one, and this is the second answer: it is dropped rather than
  // interpolated, because the name goes into a shell script below.
  const usable = [...new Set(names)].filter((n) => ENV_NAME_RE.test(n));
  const unusable = [...new Set(names)].filter((n) => !ENV_NAME_RE.test(n));
  if (usable.length === 0) {
    return Promise.resolve({
      values: {},
      missing: unusable.sort(),
      probeFailed: false
    });
  }

  const env = options.env ?? process.env;
  const shell = options.shell ?? env['SHELL'] ?? '/bin/zsh';
  const timeoutMs = options.timeoutMs ?? PATH_CAPTURE_TIMEOUT_MS;
  const marker = `__GMUX_ENVP_${randomBytes(4).toString('hex')}__`;
  const recordRe = new RegExp(`${marker}([A-Za-z_][A-Za-z0-9_]*)=(.*?)${marker}`, 'gs');
  // Every record at the value cap, plus room for rc noise ahead of them.
  const maxOutput =
    usable.length * (marker.length * 2 + 64 + 1 + ENV_CAPTURE_MAX_VALUE_BYTES) +
    64 * 1024;

  return new Promise<CaptureEnvResult>((resolve) => {
    const found = new Map<string, string>();
    let settled = false;

    const finish = (probeFailed: boolean): void => {
      if (settled) return;
      settled = true;
      const values: Record<string, string> = {};
      const missing: string[] = [...unusable];
      for (const name of usable) {
        const value = found.get(name);
        if (
          value === undefined ||
          value.length === 0 ||
          Buffer.byteLength(value, 'utf8') > ENV_CAPTURE_MAX_VALUE_BYTES
        ) {
          missing.push(name);
          continue;
        }
        values[name] = value;
      }
      resolve({ values, missing: missing.sort(), probeFailed });
    };

    try {
      const script = usable
        .map((name) => `printf '${marker}${name}=%s${marker}' "$${name}"`)
        .join('; ');
      const child = spawn(shell, ['-lic', script], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      const untrack = trackGuardedChild(child);

      let out = '';
      child.stdout?.setEncoding('utf8');
      child.stdout?.on('data', (chunk: string) => {
        out += chunk;
        // Keep the TAIL. The printfs run last, so rc noise can push itself out
        // of the buffer but never the answer.
        if (out.length > maxOutput) out = out.slice(out.length - maxOutput);
        recordRe.lastIndex = 0;
        found.clear();
        for (const m of out.matchAll(recordRe)) {
          if (m[1] !== undefined) found.set(m[1], m[2] ?? '');
        }
        if (usable.every((name) => found.has(name))) finish(false);
      });
      child.stdout?.on('error', () => undefined);
      child.stderr?.on('data', () => undefined);
      child.stderr?.on('error', () => undefined);

      const deadline = setTimeout(() => {
        tmuxLog.warn(
          `login-shell env probe still running after ${timeoutMs} ms ` +
            `(${shell}). Killing its process group.`
        );
        killProcessGroup(child);
        finish(true);
      }, timeoutMs);
      child.once('close', () => {
        clearTimeout(deadline);
        untrack();
        // No record at all means the shell printed nothing this function can
        // read, which is a failed probe rather than a set of unset variables.
        finish(found.size === 0);
      });
      child.once('error', (err) => {
        clearTimeout(deadline);
        untrack();
        tmuxLog.warn(
          `login-shell env capture failed (${shell}): ${err.message}. ` +
            `The pane starts without those variables.`
        );
        finish(true);
      });
    } catch (err) {
      tmuxLog.warn(
        `login-shell env capture threw (${shell}): ` +
          `${(err as Error).message}. The pane starts without those variables.`
      );
      finish(true);
    }
  });
}

let userPathPromise: Promise<string> | null = null;
let userPathGeneration = 0;

/**
 * The user's real PATH, captured once per boot (cached promise — concurrent
 * callers share the one capture). Always resolves.
 */
export function getUserPath(): Promise<string> {
  if (userPathPromise === null) {
    userPathGeneration += 1;
    userPathPromise = captureLoginShellPath();
  }
  return userPathPromise;
}

/**
 * How many times the login-shell PATH has been captured in this process.
 *
 * It starts at 0, is 1 after the first `getUserPath()`, and moves again only
 * after `resetUserPathCache()`. Anything that caches an answer computed
 * AGAINST the user PATH keys on this number, so the answer is dropped when
 * the PATH it was computed from is replaced. See src/main/agents/health.ts.
 */
export function userPathEpoch(): number {
  return userPathGeneration;
}

/** Test hook. Leaves the epoch alone, so the next capture moves it. */
export function resetUserPathCache(): void {
  userPathPromise = null;
}

// ---------------------------------------------------------------------------
// Binary resolution (argv[0] → absolute path)
// ---------------------------------------------------------------------------

function isExecutableFile(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a binary name to an absolute executable path against an explicit
 * PATH string, then `extraDirs`. Absolute/relative inputs (anything with a
 * separator) are validated as-is, tilde-expanded first. Returns null when
 * nothing executable was found — callers surface a friendly typed error.
 */
export function resolveBinaryAgainst(
  bin: string,
  pathValue: string,
  extraDirs: readonly string[] = extraBinDirs()
): string | null {
  if (bin.length === 0) return null;
  const expanded = bin.startsWith('~/') ? join(homedir(), bin.slice(2)) : bin;
  if (expanded.includes('/')) {
    return isAbsolute(expanded) && isExecutableFile(expanded) ? expanded : null;
  }
  for (const dir of [...pathValue.split(delimiter), ...extraDirs]) {
    if (dir.length === 0) continue;
    const candidate = join(dir, expanded);
    if (isExecutableFile(candidate)) return candidate;
  }
  return null;
}

/**
 * Every executable hit for `bin` across the same walk, in walk order,
 * deduped by path string. The first element equals resolveBinaryAgainst's
 * answer whenever one exists. Same cost class: the walk is identical
 * (Phase 49, research 47 §5 — the shadowed-copies list in Settings).
 *
 * A path-shaped input returns a zero-or-one element list, exactly as the
 * sibling validates it: tilde-expanded, absolute, executable, or nothing.
 */
export function resolveBinaryAllAgainst(
  bin: string,
  pathValue: string,
  extraDirs: readonly string[] = extraBinDirs()
): string[] {
  if (bin.length === 0) return [];
  const expanded = bin.startsWith('~/') ? join(homedir(), bin.slice(2)) : bin;
  if (expanded.includes('/')) {
    return isAbsolute(expanded) && isExecutableFile(expanded) ? [expanded] : [];
  }
  const seen = new Set<string>();
  const hits: string[] = [];
  for (const dir of [...pathValue.split(delimiter), ...extraDirs]) {
    if (dir.length === 0) continue;
    const candidate = join(dir, expanded);
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (isExecutableFile(candidate)) hits.push(candidate);
  }
  return hits;
}

/**
 * Resolve a binary against the captured login-shell PATH + install dirs.
 * The one call sites use at session-create time (and Phase 10 detection).
 *
 * PHASE 23 FIX ROUND. `probeFirst` is an agent's own `extraProbeDirs`, and
 * passing it here is what makes detection and launch answer the same question.
 * Before this they did not: detection resolved against
 * `[...entry.extraProbeDirs, ...extraBinDirs()]` and reported the agent
 * installed, then session create called this function with no knowledge of the
 * row, failed to find the same file, and threw AGENT_NOT_FOUND. A configured
 * agent installed anywhere but the login-shell PATH showed as ready and then
 * refused to start.
 *
 * The order matters and it matches detection exactly. The dirs the entry names
 * are searched after PATH and before the install dirs Tortie knows, so the
 * FILE detection found is the file that runs.
 */
export async function resolveBinary(
  bin: string,
  probeFirst: readonly string[] = []
): Promise<string | null> {
  const extras =
    probeFirst.length === 0 ? extraBinDirs() : [...probeFirst, ...extraBinDirs()];
  return resolveBinaryAgainst(bin, await getUserPath(), extras);
}

// ---------------------------------------------------------------------------
// tmux binary + conf resolution (single source for supervisor + attach host)
// ---------------------------------------------------------------------------

/**
 * Lazy electron accessor, the same shape `src/main/config/guide.ts` uses.
 * Returns null outside Electron so this module stays loadable, and testable,
 * in plain node. Outside Electron nothing is packaged.
 */
function electronApp(): { isPackaged: boolean } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron');
    if (typeof app?.isPackaged !== 'boolean') return null;
    return { isPackaged: app.isPackaged };
  } catch {
    return null;
  }
}

/** True when this process is a packaged Tortie. */
export function isPackagedApp(): boolean {
  return electronApp()?.isPackaged === true;
}

/** Where the tmux binary this process runs came from. */
export type TmuxBinarySource = 'bundled' | 'dev-override' | 'dev-path';

/** The full answer to "which tmux does this process run, and why that one". */
export interface TmuxResolution {
  /** Absolute path, or null when nothing usable was found. */
  path: string | null;
  source: TmuxBinarySource;
  /** True when app.isPackaged. Decides the copy and the override rule. */
  packaged: boolean;
  /** Where we looked, for the error detail and the log. Never user copy. */
  detail: string;
}

/** Said once per process, so a repeated resolve does not repeat a warning. */
let saidPackagedOverrideIgnored = false;
let saidOverrideUnusable = false;
let saidOverrideUsed = false;

/**
 * Locate tmux (Phase 41).
 *
 * THE PACKAGED RULE IS THE WHOLE POINT OF THIS PHASE. A packaged Tortie runs
 * the tmux inside its own bundle and nothing else. PATH is not consulted, no
 * Homebrew location is probed, and `GMUX_TMUX_BIN` is refused. A fresh Mac
 * needs nothing installed first, and the binary holding a user's sessions is
 * the one Apple's notary service saw. A missing file there is a broken install
 * rather than a missing prerequisite, and it is reported as one.
 *
 * A DEVELOPMENT BUILD keeps what it always did, which is the three known
 * install locations and then PATH, because `npm run dev` and every harness run
 * against the machine's own tmux. `GMUX_TMUX_BIN` is the override in front of
 * that, and it is what lets the interop probes run a real client of a chosen
 * version against a server of another. A value that names something that is not
 * an executable file is ignored with one warning rather than being fatal: a
 * stale line in a shell profile must not make a development build unusable.
 */
export function resolveTmux(env: NodeJS.ProcessEnv = process.env): TmuxResolution {
  return planTmuxResolution({
    packaged: isPackagedApp(),
    env,
    resourcesPath: process.resourcesPath
  });
}

/** What the resolution depends on, all of it passed in so it can be tested. */
export interface TmuxResolutionInput {
  /** `app.isPackaged`, asked once by the caller. */
  packaged: boolean;
  /** The environment to read `GMUX_TMUX_BIN` and `PATH` from. */
  env: NodeJS.ProcessEnv;
  /** `process.resourcesPath`, which only exists inside Electron. */
  resourcesPath: string;
}

/**
 * The decision itself, with nothing hidden behind a global.
 *
 * It is separate from {@link resolveTmux} for one reason: `app.isPackaged` and
 * `process.resourcesPath` cannot both be set from a plain node test, and the
 * packaged branch is the one this phase exists for. A rule that cannot be
 * tested is a rule that drifts.
 */
export function planTmuxResolution(input: TmuxResolutionInput): TmuxResolution {
  const { packaged, env } = input;
  const override = (env['GMUX_TMUX_BIN'] ?? '').trim();

  if (packaged) {
    if (override !== '' && !saidPackagedOverrideIgnored) {
      saidPackagedOverrideIgnored = true;
      tmuxLog.warn(
        'GMUX_TMUX_BIN is ignored in a packaged Tortie. The application ' +
          'always uses the copy of tmux inside its own bundle.'
      );
    }
    const bundled = join(input.resourcesPath, 'bin', 'tmux');
    const usable = isExecutableFile(bundled);
    return {
      path: usable ? bundled : null,
      source: 'bundled',
      packaged: true,
      detail: usable
        ? bundled
        : `the bundled tmux is not at ${bundled}, or it is not executable`
    };
  }

  if (override !== '') {
    if (isExecutableFile(override)) {
      if (!saidOverrideUsed) {
        saidOverrideUsed = true;
        tmuxLog.info(`GMUX_TMUX_BIN names the tmux this run uses: ${override}`);
      }
      return {
        path: override,
        source: 'dev-override',
        packaged: false,
        detail: `GMUX_TMUX_BIN=${override}`
      };
    }
    if (!saidOverrideUnusable) {
      saidOverrideUnusable = true;
      tmuxLog.warn(
        `GMUX_TMUX_BIN does not name an executable file, so it is ignored. ` +
          `The value was ${override}.`
      );
    }
  }

  // GUI-launched Electron apps inherit a minimal PATH (no /opt/homebrew/bin),
  // so probe the known locations first, then scan PATH.
  const known = [
    '/opt/homebrew/bin/tmux',
    '/usr/local/bin/tmux',
    '/usr/bin/tmux'
  ];
  for (const candidate of known) {
    if (existsSync(candidate)) {
      return {
        path: candidate,
        source: 'dev-path',
        packaged: false,
        detail: candidate
      };
    }
  }
  const onPath = resolveBinaryAgainst('tmux', env['PATH'] ?? '', []);
  return {
    path: onPath,
    source: 'dev-path',
    packaged: false,
    detail:
      onPath ??
      'probed /opt/homebrew/bin, /usr/local/bin, /usr/bin and PATH'
  };
}

/** Test hook, so one process can exercise more than one resolution path. */
export function resetTmuxResolutionWarnings(): void {
  saidPackagedOverrideIgnored = false;
  saidOverrideUnusable = false;
  saidOverrideUsed = false;
}

/**
 * The path only. Kept because the supervisor, the attach host and the
 * harnesses have always asked this question in this shape.
 */
export function findTmuxBinary(): string | null {
  return resolveTmux().path;
}

/**
 * The ONE composer for "there is no tmux to run" (Phase 41).
 *
 * The supervisor and the attach host each wrote their own sentence before this
 * existed, and the two had already drifted apart. They are also two different
 * situations now, and the difference matters to the reader. A packaged Tortie
 * that cannot find its own tmux has a broken install and there is nothing for
 * the user to install. A development build that cannot find one on the machine
 * is missing a prerequisite, and the sentence says so and says that a packaged
 * Tortie would not need it.
 */
export function tmuxUnavailableError(res: TmuxResolution): GmuxError {
  if (res.packaged) {
    return gmuxError(
      'TMUX_BUNDLE_INCOMPLETE',
      'Tortie is missing the program that keeps your sessions alive. It ' +
        'ships inside the application, and it is not there. Reinstalling ' +
        'Tortie will restore it.',
      res.detail
    );
  }
  return gmuxError(
    'TMUX_NOT_FOUND',
    'This is a development build, so Tortie uses the tmux on your PATH, and ' +
      'there is none. Install tmux with "brew install tmux". A packaged ' +
      'Tortie carries its own copy and needs nothing installed.',
    res.detail
  );
}

/** Resolve resources/gmux-tmux.conf for dev vs packaged builds. */
export function resolveConfPath(): string {
  // Lazy import: keeps this module loadable in plain-node unit tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require('electron') as typeof import('electron');
  // Packaged: electron-builder copies resources/gmux-tmux.conf → Resources/.
  // Dev / `electron .`: repo-root resources/.
  return app.isPackaged
    ? join(process.resourcesPath, 'gmux-tmux.conf')
    : join(app.getAppPath(), 'resources', 'gmux-tmux.conf');
}

/**
 * Refuse to pass a conf path that will not do what the caller believes.
 *
 * MOVED HERE IN PHASE 69, from ./supervisor.ts, and nothing about it changed.
 * It sits beside `resolveConfPath` because it is the check on that path, and it
 * had to leave the supervisor so `../machines/context.ts` could call it without
 * the two files importing each other. `./supervisor.ts` re-exports it, so every
 * existing caller and every existing test keeps its import.
 *
 * `existsSync` alone is not the check. A botched update can leave a zero-byte
 * file, and a zero-byte conf produces exactly the same silent tmux defaults as
 * a missing one while passing an existence test. A directory at that path
 * passes it too.
 *
 * READABILITY IS PART OF THE CHECK, and it was missing until the Phase 19 fix
 * round. Measured: a conf at mode 000 and 3,886 bytes passed a stat plus size
 * test, `tmux start-server -f <it>` exited 0, the server came up on the built
 * in defaults, `exit-empty on` then ended it the moment it was empty, and the
 * app failed with TMUX_UNREACHABLE. The user was told the server would not
 * start, which is the wrong diagnosis for the exact fault this function exists
 * to name. One `accessSync` gives the right one.
 *
 * @throws GmuxError TMUX_NOT_FOUND
 */
export function assertConfUsable(confPath: string): void {
  // Reaches a toast verbatim through errorText() (renderer store), so the
  // message is product copy: it names Tortie, not the protected filename. The
  // path and the reason travel in `detail`, where a bug report finds them.
  const refuse = (detail: string): never => {
    throw gmuxError(
      'TMUX_NOT_FOUND',
      "Tortie's tmux configuration is missing from the application bundle. " +
        'Reinstalling Tortie will restore it.',
      detail
    );
  };
  let info: ReturnType<typeof statSync>;
  try {
    info = statSync(confPath);
  } catch {
    return refuse(`expected at ${confPath}`);
  }
  if (!info.isFile()) return refuse(`${confPath} is not a file`);
  if (info.size === 0) return refuse(`${confPath} is empty (0 bytes)`);
  try {
    accessSync(confPath, constants.R_OK);
  } catch {
    return refuse(`${confPath} exists but cannot be read (permissions)`);
  }
}

// ---------------------------------------------------------------------------
// Which server this process talks to
// ---------------------------------------------------------------------------
//
// MOVED HERE IN PHASE 69, from ./supervisor.ts, with no change to either the
// name or the value. The rename guardrail in
// src/renderer/__tests__/user-visible-name.test.ts follows the declaration to
// this file and still asserts the literal, because renaming it is what would
// strand every running session.
//
// It moved for one reason. `../machines/context.ts` builds the invocation for a
// machine as well as for this Mac, and the remote socket name must come from
// `activeTmuxSocket` and from nowhere else: a remote `set-option -g` sent to
// socket `gmux` would rewrite the options on the operator's own server whenever
// the far side happens to be this Mac, which is exactly what a loopback probe's
// far side is. Having context.ts import the supervisor would make the two files
// import each other, so the socket rules came down to this module, which both
// of them already import.

/**
 * Private socket name. NEVER touch the user's default tmux server.
 *
 * **It stays `gmux` forever — the Tortie rename did not touch it, and nothing
 * later may** (Phase 16.5 hazard 2, CLAUDE.md). This string is not a name, it
 * is an ADDRESS: every session the user has running is on `/tmp/tmux-<uid>/gmux`
 * right now. Change it and the app starts a second, empty server, reports no
 * sessions, and leaves hours of agent work alive but unreachable on a socket
 * nothing connects to any more. There is no upside to weigh against that —
 * the socket name is never shown in the UI.
 */
export const TMUX_SOCKET = 'gmux';

/**
 * The socket this process will actually use.
 *
 * It is `TMUX_SOCKET` for every launch a user ever makes. `GMUX_TMUX_SOCKET`
 * moves it, and ONLY on a harness launch, because the fault harness has to be
 * able to crash the app mid-write without a single one of the user's live
 * sessions being on the server it is crashing against.
 *
 * The harness gate is the safety property. A `GMUX_TMUX_SOCKET` left in a shell
 * profile would otherwise start the real app against a second, empty server:
 * no sessions listed, hours of agent work alive and unreachable. A normal
 * launch ignores the variable entirely, so that cannot happen.
 *
 * A HARNESS LAUNCH IS `GMUX_SMOKE`, `GMUX_SHOT` OR `GMUX_UPDATE_REHEARSAL`
 * (Phase 24). The first two terms match the definition `src/main/index.ts`
 * uses for the single-instance lock, and those two must keep matching. The
 * definitions disagreed until Phase 22: this function honoured only
 * `GMUX_SMOKE`, so a shot-harness run that created a session put it on the
 * socket carrying the user's live work while printing that the override had
 * been ignored. A Phase 22 verifier hit exactly that and had to remove a
 * session from the real server by hand. `src/renderer/context/shot-probe.ts`
 * ships a shot driver for this view, so the smoke and shot terms have to
 * agree from here on.
 *
 * `GMUX_UPDATE_REHEARSAL` is the deliberate exception, present HERE and
 * absent from the single-instance definition in index.ts. A rehearsal launch
 * must still take the lock. The lock lives in the isolated profile the
 * rehearsal always passes, so it protects the rehearsal without touching the
 * operator's instance. A rehearsal launched WITHOUT `--user-data-dir` is
 * refused by the operator's own running copy, and that refusal is the
 * protective direction.
 *
 * `default` is refused by name. That is the socket of the user's OWN tmux
 * server, which this app never touches.
 */
export function activeTmuxSocket(
  env: NodeJS.ProcessEnv = process.env
): string {
  const want = (env['GMUX_TMUX_SOCKET'] ?? '').trim();
  if (want === '') return TMUX_SOCKET;
  const harnessLaunch =
    (env['GMUX_SMOKE'] ?? '') !== '' ||
    (env['GMUX_SHOT'] ?? '') !== '' ||
    (env['GMUX_UPDATE_REHEARSAL'] ?? '') !== '';
  if (!harnessLaunch) {
    tmuxLog.warn(
      'GMUX_TMUX_SOCKET is set but this is not a harness launch, so it is ignored.'
    );
    return TMUX_SOCKET;
  }
  if (want === 'default' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(want)) {
    tmuxLog.warn(
      `GMUX_TMUX_SOCKET="${want}" is not a socket name this app will use.`
    );
    return TMUX_SOCKET;
  }
  return want;
}

/**
 * tmux verbs that end the whole server and every session on it at once.
 *
 * `kill-server` is the only one today. It is listed as a set rather than a
 * string compare so a later verb of the same weight is added in one place.
 */
const SERVER_DESTROYING_VERBS = new Set(['kill-server']);

/**
 * Refuse a verb that would end the real server (Phase 19 fix round).
 *
 * THE INCIDENT THIS CLOSES. `src/main/power/smoke.ts` called `kill-server` from
 * its own failure path and checked the socket name AFTERWARDS, on the line that
 * unlinks the socket file. So a harness that had already printed "refusing to
 * run" went on to kill the server it was refusing to touch. Reproduced on a
 * scratch socket by two verifiers, and the operator lost 48 live sessions the
 * same evening.
 *
 * The check belongs on the door rather than in the caller. Every tmux command in
 * the product goes through one door, and it already resolves the socket, so this
 * is the only place that can answer the question for every caller including the
 * ones written after today. Phase 69 gave the door two kinds of target, and the
 * check is asked the same way for both: a `kill-server` aimed at socket `gmux`
 * is refused whichever machine it is aimed at.
 *
 * The shipped app never needs this verb. Sessions are killed one at a time, by
 * identity. A harness that genuinely wants a whole server gone is on its own
 * socket, and there the check passes.
 */
export function assertVerbAllowedOnSocket(verb: string, socket: string): void {
  if (!SERVER_DESTROYING_VERBS.has(verb) || socket !== TMUX_SOCKET) return;
  throw gmuxError(
    'INVALID_INPUT',
    'Tortie does not end the session server.',
    `refused "tmux ${verb}" on the real socket -L ${socket}: it would end every ` +
      'session on this machine. Move the harness to its own socket with ' +
      'GMUX_TMUX_SOCKET.'
  );
}
