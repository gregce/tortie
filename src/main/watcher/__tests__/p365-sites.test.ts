/**
 * Phase 365: the five subscribe sites (build/p365/SPEC.md §4.2, D9 to D11),
 * driven through the SHIPPING watcher host.
 *
 * Check type: contract test over an injected @parcel/watcher, in the shape of
 * repo-watcher-contract.test.ts, so no FSEvents stream is ever opened and it
 * runs in the hermetic lane. Nothing is injected into the host: under vitest
 * `process.versions.electron` is undefined, so `watchFolder` runs its one queue
 * in this process (D7), and every call below crosses the same queue, the same
 * existence check at the watch's turn and the same messages the app's watcher
 * process answers.
 *
 * The native module is the only thing faked, and it is how a test holds the
 * queue on one native call (so a folder can go before a later watch's turn, or
 * a watch can wait longer than its debounce window), holds a close (so the
 * tracked closes can be counted while one is outstanding), or never finishes
 * one (so the host's close bound passes and it replaces its process, re-binding
 * every live watch with a re-scan notice).
 *
 * What is pinned, each red when its rule is taken out of the site:
 *  - `null` at each site: the worktree's rejection and its words, the dotgit
 *    watch's retry on the next flush, the configuration watches' warn and
 *    `false`, and the harvest's poll;
 *  - a long start: one flush for RepoWatcher (its worktree watch, and a `.git`
 *    watch attached on a later flush), and none for a short start;
 *  - the fix round's start: each configuration watch reads once when its
 *    stream is live if the file is not what the last read saw, however short
 *    the wait, and never when it is; the harvest lists its roots once when a
 *    root's stream is live, so a record written while it waited is found then
 *    rather than at the next poll;
 *  - a re-scan notice: each configuration watch reloads on a dropped batch and
 *    on no other error, and a restart delivered through the host reaches every
 *    site that re-reads;
 *  - a watch that has ended (the fix round): each configuration watch says so
 *    once, in its own words, and reloads nothing;
 *  - one tracked close per close: the host tracks it, so no site does again;
 *  - while the app quits, every site takes its not-watching path, and the
 *    worktree's words say its folder is there.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// The native module, faked
// ---------------------------------------------------------------------------

type NativeCb = (err: Error | null, events: { type: string; path: string }[]) => void;

interface NativeSub {
  dir: string;
  cb: NativeCb;
  ignore: (string | RegExp)[];
  closed: boolean;
}

/** What a native call on one folder does. Read when the call is made. */
interface Shape {
  /** The subscribe answers only once this settles. */
  hold?: Promise<void>;
  /** The unsubscribe answers only once this settles. */
  holdClose?: Promise<void>;
}

/** Every native subscribe that answered, in order. */
const native: NativeSub[] = [];
/** Every folder a native subscribe was ASKED for, in order, before any hold. */
const asked: string[] = [];
/** Every folder a native unsubscribe was asked for, in order. */
const closesAsked: string[] = [];
const shapes = new Map<string, Shape>();

vi.mock('@parcel/watcher', () => {
  const subscribe = async (
    dir: string,
    cb: NativeCb,
    opts?: { ignore?: (string | RegExp)[] }
  ): Promise<{ unsubscribe: () => Promise<void> }> => {
    asked.push(dir);
    const hold = shapes.get(dir)?.hold;
    if (hold !== undefined) await hold;
    const rec: NativeSub = { dir, cb, ignore: opts?.ignore ?? [], closed: false };
    native.push(rec);
    return {
      unsubscribe: async () => {
        closesAsked.push(dir);
        const holdClose = shapes.get(dir)?.holdClose;
        if (holdClose !== undefined) await holdClose;
        rec.closed = true;
      }
    };
  };
  return { default: { subscribe }, subscribe };
});

/** Every log line, by scope, so a site's own words can be read back. */
const lines: { scope: string; level: string; msg: string }[] = [];
vi.mock('../../log', () => ({
  getLog: (scope: string) => ({
    error: (msg: string) => {
      lines.push({ scope, level: 'error', msg });
    },
    warn: (msg: string) => {
      lines.push({ scope, level: 'warn', msg });
    },
    info: (msg: string) => {
      lines.push({ scope, level: 'info', msg });
    },
    debug: () => undefined
  }),
  logEvent: () => undefined
}));

let userData = '';
vi.mock('electron', () => ({
  app: { getPath: () => userData },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: () => Buffer.from(''),
    decryptString: () => ''
  }
}));

const { watchFolder, watcherProcessObservation } = await import('../host');
const { pendingWatcherCloseCount } = await import('../teardown');
const { RepoWatcher } = await import('../repo-watcher');
const config = await import('../../config/store');
const machines = await import('../../machines/store');
const { agentOverlayPath, configDir, ensureConfigDir } = await import('../../config/paths');
const { forgetConversationClaims, resetPendingWatches, watchForSessionId } = await import(
  '../../manifest/harvest'
);
const { markAppQuitting } = await import('../../lifecycle');
const { canonicalPathSync } = await import('../../fs/folder-identity');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A short debounce, so a window can be crossed with a short real wait. */
const DEBOUNCE_MS = 20;
/** `WATCH_DEBOUNCE_MS` in both configuration stores, which neither exports. */
const CONFIG_DEBOUNCE_MS = 300;

const OWL = {
  schema: 1,
  agents: [{ id: 'owl', displayName: 'Owl', binaries: ['owl'], launch: { argv: ['owl'] } }]
};
const ROLLOUT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';

const tick = (ms = 0): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Wait for a condition, failing with its name rather than the test's budget. */
async function until(what: string, test: () => boolean, ms = 3_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!test()) {
    if (Date.now() > deadline) throw new Error(`waited ${String(ms)} ms for ${what}`);
    await tick(5);
  }
}

/** A promise that fails with its name after `ms`, so a hang is a red line. */
function within<T>(what: string, ms: number, p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const t = setTimeout(() => reject(new Error(`no answer within ${String(ms)} ms: ${what}`)), ms);
      t.unref?.();
    })
  ]);
}

function deferred(): { promise: Promise<void>; release: () => void } {
  let release!: () => void;
  const promise = new Promise<void>((r) => {
    release = r;
  });
  return { promise, release };
}

let scratch = '';

/**
 * Hold the host's one queue: a watch of a folder of its own whose native
 * subscribe does not answer until released. Every op asked for after it waits
 * its turn behind it (D2), which is how a folder goes before a later watch's
 * turn, and how a later watch waits longer than its debounce window.
 */
async function holdQueue(): Promise<{ release: () => Promise<void> }> {
  const dir = mkdtempSync(join(scratch, 'blocker-'));
  const gate = deferred();
  shapes.set(dir, { hold: gate.promise });
  const watching = watchFolder(dir, {}, () => undefined);
  await until('the blocking watch to reach the native module', () => asked.includes(dir));
  return {
    release: async () => {
      gate.release();
      const w = await watching;
      await w?.close();
    }
  };
}

function nativeFor(dir: string): NativeSub[] {
  return native.filter((s) => s.dir === dir && !s.closed);
}

function warns(scope: string): string[] {
  return lines.filter((l) => l.scope === scope && l.level === 'warn').map((l) => l.msg);
}

/** One codex rollout in `sessions`, confirming for `cwd` (line 1 carries it). */
function writeRollout(sessions: string, cwd: string): void {
  const shard = join(sessions, '2099', '01', '01');
  mkdirSync(shard, { recursive: true });
  writeFileSync(
    join(shard, `rollout-2099-01-01T00-00-01-${ROLLOUT_ID}.jsonl`),
    `${JSON.stringify({ payload: { cwd } })}\n`
  );
}

beforeAll(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'p365-sites-'));
  // The host loads its in-process queue on the first watch (a dynamic import,
  // D7). Paid here, so no test below measures it as a long start.
  const warm = mkdtempSync(join(scratch, 'warm-'));
  const w = await watchFolder(warm, {}, () => undefined);
  await w?.close();
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

beforeEach(() => {
  native.length = 0;
  asked.length = 0;
  closesAsked.length = 0;
  lines.length = 0;
  shapes.clear();
  userData = mkdtempSync(join(scratch, 'user-data-'));
  config.resetAgentOverlayStoreForTests();
  machines.resetMachinesStoreForTests();
  forgetConversationClaims();
  resetPendingWatches();
});

afterEach(async () => {
  await config.stopAgentOverlayWatch();
  await machines.stopMachinesWatch();
  config.resetAgentOverlayStoreForTests();
  machines.resetMachinesStoreForTests();
  forgetConversationClaims();
  resetPendingWatches();
});

// ---------------------------------------------------------------------------
// D11: `null` at each site
// ---------------------------------------------------------------------------

describe('null at each site (D11)', () => {
  it('the worktree: a folder that goes before its turn rejects watch() with "<path> is not there", and nothing native is asked for it', async () => {
    const repo = mkdtempSync(join(scratch, 'repo-'));
    const root = canonicalPathSync(repo);
    const queue = await holdQueue();
    const watching = RepoWatcher.watch(repo, { onChange: () => undefined });
    watching.catch(() => undefined);
    rmSync(repo, { recursive: true, force: true });
    await queue.release();
    await expect(within('the worktree watch', 3_000, watching)).rejects.toThrow(
      `${repo} is not there`
    );
    expect(asked).not.toContain(root);
  });

  it('the dotgit watch: a .git that goes before its turn is "no .git yet", asked again on the next flush, and no error', async () => {
    const repo = mkdtempSync(join(scratch, 'repo-'));
    const root = canonicalPathSync(repo);
    const errors: string[] = [];
    let removeGitOnChange = false;
    let changes = 0;
    const rw = await RepoWatcher.watch(repo, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        changes += 1;
        // The flush asks for the .git watch (its stat passed) and then calls
        // this, synchronously, before that watch's turn: the moment .git goes.
        if (removeGitOnChange) {
          removeGitOnChange = false;
          rmSync(join(repo, '.git'), { recursive: true, force: true });
        }
      },
      onError: (e) => errors.push(e.message)
    });
    try {
      const worktree = nativeFor(root)[0];
      expect(worktree).toBeDefined();
      mkdirSync(join(repo, '.git'));
      const gitDir = canonicalPathSync(join(repo, '.git'));
      const queue = await holdQueue();
      removeGitOnChange = true;
      worktree!.cb(null, [{ type: 'create', path: join(root, 'seed.txt') }]);
      await until('the flush that asks for the .git watch', () => changes === 1);
      await queue.release();
      await tick(DEBOUNCE_MS * 4);
      expect(asked).not.toContain(gitDir);
      expect(errors).toEqual([]);

      // The next flush asks again, and now there is a .git to watch.
      mkdirSync(join(repo, '.git'));
      worktree!.cb(null, [{ type: 'create', path: join(root, 'seed-2.txt') }]);
      await until('the .git watch on the next flush', () => nativeFor(gitDir).length === 1);
      expect(errors).toEqual([]);
    } finally {
      await rw.dispose();
    }
  });

  it("the agents.json watch: a folder that goes before its turn is today's warn and false, and a later start watches", async () => {
    ensureConfigDir();
    const dir = configDir();
    const queue = await holdQueue();
    const starting = config.startAgentOverlayWatch();
    rmSync(dir, { recursive: true, force: true });
    await queue.release();
    expect(await within('the agents.json watch', 3_000, starting)).toBe(false);
    expect(asked).not.toContain(dir);
    expect(warns('config')).toContain(
      `not watching ${dir} for changes. Tortie will still re-read agents.json when you ask it to.`
    );
    // Nothing was kept from the null, so a later start watches.
    ensureConfigDir();
    expect(await config.startAgentOverlayWatch()).toBe(true);
    expect(nativeFor(dir)).toHaveLength(1);
  });

  it("the machines.json watch: a folder that goes before its turn is today's warn and false, and a later start watches", async () => {
    ensureConfigDir();
    const dir = configDir();
    const queue = await holdQueue();
    const starting = machines.startMachinesWatch();
    rmSync(dir, { recursive: true, force: true });
    await queue.release();
    expect(await within('the machines.json watch', 3_000, starting)).toBe(false);
    expect(asked).not.toContain(dir);
    expect(warns('config')).toContain(
      `not watching ${dir} for machine changes. Tortie will still re-read machines.json when you ask it to.`
    );
    ensureConfigDir();
    expect(await machines.startMachinesWatch()).toBe(true);
    expect(nativeFor(dir)).toHaveLength(1);
  });

  it('the harvest: a root that goes before its turn is left to the poll, which still finds the record', async () => {
    const home = mkdtempSync(join(scratch, 'home-'));
    const cwd = mkdtempSync(join(scratch, 'cwd-'));
    const sessions = join(home, '.codex', 'sessions');
    mkdirSync(sessions, { recursive: true });
    const queue = await holdQueue();
    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      {
        home,
        env: {},
        pollIntervalMs: 50,
        maxPollIntervalMs: 50,
        timeoutMs: 10_000,
        graceMs: 200,
        claimant: 'p365-harvest-null'
      }
    );
    try {
      rmSync(sessions, { recursive: true, force: true });
      await queue.release();
      await tick(50);
      expect(asked).not.toContain(sessions);
      // The root comes back with this session's record in it: the poll finds it.
      writeRollout(sessions, cwd);
      const got = await within('the harvest to settle by its poll', 3_000, watch.promise);
      expect(got.sessionId).toBe(ROLLOUT_ID);
      expect(asked).not.toContain(sessions);
    } finally {
      watch.cancel();
    }
  });
});

// ---------------------------------------------------------------------------
// D9: a watch that waited longer than its debounce window
// ---------------------------------------------------------------------------

describe('a long start (D9)', () => {
  it('RepoWatcher: a worktree watch that waited longer than its debounce window flushes once with no event, and a short one does not', async () => {
    const slow = mkdtempSync(join(scratch, 'repo-'));
    const quick = mkdtempSync(join(scratch, 'repo-'));
    let slowChanges = 0;
    let quickChanges = 0;
    const rwQuick = await RepoWatcher.watch(quick, {
      debounceMs: CONFIG_DEBOUNCE_MS,
      onChange: () => {
        quickChanges += 1;
      }
    });
    const queue = await holdQueue();
    const watching = RepoWatcher.watch(slow, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        slowChanges += 1;
      }
    });
    await tick(DEBOUNCE_MS * 5);
    await queue.release();
    const rwSlow = await watching;
    try {
      await tick(CONFIG_DEBOUNCE_MS + 150);
      expect(slowChanges).toBe(1);
      expect(quickChanges).toBe(0);
    } finally {
      await rwSlow.dispose();
      await rwQuick.dispose();
    }
  });

  it('RepoWatcher: a .git watch attached on a later flush after a long wait for its turn flushes once more', async () => {
    const repo = mkdtempSync(join(scratch, 'repo-'));
    const root = canonicalPathSync(repo);
    let changes = 0;
    const rw = await RepoWatcher.watch(repo, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        changes += 1;
      }
    });
    try {
      mkdirSync(join(repo, '.git'));
      const gitDir = canonicalPathSync(join(repo, '.git'));
      const queue = await holdQueue();
      nativeFor(root)[0]!.cb(null, [{ type: 'create', path: join(root, 'x.txt') }]);
      await until('the flush that asks for the .git watch', () => changes === 1);
      await tick(DEBOUNCE_MS * 5);
      await queue.release();
      await until('the .git watch', () => nativeFor(gitDir).length === 1);
      await until('one more flush', () => changes === 2);
      await tick(DEBOUNCE_MS * 5);
      expect(changes).toBe(2);
    } finally {
      await rw.dispose();
    }
  });

  // The fix round moved the two configuration watches off the spec's 300 ms
  // threshold: a first watch waits about 60 ms for the watcher process, so an
  // edit 25 ms after the boot read reached no stream and no reload. Now the
  // file is read once when the stream is live whenever it is not what the last
  // read saw, however short or long the wait, and never when it is.
  it('the agents.json watch: a file changed between the last read and the stream start is read once, however long or short the wait; an unchanged one is not', async () => {
    ensureConfigDir();
    config.loadAgentOverlay('boot');
    const queue = await holdQueue();
    const starting = config.startAgentOverlayWatch();
    // Made while the watch waits for its turn, so no stream ever reports it.
    writeFileSync(agentOverlayPath(), JSON.stringify(OWL));
    await tick(CONFIG_DEBOUNCE_MS + 100);
    const before = config.agentOverlayDiskReads();
    await queue.release();
    expect(await starting).toBe(true);
    await until('the reload', () => config.agentEntry('owl') !== null);
    expect(config.agentOverlayDiskReads()).toBe(before + 1);

    // A short start with the file as the last read saw it: nothing is read.
    await config.stopAgentOverlayWatch();
    expect(await config.startAgentOverlayWatch()).toBe(true);
    const settled = config.agentOverlayDiskReads();
    await tick(CONFIG_DEBOUNCE_MS * 2);
    expect(config.agentOverlayDiskReads()).toBe(settled);
    expect(config.agentEntry('owl')).not.toBeNull();

    // A short start with the file changed after the last read and before the
    // stream: read once, with no event.
    await config.stopAgentOverlayWatch();
    writeFileSync(agentOverlayPath(), JSON.stringify({ schema: 1, agents: [] }));
    expect(await config.startAgentOverlayWatch()).toBe(true);
    const changed = config.agentOverlayDiskReads();
    await until('the reload of a file changed before the stream', () => config.agentEntry('owl') === null);
    expect(config.agentOverlayDiskReads()).toBe(changed + 1);
    await tick(CONFIG_DEBOUNCE_MS * 2);
    expect(config.agentOverlayDiskReads()).toBe(changed + 1);
  });

  it('the machines.json watch: a file changed between the last read and the stream start is read once, however long or short the wait; an unchanged one is not', async () => {
    ensureConfigDir();
    machines.loadMachines('boot');
    expect(machines.currentMachines().present).toBe(false);
    const queue = await holdQueue();
    const starting = machines.startMachinesWatch();
    writeFileSync(machines.machinesPath(), JSON.stringify({ schema: 1, machines: [] }));
    await tick(CONFIG_DEBOUNCE_MS + 100);
    const before = machines.machinesDiskReads();
    await queue.release();
    expect(await starting).toBe(true);
    await until('the reload', () => machines.currentMachines().present);
    expect(machines.machinesDiskReads()).toBe(before + 1);

    await machines.stopMachinesWatch();
    expect(await machines.startMachinesWatch()).toBe(true);
    const settled = machines.machinesDiskReads();
    await tick(CONFIG_DEBOUNCE_MS * 2);
    expect(machines.machinesDiskReads()).toBe(settled);

    await machines.stopMachinesWatch();
    rmSync(machines.machinesPath());
    expect(await machines.startMachinesWatch()).toBe(true);
    const changed = machines.machinesDiskReads();
    await until('the reload of a file removed before the stream', () => !machines.currentMachines().present);
    expect(machines.machinesDiskReads()).toBe(changed + 1);
  });

  it('the harvest: a record written while its root watch waits to start is found when the stream is live, not at the next poll', async () => {
    const home = mkdtempSync(join(scratch, 'home-'));
    const cwd = mkdtempSync(join(scratch, 'cwd-'));
    const sessions = join(home, '.codex', 'sessions');
    mkdirSync(sessions, { recursive: true });
    const queue = await holdQueue();
    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      // A poll that never comes inside the test, so only the fast channel can find it.
      { home, env: {}, pollIntervalMs: 600_000, timeoutMs: 10_000, graceMs: 200, claimant: 'p365-harvest-late' }
    );
    watch.promise.catch(() => undefined);
    try {
      // The arm's own first listing has run and found nothing.
      await tick(50);
      // Written while the root's watch waits its turn: no stream will ever report it.
      writeRollout(sessions, cwd);
      await queue.release();
      await until('the root watch', () => nativeFor(sessions).length === 1);
      // No event is ever delivered here: only the listing at the stream's start can find it.
      const got = await within('the harvest to find the record once its stream is live', 3_000, watch.promise);
      expect(got.sessionId).toBe(ROLLOUT_ID);
    } finally {
      watch.cancel();
    }
  });
});

// ---------------------------------------------------------------------------
// The fix round: a watch that has ENDED is said so, once
// ---------------------------------------------------------------------------

describe('a watch that has ended', () => {
  it('each configuration watch says once, in its own words, that it stopped watching, and reloads nothing', async () => {
    ensureConfigDir();
    config.loadAgentOverlay('boot');
    machines.loadMachines('boot');
    expect(await config.startAgentOverlayWatch()).toBe(true);
    expect(await machines.startMachinesWatch()).toBe(true);
    const subs = nativeFor(configDir());
    expect(subs).toHaveLength(2);
    const overlay = config.agentOverlayDiskReads();
    const machine = machines.machinesDiskReads();
    const ENDED = 'The file watcher kept exiting, so Tortie stopped it. This folder is not watched until Tortie starts again.';
    for (const s of subs) {
      s.cb(new Error(ENDED), []);
      s.cb(new Error(ENDED), []);
    }
    await tick(CONFIG_DEBOUNCE_MS * 2);
    expect(config.agentOverlayDiskReads()).toBe(overlay);
    expect(machines.machinesDiskReads()).toBe(machine);
    const said = warns('config').filter((w) => w.includes('kept exiting'));
    expect(said).toEqual([
      `not watching ${configDir()} for changes: ${ENDED.replace(/\.$/, '')}. Tortie will still re-read agents.json when you ask it to.`,
      `not watching ${configDir()} for machine changes: ${ENDED.replace(/\.$/, '')}. Tortie will still re-read machines.json when you ask it to.`
    ]);
  });
});

// ---------------------------------------------------------------------------
// D10 and D6: a re-scan notice
// ---------------------------------------------------------------------------

describe('a re-scan notice (D10, D6)', () => {
  const DROPPED = 'Events were dropped by the FSEvents client. File system must be re-scanned.';

  it('each configuration watch reloads on a dropped batch, and on no other error', async () => {
    ensureConfigDir();
    config.loadAgentOverlay('boot');
    machines.loadMachines('boot');
    expect(await config.startAgentOverlayWatch()).toBe(true);
    expect(await machines.startMachinesWatch()).toBe(true);
    const subs = nativeFor(configDir());
    expect(subs).toHaveLength(2);
    const overlay = config.agentOverlayDiskReads();
    const machine = machines.machinesDiskReads();

    // A fatal error kills a subscription; it is not a reason to re-read.
    for (const s of subs) s.cb(new Error('Error starting FSEvents stream'), []);
    await tick(CONFIG_DEBOUNCE_MS * 2);
    expect(config.agentOverlayDiskReads()).toBe(overlay);
    expect(machines.machinesDiskReads()).toBe(machine);

    // A drop is: the events in it were lost, and they may have named the file.
    for (const s of subs) s.cb(new Error(DROPPED), []);
    await until(
      'one reload each',
      () =>
        config.agentOverlayDiskReads() === overlay + 1 &&
        machines.machinesDiskReads() === machine + 1
    );
    await tick(CONFIG_DEBOUNCE_MS * 2);
    expect(config.agentOverlayDiskReads()).toBe(overlay + 1);
    expect(machines.machinesDiskReads()).toBe(machine + 1);
  });

  it('a restart delivered through the host: RepoWatcher re-reads and counts it, each configuration watch reloads once, every live watch re-bound', async () => {
    ensureConfigDir();
    config.loadAgentOverlay('boot');
    machines.loadMachines('boot');
    expect(await config.startAgentOverlayWatch()).toBe(true);
    expect(await machines.startMachinesWatch()).toBe(true);
    const repo = mkdtempSync(join(scratch, 'repo-'));
    mkdirSync(join(repo, '.git'));
    const root = canonicalPathSync(repo);
    const gitDir = canonicalPathSync(join(repo, '.git'));
    let changes = 0;
    const rw = await RepoWatcher.watch(repo, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        changes += 1;
      },
      onError: () => undefined
    });
    try {
      await tick(DEBOUNCE_MS * 5);
      changes = 0;
      const overlay = config.agentOverlayDiskReads();
      const machine = machines.machinesDiskReads();
      const restarts = watcherProcessObservation().restarts;
      const bound = { root: native.filter((s) => s.dir === root).length, git: native.filter((s) => s.dir === gitDir).length, config: native.filter((s) => s.dir === configDir()).length };

      // A close the native module never finishes. Past the host's close bound
      // it replaces its process and re-binds every live watch (D5, D6).
      const stuck = mkdtempSync(join(scratch, 'stuck-'));
      shapes.set(stuck, { holdClose: new Promise<void>(() => undefined) });
      const w = await watchFolder(stuck, {}, () => undefined);
      expect(w).not.toBeNull();
      await within('the stuck close to settle at its bound', 5_000, w!.close());
      await until('the host to replace its process', () => watcherProcessObservation().restarts > restarts, 5_000);

      await until('every live watch re-bound', () =>
        native.filter((s) => s.dir === root).length === bound.root + 1 &&
        native.filter((s) => s.dir === gitDir).length === bound.git + 1 &&
        native.filter((s) => s.dir === configDir()).length === bound.config + 2
      , 5_000);
      await until('the re-read', () => changes >= 1);
      await until(
        'one reload each',
        () =>
          config.agentOverlayDiskReads() === overlay + 1 &&
          machines.machinesDiskReads() === machine + 1
      );
      // The worktree and the .git watch were each handed one notice.
      expect(rw.observation.drops).toBe(2);
      await tick(CONFIG_DEBOUNCE_MS * 2);
      expect(changes).toBe(1);
      expect(config.agentOverlayDiskReads()).toBe(overlay + 1);
      expect(machines.machinesDiskReads()).toBe(machine + 1);
    } finally {
      await rw.dispose();
    }
  }, 20_000);
});

// ---------------------------------------------------------------------------
// D11: one tracked close per close
// ---------------------------------------------------------------------------

describe('closes (D11)', () => {
  it('no site tracks a close a second time: exactly one pending close while the native module holds it', async () => {
    // RepoWatcher, its worktree watch.
    const repo = mkdtempSync(join(scratch, 'repo-'));
    const root = canonicalPathSync(repo);
    const rw = await RepoWatcher.watch(repo, { onChange: () => undefined });
    expect(pendingWatcherCloseCount()).toBe(0);
    let gate = deferred();
    shapes.set(root, { holdClose: gate.promise });
    const disposing = rw.dispose();
    await until('the worktree close', () => closesAsked.includes(root));
    expect(pendingWatcherCloseCount()).toBe(1);
    gate.release();
    await disposing;
    expect(pendingWatcherCloseCount()).toBe(0);

    // The two configuration watches, one folder.
    ensureConfigDir();
    const dir = configDir();
    for (const [start, stop] of [
      [config.startAgentOverlayWatch, config.stopAgentOverlayWatch],
      [machines.startMachinesWatch, machines.stopMachinesWatch]
    ] as const) {
      expect(await start()).toBe(true);
      gate = deferred();
      shapes.set(dir, { holdClose: gate.promise });
      closesAsked.length = 0;
      const stopping = stop();
      await until('the configuration close', () => closesAsked.includes(dir));
      expect(pendingWatcherCloseCount()).toBe(1);
      gate.release();
      await stopping;
      expect(pendingWatcherCloseCount()).toBe(0);
    }

    // The harvest, closed by its cancel.
    const home = mkdtempSync(join(scratch, 'home-'));
    const cwd = mkdtempSync(join(scratch, 'cwd-'));
    const sessions = join(home, '.codex', 'sessions');
    mkdirSync(sessions, { recursive: true });
    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, env: {}, pollIntervalMs: 600_000, timeoutMs: 10_000, claimant: 'p365-close' }
    );
    watch.promise.catch(() => undefined);
    await until('the harvest watch', () => nativeFor(sessions).length === 1);
    gate = deferred();
    shapes.set(sessions, { holdClose: gate.promise });
    watch.cancel();
    await until('the harvest close', () => closesAsked.includes(sessions));
    expect(pendingWatcherCloseCount()).toBe(1);
    gate.release();
    await until('the harvest close to settle', () => pendingWatcherCloseCount() === 0);
  });
});

// ---------------------------------------------------------------------------
// D8: while the app quits. LAST, because the transition is one way.
// ---------------------------------------------------------------------------

describe('while the app quits (D8)', () => {
  it('every site takes its not-watching path, nothing native is asked, and the worktree says its folder is there', async () => {
    const repo = mkdtempSync(join(scratch, 'repo-'));
    ensureConfigDir();
    const home = mkdtempSync(join(scratch, 'home-'));
    const cwd = mkdtempSync(join(scratch, 'cwd-'));
    const sessions = join(home, '.codex', 'sessions');
    mkdirSync(sessions, { recursive: true });

    markAppQuitting();
    const before = asked.length;

    await expect(RepoWatcher.watch(repo, { onChange: () => undefined })).rejects.toThrow(
      `the file watcher did not watch ${repo}`
    );
    expect(await config.startAgentOverlayWatch()).toBe(false);
    expect(await machines.startMachinesWatch()).toBe(false);
    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, env: {}, pollIntervalMs: 50, maxPollIntervalMs: 50, timeoutMs: 10_000, claimant: 'p365-quit' }
    );
    try {
      writeRollout(sessions, cwd);
      const got = await within('the harvest to settle by its poll', 3_000, watch.promise);
      expect(got.sessionId).toBe(ROLLOUT_ID);
    } finally {
      watch.cancel();
    }
    expect(asked.length).toBe(before);
  });
});
