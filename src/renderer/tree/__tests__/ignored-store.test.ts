/**
 * The ignore store's refresh behavior (Phase 47.1, an operator bug in 0.24.2).
 *
 * The defect these tests exist for: `invalidate` emptied the set the tree
 * dims from, and the replacement did not land until a `git check-ignore`
 * process had come back 13 ms to 30 ms later. Every dimmed row repainted at
 * full brightness in between, once every 2000 ms under a constantly writing
 * agent, which the operator saw as a strobe. The headline test below is the
 * direct assertion that the rendered set is never emptied to refresh it.
 *
 * The rest hold the distinction that makes the fix correct rather than merely
 * quiet. An ordinary sync MERGES, because the tree is growing and each answer
 * is about paths nobody had asked about. A revalidation REPLACES, because a
 * .gitignore edit can take a path OUT and merging can only add.
 *
 * No tree, no shadow root and no git process. `checkIgnore` is a fake whose
 * `truth` is the set of paths git would call ignored, so a .gitignore edit is
 * modelled by assigning a different `truth`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localTarget, workspaceTarget } from '@shared/workspace-target';

/** What git would answer "ignored" for right now. */
let truth: string[] = [];
/** Every ask that reached the fake, in order. */
let asks: string[][] = [];
/** Set to make the read throw, the way a missing binary would. */
let fail = false;
/** Set to hold a call open, so a race can be staged around it. */
let gate: Promise<void> | null = null;

async function checkIgnore(input: {
  repoPath: string;
  paths: string[];
}): Promise<string[]> {
  asks.push([...input.paths]);
  if (gate !== null) await gate;
  if (fail) throw new Error('git check-ignore failed');
  return truth.filter((path) => input.paths.includes(path));
}

vi.stubGlobal('window', { gmux: { git: { checkIgnore } } });

const { useTreeIgnored } = await import('../ignored');

/**
 * PHASE 90.3. The store is keyed on a TARGET now, because two machines can hold
 * the same path. Every call below passes the local target for `/repo`, so these
 * tests assert exactly what they asserted before, and the two new ones at the
 * bottom assert what the key change bought.
 */
const REPO = localTarget('/repo');

const store = (): ReturnType<typeof useTreeIgnored.getState> =>
  useTreeIgnored.getState();
const shown = (): string[] => [...store().ignored].sort();

beforeEach(() => {
  store().reset();
  asks = [];
  truth = [];
  fail = false;
  gate = null;
  // Past the invalidate floor, so each test's first invalidate is the
  // leading edge and fires at once.
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 60_000);
});

describe('invalidate', () => {
  it('NEVER empties the rendered set while a previous answer exists', async () => {
    truth = ['node_modules/'];
    await store().sync(REPO, ['node_modules/', 'src/', 'README.md']);
    expect(shown()).toEqual(['node_modules/']);

    // Record the size of the rendered set at every single state change, so a
    // blank frame cannot hide between two assertions.
    const sizes: number[] = [];
    const stop = useTreeIgnored.subscribe((s) => sizes.push(s.ignored.size));

    store().invalidate();
    expect(store().ignored.size).toBe(1);

    const inFlight = store().sync(REPO, ['node_modules/', 'src/', 'README.md']);
    expect(store().ignored.size).toBe(1);
    await inFlight;
    stop();

    expect(shown()).toEqual(['node_modules/']);
    expect(sizes).not.toContain(0);
  });

  it('bumps the epoch so the tree re-asks, and changes nothing else', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);
    const before = store();
    store().invalidate();
    expect(store().epoch).toBe(before.epoch + 1);
    expect(store().ignored).toBe(before.ignored);
    expect(store().target).toBe(REPO);
  });

  it('coalesces a burst into one leading and one trailing pass', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);

    store().invalidate();
    const leading = store().epoch;
    store().invalidate();
    store().invalidate();
    store().invalidate();
    expect(store().epoch).toBe(leading);

    // The floor is 10 s. Nine seconds is not enough.
    vi.advanceTimersByTime(9_000);
    expect(store().epoch).toBe(leading);
    vi.advanceTimersByTime(1_000);
    expect(store().epoch).toBe(leading + 1);

    // And not one of those ticks blanked the tree.
    expect(store().ignored.size).toBe(1);
  });
});

describe('the revalidation pass', () => {
  it('lets a path that stopped being ignored leave the set', async () => {
    truth = ['dist/', 'notes.log'];
    await store().sync(REPO, ['dist/', 'notes.log', 'src/']);
    expect(shown()).toEqual(['dist/', 'notes.log']);

    // The operator deletes the *.log line from .gitignore.
    truth = ['dist/'];
    store().invalidate();
    await store().sync(REPO, ['dist/', 'notes.log', 'src/']);
    expect(shown()).toEqual(['dist/']);
  });

  it('asks about the whole loaded tree, not the delta', async () => {
    truth = ['node_modules/'];
    const paths = ['node_modules/', 'node_modules/react/', 'src/'];
    await store().sync(REPO, paths);
    expect(asks).toEqual([['src/', 'node_modules/', 'node_modules/react/']]);

    store().invalidate();
    await store().sync(REPO, paths);
    // The current set cannot be used to skip node_modules/ here. Finding out
    // whether it is STILL ignored is the whole point of the pass.
    expect(asks[1]).toEqual(asks[0]);
  });

  it('settles on the empty set when the tree has nothing loaded', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/']);
    expect(shown()).toEqual(['dist/']);

    store().invalidate();
    await store().sync(REPO, []);
    expect(shown()).toEqual([]);
  });

  it('runs once, then hands the next sync back to the merging path', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);
    store().invalidate();
    await store().sync(REPO, ['dist/', 'src/']);
    asks = [];
    await store().sync(REPO, ['dist/', 'src/', 'new.ts']);
    expect(asks).toEqual([['new.ts']]);
  });
});

describe('the ordinary growing pass', () => {
  it('keeps earlier answers and never re-asks an answered path', async () => {
    truth = ['dist/', 'notes.log'];
    await store().sync(REPO, ['dist/']);
    expect(shown()).toEqual(['dist/']);

    await store().sync(REPO, ['dist/', 'notes.log']);
    expect(shown()).toEqual(['dist/', 'notes.log']);
    expect(asks).toEqual([['dist/'], ['notes.log']]);
  });

  it('dims a file written into an ignored directory without asking git', async () => {
    truth = ['node_modules/'];
    await store().sync(REPO, ['node_modules/', 'src/']);
    asks = [];

    // An agent writes node_modules/.package-lock.json. Git cannot re-include
    // a file under an excluded directory, so the answer is already known and
    // the row must get its own entry rather than trusting the library's
    // inheritance cache, which is never cleared.
    await store().sync(REPO, [
      'node_modules/',
      'node_modules/.package-lock.json',
      'src/'
    ]);
    expect(asks).toEqual([]);
    expect(shown()).toEqual([
      'node_modules/',
      'node_modules/.package-lock.json'
    ]);
  });
});

describe('staleness', () => {
  it('drops an answer that was in flight when the rules changed', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);

    let release = (): void => {};
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    truth = ['dist/', 'new.ts'];
    const inFlight = store().sync(REPO, ['dist/', 'src/', 'new.ts']);

    store().invalidate();
    release();
    await inFlight;

    // The held answer belonged to the previous epoch, so it did not land, and
    // the last good set is what stayed on screen.
    expect(shown()).toEqual(['dist/']);
  });

  it('starts clean when the project moves to another repository', async () => {
    const other = localTarget('/other');
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);
    truth = [];
    await store().sync(other, ['src/']);
    expect(store().target).toBe(other);
    expect(shown()).toEqual([]);
  });

  // -- PHASE 90.3 -----------------------------------------------------------

  it('p903-b: the same path on another machine is a different key', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);
    expect(shown()).toEqual(['dist/']);

    // The SAME path string, on a machine. Before this phase the store compared
    // the path alone, returned early, and this Mac's answers went on dimming
    // another machine's rows.
    asks = [];
    await store().sync(workspaceTarget('/repo', 'mac-pro'), ['dist/', 'src/']);
    expect(shown()).toEqual([]);
    expect(store().target).toBeNull();
    expect(asks).toEqual([]);
  });

  it('p903-b: a machine target asks git nothing at all', async () => {
    asks = [];
    await store().sync(workspaceTarget('/elsewhere', 'mac-pro'), [
      'node_modules/',
      'src/'
    ]);
    expect(asks).toEqual([]);
    expect(shown()).toEqual([]);
  });

  it('keeps the last answer when the read fails, and retries in full', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);

    fail = true;
    store().invalidate();
    await store().sync(REPO, ['dist/', 'src/']);
    expect(shown()).toEqual(['dist/']);

    fail = false;
    asks = [];
    await store().sync(REPO, ['dist/', 'src/']);
    expect(asks).toEqual([['src/', 'dist/']]);
    expect(shown()).toEqual(['dist/']);
  });
});

describe('reset', () => {
  it('DOES empty the set, because leaving a repository is not a refresh', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);
    expect(shown()).toEqual(['dist/']);

    store().reset();
    expect(shown()).toEqual([]);
    expect(store().target).toBeNull();
  });

  it('cancels a pending revalidation instead of leaving it to fire', async () => {
    truth = ['dist/'];
    await store().sync(REPO, ['dist/', 'src/']);
    store().invalidate();
    store().invalidate();
    const epoch = store().epoch;

    store().reset();
    vi.advanceTimersByTime(30_000);
    expect(store().epoch).toBe(epoch);
  });
});
