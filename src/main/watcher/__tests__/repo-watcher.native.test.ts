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
 *
 * THE RULE THIS LANE ASSERTS BY (Phase 308). A native lane asserts what the
 * production contract promises, and the contract promises an `onChange` for a
 * DROPPED BATCH, with no path at all: repo-watcher.ts's `noteDrop` schedules
 * the same flush an event does, by Phase 151's measured design, because a drop
 * says nothing about which paths were in it. A loaded `fseventsd` is exactly
 * when a drop arrives, and the 0.109.0 battery measured this file red in five
 * of six runs, a different case each time and green alone. So:
 *
 *   - A sleep never carries a negative assertion alone. Every window that
 *     asserts onChange did NOT fire reads `observation.drops` beside its
 *     baseline (`staysQuiet`). A fire with no drop fails at once, which is the
 *     regression these cases exist for. A fire a counted drop explains is
 *     re-taken with a fresh baseline and a fresh burst, three windows at most,
 *     and three windows that all carry a drop FAIL, saying the machine could
 *     not answer and printing the drops. It is never a skip and never a retry
 *     of the test: one measurement window is taken again, and that is all.
 *   - "FSEvents has settled" is a barrier, never a sleep (`caughtUp`): one file
 *     written in a WATCHED path and the fire it must produce waited for, so a
 *     baseline starts where the stream has caught up.
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

/** How many windows a negative assertion may take before a run of drops fails it. */
const WINDOWS = 3;

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

/**
 * THE BARRIER (Phase 308). One file written in a WATCHED path and the fire it
 * must produce waited for. The stream delivers in order, so once that fire has
 * landed everything written before it has been seen, and a baseline read
 * after it starts where the stream has caught up.
 */
async function caughtUp(path: string, fires: () => number): Promise<void> {
  const before = fires();
  writeFileSync(path, String(Date.now()));
  expect(
    await waitFor(() => fires() > before, 8000),
    `the barrier write to ${path} produced no fire, so the watcher sees nothing at all`
  ).toBe(true);
}

/**
 * Wait until no fire has landed for `ms`, at most `limit`. Asked only before a
 * window is taken AGAIN, after a drop, when the stream may still be
 * delivering what the dropped window's burst left behind.
 */
async function quiet(fires: () => number, ms: number, limit = 8000): Promise<void> {
  const start = Date.now();
  let last = fires();
  let since = Date.now();
  while (Date.now() - start < limit) {
    await sleep(50);
    const now = fires();
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= ms) {
      return;
    }
  }
}

/**
 * A NEGATIVE WINDOW, judged with the drop counter beside it (Phase 308).
 *
 * `burst` makes the changes the watcher must NOT report, given the window's
 * number so each window writes afresh; `windowMs` is how long the stream is
 * given to show a fire it must not show. A fire with no counted drop fails at
 * once. A fire a drop explains takes the window again, after `settle`, with a
 * fresh baseline and a fresh burst; when all three windows carried a drop the
 * machine could not answer, and that fails too, by name, with the drops.
 */
async function staysQuiet(
  label: string,
  rw: RepoWatcher,
  fires: () => number,
  burst: (window: number) => void,
  windowMs: number,
  settle: () => Promise<void>
): Promise<void> {
  const seen: Array<{ window: number; fired: number; dropped: number }> = [];
  for (let window = 1; window <= WINDOWS; window += 1) {
    if (window > 1) await settle();
    const firesBefore = fires();
    const dropsBefore = rw.observation.drops;
    burst(window);
    await sleep(windowMs);
    const fired = fires() - firesBefore;
    const dropped = rw.observation.drops - dropsBefore;
    if (fired === 0) return;
    seen.push({ window, fired, dropped });
    expect(
      dropped,
      `${label}: onChange fired ${String(fired)} time(s) in window ${String(window)} and no batch was dropped, ` +
        'so the watcher reported a change it must never see'
    ).toBeGreaterThan(0);
  }
  expect.fail(
    `${label}: all ${String(WINDOWS)} windows carried a dropped batch (${JSON.stringify(seen)}; ` +
      `observation ${JSON.stringify(rw.observation)}), so this machine could not answer whether the ` +
      'watcher stays quiet. A drop fires onChange by design; that is the machine, not the watcher.'
  );
}

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
      const count = (): number => fires;
      await caughtUp(join(dir, 'settled.txt'), count);

      // 1. Worktree change → one debounced fire (multiple writes coalesce)
      const start = fires;
      writeFileSync(join(dir, 'one.txt'), '1');
      writeFileSync(join(dir, 'two.txt'), '2');
      expect(await waitFor(() => fires > start)).toBe(true);
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
      await staysQuiet(
        'ignored dotgit noise',
        rw,
        count,
        (window) => {
          mkdirSync(join(dir, '.git', 'objects', 'zz'), { recursive: true });
          writeFileSync(join(dir, '.git', 'objects', 'zz', `fake-${String(window)}`), 'x');
          writeFileSync(join(dir, '.git', 'index.lock'), String(window));
        },
        1500,
        async () => {
          await caughtUp(join(dir, 'settled.txt'), count);
          await quiet(count, 600);
        }
      );
      rmSync(join(dir, '.git', 'index.lock'), { force: true });

      // 4. dispose() stops everything. A disposed watcher counts no drop, so
      //    any fire here fails at once.
      await rw.dispose();
      await staysQuiet(
        'a disposed watcher',
        rw,
        count,
        (window) => {
          writeFileSync(join(dir, `three-${String(window)}.txt`), String(window));
        },
        1200,
        async () => undefined
      );
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
      await caughtUp(join(dir, 'settled.txt'), () => fires);

      // Not a repo yet: worktree events still flow (git init creates .git,
      // which is excluded — so trigger with a plain file first).
      const seeded = fires;
      writeFileSync(join(dir, 'seed.txt'), 's');
      expect(await waitFor(() => fires > seeded)).toBe(true);

      execFileSync('git', ['init', '-b', 'main'], { cwd: dir });
      // The flush after the next worktree event retries dotgit attach.
      const initialised = fires;
      writeFileSync(join(dir, 'post-init.txt'), 'p');
      expect(await waitFor(() => fires > initialised)).toBe(true);
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
      const count = (): number => fires;
      await caughtUp(join(dir, 'src', 'settled.go'), count);

      // 1. Heavy churn inside the ignored directory produces NOTHING.
      await staysQuiet(
        'churn inside an ignored directory',
        rw,
        count,
        (window) => {
          for (let i = 0; i < 400; i++) {
            writeFileSync(join(dir, 'scratch', `f${i}`), String(i + window));
          }
          for (let i = 0; i < 400; i++) {
            rmSync(join(dir, 'scratch', `f${i}`), { force: true });
          }
        },
        2000,
        async () => {
          await caughtUp(join(dir, 'src', 'settled.go'), count);
          await quiet(count, 600);
        }
      );

      // 2. One edit to a TRACKED file is still seen, which is the point.
      const quietNow = fires;
      writeFileSync(join(dir, 'src', 'f1.go'), 'package main // edited\n');
      expect(await waitFor(() => fires > quietNow, 8000)).toBe(true);
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
      const count = (): number => fires;
      // The barrier writes under src/, the one root this .gitignore keeps
      // watched; a blinded watcher fails right here.
      await caughtUp(join(dir, 'src', 'settled.ts'), count);

      // 1. The tracked file is still seen. This is the assertion that failed.
      const quietNow = fires;
      writeFileSync(join(dir, 'src', 'main.ts'), 'export const v = 1;\n');
      expect(await waitFor(() => fires > quietNow, 8000)).toBe(true);

      // 2. And the overflow root really is excluded, so the escaping did not
      // simply turn the exclusion off.
      await sleep(700);
      await staysQuiet(
        'churn inside the overflow root !archive',
        rw,
        count,
        (window) => {
          for (let i = 0; i < 200; i++) {
            writeFileSync(join(dir, '!archive', `f${i}-${String(window)}`), String(i));
          }
        },
        2000,
        async () => {
          await caughtUp(join(dir, 'src', 'settled.ts'), count);
          await quiet(count, 600);
        }
      );
    }
  );
});
