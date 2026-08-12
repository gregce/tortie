/**
 * Commit-graph geometry — the pure half of the History gutter (Phase 14.5).
 *
 * Everything here is arithmetic and strings: it turns ONE row of swimlane
 * layout (`docs/research/24-git-graph.md` §5.1/§5.3) into the SVG path data for
 * that row, and nothing else. No React, no DOM, no git. That split is
 * deliberate — the topology is what a verifier has to diff against
 * `git log --graph`, and it should be testable without mounting anything.
 *
 * THE ROW IS SELF-CONTAINED. No path crosses a row boundary, so row *n* is
 * renderable knowing only row *n*. That is what keeps the list virtualizable
 * (and it is the reason the whole-graph polyline approach was rejected — see
 * research 24 §2.1), and it is why the gutter can be dropped into the existing
 * 24px `.scm-hrow` without touching how the list is built.
 *
 * Geometry constants come from `docs/research/24-git-graph-d3-visual-design.md`
 * §3.1, measured against gmux's own surfaces rather than inherited from VS
 * Code: 24px rows (not VS Code's 22), a 12px lane pitch (not 11) so lane
 * centres stay on the 4px grid, and lane 0 at x=10 — which is EXACTLY the
 * centre of today's `.scm-hrail`. A one-lane repo therefore renders a 20px
 * gutter that is pixel-identical to the rail shipped today; the graph only
 * costs width when there is topology to show.
 */

import { DEFAULT_LANE_CAP } from './cap';
import { hueKeyOf } from './colors';
import { CYCLE_LENGTH } from './types';

// ---------------------------------------------------------------------------
// Constants (research 24-d3 §3.1)
// ---------------------------------------------------------------------------

/** Row height. Matches `.scm-hrow` — the graph must not change list density. */
export const GRAPH_ROW_H = 24;
/** Vertical centre of a row: where every dot and every elbow lives. */
export const GRAPH_MID = GRAPH_ROW_H / 2;
/** Distance between lane centres. On the 4px grid; 8px dot + 4px clear. */
export const GRAPH_PITCH = 12;
/** Lane 0's centre — today's rail centre, so a linear repo does not move. */
export const GRAPH_X0 = 10;
/** Elbow radius. Fits inside both the 12px pitch and the 12px half-row. */
export const GRAPH_CURVE_R = 5;
/** Commit dot radius (8px Ø, unchanged from the shipped rail). */
export const GRAPH_DOT_R = 4;
/** HEAD's halo. Outer edge 6.6px vs the neighbour lane's inner edge at 11px. */
export const GRAPH_HEAD_RING_R = 6;
/**
 * Hue ramp length — `CYCLE_LENGTH`, not a second copy of it.
 *
 * Six is a measured answer, not a taste one: research 24-d3 §2.1 found min
 * pairwise ΔE2000 falls off a cliff at seven (19.5 → 12.2). The layout module
 * hands out the slots and tokens.css §1.4b defines them, so the number is
 * theirs and this file only re-exports it under the name the geometry speaks.
 */
export const GRAPH_HUES = CYCLE_LENGTH;
/**
 * Row chrome to the RIGHT of the gutter that must survive at any width:
 * chevron 12 + gaps 12 + message floor 96 + age 28 + padding 8.
 * The gutter is sized against this, which is what makes it degrade instead of
 * clip (research 24-d3 §3.4).
 */
export const GRAPH_ROW_CHROME = 156;

/** Attribute an ancestor carries so lane emphasis can span the whole list. */
export const GRAPH_SCOPE_ATTR = 'data-graph-scope';
/** Attribute written on that ancestor while the pointer is over a lane. */
export const GRAPH_HUE_ATTR = 'data-graph-hue';

// ---------------------------------------------------------------------------
// The layout contract
// ---------------------------------------------------------------------------

/**
 * How a lane got its colour.
 *
 * Three shapes are accepted on purpose. Research 24 §5.1 hands the fold a
 * discriminated union so ROLE colours (HEAD's branch, its upstream, the merge
 * base) survive the rotation; research 24-d3 §2.4 derives colour from the
 * column index instead. A bare number covers a layout that just hands back a
 * palette slot. All three normalise through {@link hueSlot}, so the renderer
 * works against whichever the layout module emits — including none at all.
 */
export type GraphLaneColor =
  | number
  | { kind: 'cycle'; slot: number }
  | { kind: 'role'; role: 'local' | 'remote' | 'base' };

/** A lane is a promise to render `sha` when the walk reaches it. */
export interface GraphLane {
  /** The commit this column is waiting for. */
  sha: string;
  /** Palette slot or fixed role. Absent → colour falls back to the column. */
  color?: GraphLaneColor;
}

/**
 * One row, already folded to fit — structurally `CappedRow` from
 * `./graph/cap.ts`, and also satisfied by a raw `GraphRow` that never needed
 * folding. Kept as a local structural type rather than an import so the
 * geometry stays testable against hand-written tangles, and so the two modules
 * can change independently.
 *
 * FOLDING IS NOT DONE HERE. `capRow()` owns it: it decides which columns
 * survive and which single column becomes the marker, and it does so as a pure
 * post-pass over a full-fidelity layout, which is what makes widening the pane
 * a re-render rather than a relayout. This file only draws what it is handed.
 */
export interface GraphRowLayout {
  /** Lanes entering the row (= the previous row's `out`). */
  in: readonly GraphLane[];
  /** Lanes leaving the row. */
  out: readonly GraphLane[];
  /** Column of this commit's dot. May equal `in.length` for a branch tip. */
  circle: number;
  /** Output columns this commit's extra parents were routed into. */
  mergeTargets: readonly number[];
  /** Column hosting the fold marker, or -1/absent when the row fits. */
  bundleColumn?: number;
}

// ---------------------------------------------------------------------------
// Width
// ---------------------------------------------------------------------------

/** Centre x of drawn column `c`. */
export function laneX(column: number): number {
  return GRAPH_X0 + column * GRAPH_PITCH;
}

/**
 * Gutter width for `columns` drawn columns.
 *
 * 1 → 20px (today's rail), 2 → 32, 3 → 44 … 8 → 104. Padding is symmetric:
 * the last lane centre sits `GRAPH_X0` from the right edge, so the subject
 * column starts at a predictable x on every row.
 */
export function gutterWidth(columns: number): number {
  return GRAPH_X0 * 2 + Math.max(0, columns - 1) * GRAPH_PITCH;
}

/**
 * THE NARROW-PANE RULE: how many columns this pane can afford, which is the
 * `cap` to hand `capRow()` and `gutterColumns()`.
 *
 * Three things it guarantees:
 *
 *  - the subject keeps its floor, because the gutter is sized from what is
 *    left after {@link GRAPH_ROW_CHROME} rather than from the graph's ambition;
 *  - the pitch and the dot NEVER shrink — degradation folds lanes into the
 *    marker column instead of making the graph smaller and mushier, so what
 *    remains stays exactly as legible as it is in a wide pane;
 *  - at least one column always survives, so the rail never disappears and a
 *    linear repo is untouched at any width.
 *
 * Measured points at a 12px pitch: 400px → 6 (ramp-limited, 80px of gutter),
 * 300px → 6, 280px (the sidebar default) → 6, 240px → 6, 220px (the sidebar
 * minimum) → 4 (56px), 180px → 1 (20px, i.e. today's rail).
 *
 * The 6 is `DEFAULT_LANE_CAP` from `./graph/cap.ts` — one definition, imported.
 * Research 24 §4.1 measured 11 concurrent lanes at 200 commits and 14 at 752 in
 * the DEFAULT scope, so folding is the normal case at depth and the only
 * question is where to stop. Eight was tried first and read badly: at 300px a
 * 104px gutter cut real subjects to about 17 characters, and the marginal
 * columns carry pass-through edge rather than commits anyway (§4.1: at full
 * depth only 25 of 46 columns ever host a dot).
 */
export function laneCap(maxLanes: number, contentWidth: number): number {
  const fits =
    Math.floor((contentWidth - GRAPH_ROW_CHROME - GRAPH_X0 * 2) / GRAPH_PITCH) +
    1;
  return Math.max(1, Math.min(Math.max(1, maxLanes), DEFAULT_LANE_CAP, fits));
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/**
 * Normalise a lane's colour to a ramp slot 0–5.
 *
 * The union cases are `hueKeyOf()` in `./graph/colors.ts` — the layout module
 * owns the role→slot mapping, because the same mapping is what its cycler
 * reserves a slot against, and two copies of it could drift into painting a
 * role lane and a rotating lane the same hue. (Both streams independently
 * arrived at local → slot 0 / remote → 2 / base → 3, for the same measured
 * reason: research 24 §7.4 puts cyan 64/60 protan/deutan from the accent
 * against 21/27 for VS Code's violet, and the two lanes whose distinction IS
 * the feature must not be the pair a CVD user cannot separate.)
 *
 * What stays here is the geometry's own two extras: a bare palette index, and
 * the fallback for a lane with NO colour, whose slot follows its column —
 * still deterministic, and still never two adjacent columns sharing a hue.
 */
export function hueSlot(
  color: GraphLaneColor | undefined,
  column: number
): number {
  if (color === undefined) return wrapHue(column);
  if (typeof color === 'number') return wrapHue(color);
  return hueKeyOf(color);
}

function wrapHue(n: number): number {
  return ((n % GRAPH_HUES) + GRAPH_HUES) % GRAPH_HUES;
}

// ---------------------------------------------------------------------------
// Path vocabulary — five shapes, and no more
// ---------------------------------------------------------------------------

const R = GRAPH_CURVE_R;

/**
 * Shrink the elbow radius when the columns are closer together than the curve
 * needs. At the shipped 12px pitch this never fires — one column of travel is
 * 12px and `corners × R` is 10 — but it means the vocabulary stays correct if
 * the pitch is ever tuned, instead of emitting arcs that overshoot each other.
 */
function fitRadius(xa: number, xb: number, corners: number): number {
  return Math.min(R, Math.abs(xb - xa) / corners, GRAPH_MID);
}

/** A lane that crosses the row untouched. */
export function pathThrough(x: number): string {
  return `M${x} 0V${GRAPH_ROW_H}`;
}

/** A lane arriving at this row's dot from directly above. */
export function pathStubIn(x: number): string {
  return `M${x} 0V${GRAPH_MID}`;
}

/** The first parent leaving this row's dot in the same column. */
export function pathStubOut(x: number): string {
  return `M${x} ${GRAPH_MID}V${GRAPH_ROW_H}`;
}

/**
 * A lane that enters at `xa` and leaves at `xb` — the column compaction that
 * happens when several children converge and the columns to their right slide
 * left. Research 24-d3 assumed this never happens; the fold in research 24
 * §5.3 (the algorithm actually being shipped) compacts on every join, so the
 * S-curve is not optional.
 */
export function pathShift(xa: number, xb: number): string {
  if (xa === xb) return pathThrough(xa);
  const s = xb > xa ? 1 : -1;
  const r = fitRadius(xa, xb, 2);
  const sweepIn = s > 0 ? 0 : 1;
  const sweepOut = s > 0 ? 1 : 0;
  return (
    `M${xa} 0V${GRAPH_MID - r}` +
    `A${r} ${r} 0 0 ${sweepIn} ${xa + s * r} ${GRAPH_MID}` +
    `H${xb - s * r}` +
    `A${r} ${r} 0 0 ${sweepOut} ${xb} ${GRAPH_MID + r}` +
    `V${GRAPH_ROW_H}`
  );
}

/**
 * A child's lane curving in from above to meet the dot — a BRANCH SPLIT read
 * top-down: two children in different columns, one commit.
 */
export function pathJoinIn(xa: number, xDot: number): string {
  if (xa === xDot) return pathStubIn(xa);
  const s = xDot > xa ? 1 : -1;
  const r = fitRadius(xa, xDot, 1);
  return (
    `M${xa} 0V${GRAPH_MID - r}` +
    `A${r} ${r} 0 0 ${s > 0 ? 0 : 1} ${xa + s * r} ${GRAPH_MID}` +
    `H${xDot}`
  );
}

/**
 * An extra parent leaving the dot sideways and down — a MERGE JOIN. The caller
 * emits one of these per parent past the first, which is why an octopus merge
 * needs no special case anywhere in this file.
 */
export function pathMergeOut(xDot: number, xb: number): string {
  if (xDot === xb) return pathStubOut(xDot);
  const s = xb > xDot ? 1 : -1;
  const r = fitRadius(xDot, xb, 1);
  return (
    `M${xDot} ${GRAPH_MID}` +
    `H${xb - s * r}` +
    `A${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${xb} ${GRAPH_MID + r}` +
    `V${GRAPH_ROW_H}`
  );
}

// ---------------------------------------------------------------------------
// Row assembly
// ---------------------------------------------------------------------------

/** Hue sentinel for the fold marker: no identity, therefore no colour. */
export const HUE_BUNDLE = -1;

/** One stroke of one row's gutter. */
export interface GraphSegment {
  /** SVG path data. */
  d: string;
  /** Ramp slot 0–5, or {@link HUE_BUNDLE} for the colourless fold marker. */
  hue: number;
}

/** The commit dot. */
export interface GraphDot {
  x: number;
  hue: number;
  /** Hollow ring rather than a disc — this commit has more than one parent. */
  merge: boolean;
  /** Outer halo — this commit is HEAD. */
  head: boolean;
  /**
   * Full-strength hue rather than mostly muted: this commit exists on no
   * remote. "Bright dot = only on this machine" (research 24-d3 §5.2).
   */
  unpushed: boolean;
  /** The dot sits ON the fold marker; it keeps its own hue regardless. */
  bundled: boolean;
}

export interface GraphRowRender {
  /** Strokes, back to front. */
  segments: GraphSegment[];
  dot: GraphDot;
  /** Gutter width this row was built for. */
  width: number;
}

export interface BuildRowOptions {
  /** The commit's own SHA — used to find which input columns converge on it. */
  sha: string;
  /** How many parents the commit has. 0 is a root and closes its lane. */
  parentCount: number;
  /** Gutter columns for the whole list (`gutterColumns()` / {@link laneCap}). */
  columns: number;
  /**
   * The dot's colour, straight from the layout row. Worth passing: when the
   * fold clamps `circle` onto the marker column there is no output lane there
   * to read a colour from, and the commit must still wear its own.
   */
  color?: GraphLaneColor;
  isHead?: boolean;
  unpushed?: boolean;
}

/**
 * Where each input lane ends up in `out`.
 *
 * Replays the fold's bookkeeping rather than guessing: non-matching lanes keep
 * their order, the FIRST lane awaiting this commit becomes the continuation
 * (and consumes an output slot only if there is a first parent to hand it to),
 * and every later match is a child converging on the dot — its column closes.
 *
 * The result is verified against `out` before use, with a SHA lookup as the
 * fallback, so a layout that compacts differently degrades to a slightly
 * different curve rather than to a wrong picture.
 */
function mapInputColumns(
  row: GraphRowLayout,
  sha: string,
  parentCount: number
): number[] {
  const mapped: number[] = [];
  let next = 0;
  let seenMatch = false;
  for (let i = 0; i < row.in.length; i++) {
    const lane = row.in[i];
    if (lane === undefined) {
      mapped.push(-1);
      continue;
    }
    if (lane.sha === sha) {
      if (!seenMatch) {
        seenMatch = true;
        if (parentCount > 0) next++;
      }
      mapped.push(-1); // converges into the dot
      continue;
    }
    let j = next++;
    if (row.out[j]?.sha !== lane.sha) {
      const found = row.out.findIndex((l) => l.sha === lane.sha);
      j = found;
      if (found !== -1) next = found + 1;
    }
    mapped.push(j);
  }
  return mapped;
}

/**
 * Build one row's gutter.
 *
 * Ordering matters for the eye: pass-throughs first, then the merge joins and
 * branch splits, then the commit's own stubs — so the lane the row is ABOUT is
 * drawn over the traffic passing behind it.
 */
export function buildRow(
  row: GraphRowLayout,
  options: BuildRowOptions
): GraphRowRender {
  const { sha, parentCount, columns } = options;
  const bundle = row.bundleColumn ?? -1;
  const segments: GraphSegment[] = [];
  const seen = new Set<string>();
  const push = (d: string, hue: number): void => {
    const key = `${d}|${hue}`;
    if (seen.has(key)) return;
    seen.add(key);
    segments.push({ d, hue });
  };
  const x = (c: number): number => laneX(Math.max(0, Math.min(c, columns - 1)));
  // Anything routed INTO the marker column is drawn colourless: the lane it
  // was heading for is not on screen, so claiming a hue for it would invent an
  // identity the picture cannot back up.
  const hueOf = (lane: GraphLane | undefined, c: number): number =>
    c === bundle ? HUE_BUNDLE : hueSlot(lane?.color, c);

  const circle = Math.max(0, row.circle);
  const xDot = x(circle);
  const mapped = mapInputColumns(row, sha, parentCount);

  // 1. The fold marker, if this row overflowed. Drawn FIRST and colourless, so
  //    it sits behind everything and cannot be mistaken for a line of history.
  if (bundle >= 0) push(pathThrough(x(bundle)), HUE_BUNDLE);

  // 2. Traffic passing behind this commit, plus the children converging on it.
  for (let i = 0; i < row.in.length; i++) {
    const lane = row.in[i];
    if (lane === undefined) continue;
    if (lane.sha === sha) {
      push(pathJoinIn(x(i), xDot), hueOf(lane, i));
      continue;
    }
    const j = mapped[i] ?? -1;
    if (j === -1) continue;
    push(pathShift(x(i), x(j)), hueOf(lane, i));
  }

  // 3. Merge joins — one per parent past the first. Generic in n, so an
  //    octopus merge is three of these and needs no case of its own.
  for (const target of row.mergeTargets) {
    push(pathMergeOut(xDot, x(target)), hueOf(row.out[target], target));
  }

  // 4. The commit's own lane leaving downward (absent on a root commit, whose
  //    lane simply ends at the dot — the truthful drawing, and the one VS
  //    Code's own guard gets wrong; research 24 §4.3).
  if (parentCount > 0) {
    push(pathStubOut(xDot), hueOf(row.out[circle], circle));
  }

  return {
    segments,
    dot: {
      x: xDot,
      hue: hueSlot(
        options.color ?? row.out[circle]?.color ?? row.in[circle]?.color,
        circle
      ),
      merge: parentCount > 1,
      head: options.isHead === true,
      unpushed: options.unpushed === true,
      bundled: bundle >= 0 && circle >= bundle
    },
    width: gutterWidth(columns)
  };
}

/**
 * The gutter for a row that is not a commit — an expanded commit's file rows,
 * and the "Load 50 more" row.
 *
 * Every live lane draws as a plain pass-through, which is what makes the graph
 * read as CONTINUING rather than severed. Today's file rows have no rail at
 * all, so expanding a commit visually cuts the spine in half; this closes that.
 */
export function buildSpacer(
  lanes: readonly GraphLane[],
  columns: number
): GraphSegment[] {
  const segments: GraphSegment[] = [];
  const drawn = Math.min(lanes.length, columns);
  for (let i = 0; i < drawn; i++) {
    segments.push({ d: pathThrough(laneX(i)), hue: hueSlot(lanes[i]?.color, i) });
  }
  // More lanes live than columns: the last one becomes the marker, exactly as
  // `capRow` would have folded a commit row at this depth.
  if (lanes.length > columns) {
    segments[columns - 1] = {
      d: pathThrough(laneX(columns - 1)),
      hue: HUE_BUNDLE
    };
  }
  return segments;
}
