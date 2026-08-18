/**
 * The chord Phase 80.1 took, and the chord it deliberately did not take.
 *
 * Session focus is on Shift+Cmd+Enter. The Phase 80.1 backlog entry said the
 * research had found Shift+Cmd+C free. It had not. The research says the
 * opposite in its section 8, DESIGN.md section 4 uses Shift+Cmd+C as the
 * worked example of a per-agent hotkey a person records for themselves, and
 * Claude Code's registry row suggests the letter C for exactly that. Taking
 * it would have derived a RESERVED_APP_CHORDS row from the keymap, and the
 * recorder would then have refused the documented example.
 *
 * So this file has two jobs. It pins the row Phase 80.1 added, and it stands
 * guard over the chord Phase 80.1 refused, so a later round cannot quietly
 * take it back.
 *
 * TWO CHECKS READ SOURCE TEXT RATHER THAN IMPORTING. `validateChord` lives in
 * src/renderer/settings/chords.ts and the agent registry lives in
 * src/main/agents/registry.ts. tsconfig.shared.json sets `rootDir` to
 * src/shared, so a file in this directory cannot import either one without
 * failing `tsc -b`. The house pattern for a shared test that has to know
 * about another layer is a source scan, which is what openable-drift.test.ts
 * and keymap-single-source.test.ts already do, so that is what these use.
 * The one thing a source scan cannot do is call the function, and
 * `validateChord` is called directly in
 * src/renderer/settings/__tests__/chords.test.ts.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  KEYMAP,
  RESERVED_APP_CHORDS,
  accelerator,
  acceleratorToDisplay,
  keymapEntry,
  normalizeAccelerator
} from '../keymap';
import type { AnyMenuActionWithProjects } from '../ipc';
import { SRC } from './source-scan';

/** The chord Phase 80.1 took. */
const FOCUS_CHORD = 'Shift+Cmd+Enter';

/** The chord Phase 80.1 refused, and the reason this file exists. */
const WORKED_EXAMPLE = 'Shift+Cmd+C';

/**
 * The menu action the row carries. Written as a `satisfies` so the compiler,
 * not the runtime, proves the id is one the native menu can send. If
 * ChromeMenuActionId ever loses the member, this line fails typecheck.
 */
const FOCUS_MENU_ACTION =
  'toggle-session-focus' satisfies AnyMenuActionWithProjects;

/** Every key of an object literal that runs one key per line. */
function literalKeys(text: string, declaration: string): string[] {
  const start = text.indexOf(declaration);
  expect(
    start,
    `${declaration} is gone from the file this test scans`
  ).toBeGreaterThan(-1);
  const end = text.indexOf('\n};', start);
  expect(end, `${declaration} has no closing brace`).toBeGreaterThan(start);
  const body = text.slice(start, end);
  return [...body.matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1] ?? '');
}

/** The chords macOS itself owns, read from the renderer's own table. */
function macosReservedChords(): Set<string> {
  const text = readFileSync(
    join(SRC, 'renderer', 'settings', 'chords.ts'),
    'utf8'
  );
  const keys = literalKeys(text, 'export const RESERVED_MACOS_CHORDS');
  expect(
    keys.length,
    'the macOS reserved table came back empty'
  ).toBeGreaterThan(5);
  return new Set(keys);
}

/**
 * Every mnemonic letter the product suggests for a per-agent hotkey. Two
 * tables hold them and both are read, because a person can meet either one.
 * The registry's `defaultHotkeyHint` is the authority. The Settings screen's
 * own HINT_LETTER map is what the person actually sees in the recorder.
 */
function suggestedHotkeyLetters(): Set<string> {
  const registry = readFileSync(
    join(SRC, 'main', 'agents', 'registry.ts'),
    'utf8'
  );
  const fromRegistry = [
    ...registry.matchAll(/defaultHotkeyHint:\s*'([^']+)'/g)
  ].map((m) => (m[1] ?? '').toUpperCase());
  expect(
    fromRegistry.length,
    'no defaultHotkeyHint rows found in the agent registry'
  ).toBeGreaterThan(5);

  const settings = readFileSync(
    join(SRC, 'renderer', 'settings', 'KeyboardSection.tsx'),
    'utf8'
  );
  const fromSettings = [
    ...settings.matchAll(/^\s*[a-z]+:\s*'([A-Z])',?$/gm)
  ].map((m) => m[1] ?? '');
  expect(
    fromSettings.length,
    'no HINT_LETTER rows found in the Settings keyboard section'
  ).toBeGreaterThan(5);

  return new Set([...fromRegistry, ...fromSettings]);
}

describe('the row Phase 80.1 added', () => {
  it('claims Shift+Cmd+Enter exactly once in the whole keymap', () => {
    const owners = KEYMAP.filter((entry) =>
      entry.keys.some((chord) => chord.accelerator === FOCUS_CHORD)
    );
    expect(owners.map((entry) => entry.id)).toEqual(['view.sessionFocus']);
  });

  it('stores that chord in canonical form and renders it as a keycap', () => {
    expect(normalizeAccelerator(FOCUS_CHORD)).toBe(FOCUS_CHORD);
    expect(accelerator('view.sessionFocus')).toBe(FOCUS_CHORD);
    expect(acceleratorToDisplay(FOCUS_CHORD)).toBe('⇧⌘↩');
  });

  it('reserves the chord under the row’s own action name', () => {
    expect(RESERVED_APP_CHORDS[FOCUS_CHORD]).toBe('Focus the session');
    expect(keymapEntry('view.sessionFocus').action).toBe('Focus the session');
  });

  it('carries the menu action the native View row sends', () => {
    expect(keymapEntry('view.sessionFocus').menuAction).toBe(FOCUS_MENU_ACTION);
  });

  it('sits in the views group and applies anywhere', () => {
    const entry = keymapEntry('view.sessionFocus');
    expect(entry.group).toBe('views');
    expect(entry.scope).toBe('app');
    expect(entry.assignable).toBe(false);
    expect(entry.source).toBe('built-in');
  });
});

describe('the chord Phase 80.1 refused', () => {
  it('leaves Shift+Cmd+C out of the app’s reserved table', () => {
    expect(RESERVED_APP_CHORDS[WORKED_EXAMPLE]).toBeUndefined();
  });

  it('keeps Shift+Cmd+C recordable through every gate validateChord reads', () => {
    // validateChord asks four questions in order. This asserts the three that
    // are decided by data, and the fourth is the caller's own agent list,
    // which is empty for a person who has recorded nothing. The function
    // itself is called in src/renderer/settings/__tests__/chords.test.ts,
    // which this file cannot import across the project boundary.
    const modifiers = new Set(WORKED_EXAMPLE.split('+').slice(0, -1));
    expect(modifiers.has('Cmd') || modifiers.has('Ctrl')).toBe(true);
    expect(RESERVED_APP_CHORDS[WORKED_EXAMPLE]).toBeUndefined();
    expect(macosReservedChords().has(WORKED_EXAMPLE)).toBe(false);
  });

  it('takes no chord the product suggests as a per-agent mnemonic', () => {
    // The generalisation of the test above. Shift+Cmd+<letter> is the shape
    // the recorder proposes, so no built-in may own one. This is the check
    // that would have caught the mistake before it was made.
    const taken: string[] = [];
    for (const letter of suggestedHotkeyLetters()) {
      const chord = normalizeAccelerator(`Shift+Cmd+${letter}`);
      const owner = RESERVED_APP_CHORDS[chord];
      if (owner !== undefined) taken.push(`${chord} is held by ${owner}`);
    }
    expect(taken).toEqual([]);
  });
});
