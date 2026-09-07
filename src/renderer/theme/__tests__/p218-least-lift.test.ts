/**
 * Phase 218's fix round. The sentence that said `#8b93a1` was the LEAST lift
 * clearing the dot floor, made executable.
 *
 * WHY THIS FILE EXISTS. tokens.css §1.3, presets.ts's `STATUS_PINS_DARK`
 * comment and DESIGN.md §1.3 all asserted a minimality nobody had measured.
 * The least lift at the shipped chroma and hue is `#858c9a`, two eight bit
 * steps lower, and it keeps the same 35 offered cells, so the claim was
 * false. The reason the phase went past it is real and measurable, and it is
 * what this file pins: a margin one eight bit level of the ground eats, and
 * a ΔE2000 from `--text-muted` inside a just noticeable difference.
 *
 * These are the sentence's own numbers rather than a restatement of the
 * gate's. `npm run conformance:hue` rule 32 proves the floor is KEPT over
 * every offered frame; this proves the prose's account of WHY the colour is
 * the one it is, and it goes red the moment either the dot or the muted text
 * moves and leaves the words standing.
 *
 * `build/p218/least-lift.mts` prints the whole ladder over the real walk;
 * `#424238` is the walk's answer for the lightest `--bg-active` any offered
 * frame reaches, and the derivation below is what makes it not a magic hex.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { converter, differenceCiede2000, formatHex, parse } from 'culori';
import { readCssTokens } from '../../scm/graph/__tests__/contrast';
import { deriveOverrides } from '../derive';
import { ALL_THEME_TOKENS } from '../presets';

const toOklch = converter('oklch');
const toRgb = converter('rgb');
const ciede = differenceCiede2000();
/** ΔE2000 between two hexes, with the parse checked rather than asserted. */
function dE(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);
  if (left === undefined || right === undefined) throw new Error(`not a colour: ${a} ${b}`);
  return ciede(left, right);
}

/** WCAG 2.x relative luminance and contrast, written here rather than borrowed. */
function relativeLuminance(css: string): number {
  const rgb = toRgb(parse(css));
  if (rgb === undefined) throw new Error(`not a colour: ${css}`);
  const channel = (value: number): number => {
    const eight = Math.round(value * 255) / 255;
    return eight <= 0.04045 ? eight / 12.92 : ((eight + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}
function ratio(a: string, b: string): number {
  const x = relativeLuminance(a);
  const y = relativeLuminance(b);
  return x > y ? (x + 0.05) / (y + 0.05) : (y + 0.05) / (x + 0.05);
}

const css = readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8');
const dark = readCssTokens(css, 'dark');
const token = (name: string): string => {
  const value = dark.get(name);
  if (value === undefined) throw new Error(`${name} is not declared on the dark base`);
  return value.toLowerCase();
};

/** WCAG 1.4.11's floor for a non text mark. */
const DOT_FLOOR = 3;
/** The lightest `--bg-active` any offered frame reaches, per the rule 32 walk. */
const BINDING_FILL = '#424238';

describe('Phase 218 fix round: the lift is a judgement, not a solved minimum', () => {
  const idle = token('--status-idle');
  const exited = token('--status-exited');
  const muted = token('--text-muted');

  it('the binding fill is one the frame really derives, not a hex from prose', () => {
    const base: Record<string, string> = {};
    for (const name of ALL_THEME_TOKENS) {
      const value = dark.get(name);
      if (value !== undefined) base[name] = value;
    }
    const overrides = deriveOverrides(
      {
        highlightScheme: 'blue',
        contrastLevel: 'high',
        chromeHue: 63,
        chromeShade: -2,
        chromeDepth: 3
      },
      base
    );
    expect((overrides['--bg-active'] ?? base['--bg-active'])?.toLowerCase()).toBe(BINDING_FILL);
  });

  it('IDLE and ENDED are one colour, and it clears the floor by 0.281', () => {
    expect(exited).toBe(idle);
    expect(ratio(idle, BINDING_FILL)).toBeCloseTo(3.281, 3);
    expect(ratio(idle, BINDING_FILL) - DOT_FLOOR).toBeGreaterThan(0.25);
  });

  /**
   * The refutation itself. Hold the shipped chroma and hue and bisect on
   * OKLCH lightness for the first colour that clears the floor on the binding
   * fill: it is BELOW the shipped one, so the shipped one is not the least.
   */
  const shippedOklch = toOklch(parse(idle));
  const atLightness = (l: number): string =>
    formatHex({ mode: 'oklch', l, c: shippedOklch?.c ?? 0, h: shippedOklch?.h ?? 0 });
  const leastLift = ((): string => {
    let low = 0;
    let high = shippedOklch?.l ?? 1;
    for (let step = 0; step < 60; step += 1) {
      const mid = (low + high) / 2;
      if (ratio(atLightness(mid), BINDING_FILL) >= DOT_FLOOR) high = mid;
      else low = mid;
    }
    return atLightness(high);
  })();

  it('a SMALLER lift clears the same floor, so the shipped one is not the least', () => {
    expect(leastLift).toBe('#858c9a');
    expect(ratio(leastLift, BINDING_FILL)).toBeCloseTo(3.005, 3);
    expect(relativeLuminance(leastLift)).toBeLessThan(relativeLuminance(idle));
  });

  it('the least lift is refused by a margin one eight bit level of the ground eats', () => {
    const fill = toRgb(parse(BINDING_FILL));
    if (fill === undefined) throw new Error('unreadable fill');
    const oneLevelLighter = formatHex({
      mode: 'rgb',
      r: Math.min(1, fill.r + 1 / 255),
      g: Math.min(1, fill.g + 1 / 255),
      b: Math.min(1, fill.b + 1 / 255)
    });
    const cost = ratio(leastLift, BINDING_FILL) - ratio(leastLift, oneLevelLighter);
    expect(cost).toBeCloseTo(0.047, 3);
    expect(ratio(leastLift, BINDING_FILL) - DOT_FLOOR).toBeLessThan(cost);
    // and the shipped colour survives about six of them
    expect(ratio(idle, BINDING_FILL) - DOT_FLOOR).toBeGreaterThan(5 * cost);
  });

  it('the least lift is refused again at one just noticeable difference from the muted text', () => {
    expect(dE(leastLift, muted)).toBeCloseTo(1.13, 2);
    expect(dE(idle, muted)).toBeCloseTo(3.44, 2);
  });

  /**
   * The clause that keeps the corrected prose from becoming a second false
   * minimality claim: a stop BETWEEN the two already satisfies both
   * refusals, so where the phase stopped is a judgement.
   */
  it('a stop between the two already clears both refusals', () => {
    const between = '#88909e';
    expect(relativeLuminance(between)).toBeGreaterThan(relativeLuminance(leastLift));
    expect(relativeLuminance(between)).toBeLessThan(relativeLuminance(idle));
    expect(ratio(between, BINDING_FILL) - DOT_FLOOR).toBeCloseTo(0.158, 3);
    expect(dE(between, muted)).toBeCloseTo(2.48, 2);
  });
});
