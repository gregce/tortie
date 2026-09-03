/**
 * The selection a session holds in its HISTORY — Phase 209.
 *
 * A pane's xterm shows one screen of a tmux client, so xterm's own selection
 * can only ever describe the rows on screen. When a drag has scrolled the
 * history (../scroll/drag-select.ts), the selection's two ends are history
 * positions, and this map is where the copy verbs in ./index.ts find them.
 * The drag module is loaded lazily, and this file is eager, so the verbs
 * never import the gesture: they ask here, and a session with no entry is an
 * ordinary in-screen selection that stays xterm's byte for byte.
 *
 * WHO WRITES, WHO READS. The drag module holds an entry while xterm keeps the
 * highlight it drew, and drops it the moment anything else changes the
 * selection, so an entry here always describes what is on screen. The verbs
 * read it, and `withoutSelection` in ./index.ts asks it to draw again after a
 * photograph cleared the highlight, which is what keeps a Capture Screen from
 * shortening a selection to the screen.
 */

import type { HistoryPos } from '../scroll/drag-math';

/** The plain data a verb needs: the two ends and the width they were made at. */
export interface HistorySelectionRange {
  start: HistoryPos;
  end: HistoryPos;
  /** Columns of the pane when the selection was made. */
  cols: number;
}

export interface HistorySelection extends HistorySelectionRange {
  /**
   * True when some row of the range is off the screen right now, so the
   * screen cannot say what the selection holds. False means every row is on
   * screen and xterm's own text is exact, which keeps that case on its path.
   */
  spansScreen(): boolean;
  /** Put the entry back and draw its visible part again. */
  redraw(): void;
}

const held = new Map<string, HistorySelection>();

/** Hold, or with null drop, a session's history selection. */
export function holdHistorySelection(
  sessionId: string,
  selection: HistorySelection | null
): void {
  if (selection === null) held.delete(sessionId);
  else held.set(sessionId, selection);
}

/** The session's history selection, or null for an in-screen one. */
export function historySelection(sessionId: string): HistorySelection | null {
  return held.get(sessionId) ?? null;
}

/**
 * The range to compose a copy from, or null when the screen holds the whole
 * selection and xterm's text is the right one.
 */
export function historyRangeToCopy(
  sessionId: string
): HistorySelectionRange | null {
  const h = held.get(sessionId);
  if (h === undefined || !h.spansScreen()) return null;
  return { start: h.start, end: h.end, cols: h.cols };
}
