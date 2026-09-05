/**
 * Phase 214: THE SHADE THE PERSON CHOSE ON DARK SURVIVES PAPER BECAUSE THERE
 * IS NOTHING ON PAPER TO WRITE IT.
 *
 * Phase 213's committer's round fixed this with a guard inside the slider:
 * a move that lands on the stop already drawn writes nothing. That guard
 * stays and `p213-carried-frame.test.ts` still pins it. This file pins the
 * stronger thing Phase 214 does, which is that the control is not there at
 * all: paper carries one shade, so the row is absent rather than present and
 * inert and no key, no click and no drag can reach the setting.
 *
 * Both halves are asserted over EVERY frame a person can be holding, being
 * all 35 pairs the dark base offers, because the promise is about a frame
 * carried from dark rather than about one frame the report happened to name.
 */

import { describe, expect, it } from 'vitest';
import {
  axisReading,
  controlMoves,
  depthRange,
  frameForBase,
  frameIsOffered,
  shadeRange,
  stopCount
} from '../../theme/frame-stops';
import { frameRegionFor } from '../../theme/presets';

/** Every shade and depth pair a base offers, which is what a person can hold. */
function offered(scheme: 'dark' | 'light'): { shade: number; depth: number }[] {
  const out: { shade: number; depth: number }[] = [];
  for (const row of frameRegionFor(scheme)) {
    for (let depth = row.minDepth; depth <= row.maxDepth; depth += 1) {
      out.push({ shade: row.shade, depth });
    }
  }
  return out;
}

describe('the Shade control on paper (Phase 214)', () => {
  it('has one stop at every frame paper can draw, so it is never drawn', () => {
    const light = offered('light');
    expect(light.length).toBe(4);
    for (const { shade, depth } of light) {
      const range = shadeRange(depth, 'light');
      expect(stopCount(range), `shade stops at ${shade}/${depth}`).toBe(1);
      expect(controlMoves(range)).toBe(false);
      // And it carries no sentence, because there is nothing to refuse.
      const reading = axisReading('shade', range, shade, () => null, {
        below: { family: 'chromatic' as const, token: '--accent-text' },
        above: { family: 'order' as const }
      });
      expect(reading.moves).toBe(false);
      expect(reading.note).toBe('');
    }
  });

  it('is never drawn for any frame a person can carry from dark', () => {
    for (const { shade, depth } of offered('dark')) {
      const held = frameForBase({ chromeHue: 222, chromeShade: shade, chromeDepth: depth }, 'light');
      expect(controlMoves(shadeRange(held.chromeDepth, 'light'))).toBe(false);
    }
  });

  it('leaves Depth on paper alive, with four stops and its own sentence', () => {
    const range = depthRange(0, 'light');
    expect(stopCount(range)).toBe(4);
    expect(controlMoves(range)).toBe(true);
    const reading = axisReading('depth', range, range.max, () => null, {
      below: { family: 'step' as const },
      above: { family: 'chromatic' as const }
    });
    expect(reading.moves).toBe(true);
    expect(reading.note).not.toBe('');
  });

  it('keeps both controls on dark, where both still move', () => {
    for (const { shade, depth } of offered('dark')) {
      expect(controlMoves(shadeRange(depth, 'dark')), `shade at depth ${depth}`).toBe(true);
      expect(controlMoves(depthRange(shade, 'dark')), `depth at shade ${shade}`).toBe(true);
    }
  });

  it('brings a carried frame to paper and back to dark with nothing lost', () => {
    // `frameForBase` persists nothing, so the round trip is the identity on
    // every frame the dark base offers: the visit to paper draws the stop
    // paper can draw and the chosen frame is still what comes back.
    for (const { shade, depth } of offered('dark')) {
      const chosen = { chromeHue: 222, chromeShade: shade, chromeDepth: depth };
      const onPaper = frameForBase(chosen, 'light');
      expect(frameIsOffered(onPaper.chromeShade, onPaper.chromeDepth, 'light')).toBe(true);
      // The setting itself never moved, so choosing Dark reads it back whole.
      expect(frameForBase(chosen, 'dark')).toEqual(chosen);
    }
  });
});
