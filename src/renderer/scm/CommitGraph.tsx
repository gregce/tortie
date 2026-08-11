/**
 * The commit-graph gutter — one `<svg>` per History row (Phase 14.5).
 *
 * Replaces `.scm-hrail` and nothing else. It sits LEFT of the row's existing
 * content and is `aria-hidden`, so the hover card, the native context menu,
 * copy-SHA, click-to-expand and keyboard navigation all keep working exactly
 * as they do today: the SVG is a child of the row div, so every pointer event
 * bubbles to the handlers already on it.
 *
 * WHAT CARRIES LANE IDENTITY, in priority order. Colour is the convenience
 * channel, never the only one (DESIGN.md) — at six hues on a ground this dark
 * the protanope-simulated minimum pair separation is ΔE 3.1, so a red-green
 * colourblind user cannot rely on hue at all:
 *
 *  1. **Column position.** A lane IS an x coordinate. Free, and complete on
 *     its own for anyone who can see the picture at all.
 *  2. **The ref pill** at the lane's tip, which names it in words.
 *  3. **Dot shape** — hollow means merge, a halo means HEAD. Both survive
 *     greyscale, and both are independent of fill.
 *  4. **Dot fill** — coloured means "on no remote, yours alone"; muted means
 *     "already pushed". This is the divergence signal, and it composes with
 *     shape because one is fill and the other is outline.
 *  5. **Gutter hover emphasis** — pointing at a lane holds it at full opacity
 *     and drops the rest. Keyed on the resolved hue slot, which is the one
 *     lane property that survives column compaction, so the emphasis follows a
 *     lane across a merge instead of following a column. Where more lanes are
 *     live than the ramp has hues, two lanes can share a slot and both light —
 *     that is the honest reading of "these strokes share an identity", not a
 *     bug. Confined to the gutter: hovering the message area does nothing
 *     extra, because a full-row trigger would strobe the list on every
 *     traverse (DESIGN.md §5).
 *
 * NOTHING HERE ANIMATES. Not the emphasis, not the gutter's width when a page
 * loads. `prefers-reduced-motion` therefore needs no special case: there is no
 * motion to reduce.
 *
 * INTEGRATION — the whole of it, in HistorySection:
 *
 * ```tsx
 * const layout = useMemo(() => layoutGraph(entries, { roleOf }), [entries, roleOf]);
 * const cap = useLaneCap(listRef, layout.maxLanes);      // width-derived
 * const columns = gutterColumns(layout, cap);            // one width, whole list
 * // on the list root, so emphasis spans it:  <div data-graph-scope …>
 *
 * // commit row — REPLACES the <span className="scm-hrail"> block, nothing else:
 * <CommitGraph
 *   row={capRow(layout.rows[i], columns)}
 *   sha={entry.hash}
 *   parentCount={entry.parents.length}
 *   columns={columns}
 *   color={layout.rows[i].color}
 *   isHead={entry.hash === headSha}
 *   unpushed={entry.unpushed === true}
 * />
 *
 * // file rows and the "Load 50 more" row — this is what stops an expanded
 * // commit from visibly severing the spine, which today it does:
 * <CommitGraphSpacer lanes={layout.rows[i].out} columns={columns} />
 * <CommitGraphSpacer lanes={layout.tailLanes} columns={columns} fade={!hasMore} />
 * ```
 *
 * Two things the row must still do, because the SVG is `aria-hidden` and the
 * topology has to live somewhere a screen reader can reach it: put the merge
 * arity and the refs in the row's `aria-label`, and append ", off-graph branch"
 * whenever `capRow` returned a `bundleColumn >= 0`.
 */

import React, { useEffect, useState } from 'react';
import {
  GRAPH_DOT_R,
  GRAPH_HEAD_RING_R,
  GRAPH_HUE_ATTR,
  GRAPH_MID,
  GRAPH_PITCH,
  GRAPH_ROW_H,
  GRAPH_SCOPE_ATTR,
  GRAPH_X0,
  HUE_BUNDLE,
  buildRow,
  buildSpacer,
  gutterWidth,
  hueSlot,
  laneCap
} from './graph-geometry';
import type {
  GraphLane,
  GraphLaneColor,
  GraphRowLayout,
  GraphSegment
} from './graph-geometry';
import './graph.css';

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Strokes({ segments }: { segments: GraphSegment[] }): React.JSX.Element {
  return (
    <>
      {segments.map((s) =>
        s.hue === HUE_BUNDLE ? (
          // The fold marker is drawn as a PAIR of hairlines rather than one
          // fat stroke: "several branches in here" is legible at a glance and
          // impossible to read as a single line of history. ±1.5 puts each 1px
          // stroke on a half-pixel centre, which is where a hairline is crisp.
          <g key={`b:${s.d}`} className="scm-graph-ink scm-graph-bundle">
            <path className="scm-graph-lane" d={s.d} transform="translate(-1.5)" />
            <path className="scm-graph-lane" d={s.d} transform="translate(1.5)" />
          </g>
        ) : (
          <path
            key={`${s.hue}:${s.d}`}
            className="scm-graph-ink scm-graph-lane"
            data-hue={s.hue}
            d={s.d}
          />
        )
      )}
    </>
  );
}

/**
 * Write the hovered hue onto the nearest scoped ancestor so emphasis spans the
 * whole list rather than one row. Falls back to the `<svg>` itself, which
 * degrades to within-row emphasis if the list root has no scope attribute —
 * a missing integration detail should dim the wrong amount, never throw.
 *
 * A direct attribute write, deliberately: this runs on every pointer move over
 * the gutter, and re-rendering the list for a hover would be absurd. It
 * changes only `opacity`, so it costs a paint and never a layout.
 */
function emphasise(svg: SVGSVGElement, hue: number): void {
  const scope = svg.closest(`[${GRAPH_SCOPE_ATTR}]`) ?? svg;
  const want = hue < 0 ? null : String(hue);
  if (scope.getAttribute(GRAPH_HUE_ATTR) === want) return;
  if (want === null) scope.removeAttribute(GRAPH_HUE_ATTR);
  else scope.setAttribute(GRAPH_HUE_ATTR, want);
}

function columnAt(svg: SVGSVGElement, clientX: number): number {
  const rect = svg.getBoundingClientRect();
  return Math.round((clientX - rect.left - GRAPH_X0) / GRAPH_PITCH);
}

// ---------------------------------------------------------------------------
// Commit row gutter
// ---------------------------------------------------------------------------

export interface CommitGraphProps {
  /**
   * This row, already folded to fit — `capRow(layout.rows[i], columns)`.
   * A raw `GraphRow` works too when nothing ever needs folding.
   */
  row: GraphRowLayout;
  /** The commit's SHA — identifies which input columns converge on the dot. */
  sha: string;
  /** Parent count. 0 is a root: its lane ends at the dot. */
  parentCount: number;
  /** Gutter columns for the whole list — see {@link useLaneCap}. */
  columns: number;
  /** The dot's own colour, from the uncapped layout row. */
  color?: GraphLaneColor;
  /** HEAD's commit gets a halo. */
  isHead?: boolean;
  /** On no remote — the dot wears its full-strength lane hue. */
  unpushed?: boolean;
}

/**
 * MEMOISED, and it has to be. The History list re-renders on every hover-card
 * open and close, on the cursor moving, and on each expand — and each of those
 * would otherwise re-run `buildRow` and re-reconcile an `<svg>` for all 200+
 * loaded rows, none of which changed. Every prop is referentially stable across
 * those renders (`row` and `color` come out of the layout memo, the rest are
 * primitives), so the shallow compare bails cleanly.
 */
export const CommitGraph = React.memo(function CommitGraph({
  row,
  sha,
  parentCount,
  columns,
  color,
  isHead,
  unpushed
}: CommitGraphProps): React.JSX.Element {
  const built = buildRow(row, {
    sha,
    parentCount,
    columns,
    color,
    isHead,
    unpushed
  });

  const hueAtColumn = (column: number): number => {
    if (column < 0 || column >= columns) return -1;
    // A pointer over the fold marker emphasises nothing: "several branches"
    // is not an identity.
    if (column === row.bundleColumn) return -1;
    const lane = row.out[column] ?? row.in[column];
    return lane === undefined ? -1 : hueSlot(lane.color, column);
  };

  const { dot } = built;
  const dotClass = [
    'scm-graph-ink',
    'scm-graph-dot',
    dot.merge ? 'scm-graph-dot--merge' : '',
    dot.unpushed ? 'scm-graph-dot--mine' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className="scm-graph"
      width={built.width}
      height={GRAPH_ROW_H}
      viewBox={`0 0 ${built.width} ${GRAPH_ROW_H}`}
      shapeRendering="geometricPrecision"
      aria-hidden="true"
      focusable="false"
      onPointerMove={(e) =>
        emphasise(e.currentTarget, hueAtColumn(columnAt(e.currentTarget, e.clientX)))
      }
      onPointerLeave={(e) => emphasise(e.currentTarget, -1)}
    >
      <Strokes segments={built.segments} />
      {dot.head ? (
        <circle
          className="scm-graph-ink scm-graph-head"
          data-hue={dot.hue}
          cx={dot.x}
          cy={GRAPH_MID}
          r={GRAPH_HEAD_RING_R}
        />
      ) : null}
      {/* A commit in a folded lane keeps its OWN hue in the bundle column —
          the column is anonymous, the commit is not. */}
      <circle
        className={dotClass}
        data-hue={dot.hue}
        cx={dot.x}
        cy={GRAPH_MID}
        r={GRAPH_DOT_R}
      />
    </svg>
  );
});

// ---------------------------------------------------------------------------
// Continuation gutter — file rows, and "Load 50 more"
// ---------------------------------------------------------------------------

export interface CommitGraphSpacerProps {
  /** Live lanes at this point in the list (the anchor row's `out`). */
  lanes: readonly GraphLane[];
  columns: number;
  /**
   * The walk is exhausted and these lanes still point at commits the ref
   * filter excluded. Their last few pixels fade instead of stopping dead — a
   * hard stop reads as "this branch ends here", which is a lie.
   */
  fade?: boolean;
}

export const CommitGraphSpacer = React.memo(function CommitGraphSpacer({
  lanes,
  columns,
  fade
}: CommitGraphSpacerProps): React.JSX.Element {
  const segments = buildSpacer(lanes, columns);
  const width = gutterWidth(columns);
  return (
    <svg
      className={`scm-graph${fade === true ? ' scm-graph--fade' : ''}`}
      width={width}
      height={GRAPH_ROW_H}
      viewBox={`0 0 ${width} ${GRAPH_ROW_H}`}
      shapeRendering="geometricPrecision"
      aria-hidden="true"
      focusable="false"
    >
      <Strokes segments={segments} />
    </svg>
  );
});

// ---------------------------------------------------------------------------
// Width negotiation
// ---------------------------------------------------------------------------

/**
 * The lane cap this list can afford, measured from its own width. Feed it to
 * `capRow()` and `gutterColumns()`; every row then uses the same number.
 *
 * One width for the WHOLE loaded window, not per row: VS Code sizes its SVG
 * per row, which makes every subject start at a different x, and at 24px
 * density that jitter costs more than the width it saves.
 *
 * Recomputed when the sidebar is dragged and when a page load deepens the
 * graph. Both are instant — see the no-animation note at the top of the file.
 *
 * TAKES THE ELEMENT, NOT A REF, and that is load-bearing rather than a style
 * preference. A `RefObject` is referentially stable, so an effect keyed on it
 * runs exactly once — and the History list is CONDITIONALLY RENDERED (the
 * section collapses). Keyed on the ref, a section that mounted collapsed would
 * never attach an observer at all and would size its gutter from the 280px
 * assumption forever; one that was collapsed and reopened would keep observing
 * the detached node. A node passed through state re-runs the effect on both
 * transitions, which is the only way the measurement can be true.
 *
 * `clientWidth`, deliberately, not the bounding rect: the vertical scrollbar
 * is not width the graph may spend.
 */
export function useLaneCap(el: HTMLElement | null, maxLanes: number): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (el === null) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  // Before the first measurement, assume the sidebar default (280px) rather
  // than 0 — a first paint at one column would visibly snap wider.
  return laneCap(maxLanes, width > 0 ? width : 280);
}

export { gutterWidth, laneCap };
export type { GraphLane, GraphLaneColor, GraphRowLayout };
