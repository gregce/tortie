/**
 * Phase 340's fix round, from a verifier's measurement (the same at the
 * parent): File > Open Folder on a Machine… follows the confirmations, not
 * only `machines.json`.
 *
 * The verifier read the live menu, through main, after Add: the row stayed off
 * at 0, 3 and 10 s at both builds and came on only after a relaunch. Add writes
 * the row first, which rebuilt the menu while the row was unconfirmed, and
 * records the agreement after it, which rebuilt nothing. The menu now rebuilds
 * on a confirmation recorded or withdrawn, through the listener `confirm.ts`
 * already had for the window.
 *
 * Driven here with the REAL menu, the real machines store and the real confirm
 * record over a fake electron (the view-menu suite's shape) and a scratch data
 * folder; nothing is started and no file of the person's is read.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

interface FakeItem {
  id?: string;
  label?: string;
  enabled?: boolean;
  submenu?: FakeItem[];
  [key: string]: unknown;
}

class FakeMenu {
  constructor(readonly template: FakeItem[]) {}
  getMenuItemById(): FakeItem | null {
    return null;
  }
}

const state = vi.hoisted(() => ({
  applicationMenu: null as { template: FakeItem[] } | null,
  builds: 0,
  userData: ''
}));
const MARKER = ' tortie-menu-confirm ';

vi.mock('electron', () => ({
  app: {
    name: 'Tortie',
    isPackaged: false,
    getPath: () => state.userData,
    isReady: () => true,
    getVersion: () => '0.0.1',
    setAboutPanelOptions: () => undefined,
    on: () => undefined,
    quit: () => undefined
  },
  BrowserWindow: {
    getFocusedWindow: () => null,
    getAllWindows: () => []
  },
  Menu: {
    buildFromTemplate: (template: FakeItem[]) => new FakeMenu(template),
    setApplicationMenu: (menu: { template: FakeItem[] } | null) => {
      state.builds += 1;
      state.applicationMenu = menu;
    },
    getApplicationMenu: () => state.applicationMenu
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

state.userData = mkdtempSync(join(tmpdir(), 'tortie-p340-menu-confirm-'));
mkdirSync(join(state.userData, 'gmux'), { recursive: true });

const { installAppMenu } = await import('../menu');
const { MACHINE_CONFIRM_ACKNOWLEDGEMENT, confirmMachine, describeMachine, forgetMachine } =
  await import('../machines/confirm');
const { loadMachines, machineFieldsOf, machinesPath, resetMachinesStoreForTests } =
  await import('../machines/store');
const { ensureConfigDir } = await import('../config/paths');

const STUDIO = {
  id: 'studio',
  label: 'Studio',
  color: 'cyan' as const,
  host: '127.0.0.1',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/local/bin/tmux'
};

/** The File menu's Open Folder on a Machine… row in the menu as it stands. */
function remoteFolderRow(): FakeItem | undefined {
  const file = state.applicationMenu?.template.find((it) => it.label === 'File');
  return (file?.submenu ?? []).find((it) => it.label === 'Open Folder on a Machine…');
}

describe('File > Open Folder on a Machine… follows the confirmations (the fix round)', () => {
  beforeAll(() => {
    ensureConfigDir();
    writeFileSync(machinesPath(), JSON.stringify({ schema: 1, machines: [STUDIO] }, null, 2));
    loadMachines('boot');
    installAppMenu();
  });

  afterAll(() => {
    resetMachinesStoreForTests();
    rmSync(state.userData, { recursive: true, force: true });
  });

  it('is off while the one machine is unconfirmed', () => {
    expect(remoteFolderRow()).toBeDefined();
    expect(remoteFolderRow()?.enabled).toBe(false);
  });

  it('comes on the moment the agreement is recorded, with no file change and no relaunch', () => {
    const before = state.builds;
    const sheet = describeMachine(STUDIO.id, machineFieldsOf(STUDIO));
    confirmMachine(STUDIO.id, machineFieldsOf(STUDIO), {
      acknowledgement: MACHINE_CONFIRM_ACKNOWLEDGEMENT,
      hashRead: sheet.hash,
      linesRead: [...sheet.lines]
    });
    expect(state.builds).toBeGreaterThan(before);
    expect(remoteFolderRow()?.enabled).toBe(true);
  });

  it('goes off again when the agreement is withdrawn', () => {
    const before = state.builds;
    forgetMachine(STUDIO.id);
    expect(state.builds).toBeGreaterThan(before);
    expect(remoteFolderRow()?.enabled).toBe(false);
  });
});
