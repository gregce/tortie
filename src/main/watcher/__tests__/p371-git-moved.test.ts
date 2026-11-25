/**
 * PHASE 371: what `RepoWatcher` says about git's own data with each flush
 * (build/p371/SPEC.md D2 to D7, rows W1 to W14).
 *
 * Check type: contract test over an injected @parcel/watcher, in the shape of
 * repo-watcher-contract.test.ts, so no FSEvents stream is ever opened. The
 * repositories are real ones made by git in a scratch folder, because which
 * files a linked worktree or a separate git directory holds is git's to say. No
 * git runs while a watcher is being read.
 *
 * What is pinned is the DIRECTION. `false` is the only word that can leave a
 * person looking at something old, so every row below that expects `true` is a
 * way the watcher could not know, and the rows that expect `false` are only
 * there to prove the fact is not simply always true.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// The native module, faked, and two hooks
// ---------------------------------------------------------------------------

interface FakeEvent {
  path: string;
  type: 'create' | 'update' | 'delete';
}
interface FakeSub {
  dir: string;
  cb: (err: Error | null, events: FakeEvent[]) => void;
}

const subs: FakeSub[] = [];
/** Folders whose native subscribe answers only after this many milliseconds. */
const holdMs = new Map<string, number>();

vi.mock('@parcel/watcher', () => {
  const subscribe = async (
    dir: string,
    cb: FakeSub['cb']
  ): Promise<{ unsubscribe: () => Promise<void> }> => {
    const ms = holdMs.get(dir);
    if (ms !== undefined) await new Promise((r) => setTimeout(r, ms));
    subs.push({ dir, cb });
    return { unsubscribe: () => Promise.resolve() };
  };
  return { default: { subscribe }, subscribe };
});

/** Called as a folder's watch is asked how long it waited, which both D9 lines do. */
const onAskedHowLong = new Map<string, () => void>();

vi.mock('../host', async (importOriginal) => {
  const real = await importOriginal<typeof import('../host')>();
  return {
    ...real,
    watchFolder: async (...args: Parameters<typeof real.watchFolder>) => {
      const watch = await real.watchFolder(...args);
      if (watch === null) return null;
      return {
        dir: watch.dir,
        close: () => watch.close(),
        get startedAfterMs() {
          onAskedHowLong.get(watch.dir)?.();
          return watch.startedAfterMs;
        }
      };
    }
  };
});

/** When set, a stat of a path ending in this fails as a disk that cannot be read does. */
let failingSuffix: string | null = null;
vi.mock('node:fs', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs')>();
  const lstatSync = ((path: string, options: { bigint: true }) => {
    if (failingSuffix !== null && path.endsWith(failingSuffix)) {
      throw Object.assign(new Error('EIO: i/o error'), { code: 'EIO' });
    }
    return real.lstatSync(path, options);
  }) as unknown as typeof real.lstatSync;
  return { ...real, default: { ...real, lstatSync }, lstatSync };
});

vi.mock('../../log', () => ({
  getLog: () => ({
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    debug: () => undefined
  })
}));

const { RepoWatcher, isRelevantDotGitPath } = await import('../repo-watcher');
const { WATCHER_RESTART_ERROR, watchFolder } = await import('../host');
const { canonicalPathSync } = await import('../../fs/folder-identity');

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 20;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const DROP = new Error('Events were dropped by the FSEvents client. File system must be re-scanned.');

let base = '';
let dir = '';
const savedEnv = { ...process.env };

/**
 * PHASE 365: the host's first watch in a file loads its queue by a dynamic
 * import, longer than this file's 20 ms window under load, and D9 would flush.
 * Paid once, here, as repo-watcher-observation.test.ts pays it.
 */
beforeAll(async () => {
  base = canonicalPathSync(mkdtempSync(join(tmpdir(), 'gmux-p371-moved-')));
  mkdirSync(join(base, 'home'));
  // A suite started from a git hook would carry GIT_DIR, which is another row.
  for (const k of Object.keys(process.env)) if (k.startsWith('GIT_')) delete process.env[k];
  process.env.HOME = join(base, 'home');
  process.env.GIT_CONFIG_GLOBAL = join(base, 'home', 'global');
  process.env.GIT_CONFIG_NOSYSTEM = '1';
  for (const k of ['AUTHOR', 'COMMITTER']) {
    process.env[`GIT_${k}_NAME`] = 'a';
    process.env[`GIT_${k}_EMAIL`] = 'a@x';
  }
  const watch = await watchFolder(base, {}, () => undefined);
  await watch?.close();
});
afterAll(() => {
  for (const k of Object.keys(process.env)) if (!(k in savedEnv)) delete process.env[k];
  Object.assign(process.env, savedEnv);
  rmSync(base, { recursive: true, force: true });
});

let n = 0;
beforeEach(() => {
  subs.length = 0;
  holdMs.clear();
  onAskedHowLong.clear();
  failingSuffix = null;
  n += 1;
  dir = join(base, `p${n}`);
  mkdirSync(dir);
});

type Watcher = Awaited<ReturnType<typeof RepoWatcher.watch>>;
const open: Watcher[] = [];
afterEach(async () => {
  failingSuffix = null;
  for (const rw of open.splice(0)) await rw.dispose();
});

const git = (cwd: string, ...args: string[]): void => {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
};
const init = (at = dir): string => {
  git(at, 'init', '-q', '-b', 'main');
  return join(at, '.git');
};

interface Driven {
  rw: Watcher;
  calls: [string, boolean][];
  errors: Error[];
  worktree: FakeSub;
  /** The last `.git` subscription that answered. */
  dotgit: () => FakeSub;
  /** Wait for the next flush and answer what it said. */
  next: () => Promise<boolean>;
  /** One saved file, and what its flush said. */
  save: () => Promise<boolean>;
  /** Hand the `.git` stream one event for a path in the git directory. */
  gitEvent: (rel: string, type?: FakeEvent['type']) => void;
  /** Saves until the flush is the first and everything pending is taken. */
  settled: () => Promise<void>;
}

async function drive(at = dir): Promise<Driven> {
  const calls: [string, boolean][] = [];
  const errors: Error[] = [];
  const rw = await RepoWatcher.watch(at, {
    debounceMs: DEBOUNCE_MS,
    onChange: (...args) => calls.push(args),
    onError: (err) => errors.push(err)
  });
  open.push(rw);
  const worktree = subs.find((s) => s.dir === at)!;
  const dotgit = (): FakeSub => subs.filter((s) => s.dir !== at).at(-1)!;
  const next = async (): Promise<boolean> => {
    const before = calls.length;
    for (let i = 0; i < 400 && calls.length === before; i += 1) await wait(5);
    if (calls.length === before) throw new Error('no flush came');
    return calls[calls.length - 1]![1];
  };
  const save = (): Promise<boolean> => {
    const said = next();
    worktree.cb(null, [{ path: join(at, 'a.txt'), type: 'update' }]);
    return said;
  };
  return {
    rw,
    calls,
    errors,
    worktree,
    dotgit,
    next,
    save,
    gitEvent: (rel, type = 'update') => {
      const s = dotgit();
      s.cb(null, [{ path: rel === '' ? s.dir : join(s.dir, rel), type }]);
    },
    settled: async () => {
      await save();
      expect(await save()).toBe(false);
    }
  };
}

const saves = async (d: Driven, count: number): Promise<boolean[]> => {
  const out: boolean[] = [];
  for (let i = 0; i < count; i += 1) out.push(await d.save());
  return out;
};

/** A private member read or called the way only a test may. */
interface Inside {
  takeGitMoved(): boolean;
}

// ---------------------------------------------------------------------------
// The bit
// ---------------------------------------------------------------------------

describe('what a flush says about git\'s own data', () => {
  it('W1: a saved file is false once everything is known, beside the path as it was given', async () => {
    init();
    const d = await drive();
    await d.settled();
    d.calls.length = 0;
    await d.save();
    expect(d.calls).toEqual([[d.rw.repoPath, false]]);
  });

  it('W2: a relevant .git event is true, and an irrelevant one flushes nothing', async () => {
    init();
    const d = await drive();
    await d.settled();
    const said = d.next();
    d.gitEvent('refs/heads/main');
    expect(await said).toBe(true);
    expect(await d.save()).toBe(false);

    const before = d.calls.length;
    d.gitEvent('index.lock', 'create');
    d.gitEvent('COMMIT_EDITMSG');
    await wait(DEBOUNCE_MS * 4);
    expect(d.calls).toHaveLength(before);
    expect(await d.save()).toBe(false);
  });

  it('W3: a file and a ref in one window are one true, in either order', async () => {
    init();
    const d = await drive();
    await d.settled();
    const before = d.calls.length;

    let said = d.next();
    d.gitEvent('refs/heads/main');
    d.worktree.cb(null, [{ path: join(dir, 'a.txt'), type: 'update' }]);
    expect(await said).toBe(true);

    said = d.next();
    d.worktree.cb(null, [{ path: join(dir, 'a.txt'), type: 'update' }]);
    d.gitEvent('HEAD');
    expect(await said).toBe(true);

    await wait(DEBOUNCE_MS * 4);
    expect(d.calls.length - before).toBe(2);
    expect(await d.save()).toBe(false);
  });

  it('W4: a dropped batch is true, on either stream', async () => {
    init();
    const d = await drive();
    await d.settled();
    for (const stream of [d.worktree, d.dotgit()]) {
      const said = d.next();
      stream.cb(DROP, []);
      expect(await said).toBe(true);
      expect(await d.save()).toBe(false);
    }
  });

  // Phase 151's rule inside a window a saved file already opened: the drop
  // must still make that one flush true, on either stream (the lens B gap).
  it('W4: a dropped batch inside a window a saved file opened is true, on either stream', async () => {
    init();
    const d = await drive();
    await d.settled();
    for (const stream of [d.worktree, d.dotgit()]) {
      const before = d.calls.length;
      const said = d.next();
      d.worktree.cb(null, [{ path: join(dir, 'a.txt'), type: 'update' }]);
      stream.cb(DROP, []);
      expect(await said).toBe(true);
      await wait(DEBOUNCE_MS * 4);
      expect(d.calls.length - before).toBe(1);
      expect(await d.save()).toBe(false);
    }
  });

  // The other sources of true are taken as the line under test asks how long
  // its watch waited, so what the flush says is what that line set.
  it('W5: a worktree watch that waited re-reads once, as true', async () => {
    init();
    holdMs.set(dir, DEBOUNCE_MS * 3);
    let self: Inside | null = null;
    const proto = RepoWatcher.prototype as unknown as {
      tryStartDotgitWatcher: () => Promise<void>;
    };
    const spy = vi
      .spyOn(proto, 'tryStartDotgitWatcher')
      .mockImplementation(function (this: unknown) {
        self = this as Inside;
        spy.mockRestore();
        return proto.tryStartDotgitWatcher.call(this);
      });
    onAskedHowLong.set(dir, () => {
      self?.takeGitMoved();
    });
    const d = await drive();
    expect(self).not.toBeNull();
    if (d.calls.length === 0) await d.next();
    expect(d.calls).toEqual([[d.rw.repoPath, true]]);
    expect(await d.save()).toBe(false);
  });

  it('W5: a .git watch that waited re-reads once, as true', async () => {
    const d = await drive();
    const gitDir = init();
    holdMs.set(gitDir, DEBOUNCE_MS * 3);
    onAskedHowLong.set(gitDir, () => {
      (d.rw as unknown as Inside).takeGitMoved();
    });
    expect(await d.save()).toBe(true);
    expect(await d.next()).toBe(true);
    expect(await saves(d, 2)).toEqual([false, false]);
  });

  it('W6: the first flush is true, the second false, and a true is taken once', async () => {
    init();
    const d = await drive();
    expect(await saves(d, 2)).toEqual([true, false]);
    const said = d.next();
    d.gitEvent('packed-refs');
    expect(await said).toBe(true);
    expect(await saves(d, 2)).toEqual([false, false]);
  });

  it('W7: with no .git every flush is true, and one that appears is true until it attaches and once after', async () => {
    const d = await drive();
    expect(await saves(d, 3)).toEqual([true, true, true]);
    init();
    // The flush that finds it has no stream yet, and the next covers the gap.
    expect(await saves(d, 4)).toEqual([true, true, false, false]);
    expect(subs).toHaveLength(2);
  });

  it('W7: while the .git watch waits for its turn every flush is true', async () => {
    const d = await drive();
    const gitDir = init();
    holdMs.set(gitDir, DEBOUNCE_MS * 30);
    expect(await saves(d, 4)).toEqual([true, true, true, true]);
    expect(subs).toHaveLength(1);
  });

  it('W8: a linked worktree is true on every flush, and its main worktree is not', async () => {
    const main = join(dir, 'main');
    const linked = join(dir, 'linked');
    mkdirSync(main);
    init(main);
    git(main, 'commit', '-q', '--allow-empty', '-m', 'c');
    git(main, 'worktree', 'add', '-q', '-b', 'wt', linked);
    const d = await drive(linked);
    expect(d.dotgit().dir).toBe(join(main, '.git', 'worktrees', 'linked'));
    expect(await saves(d, 3)).toEqual([true, true, true]);
    const m = await drive(main);
    expect(await saves(m, 3)).toEqual([true, false, false]);
  });

  describe('W9: refs that are not all under the watched directory', () => {
    const names: [string, 'file' | 'folder'][] = [
      ['config', 'file'],
      ['config.worktree', 'file'],
      ['packed-refs', 'file'],
      ['refs', 'folder'],
      ['refs/heads', 'folder'],
      ['refs/remotes', 'folder'],
      ['refs/tags', 'folder'],
      ['reftable', 'folder'],
      ['reftable/tables.list', 'file'],
      ['FETCH_HEAD', 'file']
    ];
    it.each(names)('%s a symbolic link is true on every flush, once more when it is not one again, then false', async (name, kind) => {
      const gitDir = init();
      const out = join(dir, 'out');
      mkdirSync(out);
      const at = join(gitDir, name);
      const there = join(out, basename(name));
      mkdirSync(dirname(at), { recursive: true });
      if (existsSync(at)) renameSync(at, there);
      else if (kind === 'folder') mkdirSync(there);
      else writeFileSync(there, '');
      symlinkSync(there, at);
      const d = await drive();
      expect(await saves(d, 3)).toEqual([true, true, true]);
      unlinkSync(at);
      renameSync(there, at);
      expect(await saves(d, 2)).toEqual([true, false]);
    });

    it('.git itself a symbolic link is whole', async () => {
      const gitDir = init();
      const moved = join(base, `moved${n}.git`);
      renameSync(gitDir, moved);
      symlinkSync(moved, gitDir);
      const d = await drive();
      expect(d.dotgit().dir).toBe(moved);
      expect(await saves(d, 3)).toEqual([true, false, false]);
    });

    it('a separate git directory is whole', async () => {
      const moved = join(base, `separate${n}.git`);
      git(dir, 'init', '-q', '-b', 'main', `--separate-git-dir=${moved}`, dir);
      const d = await drive();
      expect(d.dotgit().dir).toBe(moved);
      expect(await saves(d, 3)).toEqual([true, false, false]);
    });
  });

  describe('W10: a .git stream that may be dead is true for good', () => {
    it('after an ordinary drop it is not', async () => {
      init();
      const d = await drive();
      await d.settled();
      d.dotgit().cb(DROP, []);
      expect(await d.next()).toBe(true);
      expect(await saves(d, 2)).toEqual([false, false]);
    });

    it('a fatal error', async () => {
      init();
      const d = await drive();
      await d.settled();
      d.dotgit().cb(new Error('the watch has ended'), []);
      expect(d.errors).toHaveLength(1);
      expect(await saves(d, 3)).toEqual([true, true, true]);
    });

    it('the watcher process replaced', async () => {
      init();
      const d = await drive();
      await d.settled();
      d.dotgit().cb(new Error(WATCHER_RESTART_ERROR), []);
      expect(await d.next()).toBe(true);
      expect(await saves(d, 3)).toEqual([true, true, true]);
    });

    it('the git directory deleted, which flushes nothing by itself', async () => {
      init();
      const d = await drive();
      await d.settled();
      const before = d.calls.length;
      d.gitEvent('', 'delete');
      await wait(DEBOUNCE_MS * 4);
      expect(d.calls).toHaveLength(before);
      expect(await saves(d, 3)).toEqual([true, true, true]);
    });

    it('the git directory deleted, behind a relevant event in the same batch', async () => {
      init();
      const d = await drive();
      await d.settled();
      const s = d.dotgit();
      s.cb(null, [
        { path: join(s.dir, 'HEAD'), type: 'delete' },
        { path: s.dir, type: 'delete' }
      ]);
      expect(await d.next()).toBe(true);
      expect(await saves(d, 3)).toEqual([true, true, true]);
    });

    it('the git directory touched and not deleted is not that', async () => {
      init();
      const d = await drive();
      await d.settled();
      d.gitEvent('', 'update');
      expect(await saves(d, 2)).toEqual([false, false]);
    });
  });

  describe('W11: a .git that is not the one being watched is true for good', () => {
    it('made again in the same place', async () => {
      const gitDir = init();
      const d = await drive();
      await d.settled();
      rmSync(gitDir, { recursive: true });
      init();
      expect(await saves(d, 4)).toEqual([true, true, true, true]);
    });

    it('renamed away and back, a flush between', async () => {
      const gitDir = init();
      const d = await drive();
      await d.settled();
      renameSync(gitDir, join(dir, '.g'));
      expect(await d.save()).toBe(true);
      renameSync(join(dir, '.g'), gitDir);
      expect(await saves(d, 4)).toEqual([true, true, true, true]);
    });

    it('a .git file that points somewhere else', async () => {
      const one = join(base, `one${n}.git`);
      const two = join(base, `two${n}.git`);
      git(dir, 'init', '-q', '-b', 'main', `--separate-git-dir=${one}`, dir);
      const other = join(base, `other${n}`);
      mkdirSync(other);
      git(other, 'init', '-q', '-b', 'main', `--separate-git-dir=${two}`, other);
      const d = await drive();
      await d.settled();
      writeFileSync(join(dir, '.git'), `gitdir: ${two}\n`);
      expect(await saves(d, 4)).toEqual([true, true, true, true]);
    });

    it('replaced while its watch waited for its turn', async () => {
      const d = await drive();
      const gitDir = init();
      holdMs.set(gitDir, DEBOUNCE_MS * 2);
      expect(await d.save()).toBe(true);
      rmSync(gitDir, { recursive: true });
      init();
      await wait(DEBOUNCE_MS * 6);
      expect(subs).toHaveLength(2);
      expect(await saves(d, 4)).toEqual([true, true, true, true]);
    });
  });
});

// ---------------------------------------------------------------------------
// The filter and the stamp
// ---------------------------------------------------------------------------

describe('W12: the names that joined the filter', () => {
  it.each(['config', 'config.worktree', 'reftable/tables.list'])('%s is one we care about', (rel) => {
    expect(isRelevantDotGitPath(rel)).toBe(true);
    expect(isRelevantDotGitPath(`${rel}.lock`)).toBe(false);
  });
  it.each(['reftable/x.ref', 'reftable', 'shallow', 'info/grafts', 'configs', 'x/config'])('%s is not', (rel) => {
    expect(isRelevantDotGitPath(rel)).toBe(false);
  });
  it('a config event flushes, as true', async () => {
    init();
    const d = await drive();
    await d.settled();
    const said = d.next();
    d.gitEvent('config');
    expect(await said).toBe(true);
  });
});

describe('W13: a file no stream carries is true once at the next save', () => {
  const cases: [string, (gitDir: string) => string][] = [
    ['config', (g) => join(g, 'config')],
    ['config.worktree', (g) => join(g, 'config.worktree')],
    ['shallow', (g) => join(g, 'shallow')],
    ['info/grafts', (g) => join(g, 'info', 'grafts')],
    ['objects/info/alternates', (g) => join(g, 'objects', 'info', 'alternates')],
    ['an included file', () => join(dir, 'inc')]
  ];
  it.each(cases)('%s written, changed and removed', async (name, pathIn) => {
    const gitDir = init();
    git(dir, 'config', 'include.path', '../inc');
    const path = pathIn(gitDir);
    const keep = name === 'config' ? '[include]\n\tpath = ../inc\n' : '';
    mkdirSync(dirname(path), { recursive: true });
    const d = await drive();
    await d.settled();
    writeFileSync(path, `${keep}# one\n`);
    expect(await saves(d, 2)).toEqual([true, false]);
    writeFileSync(path, `${keep}# two, longer\n`);
    expect(await saves(d, 2)).toEqual([true, false]);
    rmSync(path);
    expect(await saves(d, 2)).toEqual([true, false]);
  });

  it('a stamp that moved behind a true is not said a second time', async () => {
    const gitDir = init();
    const d = await drive();
    await d.settled();
    writeFileSync(join(gitDir, 'shallow'), 'x');
    const said = d.next();
    d.gitEvent('HEAD');
    expect(await said).toBe(true);
    expect(await d.save()).toBe(false);
  });
});

describe('W14: a disk that cannot be read', () => {
  it('is true, throws nothing out of the flush, and is over when it can', async () => {
    init();
    const d = await drive();
    await d.settled();
    failingSuffix = '/shallow';
    expect(await saves(d, 2)).toEqual([true, true]);
    expect(d.errors).toEqual([]);
    failingSuffix = null;
    expect(await saves(d, 2)).toEqual([true, false]);
  });
});
