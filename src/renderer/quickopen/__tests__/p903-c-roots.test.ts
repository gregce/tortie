/**
 * Phase 90.3, rewritten by Phase 99. The roots quick open sends, and the record
 * it keeps of the files you have been in.
 *
 * WHAT PHASE 90.3 PROVED HERE, AND WHY IT IS GONE. That phase dropped every
 * project on another machine from `rootsFor`, because the engine was ripgrep
 * walking THIS Mac's disk and such a path would have named a different file
 * here or nothing at all. Quick open reads that machine's own file names now,
 * so the drop is deleted and so is the recents refusal that followed from it.
 *
 * THE RULE BEING PROVED INSTEAD. Every project yields a ROOT KEY. A folder on
 * this Mac keys as its own absolute path, byte for byte what every build before
 * this phase sent, and a folder on another machine keys as
 * `machine:<machineId>:<path>`. Three claims follow and all three are below:
 *
 *  1. No query and no warm ever sends a bare path from another computer, so
 *     nothing on this Mac can be asked to walk one.
 *  2. The recents record carries the machine inside its first field, so
 *     `/Users/gdc/gmux README.md` on this Mac and the same path on a machine
 *     are two different keys and can never break each other's ties.
 *  3. The palette opens on such a tab and lists that machine's files. The
 *     sentence it draws above them is proved in ./p99-remote-palette.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Every root quick open asked about, in order. */
let queried: string[][] = [];
let warmed: { root: string; paths?: string[] }[] = [];
let listed: { machineId: string; cwd: string; maxPaths?: number }[] = [];
let stored: Record<string, string> = {};

/** A real listener registry, so the open file bus can actually be driven. */
const listeners: Record<string, ((e: unknown) => void)[]> = {};

vi.stubGlobal('window', {
  addEventListener(name: string, cb: (e: unknown) => void) {
    (listeners[name] ??= []).push(cb);
  },
  removeEventListener(name: string, cb: (e: unknown) => void) {
    listeners[name] = (listeners[name] ?? []).filter((one) => one !== cb);
  },
  dispatchEvent(e: { type: string }) {
    for (const cb of listeners[e.type] ?? []) cb(e);
    return true;
  },
  setTimeout,
  clearTimeout,
  localStorage: {
    getItem: (k: string) => stored[k] ?? null,
    setItem: (k: string, v: string) => {
      stored[k] = v;
    },
    removeItem: (k: string) => {
      delete stored[k];
    }
  },
  gmux: {
    quickOpen: {
      query: (input: { roots: string[]; seq: number }) => {
        queried.push(input.roots);
        return Promise.resolve({
          hits: [],
          seq: input.seq,
          ready: true,
          indexed: 0,
          capped: false
        });
      },
      warm: (input: { root: string; paths?: string[] }) => {
        warmed.push(input);
        return Promise.resolve();
      }
    },
    machines: {
      listFiles: (input: {
        machineId: string;
        cwd: string;
        maxPaths?: number;
      }) => {
        listed.push(input);
        return Promise.resolve({
          machineId: input.machineId,
          machineLabel: 'Studio',
          cwd: input.cwd,
          mode: 'repo',
          paths: ['src/auth.ts'],
          capped: false,
          truncated: false,
          readAt: Date.now(),
          elapsedMs: 12
        });
      }
    }
  }
});
vi.stubGlobal('localStorage', {
  getItem: (k: string) => stored[k] ?? null,
  setItem: (k: string, v: string) => {
    stored[k] = v;
  },
  removeItem: (k: string) => {
    delete stored[k];
  }
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useApp } = await import('../../state/store');
const { useQuickOpen } = await import('../store');
const { noteOpened, recentKeys, startRecordingRecents } = await import(
  '../recents'
);
const { OPEN_FILE_EVENT } = await import('../../state/open-file');
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

/** Put one open request on the bus, exactly as `requestOpenFile` does. */
function openOnTheBus(req: OpenFileRequest): void {
  (window as unknown as { dispatchEvent(e: unknown): boolean }).dispatchEvent({
    type: OPEN_FILE_EVENT,
    detail: req
  });
}

const HERE = { id: 'p1', path: '/Users/gdc/gmux', name: 'gmux' };
const THERE = {
  id: 'p2',
  path: '/Users/gdc/gmux',
  name: 'gmux',
  machineId: 'studio'
};

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/**
 * A clock that jumps ten seconds between tests.
 *
 * The store reads a machine's names at most once every 5,000 ms and remembers
 * when it last asked, in a module value that outlives one test. Without this
 * jump the second test in the file would find the first test's read fresh and
 * ask nothing.
 */
const realNow = Date.now;
let clock = realNow();

beforeEach(() => {
  clock += 10_000;
  Date.now = () => clock;
  queried = [];
  warmed = [];
  listed = [];
  stored = {};
  useQuickOpen.setState({
    open: false,
    query: '',
    hits: [],
    allProjects: false,
    elsewhere: null,
    elsewhereRead: null
  });
  useApp.setState({
    projects: [HERE, THERE],
    activeProjectId: HERE.id,
    machineStates: [
      { id: 'studio', label: 'Studio', color: 'blue', link: 'connected' }
    ]
  } as never);
});

describe('the roots quick open sends', () => {
  it('sends this Mac folder as its own path when the tab is on this Mac', async () => {
    useQuickOpen.getState().openPalette();
    await flush();
    expect(queried).toEqual([['/Users/gdc/gmux']]);
    expect(warmed).toEqual([{ root: '/Users/gdc/gmux' }]);
    expect(listed).toEqual([]);
    expect(useQuickOpen.getState().elsewhere).toBeNull();
  });

  it('sends the machine root key when the tab is on a machine', async () => {
    useApp.setState({ activeProjectId: THERE.id } as never);
    useQuickOpen.getState().openPalette();
    await flush();
    expect(queried).toEqual([['machine:studio:/Users/gdc/gmux']]);
    expect(listed).toEqual([
      { machineId: 'studio', cwd: '/Users/gdc/gmux', maxPaths: 50_000 }
    ]);
    // The names arrive from the machine and are adopted under the same key the
    // query carries. Nothing on this Mac is asked to walk that path.
    expect(warmed).toEqual([
      { root: 'machine:studio:/Users/gdc/gmux', paths: ['src/auth.ts'] }
    ]);
    expect(useQuickOpen.getState().open).toBe(true);
    expect(useQuickOpen.getState().elsewhere).toEqual({
      machineId: 'studio',
      label: 'Studio'
    });
  });

  it('keeps both roots in the all projects scope, active first', async () => {
    useQuickOpen.setState({ allProjects: true });
    useQuickOpen.getState().openPalette();
    await flush();
    expect(queried).toEqual([
      ['/Users/gdc/gmux', 'machine:studio:/Users/gdc/gmux']
    ]);
    expect(warmed[0]).toEqual({ root: '/Users/gdc/gmux' });
    expect(listed).toEqual([
      { machineId: 'studio', cwd: '/Users/gdc/gmux', maxPaths: 50_000 }
    ]);
  });

  it('clears both machine fields when the palette closes', async () => {
    useApp.setState({ activeProjectId: THERE.id } as never);
    useQuickOpen.getState().openPalette();
    await flush();
    expect(useQuickOpen.getState().elsewhereRead).not.toBeNull();
    useQuickOpen.getState().close();
    expect(useQuickOpen.getState().elsewhere).toBeNull();
    expect(useQuickOpen.getState().elsewhereRead).toBeNull();
  });
});

describe('the recents record', () => {
  it('records a file opened from this Mac under its bare path', () => {
    const stop = startRecordingRecents();
    openOnTheBus({
      repoPath: '/Users/gdc/gmux',
      relPath: 'src/a.ts',
      path: '/Users/gdc/gmux/src/a.ts',
      mode: 'file',
      source: 'tree'
    });
    expect(recentKeys()).toContain('/Users/gdc/gmux src/a.ts');
    stop();
  });

  it('records a file on a machine, with the machine inside the key', () => {
    const stop = startRecordingRecents();
    openOnTheBus({
      repoPath: '/home/greg/api',
      relPath: 'src/auth.ts',
      path: '/home/greg/api/src/auth.ts',
      mode: 'file',
      source: 'quickopen',
      remote: {
        machineId: 'studio',
        machineLabel: 'Studio',
        repoPath: '/home/greg/api'
      }
    });
    expect(recentKeys()).toContain('machine:studio:/home/greg/api src/auth.ts');
    // The bare path is NOT a key any more, which is the whole of the trap.
    expect(recentKeys()).not.toContain('/home/greg/api src/auth.ts');
    stop();
  });

  it('keys the same path on two computers as two different strings', () => {
    const stop = startRecordingRecents();
    openOnTheBus({
      repoPath: '/Users/gdc/gmux',
      relPath: 'README.md',
      path: '/Users/gdc/gmux/README.md',
      mode: 'file',
      source: 'tree'
    });
    openOnTheBus({
      repoPath: '/Users/gdc/gmux',
      relPath: 'README.md',
      path: '/Users/gdc/gmux/README.md',
      mode: 'file',
      source: 'quickopen',
      remote: {
        machineId: 'studio',
        machineLabel: 'Studio',
        repoPath: '/Users/gdc/gmux'
      }
    });
    const keys = recentKeys();
    expect(keys).toContain('/Users/gdc/gmux README.md');
    expect(keys).toContain('machine:studio:/Users/gdc/gmux README.md');
    expect(keys[0]).not.toBe(keys[1]);
    stop();
  });

  it('still refuses a historical file, which is the older rule', () => {
    const stop = startRecordingRecents();
    const before = recentKeys().length;
    openOnTheBus({
      repoPath: '/Users/gdc/gmux',
      relPath: 'src/b.ts',
      path: '/Users/gdc/gmux/src/b.ts',
      mode: 'diff',
      source: 'history',
      commit: { sha: 'abc123', shortSha: 'abc123', status: 'M' }
    });
    expect(recentKeys().length).toBe(before);
    stop();
  });
});

describe('the direct record, which the bus guard sits in front of', () => {
  it('reads an omitted machine as this Mac', () => {
    noteOpened('/Users/gdc/gmux', 'src/c.ts');
    expect(recentKeys()[0]).toBe('/Users/gdc/gmux src/c.ts');
  });

  it('takes the machine as its third value', () => {
    noteOpened('/home/greg/api', 'src/d.ts', 'studio');
    expect(recentKeys()[0]).toBe('machine:studio:/home/greg/api src/d.ts');
  });
});
