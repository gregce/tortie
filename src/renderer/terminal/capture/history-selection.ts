/**
 * The selection a session holds in its HISTORY, Phase 209.
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
 *
 * AN ENTRY HERE IS ANSWERED FROM THE HISTORY, WHETHER OR NOT ITS ROWS FIT THE
 * SCREEN, and that is a fix round's doing rather than the first shape. The
 * first shape asked the entry whether it reached off the screen and let a
 * range that fitted take xterm's text, on the ground that the two agree. They
 * agree on a QUIET pane and they do not on a busy one: measured on 2026-09-03
 * over a pane printing ten lines a second under a live drag, the pane's own
 * xterm held `857` on the rows tmux's grid held `STREAM-6` on, about fifty
 * lines behind, because the client's paint of a parked copy mode view runs
 * behind the grid while the poll keeps re-anchoring it. The copy took the
 * stale rows and the highlight was drawn on the right ones. With the stream
 * stopped and the same view parked the two agreed exactly, so the lag is the
 * paint and not the arithmetic. The rule is therefore the plain one: a
 * selection this module holds is a selection in the history and its text
 * comes from the history, and a drag that never scrolled holds nothing here
 * and keeps xterm's own path byte for byte.
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
 * The range to compose a copy from, or null when there is none and the
 * selection is an ordinary in-screen one that xterm's own text describes.
 */
export function historyRangeToCopy(
  sessionId: string
): HistorySelectionRange | null {
  const h = held.get(sessionId);
  if (h === undefined) return null;
  return { start: h.start, end: h.end, cols: h.cols };
}
