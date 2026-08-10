/**
 * One-time tips — teach a gesture the first time the user reaches for its
 * slower equivalent, then never mention it again.
 *
 * The mechanism is the first-quit toast's (DESIGN.md §4, Phase 8.2/8.3, still
 * inline in App.tsx as `gmux.quitToastShown`): a localStorage flag guards one
 * ordinary info toast. This module is that mechanism named and shared, so the
 * next tip costs one catalog line instead of a second copy of the flag dance.
 * The quit flag folds in here as another catalog entry the next time App.tsx
 * is open for editing — it is left alone in this pass only because App.tsx
 * belongs to another stream today.
 *
 * Two rules inherited from the quit toast, and they bind every tip:
 *  - the flag is written BEFORE the toast, so a tip can never fire twice;
 *  - storage that cannot be read or written counts as "already shown" — a tip
 *    that cannot be remembered must never become a nag.
 *
 * Flags are `gmux.tipShown.<id>` in localStorage: clearing one is how a
 * developer (or a support answer) restores the fresh-user experience.
 */

import { useApp } from '../state/store';

/**
 * Every tip gmux can show, with the words it shows. One line per tip — the
 * text lives here, not at the call site, so a verb offered from two places
 * (tree row, SCM row) teaches with one sentence and one flag.
 */
const TIPS = {
  /** Phase 12.4 — the explorer's "Open in New Tab" verb teaches its gesture. */
  'open-in-new-tab': 'Tip: double-clicking a file opens it in a new tab too.'
} as const;

export type OneTimeTipId = keyof typeof TIPS;

const LS_PREFIX = 'gmux.tipShown.';

/** Has this tip already been shown — or can we not tell? */
export function oneTimeTipShown(id: OneTimeTipId): boolean {
  try {
    return localStorage.getItem(LS_PREFIX + id) === '1';
  } catch {
    return true; // no storage → never risk repeating it
  }
}

/**
 * Show `id` once, ever. Every later call is a silent no-op — including the
 * one racing it in the same tick, because the flag is set first.
 */
export function showOneTimeTip(id: OneTimeTipId): void {
  if (oneTimeTipShown(id)) return;
  try {
    localStorage.setItem(LS_PREFIX + id, '1');
  } catch {
    return; // cannot remember it → do not start
  }
  useApp.getState().toast('info', TIPS[id]);
}
