/**
 * Pure range math for capture. No DOM, no xterm — unit-testable on its own.
 */

export interface SelectionBand {
  /** Viewport row of the selection's first line (may be negative). */
  topRow: number;
  /** How many rows the selection covers. */
  rowCount: number;
  /** True when every selected row is currently on screen. */
  onScreen: boolean;
}

/**
 * Selection position (ABSOLUTE buffer rows, as xterm reports them) mapped to
 * viewport rows. `viewportY` is the buffer row at the top of the screen.
 */
export function selectionBand(
  selection: { start: { y: number }; end: { y: number } },
  viewportY: number,
  rows: number
): SelectionBand {
  const topRow = selection.start.y - viewportY;
  const bottomRow = selection.end.y - viewportY;
  return {
    topRow,
    rowCount: bottomRow - topRow + 1,
    onScreen: topRow >= 0 && bottomRow < rows
  };
}

/**
 * "Last N lines, ending at what I can see" → how many lines of HISTORY to ask
 * tmux for. The capture always runs to the bottom of the visible screen (no
 * `-E`), so the screen's own `rows` are already included.
 */
export function historyLinesFor(totalLines: number, rows: number): number {
  return Math.max(0, Math.floor(totalLines) - rows);
}

/**
 * Trim a `capture-pane` dump to the lines a capture should show: drop the
 * trailing blank rows tmux leaves behind, and cap the total so a slip of the
 * finger cannot ask for a 47 MB PNG.
 */
export function paneLines(ansi: string, maxLines: number): string[] {
  const lines = ansi.split('\n');
  // A "blank" row still carries SGR resets under `capture-pane -e`, so
  // emptiness is judged on the text, not the raw bytes.
  const isBlank = (line: string): boolean =>
    line.replace(/\u001b\[[0-9;:]*[A-Za-z]/g, '').trim() === '';
  while (lines.length > 0 && isBlank(lines[lines.length - 1] ?? '')) {
    lines.pop();
  }
  return lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;
}
