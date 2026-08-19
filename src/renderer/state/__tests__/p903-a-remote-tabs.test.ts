/**
 * A tab is a machine and a folder, not a folder (Phase 90.3).
 *
 * ## The defect these cases pin
 *
 * `/Users/gdc/gmux` on this Mac and `/Users/gdc/gmux` on another machine are two
 * different folders. Every one of the places below compared the two as bare
 * strings, so a session on the machine appeared in the local tab, the local
 * tab's dot counted it, and its split layout was written into the local tab's
 * record. Nothing errored and nothing looked broken.
 *
 * ## What each case proves
 *
 *  1. Sessions land in the tab whose MACHINE and folder both match.
 *  2. The attention count is per tab and not per path.
 *  3. The split layout record for a folder on a machine is its own key, and a
 *     local record keeps the bare path it has always had.
 *  4. A record for a folder on a machine survives the legacy migration instead
 *     of being read as an orphaned project UUID.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { useApp as UseApp } from '../store';
import type * as LayoutModule from '../layout';

const cell = new Map<string, string>();

function installGlobals(): void {
  vi.stubGlobal('window', {
    innerWidth: 1440,
    addEventListener() {},
    removeEventListener() {},
    gmux: { setSessionsPosition: () => Promise.resolve() }
  });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => cell.get(k) ?? null,
    setItem: (k: string, v: string) => {
      cell.set(k, v);
    },
    removeItem: (k: string) => {
      cell.delete(k);
    }
  });
  vi.stubGlobal('document', {
    body: { classList: { add() {}, remove() {}, contains: () => false } }
  });
}

async function boot(seed: Record<string, unknown> = {}): Promise<{
  useApp: typeof UseApp;
  layout: typeof LayoutModule;
}> {
  cell.clear();
  for (const [k, v] of Object.entries(seed)) cell.set(k, JSON.stringify(v));
  installGlobals();
  vi.resetModules();
  const store = await import('../store');
  const layout = await import('../layout');
  return { useApp: store.useApp, layout };
}

/** The same folder path, on this Mac and on one machine. */
const PATH = '/Users/gdc/gmux';
const HERE = 'p-here';
const THERE = 'p-there';
const REMOTE_KEY = `macpro:${PATH}`;

function seedTwoTabs(useApp: typeof UseApp, activeId = HERE): void {
  useApp.setState({
    projects: [
      { id: HERE, path: PATH, name: 'gmux' },
      { id: THERE, path: PATH, name: 'gmux', machineId: 'macpro' }
    ],
    activeProjectId: activeId,
    sessions: [
      {
        id: 'local-1',
        name: 'local-1',
        tmuxName: 'local-1',
        projectPath: PATH,
        cwd: PATH,
        agent: 'shell',
        status: 'running',
        createdAt: 0
      },
      {
        id: 'local-2',
        name: 'local-2',
        tmuxName: 'local-2',
        projectPath: PATH,
        cwd: PATH,
        agent: 'shell',
        status: 'needs_input',
        createdAt: 0
      },
      {
        id: 'far-1',
        name: 'far-1',
        tmuxName: 'far-1',
        projectPath: PATH,
        cwd: PATH,
        agent: 'shell',
        status: 'running',
        createdAt: 0,
        machine: {
          id: 'macpro',
          label: 'Mac Pro',
          color: 'blue',
          answering: true,
          canRestore: false,
          restoreReason: null
        }
      }
    ]
  } as never);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('two tabs, one path', () => {
  it('puts each session in the tab whose machine matches', async () => {
    const { useApp } = await boot();
    seedTwoTabs(useApp);
    expect(
      useApp
        .getState()
        .projectSessions(HERE)
        .map((x) => x.id)
    ).toEqual(['local-1', 'local-2']);
    expect(
      useApp
        .getState()
        .projectSessions(THERE)
        .map((x) => x.id)
    ).toEqual(['far-1']);
  });

  it('counts attention per tab rather than per path', async () => {
    const { useApp } = await boot();
    seedTwoTabs(useApp);
    expect(useApp.getState().attentionCountFor(PATH)).toBe(1);
    expect(useApp.getState().attentionCountFor(PATH, 'macpro')).toBe(0);
  });
});

describe('the split layout record', () => {
  it('keys a folder on a machine under its own key', async () => {
    const { useApp, layout } = await boot();
    seedTwoTabs(useApp, THERE);
    vi.useFakeTimers();
    // Two sessions on the machine, so there is a group to make.
    useApp.setState({
      sessions: [
        ...useApp.getState().sessions,
        {
          id: 'far-2',
          name: 'far-2',
          tmuxName: 'far-2',
          projectPath: PATH,
          cwd: PATH,
          agent: 'shell',
          status: 'running',
          createdAt: 0,
          machine: {
            id: 'macpro',
            label: 'Mac Pro',
            color: 'blue',
            answering: true,
            canRestore: false,
            restoreReason: null
          }
        }
      ]
    } as never);
    layout.useLayout.getState().splitWith(PATH, 'far-1', 'right', 'far-2');
    vi.advanceTimersByTime(250);
    const raw = cell.get('gmux.splitLayouts') ?? '{}';
    expect(Object.keys(JSON.parse(raw) as object)).toEqual([REMOTE_KEY]);
  });

  it('keeps a local record under the bare path it has always had', async () => {
    const { useApp, layout } = await boot();
    seedTwoTabs(useApp, HERE);
    vi.useFakeTimers();
    layout.useLayout.getState().splitWith(PATH, 'local-1', 'right', 'local-2');
    vi.advanceTimersByTime(250);
    const raw = cell.get('gmux.splitLayouts') ?? '{}';
    expect(Object.keys(JSON.parse(raw) as object)).toEqual([PATH]);
  });

  it('does not drop a machine record as a legacy project id', async () => {
    const record = {
      [PATH]: { order: ['local-1'], groups: {} },
      [REMOTE_KEY]: { order: ['far-1'], groups: {} }
    };
    const { useApp, layout } = await boot({ 'gmux.splitLayouts': record });
    seedTwoTabs(useApp);
    layout.useLayout.getState().migrateLegacyLayouts(useApp.getState().projects);
    expect(Object.keys(layout.useLayout.getState().layouts).sort()).toEqual(
      [PATH, REMOTE_KEY].sort()
    );
  });
});
