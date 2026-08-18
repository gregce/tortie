/**
 * Phase 86 item 1 — a leaf moves inside its own group without leaving it.
 *
 * The reported defect: once a session is dropped into a split there is no way
 * to change its position. The header drag had exactly one destination, being
 * the strip or the dock, so moving a leaf meant popping it out and dragging it
 * back in. `moveLeafWithin` is the second destination, and these cases pin the
 * refusals that keep it from ever destroying a group.
 *
 * The pattern is the one `layout-key.test.ts` established: boot a fresh store
 * over a stubbed localStorage, then call the same store action the real
 * pointer drag invokes.
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

async function boot(): Promise<{
  useApp: typeof UseApp;
  layout: typeof LayoutModule;
}> {
  cell.clear();
  installGlobals();
  vi.resetModules();
  const store = await import('../store');
  const layout = await import('../layout');
  return { useApp: store.useApp, layout };
}

const UUID = '2f9c9a1e-8f3d-4b52-9f0a-7f8f0c9d1234';
const PATH = '/tmp/p86';

function seedProject(useApp: typeof UseApp): void {
  useApp.setState({
    projects: [{ id: UUID, path: PATH, name: 'p86' }],
    activeProjectId: UUID,
    sessions: ['s1', 's2', 's3'].map((sid) => ({
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

/** The one derived surface list the store would render right now. */
function surfaces(layout: typeof LayoutModule): LayoutModule.Surface[] {
  return layout.deriveSurfaces(layout.useLayout.getState().layouts[PATH], [
    's1',
    's2',
    's3'
  ]);
}

function groupRoot(layout: typeof LayoutModule): unknown {
  return surfaces(layout).find((x) => x.isGroup)?.root;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// The move itself
// ---------------------------------------------------------------------------

describe('moveLeafWithin', () => {
  it('changes the tree of a 3-leaf group and keeps 3 leaves in 1 surface', async () => {
    const { useApp, layout } = await boot();
    seedProject(useApp);
    const store = layout.useLayout.getState();
    // row( column(s1, s3), s2 ) — three leaves, one surface.
    store.splitWith(PATH, 's1', 'right', 's2');
    store.splitWith(PATH, 's1', 'bottom', 's3');
    expect(surfaces(layout)).toHaveLength(1);
    const before = JSON.stringify(groupRoot(layout));

    layout.useLayout.getState().moveLeafWithin(PATH, 's3', 's2', 'right');

    const after = surfaces(layout);
    expect(after).toHaveLength(1);
    expect(after[0]?.isGroup).toBe(true);
    expect(after[0]?.leafIds.slice().sort()).toEqual(['s1', 's2', 's3']);
    expect(JSON.stringify(after[0]?.root)).not.toBe(before);
    // s3 left its column, s1 absorbed that space, and s3 took the right half
    // of s2 at 50/50 — exactly what a create does.
    expect(after[0]?.root).toEqual({
      type: 'branch',
      dir: 'row',
      ratio: 0.5,
      a: { type: 'leaf', sessionId: 's1' },
      b: {
        type: 'branch',
        dir: 'row',
        ratio: 0.5,
        a: { type: 'leaf', sessionId: 's2' },
        b: { type: 'leaf', sessionId: 's3' }
      }
    });
    // The moved leaf holds the focus.
    expect(useApp.getState().activeSession()?.id).toBe('s3');
  });

  it('flips a 2-leaf group from row to column and never empties it', async () => {
    const { useApp, layout } = await boot();
    seedProject(useApp);
    layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');

    layout.useLayout.getState().moveLeafWithin(PATH, 's1', 's2', 'bottom');

    const surface = surfaces(layout).find((x) => x.isGroup);
    expect(surface?.leafIds).toEqual(['s2', 's1']);
    expect(surface?.root).toEqual({
      type: 'branch',
      dir: 'column',
      ratio: 0.5,
      a: { type: 'leaf', sessionId: 's2' },
      b: { type: 'leaf', sessionId: 's1' }
    });
  });

  it('persists the moved tree under the project path', async () => {
    const { useApp, layout } = await boot();
    seedProject(useApp);
    vi.useFakeTimers();
    layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
    layout.useLayout.getState().moveLeafWithin(PATH, 's1', 's2', 'bottom');
    vi.advanceTimersByTime(250); // past the 200 ms trailing debounce

    const record = JSON.parse(cell.get('gmux.splitLayouts') ?? '{}') as Record<
      string,
      { groups: Record<string, { root: unknown }> }
    >;
    expect(Object.keys(record)).toEqual([PATH]);
    const gid = Object.keys(record[PATH]?.groups ?? {})[0] ?? '';
    expect(record[PATH]?.groups[gid]?.root).toEqual({
      type: 'branch',
      dir: 'column',
      ratio: 0.5,
      a: { type: 'leaf', sessionId: 's2' },
      b: { type: 'leaf', sessionId: 's1' }
    });
  });
});

// ---------------------------------------------------------------------------
// The refusals — every one of them writes nothing at all
// ---------------------------------------------------------------------------

describe('moveLeafWithin refuses and writes nothing', () => {
  /** Build row(s1, s2) with s3 left as its own surface. */
  async function twoLeafGroup(): Promise<{
    useApp: typeof UseApp;
    layout: typeof LayoutModule;
  }> {
    const booted = await boot();
    seedProject(booted.useApp);
    booted.layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
    return booted;
  }

  it('when the leaf is dropped on itself', async () => {
    const { layout } = await twoLeafGroup();
    const before = layout.useLayout.getState().layouts;
    layout.useLayout.getState().moveLeafWithin(PATH, 's1', 's1', 'right');
    expect(layout.useLayout.getState().layouts).toBe(before);
  });

  it('when the result equals the tree that is already on screen', async () => {
    const { layout } = await twoLeafGroup();
    const before = layout.useLayout.getState().layouts;
    // s1 leaves row(s1, s2) and takes s2's left half: that IS row(s1, s2).
    layout.useLayout.getState().moveLeafWithin(PATH, 's1', 's2', 'left');
    expect(layout.useLayout.getState().layouts).toBe(before);
  });

  it('when the target leaf is not in the same group', async () => {
    const { layout } = await twoLeafGroup();
    const before = layout.useLayout.getState().layouts;
    // s3 is its own surface, so it is not a sibling of s1.
    layout.useLayout.getState().moveLeafWithin(PATH, 's1', 's3', 'right');
    expect(layout.useLayout.getState().layouts).toBe(before);
  });

  it('when the dragged session is not in any group', async () => {
    const { layout } = await twoLeafGroup();
    const before = layout.useLayout.getState().layouts;
    layout.useLayout.getState().moveLeafWithin(PATH, 's3', 's1', 'right');
    expect(layout.useLayout.getState().layouts).toBe(before);
  });
});
