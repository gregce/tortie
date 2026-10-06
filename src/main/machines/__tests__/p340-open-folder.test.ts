/**
 * Phase 340, D13: Open a folder on it… reaches the main window through one new
 * channel, `machines:openFolder`, and starts nothing.
 *
 * Two halves, each red if its clause is taken out:
 *
 *  1. The handler in `../ipc.ts`: a row that is not confirmed, an id with no
 *     row, and a value that is not an id answer false and never reach the menu
 *     helper; a confirmed row reaches it once, with its own id, and answers what
 *     the helper answered. No process is started on either computer.
 *  2. The helper in `../../menu.ts`, the real one: it raises the APP window (the
 *     Settings window, where the press happened, is never a target), sends it
 *     exactly `open-folder-on:<id>` on the menu action channel and nothing else,
 *     and with no app window it sends nothing and answers false.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMain, IpcMainInvokeEvent } from 'electron';

let userData = '';
const MARKER = ' tortie-open-folder ';

/** A window the fake electron hands out, recording what was done to it. */
interface FakeWindow {
  name: string;
  minimized: boolean;
  visible: boolean;
  calls: string[];
  sent: { channel: string; payload: unknown[] }[];
  isDestroyed(): boolean;
  isMinimized(): boolean;
  isVisible(): boolean;
  restore(): void;
  show(): void;
  focus(): void;
  webContents: { isDestroyed(): boolean; send(channel: string, ...payload: unknown[]): void };
}

function fakeWindow(name: string, opts: { minimized?: boolean } = {}): FakeWindow {
  const win: FakeWindow = {
    name,
    minimized: opts.minimized ?? false,
    visible: true,
    calls: [],
    sent: [],
    isDestroyed: () => false,
    isMinimized: () => win.minimized,
    isVisible: () => win.visible,
    restore: () => {
      win.calls.push('restore');
      win.minimized = false;
    },
    show: () => {
      win.calls.push('show');
    },
    focus: () => {
      win.calls.push('focus');
    },
    webContents: {
      isDestroyed: () => false,
      send: (channel: string, ...payload: unknown[]) => {
        win.sent.push({ channel, payload });
      }
    }
  };
  return win;
}

const screen = vi.hoisted(() => ({
  focused: null as unknown,
  all: [] as unknown[],
  settings: null as unknown
}));

vi.mock('electron', () => ({
  app: {
    name: 'Tortie',
    getPath: () => userData,
    isReady: () => true,
    isPackaged: false,
    getVersion: () => '0.0.1',
    on: () => undefined,
    quit: () => undefined
  },
  BrowserWindow: {
    getFocusedWindow: () => screen.focused,
    getAllWindows: () => screen.all
  },
  Menu: {
    buildFromTemplate: () => ({ getMenuItemById: () => null }),
    setApplicationMenu: () => undefined,
    getApplicationMenu: () => null
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

vi.mock('node-pty', () => ({
  spawn: () => {
    throw new Error('Open a folder on it… must start nothing');
  }
}));

// The real menu module reads these at the point of use; the stand-ins keep it
// from reaching the settings file, the icon renderer or the manifest.
vi.mock('../../settings/window', () => ({
  isSettingsWindow: (win: unknown) => win !== null && win === screen.settings,
  openSettingsWindow: () => undefined,
  closeSettingsWindowIfFocused: () => false
}));
vi.mock('../../settings/store', () => ({ getSettings: () => ({ hotkeys: {} }) }));
vi.mock('../../native-menu-icon', () => ({
  nativeMenuGlyph: (name: string) => ({ icon: { name } }),
  menuIcon: () => null
}));
vi.mock('../../manifest/reconstruct-operator', () => ({
  runOperatorReconstruction: () => Promise.resolve()
}));

/** The helper as the registrar sees it: a recorder. The real one is read below. */
const helper = vi.hoisted(() => ({ calls: [] as string[], answer: true }));
vi.mock('../../menu', () => ({
  openFolderOnMachine: (id: string) => {
    helper.calls.push(id);
    return helper.answer;
  }
}));

const { registerMachinesIpc } = await import('../ipc');
const { MACHINE_CONFIRM_ACKNOWLEDGEMENT, confirmMachine, describeMachine } = await import(
  '../confirm'
);
const { loadMachines, machineFieldsOf, machinesPath, resetMachinesStoreForTests } =
  await import('../store');
const { ensureConfigDir } = await import('../../config/paths');
const { machineSshSpawnCount, resetMachineTestForTests } = await import('../connection-test');
const { trustedInvokeEvent } = await import('../../security/__tests__/trusted-test-sender');
const { EVT_MENU_ACTION, OPEN_FOLDER_ON_PREFIX } = await import('@shared/ipc');
const realMenu = await vi.importActual<typeof import('../../menu')>('../../menu');

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, Handler>();
const fakeIpc = {
  handle: (channel: string, fn: Handler) => {
    handlers.set(channel, fn);
  }
} as unknown as IpcMain;

function call<T>(channel: string, ...args: unknown[]): T {
  const fn = handlers.get(channel);
  if (fn === undefined) throw new Error(`${channel} was never registered`);
  return fn(trustedInvokeEvent(), ...args) as T;
}

const STUDIO = {
  id: 'studio',
  label: 'Studio',
  color: 'cyan' as const,
  host: '127.0.0.1',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/local/bin/tmux'
};
const LOOSE = { ...STUDIO, id: 'loose', label: 'Loose' };

function confirm(row: typeof STUDIO): void {
  const sheet = describeMachine(row.id, machineFieldsOf(row));
  confirmMachine(row.id, machineFieldsOf(row), {
    acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
    hashRead: sheet.hash,
    linesRead: [...sheet.lines]
  });
}

// ---------------------------------------------------------------------------
// 1. The handler
// ---------------------------------------------------------------------------

describe('machines:openFolder asks the confirmation before the helper', () => {
  beforeEach(() => {
    userData = mkdtempSync(join(tmpdir(), 'tortie-p340-open-folder-'));
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    helper.calls.length = 0;
    helper.answer = true;
    handlers.clear();
    resetMachinesStoreForTests();
    resetMachineTestForTests();
    registerMachinesIpc(fakeIpc);
    ensureConfigDir();
    writeFileSync(
      machinesPath(),
      JSON.stringify({ schema: 1, machines: [STUDIO, LOOSE] }, null, 2)
    );
    loadMachines('boot');
    confirm(STUDIO);
  });

  afterEach(() => {
    resetMachinesStoreForTests();
    rmSync(userData, { recursive: true, force: true });
  });

  it('a confirmed row reaches the helper once, with its own id', () => {
    expect(call<boolean>('machines:openFolder', 'studio')).toBe(true);
    expect(helper.calls).toEqual(['studio']);
  });

  it('answers what the helper answered', () => {
    helper.answer = false;
    expect(call<boolean>('machines:openFolder', 'studio')).toBe(false);
    expect(helper.calls).toEqual(['studio']);
  });

  it('a row nobody confirmed answers false and never reaches it', () => {
    expect(call<boolean>('machines:openFolder', 'loose')).toBe(false);
    expect(helper.calls).toEqual([]);
  });

  it('a row whose fields changed after the agreement answers false', () => {
    writeFileSync(
      machinesPath(),
      JSON.stringify({ schema: 1, machines: [{ ...STUDIO, port: 2223 }, LOOSE] }, null, 2)
    );
    loadMachines('reload');
    expect(call<boolean>('machines:openFolder', 'studio')).toBe(false);
    expect(helper.calls).toEqual([]);
  });

  it('an id with no row, an empty id and a value that is not an id answer false', () => {
    for (const id of ['nobody', '', null, 7, { id: 'studio' }]) {
      expect(call<boolean>('machines:openFolder', id), JSON.stringify(id)).toBe(false);
    }
    expect(helper.calls).toEqual([]);
  });

  it('starts nothing on either computer', () => {
    call('machines:openFolder', 'studio');
    call('machines:openFolder', 'loose');
    expect(machineSshSpawnCount()).toBe(0);
  });

  it('the handler’s source asks isMachineConfirmed before it names the helper', () => {
    const text = readFileSync(join(__dirname, '..', 'ipc.ts'), 'utf8');
    const at = text.indexOf("'machines:openFolder'");
    const body = text.slice(at, text.indexOf('});', at));
    expect(body.indexOf('isMachineConfirmed(')).toBeGreaterThan(-1);
    expect(body.indexOf('isMachineConfirmed(')).toBeLessThan(
      body.indexOf('openFolderOnMachine(')
    );
  });
});

// ---------------------------------------------------------------------------
// 2. The helper in menu.ts
// ---------------------------------------------------------------------------

describe('openFolderOnMachine raises the app window and sends one action', () => {
  let main: FakeWindow;
  let settings: FakeWindow;

  beforeEach(() => {
    main = fakeWindow('main', { minimized: true });
    settings = fakeWindow('settings');
    // The press happens in Settings, which is the focused window.
    screen.focused = settings;
    screen.all = [settings, main];
    screen.settings = settings;
  });

  it('sends exactly open-folder-on:<id> to the app window, never to Settings', () => {
    expect(realMenu.openFolderOnMachine('studio')).toBe(true);
    expect(main.sent).toEqual([
      { channel: EVT_MENU_ACTION, payload: [`${OPEN_FOLDER_ON_PREFIX}studio`] }
    ]);
    expect(`${OPEN_FOLDER_ON_PREFIX}studio`).toBe('open-folder-on:studio');
    expect(settings.sent).toEqual([]);
  });

  it('raises the app window first: restored, shown and focused', () => {
    realMenu.openFolderOnMachine('studio');
    expect(main.calls).toEqual(['restore', 'show', 'focus']);
    expect(settings.calls).toEqual([]);
  });

  it('a window that is not minimized is not restored', () => {
    main.minimized = false;
    realMenu.openFolderOnMachine('studio');
    expect(main.calls).toEqual(['show', 'focus']);
  });

  it('with no app window it sends nothing and answers false', () => {
    screen.all = [settings];
    expect(realMenu.openFolderOnMachine('studio')).toBe(false);
    expect(settings.sent).toEqual([]);
    expect(settings.calls).toEqual([]);
  });

  it('names nothing that starts a process', () => {
    const text = readFileSync(join(__dirname, '..', '..', 'menu.ts'), 'utf8');
    const at = text.indexOf('export function openFolderOnMachine(');
    const body = text.slice(at, text.indexOf('\n}\n', at));
    expect(body).toContain('sendMenuAction(`${OPEN_FOLDER_ON_PREFIX}${id}`)');
    expect(body).not.toMatch(/spawn|exec|ssh|prepare|startMachine/i);
    expect(body.match(/sendMenuAction\(/g)).toHaveLength(1);
  });
});
