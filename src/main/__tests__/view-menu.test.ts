/**
 * The View menu tells the truth (Phase 60).
 *
 * Two lies are kept dead here. First, the menu listed Explorer and Source
 * Control while the activity bar has four views, so half the views were
 * undiscoverable from the menu bar. The template must now list Explorer,
 * Search, Source Control and Context, in the activity bar's own order, each
 * with the accelerator the shared keymap owns. Second, the full screen item
 * must appear exactly once on every platform, and the template's role item
 * is the only source of one. The phase first shipped a darwin guard on the
 * belief that macOS injects its own item into any menu titled "View".
 * Measurement in the live app refuted that belief. With the role omitted the
 * menu carried zero full screen items and the shortcut was dead. So the
 * template emits the role unconditionally, and these tests pin the count at
 * one on darwin and off it.
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

function fullscreenCount(): number {
  return viewItems().filter((it) => it.role === 'togglefullscreen').length;
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

describe('exactly one full screen item on every platform', () => {
  it('emits exactly ONE togglefullscreen role on macOS, where nothing injects one', () => {
    setPlatform('darwin');
    installAppMenu();
    expect(fullscreenCount()).toBe(1);
  });

  it('emits exactly ONE togglefullscreen role elsewhere', () => {
    setPlatform('linux');
    rebuildAppMenu();
    expect(fullscreenCount()).toBe(1);
  });

  it('keeps a separator ahead of the role on macOS', () => {
    setPlatform('darwin');
    installAppMenu();
    const items = viewItems();
    const at = items.findIndex((it) => it.role === 'togglefullscreen');
    expect(at).toBeGreaterThan(0);
    expect(items[at - 1]?.type).toBe('separator');
  });

  it('keeps a separator ahead of the role off macOS', () => {
    setPlatform('linux');
    rebuildAppMenu();
    const items = viewItems();
    const at = items.findIndex((it) => it.role === 'togglefullscreen');
    expect(at).toBeGreaterThan(0);
    expect(items[at - 1]?.type).toBe('separator');
  });
});
