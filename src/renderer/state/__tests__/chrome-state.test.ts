/**
 * Phase 18 — the layout state model: what the store persists, what it clamps,
 * and what it refuses to grow a second copy of.
 *
 * Three properties are worth more than the rest and each has its own block:
 *
 *  1. "Hidden" has ONE truth. Drag-to-hide is the activity bar's own action,
 *     so the icon's selected state, the View-menu radio and ⌘B cannot disagree
 *     with the screen (the Phase 14.7 lesson, re-paid here).
 *  2. Intent is persisted, presentation is clamped. A width the user chose
 *     under a big window survives a small one and comes back exactly.
 *  3. Fill mode never writes. It captures a memento, overrides two booleans,
 *     and either replays the memento verbatim or — the moment the user makes
 *     any layout gesture of their own — drops it and restores nothing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { useApp as UseApp } from '../store';

const cell = new Map<string, string>();

function installGlobals(innerWidth = 1440): void {
  vi.stubGlobal('window', {
    innerWidth,
    addEventListener() {},
    removeEventListener() {},
    // No popupMenu on the bridge → showNativeMenu is a documented no-op.
    // setSessionsPosition IS required by the typed bridge, so it is stubbed:
    // the orientation test below would otherwise log its (correct) complaint.
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
 * Boot a FRESH store over a given localStorage — the only way to exercise the
 * migration, which runs once while zustand builds its initial state.
 */
async function boot(
  seed: Record<string, unknown> = {},
  innerWidth = 1440
): Promise<typeof UseApp> {
  cell.clear();
  for (const [k, v] of Object.entries(seed)) cell.set(k, JSON.stringify(v));
  installGlobals(innerWidth);
  vi.resetModules();
  const mod = await import('../store');
  return mod.useApp;
}

function stored(key: string): unknown {
  const raw = cell.get(key);
  return raw === undefined ? undefined : JSON.parse(raw);
}

beforeEach(() => {
  installGlobals();
});

// ---------------------------------------------------------------------------
// Migration — keys keep their names; only the permitted RANGES moved
// ---------------------------------------------------------------------------

describe('boot migration of gmux.* widths', () => {
  it('keeps every width an older build could have written', async () => {
    // The old sidebar clamp was [220, 400] and the old dock clamp [160, 320],
    // so nothing a shipped build wrote is out of range — the migration must be
    // a non-event for real users.
    for (const w of [220, 280, 333, 400]) {
      const app = await boot({ 'gmux.sidebarWidth': w });
      expect(app.getState().sidebarWidth).toBe(w);
    }
    for (const w of [160, 200, 320]) {
      const app = await boot({ 'gmux.rightListWidth': w });
      expect(app.getState().rightListWidth).toBe(w);
    }
  });

  it('falls back to the defaults when the keys are absent', async () => {
    const app = await boot();
    expect(app.getState().sidebarWidth).toBe(280);
    expect(app.getState().rightListWidth).toBe(200);
    expect(app.getState().dockCollapsed).toBe(false);
  });

  it('rejects nonsense a hand-edited store could hold', async () => {
    for (const bad of [0, -20, 'wide', null, {}, 99999]) {
      const app = await boot({
        'gmux.sidebarWidth': bad,
        'gmux.rightListWidth': bad
      });
      expect(app.getState().sidebarWidth).toBe(280);
      expect(app.getState().rightListWidth).toBe(200);
    }
  });

  it('lifts an under-floor stored width to its floor', async () => {
    const app = await boot({
      'gmux.sidebarWidth': 90,
      'gmux.rightListWidth': 30
    });
    expect(app.getState().sidebarWidth).toBe(220);
    expect(app.getState().rightListWidth).toBe(160);
  });

  it('survives a corrupt (non-JSON) value without throwing', async () => {
    cell.clear();
    cell.set('gmux.sidebarWidth', '{not json');
    installGlobals();
    vi.resetModules();
    const { useApp } = await import('../store');
    expect(useApp.getState().sidebarWidth).toBe(280);
  });

  it('keeps an OVERSIZED stored width — intent outlives the window', async () => {
    // 900 was chosen under a 1920px window. Booting at 1280 must not rewrite
    // it: the sidebar RENDERS min(900, 640) and the 900 comes back when the
    // window does.
    const app = await boot({ 'gmux.sidebarWidth': 900 }, 1280);
    expect(app.getState().sidebarWidth).toBe(900);
    expect(stored('gmux.sidebarWidth')).toBe(900);
  });

  it('reads gmux.dockCollapsed as a strict boolean', async () => {
    expect((await boot({ 'gmux.dockCollapsed': true })).getState().dockCollapsed).toBe(
      true
    );
    expect(
      (await boot({ 'gmux.dockCollapsed': false })).getState().dockCollapsed
    ).toBe(false);
    // Anything that is not literally `true` is not collapsed.
    expect(
      (await boot({ 'gmux.dockCollapsed': 'yes' })).getState().dockCollapsed
    ).toBe(false);
  });

  it('never restores fill mode from disk', async () => {
    const app = await boot({ 'gmux.editorFill': { sidebarVisible: true } });
    expect(app.getState().editorFill).toBe(null);
    expect(app.getState().sidebarVisible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Item 1 — the sidebar's range is the window, not a constant
// ---------------------------------------------------------------------------

describe('setSidebarWidth', () => {
  it('lets the sidebar past the old 400px cap, up to half the window', async () => {
    const app = await boot({}, 1440);
    app.getState().setSidebarWidth(700); // impossible before Phase 18
    expect(app.getState().sidebarWidth).toBe(700);
    expect(stored('gmux.sidebarWidth')).toBe(700);

    app.getState().setSidebarWidth(5000);
    expect(app.getState().sidebarWidth).toBe(720); // 50% of 1440
  });

  it('scales its ceiling with the window it is actually in', async () => {
    const wide = await boot({}, 1920);
    wide.getState().setSidebarWidth(5000);
    expect(wide.getState().sidebarWidth).toBe(960);

    const narrow = await boot({}, 1024);
    narrow.getState().setSidebarWidth(5000);
    expect(narrow.getState().sidebarWidth).toBe(512);
  });

  it('holds the DESIGN floor', async () => {
    const app = await boot({}, 1440);
    app.getState().setSidebarWidth(10);
    expect(app.getState().sidebarWidth).toBe(220);
  });
});

describe('setRightListWidth', () => {
  it('keeps the unchanged 160–320 band', async () => {
    const app = await boot({}, 1440);
    app.getState().setRightListWidth(10);
    expect(app.getState().rightListWidth).toBe(160);
    app.getState().setRightListWidth(5000);
    expect(app.getState().rightListWidth).toBe(320);
    expect(stored('gmux.rightListWidth')).toBe(320);
  });
});

// ---------------------------------------------------------------------------
// Item 1 — snap-to-hidden is the SAME truth the activity bar writes
// ---------------------------------------------------------------------------

describe('drag-to-hide', () => {
  it('is literally the activity bar action, not a second state', async () => {
    const app = await boot({}, 1440);
    app.getState().setSidebarWidth(640);

    // What the resizer's `onSnap` calls.
    app.getState().toggleSidebar();
    expect(app.getState().sidebarVisible).toBe(false);
    // And nothing else moved: the width is intact, so ⌘B brings it back at
    // exactly the width it was dragged to.
    expect(app.getState().sidebarWidth).toBe(640);

    app.getState().toggleSidebar();
    expect(app.getState().sidebarVisible).toBe(true);
    expect(app.getState().sidebarWidth).toBe(640);
  });

  it('has no second boolean anywhere in the model', async () => {
    const app = await boot();
    const state = app.getState() as unknown as Record<string, unknown>;
    // Values only: an action named after a field is not a second truth.
    const fields = Object.keys(state).filter(
      (k) => typeof state[k] !== 'function'
    );
    expect(fields.filter((k) => /^sidebar/i.test(k)).sort()).toEqual([
      'sidebarViewByProject',
      'sidebarVisible',
      'sidebarWidth'
    ]);
    // No `sidebarCollapsed`, no `sidebarSnapped`, no snap flag — the dock's
    // collapse is the ONLY boolean of that shape in the model.
    expect(fields.filter((k) => /collaps|snapp?ed|hidden/i.test(k))).toEqual([
      'dockCollapsed'
    ]);
  });

  it('puts the snap threshold BELOW the floor, so the drag never jumps', async () => {
    const { SIDEBAR_MIN, SIDEBAR_SNAP, DOCK_MIN, DOCK_SNAP } = await import(
      '../chrome-geometry'
    );
    // The region stops shrinking at its floor and only disappears if the user
    // keeps pulling well past it — 80px of deliberate travel for the sidebar,
    // 60px for the dock. A threshold at or above the floor would make the
    // region vanish the instant it stopped resizing.
    expect(SIDEBAR_SNAP).toBeLessThan(SIDEBAR_MIN);
    expect(SIDEBAR_MIN - SIDEBAR_SNAP).toBe(80);
    expect(DOCK_SNAP).toBeLessThan(DOCK_MIN);
    expect(DOCK_MIN - DOCK_SNAP).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Item 4 — the dock collapses to a rail without losing its width
// ---------------------------------------------------------------------------

describe('setDockCollapsed', () => {
  it('remembers the width across a collapse and restores it exactly', async () => {
    const app = await boot({}, 1440);
    app.getState().setRightListWidth(287);

    app.getState().setDockCollapsed(true);
    expect(app.getState().dockCollapsed).toBe(true);
    expect(app.getState().rightListWidth).toBe(287);
    expect(stored('gmux.dockCollapsed')).toBe(true);

    app.getState().setDockCollapsed(false);
    expect(app.getState().dockCollapsed).toBe(false);
    expect(app.getState().rightListWidth).toBe(287);
    expect(stored('gmux.dockCollapsed')).toBe(false);
  });

  it('persists across a restart and across an orientation switch', async () => {
    const app = await boot({ 'gmux.dockCollapsed': true }, 1440);
    expect(app.getState().dockCollapsed).toBe(true);
    // Going to 'top' hides the dock entirely; coming back must find it as it
    // was left.
    app.getState().setSessionOrientation('top');
    app.getState().setSessionOrientation('right');
    expect(app.getState().dockCollapsed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Item 2 — fill mode is an override, never a write
// ---------------------------------------------------------------------------

describe('editorFill', () => {
  it('captures the layout, puts it away, and replays it verbatim', async () => {
    const app = await boot({}, 1440);
    app.getState().setSidebarWidth(520);
    expect(app.getState().sidebarVisible).toBe(true);
    expect(app.getState().dockCollapsed).toBe(false);

    app.getState().enterEditorFill();
    expect(app.getState().editorFill).toEqual({
      sidebarVisible: true,
      dockCollapsed: false
    });
    expect(app.getState().sidebarVisible).toBe(false);
    expect(app.getState().dockCollapsed).toBe(true);
    // Never a write: the dock's persisted preference is untouched, so quitting
    // while filling cannot leave the dock collapsed at the next launch.
    expect(stored('gmux.dockCollapsed')).toBe(undefined);

    app.getState().exitEditorFill();
    expect(app.getState().editorFill).toBe(null);
    expect(app.getState().sidebarVisible).toBe(true);
    expect(app.getState().dockCollapsed).toBe(false);
    // …at the SAME width, because fill never touched it.
    expect(app.getState().sidebarWidth).toBe(520);
  });

  it('restores an already-collapsed dock as collapsed, not as default', async () => {
    const app = await boot({ 'gmux.dockCollapsed': true }, 1440);
    app.getState().toggleSidebar(); // hidden before filling
    app.getState().enterEditorFill();
    app.getState().exitEditorFill();
    expect(app.getState().sidebarVisible).toBe(false);
    expect(app.getState().dockCollapsed).toBe(true);
  });

  it('captures the memento once — a double enter cannot record the filled layout', async () => {
    const app = await boot({}, 1440);
    app.getState().enterEditorFill();
    app.getState().enterEditorFill();
    expect(app.getState().editorFill).toEqual({
      sidebarVisible: true,
      dockCollapsed: false
    });
  });

  it('is a no-op to exit when not filling', async () => {
    const app = await boot({}, 1440);
    app.getState().exitEditorFill();
    expect(app.getState().sidebarVisible).toBe(true);
    expect(app.getState().editorFill).toBe(null);
  });

  describe('escape hatches — a manual gesture takes control, never restores', () => {
    it('⌘B / the activity-bar toggle', async () => {
      const app = await boot({}, 1440);
      app.getState().enterEditorFill();
      app.getState().toggleSidebar();

      expect(app.getState().editorFill).toBe(null);
      expect(app.getState().sidebarVisible).toBe(true); // what the user asked for
      expect(app.getState().dockCollapsed).toBe(true); // NOT put back
      // The layout the user has adopted is now a real preference.
      expect(stored('gmux.dockCollapsed')).toBe(true);

      // And the memento cannot come back to fight them later.
      app.getState().exitEditorFill();
      expect(app.getState().dockCollapsed).toBe(true);
    });

    it('reaching for a sidebar view', async () => {
      const app = await boot({}, 1440);
      app.getState().enterEditorFill();
      app.getState().showSidebarView('search');
      expect(app.getState().editorFill).toBe(null);
      expect(app.getState().sidebarVisible).toBe(true);
      expect(app.getState().dockCollapsed).toBe(true);
    });

    it('expanding the dock by hand', async () => {
      const app = await boot({}, 1440);
      app.getState().enterEditorFill();
      app.getState().setDockCollapsed(false);
      expect(app.getState().editorFill).toBe(null);
      expect(app.getState().dockCollapsed).toBe(false);
      expect(app.getState().sidebarVisible).toBe(false); // NOT put back
      expect(stored('gmux.dockCollapsed')).toBe(false);
    });

    it('the editor divider (forgetEditorFill, the store-owned hatch)', async () => {
      const app = await boot({}, 1440);
      app.getState().enterEditorFill();
      app.getState().forgetEditorFill();
      expect(app.getState().editorFill).toBe(null);
      expect(app.getState().sidebarVisible).toBe(false);
      expect(app.getState().dockCollapsed).toBe(true);
      expect(stored('gmux.dockCollapsed')).toBe(true);
    });

    it('does nothing at all when not filling', async () => {
      const app = await boot({}, 1440);
      app.getState().forgetEditorFill();
      expect(stored('gmux.dockCollapsed')).toBe(undefined);
      expect(app.getState().editorFill).toBe(null);
    });
  });
});
