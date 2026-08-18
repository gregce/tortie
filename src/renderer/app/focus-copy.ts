/**
 * The still photograph the session focus flight travels on (Phase 80.1).
 *
 * WHY A PHOTOGRAPH AND NOT THE LIVE SURFACE. The session surface holds live
 * xterm terminals. Animating the layout box of a live terminal fires its
 * ResizeObserver on every frame, every notification is a fit, and every fit
 * sends new columns and rows to a real tmux session. Twelve of those inside
 * one 200 ms gesture would reflow the agent's output twelve times. So the
 * live surface never moves. A copy of it moves instead, and the live hosts
 * are swapped in once, at the end, by ./focus-flight.ts.
 *
 * READING PIXELS OUT OF XTERM IS THE PART THAT HAD NEVER BEEN MEASURED.
 * `@xterm/addon-webgl` builds its context with no attributes, so
 * `preserveDrawingBuffer` is false and the drawing buffer is thrown away as
 * soon as the browser composites the frame. A `drawImage` taken at any other
 * moment reads an empty buffer. The one public sequence that works is to grab
 * inside xterm's own render pass, and that is what `grabLeaf` does. It
 * subscribes to `Terminal.onRender`, calls `Terminal.refresh` to mark every
 * row dirty, and copies the screen canvas inside the callback, before
 * compositing. Every grab is raced against a 40 ms budget, so a terminal that
 * never renders costs the gesture 40 ms and nothing else.
 *
 * AND THERE ARE TWO CANVASES, WHICH IS WHY `screenCanvas` EXISTS. Measured on
 * 2026-08-18 with build/probe-session-focus.mjs, against four panes filled
 * edge to edge with text. `.xterm-screen` holds `canvas.xterm-link-layer`
 * first and the WebGL addon's own class-less canvas second, so the obvious
 * `querySelector('.xterm-screen canvas')` picks the link layer. That layer
 * draws nothing but link underlines. Every leaf reported a successful grab
 * and 0 of 400 sampled pixels differed from the background, which reads as
 * "the GPU will not hand pixels back" and is not what was happening at all.
 *
 * WHAT HAPPENS WHEN NO PIXELS COME BACK. `FLY_WITHOUT_PIXELS` decides. See
 * the constant's own note for the reason it is true.
 */

import type { Terminal } from '@xterm/xterm';
import { getTerminal } from '../terminal/drop/registry';
import { resolveTerminalTheme, TERMINAL_BACKGROUND } from '../terminal/theme';

/** A viewport rectangle, in CSS pixels. The FLIP works in these. */
export interface FlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** One red, green and blue channel, each 0 to 255. */
export type Rgb = readonly [number, number, number];

/** What one visible leaf contributed to the copy. */
export interface CopyLeafReport {
  /** The session id the leaf carries in `data-split-leaf`. */
  leafId: string;
  /** True when xterm handed a frame back inside the grab budget. */
  grabbed: boolean;
  /**
   * Sampled pixels that differ from the terminal background, 0 to 1. Null
   * unless an observer is installed, because the readback costs a GPU
   * synchronisation and the shipped gesture must not pay for it.
   */
  ink: number | null;
  /** How many pixels `ink` was computed from. */
  sampled: number;
  /**
   * Every canvas found under `.xterm-screen`, as `WIDTHxHEIGHT` backing store
   * sizes, and which one was copied. Empty unless an observer is installed.
   * It is here because "grabbed, and the copy is blank" has two causes and
   * this is what tells them apart.
   */
  sources: string[];
}

/** The node to append, and what went into it. */
export interface StillCopy {
  node: HTMLElement;
  leaves: readonly CopyLeafReport[];
}

/**
 * Fly even when not one leaf handed back pixels.
 *
 * The research says an empty copy falls back to an instant enter. This build
 * keeps the flight and lets the copy carry a plain background, because the
 * alternative is a mode whose whole point, the grow, silently never happens
 * on a machine whose GPU will not hand pixels back. A travelling rectangle
 * carrying real split headers is still the gesture. The switch is this one
 * constant, and the verifier's screenshots decide whether it stays.
 */
export const FLY_WITHOUT_PIXELS = true;

/** How long one leaf may take to render before the copy gives up on it. */
export const GRAB_BUDGET_MS = 40;

/**
 * How far a channel may sit from the background and still count as
 * background. Eight steps out of 255 absorbs the rounding a GPU readback
 * introduces and still counts every drawn glyph, because no glyph in the
 * §1.6 palette lands within eight steps of the canvas colour.
 */
const INK_TOLERANCE = 8;

/** At most this many pixels are read back when an observer asks for ink. */
const MAX_SAMPLES = 400;

let observer: ((report: CopyLeafReport) => void) | null = null;

/**
 * Watch what every copy is made of. The harness driver installs this and
 * nothing else does, so the shipped gesture never reads a pixel back.
 * Pass null to stop watching.
 */
export function observeFocusCopy(
  fn: ((report: CopyLeafReport) => void) | null
): void {
  observer = fn;
}

// ---------------------------------------------------------------------------
// Pure geometry and pure colour. Everything below this line that touches the
// DOM is a thin wrapper over one of these.
// ---------------------------------------------------------------------------

/**
 * Where a rectangle of the CURRENT layout belongs inside a copy that is laid
 * out at the DESTINATION.
 *
 * The copy is sized `last` and starts the flight wearing the inverse
 * transform, which scales it back down to `first`. So a child placed here at
 * the destination's scale lands exactly on the live element it photographs
 * during the first frame, and at native geometry on the last one.
 */
export function copyGeometry(
  first: FlightRect,
  last: FlightRect,
  rect: FlightRect
): FlightRect {
  const kx = first.width === 0 ? 1 : last.width / first.width;
  const ky = first.height === 0 ? 1 : last.height / first.height;
  return {
    left: (rect.left - first.left) * kx,
    top: (rect.top - first.top) * ky,
    width: rect.width * kx,
    height: rect.height * ky
  };
}

/**
 * The backing store for a canvas photographing `rect`.
 *
 * It is the SOURCE size times the device pixel ratio, never the destination
 * size. The WebGL canvas holds exactly that many real pixels and no more, so
 * a larger backing store would only store upscaling.
 */
export function backingStore(
  rect: { width: number; height: number },
  dpr: number
): { width: number; height: number } {
  const scale = dpr > 0 ? dpr : 1;
  return {
    width: Math.max(1, Math.round(rect.width * scale)),
    height: Math.max(1, Math.round(rect.height * scale))
  };
}

/** A CSS colour as three channels. Anything unparseable reads as black. */
export function parseColor(value: string): Rgb {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex !== null) {
    const body = hex[1] ?? '';
    const full =
      body.length === 3
        ? body
            .split('')
            .map((c) => c + c)
            .join('')
        : body;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16)
    ];
  }
  const fn = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (fn !== null) {
    const parts = (fn[1] ?? '').split(/[\s,/]+/).filter((p) => p.length > 0);
    const channel = (at: number): number => {
      const raw = parts[at];
      const v = raw === undefined ? 0 : Number.parseFloat(raw);
      return Number.isFinite(v) ? Math.max(0, Math.min(255, Math.round(v))) : 0;
    };
    return [channel(0), channel(1), channel(2)];
  }
  return [0, 0, 0];
}

/** Three channels as the CSS the canvas fill wants. */
export function rgbCss(rgb: Rgb): string {
  return `rgb(${String(rgb[0])}, ${String(rgb[1])}, ${String(rgb[2])})`;
}

/**
 * The fraction of sampled pixels that differ from the background.
 *
 * This is the number research 53 section 11 says was never taken, and it is
 * pure so it can be read without a GPU. Sampling walks a grid of at most
 * `maxSamples` points rather than every pixel, because the question is only
 * whether the photograph carries anything at all.
 */
export function inkFraction(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
  background: Rgb,
  maxSamples: number = MAX_SAMPLES
): { ink: number; sampled: number } {
  if (width <= 0 || height <= 0 || maxSamples <= 0) return { ink: 0, sampled: 0 };
  const side = Math.max(1, Math.floor(Math.sqrt(maxSamples)));
  const stepX = Math.max(1, Math.floor(width / side));
  const stepY = Math.max(1, Math.floor(height / side));
  let sampled = 0;
  let different = 0;
  for (let y = 0; y < height && sampled < maxSamples; y += stepY) {
    for (let x = 0; x < width && sampled < maxSamples; x += stepX) {
      const at = (y * width + x) * 4;
      const delta = Math.max(
        Math.abs((pixels[at] ?? 0) - background[0]),
        Math.abs((pixels[at + 1] ?? 0) - background[1]),
        Math.abs((pixels[at + 2] ?? 0) - background[2])
      );
      sampled += 1;
      if (delta > INK_TOLERANCE) different += 1;
    }
  }
  return { ink: sampled === 0 ? 0 : different / sampled, sampled };
}

/** The terminal's own canvas colour, from the live tokens where they exist. */
export function terminalBackground(): Rgb {
  try {
    return parseColor(resolveTerminalTheme().background ?? TERMINAL_BACKGROUND);
  } catch {
    return parseColor(TERMINAL_BACKGROUND);
  }
}

// ---------------------------------------------------------------------------
// The copy
// ---------------------------------------------------------------------------

function rectOf(el: Element): FlightRect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function place(el: HTMLElement, box: FlightRect): void {
  el.style.position = 'absolute';
  el.style.left = `${String(box.left)}px`;
  el.style.top = `${String(box.top)}px`;
  el.style.width = `${String(box.width)}px`;
  el.style.height = `${String(box.height)}px`;
}

/**
 * Copy a header and make sure the copy cannot be mistaken for the original.
 * Every id is dropped, because two nodes with one id is a bug that shows up
 * far away from here, in whatever queries that id.
 */
function clonedHeader(header: Element): HTMLElement | null {
  const clone = header.cloneNode(true);
  if (!(clone instanceof HTMLElement)) return null;
  clone.removeAttribute('id');
  for (const child of Array.from(clone.querySelectorAll('[id]'))) {
    child.removeAttribute('id');
  }
  return clone;
}

/**
 * Photograph one leaf into `ctx`, inside xterm's own render pass.
 *
 * Resolves true when a frame was copied. The listener is disposed from a
 * microtask rather than from inside the callback, because xterm walks its
 * listener array by index while it fires and removing the current entry there
 * would skip the next one.
 */
function grabLeaf(
  term: Terminal,
  ctx: CanvasRenderingContext2D,
  target: { left: number; top: number; width: number; height: number },
  describeSources: boolean
): Promise<{ ok: boolean; sources: string[] }> {
  return new Promise<{ ok: boolean; sources: string[] }>((resolve) => {
    let settled = false;
    const finish = (ok: boolean, sources: string[] = []): void => {
      if (settled) return;
      settled = true;
      queueMicrotask(() => {
        sub.dispose();
      });
      resolve({ ok, sources });
    };
    const sub = term.onRender(() => {
      const screen = screenCanvas(term);
      const sources = describeSources ? describeScreenCanvases(term) : [];
      if (screen !== null) {
        try {
          ctx.drawImage(
            screen,
            target.left,
            target.top,
            target.width,
            target.height
          );
          finish(true, sources);
          return;
        } catch {
          finish(false, sources);
          return;
        }
      }
      finish(false, sources);
    });
    try {
      if (term.rows > 0) term.refresh(0, term.rows - 1);
    } catch {
      finish(false);
    }
    setTimeout(() => {
      finish(false);
    }, GRAB_BUDGET_MS);
  });
}

/**
 * The canvas the glyphs are actually on.
 *
 * The WebGL addon appends a canvas with NO class, after the core's own
 * `canvas.xterm-link-layer`, so document order picks the wrong one. See the
 * measurement in this file's header. The fallbacks cover the canvas renderer,
 * whose glyphs live in `.xterm-text-layer`, and anything later that adds a
 * third arrangement.
 */
function screenCanvas(term: Terminal): HTMLCanvasElement | null {
  const screen = term.element?.querySelector('.xterm-screen');
  if (screen === null || screen === undefined) return null;
  const all = Array.from(screen.querySelectorAll('canvas'));
  const webgl = all.find((c) => c.className.trim() === '');
  if (webgl !== undefined) return webgl;
  const text = all.find((c) =>
    c.className.split(/\s+/).includes('xterm-text-layer')
  );
  return text ?? all[all.length - 1] ?? null;
}

/** Harness only. What canvases the terminal actually has, and how big. */
function describeScreenCanvases(term: Terminal): string[] {
  const screen = term.element?.querySelector('.xterm-screen');
  if (screen === null || screen === undefined) return ['no .xterm-screen'];
  return Array.from(screen.querySelectorAll('canvas')).map((c, i) => {
    const cls = c.className === '' ? 'no-class' : c.className;
    return `${String(i)}:${cls}:${String(c.width)}x${String(c.height)}`;
  });
}

/**
 * Build the node the flight animates.
 *
 * `first` is where the surface is now and `last` is where it is going. The
 * node is laid out at `last`, so its final frame is at native geometry, and
 * ./focus-flight.ts gives it the inverse transform for its first frame.
 *
 * Returns null only when nothing was photographed AND `FLY_WITHOUT_PIXELS`
 * is false. It throws nothing of its own, but a caller must still guard,
 * because a canvas with no 2d context is a DOM failure this cannot repair.
 */
export async function buildStillCopy(
  surface: Element,
  first: FlightRect,
  last: FlightRect,
  background: Rgb = terminalBackground()
): Promise<StillCopy | null> {
  const node = document.createElement('div');
  node.className = 'gmux-focus-copy';
  node.setAttribute('aria-hidden', 'true');
  node.style.position = 'fixed';
  node.style.left = `${String(last.left)}px`;
  node.style.top = `${String(last.top)}px`;
  node.style.width = `${String(last.width)}px`;
  node.style.height = `${String(last.height)}px`;
  node.style.transformOrigin = '0 0';
  node.style.pointerEvents = 'none';

  const dpr = typeof window === 'undefined' ? 1 : (window.devicePixelRatio || 1);
  const fill = rgbCss(background);
  const leaves: CopyLeafReport[] = [];
  const grabs: Promise<void>[] = [];

  for (const leaf of Array.from(surface.querySelectorAll('[data-split-leaf]'))) {
    const leafId = leaf.getAttribute('data-split-leaf') ?? '';
    const bodyEl = leaf.querySelector('.split-pane-body') ?? leaf;
    const bodyRect = rectOf(bodyEl);
    const box = copyGeometry(first, last, bodyRect);
    const store = backingStore(bodyRect, dpr);

    const canvas = document.createElement('canvas');
    canvas.className = 'gmux-focus-copy-pane';
    canvas.width = store.width;
    canvas.height = store.height;
    place(canvas, box);
    node.appendChild(canvas);

    const header = leaf.querySelector('.split-header');
    if (header !== null) {
      const clone = clonedHeader(header);
      if (clone !== null) {
        place(clone, copyGeometry(first, last, rectOf(header)));
        node.appendChild(clone);
      }
    }

    const ctx = canvas.getContext('2d');
    const report: CopyLeafReport = {
      leafId,
      grabbed: false,
      ink: null,
      sampled: 0,
      sources: []
    };
    leaves.push(report);
    if (ctx === null) continue;
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, store.width, store.height);

    const term = leafId === '' ? null : getTerminal(leafId);
    if (term === null) continue;
    // Where the terminal sits inside the pane body, in backing-store pixels.
    const termRect = term.element === undefined ? bodyRect : rectOf(term.element);
    const target = {
      left: (termRect.left - bodyRect.left) * dpr,
      top: (termRect.top - bodyRect.top) * dpr,
      width: termRect.width * dpr,
      height: termRect.height * dpr
    };
    grabs.push(
      grabLeaf(term, ctx, target, observer !== null).then((got) => {
        report.grabbed = got.ok;
        report.sources = got.sources;
        if (observer === null) return;
        const measured = measureInk(ctx, store.width, store.height, background);
        report.ink = measured.ink;
        report.sampled = measured.sampled;
      })
    );
  }

  await Promise.all(grabs);
  for (const report of leaves) observer?.(report);
  if (!FLY_WITHOUT_PIXELS && leaves.every((l) => !l.grabbed)) return null;
  return { node, leaves };
}

/** One readback, then the pure count. Returns zeroes if the readback fails. */
function measureInk(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: Rgb
): { ink: number; sampled: number } {
  try {
    const data = ctx.getImageData(0, 0, width, height).data;
    return inkFraction(data, width, height, background);
  } catch {
    return { ink: 0, sampled: 0 };
  }
}
