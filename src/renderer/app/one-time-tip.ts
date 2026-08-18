/**
 * One-time tips — teach a gesture the first time the user reaches for its
 * slower equivalent, then never mention it again.
 *
 * The mechanism is the first-quit toast's (DESIGN.md §4, Phase 8.2/8.3):
 * a localStorage flag guards one ordinary info toast. This module is that
 * mechanism named and shared, so the next tip costs one catalog line instead
 * of a second copy of the flag dance — and as of Phase 12.6 the quit toast
 * itself is one of the catalog's entries rather than a second copy in
 * App.tsx.
 *
 * Two rules inherited from the quit toast, and they bind every tip:
 *  - the flag is written BEFORE the toast, so a tip can never fire twice;
 *  - storage that cannot be read or written counts as "already shown" — a tip
 *    that cannot be remembered must never become a nag.
 *
 * Flags are `gmux.tipShown.<id>` in localStorage: clearing one is how a
 * developer (or a support answer) restores the fresh-user experience.
 */

import { keyDisplay } from '@shared/keymap';
import { useApp } from '../state/store';

interface Tip {
  /** The words the toast shows. */
  text: string;
  /**
   * A pre-catalog flag this tip already wrote under its own name. Someone who
   * has seen the toast must not see it again just because the mechanism was
   * refactored underneath them, so a legacy key counts as "already shown"
   * (read-only — new writes always go to `gmux.tipShown.<id>`).
   */
  legacyFlag?: string;
}

/**
 * Every tip gmux can show, with the words it shows. One line per tip — the
 * text lives here, not at the call site, so a verb offered from two places
 * (tree row, SCM row) teaches with one sentence and one flag.
 */
const TIPS = {
  /** Phase 12.4 — the explorer's "Open in New Tab" verb teaches its gesture. */
  'open-in-new-tab': {
    text: 'Tip: double-clicking a file opens it in a new tab too.'
  },
  /**
   * DESIGN.md §4 — the first ⌘Q with live sessions says out loud that
   * quitting does not kill them. App.tsx holds the quit for as long as the
   * toast is up, so it needs to know whether this one actually showed.
   */
  'quit-hold': {
    text: 'Quitting — your sessions keep running.',
    legacyFlag: 'gmux.quitToastShown'
  },
  /**
   * Phase 80.1. Session focus hides every region except the session, and
   * Escape deliberately does NOT bring them back while the keyboard is in a
   * terminal. Escape is how a person interrupts Claude Code, and taking that
   * key from them is worse than the affordance is worth. So the way out is
   * said once, in words, the first time anyone enters the mode.
   *
   * The chord is read back from the keymap rather than written as a glyph.
   * src/shared/__tests__/keymap-single-source.test.ts fails on a modifier
   * glyph in executable source, and the fix is always to ask the keymap.
   */
  'session-focus-exit': {
    text: `Press ${keyDisplay('view.sessionFocus')} again to bring the rest of Tortie back.`
  }
} as const satisfies Record<string, Tip>;

export type OneTimeTipId = keyof typeof TIPS;

const LS_PREFIX = 'gmux.tipShown.';

/** Has this tip already been shown — or can we not tell? */
export function oneTimeTipShown(id: OneTimeTipId): boolean {
  const legacy: string | undefined = (TIPS[id] as Tip).legacyFlag;
  try {
    if (localStorage.getItem(LS_PREFIX + id) === '1') return true;
    return legacy !== undefined && localStorage.getItem(legacy) === '1';
  } catch {
    return true; // no storage → never risk repeating it
  }
}

/**
 * Show `id` once, ever. Every later call is a silent no-op — including the
 * one racing it in the same tick, because the flag is set first.
 *
 * Returns whether the toast was actually raised, so a caller that must wait
 * for the user to read it (⌘Q holds the quit) can tell the difference between
 * "shown" and "suppressed" instead of pausing in front of nothing.
 */
export function showOneTimeTip(id: OneTimeTipId): boolean {
  if (oneTimeTipShown(id)) return false;
  try {
    localStorage.setItem(LS_PREFIX + id, '1');
  } catch {
    return false; // cannot remember it → do not start
  }
  useApp.getState().toast('info', TIPS[id].text);
  return true;
}
