/**
 * WHICH SIDE YIELDS (Phase 181.1), held as arithmetic.
 *
 * The operator's ruling is that the meter keeps its width and the sessions
 * start scrolling earlier. So the interesting case is the ORDINARY one: a
 * band that is tight for the tabs but has room for the meter keeps the meter
 * at compact, and the tabs are what give way. The step down is the floor and
 * these checks pin it to the widths where nothing else can be done.
 *
 * Every width here is a number the caller measured off the DOM.
 * ../usage-fit.ts knows no widths of its own, which is what lets the
 * reservation move when a second provider is switched on.
 */

import { describe, expect, it } from 'vitest';
import { chooseStripDensity } from '../usage-fit';

const base = { headerWidth: 900, controlsWidth: 120, tabFloor: 120 };
const widths = { compact: 180, mini: 60 };

describe('the strip meter chooses the widest density that fits', () => {
  it('keeps compact while one tab still has its minimum', () => {
    // 900 - 120 - 120 = 660 of room for a meter that asks for 180.
    expect(chooseStripDensity({ ...base, widths })).toBe('compact');
  });

  it('keeps compact at the exact width where the tab floor is still met', () => {
    // Room is exactly 180, which the compact meter fits into.
    expect(
      chooseStripDensity({ ...base, headerWidth: 420, widths })
    ).toBe('compact');
  });

  it('steps to mini one pixel below that, and no sooner', () => {
    expect(
      chooseStripDensity({ ...base, headerWidth: 419, widths })
    ).toBe('mini');
  });

  it('steps away only when even mini cannot stand beside one tab', () => {
    expect(chooseStripDensity({ ...base, headerWidth: 300, widths })).toBe(
      'mini'
    );
    expect(chooseStripDensity({ ...base, headerWidth: 299, widths })).toBe(
      'none'
    );
  });

  it('does not depend on which density is in force', () => {
    // The predicate is the band minus the pinned controls minus one tab, and
    // none of those three moves when the meter changes size. That is what
    // stops a step down from making room that steps it straight back up.
    for (const headerWidth of [419, 420, 300, 299]) {
      const first = chooseStripDensity({ ...base, headerWidth, widths });
      const again = chooseStripDensity({ ...base, headerWidth, widths });
      expect(again).toBe(first);
    }
  });

  it('gives way as a second provider widens the reservation', () => {
    const one = { compact: 120, mini: 40 };
    const two = { compact: 220, mini: 60 };
    expect(chooseStripDensity({ ...base, headerWidth: 400, widths: one })).toBe(
      'compact'
    );
    expect(chooseStripDensity({ ...base, headerWidth: 400, widths: two })).toBe(
      'mini'
    );
  });

  it('draws an unmeasured density once so it can be measured', () => {
    expect(
      chooseStripDensity({
        ...base,
        headerWidth: 200,
        widths: { compact: null, mini: null }
      })
    ).toBe('compact');
    expect(
      chooseStripDensity({
        ...base,
        headerWidth: 200,
        widths: { compact: 180, mini: null }
      })
    ).toBe('mini');
  });

  it('never trusts a width that is not a number', () => {
    expect(
      chooseStripDensity({ ...base, headerWidth: Number.NaN, widths })
    ).toBe('compact');
  });
});
