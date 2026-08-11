import { describe, expect, it } from 'vitest';
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
