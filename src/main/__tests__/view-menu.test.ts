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
 * "Focus the Session or File", carrying the keymap's Shift+Cmd+Enter, directly
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
  /**
   * PHASE 156. The real menu.ts spreads a NativeImage in here for a row that
   * has a mark, and no key at all for a row that does not, which is what lets
   * a test say "this row is bare" and mean it. The fake electron below answers
   * a distinguishable object per name, so a test can pin WHICH mark a row
   * wears without an Electron and without decoding a PNG.
   */
  icon?: unknown;
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

/**
 * PHASE 156. The mark decoder, faked so this suite stays free of Electron.
 *
 * It answers `{ icon: { name } }` for every name, which is the same SHAPE the
 * real `nativeMenuGlyph` answers, so a row's template entry carries an icon key
 * exactly when the real one would. What it does not do is decode a PNG, and it
 * does not need to: build/assert-menu-glyphs.mjs is what proves the bitmaps are
 * real, present and distinct, and this suite's job is which row wears which
 * name.
 */
vi.mock('../native-menu-icon', () => ({
  nativeMenuGlyph: (name: string) => ({ icon: { name } }),
  menuIcon: () => null
}));

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

describe('Focus the Session or File, the row Phase 80.1 added', () => {
  it('adds exactly one row with that label', () => {
    installAppMenu();
    const rows = viewItems().filter((it) => it.label === 'Focus the Session or File');
    expect(rows).toHaveLength(1);
  });

  it('places it immediately under Fill the Window', () => {
    installAppMenu();
    const items = viewItems();
    const fill = items.findIndex((it) => it.label === 'Fill the Window');
    expect(fill).toBeGreaterThan(-1);
    expect(items[fill + 1]?.label).toBe('Focus the Session or File');
  });

  it('reads its accelerator from the keymap rather than typing one', () => {
    installAppMenu();
    const row = viewItems().find((it) => it.label === 'Focus the Session or File');
    expect(row?.accelerator).toBe(accelerator('view.sessionFocus'));
  });

  it('forwards toggle-session-focus when clicked', () => {
    installAppMenu();
    const win = makeWindow();
    state.windows = [win];
    const row = viewItems().find((it) => it.label === 'Focus the Session or File');
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

// ---------------------------------------------------------------------------
// PHASE 156: the marks, and the argued refusals
//
// This is the cheap half of the phase's proof. It runs the REAL menu.ts against
// the template-capturing fake above, so every claim below is read off the
// template the product composes rather than off a photograph, which is what the
// charter forbids anyway: Phases 119, 152 and 153 all measured that a native
// macOS menu cannot be read or photographed from outside the app.
//
// A bare row is pinned as hard as a marked one. Every refusal in this phase was
// argued at the row in menu.ts, and a later round that quietly adds a mark to
// one of them should turn this suite red rather than ship.
// ---------------------------------------------------------------------------

/** The named submenu of the CURRENT application menu. */
function submenuOf(label: string): FakeItem[] {
  const top = state.applicationMenu?.template.find((it) => it.label === label);
  if (!Array.isArray(top?.submenu)) throw new Error(`no ${label} submenu`);
  return top.submenu;
}

/** The mark one row wears, or null when it is bare. */
function markOf(items: FakeItem[], label: string): string | null {
  const row = items.find((it) => it.label === label);
  if (row === undefined) throw new Error(`no row labelled ${label}`);
  const icon = row.icon as { name?: string } | undefined;
  return icon?.name ?? null;
}

describe('Phase 156: every menu bar row wears the mark its own surface draws', () => {
  beforeEach(() => {
    setPlatform('darwin');
    installAppMenu();
  });

  it('marks the four activity bar views with the activity bar’s own glyphs', () => {
    const view = submenuOf('View');
    expect(markOf(view, 'Explorer')).toBe('files');
    expect(markOf(view, 'Search')).toBe('search');
    expect(markOf(view, 'Context')).toBe('layers');
    // `git-branch` and not `source-control`: the shipped font draws the two as
    // one identical outline, so this row wears the pixels the activity bar
    // draws for it under the name already in the closed set.
    expect(markOf(view, 'Source Control')).toBe('git-branch');
  });

  it('marks the rest of the View menu', () => {
    const view = submenuOf('View');
    expect(markOf(view, 'Catch Me Up')).toBe('comment');
    expect(markOf(view, 'Fill the Window')).toBe('screen-full');
    expect(markOf(view, 'Toggle Editor')).toBe('code');
    expect(markOf(view, 'Sessions That Need Input')).toBe('bell');
  });

  it('leaves Toggle Sidebar and Focus the Session or File bare, as argued', () => {
    const view = submenuOf('View');
    // layout-sidebar-left already means "move the project tabs to the left".
    expect(markOf(view, 'Toggle Sidebar')).toBeNull();
    // Its only candidate is the mark the row above it owns by provenance.
    expect(markOf(view, 'Focus the Session or File')).toBeNull();
  });

  it('leaves every position radio bare, so none of them shares a picture', () => {
    const radios = submenuOf('View').filter((it) => it.type === 'radio');
    expect(radios).toHaveLength(4);
    for (const radio of radios) expect(radio.icon).toBeUndefined();
  });

  it('marks the File menu with the + menu’s own glyphs', () => {
    const file = submenuOf('File');
    expect(markOf(file, 'New Project…')).toBe('new-folder');
    expect(markOf(file, 'Open Project…')).toBe('folder-opened');
    expect(markOf(file, 'Open Folder on a Machine…')).toBe('vm');
    expect(markOf(file, 'Clone Repository…')).toBe('repo-clone');
    expect(markOf(file, 'Save')).toBe('save');
    expect(markOf(file, 'Close Editor Tab')).toBe('close');
    // A submenu parent is a container, so the leaves carry the marks.
    expect(markOf(file, 'Open Recent')).toBeNull();
  });

  it('marks the Session menu, including the two direction arrows', () => {
    const session = submenuOf('Session');
    expect(markOf(session, 'New Session…')).toBe('add');
    expect(markOf(session, 'Rename Session')).toBe('edit');
    expect(markOf(session, 'Next Session')).toBe('arrow-down');
    expect(markOf(session, 'Previous Session')).toBe('arrow-up');
    expect(markOf(session, 'End Session…')).toBe('close');
    expect(markOf(session, 'Resume Conversation')).toBe('terminal');
    expect(markOf(session, 'Past Sessions…')).toBe('history');
  });

  it('marks the Find menu', () => {
    const find = submenuOf('Find');
    expect(markOf(find, 'Go to File…')).toBe('go-to-file');
    expect(markOf(find, 'Find in Project…')).toBe('search');
    expect(markOf(find, 'Go to Symbol…')).toBe('symbol-method');
  });

  it('leaves both project direction rows bare, because no arrow is true in both positions', () => {
    const project = submenuOf('Project');
    expect(markOf(project, 'Next Project')).toBeNull();
    expect(markOf(project, 'Previous Project')).toBeNull();
    expect(markOf(project, 'Close Project…')).toBe('close');
  });

  it('marks the app menu and leaves Quit and Rebuild bare, as argued', () => {
    const tortie = submenuOf('Tortie');
    expect(markOf(tortie, 'Settings…')).toBe('settings-gear');
    expect(markOf(tortie, 'Open Configuration Folder')).toBe('link-external');
    expect(markOf(tortie, 'Check for Updates…')).toBe('refresh');
    // `refresh` is already two rows above it in this same submenu.
    expect(markOf(tortie, 'Rebuild the Session List…')).toBeNull();
    // The standard AppKit row every Mac app draws bare.
    expect(markOf(tortie, 'Quit Tortie')).toBeNull();
  });

  it('leaves every Edit role bare, because they are AppKit’s rows', () => {
    for (const row of submenuOf('Edit')) {
      expect(row.icon).toBeUndefined();
    }
  });

  it('puts no mark on any top level title, which is the phase’s stated answer', () => {
    const top = state.applicationMenu?.template ?? [];
    expect(top.length).toBeGreaterThan(0);
    for (const title of top) expect(title.icon).toBeUndefined();
  });

  it('marks the Help menu’s one row', () => {
    // The Help top level entry carries `role: 'help'` and no label of its own,
    // so it is found by role rather than by name.
    const help = state.applicationMenu?.template.find(
      (it) => it.role === 'help'
    );
    if (!Array.isArray(help?.submenu)) throw new Error('no Help submenu');
    expect(markOf(help.submenu, 'Keyboard Shortcuts')).toBe('keyboard');
  });
});
