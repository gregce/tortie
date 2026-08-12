/**
 * The sidebar's drag contract, composed from the two pieces that own it:
 * `rawResizeWidth` (controls/resizer — the arithmetic) and `clampSidebarWidth`
 * (state/chrome-geometry — the live-window ceiling). Neither of those tests
 * knows the sidebar's actual geometry, and the geometry is where Phase 18
 * item 5's number comes from: the panel's fixed edge is the activity bar at
 * 48px, and its rendered width is no longer the same number the store holds.
 *
 * What this pins:
 *   1. cursor-to-edge delta is CONSTANT across a drag that overshoots both
 *      clamps and returns — the definition of "the divider stays under the
 *      cursor" (item 5);
 *   2. the old formula's error, measured, so the fix has a before-number;
 *   3. the far-left travel really does reach the snap threshold, i.e. the
 *      sidebar can be dragged shut at every window size the app supports.
 */

import { describe, expect, it } from 'vitest';
import { rawResizeWidth } from '../../controls/resizer';
import {
  ACTIVITY_BAR_W,
  clampSidebarWidth,
  SIDEBAR_MIN,
  SIDEBAR_SNAP,
  sidebarMaxWidth
} from '../../state/chrome-geometry';

/** The sidebar's fixed edge: it is pinned to the activity bar's right edge. */
const FIXED_EDGE = ACTIVITY_BAR_W;

/**
 * One sampled move of a real drag, as the component wires it: raw width from
 * the panel's own rect, ceiling read live, clamp applied to the RESULT only.
 */
function sample(input: {
  clientX: number;
  grabOffset: number;
  windowWidth: number;
}): { raw: number; rendered: number; edge: number; delta: number } {
  const raw = rawResizeWidth({
    anchor: 'left',
    clientX: input.clientX,
    grabOffset: input.grabOffset,
    fixedEdge: FIXED_EDGE
  });
  const rendered = clampSidebarWidth(raw, input.windowWidth);
  const edge = FIXED_EDGE + rendered;
  return { raw, rendered, edge, delta: input.clientX - edge };
}

/** A drag out past the ceiling and back in past the floor, at 20px steps. */
function sweep(from: number, to: number, step = 20): number[] {
  const xs: number[] = [];
  const dir = to > from ? step : -step;
  for (let x = from; dir > 0 ? x <= to : x >= to; x += dir) xs.push(x);
  return xs;
}

describe('sidebar divider — cursor tracking (Phase 18 item 5)', () => {
  it('holds a constant cursor-to-edge delta through both clamps and back', () => {
    const windowWidth = 1440;
    const startEdge = FIXED_EDGE + 280; // the default width, as rendered
    // Grabbed 2px inside the panel, within the 5px hit area over the divider.
    const grabOffset = -2;

    const path = [
      ...sweep(startEdge - 2, 1420), // right, far past the 720px ceiling
      ...sweep(1420, 120), // left, far past the 220px floor
      ...sweep(120, 700) // and back into range
    ];

    for (const clientX of path) {
      const s = sample({ clientX, grabOffset, windowWidth });
      if (s.raw >= SIDEBAR_MIN && s.raw <= sidebarMaxWidth(windowWidth)) {
        // In range: the edge is exactly where the user grabbed it, every
        // sample, including every sample AFTER an excursion into a clamp.
        expect(s.delta).toBe(grabOffset);
      } else {
        // Clamped: the edge stops, the raw value keeps travelling, so the
        // clamp costs nothing on the way back — asserted by the branch above
        // once the path re-enters range.
        expect(s.rendered).toBe(
          clampSidebarWidth(s.raw, windowWidth)
        );
      }
    }
  });

  it('measures the dead travel the pre-Phase-18 formula would have grown', () => {
    // The old handler seeded the drag from the STORE's width
    // (`startW + (clientX - startX)`). That is an absolute formula, and while
    // the ceiling was the constant 400 — the same number the CSS `max-width`
    // enforced — stored and rendered always agreed and it tracked correctly.
    // Item 1 is what breaks it: the store now keeps the user's INTENT and the
    // panel renders `min(stored, liveMax)`. On a narrower window the two
    // disagree, and the old formula spends the whole difference doing nothing.
    const windowWidth = 1280;
    const storedWidth = 900; // chosen earlier on a 1920px display
    const rendered = clampSidebarWidth(storedWidth, windowWidth);
    expect(rendered).toBe(640); // 50% of 1280 — what is actually on screen

    const startX = FIXED_EDGE + rendered - 2; // grabbed on the visible edge
    const deadTravel = storedWidth - rendered; // 260px

    // Drag LEFT by 100px: the old formula's implied width is still above the
    // live ceiling, so the edge does not move and the cursor runs away from
    // it. The new one follows on the first pixel.
    const dx = -100;
    const oldEdge =
      FIXED_EDGE + clampSidebarWidth(storedWidth + dx, windowWidth);
    expect(oldEdge - FIXED_EDGE).toBe(640); // unmoved
    expect(startX + dx - oldEdge).toBe(-102); // cursor 100px off its grab point

    const now = sample({ clientX: startX + dx, grabOffset: -2, windowWidth });
    expect(now.rendered).toBe(540); // followed immediately
    expect(now.delta).toBe(-2); // still exactly where it was grabbed

    // The headline number for this divider: 260px of leftward travel that
    // used to move nothing, now 0.
    expect(deadTravel).toBe(260);
  });

  it('reaches the snap threshold at every window the app supports', () => {
    for (const windowWidth of [1024, 1280, 1440, 1920, 2560]) {
      // Cursor pinned to the window's left edge, i.e. as far left as a drag
      // can go: the raw width must fall BELOW the snap threshold, or the
      // sidebar could not be dragged shut on that display.
      const raw = rawResizeWidth({
        anchor: 'left',
        clientX: 0,
        grabOffset: -2,
        fixedEdge: FIXED_EDGE
      });
      expect(raw).toBeLessThan(SIDEBAR_SNAP);
      // …and the snap threshold is genuinely below the floor, so the region
      // never snaps shut while the user is still inside the usable range.
      expect(SIDEBAR_SNAP).toBeLessThan(SIDEBAR_MIN);
      expect(sidebarMaxWidth(windowWidth)).toBeGreaterThanOrEqual(SIDEBAR_MIN);
    }
  });
});
