/**
 * The Explorer's data store against a folder on another machine (Phase 90.3).
 *
 * TWO PROPERTIES, and both are counted rather than asserted.
 *
 *  1. NEVER IN SERIES. Research 55 measured nine folders read as nine calls at
 *     409.7 ms and the same nine answers in one subtree call at 42.3 ms. So
 *     opening a tab is ONE call, and expanding a folder the answer already
 *     covered is ZERO. The fake below counts every call, and the counts are the
 *     assertions.
 *  2. NO TIMER, ANYWHERE. Time is advanced by ten minutes with the store idle
 *     and the call count has to be unchanged. That is the honest half of having
 *     no poll: nothing re-reads that machine until a person presses Refresh.
 *
 * The bridge is faked. What crosses to a machine is driven for real in
 * `GMUX_SMOKE=remote-sessions` and by `node build/probe-remote-tree.mjs`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localTarget, workspaceTarget } from '@shared/workspace-target';
import type { RemoteTreeListing } from '@shared/ipc';

const ROOT = '/Users/gdc/gmux';

/** Every root that was asked for, in order. */
let asks: string[] = [];
/** What the fake machine answers for one root. */
let answers: Record<string, RemoteTreeListing> = {};

function listTree(input: { machineId: string; root: string }): Promise<RemoteTreeListing> {
  asks.push(input.root);
  return Promise.resolve(
    answers[input.root] ?? { status: 'missing', root: input.root }
  );
}

// The store's own module graph reaches src/renderer/state/store.ts, which
// listens for a window resize at import time. So the stub carries the two
// listener functions as well as the bridge, and nothing else.
vi.stubGlobal('window', {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  matchMedia: () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  }),
  gmux: {
    machines: { listTree },
    // The local half of the bridge is deliberately absent, so a local target
    // in these tests reads as a build with no fs.readDir rather than reaching
    // a disk.
    fs: {}
  }
});

const { useFileTree } = await import('../store');

const ok = (root: string, entries: readonly [string, 'dir' | 'file'][]): RemoteTreeListing => ({
  status: 'ok',
  root,
  entries: entries.map(([path, kind]) => ({ path, kind })),
  total: entries.length,
  truncated: false,
  readAt: 1_700_000_000_000
});

beforeEach(() => {
  asks = [];
  answers = {
    [ROOT]: ok(ROOT, [
      [`${ROOT}/src`, 'dir'],
      [`${ROOT}/src/a.ts`, 'file'],
      [`${ROOT}/src/deep`, 'dir'],
      [`${ROOT}/README.md`, 'file']
    ]),
    [`${ROOT}/src/deep`]: ok(`${ROOT}/src/deep`, [
      [`${ROOT}/src/deep/b.ts`, 'file']
    ])
  };
  vi.useFakeTimers();
});

afterEach(async () => {
  vi.useRealTimers();
  await useFileTree.getState().setRoot(null);
});

describe('opening a tab whose folder is on another machine', () => {
  it('costs exactly one call and fills every folder in the answer', async () => {
    await useFileTree.getState().setRoot(workspaceTarget(ROOT, 'mac-pro'));
    expect(asks).toEqual([ROOT]);
    const cache = useFileTree.getState().entriesByDir;
    expect(cache[ROOT]?.map((one) => one.name)).toEqual([
      'src',
      'README.md'
    ]);
    expect(cache[`${ROOT}/src`]?.map((one) => one.name)).toEqual(['deep', 'a.ts']);
    expect(useFileTree.getState().rootLoaded).toBe(true);
    expect(useFileTree.getState().remote?.readAt).toBe(1_700_000_000_000);
  });

  it('costs NOTHING to expand a folder the answer already covered', async () => {
    await useFileTree.getState().setRoot(workspaceTarget(ROOT, 'mac-pro'));
    asks = [];
    await useFileTree.getState().loadDir(`${ROOT}/src`);
    expect(asks).toEqual([]);
  });

  it('costs exactly one call to expand PAST the fetched depth', async () => {
    await useFileTree.getState().setRoot(workspaceTarget(ROOT, 'mac-pro'));
    asks = [];
    // The root's answer named the folder but not its children, which is the
    // state a person reaches by expanding at the edge of the walk.
    useFileTree.setState((s) => {
      const next = { ...s.entriesByDir };
      delete next[`${ROOT}/src/deep`];
      return { entriesByDir: next };
    });
    await useFileTree.getState().loadDir(`${ROOT}/src/deep`);
    expect(asks).toEqual([`${ROOT}/src/deep`]);
    expect(
      useFileTree.getState().entriesByDir[`${ROOT}/src/deep`]?.map((one) => one.name)
    ).toEqual(['b.ts']);
  });

  it('costs exactly one call to refresh, whatever is cached', async () => {
    await useFileTree.getState().setRoot(workspaceTarget(ROOT, 'mac-pro'));
    asks = [];
    await useFileTree.getState().refreshLoaded();
    expect(asks).toEqual([ROOT]);
  });

  it('reads NOTHING on a clock', async () => {
    await useFileTree.getState().setRoot(workspaceTarget(ROOT, 'mac-pro'));
    asks = [];
    await vi.advanceTimersByTimeAsync(600_000);
    expect(asks).toEqual([]);
  });
});

describe('what the machine refused', () => {
  it('keeps the refusal and draws no rows', async () => {
    answers = {};
    await useFileTree.getState().setRoot(workspaceTarget('/not-there', 'mac-pro'));
    expect(useFileTree.getState().remote?.status).toBe('missing');
    expect(useFileTree.getState().entriesByDir).toEqual({});
  });

  it('is cleared when the tab moves back to this Mac', async () => {
    await useFileTree.getState().setRoot(workspaceTarget(ROOT, 'mac-pro'));
    await useFileTree.getState().setRoot(localTarget(ROOT));
    expect(useFileTree.getState().remote).toBeNull();
    expect(useFileTree.getState().entriesByDir).toEqual({});
  });

  it('never asks a machine for a folder on this Mac', async () => {
    await useFileTree.getState().setRoot(localTarget(ROOT));
    expect(asks).toEqual([]);
  });
});
