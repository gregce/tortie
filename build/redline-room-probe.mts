/**
 * The readings `npm run conformance:redline` rule 34 grades (Phase 251).
 *
 * It runs the SHIPPING `src/renderer/editor/redline-room.ts` under node and
 * prints what it answered, so the rule judges a computation rather than a
 * source file. The directory holding that module is the first argument, which
 * is what lets the gate hand it an ABLATED copy: a rule whose ablation cannot
 * move a reading is not a rule.
 *
 * It launches nothing, opens nothing, reads nothing under the person's home
 * and writes nothing. The module it imports has no imports of its own.
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const dir = process.argv[2] ?? 'src/renderer/editor';
const mod = (await import(
  pathToFileURL(resolve(dir, 'redline-room.ts')).href
)) as {
  ROOM_VALUES: readonly string[];
  REDLINE_RAIL_FLOOR: number;
  roomFor: (w: number) => string;
  railBarFor: (
    rects: ArrayLike<{ top: number; bottom: number }>,
    railTop: number
  ) => { top: number; height: number } | null;
};

const R = (top: number, bottom: number): { top: number; bottom: number } => ({ top, bottom });

/**
 * The three scroller widths research 113 measured, the ladder's own floor from
 * either side, and a pane narrower than anything the divider offers.
 */
const WIDTHS = [1339, 689, 309, mod.REDLINE_RAIL_FLOOR, mod.REDLINE_RAIL_FLOOR - 1, 0];

/**
 * The four shapes a current change's rect list really takes: one line box, the
 * eighteen-fragment paragraph research 114 §0.1 measured at the operator's own
 * pane, a change the recompose has taken away, and a rect that has collapsed
 * to no height at all.
 */
const BARS = {
  oneLine: mod.railBarFor([R(100, 115)], 40),
  wrapped: mod.railBarFor(
    Array.from({ length: 18 }, (_, i) => R(100 + i * 21.45, 115 + i * 21.45)),
    40
  ),
  gone: mod.railBarFor([], 40),
  collapsed: mod.railBarFor([R(100, 100)], 40),
  /** The rail's own top is subtracted, so a scrolled page reads the same bar. */
  scrolled: mod.railBarFor([R(-260, -245)], -320)
};

console.log(
  JSON.stringify(
    {
      values: [...mod.ROOM_VALUES],
      floor: mod.REDLINE_RAIL_FLOOR,
      rooms: Object.fromEntries(WIDTHS.map((w) => [String(w), mod.roomFor(w)])),
      bars: BARS
    },
    null,
    2
  )
);
