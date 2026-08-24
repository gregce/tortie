/**
 * Phase 99. Quick Open on a tab whose folder is on another machine.
 *
 * FIVE THINGS ARE PROVED HERE, and each of them is a decision this phase made
 * rather than a shape it inherited.
 *
 *  1. THE READ. A root on a machine is asked for over the link, once, and the
 *     names that come back are handed to the same worker under the same root
 *     key the query carries. Nothing on this Mac is asked to walk that path.
 *  2. THE FIVE SECOND RULE. Two warms inside the window cost one command on
 *     that machine. A warm after it costs a second.
 *  3. THE EMPTY ADOPT. Every answer that carries no names still adopts an empty
 *     list. Without it the worker's index is never built, the palette's answer
 *     stays `ready: false` forever, and the 100 ms poll spins for as long as
 *     the palette is open.
 *  4. THE SENTENCES. One line for a repository, two for a folder that is not
 *     one, and one for each of the four ways a read gives no names. The wording
 *     itself is pinned in ../../app/__tests__/p903-c-remote-copy.test.ts; what
 *     is pinned here is WHICH sentence each answer draws.
 *  5. THE TWO COLLISIONS. A row's React key and a row's project name both carry
 *     the machine, so the same path on two computers is two rows with two
 *     names rather than one row with the wrong one.
 *
 * WHAT IS NOT PROVED HERE. Nothing renders. The vitest environment is node and
 * this repository has no jsdom, so the three decisions the panel makes are pure
 * functions exported from ../QuickOpenPalette.tsx and read directly. That the
 * panel DRAWS them is measured on the running app by `npm run probe:p99` and by
 * the screenshot run, both recorded in the phase report.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineFileListMode, QuickOpenHit } from '@shared/ipc';

interface FileListAnswer {
  mode: MachineFileListMode;
  paths: string[];
  capped: boolean;
  truncated: boolean;
}

/** What the next `listFiles` answers, and whether it answers at all. */
let answer: FileListAnswer = {
  mode: 'repo',
  paths: ['src/a.ts'],
  capped: false,
  truncated: false
};
let refuse = false;

let warmed: { root: string; paths?: string[] }[] = [];
let listed: { machineId: string; cwd: string; maxPaths?: number }[] = [];
let opened: Record<string, unknown>[] = [];
let stored: Record<string, string> = {};

const listeners: Record<string, ((e: unknown) => void)[]> = {};

class TestCustomEvent {
  readonly type: string;
  readonly detail: unknown;
  constructor(type: string, init?: { detail?: unknown }) {
    this.type = type;
    this.detail = init?.detail;
  }
}

vi.stubGlobal('CustomEvent', TestCustomEvent);
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
      query: (input: { seq: number }) =>
        Promise.resolve({
          hits: [],
          seq: input.seq,
          ready: true,
          indexed: 0,
          capped: false
        }),
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
        if (refuse) return Promise.reject(new Error('no answer'));
        return Promise.resolve({
          machineId: input.machineId,
          machineLabel: 'Studio',
          cwd: input.cwd,
          mode: answer.mode,
          paths: answer.paths,
          capped: answer.capped,
          truncated: answer.truncated,
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
const { recentKeys } = await import('../recents');
const { onOpenFile } = await import('../../state/open-file');
const { machineNoteLines, projectNameFor, rowKeyOf } = await import(
  '../QuickOpenPalette'
);
const copy = await import('../../machines/quick-open');
// Phase 142 moved the symbol palette's own refusal to machines/search.ts, which
// is where the rest of what Search says about a machine lives.
const searchCopy = await import('../../machines/search');

const HERE = { id: 'p1', path: '/Users/gdc/gmux', name: 'gmux' };
const THERE = {
  id: 'p2',
  path: '/home/greg/api',
  name: 'api',
  machineId: 'studio'
};
const KEY = 'machine:studio:/home/greg/api';

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** A clock that jumps past the five second rule between tests. */
const realNow = Date.now;
let clock = realNow();
const AT = new Date(2026, 7, 18, 14, 32, 0).getTime();

let offBus: (() => void) | null = null;

beforeEach(() => {
  clock += 10_000;
  Date.now = () => clock;
  answer = { mode: 'repo', paths: ['src/a.ts'], capped: false, truncated: false };
  refuse = false;
  warmed = [];
  listed = [];
  opened = [];
  stored = {};
  offBus?.();
  offBus = onOpenFile((req) => {
    opened.push(req as unknown as Record<string, unknown>);
  });
  useQuickOpen.setState({
    open: false,
    query: '',
    hits: [],
    selected: 0,
    allProjects: false,
    elsewhere: null,
    elsewhereRead: null
  });
  useApp.setState({
    projects: [HERE, THERE],
    activeProjectId: THERE.id,
    machineStates: [
      { id: 'studio', label: 'Studio', color: 'blue', link: 'connected' }
    ]
  } as never);
});

describe('the read of one machine name list', () => {
  it('asks once and adopts the names under the machine root key', async () => {
    answer = {
      mode: 'repo',
      paths: ['src/a.ts', 'src/b.ts'],
      capped: false,
      truncated: false
    };
    useQuickOpen.getState().warm();
    await flush();
    expect(listed).toEqual([
      { machineId: 'studio', cwd: '/home/greg/api', maxPaths: 50_000 }
    ]);
    expect(warmed).toEqual([
      { root: KEY, paths: ['src/a.ts', 'src/b.ts'] }
    ]);
  });

  it('costs one command for two warms inside the five second window', async () => {
    useQuickOpen.getState().warm();
    await flush();
    useQuickOpen.getState().warm();
    await flush();
    expect(listed.length).toBe(1);
  });

  it('asks again once the window has passed', async () => {
    useQuickOpen.getState().warm();
    await flush();
    clock += 6_000;
    useQuickOpen.getState().warm();
    await flush();
    expect(listed.length).toBe(2);
  });

  it('carries the byte cut flag into the palette state (Phase 99.1)', async () => {
    // The carry-through the store dropped. The second read proves the field
    // is a reading rather than a constant.
    answer = {
      mode: 'repo',
      paths: ['src/a.ts'],
      capped: false,
      truncated: true
    };
    useQuickOpen.getState().warm();
    await flush();
    expect(useQuickOpen.getState().elsewhereRead?.truncated).toBe(true);
    clock += 6_000;
    answer = {
      mode: 'repo',
      paths: ['src/a.ts'],
      capped: false,
      truncated: false
    };
    useQuickOpen.getState().warm();
    await flush();
    expect(useQuickOpen.getState().elsewhereRead?.truncated).toBe(false);
  });
});

describe('an answer that carries no names', () => {
  for (const mode of ['missing', 'notConnected'] as const) {
    it(`adopts an empty list for ${mode}, so the index is built`, async () => {
      answer = { mode, paths: [], capped: false, truncated: false };
      useQuickOpen.getState().warm();
      await flush();
      expect(warmed).toEqual([{ root: KEY, paths: [] }]);
      expect(useQuickOpen.getState().elsewhereRead?.mode).toBe(mode);
    });
  }

  it('adopts an empty list when the call itself is refused', async () => {
    refuse = true;
    useQuickOpen.getState().warm();
    await flush();
    expect(warmed).toEqual([{ root: KEY, paths: [] }]);
    expect(useQuickOpen.getState().elsewhereRead?.mode).toBe('unreachable');
  });
});

describe('which sentence the panel draws', () => {
  const L = 'Studio';

  it('says a read is in flight while nothing has come back', () => {
    expect(machineNoteLines(L, null)).toEqual([
      copy.quickOpenReadingNames(L)
    ]);
  });

  it('names the machine and the time after a good read', () => {
    expect(
      machineNoteLines(L, {
        mode: 'repo',
        count: 12,
        capped: false,
        truncated: false,
        at: AT
      })
    ).toEqual([copy.quickOpenNamesFrom(L, AT)]);
  });

  it('says the folder is not a repository before it says anything else', () => {
    expect(
      machineNoteLines(L, {
        mode: 'walk',
        count: 12,
        capped: false,
        truncated: false,
        at: AT
      })
    ).toEqual([copy.quickOpenNotRepo(L), copy.quickOpenNamesFrom(L, AT)]);
  });

  it('adds the cut sentence, with the count, when the cap bit', () => {
    expect(
      machineNoteLines(L, {
        mode: 'repo',
        count: 50_000,
        capped: true,
        truncated: false,
        at: AT
      })
    ).toEqual([
      copy.quickOpenNamesFrom(L, AT),
      copy.quickOpenNamesCapped(50_000, L)
    ]);
  });

  it('says the machine stopped listing when the byte ceiling cut it (Phase 99.1)', () => {
    // The defect's exact state, forced. The count stays under the name cap,
    // so before this phase no cut sentence was drawn at all.
    expect(
      machineNoteLines(L, {
        mode: 'repo',
        count: 31_204,
        capped: false,
        truncated: true,
        at: AT
      })
    ).toEqual([
      copy.quickOpenNamesFrom(L, AT),
      copy.quickOpenNamesTruncated(31_204, L)
    ]);
  });

  it('adds the byte cut sentence to a walked folder as well', () => {
    expect(
      machineNoteLines(L, {
        mode: 'walk',
        count: 34_612,
        capped: false,
        truncated: true,
        at: AT
      })
    ).toEqual([
      copy.quickOpenNotRepo(L),
      copy.quickOpenNamesFrom(L, AT),
      copy.quickOpenNamesTruncated(34_612, L)
    ]);
  });

  it('draws the name cap sentence before the byte cut sentence when both bit', () => {
    expect(
      machineNoteLines(L, {
        mode: 'repo',
        count: 50_000,
        capped: true,
        truncated: true,
        at: AT
      })
    ).toEqual([
      copy.quickOpenNamesFrom(L, AT),
      copy.quickOpenNamesCapped(50_000, L),
      copy.quickOpenNamesTruncated(50_000, L)
    ]);
  });

  it('says each of the three ways a read gives no names', () => {
    const none = { count: 0, capped: false, truncated: false, at: AT };
    expect(machineNoteLines(L, { mode: 'missing', ...none })).toEqual([
      copy.quickOpenFolderMissing(L)
    ]);
    expect(machineNoteLines(L, { mode: 'notConnected', ...none })).toEqual([
      copy.quickOpenNotConnected(L)
    ]);
    expect(machineNoteLines(L, { mode: 'unreachable', ...none })).toEqual([
      copy.quickOpenNoAnswer(L)
    ]);
  });

  it('draws no sentence Phase 90.3 wrote, because it is deleted', () => {
    const gone = copy as unknown as Record<string, unknown>;
    expect(gone.quickOpenElsewhereTitle).toBeUndefined();
    expect(gone.QUICK_OPEN_ELSEWHERE_BODY).toBeUndefined();
    // Symbols still reach this Mac only, so that refusal is still written, and
    // it is written in machines/search.ts rather than in this palette's file.
    const stillThere = searchCopy as unknown as Record<string, unknown>;
    expect(typeof stillThere.symbolsElsewhereTitle).toBe('function');
  });
});

describe('the two collisions a bare path would cause', () => {
  const here: QuickOpenHit = {
    repoPath: '/Users/gdc/gmux',
    relPath: 'README.md',
    positions: [],
    score: 1,
    recent: false
  };
  const there: QuickOpenHit = { ...here, machineId: 'studio' };

  it('gives two computers two React keys for one path', () => {
    expect(rowKeyOf(here)).not.toBe(rowKeyOf(there));
    expect(rowKeyOf(here).startsWith('local\u0000')).toBe(true);
    expect(rowKeyOf(there).startsWith('studio\u0000')).toBe(true);
  });

  it('puts the right project name on each of them', () => {
    const projects = [
      { name: 'gmux', path: '/Users/gdc/gmux' },
      { name: 'gmux on Studio', path: '/Users/gdc/gmux', machineId: 'studio' }
    ];
    expect(projectNameFor(projects, here)).toBe('gmux');
    expect(projectNameFor(projects, there)).toBe('gmux on Studio');
  });
});

describe('opening a row that came from a machine', () => {
  it('carries the machine to the editor and into the record', async () => {
    useQuickOpen.setState({
      open: true,
      query: 'auth',
      selected: 0,
      hits: [
        {
          repoPath: '/home/greg/api',
          relPath: 'src/auth.ts',
          positions: [],
          score: 1,
          recent: false,
          machineId: 'studio'
        }
      ]
    });
    useQuickOpen.getState().accept(false);
    await flush();
    expect(opened.length).toBe(1);
    expect(opened[0]?.remote).toEqual({
      machineId: 'studio',
      machineLabel: 'Studio',
      repoPath: '/home/greg/api'
    });
    expect(recentKeys()[0]).toEqual({
      root: 'machine:studio:/home/greg/api',
      relPath: 'src/auth.ts'
    });
  });

  it('sends no machine reference for a row from this Mac', async () => {
    useQuickOpen.setState({
      open: true,
      query: 'a',
      selected: 0,
      hits: [
        {
          repoPath: '/Users/gdc/gmux',
          relPath: 'src/a.ts',
          positions: [],
          score: 1,
          recent: false
        }
      ]
    });
    useQuickOpen.getState().accept(false);
    await flush();
    expect(opened.length).toBe(1);
    expect(opened[0]?.remote).toBeUndefined();
    expect(recentKeys()[0]).toEqual({
      root: '/Users/gdc/gmux',
      relPath: 'src/a.ts'
    });
  });
});
