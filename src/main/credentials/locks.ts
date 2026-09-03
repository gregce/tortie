/**
 * Claude Code's own advisory locks, cooperated with while a switch writes a
 * credential the vendor may be about to refresh (Phase 211).
 *
 * ## WHY A LOCK EXISTS AT ALL
 *
 * Phase 211 lifts the Phase 204 refusal that stopped a switch writing a store
 * a session is running under. The moment Tortie writes a credential while a
 * claude session is live, it races that session's OWN token refresh: Claude
 * Code reads the credential, goes to the network, and saves the refreshed
 * token, all under its own locks. A write that lands inside that window is
 * overwritten by the refreshed OLD account's token, and the copy Tortie just
 * put back holds a refresh token that is no longer valid. Held, Claude Code's
 * double checked re-read sees the swapped credential and abandons the refresh.
 *
 * So this is not Tortie's lock. It is Claude Code's, and the whole of this file
 * is speaking its protocol back to it, read from claude-swap's
 * `claude_locks.py` and confirmed by the measure agent against the installed
 * 2.1.259 bundle.
 *
 * ## THE PROTOCOL, and the three facts that make it cooperative
 *
 *  - THE LOCK ARTIFACT IS A DIRECTORY. `mkdir` is atomic, so it is the mutex:
 *    the process that makes the directory holds the lock, and everybody else
 *    finds it there.
 *  - A LIVE LOCK IS NEVER STOLEN, A STALE ONE IS. A holder touches its
 *    directory's mtime every few seconds, and a directory older than the
 *    staleness bound belongs to a dead holder and is removed and retaken.
 *    Claude Code's credential locks are stale only past SIXTY seconds, so a
 *    holder whose toucher stalled for ten seconds still owns its lock, and
 *    stealing one from a live vendor is the one thing this must never do.
 *  - CLAUDE CODE RETRIES A HELD CREDENTIALS LOCK five times with one to two
 *    second jittered sleeps, so holding it briefly is cooperative rather than
 *    a denial. Tortie's write is sub second, so the vendor never gives up.
 *
 * ## TWO LOCKS FOR A CLAUDE WRITE, NOT THREE
 *
 * The measure agent confirmed the two CREDENTIAL locks against 2.1.259, being
 * `<config-home>/.oauth_refresh.lock` first and then the legacy
 * `<config-home>.lock`, both stale at 60 s. The third lock claude-swap names,
 * `~/.claude.json.lock`, guards the vendor's own `.claude.json`, and Tortie's
 * activate writes ONLY the keychain credential and never `.claude.json`, so
 * there is nothing for that lock to guard here and it is not taken. The cost of
 * not writing `.claude.json` is named where it is paid, in `./keep.ts`: the
 * card can show the outgoing address for up to one turn after a switch. That
 * lag is accepted; the person's own `.claude.json` is never written.
 *
 * ## CODEX HOLDS NOTHING, AND SAYS SO
 *
 * Codex keeps its credential in a plain file the CLI re-reads, with no
 * proper-lockfile of its own, so there is no lock to cooperate with. The codex
 * path takes {@link withCodexNoLock}, which runs the write with no lock at all
 * and exists so that the absence is a decision in the code rather than a gap.
 *
 * ## NOTHING HERE LOGS, AND NO REFUSAL NAMES A PAYLOAD
 *
 * A lock that cannot be taken answers a sentence naming the LOCK, so a person
 * reads "Claude Code appears to be refreshing" rather than anything about the
 * credential. No line in this file writes a log, and no error it raises
 * carries a byte of any credential.
 */

import {
  mkdirSync,
  rmdirSync,
  statSync,
  utimesSync
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Claude Code's credential locks are stale only past SIXTY seconds (2.1.259
 * `uKi`, `stale: 60000`), because a live holder's toucher may stall well past
 * ten seconds while it still legitimately owns the lock.
 */
export const CREDENTIALS_STALENESS_MS = 60_000;

/** A held lock's directory is touched a little faster than the vendor's 5 s. */
export const TOUCH_INTERVAL_MS = 3_000;

/**
 * How long a single lock is waited for. Claude Code holds a credential lock
 * for one token endpoint round trip, sub second to a few seconds, so nine
 * seconds of bounded waiting outlasts it without stalling the CLI for ever. It
 * is PER LOCK: a claude write takes two locks in turn, so its worst case is
 * about twice this.
 */
export const DEFAULT_LOCK_TIMEOUT_MS = 9_000;

/** The two names a claude credential write cooperates with, in the vendor's order. */
export function oauthRefreshLockDir(configHome: string): string {
  return join(configHome, '.oauth_refresh.lock');
}

/**
 * The legacy credential lock, being `<config-home>.lock`, which for the default
 * config home `~/.claude` is `~/.claude.lock`. Claude Code still takes it for
 * compatibility, so exclusion holds even after it drops the primary.
 */
export function legacyClaudeLockDir(configHome: string): string {
  return `${configHome}.lock`;
}

/** Raised when a lock stayed held past its wait, naming the lock and never a payload. */
export class LockHeld extends Error {
  constructor(public readonly lockName: string) {
    super(
      `Could not take ${lockName}: Claude Code appears to be refreshing ` +
        'its credentials. Try again in a few seconds.'
    );
    this.name = 'LockHeld';
  }
}

/** The seams. The tests hand in their own over a scratch directory. */
export interface LockDeps {
  /** Make the directory, answering whether THIS call created it. */
  mkdir(path: string): boolean;
  /** The directory's mtime in ms, or null when it is not there. */
  mtimeMs(path: string): number | null;
  /** Remove the directory. Best effort; a failure is not fatal to a retake. */
  rmdir(path: string): void;
  /** Touch the directory's mtime to now. Best effort. */
  touch(path: string): void;
  now(): number;
  sleep(ms: number): Promise<void>;
  /** Set an interval, so a test can drive the toucher without real time. */
  setInterval(fn: () => void, ms: number): { clear(): void };
}

/** The real seams, over the file system. */
export function defaultLockDeps(): LockDeps {
  return {
    mkdir: (path) => {
      try {
        mkdirSync(path);
        return true;
      } catch {
        return false;
      }
    },
    mtimeMs: (path) => {
      try {
        return statSync(path).mtimeMs;
      } catch {
        return null;
      }
    },
    rmdir: (path) => {
      try {
        rmdirSync(path);
      } catch {
        // Somebody else removed it, or we cannot: either way the retake loop decides.
      }
    },
    touch: (path) => {
      try {
        const now = new Date();
        utimesSync(path, now, now);
      } catch {
        // The lock was stolen or removed; there is nothing left to keep alive.
      }
    },
    now: () => Date.now(),
    sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    setInterval: (fn, ms) => {
      const id = setInterval(fn, ms);
      // The toucher must not keep the process alive on its own.
      id.unref?.();
      return { clear: () => clearInterval(id) };
    }
  };
}

/** One held lock. Releasing it stops the toucher and removes the directory. */
export interface LockHandle {
  release(): void;
}

/**
 * Take one directory lock, waiting up to {@link timeout} and taking over a
 * holder that is older than {@link staleness}.
 *
 * IT NEVER STEALS A LIVE LOCK. A directory younger than the staleness bound
 * belongs to a holder whose toucher is keeping it alive, and the only answer
 * to that is to wait, and to refuse when the wait runs out. That refusal is the
 * whole safety of the phase: a stolen lock is a write that lands inside a token
 * refresh.
 */
export async function acquireLock(
  dir: string,
  opts: {
    lockName: string;
    timeoutMs?: number;
    stalenessMs?: number;
    deps?: LockDeps;
  }
): Promise<LockHandle> {
  const deps = opts.deps ?? defaultLockDeps();
  const timeout = opts.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  const staleness = opts.stalenessMs ?? CREDENTIALS_STALENESS_MS;
  // The parent must exist for the mkdir to land. It is the config home or the
  // directory holding it, both of which Tortie has already resolved.
  ensureParent(dir, deps);
  const start = deps.now();
  for (;;) {
    if (deps.mkdir(dir)) break;
    if (deps.now() - start > timeout) throw new LockHeld(opts.lockName);
    const heldAt = deps.mtimeMs(dir);
    if (heldAt === null) {
      // The holder released between our mkdir and our stat; retake at once.
      continue;
    }
    if (deps.now() - heldAt > staleness) {
      // A DEAD HOLDER by the protocol. Remove it and retake. Losing the
      // remove-then-make race to another waiter just loops us again.
      deps.rmdir(dir);
      await deps.sleep(50);
      continue;
    }
    // A LIVE HOLDER. Wait, jittered, and try again until the timeout.
    await deps.sleep(250 + Math.floor(jitter(deps) * 250));
  }
  const toucher = deps.setInterval(() => deps.touch(dir), TOUCH_INTERVAL_MS);
  let released = false;
  return {
    release: () => {
      if (released) return;
      released = true;
      toucher.clear();
      deps.rmdir(dir);
    }
  };
}

/**
 * Hold Claude Code's two credential locks around a write, in the vendor's own
 * order, and release both whatever happened.
 *
 * THE ORDER IS THE VENDOR'S: the primary `.oauth_refresh.lock` first, then the
 * legacy `<config-home>.lock`. Mirroring both the pair and the order is what
 * stops a waiting Tortie and a waiting Claude Code deadlocking against each
 * other. A failure to take the SECOND lock releases the first, which the
 * `finally` chain below does.
 */
export async function withClaudeCredentialLocks<T>(
  configHome: string,
  run: () => Promise<T>,
  deps?: LockDeps
): Promise<T> {
  const primary = await acquireLock(oauthRefreshLockDir(configHome), {
    lockName: '.oauth_refresh.lock',
    ...(deps === undefined ? {} : { deps })
  });
  try {
    const legacy = await acquireLock(legacyClaudeLockDir(configHome), {
      lockName: 'the legacy claude lock',
      ...(deps === undefined ? {} : { deps })
    });
    try {
      return await run();
    } finally {
      legacy.release();
    }
  } finally {
    primary.release();
  }
}

/**
 * Run a codex write with NO lock, because codex keeps its credential in a file
 * the CLI re-reads and holds no proper-lockfile of its own (Phase 211).
 *
 * It exists so the absence is a line in the code rather than a silence a later
 * round reads as an oversight. There is nothing to cooperate with here.
 */
export async function withCodexNoLock<T>(run: () => Promise<T>): Promise<T> {
  return run();
}

/** A tiny seam so a test can make the jitter deterministic if it wants. */
function jitter(deps: LockDeps & { random?: () => number }): number {
  return typeof deps.random === 'function' ? deps.random() : Math.random();
}

/** Make the directory that will hold the lock, so the mkdir mutex can land. */
function ensureParent(dir: string, deps: LockDeps): void {
  const parent = dirname(dir);
  // `mkdir` here is the same seam; a parent that already exists answers false
  // and that is fine. It is best effort: a parent that cannot be made makes the
  // lock mkdir fail below, which the timeout turns into an honest refusal.
  deps.mkdir(parent);
}
