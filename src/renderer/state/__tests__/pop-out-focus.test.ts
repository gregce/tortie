/**
 * Phase 86 item 2 — where the eye lands after a session leaves a split.
 *
 * `popOut` used to end with an unconditional `setActiveSession`, so the view
 * always followed the leaf that left and there was no way to want the other
 * thing. These cases pin four answers: the stored preference decides, an
 * unreadable value reads as today's behaviour, `breakUp` moves focus under
 * neither value, and 'stayed' puts the eye on a leaf that STAYED when the leaf
 * that left was the active one.
 *
 * That last group is the state the running app is in and the first round's
 * cases could not reach. The active surface is derived from the active
 * session, so a leaf that leaves the split while it is active carries the eye
 * out with it unless popOut moves the focus back. Driving the header press is
 * what puts the app in that state, and `pressSelectsLeafNow` in
 * `src/renderer/app/split/leaf-press.ts` holds the other half of the fix.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { useApp as UseApp } from '../store';
import type * as LayoutModule from '../layout';
import type * as PopOutFocusModule from '../pop-out-focus';

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

async function boot(seed: Record<string, unknown> = {}): Promise<{
  useApp: typeof UseApp;
  layout: typeof LayoutModule;
  pref: typeof PopOutFocusModule;
}> {
  cell.clear();
  for (const [k, v] of Object.entries(seed)) cell.set(k, JSON.stringify(v));
  installGlobals();
  vi.resetModules();
  const store = await import('../store');
  const layout = await import('../layout');
  const pref = await import('../pop-out-focus');
  return { useApp: store.useApp, layout, pref };
}

const UUID = '2f9c9a1e-8f3d-4b52-9f0a-7f8f0c9d1234';
const PATH = '/tmp/p86';
const KEY = 'gmux.popOutFocus';

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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Reading the stored answer
// ---------------------------------------------------------------------------

describe('readPopOutFocus', () => {
  it('answers moved when the key is missing', async () => {
    const { pref } = await boot();
    expect(pref.readPopOutFocus()).toBe('moved');
    expect(pref.DEFAULT_POP_OUT_FOCUS).toBe('moved');
    expect(pref.LS_POP_OUT_FOCUS).toBe(KEY);
  });

  it('answers moved for null, for nonsense and for a number', async () => {
    for (const stored of [null, 'nonsense', 7]) {
      const { pref } = await boot({ [KEY]: stored });
      expect(pref.readPopOutFocus()).toBe('moved');
    }
  });

  it('answers what was written, and writes what a reader gets back', async () => {
    const { pref } = await boot();
    pref.writePopOutFocus('stayed');
    expect(pref.readPopOutFocus()).toBe('stayed');
    pref.writePopOutFocus('moved');
    expect(pref.readPopOutFocus()).toBe('moved');
  });
});

// ---------------------------------------------------------------------------
// popOut obeys it, and pops the leaf out either way
// ---------------------------------------------------------------------------

describe('popOut', () => {
  /**
   * Build row(s1, s2), leave the view on s1, then pop s2 out to index 0.
   * Returns the active session id afterwards and the surface order.
   */
  async function popS2(stored?: unknown): Promise<{
    active: string | undefined;
    order: string[];
  }> {
    const seed = stored === undefined ? {} : { [KEY]: stored };
    const { useApp, layout } = await boot(seed);
    seedProject(useApp);
    layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
    useApp.getState().setActiveSession('s1');

    layout.useLayout.getState().popOut(PATH, 's2', 0);

    return {
      active: useApp.getState().activeSession()?.id,
      order: layout
        .deriveSurfaces(layout.useLayout.getState().layouts[PATH], [
          's1',
          's2',
          's3'
        ])
        .map((x) => x.id)
    };
  }

  it("shows the moved session under 'moved'", async () => {
    const { active, order } = await popS2('moved');
    expect(active).toBe('s2');
    expect(order).toEqual(['s2', 's1', 's3']);
  });

  it("keeps the view where it was under 'stayed'", async () => {
    const { active, order } = await popS2('stayed');
    expect(active).toBe('s1');
    // The leaf still left the split: it is its own surface at index 0.
    expect(order).toEqual(['s2', 's1', 's3']);
  });

  it('defaults to the old behaviour when nothing is stored', async () => {
    const { active } = await popS2();
    expect(active).toBe('s2');
  });
});

// ---------------------------------------------------------------------------
// breakUp reads nothing, under either value
// ---------------------------------------------------------------------------

describe('breakUp', () => {
  it('moves the active session under neither value', async () => {
    for (const stored of ['moved', 'stayed']) {
      const { useApp, layout } = await boot({ [KEY]: stored });
      seedProject(useApp);
      layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
      useApp.getState().setActiveSession('s3');
      const gid =
        Object.keys(layout.useLayout.getState().layouts[PATH]?.groups ?? {})[0] ??
        '';
      expect(gid).not.toBe('');

      layout.useLayout.getState().breakUp(PATH, gid);

      expect(useApp.getState().activeSession()?.id).toBe('s3');
      // The group really did dissolve into singles.
      expect(
        Object.keys(layout.useLayout.getState().layouts[PATH]?.groups ?? {})
      ).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// The leaf that leaves is the active one — the state a real drag creates
// ---------------------------------------------------------------------------

describe("popOut under 'stayed', when the leaf that leaves is active", () => {
  it('puts the eye on the leaf that stayed, not on the one that left', async () => {
    const { useApp, layout } = await boot({ [KEY]: 'stayed' });
    seedProject(useApp);
    layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
    // The header press selects the leaf it is on. This is the state the app
    // is in at the moment the drop fires.
    layout.useLayout.getState().selectLeaf(PATH, 's2');
    expect(useApp.getState().activeSession()?.id).toBe('s2');

    layout.useLayout.getState().popOut(PATH, 's2', 0);

    expect(useApp.getState().activeSession()?.id).toBe('s1');
  });

  it('still follows the leaf that left under moved', async () => {
    const { useApp, layout } = await boot({ [KEY]: 'moved' });
    seedProject(useApp);
    layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
    layout.useLayout.getState().selectLeaf(PATH, 's2');

    layout.useLayout.getState().popOut(PATH, 's2', 0);

    expect(useApp.getState().activeSession()?.id).toBe('s2');
  });

  it("prefers the group's remembered leaf over the first one", async () => {
    const { useApp, layout } = await boot({ [KEY]: 'stayed' });
    seedProject(useApp);
    // A three-leaf group: s1 | s2, then s3 under s2.
    layout.useLayout.getState().splitWith(PATH, 's1', 'right', 's2');
    layout.useLayout.getState().splitWith(PATH, 's2', 'bottom', 's3');
    // The group remembers s2. `cycleSession` then moves the active session to
    // s3 without writing the group's focus, which is a real app path.
    layout.useLayout.getState().selectLeaf(PATH, 's2');
    useApp.getState().setActiveSession('s3');

    layout.useLayout.getState().popOut(PATH, 's3', 0);

    expect(useApp.getState().activeSession()?.id).toBe('s2');
  });
});
