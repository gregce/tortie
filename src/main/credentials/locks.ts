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
 * ## THREE LOCKS FOR A CLAUDE WRITE, and which lock is NOT taken
 *
 * The two CREDENTIAL locks were confirmed against 2.1.259, being
 * `<config-home>/.oauth_refresh.lock` first and then the legacy
 * `<realpath of config-home>.lock`, both stale at 60 s (`ukn` at bundle offset
 * 159814708, `epe` being `realpath` at 159082821). The fix round added the
 * THIRD, which the first build did not see: every secure storage write in
 * 2.1.259 runs under `<config-dir>/.storage-write`, stale at 15 s, with ten
 * retries between 100 and 1000 ms (offset 158843688), and the credential
 * save at the end of a token refresh is such a write, as is the MCP OAuth
 * refresh. A Tortie commit landing inside that read modify write is
 * overwritten with the old credential, which is the same defect the two
 * credential locks exist to stop, so it is taken as the third, inside the
 * other two, in the vendor's own order.
 *
 * The lock that is NOT taken is `~/.claude.json.lock`, which guards the
 * vendor's own `.claude.json` under proper-lockfile's defaults (stale 10 s,
 * offset 158835862). Tortie's activate writes ONLY the credential and never
 * `.claude.json`, so there is nothing for that lock to guard here. The cost of
 * not writing `.claude.json` is named where it is paid, in `./keep.ts`: the
 * card can show the outgoing address for up to one turn after a switch. That
 * lag is accepted; the person's own `.claude.json` is never written.
 *
 * The vendor also honours `CLAUDE_SECURESTORAGE_CONFIG_DIR` for the storage
 * lock's directory (`z_` at offset 158839953). Tortie does not read that
 * variable anywhere, so a person who sets it has a storage lock Tortie does
 * not take. That is a stated limit rather than an oversight.
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
  realpathSync,
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

/**
 * The secure storage write lock is stale past FIFTEEN seconds (2.1.259, offset
 * 158843688, `stale:15000`), because a storage write is a local read modify
 * write and never a network round trip.
 */
export const STORAGE_WRITE_STALENESS_MS = 15_000;

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
 *
 * THE VENDOR NAMES IT FROM THE REAL PATH (fix round): `${await epe(e)}.lock`
 * with `epe` being `realpath`, so a config home that is a symbolic link locks
 * beside its target and not beside the link. A home that cannot be resolved
 * keeps its given name, which is the vendor's own `.catch(()=>e)` fallback.
 */
export function legacyClaudeLockDir(configHome: string): string {
  let real = configHome;
  try {
    real = realpathSync(configHome);
  } catch {
    // Not there, or not resolvable: the vendor falls back to the name as given.
  }
  return `${real}.lock`;
}

/**
 * The secure storage write lock, `<config-dir>/.storage-write` (fix round).
 * Taken THIRD, inside the two credential locks, because the vendor takes it
 * inside its refresh lock when it saves the refreshed credential.
 */
export function storageWriteLockDir(configHome: string): string {
  return join(configHome, '.storage-write');
}

/**
 * Raised when a lock could not be taken, naming the lock and never a payload.
 *
 * TWO REASONS, and they read differently because a person acts on them
 * differently. `held` is a live holder that outlasted the wait, which is the
 * vendor refreshing and is answered by trying again. `unwritable` is a lock
 * directory that cannot be made at all, being a config home that is missing
 * or not writable, which no retry answers. The fix round added the second:
 * as shipped, a config home with mode 555 made `mkdir` fail with EACCES on
 * every turn of the loop, the stat answered null, and the null branch
 * continued with no sleep, so the whole nine second wait ran at one core.
 */
export class LockHeld extends Error {
  constructor(
    public readonly lockName: string,
    public readonly why: 'held' | 'unwritable' = 'held'
  ) {
    super(
      why === 'held'
        ? `Could not take ${lockName}: Claude Code appears to be refreshing ` +
            'its credentials. Try again in a few seconds.'
        : `Could not make ${lockName}: the sign in folder is missing or not writable.`
    );
    this.name = 'LockHeld';
  }
}

/** The seams. The tests hand in their own over a scratch directory. */
export interface LockDeps {
  /**
   * Make the directory, answering whether THIS call created it. False means
   * it is already there, which is the mutex being held. Any other failure,
   * being a parent that is missing or a directory that cannot be written,
   * THROWS, so the loop can refuse at once rather than wait on a mkdir that
   * will never land.
   */
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
      } catch (err) {
        // EEXIST IS THE MUTEX. Everything else is a directory that cannot be
        // made, and the caller refuses rather than spinning on it.
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') return false;
        throw err;
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
    let made: boolean;
    try {
      made = deps.mkdir(dir);
    } catch {
      // NOT A HELD LOCK. The directory cannot be made at all, and no amount of
      // waiting changes that, so the refusal is immediate and says so.
      throw new LockHeld(opts.lockName, 'unwritable');
    }
    if (made) break;
    if (deps.now() - start > timeout) throw new LockHeld(opts.lockName);
    const heldAt = deps.mtimeMs(dir);
    if (heldAt === null) {
      // The holder released between our mkdir and our stat. Retake after a
      // moment rather than at once: a seam that answers false and null
      // together for ever would otherwise spin this loop at one core for the
      // whole wait, which the fix round measured at 99 percent of a core.
      await deps.sleep(50);
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
 * Take Claude Code's three locks, in the vendor's own order, and hand back ONE
 * handle that releases every one (committer's round of Phase 211).
 *
 * THE ORDER IS THE VENDOR'S: the primary `.oauth_refresh.lock` first, then the
 * legacy `<config-home>.lock`, then `.storage-write` for the write itself.
 * Mirroring both the set and the order is what stops a waiting Tortie and a
 * waiting Claude Code deadlocking against each other. A failure to take a
 * later lock releases every earlier one before the throw leaves.
 *
 * IT IS A HANDLE AND NOT A CALLBACK because the lift in `./keep.ts` must READ
 * the store after the locks are held and act on nothing read before them. A
 * callback shape made that order a matter of where the caller put its read,
 * and the verifier found the read on the wrong side.
 */
export async function takeClaudeCredentialLocks(
  configHome: string,
  deps?: LockDeps
): Promise<LockHandle> {
  const seam = deps === undefined ? {} : { deps };
  const taken: LockHandle[] = [];
  const releaseAll = (): void => {
    // Innermost first, the reverse of the order they were taken in.
    for (const handle of taken.reverse()) handle.release();
  };
  try {
    taken.push(
      await acquireLock(oauthRefreshLockDir(configHome), {
        lockName: '.oauth_refresh.lock',
        ...seam
      })
    );
    taken.push(
      await acquireLock(legacyClaudeLockDir(configHome), {
        lockName: 'the legacy claude lock',
        ...seam
      })
    );
    taken.push(
      await acquireLock(storageWriteLockDir(configHome), {
        lockName: '.storage-write',
        stalenessMs: STORAGE_WRITE_STALENESS_MS,
        ...seam
      })
    );
  } catch (err) {
    releaseAll();
    throw err;
  }
  let released = false;
  return {
    release: () => {
      if (released) return;
      released = true;
      releaseAll();
    }
  };
}

/**
 * Hold Claude Code's three locks around a write, and release every one
 * whatever happened. The callback shape of {@link takeClaudeCredentialLocks}.
 */
export async function withClaudeCredentialLocks<T>(
  configHome: string,
  run: () => Promise<T>,
  deps?: LockDeps
): Promise<T> {
  const held = await takeClaudeCredentialLocks(configHome, deps);
  try {
    return await run();
  } finally {
    held.release();
  }
}

/**
 * The locks one provider's store is written under, as a handle (Phase 211).
 *
 * A claude write holds the vendor's three; a codex write holds NONE, for the
 * reason {@link withCodexNoLock} gives, and its handle releases nothing. The
 * split is a decision in the code rather than an omission.
 */
export async function takeVendorLocks(
  provider: 'claude' | 'codex',
  configHome: string,
  deps?: LockDeps
): Promise<LockHandle> {
  if (provider === 'claude') return takeClaudeCredentialLocks(configHome, deps);
  return { release: () => undefined };
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
  // lock mkdir throw below, which becomes an immediate refusal.
  try {
    deps.mkdir(parent);
  } catch {
    // Decided by the lock mkdir itself.
  }
}
