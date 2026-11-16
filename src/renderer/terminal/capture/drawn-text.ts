/**
 * What a copy of a terminal holds: the text that is DRAWN, Phase 368 (issue
 * 44, build/p368/SPEC.md §4.4, D11).
 *
 * xterm's own selection text (`selectionText`, SelectionService.ts lines 203
 * to 262 in xterm 6.0.0) reads each row to the row's own length, and a gmux
 * pane's rows can be longer than the pane. `tmux attach` puts its client in
 * xterm's ALTERNATE buffer, which has no scrollback, and xterm neither
 * reflows nor trims an alternate buffer's rows when the width shrinks
 * (Buffer.ts, `resize`: the trim runs only where reflow runs). So after a pane
 * narrows, every row nothing has rewritten past the new edge still holds the
 * cells beyond it. Nobody can see them, and a copy took them: research 145
 * §4.3 measured 12 of 36 rows of a real Claude Code reply holding cells past
 * column 96 after the pane went from 140 to 96 columns, and a copied `rsync`
 * command carrying another paragraph's Chinese text after 84 spaces.
 *
 * It also ended a copied line with the spaces tmux drew. tmux paints a run of
 * fewer than ten blank cells as real spaces (tty-draw.c), xterm keeps a
 * written space because it has content, and a terminal with no tmux in front
 * of it holds none: copies ended lines with up to 4 spaces on tmux 3.7b and up
 * to 81 on 3.6a (research 145 §4.3, the third defect).
 *
 * This is xterm's function with exactly two changes, and it is the ONE
 * spelling of a copy's text, the history path's included
 * (./history-copy.ts, `composeText`):
 *
 *   - every row is read only up to `term.cols`;
 *   - every LINE loses the U+0020 it ends in. A line is what xterm makes one:
 *     rows joined because the next row is marked wrapped, ending at the row
 *     whose next row is not, or at the selection's last row. A space at the
 *     end of a WRAPPED row is never removed, because that row is full to its
 *     last column and the space is one the program wrote between two words
 *     (build/p368/SPEC.md §2.6, G6). Removing it would glue them.
 *
 * Nothing else moves. The same rows are joined, so this adds no join rule
 * (Phase 368 item 8). A non breaking space becomes a plain one, as xterm makes
 * it, BEFORE the trim, so a line ends at its last non-blank cell whatever
 * blank it ended in: Claude Code draws its empty prompt row as `❯` and a non
 * breaking space, and that row copies as `❯` (in research 145's recording of
 * Claude Code narrowed from 140 to 96 columns it was the one line a copy that
 * trimmed first still ended in a space). Lines join with a
 * newline, as xterm's do on this Mac. Column selection is not read because it
 * never happens here: the pane sets `macOptionClickForcesSelection`
 * (../TerminalPane.tsx), so an Option drag selects normally.
 *
 * Over a buffer whose rows fit the pane and whose lines end in no space, this
 * is xterm's text byte for byte. ./__tests__/p368-drawn-text.test.ts holds
 * that as a property over random buffers.
 */

import type { IBufferRange, Terminal } from '@xterm/xterm';

/** The slice of a terminal a copy reads, so a test can hand one in. */
export type DrawnTextSource = Pick<
  Terminal,
  'buffer' | 'cols' | 'getSelectionPosition'
>;

/** Every non breaking space, which xterm makes plain in a copy. */
const NON_BREAKING_SPACES = /\u00a0/g;

/**
 * A line without the U+0020 it ends in, and nothing else: not a tab. A loop
 * rather than a pattern, because a copy can hold a line thousands of cells
 * long and a trailing-space pattern rescans every run of spaces that is not at
 * the end.
 */
function withoutTrailingSpaces(line: string): string {
  let end = line.length;
  while (end > 0 && line.charCodeAt(end - 1) === 0x20) end -= 1;
  return end === line.length ? line : line.slice(0, end);
}

/**
 * The text of `range`, or of the terminal's selection when no range is given,
 * as the pane draws it. `range` is xterm's own shape, `end.x` exclusive.
 * Answers an empty string when nothing is selected.
 */
export function drawnSelectionText(
  term: DrawnTextSource,
  range?: IBufferRange
): string {
  const sel = range ?? term.getSelectionPosition();
  if (sel === undefined) return '';
  const buffer = term.buffer.active;
  const cols = term.cols;
  // A row from `from` up to `to`, and never past the pane's right edge.
  const row = (y: number, from: number, to?: number): string => {
    const line = buffer.getLine(y);
    if (line === undefined) return '';
    return line.translateToString(true, from, Math.min(to ?? line.length, cols));
  };
  const lines: string[] = [];
  // A row the previous one wraps onto belongs to the line before it.
  const add = (y: number, text: string): void => {
    if (buffer.getLine(y)?.isWrapped === true) lines[lines.length - 1] += text;
    else lines.push(text);
  };
  const oneRow = sel.start.y === sel.end.y;
  lines.push(row(sel.start.y, sel.start.x, oneRow ? sel.end.x : undefined));
  for (let y = sel.start.y + 1; y < sel.end.y; y += 1) add(y, row(y, 0));
  if (!oneRow) add(sel.end.y, row(sel.end.y, 0, sel.end.x));
  return lines
    .map((line) => withoutTrailingSpaces(line.replace(NON_BREAKING_SPACES, ' ')))
    .join('\n');
}
