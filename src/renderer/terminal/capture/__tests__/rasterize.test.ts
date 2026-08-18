/**
 * The capture SVG builder (Phase 78).
 *
 * The point of splitting `buildCaptureSvg` out of `rasterizeHtml` is that the
 * SVG string can be compared byte for byte without a canvas, an image decode
 * or a DOM. The first case here is the one that matters most. Under the System
 * preset the builder must return exactly the string this file built before
 * Phase 78, so the default export is unchanged rather than merely similar.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCaptureSvg, letterSpacingCorrection } from '../rasterize';

// What `XMLSerializer` hands the builder: the content div, XHTML-namespaced,
// with the margin and padding `rasterizeHtml` sets on it.
const ROOT =
  '<div xmlns="http://www.w3.org/1999/xhtml" ' +
  'style="margin: 0px; padding: 10px;">' +
  '<div><span style="color:#D8DBE2">hello</span></div>' +
  '</div>';

const FACE_CSS =
  '@font-face{font-family:"JetBrains Mono";font-style:normal;' +
  'font-weight:400;font-display:block;' +
  'src:url("data:font/woff2;base64,d09GMgABAAAA") format("woff2")}';

describe('buildCaptureSvg', () => {
  it('is byte identical to the pre-Phase-78 string when no CSS is passed', () => {
    // Written out in full rather than assembled from the same template the
    // implementation uses, so a change to that template fails here.
    const expected =
      '<svg xmlns="http://www.w3.org/2000/svg" width="820" height="240">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" ' +
      'style="margin: 0px; padding: 10px;">' +
      '<div><span style="color:#D8DBE2">hello</span></div>' +
      '</div>' +
      '</foreignObject></svg>';
    expect(buildCaptureSvg(ROOT, 820, 240, '')).toBe(expected);
  });

  it('puts one XHTML-namespaced style element before the content', () => {
    const svg = buildCaptureSvg(ROOT, 820, 240, FACE_CSS);
    expect(svg.match(/<style/g)).toHaveLength(1);
    expect(svg).toContain(
      '<foreignObject width="100%" height="100%">' +
        '<style xmlns="http://www.w3.org/1999/xhtml">'
    );
    expect(svg.indexOf('</style>')).toBeLessThan(svg.indexOf('<div xmlns'));
    expect(svg).toContain(FACE_CSS);
    // The tail is untouched, so the content still closes the foreignObject.
    expect(svg.endsWith('</div></foreignObject></svg>')).toBe(true);
  });

  it('carries a second face without adding a second style element', () => {
    const bold = FACE_CSS + FACE_CSS.replace('font-weight:400', 'font-weight:700');
    const svg = buildCaptureSvg(ROOT, 820, 240, bold);
    expect(svg.match(/<style/g)).toHaveLength(1);
    expect(svg.match(/@font-face/g)).toHaveLength(2);
  });

  it('escapes nothing, because base64 needs no escaping', () => {
    // The whole SVG is `encodeURIComponent`ed by the caller. What must not
    // happen here is an XML-significant character sneaking into the style
    // element's text content.
    const svg = buildCaptureSvg(ROOT, 820, 240, FACE_CSS);
    const style = svg.slice(
      svg.indexOf('">', svg.indexOf('<style')) + 2,
      svg.indexOf('</style>')
    );
    expect(style).toBe(FACE_CSS);
    expect(style).not.toContain('&');
    expect(style).not.toContain('<');
  });

  it('writes the size the caller asked for', () => {
    expect(buildCaptureSvg('<p/>', 1, 2, '')).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="2">' +
        '<foreignObject width="100%" height="100%"><p/></foreignObject></svg>'
    );
  });
});

describe('letterSpacingCorrection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('corrects nothing when the advance cannot be measured', () => {
    // No 2d context means no measurement, and a correction derived from a
    // zero advance would be the whole cell width. Phase 78 changed the face
    // this measures, not this guard.
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: () => null })
    });
    expect(letterSpacingCorrection(7.8, 13, 'Menlo, monospace')).toBe(0);
  });

  it('is the gap between the cell and the natural advance', () => {
    vi.stubGlobal('document', {
      createElement: () => ({
        getContext: () => ({
          font: '',
          // 100 M's at 7.8 px each: the bundled faces' 0.6 em at 13 px.
          measureText: () => ({ width: 780 })
        })
      })
    });
    expect(
      letterSpacingCorrection(7.827, 13, "'JetBrains Mono', Menlo, monospace")
    ).toBeCloseTo(0.027, 6);
  });
});
