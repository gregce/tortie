/**
 * Shapes for the commit-graph layout (Phase 14.5, docs/research/24-git-graph.md).
 *
 * Deliberately free of `@shared/types`: the fold takes the smallest thing that
 * can describe a DAG — a hash and its parents — so it can be unit-tested
 * against hand-written tangles with no git plumbing in the loop.
 * `GitGraphLogEntry` satisfies `GraphCommit` structurally, so the renderer
 * still passes the IPC payload straight through.
 */

/**
 * A lane whose colour is fixed by the ROLE it plays in the local/origin story,
 * rather than handed out by the cycler.
 *
 * These three are the entire point of ask #1: if the colour of "my branch" and
 * the colour of "the remote" were drawn from the same rotation, the divergence
 * would read differently on every page.
 *
 *  - `local`  — the lane carrying HEAD's branch.
 *  - `remote` — the lane carrying its upstream.
 *  - `base`   — the lane from the merge base down, where the two agree again.
 */
export type LaneRole = 'local' | 'remote' | 'base';

/**
 * Number of rotating hues. Six, matching `tokens.css` §1.4b — which measured
 * the palette off a cliff at seven (min ΔE2000 19.5 → 12.2, two blues
 * colliding), so this must not grow. Past six the ramp cycles, and two columns
 * sharing a hue are then six columns apart.
 */
export const CYCLE_LENGTH = 6;

/**
 * Lane identity colour.
 *
 * A union rather than a number so a role colour cannot be produced by the
 * rotation, and the rotation cannot be knocked off by a role. Resolution to a
 * CSS custom property happens in `colors.ts` — no literal ever appears here
 * (CLAUDE.md: all colours via tokens).
 */
export type LaneColor =
  | { readonly kind: 'role'; readonly role: LaneRole }
  | { readonly kind: 'cycle'; readonly slot: number };

/**
 * One column of the graph: a PROMISE to draw `sha` when the walk reaches it.
 *
 * That is the whole state of the algorithm. Nothing tracks "branches" — a
 * branch is just the trail a lane leaves as its promise is repeatedly kept and
 * replaced by the commit's first parent.
 */
export interface Lane {
  /** The commit this column is waiting for. */
  readonly sha: string;
  /** Identity colour, inherited along the lane until a role claims it. */
  readonly color: LaneColor;
}

/** The minimum a commit must expose to be laid out. */
export interface GraphCommit {
  /** Full SHA (or any stable unique id — the fold only compares equality). */
  readonly hash: string;
  /** Parent SHAs, first-parent first, exactly as `%P` orders them. */
  readonly parents: readonly string[];
}

/**
 * One laid-out row. Everything the renderer needs for a SELF-CONTAINED SVG:
 * no path in a row's drawing depends on any other row, which is what keeps the
 * list virtualizable and the row height constant.
 */
export interface GraphRow {
  /** Index into the input array — rows are 1:1 with commits, always. */
  readonly index: number;
  /** The commit's hash, echoed so the renderer need not re-zip. */
  readonly hash: string;
  /** Lanes entering the row. Reference-identical to the previous row's `out`. */
  readonly in: readonly Lane[];
  /** Lanes leaving the row. */
  readonly out: readonly Lane[];
  /**
   * Column of this commit's dot.
   *
   * The column that was AWAITING it, or `in.length` when nothing was — a
   * branch tip entering the window sits one past the right edge. Note this is
   * an index into `in` semantics, not into `out`: a root commit closes its own
   * lane, so `circle` can be `out.length` too.
   */
  readonly circle: number;
  /** Colour of the dot and of the lane the commit continues into. */
  readonly color: LaneColor;
  /**
   * Output columns this commit's SECOND-AND-LATER parents route into, in
   * parent order. Length is `max(0, parents.length - 1)`, so an octopus merge
   * needs no special case anywhere downstream.
   */
  readonly mergeTargets: readonly number[];
  /**
   * At least one lane in `out` awaits a commit that is NOT in the loaded
   * window. Those strokes must fade rather than stop dead — a hard stop reads
   * as "this branch ends here", which is a lie (research 24 §5.5).
   */
  readonly openEnded: boolean;
  /** `parents.length > 1` — carried so the renderer picks the merge glyph. */
  readonly isMerge: boolean;
  /** `parents.length === 0` — a root; its lane closes here. */
  readonly isRoot: boolean;
}

export interface GraphLayout {
  /** One row per input commit, same order, same length. Always. */
  readonly rows: readonly GraphRow[];
  /**
   * Lanes still open after the last row — exactly what the "load more"
   * placeholder draws as plain vertical lines so the graph reads as
   * continuing rather than amputated.
   */
  readonly tailLanes: readonly Lane[];
  /**
   * Widest extent any row occupies, in columns. Note this is the FULL-fidelity
   * width; the gutter is sized from the cap in `cap.ts`, never from this, or
   * every "load more" would reflow the subject column.
   */
  readonly maxLanes: number;
}

/**
 * Resolves a commit to a role colour, or `undefined` to let the lane keep the
 * colour it inherited.
 *
 * Called once per row, so a role can RE-colour a lane mid-flight — which is
 * deliberate at the merge base: below it, the lane is shared history and stops
 * being "yours" or "theirs".
 */
export type RoleResolver = (hash: string) => LaneRole | undefined;
