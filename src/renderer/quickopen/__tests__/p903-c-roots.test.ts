/**
 * Phase 90.3. Quick Open lists files on this Mac and nothing else.
 *
 * THE RULE BEING PROVED. `rootsFor` yields `localPathOf(target)` for every
 * project, and a project on another machine yields null, so it is dropped. That
 * one line is what makes three separate claims true at once:
 *
 *  1. No query, and no index warm, ever carries a path from another computer.
 *     The engine is ripgrep walking THIS Mac's disk, so such a path would name
 *     a different file here or nothing at all.
 *  2. The recents record can never hold an entry for a file on a machine,
 *     because quick open is the only reader of that record as a rank
 *     tiebreaker and it can only rank what it listed. The bus guard in
 *     ./../recents.ts is checked here as well, because the two answers have to
 *     agree.
 *  3. The palette opens on such a tab and SAYS so, rather than showing an empty
 *     list. An empty list reads as a project with no files, which is a
 *     different and wrong conclusion.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Every root quick open asked about, in order. */
let queried: string[][] = [];
let warmed: string[] = [];
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
      warm: (root: string) => {
        warmed.push(root);
        return Promise.resolve();
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

beforeEach(() => {
  queried = [];
  warmed = [];
  stored = {};
  useQuickOpen.setState({
    open: false,
    query: '',
    hits: [],
    allProjects: false,
    elsewhere: null
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
  it('sends this Mac folder when the active tab is on this Mac', async () => {
    useQuickOpen.getState().openPalette();
    await flush();
    expect(queried).toEqual([['/Users/gdc/gmux']]);
    expect(warmed).toEqual(['/Users/gdc/gmux']);
    expect(useQuickOpen.getState().elsewhere).toBeNull();
  });

  it('sends nothing at all when the active tab is on a machine', async () => {
    useApp.setState({ activeProjectId: THERE.id } as never);
    useQuickOpen.getState().openPalette();
    await flush();
    expect(queried).toEqual([]);
    expect(warmed).toEqual([]);
    // The palette OPENED. It just says why it has no rows.
    expect(useQuickOpen.getState().open).toBe(true);
    expect(useQuickOpen.getState().elsewhere).toBe('Studio');
  });

  it('drops the machine folder from the all projects scope', async () => {
    useQuickOpen.setState({ allProjects: true });
    useQuickOpen.getState().openPalette();
    await flush();
    expect(queried).toEqual([['/Users/gdc/gmux']]);
    expect(warmed).toEqual(['/Users/gdc/gmux']);
  });

  it('clears the sentence when the palette closes', async () => {
    useApp.setState({ activeProjectId: THERE.id } as never);
    useQuickOpen.getState().openPalette();
    await flush();
    useQuickOpen.getState().close();
    expect(useQuickOpen.getState().elsewhere).toBeNull();
  });
});

describe('the recents record', () => {
  it('records a file opened from this Mac', () => {
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

  it('refuses a file on a machine, so the record can never rank one', () => {
    const stop = startRecordingRecents();
    const before = recentKeys().length;
    openOnTheBus({
      repoPath: '/home/greg/api',
      relPath: 'src/auth.ts',
      path: '/home/greg/api/src/auth.ts',
      mode: 'diff',
      source: 'machine',
      remote: {
        machineId: 'studio',
        machineLabel: 'Studio',
        repoPath: '/home/greg/api'
      }
    });
    expect(recentKeys().length).toBe(before);
    expect(recentKeys()).not.toContain('/home/greg/api src/auth.ts');
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
  it('is still the plain two field write', () => {
    noteOpened('/Users/gdc/gmux', 'src/c.ts');
    expect(recentKeys()[0]).toBe('/Users/gdc/gmux src/c.ts');
  });
});
