/**
 * RepoWatcher CONTRACT tests over an injected @parcel/watcher (Phase 145
 * stage 5).
 *
 * Check type: pure contract or state test. Environment requirement: node and
 * the repository's installed dependencies only; no FSEvents subscription is
 * ever opened. Skip rule: never skips.
 *
 * The native module is mocked, and every event below is delivered by calling
 * the callback the watcher registered, so what is proven here is the
 * CONTRACT: which directories are subscribed with which exclusions, how
 * events coalesce inside one debounce window, which dotgit paths are relevant
 * and which are noise, what a late `git init` attaches, and that dispose
 * unsubscribes everything it opened. Whether macOS FSEvents actually delivers
 * events that honor this contract is the separate native lane,
 * `repo-watcher.native.test.ts`, which runs the same class over the real
 * primitive.
 *
 * PHASE 151 ADDED TWO GROUPS HERE. The first pins which exclusions reach
 * `subscribe`, including the eight path ceiling. The second pins the drop:
 * that a "must be re-scanned" error produces an onChange, that a storm of
 * them still produces one per window, and that a FATAL error does not. What
 * this file cannot prove is that a real FSEvents stream drops less often with
 * the exclusions on, or that the tree actually recovers afterwards. Both need
 * a real stream under real churn for a real minute, and both belong to the
 * verifier's churn run rather than here.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeEvent {
  path: string;
  type: 'create' | 'update' | 'delete';
}

interface FakeSub {
  dir: string;
  cb: (err: Error | null, events: FakeEvent[]) => void;
  ignore: (string | RegExp)[];
  unsubscribed: boolean;
}

/** Every subscription the class opened, in order. */
const subs: FakeSub[] = [];

vi.mock('@parcel/watcher', () => {
  const subscribe = (
    dir: string,
    cb: (err: Error | null, events: FakeEvent[]) => void,
    opts?: { ignore?: (string | RegExp)[] }
  ): Promise<{ unsubscribe: () => Promise<void> }> => {
    const rec: FakeSub = {
      dir,
      cb,
      ignore: opts?.ignore ?? [],
      unsubscribed: false
    };
    subs.push(rec);
    return Promise.resolve({
      unsubscribe: () => {
        rec.unsubscribed = true;
        return Promise.resolve();
      }
    });
  };
  return { default: { subscribe }, subscribe };
});

const {
  RepoWatcher,
  isRelevantDotGitPath,
  isRescanRequired,
  readGitdirPointer
} = await import('../repo-watcher');

/** Fast debounce so a window can be crossed with a short real wait. */
const DEBOUNCE_MS = 20;

const flushWindow = (): Promise<void> =>
  new Promise((r) => setTimeout(r, DEBOUNCE_MS * 4));

let dir = '';

beforeEach(() => {
  subs.length = 0;
  dir = mkdtempSync(join(tmpdir(), 'gmux-watch-contract-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('RepoWatcher contract over an injected backend', () => {
  it('subscribes the worktree with .git excluded, and the dotgit dir with its firehose subtrees excluded', async () => {
    mkdirSync(join(dir, '.git'));
    const rw = await RepoWatcher.watch(dir, { onChange: () => undefined });
    try {
      expect(subs).toHaveLength(2);
      const [worktree, dotgit] = subs;
      expect(worktree!.ignore).toEqual([join(worktree!.dir, '.git')]);
      expect(dotgit!.ignore).toContain(join(dotgit!.dir, 'objects'));
      expect(dotgit!.ignore).toContain(join(dotgit!.dir, 'logs'));
    } finally {
      await rw.dispose();
    }
  });

  it('coalesces a burst of worktree events into one onChange naming the caller path verbatim', async () => {
    mkdirSync(join(dir, '.git'));
    const seen: string[] = [];
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: (p) => seen.push(p)
    });
    try {
      const worktree = subs[0]!;
      worktree.cb(null, [{ path: join(dir, 'a.txt'), type: 'update' }]);
      worktree.cb(null, [{ path: join(dir, 'b.txt'), type: 'create' }]);
      worktree.cb(null, [{ path: join(dir, 'c.txt'), type: 'update' }]);
      await flushWindow();
      expect(seen).toEqual([rw.repoPath]);
    } finally {
      await rw.dispose();
    }
  });

  it('fires for a ref change and stays quiet for objects and lock noise', async () => {
    mkdirSync(join(dir, '.git'));
    let fires = 0;
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        fires += 1;
      }
    });
    try {
      const dotgit = subs[1]!;
      dotgit.cb(null, [
        { path: join(dotgit.dir, 'refs', 'heads', 'main'), type: 'update' }
      ]);
      await flushWindow();
      expect(fires).toBe(1);

      dotgit.cb(null, [
        { path: join(dotgit.dir, 'objects', 'zz', 'fake'), type: 'create' },
        { path: join(dotgit.dir, 'index.lock'), type: 'create' }
      ]);
      await flushWindow();
      expect(fires).toBe(1);
    } finally {
      await rw.dispose();
    }
  });

  it('attaches the dotgit watcher on the flush after a late git init', async () => {
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => undefined
    });
    try {
      // Not a repo yet: only the worktree subscription exists.
      expect(subs).toHaveLength(1);

      mkdirSync(join(dir, '.git'));
      subs[0]!.cb(null, [{ path: join(dir, 'seed.txt'), type: 'create' }]);
      await flushWindow();
      expect(subs).toHaveLength(2);
      expect(subs[1]!.ignore).toContain(join(subs[1]!.dir, 'objects'));
    } finally {
      await rw.dispose();
    }
  });

  it('dispose unsubscribes every subscription it opened and stops the callbacks', async () => {
    mkdirSync(join(dir, '.git'));
    let fires = 0;
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        fires += 1;
      }
    });
    await rw.dispose();
    expect(subs.every((s) => s.unsubscribed)).toBe(true);

    subs[0]!.cb(null, [{ path: join(dir, 'late.txt'), type: 'create' }]);
    await flushWindow();
    expect(fires).toBe(0);
  });

  it('follows a gitdir pointer file to the real git dir', async () => {
    const real = mkdtempSync(join(tmpdir(), 'gmux-watch-gitdir-'));
    try {
      writeFileSync(join(dir, '.git'), `gitdir: ${real}\n`);
      const rw = await RepoWatcher.watch(dir, { onChange: () => undefined });
      try {
        expect(subs).toHaveLength(2);
        // FSEvents reports canonical paths, so the class subscribes realpaths.
        expect(subs[1]!.dir.endsWith(real.split('/').at(-1) as string)).toBe(
          true
        );
      } finally {
        await rw.dispose();
      }
    } finally {
      rmSync(real, { recursive: true, force: true });
    }
  });
});

describe('the worktree exclusions (Phase 151)', () => {
  it('excludes the repository\'s own ignored directories beside .git', async () => {
    execFileSync('git', ['init', '-b', 'main'], { cwd: dir });
    writeFileSync(join(dir, '.gitignore'), 'node_modules/\nscratch/\n');
    mkdirSync(join(dir, 'node_modules'));
    writeFileSync(join(dir, 'node_modules', 'a'), 'x');
    mkdirSync(join(dir, 'scratch'));
    writeFileSync(join(dir, 'scratch', 'a'), 'x');

    const rw = await RepoWatcher.watch(dir, { onChange: () => undefined });
    try {
      const worktree = subs[0]!;
      expect(worktree.ignore).toContain(join(worktree.dir, '.git'));
      expect(worktree.ignore).toContain(join(worktree.dir, 'node_modules'));
      expect(worktree.ignore).toContain(join(worktree.dir, 'scratch'));
    } finally {
      await rw.dispose();
    }
  });

  it('never passes more than eight plain paths, because the ninth disables all eight', async () => {
    execFileSync('git', ['init', '-b', 'main'], { cwd: dir });
    const names = Array.from({ length: 12 }, (_, i) => `ig${String(i).padStart(2, '0')}`);
    writeFileSync(join(dir, '.gitignore'), `${names.join('/\n')}/\n`);
    for (const n of names) {
      mkdirSync(join(dir, n));
      writeFileSync(join(dir, n, 'a'), 'x');
    }

    const rw = await RepoWatcher.watch(dir, { onChange: () => undefined });
    try {
      const ignore = subs[0]!.ignore;
      // A plain string is the only shape that consumes a CoreServices slot.
      // A RegExp is routed to the userspace matcher by
      // `node_modules/@parcel/watcher/wrapper.js` and costs nothing.
      const plain = ignore.filter((e) => typeof e === 'string');
      const overflow = ignore.filter((e): e is RegExp => e instanceof RegExp);
      expect(plain).toHaveLength(8);
      expect(overflow).toHaveLength(5);
      // Nothing was lost: twelve roots plus .git are all still represented.
      expect(ignore).toHaveLength(13);
      for (const m of overflow) {
        // Relative and anchored, which is what the userspace matcher wants:
        // it is run against the path relative to the watch root.
        expect(m.source.startsWith('^/')).toBe(false);
        expect(m.source.startsWith('^')).toBe(true);
        // No flags at all, because wrapper.js throws on any.
        expect(m.flags).toBe('');
      }
    } finally {
      await rw.dispose();
    }
  });

  it('subscribes with .git alone when the directory is not a repository', async () => {
    mkdirSync(join(dir, '.git'));
    const rw = await RepoWatcher.watch(dir, { onChange: () => undefined });
    try {
      expect(subs[0]!.ignore).toEqual([join(subs[0]!.dir, '.git')]);
    } finally {
      await rw.dispose();
    }
  });
});

describe('a dropped batch causes a re-read (Phase 151)', () => {
  const dropped = (): Error =>
    new Error(
      'Events were dropped by the FSEvents client. File system must be re-scanned.'
    );

  it('re-reads on a worktree drop, where it used to log and do nothing', async () => {
    mkdirSync(join(dir, '.git'));
    let fires = 0;
    const errors: string[] = [];
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        fires += 1;
      },
      onError: (e) => errors.push(e.message)
    });
    try {
      subs[0]!.cb(dropped(), []);
      await flushWindow();
      expect(fires).toBe(1);
      // The error is still reported. The re-read is in addition, not instead.
      expect(errors).toHaveLength(1);
    } finally {
      await rw.dispose();
    }
  });

  it('re-reads on a dotgit drop even though no path is known to be relevant', async () => {
    mkdirSync(join(dir, '.git'));
    let fires = 0;
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        fires += 1;
      },
      onError: () => undefined
    });
    try {
      subs[1]!.cb(dropped(), []);
      await flushWindow();
      expect(fires).toBe(1);
    } finally {
      await rw.dispose();
    }
  });

  it('does not discard the real events that arrived beside the error', async () => {
    // The library hands the error AND the batch to one callback
    // (Watcher.cc line 124), and the old early return threw the batch away.
    mkdirSync(join(dir, '.git'));
    let fires = 0;
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        fires += 1;
      },
      onError: () => undefined
    });
    try {
      subs[0]!.cb(dropped(), [{ path: join(dir, 'src/f2.go'), type: 'update' }]);
      await flushWindow();
      expect(fires).toBe(1);
    } finally {
      await rw.dispose();
    }
  });

  it('collapses a STORM of drops into one re-read per window', async () => {
    mkdirSync(join(dir, '.git'));
    let fires = 0;
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        fires += 1;
      },
      onError: () => undefined
    });
    try {
      for (let i = 0; i < 50; i++) subs[0]!.cb(dropped(), []);
      await flushWindow();
      expect(fires).toBe(1);
    } finally {
      await rw.dispose();
    }
  });

  it('does NOT re-read on a fatal error, which kills the subscription anyway', async () => {
    // Watcher.cc notifyError calls clearCallbacks(), so nothing can follow.
    mkdirSync(join(dir, '.git'));
    let fires = 0;
    const errors: string[] = [];
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        fires += 1;
      },
      onError: (e) => errors.push(e.message)
    });
    try {
      subs[0]!.cb(new Error('Error starting FSEvents stream'), []);
      await flushWindow();
      expect(fires).toBe(0);
      expect(errors).toEqual(['Error starting FSEvents stream']);
    } finally {
      await rw.dispose();
    }
  });

  it('stays quiet when a drop lands after dispose', async () => {
    mkdirSync(join(dir, '.git'));
    let fires = 0;
    const rw = await RepoWatcher.watch(dir, {
      debounceMs: DEBOUNCE_MS,
      onChange: () => {
        fires += 1;
      },
      onError: () => undefined
    });
    await rw.dispose();
    subs[0]!.cb(dropped(), []);
    await flushWindow();
    expect(fires).toBe(0);
  });
});

describe('the pure filters', () => {
  it('accepts head, refs and sequencer state and refuses locks and noise', () => {
    expect(isRelevantDotGitPath('HEAD')).toBe(true);
    expect(isRelevantDotGitPath('packed-refs')).toBe(true);
    expect(isRelevantDotGitPath('refs/heads/main')).toBe(true);
    expect(isRelevantDotGitPath('rebase-merge/head-name')).toBe(true);
    expect(isRelevantDotGitPath('index')).toBe(true);
    expect(isRelevantDotGitPath('index.lock')).toBe(false);
    expect(isRelevantDotGitPath('refs/heads/main.lock')).toBe(false);
    expect(isRelevantDotGitPath('objects/zz/fake')).toBe(false);
    expect(isRelevantDotGitPath('')).toBe(false);
  });

  it('recognises all three macOS drop messages and no other error', () => {
    // FSEventsBackend.cc lines 84, 86 and 88, verbatim.
    expect(
      isRescanRequired(
        new Error(
          'Events were dropped by the FSEvents client. File system must be re-scanned.'
        )
      )
    ).toBe(true);
    expect(
      isRescanRequired(
        new Error(
          'Events were dropped by the kernel. File system must be re-scanned.'
        )
      )
    ).toBe(true);
    expect(
      isRescanRequired(
        new Error('Too many events. File system must be re-scanned.')
      )
    ).toBe(true);
    expect(isRescanRequired(new Error('Error starting FSEvents stream'))).toBe(
      false
    );
    expect(isRescanRequired(new Error('ENOTDIR'))).toBe(false);
  });

  it('reads a gitdir pointer relative to the pointer file', () => {
    expect(
      readGitdirPointer('/repo/.git', 'gitdir: ../elsewhere/git\n')
    ).toBe('/elsewhere/git');
    expect(readGitdirPointer('/repo/.git', 'not a pointer')).toBeNull();
  });
});
