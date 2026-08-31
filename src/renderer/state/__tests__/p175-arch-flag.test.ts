/**
 * PHASE 175 — Architecture is off until a person turns it on, and a hidden
 * icon is not the same thing as a dead entry point.
 *
 * The rail item vanishing is the cheap half. The half that matters is that
 * every OTHER way in is refused while the switch is off, because a person
 * who used the surface before the flag existed has a remembered
 * `sidebarViewByProject` entry saying `arch`, a recorded muscle memory for
 * ⌃⇧A and a View menu whose action ids are queued through the same renderer
 * door. So this file drives the doors themselves rather than the markup:
 *
 *  - `effectiveSidebarView` reads a remembered 'arch' as the default while
 *    the switch is off, and KEEPS the memory for the day it comes back on.
 *  - `showViewAction('arch')`, which is where both the chord and the
 *    `show-arch` menu action land, does nothing at all: no store call, no
 *    focus move, no layout side effect.
 *  - The store's own `setSidebarView` and `showSidebarView` refuse too, so a
 *    caller that never went through `showViewAction` still cannot show it.
 *  - `openArchMap`, the one door the `show-arch-map` row, the Architecture
 *    pane's control and any queued action all pass through, opens nothing.
 *  - `openAimPicker`, which the ⌃⇧P chord and the `arch-aim` menu action both
 *    land on, raises no menu at all. It is a DOOR on to Architecture rather
 *    than a mention of it: it reads the contract and writes a promise into a
 *    session's prompt.
 *
 * And the mirror of each: with the switch ON, every one of them works.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultGmuxSettings } from '@shared/settings';
import {
  SIDEBAR_VIEW_DEFAULT,
  effectiveSidebarView
} from '../sidebar-views';

// ---------------------------------------------------------------------------

const opened: unknown[] = [];
/** Every native menu the aiming verb asked the shell to raise. */
const raised: unknown[] = [];

vi.mock('../open-file', () => ({
  requestOpenFile: (req: unknown) => {
    opened.push(req);
  }
}));

/**
 * Every frame `showViewAction` asked for. It reaches for one only AFTER it
 * has decided to show a view, so a count of zero is a stronger statement
 * than an unchanged store field: the body did not run at all.
 */
const frames: unknown[] = [];
vi.stubGlobal('requestAnimationFrame', (cb: unknown) => {
  frames.push(cb);
  return frames.length;
});

vi.stubGlobal('document', {
  querySelector: () => null,
  activeElement: null,
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useSettingsStore } = await import('../../settings/settings-store');
const { useApp } = await import('../store');
const { showViewAction } = await import('../../app/shell-actions');
const { openArchMap } = await import('../../arch/open-map');
const { openAimPicker } = await import('../../arch/picker');
const { installShellOps } = await import('../shell-ops');

/** Set the Architecture switch without going anywhere near main. */
function archSwitch(on: boolean): void {
  const settings = defaultGmuxSettings();
  useSettingsStore.setState({
    settings: { ...settings, arch: { ...settings.arch, enabled: on } },
    settingsLoaded: true
  });
}

beforeEach(() => {
  opened.length = 0;
  frames.length = 0;
  raised.length = 0;
  installShellOps({
    showNativeMenu: (menu) => {
      raised.push(menu);
    },
    cancelPointerDrag() {},
    focusFleetPrimary() {},
    ensureEditorSubscribed() {}
  });
  useApp.setState({
    activeProjectId: 'p1',
    sidebarViewByProject: {},
    sidebarVisible: true
  });
});

// ---------------------------------------------------------------------------

describe('a remembered arch view while the switch is off', () => {
  it('reads as the default rather than drawing the view', () => {
    expect(effectiveSidebarView('arch', false)).toBe(SIDEBAR_VIEW_DEFAULT);
  });

  it('draws again the moment the switch comes back on', () => {
    expect(effectiveSidebarView('arch', true)).toBe('arch');
  });

  it('leaves every other remembered view exactly as it was', () => {
    for (const view of ['explorer', 'search', 'scm', 'context'] as const) {
      expect(effectiveSidebarView(view, false)).toBe(view);
      expect(effectiveSidebarView(view, true)).toBe(view);
    }
  });

  it('reads an absent memory as the default under either switch', () => {
    expect(effectiveSidebarView(undefined, false)).toBe(SIDEBAR_VIEW_DEFAULT);
    expect(effectiveSidebarView(undefined, true)).toBe(SIDEBAR_VIEW_DEFAULT);
  });
});

describe('the chord and the show-arch menu action, driven while OFF', () => {
  it('open nothing and touch no store field', () => {
    archSwitch(false);
    const before = JSON.stringify(useApp.getState().sidebarViewByProject);
    showViewAction('arch');
    expect(useApp.getState().sidebarViewByProject).toEqual(JSON.parse(before));
    expect(useApp.getState().activeSidebarView()).toBe(SIDEBAR_VIEW_DEFAULT);
    // Not one frame asked for, so the body returned before any of its work.
    expect(frames).toHaveLength(0);
  });

  it('still work for every OTHER view, so the gate is arch and only arch', () => {
    archSwitch(false);
    showViewAction('context');
    expect(useApp.getState().activeSidebarView()).toBe('context');
  });

  it('open the view once the switch is on, in the same session', () => {
    archSwitch(true);
    showViewAction('arch');
    expect(useApp.getState().activeSidebarView()).toBe('arch');
  });
});

describe('the store setters, called directly, past showViewAction', () => {
  it('refuse to make arch the active view while OFF', () => {
    archSwitch(false);
    useApp.getState().setSidebarView('arch');
    expect(useApp.getState().activeSidebarView()).toBe(SIDEBAR_VIEW_DEFAULT);
    useApp.getState().showSidebarView('arch');
    expect(useApp.getState().activeSidebarView()).toBe(SIDEBAR_VIEW_DEFAULT);
  });

  it('read a memory written before the flip as the default', () => {
    archSwitch(true);
    useApp.getState().setSidebarView('arch');
    expect(useApp.getState().activeSidebarView()).toBe('arch');
    // The switch goes off with the memory still on disk, which is exactly
    // what happens to a person who used the view before this phase.
    archSwitch(false);
    expect(useApp.getState().activeSidebarView()).toBe(SIDEBAR_VIEW_DEFAULT);
    // And the memory itself is KEPT, so turning it back on restores the view
    // without anyone re-choosing it.
    archSwitch(true);
    expect(useApp.getState().activeSidebarView()).toBe('arch');
  });
});

describe('the map tab opener', () => {
  it('opens nothing while the switch is off', () => {
    archSwitch(false);
    openArchMap('/repo');
    expect(opened).toHaveLength(0);
  });

  it('opens the map once the switch is on', () => {
    archSwitch(true);
    openArchMap('/repo');
    expect(opened).toHaveLength(1);
  });
});

describe('the aiming verb, the third door', () => {
  it('raises no menu at all while the switch is off', async () => {
    archSwitch(false);
    await openAimPicker();
    expect(raised).toHaveLength(0);
  });

  it('raises its menu once the switch is on', async () => {
    archSwitch(true);
    await openAimPicker();
    // WHICH menu is p64-aim.test.ts's subject. That there IS one is this
    // file's, because the difference between the two runs is the switch and
    // nothing else.
    expect(raised).toHaveLength(1);
  });
});

/**
 * THE COPIES OF ONE ANSWER, held so the probe's finding cannot come back.
 *
 * The remembered sidebar view is resolved in more than one place, and Phase
 * 63 wrote the warning about exactly this when it made the default a
 * constant. Phase 175 shipped a first build that gated two readers and
 * probe-p175-arch-flag caught the third: with the Architecture view active,
 * turning the switch off removed the rail mark and all three menu rows and
 * left the pane on screen, because Sidebar.tsx resolved the stored view for
 * itself. So the resolution lives in one function now.
 *
 * THE FIX ROUND CHANGED HOW THIS IS HELD. The first version of this block
 * was a HAND-WRITTEN list of three paths, which is the same failure mode one
 * level up: a fourth reader added next year is not scanned at all and the
 * test stays green. The set is DERIVED FROM THE TREE now. Every renderer
 * source file that names the remembered map has to resolve it through the
 * gate, so the list cannot go stale, and a new reader either calls the gate
 * or turns this file red on the day it is written.
 *
 * The rule is deliberately strict: naming `sidebarViewByProject` at all puts
 * a file under it, whether it reads the map or writes it. A file that only
 * writes has nothing to resolve and pays one import; a file that reads and
 * pretended to only write is exactly the defect.
 */
describe('every reader of a remembered sidebar view goes through the gate', () => {
  const RENDERER = join(__dirname, '..', '..');
  /** The remembered map itself. Naming it is what puts a file under the rule. */
  const FIELD = 'sidebarViewByProject';

  /** Comments stripped, so this file's own prose is never a reader. */
  const code = (source: string): string =>
    source
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  function* sources(dir: string): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) yield* sources(full);
      else if (/\.tsx?$/.test(entry.name)) yield full;
    }
  }

  /** Every renderer file that names the remembered map, found in the tree. */
  const READERS = [...sources(RENDERER)]
    .filter((file) => code(readFileSync(file, 'utf8')).includes(FIELD))
    .map((file) => relative(RENDERER, file))
    .sort();

  /**
   * The scan is proved before it is trusted. A walk that returned nothing
   * would pass every assertion below it, so the three readers Phase 175
   * gated by hand have to be IN the derived set, and the set has to be the
   * whole of what the tree holds rather than a prefix of it.
   */
  it('finds the readers the probe found, and finds them by walking', () => {
    expect(READERS).toEqual(
      expect.arrayContaining([
        'app/ActivityBar.tsx',
        'app/Sidebar.tsx',
        'state/chrome-slice.ts'
      ])
    );
    // Not a list of three: whatever the tree holds today, all of it is here.
    expect(READERS.length).toBeGreaterThanOrEqual(3);
  });

  /** And the two shape checks are proved to fail, on bytes, not on trust. */
  it('bites on both of the shapes it forbids', () => {
    const gated = "const view = effectiveSidebarView(byProject[id], on);";
    const byHand = "const view = byProject[id] ?? SIDEBAR_VIEW_DEFAULT;";
    expect(gated).toContain('effectiveSidebarView(');
    expect(byHand).not.toContain('effectiveSidebarView(');
    expect(code(byHand)).toMatch(/\?\?[\s\S]{0,60}SIDEBAR_VIEW_DEFAULT/);
    expect(code(gated)).not.toMatch(/\?\?[\s\S]{0,60}SIDEBAR_VIEW_DEFAULT/);
    // A mention in a comment is not a reader, which is what lets this very
    // file's prose name the field without being scanned as one.
    expect(code(`// ${FIELD}\nconst x = 1;`)).not.toContain(FIELD);
  });

  for (const rel of READERS) {
    it(`${rel} resolves it through effectiveSidebarView`, () => {
      const source = readFileSync(join(RENDERER, rel), 'utf8');
      expect(source, `${rel} no longer calls the gate`).toContain(
        'effectiveSidebarView('
      );
    });

    it(`${rel} does not fall back to the default by hand`, () => {
      // The shape the gate replaced. A reader that writes it again has its
      // own answer, which is how the pane stayed on screen.
      expect(
        code(readFileSync(join(RENDERER, rel), 'utf8')),
        `${rel} resolves the stored view itself`
      ).not.toMatch(/\?\?[\s\S]{0,60}SIDEBAR_VIEW_DEFAULT/);
    });
  }
});
