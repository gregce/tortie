/**
 * The still photograph the focus flight travels on (Phase 80.1).
 *
 * The pixels themselves cannot be read here. `@xterm/addon-webgl` needs a GPU
 * and this repository has no jsdom, so the live grab is proved on a real pane
 * by build/probe-session-focus.mjs instead. What IS proved here is everything
 * around the grab, and each of these was a way the copy could have shipped
 * silently broken:
 *
 *  - a leaf with no live terminal gets a background filled canvas rather than
 *    throwing, so one ended pane in a split cannot cancel the whole gesture;
 *  - the backing store is the SOURCE rectangle times the device pixel ratio,
 *    at ratio 1 and at ratio 2. Sizing it from the destination would store
 *    upscaling and nothing else;
 *  - every split header is cloned, in document order, with every id removed,
 *    because two nodes carrying one id breaks whatever queries that id far
 *    away from this file;
 *  - the grab really does happen inside xterm's render pass, which is the one
 *    sequence that reads a buffer the browser has not yet thrown away;
 *  - the emptiness measure answers 0 for a canvas holding only the background
 *    and answers above 0.01 for one with something drawn on it. That is the
 *    number research 53 section 11 says was never taken.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// A DOM small enough to read
// ---------------------------------------------------------------------------

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const NO_RECT: Rect = { left: 0, top: 0, width: 0, height: 0 };

class FakeElement {
  tagName: string;
  className = '';
  style: Record<string, string> = {};
  children: FakeElement[] = [];
  attrs = new Map<string, string>();
  rect: Rect = NO_RECT;

  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
  }

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }

  getBoundingClientRect(): Rect {
    return this.rect;
  }

  descendants(): FakeElement[] {
    const out: FakeElement[] = [];
    for (const child of this.children) {
      out.push(child, ...child.descendants());
    }
    return out;
  }

  querySelector(sel: string): FakeElement | null {
    return this.descendants().find((el) => selectorMatches(el, sel)) ?? null;
  }

  querySelectorAll(sel: string): FakeElement[] {
    return this.descendants().filter((el) => selectorMatches(el, sel));
  }

  cloneNode(_deep: boolean): FakeElement {
    const copy = new FakeElement(this.tagName);
    copy.className = this.className;
    copy.attrs = new Map(this.attrs);
    copy.rect = this.rect;
    copy.children = this.children.map((c) => c.cloneNode(true));
    return copy;
  }
}

class FakeCanvas extends FakeElement {
  width = 0;
  height = 0;
  ctx = new FakeContext();

  constructor() {
    super('canvas');
  }

  getContext(kind: string): FakeContext | null {
    return kind === '2d' ? this.ctx : null;
  }
}

class FakeContext {
  fillStyle = '';
  fills: Rect[] = [];
  draws: number[][] = [];
  /** The class name of every source `drawImage` was handed, in order. */
  drawSources: string[] = [];
  /** What `getImageData` hands back. Background everywhere by default. */
  pixels: number[] | null = null;

  fillRect(x: number, y: number, w: number, h: number): void {
    this.fills.push({ left: x, top: y, width: w, height: h });
  }

  drawImage(src: unknown, x: number, y: number, w: number, h: number): void {
    this.drawSources.push(
      src instanceof FakeElement ? `<${src.className || 'no-class'}>` : '<?>'
    );
    this.draws.push([x, y, w, h]);
  }

  getImageData(
    _x: number,
    _y: number,
    w: number,
    h: number
  ): { data: number[] } {
    return { data: this.pixels ?? new Array<number>(w * h * 4).fill(0) };
  }
}

/** Class, attribute or tag. Enough for the four selectors this module uses. */
function selectorMatches(el: FakeElement, sel: string): boolean {
  if (sel.startsWith('.')) {
    return el.className.split(/\s+/).includes(sel.slice(1));
  }
  if (sel.startsWith('[') && sel.endsWith(']')) {
    return el.attrs.has(sel.slice(1, -1));
  }
  return el.tagName === sel.toUpperCase();
}

// ---------------------------------------------------------------------------
// A terminal small enough to read
// ---------------------------------------------------------------------------

interface FakeTerminal {
  rows: number;
  element: FakeElement | undefined;
  onRender(cb: () => void): { dispose(): void };
  refresh(start: number, end: number): void;
}

const registry = new Map<string, FakeTerminal>();

vi.mock('../../terminal/drop/registry', () => ({
  getTerminal: (id: string) => registry.get(id) ?? null
}));

/**
 * A terminal with the arrangement a live pane really has. `.xterm-screen`
 * holds the core's `canvas.xterm-link-layer` FIRST and the WebGL addon's
 * class-less canvas second. Getting that order right here is the whole point
 * of this fake, because document order is what the shipped code got wrong.
 */
function fakeTerminal(opts: {
  rect: Rect;
  screen: FakeCanvas | null;
  renders?: boolean;
}): FakeTerminal {
  const element = new FakeElement('div');
  element.rect = opts.rect;
  const screenEl = new FakeElement('div');
  screenEl.className = 'xterm-screen';
  element.appendChild(screenEl);
  if (opts.screen !== null) {
    const link = new FakeCanvas();
    link.className = 'xterm-link-layer';
    screenEl.appendChild(link);
    opts.screen.className = '';
    screenEl.appendChild(opts.screen);
  }
  let listener: (() => void) | null = null;
  return {
    rows: 24,
    element,
    onRender(cb) {
      listener = cb;
      return {
        dispose() {
          listener = null;
        }
      };
    },
    refresh() {
      if (opts.renders === false) return;
      listener?.();
    }
  };
}

// ---------------------------------------------------------------------------

function installDom(dpr: number): void {
  vi.stubGlobal('HTMLElement', FakeElement);
  vi.stubGlobal('HTMLCanvasElement', FakeCanvas);
  vi.stubGlobal('window', { devicePixelRatio: dpr });
  vi.stubGlobal('document', {
    createElement: (tag: string) =>
      tag === 'canvas' ? new FakeCanvas() : new FakeElement(tag)
  });
}

/** A surface with `count` leaves side by side inside a 800 by 600 box. */
function makeSurface(opts: {
  count: number;
  headers: boolean;
  withTerminals: boolean;
}): { surface: FakeElement; first: Rect; last: Rect } {
  const first: Rect = { left: 220, top: 74, width: 800, height: 600 };
  const last: Rect = { left: 0, top: 38, width: 1600, height: 1200 };
  const surface = new FakeElement('div');
  surface.rect = first;
  for (let i = 0; i < opts.count; i++) {
    const leaf = new FakeElement('section');
    const id = `leaf-${String(i)}`;
    leaf.className = 'split-pane';
    leaf.setAttribute('data-split-leaf', id);
    leaf.rect = {
      left: first.left + i * 400,
      top: first.top,
      width: 400,
      height: 600
    };
    if (opts.headers) {
      const header = new FakeElement('header');
      header.className = 'split-header';
      header.setAttribute('id', `header-${String(i)}`);
      header.rect = { ...leaf.rect, height: 24 };
      const inner = new FakeElement('span');
      inner.setAttribute('id', `inner-${String(i)}`);
      header.appendChild(inner);
      leaf.appendChild(header);
    }
    const body = new FakeElement('div');
    body.className = 'split-pane-body';
    body.rect = { ...leaf.rect, top: leaf.rect.top + 24, height: 576 };
    leaf.appendChild(body);
    surface.appendChild(leaf);
    if (opts.withTerminals) {
      const screen = new FakeCanvas();
      registry.set(id, fakeTerminal({ rect: body.rect, screen }));
    }
  }
  return { surface, first, last };
}

const {
  backingStore,
  buildStillCopy,
  copyGeometry,
  inkFraction,
  observeFocusCopy,
  parseColor,
  rgbCss
} = await import('../focus-copy');

const BACKGROUND: readonly [number, number, number] = [19, 20, 23];

beforeEach(() => {
  registry.clear();
  observeFocusCopy(null);
});

// ---------------------------------------------------------------------------

describe('pure geometry', () => {
  it('places a rectangle at the destination scale', () => {
    const first = { left: 220, top: 74, width: 800, height: 600 };
    const last = { left: 0, top: 38, width: 1600, height: 1200 };
    expect(copyGeometry(first, last, { ...first })).toEqual({
      left: 0,
      top: 0,
      width: 1600,
      height: 1200
    });
    expect(
      copyGeometry(first, last, { left: 620, top: 74, width: 400, height: 600 })
    ).toEqual({ left: 800, top: 0, width: 800, height: 1200 });
  });

  it('sizes the backing store from the source and the ratio', () => {
    expect(backingStore({ width: 400, height: 576 }, 1)).toEqual({
      width: 400,
      height: 576
    });
    expect(backingStore({ width: 400, height: 576 }, 2)).toEqual({
      width: 800,
      height: 1152
    });
    // A ratio of zero is not a ratio; one pixel is the floor either way.
    expect(backingStore({ width: 0, height: 0 }, 0)).toEqual({
      width: 1,
      height: 1
    });
  });
});

describe('colour', () => {
  it('reads the hex the terminal theme ships', () => {
    expect(parseColor('#131417')).toEqual([19, 20, 23]);
    expect(parseColor('#abc')).toEqual([170, 187, 204]);
    expect(parseColor('rgb(19, 20, 23)')).toEqual([19, 20, 23]);
    expect(parseColor('rgba(19, 20, 23, 0.5)')).toEqual([19, 20, 23]);
    expect(parseColor('nonsense')).toEqual([0, 0, 0]);
  });

  it('writes it back as the canvas fill wants it', () => {
    expect(rgbCss([19, 20, 23])).toBe('rgb(19, 20, 23)');
  });
});

describe('inkFraction', () => {
  /** A width by height image, every pixel the background. */
  function blank(width: number, height: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < width * height; i++) {
      out.push(BACKGROUND[0], BACKGROUND[1], BACKGROUND[2], 255);
    }
    return out;
  }

  it('answers zero for a canvas holding only the background', () => {
    const measured = inkFraction(blank(80, 60), 80, 60, BACKGROUND);
    expect(measured.ink).toBe(0);
    expect(measured.sampled).toBeGreaterThan(0);
  });

  it('answers above one percent once something is drawn on it', () => {
    const pixels = blank(80, 60);
    // A block across the top quarter, which any real terminal frame beats.
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 80; x++) {
        const at = (y * 80 + x) * 4;
        pixels[at] = 216;
        pixels[at + 1] = 219;
        pixels[at + 2] = 226;
      }
    }
    const measured = inkFraction(pixels, 80, 60, BACKGROUND);
    expect(measured.ink).toBeGreaterThan(0.01);
    expect(measured.ink).toBeLessThanOrEqual(1);
  });

  it('ignores a channel that moved less than the readback tolerance', () => {
    const pixels = blank(40, 40);
    for (let i = 0; i < pixels.length; i += 4) pixels[i] = BACKGROUND[0] + 5;
    expect(inkFraction(pixels, 40, 40, BACKGROUND).ink).toBe(0);
  });

  it('samples no more than the ceiling it is given', () => {
    const measured = inkFraction(blank(400, 400), 400, 400, BACKGROUND, 400);
    expect(measured.sampled).toBeLessThanOrEqual(400);
  });
});

describe('buildStillCopy', () => {
  it('fills a leaf with no live terminal instead of throwing', async () => {
    installDom(1);
    const { surface, first, last } = makeSurface({
      count: 1,
      headers: false,
      withTerminals: false
    });
    const copy = await buildStillCopy(
      surface as unknown as Element,
      first,
      last,
      BACKGROUND
    );
    expect(copy).not.toBeNull();
    const node = copy?.node as unknown as FakeElement | undefined;
    const canvas = node?.children[0] as unknown as FakeCanvas;
    expect(canvas).toBeInstanceOf(FakeCanvas);
    expect(canvas.ctx.fillStyle).toBe('rgb(19, 20, 23)');
    expect(canvas.ctx.fills).toEqual([
      { left: 0, top: 0, width: 400, height: 576 }
    ]);
    expect(canvas.ctx.draws).toEqual([]);
    expect(copy?.leaves).toEqual([
      { leafId: 'leaf-0', grabbed: false, ink: null, sampled: 0, sources: [] }
    ]);
  });

  it('sizes each canvas from the source rectangle and the ratio', async () => {
    for (const dpr of [1, 2]) {
      installDom(dpr);
      const { surface, first, last } = makeSurface({
        count: 2,
        headers: false,
        withTerminals: false
      });
      const copy = await buildStillCopy(
        surface as unknown as Element,
        first,
        last,
        BACKGROUND
      );
      const node = copy?.node as unknown as FakeElement | undefined;
      const canvases = (node?.children ?? []).filter(
        (c) => c instanceof FakeCanvas
      ) as FakeCanvas[];
      expect(canvases).toHaveLength(2);
      for (const canvas of canvases) {
        expect(canvas.width).toBe(400 * dpr);
        expect(canvas.height).toBe(576 * dpr);
        // The CSS box is the destination scale, which is twice the source
        // here, and it is independent of the ratio.
        expect(canvas.style['width']).toBe('800px');
        expect(canvas.style['height']).toBe('1152px');
      }
    }
  });

  it('clones every header, in order, with no id on any of them', async () => {
    installDom(1);
    const { surface, first, last } = makeSurface({
      count: 2,
      headers: true,
      withTerminals: false
    });
    const copy = await buildStillCopy(
      surface as unknown as Element,
      first,
      last,
      BACKGROUND
    );
    const node = copy?.node as unknown as FakeElement | undefined;
    const headers = (node?.children ?? []).filter(
      (c) => c.className === 'split-header'
    );
    expect(headers).toHaveLength(2);
    for (const header of headers) {
      expect(header.getAttribute('id')).toBeNull();
      for (const child of header.descendants()) {
        expect(child.getAttribute('id')).toBeNull();
      }
    }
    // Document order: canvas, header, canvas, header.
    expect((node?.children ?? []).map((c) => c.tagName)).toEqual([
      'CANVAS',
      'HEADER',
      'CANVAS',
      'HEADER'
    ]);
    expect(node?.getAttribute('aria-hidden')).toBe('true');
  });

  it('grabs inside the render pass and reports the leaf as grabbed', async () => {
    installDom(2);
    const { surface, first, last } = makeSurface({
      count: 1,
      headers: false,
      withTerminals: true
    });
    const copy = await buildStillCopy(
      surface as unknown as Element,
      first,
      last,
      BACKGROUND
    );
    const node = copy?.node as unknown as FakeElement | undefined;
    const canvas = node?.children[0] as unknown as FakeCanvas;
    // The terminal sits exactly over the pane body here, so the draw covers
    // the whole backing store at the device pixel ratio.
    expect(canvas.ctx.draws).toEqual([[0, 0, 800, 1152]]);
    expect(copy?.leaves[0]?.grabbed).toBe(true);
  });

  it('copies the WebGL canvas and not the empty link layer above it', async () => {
    // Measured on 2026-08-18 on four full panes: taking the first canvas in
    // document order gave a successful grab and 0 of 400 sampled pixels
    // different from the background, because the first canvas is
    // `.xterm-link-layer` and it draws nothing but link underlines.
    installDom(1);
    const { surface, first, last } = makeSurface({
      count: 1,
      headers: false,
      withTerminals: true
    });
    const copy = await buildStillCopy(
      surface as unknown as Element,
      first,
      last,
      BACKGROUND
    );
    const node = copy?.node as unknown as FakeElement | undefined;
    const canvas = node?.children[0] as unknown as FakeCanvas;
    expect(canvas.ctx.drawSources).toEqual(['<no-class>']);
  });

  it('gives up on a terminal that never renders, inside the budget', async () => {
    installDom(1);
    const { surface, first, last } = makeSurface({
      count: 1,
      headers: false,
      withTerminals: false
    });
    registry.set(
      'leaf-0',
      fakeTerminal({
        rect: { left: 220, top: 98, width: 400, height: 576 },
        screen: new FakeCanvas(),
        renders: false
      })
    );
    const started = Date.now();
    const copy = await buildStillCopy(
      surface as unknown as Element,
      first,
      last,
      BACKGROUND
    );
    expect(copy?.leaves[0]?.grabbed).toBe(false);
    expect(Date.now() - started).toBeLessThan(400);
  });

  it('reports one row per leaf to an installed observer', async () => {
    installDom(1);
    const seen: string[] = [];
    observeFocusCopy((report) => {
      seen.push(report.leafId);
    });
    const { surface, first, last } = makeSurface({
      count: 3,
      headers: false,
      withTerminals: false
    });
    await buildStillCopy(surface as unknown as Element, first, last, BACKGROUND);
    expect(seen).toEqual(['leaf-0', 'leaf-1', 'leaf-2']);
  });

  it('measures the ink only for the leaves it actually photographed', async () => {
    installDom(1);
    const reports: { leafId: string; ink: number | null }[] = [];
    observeFocusCopy((report) => {
      reports.push({ leafId: report.leafId, ink: report.ink });
    });
    const { surface, first, last } = makeSurface({
      count: 1,
      headers: false,
      withTerminals: true
    });
    await buildStillCopy(surface as unknown as Element, first, last, BACKGROUND);
    // The fake readback hands back zeroes, which are 23 steps from the
    // background on the blue channel, so every sampled pixel counts as ink.
    expect(reports).toEqual([{ leafId: 'leaf-0', ink: 1 }]);
  });
});
