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
 *
 * PHASE 213 MADE THE SCHEME PART OF THE FILL, and closed the inline literal
 * gap for it. The fill is composed from the paper when the scheme in effect
 * is light, and the scheme is handed to each window's preload as one argv
 * switch so the document's own pre-paint rule paints the same ground before
 * any stylesheet arrives. Under Match the Mac the fill follows nativeTheme.
 */

import { nativeTheme } from 'electron';
import type { BrowserWindow } from 'electron';
import { windowBackgroundFor } from '@shared/chrome-hue';
import { resolveScheme } from '@shared/settings';
import type { BaseScheme, GmuxSettings } from '@shared/settings';
import { getSettings, onSettingsUpdated } from './store';

/**
 * The base a window draws from right now (Phase 213): the persisted scheme,
 * with 'system' answered by nativeTheme, which is the same Chromium answer
 * the renderer's prefers-color-scheme gives.
 */
export function effectiveSchemeFor(settings: GmuxSettings): BaseScheme {
  return resolveScheme(settings.colorScheme, nativeTheme.shouldUseDarkColors);
}

export function effectiveSchemeNow(): BaseScheme {
  return effectiveSchemeFor(getSettings());
}

/**
 * The one argument a window's preload reads (Phase 213). The preload stamps
 * `data-scheme` on the document root from it before first paint, so the
 * pre-paint rule in index.html and tokens.css both key on the scheme main
 * resolved, and a light launch never paints graphite first. Main knows the
 * settings before the first window exists, which is why the value comes
 * from here and not from a bridge call the renderer would have to await.
 */
export const SCHEME_ARG = '--gmux-scheme=';

export function schemeArgsNow(): string[] {
  return [`${SCHEME_ARG}${effectiveSchemeNow()}`];
}

function fillFor(settings: GmuxSettings): string {
  return windowBackgroundFor(
    settings.chromeHue,
    settings.chromeShade,
    settings.chromeDepth,
    effectiveSchemeFor(settings)
  );
}

/** The fill for a window constructed now, from the persisted frame. */
export function windowBackgroundNow(): string {
  return fillFor(getSettings());
}

/**
 * Keep this window's fill in step with the persisted frame for its lifetime.
 * One listener per window on the settings and one on nativeTheme, both
 * removed when the window closes; a fill that has not changed is not
 * written again. The nativeTheme listener is what makes Match the Mac turn
 * the compositor fill with the system at sunset (Phase 213): it fires in
 * about 8 ms of a change and reads the settings again, so a window whose
 * scheme is not 'system' computes the same fill and writes nothing.
 */
export function followChromeHue(win: BrowserWindow): void {
  let last = windowBackgroundNow();
  const update = (settings: GmuxSettings): void => {
    if (win.isDestroyed()) return;
    const next = fillFor(settings);
    if (next === last) return;
    last = next;
    win.setBackgroundColor(next);
  };
  const stop = onSettingsUpdated(update);
  const onTheme = (): void => {
    update(getSettings());
  };
  nativeTheme.on('updated', onTheme);
  win.once('closed', () => {
    stop();
    nativeTheme.off('updated', onTheme);
  });
}
