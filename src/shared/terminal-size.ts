/**
 * The size of a terminal, in cells (Phase 368, build/p368/SPEC.md D1).
 *
 * ISSUE 44. Every attach spawned its tmux client at 80 by 24 and every session
 * was created at 80 by 24, so a program drawing a long reply was told a size it
 * was not shown at, and then the real one a moment later. Claude Code draws by
 * relative cursor moves and skips the cells it believes are blank, so rows that
 * moved under it kept old letters in its gaps (research 145 section 3.2). The
 * pane now says how big it is when it attaches, and a create or a restore says
 * how big the terminal it will be shown in is. This is that size's one shape
 * and its one validator, read by the attach, the create and the restore alike.
 *
 * THE BOUNDS ARE THE ATTACH HOST'S OWN (`sanitizeCols` and `sanitizeRows` in
 * src/main/attach/attach-host.ts): 2 to 1,000 columns and 1 to 500 rows. The
 * host CLAMPS what it is handed. This does not: a value that is not a whole
 * number inside the bounds is NO size, and every caller then falls back to the
 * last size it knows and after that to tmux's own 80 by 24, which is what every
 * attach and create did before this phase. A size that came over a process
 * boundary is never trusted for being the right type.
 *
 * Pure, and it imports nothing, because main, the preload and the renderer all
 * read it.
 */

/** A terminal's size in cells: whole columns and whole rows. */
export interface TerminalSize {
  readonly cols: number;
  readonly rows: number;
}

/** The attach host's bounds, inclusive at both ends. */
export const TERMINAL_SIZE_BOUNDS = Object.freeze({
  minCols: 2,
  maxCols: 1000,
  minRows: 1,
  maxRows: 500
});

/** A whole number from `min` to `max`, both included. */
function wholeWithin(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

/**
 * `value` as a size, or null when it is not one.
 *
 * It reads `cols` and `rows` and nothing else, so a resize request carrying
 * its session id is read as its size, and it answers a NEW frozen object, so
 * nothing the caller was handed travels further than the two numbers.
 */
export function sanitizeTerminalSize(value: unknown): TerminalSize | null {
  if (typeof value !== 'object' || value === null) return null;
  const cols: unknown = (value as { readonly cols?: unknown }).cols;
  const rows: unknown = (value as { readonly rows?: unknown }).rows;
  if (
    !wholeWithin(cols, TERMINAL_SIZE_BOUNDS.minCols, TERMINAL_SIZE_BOUNDS.maxCols) ||
    !wholeWithin(rows, TERMINAL_SIZE_BOUNDS.minRows, TERMINAL_SIZE_BOUNDS.maxRows)
  ) {
    return null;
  }
  return Object.freeze({ cols, rows });
}
