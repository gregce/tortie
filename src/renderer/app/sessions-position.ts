/**
 * Where the sessions live — the vocabulary, with no React in it
 * (Phase 12.12 item 2).
 *
 * The control itself is ./SessionsPositionButton.tsx; the ˅ menu's row is
 * built by the same three functions below, which is the whole point: the icon
 * button and the menu row must always name the SAME destination, and the way
 * to guarantee that is to have one definition of it rather than two agreeing
 * strings. Pure, so sessions-position.test.ts can hold them to it in node.
 *
 * Only type imports here — the store's `sessionOrientation` stays the one
 * piece of state, and this module never reads or writes it.
 */

import type { SessionOrientation } from '../state/store';
import type { MenuItemSpec } from '../state/store';

/** Where the surface goes when the control is used. */
export function otherPosition(
  current: SessionOrientation
): SessionOrientation {
  return current === 'top' ? 'right' : 'top';
}

/**
 * "Move sessions to the top" / "…to the right" — always the DESTINATION, never
 * the current state. A control labelled with where you already are makes you
 * work out what pressing it does.
 */
export function movePositionLabel(current: SessionOrientation): string {
  return current === 'top'
    ? 'Move sessions to the right'
    : 'Move sessions to the top';
}

/**
 * The destination's shape, from the codicon layout family so the two states
 * are one drawing with the highlighted region moved: a bar across the top, or
 * a column down the right.
 */
export function destinationIcon(current: SessionOrientation): string {
  return current === 'top' ? 'layout-sidebar-right' : 'layout-menubar';
}

/**
 * The same verb as a row in the ˅ menu, under a separator: discoverability for
 * anyone who opens the menu rather than reading the icons.
 */
export function sessionsPositionMenuItems(
  current: SessionOrientation,
  move: (next: SessionOrientation) => void
): (MenuItemSpec | 'sep')[] {
  return [
    'sep',
    {
      label: movePositionLabel(current),
      run: () => move(otherPosition(current))
    }
  ];
}
