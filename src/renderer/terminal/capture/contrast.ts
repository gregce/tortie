/**
 * THE CONTRAST FLOOR, APPLIED TO A CAPTURE (Phase 213).
 *
 * On the light base the terminal runs with xterm's `minimumContrastRatio` at
 * 4.5, because nine of the twelve registry agents hard code their colours for
 * a dark ground and ignore the sixteen slots: on paper Claude Code draws its
 * bullets in #ffffff at 1.07:1 (research 80 section 1.3). xterm applies that
 * floor at DRAW time, in the renderer, and it changes no cell, so a capture
 * built from the buffer would carry the colour the agent asked for and the
 * screen would carry the colour the person can read. A capture of a light
 * session would then be a page of invisible text.
 *
 * So the capture applies the same rule to the same cells, and this module is
 * the rule. It is a VENDORED EXTRACT of xterm's own arithmetic rather than a
 * new one, per the assemble-never-reimplement guardrail, taken from
 * `@xterm/xterm` 6.0.0 `src/common/Color.ts` (`rgba.ensureContrastRatio`,
 * `reduceLuminance`, `increaseLuminance`) and `src/browser/renderer/shared/
 * RendererUtils.ts` (`treatGlyphAsBackgroundColor`), which are MIT licensed,
 * Copyright (c) 2017 The xterm.js authors. The naive ten percent walk and the
 * try-one-direction-then-the-other order are xterm's and are kept exactly,
 * because the point is to reproduce what the screen drew and not to draw
 * something nicer: `__tests__/capture-contrast.test.ts` pins the five cells
 * research 80 section 1.3 measured in the running app against this code, and
 * rule 29 of `npm run conformance:hue` pins the same five and asserts that
 * ./serialize.ts really calls this.
 *
 * WHO CALLS IT, because a floor nothing applies is a floor nobody has.
 * `./serialize.ts` is the one caller, and through it the whole BUFFER path,
 * being Copy as HTML, a history capture and a selection scrolled out of
 * view. The pixel path needs none of it: a screenshot already carries what
 * xterm drew. The floor it is given is the live pane's own, which is 1 on
 * the dark base, so dark markup is byte identical to what it was before this
 * module existed.
 */

/** The channels of a `#rrggbb`, or null for anything else. */
function channels(value: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value.trim());
  if (hex === null) return null;
  const [, r, g, b] = hex;
  if (r === undefined || g === undefined || b === undefined) return null;
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG relative luminance. xterm's `rgb.relativeLuminance2`. */
function relativeLuminance(r: number, g: number, b: number): number {
  const f = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return f(r) * 0.2126 + f(g) * 0.7152 + f(b) * 0.0722;
}

function contrastRatio(a: number, b: number): number {
  return a < b ? (b + 0.05) / (a + 0.05) : (a + 0.05) / (b + 0.05);
}

type Rgb = [number, number, number];

/** xterm's `reduceLuminance`: ten percent down a channel at a time. */
function reduceLuminance(bg: Rgb, fg: Rgb, ratio: number): Rgb {
  let [r, g, b] = fg;
  const target = relativeLuminance(bg[0], bg[1], bg[2]);
  let cr = contrastRatio(relativeLuminance(r, g, b), target);
  while (cr < ratio && (r > 0 || g > 0 || b > 0)) {
    r -= Math.max(0, Math.ceil(r * 0.1));
    g -= Math.max(0, Math.ceil(g * 0.1));
    b -= Math.max(0, Math.ceil(b * 0.1));
    cr = contrastRatio(relativeLuminance(r, g, b), target);
  }
  return [r, g, b];
}

/** xterm's `increaseLuminance`: ten percent of the room left, at a time. */
function increaseLuminance(bg: Rgb, fg: Rgb, ratio: number): Rgb {
  let [r, g, b] = fg;
  const target = relativeLuminance(bg[0], bg[1], bg[2]);
  let cr = contrastRatio(relativeLuminance(r, g, b), target);
  while (cr < ratio && (r < 0xff || g < 0xff || b < 0xff)) {
    r = Math.min(0xff, r + Math.ceil((255 - r) * 0.1));
    g = Math.min(0xff, g + Math.ceil((255 - g) * 0.1));
    b = Math.min(0xff, b + Math.ceil((255 - b) * 0.1));
    cr = contrastRatio(relativeLuminance(r, g, b), target);
  }
  return [r, g, b];
}

/**
 * The foreground xterm would draw for this pair at this floor, or null when
 * it would draw the one it was given. xterm's `rgba.ensureContrastRatio`.
 */
export function ensureContrastRatio(background: string, foreground: string, ratio: number): string | null {
  if (ratio <= 1) return null;
  const bg = channels(background);
  const fg = channels(foreground);
  if (bg === null || fg === null) return null;
  const bgL = relativeLuminance(bg[0], bg[1], bg[2]);
  const fgL = relativeLuminance(fg[0], fg[1], fg[2]);
  if (contrastRatio(bgL, fgL) >= ratio) return null;
  const first = fgL < bgL ? reduceLuminance : increaseLuminance;
  const second = fgL < bgL ? increaseLuminance : reduceLuminance;
  const a = first(bg, fg, ratio);
  const aRatio = contrastRatio(bgL, relativeLuminance(a[0], a[1], a[2]));
  if (aRatio >= ratio) return toHex(a[0], a[1], a[2]);
  const b = second(bg, fg, ratio);
  const bRatio = contrastRatio(bgL, relativeLuminance(b[0], b[1], b[2]));
  const win = aRatio > bRatio ? a : b;
  return toHex(win[0], win[1], win[2]);
}

/**
 * The glyphs xterm exempts from the floor, because they are drawn as a
 * background rather than read as a letter: the powerline separators and the
 * box and block drawing range. Lifting a half block would put a seam of a
 * different colour through a TUI's own frame.
 */
export function treatGlyphAsBackgroundColor(codepoint: number): boolean {
  return (codepoint >= 0xe0a4 && codepoint <= 0xe0d6) || (codepoint >= 0x2500 && codepoint <= 0x259f);
}

/**
 * The floor a DIM cell is held to. xterm halves it, so dim text stays
 * distinguishable from the text beside it rather than being lifted onto it.
 */
export function floorForCell(floor: number, dim: boolean): number {
  return dim ? floor / 2 : floor;
}
