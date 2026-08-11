/**
 * The image viewer's arithmetic, kept pure so it can be tested without a
 * layout engine. Every number the viewer shows or applies is computed here;
 * the component owns only React state and DOM events.
 *
 * Two decisions worth stating once, because both are easy to get subtly
 * wrong and neither is visible in a screenshot:
 *
 *  - FIT NEVER UPSCALES. A 16×16 favicon opened in a 700px panel should be a
 *    16×16 favicon, not a blurry wall. Fit is `min(1, contain)`, so it only
 *    ever shrinks something that does not fit.
 *  - ZOOM IS ANCHORED AT THE POINTER. Scaling about the centre makes the
 *    thing you were looking at run away from the cursor; anchoring keeps the
 *    pixel under the pointer under the pointer, which is what makes wheel
 *    zoom feel like a magnifier instead of a slider.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 32;

/**
 * The ladder ⌘+ / ⌘- walk. Fixed stops rather than a multiplier so repeated
 * presses land on the round numbers people reason about (50%, 100%, 200%)
 * instead of 1.728×.
 */
export const SCALE_STOPS: readonly number[] = [
  0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32
];

/** Scale that fits `natural` inside `view` without ever enlarging it. */
export function fitScale(natural: Size, view: Size): number {
  if (
    natural.width <= 0 ||
    natural.height <= 0 ||
    view.width <= 0 ||
    view.height <= 0
  ) {
    return 1;
  }
  return Math.min(1, view.width / natural.width, view.height / natural.height);
}

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * The next stop above (`+1`) or below (`-1`) `scale`. Strictly monotonic:
 * from a scale that sits between two stops it moves to the neighbouring one,
 * never back to the value it started from.
 */
export function stepScale(scale: number, direction: 1 | -1): number {
  const current = clampScale(scale);
  // A hair of tolerance so a stop reached by wheel (1.0000000002) still
  // counts as that stop rather than as "just above it".
  const epsilon = 1e-6;
  if (direction === 1) {
    const next = SCALE_STOPS.find((s) => s > current + epsilon);
    return next ?? MAX_SCALE;
  }
  const below = SCALE_STOPS.filter((s) => s < current - epsilon);
  return below[below.length - 1] ?? MIN_SCALE;
}

/**
 * Continuous wheel zoom. Exponential in the wheel delta so one notch changes
 * the picture by the same PROPORTION at every scale — a linear step would
 * crawl at 8× and leap at 0.1×.
 */
export function wheelScale(scale: number, deltaY: number): number {
  return clampScale(scale * Math.exp(-deltaY * 0.0015));
}

/**
 * How far the image may be dragged. The rule: an axis with overflow can be
 * panned across exactly that overflow; an axis without overflow is centred
 * and cannot be panned at all — so an image smaller than the panel can never
 * be flicked off the edge and lost.
 */
export function clampOffset(
  offset: Offset,
  natural: Size,
  view: Size,
  scale: number
): Offset {
  const limitX = Math.max(0, (natural.width * scale - view.width) / 2);
  const limitY = Math.max(0, (natural.height * scale - view.height) / 2);
  return {
    x: Math.min(limitX, Math.max(-limitX, offset.x)),
    y: Math.min(limitY, Math.max(-limitY, offset.y))
  };
}

/** True when the image at this scale has anywhere to be dragged to. */
export function isPannable(
  natural: Size,
  view: Size,
  scale: number
): boolean {
  return (
    natural.width * scale > view.width + 0.5 ||
    natural.height * scale > view.height + 0.5
  );
}

/**
 * The offset that keeps the image point currently under `pointer` under
 * `pointer` after the scale changes.
 *
 * `pointer` is relative to the CENTRE of the viewport (so (0,0) is the
 * middle), which is the frame the offset itself lives in — the image is
 * centred and then translated by `offset`.
 */
export function zoomAnchoredOffset(
  offset: Offset,
  pointer: Offset,
  fromScale: number,
  toScale: number
): Offset {
  const ratio = toScale / fromScale;
  return {
    x: pointer.x - (pointer.x - offset.x) * ratio,
    y: pointer.y - (pointer.y - offset.y) * ratio
  };
}

/** "100%", "12%", "800%" — the readout in the metadata line. */
export function formatZoom(scale: number): string {
  const percent = scale * 100;
  const rounded = percent >= 10 ? Math.round(percent) : Math.round(percent * 10) / 10;
  return `${String(rounded)}%`;
}

/**
 * Human file size. Binary steps with decimal names, which is what Finder,
 * GitHub and every other place the user will compare this number against
 * actually shows for an image.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${String(Math.round(bytes))} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${String(Math.round(kb))} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : String(Math.round(mb))} MB`;
}

/** Short display type for the metadata line: `image/svg+xml` → "SVG". */
export function shortTypeOf(mediaType: string): string {
  const sub = mediaType.split('/')[1] ?? mediaType;
  const base = sub.split('+')[0] ?? sub;
  return base.replace(/^x-/, '').toUpperCase();
}
