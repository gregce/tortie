/**
 * THE CREDENTIALS DOMAIN'S JOINED SHUTDOWN (Phase 220, item 2).
 *
 * The six cases the goal document names, plus the two the phase's own reading
 * of the domain added. Every one of them was red at `b5cc017` except where it
 * says otherwise, because at that commit the whole of this domain's quit was
 * `stopLoginsWatch()` and nothing else was owned at all.
 *
 * THE FIX ROUND ADDED THE THIRD OF THEM AND REWROTE THE FIRST. The verifier
 * found that two arms of `shutdown_refuses_late_login_work` could not fail,
 * because `observeAll` holds its reading for five seconds and the setup had
 * just stamped that clock, and that the `trackCredentialWork` around the
 * activation was held up by nothing at all: `../../logins/ipc.ts` is outside
 * the directory the credentials gate ablates, so a bare `await` there left the
 * whole battery green while a switch in flight stopped being joined.
 *
 *  - `shutdown_refuses_late_login_work`
 *  - `shutdown_joins_replaced_observation`
 *  - `shutdown_joins_the_activation_it_started`
 *  - `late_watch_start_cannot_rearm_after_shutdown`
 *  - `shutdown_settles_held_security_read_and_write`
 *  - `shutdown_during_vendor_lock_keeps_recovery`
 *  - `idle_shutdown_is_immediate_and_idempotent`
 *
 * WHAT THIS FILE STARTS. Two children per keychain arm, being a shell script it
 * writes into its own temporary directory that sleeps until it is killed, and
 * one real `fs.watch` in the control half of the watch case, stopped in the
 * same test. It opens no keychain, reads nothing under any home, spawns no
 * agent, makes no request and spends no token. Every store is a real file
 * inside one temporary directory per test and the store environment is EMPTY on
 * purpose, so a `CLAUDE_CONFIG_DIR` or a `CODEX_HOME` on the machine running
 * this suite cannot compose a path outside it.
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getName: () => 'TortieTest' }
}));

const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
vi.mock('../../typed-ipc', () => ({
  handle: (
    _ipc: unknown,
    channel: string,
    fn: (...args: unknown[]) => Promise<unknown>
  ) => {
    handlers.set(channel, fn);
  }
}));
vi.mock('../../typed-events', () => ({ broadcastEvent: () => undefined }));

/**
 * THE LOG, CAPTURED, because the boot observe's own guard is upstream of every
 * store read and so cannot be seen in the read count alone (Phase 220 fix
 * round). `observeLoginsAtBoot` refuses on its first line; with that line gone
 * it runs, joins or draws the held reading, asks the migration and writes its
 * `logins.boot` line, and the only one of those a store read can see is a pass
 * `observeAll`'s own guard would have refused anyway. So the arm reads the line
 * as well as the store, and the two guards are then one arm each.
 */
const logged: string[] = [];
vi.mock('../../log', () => ({
  getLog: () => ({
    error: (event: string) => logged.push(event),
    warn: (event: string) => logged.push(event),
    info: (event: string) => logged.push(event),
    debug: (event: string) => logged.push(event)
  })
}));

import type { KeepDeps } from '../index';

const {
  registerLoginsIpc,
  observeLoginsAtBoot,
  startLoginsWatch,
  stopLoginsWatch,
  loginsWatchState
} = await import('../../logins/ipc');
const {
  beginCredentialShutdown,
  credentialChildCount,
  credentialWorkCount,
  credentialsAreOpen,
  fileVault,
  joinCredentialShutdown,
  resetCredentialLifecycle,
  securityCallCount,
  setKeepDeps,
  vaultGet
} = await import('../index');
const { defaultSecurityRunner } = await import('../security');
const keep = await import('../keep');
const locks = await import('../locks');
const { readLoginsFile } = await import('../../logins/store');
const { loginDirIn } = await import('../../logins/dirs');
const { setLoginAccountDeps } = await import('../../usage/login-accounts');
const { guardedChildPids } = await import('../../proc/guarded');

// A `security` that never exits on its own, so a cancel that does nothing is
// visible as a process still running rather than as a race.
const binScratch = mkdtempSync(join(tmpdir(), 'p220-security-'));
const NEVER_EXITS = join(binScratch, 'security');
writeFileSync(NEVER_EXITS, '#!/bin/sh\ncat > /dev/null 2>&1 &\nsleep 600\n', 'utf8');
chmodSync(NEVER_EXITS, 0o755);

afterAll(() => {
  rmSync(binScratch, { recursive: true, force: true });
});

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

let scratch = '';
let home = '';
let root = '';
let reads = 0;

function codexCredential(who: string, nonce: string): string {
  const claims = { sub: `u-${who}`, email: `${who}@example.com` };
  const claim = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return JSON.stringify({
    OPENAI_API_KEY: null,
    tokens: {
      access_token: `token-${who}-${nonce}`,
      account_id: `acct-${who}`,
      id_token: `h.${claim}.s`
    }
  });
}

const codexDefault = (): string => join(home, '.codex', 'auth.json');

function claudeCredential(who: string, nonce: string): string {
  return JSON.stringify({
    claudeAiOauth: { accessToken: `token-${who}-${nonce}`, subscriptionType: 'max' }
  });
}
function claudeAccountFile(who: string): string {
  return JSON.stringify({ numStartups: 9, oauthAccount: { emailAddress: `${who}@example.com` } });
}
const claudeDefaultCred = (): string => join(home, '.claude', '.credentials.json');
const claudeDefaultAccount = (): string => join(home, '.claude.json');

function writeFile(path: string, text: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, text, 'utf8');
}

function readIfThere(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/** The seams, over real files in the scratch root and nowhere else. */
function deps(): KeepDeps {
  return {
    root,
    vault: fileVault(join(root, 'kept')),
    stores: {
      runner: { run: async () => ({ code: 1, stdout: '' }) },
      readText: async (path) => {
        reads += 1;
        return readIfThere(path);
      },
      writeText: async (path, text) => {
        writeFile(path, text);
      },
      renamePath: async (from, to) => {
        writeFile(to, readFileSync(from, 'utf8'));
        rmSync(from, { force: true });
      },
      removePath: async (path) => {
        rmSync(path, { force: true });
      },
      env: {},
      home,
      keychainForClaude: false,
      userName: 'p220',
      wait: async () => undefined
    },
    liveSessions: () => Promise.resolve([]),
    now: () => 1_700_000_000_000
  };
}

/** One promoted codex login, the way a person makes one with `/login`. */
async function twoCodexAccounts(): Promise<{ name: string; dir: string; slot: string }> {
  writeFile(codexDefault(), codexCredential('alice', '1'));
  await handlers.get('logins:add')?.(null, 'codex', 'seed-a');
  writeFile(codexDefault(), codexCredential('bob', '2'));
  await handlers.get('logins:add')?.(null, 'codex', 'seed-b');
  const row = readLoginsFile(root).file.logins.find(
    (l) => l.provider === 'codex' && l.name === 'alice.example'
  );
  if (row === undefined) throw new Error('no promoted login');
  return {
    name: row.name,
    dir: loginDirIn(root, 'codex', row.id),
    slot: `codex.${row.id}`
  };
}

/** The same dance for claude, whose write is the one that takes vendor locks. */
async function twoClaudeAccounts(): Promise<{ name: string; dir: string; slot: string }> {
  writeFile(claudeDefaultCred(), claudeCredential('carol', '1'));
  writeFile(claudeDefaultAccount(), claudeAccountFile('carol'));
  await handlers.get('logins:add')?.(null, 'claude', 'seed-a');
  writeFile(claudeDefaultCred(), claudeCredential('dave', '2'));
  writeFile(claudeDefaultAccount(), claudeAccountFile('dave'));
  await handlers.get('logins:add')?.(null, 'claude', 'seed-b');
  const row = readLoginsFile(root).file.logins.find(
    (l) => l.provider === 'claude' && l.name === 'carol.example'
  );
  if (row === undefined) throw new Error('no promoted claude login');
  return {
    name: row.name,
    dir: loginDirIn(root, 'claude', row.id),
    slot: `claude.${row.id}`
  };
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'p220-shutdown-'));
  userData = join(scratch, 'userData');
  home = join(scratch, 'home');
  root = join(userData, 'gmux', 'logins');
  mkdirSync(root, { recursive: true });
  mkdirSync(home, { recursive: true });
  reads = 0;
  logged.length = 0;
  handlers.clear();
  resetCredentialLifecycle();
  setKeepDeps(deps());
  setLoginAccountDeps({
    keychainHas: async () => false,
    exists: async () => false,
    readText: async () => null,
    env: {},
    home,
    now: () => 1_700_000_000_000
  });
  registerLoginsIpc({} as never);
});

afterEach(() => {
  stopLoginsWatch();
  resetCredentialLifecycle();
  setKeepDeps(null);
  setLoginAccountDeps(null);
  rmSync(scratch, { recursive: true, force: true });
});

describe('Phase 220: the credentials domain has one shutdown owner', () => {
  it('shutdown_refuses_late_login_work', async () => {
    const { name, dir } = await twoCodexAccounts();
    beginCredentialShutdown();
    expect(credentialsAreOpen()).toBe(false);

    // THE CLOCK IS DRIVEN, and this is what the fix round added (Phase 220).
    //
    // `observeAll` holds its reading for five seconds, and the two adds above
    // stamped that clock a millisecond ago. So the list and the boot observe
    // below both returned the held facts and read nothing WHATEVER ADMISSION
    // SAID, and the arms passed with both guards deleted. Proved both ways: at
    // `OBSERVE_TTL_MS = 0` the same double deletion turns this test red and the
    // shipped code stays green. Time is moved on before each arm rather than
    // once, because a refused answer stamps the clock again on its way past.
    let drift = 0;
    const realNow = Date.now.bind(Date);
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => realNow() + drift);
    try {
      // THE CHOICE. The one channel that writes a credential starts nothing.
      const before = readIfThere(codexDefault());
      const chose = (await handlers.get('logins:choose')?.(null, 'codex', name)) as {
        ok: boolean;
        reason?: string;
      };
      expect(chose.ok).toBe(false);
      expect(String(chose.reason)).toContain('closing');
      expect(existsSync(join(dir, 'auth.json'))).toBe(false);
      expect(readIfThere(codexDefault())).toBe(before);
      expect(readLoginsFile(root).file.chosen['codex']).toBeUndefined();

      // THE LIST. It still draws, and it walks no store to do it, with the held
      // reading long expired so the refusal is the only thing stopping the walk.
      drift += 10 * 60_000;
      reads = 0;
      await handlers.get('logins:list')?.();
      expect(reads).toBe(0);

      // THE BOOT OBSERVE. It does not run at all: no store is read and the line
      // it writes at the end of every boot observe was never written.
      drift += 10 * 60_000;
      reads = 0;
      logged.length = 0;
      await observeLoginsAtBoot();
      expect(reads).toBe(0);
      expect(logged).not.toContain('logins.boot');

      // THE WATCH START. No watcher and no timer appears.
      await startLoginsWatch();
      expect(loginsWatchState()).toBeNull();
    } finally {
      clock.mockRestore();
    }
  });

  it('shutdown_joins_replaced_observation', async () => {
    await twoCodexAccounts();
    // A pass that hangs, so the join has something to wait for that a stop flag
    // alone would walk straight past.
    let release = (): void => undefined;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const installed = deps();
    setKeepDeps({
      ...installed,
      stores: {
        ...installed.stores,
        readText: async (path) => {
          if (path.startsWith(codexDefault())) await held;
          return installed.stores.readText(path);
        }
      }
    });

    // PASS A is in flight, and then a change REPLACES the cached promise, which
    // is what `forgetObservation()` does on every add, choose and remove. At the
    // parent that was the only reference to pass A.
    const listA = handlers.get('logins:add')?.(null, 'codex', 'seed-c');
    await sleep(5);
    expect(credentialWorkCount()).toBe(1);
    const addB = handlers.get('logins:add')?.(null, 'codex', 'seed-d');
    await sleep(5);
    expect(credentialWorkCount()).toBe(2);

    let settled = false;
    const join = joinCredentialShutdown(5_000).then((report) => {
      settled = true;
      return report;
    });
    await sleep(20);
    // THE JOIN DOES NOT RESOLVE WHILE A PASS NOBODY CACHED IS STILL RUNNING.
    expect(settled).toBe(false);

    release();
    const report = await join;
    await Promise.allSettled([listA, addB]);
    expect(report.tracked).toBe(2);
    expect(report.joined).toBe(true);
    expect(credentialWorkCount()).toBe(0);
  });

  it('shutdown_joins_the_activation_it_started', async () => {
    // THE FIX ROUND'S OWN CASE (Phase 220). The activation is the one thing in
    // this domain that WRITES a credential, and `logins/ipc.ts` is outside the
    // directory the credentials gate ablates, so the `trackCredentialWork(...)`
    // around it was held up by nothing at all: replacing it with a bare `await`
    // left every case in this file and in `../../logins/__tests__` green while
    // a switch in flight stopped being joined at quit. This is that call site,
    // held across the quit and asked for by name.
    const { name } = await twoCodexAccounts();
    let release = (): void => undefined;
    const held = new Promise<void>((r) => {
      release = r;
    });
    let hold = false;
    const installed = deps();
    setKeepDeps({
      ...installed,
      stores: {
        ...installed.stores,
        readText: async (path) => {
          // Only once the two adds above are done, so the hang belongs to the
          // activation and to nothing that set it up.
          if (hold && path.endsWith('auth.json')) await held;
          return installed.stores.readText(path);
        }
      }
    });

    hold = true;
    const choosing = handlers.get('logins:choose')?.(null, 'codex', name);
    await sleep(20);
    // THE SWITCH IS OWNED WHILE IT RUNS, which is the whole assertion.
    expect(credentialWorkCount()).toBe(1);

    beginCredentialShutdown();
    let settled = false;
    const join = joinCredentialShutdown(5_000).then((report) => {
      settled = true;
      return report;
    });
    await sleep(20);
    // THE QUIT DOES NOT RESOLVE OVER THE TOP OF IT.
    expect(settled).toBe(false);

    release();
    const report = await join;
    expect(report.tracked).toBe(1);
    expect(report.joined).toBe(true);
    await Promise.allSettled([choosing]);
    expect(credentialWorkCount()).toBe(0);
  });

  it('late_watch_start_cannot_rearm_after_shutdown', async () => {
    await twoCodexAccounts();
    // THE CONTROL FIRST: the same drive with nothing stopping it really does
    // install a watcher, so the arm below is a refusal rather than a no-op.
    await startLoginsWatch();
    expect(loginsWatchState()).not.toBeNull();
    stopLoginsWatch();
    expect(loginsWatchState()).toBeNull();

    // AND NOW THE QUIT LANDS INSIDE THE CHAIN. `startLoginsWatch` is the last
    // link of a fire and forget chain, and the stop runs while it is still
    // waiting on the dependency it awaits.
    const starting = startLoginsWatch();
    beginCredentialShutdown();
    stopLoginsWatch();
    await starting;
    expect(loginsWatchState()).toBeNull();
    // And the disposer that has already run finds nothing left to join.
    const report = await joinCredentialShutdown();
    expect(report.joined).toBe(true);
  });

  it('shutdown_settles_held_security_read_and_write', async () => {
    const runner = defaultSecurityRunner(undefined, NEVER_EXITS);
    const before = new Set(guardedChildPids());
    const read = runner.run(['find-generic-password', '-s', 'Tortie-credentials-x']);
    const write = runner.run(['-i'], 'add-generic-password -U -a "a" -s "s" -X "6869"\n');
    await sleep(150);
    expect(credentialChildCount()).toBe(2);
    const mine = guardedChildPids().filter((pid) => !before.has(pid));
    expect(mine.length).toBe(2);
    expect(mine.every(alive)).toBe(true);

    const report = await joinCredentialShutdown();
    // THE CANCEL REACHED THE OWNED CHILD, and the join says so truthfully.
    expect(report.children).toBe(2);
    expect(report.joined).toBe(true);
    // Both calls settle, with the answer every caller here already handles.
    expect(await read).toEqual({ code: 1, stdout: '' });
    expect(await write).toEqual({ code: 1, stdout: '' });
    await sleep(150);
    expect(mine.filter(alive)).toEqual([]);
    expect(credentialChildCount()).toBe(0);

    // AND NO NEW CHILD IS STARTED after admission closed.
    const calls = securityCallCount();
    expect(await runner.run(['find-generic-password', '-s', 'x'])).toEqual({
      code: 1,
      stdout: ''
    });
    expect(securityCallCount()).toBe(calls);
  });

  it('shutdown_during_vendor_lock_keeps_recovery', async () => {
    const { name, dir, slot } = await twoCodexAccounts();
    const kept = await vaultGet(deps().vault, slot);
    expect(kept).toBe(codexCredential('alice', '1'));

    // ARM 1, THE LOCK BOUNDARY. It is driven on CLAUDE, because codex holds no
    // lock at all and this arm is about the lock; the store is a file here, so
    // no keychain is opened and the locks are real directories under the
    // login's own folder. The quit lands while the switch is being made, and
    // the refusal arrives before a byte moves.
    const claude = await twoClaudeAccounts();
    const claudeKept = await vaultGet(deps().vault, claude.slot);
    expect(claudeKept).toBe(claudeCredential('carol', '1'));
    const installed = deps();
    const refused = await keep.activateLogin(
      {
        ...installed,
        lockDeps: locks.defaultLockDeps(),
        liveSessions: async () => {
          beginCredentialShutdown();
          return [];
        }
      },
      'claude',
      claude.name
    );
    expect(refused.ok).toBe(false);
    expect(refused.ok === false && refused.reason).toContain('closing');
    expect(existsSync(join(claude.dir, '.credentials.json'))).toBe(false);
    // THE RECOVERY COPY IS UNTOUCHED and the choice was never recorded.
    expect(await vaultGet(deps().vault, claude.slot)).toBe(claudeCredential('carol', '1'));
    expect(readLoginsFile(root).file.chosen['claude']).toBeUndefined();
    // No lock directory was left behind, so no lock the vendor may want is held.
    expect(readdirSync(claude.dir).filter((n) => n.includes('lock'))).toEqual([]);
    expect(existsSync(`${claude.dir}.lock`)).toBe(false);

    // ARM 2, EVERY WRITE BOUNDARY. The write is stopped after each of its three
    // steps, which is what a cancelled `security` child looks like from inside
    // `../swap.ts`, and at each one the store holds the old credential or the
    // new one and the kept copy is still there.
    for (const step of ['stage', 'verify', 'commit'] as const) {
      resetCredentialLifecycle();
      const stopped = await keep.activateLogin(deps(), 'codex', name, step);
      const store = readIfThere(join(dir, 'auth.json'));
      const ok = store === null || store === codexCredential('alice', '1');
      expect({ step, ok }).toEqual({ step, ok: true });
      expect(await vaultGet(deps().vault, slot)).toBe(codexCredential('alice', '1'));
      // A stopped write is a refusal, never a claimed success.
      if (step !== 'commit') expect(stopped.ok).toBe(false);
      rmSync(join(dir, 'auth.json'), { force: true });
    }
  });

  it('the watcher\'s own pass is owned, and starts nothing after shutdown', async () => {
    await twoCodexAccounts();
    let fire: (() => void) | null = null;
    const changed: number[] = [];
    const watcher = (await import('../watch')).startCredentialWatch({
      keep: deps(),
      emitChanged: () => changed.push(1),
      watchDir: () => ({ close: () => undefined }),
      setTimeout: (fn) => {
        fire = fn;
        return { clear: () => undefined };
      },
      setInterval: () => ({ clear: () => undefined })
    });
    try {
      // A BURST, AND THE PASS IT SCHEDULES IS OWNED. At the parent a pass
      // already running was held by nobody at all.
      watcher.poke();
      reads = 0;
      expect(fire).not.toBeNull();
      (fire as unknown as () => void)();
      expect(credentialWorkCount()).toBe(1);
      await sleep(30);
      expect(reads).toBeGreaterThan(0);
      expect(changed.length).toBe(1);

      // AND AFTER ADMISSION CLOSES, a burst that beats `stop()` to the timer
      // reads no store and tells nobody.
      beginCredentialShutdown();
      watcher.poke();
      reads = 0;
      (fire as unknown as () => void)();
      await sleep(30);
      expect(reads).toBe(0);
      expect(changed.length).toBe(1);
    } finally {
      watcher.stop();
    }
  });

  it('idle_shutdown_is_immediate_and_idempotent', async () => {
    const calls = securityCallCount();
    const startedAt = Date.now();
    const first = await joinCredentialShutdown();
    expect(first).toEqual({
      already: false,
      tracked: 0,
      children: 0,
      joined: true,
      waitedMs: 0
    });
    // NO ARTIFICIAL DELAY AND NO NEW PROCESS on an idle quit.
    expect(Date.now() - startedAt).toBeLessThan(100);
    expect(securityCallCount()).toBe(calls);

    const second = await joinCredentialShutdown();
    expect(second.already).toBe(true);
    expect(second.tracked).toBe(0);
    expect(credentialsAreOpen()).toBe(false);
  });
});
