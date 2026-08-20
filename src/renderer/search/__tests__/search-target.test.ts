/**
 * The Search store decides what to do from a PAIR, being the machine and the
 * folder (Phase 90.1).
 *
 * The defect these tests exist for: `syncProject` compared a path string, so a
 * person with `/Users/gdc/gmux` on this Mac and `/Users/gdc/gmux` on a second
 * machine could switch between the two tabs and see the first machine's result
 * rows stay on screen under the second machine's name. Nothing errored.
 *
 * Six transitions are driven below and they are the whole matrix. `L1` and `L2`
 * are two folders on this Mac. `R` is `L1`'s path on machine `p901`. `R2` is
 * the same path again on machine `p902`.
 *
 * PHASE 98 REWROTE TRANSITIONS 3 AND 5. Both used to assert that a folder on
 * another machine runs NOTHING, which was true while nothing could search one.
 * Each of them now asks that machine once and asks ripgrep nothing, and the two
 * counts are read separately so a run on the wrong computer cannot pass.
 *
 * No process, no window and no view. `search.start` and `machines.searchContent`
 * are fakes that record what they were asked to run.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineSearchResult } from '@shared/ipc';
import type { WorkspaceTarget } from '@shared/workspace-target';

/** Every ripgrep search this store asked for, in order. */
let starts: { repoPath: string; query: string }[] = [];
/** Every search this store asked a MACHINE for, in order. */
let remotes: { machineId: string; cwd: string; query: string }[] = [];
/** Every cancel, so a switch can be shown to stop what was running. */
let cancels = 0;

/** One row, so a machine's answer can be told apart from this Mac's. */
function remoteAnswer(machineId: string, cwd: string): MachineSearchResult {
  return {
    machineId,
    machineLabel: machineId === 'p901' ? 'Studio' : 'Loft',
    cwd,
    mode: 'repo',
    files: [
      {
        relPath: 'src/there.ts',
        matchCount: 1,
        matches: [
          {
            line: 7,
            text: 'needle',
            trimmed: 0,
            ranges: [[0, 6]],
            byteOffset: 0
          }
        ],
        clipped: false
      }
    ],
    totalMatches: 1,
    totalFiles: 1,
    capped: false,
    truncated: false,
    elapsedMs: 201
  };
}

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
  setTimeout,
  clearTimeout,
  gmux: {
    search: {
      start: (input: { repoPath: string; query: string }) => {
        starts.push({ repoPath: input.repoPath, query: input.query });
        return Promise.resolve();
      },
      cancel: () => {
        cancels += 1;
        return Promise.resolve();
      },
      onResults: () => () => undefined,
      context: () => Promise.resolve({ lines: [] })
    },
    machines: {
      searchContent: (input: {
        machineId: string;
        cwd: string;
        query: string;
      }) => {
        remotes.push({
          machineId: input.machineId,
          cwd: input.cwd,
          query: input.query
        });
        return Promise.resolve(remoteAnswer(input.machineId, input.cwd));
      }
    }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useSearch } = await import('../store');

const L1: WorkspaceTarget = { machineId: 'local', path: '/l1' };
const L2: WorkspaceTarget = { machineId: 'local', path: '/l2' };
const R: WorkspaceTarget = { machineId: 'p901', path: '/l1' };
const R2: WorkspaceTarget = { machineId: 'p902', path: '/l1' };

/** A fresh object with the same two fields, which is what a render produces. */
function fresh(target: WorkspaceTarget): WorkspaceTarget {
  return { machineId: target.machineId, path: target.path };
}

const store = (): ReturnType<typeof useSearch.getState> => useSearch.getState();

/**
 * Switch to a target and let the debounce fire.
 *
 * 600 ms clears both pauses, being 150 ms for a folder on this Mac and 400 ms
 * for one on a machine. It is awaited so the one call to a machine has landed
 * before anything is read, which is what a person waiting 0.2 s gets.
 */
async function switchTo(target: WorkspaceTarget | null): Promise<void> {
  store().syncProject(target);
  await vi.advanceTimersByTimeAsync(600);
}

/** One result file, so "the previous set is still on screen" can be staged. */
function oneFile(): ReturnType<typeof useSearch.getState>['files'] {
  return [
    {
      relPath: 'src/a.ts',
      matchCount: 1,
      matches: [{ line: 3, text: 'hit', trimmed: 0, ranges: [[0, 3]] }]
    }
  ] as unknown as ReturnType<typeof useSearch.getState>['files'];
}

beforeEach(() => {
  vi.useFakeTimers();
  starts = [];
  remotes = [];
  cancels = 0;
  store().clear();
  useSearch.setState({ target: null });
  // Set the query straight into the store rather than through `setQuery`, so
  // the only thing that can schedule a run in these tests is a switch.
  useSearch.setState({ query: 'needle' });
});

describe('the six transitions', () => {
  it('1. none to L1 runs once, on L1', async () => {
    await switchTo(L1);
    expect(starts).toEqual([{ repoPath: '/l1', query: 'needle' }]);
    expect(remotes).toEqual([]);
  });

  it('2. L1 to L2 runs once more, on L2', async () => {
    await switchTo(L1);
    await switchTo(L2);
    expect(starts.map((s) => s.repoPath)).toEqual(['/l1', '/l2']);
    expect(remotes).toEqual([]);
  });

  it('3. L1 to R re-targets and runs ONE search on that machine, and no ripgrep', async () => {
    await switchTo(L1);
    useSearch.setState({ files: oneFile(), totalFiles: 1, totalMatches: 1 });
    starts = [];
    remotes = [];

    await switchTo(R);

    expect(store().target).toEqual(R);
    // Nothing on this Mac ran. This is the half the old assertion kept.
    expect(starts).toEqual([]);
    // One call, to the right machine, for the right folder.
    expect(remotes).toEqual([
      { machineId: 'p901', cwd: '/l1', query: 'needle' }
    ]);
    // That machine's own rows, and that machine's own label, are what is on
    // screen. The row from this Mac is gone.
    expect(store().files.map((f) => f.relPath)).toEqual(['src/there.ts']);
    expect(store().remoteMode).toBe('repo');
    expect(store().machineLabel).toBe('Studio');
    expect(store().status).toBe('done');
  });

  it('4. R to L1 runs once, on L1', async () => {
    await switchTo(R);
    starts = [];
    remotes = [];
    await switchTo(L1);
    expect(starts).toEqual([{ repoPath: '/l1', query: 'needle' }]);
    expect(remotes).toEqual([]);
    // The note about the previous machine went with its rows.
    expect(store().remoteMode).toBeNull();
    expect(store().machineLabel).toBeNull();
  });

  it('5. R to R2 re-targets and asks the SECOND machine, not the first', async () => {
    await switchTo(R);
    remotes = [];
    await switchTo(R2);
    expect(store().target).toEqual(R2);
    expect(remotes).toEqual([
      { machineId: 'p902', cwd: '/l1', query: 'needle' }
    ]);
    expect(starts).toEqual([]);
    expect(store().machineLabel).toBe('Loft');
  });

  it('6. L1 to L1, by a fresh but equal object, does nothing at all', async () => {
    await switchTo(L1);
    starts = [];
    let notifications = 0;
    const stop = useSearch.subscribe(() => {
      notifications += 1;
    });

    for (let i = 0; i < 50; i += 1) store().syncProject(fresh(L1));
    await vi.advanceTimersByTimeAsync(600);
    stop();

    expect(notifications).toBe(0);
    expect(starts).toEqual([]);
    expect(remotes).toEqual([]);
  });
});

describe('what a switch must not break', () => {
  it('keeps the query and the toggles across a switch', async () => {
    await switchTo(L1);
    useSearch.setState({
      isRegex: true,
      isCaseSensitive: true,
      includes: '*.ts'
    });

    await switchTo(L2);

    expect(store().query).toBe('needle');
    expect(store().isRegex).toBe(true);
    expect(store().isCaseSensitive).toBe(true);
    expect(store().includes).toBe('*.ts');
  });

  it('stops the running search when the target changes', async () => {
    await switchTo(L1);
    const before = cancels;
    await switchTo(L2);
    expect(cancels).toBeGreaterThan(before);
  });
});

describe('noteRepoChanged, which is still a path', () => {
  it('marks the set stale when the watcher names the folder being shown', async () => {
    await switchTo(L1);
    useSearch.setState({ status: 'done', files: oneFile(), stale: false });

    store().noteRepoChanged('/l1');

    expect(store().stale).toBe(true);
  });

  it('ignores that same folder while the view is showing another machine', async () => {
    await switchTo(R);
    useSearch.setState({ status: 'done', files: oneFile(), stale: false });

    // The watcher can only ever be talking about this Mac, and this Mac is not
    // what the panel is showing. Phase 98 did not change this. A result set
    // read from a machine is never marked stale by a change here.
    store().noteRepoChanged('/l1');

    expect(store().stale).toBe(false);
  });
});
