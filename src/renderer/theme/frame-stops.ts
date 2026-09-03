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
 * disagree about where the edge is. Seven stops per axis is fourteen
 * derivations per read, about a millisecond each, and the caller memoises.
 *
 * THE FEASIBLE SET IS CONTIGUOUS ON EACH AXIS, measured over every whole
 * degree of the circle and all three contrast levels, so a first and a last
 * true stop describe it exactly. The gate asserts that contiguity rather than
 * taking it on trust, because a hole would make a slider that skips.
 */

import type { GmuxSettings } from '@shared/settings';
import {
  CHROME_DEPTH_MAX,
  CHROME_DEPTH_MIN,
  CHROME_SHADE_MAX,
  CHROME_SHADE_MIN
} from '@shared/settings';
import { deriveOverrides } from './derive';
import { firstFloorFailure, type FloorFailure } from './floors';

/** The frame settings one reading is about. */
export interface FrameChoice {
  chromeHue: number;
  chromeShade: number;
  chromeDepth: number;
}

/** What the other two Appearance settings are while the frame is chosen. */
export type FrameContext = Pick<
  GmuxSettings,
  'highlightScheme' | 'contrastLevel'
>;

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
 * The floor this frame breaks, or null when it breaks none. The base is the
 * captured shipped values; the derivation runs over it exactly as the applier
 * would, so what is judged is what would be painted.
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

function rangeOver(
  stops: readonly number[],
  holds: (stop: number) => boolean,
  failureAt: (stop: number) => FloorFailure | null,
  holdsElsewhere: (stop: number) => boolean
): StopRange {
  const ok = stops.filter(holds);
  const min = ok[0] ?? stops[0] ?? 0;
  const max = ok[ok.length - 1] ?? stops[stops.length - 1] ?? 0;
  const under = min - 1;
  const over = max + 1;
  const hasUnder = stops.includes(under);
  const hasOver = stops.includes(over);
  return {
    min,
    max,
    below: hasUnder ? failureAt(under) : null,
    above: hasOver ? failureAt(over) : null,
    belowElsewhere: hasUnder && holdsElsewhere(under),
    aboveElsewhere: hasOver && holdsElsewhere(over)
  };
}

/** The shade stops on offer at this hue and depth. */
export function shadeRange(
  context: FrameContext,
  base: Readonly<Record<string, string>>,
  choice: FrameChoice
): StopRange {
  const at = (chromeShade: number): FloorFailure | null =>
    frameFailure(context, base, { ...choice, chromeShade });
  return rangeOver(
    SHADE_STOPS,
    (stop) => at(stop) === null,
    at,
    (stop) =>
      DEPTH_STOPS.some(
        (chromeDepth) =>
          frameFailure(context, base, {
            ...choice,
            chromeShade: stop,
            chromeDepth
          }) === null
      )
  );
}

/** The depth stops on offer at this hue and shade. */
export function depthRange(
  context: FrameContext,
  base: Readonly<Record<string, string>>,
  choice: FrameChoice
): StopRange {
  const at = (chromeDepth: number): FloorFailure | null =>
    frameFailure(context, base, { ...choice, chromeDepth });
  return rangeOver(
    DEPTH_STOPS,
    (stop) => at(stop) === null,
    at,
    (stop) =>
      SHADE_STOPS.some(
        (chromeShade) =>
          frameFailure(context, base, {
            ...choice,
            chromeShade,
            chromeDepth: stop
          }) === null
      )
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
