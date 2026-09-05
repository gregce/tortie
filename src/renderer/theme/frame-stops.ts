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

/**
 * THE FRAME THIS BASE CAN ACTUALLY DRAW, out of the one a person chose
 * (Phase 213).
 *
 * The two bases do not offer the same region. The dark one offers 35 of the
 * 49 shade and depth pairs; the light one offers 4, because the paper
 * palette was solved AT its floors so the accent could be text and the
 * status dots could clear the active row. So 31 of the 35 frames a person
 * may legitimately be holding on dark are outside the light region, and the
 * Scheme control writes one field: without this, choosing Light while
 * holding a shade of -2 draws a frame whose `--accent-text` is under 4.5:1,
 * and 8 of those 31 invert the ramp ORDER so the sheet stops sitting above
 * the paper.
 *
 * THIS IS NOT THE CLAMP THE HEADER REFUSES. That refusal is about the
 * SLIDERS: a person who asks for a darker shade is told why it stopped and
 * is never quietly given a different one. Here the person asked for a
 * SCHEME, and the frame they were holding is not a thing the new base can
 * draw at all. So the frame is brought to the nearest stop this base does
 * offer, and NOTHING IS PERSISTED: the chosen shade and depth stay in the
 * settings file, the sliders on the new base read this answer so the face
 * never says one frame while the window draws another, and going back to
 * the base that could draw it brings it back exactly.
 *
 * On the dark base this is the identity, because every pair the light base
 * offers sits inside the dark region too, so nothing a person can hold on
 * light is ever moved by choosing Dark. `npm run conformance:hue` rule 27
 * asserts both halves.
 *
 * The shade moves first and the depth is then brought into that shade's own
 * row, because the region is a set of rows rather than a rectangle: on paper
 * only one shade has a row at all, so a depth clamped against some other
 * shade's row would answer about a frame that does not exist. Ties go to the
 * shipped stop, which is the frame the palette was designed at.
 */
export function frameForBase(choice: FrameChoice, scheme: BaseScheme = 'dark'): FrameChoice {
  const shade = sanitizeChromeShade(choice.chromeShade);
  const depth = sanitizeChromeDepth(choice.chromeDepth);
  if (frameIsOffered(shade, depth, scheme)) {
    return { chromeHue: choice.chromeHue, chromeShade: shade, chromeDepth: depth };
  }
  const offered = SHADE_STOPS.filter((s) => rowFor(s, scheme).minDepth <= rowFor(s, scheme).maxDepth);
  let bestShade = DEFAULT_CHROME_SHADE;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const s of offered) {
    const cost = Math.abs(s - shade) * 2 + Math.abs(s - DEFAULT_CHROME_SHADE);
    if (cost < bestCost) {
      bestCost = cost;
      bestShade = s;
    }
  }
  const row = rowFor(bestShade, scheme);
  const stop = Math.min(Math.max(depth, row.minDepth), row.maxDepth);
  return { chromeHue: choice.chromeHue, chromeShade: bestShade, chromeDepth: stop };
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
export interface RefusalFallback {
  /** The family the REGION says binds at this end. */
  family: FloorFailure['family'];
  /**
   * The token the region says binds, where the family alone is not enough to
   * choose a sentence (Phase 213). On paper the shade end is refused because
   * `--accent-text` ships at 5.03:1 against a floor of 4.5 and one stop darker
   * takes it under at hue 30 under Teal; the live composition in front of the
   * person is usually Blue at 222, where nothing fails at all, so without this
   * the sentence would name the file colours, which are not what stopped it.
   */
  token?: string;
}

export function refusalSentence(
  direction: 'darker' | 'lighter' | 'less depth' | 'more depth',
  failure: FloorFailure | null,
  rescuedByTheOther: boolean,
  // The family the REGION says binds at this end. It is what the sentence
  // falls back to when the live composition happens to be kinder than the
  // worst hue and contrast the region was measured over, because the region
  // is the promise and the live reading is only the explanation.
  fallback: FloorFailure['family'] | RefusalFallback
): string {
  const back: RefusalFallback = typeof fallback === 'string' ? { family: fallback } : fallback;
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
  switch (failure?.family ?? back.family) {
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
      const token = failure?.token ?? back.token ?? '';
      if (token.startsWith('--status')) {
        return `${lead} puts the status dots under their contrast floor.`;
      }
      if (token.startsWith('--accent')) {
        return `${lead} puts the accent under its contrast floor.`;
      }
      return `${lead} puts the file colors under their contrast floor.`;
  }
}

/**
 * HOW MANY STOPS THIS AXIS OFFERS (Phase 214).
 *
 * A range is a first and a last offered stop, so its length is the count of
 * stops between them inclusive. One is the smallest a range can be, because
 * the stop in effect is always offered.
 */
export function stopCount(range: StopRange): number {
  return range.max - range.min + 1;
}

/**
 * CAN THIS CONTROL MOVE AT ALL (Phase 214), which is what decides whether the
 * face draws it.
 *
 * THE RULE THE OPERATOR SET on 2026-09-05, in his words, being that light
 * mode may be simplified rather than over engineered: a control that cannot
 * move is not shown. Paper carries ONE shade. The light palette was solved AT
 * its floors, so the accent could be text on paper and the status dots could
 * clear the selected row, and every stop darker than the shipped one takes
 * `--accent-text` under 4.5:1 and the dots under 3:1. Phase 214 measured what
 * buying those stops would cost, being `--accent-text` down to 5.57 on the
 * sidebar and the dots down to 4.1 on the active row for every person on
 * light forever, and he chose the shade the palette ships at over two stops
 * nobody asked for.
 *
 * So on paper the Shade row is ABSENT rather than present and inert, and its
 * refusal sentence goes with it because there is nothing left to refuse. This
 * is not a light-mode special case in the component: it is the length of the
 * range, asked of every axis on every base, so a base or a palette that later
 * opens a second shade row gets its control back with no edit here.
 *
 * The Depth control still moves on paper, four stops of it, so it stays and
 * keeps its own refusal sentence.
 */
export function controlMoves(range: StopRange): boolean {
  return stopCount(range) > 1;
}

/** One axis of the Frame group, as the face draws it. */
export interface AxisReading {
  range: StopRange;
  /** Does the face draw this control? False when it has a single stop. */
  moves: boolean;
  /** The refusal line. EMPTY when the control is not drawn. */
  note: string;
}

/**
 * ONE AXIS, READ (Phase 214). The range, whether the control is drawn, and
 * the sentence it carries when a person pushes past its end.
 *
 * It lives here rather than in the component so that the two halves of the
 * promise are one function `npm run conformance:hue` rule 31 can RUN: a
 * control with a single stop is not drawn, and a control that is not drawn
 * composes no sentence. A note on a hidden control would be a refusal nobody
 * can read, and a drawn control with nothing to say would be the inert
 * slider this phase removed.
 */
export function axisReading(
  axis: 'shade' | 'depth',
  range: StopRange,
  held: number,
  why: (stop: number) => FloorFailure | null,
  ends: {
    below: FloorFailure['family'] | RefusalFallback;
    above: FloorFailure['family'] | RefusalFallback;
  }
): AxisReading {
  const moves = controlMoves(range);
  if (!moves) return { range, moves, note: '' };
  const atLowEnd = held <= range.min;
  const direction = axis === 'shade'
    ? (atLowEnd ? 'darker' : 'lighter')
    : (atLowEnd ? 'less depth' : 'more depth');
  const note = atLowEnd
    ? refusalSentence(direction, why(range.min - 1), range.belowElsewhere, ends.below)
    : refusalSentence(direction, why(range.max + 1), range.aboveElsewhere, ends.above);
  return { range, moves, note };
}
