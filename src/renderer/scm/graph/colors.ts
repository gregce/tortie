/**
 * Lane colour: the token mapping, and the rule that decides which hue a newly
 * opened lane gets (Phase 14.5, docs/research/24-git-graph.md §5.4, §7).
 *
 * Two things this file exists to guarantee:
 *
 *  1. **Colour is identity, never state.** DESIGN.md §1.3 reserves colour for
 *     session status; a lane's hue says "this is the same line of history",
 *     nothing more. Merge-ness and HEAD-ness are carried by dot SHAPE, so the
 *     graph still reads with the hues stripped out.
 *  2. **Role hues are never handed out by the rotation.** The lane carrying
 *     HEAD's branch, the lane carrying its upstream and the lane below the
 *     merge base hold fixed hues, because the whole of ask #1 is being able to
 *     tell those three apart at a glance.
 *
 * The rotation improves on the VS Code reference, which advances a counter
 * blindly and can therefore put two ADJACENT lanes on the same hue. Here a new
 * lane takes the hue that has been free the longest and is not currently on
 * screen, so below the palette size no two ever collide. (Reuse-on-free is
 * derived from first principles in research 24 §5.4 — nothing is taken from
 * mhutchie/vscode-git-graph, whose licence forbids derivative works.)
 *
 * ## Where the hues come from
 *
 * `src/renderer/styles/tokens.css` §1.4b is the source of truth and this file
 * only names it. That palette is SIX hues chosen for ΔE2000 separation between
 * adjacent columns, which supersedes the five-hue set proposed in research 24
 * §7.3 — it is measured against the same three sidebar backgrounds and clears
 * the same 3:1 non-text floor, with one more hue and therefore fewer forced
 * collisions. `__tests__/colors.test.ts` re-measures it, including the
 * dichromat separation that the ΔE2000 work did not cover.
 */

import type { Lane, LaneColor, LaneRole } from './types';
import { CYCLE_LENGTH } from './types';

/**
 * The rotating hues, in slot order — `tokens.css` §1.4b.
 *
 * Ordered there so consecutive indices are maximally separated, because
 * consecutive indices are the columns that physically sit side by side.
 */
export const LANE_COLOR_VARS: readonly string[] = [
  '--graph-lane-1',
  '--graph-lane-2',
  '--graph-lane-3',
  '--graph-lane-4',
  '--graph-lane-5',
  '--graph-lane-6'
];

/**
 * Which rotating hue each role falls back to when no dedicated role token is
 * defined — which is the state of `tokens.css` today.
 *
 * Chosen by measurement, not preference (numbers are the worse of the
 * protanopia and deuteranopia RGB separations, reproduced in
 * `__tests__/colors.test.ts`):
 *
 *  - **local → lane 1** (`--accent` blue). tokens.css already calls it
 *    "HEAD's spine".
 *  - **remote → lane 3** (xterm cyan). 59.7 from the local blue. The two
 *    alternatives with no competing meaning elsewhere in the app are cyan and
 *    brMagenta, and brMagenta measures **21.2** against the accent — the worst
 *    pair in the whole palette, and precisely the failure research 24 §7.4
 *    warns about: the two lanes whose distinction IS the feature would be the
 *    two a red-green colourblind user cannot separate.
 *  - **base → lane 4** (`--git-conflict` orange). 168 from local, 136 from
 *    remote, and the same value research 24 §7.4 independently picked for the
 *    merge base.
 *
 * Every entry is a token, never a literal. The dedicated names are still
 * emitted first, so if the renderer stream later defines `--graph-local` and
 * friends they win with no change here.
 */
const ROLE_FALLBACK_SLOT: Readonly<Record<LaneRole, number>> = {
  local: 0,
  remote: 2,
  base: 3
};

/** Preferred token per role; falls through to `ROLE_FALLBACK_SLOT` in CSS. */
export const ROLE_COLOR_VARS: Readonly<Record<LaneRole, string>> = {
  local: '--graph-local',
  remote: '--graph-remote',
  base: '--graph-base'
};

/**
 * Opaque hue identity. Two colours collide iff their hue keys are equal.
 *
 * A role's key is its fallback slot, so the rotation reserves that slot while
 * the role lane is on screen and cannot paint a second lane the same colour.
 * If dedicated role tokens ever land with genuinely different hues this stays
 * correct — merely conservative, reserving one slot it no longer has to.
 */
export type HueKey = number;

/**
 * Hues that are not identical but are CONFUSABLE under colour-vision
 * deficiency, so the rotation avoids them while the other is on screen.
 *
 * Measured with the Viénot dichromat simulation in `__tests__/contrast.ts`
 * (which reproduces research 24 §7's published numbers to the decimal, so the
 * metric is the same one), over BOTH bases, because lane colour is identity
 * and a person on paper needs the answer a person on graphite gets. Of the
 * fifteen pairs, one falls below the ~32 the rest clear on the dark base and
 * two do on the light one:
 *
 *   dark   `--graph-lane-1` #4d9de8 vs `--graph-lane-5` #d19fe8 → **21.2**
 *
 * The map is the UNION of the two bases, because the rotation runs before any
 * scheme is known and a soft ban costs nothing: below six live lanes there is
 * always another choice, and beyond that this degrades to the plain
 * free-longest rule. tokens.css mitigates the dark pair by ordering too —
 * those two are four columns apart, so they are rarely adjacent — but
 * "rarely" is not "never" once lanes compact.
 *
 * PAPER HAS NO WEAK PAIR AT ALL SINCE PHASE 214, which is why this map is
 * back to the dark base's one entry. Phase 213 shipped the light palette with
 * TWO, being `--graph-lane-2` #b23534 against `--graph-lane-3` #004f4e at
 * 26.9 and `--graph-lane-4` #833e00 against `--graph-lane-6` #00530e at 12.4,
 * and recorded a limit its fix round could not lift: a soft ban only helps
 * while some hue is free, so at SIX live lanes in one row the repeat this map
 * avoids becomes the repeat it cannot, and two branches drawn in brown and
 * green read as one to a protanope. That is a palette change and not a
 * rotation change, so Phase 214 made it: paper's lanes 2, 4 and 6 are
 * #b62926, #823c00 and #2c6a3b, its worst pair is 36.1 against the 32 the
 * rest of the palette holds, and every one of its fifteen pairs clears the
 * floor. The dark base is untouched and keeps its 21.2.
 *
 * A SUPERFLUOUS ENTRY IS A DEFECT TOO, not a harmless leftover: every banned
 * pair narrows the rotation's first choice, so a ban on a pair that is no
 * longer weak forces an earlier repeat for nothing. The gate asserts the map
 * is EXACTLY the weak pairs of the two bases, in both directions.
 *
 * `npm run conformance:hue` rules 28 and 30 and `__tests__/colors.test.ts`
 * re-derive the weak pairs of both bases from tokens.css, so a palette that
 * moves is what changes this next rather than a comment that did not.
 */
const CONFUSABLE_WITH: ReadonlyMap<HueKey, readonly number[]> = new Map([
  [0, [4]],
  [4, [0]]
]);

/** The map above, for the gate and the test that re-derive it (Phase 213). */
export const CONFUSABLE_PAIRS: ReadonlyMap<HueKey, readonly number[]> =
  CONFUSABLE_WITH;

/**
 * The hue a colour actually paints — role aliasing collapsed.
 *
 * DUP NOTE for the integrator: `./geometry.ts`'s `hueSlot()` computes
 * the same mapping (it independently arrived at the same local→0 / remote→2 /
 * base→3 assignment, for the same measured reasons). It should call this
 * instead; it carries the extra job of defaulting a colourless lane to its
 * column, which stays there.
 */
export function hueKeyOf(color: LaneColor): HueKey {
  return color.kind === 'cycle'
    ? normalizeSlot(color.slot)
    : ROLE_FALLBACK_SLOT[color.role];
}

/**
 * CSS value for a lane colour — the only place a token is named.
 *
 * Roles emit a fallback chain rather than a bare `var()`: an undefined custom
 * property resolves to nothing, which paints an invisible stroke, and an
 * invisible lane is a worse failure than a slightly wrong hue.
 */
export function laneColorVar(color: LaneColor): string {
  if (color.kind === 'cycle') return `var(${slotVar(color.slot)})`;
  const fallback = slotVar(ROLE_FALLBACK_SLOT[color.role]);
  return `var(${ROLE_COLOR_VARS[color.role]}, var(${fallback}))`;
}

function normalizeSlot(slot: number): number {
  const n = LANE_COLOR_VARS.length;
  return ((Math.trunc(slot) % n) + n) % n;
}

function slotVar(slot: number): string {
  return LANE_COLOR_VARS[normalizeSlot(slot)] ?? '--graph-lane-1';
}

export interface LaneCycler {
  /**
   * Pick a hue for a lane about to open at column `atColumn` on row
   * `rowIndex`, given the lanes already on that row. Records the choice.
   *
   * `atColumn` is what makes a forced collision survivable: past the palette
   * size some hue must repeat, and the only thing left to control is HOW FAR
   * APART the two lanes wearing it sit.
   */
  next(rowIndex: number, lanes: readonly Lane[], atColumn: number): LaneColor;
  /**
   * Mark every hue in `lanes` as still in use on `rowIndex`. Call once per row
   * with that row's output lanes — "free the longest" is measured from here.
   */
  touch(rowIndex: number, lanes: readonly Lane[]): void;
}

/**
 * Reuse-on-free rotation.
 *
 * State is `lastUsed[slot]`, the most recent row on which that hue was live.
 * A new lane takes the free slot with the smallest `lastUsed` — the hue the
 * eye has had longest to forget. Ties break to the lower slot, so the sequence
 * is fully determined by the rows seen so far, which is what makes paging
 * stable (see layout.ts, "Stability").
 *
 * Past six concurrent lanes a collision is FORCED — a real repository reaches
 * fourteen (research 24 §4.1) and tokens.css §1.4b measured the palette off a
 * cliff at seven hues, so there is no way to add more. All that is left to
 * control is distance, so the forced choice repeats the hue whose nearest
 * wearer is furthest from the new lane's column, rather than rotating blindly
 * into the column next door.
 *
 * What that buys, measured on the 400-commit getspecstory tangle (which peaks
 * at 14 lanes): **zero** rows where two lanes share a hue in a region the
 * graph never widened past six. Every collision that does occur was forced
 * when the lane opened in a 7-plus-lane region and is still being carried
 * after the graph compacted — nothing the cycler could have avoided. That is
 * the honest limit of a bounded palette, and it is survivable only because
 * DESIGN.md forbids colour-alone signalling: lane identity is also carried by
 * column position, by the ref pill and by dot shape.
 */
export function createLaneCycler(length: number = CYCLE_LENGTH): LaneCycler {
  const lastUsed: number[] = new Array<number>(length).fill(-1);

  const freeLongest = (banned: ReadonlySet<HueKey>): number => {
    let best = -1;
    for (let slot = 0; slot < length; slot++) {
      if (banned.has(slot)) continue;
      const seen = lastUsed[slot] ?? -1;
      if (best === -1 || seen < (lastUsed[best] ?? -1)) best = slot;
    }
    return best;
  };

  return {
    next(rowIndex, lanes, atColumn) {
      // How close the nearest lane wearing each hue is to the new column.
      const nearest = new Map<HueKey, number>();
      lanes.forEach((lane, column) => {
        const hue = hueKeyOf(lane.color);
        const distance = Math.abs(column - atColumn);
        const known = nearest.get(hue);
        if (known === undefined || distance < known) nearest.set(hue, distance);
      });

      // First choice: a hue neither on screen nor confusable with one that is.
      const avoid = new Set<HueKey>(nearest.keys());
      for (const hue of nearest.keys()) {
        for (const slot of CONFUSABLE_WITH.get(hue) ?? []) avoid.add(slot);
      }
      let best = freeLongest(avoid);
      // Second: merely not on screen.
      if (best === -1) best = freeLongest(new Set(nearest.keys()));
      // Last: every hue is live, so repeat the one that is furthest away.
      if (best === -1) {
        best = 0;
        let furthest = -1;
        for (let slot = 0; slot < length; slot++) {
          const distance = nearest.get(slot) ?? Number.POSITIVE_INFINITY;
          const tie =
            distance === furthest &&
            (lastUsed[slot] ?? -1) < (lastUsed[best] ?? -1);
          if (distance > furthest || tie) {
            furthest = distance;
            best = slot;
          }
        }
      }
      lastUsed[best] = rowIndex;
      return { kind: 'cycle', slot: best };
    },

    touch(rowIndex, lanes) {
      for (const lane of lanes) {
        const hue = hueKeyOf(lane.color);
        if (hue >= 0 && hue < length) lastUsed[hue] = rowIndex;
      }
    }
  };
}

/** Hues occupied by a set of lanes — the `live` argument to `next`. */
export function liveHues(lanes: readonly Lane[]): Set<HueKey> {
  const hues = new Set<HueKey>();
  for (const lane of lanes) hues.add(hueKeyOf(lane.color));
  return hues;
}

/** Structural equality, for stability assertions and memo comparisons. */
export function sameColor(a: LaneColor, b: LaneColor): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'role' && b.kind === 'role'
    ? a.role === b.role
    : a.kind === 'cycle' && b.kind === 'cycle' && a.slot === b.slot;
}
