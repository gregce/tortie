/**
 * Phase 90.1. The file tree store, driven through the six switches.
 *
 * THE DEFECT THESE TESTS EXIST FOR. `setRoot` returned early when the path
 * string was unchanged. A person with the same path on two machines has two
 * tabs, and switching between them left this Mac's listing on screen under the
 * other machine's badge. Nothing errored. Row 3 below is that switch.
 *
 * Six rows, and every one of them counts `fs.readDir` calls rather than reading
 * the code. `L1` and `L2` are two paths on this Mac. `R` is `L1`'s path on the
 * machine `p901`. `R2` is the same path on `p902`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  localTarget,
  workspaceTarget,
  type WorkspaceTarget
} from '@shared/workspace-target';

/** Every path fs.readDir was asked for, in order. */
let reads: string[] = [];

async function readDir(dirPath: string): Promise<{
  entries: Array<{ name: string; kind: 'dir' | 'file' }>;
}> {
  reads.push(dirPath);
  return { entries: [{ name: 'a.ts', kind: 'file' }] };
}

vi.stubGlobal('window', { gmux: { fs: { readDir } } });
vi.mock('../../state/store', () => ({
  errorText: (err: unknown) => String(err)
}));

const { useFileTree } = await import('../store');

const L1 = '/repo/one';
const L2 = '/repo/two';
const R: WorkspaceTarget = workspaceTarget(L1, 'p901');
const R2: WorkspaceTarget = workspaceTarget(L1, 'p902');

const store = (): ReturnType<typeof useFileTree.getState> =>
  useFileTree.getState();

beforeEach(async () => {
  reads = [];
  useFileTree.setState({
    root: null,
    entriesByDir: {},
    rootLoaded: false,
    rootError: null,
    bridgeMissing: false
  });
});

describe('the six switches', () => {
  it('row 1, none to L1: re-targets, and lists the root once', async () => {
    await store().setRoot(localTarget(L1));
    expect(store().root).toEqual({ machineId: 'local', path: L1 });
    expect(reads).toEqual([L1]);
    expect(store().rootLoaded).toBe(true);
  });

  it('row 2, L1 to L2: re-targets, clears, and lists once', async () => {
    await store().setRoot(localTarget(L1));
    reads = [];
    await store().setRoot(localTarget(L2));
    expect(store().root).toEqual({ machineId: 'local', path: L2 });
    expect(Object.keys(store().entriesByDir)).toEqual([L2]);
    expect(reads).toEqual([L2]);
  });

  it('row 3, L1 to R: re-targets, clears, and reads NOTHING', async () => {
    await store().setRoot(localTarget(L1));
    reads = [];
    await store().setRoot(R);
    expect(store().root).toEqual({ machineId: 'p901', path: L1 });
    expect(store().entriesByDir).toEqual({});
    expect(store().rootLoaded).toBe(false);
    expect(reads).toEqual([]);
  });

  it('row 4, R to L1: re-targets, and lists the root once', async () => {
    await store().setRoot(R);
    reads = [];
    await store().setRoot(localTarget(L1));
    expect(store().root).toEqual({ machineId: 'local', path: L1 });
    expect(reads).toEqual([L1]);
    expect(store().rootLoaded).toBe(true);
  });

  it('row 5, R to R2: re-targets, and reads nothing', async () => {
    await store().setRoot(R);
    await store().setRoot(R2);
    expect(store().root).toEqual({ machineId: 'p902', path: L1 });
    expect(reads).toEqual([]);
  });

  it('row 6, L1 to an equal fresh object: nothing at all', async () => {
    await store().setRoot(localTarget(L1));
    reads = [];
    let notifications = 0;
    const off = useFileTree.subscribe(() => {
      notifications += 1;
    });
    for (let i = 0; i < 50; i += 1) {
      await store().setRoot({ machineId: 'local', path: L1 });
    }
    off();
    expect(notifications).toBe(0);
    expect(reads).toEqual([]);
  });
});

describe('nothing local runs for a target on another machine', () => {
  it('loadDir reads nothing', async () => {
    await store().setRoot(R);
    await store().loadDir(`${L1}/src`);
    expect(reads).toEqual([]);
  });

  it('relist reads nothing', async () => {
    await store().setRoot(R);
    await store().relist([L1, `${L1}/src`]);
    expect(reads).toEqual([]);
  });

  it('refreshLoaded reads nothing', async () => {
    await store().setRoot(R);
    await store().refreshLoaded();
    expect(reads).toEqual([]);
  });
});

describe('a late listing that belongs to a target already left', () => {
  it('is dropped rather than landing under the new target', async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((r) => {
      release = r;
    });
    vi.stubGlobal('window', {
      gmux: {
        fs: {
          readDir: async (dirPath: string) => {
            reads.push(dirPath);
            await held;
            return { entries: [{ name: 'late.ts', kind: 'file' as const }] };
          }
        }
      }
    });
    const slow = store().setRoot(localTarget(L1));
    await store().setRoot(R);
    release();
    await slow;
    expect(store().root).toEqual({ machineId: 'p901', path: L1 });
    expect(store().entriesByDir).toEqual({});
    vi.stubGlobal('window', { gmux: { fs: { readDir } } });
  });
});
