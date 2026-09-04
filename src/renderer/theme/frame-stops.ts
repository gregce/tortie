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
 * WHERE THE EDGE COMES FROM. The region is the worst case over EVERY WHOLE
 * DEGREE of the circle, all three contrast levels and all four highlight
 * schemes, because the phase's promise is that the five appearance settings
 * compose in any order: a frame chosen at Normal that broke a floor the
 * moment Contrast went to High would not keep it, and neither would one that
 * held at Graphite and broke at Ocean. That is 61,446 derivations, which no
 * control can walk while a person drags a slider, so the region is the table
 * `FRAME_REGION` in ./presets.ts and `npm run conformance:hue` rule 15
 * asserts on every run that the table is exactly what the exhaustive walk
 * measures. The sliders therefore do not change length when a person changes
 * their colour or their contrast, which is also the better face.
 *
 * The REASON a slider stopped is measured live, through the SHIPPING
 * derivation and the SHIPPING floor predicate, at the composition in front
 * of the person. That predicate is the same one the walk compares itself
 * against, and the gate has a rule for their agreement; it went red 6,937
 * times while the two read a slack of zero differently.
 *
 * THE FEASIBLE SET IS CONTIGUOUS ON EACH AXIS, measured over every whole
 * degree of the circle and all three contrast levels, so a first and a last
 * true stop describe it exactly. The gate asserts that contiguity rather than
 * taking it on trust, because a hole would make a slider that skips.
 */

import type { BaseScheme, ContrastLevel, HighlightScheme } from '@shared/settings';
import {
  CHROME_DEPTH_MAX,
  CHROME_DEPTH_MIN,
  CHROME_SHADE_MAX,
  CHROME_SHADE_MIN,
  CONTRAST_LEVELS,
  DEFAULT_CHROME_DEPTH,
  DEFAULT_CHROME_SHADE,
  HIGHLIGHT_SCHEMES,
  sanitizeChromeDepth,
  sanitizeChromeShade
} from '@shared/settings';
import { deriveOverrides } from './derive';
import { firstFloorFailure, type FloorFailure } from './floors';
import { frameRegionFor, type FrameRegionRow } from './presets';

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
  /** The base the frame sits on (Phase 213); dark when absent. */
  scheme?: BaseScheme;
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
  return firstFloorFailure((token) => overrides[token] ?? base[token], context.scheme ?? 'dark');
}

/**
 * The floor this frame breaks at ANY of the twelve compositions, or null when
 * it breaks none of them. This is what the control offers from.
 */
export function frameFailureAnywhere(
  base: Readonly<Record<string, string>>,
  choice: FrameChoice,
  scheme: BaseScheme = 'dark'
): FloorFailure | null {
  for (const contrastLevel of CONTRAST_LEVELS) {
    for (const highlightScheme of HIGHLIGHT_SCHEMES) {
      const failure = frameFailure(
        { contrastLevel, highlightScheme, scheme },
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
  /**
   * Does the stop past that end hold at some stop of the OTHER axis?
   *
   * THESE TWO READ A SANITIZED STOP (Phase 210 fix round, the verifier's F4).
   * `frameIsOffered` sanitizes both of its arguments, so `min - 1` and
   * `max + 1` one past an AXIS end are read as the axis end itself and answer
   * true. `depthRange(-2)` therefore reports both true while its own range is
   * already the whole axis. Nothing can show it today, because a range whose
   * end IS the axis end cannot be pushed past, so no refusal is composed
   * there and every reachable refusal reads the true answer. A later round
   * that adds a stop to either axis must revisit this, or `refusalSentence`
   * will compose "Less depth needs a lighter shade" where nothing rescues it.
   */
  belowElsewhere: boolean;
  aboveElsewhere: boolean;
}

function rowFor(shade: number, scheme: BaseScheme): FrameRegionRow {
  const region = frameRegionFor(scheme);
  return (
    region.find((row) => row.shade === shade) ??
    region[region.length - 1] ?? { shade: 0, minDepth: 0, maxDepth: 0 }
  );
}

/**
 * Does this pair sit inside the region of this base? The region is the
 * dark base's unless the light one is named (Phase 213), and the two are
 * different tables measured over their own palettes.
 *
 * ONE STOP PAST AN AXIS END IS READ AS THE END (Phase 210 fix round, the
 * verifier's F4), so `min - 1` below an axis answers about the axis end
 * itself. On the dark base no reachable refusal composes there. On the
 * light base the shipped shade is the LAST offered one, so `max + 1` at
 * shade 2 is asked about shade 2 itself: that is answered here rather than
 * by the sanitizer, because a row past the axis is offered nowhere.
 */
export function frameIsOffered(shade: number, depth: number, scheme: BaseScheme = 'dark'): boolean {
  if (shade < CHROME_SHADE_MIN || shade > CHROME_SHADE_MAX) return false;
  if (depth < CHROME_DEPTH_MIN || depth > CHROME_DEPTH_MAX) return false;
  const row = rowFor(sanitizeChromeShade(shade), scheme);
  const stop = sanitizeChromeDepth(depth);
  return stop >= row.minDepth && stop <= row.maxDepth;
}

/** The shade stops on offer at this depth. */
export function shadeRange(depth: number, scheme: BaseScheme = 'dark'): StopRange {
  const ok = SHADE_STOPS.filter((shade) => frameIsOffered(shade, depth, scheme));
  const min = ok[0] ?? DEFAULT_CHROME_SHADE;
  const max = ok[ok.length - 1] ?? DEFAULT_CHROME_SHADE;
  return {
    min,
    max,
    belowElsewhere: DEPTH_STOPS.some((alt) => frameIsOffered(min - 1, alt, scheme)),
    aboveElsewhere: DEPTH_STOPS.some((alt) => frameIsOffered(max + 1, alt, scheme))
  };
}

/** The depth stops on offer at this shade. */
export function depthRange(shade: number, scheme: BaseScheme = 'dark'): StopRange {
  const ok = DEPTH_STOPS.filter((depth) => frameIsOffered(shade, depth, scheme));
  const min = ok[0] ?? DEFAULT_CHROME_DEPTH;
  const max = ok[ok.length - 1] ?? DEFAULT_CHROME_DEPTH;
  return {
    min,
    max,
    belowElsewhere: SHADE_STOPS.some((alt) => frameIsOffered(alt, min - 1, scheme)),
    aboveElsewhere: SHADE_STOPS.some((alt) => frameIsOffered(alt, max + 1, scheme))
  };
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
  rescuedByTheOther: boolean,
  // The family the REGION says binds at this end. It is what the sentence
  // falls back to when the live composition happens to be kinder than the
  // worst hue and contrast the region was measured over, because the region
  // is the promise and the live reading is only the explanation.
  fallback: FloorFailure['family']
): string {
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
  switch (failure?.family ?? fallback) {
    case 'order':
    case 'step':
      return `${lead} renders two panels the same color.`;
    case 'text':
      return `${lead} puts text under its contrast floor.`;
    case 'terminal':
      return `${lead} puts the terminal colors under their floor.`;
    case 'chromatic':
    default:
      // On the light base the dots and the accent bind before the file
      // colours do (Phase 213), and the sentence names what stopped it.
      if (failure?.token.startsWith('--status') === true) {
        return `${lead} puts the status dots under their contrast floor.`;
      }
      if (failure?.token.startsWith('--accent') === true) {
        return `${lead} puts the accent under its contrast floor.`;
      }
      return `${lead} puts the file colors under their contrast floor.`;
  }
}
