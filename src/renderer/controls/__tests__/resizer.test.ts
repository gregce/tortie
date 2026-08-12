/**
 * The divider-drag arithmetic (Phase 18 item 5). These are the properties the
 * three hand-rolled resizers broke, written down so they cannot break again.
 */

import { describe, expect, it } from 'vitest';
import { rawResizeWidth, resizeStep } from '../resizer';

/** A left-anchored panel (the sidebar): left edge at 48, width 280. */
const SIDEBAR = { left: 48, width: 280 };

describe('rawResizeWidth', () => {
  it('keeps the grabbed edge exactly under the cursor from the first move', () => {
    // Grabbed 2px INSIDE the 5px handle, i.e. left of the real edge.
    const edge = SIDEBAR.left + SIDEBAR.width; // 328
    const downX = edge - 2;
    const grabOffset = downX - edge; // -2
    // The first move must not change the width at all.
    expect(
      rawResizeWidth({
        anchor: 'left',
        clientX: downX,
        grabOffset,
        fixedEdge: SIDEBAR.left
      })
    ).toBe(SIDEBAR.width);
  });

  it('is lossless across a clamp excursion and back', () => {
    const edge = SIDEBAR.left + SIDEBAR.width;
    const grabOffset = 0;
    const at = (x: number): number =>
      rawResizeWidth({
        anchor: 'left',
        clientX: x,
        grabOffset,
        fixedEdge: SIDEBAR.left
      });
    // Way past any plausible max…
    expect(at(edge + 900)).toBe(SIDEBAR.width + 900);
    // …and back to where it started: the raw width returns exactly, which is
    // what makes the CLAMPED render snap back under the cursor.
    expect(at(edge)).toBe(SIDEBAR.width);
    expect(at(edge - 400)).toBe(SIDEBAR.width - 400);
  });

  it('measures a right-anchored panel from its own right edge, not the window', () => {
    // Editor panel 500 wide, right edge at 1240 because a 200px dock sits to
    // its right in a 1440px window. The old code used window.innerWidth here
    // and jumped by the dock's whole width.
    const panelRight = 1240;
    const width = 500;
    const edge = panelRight - width; // 740
    const grabOffset = 0;
    expect(
      rawResizeWidth({
        anchor: 'right',
        clientX: edge,
        grabOffset,
        fixedEdge: panelRight
      })
    ).toBe(width);
    // Dragging left grows it.
    expect(
      rawResizeWidth({
        anchor: 'right',
        clientX: edge - 120,
        grabOffset,
        fixedEdge: panelRight
      })
    ).toBe(width + 120);
  });

  it('converts visual pointer travel into layout px under a CSS zoom', () => {
    const edge = SIDEBAR.left + SIDEBAR.width;
    expect(
      rawResizeWidth({
        anchor: 'left',
        clientX: edge + 150,
        grabOffset: 0,
        fixedEdge: SIDEBAR.left,
        zoom: 1.5
      })
    ).toBeCloseTo((SIDEBAR.width + 150) / 1.5, 6);
  });
});

// ---------------------------------------------------------------------------
// Snapping a region shut must not cost the user their width
// ---------------------------------------------------------------------------

/**
 * Replays a whole gesture through `resizeStep` — the same function the hook's
 * `onMove` calls — and reports what the store would hold afterwards.
 *
 * The defect this pins: `onMove` used to clamp every sample to `min` and
 * persist it, so a drag from 400px to shut walked the stored width down to the
 * 220px floor before the snap fired. Hiding by drag then produced a different
 * state from hiding by the activity-bar icon, which writes no width at all —
 * and the phase's whole contract for that gesture is "the same state the
 * toggle produces".
 */
function replay(input: {
  anchor: 'left' | 'right';
  fixedEdge: number;
  startWidth: number;
  min: number;
  max: number;
  snapAt?: number;
  /** Cursor positions, in order. */
  xs: number[];
}): { stored: number; writes: number[]; snapped: boolean } {
  const writes: number[] = [];
  let last = input.startWidth;
  let snapped = false;
  for (const clientX of input.xs) {
    if (snapped) continue; // the hook ignores the rest of a snapped gesture
    const raw = rawResizeWidth({
      anchor: input.anchor,
      clientX,
      grabOffset: 0,
      fixedEdge: input.fixedEdge
    });
    const step = resizeStep({
      raw,
      min: input.min,
      max: input.max,
      last,
      startWidth: input.startWidth,
      ...(input.snapAt === undefined ? {} : { snapAt: input.snapAt })
    });
    if (step.kind === 'none') continue;
    last = step.width;
    writes.push(step.width);
    if (step.kind === 'snap') snapped = true;
  }
  return { stored: last, writes, snapped };
}

describe('drag-to-hide preserves the chosen width', () => {
  /** The sidebar: pinned to the activity bar at 48, floor 220, snap 140. */
  const sidebar = {
    anchor: 'left' as const,
    fixedEdge: 48,
    min: 220,
    max: 720,
    snapAt: 140
  };

  it('restores the pre-drag width when a slow drag snaps it shut', () => {
    const startWidth = 400;
    // 1px samples all the way in — the pathological case, and the one a real
    // pointer produces at 120Hz.
    const xs: number[] = [];
    for (let x = 48 + startWidth; x >= 48 + 100; x -= 1) xs.push(x);

    const { stored, snapped } = replay({ ...sidebar, startWidth, xs });
    expect(snapped).toBe(true);
    expect(stored).toBe(startWidth); // was 220 — the floor the drag walked to
  });

  it('stores the same width however fast the pointer was sampled', () => {
    const startWidth = 400;
    const slow: number[] = [];
    for (let x = 48 + startWidth; x >= 48 + 100; x -= 1) slow.push(x);
    // A flick: two samples, straight past the snap threshold.
    const fast = [48 + startWidth, 48 + 100];

    const a = replay({ ...sidebar, startWidth, xs: slow });
    const b = replay({ ...sidebar, startWidth, xs: fast });
    expect(a.stored).toBe(b.stored);
    expect(a.snapped && b.snapped).toBe(true);
    // The stored value used to depend on the sampling rate: 220 vs 400.
    expect(a.stored).toBe(startWidth);
  });

  it('still commits an ordinary resize that does not snap', () => {
    const { stored, snapped } = replay({
      ...sidebar,
      startWidth: 400,
      xs: [48 + 400, 48 + 500, 48 + 600]
    });
    expect(snapped).toBe(false);
    expect(stored).toBe(600);
  });

  it('does the same for the session dock, which snaps to its rail', () => {
    // Right-anchored, right edge at the window edge (1440), floor 160, snap
    // 100 — the dock's real numbers.
    const startWidth = 280;
    const xs: number[] = [];
    for (let x = 1440 - startWidth; x <= 1440 - 60; x += 1) xs.push(x);
    const { stored, snapped } = replay({
      anchor: 'right',
      fixedEdge: 1440,
      min: 160,
      max: 320,
      snapAt: 100,
      startWidth,
      xs
    });
    expect(snapped).toBe(true);
    expect(stored).toBe(startWidth); // was 160
  });

  it('never snaps a region that has no collapse toggle (the editor)', () => {
    const startWidth = 500;
    const xs: number[] = [];
    for (let x = 1440 - startWidth; x <= 1440 - 10; x += 1) xs.push(x);
    const { stored, snapped } = replay({
      anchor: 'right',
      fixedEdge: 1440,
      min: 320,
      max: 900,
      startWidth,
      xs
    });
    expect(snapped).toBe(false);
    expect(stored).toBe(320); // parks on its floor, exactly as before
  });
});
