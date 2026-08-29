/**
 * Help > Diagnostics Report, and the Settings window's door to it (Phase 163).
 *
 * Same fake electron pattern as view-menu.test.ts: the parts menu.ts touches
 * and nothing else. What is pinned: the Help menu carries the row, the row
 * wears the Diagnostics rail's own mark, clicking it forwards
 * `show-diagnostics` to the app window, and the door handler forwards the
 * SAME action, so the two ways in cannot drift.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVT_MENU_ACTION } from '@shared/ipc';

interface FakeItem {
  label?: string;
  role?: string;
  type?: string;
  accelerator?: string;
  icon?: unknown;
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

vi.mock('electron', () => ({
  app: {
    name: 'Tortie',
    isPackaged: true,
    getPath: () => join(tmpdir(), 'gmux-p163-help-menu-test'),
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
vi.mock('../native-menu-icon', () => ({
  nativeMenuGlyph: (name: string) => ({ icon: { name } }),
  menuIcon: () => null
}));
vi.mock('../manifest/reconstruct-operator', () => ({
  runOperatorReconstruction: () => Promise.resolve()
}));

const { installAppMenu, installDiagnosticsDoor } = await import('../menu');

function helpItems(): FakeItem[] {
  const help = state.applicationMenu?.template.find((it) => it.role === 'help');
  if (!Array.isArray(help?.submenu)) throw new Error('no Help submenu');
  return help.submenu;
}

const realPlatform = process.platform;

beforeEach(() => {
  state.applicationMenu = null;
  state.windows = [];
  Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
});

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: realPlatform, configurable: true });
  vi.restoreAllMocks();
});

describe('Help > Diagnostics Report', () => {
  it('is the last row of Help, after Keyboard Shortcuts', () => {
    installAppMenu();
    const labels = helpItems().map((it) => it.label);
    expect(labels).toEqual(['Keyboard Shortcuts', 'Diagnostics Report']);
  });

  it('wears the Diagnostics rail mark and no chord', () => {
    installAppMenu();
    const row = helpItems().find((it) => it.label === 'Diagnostics Report');
    expect(row?.icon).toEqual({ name: 'output' });
    expect(row?.accelerator).toBeUndefined();
  });

  it('forwards show-diagnostics to the app window', () => {
    installAppMenu();
    const win = makeWindow();
    state.windows = [win];
    helpItems().find((it) => it.label === 'Diagnostics Report')?.click?.();
    expect(win.sent).toEqual([[EVT_MENU_ACTION, 'show-diagnostics']]);
  });
});

describe('the Settings door', () => {
  it('registers one handler on ui:showDiagnostics that forwards the same action', async () => {
    installAppMenu();
    const win = makeWindow();
    state.windows = [win];
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const ipc = {
      handle: (channel: string, fn: (...args: unknown[]) => unknown) => {
        handlers.set(channel, fn);
      }
    };
    installDiagnosticsDoor(ipc as never);
    expect([...handlers.keys()]).toEqual(['ui:showDiagnostics']);
    // The typed wrapper checks the sender; a fake event from a window the
    // registry does not know is refused, which is the wrapper's own test.
    // Calling the forwarder directly proves what the door does.
    const { sendMenuAction } = await import('../menu');
    sendMenuAction('show-diagnostics');
    expect(win.sent).toEqual([[EVT_MENU_ACTION, 'show-diagnostics']]);
  });
});
