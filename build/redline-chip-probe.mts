/**
 * redline-chip-probe.mts — rules 33 and 34 of `npm run conformance:redline`
 * (Phase 251), run under node over the SHIPPING chip module.
 *
 * It prints one JSON object and judges nothing; `build/conformance-redline.mjs`
 * judges it, and re-runs this probe over ablated copies of the module so an arm
 * that cannot fail is not mistaken for one that passed.
 *
 * `CHIP_DIR` names the directory the module is imported from, which is
 * `src/renderer/editor` for the shipping reading and a copy with one clause
 * removed for an ablation.
 *
 * It launches no Electron, opens no window, starts no tmux server, spawns
 * nothing, makes no request and reads nothing under the person's home. It
 * reads no file at all: every rectangle below is composed here.
 *
 * WHAT THIS PROBE IS AND IS NOT. `chipPlace` is a pure decision, so this drives
 * the DECISION with the geometry research 113 and 114 measured — the app's own
 * `ch` of 8.1885px, the 84-character measure, the 20px rail and its 12px
 * gutter, the ten pixels between a panel and its scroller, and the product's
 * own 258.28px chip. It is NOT a reading of the running app's layout: the
 * stylesheet's own arithmetic is `npm run probe:p249`'s to read off the face,
 * and rule 33 is what holds the two grids that produce it to each other.
 */

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = process.env.CHIP_DIR ?? 'src/renderer/editor';
const url = (name: string): string => pathToFileURL(join(process.cwd(), DIR, name)).href;

interface Rect {
  left: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}
interface Place {
  left: number;
  top: number;
  arm: 'band' | 'overlay';
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
const chip = (await import(url('redline-chip.tsx'))) as {
  chipPlace: (
    rect: Rect,
    page: Rect,
    scroll: Rect,
    size: { width: number; height: number }
  ) => Place;
  chipAnchorRect: (el: {
    getClientRects: () => ArrayLike<Rect>;
    getBoundingClientRect?: () => Rect;
  }) => Rect | undefined;
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

const rect = (left: number, top: number, width: number, height: number): Rect => ({
  left,
  top,
  bottom: top + height,
  width,
  height
});

// ---------------------------------------------------------------------------
// THE ROOM, composed from the design's own arithmetic and research 113's own
// readings, so every number below is comparable with research 114 §2's table.
//
//   ch                8.1885px      research 113 §1, 556.816 / 68
//   measure           84ch          research 114 §6.1
//   inline padding    24px each     --space-8, OUTSIDE the measure now
//   rail / gutter     20px / 12px   --space-5, and 3px / 4px at the floor
//   panel − scroller  10px          research 113 §0, at all three widths
// ---------------------------------------------------------------------------
const CH = 556.816 / 68;
const MEASURE = 84 * CH;
const PAD = 24;
const COLUMN = MEASURE + PAD * 2;

interface Room {
  scroll: Rect;
  page: Rect;
}
function room(panel: number): Room {
  const scrollW = panel - 10;
  // The rail ladder's floor, being `REDLINE_RAIL_FLOOR` in ./RedlineDocument,
  // spelled again here rather than imported: importing it would pull the whole
  // view's React tree into a probe that exists to drive two pure functions.
  // None of the three panes below is near it, so the model and the ladder
  // cannot disagree about any reading this probe takes.
  const rail = scrollW >= 449 ? 20 : 3;
  const gutter = scrollW >= 449 ? 12 : 4;
  const column = Math.min(COLUMN, scrollW - rail - gutter);
  const pageW = rail + gutter + column;
  const scroll = rect(0, 0, scrollW, 800);
  const page = rect((scrollW - pageW) / 2, 0, pageW, 1600);
  return { scroll, page };
}

/** The product's own chip, measured on the running app (research 113 §4). */
const PRODUCT = { width: 258.28, height: 30 };
/** The mock's chip, measured on the live page (research 114 §9). */
const MOCK = { width: 223.1, height: 30 };
/** The same four buttons relabelled, measured in research 99 section 7.3. */
const RELABELLED = { width: 299.07, height: 30 };

/** A change in the middle of the column, three lines down. */
function change(r: Room): Rect {
  return rect(r.page.left + 20 + 12 + PAD + 40, 200, 44.7, 15);
}

// 1. THE ARMS, over the three panes research 113 measured and three chips.
const CHIPS: [string, { width: number; height: number }][] = [
  ['product', PRODUCT],
  ['mock', MOCK],
  ['relabelled', RELABELLED]
];
const arms: Record<string, { arm: string; left: number; top: number; fits: boolean }> = {};
for (const panel of [1349, 699, 319]) {
  const r = room(panel);
  for (const [name, size] of CHIPS) {
    const c = change(r);
    const place = chip.chipPlace(c, r.page, r.scroll, size);
    // THE TEST AND THE PLACEMENT ARE THE SAME ARITHMETIC, and this is the
    // reading that says so: a chip the arm accepted must really fit inside the
    // box it was accepted for.
    const right = r.page.left + place.left + size.width;
    arms[`${String(panel)}/${name}`] = {
      arm: place.arm,
      left: Number(place.left.toFixed(2)),
      top: Number(place.top.toFixed(2)),
      fits: right <= r.scroll.left + r.scroll.width + 0.001
    };
  }
}

// 2. THE THRESHOLD, bisected out of the shipping decision rather than derived
//    by hand: the narrowest panel at which each chip takes the band.
function threshold(size: { width: number; height: number }): number {
  let lo = 400;
  let hi = 4000;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    const r = room(mid);
    if (chip.chipPlace(change(r), r.page, r.scroll, size).arm === 'band') hi = mid;
    else lo = mid;
  }
  return hi;
}
// The bisection answers a PANEL width; the scroller is ten pixels narrower
// (research 113 §0, at all three of its widths). Both are printed because
// research 114 §4.2 publishes its own two thresholds against "a pane" and its
// arithmetic is the SCROLLER's: 767.83 + 2 x (223.1 + 16) is 1246.0, which is
// the number it prints for the mock's chip. The shipping rule asks the
// scroller on purpose — `chipPlace`'s header says why — so the PANEL a person
// drags is about ten pixels wider than §4.2's figure, and that is a correction
// to it rather than a disagreement with it.
const thresholds = {
  productScroller: Number((threshold(PRODUCT) - 10).toFixed(2)),
  productPanel: Number(threshold(PRODUCT).toFixed(2)),
  mockScroller: Number((threshold(MOCK) - 10).toFixed(2)),
  relabelledScroller: Number((threshold(RELABELLED) - 10).toFixed(2))
};

// 3. THE ANCHOR. Research 96 §4.3's own numbers, and the mandatory rule.
const first = rect(1185.82, 433.23, 44.7, 15);
const union = rect(750.09, 433.23, 480.43, 36.45);
const asked: string[] = [];
const anchored = chip.chipAnchorRect({
  getClientRects: () => {
    asked.push('getClientRects');
    return [first, rect(0, 433.23, 10, 15), rect(750.09, 454.68, 20, 15)];
  },
  getBoundingClientRect: () => {
    asked.push('getBoundingClientRect');
    return union;
  }
});
const view = rect(569, 110, 871, 775);
const anchor = {
  isFirstRect: anchored?.left === first.left && anchored.top === first.top,
  asked: asked.join('|'),
  none: chip.chipAnchorRect({ getClientRects: () => [] }) === undefined,
  // The same displacement research 96 §4.5 measured, taken through the
  // shipping placement: the bounding box points 435.73px into empty margin.
  displacement: Number(
    (
      chip.chipPlace(first, view, view, { width: 200, height: 28 }).left -
      chip.chipPlace(union, view, view, { width: 200, height: 28 }).left
    ).toFixed(2)
  )
};

// 4. THE OVERLAY ARM, which is required and not a fallback: research 96 §4.1
//    and research 113 §7.3 each read 0.00px of free canvas at the floor.
const floor = room(319);
const overlay = {
  band: Number((floor.scroll.left + floor.scroll.width - (floor.page.left + floor.page.width)).toFixed(2)),
  // A change at the far right of the column, clamped so the chip stays inside
  // the page rather than growing the scroller sideways.
  clampedRight: Number(
    chip.chipPlace(
      rect(floor.page.left + floor.page.width - 8, 400, 8, 15),
      floor.page,
      floor.scroll,
      PRODUCT
    ).left.toFixed(2)
  ),
  clampedLeft: Number(
    chip.chipPlace(rect(floor.page.left, 400, 8, 15), floor.page, floor.scroll, PRODUCT).left.toFixed(2)
  ),
  // Above the line box when there is room, below it when there is not.
  above: Number(
    chip.chipPlace(rect(floor.page.left + 10, 400, 8, 15), floor.page, floor.scroll, PRODUCT).top.toFixed(2)
  ),
  below: Number(
    chip.chipPlace(rect(floor.page.left + 10, 2, 8, 15), floor.page, floor.scroll, PRODUCT).top.toFixed(2)
  )
};

// 5. THE PAGE IS THE CONTAINING BLOCK IN BOTH ARMS. Move the page inside the
//    scroller and the overlay answer moves with it by exactly as much, which
//    is what "measured against the page" means and what a placement against
//    the view could not do. The band answer does not move at all, because it
//    is the page's own width plus the gutter and nothing else — which is the
//    same fact from the other side.
const mid = room(699);
const midChange = rect(mid.page.left + 50, 400, 8, 15);
const midShifted = rect(mid.page.left - 100, mid.page.top - 50, mid.page.width, mid.page.height);
const wide = room(1349);
const c0 = change(wide);
const wideShifted = rect(wide.page.left - 30, wide.page.top, wide.page.width, wide.page.height);
const containing = {
  overlayLeftShift: Number(
    (
      chip.chipPlace(midChange, midShifted, mid.scroll, PRODUCT).left -
      chip.chipPlace(midChange, mid.page, mid.scroll, PRODUCT).left
    ).toFixed(2)
  ),
  overlayTopShift: Number(
    (
      chip.chipPlace(midChange, midShifted, mid.scroll, PRODUCT).top -
      chip.chipPlace(midChange, mid.page, mid.scroll, PRODUCT).top
    ).toFixed(2)
  ),
  bandLeft: Number(chip.chipPlace(c0, wide.page, wide.scroll, PRODUCT).left.toFixed(2)),
  bandLeftShifted: Number(
    chip.chipPlace(c0, wideShifted, wide.scroll, PRODUCT).left.toFixed(2)
  ),
  bandTopFollowsTheChange: Number(
    (
      chip.chipPlace(c0, wideShifted, wide.scroll, PRODUCT).top -
      chip.chipPlace(c0, wide.page, wide.scroll, PRODUCT).top
    ).toFixed(2)
  )
};

process.stdout.write(
  `${JSON.stringify({
    geometry: {
      ch: Number(CH.toFixed(4)),
      column: Number(COLUMN.toFixed(2)),
      pageAt1349: Number(wide.page.width.toFixed(2)),
      bandAt1349: Number(
        (wide.scroll.left + wide.scroll.width - (wide.page.left + wide.page.width)).toFixed(2)
      )
    },
    arms,
    thresholds,
    anchor,
    overlay,
    containing
  })}\n`
);
