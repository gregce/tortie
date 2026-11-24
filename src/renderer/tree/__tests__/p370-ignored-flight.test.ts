/**
 * PHASE 370. The ignore store asks git one call at a time.
 *
 * The defect these rows exist for: the tree hands over one listing per cached
 * folder, and every one of them started a `git check-ignore` of its own, so a
 * project with 500 folders open ran 502 of them at once when its tree was
 * shown and again on every change. The operator's Mac reached 515 children and
 * a load average of 474. The rows are F1 to F15 and the rules they hold are in
 * the header of ../ignored.ts. F1 to F14 are build/p370/SPEC.md §7.1's; F15
 * and the two clock rows of F9 are the build's own; F16, F17 and the rows of
 * F4 and F14 that say so are the fix round's.
 *
 * No tree and no git process. `checkIgnore` is a fake with one deferred a
 * call, counting the calls that are out by folder. A listing is the app's own
 * shape: the root with N folders, then each folder's two files, one ignored.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localTarget, workspaceTarget } from '@shared/workspace-target';

interface Call {
  repoPath: string;
  paths: string[];
  done: boolean;
  answer(hits: string[]): void;
  /** Answer with what `truth` says about this call's own paths. */
  answerTruly(): void;
  fail(): void;
}

let calls: Call[] = [];
/** Calls that are out now, and the most there ever were, by folder. */
let out = new Map<string, number>();
let most = new Map<string, number>();
let truth: (path: string) => boolean = () => false;
/** Answer by itself after this long; null holds every call. */
let autoMs: number | null = null;
/** Fail by itself after this long. Wins over `autoMs`. */
let failMs: number | null = null;
/** Answer in the same turn, as fast as a bridge can. */
let instant = false;
/** Throw instead of returning a promise. */
let throwing = false;

function checkIgnore(input: {
  repoPath: string;
  paths: string[];
}): Promise<string[]> {
  if (throwing) throw new Error('the bridge threw');
  const { repoPath, paths } = input;
  out.set(repoPath, (out.get(repoPath) ?? 0) + 1);
  most.set(repoPath, Math.max(most.get(repoPath) ?? 0, out.get(repoPath) ?? 0));
  return new Promise<string[]>((resolve, reject) => {
    const end = (): boolean => {
      if (call.done) return false;
      call.done = true;
      out.set(repoPath, (out.get(repoPath) ?? 0) - 1);
      return true;
    };
    const call: Call = {
      repoPath,
      paths: [...paths],
      done: false,
      answer: (hits) => {
        if (end()) resolve(hits);
      },
      answerTruly: () => {
        if (end()) resolve(paths.filter(truth));
      },
      fail: () => {
        if (end()) reject(new Error('git did not answer'));
      }
    };
    calls.push(call);
    if (instant) call.answerTruly();
    else if (failMs !== null) setTimeout(() => call.fail(), failMs);
    else if (autoMs !== null) setTimeout(() => call.answerTruly(), autoMs);
  });
}

vi.stubGlobal('window', { gmux: { git: { checkIgnore } } });

const { RETRY_AFTER_FAILURE_MS, useTreeIgnored } = await import('../ignored');

const REPO = localTarget('/repo');
const OTHER = localTarget('/other');
const NO_LINKS: ReadonlySet<string> = new Set<string>();
const TICK_MS = 450;

const store = (): ReturnType<typeof useTreeIgnored.getState> =>
  useTreeIgnored.getState();
const shown = (): string[] => [...store().ignored].sort();
const mostOut = (): number => Math.max(0, ...most.values());
const pad = (n: number): string => String(n).padStart(4, '0');
const isLog = (path: string): boolean => path.endsWith('.log');

/** Let every promise that can settle without a timer settle. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 30; i += 1) await Promise.resolve();
};

/** The tree with N folders, K of them listed. K+1 rows of it are ignored. */
function listing(n: number, k: number, extra: readonly string[] = []): Set<string> {
  const paths = new Set<string>(['.gitignore', 'root.log']);
  for (let i = 1; i <= n; i += 1) paths.add(`d${pad(i)}/`);
  for (let i = 1; i <= k; i += 1) {
    paths.add(`d${pad(i)}/a.txt`);
    paths.add(`d${pad(i)}/b.log`);
  }
  for (const path of extra) paths.add(path);
  return paths;
}

/** Hand the store a listing the way the tree's effect does. */
const hand = (
  paths: Iterable<string>,
  links: ReadonlySet<string> = NO_LINKS
): Promise<void> => store().sync(REPO, paths, links);

/** A settled tree: every row asked and answered, nothing out. */
async function settled(paths: Iterable<string>): Promise<void> {
  instant = true;
  await hand(paths);
  await flush();
  instant = false;
  calls = [];
  most = new Map();
}

/** One change in the repository, as FilesSection and the tree deliver it. */
function change(n: number, paths: ReadonlySet<string>): void {
  const epoch = store().epoch;
  store().invalidate();
  if (store().epoch !== epoch) void hand(paths);
  for (let k = 0; k <= n; k += 1) void hand(new Set(paths));
}

let clock = Date.now() + 600_000;

beforeEach(() => {
  vi.useFakeTimers();
  // Past the invalidate floor and past any hold, so each test's first
  // invalidate is the leading edge.
  clock += 600_000;
  vi.setSystemTime(clock);
  store().reset();
  calls = [];
  out = new Map();
  most = new Map();
  truth = isLog;
  autoMs = null;
  failMs = null;
  instant = false;
  throwing = false;
});

describe('F1: one call is out, however many listings arrive', () => {
  for (const n of [10, 100, 500]) {
    it(`${String(n)} folders listed while git is held start one call`, async () => {
      const asked = [hand(listing(n, 0))];
      for (let k = 1; k <= n; k += 1) asked.push(hand(listing(n, k)));
      await flush();
      expect(calls.length).toBe(1);
      expect(mostOut()).toBe(1);

      for (let i = 0; i < 3; i += 1) {
        for (const call of calls) call.answerTruly();
        await flush();
      }
      await Promise.all(asked);
      expect(mostOut()).toBe(1);
      // And not a row was lost by it: root.log and one b.log a folder.
      expect(store().ignored.size).toBe(n + 1);
    });
  }

  it('a change inside a revalidation starts one full ask', async () => {
    const full = listing(100, 100);
    await settled(full);
    store().invalidate();
    for (let k = 0; k <= 101; k += 1) void hand(new Set(full));
    await flush();
    expect(calls.map((c) => c.paths.length)).toEqual([full.size]);
    expect(store().ignored.size).toBe(101);
    calls[0]?.answerTruly();
    await flush();
    expect(calls.length).toBe(1);
    expect(store().ignored.size).toBe(101);
  });
});

describe('F2: a sync while a call is out does no per-path work', () => {
  it('reads no path of the listing it is handed', async () => {
    void hand(listing(100, 100));
    let reads = 0;
    const counted: Iterable<string> = {
      *[Symbol.iterator]() {
        for (const path of listing(100, 100, ['late.log'])) {
          reads += 1;
          yield path;
        }
      }
    };
    for (let i = 0; i < 100; i += 1) void hand(counted);
    await flush();
    expect(reads).toBe(0);

    calls[0]?.answerTruly();
    await flush();
    expect(reads).toBeGreaterThan(0);
    expect(calls[1]?.paths).toEqual(['late.log']);
  });
});

describe('F3: an overtaken answer still lands', () => {
  it('lands though ten listings arrived while git ran', async () => {
    void hand(listing(10, 0));
    for (let k = 1; k <= 10; k += 1) void hand(listing(10, k));
    calls[0]?.answerTruly();
    await flush();
    // The first call's own answer, with the call behind it still out.
    expect(calls[1]?.done).toBe(false);
    expect(shown()).toEqual(['root.log']);
  });
});

describe('F4: an answer for a folder the store left never lands', () => {
  it('reset, then the same folder again', async () => {
    void hand(listing(10, 10));
    store().reset();
    void hand(listing(10, 10));
    await flush();
    expect(calls.length).toBe(2);
    calls[0]?.answer(['d0001/a.txt']);
    await flush();
    expect(shown()).toEqual([]);
    calls[1]?.answerTruly();
    await flush();
    expect(store().ignored.size).toBe(11);
    expect(store().ignored.has('d0001/a.txt')).toBe(false);
  });

  it('a new folder is asked before the old call answers, and back again', async () => {
    void hand(listing(10, 10));
    void store().sync(OTHER, new Set(['src/', 'x.log']), NO_LINKS);
    await flush();
    expect(calls.map((c) => c.repoPath)).toEqual(['/repo', '/other']);
    expect(calls[1]?.paths).toEqual(['src/', 'x.log']);

    // The old folder's answer, in the new folder's set.
    calls[0]?.answer(['d0001/a.txt']);
    await flush();
    expect(shown()).toEqual([]);

    void hand(listing(10, 10));
    await flush();
    expect(calls.length).toBe(3);
    calls[1]?.answerTruly();
    await flush();
    expect(shown()).toEqual([]);
    calls[2]?.answerTruly();
    await flush();
    expect(store().ignored.size).toBe(11);
  });

  it('what one folder answered excuses no path of the next (the fix round)', async () => {
    await settled(['a.log', 'src/']);
    void store().sync(OTHER, new Set(['a.log', 'src/']), NO_LINKS);
    expect(calls.map((c) => c.paths)).toEqual([['src/', 'a.log']]);
    calls[0]?.answer(['src/']);
    await flush();
    expect(shown()).toEqual(['src/']);
  });

  it('a folder on another machine', async () => {
    const started = hand(listing(10, 10));
    const recorded = hand(listing(10, 10, ['late.log']));
    void store().sync(workspaceTarget('/repo', 'mac-pro'), ['root.log'], NO_LINKS);
    await recorded;
    calls[0]?.answerTruly();
    await started;
    await flush();
    expect(store().target).toBeNull();
    expect(shown()).toEqual([]);
    expect(calls.length).toBe(1);
  });
});

describe('F5: the rules were distrusted while git ran', () => {
  it("a revalidation's answer is shown and settles nothing", async () => {
    const full = listing(10, 10);
    await settled(full);

    // A rule goes: d0001/b.log is no longer ignored.
    truth = (path) => isLog(path) && path !== 'd0001/b.log';
    store().invalidate();
    void hand(full);
    vi.advanceTimersByTime(10_000);
    const epoch = store().epoch;
    store().invalidate();
    expect(store().epoch).toBe(epoch + 1);
    void hand(full);
    expect(calls.length).toBe(1);

    calls[0]?.answerTruly();
    await flush();
    expect(store().ignored.has('d0001/b.log')).toBe(false);
    expect(store().ignored.size).toBe(10);
    // Still owed, so the call behind it asks about everything again and can
    // take a row out again.
    expect(calls[1]?.paths.length).toBe(full.size);
    truth = (path) => path === 'root.log';
    calls[1]?.answerTruly();
    await flush();
    expect(shown()).toEqual(['root.log']);
    expect(calls.length).toBe(2);
  });

  it("a growing ask's answer is dropped, and a full ask follows it", async () => {
    await settled(listing(10, 10));
    void hand(listing(10, 10, ['new.log']));
    store().invalidate();
    const full = listing(10, 10, ['new.log']);
    void hand(full);
    calls[0]?.answer(['new.log', 'd0001/a.txt']);
    await flush();
    expect(store().ignored.has('new.log')).toBe(false);
    expect(store().ignored.size).toBe(11);
    expect(calls[1]?.paths.length).toBe(full.size);
  });

  it('a 12 s git under a writer lands at least 6 answers in 120 s', async () => {
    const n = 100;
    await settled(listing(n, n));
    autoMs = 12_000;
    let landings = 0;
    let smallest = Infinity;
    let prev = store().ignored;
    const stop = useTreeIgnored.subscribe((s) => {
      if (s.ignored === prev) return;
      prev = s.ignored;
      landings += 1;
      smallest = Math.min(smallest, s.ignored.size);
    });
    const extra: string[] = [];
    for (let t = 0; t < Math.floor(120_000 / TICK_MS); t += 1) {
      extra.push(`d0001/new${pad(t)}.log`);
      change(n, listing(n, n, extra));
      await vi.advanceTimersByTimeAsync(TICK_MS);
      // Inside the loop, so a pile-up ends the row at its first tick.
      expect(mostOut()).toBe(1);
    }
    stop();
    expect(landings).toBeGreaterThanOrEqual(6);
    expect(mostOut()).toBe(1);
    // Phase 47.1, over the whole feed: no row that stayed ignored went bright.
    expect(smallest).toBeGreaterThanOrEqual(n + 1);
  });
});

describe('F6: exactly one call behind it', () => {
  it('asks only the paths still unanswered, once, for the newest listing', async () => {
    void hand(listing(10, 0));
    for (let k = 1; k <= 10; k += 1) void hand(listing(10, k));
    calls[0]?.answerTruly();
    await flush();
    expect(calls.length).toBe(2);
    const asked = new Set(calls[0]?.paths);
    expect(calls[1]?.paths.length).toBe(20);
    for (const path of calls[1]?.paths ?? []) expect(asked.has(path)).toBe(false);

    calls[1]?.answerTruly();
    await flush();
    expect(calls.length).toBe(2);
    expect(store().ignored.has('d0010/b.log')).toBe(true);
    expect(store().ignored.size).toBe(11);
  });
});

describe('F7: the newest listing is looked at when the call ends', () => {
  it('nothing left to ask: no more calls, and a covered row gets its entry', async () => {
    truth = (path) => path === 'node_modules/';
    void hand(['node_modules/', 'src/']);
    const late = hand(['node_modules/', 'node_modules/new.js', 'src/']);
    calls[0]?.answerTruly();
    await late;
    expect(calls.length).toBe(1);
    expect(shown()).toEqual(['node_modules/', 'node_modules/new.js']);
  });

  it('a covered row listed while git ran is dimmed when THAT call ends', async () => {
    truth = (path) => path === 'node_modules/';
    void hand(['node_modules/', 'src/']);
    void hand(['node_modules/', 'node_modules/new.js', 'src/', 'other.ts']);
    calls[0]?.answerTruly();
    await flush();
    // The call behind it, about other.ts alone, is still out.
    expect(calls.map((c) => c.done)).toEqual([true, false]);
    expect(calls[1]?.paths).toEqual(['other.ts']);
    expect(shown()).toEqual(['node_modules/', 'node_modules/new.js']);
  });

  it('with no call out, a covered row gets its entry at once and asks nothing', async () => {
    truth = (path) => path === 'node_modules/';
    await settled(['node_modules/', 'src/']);
    void hand(['node_modules/', 'node_modules/new.js', 'src/']);
    expect(shown()).toEqual(['node_modules/', 'node_modules/new.js']);
    expect(calls.length).toBe(0);
  });

  it('a revalidation owed: the call behind it replaces, so a path can leave', async () => {
    await settled(['a.log', 'b.log']);
    void hand(['a.log', 'b.log', 'c.ts']);
    truth = (path) => path === 'a.log';
    store().invalidate();
    void hand(['a.log', 'b.log', 'c.ts']);
    calls[0]?.answerTruly();
    await flush();
    expect(calls[1]?.paths).toEqual(['c.ts', 'a.log', 'b.log']);
    calls[1]?.answerTruly();
    await flush();
    expect(shown()).toEqual(['a.log']);
    expect(calls.length).toBe(2);
  });
});

describe('F8: a failed call starts nothing by itself', () => {
  it('one call in a minute, and the set on screen does not move', async () => {
    await settled(listing(10, 10));
    failMs = 2;
    store().invalidate();
    void hand(listing(10, 10));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls.length).toBe(1);
    expect(store().ignored.size).toBe(11);
  });
});

describe('F9: a git that fails every time is asked about once a second', () => {
  it('twenty ticks of 101 listings, 1 ms apart', async () => {
    const n = 100;
    const full = listing(n, n);
    failMs = 2;
    for (let t = 0; t < 20; t += 1) {
      store().invalidate();
      for (let k = 0; k <= n; k += 1) {
        void hand(new Set(full));
        await vi.advanceTimersByTimeAsync(1);
      }
      await vi.advanceTimersByTimeAsync(TICK_MS - (n + 1));
    }
    const started = calls.length;
    expect(started).toBeGreaterThanOrEqual(8);
    expect(started).toBeLessThanOrEqual(10);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls.length - started).toBeLessThanOrEqual(1);
    expect(mostOut()).toBe(1);
  });

  it('the first sync a second after a failure asks once', async () => {
    failMs = 2;
    void hand(listing(10, 10));
    await vi.advanceTimersByTimeAsync(2);
    failMs = null;
    await vi.advanceTimersByTimeAsync(RETRY_AFTER_FAILURE_MS);
    expect(calls.length).toBe(1);
    void hand(listing(10, 10));
    void hand(listing(10, 10));
    await flush();
    expect(calls.length).toBe(2);
  });

  it('reset and a new folder clear the hold', async () => {
    failMs = 2;
    void hand(listing(10, 10));
    await vi.advanceTimersByTimeAsync(2);
    store().reset();
    void hand(listing(10, 10));
    expect(calls.length).toBe(2);
    await vi.advanceTimersByTimeAsync(2);
    void store().sync(OTHER, ['x.log'], NO_LINKS);
    expect(calls.length).toBe(3);
  });

  it('a clock set back an hour does not hold for an hour', async () => {
    failMs = 2;
    void hand(listing(10, 10));
    await vi.advanceTimersByTimeAsync(2);
    vi.setSystemTime(Date.now() - 3_600_000);
    void hand(listing(10, 10));
    expect(calls.length).toBe(2);
  });

  it('an answer ends the hold, whatever the clock says afterwards', async () => {
    failMs = 2;
    void hand(['a.log']);
    await vi.advanceTimersByTimeAsync(2);
    failMs = null;
    const failed = Date.now();
    vi.setSystemTime(failed - 5_000);
    void hand(['a.log']);
    calls[1]?.answerTruly();
    await flush();
    vi.setSystemTime(failed + 1);
    void hand(['a.log', 'b.log']);
    expect(calls.length).toBe(3);
  });
});

describe('F14: a listing a failure left unanswered is asked about once', () => {
  for (const when of ['while the failed call ran', 'after it failed'] as const) {
    it(`ten listings ${when}, then a quiet tree`, async () => {
      const n = 10;
      failMs = when === 'after it failed' ? 2 : 50;
      void hand(listing(n, 0));
      if (when === 'after it failed') {
        await vi.advanceTimersByTimeAsync(3);
        failMs = null;
        autoMs = 20;
      }
      for (let k = 1; k <= n; k += 1) {
        void hand(listing(n, k));
        await vi.advanceTimersByTimeAsync(1);
      }
      await vi.advanceTimersByTimeAsync(60);
      failMs = null;
      autoMs = 20;
      expect(calls.length).toBe(1);
      expect(shown()).toEqual([]);
      // Ten listings, ONE timer.
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(RETRY_AFTER_FAILURE_MS + 20);
      expect(store().ignored.size).toBe(n + 1);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(calls.length).toBe(2);
    });
  }

  it('the call BEHIND a mount fails once, then a quiet tree (the fix round)', async () => {
    // The lens's reading: 2 of 12 rows dimmed, for good, where the parent
    // dims all twelve. The listings the failed call carried are not late.
    const n = 10;
    for (let k = 0; k <= n; k += 1) void hand(listing(n, k));
    calls[0]?.answerTruly();
    await flush();
    expect(calls.length).toBe(2);
    calls[1]?.fail();
    await flush();
    expect(shown()).toEqual(['root.log']);
    expect(vi.getTimerCount()).toBe(1);
    autoMs = 20;
    await vi.advanceTimersByTimeAsync(RETRY_AFTER_FAILURE_MS + 20);
    expect(store().ignored.size).toBe(n + 1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls.length).toBe(3);
  });

  it('and when its retry fails too, nothing more starts (the fix round)', async () => {
    const n = 10;
    for (let k = 0; k <= n; k += 1) void hand(listing(n, k));
    calls[0]?.answerTruly();
    await flush();
    failMs = 2;
    calls[1]?.fail();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls.length).toBe(3);
  });

  it('a retry that fails too starts nothing more', async () => {
    failMs = 2;
    void hand(listing(10, 1));
    await vi.advanceTimersByTimeAsync(3);
    void hand(listing(10, 2));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls.length).toBe(2);
  });

  it('a sync after the second takes the place of the retry', async () => {
    failMs = 2;
    void hand(listing(10, 1));
    await vi.advanceTimersByTimeAsync(2);
    void hand(listing(10, 2));
    expect(vi.getTimerCount()).toBe(1);
    // The listing arrives as the hold ends, before the timer's own turn, and
    // its call fails too. Nothing newer came, so nothing more is asked.
    vi.setSystemTime(Date.now() + RETRY_AFTER_FAILURE_MS);
    void hand(listing(10, 3));
    expect(calls.length).toBe(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls.length).toBe(2);
  });

  const leave: Array<[string, () => void]> = [
    ['reset', () => store().reset()],
    [
      'a new folder',
      () => {
        // Nothing to ask there, so the count is the retry's alone.
        void store().sync(OTHER, [], NO_LINKS);
      }
    ],
    [
      'a folder on another machine',
      () => {
        void store().sync(workspaceTarget('/repo', 'mac-pro'), ['x.log'], NO_LINKS);
      }
    ]
  ];
  for (const [name, go] of leave) {
    it(`${name} inside the second drops it`, async () => {
      failMs = 2;
      void hand(listing(10, 1));
      await vi.advanceTimersByTimeAsync(3);
      void hand(listing(10, 2));
      expect(vi.getTimerCount()).toBe(1);
      go();
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(calls.length).toBe(1);
    });
  }
});

describe('F10: what a sync settles on', () => {
  /** True once `promise` has settled. Never rejects. */
  const watch = (promise: Promise<void>): { done: boolean; bad: boolean } => {
    const seen = { done: false, bad: false };
    promise.then(
      () => {
        seen.done = true;
      },
      () => {
        seen.bad = true;
      }
    );
    return seen;
  };

  it('a sync that started a call reads the set as it was when that call ended', async () => {
    const first = hand(['a.log']);
    const second = hand(['a.log', 'late.log']);
    const seen = watch(second);
    // The call behind answers as fast as a bridge can.
    instant = true;
    calls[0]?.answerTruly();
    await first;
    expect(calls.length).toBe(2);
    expect(shown()).toEqual(['a.log']);
    expect(seen.done).toBe(false);
    await second;
    expect(shown()).toEqual(['a.log', 'late.log']);
  });

  it('a recorded sync settles with the call behind it and reads its hit', async () => {
    void hand(['a.log']);
    const recorded = hand(['a.log', 'late.log']);
    const seen = watch(recorded);
    await flush();
    expect(seen.done).toBe(false);
    calls[0]?.answerTruly();
    await flush();
    expect(seen.done).toBe(false);
    calls[1]?.answerTruly();
    await recorded;
    expect(store().ignored.has('late.log')).toBe(true);
  });

  it('nothing left to ask settles a recorded sync when the call ends', async () => {
    void hand(['a.log']);
    const recorded = hand(['a.log']);
    calls[0]?.answerTruly();
    await recorded;
    expect(calls.length).toBe(1);
  });

  it('nothing to ask settles at once', async () => {
    await settled(['a.log']);
    await hand(['a.log']);
    expect(calls.length).toBe(0);
  });

  it('a failed call settles the sync that started it and every one recorded', async () => {
    const first = hand(['a.log']);
    const recorded = hand(['a.log', 'late.log']);
    calls[0]?.fail();
    await first;
    await recorded;
    expect(shown()).toEqual([]);
    // And inside the second after it a sync settles at once, too.
    await hand(['a.log', 'late.log']);
    expect(calls.length).toBe(1);
  });

  it('a bridge that throws at once is a failed call', async () => {
    throwing = true;
    const first = watch(hand(['a.log']));
    await flush();
    expect(first).toEqual({ done: true, bad: false });
    throwing = false;
    // Held for a second like any failure, then asked.
    await hand(['a.log']);
    expect(calls.length).toBe(0);
    await vi.advanceTimersByTimeAsync(RETRY_AFTER_FAILURE_MS);
    expect(calls.length).toBe(1);
    calls[0]?.answerTruly();
    await flush();
    expect(shown()).toEqual(['a.log']);
  });

  it('an answer that is not a list is a failed call, and the store is not stuck', async () => {
    const first = watch(hand(['a.log']));
    calls[0]?.answer(undefined as unknown as string[]);
    await flush();
    expect(first).toEqual({ done: true, bad: false });
    await vi.advanceTimersByTimeAsync(RETRY_AFTER_FAILURE_MS);
    void hand(['a.log']);
    expect(calls.length).toBe(2);
  });

  it('leaving the folder settles every sync it had recorded', async () => {
    void hand(['a.log']);
    const recorded = hand(['a.log', 'late.log']);
    store().reset();
    await recorded;
    expect(shown()).toEqual([]);
  });

  it('a sync carried by an abandoned call settles when that call ends', async () => {
    void hand(['a.log']);
    const recorded = hand(['a.log', 'late.log']);
    const seen = watch(recorded);
    calls[0]?.answerTruly();
    await flush();
    store().reset();
    calls[1]?.answerTruly();
    await flush();
    expect(seen).toEqual({ done: true, bad: false });
    expect(shown()).toEqual([]);
  });

  it('no sync ever rejects, whatever git does', async () => {
    const seen = [];
    failMs = 2;
    for (let i = 0; i < 20; i += 1) {
      seen.push(watch(hand(listing(10, i % 10))));
      if (i % 5 === 4) store().invalidate();
      if (i % 7 === 6) store().reset();
      await vi.advanceTimersByTimeAsync(300);
    }
    await vi.advanceTimersByTimeAsync(5_000);
    expect(seen.every((s) => s.done && !s.bad)).toBe(true);
  });
});

describe('F11: more than 20,000 paths', () => {
  it('end as a chain, one call at a time, then none', async () => {
    const paths = new Set<string>();
    for (let i = 0; i < 50_000; i += 1) {
      paths.add(`f${String(i).padStart(5, '0')}.${i % 10 === 0 ? 'log' : 'txt'}`);
    }
    void hand(paths);
    for (let round = 0; round < 6; round += 1) {
      for (const call of calls) call.answerTruly();
      await flush();
    }
    expect(calls.map((c) => c.paths.length)).toEqual([20_000, 20_000, 10_000]);
    expect(mostOut()).toBe(1);
    expect(store().ignored.size).toBe(5_000);
  });
});

/** 20,000 short names, and behind them 300 long ones nothing but the cap hides. */
const MANY_SHORT = Array.from(
  { length: 20_000 },
  (_, i) => `f${String(i).padStart(5, '0')}.txt`
);
const LONG_LOGS = Array.from(
  { length: 300 },
  (_, i) => `a-name-far-longer-than-the-rest-${pad(i)}.log`
);

describe('F17: a replacement replaces what it asked about (the fix round)', () => {
  it('a row past the cap stays dimmed until it is asked about', async () => {
    const full = [...MANY_SHORT, ...LONG_LOGS];
    await settled(full);
    await settled(full);
    expect(store().ignored.size).toBe(300);

    const sizes: number[] = [];
    const stop = useTreeIgnored.subscribe((s) => sizes.push(s.ignored.size));
    store().invalidate();
    void hand(full);
    expect(calls[0]?.paths.length).toBe(20_000);
    calls[0]?.answerTruly();
    await flush();
    expect(store().ignored.size).toBe(300);
    // Shown, and still asked about: a kept row excuses nothing.
    expect(calls[1]?.paths.length).toBe(300);
    truth = (path) => isLog(path) && path !== LONG_LOGS[7];
    calls[1]?.answerTruly();
    await flush();
    stop();
    expect(store().ignored.size).toBe(299);
    expect(store().ignored.has(LONG_LOGS[7] ?? '')).toBe(false);
    expect(calls.length).toBe(2);
    expect(sizes.every((size) => size >= 299)).toBe(true);
  });

  it('and so does one two caps deep', async () => {
    const full = [
      ...MANY_SHORT,
      ...MANY_SHORT.map((name) => `longer-${name}`),
      ...LONG_LOGS
    ];
    await settled(full);
    await settled(full);
    expect(store().ignored.size).toBe(300);
    const sizes: number[] = [];
    const stop = useTreeIgnored.subscribe((s) => sizes.push(s.ignored.size));
    store().invalidate();
    void hand(full);
    instant = true;
    calls[0]?.answerTruly();
    await flush();
    stop();
    expect(calls.map((c) => c.paths.length)).toEqual([20_000, 20_000, 300]);
    expect(sizes.filter((size) => size !== 300)).toEqual([]);
  });

  it('a minute of a writer under a 12 s git keeps every one of them', async () => {
    const full = [...MANY_SHORT, ...LONG_LOGS];
    await settled(full);
    await settled(full);
    autoMs = 12_000;
    let smallest = Infinity;
    const stop = useTreeIgnored.subscribe((s) => {
      smallest = Math.min(smallest, s.ignored.size);
    });
    for (let t = 0; t < 60_000; t += 2_000) {
      store().invalidate();
      void hand(full);
      await vi.advanceTimersByTimeAsync(2_000);
    }
    stop();
    expect(calls.length).toBeGreaterThanOrEqual(4);
    expect(smallest).toBe(300);
  });

  it('the call behind a full ask fails once: the rest is asked a second later', async () => {
    const full = [...MANY_SHORT, ...LONG_LOGS];
    void hand(full);
    calls[0]?.answerTruly();
    await flush();
    expect(calls[1]?.paths.length).toBe(300);
    calls[1]?.fail();
    await flush();
    autoMs = 20;
    await vi.advanceTimersByTimeAsync(RETRY_AFTER_FAILURE_MS + 20);
    expect(store().ignored.size).toBe(300);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls.length).toBe(3);
  });

  it('a folder past the cap keeps its rows, a link and a new row among them', async () => {
    const DIR = 'a-folder-with-a-long-name-of-its-own/';
    const LINK = 'a-linked-folder-with-a-longer-name-still/';
    const links = new Set([LINK]);
    const isDimmed = (path: string): boolean =>
      path === DIR || path === LINK.slice(0, -1) || path.startsWith(DIR);
    const full = [...MANY_SHORT, DIR, `${DIR}in.js`, LINK, `${LINK}in.js`];
    truth = isDimmed;
    const dimmed = [DIR, `${DIR}in.js`, LINK, `${LINK}in.js`].sort();
    instant = true;
    for (let i = 0; i < 3; i += 1) {
      await hand(full, links);
      await flush();
    }
    instant = false;
    calls = [];
    expect(shown()).toEqual(dimmed);

    const sizes: number[] = [];
    const stop = useTreeIgnored.subscribe((s) => sizes.push(s.ignored.size));
    store().invalidate();
    void hand(full, links);
    const now = [...full, `${DIR}new.js`];
    void hand(now, links);
    calls[0]?.answerTruly();
    await flush();
    // The new row is under a kept folder, so it is shown with it.
    expect(shown()).toEqual([...dimmed, `${DIR}new.js`].sort());
    // Asked, the folder's rows too, and never a path past the link.
    expect(calls[1]?.paths).toEqual([
      DIR,
      LINK.slice(0, -1),
      `${DIR}in.js`,
      `${DIR}new.js`
    ]);
    truth = () => false;
    calls[1]?.answerTruly();
    await flush();
    stop();
    expect(Math.min(...sizes.slice(0, -1), dimmed.length)).toBe(dimmed.length);
    expect(shown()).toEqual([]);
  });

  it('a row deleted and made again while a full ask runs never goes bright', async () => {
    await settled(['a.log', 'b.log', 'src/']);
    const sizes: number[] = [];
    const stop = useTreeIgnored.subscribe((s) => sizes.push(s.ignored.size));
    store().invalidate();
    // The listing the ask was made from has no b.log; the newest one has.
    void hand(['a.log', 'src/']);
    void hand(['a.log', 'b.log', 'src/']);
    calls[0]?.answerTruly();
    await flush();
    expect(calls[1]?.paths).toEqual(['b.log']);
    calls[1]?.answerTruly();
    await flush();
    stop();
    expect(shown()).toEqual(['a.log', 'b.log']);
    expect(sizes.every((size) => size === 2)).toBe(true);
    expect(calls.length).toBe(2);
  });

  it('a row no longer listed leaves with the replacement', async () => {
    await settled(['a.log', 'b.log', 'src/']);
    store().invalidate();
    void hand(['a.log', 'src/']);
    calls[0]?.answerTruly();
    await flush();
    expect(shown()).toEqual(['a.log']);
    expect(calls.length).toBe(1);
  });

  it('leaving the folder keeps none of it', async () => {
    const full = [...MANY_SHORT, ...LONG_LOGS];
    await settled(full);
    await settled(full);
    store().invalidate();
    void hand(full);
    calls[0]?.answerTruly();
    await flush();
    expect(store().ignored.size).toBe(300);
    // The call behind is out. Another folder with the very same names.
    const here = LONG_LOGS.slice(0, 3);
    void store().sync(OTHER, here, NO_LINKS);
    const asked = calls[calls.length - 1];
    expect(asked?.repoPath).toBe('/other');
    asked?.answerTruly();
    await flush();
    expect(shown()).toEqual([...here].sort());
    // And what it answered stays confirmed: nothing is asked again.
    const before = calls.length;
    void store().sync(OTHER, here, NO_LINKS);
    expect(calls.length).toBe(before);
  });
});

describe('F16: nobody is asked about for a tree nobody sees (the fix round)', () => {
  it('the section collapsed mid-call, a writer, a 12 s git: nothing starts', async () => {
    const full = listing(10, 10);
    await settled(full);
    autoMs = 12_000;
    store().invalidate();
    void hand(full);
    expect(calls.length).toBe(1);
    // Collapsed: FilesSection goes on distrusting, and no listing comes.
    for (let t = 0; t < 300_000; t += TICK_MS) {
      store().invalidate();
      await vi.advanceTimersByTimeAsync(TICK_MS);
    }
    expect(calls.length).toBe(1);
    expect(store().ignored.size).toBe(11);

    // Opened again: one full ask, which settles it.
    truth = (path) => path === 'root.log';
    void hand(full);
    expect(calls.length).toBe(2);
    expect(calls[1]?.paths.length).toBe(full.size);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(shown()).toEqual(['root.log']);
    expect(calls.length).toBe(2);
  });

  it('a listing recorded before it closed is still asked about, once', async () => {
    const full = listing(10, 10);
    await settled(full);
    autoMs = 12_000;
    store().invalidate();
    void hand(full);
    const last = hand(full);
    for (let t = 0; t < 300_000; t += TICK_MS) {
      store().invalidate();
      await vi.advanceTimersByTimeAsync(TICK_MS);
    }
    expect(calls.length).toBe(2);
    await last;
  });

  it('a rule removed while collapsed stays owed until it is opened (the reverify)', async () => {
    const full = listing(10, 10);
    await settled(full);
    store().invalidate();
    void hand(full);
    const first = calls[0];
    if (first === undefined) throw new Error('no call started');
    const before = first.paths.filter(truth);
    // Collapsed: the rule goes past the floor, then git answers the old rules.
    await vi.advanceTimersByTimeAsync(10_500);
    store().invalidate();
    truth = (path) => path === 'root.log';
    first.answer(before);
    await flush();
    expect(calls.length).toBe(1);
    expect(store().ignored.size).toBe(11);

    void hand(full);
    expect(calls.length).toBe(2);
    expect(calls[1]?.paths.length).toBe(full.size);
    calls[1]?.answerTruly();
    await flush();
    expect(shown()).toEqual(['root.log']);
  });
});

describe('F12: the rendered set never shrinks while the truth has not changed', () => {
  it('across a revalidation tick of N+2 syncs, git held and then answering', async () => {
    const full = listing(100, 100);
    await settled(full);
    const sizes: number[] = [];
    const stop = useTreeIgnored.subscribe((s) => sizes.push(s.ignored.size));
    for (let t = 0; t < 3; t += 1) {
      change(100, full);
      await flush();
      for (const call of calls) call.answerTruly();
      await flush();
      vi.advanceTimersByTime(10_000);
    }
    stop();
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBe(101);
    expect(store().ignored.size).toBe(101);
  });

  it('across a minute of a writer under a 1 s git', async () => {
    const n = 100;
    await settled(listing(n, n));
    autoMs = 1_000;
    let before = store().ignored.size;
    let shrank = 0;
    const stop = useTreeIgnored.subscribe((s) => {
      if (s.ignored.size < before) shrank += 1;
      before = s.ignored.size;
    });
    const extra: string[] = [];
    for (let t = 0; t < Math.floor(60_000 / TICK_MS); t += 1) {
      extra.push(`d0001/new${pad(t)}.log`);
      change(n, listing(n, n, extra));
      await vi.advanceTimersByTimeAsync(TICK_MS);
      // Inside the loop, so a pile-up ends the row at its first tick.
      expect(mostOut()).toBe(1);
    }
    stop();
    expect(shrank).toBe(0);
    expect(mostOut()).toBe(1);
    // One call a second, where the store before this phase started 13,439.
    expect(calls.length).toBeLessThanOrEqual(62);
    // And the tree keeps up: every row but the last few seconds' is dimmed.
    expect(store().ignored.size).toBeGreaterThan(n + 1 + 120);
  });
});

describe('F13: RULE 6 holds on the call behind the first', () => {
  const LINKS: ReadonlySet<string> = new Set([
    '.venv/',
    'bazel-out/',
    'node_modules/pkgb/',
    '.claude/skills/',
    'src/linkIgnored/'
  ]);
  const LOADED = [
    '.claude/',
    '.claude/skills/',
    '.claude/skills/notes.md',
    '.venv/',
    '.venv/secret.txt',
    'bazel-out/',
    'bazel-out/x.txt',
    'ignored.log',
    'node_modules/',
    'node_modules/pkgb/',
    'node_modules/pkgb/b.js',
    'src/',
    'src/index.ts',
    'src/linkIgnored/',
    'src/linkIgnored/i.js'
  ];
  const DIMMED = [
    '.venv/',
    '.venv/secret.txt',
    'bazel-out/',
    'bazel-out/x.txt',
    'ignored.log',
    'node_modules/',
    'node_modules/pkgb/',
    'node_modules/pkgb/b.js'
  ];
  const IGNORED = new Set([
    'node_modules/',
    'node_modules/pkgb',
    'ignored.log',
    '.venv',
    'bazel-out'
  ]);
  /** Git answers nothing for a whole batch that holds a path past a link. */
  const answerAsGit = (call: Call | undefined): void => {
    const beyond = call?.paths.some((path) =>
      [...LINKS].some((link) => path.startsWith(link))
    );
    call?.answer(
      beyond === true ? [] : (call?.paths ?? []).filter((p) => IGNORED.has(p))
    );
  };

  it('never asks past a link, and all eight stay dimmed', async () => {
    void hand(LOADED, LINKS);
    answerAsGit(calls[0]);
    await flush();
    expect(shown()).toEqual(DIMMED);

    const sizes: number[] = [];
    const stop = useTreeIgnored.subscribe((s) => sizes.push(s.ignored.size));
    store().invalidate();
    for (let k = 0; k < 6; k += 1) void hand([...LOADED], LINKS);
    vi.advanceTimersByTime(10_000);
    store().invalidate();
    for (let k = 0; k < 6; k += 1) void hand([...LOADED], LINKS);
    expect(calls.length).toBe(2);
    answerAsGit(calls[1]);
    await flush();
    expect(calls.length).toBe(3);
    answerAsGit(calls[2]);
    await flush();
    stop();

    expect(calls.length).toBe(3);
    for (const call of calls) {
      for (const path of call.paths) {
        expect([...LINKS].some((link) => path.startsWith(link))).toBe(false);
      }
    }
    expect(calls[2]?.paths).toContain('.venv');
    expect(Math.min(...sizes)).toBe(DIMMED.length);
    expect(shown()).toEqual(DIMMED);
  });
});

describe('F15: a listing handed over from inside a landing', () => {
  it('starts no second call', async () => {
    void hand(['a.log']);
    let once = false;
    const stop = useTreeIgnored.subscribe((s) => {
      if (once || s.ignored.size === 0) return;
      once = true;
      void hand(['a.log', 'b.log']);
    });
    // The call the subscriber starts is still out when the landing looks.
    calls[0]?.answerTruly();
    await flush();
    stop();
    expect(calls.map((c) => c.paths)).toEqual([['a.log'], ['b.log']]);
    expect(mostOut()).toBe(1);
  });

  it('its call failing once loses nothing it carried (the fix round)', async () => {
    void hand(['a.log']);
    void hand(['a.log', 'late.log']);
    let once = false;
    const stop = useTreeIgnored.subscribe((s) => {
      if (once || s.ignored.size === 0) return;
      once = true;
      void hand(['a.log', 'late.log']);
    });
    calls[0]?.answerTruly();
    await flush();
    stop();
    expect(calls[1]?.paths).toEqual(['late.log']);
    calls[1]?.fail();
    await flush();
    autoMs = 20;
    await vi.advanceTimersByTimeAsync(RETRY_AFTER_FAILURE_MS + 20);
    expect(shown()).toEqual(['a.log', 'late.log']);
    expect(calls.length).toBe(3);
  });

  it('a retry armed before a call starts no second one beside it', async () => {
    failMs = 2;
    void hand(['a.log']);
    await vi.advanceTimersByTimeAsync(2);
    void hand(['a.log', 'b.log']);
    failMs = null;
    // A sync at the end of the hold starts the call, and it stays out.
    vi.setSystemTime(Date.now() + RETRY_AFTER_FAILURE_MS);
    void hand(['a.log', 'b.log']);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(mostOut()).toBe(1);
    expect(calls.length).toBe(2);
  });
});
