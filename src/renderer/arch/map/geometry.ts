/**
 * The map geometry, being positions in, SVG strings out (Phase 160).
 *
 * The pure half of the map, in the `scm/graph/geometry.ts` mould: arithmetic
 * and strings only. No React, no DOM, no bridge. The layout module decides
 * where boxes sit; this file decides what an edge between two of them looks
 * like, and holds every pixel constant so the numbers live in one place.
 *
 * ## The constants are abstract units, not screen pixels
 *
 * The component emits one `<svg>` with a `viewBox` and lets CSS scale it to
 * the whole editor area, which is what makes the same model draw byte for
 * byte identical SVG whatever size the tab is. Everything here sits on the
 * 4px grid of that abstract canvas.
 *
 * ## Edge weight is thickness
 *
 * Stroke width scales with the square root of the edge's import count
 * relative to the heaviest edge, between fixed bounds, the same square root
 * rule the boxes use for area, so a ten times heavier edge reads heavier
 * without a number appearing anywhere. The dashboard refusal survives: no
 * count is ever printed.
 *
 * ## Number formatting is part of determinism
 *
 * Every coordinate that can carry a fraction goes through {@link fmt}, which
 * fixes the rounding and strips the trailing zeros, so a path string cannot
 * drift by the last bit of a float between two renders of the same model.
 */

import type { ArchMapEdge, ArchMapFrameEdge } from './types';
import type { MapBox, MapLayout } from './layout';
import { cameraTranslate, type Camera, type CameraPoint } from './camera/transform';

// ---------------------------------------------------------------------------
// Constants, being the whole coordinate vocabulary, on the 4px grid
// ---------------------------------------------------------------------------

/** Smallest box side, so a one file part is still a readable box. */
export const MAP_BOX_MIN_W = 128;
/** Largest box width, so the biggest part does not drown the row. */
export const MAP_BOX_MAX_W = 320;
/** Smallest box height. */
export const MAP_BOX_MIN_H = 64;
/** Largest box height. */
export const MAP_BOX_MAX_H = 152;
/** Gap between boxes in a row. */
export const MAP_BOX_GAP = 48;
/** Gap between rows, being the corridor the cross band edges curve through. */
export const MAP_ROW_GAP = 96;
/** Canvas padding on every side. */
export const MAP_PAD = 32;
/** The left column the band words sit in. */
export const MAP_BAND_COL = 96;
/** Corner radius of a box. */
export const MAP_BOX_R = 8;
/** Inset of the label block inside its box. */
export const MAP_LABEL_INSET = 12;
/** Thinnest edge stroke. */
export const MAP_EDGE_MIN_SW = 2;
/** Thickest edge stroke. */
export const MAP_EDGE_MAX_SW = 10;
/** How far an attachment point is pulled toward the other box, 0 to 0.5. */
export const MAP_ATTACH_PULL = 0.25;
/** An attachment point never sits closer than this to a box corner. */
export const MAP_ATTACH_INSET = 16;
/** How far below its row a same row edge dips. */
export const MAP_SAME_ROW_DIP = 40;
/** Extra dip per further same row edge in the same row, so they never overlap. */
export const MAP_SAME_ROW_STEP = 12;
/** Phase 161: gap between wrapped lines inside one band. Smaller than
 *  MAP_ROW_GAP, so a band still reads as one row of the scale. */
export const MAP_LINE_GAP = 48;
/** Phase 161: a frame stub's fixed width. Small on purpose: the frame is
 *  context, never the subject. */
export const MAP_STUB_W = 160;
/** Phase 161: a frame stub's fixed height. */
export const MAP_STUB_H = 36;
/** Phase 161: gap between two stubs in one frame row. */
export const MAP_STUB_GAP = 24;
/** Phase 161: the corridor between a frame row and the boxes, so the
 *  crossing curves have room to turn. */
export const MAP_STUB_ROW_GAP = 64;
/** Phase 161: the drawing never scales its abstract units up by more than
 *  this, so a two box repository does not become a billboard. */
export const MAP_MAX_UPSCALE = 2;

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

/** Snap to the 4px grid. */
export function grid4(value: number): number {
  return Math.round(value / 4) * 4;
}

/** Fixed decimal formatting: two places, trailing zeros stripped. */
export function fmt(value: number): string {
  // One rounding rule for every coordinate, so 4.5 and 4.499999 cannot both
  // appear for what is the same position.
  return String(Math.round(value * 100) / 100);
}

/**
 * Stroke width for an edge: square root of the relative count between the
 * bounds, rounded to a quarter so the string stays short and stable.
 */
export function edgeStrokeWidth(count: number, maxCount: number): number {
  const safeMax = Math.max(1, maxCount);
  const ratio = Math.sqrt(Math.max(0, count) / safeMax);
  const raw = MAP_EDGE_MIN_SW + ratio * (MAP_EDGE_MAX_SW - MAP_EDGE_MIN_SW);
  return Math.round(raw * 4) / 4;
}

/** Horizontal attachment: the centre, pulled toward the partner, clamped. */
function attachX(box: Pick<MapBox, 'x' | 'w'>, otherCx: number): number {
  const cx = box.x + box.w / 2;
  const pulled = cx + (otherCx - cx) * MAP_ATTACH_PULL;
  const lo = box.x + MAP_ATTACH_INSET;
  const hi = box.x + box.w - MAP_ATTACH_INSET;
  return Math.min(hi, Math.max(lo, pulled));
}

// ---------------------------------------------------------------------------
// Edge planning
// ---------------------------------------------------------------------------

/** One drawable edge: the path, its weight and the verdict it may carry. */
export interface PlannedEdge {
  edge: ArchMapEdge;
  /** SVG path data, ready for `d`. */
  path: string;
  strokeWidth: number;
}

/**
 * Turn the model's edges into drawable paths against a finished layout.
 *
 * Edges are re-sorted canonically (from, then to) before planning, so the
 * drawn order, and therefore the SVG bytes, cannot depend on the order the
 * composer happened to emit them in. An edge naming a group the layout does
 * not hold, or naming the same group twice, is skipped rather than guessed
 * at.
 *
 * Cross row edges leave the facing side of the upper box and enter the top
 * of the lower one as a cubic curve with vertical tangents. Same row edges
 * dip below their row, each further one a step deeper so none overlap.
 */
export function planEdges(
  layout: MapLayout,
  edges: readonly ArchMapEdge[],
  sharedMaxCount?: number
): PlannedEdge[] {
  const ordered = [...edges].sort((a, b) => {
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.to !== b.to) return a.to < b.to ? -1 : 1;
    return 0;
  });

  // Phase 161: a scoped picture weighs its interior and its frame on ONE
  // scale, so the caller may hand the shared pool in. Alone, the pool is the
  // edges themselves, which is exactly what level 1 always did.
  let maxCount = sharedMaxCount ?? 1;
  if (sharedMaxCount === undefined) {
    for (const edge of ordered) maxCount = Math.max(maxCount, edge.count);
  }

  const planned: PlannedEdge[] = [];
  const sameRowSeen = new Map<number, number>();

  for (const edge of ordered) {
    if (edge.from === edge.to) continue;
    const from = layout.boxById.get(edge.from);
    const to = layout.boxById.get(edge.to);
    if (from === undefined || to === undefined) continue;

    const fromCx = from.x + from.w / 2;
    const toCx = to.x + to.w / 2;
    const ax = attachX(from, toCx);
    const bx = attachX(to, fromCx);
    let path: string;

    if (from.row === to.row) {
      const seen = sameRowSeen.get(from.row) ?? 0;
      sameRowSeen.set(from.row, seen + 1);
      const dip = MAP_SAME_ROW_DIP + MAP_SAME_ROW_STEP * seen;
      const ay = from.y + from.h;
      const by = to.y + to.h;
      const deep = Math.max(ay, by) + dip;
      path =
        `M ${fmt(ax)} ${fmt(ay)} ` +
        `C ${fmt(ax)} ${fmt(deep)}, ${fmt(bx)} ${fmt(deep)}, ` +
        `${fmt(bx)} ${fmt(by)}`;
    } else {
      const downward = from.row < to.row;
      const ay = downward ? from.y + from.h : from.y;
      const by = downward ? to.y : to.y + to.h;
      const mid = (by - ay) / 2;
      path =
        `M ${fmt(ax)} ${fmt(ay)} ` +
        `C ${fmt(ax)} ${fmt(ay + mid)}, ${fmt(bx)} ${fmt(by - mid)}, ` +
        `${fmt(bx)} ${fmt(by)}`;
    }

    planned.push({
      edge,
      path,
      strokeWidth: edgeStrokeWidth(edge.count, maxCount)
    });
  }

  return planned;
}

/**
 * The class an edge wears for its verdict, mirroring the cockpit's mapping:
 * a promise that holds is success, one that broke or names something absent
 * is a failure, and an unjudged edge wears nothing.
 */
export function edgeVerdictClass(verdict: string | undefined): string {
  if (verdict === undefined) return '';
  if (verdict === 'convergent') return 'arch-map-e-holds';
  if (verdict === 'divergent' || verdict === 'absent') return 'arch-map-e-broke';
  return '';
}

/** The arrowhead marker id an edge's class pairs with. */
export function edgeMarkerId(verdict: string | undefined): string {
  const cls = edgeVerdictClass(verdict);
  if (cls === 'arch-map-e-holds') return 'arch-map-arrow-holds';
  if (cls === 'arch-map-e-broke') return 'arch-map-arrow-broke';
  return 'arch-map-arrow';
}

// ---------------------------------------------------------------------------
// Phase 161: the frame, being the crossing edges a scoped picture keeps
// ---------------------------------------------------------------------------

/**
 * The one weight pool a scoped picture uses: the heaviest count over the
 * interior edges AND the crossing edges together, so a thick frame line and
 * a thick interior line mean the same thing.
 */
export function edgeMaxCount(
  edges: readonly { count: number }[],
  frame: readonly { count: number }[] = []
): number {
  let max = 1;
  for (const e of edges) max = Math.max(max, e.count);
  for (const e of frame) max = Math.max(max, e.count);
  return max;
}

/** The key a frame stub is looked up by: its side and its outside group. */
export function stubKey(direction: 'in' | 'out', outsideId: string): string {
  return `${direction} ${outsideId}`;
}

/** One drawable crossing edge between an interior box and a frame stub. */
export interface PlannedFrameEdge {
  edge: ArchMapFrameEdge;
  path: string;
  strokeWidth: number;
}

/**
 * Turn a scoped model's crossing edges into drawable paths against a layout
 * that placed the frame stubs.
 *
 * Sorted canonically first, being direction then outside id then box id, so
 * the bytes cannot depend on arrival order. An edge naming a stub or a box
 * the layout does not hold is skipped rather than guessed at, the same rule
 * `planEdges` states. An `in` crossing falls from its top stub into the box,
 * and an `out` crossing falls from the box onto its bottom stub, both with
 * vertical tangents, so every arrow on the surface points the way the
 * dependency flows.
 */
export function planFrameEdges(
  layout: MapLayout,
  frame: readonly ArchMapFrameEdge[],
  maxCount: number
): PlannedFrameEdge[] {
  const ordered = [...frame].sort((a, b) => {
    if (a.direction !== b.direction) return a.direction < b.direction ? -1 : 1;
    if (a.outsideId !== b.outsideId) return a.outsideId < b.outsideId ? -1 : 1;
    if (a.boxId !== b.boxId) return a.boxId < b.boxId ? -1 : 1;
    return 0;
  });

  const planned: PlannedFrameEdge[] = [];
  for (const edge of ordered) {
    const stub = layout.stubByKey.get(stubKey(edge.direction, edge.outsideId));
    const box = layout.boxById.get(edge.boxId);
    if (stub === undefined || box === undefined) continue;

    const boxCx = box.x + box.w / 2;
    const stubCx = stub.x + stub.w / 2;
    const sx = attachX(stub, boxCx);
    const bx = attachX(box, stubCx);
    let path: string;
    if (edge.direction === 'in') {
      const ay = stub.y + stub.h;
      const by = box.y;
      const mid = (by - ay) / 2;
      path =
        `M ${fmt(sx)} ${fmt(ay)} ` +
        `C ${fmt(sx)} ${fmt(ay + mid)}, ${fmt(bx)} ${fmt(by - mid)}, ` +
        `${fmt(bx)} ${fmt(by)}`;
    } else {
      const ay = box.y + box.h;
      const by = stub.y;
      const mid = (by - ay) / 2;
      path =
        `M ${fmt(bx)} ${fmt(ay)} ` +
        `C ${fmt(bx)} ${fmt(ay + mid)}, ${fmt(sx)} ${fmt(by - mid)}, ` +
        `${fmt(sx)} ${fmt(by)}`;
    }
    planned.push({
      edge,
      path,
      strokeWidth: edgeStrokeWidth(edge.count, maxCount)
    });
  }
  return planned;
}

// ---------------------------------------------------------------------------
// Phase 162: the camera's arithmetic, being fit, frame and the leash
// ---------------------------------------------------------------------------
//
// The camera itself (the transform algebra) is the vendored extract in
// `camera/transform.ts`; everything HERE is hand written map arithmetic in
// the map's own constant vocabulary, which is why it lives in this file.

/** How far out the camera can zoom, floor of the scale extent. A layout
 *  whose fit is smaller may still fit, see {@link cameraScaleExtent}. */
export const CAMERA_MIN_K = 0.1;
/** How far in the camera can zoom. */
export const CAMERA_MAX_K = 8;
/** THE NAMED SLOP THRESHOLD, in screen pixels: a press that moves under it
 *  is a click and reaches the drill, over it is a pan and the click is
 *  swallowed. Four pixels is the house feel for a click that survives a
 *  shaky hand. */
export const CAMERA_DRAG_SLOP = 4;
/** The leash: however far a pan runs, at least this much of the drawn
 *  picture stays inside the viewport on each axis, so the map can never be
 *  lost off screen. */
export const CAMERA_KEEP_PX = 48;
/** Margin, in screen pixels, around a framed box (F, Shift+2). */
export const CAMERA_FRAME_MARGIN = 48;
/** Framing one box never zooms past this, so F on a tiny box stays a view
 *  of the neighbourhood rather than a wall of one label. */
export const CAMERA_FRAME_MAX_K = 4;
/** One keyboard zoom step (the deferred panel chords), Figma's half-octave. */
export const CAMERA_KEY_STEP = Math.SQRT2;

/** A rectangle in world units, the layout's own space. */
export interface WorldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The drawn extent of a finished layout, as a world rectangle. */
export function layoutRect(layout: {
  width: number;
  height: number;
}): WorldRect {
  return { x: 0, y: 0, w: layout.width, h: layout.height };
}

/**
 * The scale extent for one layout in one viewport: the fit scale is always
 * reachable even when the picture is enormous, and CAMERA_MIN_K is the
 * floor otherwise.
 */
export function cameraScaleExtent(
  layout: { width: number; height: number },
  viewport: { width: number; height: number }
): [number, number] {
  return [Math.min(CAMERA_MIN_K, fitCamera(layout, viewport).k), CAMERA_MAX_K];
}

/**
 * The rest camera: the whole layout fitted and centred in the viewport,
 * scaled up by at most MAP_MAX_UPSCALE, which is exactly the picture the
 * pre-camera `preserveAspectRatio="meet"` plus the inline max-size clamp
 * drew, so Phase 160's rest picture survives the camera untouched.
 */
export function fitCamera(
  layout: { width: number; height: number },
  viewport: { width: number; height: number }
): Camera {
  const w = Math.max(1, layout.width);
  const h = Math.max(1, layout.height);
  const k = Math.min(viewport.width / w, viewport.height / h, MAP_MAX_UPSCALE);
  return {
    k,
    x: (viewport.width - w * k) / 2,
    y: (viewport.height - h * k) / 2
  };
}

/**
 * Frame one world rectangle (F on a focused box, Shift+2): fitted with a
 * margin, centred, the zoom-in capped so one small box never becomes the
 * whole wall. The zoom-out floor is the fit scale, so framing can always
 * reach what it frames.
 */
export function frameCamera(
  rect: WorldRect,
  layout: { width: number; height: number },
  viewport: { width: number; height: number }
): Camera {
  const w = Math.max(1, rect.w);
  const h = Math.max(1, rect.h);
  const kRaw = Math.min(
    (viewport.width - CAMERA_FRAME_MARGIN * 2) / w,
    (viewport.height - CAMERA_FRAME_MARGIN * 2) / h
  );
  const extent = cameraScaleExtent(layout, viewport);
  const k = Math.max(extent[0], Math.min(CAMERA_FRAME_MAX_K, kRaw));
  const centre: CameraPoint = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  const screenCentre: CameraPoint = {
    x: viewport.width / 2,
    y: viewport.height / 2
  };
  return cameraTranslate({ k, x: 0, y: 0 }, screenCentre, centre);
}

/**
 * The leash, applied after every gesture step: clamp the translation so at
 * least CAMERA_KEEP_PX of the drawn picture stays visible on each axis.
 * When the picture is smaller than the keep distance the whole picture is
 * the keep distance.
 */
export function clampCamera(
  t: Camera,
  layout: { width: number; height: number },
  viewport: { width: number; height: number }
): Camera {
  const drawnW = layout.width * t.k;
  const drawnH = layout.height * t.k;
  const keepX = Math.min(CAMERA_KEEP_PX, drawnW);
  const keepY = Math.min(CAMERA_KEEP_PX, drawnH);
  const x = Math.min(viewport.width - keepX, Math.max(keepX - drawnW, t.x));
  const y = Math.min(viewport.height - keepY, Math.max(keepY - drawnH, t.y));
  return x === t.x && y === t.y ? t : { k: t.k, x, y };
}
