/**
 * The Phase 137 contract, re-pinned by Phase 137.1: the two overview
 * channels close across the three sets, the menu id folds into the
 * dispatchable union, and the chord stays where the operator put it.
 *
 * The chord story, held down the way focus-chord.test.ts holds ⇧⌘↩. Catch
 * Me Up is on Shift+Cmd+U. Phase 137 refused that chord because cursor's
 * defaultHotkeyHint was 'u', and the recorder proposes ⇧⌘<letter> chords,
 * so a built-in owning ⇧⌘U would have made the suggested cursor hotkey
 * un-recordable. Phase 137.1 moved the hint to 's' and took the chord,
 * because the collision was Tortie's own registry row rather than anything
 * a person owns. Ctrl+Shift+U is retired and owned by nothing.
 *
 * THE PRECEDENCE, proved rather than asserted. A person could record ⇧⌘U as
 * a per-agent hotkey before this phase reserved it, and the recorded chord
 * must keep winning. Which way the machinery falls, measured from the
 * source this file scans:
 *
 *  1. The renderer keydown map runs FIRST and its preventDefault suppresses
 *     every native accelerator (the measured order at the top of
 *     src/renderer/app/keyboard.ts). So without a yield, the BUILT-IN would
 *     win. The ⇧⌘U branch therefore asks overviewChordYields() before
 *     touching the event, and does nothing when a recorded hotkey owns the
 *     chord.
 *  2. With the renderer silent, Electron walks the menu template in order
 *     for the accelerator. The Session menu holds the recorded per-agent
 *     items and precedes the View menu's Catch Me Up row, so the first
 *     match is the person's item, and the built-in yields.
 *
 * The channel checks scan source text the way ipc-invoke-closure.test.ts
 * does, scoped to the two `overview:*` channels, so a failure here names this
 * phase rather than pointing at a set difference of the whole bridge.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AnyMenuActionWithProjects } from '../ipc';
import {
  KEYMAP,
  RESERVED_APP_CHORDS,
  accelerator,
  acceleratorToDisplay,
  keymapEntry,
  normalizeAccelerator
} from '../keymap';
import { SRC, sourceFiles, stripComments } from './source-scan';
import { recordedOverviewChordOwner } from '../../renderer/overview/overview-chord';

/** The chord Phase 137.1 took, the one the operator's hands expect. */
const OVERVIEW_CHORD = 'Shift+Cmd+U';

/** The chord Phase 137 used, retired by Phase 137.1 and owned by nothing. */
const RETIRED_CHORD = 'Ctrl+Shift+U';

/**
 * The menu action the row carries, proved dispatchable by the compiler. If
 * OverviewMenuActionId ever falls out of the fold, this line fails typecheck.
 */
const OVERVIEW_MENU_ACTION =
  'show-overview' satisfies AnyMenuActionWithProjects;

/** Every production source under `SRC/<dir>`, comments blanked, joined. */
function sourceOf(...dir: string[]): string {
  return sourceFiles(join(SRC, ...dir))
    .map((file) => stripComments(readFileSync(file, 'utf8')))
    .join('\n');
}

/** How many times `re` matches in `text`. */
function count(text: string, re: RegExp): number {
  return [...text.matchAll(re)].length;
}

describe('the row Phase 137 added, on the chord Phase 137.1 moved it to', () => {
  it('claims Shift+Cmd+U exactly once in the whole keymap', () => {
    const owners = KEYMAP.filter((entry) =>
      entry.keys.some((chord) => chord.accelerator === OVERVIEW_CHORD)
    );
    expect(owners.map((entry) => entry.id)).toEqual(['view.overview']);
  });

  it('stores the chord in canonical form and renders it as a keycap', () => {
    expect(normalizeAccelerator(OVERVIEW_CHORD)).toBe(OVERVIEW_CHORD);
    expect(accelerator('view.overview')).toBe(OVERVIEW_CHORD);
    expect(acceleratorToDisplay(OVERVIEW_CHORD)).toBe('⇧⌘U');
  });

  it('reserves the chord under the row’s own action name', () => {
    expect(RESERVED_APP_CHORDS[OVERVIEW_CHORD]).toBe('Catch me up');
    expect(keymapEntry('view.overview').action).toBe('Catch me up');
  });

  it('carries the menu action the native View row sends', () => {
    expect(keymapEntry('view.overview').menuAction).toBe(OVERVIEW_MENU_ACTION);
  });

  it('sits in the views group and applies anywhere', () => {
    const entry = keymapEntry('view.overview');
    expect(entry.group).toBe('views');
    expect(entry.scope).toBe('app');
    expect(entry.assignable).toBe(false);
    expect(entry.source).toBe('built-in');
  });

  it('does not collide with the chords macOS itself owns', () => {
    const chords = readFileSync(
      join(SRC, 'renderer', 'settings', 'chords.ts'),
      'utf8'
    );
    const start = chords.indexOf('export const RESERVED_MACOS_CHORDS');
    expect(start).toBeGreaterThan(-1);
    const body = chords.slice(start, chords.indexOf('\n};', start));
    expect(body.includes(`'${OVERVIEW_CHORD}'`)).toBe(false);
  });
});

describe('what Phase 137.1 moved to make the chord takeable', () => {
  it('moved cursor\u2019s suggested letter off u and onto s', () => {
    const registry = readFileSync(
      join(SRC, 'main', 'agents', 'registry.ts'),
      'utf8'
    );
    expect(registry.includes("defaultHotkeyHint: 'u'")).toBe(false);
    expect(registry.includes("defaultHotkeyHint: 's'")).toBe(true);
  });

  it('moved the Settings recorder\u2019s hint letter with the registry', () => {
    const settings = readFileSync(
      join(SRC, 'renderer', 'settings', 'KeyboardSection.tsx'),
      'utf8'
    );
    expect(/^\s*cursor:\s*'S',?$/m.test(settings)).toBe(true);
    expect(/^\s*cursor:\s*'U',?$/m.test(settings)).toBe(false);
  });

  it('keeps the new suggestion recordable: no built-in owns Shift+Cmd+S', () => {
    expect(RESERVED_APP_CHORDS['Shift+Cmd+S']).toBeUndefined();
  });

  it('retires Ctrl+Shift+U: no row and no keydown branch carries it', () => {
    const owners = KEYMAP.filter((entry) =>
      entry.keys.some((chord) => chord.accelerator === RETIRED_CHORD)
    );
    expect(owners).toEqual([]);
    expect(RESERVED_APP_CHORDS[RETIRED_CHORD]).toBeUndefined();
    // The keyboard map's old ctrl+shift branch is gone: no ctrlKey branch
    // matches the letter u anywhere in the ladder.
    const keyboard = stripComments(
      readFileSync(join(SRC, 'renderer', 'app', 'keyboard.ts'), 'utf8')
    );
    const ctrlBranches = [
      ...keyboard.matchAll(/e\.ctrlKey[\s\S]{0,200}?toLowerCase\(\) === '([a-z])'/g)
    ].map((m) => m[1]);
    expect(ctrlBranches).not.toContain('u');
  });
});

describe('a recorded \u21e7\u2318U per-agent hotkey still wins (Phase 137.1)', () => {
  // The pure half: the function the keyboard branch asks.
  it('names the agent whose recorded hotkey is the overview chord', () => {
    expect(recordedOverviewChordOwner({ cursor: 'Shift+Cmd+U' })).toBe('cursor');
    expect(recordedOverviewChordOwner({ claude: 'Shift+Cmd+C' })).toBeNull();
    expect(recordedOverviewChordOwner({})).toBeNull();
    // A stored variant spelling still matches through normalization.
    expect(recordedOverviewChordOwner({ codex: 'Cmd+Shift+U' })).toBe('codex');
  });

  // The renderer half: the branch yields BEFORE preventDefault, so the
  // native accelerator is not suppressed when the person owns the chord.
  it('makes the keydown branch ask the yield before touching the event', () => {
    const keyboard = stripComments(
      readFileSync(join(SRC, 'renderer', 'app', 'keyboard.ts'), 'utf8')
    );
    const branch = /toLowerCase\(\) === 'u'\)\s*\{\s*if \(overviewChordYields\(\)\) return;\s*e\.preventDefault\(\);/;
    expect(branch.test(keyboard)).toBe(true);
  });

  // The menu half: with the renderer silent, Electron takes the FIRST menu
  // item wearing the accelerator in template order. The Session menu holds
  // the recorded items and must precede the View menu's Catch Me Up row.
  it('puts the recorded items ahead of Catch Me Up in the menu template', () => {
    const menu = stripComments(
      readFileSync(join(SRC, 'main', 'menu.ts'), 'utf8')
    );
    const recordedItems = menu.indexOf('...agentHotkeyItems()');
    const catchMeUp = menu.indexOf("item('Catch Me Up', 'show-overview'");
    expect(recordedItems).toBeGreaterThan(-1);
    expect(catchMeUp).toBeGreaterThan(-1);
    expect(recordedItems).toBeLessThan(catchMeUp);
  });
});

describe('the overview channels close', () => {
  const ipcSource = sourceOf('shared', 'ipc');
  const preloadSource = sourceOf('preload');
  const mainSource = sourceOf('main');

  // Phase 138 added the third. It is the fold's option list, and it belongs
  // on this map because Settings reads it through the same overview object.
  // It reads a table main already holds, so it starts nothing. Phase 143 added
  // the last two. They are the summary chain for one session and the turns
  // behind one row of it, and both only read.
  it('declares the five channels on OverviewInvokeChannelMap and nothing else', () => {
    const body = /export interface OverviewInvokeChannelMap \{([\s\S]*?)\n\}/.exec(
      ipcSource
    );
    expect(body).not.toBeNull();
    const channels = [...(body?.[1] ?? '').matchAll(/^\s*'([^']+)':/gm)].map(
      (m) => m[1]
    );
    expect(channels.sort()).toEqual([
      'fold:options',
      'overview:project',
      'overview:sessions',
      'overview:timeline',
      'overview:timelineTurns'
    ]);
  });

  it('joins OverviewInvokeChannelMap into the one intersection', () => {
    const alias = /export type GmuxInvokeChannelMap =([\s\S]*?);/.exec(ipcSource);
    expect(alias?.[1]).toContain('OverviewInvokeChannelMap');
  });

  it('invokes each channel exactly once in the preload', () => {
    expect(count(preloadSource, /\binvoke\('overview:project'/g)).toBe(1);
    expect(count(preloadSource, /\binvoke\('overview:sessions'/g)).toBe(1);
    expect(count(preloadSource, /\binvoke\('fold:options'/g)).toBe(1);
    expect(count(preloadSource, /\binvoke\('overview:timeline'/g)).toBe(1);
    expect(count(preloadSource, /\binvoke\('overview:timelineTurns'/g)).toBe(1);
  });

  it('registers each channel exactly once in main', () => {
    const registration = (channel: string): RegExp =>
      new RegExp(
        `\\bhandle\\(\\s*(?:[A-Za-z_$][\\w$]*\\s*,\\s*)?'${channel}'`,
        'g'
      );
    expect(count(mainSource, registration('overview:project'))).toBe(1);
    expect(count(mainSource, registration('overview:sessions'))).toBe(1);
    expect(count(mainSource, registration('fold:options'))).toBe(1);
    expect(count(mainSource, registration('overview:timeline'))).toBe(1);
    expect(count(mainSource, registration('overview:timelineTurns'))).toBe(1);
  });

  it('gives the View menu one Catch Me Up row wearing the keymap chord', () => {
    const menu = stripComments(
      readFileSync(join(SRC, 'main', 'menu.ts'), 'utf8')
    );
    const rows = [
      ...menu.matchAll(/item\('Catch Me Up', 'show-overview', accel\('view\.overview'\)\)/g)
    ];
    expect(rows).toHaveLength(1);
  });
});
