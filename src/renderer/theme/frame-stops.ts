/**
 * Which frame settings a person may actually choose (Phase 210). THEME
 * CONSTANT FILE under the CLAUDE.md UI rules.
 *
 * THE RULE THIS FILE IMPLEMENTS is the one Phase 207 set and this phase
 * inherits: never silently refuse what he asked for. So a shade or a depth
 * that cannot keep the floors is refused AT THE CONTROL, with the slider
 * stopping there and a few words saying why, rather than being accepted and
 * quietly clamped into something else.
 *
 * The refusal is measured, not tabled. Every stop is put through the SHIPPING
 * derivation and the SHIPPING floor predicate, which is the same pair
 * `npm run conformance:hue` walks, so the control and the gate can never
 * disagree about where the edge is. The gate has a rule for exactly that,
 * and it went red 6,937 times while this file and the walk read a slack of
 * zero differently.
 *
 * THE REGION IS JUDGED AT EVERY CONTRAST LEVEL AND EVERY HIGHLIGHT SCHEME,
 * not at the two the person happens to have set. The phase's promise is that
 * the five appearance settings compose in any order, and a frame chosen at
 * Normal that broke a floor the moment Contrast went to High would not keep
 * it. So a stop is offered only when it holds at all twelve, which also
 * means the sliders do not change length when a person changes contrast.
 * Forty nine pairs by twelve is 588 derivations at about a tenth of a
 * millisecond, and the whole grid depends on nothing but the hue, so the
 * caller memoises it there.
 *
 * THE FEASIBLE SET IS CONTIGUOUS ON EACH AXIS, measured over every whole
 * degree of the circle and all three contrast levels, so a first and a last
 * true stop describe it exactly. The gate asserts that contiguity rather than
 * taking it on trust, because a hole would make a slider that skips.
 */

import type { ContrastLevel, HighlightScheme } from '@shared/settings';
import {
  CHROME_DEPTH_MAX,
  CHROME_DEPTH_MIN,
  CHROME_SHADE_MAX,
  CHROME_SHADE_MIN,
  CONTRAST_LEVELS,
  HIGHLIGHT_SCHEMES
} from '@shared/settings';
import { deriveOverrides } from './derive';
import { firstFloorFailure, type FloorFailure } from './floors';

/** The frame settings one reading is about. */
export interface FrameChoice {
  chromeHue: number;
  chromeShade: number;
  chromeDepth: number;
}

/** One composition the frame has to survive. */
export interface FrameContext {
  highlightScheme: HighlightScheme;
  contrastLevel: ContrastLevel;
}

/** Every stop of one axis, in order. */
export const SHADE_STOPS: readonly number[] = Array.from(
  { length: CHROME_SHADE_MAX - CHROME_SHADE_MIN + 1 },
  (_unused, i) => CHROME_SHADE_MIN + i
);
export const DEPTH_STOPS: readonly number[] = Array.from(
  { length: CHROME_DEPTH_MAX - CHROME_DEPTH_MIN + 1 },
  (_unused, i) => CHROME_DEPTH_MIN + i
);

/**
 * The floor this frame breaks at ONE contrast level and scheme, or null when
 * it breaks none. The base is the captured shipped values; the derivation
 * runs over it exactly as the applier would, so what is judged is what would
 * be painted.
 */
export function frameFailure(
  context: FrameContext,
  base: Readonly<Record<string, string>>,
  choice: FrameChoice
): FloorFailure | null {
  const overrides = deriveOverrides(
    {
      highlightScheme: context.highlightScheme,
      contrastLevel: context.contrastLevel,
      chromeHue: choice.chromeHue,
      chromeShade: choice.chromeShade,
      chromeDepth: choice.chromeDepth
    },
    base
  );
  return firstFloorFailure((token) => overrides[token] ?? base[token]);
}

/**
 * The floor this frame breaks at ANY of the twelve compositions, or null when
 * it breaks none of them. This is what the control offers from.
 */
export function frameFailureAnywhere(
  base: Readonly<Record<string, string>>,
  choice: FrameChoice
): FloorFailure | null {
  for (const contrastLevel of CONTRAST_LEVELS) {
    for (const highlightScheme of HIGHLIGHT_SCHEMES) {
      const failure = frameFailure(
        { contrastLevel, highlightScheme },
        base,
        choice
      );
      if (failure !== null) return failure;
    }
  }
  return null;
}

export interface StopRange {
  /** The lowest and highest stop that keeps every floor. */
  min: number;
  max: number;
  /** Why the axis stops there, from the first stop past each end. */
  below: FloorFailure | null;
  above: FloorFailure | null;
  /** Does the stop past that end hold at some stop of the OTHER axis? */
  belowElsewhere: boolean;
  aboveElsewhere: boolean;
}

/**
 * The whole 49 pair grid at one hue: which pairs hold everywhere, and the
 * floor the first refused one breaks. One object, because both axes read it
 * and computing it twice would be 1,176 derivations for 588 answers.
 */
export interface FrameGrid {
  holds: (shade: number, depth: number) => boolean;
  failure: (shade: number, depth: number) => FloorFailure | null;
}

export function frameGrid(
  base: Readonly<Record<string, string>>,
  chromeHue: number
): FrameGrid {
  const failures = new Map<string, FloorFailure | null>();
  for (const chromeShade of SHADE_STOPS) {
    for (const chromeDepth of DEPTH_STOPS) {
      failures.set(
        `${String(chromeShade)},${String(chromeDepth)}`,
        frameFailureAnywhere(base, { chromeHue, chromeShade, chromeDepth })
      );
    }
  }
  const at = (shade: number, depth: number): FloorFailure | null =>
    failures.get(`${String(shade)},${String(depth)}`) ?? null;
  return {
    holds: (shade, depth) => at(shade, depth) === null,
    failure: at
  };
}

function rangeOver(
  stops: readonly number[],
  otherStops: readonly number[],
  holdsAt: (stop: number, other: number) => boolean,
  failureAt: (stop: number, other: number) => FloorFailure | null,
  other: number
): StopRange {
  const ok = stops.filter((stop) => holdsAt(stop, other));
  const min = ok[0] ?? stops[0] ?? 0;
  const max = ok[ok.length - 1] ?? stops[stops.length - 1] ?? 0;
  const under = min - 1;
  const over = max + 1;
  const hasUnder = stops.includes(under);
  const hasOver = stops.includes(over);
  return {
    min,
    max,
    below: hasUnder ? failureAt(under, other) : null,
    above: hasOver ? failureAt(over, other) : null,
    belowElsewhere:
      hasUnder && otherStops.some((alt) => holdsAt(under, alt)),
    aboveElsewhere: hasOver && otherStops.some((alt) => holdsAt(over, alt))
  };
}

/** The shade stops on offer at this hue and depth. */
export function shadeRange(grid: FrameGrid, depth: number): StopRange {
  return rangeOver(
    SHADE_STOPS,
    DEPTH_STOPS,
    (shade, alt) => grid.holds(shade, alt),
    (shade, alt) => grid.failure(shade, alt),
    depth
  );
}

/** The depth stops on offer at this hue and shade. */
export function depthRange(grid: FrameGrid, shade: number): StopRange {
  return rangeOver(
    DEPTH_STOPS,
    SHADE_STOPS,
    (depth, alt) => grid.holds(alt, depth),
    (depth, alt) => grid.failure(alt, depth),
    shade
  );
}

/**
 * The few words the face carries when a slider stops.
 *
 * They say what would go wrong, and where the other control can rescue it
 * they say that instead, because "darker needs more depth" is a thing a
 * person can act on and "darker breaks a floor" is not. No number, no colour
 * space, no token name: the sentence is for the person, and the gate is where
 * the token name lives.
 */
export function refusalSentence(
  direction: 'darker' | 'lighter' | 'less depth' | 'more depth',
  failure: FloorFailure | null,
  rescuedByTheOther: boolean
): string {
  if (failure === null) return '';
  const lead = direction === 'darker' || direction === 'lighter'
    ? direction.charAt(0).toUpperCase() + direction.slice(1)
    : direction === 'less depth'
      ? 'Less depth'
      : 'More depth';
  if (rescuedByTheOther) {
    const other =
      direction === 'darker'
        ? 'more depth'
        : direction === 'lighter'
          ? 'less depth'
          : direction === 'less depth'
            ? 'a lighter shade'
            : 'a darker shade';
    return `${lead} needs ${other}.`;
  }
  switch (failure.family) {
    case 'order':
    case 'step':
      return `${lead} renders two panels the same color.`;
    case 'text':
      return `${lead} puts text under its contrast floor.`;
    case 'terminal':
      return `${lead} puts the terminal colors under their floor.`;
    case 'chromatic':
    default:
      return `${lead} puts the file colors under their contrast floor.`;
  }
}
