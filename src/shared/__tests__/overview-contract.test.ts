/**
 * The Phase 137 contract: the two overview channels close across the three
 * sets, the menu id folds into the dispatchable union, and the chord stays
 * where the spec put it.
 *
 * The chord story, held down the way focus-chord.test.ts holds ⇧⌘↩. Catch Me
 * Up is on Ctrl+Shift+U. Shift+Cmd+U was REFUSED, because cursor's
 * defaultHotkeyHint is 'u' and the recorder proposes ⇧⌘<letter> chords, so a
 * built-in owning ⇧⌘U would make the suggested cursor hotkey un-recordable.
 * The generalised guard in focus-chord.test.ts would catch that too. This
 * file pins the refusal by name, so the reason survives beside the row.
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

/** The chord Phase 137 took. */
const OVERVIEW_CHORD = 'Ctrl+Shift+U';

/** The chord Phase 137 refused, because cursor's hotkey hint is 'u'. */
const REFUSED_CHORD = 'Shift+Cmd+U';

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

describe('the row Phase 137 added', () => {
  it('claims Ctrl+Shift+U exactly once in the whole keymap', () => {
    const owners = KEYMAP.filter((entry) =>
      entry.keys.some((chord) => chord.accelerator === OVERVIEW_CHORD)
    );
    expect(owners.map((entry) => entry.id)).toEqual(['view.overview']);
  });

  it('stores the chord in canonical form and renders it as a keycap', () => {
    expect(normalizeAccelerator(OVERVIEW_CHORD)).toBe(OVERVIEW_CHORD);
    expect(accelerator('view.overview')).toBe(OVERVIEW_CHORD);
    expect(acceleratorToDisplay(OVERVIEW_CHORD)).toBe('⌃⇧U');
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

describe('the chord Phase 137 refused', () => {
  it('reads the reason out of the registry rather than remembering it', () => {
    const registry = readFileSync(
      join(SRC, 'main', 'agents', 'registry.ts'),
      'utf8'
    );
    expect(registry.includes("defaultHotkeyHint: 'u'")).toBe(true);
  });

  it('leaves Shift+Cmd+U owned by no built-in row', () => {
    const owners = KEYMAP.filter((entry) =>
      entry.keys.some((chord) => chord.accelerator === REFUSED_CHORD)
    );
    expect(owners).toEqual([]);
    expect(RESERVED_APP_CHORDS[REFUSED_CHORD]).toBeUndefined();
  });
});

describe('the two overview channels close', () => {
  const ipcSource = sourceOf('shared', 'ipc');
  const preloadSource = sourceOf('preload');
  const mainSource = sourceOf('main');

  it('declares both channels on OverviewInvokeChannelMap and nothing else', () => {
    const body = /export interface OverviewInvokeChannelMap \{([\s\S]*?)\n\}/.exec(
      ipcSource
    );
    expect(body).not.toBeNull();
    const channels = [...(body?.[1] ?? '').matchAll(/^\s*'([^']+)':/gm)].map(
      (m) => m[1]
    );
    expect(channels.sort()).toEqual(['overview:project', 'overview:sessions']);
  });

  it('joins OverviewInvokeChannelMap into the one intersection', () => {
    const alias = /export type GmuxInvokeChannelMap =([\s\S]*?);/.exec(ipcSource);
    expect(alias?.[1]).toContain('OverviewInvokeChannelMap');
  });

  it('invokes each channel exactly once in the preload', () => {
    expect(count(preloadSource, /\binvoke\('overview:project'/g)).toBe(1);
    expect(count(preloadSource, /\binvoke\('overview:sessions'/g)).toBe(1);
  });

  it('registers each channel exactly once in main', () => {
    const registration = (channel: string): RegExp =>
      new RegExp(
        `\\bhandle\\(\\s*(?:[A-Za-z_$][\\w$]*\\s*,\\s*)?'${channel}'`,
        'g'
      );
    expect(count(mainSource, registration('overview:project'))).toBe(1);
    expect(count(mainSource, registration('overview:sessions'))).toBe(1);
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
