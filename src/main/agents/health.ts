/**
 * The structural preflight (Phase 48, research 47 sections 2 and 6).
 *
 * THE INCIDENT. The operator installed Tortie on a second Mac that had
 * `claude` installed through npm. Tortie found the binary, launched it, and
 * the pane died at once with no explanation. The npm shim is not a program.
 * It is a text file whose first line reads `#!/usr/bin/env node`, so it runs
 * only if `node` is on the PATH the pane gets. Tortie resolved the shim,
 * recorded it, spawned it, and then had nothing to say when it died.
 *
 * WHAT THIS MODULE ANSWERS. Given the file a launch is about to run, is the
 * interpreter that file's first line names reachable from the same PATH the
 * pane will get? Three answers, and only one of them stops a launch.
 *
 *  - `ok`                   launch it.
 *  - `interpreter-missing`  the file is a script and its interpreter did not
 *                           resolve. This is the only answer that blocks.
 *  - `unknown`              the check could not answer. Launch it anyway.
 *
 * WHAT IT NEVER DOES. It spawns nothing. It executes nothing. It reads at
 * most the first 1024 bytes of one file, and it opens that file exactly once.
 * `resolveBinary` already stats the same file on the same line for the same
 * launch, so this adds no new kind of action against a configuration nobody
 * confirmed. Refusal 8 in CLAUDE.md is untouched by it.
 *
 * IT FAILS OPEN, AND THAT IS THE DESIGN. The whole check is raced against a
 * 250 ms timer. If the timer wins, or anything throws for any reason, the
 * answer is `unknown` and the launch proceeds. A health check that can stop a
 * working agent from starting is worse than the bug it was written for.
 * `unknown` never blocks and is never shown to the user.
 *
 * THE TIMER RELEASES THE CALLER AND CANNOT CANCEL THE READ. libuv has no way
 * to cancel a filesystem request a threadpool thread is already inside, so a
 * file whose `open` never returns costs one thread for the life of the
 * process. `strandedInspections` below is the gate that stops that from
 * happening twice, and its comment carries the measurement.
 *
 * WHAT IT CANNOT CATCH. Three of the seven failure modes research 47
 * reproduced are an agent that starts and then exits: a flag the CLI rejects,
 * an interpreter older than the package needs, a wrapper missing a login
 * shell variable. No static check can predict any of them. Those are covered
 * by the exit text the reaper records, not by this module.
 *
 * MEASURED COST. 0.137 to 1.358 ms per agent over the eight agents installed
 * on the machine research 47 used. droid and CodeWhale were not measured,
 * because they are not installed there.
 */

import { open, realpath, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { performance } from 'node:perf_hooks';
// DIRECT, not through the ../tmux barrel, which is the same import
// ./availability.ts already uses for the same two functions. It keeps this
// leaf out of the tmux domain's own graph and there is no cycle to make.
import {
  getUserPath,
  resolveBinaryAgainst,
  userPathEpoch
} from '../tmux/resolve';

/** The three answers. Only `interpreter-missing` stops a launch. */
export type AgentHealthAnswer = 'ok' | 'interpreter-missing' | 'unknown';

/**
 * What actually runs when the resolved file starts (Phase 49, research 47 §5).
 *
 * This module already opens the file, reads its first line and resolves the
 * interpreter on the launch path. The answer used to be discarded once the
 * ok/blocked verdict was made; now it is reported, so the detection scan can
 * say "runs on node from ~/.nvm/..." without a second file read.
 */
export type AgentRuntime =
  | { kind: 'binary' }
  | { kind: 'script'; interpreter: string; interpreterPath: string | null };

export interface AgentHealthBase {
  readonly answer: AgentHealthAnswer;
  /** Wall clock of this check, in ms, measured even on a cache hit. */
  readonly elapsedMs: number;
}

export interface AgentHealthOk extends AgentHealthBase {
  readonly answer: 'ok';
  /** Phase 49. What the ok file is: a real program, or a script and its interpreter. */
  readonly runtime: AgentRuntime;
}

export interface AgentHealthUnknown extends AgentHealthBase {
  readonly answer: 'unknown';
  /** One short phrase for the log. Never shown to the user. */
  readonly reason: string;
}

export interface AgentHealthInterpreterMissing extends AgentHealthBase {
  readonly answer: 'interpreter-missing';
  /** The file that was resolved, exactly as the launch would use it. */
  readonly binPath: string;
  /** The interpreter name that did not resolve, e.g. "node". */
  readonly interpreter: string;
  /** The first line as read, trimmed, capped at 200 characters. */
  readonly shebang: string;
}

export type AgentHealth =
  | AgentHealthOk
  | AgentHealthUnknown
  | AgentHealthInterpreterMissing;

/**
 * The budget for the file work, and for the file work only.
 *
 * The clock starts after the login shell PATH is in hand, because at create
 * time that promise is already resolved and cached. What is being bounded
 * here is one realpath, one stat, one open, one read and one close.
 */
export const AGENT_HEALTH_TIMEOUT_MS = 250;

/** One read, capped. A first line longer than this answers `unknown`. */
const FIRST_LINE_BYTES = 1024;

/** How much of the first line the log and the error carry. */
const SHEBANG_MAX = 200;

/**
 * Entries held before the map is cleared whole.
 *
 * Twelve agents cannot reach it. A clear costs one re-read of about 1 ms, so
 * the eviction policy does not need to be cleverer than this.
 */
const CACHE_MAX = 64;

/**
 * The key parts are joined by NUL, which is the one byte a path cannot
 * contain. A space would have been ambiguous, because paths may contain
 * spaces and `mtimeMs` is a float.
 */
const KEY_SEP = '\u0000';

/**
 * Answers about a file and a PATH, keyed by both.
 *
 * `ok` and `interpreter-missing` are cached, because each is a statement
 * about a real path, its identity on disk and the PATH epoch, and the key
 * changes when any of those changes. `unknown` is NOT cached: it is a
 * statement about one attempt, usually a slow disk moment, and the next
 * launch can afford another 250 ms.
 *
 * FIVE PARTS IN THE KEY, and the last two were added in the Phase 48 fix
 * round. The key was the real path, the mtime, the size and the epoch, and an
 * in place upgrade by `cp -p`, `rsync --times` or `tar -p` moves none of those
 * four. A verifier reproduced it exactly: two 40 byte shims with the same
 * mtime, the first asking for a program that does not exist and the second
 * asking for node, and the second check was answered from the first one's
 * entry, so a working agent stayed blocked for the life of the process. The
 * inode catches a replacement by rename and `ctimeMs` catches a rewrite in
 * place, because macOS updates the change time on any write to the file.
 *
 * There is no disk cache and no timer, so there is no invalidation to get
 * wrong across restarts.
 */
const cache = new Map<string, AgentHealthOk | AgentHealthInterpreterMissing>();

/**
 * File inspections that are past their deadline and have not come back.
 *
 * THIS COUNTER IS THE FIX FOR A HANG THIS MODULE ITSELF INTRODUCED. The 250 ms
 * timer releases the caller. It cannot cancel the `open` the caller left
 * behind, because libuv has no way to cancel a filesystem request that a
 * threadpool thread is already inside. So a file whose `open` blocks, which is
 * an unresponsive network mount or a FUSE mount that has stopped answering,
 * costs one threadpool thread for the life of the process. The pool is four
 * threads by default. A verifier measured the dose response: at
 * `UV_THREADPOOL_SIZE=2` one of four creates came back, at the default four
 * three of four came back, and once the pool was gone every filesystem
 * operation in main stopped and the app could not quit, logging "watcher
 * closes are still pending after the drain".
 *
 * The gate below is what bounds it. One stranded inspection is allowed. While
 * one is outstanding, every later check answers `unknown` at once and opens
 * nothing, so the leak can never grow past a single thread and the pool always
 * keeps at least three.
 *
 * WHAT IS STILL NOT TRUE. The one stranded thread is not recovered. It is
 * returned only if the mount answers, and the count drops then. There is no
 * way to do better inside the process without spawning something, and this
 * module spawns nothing.
 */
let strandedInspections = 0;

/** How many stranded inspections are tolerated before the gate closes. */
const MAX_STRANDED = 1;

/** Test hook. Empties the memo and forgets any stranded inspection. */
export function resetAgentHealthCache(): void {
  cache.clear();
  strandedInspections = 0;
}

/** Test and verification hook. Inspections past their deadline right now. */
export function agentHealthStrandedCount(): number {
  return strandedInspections;
}

/** Test and verification hook. Number of entries held. */
export function agentHealthCacheSize(): number {
  return cache.size;
}

/** Milliseconds since `startedAt`, kept to three decimal places. */
function since(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 1000) / 1000;
}

/** One short phrase for the log, from whatever was thrown. */
function reasonOf(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code.length > 0) return code;
  return err instanceof Error && err.message.length > 0
    ? err.message.slice(0, 120)
    : 'unknown failure';
}

function remember(
  key: string,
  answer: AgentHealthOk | AgentHealthInterpreterMissing
): void {
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, answer);
}

/**
 * Everything a shebang line may contain before this module will read it.
 *
 * Printable ASCII and tab, and nothing else. A real shebang is a path and a
 * program name, so this excludes nothing anybody writes on purpose, and it
 * excludes the case the Phase 48 fix round was asked about: an executable that
 * is not a script at all whose first two bytes happen to be 0x23 0x21, with a
 * 0x0a somewhere in the next 1024 bytes. The old parser read those bytes as a
 * name, failed to resolve it, and refused the launch while showing the person
 * a program name made of unprintable characters. Mach-O magic never begins
 * 0x23 0x21, so this was never going to fire on a real install, but a refusal
 * nobody can read is the wrong way to be wrong.
 *
 * A path with an accented character in it answers `unknown` under this rule
 * and therefore launches, which is the direction this module always fails in.
 */
const PRINTABLE_SHEBANG = /^[\t\x20-\x7e]*$/;

/**
 * The program named by an `env` argument in the `--split-string` form.
 *
 * `#!/usr/bin/env -S node --enable-source-maps` and
 * `#!/usr/bin/env --split-string=node --enable-source-maps` mean the same
 * thing. The first already worked, because `-S` is its own token and the
 * program follows it. The second did not: the whole thing is one token that
 * begins with `-`, so the old loop skipped it and answered that there was no
 * program at all. Returns null for any token that is not that form.
 */
function programInSplitString(token: string): string | null {
  const value = /^--split-string=(.*)$/.exec(token)?.[1] ?? // long form
    (token.startsWith('-S') && token.length > 2 ? token.slice(2) : null);
  if (value === null) return null;
  const first = value.trim().split(/\s+/)[0];
  return first !== undefined && first.length > 0 ? first : null;
}

/**
 * The interpreter a shebang line names, with `/usr/bin/env` expanded.
 *
 * After the `env` token, tokens that begin with `-` and tokens that contain
 * `=` are skipped, then the first remaining token is the program. That is
 * what accepts `env -S node --enable-source-maps` and `env FOO=1 node`.
 * Returns null when there is nothing left to name.
 */
export function interpreterOf(shebangLine: string): string | null {
  const tokens = shebangLine
    .replace(/^#!/, '')
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const first = tokens[0];
  if (first === undefined) return null;
  if (basename(first) !== 'env') return first;
  for (const token of tokens.slice(1)) {
    if (token.startsWith('-')) {
      // The program may be INSIDE this token. Checked before the skip, so
      // `--split-string=node` names node rather than naming nothing.
      const inside = programInSplitString(token);
      if (inside !== null) return inside;
      continue;
    }
    if (token.includes('=')) continue;
    return token;
  }
  return null;
}

/**
 * Read the first line, decide, and answer. Everything that can throw is
 * inside, and the caller turns a throw into `unknown`.
 */
async function inspectFile(
  realPath: string,
  binPath: string,
  userPath: string,
  startedAt: number
): Promise<AgentHealth> {
  const handle = await open(realPath, 'r');
  let read = 0;
  let head: Buffer;
  try {
    const buf = Buffer.alloc(FIRST_LINE_BYTES);
    const result = await handle.read(buf, 0, FIRST_LINE_BYTES, 0);
    read = result.bytesRead;
    head = buf.subarray(0, read);
  } finally {
    await handle.close().catch(() => undefined);
  }

  // A native install is a Mach-O file and stops here, on two bytes. A zero
  // byte or one byte file is not a script either, and a broken empty
  // executable is not this check's business.
  if (read < 2 || head[0] !== 0x23 || head[1] !== 0x21) {
    return {
      answer: 'ok',
      elapsedMs: since(startedAt),
      runtime: { kind: 'binary' }
    };
  }

  const newline = head.indexOf(0x0a);
  if (newline === -1 && read === FIRST_LINE_BYTES) {
    return {
      answer: 'unknown',
      elapsedMs: since(startedAt),
      reason: `first line over ${FIRST_LINE_BYTES} bytes`
    };
  }
  // `\r` is trimmed by the trim() below, so a file written on Windows cannot
  // produce an interpreter named "node\r".
  const line = head
    .subarray(0, newline === -1 ? read : newline)
    .toString('utf8')
    .trim();

  if (!PRINTABLE_SHEBANG.test(line)) {
    return {
      answer: 'unknown',
      elapsedMs: since(startedAt),
      reason: 'first line is not printable ASCII'
    };
  }

  const interpreter = interpreterOf(line);
  if (interpreter === null) {
    return {
      answer: 'unknown',
      elapsedMs: since(startedAt),
      // The `env` form is the case worth naming, because it is the one a real
      // script reaches. A bare `#!` with nothing after it lands here too, and
      // the reason is log text rather than anything a person is shown.
      reason: 'env with no program'
    };
  }

  // A RELATIVE PATH IS NOT THIS CHECK'S TO REFUSE (Phase 48 fix round).
  // `resolveBinaryAgainst` rejects any name containing a slash that is not
  // absolute, so `#!./node` and `#!bin/node` used to come back as
  // interpreter-missing and stop the launch. The kernel resolves both against
  // the working directory, which this module does not know and must not
  // guess, so the honest answer is that it could not tell.
  if (interpreter.includes('/') && !interpreter.startsWith('/')) {
    return {
      answer: 'unknown',
      elapsedMs: since(startedAt),
      reason: 'relative interpreter path'
    };
  }

  // The third argument is passed EXPLICITLY. Its default is extraBinDirs(),
  // which would search directories the pane's PATH may not contain, and this
  // check is only worth anything if it asks the pane's own question.
  // `userPath` already carries extraBinDirs(), because captureLoginShellPath
  // merges them into every answer it gives, so an empty list here is what
  // makes the two searches equal. An absolute interpreter is validated as a
  // file by the same function, which is how a hard coded shebang to a node
  // that was removed is caught.
  const interpreterPath = resolveBinaryAgainst(interpreter, userPath, []);
  if (interpreterPath !== null) {
    return {
      answer: 'ok',
      elapsedMs: since(startedAt),
      // Phase 49. The path is the one this check just resolved for the
      // verdict; reporting it is free and it is what the Settings line prints.
      runtime: { kind: 'script', interpreter, interpreterPath }
    };
  }
  return {
    answer: 'interpreter-missing',
    elapsedMs: since(startedAt),
    binPath,
    interpreter,
    shebang: line.slice(0, SHEBANG_MAX)
  };
}

/** realpath, stat, cache lookup, then the file work. */
async function inspect(
  binPath: string,
  userPath: string,
  epoch: number,
  startedAt: number
): Promise<AgentHealth> {
  // realpath, because an npm shim is usually a symlink and an upgrade
  // rewrites the target rather than the link.
  const realPath = await realpath(binPath);
  const info = await stat(realPath);
  const key = [
    realPath,
    info.mtimeMs,
    info.size,
    // Phase 48 fix round. See the cache comment: an in place upgrade that
    // preserves the size and the mtime moves one of these two.
    info.ino,
    info.ctimeMs,
    epoch
  ].join(KEY_SEP);
  const hit = cache.get(key);
  if (hit !== undefined) {
    // THE PATH IS THE CALLER'S, NOT THE ENTRY'S (Phase 48 fix round). The key
    // is the REAL path, so two names for one file share an entry, which is
    // what makes an npm shim reachable at two prefixes cost one read. The
    // state B sheet then prints `binPath`, and a person told to look at a file
    // they did not ask about has been sent to the wrong place. `elapsedMs` was
    // already overwritten for the same reason.
    return hit.answer === 'interpreter-missing'
      ? { ...hit, binPath, elapsedMs: since(startedAt) }
      : { ...hit, elapsedMs: since(startedAt) };
  }
  const answer = await inspectFile(realPath, binPath, userPath, startedAt);
  if (answer.answer !== 'unknown') remember(key, answer);
  return answer;
}

/**
 * The whole check. Never throws. Never spawns.
 *
 * @param binPath the file the launch resolved, absolute, exactly as the
 *                launch will use it.
 */
export async function checkAgentBinary(binPath: string): Promise<AgentHealth> {
  let userPath: string;
  let epoch: number;
  try {
    // Already resolved and cached at create time: resolveBinary awaited the
    // same promise two lines earlier in core.ts.
    userPath = await getUserPath();
    epoch = userPathEpoch();
  } catch (err) {
    return { answer: 'unknown', elapsedMs: 0, reason: reasonOf(err) };
  }

  const startedAt = performance.now();

  // THE GATE. One inspection is already past its deadline and has not come
  // back, so its threadpool thread is gone and a second blocked `open` would
  // take another one. Answer without touching the disk. See
  // `strandedInspections` for the measurement and for what this does not fix.
  if (strandedInspections >= MAX_STRANDED) {
    return {
      answer: 'unknown',
      elapsedMs: 0,
      reason: 'an earlier check has not returned'
    };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<AgentHealth>((resolveTimer) => {
      timer = setTimeout(() => {
        resolveTimer({
          answer: 'unknown',
          elapsedMs: since(startedAt),
          reason: `no answer within ${AGENT_HEALTH_TIMEOUT_MS} ms`
        });
      }, AGENT_HEALTH_TIMEOUT_MS);
      // Never hold the process open for a check that fails open anyway.
      timer.unref?.();
    });
    // `settled` is written synchronously by both handlers, so reading it right
    // after the race tells the truth about whether the file work came back.
    let settled = false;
    const work = inspect(binPath, userPath, epoch, startedAt).then(
      (answer) => {
        settled = true;
        return answer;
      },
      (err: unknown) => {
        settled = true;
        throw err;
      }
    );
    const answer = await Promise.race([work, deadline]);
    if (!settled) {
      strandedInspections += 1;
      // The thread comes back if the mount ever answers, and the count drops
      // then. The rejection is swallowed because nobody is waiting on it any
      // more, and an unhandled rejection in main is a crash.
      void work.then(
        () => {
          strandedInspections -= 1;
        },
        () => {
          strandedInspections -= 1;
        }
      );
    }
    return answer;
  } catch (err) {
    return {
      answer: 'unknown',
      elapsedMs: since(startedAt),
      reason: reasonOf(err)
    };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
