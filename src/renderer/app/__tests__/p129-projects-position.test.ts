/**
 * Where the project tabs live (Phase 129) — the renderer half of the proof.
 *
 * The main half is src/main/__tests__/projects-position-menu.test.ts. Neither
 * test imports the other's process, and they hold the SAME table, which is the
 * whole reason src/shared/projects-position.ts exists as data.
 *
 * What is pinned here:
 *  - the flip has one definition, so the titlebar's button, the rail's button
 *    and the View menu's radios cannot send the tabs to different places;
 *  - every label names its destination rather than its state (DESIGN §11.2);
 *  - the collapse control says four different things, because the two
 *    positions put different things away;
 *  - the shared table's menu actions are the same two strings the IPC
 *    contract's own union declares.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECTS_POSITION,
  otherProjectsPosition,
  PROJECTS_POSITION_RADIOS,
  projectsPositionForMenuAction
} from '@shared/projects-position';
import type {
  ProjectsPosition,
  ProjectsPositionMenuAction
} from '@shared/projects-position';
import type { ProjectsPositionMenuActionId } from '@shared/ipc';
import {
  collapseIcon,
  collapseLabel,
  destinationIcon,
  movePositionLabel,
  otherPosition,
  PROJECTS_LABEL,
  RAIL_TOO_NARROW,
  SWITCH_PROJECT
} from '../projects-position';

describe('the projects-position control names its destination', () => {
  it('flips, and delegates the flip to the shared table', () => {
    expect(otherPosition('top')).toBe('left');
    expect(otherPosition('left')).toBe('top');
    expect(otherPosition('top')).toBe(otherProjectsPosition('top'));
    expect(otherPosition('left')).toBe(otherProjectsPosition('left'));
  });

  it('labels where you would GO, never where you are', () => {
    expect(movePositionLabel('top')).toBe('Move projects to the left');
    expect(movePositionLabel('left')).toBe('Move projects to the top');
  });

  it('draws the destination layout, not the current one', () => {
    expect(destinationIcon('top')).toBe('layout-sidebar-left');
    expect(destinationIcon('left')).toBe('layout-menubar');
  });
});

describe('the collapse control', () => {
  /**
   * Four sentences, because the two positions put different things away. On
   * top the row of tabs goes and one chip stays. On the left the rail stays
   * and only the names go.
   */
  it('says what pressing it would do, in each of the four states', () => {
    expect(collapseLabel('top', false)).toBe('Hide the project tabs');
    expect(collapseLabel('top', true)).toBe('Show the project tabs');
    expect(collapseLabel('left', false)).toBe('Collapse the project rail');
    expect(collapseLabel('left', true)).toBe('Show project names');
  });

  it('gives four distinct sentences, so no two states read alike', () => {
    const said = new Set([
      collapseLabel('top', false),
      collapseLabel('top', true),
      collapseLabel('left', false),
      collapseLabel('left', true)
    ]);
    expect(said.size).toBe(4);
  });

  it('points the glyph the way the thing it moves would travel', () => {
    // The top pair folds rather than chevrons, so it cannot be mistaken for
    // the collapsed chip's own menu caret sitting beside it.
    expect(collapseIcon('top', false)).toBe('fold-up');
    expect(collapseIcon('top', true)).toBe('fold-down');
    expect(collapseIcon('left', false)).toBe('chevron-left');
    expect(collapseIcon('left', true)).toBe('chevron-right');
  });
});

describe('the strings this phase ships', () => {
  it('uses no dash of any kind, and a colon only before a list', () => {
    const strings = [
      movePositionLabel('top'),
      movePositionLabel('left'),
      collapseLabel('top', false),
      collapseLabel('top', true),
      collapseLabel('left', false),
      collapseLabel('left', true),
      RAIL_TOO_NARROW,
      SWITCH_PROJECT,
      PROJECTS_LABEL,
      ...PROJECTS_POSITION_RADIOS.map((r) => r.label)
    ];
    for (const s of strings) {
      expect(s, `"${s}" holds an em or en dash`).not.toMatch(/[—–]/);
      expect(s, `"${s}" holds a colon`).not.toContain(':');
      expect(s.length, 'no empty label').toBeGreaterThan(0);
    }
  });

  it('spells the narrow-window sentence as two complete sentences', () => {
    expect(RAIL_TOO_NARROW).toBe(
      'The window is too narrow to show the project names. Make it wider.'
    );
  });
});

describe('the shared table', () => {
  it('carries one radio per position, in menu order', () => {
    expect(PROJECTS_POSITION_RADIOS.map((r) => r.position)).toEqual([
      'top',
      'left'
    ]);
    expect(PROJECTS_POSITION_RADIOS.map((r) => r.label)).toEqual([
      'Projects on Top',
      'Projects on the Left'
    ]);
    expect(PROJECTS_POSITION_RADIOS.map((r) => r.id)).toEqual([
      'view-projects-top',
      'view-projects-left'
    ]);
  });

  it('resolves each action to the position its label names', () => {
    for (const radio of PROJECTS_POSITION_RADIOS) {
      expect(projectsPositionForMenuAction(radio.action)).toBe(radio.position);
    }
  });

  it('answers null for an action that asks for something else', () => {
    for (const other of ['sessions-top', 'sessions-right', 'toggle-sidebar']) {
      expect(projectsPositionForMenuAction(other)).toBeNull();
    }
  });

  it('defaults to top, which is what every build before this one drew', () => {
    expect(DEFAULT_PROJECTS_POSITION).toBe('top');
  });

  it('agrees with the IPC contract about the two action strings', () => {
    // A compile-time equality, made runnable: if either union gains or loses a
    // member the assignments below stop compiling.
    const fromTable: ProjectsPositionMenuAction[] = ['projects-top', 'projects-left'];
    const fromContract: ProjectsPositionMenuActionId[] = fromTable;
    const back: ProjectsPositionMenuAction[] = fromContract;
    expect(back).toEqual(PROJECTS_POSITION_RADIOS.map((r) => r.action));
  });

  it('has exactly two positions, and they are the two the store holds', () => {
    const every: ProjectsPosition[] = ['top', 'left'];
    expect(new Set(PROJECTS_POSITION_RADIOS.map((r) => r.position))).toEqual(
      new Set(every)
    );
  });
});
