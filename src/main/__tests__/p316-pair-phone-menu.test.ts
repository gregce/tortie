/**
 * Phase 316.1. Tortie → Pair a Phone…, and the About panel's credit for the
 * vendored QR encoder.
 *
 * What these tests hold, each one red if its clause is taken out of menu.ts:
 *
 * - The row exists, spelled `Pair a Phone…` with the ellipsis character, in the
 *   application menu, DIRECTLY under `Settings…` (his answer to the SPEC's
 *   section 6 decision 5, "beside Settings…").
 * - Pressing it opens the Settings window AT the Phone section, which is the
 *   `'phone'` argument. A row that opened Settings on General would pass a test
 *   that only counted calls, so the argument is asserted.
 * - It carries no accelerator and no mark, both argued in menu.ts.
 * - The About panel's fourth line credits Project Nayuki's library and names
 *   MIT, and NOTICE carries the licence text in full, because the minified
 *   bundle is not bound to keep the vendored file's own header.
 *
 * Same fake-electron pattern as view-menu.test.ts, with a recorder on
 * `openSettingsWindow` and on `setAboutPanelOptions`.
 */

import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeItem {
  label?: string;
  role?: string;
  type?: string;
  accelerator?: string;
  icon?: unknown;
  click?: () => void;
  submenu?: FakeItem[];
}

const state: {
  applicationMenu: { template: FakeItem[] } | null;
  opened: unknown[][];
  copyright: string | null;
} = {
  applicationMenu: null,
  opened: [],
  copyright: null
};

vi.mock('electron', () => ({
  app: {
    name: 'Tortie',
    isPackaged: true,
    getPath: () => join(tmpdir(), 'gmux-p316-menu-test'),
    getVersion: () => '0.0.1',
    setAboutPanelOptions: (options: { copyright?: string }) => {
      state.copyright = options.copyright ?? null;
    },
    on: () => undefined,
    quit: () => undefined
  },
  BrowserWindow: {
    getFocusedWindow: () => null,
    getAllWindows: () => []
  },
  Menu: {
    buildFromTemplate: (template: FakeItem[]) => ({
      template,
      getMenuItemById: () => null
    }),
    setApplicationMenu: (menu: { template: FakeItem[] } | null) => {
      state.applicationMenu = menu;
    },
    getApplicationMenu: () => state.applicationMenu
  }
}));

vi.mock('../settings/window', () => ({
  isSettingsWindow: () => false,
  openSettingsWindow: (...args: unknown[]) => {
    state.opened.push(args);
  },
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

const { installAppMenu } = await import('../menu');

function appMenu(): FakeItem[] {
  const tortie = state.applicationMenu?.template.find((it) => it.label === 'Tortie');
  if (!Array.isArray(tortie?.submenu)) throw new Error('no Tortie submenu');
  return tortie.submenu;
}

function row(label: string): FakeItem {
  const found = appMenu().find((it) => it.label === label);
  if (found === undefined) throw new Error(`no row ${label}`);
  return found;
}

beforeEach(() => {
  state.applicationMenu = null;
  state.opened = [];
  state.copyright = null;
  installAppMenu();
});

describe('Tortie → Pair a Phone…, Phase 316.1', () => {
  it('is spelled with the ellipsis character, once', () => {
    const labels = appMenu().map((it) => it.label);
    expect(labels.filter((l) => l === 'Pair a Phone…')).toHaveLength(1);
    expect(labels).not.toContain('Pair a Phone...');
  });

  it('sits directly under Settings…', () => {
    const labels = appMenu().map((it) => it.label ?? it.type ?? it.role);
    const settings = labels.indexOf('Settings…');
    expect(settings).toBeGreaterThanOrEqual(0);
    expect(labels[settings + 1]).toBe('Pair a Phone…');
  });

  it('opens the Settings window at the Phone section', () => {
    row('Pair a Phone…').click?.();
    expect(state.opened).toEqual([['phone']]);
  });

  it('leaves Settings… opening where it always did', () => {
    row('Settings…').click?.();
    expect(state.opened).toEqual([[]]);
  });

  it('carries no accelerator and no mark, as argued in menu.ts', () => {
    const pair = row('Pair a Phone…');
    expect(pair.accelerator).toBeUndefined();
    expect(pair.icon).toBeUndefined();
  });
});

describe('the About panel credits the vendored QR encoder, Phase 316.1', () => {
  it('names Project Nayuki’s library and its licence on the fourth line', () => {
    const lines = (state.copyright ?? '').split('\n');
    expect(lines[3]).toBe('QR codes: QR Code generator library by Project Nayuki (MIT).');
  });

  it('leaves the three Phase 134 lines where they were', () => {
    const lines = (state.copyright ?? '').split('\n');
    expect(lines[0]).toBe('© 2026 Ita Vero, LLC. All rights reserved.');
    expect(lines[1]).toBe('Source: github.com/gregce/tortie');
    expect(lines[2]?.startsWith('Icons: ')).toBe(true);
  });

  it('NOTICE carries the library’s copyright line and the MIT permission notice', () => {
    const notice = readFileSync(resolve(__dirname, '..', '..', '..', 'NOTICE'), 'utf8');
    const start = notice.indexOf('Copyright (c) Project Nayuki. (MIT License)');
    expect(start, 'NOTICE has no entry for the QR encoder').toBeGreaterThanOrEqual(0);
    // The entry is the text between its copyright line and the next rule, so a
    // permission notice another entry carries cannot stand in for this one.
    const rule = notice.indexOf('\n----', start);
    const entry = notice.slice(start, rule === -1 ? undefined : rule);
    expect(entry).toMatch(/Permission is hereby granted, free of charge/);
    expect(entry).toMatch(
      /The above copyright notice and this permission notice shall be included in\s+all copies or substantial portions of the Software/
    );
    expect(notice).toContain('src/renderer/settings/phone/qrcodegen.ts');
  });
});
