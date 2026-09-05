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
 *
 * THE COMMITTER'S ROUND ADDED THE LAST BLOCK, and it is the one that failed.
 * The rows are not the only thing on the Frame group: Reset is a control this
 * phase deliberately kept on paper, and it wrote all three fields whatever
 * base it was pressed on. So the promise held for the rows and broke for the
 * button, and a person on paper who nudged Depth and pressed Reset lost the
 * shade they had chosen on dark. The block below is the whole press, being
 * the face's two booleans and the patch composed from them.
 */

import { describe, expect, it, vi } from 'vitest';
import type { GmuxSettings, GmuxSettingsPatch } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import {
  axisReading,
  controlMoves,
  depthRange,
  frameForBase,
  frameIsOffered,
  resetFrame,
  shadeRange,
  stopCount
} from '../../theme/frame-stops';
import { frameRegionFor } from '../../theme/presets';
import { shippedBaseFor } from '../../theme/apply';
import { frameFace, resetChromeFrame } from '../AppearanceSection';

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

/** A fake settings bridge that answers set with the merged settings. */
function installBridge(): ReturnType<typeof vi.fn> {
  const settingsSet = vi.fn(
    async (patch: GmuxSettingsPatch): Promise<GmuxSettings> => ({
      ...defaultGmuxSettings(),
      ...patch
    })
  );
  (globalThis as { window?: unknown }).window = { gmux: { settingsSet } };
  return settingsSet;
}

describe('the Reset button on paper (Phase 214 committer round)', () => {
  const composition = { highlightScheme: 'blue' as const, contrastLevel: 'normal' as const };

  it('is LIVE on paper once the one axis paper moves is off its shipped stop', () => {
    // The repro the verifier drove: the button is hidden while the frame
    // paper draws is the shipped one, and Depth is what makes it appear.
    const carried = { chromeHue: 222, chromeShade: -2, chromeDepth: 0 };
    const resting = frameFace('light', composition, shippedBaseFor('light'), carried);
    expect(resting.shadeMoves).toBe(false);
    expect(resting.atDefault).toBe(true);
    const nudged = frameFace('light', composition, shippedBaseFor('light'), {
      ...carried,
      chromeDepth: -1
    });
    expect(nudged.atDefault).toBe(false);
  });

  it('writes no shade on paper, so one press cannot take the dark shade', async () => {
    const settingsSet = installBridge();
    try {
      const face = frameFace('light', composition, shippedBaseFor('light'), {
        chromeHue: 222,
        chromeShade: -2,
        chromeDepth: -1
      });
      await resetChromeFrame({ shade: face.shadeMoves, depth: face.depthMoves });
      const patch = settingsSet.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(patch).toEqual({ chromeHue: 222, chromeDepth: 0 });
      expect(patch).not.toHaveProperty('chromeShade');
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it('writes all three on graphite, where both axes move', async () => {
    const settingsSet = installBridge();
    try {
      const face = frameFace('dark', composition, shippedBaseFor('dark'), {
        chromeHue: 40,
        chromeShade: -2,
        chromeDepth: 3
      });
      expect(face.shadeMoves && face.depthMoves).toBe(true);
      await resetChromeFrame({ shade: face.shadeMoves, depth: face.depthMoves });
      expect(settingsSet.mock.calls[0]?.[0]).toEqual({
        chromeHue: 222,
        chromeShade: 0,
        chromeDepth: 0
      });
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it('composes the patch from the axes alone, over all four combinations', () => {
    expect(resetFrame({ shade: true, depth: true })).toEqual({
      chromeHue: 222,
      chromeShade: 0,
      chromeDepth: 0
    });
    expect(resetFrame({ shade: false, depth: true })).toEqual({
      chromeHue: 222,
      chromeDepth: 0
    });
    expect(resetFrame({ shade: true, depth: false })).toEqual({
      chromeHue: 222,
      chromeShade: 0
    });
    // A base that could move neither would still put the colour back, which
    // is the one control drawn on every base.
    expect(resetFrame({ shade: false, depth: false })).toEqual({ chromeHue: 222 });
  });

  it('leaves no frame on paper where a reset would reach the shade', () => {
    // Over every frame a person can carry from dark onto paper, the reset
    // patch never names the shade, whatever depth they are holding.
    for (const { shade, depth } of offered('dark')) {
      const face = frameFace('light', composition, shippedBaseFor('light'), {
        chromeHue: 222,
        chromeShade: shade,
        chromeDepth: depth
      });
      const patch = resetFrame({ shade: face.shadeMoves, depth: face.depthMoves });
      expect(patch, `carried ${String(shade)}/${String(depth)}`).not.toHaveProperty(
        'chromeShade'
      );
    }
  });
});
