/**
 * Integration test: RepoWatcher over real FSEvents (@parcel/watcher) on a
 * throwaway repo. Timing-tolerant — FSEvents delivery can lag ~1 s.
 *
 * Check type: adapter integration test, native watcher lane (Phase 145
 * stage 5). Environment requirement: the platform's native file event stream
 * through the repository's installed @parcel/watcher binding, which is
 * FSEvents on macOS, plus the git binary. Skip rule: none; a missing or
 * broken binding here is a failure, never a silent skip, because this lane is
 * the only proof the native primitive honors the contract that
 * repo-watcher-contract.test.ts pins over an injected backend. Run this lane
 * alone with `npm run test:native`; `npm test` includes it.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RepoWatcher } from '../repo-watcher';

const WAIT_MS = 5000;

function waitFor(pred: () => boolean, ms = WAIT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = (): void => {
      if (pred()) return resolve(true);
      if (Date.now() - start > ms) return resolve(false);
      setTimeout(tick, 50);
    };
    tick();
  });
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

describe('RepoWatcher', () => {
  const cleanups: Array<() => Promise<void> | void> = [];

  afterAll(async () => {
    for (const fn of cleanups.reverse()) await fn();
  });

  it(
    'fires debounced onChange for worktree and .git ref changes, not for ignored noise',
    { timeout: 30_000 },
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gmux-watch-'));
      cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
      execFileSync('git', ['init', '-b', 'main'], { cwd: dir });

      let fires = 0;
      let lastPath = '';
      const rw = await RepoWatcher.watch(dir, {
        onChange: (p) => {
          fires++;
          lastPath = p;
        }
      });
      cleanups.push(() => rw.dispose());
      await sleep(500); // let FSEvents settle

      // 1. Worktree change → one debounced fire (multiple writes coalesce)
      writeFileSync(join(dir, 'one.txt'), '1');
      writeFileSync(join(dir, 'two.txt'), '2');
      expect(await waitFor(() => fires >= 1)).toBe(true);
      expect(lastPath).toBe(rw.repoPath);
      const afterWorktree = fires;
      await sleep(700); // past the debounce window
      expect(fires - afterWorktree).toBeLessThanOrEqual(1); // coalesced

      // 2. Ref change under .git/refs → fires (dotgit watcher path)
      const base = fires;
      mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
      writeFileSync(
        join(dir, '.git', 'refs', 'heads', 'phantom'),
        'a'.repeat(40) + '\n'
      );
      expect(await waitFor(() => fires > base)).toBe(true);

      // 3. Ignored dotgit noise (objects/, index.lock) → no fire
      await sleep(700);
      const quiet = fires;
      mkdirSync(join(dir, '.git', 'objects', 'zz'), { recursive: true });
      writeFileSync(join(dir, '.git', 'objects', 'zz', 'fake'), 'x');
      writeFileSync(join(dir, '.git', 'index.lock'), '');
      await sleep(1500);
      expect(fires).toBe(quiet);
      rmSync(join(dir, '.git', 'index.lock'), { force: true });

      // 4. dispose() stops everything
      await rw.dispose();
      const after = fires;
      writeFileSync(join(dir, 'three.txt'), '3');
      await sleep(1200);
      expect(fires).toBe(after);
    }
  );

  it(
    'attaches the dotgit watcher after a late git init',
    { timeout: 30_000 },
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gmux-watch-late-'));
      cleanups.push(() => rmSync(dir, { recursive: true, force: true }));

      let fires = 0;
      const rw = await RepoWatcher.watch(dir, {
        onChange: () => {
          fires++;
        }
      });
      cleanups.push(() => rw.dispose());
      await sleep(500);

      // Not a repo yet: worktree events still flow (git init creates .git,
      // which is excluded — so trigger with a plain file first).
      writeFileSync(join(dir, 'seed.txt'), 's');
      expect(await waitFor(() => fires >= 1)).toBe(true);

      execFileSync('git', ['init', '-b', 'main'], { cwd: dir });
      // The flush after the next worktree event retries dotgit attach.
      writeFileSync(join(dir, 'post-init.txt'), 'p');
      expect(await waitFor(() => fires >= 2)).toBe(true);
      await sleep(700);

      // Now a pure .git ref change must be seen (dotgit watcher attached
      // on one of the flushes above).
      const base = fires;
      mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
      writeFileSync(
        join(dir, '.git', 'refs', 'heads', 'late'),
        'b'.repeat(40) + '\n'
      );
      expect(await waitFor(() => fires > base, 8000)).toBe(true);
    }
  );
});
