/**
 * The rung chip's floor (Phase 258): `--success` is pinned at 3:1 on
 * `--bg-active` on BOTH bases, beside the `--status-idle` pin Phase 218
 * put there, because the evidence chip on a map node, a sidebar row and
 * the inspector is a non text mark on the row it sits in.
 *
 * The walk over every offered frame is `conformance:hue` rule 32's; this
 * suite pins the structure of the list and the two shipped readings, with
 * WCAG arithmetic of its own, so the pin cannot be taken out in silence.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { converter, parse } from 'culori';
import { readCssTokens } from '../../scm/graph/__tests__/contrast';
import { RUNG_PINS, STATUS_PINS_DARK, STATUS_PINS_LIGHT, chromaticPinsFor } from '../presets';
import { RUNG_TONE_TOKEN } from '../../arch/rung';

const toRgb = converter('rgb');

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
const light = readCssTokens(css, 'light');

/** The lightest `--bg-active` any offered dark frame reaches, per rule 32's walk. */
const BINDING_FILL = '#424238';

describe('Phase 258: the rung chip floor', () => {
  it('pins --success on --bg-active at 3 on both bases, beside the idle pin', () => {
    expect(RUNG_PINS).toEqual([{ token: '--success', ground: '--bg-active', floor: 3 }]);
    for (const scheme of ['dark', 'light'] as const) {
      const pins = chromaticPinsFor(scheme);
      expect(pins).toContainEqual({ token: '--success', ground: '--bg-active', floor: 3 });
      expect(pins).toContainEqual({ token: '--status-idle', ground: '--bg-active', floor: 3 });
    }
    // The two chip tokens are exactly the two the lists pin.
    const pinned = new Set([...STATUS_PINS_DARK, ...STATUS_PINS_LIGHT, ...RUNG_PINS].map((p) => p.token));
    for (const token of Object.values(RUNG_TONE_TOKEN)) expect(pinned.has(token)).toBe(true);
  });

  it('clears the floor on the shipped fills and on the binding dark fill', () => {
    const successDark = dark.get('--success');
    const successLight = light.get('--success');
    const activeDark = dark.get('--bg-active');
    const activeLight = light.get('--bg-active');
    if (successDark === undefined || successLight === undefined || activeDark === undefined || activeLight === undefined) {
      throw new Error('a token is not declared');
    }
    expect(ratio(successDark, activeDark)).toBeGreaterThanOrEqual(3);
    expect(ratio(successDark, BINDING_FILL)).toBeGreaterThanOrEqual(3);
    expect(ratio(successLight, activeLight)).toBeGreaterThanOrEqual(3);
  });
});
