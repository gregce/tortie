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
 * the same path again on machine `p902`. The count that matters in every row is
 * the number of ripgrep runs the store asked for.
 *
 * No process, no window and no view. `search.start` is a fake that records what
 * it was asked to run.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceTarget } from '@shared/workspace-target';

/** Every search this store asked for, in order. */
let starts: { repoPath: string; query: string }[] = [];
/** Every cancel, so a switch can be shown to stop what was running. */
let cancels = 0;

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
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

/** Switch to a target and let the 150 ms debounce fire. */
function switchTo(target: WorkspaceTarget | null): void {
  store().syncProject(target);
  vi.advanceTimersByTime(300);
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
  cancels = 0;
  store().clear();
  useSearch.setState({ target: null });
  // Set the query straight into the store rather than through `setQuery`, so
  // the only thing that can schedule a run in these tests is a switch.
  useSearch.setState({ query: 'needle' });
});

describe('the six transitions', () => {
  it('1. none to L1 runs once, on L1', () => {
    switchTo(L1);
    expect(starts).toEqual([{ repoPath: '/l1', query: 'needle' }]);
  });

  it('2. L1 to L2 runs once more, on L2', () => {
    switchTo(L1);
    switchTo(L2);
    expect(starts.map((s) => s.repoPath)).toEqual(['/l1', '/l2']);
  });

  it('3. L1 to R re-targets, clears, and runs NOTHING. This is the defect', () => {
    switchTo(L1);
    useSearch.setState({ files: oneFile(), totalFiles: 1, totalMatches: 1 });
    starts = [];

    switchTo(R);

    expect(store().target).toEqual(R);
    expect(starts).toEqual([]);
    expect(store().files).toEqual([]);
    expect(store().totalFiles).toBe(0);
    expect(store().status).toBe('idle');
  });

  it('4. R to L1 runs once, on L1', () => {
    switchTo(R);
    starts = [];
    switchTo(L1);
    expect(starts).toEqual([{ repoPath: '/l1', query: 'needle' }]);
  });

  it('5. R to R2 re-targets and still runs nothing', () => {
    switchTo(R);
    starts = [];
    switchTo(R2);
    expect(store().target).toEqual(R2);
    expect(starts).toEqual([]);
  });

  it('6. L1 to L1, by a fresh but equal object, does nothing at all', () => {
    switchTo(L1);
    starts = [];
    let notifications = 0;
    const stop = useSearch.subscribe(() => {
      notifications += 1;
    });

    for (let i = 0; i < 50; i += 1) store().syncProject(fresh(L1));
    vi.advanceTimersByTime(300);
    stop();

    expect(notifications).toBe(0);
    expect(starts).toEqual([]);
  });
});

describe('what a switch must not break', () => {
  it('keeps the query and the toggles across a switch', () => {
    switchTo(L1);
    useSearch.setState({
      isRegex: true,
      isCaseSensitive: true,
      includes: '*.ts'
    });

    switchTo(L2);

    expect(store().query).toBe('needle');
    expect(store().isRegex).toBe(true);
    expect(store().isCaseSensitive).toBe(true);
    expect(store().includes).toBe('*.ts');
  });

  it('stops the running search when the target changes', () => {
    switchTo(L1);
    const before = cancels;
    switchTo(L2);
    expect(cancels).toBeGreaterThan(before);
  });
});

describe('noteRepoChanged, which is still a path', () => {
  it('marks the set stale when the watcher names the folder being shown', () => {
    switchTo(L1);
    useSearch.setState({ status: 'done', files: oneFile(), stale: false });

    store().noteRepoChanged('/l1');

    expect(store().stale).toBe(true);
  });

  it('ignores that same folder while the view is showing another machine', () => {
    switchTo(R);
    useSearch.setState({ status: 'done', files: oneFile(), stale: false });

    // The watcher can only ever be talking about this Mac, and this Mac is not
    // what the panel is showing.
    store().noteRepoChanged('/l1');

    expect(store().stale).toBe(false);
  });
});
