/**
 * ⌘1…⌘9 over the project tabs — the two directions of one rule, in one place
 * (Phase 12.12 items 3 and 4).
 *
 * THE RULE (the browser convention, and the reason this module exists): ⌘1-⌘8
 * are POSITIONS in the visual tab order, and ⌘9 is always the LAST tab however
 * many are open. Before 12.12, ⌘9 meant "the ninth", so a tenth project — and
 * every project after it — had no shortcut at all and the tail of the strip
 * was unreachable by keyboard. ⌃Tab MRU cycling already covers the middle.
 *
 * Both directions live here because they must agree: `digitToIndex` is what
 * the keystroke does, `tabDigit` is what the tab CLAIMS while ⌘ is held. A tab
 * that shows a 9 the keystroke would not honour is worse than no hint at all,
 * so the round trip is a unit test (project-shortcuts.test.ts), not a comment.
 */

import { acceleratorToDisplay, keymapEntry } from '@shared/keymap';

/** Digits that address a project tab. */
export const PROJECT_SHORTCUT_DIGITS = 9;

/** The digit ⌘9 is bound to: the last tab, never the ninth. */
const LAST_DIGIT = 9;

/**
 * Which project a ⌘<digit> press selects, or null when the digit addresses
 * nothing (⌘5 with three projects open).
 */
export function digitToIndex(digit: number, count: number): number | null {
  if (count <= 0) return null;
  if (digit === LAST_DIGIT) return count - 1;
  if (digit < 1 || digit > LAST_DIGIT) return null;
  return digit - 1 <= count - 1 ? digit - 1 : null;
}

/**
 * The digit a tab reveals while ⌘ is held, or null when it has none — the
 * middle of a long strip (positions 9…n-1) genuinely has no shortcut, and
 * inventing one there would be a lie.
 *
 * The last tab claims 9 only once 9 is not already its own position: with five
 * projects the fifth tab shows "5", not both "5" and "9", even though ⌘9 also
 * lands there. One tab, one number.
 */
export function tabDigit(index: number, count: number): number | null {
  if (index < 0 || index >= count) return null;
  if (index === count - 1 && count >= LAST_DIGIT) return LAST_DIGIT;
  return index <= LAST_DIGIT - 2 ? index + 1 : null;
}

/**
 * Tooltip fragment for a tab's own shortcut ("⌘3", "⌘9 — last project").
 *
 * The glyph is spelled by the keymap's own formatter rather than typed here,
 * so the tooltip and the Settings map cannot disagree about what ⌘9 is called
 * (`project.last`'s action IS "Last project" — that word is not repeated).
 */
export function tabShortcutLabel(digit: number): string {
  const chord = acceleratorToDisplay(`Cmd+${digit}`);
  return digit === LAST_DIGIT
    ? `${chord} — ${keymapEntry('project.last').action.toLowerCase()}`
    : chord;
}
