/**
 * Phase 38 — the split layout record keys by the project's ABSOLUTE PATH.
 *
 * The reported defect: drag one session onto another to form a group, close
 * the project tab, reopen the project. The sessions came back and the group
 * did not. The record was keyed by the project row's UUID, the row dies on
 * close, and reopen mints a fresh UUID, so the layout was orphaned the
 * moment the tab closed. The path is the identity that survives, and it is
 * the same identity sessions already rebind by.
 *
 * Case 1 is the pin. It stops any refactor from quietly moving the key back
 * to an ephemeral id: the persisted record must hold the path and must not
 * hold the UUID.
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
    body: {
      classList: { add() {}, remove() {}, contains: () => false }
    }
  });
}

/**
 * Boot FRESH stores over a given localStorage — the layout store reads the
 * whole record once while zustand builds its initial state.
 */
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

const UUID = '2f9c9a1e-8f3d-4b52-9f0a-7f8f0c9d1234';
const UUID_2 = 'a0a0a0a0-0000-4000-8000-000000000000';
const PATH = '/tmp/p38';

/** Seed one open project with running shell sessions. */
function seedProject(
  useApp: typeof UseApp,
  projectId = UUID,
  sessionIds = ['s1', 's2', 's3']
): void {
  useApp.setState({
    projects: [{ id: projectId, path: PATH, name: 'p38' }],
    activeProjectId: projectId,
    sessions: sessionIds.map((sid) => ({
      id: sid,
      name: sid,
      tmuxName: sid,
      projectPath: PATH,
      cwd: PATH,
      agent: 'shell',
      status: 'running',
      createdAt: 0
    }))
  } as never);
}

function storedRecord(): Record<string, unknown> {
  const raw = cell.get('gmux.splitLayouts');
  return raw === undefined
    ? {}
    : (JSON.parse(raw) as Record<string, unknown>);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Case 1 — the pin: the persisted key is the path, never the UUID
// ---------------------------------------------------------------------------

describe('the persisted layout key', () => {
  it('is the project path and is never the project UUID', async () => {
    const { useApp, layout } = await boot();
    seedProject(useApp);
    vi.useFakeTimers();

    // The same store action the real drag-and-drop invokes.
    layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
    vi.advanceTimersByTime(250); // past the 200 ms trailing debounce

    const record = storedRecord();
    expect(Object.keys(record)).toEqual([PATH]);
    expect(Object.keys(record)).not.toContain(UUID);

    // And the entry holds a real two-leaf group, not a trivial layout.
    const entry = record[PATH] as {
      order: string[];
      groups: Record<string, { root: unknown; focused: string }>;
    };
    const groupIds = Object.keys(entry.groups);
    expect(groupIds).toHaveLength(1);
    const gid = groupIds[0] ?? '';
    expect(entry.groups[gid]?.root).toEqual({
      type: 'branch',
      dir: 'row',
      ratio: 0.5,
      a: { type: 'leaf', sessionId: 's1' },
      b: { type: 'leaf', sessionId: 's2' }
    });
    expect(entry.groups[gid]?.focused).toBe('s2');
  });
});

// ---------------------------------------------------------------------------
// Case 2 — close and reopen: a fresh project UUID finds the same group
// ---------------------------------------------------------------------------

describe('close and reopen', () => {
  it('derives the same tree after the project row is reborn with a new UUID', async () => {
    const { useApp, layout } = await boot();
    seedProject(useApp);
    vi.useFakeTimers();
    layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
    vi.advanceTimersByTime(250);

    const ids = ['s1', 's2', 's3'];
    const derive = (): string =>
      JSON.stringify(
        layout
          .deriveSurfaces(layout.useLayout.getState().layouts[PATH], ids)
          .map((x) => ({ root: x.root, isGroup: x.isGroup }))
      );
    const before = derive();
    expect(before).toContain('"type":"branch"');

    // Close and reopen: the row dies and comes back with a different UUID
    // at the same path. The sessions rebind by projectPath, as store.ts does.
    seedProject(useApp, UUID_2);
    const after = derive();
    expect(after).toBe(before);

    // The derived group root equals the persisted one byte for byte.
    const record = storedRecord();
    const entry = record[PATH] as {
      groups: Record<string, { root: unknown }>;
    };
    const gid = Object.keys(entry.groups)[0] ?? '';
    const surfaces = layout.deriveSurfaces(
      layout.useLayout.getState().layouts[PATH],
      ids
    );
    const group = surfaces.find((x) => x.isGroup);
    expect(JSON.stringify(group?.root)).toBe(
      JSON.stringify(entry.groups[gid]?.root)
    );
  });
});

// ---------------------------------------------------------------------------
// Cases 3 and 4 — boot migration of legacy UUID keys
// ---------------------------------------------------------------------------

describe('migrateLegacyLayouts', () => {
  const legacyEntry = {
    order: ['g1', 's3'],
    groups: {
      g1: {
        root: {
          type: 'branch',
          dir: 'row',
          ratio: 0.5,
          a: { type: 'leaf', sessionId: 's1' },
          b: { type: 'leaf', sessionId: 's2' }
        },
        focused: 's2'
      }
    }
  };

  it('adopts an open project\'s UUID entry under its path, tree unchanged', async () => {
    const { layout } = await boot({
      'gmux.splitLayouts': { [UUID]: legacyEntry }
    });
    vi.useFakeTimers();
    layout.useLayout
      .getState()
      .migrateLegacyLayouts([{ id: UUID, path: PATH, name: 'p38' }]);
    vi.advanceTimersByTime(250);

    const record = storedRecord();
    expect(Object.keys(record)).toEqual([PATH]);
    expect(record[PATH]).toEqual(legacyEntry);
    expect(layout.useLayout.getState().layouts[UUID]).toBeUndefined();
  });

  it('drops an orphan entry no open project carries, and keeps path entries', async () => {
    const { layout } = await boot({
      'gmux.splitLayouts': {
        [UUID]: legacyEntry,
        '/tmp/other': { order: ['s9'], groups: {} }
      }
    });
    vi.useFakeTimers();
    // The projects list does not carry the UUID: its project was closed
    // before this phase and the UUID-to-path mapping died with the row.
    layout.useLayout
      .getState()
      .migrateLegacyLayouts([{ id: UUID_2, path: PATH, name: 'p38' }]);
    vi.advanceTimersByTime(250);

    const record = storedRecord();
    expect(Object.keys(record)).toEqual(['/tmp/other']);
  });

  it('is a no-op when every key is already a path', async () => {
    const { layout } = await boot({
      'gmux.splitLayouts': { [PATH]: legacyEntry }
    });
    const beforeState = layout.useLayout.getState().layouts;
    layout.useLayout
      .getState()
      .migrateLegacyLayouts([{ id: UUID, path: PATH, name: 'p38' }]);
    expect(layout.useLayout.getState().layouts).toBe(beforeState);
  });
});

// ---------------------------------------------------------------------------
// Case 5 — a persisted tree naming a dead session derives without it
// ---------------------------------------------------------------------------

describe('dead leaf in a persisted tree', () => {
  it('drops the pane, the sibling absorbs, and nothing throws', async () => {
    const root = {
      type: 'branch',
      dir: 'row',
      ratio: 0.5,
      a: { type: 'leaf', sessionId: 's1' },
      b: {
        type: 'branch',
        dir: 'column',
        ratio: 0.5,
        a: { type: 'leaf', sessionId: 's2' },
        b: { type: 'leaf', sessionId: 'dead' }
      }
    };
    const { layout } = await boot({
      'gmux.splitLayouts': {
        [PATH]: { order: ['g1'], groups: { g1: { root, focused: 'dead' } } }
      }
    });
    // 'dead' was killed while the project was closed: not in the live list.
    const surfaces = layout.deriveSurfaces(
      layout.useLayout.getState().layouts[PATH],
      ['s1', 's2']
    );
    expect(surfaces).toHaveLength(1);
    expect(surfaces[0]?.isGroup).toBe(true);
    expect(surfaces[0]?.leafIds).toEqual(['s1', 's2']);
    // The column that held the dead leaf collapsed to its survivor.
    expect(surfaces[0]?.root).toEqual({
      type: 'branch',
      dir: 'row',
      ratio: 0.5,
      a: { type: 'leaf', sessionId: 's1' },
      b: { type: 'leaf', sessionId: 's2' }
    });
  });
});

// ---------------------------------------------------------------------------
// Case 6 — the write guard refuses a key that is not an absolute path
// ---------------------------------------------------------------------------

describe('the write guard', () => {
  it('refuses a non-path key, changes nothing, and says so', async () => {
    const { useApp, layout } = await boot();
    seedProject(useApp, UUID, ['s1', 's2', 's3', 's4']);
    vi.useFakeTimers();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    // stageGrid reaches write() directly, so a UUID key hits the guard.
    layout.useLayout.getState().stageGrid(UUID, ['s1', 's2', 's3', 's4']);
    vi.advanceTimersByTime(250);

    expect(cell.get('gmux.splitLayouts')).toBeUndefined();
    expect(layout.useLayout.getState().layouts[UUID]).toBeUndefined();
    expect(err).toHaveBeenCalledOnce();
    expect(String(err.mock.calls[0]?.[0])).toContain(UUID);
  });

  it('accepts the same write under the path key', async () => {
    const { useApp, layout } = await boot();
    seedProject(useApp, UUID, ['s1', 's2', 's3', 's4']);
    vi.useFakeTimers();
    layout.useLayout.getState().stageGrid(PATH, ['s1', 's2', 's3', 's4']);
    vi.advanceTimersByTime(250);
    expect(Object.keys(storedRecord())).toEqual([PATH]);
  });
});
