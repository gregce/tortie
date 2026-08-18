/**
 * The View menu tells the truth (Phase 60, corrected in Phase 62.1).
 *
 * Two lies are kept dead here. First, the menu listed Explorer and Source
 * Control while the activity bar has four views, so half the views were
 * undiscoverable from the menu bar. The template must now list Explorer,
 * Search, Source Control and Context, in the activity bar's own order, each
 * with the accelerator the shared keymap owns.
 *
 * Second, and this is what Phase 62.1 corrected, the packaged View menu must
 * show exactly ONE full screen row. Phase 60 believed its role item was the
 * only source of one and pinned the role's count at one here. Measurement on
 * the packaged build in Phase 62.1 refuted that: with the role, macOS added a
 * second row bound to the globe key, and both were on screen. Phase 60 could
 * not see it because it counted through the accessibility interface, which
 * lists only one of the two.
 *
 * So the template now declares NO VISIBLE full screen row. macOS adds its own
 * "Enter Full Screen", and the app carries only a HIDDEN item whose job is to
 * keep control-command-F working. These tests forbid the role, because the
 * role is the shape that makes the live probe blind, and they pin the hidden
 * item's shape so the chord cannot quietly disappear.
 *
 * Phase 80.1 added a third job. The View menu gained one visible row named
 * "Focus the Session", carrying the keymap's Shift+Cmd+Enter, placed directly
 * under "Fill the Window". No row was removed, renamed or reordered. The
 * first describe below pins that row, its position and its action id, and it
 * restates the full screen shape once more, because the new row lives in the
 * same submenu as the hidden full screen item.
 *
 * Same fake-electron pattern as sessions-position-menu.test.ts: the real
 * menu.ts runs against a template-capturing Menu mock.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accelerator } from '@shared/keymap';
import { EVT_MENU_ACTION } from '@shared/ipc';

// ---------------------------------------------------------------------------
// A fake electron, small enough to read: the parts menu.ts actually touches.
// ---------------------------------------------------------------------------

interface FakeItem {
  id?: string;
  label?: string;
  role?: string;
  type?: string;
  accelerator?: string;
  acceleratorWorksWhenHidden?: boolean;
  visible?: boolean;
  checked?: boolean;
  click?: () => void;
  submenu?: FakeItem[];
}

class FakeMenu {
  constructor(readonly template: FakeItem[]) {}
  getMenuItemById(): FakeItem | null {
    return null;
  }
}

interface FakeWindow {
  readonly sent: unknown[][];
  isDestroyed(): boolean;
  isVisible(): boolean;
  webContents: { isDestroyed(): boolean; send(...args: unknown[]): void };
}

function makeWindow(): FakeWindow {
  const sent: unknown[][] = [];
  return {
    sent,
    isDestroyed: () => false,
    isVisible: () => true,
    webContents: {
      isDestroyed: () => false,
      send: (...args: unknown[]) => {
        sent.push(args);
      }
    }
  };
}

const state: {
  applicationMenu: FakeMenu | null;
  windows: FakeWindow[];
} = {
  applicationMenu: null,
  windows: []
};

vi.mock('electron', () => ({
  app: {
    name: 'Tortie',
    isPackaged: true,
    getPath: () => join(tmpdir(), 'gmux-view-menu-test'),
    getVersion: () => '0.0.1',
    setAboutPanelOptions: () => undefined,
    on: () => undefined,
    quit: () => undefined
  },
  BrowserWindow: {
    getFocusedWindow: () => null,
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

vi.mock('../settings/window', () => ({
  isSettingsWindow: () => false,
  openSettingsWindow: () => undefined,
  closeSettingsWindowIfFocused: () => false
}));

vi.mock('../settings/store', () => ({ getSettings: () => ({ hotkeys: {} }) }));

vi.mock('../manifest/reconstruct-operator', () => ({
  runOperatorReconstruction: () => Promise.resolve()
}));

const { installAppMenu, rebuildAppMenu } = await import('../menu');

// ---------------------------------------------------------------------------

/** The View submenu of the CURRENT application menu. */
function viewItems(): FakeItem[] {
  const view = state.applicationMenu?.template.find(
    (it) => it.label === 'View'
  );
  if (!Array.isArray(view?.submenu)) throw new Error('no View submenu');
  return view.submenu;
}

/** Items carrying the native role macOS reacts to. Must always be zero. */
function fullscreenRoleCount(): number {
  return viewItems().filter((it) => it.role === 'togglefullscreen').length;
}

/** Every item this app declares whose label names full screen. */
function fullscreenItems(): FakeItem[] {
  return viewItems().filter((it) => (it.label ?? '').includes('Full Screen'));
}

const realPlatform = process.platform;

function setPlatform(platform: string): void {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true
  });
}

beforeEach(() => {
  state.applicationMenu = null;
  state.windows = [];
  setPlatform('darwin');
});

afterEach(() => {
  setPlatform(realPlatform);
  vi.restoreAllMocks();
});

describe('the four views, in the activity bar’s order', () => {
  it('lists Explorer, Search, Source Control, Context first', () => {
    installAppMenu();
    expect(viewItems().slice(0, 4).map((it) => it.label)).toEqual([
      'Explorer',
      'Search',
      'Source Control',
      'Context'
    ]);
  });

  it('each view item wears the accelerator the shared keymap owns', () => {
    installAppMenu();
    const byLabel = new Map(viewItems().map((it) => [it.label, it]));
    expect(byLabel.get('Explorer')?.accelerator).toBe(
      accelerator('view.explorer')
    );
    expect(byLabel.get('Search')?.accelerator).toBe(accelerator('view.search'));
    expect(byLabel.get('Source Control')?.accelerator).toBe(
      accelerator('view.scm')
    );
    expect(byLabel.get('Context')?.accelerator).toBe(
      accelerator('view.context')
    );
  });

  it('clicking Context forwards show-context to the app window', () => {
    installAppMenu();
    const win = makeWindow();
    state.windows = [win];
    const context = viewItems().find((it) => it.label === 'Context');
    expect(context?.click).toBeDefined();
    context?.click?.();
    expect(win.sent).toEqual([[EVT_MENU_ACTION, 'show-context']]);
  });

  it('clicking Search forwards show-search, the id the Find menu shares', () => {
    installAppMenu();
    const win = makeWindow();
    state.windows = [win];
    const search = viewItems().find((it) => it.label === 'Search');
    search?.click?.();
    expect(win.sent).toEqual([[EVT_MENU_ACTION, 'show-search']]);
  });
});

describe('Focus the Session, the row Phase 80.1 added', () => {
  it('adds exactly one row with that label', () => {
    installAppMenu();
    const rows = viewItems().filter((it) => it.label === 'Focus the Session');
    expect(rows).toHaveLength(1);
  });

  it('places it immediately under Fill the Window', () => {
    installAppMenu();
    const items = viewItems();
    const fill = items.findIndex((it) => it.label === 'Fill the Window');
    expect(fill).toBeGreaterThan(-1);
    expect(items[fill + 1]?.label).toBe('Focus the Session');
  });

  it('reads its accelerator from the keymap rather than typing one', () => {
    installAppMenu();
    const row = viewItems().find((it) => it.label === 'Focus the Session');
    expect(row?.accelerator).toBe(accelerator('view.sessionFocus'));
  });

  it('forwards toggle-session-focus when clicked', () => {
    installAppMenu();
    const win = makeWindow();
    state.windows = [win];
    const row = viewItems().find((it) => it.label === 'Focus the Session');
    expect(row?.click).toBeDefined();
    row?.click?.();
    expect(win.sent).toEqual([[EVT_MENU_ACTION, 'toggle-session-focus']]);
  });

  it('leaves the full screen shape exactly as Phase 62.1 measured it', () => {
    // The new row sits in the same submenu as the hidden full screen item,
    // so this states in one place that adding it moved nothing there. The
    // describe below pins the same shape for its own reasons.
    setPlatform('darwin');
    installAppMenu();
    expect(fullscreenRoleCount()).toBe(0);
    const items = fullscreenItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.visible).toBe(false);
    expect(items[0]?.accelerator).toBe('Control+Command+F');
  });
});

describe('the full screen row, measured on the packaged build in Phase 62.1', () => {
  it('declares no togglefullscreen role on macOS, because macOS adds a second row next to one', () => {
    setPlatform('darwin');
    installAppMenu();
    expect(fullscreenRoleCount()).toBe(0);
  });

  it('declares no togglefullscreen role off macOS either, since the template is one shape', () => {
    setPlatform('linux');
    rebuildAppMenu();
    expect(fullscreenRoleCount()).toBe(0);
  });

  it('declares exactly one full screen item and keeps it hidden', () => {
    setPlatform('darwin');
    installAppMenu();
    const items = fullscreenItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.label).toBe('Toggle Full Screen');
    expect(items[0]?.visible).toBe(false);
  });

  it('keeps control-command-F alive on the hidden item', () => {
    setPlatform('darwin');
    installAppMenu();
    const hidden = fullscreenItems()[0];
    expect(hidden?.accelerator).toBe('Control+Command+F');
    expect(hidden?.acceleratorWorksWhenHidden).toBe(true);
  });

  it('keeps a separator ahead of the full screen item', () => {
    setPlatform('darwin');
    installAppMenu();
    const items = viewItems();
    const at = items.findIndex((it) => (it.label ?? '').includes('Full Screen'));
    expect(at).toBeGreaterThan(0);
    expect(items[at - 1]?.type).toBe('separator');
  });

  it('does nothing and does not throw when there is no window to act on', () => {
    setPlatform('darwin');
    installAppMenu();
    const hidden = fullscreenItems()[0];
    expect(hidden?.click).toBeDefined();
    expect(() => hidden?.click?.()).not.toThrow();
  });
});
