/**
 * The View menu's projects-position radios (Phase 129).
 *
 * The sibling of sessions-position-menu.test.ts, and it keeps the same bug
 * dead for the new pair: the radios must be a RENDERING of the store's value,
 * never a second copy of it.
 *
 * What is pinned here:
 *  - the pair is built FROM the last position the store announced, so a
 *    rebuild reproduces it instead of resetting it;
 *  - a click never marks itself. It forwards to the store, which is the only
 *    thing that can move the mark;
 *  - nothing ever assigns `checked = false` to a radio, because on Electron 43
 *    assigning false MARKS the item (the measurement is written out in
 *    sessions-position-menu.test.ts and in menu.ts itself);
 *  - THE TWO PAIRS ARE SEPARATE RADIO GROUPS. macOS groups a run of radio
 *    items and ends the group at a separator, so the fake below groups them
 *    the same way. Marking a projects radio must not disturb the sessions
 *    pair, and this test is the only place that can catch it.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECTS_POSITION_RADIOS } from '@shared/projects-position';
import type {
  ProjectsPosition,
  ProjectsPositionRadio
} from '@shared/projects-position';
import { SESSIONS_POSITION_RADIOS } from '@shared/sessions-position';
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
 * RADIO SEMANTICS AS MEASURED. Assigning `checked = true` marks an item and
 * unmarks its group siblings. Assigning `checked = false` ALSO marks it, which
 * is why production code may only ever write true.
 *
 * GROUPS END AT A SEPARATOR, which is the one way this fake differs from the
 * one in sessions-position-menu.test.ts. That file was written when the View
 * menu held a single radio pair and every radio in a submenu was one group.
 * There are two pairs now, with a separator between them, and a fake that
 * merged them would report a failure macOS does not have and, worse, would
 * hide the failure it does have.
 */
class FakeMenu {
  readonly byId = new Map<string, FakeItem>();
  /** Every `checked = false` written to a radio item — a clearer failure. */
  readonly falseWrites: string[] = [];
  readonly #marked = new WeakMap<FakeItem, boolean>();

  constructor(readonly template: FakeItem[]) {
    const index = (items: FakeItem[]): void => {
      let group: FakeItem[] = [];
      const groups: FakeItem[][] = [];
      for (const it of items) {
        if (it.type === 'radio') group.push(it);
        else if (group.length > 0) {
          groups.push(group);
          group = [];
        }
        if (typeof it.id === 'string') this.byId.set(it.id, it);
        if (Array.isArray(it.submenu)) index(it.submenu);
      }
      if (group.length > 0) groups.push(group);
      for (const g of groups) for (const it of g) this.#arm(g, it);
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

function makeWindow(kind: 'app' | 'settings'): FakeWindow {
  const sent: unknown[][] = [];
  const win: FakeWindow = {
    kind,
    destroyed: false,
    visible: true,
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

const state: {
  applicationMenu: FakeMenu | null;
  focused: FakeWindow | null;
  windows: FakeWindow[];
} = { applicationMenu: null, focused: null, windows: [] };

vi.mock('electron', () => ({
  app: {
    name: 'Tortie',
    isPackaged: true,
    getPath: () => join(tmpdir(), 'gmux-projects-menu-test'),
    getVersion: () => '0.0.1',
    setAboutPanelOptions: () => undefined,
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

vi.mock('../settings/window', () => ({
  isSettingsWindow: (win: FakeWindow | null) => win?.kind === 'settings',
  openSettingsWindow: () => undefined,
  closeSettingsWindowIfFocused: () => false
}));

vi.mock('../settings/store', () => ({ getSettings: () => ({ hotkeys: {} }) }));

vi.mock('../manifest/reconstruct-operator', () => ({
  runOperatorReconstruction: () => Promise.resolve()
}));

const {
  installAppMenu,
  rebuildAppMenu,
  projectsPositionRadioState,
  setProjectsPositionRadios,
  setSessionsPositionRadios
} = await import('../menu');

// ---------------------------------------------------------------------------

function radioFor(position: ProjectsPosition): ProjectsPositionRadio {
  const radio = PROJECTS_POSITION_RADIOS.find((r) => r.position === position);
  if (radio === undefined) throw new Error(`no radio names ${position}`);
  return radio;
}

const TOP = radioFor('top');
const LEFT = radioFor('left');

function marks(): { top: boolean; left: boolean } {
  const menu = state.applicationMenu;
  if (menu === null) throw new Error('no application menu');
  return {
    top: menu.getMenuItemById(TOP.id)?.checked === true,
    left: menu.getMenuItemById(LEFT.id)?.checked === true
  };
}

function sessionMarks(): { top: boolean; right: boolean } {
  const menu = state.applicationMenu;
  if (menu === null) throw new Error('no application menu');
  return {
    top: menu.getMenuItemById('view-sessions-top')?.checked === true,
    right: menu.getMenuItemById('view-sessions-right')?.checked === true
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
  setProjectsPositionRadios('top');
  setSessionsPositionRadios('top');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the projects radios render the store, and only the store', () => {
  it('opens on the cached position — top before anyone has said otherwise', () => {
    installAppMenu();
    expect(marks()).toEqual({ top: true, left: false });
    expect(projectsPositionRadioState()).toBe('top');
  });

  it('follows a push from the store', () => {
    installAppMenu();
    setProjectsPositionRadios('left');
    expect(marks()).toEqual({ top: false, left: true });
  });

  it('follows a push BACK to top — the direction that used to invert', () => {
    installAppMenu();
    setProjectsPositionRadios('left');
    setProjectsPositionRadios('top');
    expect(marks()).toEqual({ top: true, left: false });
  });

  it('re-asserting the same position is not a way to lose the mark', () => {
    installAppMenu();
    setProjectsPositionRadios('top'); // what the store pushes on every load
    setProjectsPositionRadios('top');
    expect(marks()).toEqual({ top: true, left: false });
  });

  it('never writes checked=false to a radio — Electron would MARK it', () => {
    installAppMenu();
    for (const p of ['left', 'top', 'left', 'top'] as const) {
      setProjectsPositionRadios(p);
    }
    expect(state.applicationMenu?.falseWrites ?? ['no menu']).toEqual([]);
  });

  it('SURVIVES A REBUILD — a hotkey change must not reset it', () => {
    installAppMenu();
    setProjectsPositionRadios('left');
    rebuildAppMenu(); // what settings:set does on every hotkey change
    expect(marks()).toEqual({ top: false, left: true });
    rebuildAppMenu();
    rebuildAppMenu();
    expect(marks()).toEqual({ top: false, left: true });
  });

  it('remembers a push that arrived before the menu existed', () => {
    setProjectsPositionRadios('left'); // no application menu yet
    installAppMenu();
    expect(marks()).toEqual({ top: false, left: true });
  });

  it('never marks itself on click — the store is the only writer', () => {
    installAppMenu();
    state.windows = [makeWindow('app')];
    click(LEFT.id);
    expect(marks()).toEqual({ top: true, left: false });
    expect(projectsPositionRadioState()).toBe('top');
    setProjectsPositionRadios('left');
    expect(marks()).toEqual({ top: false, left: true });
  });
});

describe('the two pairs are two groups', () => {
  it('moving the projects mark leaves the sessions mark where it was', () => {
    installAppMenu();
    setSessionsPositionRadios('right');
    expect(sessionMarks()).toEqual({ top: false, right: true });
    setProjectsPositionRadios('left');
    expect(sessionMarks()).toEqual({ top: false, right: true });
    expect(marks()).toEqual({ top: false, left: true });
  });

  it('moving the sessions mark leaves the projects mark where it was', () => {
    installAppMenu();
    setProjectsPositionRadios('left');
    setSessionsPositionRadios('right');
    expect(marks()).toEqual({ top: false, left: true });
  });

  it('draws four radios in the View menu, two per question', () => {
    installAppMenu();
    const ids = [
      ...SESSIONS_POSITION_RADIOS.map((r) => r.id),
      ...PROJECTS_POSITION_RADIOS.map((r) => r.id)
    ];
    expect(new Set(ids).size).toBe(4);
    for (const id of ids) {
      expect(state.applicationMenu?.getMenuItemById(id)?.type).toBe('radio');
    }
  });
});

describe('the radios and the renderer read one table', () => {
  it('takes its ids, labels and actions from @shared/projects-position', () => {
    installAppMenu();
    for (const radio of PROJECTS_POSITION_RADIOS) {
      const item = state.applicationMenu?.getMenuItemById(radio.id);
      expect(item?.label).toBe(radio.label);
      expect(item?.type).toBe('radio');
    }
  });

  it('forwards the action the table names, for each position', () => {
    installAppMenu();
    for (const radio of PROJECTS_POSITION_RADIOS) {
      const win = makeWindow('app');
      state.windows = [win];
      click(radio.id);
      expect(win.sent).toEqual([[EVT_MENU_ACTION, radio.action]]);
    }
  });
});
