/**
 * The About panel keeps the credit two other files promise (Phase 134).
 *
 * This test exists because the credit in the About panel is a licence
 * obligation rather than a courtesy, and because two files in the tree assert
 * it as a fact about the shipped app. NOTICE says that the codicon credit
 * "appears in the application's About panel", and src/renderer/icons/Codicon.tsx
 * says to keep the credit line for "codicons by Microsoft (CC BY 4.0)" in the
 * app's About or credits. Before this phase the panel said "By gregce" and
 * named no icon set, so both files were false. A later edit that drops the
 * credit again has to fail a test rather than pass quietly, and that is what
 * the assertions below are for.
 *
 * Same fake-electron pattern as view-menu.test.ts, with one change: the fake
 * app records what setAboutPanelOptions was given instead of discarding it, so
 * the shipped string can be read without changing any production code.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface AboutPanelOptions {
  applicationName?: string;
  applicationVersion?: string;
  version?: string;
  copyright?: string;
}

const state: {
  about: AboutPanelOptions | null;
  applicationMenu: unknown;
} = {
  about: null,
  applicationMenu: null
};

vi.mock('electron', () => ({
  app: {
    name: 'Tortie',
    isPackaged: true,
    getPath: () => join(tmpdir(), 'gmux-p134-about-test'),
    getVersion: () => '0.0.1',
    setAboutPanelOptions: (options: AboutPanelOptions) => {
      state.about = options;
    },
    on: () => undefined,
    quit: () => undefined
  },
  BrowserWindow: {
    getFocusedWindow: () => null,
    getAllWindows: () => []
  },
  Menu: {
    buildFromTemplate: (template: unknown) => ({
      template,
      getMenuItemById: () => null
    }),
    setApplicationMenu: (menu: unknown) => {
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

const { installAppMenu } = await import('../menu');

/** The three lines the panel draws under the version, in order. */
function copyrightLines(): string[] {
  installAppMenu();
  const copyright = state.about?.copyright;
  if (typeof copyright !== 'string') throw new Error('no copyright string');
  return copyright.split('\n');
}

/** The whole copyright string, as one piece of text. */
function copyrightText(): string {
  installAppMenu();
  const copyright = state.about?.copyright;
  if (typeof copyright !== 'string') throw new Error('no copyright string');
  return copyright;
}

beforeEach(() => {
  state.about = null;
  state.applicationMenu = null;
});

describe('the About panel copyright field, Phase 134', () => {
  it('holds exactly three lines', () => {
    expect(copyrightLines()).toHaveLength(3);
  });

  it('names the company on the first line, spelled the one way', () => {
    expect(copyrightLines()[0]).toBe(
      '© 2026 Ita Vero, LLC. All rights reserved.'
    );
  });

  it('names the source on the second line', () => {
    expect(copyrightLines()[1]).toBe('Source: github.com/gregce/tortie');
  });

  it('carries the codicon credit word for word, as Codicon.tsx asks', () => {
    const third = copyrightLines()[2] ?? '';
    expect(third.startsWith('Icons: ')).toBe(true);
    expect(third).toContain('codicons by Microsoft (CC BY 4.0)');
  });

  it('credits Material Icon Theme and names its licence', () => {
    const third = copyrightLines()[2] ?? '';
    expect(third).toContain('Material Icon Theme');
    expect(third).toContain('MIT');
  });

  it('uses no em dash and no en dash, per the writing rules', () => {
    const text = copyrightText();
    expect(text).not.toContain('—');
    expect(text).not.toContain('–');
  });

  it('no longer spells the company Itavero', () => {
    expect(copyrightText()).not.toContain('Itavero');
  });
});
