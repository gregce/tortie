/**
 * The two coordinate spaces CSS `zoom` creates, and the one conversion that
 * keeps them apart.
 *
 * Inside a zoomed subtree there are two kinds of pixel and they are easy to
 * mix without noticing, because at 100 % they are the same number:
 *
 *  - **Viewport pixels** — what `getBoundingClientRect()`, `clientX/Y` and
 *    `elementFromPoint` speak. Chromium reports zoomed rects, so a rect taken
 *    from a zoomed element hit-tests back to it correctly and every
 *    rect-versus-pointer comparison in the app keeps working untouched.
 *  - **Local pixels** — what a `style="top: Npx"` written INTO that subtree
 *    means, and what `scrollTop` / `offsetHeight` report. One local pixel is
 *    `zoom` viewport pixels.
 *
 * So the rule is narrow: **converting is only needed where a number measured
 * from a client rect (or a pointer) is written back as a style inside a
 * zoomed subtree.** That is exactly the drag affordances — an insertion
 * indicator, a drop line, a lifted ghost — and nothing else.
 */

/**
 * The effective CSS zoom `el` renders under: the product of every `zoom` up
 * its ancestor chain. `currentCSSZoom` is Chromium's own answer (128+);
 * anywhere it is missing, 1 is the correct fallback because an engine without
 * the property does not apply `zoom` either.
 */
export function cssZoomOf(el: Element | null | undefined): number {
  if (el === null || el === undefined) return 1;
  const zoom = (el as { currentCSSZoom?: number }).currentCSSZoom;
  return typeof zoom === 'number' && zoom > 0 ? zoom : 1;
}

/**
 * A length measured in viewport pixels, expressed in `el`'s local pixels —
 * ready to be written as a style on `el` or on one of its descendants.
 */
export function toLocalPx(el: Element | null | undefined, viewportPx: number): number {
  return viewportPx / cssZoomOf(el);
}
