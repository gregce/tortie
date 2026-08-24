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
 */

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
  ignore: string[];
  unsubscribed: boolean;
}

/** Every subscription the class opened, in order. */
const subs: FakeSub[] = [];

vi.mock('@parcel/watcher', () => {
  const subscribe = (
    dir: string,
    cb: (err: Error | null, events: FakeEvent[]) => void,
    opts?: { ignore?: string[] }
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

const { RepoWatcher, isRelevantDotGitPath, readGitdirPointer } = await import(
  '../repo-watcher'
);

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

  it('reads a gitdir pointer relative to the pointer file', () => {
    expect(
      readGitdirPointer('/repo/.git', 'gitdir: ../elsewhere/git\n')
    ).toBe('/elsewhere/git');
    expect(readGitdirPointer('/repo/.git', 'not a pointer')).toBeNull();
  });
});
