/**
 * The pairing code's two colours, and the one place they are named (Phase
 * 316.1).
 *
 * A camera reads a QR code as dark modules on a light ground. Drawn in the
 * dark theme's own colours it would be light on dark, which many scanners
 * refuse, so the code keeps ONE look in both themes: dark ink on a light
 * ground (build/p316/SPEC.md, S1 mechanism 7).
 *
 * THEY ARE NEITHER TOKENS NOR LITERALS. A token follows the theme, which is
 * exactly what this must not do, and a hex written here would be a colour
 * outside the theme constant files that `conformance:hue` rule 26 refuses.
 * They are CSS's own system colours, `Canvas` (the page's paper) and
 * `CanvasText` (its ink), resolved under `color-scheme: light`, which the
 * code's own element sets. CSS Color Adjustment Level 1 says an element's used
 * colour scheme decides its system colours, so under a pinned light scheme
 * they are the light paper and the light ink whichever theme the window is in,
 * and nothing here moves when the theme does.
 *
 * ./Qr.tsx is the only reader. A verifier reads the drawn result with
 * `getComputedStyle` on the code's ground and ink, in both schemes.
 */

/** The colour scheme the code is drawn in, whatever the window's is. */
export const QR_COLOR_SCHEME = 'light';

/** The ground, the quiet zone included: the light scheme's paper. */
export const QR_GROUND = 'Canvas';

/** The dark modules: the light scheme's ink. */
export const QR_INK = 'CanvasText';
