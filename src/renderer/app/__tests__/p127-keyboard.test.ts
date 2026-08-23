/**
 * Phase 127. The keyboard map, where it now lives.
 *
 * WHAT THIS TEST CAN SEE, AND WHAT IT CANNOT. It reads source text. There is
 * no DOM environment in this repository: `vitest.config.ts` sets
 * `environment: 'node'` and no jsdom package is installed, so no test here can
 * dispatch a key at a window. That is the same limit the note at the top of
 * machine-badge.test.tsx records.
 *
 * So this file proves the extraction is FAITHFUL rather than proving the map
 * works. Every branch App.tsx carried is named and asserted present, the two
 * capture-phase listeners are counted, and the four shared reads are asserted
 * to be declared once. The behavioural proof is the live drive named in the
 * phase report, which presses real keys through the shipped handler.
 *
 * The instrument is the one src/main/sessions/__tests__/p125-core-split.test.ts
 * uses, for the same reason.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(APP_DIR, 'keyboard.ts'), 'utf8');
const shellActions = readFileSync(join(APP_DIR, 'shell-actions.ts'), 'utf8');

describe('the listener contract', () => {
  it('registers two capture-phase keydown listeners on window', () => {
    expect(
      source.split("window.addEventListener('keydown'").length - 1,
      'one map and one arrow handler, because Option rewrites e.key on ' +
        'letters but not on arrows'
    ).toBe(2);
    expect(
      source.split('{ capture: true }').length - 1
    ).toBeGreaterThanOrEqual(3);
  });

  it('removes both again on teardown', () => {
    expect(
      source.split("window.removeEventListener('keydown'").length - 1
    ).toBe(2);
  });
});

describe('every branch App.tsx carried is still here', () => {
  /** The distinctive line of each branch. */
  const BRANCHES: Array<[string, string]> = [
    ['the terminal input hint', 's.noteTerminalInput();'],
    ['Escape', "if (e.key === 'Escape') {"],
    [
      'the create sheet refusal',
      'if (escapeMayCloseCreateSheet()) s.setCreateOpen(false);'
    ],
    [
      'the shortcuts search',
      'if (!shortcutSearchTookEscape()) s.setShortcutsOpen(false);'
    ],
    ['leaving session focus', 'void toggleSessionFocus();'],
    ['F2 rename', "if (e.key === 'F2') {"],
    ['F4 result walk', "if (e.key === 'F4'"],
    ['the three search modifiers', 'search.toggleCaseSensitive();'],
    ['Control Tab', "e.ctrlKey && !e.metaKey && e.key === 'Tab'"],
    ['Control Shift G', "showViewAction('scm');"],
    ['Control Shift C', "showViewAction('context');"],
    ['Shift Command Return', "if (e.shiftKey && e.key === 'Enter') {"],
    ['Command Shift F', 'showSearchAction();'],
    ['Command Shift O', 'useSymbols.getState().openPalette();'],
    ['Command Shift E', "showViewAction('explorer');"],
    ['Command T', 's.setCreateOpen(true);'],
    ['Command O', 'void s.openProject();'],
    ['Command J', 's.setAttentionOpen(!s.attentionOpen);'],
    ['Command P', 'useQuickOpen.getState().toggleOrOpen();'],
    ['Command slash', 's.setShortcutsOpen(!s.shortcutsOpen);'],
    ['Command B', 's.toggleSidebar();'],
    ['the digits', "if (/^[1-9]$/.test(e.key)) {"],
    ['split navigation', 'useLayout.getState().navigate(dir);']
  ];

  for (const [name, needle] of BRANCHES) {
    it(`${name} is still in the map`, () => {
      expect(source).toContain(needle);
    });
  }

  it('swallows Command W without closing anything', () => {
    // Command W closes editor tabs only, NEVER a session or a project. It is
    // swallowed here and the editor panel's bubble-phase listener performs
    // the close. A branch that grew a body would be a session closing.
    const at = source.indexOf("case 'w':");
    expect(at).toBeGreaterThan(-1);
    const body = source.slice(at, source.indexOf('default:', at));
    expect(body).toContain('e.preventDefault();');
    expect(body).not.toContain('s.');
  });

  it('swallows the fill chord while a layer is up, and still preventDefaults', () => {
    // preventDefault runs even when the chord is swallowed, because the native
    // View row carries the same accelerator and arrives about 5 ms later.
    const at = source.indexOf("if (e.shiftKey && e.key === 'Enter') {");
    const body = source.slice(at, at + 200);
    expect(body.indexOf('e.preventDefault();')).toBeLessThan(
      body.indexOf('focusChordSwallowed()')
    );
  });
});

describe('the shared reads live in one place', () => {
  it('shell-actions.ts exports exactly the four', () => {
    const exported = [...shellActions.matchAll(/^export function (\w+)/gm)].map(
      (m) => m[1] ?? ''
    );
    expect(exported).toEqual([
      'focusedSessionRowId',
      'showViewAction',
      'showSearchAction',
      'modalLayerOpen'
    ]);
  });

  it('keyboard.ts declares none of them itself', () => {
    for (const name of [
      'function focusedSessionRowId',
      'function showViewAction',
      'function showSearchAction',
      'function modalLayerOpen'
    ]) {
      expect(source.includes(name), `keyboard.ts redeclares ${name}`).toBe(
        false
      );
    }
  });

  it('modalLayerOpen still reads all seven layers', () => {
    for (const layer of [
      's.confirm !== null',
      's.createOpen',
      's.newProjectOpen',
      's.remoteProjectOpen',
      's.shortcutsOpen',
      's.attentionOpen',
      's.pastOpen'
    ]) {
      expect(shellActions).toContain(layer);
    }
  });
});
