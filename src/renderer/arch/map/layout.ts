/**
 * The map layout, being model in, positions out (Phase 160, reflowed 161).
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
 *    iteration to a fixed point, no randomness.
 * 3. **Weight is area.** Both sides of a box scale with the square root of
 *    its file count relative to the largest group, between fixed bounds, so
 *    area tracks file count and the one file box stays readable next to the
 *    seventeen hundred file box. Every coordinate lands on the 4px grid.
 * 4. **A band wraps to fit the tab (Phase 161).** The picture is laid out
 *    against the viewport the component is actually drawing into, and a band
 *    whose boxes would make the picture far wider than the tab flows onto
 *    further lines instead. The wrap width is chosen deterministically: every
 *    prefix width of every band is a candidate, and the one whose finished
 *    picture has the aspect ratio closest to the viewport's wins, wider on a
 *    tie. This is what ended the operator's 2026-08-27 screenshot, where nine
 *    one-band boxes drew as a strip across the bottom of an empty tab.
 * 5. **Rows are centred** on the widest row, stacked with fixed gaps that
 *    leave room for the edges to curve through.
 * 6. **A scoped picture keeps its frame (Phase 161).** The crossing edges of
 *    a drilled part enter the layout as stubs, being small labelled tabs in
 *    one row above the picture for the parts that import this one and one
 *    row below it for the parts this one imports, so context is never lost.
 *
 * ## Determinism, stated as a property
 *
 * Groups, edges and frame stubs are re-sorted canonically HERE, so even a
 * model whose arrays arrive in a different order draws the same picture. The
 * viewport is a layout INPUT: the same model in the same viewport is the
 * same layout, byte for byte, asserted in `__tests__/map-render.test.tsx` by
 * rendering twice and comparing strings.
 *
 * ## What a later phase adds without rewriting this
 *
 * Pan and zoom (Phase 162) is a transform on the finished SVG. Nothing here
 * assumes it is drawing the top level: the drill re-runs this same layout
 * over a scoped model, which is exactly what Phase 161 did.
 */

import {
  BAND_ORDER,
  normalizeBand,
  type ArchMapBand,
  type ArchMapFrameEdge,
  type ArchMapGroup,
  type ArchMapModel,
  type ArchMapRegionModel,
  type ArchMapTransportModel
} from './types';
import {
  MAP_BAND_COL,
  MAP_BOX_GAP,
  MAP_BOX_MAX_H,
  MAP_BOX_MAX_W,
  MAP_BOX_MIN_H,
  MAP_BOX_MIN_W,
  MAP_LINE_GAP,
  MAP_OUTSIDE_GAP,
  MAP_OUTSIDE_HEAD_H,
  MAP_PAD,
  MAP_REGION_GAP,
  MAP_REGION_HEAD_H,
  MAP_REGION_PAD,
  MAP_ROW_GAP,
  MAP_SAME_ROW_DIP,
  MAP_SAME_ROW_STEP,
  MAP_STUB_GAP,
  MAP_STUB_H,
  MAP_STUB_ROW_GAP,
  MAP_STUB_W,
  MAP_WIRE_COL,
  MAP_WIRE_H,
  grid4,
  stubKey
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

/** One frame stub: an outside part, kept at the edge of a scoped picture. */
export interface MapStub {
  /** The outside level 1 group's id. */
  id: string;
  label: string;
  /** `in` sits in the top frame row, `out` in the bottom one. */
  direction: 'in' | 'out';
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The surface the picture is being drawn into, in CSS pixels. */
export interface MapViewport {
  width: number;
  height: number;
}

/**
 * The viewport the layout assumes when the component has not measured one
 * yet, being roughly the editor area of the default window. One constant, so
 * a render with no measurement is still deterministic.
 */
export const MAP_DEFAULT_VIEWPORT: MapViewport = { width: 1152, height: 704 };

/**
 * Phase 258: one region's frame, being a rounded rectangle around the boxes
 * one unit owns, with its heading block and its own band words. The Outside
 * band is a frame too, with no boxes and its wires listed inside it.
 */
export interface MapRegionFrame {
  region: ArchMapRegionModel;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The band rows INSIDE this frame, already offset, for the band words. */
  rows: readonly MapRow[];
  /** Where this frame's band words draw, the frame's own left column. */
  bandX: number;
}

/**
 * Phase 258: one drawn transport. A wire between two adjacent frames sits in
 * the column between them; one to or from Outside sits inside the band; one
 * between two frames that are not adjacent sits in the row under the frames
 * with both names on it, so nothing the composer counted goes undrawn.
 */
export interface MapWire {
  transport: ArchMapTransportModel;
  /** The text the wire says, arrow included. */
  text: string;
  /** `forward` runs left to right (or into Outside); `back` the other way. */
  direction: 'forward' | 'back';
  x: number;
  y: number;
  w: number;
}

/** The finished layout: everything the geometry and the component need. */
export interface MapLayout {
  boxes: readonly MapBox[];
  /**
   * The band rows for the band words. EMPTY when the picture has regions:
   * each frame then carries its own rows, offset into the frame.
   */
  rows: readonly MapRow[];
  /** Fast lookup for the edge planner. */
  boxById: ReadonlyMap<string, MapBox>;
  /** Phase 161: the frame stubs of a scoped picture, empty at level 1. */
  stubs: readonly MapStub[];
  stubByKey: ReadonlyMap<string, MapStub>;
  /** Phase 258: the region frames, empty on a regionless picture. */
  regions: readonly MapRegionFrame[];
  /** Phase 258: the drawn transports, empty on a regionless picture. */
  wires: readonly MapWire[];
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

/** A sized box, before it has a place. */
interface SizedBox {
  group: ArchMapGroup;
  w: number;
  h: number;
}

/** One band flowed at a wrap width: its lines, its width and its height. */
interface FlowedBand {
  lines: SizedBox[][];
  lineWidths: number[];
  width: number;
  height: number;
}

/** Flow one band's boxes into lines no wider than `wrapW`, order kept. */
function flowBand(row: readonly SizedBox[], wrapW: number): FlowedBand {
  const lines: SizedBox[][] = [];
  let line: SizedBox[] = [];
  let lineW = 0;
  for (const box of row) {
    const grown = line.length === 0 ? box.w : lineW + MAP_BOX_GAP + box.w;
    if (line.length > 0 && grown > wrapW) {
      lines.push(line);
      line = [box];
      lineW = box.w;
    } else {
      line = [...line, box];
      lineW = grown;
    }
  }
  if (line.length > 0) lines.push(line);

  const lineWidths = lines.map((l) =>
    l.reduce((w, box, i) => w + box.w + (i > 0 ? MAP_BOX_GAP : 0), 0)
  );
  let height = 0;
  lines.forEach((l, i) => {
    let lineH = MAP_BOX_MIN_H;
    for (const box of l) lineH = Math.max(lineH, box.h);
    height += lineH + (i > 0 ? MAP_LINE_GAP : 0);
  });
  return { lines, lineWidths, width: Math.max(0, ...lineWidths), height };
}

/** The stubs a frame needs on one side, one per outside part, sorted by id. */
function sideStubs(
  frame: readonly ArchMapFrameEdge[],
  direction: 'in' | 'out'
): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const edge of frame) {
    if (edge.direction !== direction) continue;
    if (!seen.has(edge.outsideId)) seen.set(edge.outsideId, edge.outsideLabel);
  }
  return [...seen.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Width of one frame row of `n` stubs. */
function stubRowWidth(n: number): number {
  return n === 0 ? 0 : n * MAP_STUB_W + (n - 1) * MAP_STUB_GAP;
}

/**
 * Lay the model out against a viewport. O(bands × prefixes × groups), with
 * at most thirty boxes, so the cost is unmeasurable beside the scan that
 * produced the facts.
 *
 * PHASE 258. A model carrying regions is laid out frame by frame through
 * {@link layoutRegions}, which runs THIS SAME band layout once per region and
 * places the frames side by side. A regionless model, being every scoped
 * picture and every model an older main composed, takes the Phase 161 path
 * below byte for byte.
 */
export function layoutMap(
  model: ArchMapModel,
  viewport: MapViewport = MAP_DEFAULT_VIEWPORT
): MapLayout {
  const regions = model.regions ?? [];
  if (regions.length > 0) return layoutRegions(model, regions, viewport);
  return layoutBoxes(model, viewport);
}

/** The Phase 161 band layout, unchanged: rows, wrap, placement, the frame. */
function layoutBoxes(
  model: ArchMapModel,
  viewport: MapViewport
): MapLayout {
  const groups = sortGroups(model.groups);
  const frame = model.frame ?? [];

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
  const sized: SizedBox[][] = ordered.map((row) =>
    row.map((group) => ({
      group,
      w: boxSide(group.fileCount, maxFiles, MAP_BOX_MIN_W, MAP_BOX_MAX_W),
      h: boxSide(group.fileCount, maxFiles, MAP_BOX_MIN_H, MAP_BOX_MAX_H)
    }))
  );

  // The frame rows a scoped model asks for, sized before the wrap is chosen
  // because their width and height are part of the picture being fitted.
  const topStubs = sideStubs(frame, 'in');
  const bottomStubs = sideStubs(frame, 'out');
  const stubExtraH =
    (topStubs.length > 0 ? MAP_STUB_H + MAP_STUB_ROW_GAP : 0) +
    (bottomStubs.length > 0 ? MAP_STUB_H + MAP_STUB_ROW_GAP : 0);
  const stubMinW = Math.max(
    stubRowWidth(topStubs.length),
    stubRowWidth(bottomStubs.length)
  );

  // -- the wrap (Phase 161) -------------------------------------------------
  // Candidates are every prefix width of every band, so every distinct line
  // break the flow could produce is tried exactly once. The candidate whose
  // finished picture is closest in aspect to the viewport wins; ties go to
  // the wider picture, which is the fewer lines.
  const candidates = new Set<number>();
  let minFeasible = MAP_BOX_MIN_W;
  for (const row of sized) {
    let cum = 0;
    row.forEach((box, i) => {
      cum += box.w + (i > 0 ? MAP_BOX_GAP : 0);
      candidates.add(cum);
      minFeasible = Math.max(minFeasible, box.w);
    });
  }
  const targetAspect =
    Math.max(1, viewport.width) / Math.max(1, viewport.height);
  let bestW = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of [...candidates].sort((a, b) => a - b)) {
    if (candidate < minFeasible) continue;
    const flows = sized.map((row) => flowBand(row, candidate));
    const contentW = Math.max(stubMinW, 0, ...flows.map((f) => f.width));
    let contentH = 0;
    flows.forEach((f, i) => {
      contentH += f.height + (i > 0 ? MAP_ROW_GAP : 0);
    });
    const totalW = MAP_BAND_COL + MAP_PAD * 2 + contentW;
    const totalH = MAP_PAD * 2 + contentH + stubExtraH;
    const aspect = totalW / Math.max(1, totalH);
    const score = Math.abs(Math.log(aspect / targetAspect));
    if (score < bestScore - 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && candidate > bestW)) {
      bestScore = score;
      bestW = candidate;
    }
  }
  if (bestW === 0) bestW = minFeasible;

  const flows = sized.map((row) => flowBand(row, bestW));
  const contentW = Math.max(stubMinW, 0, ...flows.map((f) => f.width));
  const width = MAP_BAND_COL + MAP_PAD + contentW + MAP_PAD;
  const left = MAP_BAND_COL + MAP_PAD;

  // -- placement ------------------------------------------------------------
  const boxes: MapBox[] = [];
  const rows: MapRow[] = [];
  const stubs: MapStub[] = [];
  let y = MAP_PAD;

  const placeStubRow = (
    side: readonly { id: string; label: string }[],
    direction: 'in' | 'out',
    rowY: number
  ): void => {
    const rowW = stubRowWidth(side.length);
    let x = grid4(left + (contentW - rowW) / 2);
    for (const stub of side) {
      stubs.push({
        id: stub.id,
        label: stub.label,
        direction,
        x,
        y: rowY,
        w: MAP_STUB_W,
        h: MAP_STUB_H
      });
      x += MAP_STUB_W + MAP_STUB_GAP;
    }
  };

  if (topStubs.length > 0) {
    placeStubRow(topStubs, 'in', y);
    y += MAP_STUB_H + MAP_STUB_ROW_GAP;
  }

  flows.forEach((flow, rowIndex) => {
    const band = bands[rowIndex] as ArchMapBand;
    const bandY = y;
    flow.lines.forEach((line, lineIndex) => {
      let lineH = MAP_BOX_MIN_H;
      for (const box of line) lineH = Math.max(lineH, box.h);
      let x = grid4(left + (contentW - (flow.lineWidths[lineIndex] ?? 0)) / 2);
      for (const box of line) {
        const boxY = grid4(y + (lineH - box.h) / 2);
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
      y += lineH + (lineIndex < flow.lines.length - 1 ? MAP_LINE_GAP : 0);
    });
    rows.push({ band, y: bandY, h: y - bandY });
    y += MAP_ROW_GAP;
  });
  if (flows.length > 0) y -= MAP_ROW_GAP;

  // A same-row edge in the LAST row dips below it; give the dip its room.
  const lastRow = flows.length - 1;
  let lastRowSame = 0;
  for (const edge of model.edges) {
    if (edge.from === edge.to) continue;
    if (rowOf.get(edge.from) === lastRow && rowOf.get(edge.to) === lastRow) {
      lastRowSame += 1;
    }
  }
  if (lastRowSame > 0) {
    y += MAP_SAME_ROW_DIP + MAP_SAME_ROW_STEP * (lastRowSame - 1);
  }

  if (bottomStubs.length > 0) {
    y += MAP_STUB_ROW_GAP;
    placeStubRow(bottomStubs, 'out', y);
    y += MAP_STUB_H;
  }

  const height = flows.length > 0 ? y + MAP_PAD : MAP_PAD * 2;

  const boxById = new Map<string, MapBox>();
  for (const box of boxes) boxById.set(box.group.id, box);
  const stubByKey = new Map<string, MapStub>();
  for (const stub of stubs) stubByKey.set(stubKey(stub.direction, stub.id), stub);

  return {
    boxes,
    rows,
    boxById,
    stubs,
    stubByKey,
    regions: [],
    wires: [],
    width,
    height
  };
}

// ---------------------------------------------------------------------------
// Phase 258: regions, being frames around the band layout, and the wires
// ---------------------------------------------------------------------------

/**
 * The region layout rule, in full, beside the band rule above.
 *
 * 1. **Every region that holds a box is a frame**, in the order the composer
 *    handed them (rule Q7: units by parsed files, then Elsewhere). A region
 *    naming no box in the model draws nothing, because a frame with nothing
 *    in it would be a claim about a box that is not there.
 * 2. **Inside a frame is the band layout above**, run over that region's
 *    boxes alone and the edges between them, against a viewport that is the
 *    frame's fair share of the tab's width. Bands are per frame, so a one
 *    region picture is the Phase 201 picture with one frame around it.
 * 3. **Cross region edges are not drawn box to box.** The composer already
 *    aggregated them into an `imports` transport, and that wire is what
 *    carries them; a curve planned on one frame's rows cannot land honestly
 *    in another's.
 * 4. **Frames sit left to right, top aligned.** Between two ADJACENT frames
 *    with a transport either way sits a wire column; otherwise a plain gap.
 *    A transport between two frames that are NOT adjacent is drawn in a row
 *    under the frames with both names on it, never dropped.
 * 5. **Outside is a band under the frames**, drawn only when the composer
 *    handed one, holding its heading and every wire to or from it.
 * 6. **Everything lands on the 4px grid** and is sorted before it is placed,
 *    so the same model draws the same bytes whatever order it arrived in.
 */
function layoutRegions(
  model: ArchMapModel,
  regions: readonly ArchMapRegionModel[],
  viewport: MapViewport
): MapLayout {
  const groupById = new Map(model.groups.map((g) => [g.id, g]));

  // Rule 1: the frames that hold a box, in the composer's order.
  const framed = regions.filter(
    (r) => r.kind !== 'outside' && r.groupIds.some((id) => groupById.has(id))
  );
  const outside = regions.find((r) => r.kind === 'outside') ?? null;

  // Rule 4's columns: which adjacent pairs carry a transport either way.
  const transports = [...(model.transports ?? [])].sort((a, b) => {
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.to !== b.to) return a.to < b.to ? -1 : 1;
    return a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0;
  });
  const between = (a: string, b: string): ArchMapTransportModel[] =>
    transports.filter(
      (t) => (t.from === a && t.to === b) || (t.from === b && t.to === a)
    );
  const columns: number[] = [];
  for (let i = 0; i + 1 < framed.length; i += 1) {
    const a = framed[i] as ArchMapRegionModel;
    const b = framed[i + 1] as ArchMapRegionModel;
    columns.push(between(a.id, b.id).length > 0 ? MAP_WIRE_COL : MAP_REGION_GAP);
  }

  // Rule 2: each frame's fair share of the width, so the wrap inside it is
  // chosen against the surface it really gets.
  const columnsW = columns.reduce((w, c) => w + c, 0);
  const shareW = Math.max(
    MAP_BOX_MIN_W + MAP_BAND_COL,
    (viewport.width - MAP_PAD * 2 - columnsW) / Math.max(1, framed.length) -
      MAP_REGION_PAD * 2
  );
  const shareH = Math.max(
    MAP_BOX_MIN_H,
    viewport.height - MAP_PAD * 2 - MAP_REGION_HEAD_H -
      (outside === null ? 0 : MAP_OUTSIDE_GAP + MAP_OUTSIDE_HEAD_H)
  );

  const boxes: MapBox[] = [];
  const frames: MapRegionFrame[] = [];
  const wires: MapWire[] = [];
  let x = MAP_PAD;
  let rowH = 0;

  framed.forEach((region, i) => {
    const groups = region.groupIds
      .map((id) => groupById.get(id))
      .filter((g): g is ArchMapGroup => g !== undefined);
    const inside = new Set(groups.map((g) => g.id));
    const edges = model.edges.filter((e) => inside.has(e.from) && inside.has(e.to));
    const sub = layoutBoxes({ groups, edges }, { width: shareW, height: shareH });
    const fx = grid4(x);
    const fy = MAP_PAD;
    const w = grid4(sub.width + MAP_REGION_PAD * 2);
    const h = grid4(MAP_REGION_HEAD_H + sub.height + MAP_REGION_PAD);
    const dx = fx + MAP_REGION_PAD;
    const dy = fy + MAP_REGION_HEAD_H;
    for (const box of sub.boxes) {
      boxes.push({ ...box, x: box.x + dx, y: box.y + dy });
    }
    frames.push({
      region,
      x: fx,
      y: fy,
      w,
      h,
      rows: sub.rows.map((r) => ({ band: r.band, y: r.y + dy, h: r.h })),
      bandX: dx + MAP_PAD
    });
    rowH = Math.max(rowH, h);
    x = fx + w;
    const col = columns[i];
    if (col !== undefined) {
      // Rule 4: the wires of this adjacent pair, forward ones first, each on
      // its own line, centred in the column.
      const next = framed[i + 1] as ArchMapRegionModel;
      const pair = between(region.id, next.id);
      let wy = fy + MAP_REGION_HEAD_H;
      for (const t of pair) {
        const forward = t.from === region.id;
        wires.push({
          transport: t,
          text: forward ? `${t.label} →` : `← ${t.label}`,
          direction: forward ? 'forward' : 'back',
          x: grid4(x + 8),
          y: grid4(wy),
          w: grid4(col - 16)
        });
        wy += MAP_WIRE_H;
      }
      x += col;
    }
  });

  const framedIds = new Set(framed.map((r) => r.id));
  let contentW = Math.max(0, x - MAP_PAD);
  let y = MAP_PAD + rowH;

  // Rule 4's far row: transports between frames that are not adjacent.
  const adjacent = new Set<string>();
  for (let i = 0; i + 1 < framed.length; i += 1) {
    const a = (framed[i] as ArchMapRegionModel).id;
    const b = (framed[i + 1] as ArchMapRegionModel).id;
    adjacent.add(`${a}\u0000${b}`);
    adjacent.add(`${b}\u0000${a}`);
  }
  const far = transports.filter(
    (t) =>
      framedIds.has(t.from) &&
      framedIds.has(t.to) &&
      t.from !== t.to &&
      !adjacent.has(`${t.from}\u0000${t.to}`)
  );
  if (far.length > 0) {
    y += MAP_OUTSIDE_GAP / 2;
    const labelOf = (id: string): string =>
      framed.find((r) => r.id === id)?.label ?? id;
    for (const t of far) {
      wires.push({
        transport: t,
        text: `${labelOf(t.from)} → ${labelOf(t.to)} · ${t.label}`,
        direction: 'forward',
        x: MAP_PAD,
        y: grid4(y),
        w: grid4(contentW)
      });
      y += MAP_WIRE_H;
    }
  }

  // Rule 5: the Outside band, with its wires inside it.
  if (outside !== null) {
    const toOutside = transports.filter(
      (t) => t.to === outside.id || t.from === outside.id
    );
    y += MAP_OUTSIDE_GAP;
    const oy = grid4(y);
    const ow = grid4(Math.max(contentW, MAP_STUB_W * 2));
    const oh = grid4(MAP_OUTSIDE_HEAD_H + toOutside.length * MAP_WIRE_H + MAP_REGION_PAD);
    const many = framed.length > 1;
    const labelOf = (id: string): string =>
      framed.find((r) => r.id === id)?.label ?? id;
    let wy = oy + MAP_OUTSIDE_HEAD_H;
    for (const t of toOutside) {
      const forward = t.to === outside.id;
      const who = many ? `${labelOf(forward ? t.from : t.to)} · ` : '';
      wires.push({
        transport: t,
        text: forward ? `${who}${t.label} →` : `← ${who}${t.label}`,
        direction: forward ? 'forward' : 'back',
        x: MAP_PAD + MAP_REGION_PAD,
        y: grid4(wy),
        w: grid4(ow - MAP_REGION_PAD * 2)
      });
      wy += MAP_WIRE_H;
    }
    frames.push({
      region: outside,
      x: MAP_PAD,
      y: oy,
      w: ow,
      h: oh,
      rows: [],
      bandX: MAP_PAD
    });
    contentW = Math.max(contentW, ow);
    y = oy + oh;
  }

  const width = grid4(MAP_PAD * 2 + contentW);
  const height = grid4(y + MAP_PAD);
  const boxById = new Map<string, MapBox>();
  for (const box of boxes) boxById.set(box.group.id, box);

  return {
    boxes,
    rows: [],
    boxById,
    stubs: [],
    stubByKey: new Map(),
    regions: frames,
    wires,
    width,
    height
  };
}

/** The edges the drawing plans box to box: on a regioned picture, only those inside one frame. */
export function drawableEdges(
  model: ArchMapModel,
  layout: MapLayout
): readonly ArchMapModel['edges'][number][] {
  if (layout.regions.length === 0) return model.edges;
  const regionOf = new Map<string, string>();
  for (const frame of layout.regions) {
    for (const id of frame.region.groupIds) regionOf.set(id, frame.region.id);
  }
  return model.edges.filter(
    (e) => regionOf.get(e.from) !== undefined && regionOf.get(e.from) === regionOf.get(e.to)
  );
}
