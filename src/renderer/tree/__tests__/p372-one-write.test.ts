/**
 * Phase 372. One Explorer refresh writes the tree once.
 *
 * WHAT THESE ROWS CLOSE. Before this phase every answer of a refresh wrote the
 * cache with a `set` of its own, whether or not that folder had changed, so a
 * change on disk with 500 folders open was 502 store writes, 502 passes of the
 * tree's model and 502 calls into the ignore store. A listing equal to the one
 * held now writes nothing (D1, D2), the answers one refresh asked for are
 * written by one `set` (D3), a listing never replaces one read after it (D4), a
 * forgotten folder is never brought back (D5), a project switch writes nothing
 * of the old one (D6), Phase 155's re-read holds (D7), and what a person does
 * to one folder still writes at once (D8). build/p372/SPEC.md §1 and §7.1.
 *
 * Every row counts the store's own notifications, and the ones whose cache
 * changed identity, over a fake `fs.readDir` that snapshots the folder when the
 * read is CALLED (so an older read carries the older listing) and answers when
 * the row lets it go. Rows whose question is a timer run under fake timers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localTarget } from '@shared/workspace-target';
import type { FsDirEntry } from '@shared/types';

/** Every path fs.readDir was asked for, in order. */
let reads: string[] = [];
/** What a read of a path called now would answer. */
let contents = new Map<string, FsDirEntry[]>();
/** Reads parked until a row lets them go. */
let parked: Array<{ path: string; release: () => void }> = [];
/** True while reads park instead of answering at once. */
let parking = false;

async function readDir(
  dirPath: string
): Promise<{ path: string; entries: FsDirEntry[] }> {
  reads.push(dirPath);
  // Fresh objects with equal values, as IPC delivers them.
  const snap = contents.get(dirPath)?.map((e) => ({ ...e }));
  if (parking) {
    await new Promise<void>((resolve) => {
      parked.push({ path: dirPath, release: resolve });
    });
  }
  if (snap === undefined) throw new Error(`ENOENT: ${dirPath}`);
  return { path: dirPath, entries: snap };
}

vi.stubGlobal('window', { gmux: { fs: { readDir } } });
vi.mock('../../state/store', () => ({
  errorText: (err: unknown) => String(err)
}));

const { useFileTree, sameListing, REFRESH_QUIET_MS, REFRESH_CAP_MS } =
  await import('../store');

const ROOT = '/repo';
const at = (name: string): string => `${ROOT}/${name}`;
const store = (): ReturnType<typeof useFileTree.getState> =>
  useFileTree.getState();

const file = (dir: string, name: string): FsDirEntry => ({
  name,
  path: `${dir}/${name}`,
  kind: 'file'
});
const folder = (dir: string, name: string): FsDirEntry => ({
  name,
  path: `${dir}/${name}`,
  kind: 'dir'
});

/** Let promise chains run, with no clock moving. */
async function settle(): Promise<void> {
  for (let i = 0; i < 40; i += 1) await Promise.resolve();
}

/** Let the parked reads of these paths answer (each path's oldest first). */
async function release(...paths: string[]): Promise<void> {
  for (const path of paths) {
    const i = parked.findIndex((p) => p.path === path);
    if (i < 0) throw new Error(`no parked read of ${path}`);
    const [one] = parked.splice(i, 1);
    one?.release();
  }
  await settle();
}

/** Let every parked read answer in one burst. */
async function letGo(): Promise<void> {
  const waiting = parked;
  parked = [];
  for (const one of waiting) one.release();
  await settle();
}

const names = (dir: string): string[] =>
  (store().entriesByDir[dir] ?? []).map((e) => e.name);

/** Store notifications, and the ones whose cache changed identity. */
let notes = 0;
let writes = 0;
let unsubscribe: () => void = () => undefined;
const count = (): void => {
  notes = 0;
  writes = 0;
  unsubscribe();
  unsubscribe = useFileTree.subscribe((state, prev) => {
    notes += 1;
    if (state.entriesByDir !== prev.entriesByDir) writes += 1;
  });
};

/** A root with these child folders, every one cached (expanded). */
async function openWith(children: string[]): Promise<void> {
  contents.set(
    ROOT,
    children.map((c) => folder(ROOT, c))
  );
  for (const c of children) contents.set(at(c), [file(at(c), 'a.txt')]);
  await store().setRoot(localTarget(ROOT));
  for (const c of children) await store().loadDir(at(c));
  reads = [];
}

beforeEach(async () => {
  vi.useRealTimers();
  reads = [];
  parked = [];
  parking = false;
  contents = new Map();
  unsubscribe();
  // Point the store away so every closure variable from the last row is let go.
  await useFileTree.getState().setRoot(null);
  useFileTree.setState({
    root: null,
    entriesByDir: {},
    rootLoaded: false,
    rootError: null,
    bridgeMissing: false,
    remote: null
  });
});

afterEach(() => {
  unsubscribe();
  unsubscribe = () => undefined;
  vi.useRealTimers();
});

describe('T1 a refresh over an unchanged disk', () => {
  it('reads every folder and writes nothing; the cache is the same object', async () => {
    await openWith(['a', 'b']);
    const before = store().entriesByDir;
    count();
    await store().refreshLoaded();
    expect([...reads].sort()).toEqual([ROOT, at('a'), at('b')]);
    expect(writes).toBe(0);
    expect(notes).toBe(0);
    expect(store().entriesByDir).toBe(before);
  });
});

describe('T2 exactly one field changed writes once', () => {
  const variants: Array<[string, (e: FsDirEntry[]) => FsDirEntry[]]> = [
    ['a name', (e) => [{ ...e[0]!, name: 'b.txt' }]],
    ['a path', (e) => [{ ...e[0]!, path: '/elsewhere/a.txt' }]],
    ['a kind', (e) => [{ ...e[0]!, kind: 'other' }]],
    ['an entry added', (e) => [...e, file(at('a'), 'z.txt')]],
    ['an entry removed', () => []],
    [
      'an extra own key on one entry',
      (e) => [{ ...e[0]!, extra: 1 } as unknown as FsDirEntry]
    ]
  ];
  for (const [what, change] of variants) {
    it(`${what}`, async () => {
      await openWith(['a', 'b']);
      contents.set(at('a'), change(contents.get(at('a'))!));
      count();
      await store().refreshLoaded();
      expect(writes).toBe(1);
      expect(store().entriesByDir[at('a')]).toEqual(
        expect.arrayContaining(contents.get(at('a'))!)
      );
    });
  }

  it('the order (two names a case-blind sort keeps in the order read)', async () => {
    await openWith(['a']);
    contents.set(at('a'), [file(at('a'), 'A.txt'), file(at('a'), 'a.txt')]);
    await store().refreshLoaded();
    expect(names(at('a'))).toEqual(['A.txt', 'a.txt']);
    contents.set(at('a'), [file(at('a'), 'a.txt'), file(at('a'), 'A.txt')]);
    count();
    await store().refreshLoaded();
    expect(writes).toBe(1);
    expect(names(at('a'))).toEqual(['a.txt', 'A.txt']);
  });

  const link = (target?: FsDirEntry['link']): FsDirEntry => ({
    name: 'ln',
    path: at('a/ln'),
    kind: 'symlink',
    ...(target === undefined ? {} : { link: target })
  });

  it('a link gained', async () => {
    await openWith(['a']);
    contents.set(at('a'), [link()]);
    await store().refreshLoaded();
    contents.set(at('a'), [link('dir')]);
    count();
    await store().refreshLoaded();
    expect(writes).toBe(1);
    expect(store().entriesByDir[at('a')]?.[0]?.link).toBe('dir');
  });

  it('a link changed', async () => {
    await openWith(['a']);
    contents.set(at('a'), [link('dir')]);
    await store().refreshLoaded();
    contents.set(at('a'), [link('none')]);
    count();
    await store().refreshLoaded();
    expect(writes).toBe(1);
    expect(store().entriesByDir[at('a')]?.[0]?.link).toBe('none');
  });

  it('a link lost reads as different, and the store still carries it (Phase 343 D4)', async () => {
    expect(sameListing([link('dir')], [link()])).toBe(false);
    expect(sameListing([link()], [link('dir')])).toBe(false);
    await openWith(['a']);
    contents.set(at('a'), [link('dir')]);
    await store().refreshLoaded();
    contents.set(at('a'), [link()]);
    count();
    await store().refreshLoaded();
    // main's wait ran out: the listing keeps what the same name pointed at.
    expect(writes).toBe(0);
    expect(store().entriesByDir[at('a')]?.[0]?.link).toBe('dir');
  });

  it('sameListing over every own key, both ways', () => {
    const one = file(at('a'), 'x');
    expect(sameListing(undefined, undefined)).toBe(true);
    expect(sameListing([one], undefined)).toBe(false);
    expect(sameListing([one], [{ ...one }])).toBe(true);
    expect(sameListing([one], [one, one])).toBe(false);
    const more = { ...one, extra: 1 } as unknown as FsDirEntry;
    expect(sameListing([one], [more])).toBe(false);
    expect(sameListing([more], [one])).toBe(false);
  });
});

describe('T3 nothing to write writes nothing', () => {
  it('a child read failing for a folder not cached writes nothing', async () => {
    await openWith(['a']);
    count();
    await store().relist([at('gone')]);
    expect(reads).toEqual([at('gone')]);
    expect(notes).toBe(0);
  });

  it('a root read succeeding twice writes nothing; a root error is written once when it moves', async () => {
    await openWith(['a']);
    count();
    await store().refreshLoaded();
    await store().refreshLoaded();
    expect(notes).toBe(0);
    contents.delete(ROOT);
    await store().refreshLoaded();
    expect(store().rootError).toContain('ENOENT');
    expect(notes).toBe(1);
  });
});

describe('T4 one refresh lands as one write', () => {
  it('500 folders whose listings all change, answered in one burst', async () => {
    vi.useFakeTimers();
    const children = Array.from(
      { length: 500 },
      (_, i) => `d${String(i).padStart(4, '0')}`
    );
    await openWith(children);
    for (const c of children) {
      contents.set(at(c), [file(at(c), 'a.txt'), file(at(c), 'new.txt')]);
    }
    contents.delete(at('d0007')); // vanished
    parking = true;
    count();
    const press = store().refreshLoaded();
    expect(reads.length).toBe(501);
    await letGo();
    await press;
    expect(writes).toBe(1);
    for (const c of children) {
      if (c === 'd0007') continue;
      expect(names(at(c))).toEqual(['a.txt', 'new.txt']);
    }
    expect(store().entriesByDir[at('d0007')]).toBeUndefined();
  });
});

describe('T5 a slow folder does not hold the rest', () => {
  it('the others are written REFRESH_QUIET_MS after they stop; the held one alone when it lands', async () => {
    vi.useFakeTimers();
    await openWith(['a', 'b', 'c']);
    for (const c of ['a', 'b', 'c']) {
      contents.set(at(c), [file(at(c), 'new.txt')]);
    }
    parking = true;
    count();
    const press = store().refreshLoaded();
    await release(ROOT, at('a'), at('b'));
    expect(writes).toBe(0);
    await vi.advanceTimersByTimeAsync(REFRESH_QUIET_MS - 1);
    expect(writes).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(writes).toBe(1);
    expect(names(at('a'))).toEqual(['new.txt']);
    expect(names(at('b'))).toEqual(['new.txt']);
    expect(names(at('c'))).toEqual(['a.txt']);
    await release(at('c'));
    expect(writes).toBe(2);
    expect(names(at('c'))).toEqual(['new.txt']);
    await press;
  });

  it('answers trickling 7 ms apart are written once at REFRESH_CAP_MS', async () => {
    vi.useFakeTimers();
    const children = Array.from({ length: 30 }, (_, i) => `t${i}`);
    await openWith(children);
    for (const c of children) contents.set(at(c), [file(at(c), 'new.txt')]);
    parking = true;
    count();
    const press = store().refreshLoaded();
    await release(at('t0'));
    let elapsed = 0;
    for (let i = 1; elapsed + 7 < REFRESH_CAP_MS; i += 1) {
      await vi.advanceTimersByTimeAsync(7);
      elapsed += 7;
      await release(at(`t${i}`));
    }
    expect(writes).toBe(0);
    await vi.advanceTimersByTimeAsync(REFRESH_CAP_MS - elapsed);
    expect(writes).toBe(1);
    expect(names(at('t0'))).toEqual(['new.txt']);
    await letGo();
    await press;
  });
});

describe('T6 a late answer lands alone', () => {
  it('after its flush, with nothing else out, it is written at once', async () => {
    vi.useFakeTimers();
    await openWith(['a', 'b']);
    contents.set(at('a'), [file(at('a'), 'new.txt')]);
    contents.set(at('b'), [file(at('b'), 'new.txt')]);
    parking = true;
    count();
    const press = store().refreshLoaded();
    await release(ROOT, at('a'));
    await vi.advanceTimersByTimeAsync(REFRESH_QUIET_MS);
    expect(writes).toBe(1);
    await release(at('b'));
    expect(writes).toBe(2);
    expect(names(at('b'))).toEqual(['new.txt']);
    await press;
  });
});

describe('T7 a listing never replaces one read after it', () => {
  it('a relist landing first keeps its newer listing through the flush', async () => {
    await openWith(['a', 'b']);
    contents.set(at('a'), [file(at('a'), 'old.txt')]);
    parking = true;
    const press = store().refreshLoaded();
    await release(ROOT, at('a')); // staged: b is still out
    contents.set(at('a'), [file(at('a'), 'newer.txt')]);
    const relist = store().relist([at('a')]);
    await release(at('a'));
    await relist;
    expect(names(at('a'))).toEqual(['newer.txt']);
    await release(at('b'));
    await press;
    expect(names(at('a'))).toEqual(['newer.txt']);
  });
});

describe('T8 a forgotten folder is never brought back', () => {
  it('forgotten while its collected read is out', async () => {
    await openWith(['a', 'b']);
    parking = true;
    const press = store().refreshLoaded();
    store().forgetUnder([at('a')]);
    await letGo();
    await press;
    expect(store().entriesByDir[at('a')]).toBeUndefined();
  });

  it('forgotten while its answer is staged', async () => {
    await openWith(['a', 'b']);
    parking = true;
    const press = store().refreshLoaded();
    await release(ROOT, at('a')); // staged: b is still out
    store().forgetUnder([at('a')]);
    await release(at('b'));
    await press;
    expect(store().entriesByDir[at('a')]).toBeUndefined();
  });

  it('its parent forgotten while the child is read', async () => {
    contents.set(ROOT, [folder(ROOT, 'a')]);
    contents.set(at('a'), [folder(at('a'), 'x')]);
    contents.set(at('a/x'), [file(at('a/x'), 'f.txt')]);
    await store().setRoot(localTarget(ROOT));
    await store().loadDir(at('a'));
    await store().loadDir(at('a/x'));
    parking = true;
    const press = store().refreshLoaded();
    await release(ROOT, at('a'));
    store().forgetUnder([at('a')]);
    await letGo();
    await press;
    expect(store().entriesByDir[at('a')]).toBeUndefined();
    expect(store().entriesByDir[at('a/x')]).toBeUndefined();
  });

  it('a new loadDir after the forget lands', async () => {
    await openWith(['a', 'b']);
    parking = true;
    const press = store().refreshLoaded();
    store().forgetUnder([at('a')]);
    contents.set(at('a'), [file(at('a'), 'again.txt')]);
    const expand = store().loadDir(at('a'));
    await letGo(); // the old reads
    await letGo(); // the expand's own
    await expand;
    await press;
    expect(names(at('a'))).toEqual(['again.txt']);
  });
});

describe('T9 a project switch writes nothing of the old project', () => {
  it('with a collection staged and out', async () => {
    await openWith(['a', 'b']);
    contents.set(at('a'), [file(at('a'), 'new.txt')]);
    contents.set('/other', [file('/other', 'o.txt')]);
    parking = true;
    const press = store().refreshLoaded();
    await release(ROOT, at('a')); // staged: b is still out
    const shown = store().setRoot(localTarget('/other'));
    await letGo();
    await shown;
    await press;
    expect(Object.keys(store().entriesByDir)).toEqual(['/other']);
    expect(names('/other')).toEqual(['o.txt']);
    // The new project's own refresh flushes nothing the old one staged.
    parking = false;
    contents.set('/other', [file('/other', 'o.txt'), file('/other', 'p.txt')]);
    await store().refreshLoaded();
    await new Promise((resolve) => setTimeout(resolve, REFRESH_CAP_MS + 20));
    expect(Object.keys(store().entriesByDir)).toEqual(['/other']);
    expect(names('/other')).toEqual(['o.txt', 'p.txt']);
  });
});

describe('T10 Phase 155 holds through the collection', () => {
  it('a Refresh while an answer is only staged reads that folder again, and that answer lands', async () => {
    await openWith(['a', 'b']);
    parking = true;
    const first = store().refreshLoaded();
    await release(ROOT, at('a')); // a staged, b out
    contents.set(at('a'), [file(at('a'), 'dropped.md')]);
    const press = store().refreshLoaded();
    // Started now, before anything is written, not after the flush.
    expect(reads.filter((r) => r === at('a'))).toHaveLength(2);
    await letGo();
    await letGo();
    await first;
    await press;
    expect(names(at('a'))).toEqual(['dropped.md']);
  });

  it('ten presses while reads are out cost one extra read a folder', async () => {
    await openWith(['a', 'b']);
    parking = true;
    const running = store().refreshLoaded();
    const presses = Array.from({ length: 10 }, () => store().refreshLoaded());
    await letGo();
    await letGo();
    await running;
    await Promise.all(presses);
    for (const d of [ROOT, at('a'), at('b')]) {
      expect(reads.filter((r) => r === d)).toHaveLength(2);
    }
  });
});

describe('T11 a relist inside a held collection writes at once', () => {
  it('a folder not out', async () => {
    vi.useFakeTimers();
    await openWith(['a', 'b']);
    parking = true;
    const press = store().refreshLoaded();
    await release(ROOT, at('a')); // b is held
    contents.set(ROOT, [...contents.get(ROOT)!, file(ROOT, 'made.txt')]);
    let done = false;
    const relist = store()
      .relist([ROOT])
      .then(() => {
        done = true;
      });
    await release(ROOT);
    expect(done).toBe(true);
    expect(names(ROOT)).toContain('made.txt');
    await relist;
    await vi.advanceTimersByTimeAsync(REFRESH_CAP_MS);
    await letGo();
    await press;
  });

  it('a folder whose collected read is out: the extra read it joins writes at once', async () => {
    vi.useFakeTimers();
    await openWith(['a', 'b']);
    parking = true;
    const first = store().refreshLoaded();
    const second = store().refreshLoaded(); // queues a collected re-read of each
    contents.set(at('a'), [file(at('a'), 'made.txt')]);
    let done = false;
    const relist = store()
      .relist([at('a')])
      .then(() => {
        done = true;
      });
    await release(ROOT, at('a')); // b is held; the extra reads start
    await release(at('a')); // the extra read of a, which the relist joined
    expect(done).toBe(true);
    expect(names(at('a'))).toEqual(['made.txt']);
    await relist;
    await vi.advanceTimersByTimeAsync(REFRESH_CAP_MS);
    await letGo();
    await letGo();
    await first;
    await second;
  });
});

describe('T11 a person who joins a running collected read takes it out of the collection', () => {
  it('the rest of the refresh is written when it has answered, with no timer', async () => {
    vi.useFakeTimers();
    await openWith(['a', 'b']);
    contents.set(at('b'), [file(at('b'), 'new.txt')]);
    parking = true;
    count();
    const press = store().refreshLoaded();
    const relist = store().relist([at('a')]); // a's collected read is out
    await release(ROOT, at('b'));
    // a is now the relist's, so nothing collected is out: b is written.
    expect(writes).toBe(1);
    expect(names(at('b'))).toEqual(['new.txt']);
    await letGo(); // a's first read, raised, lands at once
    await letGo(); // the relist's own read
    await relist;
    await press;
  });
});

describe('T12 an expand inside a held collection writes at once', () => {
  it('a loadDir of an uncached folder', async () => {
    vi.useFakeTimers();
    await openWith(['a', 'b']);
    contents.set(at('c'), [file(at('c'), 'c.txt')]);
    parking = true;
    const press = store().refreshLoaded();
    await release(ROOT, at('a')); // b is held
    const expand = store().loadDir(at('c'));
    await release(at('c'));
    expect(names(at('c'))).toEqual(['c.txt']);
    await expand;
    await vi.advanceTimersByTimeAsync(REFRESH_CAP_MS);
    await letGo();
    await press;
  });
});

describe('T13 refreshLoaded resolves once every read it asked for is written', () => {
  it('not while its answers are only staged', async () => {
    vi.useFakeTimers();
    await openWith(['a']);
    contents.set(at('a'), [file(at('a'), 'new.txt')]);
    parking = true;
    let firstDone = false;
    const first = store()
      .refreshLoaded()
      .then(() => {
        firstDone = true;
      });
    // A folder opened between two refreshes: only the second reads it.
    parking = false;
    contents.set(ROOT, [...contents.get(ROOT)!, folder(ROOT, 'c')]);
    contents.set(at('c'), [file(at('c'), 'c.txt')]);
    await store().loadDir(at('c'));
    parking = true;
    const second = store().refreshLoaded();
    await release(ROOT, at('a')); // all of the first's answered; c is out
    expect(firstDone).toBe(false);
    expect(names(at('a'))).toEqual(['a.txt']);
    await vi.advanceTimersByTimeAsync(REFRESH_QUIET_MS);
    expect(firstDone).toBe(true);
    expect(names(at('a'))).toEqual(['new.txt']);
    await first;
    await letGo();
    await letGo();
    await second;
  });
});

describe('T14 the two constants', () => {
  it('are 8 and 100', () => {
    expect(REFRESH_QUIET_MS).toBe(8);
    expect(REFRESH_CAP_MS).toBe(100);
  });
});
