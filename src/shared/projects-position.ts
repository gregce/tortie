/**
 * Where the project tabs live — the ONE table every control reads (Phase 129).
 *
 * The sibling of ./sessions-position.ts, and deliberately its copy rather
 * than a generalisation of it. Three controls name this value and they must
 * never disagree:
 *   1. the View menu's radio pair (main draws it — src/main/menu.ts),
 *   2. the titlebar's position button,
 *   3. the left rail's position button
 * (2 and 3 are one component, src/renderer/app/ProjectsPositionButton.tsx,
 * which delegates the flip to `otherProjectsPosition` below).
 *
 * The value itself has exactly ONE writer: the renderer store's
 * `projectsPosition`, persisted to localStorage under `gmux.projectsPosition`.
 * Main holds a CACHE of the last value the store announced over
 * `ui:projectsPosition` and draws its radios from it. It never reads
 * localStorage and it never parses a string to guess. That rule is not a
 * preference. Phase 14.7 removed a read-back that raced the store's push and
 * string-sniffed raw JSON, and this pair is built the same way so the same
 * failure cannot arrive a second time.
 *
 * Keeping the ids, labels and menu actions here as DATA is what makes the
 * agreement testable in node from both sides of the process boundary without
 * either test importing the other's process.
 */

import type { ProjectsPosition } from './ipc';

export type { ProjectsPosition };

/** The menu actions that ASK for a position (subset of MenuActionWithFind). */
export type ProjectsPositionMenuAction = 'projects-top' | 'projects-left';

/** One View-menu radio, as data. */
export interface ProjectsPositionRadio {
  /** The position this radio names. */
  readonly position: ProjectsPosition;
  /** Menu item id — how main finds the item again to move the mark. */
  readonly id: string;
  readonly label: string;
  /** Forwarded to the renderer on click; the store is what actually moves. */
  readonly action: ProjectsPositionMenuAction;
}

/** The View menu's radio pair, in menu order. */
export const PROJECTS_POSITION_RADIOS: readonly ProjectsPositionRadio[] = [
  {
    position: 'top',
    id: 'view-projects-top',
    label: 'Projects on Top',
    action: 'projects-top'
  },
  {
    position: 'left',
    id: 'view-projects-left',
    label: 'Projects on the Left',
    action: 'projects-left'
  }
];

/**
 * What main assumes before the renderer has said anything. It is a guess for
 * one paint at most: the store pushes its real value as the app boots, and
 * the store's own fallback is the same 'top'.
 */
export const DEFAULT_PROJECTS_POSITION: ProjectsPosition = 'top';

/** Where the tabs go when a control that flips them is used. */
export function otherProjectsPosition(
  current: ProjectsPosition
): ProjectsPosition {
  return current === 'top' ? 'left' : 'top';
}

/** The position a View-menu action asks for; null if it asks for something else. */
export function projectsPositionForMenuAction(
  action: string
): ProjectsPosition | null {
  return (
    PROJECTS_POSITION_RADIOS.find((radio) => radio.action === action)
      ?.position ?? null
  );
}
