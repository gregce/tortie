/**
 * Where a terminal is on screen, and how big one cell really is.
 *
 * THE rule here (research 17 §5.1): **read the cell box, never compute it.**
 * Measured for the shipped stack (Menlo 13px, lineHeight 1.25) the cell is
 * 7.5 × 18.5 CSS px — and 13 × 1.25 = 16.25, not 18.5. xterm derives cell
 * height from measured font metrics, so deriving it from the options
 * produces a visibly squashed image and row bands that drift off the text.
 *
 * Everything below is public DOM + public xterm API; no `_core` access.
 */

import type { Terminal } from '@xterm/xterm';
import type { CaptureRect } from '@shared/ipc';

export interface CellMetrics {
  /** CSS px per column, measured. */
  cellWidth: number;
  /** CSS px per row, measured. */
  cellHeight: number;
  cols: number;
  rows: number;
}

/** The pane wrapper for a session (TerminalPane's root element). */
export function paneElement(sessionId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `.gmux-terminal-pane[data-session-id="${CSS.escape(sessionId)}"]`
  );
}

/** xterm's text surface — the thing a screenshot is actually of. */
export function screenElement(sessionId: string): HTMLElement | null {
  return paneElement(sessionId)?.querySelector<HTMLElement>('.xterm-screen') ??
    null;
}

export function measureCells(
  term: Terminal,
  screenEl: HTMLElement
): CellMetrics {
  const r = screenEl.getBoundingClientRect();
  const cols = Math.max(1, term.cols);
  const rows = Math.max(1, term.rows);
  return {
    cellWidth: r.width / cols,
    cellHeight: r.height / rows,
    cols,
    rows
  };
}

function intersect(a: CaptureRect, b: CaptureRect): CaptureRect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

function toRect(r: DOMRect): CaptureRect {
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

/**
 * The screen's rect, clipped to what is actually on screen: the pane can be
 * scrolled or cropped by a split, and capturePage of an off-window rect
 * returns garbage rather than an error.
 */
export function visibleScreenRect(
  sessionId: string,
  screenEl: HTMLElement
): CaptureRect | null {
  let rect = toRect(screenEl.getBoundingClientRect());
  const pane = paneElement(sessionId);
  if (pane !== null) rect = intersect(rect, toRect(pane.getBoundingClientRect()));
  rect = intersect(rect, {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight
  });
  return rect.width >= 1 && rect.height >= 1 ? rect : null;
}

/**
 * A band of `rowCount` rows starting at viewport row `topRow`, clipped the
 * same way. Used for a selection that is fully on screen — pixel-exact, and
 * full-width by design (ragged character-column edges look wrong; iTerm and
 * CleanShot both take the whole band).
 */
export function rowBandRect(
  sessionId: string,
  screenEl: HTMLElement,
  metrics: CellMetrics,
  topRow: number,
  rowCount: number
): CaptureRect | null {
  const clip = visibleScreenRect(sessionId, screenEl);
  if (clip === null) return null;
  // Row 0 is measured from the UNCLIPPED screen origin, then clipped — using
  // the clipped origin would shift every band down by the crop.
  const origin = screenEl.getBoundingClientRect();
  const band: CaptureRect = {
    x: origin.x,
    y: origin.y + topRow * metrics.cellHeight,
    width: origin.width,
    height: rowCount * metrics.cellHeight
  };
  const out = intersect(clip, band);
  return out.width >= 1 && out.height >= 1 ? out : null;
}
