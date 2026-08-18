/**
 * Inline-styled HTML → PNG bytes, in about forty lines and zero dependencies.
 *
 * `html-to-image` and friends exist to clone a live DOM node, inline every
 * computed style and embed webfonts. Our input is machine-generated and
 * already fully inline-styled, so all that is left is:
 *
 *   XMLSerializer → <svg><foreignObject> → data: URL → <img>.decode()
 *                 → canvas.drawImage → canvas.toBlob('image/png')
 *
 * An SVG from a `data:` URL is same-origin and carries no external
 * references, so the canvas is never tainted (verified, research 17 §4.2).
 * That isolation is also why the caller may have to hand us a face. The SVG is
 * its own document. The host page's `@font-face` rules do not reach inside it
 * and it fetches nothing. Under the System preset the terminal draws in a face
 * the machine already has and `fontCss` stays empty. Under a bundled preset
 * (Phase 78) the caller passes base64 `@font-face` rules and they go into the
 * foreignObject, or the export comes out in Menlo while the screen shows the
 * chosen face.
 *
 * Hard cap: a canvas dimension tops out near 65,535 device px ≈ 1,770 rows at
 * dpr 2 — well past the 1,000-row ceiling the capture UI offers.
 */

const PAD = 10;

/** Measured advance of one character in `font`, for the cell-grid correction. */
export function naturalAdvance(font: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx === null) return 0;
  ctx.font = font;
  return ctx.measureText('M'.repeat(100)).width / 100;
}

/**
 * xterm snaps every glyph to its cell; `white-space: pre` advances by the
 * font's natural width, which measured ~1.5% narrow over 78 columns. One
 * letter-spacing value closes the gap.
 */
export function letterSpacingCorrection(
  cellWidth: number,
  fontSizePx: number,
  fontFamily: string
): number {
  const advance = naturalAdvance(`${fontSizePx}px ${fontFamily}`);
  if (advance <= 0) return 0;
  return cellWidth - advance;
}

export interface RasterizeInput {
  /** A single root `<div>` with everything styled inline. */
  html: string;
  /** CSS-pixel size of the content, padding excluded. */
  widthCss: number;
  heightCss: number;
  /** Painted behind the content so the PNG has no transparent gutter. */
  background: string;
  /**
   * CSS to place inside the foreignObject, e.g. base64 `@font-face` rules
   * from `capture-fonts.ts`. Empty or absent inlines nothing, which is the
   * System preset and the pre-Phase-78 output byte for byte.
   */
  fontCss?: string;
}

/**
 * The whole SVG string, split out so a test can byte-compare it without a
 * canvas, an image decode or a DOM.
 *
 * `serializedRoot` is the XMLSerializer output for the content div, already
 * XHTML-namespaced. `fontCss === ''` MUST return the string this file built
 * before Phase 78, and a unit test holds that rather than a promise.
 *
 * PLACEMENT, measured rather than guessed. Probe P6 drew the same text three
 * ways in a real Electron 43.3.0 renderer and counted differing ink pixels
 * against the same face installed in the main document. With the `<style>`
 * inside the foreignObject the difference was 0 of 15,458 pixels. With no
 * `<style>` it was 2,838 of 16,758, and that render matched Menlo exactly, 0
 * of 16,758, which is the defect this fix removes. An SVG-namespaced `<style>`
 * directly under `<svg>` also measured 0, so both placements work and the
 * inner one is chosen because it keeps the rules with the subtree they style.
 */
export function buildCaptureSvg(
  serializedRoot: string,
  width: number,
  height: number,
  fontCss: string
): string {
  const style =
    fontCss === ''
      ? ''
      : `<style xmlns="http://www.w3.org/1999/xhtml">${fontCss}</style>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">` +
    style +
    serializedRoot +
    `</foreignObject></svg>`
  );
}

/** Render `html` to PNG bytes at the display's device pixel ratio. */
export async function rasterizeHtml(
  input: RasterizeInput
): Promise<Uint8Array> {
  const width = Math.ceil(input.widthCss) + PAD * 2;
  const height = Math.ceil(input.heightCss) + PAD * 2;

  const parsed = new DOMParser().parseFromString(input.html, 'text/html');
  const root = parsed.body.firstElementChild;
  if (root === null) throw new Error('nothing to draw');
  // foreignObject content must be XHTML-namespaced or the SVG will not parse.
  root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  if (root instanceof HTMLElement) {
    root.style.margin = '0';
    root.style.padding = `${PAD}px`;
  }

  const svg = buildCaptureSvg(
    new XMLSerializer().serializeToString(root),
    width,
    height,
    input.fontCss ?? ''
  );

  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  // Rejects on malformed XHTML — callers fall back to a viewport capture.
  await img.decode();

  const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d context');
  ctx.fillStyle = input.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  if (blob === null) throw new Error('the image could not be encoded');
  return new Uint8Array(await blob.arrayBuffer());
}
