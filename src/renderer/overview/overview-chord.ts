/**
 * Who owns the overview chord when a person recorded it (Phase 137.1).
 *
 * Phase 137.1 moved Catch Me Up onto ⇧⌘U, a chord a person could record for
 * an agent before this phase reserved it. The person's own chord wins: the
 * keyboard map's ⇧⌘U branch asks this before acting, and when a recorded
 * hotkey owns the chord the branch does nothing at all — no preventDefault —
 * so the native accelerator fires instead. The Session menu holds the
 * recorded item and precedes the View menu, so Electron's first match is
 * the person's, and the built-in yields.
 *
 * This module stays free of the store on purpose, so
 * overview-contract.test.ts can call the decision with a hotkey map of its
 * own. The live read over the settings store is in ./open-overview.ts.
 */

import { accelerator, normalizeAccelerator } from '@shared/keymap';

/**
 * The agent whose RECORDED per-agent hotkey is the overview chord, or null.
 * The recorder stores canonical accelerators, and both sides are normalized
 * here anyway so a stored variant spelling still matches.
 */
export function recordedOverviewChordOwner(
  hotkeys: Partial<Record<string, string | undefined>>
): string | null {
  const chord = accelerator('view.overview');
  for (const [agentId, recorded] of Object.entries(hotkeys)) {
    if (typeof recorded !== 'string' || recorded === '') continue;
    if (normalizeAccelerator(recorded) === chord) return agentId;
  }
  return null;
}
