/**
 * Private tmux server supervisor.
 *
 * gmux's durability layer is a PRIVATE tmux server on socket `-L gmux`,
 * configured ONLY by resources/gmux-tmux.conf — never the user's own tmux
 * server or ~/.tmux.conf (FINAL-REPORT §2.3). This module:
 *
 *   - resolves binary + conf via ./resolve (the ONE resolution module)
 *   - STARTS the user's real login-shell PATH capture at boot and no longer
 *     waits for it (Phase 81). The value is installed in this process by
 *     ./user-path.ts, which is what gives every pane its PATH, and the paths
 *     that can start a pane await that install themselves. What used to wait
 *     here, and had no use for the answer, was the session list (Phase 9.2
 *     Bug A is unchanged; only who waits for it moved)
 *   - guarantees a UTF-8 locale in the server environment (Phase 9.2 Bug C:
 *     launchd launches carry no LANG, tmux then draws every non-ASCII cell
 *     as `_` and pane apps degrade to ASCII — see ./env.ts)
 *   - starts the server idempotently (`start-server`) and health-checks it
 *   - refuses a conf path that will not do what the caller believes, and then
 *     READS BACK the depth tmux actually set instead of trusting that `-f`
 *     applied (Phase 19 item 13 — see the block above `TmuxContext`)
 *   - provides `execTmux()`, the one door every other tmux module calls
 *     through, with structured error classification
 *
 * WHICH TMUX RUNS (Phase 41). A packaged Tortie runs the pinned tmux inside
 * its own bundle, so a fresh Mac needs nothing installed first. A development
 * build runs the machine's own tmux, which is 3.6a here. ./resolve decides,
 * and it is the only module that does. On a WARM server this module reads the
 * server's version before the first attach and stops the boot when the pair of
 * versions is one this release never tested. See ./version for the
 * measurements behind that.
 */

import { readFileSync } from 'node:fs';
import { DEFAULT_UTF8_LANG, hasUtf8Locale } from './env';
import { gmuxError } from '../errors';
import { postDurabilityNotice } from '../notice';
import {
  activeTmuxSocket,
  assertConfUsable,
  assertVerbAllowedOnSocket,
  getUserPath,
  isPackagedApp,
  resolveTmux
} from './resolve';
import { installUserPath } from './user-path';
import { assertServerVersionUsable, logCreatedServerVersion } from './version';
// PHASE 69. The one door moved to ../machines/exec-plane.ts, where it takes a
// machine as well as a command, and `execTmux` below is the local key's name for
// it. The 59 callers of `execTmux` are unchanged, and so is what they get.
import { execOn, type ExecTmuxOptions } from '../machines/exec-plane';
import {
  localMachineContext,
  resetMachineContexts,
  tmuxCommand,
  type LocalMachineContext
} from '../machines/context';

import { getLog } from '../log';

/**
 * Scope "tmux" (Phase 35). Every error and warning from this
 * directory is one record in `<userData>/logs/app.log`. The console
 * line is unchanged for dev terminals; what is new is that a packaged
 * build keeps it.
 */
const tmuxLog = getLog('tmux');

// Re-exported so the barrel (index.ts) and existing callers keep one import
// surface; the implementations live in ./resolve (growth guardrail 3).
//
// PHASE 69 moved three more of them down there: `TMUX_SOCKET`,
// `activeTmuxSocket` and `assertConfUsable`. Neither the names nor the values
// changed. They had to leave this file so `../machines/context.ts` could call
// them without the two files importing each other, and ./resolve is the module
// both of them already import. The reasons for each are in ./resolve beside the
// declaration.
export {
  activeTmuxSocket,
  assertConfUsable,
  findTmuxBinary,
  resolveConfPath,
  TMUX_SOCKET
} from './resolve';

// ---------------------------------------------------------------------------
// The conf inside the bundle, and proving it applied (Phase 19 item 13)
// ---------------------------------------------------------------------------
//
// `tmuxArgs` puts `-f <confPath>` on every invocation, and that path is inside
// the application bundle an update replaces. tmux reads the file ONLY when it
// creates the server, and it reports nothing at all when the file is not
// there. MEASURED on tmux 3.6a, on a scratch socket, 2026-08-12:
//
//   $ tmux -L scratch -f /nonexistent/x.conf new-session -d -s probe
//   exit 0, and the session is created
//   $ tmux -L scratch show-options -gv history-limit  →  2000
//                                    -gv exit-empty   →  on
//                                    -gv status       →  on
//                                    -gv remain-on-exit → off
//
// So the loss is not one option, it is four, and the two that are not
// cosmetic are the dangerous ones. `history-limit 2000` throws away 92 % of
// the scrollback depth the product promises. `exit-empty on` makes the whole
// private server exit when the last session closes, which is the durability
// daemon quietly turning itself off.
//
// Passing the real conf afterwards does not repair it. In the same run,
// `tmux -L scratch -f <the real conf> show-options -gv history-limit` still
// answered 2000, because the file is read at server creation and never again.
//
// Two defences, and the second is the one a reviewer would skip. Assert the
// file is usable BEFORE the path is ever passed, and then READ BACK what tmux
// actually set instead of trusting that `-f` applied.

/** tmux's own built-in depth, which is what a server without our conf runs at. */
export const TMUX_BUILTIN_HISTORY_LIMIT = 2000;

/**
 * `set -g history-limit N` as the conf declares it.
 *
 * Parsed from the file rather than hardcoded, because the number in
 * resources/gmux-tmux.conf is the first-boot default and it has already moved
 * once (50,000 to 25,000, Phase 13.7). A constant here would go stale silently
 * and the read-back would then police the wrong number.
 */
export function declaredHistoryLimit(confPath: string): number | null {
  let text: string;
  try {
    text = readFileSync(confPath, 'utf8');
  } catch {
    return null;
  }
  // `set`, `set-option` and `setw` all reach the same option; the flags in
  // between (-g, -s, -gq) vary and none of them changes the value we want.
  const m = /^[ \t]*set(?:-option|w)?[ \t]+(?:-[A-Za-z]+[ \t]+)*history-limit[ \t]+(\d+)/m.exec(
    text
  );
  if (m?.[1] === undefined) return null;
  const value = Number.parseInt(m[1], 10);
  return Number.isFinite(value) ? value : null;
}

/** What the read-back found. */
export interface ConfVerification {
  /** `set -g history-limit N` in the conf, or null when it could not be read. */
  declared: number | null;
  /** What `show-options -gv history-limit` answered, or null when it failed. */
  observed: number | null;
  /** True when the server is running the depth the conf declares. */
  applied: boolean;
  /** True when this call put the declared value back on a server missing it. */
  repaired: boolean;
  /** One line for a log or a bug report. */
  detail: string;
}

let lastVerification: ConfVerification | null = null;

/** The most recent read-back, for a harness or a bug report. Null before boot. */
export function lastConfVerification(): ConfVerification | null {
  return lastVerification;
}

/** One global server option, as a number. Null when tmux would not answer. */
async function readServerOptionNumber(name: string): Promise<number | null> {
  try {
    const out = await execTmux(['show-options', '-gv', name]);
    const value = Number.parseInt(out.trim(), 10);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** The two tmux calls the read-back makes, injected so it can be tested. */
export interface ConfVerifyDeps {
  readLimit: () => Promise<number | null>;
  setLimit: (lines: number) => Promise<void>;
}

/**
 * Read back the depth tmux actually set, and repair the one case that is
 * provably a lost conf.
 *
 * The repair is deliberately narrow. It fires only when the server was created
 * by THIS call and the depth it came up with is tmux's own built-in 2000 while
 * the conf declares something else. Any other mismatch is a warm server whose
 * depth almost certainly came from the user's own Settings value, and
 * overwriting that would be this function inventing a preference. A warm
 * mismatch is logged and left alone.
 *
 * Note the ordering with the settings value. `GmuxCore` re-asserts
 * `history-limit` from Settings at every boot (BOOT_SERVER_OPTIONS,
 * sessions/core.ts), and it runs after this. So on a cold start this puts the
 * conf's number on a server that lost it, and the user's own number lands a
 * moment later and wins, which is the right order.
 *
 * HOW REACHABLE THE REPAIR IS, stated because a verifier asked and could not
 * make it fire in a whole-app run. It is defence in depth against one narrow
 * race, and that is on purpose.
 *
 *  - A conf that is missing, empty, a directory or unreadable is refused by
 *    `assertConfUsable` before the path is ever passed, so no server is
 *    created and this function is not the thing that reports it.
 *  - A WARM server is excluded by design, because there the observed depth is
 *    the user's own Settings value.
 *  - What is left is the case the whole block is written for: macOS replaces
 *    the .app directory underneath a running process, so the conf can vanish
 *    in the milliseconds between `assertConfUsable` and `start-server`. That
 *    window is real and it is small.
 *
 * The repair is exercised through the injected `ConfVerifyDeps`, which is the
 * seam this function was given for exactly that reason. The one option that IS
 * repaired on every boot, warm or cold, is `exit-empty`, and that one is
 * driven in a real app run. See BOOT_SERVER_OPTIONS in sessions/core.ts.
 */
export async function verifyHistoryLimitWith(
  confPath: string,
  serverWasAlreadyRunning: boolean,
  deps: ConfVerifyDeps
): Promise<ConfVerification> {
  const declared = declaredHistoryLimit(confPath);
  let observed = await deps.readLimit();
  let repaired = false;

  const coldStartLostItsConf =
    !serverWasAlreadyRunning &&
    declared !== null &&
    declared !== TMUX_BUILTIN_HISTORY_LIMIT &&
    observed === TMUX_BUILTIN_HISTORY_LIMIT;

  if (coldStartLostItsConf) {
    tmuxLog.error(
      `the tmux server started WITHOUT ${confPath}: it came up at ` +
        `history-limit ${TMUX_BUILTIN_HISTORY_LIMIT} instead of ${declared}. ` +
        'Setting the declared depth on it now.'
    );
    try {
      await deps.setLimit(declared);
    } catch (err) {
      tmuxLog.warn(
        `could not repair history-limit: ${(err as Error).message}`
      );
    }
    observed = await deps.readLimit();
    repaired = observed === declared;
  }

  const applied = declared !== null && observed === declared;
  const detail =
    observed === null
      ? 'tmux would not report history-limit'
      : `history-limit declared ${declared ?? 'unknown'}, server reports ${observed}` +
        (repaired ? ' (repaired on this boot)' : '') +
        (serverWasAlreadyRunning ? ' (server was already running)' : '');

  // Said out loud on every boot, pass or fail. A verification nobody can read
  // is not evidence, and this is the one line that shows the depth the server
  // is ACTUALLY running at rather than the one the conf asked for.
  //
  // The one silent case is a warm server that stopped answering between the
  // health check and this read. That is the control client's reconnect loop
  // racing a server that has gone away, it says nothing about the conf, and
  // logging it would put a scary line in front of a user for a transient.
  if (applied) {
    console.log(`[gmux] tmux conf verified: ${detail}`);
  } else if (!serverWasAlreadyRunning) {
    tmuxLog.warn(`tmux conf did not apply: ${detail}`);
    // Items 9 and 13. Told to the user, not only to the log, because the
    // consequence is that every session on this boot keeps a fraction of the
    // scrollback the product promises and nothing else would say so.
    //
    // A WARM server is deliberately excluded. There the observed depth is the
    // user's own Settings value, so calling it degraded would be an alarm
    // about a preference they set. The cold case that reaches here is one the
    // repair above already tried and failed to fix, so it is a real loss.
    if (declared !== null && observed !== null && observed !== declared) {
      postDurabilityNotice({
        kind: 'depth-degraded',
        actualLines: observed,
        requestedLines: declared
      });
    }
  } else if (observed !== null) {
    console.log(`[gmux] tmux conf read-back: ${detail}`);
  }
  lastVerification = { declared, observed, applied, repaired, detail };
  return lastVerification;
}

/** `verifyHistoryLimitWith` against the private server. */
export function verifyHistoryLimit(
  confPath: string,
  serverWasAlreadyRunning: boolean
): Promise<ConfVerification> {
  return verifyHistoryLimitWith(confPath, serverWasAlreadyRunning, {
    readLimit: () => readServerOptionNumber('history-limit'),
    setLimit: async (lines) => {
      await execTmux(['set-option', '-g', 'history-limit', String(lines)]);
    }
  });
}

/**
 * The local Mac's tmux invocation context.
 *
 * PHASE 69. It is now an alias of `LocalMachineContext`, which is one of the two
 * shapes `../machines/context.ts` holds, and the fields are the same five with
 * the same names. The alias stays so the 59 callers of `execTmux`, the barrel and
 * every existing test keep their import and their type.
 *
 * WHAT ACTUALLY CHANGED, stated here because "the singleton went away" is the
 * point of the rung and a reader of this file should not have to hunt for it.
 * There is no longer one implicit target. There is a registry keyed by machine
 * id, the local Mac is the key `'local'`, and a confirmed machine is another key.
 * `execTmux` below is the local key's name for the one door, rather than a hidden
 * default inside it.
 */
export type TmuxContext = LocalMachineContext;

/**
 * Resolve (and remember) the local tmux invocation context.
 *
 * @throws GmuxError TMUX_BUNDLE_INCOMPLETE when a packaged Tortie has no tmux
 *   inside its own bundle, TMUX_NOT_FOUND when a development build finds none
 *   on the machine. The sentence for each is composed in ./resolve, which is
 *   the one place both of them are written.
 */
export const getTmuxContext = localMachineContext;

/** Test/reset hook (e.g. after surfacing TMUX_NOT_FOUND and a user install). */
export const resetTmuxContext = resetMachineContexts;

/**
 * Build a full local tmux argv: `-L gmux -f <conf> …rest`.
 *
 * It is the local branch of `tmuxCommand`, so the two cannot disagree.
 * `build/conformance-machines.mjs` compares this function's answer against a
 * golden taken from `ab94847` across twelve argument vectors, because 59 call
 * sites now reach tmux through a new door and a difference of one byte in this
 * list is a difference in every one of them.
 */
export function tmuxArgs(ctx: TmuxContext, rest: readonly string[]): string[] {
  return [...tmuxCommand(ctx, rest).argv];
}

export type { ExecTmuxOptions };

// ---------------------------------------------------------------------------
// execTmux, the local key's name for the one door
// ---------------------------------------------------------------------------

/**
 * Run one tmux command against the private server on THIS Mac and return
 * stdout.
 *
 * Failures are classified into structured GmuxErrors (server down →
 * TMUX_UNREACHABLE, bad target → SESSION_NOT_FOUND, …), exactly as before.
 *
 * WHY THE 59 CALLERS DID NOT GET A MACHINE PARAMETER IN THIS RUNG, stated
 * plainly because it is the one judgement call in Phase 69. Every one of those
 * callers is attach, create, kill, capture, reconcile or restore, and every one
 * of those belongs to M3 or later. Giving each of them a machine parameter now
 * would be churn with no consumer, on the exact code paths that hold the
 * operator's running work, in the rung whose whole risk is that. M3 threads the
 * machine through the callers that need it, and it does so against a door that
 * already takes one.
 *
 * The server destroying refusal is asked TWICE, and the first ask is here rather
 * than in the door. It must not depend on the configuration file being present
 * or on Electron being up, and resolving the context depends on both.
 */
export async function execTmux(
  args: readonly string[],
  options: ExecTmuxOptions = {}
): Promise<string> {
  assertVerbAllowedOnSocket(args[0] ?? '', activeTmuxSocket());
  return execOn(localMachineContext(), args, options);
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

/** True when the private server answers `list-sessions` (even with zero). */
export async function isServerRunning(): Promise<boolean> {
  try {
    await execTmux(['list-sessions', '-F', '#{session_id}']);
    return true; // exit-empty off ⇒ zero sessions still answers with exit 0
  } catch {
    return false;
  }
}

let ensureInFlight: Promise<TmuxContext> | null = null;

/**
 * The chained `set-environment -g PATH` write, so a harness can wait for it.
 *
 * PHASE 81. The write used to sit inside the start loop and be awaited, which
 * made every boot wait for the login shell twice over. It is chained on the
 * install now, and this handle is the only way anything learns it finished.
 */
let serverPathPublish: Promise<void> | null = null;

/**
 * Resolves when the captured PATH has reached the server's global
 * environment. Harness only. No product path reads that value to decide
 * anything. Resolves at once when no server has been ensured yet, because
 * there is then nothing to have published.
 */
export function serverPathPublished(): Promise<void> {
  return serverPathPublish ?? Promise.resolve();
}

/**
 * Ensure the private tmux server is up (idempotent, safe to call often;
 * concurrent callers share one attempt). `start-server` with `-f` applies
 * gmux-tmux.conf only when it actually creates the server — an already
 * running server keeps its config, which is exactly what we want.
 *
 * Bug A (Phase 9.2), with its explanation corrected in Phase 48 and its
 * pointer moved in Phase 81. Before any session can be created, the user's
 * real login shell PATH is captured and written into THIS PROCESS's
 * environment, at the one assignment in ./user-path.ts. That assignment is the
 * load bearing one and it must not be deleted as redundant. A pane takes its
 * PATH from the tmux CLIENT that asked for the session, and this process is
 * that client.
 *
 * PHASE 81 MOVED THE WAIT AND NOT THE ASSIGNMENT. This function starts the
 * capture and no longer awaits it, so the session list, the project list and
 * every attach come off a wait they were never served by. The two paths that
 * can start a pane, being create and restore, await `installUserPath()`
 * themselves. The value written is the same value, written once, at the same
 * wall clock moment it was written before.
 *
 * The `set-environment -g PATH` call further down does NOT give a pane its
 * PATH, and the comment here used to say that it did. Measured twice,
 * independently, on tmux 3.6a against a pristine socket with the gmux conf:
 * the server process environment, the global session environment and the
 * client environment were each given a different marker directory, and the
 * pane received the client's. A non PATH variable set with `set-environment
 * -g` did reach the pane in the same test, so the global environment applies
 * in general and PATH is the exception. The call stays, because it is what a
 * person reads with `show-environment -g` and it is what the GMUX_SMOKE=agent
 * harness asserts. It is not what makes an agent resolve. See
 * docs/research/47-agent-installs.md section 2.
 *
 * @throws GmuxError TMUX_NOT_FOUND | TMUX_UNREACHABLE
 */
export function ensureServer(): Promise<TmuxContext> {
  if (ensureInFlight !== null) return ensureInFlight;
  const attempt = (async () => {
    // PHASE 81. The capture STARTS here and is not awaited. `getUserPath()`
    // caches its promise, so this line is what makes the login shell begin
    // answering at exactly the moment it always did, and the session list, the
    // project list and every attach now read the manifest while it answers.
    void getUserPath();

    // ONE BUILD STILL WAITS, and only when it has to. A development build
    // looks for tmux in /opt/homebrew/bin, /usr/local/bin and /usr/bin and
    // then scans the PATH, so a tmux installed anywhere else is found only
    // after the capture lands. When that scan comes back empty, wait. A
    // packaged build never reaches the scan: it returns the copy inside its
    // own bundle and ignores PATH entirely, so it never waits here.
    // `resolveTmux()` is three existsSync calls plus, only if those miss, one
    // PATH scan, and it populates no cache, so asking costs nothing and
    // changes no later answer. `installUserPath()` does not await this
    // function, so this branch cannot deadlock.
    if (!isPackagedApp() && resolveTmux().path === null) {
      await installUserPath();
    }

    // Bug C: guarantee a UTF-8 locale BEFORE the server exists — a server
    // spawned from a locale-less launchd env passes C/POSIX to every pane,
    // so zsh/vim/agent TUIs degrade to ASCII and tmux substitutes `_` for
    // non-ASCII glyphs on locale-less clients. Never overrides a real one.
    if (!hasUtf8Locale(process.env)) {
      process.env['LANG'] = DEFAULT_UTF8_LANG;
    }
    const lang = process.env['LANG'];

    const ctx = getTmuxContext();
    // Phase 19 item 13. `getTmuxContext` caches, and it asserts the conf once
    // at the instant it first resolves the path. That is not enough on its
    // own: on macOS an update replaces the .app directory underneath a
    // running process, so a path that was there at boot can be gone by the
    // time a later ensureServer creates a server with it. Re-assert against
    // the disk every time, immediately before the path is used. One statSync.
    assertConfUsable(ctx.confPath);
    // Was there a server before we touched it? The read-back below repairs a
    // lost conf only on a COLD start, because on a warm server a differing
    // depth is the user's own Settings value and not a defect.
    const serverWasAlreadyRunning = await isServerRunning();

    // PHASE 41, and where this block sits is the design.
    //
    // A tmux server outlives the app that made it, so the copy of Tortie
    // starting now can meet a server an older copy created. Across a version
    // boundary tmux can hang rather than fail: MEASURED, a 3.7b control client
    // against a 3.5a server prints "%exit" and then sits there, still running
    // after 8 s. The first thing GmuxCore.boot does after this function
    // returns is exactly that control mode attach, so the read has to happen
    // HERE, before the start loop, or it happens after the freeze.
    //
    // It runs on a warm server only. A server this process is about to create
    // will run the binary this process resolved, so there is no pair to check.
    if (serverWasAlreadyRunning) {
      await assertServerVersionUsable({
        exec: execTmux,
        bin: ctx.bin,
        socket: ctx.socket,
        packaged: ctx.packaged
      });
    }

    let lastFailure = '';
    // start-server is idempotent; health-check with short retries because a
    // cold server needs a beat to create the socket.
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await execTmux(['start-server']);
        await execTmux(['list-sessions', '-F', '#{session_id}']);
        // Bug C, same repair logic: future panes must see a UTF-8 locale
        // even on a server that booted from a locale-less launchd env.
        if (lang !== undefined && lang.length > 0) {
          await execTmux(['set-environment', '-g', 'LANG', lang]);
        }
        // Phase 19 item 13, the half a reviewer skips: `-f` exiting 0 is not
        // evidence that the conf applied. Ask the server what depth it is
        // actually running at.
        await verifyHistoryLimit(ctx.confPath, serverWasAlreadyRunning);
        // Phase 41. On the cold path only, say which tmux is now holding this
        // user's sessions. It also means every ordinary development run
        // exercises the same `#{version}` read the warm path depends on.
        if (!serverWasAlreadyRunning) {
          await logCreatedServerVersion({
            exec: execTmux,
            bin: ctx.bin,
            source: ctx.binSource
          });
        }
        // The server's global environment, kept honest for anything that
        // reads it on purpose. It is NOT how a pane gets its PATH: that comes
        // from this process, the tmux client, at the assignment in
        // ./user-path.ts. Chained rather than awaited since Phase 81, so a
        // server that is up does not wait for a shell that is still
        // answering. Nothing in the product reads this value to decide
        // anything, and the one reader that asserts on it is the
        // GMUX_SMOKE=agent harness, which awaits `serverPathPublished()`.
        // Idempotent, and it also repairs long lived servers.
        serverPathPublish = installUserPath().then(
          async (userPath) => {
            try {
              await execTmux(['set-environment', '-g', 'PATH', userPath]);
            } catch (err) {
              tmuxLog.warn(
                `the server's global PATH was not updated: ${(err as Error).message}`
              );
            }
          },
          (err: unknown) => {
            tmuxLog.warn(
              `the login shell PATH was never installed: ${String(err)}`
            );
          }
        );
        return ctx;
      } catch (err) {
        lastFailure = err instanceof Error ? err.message : String(err);
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw gmuxError(
      'TMUX_UNREACHABLE',
      'Could not start the Tortie session server.',
      lastFailure
    );
  })();
  ensureInFlight = attempt;
  // Allow future retries after settle (a dead server can be restarted by
  // calling ensureServer again). Both arms handled ⇒ no unhandled rejection.
  attempt.then(
    () => {
      ensureInFlight = null;
    },
    () => {
      ensureInFlight = null;
    }
  );
  return attempt;
}
