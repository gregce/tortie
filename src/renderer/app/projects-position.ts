/**
 * Where the projects live — the vocabulary, with no React in it (Phase 129).
 *
 * The sibling of ./sessions-position.ts, and the same rule binds it: every
 * label names its DESTINATION, never the state you are already in. A control
 * labelled with where you already are makes you work out what pressing it
 * does (DESIGN §11.2).
 *
 * The control itself is ./ProjectsPositionButton.tsx, and one component is
 * drawn in both places, so the titlebar's button and the rail's button cannot
 * come to name different things.
 *
 * Only type imports here. The store's `projectsPosition` stays the one piece
 * of state, and this module never reads or writes it.
 */

import { otherProjectsPosition } from '@shared/projects-position';
import type { ProjectsPosition } from '../state/store';

/** Where the tabs go when the control is used. */
export function otherPosition(
  current: ProjectsPosition
): ProjectsPosition {
  return otherProjectsPosition(current);
}

/** "Move projects to the left" / "…to the top". Always the destination. */
export function movePositionLabel(current: ProjectsPosition): string {
  return current === 'top'
    ? 'Move projects to the left'
    : 'Move projects to the top';
}

/**
 * The destination's shape, from the codicon layout family, so the two states
 * are one drawing with the highlighted region moved: a column down the left,
 * or a bar across the top.
 */
export function destinationIcon(current: ProjectsPosition): string {
  return current === 'top' ? 'layout-sidebar-left' : 'layout-menubar';
}

/**
 * What the collapse control says, and it depends on BOTH the position and the
 * state, because the two positions put different things away.
 *
 * On top the row of tabs goes and one chip stays, so the words are about the
 * tabs. On the left the rail stays and only the names go, so the words are
 * about the names. Four sentences, one function, no surface writing its own.
 */
export function collapseLabel(
  position: ProjectsPosition,
  collapsed: boolean
): string {
  if (position === 'top') {
    return collapsed ? 'Show the project tabs' : 'Hide the project tabs';
  }
  return collapsed ? 'Show project names' : 'Collapse the project rail';
}

/**
 * The glyph the collapse control carries. It points the way the thing it
 * moves would travel, which on top is up and down and on the left is left and
 * right.
 *
 * On TOP the pair is `fold-up` and `fold-down` rather than a plain chevron,
 * and that was a correction read off a screenshot. The collapsed band draws
 * one chip that opens a menu, and a bare chevron sitting next to it reads as
 * that chip's own caret. The fold glyphs say "put a row away" and "bring it
 * back", which is what the control does and what nothing beside it does.
 */
export function collapseIcon(
  position: ProjectsPosition,
  collapsed: boolean
): string {
  if (position === 'top') {
    return collapsed ? 'fold-down' : 'fold-up';
  }
  return collapsed ? 'chevron-right' : 'chevron-left';
}

/**
 * What the collapse control says when the window is too narrow to draw the
 * rail expanded at all. The control is still there and still disabled, so the
 * person reads why rather than pressing something that changes nothing.
 */
export const RAIL_TOO_NARROW =
  'The window is too narrow to show the project names. Make it wider.';

/** The accessible name of the chip that replaces the collapsed tab row. */
export const SWITCH_PROJECT = 'Switch project';

/** The rail's band, and the accessible name of its list. */
export const PROJECTS_LABEL = 'Projects';
