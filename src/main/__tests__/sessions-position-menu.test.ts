/**
 * The View menu's sessions-position radios (Phase 14.7).
 *
 * The bug this file exists to keep dead: the radios were a SECOND source of
 * truth. The template hardcoded `checked: true` on Top, so every rebuild —
 * and `rebuildAppMenu()` runs on every hotkey change — silently moved the
 * checkmark back to Top while the sessions stayed where they were; an async
 * localStorage read-back then raced the store's push to correct it, and
 * string-sniffed `'right'` out of raw JSON when it won.
 *
 * What is pinned here:
 *  - the radios are built FROM the last position the store announced, so a
 *    rebuild reproduces it instead of resetting it;
 *  - a click never marks itself — it forwards to the store, which is the only
 *    thing that can move the mark. One writer;
 *  - the ids, labels and actions come from the shared table, so main's radios
 *    and the renderer's controls (inline toggle, ˅ menu row) cannot name
 *    different things — the renderer half of that proof is in
 *    src/renderer/app/__tests__/sessions-position.test.ts;
 *  - a menu action reaches an eligible window even when focus is on the
 *    Settings window or nowhere, and SAYS SO when it cannot.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSIONS_POSITION_RADIOS } from '@shared/sessions-position';
import type {
  SessionsPosition,
  SessionsPositionRadio
} from '@shared/sessions-position';
import { EVT_MENU_ACTION } from '@shared/ipc';

// ---------------------------------------------------------------------------
// A fake electron, small enough to read: the parts menu.ts actually touches.
// ---------------------------------------------------------------------------

interface FakeItem {
  id?: string;
  label?: string;
  type?: string;
  checked?: boolean;
  click?: () => void;
  submenu?: FakeItem[];
}

/**
 * RADIO SEMANTICS AS MEASURED, not as imagined. Electron 43 on macOS 15, read
 * two ways at once — the real menu bar's AXMenuItemMarkChar and the JS
 * `checked` getter, which agreed at every step:
 *
 *   built from a template  → the item whose `checked: true` is marked;
 *   item.checked = true    → marks it, unmarks its radio-group siblings;
 *   item.checked = FALSE   → ALSO MARKS IT. Any assignment selects the item.
 *
 * The last line is not a typo, and it is the bug this file guards. The old
 * sync wrote `top.checked = !right; rightItem.checked = right`, so syncing to
 * Top ran `right.checked = false` LAST and left Right marked — "the menu does
 * not reflect the toggle", hiding behind a line that reads as obviously
 * correct. Write `false` to a radio in production code and these tests go red
 * exactly where the real menu would.
 */
class FakeMenu {
  readonly byId = new Map<string, FakeItem>();
  /** Every `checked = false` written to a radio item — a clearer failure. */
  readonly falseWrites: string[] = [];
  readonly #marked = new WeakMap<FakeItem, boolean>();

  constructor(readonly template: FakeItem[]) {
    const index = (items: FakeItem[]): void => {
      const group = items.filter((it) => it.type === 'radio');
      for (const it of items) {
        if (it.type === 'radio') this.#arm(group, it);
        if (typeof it.id === 'string') this.byId.set(it.id, it);
        if (Array.isArray(it.submenu)) index(it.submenu);
      }
    };
    index(template);
  }

  /** Swap the plain `checked` field for Electron's actual behaviour. */
  #arm(group: FakeItem[], item: FakeItem): void {
    this.#marked.set(item, item.checked === true);
    Object.defineProperty(item, 'checked', {
      configurable: true,
      get: () => this.#marked.get(item) === true,
      set: (next: boolean) => {
        if (next === false) {
          this.falseWrites.push(item.id ?? item.label ?? '?');
        }
        for (const other of group) this.#marked.set(other, other === item);
      }
    });
  }

  getMenuItemById(id: string): FakeItem | null {
    return this.byId.get(id) ?? null;
  }
}

interface FakeWindow {
  readonly kind: 'app' | 'settings';
  destroyed: boolean;
  visible: boolean;
  readonly sent: unknown[][];
  isDestroyed(): boolean;
  isVisible(): boolean;
  webContents: { isDestroyed(): boolean; send(...args: unknown[]): void };
}

function makeWindow(
  kind: 'app' | 'settings',
  opts: { visible?: boolean; destroyed?: boolean } = {}
): FakeWindow {
  const sent: unknown[][] = [];
  const win: FakeWindow = {
    kind,
    destroyed: opts.destroyed ?? false,
    visible: opts.visible ?? true,
    sent,
    isDestroyed: () => win.destroyed,
    isVisible: () => win.visible,
    webContents: {
      isDestroyed: () => win.destroyed,
      send: (...args: unknown[]) => {
        sent.push(args);
      }
    }
  };
  return win;
}

/** Mutable test state the electron mock reads. */
const state: {
  applicationMenu: FakeMenu | null;
  focused: FakeWindow | null;
  windows: FakeWindow[];
} = { applicationMenu: null, focused: null, windows: [] };

vi.mock('electron', () => ({
  app: {
    name: 'gmux',
    isPackaged: true,
    getPath: () => join(tmpdir(), 'gmux-menu-test'),
    on: () => undefined,
    quit: () => undefined
  },
  BrowserWindow: {
    getFocusedWindow: () => state.focused,
    getAllWindows: () => state.windows
  },
  Menu: {
    buildFromTemplate: (template: FakeItem[]) => new FakeMenu(template),
    setApplicationMenu: (menu: FakeMenu | null) => {
      state.applicationMenu = menu;
    },
    getApplicationMenu: () => state.applicationMenu
  }
}));

// The Settings window's identity is a live BrowserWindow id in production; in
// the test it is just a tag, so menu.ts's real targeting logic is what runs.
vi.mock('../settings/window', () => ({
  isSettingsWindow: (win: FakeWindow | null) => win?.kind === 'settings',
  openSettingsWindow: () => undefined,
  closeSettingsWindowIfFocused: () => false
}));

// Hotkey items are a different feature; keep the menu's shape stable and the
// test off the user's real settings.json.
vi.mock('../settings/store', () => ({ getSettings: () => ({ hotkeys: {} }) }));

const {
  installAppMenu,
  rebuildAppMenu,
  sendMenuAction,
  sessionsPositionRadioState,
  setSessionsPositionRadios
} = await import('../menu');

// ---------------------------------------------------------------------------

function radioFor(position: SessionsPosition): SessionsPositionRadio {
  const radio = SESSIONS_POSITION_RADIOS.find((r) => r.position === position);
  if (radio === undefined) throw new Error(`no radio names ${position}`);
  return radio;
}

const TOP = radioFor('top');
const RIGHT = radioFor('right');

/** The checked flag of each radio in the CURRENT application menu. */
function marks(): { top: boolean; right: boolean } {
  const menu = state.applicationMenu;
  if (menu === null) throw new Error('no application menu');
  return {
    top: menu.getMenuItemById(TOP.id)?.checked === true,
    right: menu.getMenuItemById(RIGHT.id)?.checked === true
  };
}

function click(id: string): void {
  const item = state.applicationMenu?.getMenuItemById(id);
  if (item?.click === undefined) throw new Error(`no clickable item ${id}`);
  item.click();
}

beforeEach(() => {
  state.applicationMenu = null;
  state.focused = null;
  state.windows = [];
  // Every test starts from the app's own default so the cache cannot leak
  // between them (the module holds it for the process's lifetime).
  setSessionsPositionRadios('top');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the radios render the store, and only the store', () => {
  it('opens on the cached position — top before anyone has said otherwise', () => {
    installAppMenu();
    expect(marks()).toEqual({ top: true, right: false });
    expect(sessionsPositionRadioState()).toBe('top');
  });

  it('follows a push from the store', () => {
    installAppMenu();
    setSessionsPositionRadios('right');
    expect(marks()).toEqual({ top: false, right: true });
  });

  it('follows a push BACK to top — the direction that used to invert', () => {
    installAppMenu();
    setSessionsPositionRadios('right');
    setSessionsPositionRadios('top');
    expect(marks()).toEqual({ top: true, right: false });
  });

  it('re-asserting the same position is not a way to lose the mark', () => {
    installAppMenu();
    setSessionsPositionRadios('top'); // what the store pushes on every load
    setSessionsPositionRadios('top');
    expect(marks()).toEqual({ top: true, right: false });
  });

  it('never writes checked=false to a radio — Electron would MARK it', () => {
    installAppMenu();
    for (const p of ['right', 'top', 'right', 'top'] as const) {
      setSessionsPositionRadios(p);
    }
    expect(state.applicationMenu?.falseWrites ?? ['no menu']).toEqual([]);
  });

  it('SURVIVES A REBUILD — a hotkey change must not reset it', () => {
    installAppMenu();
    setSessionsPositionRadios('right');

    rebuildAppMenu(); // what settings:set does on every hotkey change
    expect(marks()).toEqual({ top: false, right: true });

    rebuildAppMenu();
    rebuildAppMenu();
    expect(marks()).toEqual({ top: false, right: true });
  });

  it('remembers a push that arrived before the menu existed', () => {
    setSessionsPositionRadios('right'); // no application menu yet
    installAppMenu();
    expect(marks()).toEqual({ top: false, right: true });
  });

  it('never marks itself on click — the store is the only writer', () => {
    installAppMenu();
    state.windows = [makeWindow('app')];

    click(RIGHT.id);
    // The click forwarded the action; the mark has NOT moved, because the
    // sessions have not moved yet.
    expect(marks()).toEqual({ top: true, right: false });
    expect(sessionsPositionRadioState()).toBe('top');

    // …and then the store says it went.
    setSessionsPositionRadios('right');
    expect(marks()).toEqual({ top: false, right: true });
  });
});

describe('the radios and the renderer read one table', () => {
  it('takes its ids, labels and actions from @shared/sessions-position', () => {
    installAppMenu();
    for (const radio of SESSIONS_POSITION_RADIOS) {
      const item = state.applicationMenu?.getMenuItemById(radio.id);
      expect(item?.label).toBe(radio.label);
      expect(item?.type).toBe('radio');
    }
  });

  it('forwards the action the table names, for each position', () => {
    installAppMenu();
    for (const radio of SESSIONS_POSITION_RADIOS) {
      const win = makeWindow('app');
      state.windows = [win];
      click(radio.id);
      expect(win.sent).toEqual([[EVT_MENU_ACTION, radio.action]]);
    }
  });
});

describe('a menu action always reaches a window that can act on it', () => {
  it('goes to the focused window when it is the app', () => {
    const app = makeWindow('app');
    const other = makeWindow('app');
    state.windows = [other, app];
    state.focused = app;

    expect(sendMenuAction('sessions-right')).toBe(true);
    expect(app.sent).toHaveLength(1);
    expect(other.sent).toHaveLength(0);
  });

  it('goes to the app window when SETTINGS has focus', () => {
    const app = makeWindow('app');
    const settings = makeWindow('settings');
    state.windows = [settings, app];
    state.focused = settings;

    expect(sendMenuAction('sessions-top')).toBe(true);
    expect(settings.sent).toHaveLength(0);
    expect(app.sent).toEqual([[EVT_MENU_ACTION, 'sessions-top']]);
  });

  it('goes to the app window when NOTHING has focus', () => {
    const app = makeWindow('app');
    state.windows = [app];
    state.focused = null;

    expect(sendMenuAction('sessions-right')).toBe(true);
    expect(app.sent).toEqual([[EVT_MENU_ACTION, 'sessions-right']]);
  });

  it('prefers a visible window over the smoke harness’s hidden one', () => {
    const hidden = makeWindow('app', { visible: false });
    const visible = makeWindow('app');
    state.windows = [hidden, visible];

    expect(sendMenuAction('sessions-top')).toBe(true);
    expect(hidden.sent).toHaveLength(0);
    expect(visible.sent).toHaveLength(1);
  });

  it('skips destroyed windows rather than throwing at them', () => {
    const dead = makeWindow('app', { destroyed: true });
    const live = makeWindow('app');
    state.windows = [dead, live];

    expect(sendMenuAction('sessions-top')).toBe(true);
    expect(dead.sent).toHaveLength(0);
    expect(live.sent).toHaveLength(1);
  });

  it('SAYS SO when there is nowhere to send it, instead of no-oping', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    state.windows = [makeWindow('settings')];

    expect(sendMenuAction('sessions-right')).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('sessions-right');
  });
});
