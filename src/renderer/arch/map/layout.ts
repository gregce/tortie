/**
 * The map layout, being model in, positions out (Phase 160).
 *
 * Pure arithmetic in the `scm/graph/layout.ts` mould: no React, no DOM, no
 * bridge. The geometry module turns these positions into path strings and the
 * component renders one `<svg>`; this file only decides WHERE things sit.
 *
 * ## The layout rule, in full, so nobody has to reverse engineer it
 *
 * 1. **Rows are the three bands** the skeleton computes: surface on top,
 *    engine in the middle, foundation at the bottom. A band with no groups
 *    collapses and costs no height.
 * 2. **Order within a row is one barycenter pass.** Each row starts in id
 *    order. A box's x-order key is the MEAN of the normalised initial
 *    positions of its edge partners in the ADJACENT rows, computed once from
 *    that id-sorted initial order; a box with no adjacent partners keeps its
 *    own normalised position as the key. Ties break by id. One pass, no
 *    iteration to a fixed point, no randomness, and with at most nine boxes and
 *    the measured one or two cross band edges this is already near optimal.
 * 3. **Weight is area.** Both sides of a box scale with the square root of
 *    its file count relative to the largest group, between fixed bounds, so
 *    area tracks file count and the one file box stays readable next to the
 *    seventeen hundred file box. Every coordinate lands on the 4px grid.
 * 4. **Rows are centred** on the widest row, stacked with a fixed gap that
 *    leaves room for the edges to curve through.
 *
 * ## Determinism, stated as a property
 *
 * Groups and edges are re-sorted canonically HERE, so even a model whose
 * arrays arrive in a different order draws the same picture. Every number is
 * integer arithmetic on the 4px grid. Same facts, same bytes, asserted in
 * `__tests__/map-render.test.tsx` by rendering twice and comparing strings.
 *
 * ## What a later phase adds without rewriting this
 *
 * Drill down (Phase 161) re-runs this same layout over a scoped model, and
 * pan or zoom (Phase 162) is a transform on the finished SVG. Nothing here
 * assumes it is drawing the top level.
 */

import {
  BAND_ORDER,
  normalizeBand,
  type ArchMapBand,
  type ArchMapGroup,
  type ArchMapModel
} from './types';
import {
  MAP_BAND_COL,
  MAP_BOX_GAP,
  MAP_BOX_MAX_H,
  MAP_BOX_MAX_W,
  MAP_BOX_MIN_H,
  MAP_BOX_MIN_W,
  MAP_PAD,
  MAP_ROW_GAP,
  MAP_SAME_ROW_DIP,
  MAP_SAME_ROW_STEP,
  grid4
} from './geometry';

/** One placed box. */
export interface MapBox {
  group: ArchMapGroup;
  band: ArchMapBand;
  /** Row index, top down, over the bands that actually drew. */
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One drawn row, for the band label and the tests. */
export interface MapRow {
  band: ArchMapBand;
  y: number;
  h: number;
}

/** The finished layout: everything the geometry and the component need. */
export interface MapLayout {
  boxes: readonly MapBox[];
  rows: readonly MapRow[];
  /** Fast lookup for the edge planner. */
  boxById: ReadonlyMap<string, MapBox>;
  width: number;
  height: number;
}

/** Canonical group order: band first (top down), then id. */
function sortGroups(groups: readonly ArchMapGroup[]): ArchMapGroup[] {
  return [...groups].sort((a, b) => {
    const ba = BAND_ORDER.indexOf(normalizeBand(a.band));
    const bb = BAND_ORDER.indexOf(normalizeBand(b.band));
    if (ba !== bb) return ba - bb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** A box's side, scaled by sqrt of relative file count, on the 4px grid. */
function boxSide(
  fileCount: number,
  maxFileCount: number,
  min: number,
  max: number
): number {
  const safeMax = Math.max(1, maxFileCount);
  const ratio = Math.sqrt(Math.max(0, fileCount) / safeMax);
  return grid4(min + ratio * (max - min));
}

/** Normalised position of index `i` in a row of `n`: 0.5 for a lone box. */
function normalPos(i: number, n: number): number {
  return n <= 1 ? 0.5 : i / (n - 1);
}

/**
 * Lay the model out. O(groups × edges) with nine boxes at most, so the cost
 * is unmeasurable beside the scan that produced the facts.
 */
export function layoutMap(model: ArchMapModel): MapLayout {
  const groups = sortGroups(model.groups);

  // Rows: the non-empty bands, in fixed top-down order.
  const byBand = new Map<ArchMapBand, ArchMapGroup[]>();
  for (const group of groups) {
    const band = normalizeBand(group.band);
    const list = byBand.get(band);
    if (list === undefined) byBand.set(band, [group]);
    else list.push(group);
  }
  const bands = BAND_ORDER.filter((band) => byBand.has(band));

  // Initial order per row is id order (sortGroups already guarantees it),
  // remembered as normalised positions for the barycenter pass.
  const rowOf = new Map<string, number>();
  const initialPos = new Map<string, number>();
  bands.forEach((band, rowIndex) => {
    const row = byBand.get(band) ?? [];
    row.forEach((group, i) => {
      rowOf.set(group.id, rowIndex);
      initialPos.set(group.id, normalPos(i, row.length));
    });
  });

  // Partners in the adjacent rows, either direction, from the edge list.
  const partners = new Map<string, string[]>();
  const addPartner = (id: string, other: string): void => {
    const list = partners.get(id);
    if (list === undefined) partners.set(id, [other]);
    else list.push(other);
  };
  for (const edge of model.edges) {
    const fromRow = rowOf.get(edge.from);
    const toRow = rowOf.get(edge.to);
    if (fromRow === undefined || toRow === undefined) continue;
    if (Math.abs(fromRow - toRow) !== 1) continue;
    addPartner(edge.from, edge.to);
    addPartner(edge.to, edge.from);
  }

  // One barycenter pass per row, keys from the INITIAL order only, so the
  // pass cannot feed back into itself. Ties break by id.
  const ordered = bands.map((band) => {
    const row = byBand.get(band) ?? [];
    const keyed = row.map((group) => {
      const around = partners.get(group.id) ?? [];
      let key: number;
      if (around.length === 0) {
        key = initialPos.get(group.id) ?? 0.5;
      } else {
        let sum = 0;
        for (const other of around) sum += initialPos.get(other) ?? 0.5;
        key = sum / around.length;
      }
      return { group, key };
    });
    keyed.sort((a, b) => {
      if (a.key !== b.key) return a.key - b.key;
      return a.group.id < b.group.id ? -1 : 1;
    });
    return keyed.map((k) => k.group);
  });

  // Sizes.
  let maxFiles = 1;
  for (const group of groups) maxFiles = Math.max(maxFiles, group.fileCount);
  const sized = ordered.map((row) =>
    row.map((group) => ({
      group,
      w: boxSide(group.fileCount, maxFiles, MAP_BOX_MIN_W, MAP_BOX_MAX_W),
      h: boxSide(group.fileCount, maxFiles, MAP_BOX_MIN_H, MAP_BOX_MAX_H)
    }))
  );

  // Widths, then centre every row on the widest one.
  const rowWidths = sized.map((row) => {
    let w = 0;
    row.forEach((box, i) => {
      w += box.w + (i > 0 ? MAP_BOX_GAP : 0);
    });
    return w;
  });
  const contentW = Math.max(0, ...rowWidths);
  const width = MAP_BAND_COL + MAP_PAD + contentW + MAP_PAD;

  // Stack the rows.
  const boxes: MapBox[] = [];
  const rows: MapRow[] = [];
  let y = MAP_PAD;
  sized.forEach((row, rowIndex) => {
    const band = bands[rowIndex] as ArchMapBand;
    let rowH = MAP_BOX_MIN_H;
    for (const box of row) rowH = Math.max(rowH, box.h);
    let x = grid4(MAP_BAND_COL + MAP_PAD + (contentW - (rowWidths[rowIndex] ?? 0)) / 2);
    for (const box of row) {
      const boxY = grid4(y + (rowH - box.h) / 2);
      boxes.push({
        group: box.group,
        band,
        row: rowIndex,
        x,
        y: boxY,
        w: box.w,
        h: box.h
      });
      x += box.w + MAP_BOX_GAP;
    }
    rows.push({ band, y, h: rowH });
    y += rowH + MAP_ROW_GAP;
  });
  let height = rows.length > 0 ? y - MAP_ROW_GAP + MAP_PAD : MAP_PAD * 2;

  // A same-row edge in the LAST row dips below it; give the dip its room.
  const lastRow = rows.length - 1;
  let lastRowSame = 0;
  for (const edge of model.edges) {
    if (edge.from === edge.to) continue;
    if (rowOf.get(edge.from) === lastRow && rowOf.get(edge.to) === lastRow) {
      lastRowSame += 1;
    }
  }
  if (lastRowSame > 0) {
    height += MAP_SAME_ROW_DIP + MAP_SAME_ROW_STEP * (lastRowSame - 1) + MAP_PAD;
  }

  const boxById = new Map<string, MapBox>();
  for (const box of boxes) boxById.set(box.group.id, box);

  return { boxes, rows, boxById, width, height };
}
