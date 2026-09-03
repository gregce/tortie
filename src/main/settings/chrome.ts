/**
 * The window paints the chosen hue before any renderer exists (Phase 207).
 *
 * `BrowserWindow({ backgroundColor })` is the compositor's fill, painted
 * before a document exists and again in the strip a resize exposes before
 * the renderer catches up. Since Phase 16 it has been the one constant main
 * knows, WINDOW_BACKGROUND, a mirror of `--bg-canvas`. A hue that turns the
 * canvas and left this constant graphite would show graphite on every
 * launch and at every resize, so main composes the fill from the SAME
 * shared rotation the renderer writes into the token
 * (src/shared/chrome-hue.ts), from the settings it already holds before the
 * first window, and keeps a live window's fill in step on every settings
 * change.
 *
 * WHAT STILL SHOWS GRAPHITE, stated so nobody looks for a bug, and PHASE 210
 * MADE IT BIGGER. The two index.html files carry an inline
 * `background: #131417` that paints before any stylesheet arrives, and
 * tokens.css paints the same value until the renderer's settings read lands
 * and the override is written. Phase 207 recorded that gap as at most 0.014
 * in OKLab, under half a rung of the ramp, because a hue moves perceived
 * lightness by at most 0.002. A SHADE MOVES IT ON PURPOSE: the span of the
 * seven shade stops is 0.15 in OKLCH lightness, from canvas #020204 at the
 * darkest to #1e1f23 at the lightest, so at an end stop those first frames
 * are up to 0.052 in OKLCH L away from the canvas that follows. The window
 * fill this module composes is right from the first compositor paint, so
 * what remains is the inline literal in the two documents and the diff
 * view's shipped ground. At the shipped frame nothing here differs from the
 * constant by a byte.
 */

import type { BrowserWindow } from 'electron';
import { windowBackgroundFor } from '@shared/chrome-hue';
import { getSettings, onSettingsUpdated } from './store';

/** The fill for a window constructed now, from the persisted frame. */
export function windowBackgroundNow(): string {
  const settings = getSettings();
  return windowBackgroundFor(
    settings.chromeHue,
    settings.chromeShade,
    settings.chromeDepth
  );
}

/**
 * Keep this window's fill in step with the persisted frame for its lifetime.
 * One listener per window, removed when the window closes; a fill that has
 * not changed is not written again.
 */
export function followChromeHue(win: BrowserWindow): void {
  let last = windowBackgroundNow();
  const stop = onSettingsUpdated((settings) => {
    if (win.isDestroyed()) return;
    const next = windowBackgroundFor(
      settings.chromeHue,
      settings.chromeShade,
      settings.chromeDepth
    );
    if (next === last) return;
    last = next;
    win.setBackgroundColor(next);
  });
  win.once('closed', stop);
}
