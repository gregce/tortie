/**
 * Phase 251 — the controls: the chip's two arms and the bar's counter.
 *
 * `npm run conformance:redline` rule 38 drives the same decision over the
 * geometry research 113 and 114 measured, with an ablation of every clause.
 * This is the same property under `npm test`, which is what a person running
 * the ordinary battery sees, and it pins the two numbers the gate's own arms
 * would go blind to if the gate were ever removed from a commit's list.
 *
 * The band arm's own numbers come from the design:
 *
 *   the page at the operator's 1349px pane   767.83px
 *   the canvas beside it, in the scroller     285.58px
 *   the product's chip (research 113 §4)      258.28px
 *   the same four buttons relabelled          299.07px  (research 99 §7.3)
 */

import { describe, expect, it } from 'vitest';
import { chipAnchorRect, chipPlace, type ChipRect } from '../redline-chip';
import { redlineChangeCount } from '../redline-sentences';

const rect = (left: number, top: number, width: number, height: number): ChipRect => ({
  left,
  top,
  bottom: top + height,
  width,
  height
});

/** The app's own `ch`, being research 113 §1's 556.816 / 68. */
const CH = 556.816 / 68;
/** 84 characters of text plus the 24px of inline padding on each side. */
const COLUMN = 84 * CH + 48;

/** The scroller and the page at a panel of `panel` px, per research 113 §0. */
function room(panel: number): { scroll: ChipRect; page: ChipRect } {
  const scrollW = panel - 10;
  const rail = scrollW >= 449 ? 20 : 3;
  const gutter = scrollW >= 449 ? 12 : 4;
  const pageW = rail + gutter + Math.min(COLUMN, scrollW - rail - gutter);
  return {
    scroll: rect(0, 0, scrollW, 800),
    page: rect((scrollW - pageW) / 2, 0, pageW, 1600)
  };
}

const PRODUCT = { width: 258.28, height: 30 };
const RELABELLED = { width: 299.07, height: 30 };

describe('the chip goes beside the column when the canvas holds it, and over it when not', () => {
  it('takes the band at the pane the operator works in', () => {
    const r = room(1349);
    expect(r.page.width).toBeCloseTo(767.83, 2);
    const place = chipPlace(rect(r.page.left + 100, 200, 40, 15), r.page, r.scroll, PRODUCT);
    expect(place.arm).toBe('band');
    // Placed at the page's own width plus the gutter, so it covers no prose.
    expect(place.left).toBeCloseTo(783.83, 2);
    // And it really fits inside the box that would otherwise have to scroll.
    expect(r.page.left + place.left + PRODUCT.width).toBeLessThanOrEqual(r.scroll.width);
  });

  it('A RE-LABELLED BUTTON MOVES THE ANSWER BY ITSELF, at the same pixel', () => {
    const r = room(1349);
    const change = rect(r.page.left + 100, 200, 40, 15);
    expect(chipPlace(change, r.page, r.scroll, PRODUCT).arm).toBe('band');
    expect(chipPlace(change, r.page, r.scroll, RELABELLED).arm).toBe('overlay');
  });

  it('falls back to the overlay at 699px and at the panel floor, where there is no canvas', () => {
    for (const panel of [699, 319]) {
      const r = room(panel);
      const band = r.scroll.width - (r.page.left + r.page.width);
      expect(band).toBeCloseTo(0, 2);
      expect(
        chipPlace(rect(r.page.left + 10, 200, 40, 15), r.page, r.scroll, PRODUCT).arm
      ).toBe('overlay');
    }
  });

  it('THE OVERLAY ARM IS PHASE 236 UNCHANGED: above when there is room, below when not', () => {
    const r = room(319);
    const near = rect(r.page.left + 10, 400, 8, 15);
    expect(chipPlace(near, r.page, r.scroll, PRODUCT).top).toBeCloseTo(366, 2);
    const first = rect(r.page.left + 10, 2, 8, 15);
    expect(chipPlace(first, r.page, r.scroll, PRODUCT).top).toBeCloseTo(21, 2);
  });

  it('is clamped inside the page in the overlay arm, so it grows no scrollbar', () => {
    const r = room(319);
    const far = rect(r.page.left + r.page.width - 8, 400, 8, 15);
    const place = chipPlace(far, r.page, r.scroll, PRODUCT);
    expect(place.left).toBeCloseTo(r.page.width - PRODUCT.width, 2);
    expect(chipPlace(rect(r.page.left, 400, 8, 15), r.page, r.scroll, PRODUCT).left).toBe(0);
  });

  it('THE MANDATORY RULE IS UNTOUCHED: the anchor is rects[0] and no box is asked for', () => {
    const asked: string[] = [];
    const first = rect(1185.82, 433.23, 44.7, 15);
    const el = {
      getClientRects: () => {
        asked.push('getClientRects');
        return [first, rect(750.09, 454.68, 20, 15)];
      },
      getBoundingClientRect: () => {
        asked.push('getBoundingClientRect');
        return rect(750.09, 433.23, 480.43, 36.45);
      }
    };
    expect(chipAnchorRect(el)).toBe(first);
    expect(asked).toEqual(['getClientRects']);
  });

  it('is measured against the PAGE and never against the scroller, in both arms', () => {
    const r = room(699);
    const change = rect(r.page.left + 50, 400, 8, 15);
    const moved = rect(r.page.left - 100, r.page.top - 50, r.page.width, r.page.height);
    const here = chipPlace(change, r.page, r.scroll, PRODUCT);
    const there = chipPlace(change, moved, r.scroll, PRODUCT);
    expect(there.left - here.left).toBeCloseTo(100, 2);
    expect(there.top - here.top).toBeCloseTo(50, 2);
    // The band arm's own left is the page's width and the gutter, so a page
    // that moved does not move the chip's offset inside it.
    const wide = room(1349);
    const shifted = rect(wide.page.left - 30, 0, wide.page.width, wide.page.height);
    const c = rect(wide.page.left + 100, 200, 40, 15);
    expect(chipPlace(c, shifted, wide.scroll, PRODUCT).left).toBeCloseTo(
      chipPlace(c, wide.page, wide.scroll, PRODUCT).left,
      2
    );
  });
});

describe('the change count says how many there are until you go to one', () => {
  it('names no place on the resting face, because nothing is current there', () => {
    expect(redlineChangeCount(13, null)).toBe('13 changes');
    expect(redlineChangeCount(1, null)).toBe('1 change');
  });

  it('names the place once there is one, one-based', () => {
    expect(redlineChangeCount(13, 0)).toBe('1 of 13 changes');
    expect(redlineChangeCount(13, 12)).toBe('13 of 13 changes');
    expect(redlineChangeCount(1, 0)).toBe('1 of 1 change');
  });
});

/**
 * THE FIX ROUND. The band is measured in the scroller's CONTENT box, and this
 * is the half of that a `node` environment can hold: `chipPlace` decides on the
 * `width` it is handed, so handing it a border box — ten pixels wider on this
 * machine, because a scrolling document draws a vertical scrollbar — accepts a
 * chip that does not fit. The other half is the CALL SITE, which is where the
 * defect really was, and that is `npm run conformance:redline` rule 39 over the
 * real source plus `npm run probe:p249`'s band sweep in the running app.
 */
describe('the band is the scroller content box, never its border box', () => {
  /** The panel at which the product's chip first takes the band. */
  const threshold = (size: { width: number; height: number }, pad = 0): number => {
    let lo = 400;
    let hi = 4000;
    for (let i = 0; i < 60; i += 1) {
      const mid = (lo + hi) / 2;
      const r = room(mid);
      const scroll = { ...r.scroll, width: r.scroll.width + pad };
      if (chipPlace(rect(r.page.left + 100, 200, 40, 15), r.page, scroll, size).arm === 'band') {
        hi = mid;
      } else lo = mid;
    }
    return hi;
  };

  it('accepts a chip that does not fit when it is handed the border box', () => {
    // The scrollbar is 10px on this machine (research 113 §0 reads the panel
    // ten wider than the scroller for the same reason).
    const SCROLLBAR = 10;
    const panel = 1310;
    const r = room(panel);
    const content = r.scroll;
    const border = { ...r.scroll, width: r.scroll.width + SCROLLBAR };
    // The border box takes the band and the content box does not, so this
    // panel is inside the window the defect opened.
    expect(chipPlace(rect(r.page.left + 100, 200, 40, 15), r.page, border, PRODUCT).arm)
      .toBe('band');
    expect(chipPlace(rect(r.page.left + 100, 200, 40, 15), r.page, content, PRODUCT).arm)
      .toBe('overlay');
    // And the chip the border box accepted really hangs past the content box.
    const bad = chipPlace(rect(r.page.left + 100, 200, 40, 15), r.page, border, PRODUCT);
    const over = r.page.left + bad.left + PRODUCT.width - (content.left + content.width);
    expect(over).toBeGreaterThan(0);
    expect(over).toBeLessThanOrEqual(SCROLLBAR);
  });

  it('publishes the threshold the design documents publish', () => {
    // 1326.39 is the panel width DESIGN.md §12.2 and docs/DESIGN-SPEC.md name,
    // and it is what the content box gives. The border box would move it to
    // about ten pixels lower and put those ten pixels behind the scrollbar.
    expect(threshold(PRODUCT)).toBeCloseTo(1326.39, 1);
    expect(threshold(PRODUCT, 10)).toBeLessThan(threshold(PRODUCT));
    expect(threshold(PRODUCT) - threshold(PRODUCT, 10)).toBeCloseTo(20, 0);
  });

  it('clamps the band arm inside the page, the way the overlay arm does', () => {
    const r = room(1349);
    // A change at the very bottom of a short page: the chip would otherwise be
    // placed past the page's own last pixel.
    const page = { ...r.page, height: 200 };
    const place = chipPlace(rect(page.left + 100, 190, 40, 15), page, r.scroll, PRODUCT);
    expect(place.arm).toBe('band');
    expect(place.top + PRODUCT.height).toBeLessThanOrEqual(page.height);
  });
});
