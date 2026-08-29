/**
 * Phase 127. The native menu controller kept every arm it had in App.tsx.
 *
 * The phase moved 244 lines out of App.tsx and claims nothing changed. A menu
 * row that lost its arm would do nothing on a click and no other test would
 * see it, because `runMenuAction` returns void on every path and this
 * environment has no menu bar to click. So the arms are counted and named.
 *
 * The list below is the one that shipped at `1dfbee8`, before the move. It is
 * written out rather than derived, so a reviewer reads what the menu promises
 * instead of trusting a regex to have found it.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(APP_DIR, 'menu-actions.ts'), 'utf8');

/** Every action id `runMenuAction` answered before the move. */
const ARMS = [
  'new-session',
  'rename-session',
  'end-session',
  'next-session',
  'prev-session',
  'open-project',
  'new-project',
  'open-remote-project',
  'clone-repository',
  'close-project',
  'next-project',
  'prev-project',
  'save-file',
  'close-editor-tab',
  'toggle-editor',
  'toggle-sidebar',
  'toggle-editor-fill',
  'toggle-session-focus',
  'attention',
  'shortcuts',
  'quick-open',
  'show-explorer',
  'show-scm',
  'show-context',
  // Phase 63. View > Architecture, the fifth sidebar view, above Catch Me Up.
  'show-arch',
  // Phase 160. View > Architecture Map, directly under the view that opens
  // it. It opens the active project's map as a full size editor tab, or
  // focuses the one already open, through the same door the pane's control
  // uses.
  'show-arch-map',
  // Phase 163. Help > Diagnostics Report, and the row in Settings, which
  // main forwards as this same action. It opens the report as a full size
  // editor tab, or focuses the one already open. It sits here in source
  // order, directly under the map tab whose shape it follows.
  'show-diagnostics',
  // Phase 64. Session > Aim at a Promise…, beside Resume Conversation. It is
  // in this list rather than with the view rows because it opens no view: it
  // puts a composed block into the prompt of the session in front of the
  // person. It sits here in source order, which is beside 'show-arch'.
  'arch-aim',
  // Phase 137. View > Catch Me Up, last, under the five sidebar views.
  'show-overview',
  'show-search',
  'go-to-symbol',
  'sessions-top',
  'sessions-right',
  'projects-top',
  'projects-left',
  'past-sessions',
  'settings'
];

describe('runMenuAction', () => {
  it('answers all 37 actions and no more', () => {
    const found = [...source.matchAll(/case '([a-z-]+)':/g)].map(
      (m) => m[1] ?? ''
    );
    expect(found).toEqual(ARMS);
  });

  it('reads each radio pair from its own shared table', () => {
    // Which position a radio names is decided ONCE, in the table main built
    // the radios from. Re-typing it here is how a label and its effect drift.
    expect(source).toContain('sessionsPositionForMenuAction(action)');
    expect(source).toContain('projectsPositionForMenuAction(action)');
  });
});

describe('useMenuActions', () => {
  it('keeps the four prefix branches, in the order they were checked in', () => {
    const order = [
      'FOCUS_SESSION_PREFIX',
      'OPEN_RECENT_PREFIX',
      'OPEN_RECENT_ON_PREFIX',
      "action === 'shell-open-pending'"
    ].map((needle) => source.indexOf(`startsWith(${needle})`) > -1
      ? source.indexOf(`startsWith(${needle})`)
      : source.indexOf(needle));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    for (let i = 1; i < order.length; i += 1) {
      // OPEN_RECENT_ON_PREFIX is checked AFTER OPEN_RECENT_PREFIX and never
      // before it, because the two prefixes differ at their eleventh
      // character and so a string starting with one never starts with the
      // other.
      expect(order[i]).toBeGreaterThan(order[i - 1] ?? -1);
    }
  });

  it('subscribes through the one bridge accessor', () => {
    expect(source).toContain('const bridge = gmuxBridge();');
    expect(source).toContain("typeof bridge?.onMenuAction !== 'function'");
  });
});

describe('the two controllers do not import each other', () => {
  const keyboard = readFileSync(join(APP_DIR, 'keyboard.ts'), 'utf8');

  it('menu-actions.ts does not name ./keyboard', () => {
    expect(source.includes("from './keyboard'")).toBe(false);
  });

  it('keyboard.ts does not name ./menu-actions', () => {
    expect(keyboard.includes("from './menu-actions'")).toBe(false);
  });

  it('both read the four shared reads from ./shell-actions', () => {
    for (const text of [source, keyboard]) {
      expect(text).toContain("} from './shell-actions';");
      expect(text).toContain('showViewAction');
      expect(text).toContain('modalLayerOpen');
    }
  });
});
