/**
 * The status menu's rows, their marks and their chords (Phase 156).
 *
 * WHY THIS IS A TEMPLATE TEST AND NOT A PHOTOGRAPH. A `Tray`'s menu is an OS
 * owned surface. Phases 119, 152 and 153 each measured that a native macOS menu
 * cannot be read, clicked or photographed from outside the app: System Events
 * answers with two menu bars and zero windows. So the template `trayMenuTemplate`
 * composes is the only place this menu's shape can be read back, which is
 * exactly why Phase 156 extracted it, and it is the same reason
 * `toMenuTemplate` was extracted from the popup handler in Phase 39.
 *
 * The mark decoder is faked, so this suite needs no Electron and no PNG. Which
 * bitmap a name resolves to is build/assert-menu-glyphs.mjs's job, and it
 * proves all 59 are present, decodable and distinct. This suite's job is which
 * row wears which name and which chord.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, Session } from '@shared/types';
import { accelerator } from '@shared/keymap';

interface FakeItem {
  label?: string;
  type?: string;
  enabled?: boolean;
  accelerator?: string;
  icon?: unknown;
  click?: () => void;
}

vi.mock('electron', () => ({
  app: { name: 'Tortie' },
  Menu: { buildFromTemplate: (t: FakeItem[]) => t },
  Tray: class {},
  nativeImage: { createFromPath: () => ({ isEmpty: () => true }) }
}));

vi.mock('../../menu', () => ({
  requestQuit: () => undefined,
  sendMenuAction: () => true
}));

vi.mock('../../sessions', () => ({ getGmuxCore: () => Promise.resolve({}) }));

// The same shape the real `nativeMenuGlyph` answers, so a row carries an icon
// key exactly when the real one would, and a bare row stays bare.
vi.mock('../../native-menu-icon', () => ({
  nativeMenuGlyph: (name: string) => ({ icon: { name } }),
  menuIcon: () => null
}));

const { trayMenuTemplate } = await import('../index');

function markOf(rows: FakeItem[], label: string): string | null {
  const row = rows.find((it) => it.label === label);
  if (row === undefined) throw new Error(`no row labelled ${label}`);
  return (row.icon as { name?: string } | undefined)?.name ?? null;
}

const projects: Project[] = [{ id: 'p1', path: '/repos/tortie', name: 'tortie' }];

const blocked: Session = {
  id: 's1',
  name: 'writer',
  tmuxName: 'writer',
  projectPath: '/repos/tortie',
  cwd: '/repos/tortie',
  agent: 'claude',
  status: 'needs_input',
  createdAt: 1_000
};

describe('the tray menu wears the same marks and names the same keys', () => {
  let rows: FakeItem[];

  beforeEach(() => {
    rows = trayMenuTemplate([], [], new Map()) as FakeItem[];
  });

  it('marks Show Tortie with the chosen window glyph', () => {
    expect(markOf(rows, 'Show Tortie')).toBe('window');
  });

  it('marks New Session with the + the ⌘T menu row wears', () => {
    expect(markOf(rows, 'New Session')).toBe('add');
  });

  it('leaves Quit bare, the same argued refusal the app menu carries', () => {
    expect(markOf(rows, 'Quit Tortie')).toBeNull();
  });

  it('names both chords from the ONE keymap, never as a typed literal', () => {
    const newSession = rows.find((it) => it.label === 'New Session');
    const quit = rows.find((it) => it.label === 'Quit Tortie');
    expect(newSession?.accelerator).toBe(accelerator('session.new'));
    expect(quit?.accelerator).toBe(accelerator('app.quit'));
  });

  it('adds NO chord that the application menu does not already register', () => {
    // This is the phase's whole safety argument for these two rows, pinned so
    // a later round cannot quietly add a third. ⌘T and ⌘Q are registered by
    // src/main/menu.ts already, so nothing here can take a key from a pane
    // that was not already taken.
    const chords = rows
      .map((it) => it.accelerator)
      .filter((c): c is string => typeof c === 'string');
    expect(chords.sort()).toEqual(
      [accelerator('session.new'), accelerator('app.quit')].sort()
    );
  });

  it('leaves the empty header a bare disabled header', () => {
    const header = rows[0];
    expect(header?.label).toBe('Nothing needs you');
    expect(header?.enabled).toBe(false);
    expect(header?.icon).toBeUndefined();
  });

  it('leaves the blocked header and every blocked row bare', () => {
    const withRows = trayMenuTemplate(
      [blocked],
      projects,
      new Map([['s1', 1_000]])
    ) as FakeItem[];
    expect(withRows[0]?.label).toBe('Needs your input');
    expect(withRows[0]?.icon).toBeUndefined();
    // The mark a session row wears in the app is its agent's, and main holds
    // no raster for agent art, which is SVG rather than a font glyph.
    expect(withRows[1]?.icon).toBeUndefined();
    expect(withRows[1]?.label).toContain('writer');
  });
});
