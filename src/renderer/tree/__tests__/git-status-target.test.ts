/**
 * Phase 90.1. The tree's git decorations, driven through the six switches.
 *
 * The decorations had the same defect the listing had. `setRepo` returned early
 * on an unchanged path string, so a switch between two tabs holding the same
 * path on two machines left this Mac's letters beside rows that were not on
 * this Mac.
 *
 * Every row counts `git.status` calls. There is no git call in this product
 * that can reach another machine's worktree, so the correct number for a target
 * that is not local is zero.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitFileStatus } from '@shared/types';
import { localTarget, workspaceTarget } from '@shared/workspace-target';

/** Every path git.status was asked for, in order. */
let asks: string[] = [];
/** Set to hold one call open, so a stale answer can be staged. */
let gate: Promise<void> | null = null;

const FILES: GitFileStatus[] = [{ path: 'a.ts', indexState: '.', worktreeState: 'M' }];

async function status(
  repoPath: string
): Promise<{ isRepo: boolean; files: GitFileStatus[] }> {
  asks.push(repoPath);
  if (gate !== null) await gate;
  return { isRepo: true, files: FILES };
}

vi.stubGlobal('window', { gmux: { git: { status } } });

const { useTreeGitStatus } = await import('../git-status');

const L1 = '/repo/one';
const L2 = '/repo/two';
const R = workspaceTarget(L1, 'p901');
const R2 = workspaceTarget(L1, 'p902');

const store = (): ReturnType<typeof useTreeGitStatus.getState> =>
  useTreeGitStatus.getState();

beforeEach(() => {
  asks = [];
  gate = null;
  useTreeGitStatus.setState({ repo: null, isRepo: false, files: [] });
});

describe('the six switches', () => {
  it('row 1, none to L1: re-targets and asks once', async () => {
    await store().setRepo(localTarget(L1));
    expect(store().repo).toEqual({ machineId: 'local', path: L1 });
    expect(asks).toEqual([L1]);
    expect(store().isRepo).toBe(true);
  });

  it('row 2, L1 to L2: re-targets, clears and asks once', async () => {
    await store().setRepo(localTarget(L1));
    asks = [];
    await store().setRepo(localTarget(L2));
    expect(store().repo).toEqual({ machineId: 'local', path: L2 });
    expect(asks).toEqual([L2]);
  });

  it('row 3, L1 to R: re-targets, clears and asks NOTHING', async () => {
    await store().setRepo(localTarget(L1));
    asks = [];
    await store().setRepo(R);
    expect(store().repo).toEqual({ machineId: 'p901', path: L1 });
    expect(store().isRepo).toBe(false);
    expect(store().files).toEqual([]);
    expect(asks).toEqual([]);
  });

  it('row 4, R to L1: re-targets and asks once', async () => {
    await store().setRepo(R);
    asks = [];
    await store().setRepo(localTarget(L1));
    expect(store().repo).toEqual({ machineId: 'local', path: L1 });
    expect(asks).toEqual([L1]);
  });

  it('row 5, R to R2: re-targets and asks nothing', async () => {
    await store().setRepo(R);
    await store().setRepo(R2);
    expect(store().repo).toEqual({ machineId: 'p902', path: L1 });
    expect(asks).toEqual([]);
  });

  it('row 6, L1 to an equal fresh object: nothing at all', async () => {
    await store().setRepo(localTarget(L1));
    asks = [];
    let notifications = 0;
    const off = useTreeGitStatus.subscribe(() => {
      notifications += 1;
    });
    for (let i = 0; i < 50; i += 1) {
      await store().setRepo({ machineId: 'local', path: L1 });
    }
    off();
    expect(notifications).toBe(0);
    expect(asks).toEqual([]);
  });
});

describe('refresh', () => {
  it('asks nothing while the target is on another machine', async () => {
    await store().setRepo(R);
    await store().refresh();
    expect(asks).toEqual([]);
  });
});

describe('a late answer for a target already left', () => {
  it('is dropped rather than decorating the new target', async () => {
    let release: () => void = () => undefined;
    gate = new Promise<void>((r) => {
      release = r;
    });
    const slow = store().setRepo(localTarget(L1));
    gate = null;
    await store().setRepo(R);
    release();
    await slow;
    expect(store().repo).toEqual({ machineId: 'p901', path: L1 });
    expect(store().isRepo).toBe(false);
    expect(store().files).toEqual([]);
  });
});

describe('applyExternal', () => {
  it('takes a local list', () => {
    store().applyExternal(localTarget(L1), FILES);
    expect(store().repo).toEqual({ machineId: 'local', path: L1 });
    expect(store().isRepo).toBe(true);
    expect(store().files).toEqual(FILES);
  });

  it('IGNORES a target on another machine, and performs no set', () => {
    let notifications = 0;
    const off = useTreeGitStatus.subscribe(() => {
      notifications += 1;
    });
    store().applyExternal(R, FILES);
    off();
    expect(notifications).toBe(0);
    expect(store().repo).toBeNull();
    expect(store().isRepo).toBe(false);
  });
});
