import { describe, expect, it } from 'vitest';
import {
  SESSIONS_POSITION_RADIOS,
  sessionsPositionForMenuAction
} from '@shared/sessions-position';
import type { SessionsPosition } from '@shared/sessions-position';
import {
  destinationIcon,
  movePositionLabel,
  otherPosition,
  sessionsPositionMenuItems
} from '../sessions-position';

describe('the sessions-position control names its destination', () => {
  it('flips', () => {
    expect(otherPosition('top')).toBe('right');
    expect(otherPosition('right')).toBe('top');
  });

  it('labels where you would GO, never where you are', () => {
    expect(movePositionLabel('top')).toBe('Move sessions to the right');
    expect(movePositionLabel('right')).toBe('Move sessions to the top');
  });

  it('draws the destination layout, not the current one', () => {
    expect(destinationIcon('top')).toBe('layout-sidebar-right');
    expect(destinationIcon('right')).toBe('layout-menubar');
  });
});

describe('the ˅ menu row and the button cannot disagree', () => {
  it('reuses the button label verbatim, under a separator', () => {
    const items = sessionsPositionMenuItems('top', () => undefined);
    expect(items[0]).toBe('sep');
    const row = items[1];
    if (row === undefined || row === 'sep') throw new Error('missing row');
    expect(row.label).toBe(movePositionLabel('top'));
  });

  it('moves to the same place the button would', () => {
    for (const from of ['top', 'right'] as const) {
      const moved: string[] = [];
      const items = sessionsPositionMenuItems(from, (next) =>
        moved.push(next)
      );
      const row = items[1];
      if (row === undefined || row === 'sep') throw new Error('missing row');
      row.run();
      expect(moved).toEqual([otherPosition(from)]);
    }
  });
});

/**
 * Phase 14.7 — the third control. The View menu's radios are drawn by MAIN,
 * from the table below; the inline toggle and the ˅ menu row are drawn here.
 * These are the assertions that make "one value" a fact rather than a claim,
 * and they meet the main-side half in
 * src/main/__tests__/sessions-position-menu.test.ts, which pins the same table
 * to the radios the application menu actually gets built with.
 */
describe('the View-menu radios name the same two places', () => {
  const positions: readonly SessionsPosition[] = ['top', 'right'];

  it('covers each position exactly once, with a distinct action', () => {
    expect(SESSIONS_POSITION_RADIOS.map((r) => r.position)).toEqual(positions);
    expect(new Set(SESSIONS_POSITION_RADIOS.map((r) => r.action)).size).toBe(2);
    for (const radio of SESSIONS_POSITION_RADIOS) {
      expect(sessionsPositionForMenuAction(radio.action)).toBe(radio.position);
    }
  });

  it('leaves nothing to sniff — an unknown action names no position', () => {
    // The defect this replaces read raw JSON and asked whether it contained
    // 'right'; every miss silently meant top.
    expect(sessionsPositionForMenuAction('sessions-righteous')).toBeNull();
    expect(sessionsPositionForMenuAction('show-scm')).toBeNull();
  });

  it('sends the toggle, the ˅ row and the OTHER radio to one place', () => {
    for (const current of positions) {
      const unchecked = SESSIONS_POSITION_RADIOS.filter(
        (r) => r.position !== current
      );
      expect(unchecked).toHaveLength(1);
      const destination = unchecked[0];
      if (destination === undefined) throw new Error('missing radio');

      // 1. the inline toggle (and its icon), 2. the ˅ menu row, 3. the radio
      // the user would click to get there — all the same position.
      expect(otherPosition(current)).toBe(destination.position);
      expect(destinationIcon(current)).toBe(
        destination.position === 'right' ? 'layout-sidebar-right' : 'layout-menubar'
      );

      const moved: SessionsPosition[] = [];
      const row = sessionsPositionMenuItems(current, (next) =>
        moved.push(next)
      )[1];
      if (row === undefined || row === 'sep') throw new Error('missing row');
      row.run();
      expect(moved).toEqual([destination.position]);

      // …and the words agree with the destination, not with where you are.
      const label = movePositionLabel(current).toLowerCase();
      expect(label).toContain(destination.position);
      expect(label).not.toContain(current);
    }
  });
});
