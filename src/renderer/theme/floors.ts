/**
 * What the frame is not allowed to do (Phase 210). THEME CONSTANT FILE under
 * the CLAUDE.md UI rules, beside presets.ts, derive.ts and hue.ts.
 *
 * ONE PREDICATE, TWO READERS. The Appearance section calls it to decide which
 * stops of the shade and depth sliders it may offer, and `npm run
 * conformance:hue` calls the same function over the whole three axis walk.
 * That is deliberate: the phase's rule is that a setting which cannot keep
 * the floors is REFUSED AT THE CONTROL rather than clamped silently, and a
 * control that refused by its own reading of the floors while the gate
 * measured by another would drift the first time either moved.
 *
 * The families, in the order they are asked and in the order that makes the
 * best sentence for a person:
 *
 *  - ORDER. The five grounds and the three hairlines each read darker to
 *    lighter, in WCAG luminance, which is the space the design pins it in.
 *  - STEP. Every adjacent pair renders as a different eight bit colour, by at
 *    least presets.ts's RENDERED_STEP_MIN in one channel. This is the floor
 *    that binds the dark end: near black, eight bits run out before the ramp
 *    does.
 *  - TEXT. The pins in presets.ts, every text token on every ground it is
 *    allowed on, at 4.5:1, after the text stage has followed the ground.
 *  - TERMINAL. The foreground at 4.5:1 on the canvas and every ANSI colour at
 *    3:1, black and brightBlack excepted because they are near the ground by
 *    design.
 *  - CHROMATIC. The accent, the git decorations and the graph lanes, none of
 *    which move with the frame. This is the floor that binds the light end.
 *
 * Nothing here reads a setting. It is handed the values a derivation produced
 * and answers about those, which is what lets the gate run it under node.
 */

import { parse, converter, wcagContrast, wcagLuminance } from 'culori/fn';
import { terminalTextFor } from '../terminal/theme';
import { textIsDarkOn, TERMINAL_FLOOR, TEXT_FLOOR } from './hue';
import {
  CANVAS_TOKEN,
  CHROMATIC_PINS,
  HAIRLINE_ORDER,
  RAMP_ORDER,
  RENDERED_STEP_MIN,
  RENDERED_STEP_PAIRS,
  TEXT_PINS
} from './presets';

const toRgb = converter('rgb');

/** Which family a refusal belongs to. The control turns this into words. */
export type FloorFamily = 'order' | 'step' | 'text' | 'terminal' | 'chromatic';

export interface FloorFailure {
  family: FloorFamily;
  /** The colour that failed, as a token name or an ANSI key. */
  token: string;
  /** The ground it failed against, as a token name. */
  ground: string;
  /** What was measured, and what was needed. */
  got: number;
  need: number;
}

/** The largest per channel distance between two rendered colours, in 255ths. */
export function renderedStep(a: string, b: string): number {
  const x = parse(a.trim());
  const y = parse(b.trim());
  if (x === undefined || y === undefined) return 255;
  const p = toRgb(x);
  const q = toRgb(y);
  if (p === undefined || q === undefined) return 255;
  return Math.round(
    Math.max(Math.abs(p.r - q.r), Math.abs(p.g - q.g), Math.abs(p.b - q.b)) * 255
  );
}

function luminance(css: string): number {
  const parsed = parse(css.trim());
  return parsed === undefined ? 0 : wcagLuminance(parsed);
}

function ratio(fg: string, bg: string): number {
  const a = parse(fg.trim());
  const b = parse(bg.trim());
  if (a === undefined || b === undefined) return 1;
  return wcagContrast(a, b);
}

/**
 * The first floor this set of values breaks, or null when it breaks none.
 *
 * `valueOf` answers with the value IN EFFECT for a token, which is the
 * override where there is one and the shipped base otherwise. A token it
 * cannot answer for is skipped rather than guessed, the same rule the
 * derivation follows.
 */
export function firstFloorFailure(
  valueOf: (token: string) => string | undefined
): FloorFailure | null {
  const runs = [RAMP_ORDER, HAIRLINE_ORDER];
  for (const run of runs) {
    for (let i = 1; i < run.length; i += 1) {
      const lower = valueOf(run[i - 1] ?? '');
      const upper = valueOf(run[i] ?? '');
      if (lower === undefined || upper === undefined) continue;
      const gap = luminance(upper) - luminance(lower);
      if (gap <= 0) {
        return {
          family: 'order',
          token: run[i] ?? '',
          ground: run[i - 1] ?? '',
          got: gap,
          need: 0
        };
      }
    }
  }

  for (const [a, b] of RENDERED_STEP_PAIRS) {
    const one = valueOf(a);
    const other = valueOf(b);
    if (one === undefined || other === undefined) continue;
    const step = renderedStep(one, other);
    if (step < RENDERED_STEP_MIN) {
      return { family: 'step', token: a, ground: b, got: step, need: RENDERED_STEP_MIN };
    }
  }

  for (const pin of TEXT_PINS) {
    if (pin.floor === null) continue;
    const fg = valueOf(pin.token);
    if (fg === undefined) continue;
    for (const groundToken of pin.grounds) {
      const bg = valueOf(groundToken);
      if (bg === undefined) continue;
      const got = ratio(fg, bg);
      if (got < pin.floor) {
        return {
          family: 'text',
          token: pin.token,
          ground: groundToken,
          got,
          need: pin.floor
        };
      }
    }
  }

  const canvas = valueOf(CANVAS_TOKEN);
  if (canvas !== undefined) {
    const palette = terminalTextFor(canvas, textIsDarkOn(canvas));
    for (const [key, hex] of Object.entries(palette) as [string, string][]) {
      if (key === 'black' || key === 'brightBlack') continue;
      const need = key === 'foreground' ? TEXT_FLOOR : TERMINAL_FLOOR;
      const got = ratio(hex, canvas);
      if (got < need) {
        return { family: 'terminal', token: key, ground: CANVAS_TOKEN, got, need };
      }
    }
  }

  for (const pin of CHROMATIC_PINS) {
    const fg = valueOf(pin.token);
    const bg = valueOf(pin.ground);
    if (fg === undefined || bg === undefined) continue;
    const got = ratio(fg, bg);
    if (got < pin.floor) {
      return {
        family: 'chromatic',
        token: pin.token,
        ground: pin.ground,
        got,
        need: pin.floor
      };
    }
  }

  return null;
}
