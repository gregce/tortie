/**
 * Phase 155. Refresh is the manual override, so it can never be a no-op.
 *
 * THE HAZARD THESE TESTS CLOSE. `listInto` began `if (inFlight.has(dirPath))
 * return;`. The `finally` clears that set, so it was never permanent, but it
 * was real: `refreshLoaded()` awaits a read of EVERY cached folder at once, the
 * watcher calls the same `refreshLoaded()` every few hundred milliseconds while
 * anything writes, and a press that landed inside another read returned at once
 * for every folder and repainted nothing. A read already running was started
 * BEFORE the person pressed the button, so its answer cannot speak for what
 * they have just done.
 *
 * Every test here counts `fs.readDir` calls and watches what the store ends up
 * holding. `readDir` is deliberately slow and controlled by hand, because the
 * whole question is what happens in the window while one is in flight.
 *
 * The lazy load keeps its old behaviour on purpose and there is a test for it:
 * `loadDir` wanted a listing, one is already on its way, and that is enough.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { localTarget } from '@shared/workspace-target';

interface Entry {
  name: string;
  kind: 'dir' | 'file';
}

/** Every path fs.readDir was asked for, in order. */
let reads: string[] = [];
/** What the next answer for a path should be. */
let contents = new Map<string, Entry[]>();
/** Reads parked until `let go` is called, by path. */
let parked: Array<{ path: string; release: () => void }> = [];
/** True while reads are parked instead of answering at once. */
let parking = false;

async function readDir(dirPath: string): Promise<{ entries: Entry[] }> {
  reads.push(dirPath);
  if (parking) {
    await new Promise<void>((resolve) => {
      parked.push({ path: dirPath, release: resolve });
    });
  }
  return { entries: contents.get(dirPath) ?? [] };
}

vi.stubGlobal('window', { gmux: { fs: { readDir } } });
vi.mock('../../state/store', () => ({
  errorText: (err: unknown) => String(err)
}));

const { useFileTree } = await import('../store');

const ROOT = '/repo';
const store = (): ReturnType<typeof useFileTree.getState> =>
  useFileTree.getState();

/** Let every parked read answer, then let the promises settle. */
async function letGo(): Promise<void> {
  const waiting = parked;
  parked = [];
  for (const one of waiting) one.release();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const names = (dir: string): string[] =>
  (store().entriesByDir[dir] ?? []).map((e) => e.name);

beforeEach(() => {
  reads = [];
  parked = [];
  parking = false;
  contents = new Map([[ROOT, [{ name: 'README.md', kind: 'file' as const }]]]);
  useFileTree.setState({
    root: null,
    entriesByDir: {},
    rootLoaded: false,
    rootError: null,
    bridgeMissing: false,
    remote: null
  });
});

describe('Refresh, pressed while a read is already running', () => {
  it('READS THE FOLDER AGAIN rather than riding the one in flight', async () => {
    await store().setRoot(localTarget(ROOT));
    expect(names(ROOT)).toEqual(['README.md']);

    // A read starts, the watcher's say, and does not answer yet.
    parking = true;
    reads = [];
    const watcherTick = store().refreshLoaded();
    expect(reads).toEqual([ROOT]);

    // He drops a file, and presses Refresh inside that window.
    contents.set(ROOT, [
      { name: 'README.md', kind: 'file' },
      { name: 'dropped.md', kind: 'file' }
    ]);
    const press = store().refreshLoaded();

    // The first read answers with the folder as it was.
    await letGo();
    // The press has started its OWN read, which is the whole point.
    await letGo();
    await watcherTick;
    await press;

    expect(reads).toEqual([ROOT, ROOT]);
    expect(names(ROOT)).toEqual(['dropped.md', 'README.md']);
  });

  it('ten presses in one burst cost ONE extra read, not ten', async () => {
    await store().setRoot(localTarget(ROOT));
    parking = true;
    reads = [];
    const running = store().refreshLoaded();
    const presses = Array.from({ length: 10 }, () => store().refreshLoaded());

    await letGo();
    await letGo();
    await running;
    await Promise.all(presses);

    expect(reads).toEqual([ROOT, ROOT]);
  });

  it('re-reads every folder the tree has open, not only the root', async () => {
    contents.set(ROOT, [{ name: 'src', kind: 'dir' }]);
    contents.set(`${ROOT}/src`, [{ name: 'a.ts', kind: 'file' }]);
    await store().setRoot(localTarget(ROOT));
    await store().loadDir(`${ROOT}/src`);
    reads = [];

    contents.set(`${ROOT}/src`, [
      { name: 'a.ts', kind: 'file' },
      { name: 'b.ts', kind: 'file' }
    ]);
    await store().refreshLoaded();

    expect([...reads].sort()).toEqual([ROOT, `${ROOT}/src`]);
    expect(names(`${ROOT}/src`)).toEqual(['a.ts', 'b.ts']);
  });
});

describe('relist, the verb every local file operation ends with', () => {
  it('re-reads a folder whose read is already in flight', async () => {
    await store().setRoot(localTarget(ROOT));
    parking = true;
    reads = [];
    const watcherTick = store().refreshLoaded();

    contents.set(ROOT, [
      { name: 'README.md', kind: 'file' },
      { name: 'dropped.md', kind: 'file' }
    ]);
    const afterImport = store().relist([ROOT]);

    await letGo();
    await letGo();
    await watcherTick;
    await afterImport;

    expect(reads).toEqual([ROOT, ROOT]);
    expect(names(ROOT)).toEqual(['dropped.md', 'README.md']);
  });
});

describe('what deliberately did NOT change', () => {
  it('a lazy load still rides a read that is already on its way', async () => {
    contents.set(ROOT, [{ name: 'src', kind: 'dir' }]);
    contents.set(`${ROOT}/src`, [{ name: 'a.ts', kind: 'file' }]);
    await store().setRoot(localTarget(ROOT));
    parking = true;
    reads = [];

    const first = store().loadDir(`${ROOT}/src`);
    const second = store().loadDir(`${ROOT}/src`);
    await letGo();
    await first;
    await second;

    expect(reads).toEqual([`${ROOT}/src`]);
  });

  it('a lazy load of a folder already cached reads nothing at all', async () => {
    contents.set(ROOT, [{ name: 'src', kind: 'dir' }]);
    contents.set(`${ROOT}/src`, [{ name: 'a.ts', kind: 'file' }]);
    await store().setRoot(localTarget(ROOT));
    await store().loadDir(`${ROOT}/src`);
    reads = [];
    await store().loadDir(`${ROOT}/src`);
    expect(reads).toEqual([]);
  });

  it('a root switch during a parked read leaves the old answer out', async () => {
    await store().setRoot(localTarget(ROOT));
    parking = true;
    const press = store().refreshLoaded();
    parking = false;
    await store().setRoot(localTarget('/other'));
    await letGo();
    await press;

    expect(Object.keys(store().entriesByDir)).toEqual(['/other']);
  });
});
