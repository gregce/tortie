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
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
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

  it(
    'ignores churn inside an ignored directory and still sees a tracked edit (Phase 151)',
    { timeout: 40_000 },
    async () => {
      // The attack, in miniature, over the real primitive: an exclusion that
      // silenced real edits would be far worse than the noise it removes. The
      // verifier owes the same shape at scale, being four churn workers and a
      // real minute; this lane owes only that the wiring is the right way up.
      const dir = realpathSync(mkdtempSync(join(tmpdir(), 'gmux-watch-excl-')));
      cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
      execFileSync('git', ['init', '-b', 'main'], { cwd: dir });
      writeFileSync(join(dir, '.gitignore'), 'scratch/\n');
      mkdirSync(join(dir, 'scratch'));
      writeFileSync(join(dir, 'scratch', 'seed'), 'x');
      mkdirSync(join(dir, 'src'));
      writeFileSync(join(dir, 'src', 'f1.go'), 'package main\n');

      let fires = 0;
      const rw = await RepoWatcher.watch(dir, {
        onChange: () => {
          fires++;
        }
      });
      cleanups.push(() => rw.dispose());
      await sleep(800); // let FSEvents settle

      // 1. Heavy churn inside the ignored directory produces NOTHING.
      const quiet = fires;
      for (let i = 0; i < 400; i++) {
        writeFileSync(join(dir, 'scratch', `f${i}`), String(i));
      }
      for (let i = 0; i < 400; i++) {
        rmSync(join(dir, 'scratch', `f${i}`), { force: true });
      }
      await sleep(2000);
      expect(fires).toBe(quiet);

      // 2. One edit to a TRACKED file is still seen, which is the point.
      writeFileSync(join(dir, 'src', 'f1.go'), 'package main // edited\n');
      expect(await waitFor(() => fires > quiet, 8000)).toBe(true);
    }
  );

  it(
    'stays sighted when an ignored root is named `!archive` (Phase 151 fix round)',
    { timeout: 40_000 },
    async () => {
      // THE DEFECT THIS EXISTS FOR. Past the eighth CoreServices slot a root
      // is excluded in userspace instead, and the first version of that built
      // the glob string `<name>/**` out of the raw directory name. `picomatch`
      // read the leading `!` as negation and compiled a pattern matching every
      // path in the tree EXCEPT `archive/**`, so the whole repository went
      // blind and nothing at all was logged. Driven exactly like this, the
      // five edits below were seen 5 of 5 before that change and 0 of 5 after.
      //
      // A name is a LITERAL. The eleven roots are what forces one of them into
      // the overflow, and the direct entry ranking is what makes it be this
      // one: the loud roots hold six entries each and `!archive` holds one.
      const dir = realpathSync(mkdtempSync(join(tmpdir(), 'gmux-watch-bang-')));
      cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
      execFileSync('git', ['init', '-b', 'main'], { cwd: dir });

      mkdirSync(join(dir, 'src'));
      writeFileSync(join(dir, 'src', 'main.ts'), 'export const v = 0;\n');
      // The ordinary `/*` then `!/…` shape people really write, which is how
      // a directory whose NAME starts with `!` ends up ignored.
      writeFileSync(join(dir, '.gitignore'), '/*\n!/.gitignore\n!/src/\n');
      for (let i = 1; i <= 10; i++) {
        const loud = join(dir, `d${String(i).padStart(2, '0')}`);
        mkdirSync(loud);
        for (let j = 0; j < 6; j++) writeFileSync(join(loud, `f${j}`), 'x');
      }
      mkdirSync(join(dir, '!archive'));
      writeFileSync(join(dir, '!archive', 'only'), 'x');

      let fires = 0;
      const rw = await RepoWatcher.watch(dir, {
        onChange: () => {
          fires++;
        }
      });
      cleanups.push(() => rw.dispose());
      await sleep(800);

      // 1. The tracked file is still seen. This is the assertion that failed.
      const quiet = fires;
      writeFileSync(join(dir, 'src', 'main.ts'), 'export const v = 1;\n');
      expect(await waitFor(() => fires > quiet, 8000)).toBe(true);

      // 2. And the overflow root really is excluded, so the escaping did not
      // simply turn the exclusion off.
      await sleep(700);
      const settled = fires;
      for (let i = 0; i < 200; i++) {
        writeFileSync(join(dir, '!archive', `f${i}`), String(i));
      }
      await sleep(2000);
      expect(fires).toBe(settled);
    }
  );
});
