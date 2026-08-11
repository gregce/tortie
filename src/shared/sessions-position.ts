/**
 * Where the session surface lives — the ONE table every control reads.
 *
 * Three controls name this value and they must never disagree:
 *   1. the View menu's radio pair (main draws it — src/main/menu.ts),
 *   2. the SESSIONS header's inline toggle,
 *   3. that header's ˅ menu row
 * (2 and 3 share src/renderer/app/sessions-position.ts, which delegates the
 * flip to `otherSessionsPosition` below).
 *
 * The value itself has exactly ONE writer: the renderer store's
 * `sessionOrientation`, persisted to localStorage. Main holds a CACHE of the
 * last value the store announced over `ui:sessionsPosition` and draws its
 * radios from it — it never reads localStorage, and it never parses a string
 * to guess (Phase 14.7: `raw.includes('right')` on raw JSON, defaulting to
 * top on any failure, was one of the four ways the radios drifted).
 *
 * Keeping the ids, labels and menu actions here as DATA is what makes the
 * agreement testable in node from both sides of the process boundary without
 * either test importing the other's process.
 */

import type { SessionsPosition } from './ipc';

export type { SessionsPosition };

/** The menu actions that ASK for a position (subset of MenuActionWithFind). */
export type SessionsPositionMenuAction = 'sessions-top' | 'sessions-right';

/** One View-menu radio, as data. */
export interface SessionsPositionRadio {
  /** The position this radio names. */
  readonly position: SessionsPosition;
  /** Menu item id — how main finds the item again to move the mark. */
  readonly id: string;
  readonly label: string;
  /** Forwarded to the renderer on click; the store is what actually moves. */
  readonly action: SessionsPositionMenuAction;
}

/** The View menu's radio pair, in menu order. */
export const SESSIONS_POSITION_RADIOS: readonly SessionsPositionRadio[] = [
  {
    position: 'top',
    id: 'view-sessions-top',
    label: 'Sessions on Top',
    action: 'sessions-top'
  },
  {
    position: 'right',
    id: 'view-sessions-right',
    label: 'Sessions on Right',
    action: 'sessions-right'
  }
];

/**
 * What main assumes before the renderer has said anything. It is a guess for
 * one paint at most: the store pushes its real value as the app boots, and
 * the store's own fallback is the same 'top'.
 */
export const DEFAULT_SESSIONS_POSITION: SessionsPosition = 'top';

/** Where the surface goes when a control that flips it is used. */
export function otherSessionsPosition(
  current: SessionsPosition
): SessionsPosition {
  return current === 'top' ? 'right' : 'top';
}

/** The position a View-menu action asks for; null if it asks for something else. */
export function sessionsPositionForMenuAction(
  action: string
): SessionsPosition | null {
  return (
    SESSIONS_POSITION_RADIOS.find((radio) => radio.action === action)
      ?.position ?? null
  );
}
