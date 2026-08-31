/**
 * PHASE 175 — the native menu carries no Architecture row until a person
 * turns the surface on, and it changes in the SAME SESSION when they do.
 *
 * Three rows read the switch, and they are doors rather than mentions: View
 * then Architecture opens the view, View then Architecture Map opens the map
 * tab, and Session then Aim at a Promise… reads the contract and writes a
 * promise into a session's prompt. Hidden rather than disabled, because a
 * disabled row is a promise with nowhere to read why, and the way back in is
 * Settings then Architecture, which is visible always.
 *
 * The CLAUDE.md menu rule is what the second half of this file holds: a
 * phase that adds or removes a user facing surface rebuilds the native menu
 * in the same commit. `rebuildAppMenu()` is what `settings:set` calls when
 * the switch flips, and the proof is that the same process, with no
 * relaunch, answers a different template.
 *
 * Same fake-electron pattern as view-menu.test.ts, with one difference that
 * is the point of the file: the settings mock is MUTABLE, so one run can
 * read the menu on both sides of a flip.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accelerator } from '@shared/keymap';
import { EVT_MENU_ACTION } from '@shared/ipc';

interface FakeItem {
  label?: string;
  role?: string;
  type?: string;
  accelerator?: string;
  icon?: unknown;
  visible?: boolean;
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

const state: { applicationMenu: FakeMenu | null; windows: FakeWindow[] } = {
  applicationMenu: null,
  windows: []
};

/** The switch, as main's settings store would answer it. Mutable on purpose. */
let archEnabled = false;

vi.mock('electron', () => ({
  app: {
    name: 'Tortie',
    isPackaged: true,
    getPath: () => join(tmpdir(), 'gmux-p175-menu-test'),
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

vi.mock('../settings/store', () => ({
  getSettings: () => ({ hotkeys: {}, arch: { enabled: archEnabled } })
}));

vi.mock('../native-menu-icon', () => ({
  nativeMenuGlyph: (name: string) => ({ icon: { name } }),
  menuIcon: () => null
}));

vi.mock('../manifest/reconstruct-operator', () => ({
  runOperatorReconstruction: () => Promise.resolve()
}));

const { installAppMenu, rebuildAppMenu } = await import('../menu');

// ---------------------------------------------------------------------------

/** One top level submenu of the CURRENT application menu. */
function submenu(label: string): FakeItem[] {
  const top = state.applicationMenu?.template.find((it) => it.label === label);
  if (!Array.isArray(top?.submenu)) throw new Error(`no ${label} submenu`);
  return top.submenu;
}

/** Every label anywhere in the menu, flattened, so a row cannot hide. */
function allLabels(): string[] {
  const out: string[] = [];
  const walk = (items: FakeItem[]): void => {
    for (const it of items) {
      if (typeof it.label === 'string') out.push(it.label);
      if (Array.isArray(it.submenu)) walk(it.submenu);
    }
  };
  walk(state.applicationMenu?.template ?? []);
  return out;
}

const ARCH_ROWS = ['Architecture', 'Architecture Map', 'Aim at a Promise…'];

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
  archEnabled = false;
  setPlatform('darwin');
});

afterEach(() => {
  setPlatform(realPlatform);
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------

describe('the shipped default, which is OFF', () => {
  it('draws no Architecture row anywhere in the menu bar', () => {
    installAppMenu();
    for (const label of ARCH_ROWS) {
      expect(allLabels(), `${label} is still on the menu`).not.toContain(label);
    }
  });

  it('hides them rather than dimming them, so no dead row is drawn', () => {
    installAppMenu();
    // A `visible: false` or `enabled: false` row carrying an Architecture
    // label would pass the flattened check above and still be the thing this
    // phase refused, which is a row a person can see and cannot use. There
    // is no such row at all. (The View menu DOES carry one hidden item, the
    // Phase 62.1 full screen chord holder, and it is not one of these.)
    const arch = [...submenu('View'), ...submenu('Session')].filter((it) =>
      ARCH_ROWS.includes(it.label ?? '')
    );
    expect(arch).toHaveLength(0);
  });

  it('leaves every other View row exactly where it was', () => {
    installAppMenu();
    expect(submenu('View').slice(0, 4).map((it) => it.label)).toEqual([
      'Explorer',
      'Search',
      'Source Control',
      'Context'
    ]);
  });

  it('leaves Catch Me Up in place, the row the two sat above', () => {
    installAppMenu();
    expect(allLabels()).toContain('Catch Me Up');
  });
});

describe('with the switch ON', () => {
  beforeEach(() => {
    archEnabled = true;
    installAppMenu();
  });

  it('puts both View rows back, in their Phase 160 order', () => {
    const labels = submenu('View').map((it) => it.label);
    const at = labels.indexOf('Architecture');
    expect(at).toBeGreaterThan(-1);
    expect(labels[at + 1]).toBe('Architecture Map');
    expect(labels[at - 1]).toBe('Context');
  });

  it('puts the Session row back', () => {
    expect(submenu('Session').map((it) => it.label)).toContain(
      'Aim at a Promise…'
    );
  });

  it('reads both accelerators from the keymap rather than typing one', () => {
    const byLabel = new Map(
      [...submenu('View'), ...submenu('Session')].map((it) => [it.label, it])
    );
    expect(byLabel.get('Architecture')?.accelerator).toBe(
      accelerator('view.arch')
    );
    expect(byLabel.get('Aim at a Promise…')?.accelerator).toBe(
      accelerator('session.aim')
    );
    // The map row has never had a chord and must not grow one here.
    expect(byLabel.get('Architecture Map')?.accelerator).toBeUndefined();
  });

  it('keeps the circuit-board mark on all three', () => {
    const byLabel = new Map(
      [...submenu('View'), ...submenu('Session')].map((it) => [it.label, it])
    );
    for (const label of ARCH_ROWS) {
      expect(byLabel.get(label)?.icon).toEqual({ name: 'circuit-board' });
    }
  });

  it('forwards the three actions the renderer gates on', () => {
    const win = makeWindow();
    state.windows = [win];
    const byLabel = new Map(
      [...submenu('View'), ...submenu('Session')].map((it) => [it.label, it])
    );
    byLabel.get('Architecture')?.click?.();
    byLabel.get('Architecture Map')?.click?.();
    byLabel.get('Aim at a Promise…')?.click?.();
    expect(win.sent).toEqual([
      [EVT_MENU_ACTION, 'show-arch'],
      [EVT_MENU_ACTION, 'show-arch-map'],
      [EVT_MENU_ACTION, 'arch-aim']
    ]);
  });
});

describe('the flip is answered in the same session, with no relaunch', () => {
  it('reveals all three rows on a rebuild', () => {
    installAppMenu();
    expect(allLabels()).not.toContain('Architecture');
    archEnabled = true;
    rebuildAppMenu();
    for (const label of ARCH_ROWS) {
      expect(allLabels()).toContain(label);
    }
  });

  it('removes all three again on the next rebuild', () => {
    archEnabled = true;
    installAppMenu();
    expect(allLabels()).toContain('Architecture Map');
    archEnabled = false;
    rebuildAppMenu();
    for (const label of ARCH_ROWS) {
      expect(allLabels()).not.toContain(label);
    }
  });

  it('is a real second template, not the first one mutated', () => {
    installAppMenu();
    const first = state.applicationMenu;
    archEnabled = true;
    rebuildAppMenu();
    expect(state.applicationMenu).not.toBe(first);
  });
});

describe('a settings store that cannot be read', () => {
  it('ships the default, which is off, rather than throwing', async () => {
    vi.resetModules();
    vi.doMock('../settings/store', () => ({
      getSettings: () => {
        throw new Error('settings unreadable');
      }
    }));
    const menu = await import('../menu');
    expect(() => menu.installAppMenu()).not.toThrow();
    for (const label of ARCH_ROWS) {
      expect(allLabels()).not.toContain(label);
    }
    vi.doUnmock('../settings/store');
    vi.resetModules();
  });
});
