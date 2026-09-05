/**
 * Phase 213, the committer's round: A FRAME THE NEW BASE CANNOT DRAW SURVIVES
 * THE VISIT, because neither Frame slider writes the stop it was brought to.
 *
 * The defect, re-derived in the real app before it was fixed. `frameForBase`
 * brings a carried frame to the nearest stop the new base offers and its
 * header promises that nothing is persisted, so going back to the base that
 * could draw it brings it back exactly. The sliders broke that promise: the
 * thumb drew the BROUGHT stop and every move persisted whatever it clamped
 * to. On paper the whole offered region is the single shade row at 0, so the
 * Shade slider is inert, and one arrow key on it wrote 0 over the -2 chosen
 * on dark. Driven at the parent build with real key and mouse events through
 * CDP: shade -2 and depth 3 set on dark, one ArrowLeft on paper, and Dark
 * came back at shade 0 with the depth gone too.
 *
 * The guard is `persist: stopped !== drawn`. This file pins both halves of it
 * over the SHIPPING region tables, because the half that is easy to lose in a
 * later round is not the refusal but the control: a move inside the range
 * must still write, or a live slider has been made dead.
 */

import { describe, expect, it } from 'vitest';
import { stopSliderPick } from '../AppearanceSection';
import {
  depthRange,
  frameForBase,
  shadeRange
} from '../../theme/frame-stops';

/** The frame the operator's report is about: legal on dark, on neither light axis. */
const CARRIED = { chromeHue: 222, chromeShade: -2, chromeDepth: 3 };

describe('a carried frame and the two stop sliders', () => {
  it('is brought to the shipped stop on paper and left alone on dark', () => {
    expect(frameForBase(CARRIED, 'light')).toEqual({
      chromeHue: 222,
      chromeShade: 0,
      chromeDepth: 0
    });
    expect(frameForBase(CARRIED, 'dark')).toEqual(CARRIED);
  });

  it('has an inert Shade slider on paper, which is the one that lost the shade', () => {
    const drawn = frameForBase(CARRIED, 'light');
    const range = shadeRange(drawn.chromeDepth, 'light');
    expect(range.min).toBe(0);
    expect(range.max).toBe(0);
    // Every stop the track offers, being both arrow keys and any click.
    for (const raw of [-4, -3, -2, -1, 0, 1, 2]) {
      const pick = stopSliderPick(raw, {
        edgeMin: range.min,
        edgeMax: range.max,
        drawn: drawn.chromeShade
      });
      expect(pick.stopped).toBe(0);
      expect(pick.persist).toBe(false);
    }
  });

  it('refuses a Depth move past paper edge without writing, and writes one inside it', () => {
    const drawn = frameForBase(CARRIED, 'light');
    const range = depthRange(drawn.chromeShade, 'light');
    expect([range.min, range.max]).toEqual([-3, 0]);
    const at = (raw: number): ReturnType<typeof stopSliderPick> =>
      stopSliderPick(raw, {
        edgeMin: range.min,
        edgeMax: range.max,
        drawn: drawn.chromeDepth
      });
    // Past the edge, landing on the stop already drawn: refused, and silent.
    expect(at(3)).toEqual({ stopped: 0, refused: true, persist: false });
    expect(at(1)).toEqual({ stopped: 0, refused: true, persist: false });
    // Inside the range: it moves and it writes. This is the control.
    expect(at(-1)).toEqual({ stopped: -1, refused: false, persist: true });
    expect(at(-3)).toEqual({ stopped: -3, refused: false, persist: true });
    // Past the FAR edge from a stop that is not the drawn one: it lands on
    // the edge, which is the designed refusal, and that landing is a real
    // move so it writes.
    expect(stopSliderPick(-6, { edgeMin: range.min, edgeMax: range.max, drawn: 0 })).toEqual({
      stopped: -3,
      refused: true,
      persist: true
    });
  });

  it('leaves the dark base exactly as it was, which is the whole no-change claim', () => {
    // On dark the drawn stop IS the persisted one for every pair the region
    // offers, so the only writes the guard removes are writes of the value
    // already there. Every ordinary move still writes and still refuses at
    // the same places.
    for (const depth of [-3, -2, -1, 0, 1, 2, 3]) {
      const range = shadeRange(depth, 'dark');
      for (let drawn = range.min; drawn <= range.max; drawn += 1) {
        for (const raw of [-5, -4, -3, -2, -1, 0, 1, 2, 3]) {
          const pick = stopSliderPick(raw, {
            edgeMin: range.min,
            edgeMax: range.max,
            drawn
          });
          const stopped = Math.min(range.max, Math.max(range.min, raw));
          expect(pick.stopped).toBe(stopped);
          expect(pick.refused).toBe(stopped !== raw);
          // The one and only difference from the old behaviour.
          expect(pick.persist).toBe(stopped !== drawn);
        }
      }
    }
  });
});
