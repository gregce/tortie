/**
 * Phase 211. Claude Code's own credential locks, cooperated with while a switch
 * writes a store a live session may be about to refresh.
 *
 * Every test runs the SHIPPING lock module over a scratch directory each test
 * makes and removes, or over an injected clock, and asserts the three
 * properties the phase is judged on: it WAITS for a live lock, it RECLAIMS a
 * stale one, it NEVER STEALS a live one, and its refusal names the lock and
 * never a credential.
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, rmdirSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CREDENTIALS_STALENESS_MS,
  LockHeld,
  acquireLock,
  legacyClaudeLockDir,
  oauthRefreshLockDir,
  withClaudeCredentialLocks,
  withCodexNoLock,
  type LockDeps
} from '../locks';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p211-locks-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/**
 * A clock a test drives. The lock's sleep advances this clock, so a wait loop
 * runs in no real time and a timeout is deterministic.
 */
function drivenDeps(over: Partial<LockDeps> = {}): LockDeps {
  let clock = 1_000_000;
  const base: LockDeps = {
    mkdir: (path) => {
      try {
        mkdirSync(path);
        return true;
      } catch (err) {
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
        /* best effort */
      }
    },
    touch: (path) => {
      try {
        const now = new Date(clock);
        utimesSync(path, now, now);
      } catch {
        /* stolen */
      }
    },
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    setInterval: () => ({ clear: () => undefined })
  };
  return { ...base, ...over };
}

describe('acquireLock', () => {
  it('refuses at once, saying why, when the lock directory cannot be made (fix round)', async () => {
    // A config home that is not writable: mkdir fails with EACCES on every
    // turn, and as shipped the loop ran the whole wait at one core.
    const home = join(root, 'home');
    mkdirSync(home);
    chmodSync(home, 0o555);
    let sleeps = 0;
    const deps = drivenDeps({
      sleep: async () => {
        sleeps += 1;
      }
    });
    const started = Date.now();
    let thrown: unknown = null;
    try {
      await acquireLock(join(home, '.oauth_refresh.lock'), { lockName: '.oauth_refresh.lock', deps });
    } catch (err) {
      thrown = err;
    } finally {
      chmodSync(home, 0o755);
    }
    expect(thrown).toBeInstanceOf(LockHeld);
    expect((thrown as LockHeld).why).toBe('unwritable');
    expect((thrown as LockHeld).message).toContain('not writable');
    expect(sleeps).toBe(0);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('makes the directory and removes it on release', async () => {
    const dir = join(root, 'a.lock');
    const handle = await acquireLock(dir, { lockName: 'a', deps: drivenDeps() });
    expect(existsSync(dir)).toBe(true);
    handle.release();
    expect(existsSync(dir)).toBe(false);
  });

  it('reclaims a lock older than the staleness bound', async () => {
    const dir = join(root, 'b.lock');
    mkdirSync(dir);
    // Age it well past sixty seconds.
    const old = new Date(Date.now() - CREDENTIALS_STALENESS_MS - 10_000);
    utimesSync(dir, old, old);
    // A real clock, so the stat's real mtime is compared against now.
    const handle = await acquireLock(dir, { lockName: 'b', timeoutMs: 2_000 });
    expect(existsSync(dir)).toBe(true);
    handle.release();
    expect(existsSync(dir)).toBe(false);
  });

  it('never steals a live lock and refuses when the wait runs out', async () => {
    const dir = join(root, 'c.lock');
    mkdirSync(dir);
    // A live holder: the directory keeps getting touched to now, so it is never
    // stale. The driven clock advances only through sleep.
    const deps = drivenDeps({
      touch: () => undefined,
      // The holder's mtime always reads as "just now", whatever the clock says.
      mtimeMs: () => deps.now()
    });
    let thrown: unknown = null;
    try {
      await acquireLock(dir, { lockName: 'the primary lock', timeoutMs: 5_000, deps });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(LockHeld);
    // THE DIRECTORY THE LIVE HOLDER MADE IS STILL THERE. It was never stolen.
    expect(existsSync(dir)).toBe(true);
  });

  it('refuses with a sentence that names the lock and never a credential', async () => {
    const dir = join(root, 'd.lock');
    mkdirSync(dir);
    const deps = drivenDeps({ mtimeMs: () => deps.now() });
    let message = '';
    try {
      await acquireLock(dir, { lockName: '.oauth_refresh.lock', timeoutMs: 3_000, deps });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('.oauth_refresh.lock');
    expect(message).toContain('refreshing');
    // No token, no path to a store, no bytes of any credential.
    expect(message).not.toMatch(/accessToken|access_token|Bearer|eyJ/);
  });
});

describe('the config home lock names', () => {
  it('are the vendor primary and legacy names', () => {
    expect(oauthRefreshLockDir('/x/.claude')).toBe('/x/.claude/.oauth_refresh.lock');
    expect(legacyClaudeLockDir('/x/.claude')).toBe('/x/.claude.lock');
  });
});

describe('withClaudeCredentialLocks', () => {
  it('holds both locks around the write and releases both after it', async () => {
    const configHome = join(root, '.claude');
    mkdirSync(configHome);
    let heldDuringRun: boolean[] = [];
    await withClaudeCredentialLocks(configHome, async () => {
      heldDuringRun = [
        existsSync(oauthRefreshLockDir(configHome)),
        existsSync(legacyClaudeLockDir(configHome))
      ];
    });
    expect(heldDuringRun).toEqual([true, true]);
    // Both are gone once the write is done.
    expect(existsSync(oauthRefreshLockDir(configHome))).toBe(false);
    expect(existsSync(legacyClaudeLockDir(configHome))).toBe(false);
  });

  it('releases both locks even when the write throws', async () => {
    const configHome = join(root, '.claude');
    mkdirSync(configHome);
    await expect(
      withClaudeCredentialLocks(configHome, async () => {
        throw new Error('the write failed');
      })
    ).rejects.toThrow('the write failed');
    expect(existsSync(oauthRefreshLockDir(configHome))).toBe(false);
    expect(existsSync(legacyClaudeLockDir(configHome))).toBe(false);
  });

  it('takes exactly the two credential locks and never the .claude.json lock', async () => {
    const configHome = join(root, '.claude');
    mkdirSync(configHome);
    const made: string[] = [];
    const deps = drivenDeps({
      mkdir: (path) => {
        try {
          mkdirSync(path);
          made.push(path);
          return true;
        } catch {
          return false;
        }
      }
    });
    await withClaudeCredentialLocks(configHome, async () => undefined, deps);
    const lockDirs = made.filter((p) => p.endsWith('.lock'));
    expect(lockDirs).toEqual([
      oauthRefreshLockDir(configHome),
      legacyClaudeLockDir(configHome)
    ]);
    // Nothing named .claude.json.lock was ever taken.
    expect(made.some((p) => p.includes('.claude.json.lock'))).toBe(false);
  });
});

describe('withCodexNoLock', () => {
  it('runs the write with no lock at all', async () => {
    let ran = false;
    const answer = await withCodexNoLock(async () => {
      ran = true;
      return 'done';
    });
    expect(ran).toBe(true);
    expect(answer).toBe('done');
    // Nothing was created anywhere; codex holds nothing.
    expect(existsSync(join(root, '.oauth_refresh.lock'))).toBe(false);
  });
});
