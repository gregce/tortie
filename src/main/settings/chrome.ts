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
 * WHAT STILL SHOWS GRAPHITE, stated so nobody looks for a bug. The two
 * index.html files carry an inline `background: #131417` that paints before
 * any stylesheet arrives, and tokens.css paints the same value until the
 * renderer's settings read lands and the override is written. At a hue other
 * than 222 those first frames are the shipped canvas, which is at most
 * 0.014 from the turned one in OKLab, under half a rung of the ramp. That
 * is the limit Phase 62 recorded for every override and it is unchanged.
 * At the default hue nothing here differs from the constant by a byte.
 */

import type { BrowserWindow } from 'electron';
import { windowBackgroundFor } from '@shared/chrome-hue';
import { getSettings, onSettingsUpdated } from './store';

/** The fill for a window constructed now, from the persisted hue. */
export function windowBackgroundNow(): string {
  return windowBackgroundFor(getSettings().chromeHue);
}

/**
 * Keep this window's fill in step with the persisted hue for its lifetime.
 * One listener per window, removed when the window closes; a fill that has
 * not changed is not written again.
 */
export function followChromeHue(win: BrowserWindow): void {
  let last = windowBackgroundNow();
  const stop = onSettingsUpdated((settings) => {
    if (win.isDestroyed()) return;
    const next = windowBackgroundFor(settings.chromeHue);
    if (next === last) return;
    last = next;
    win.setBackgroundColor(next);
  });
  win.once('closed', stop);
}
