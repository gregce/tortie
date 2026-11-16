/**
 * TMUX'S WIDTHS IN TORTIE'S TERMINAL (Phase 368, build/p368/SPEC.md §4.2,
 * D7 and D8; research 145 §3.3).
 *
 * A session on this Mac is drawn by tmux, and tmux decides how many cells a
 * character takes. Tortie's terminal decided again, by xterm's own Unicode 6
 * table, and the two disagreed on 9,498 code points that tmux draws two cells
 * wide and xterm one, every emoji among them. On tmux 3.7b that left the rest
 * of every emoji row one cell to the left with a stale letter at its end; on a
 * server older than 3.7 it put the old frame's letters in the new frame's gaps,
 * which is the overlapping reply issue 44 reported.
 *
 * So the terminal is handed tmux's OWN answer, through xterm's own provider
 * interface (`term.unicode`, a proposed API, so the terminal must be made with
 * `allowProposedApi`): `wcwidth` is the measured table of the build that draws
 * the session (src/shared/cell-widths.ts), and `charProperties` is ONE step of
 * the seven measured joining rules (src/shared/cells.ts, `nextCell`), the same
 * step that cuts a row for the phone, carried in xterm's own encoding of a
 * code point's properties, `(state << 3) | (width << 1) | join`
 * (`UnicodeService.createPropertyValue`). A joining code point answers the open
 * cell's NEW width, which is how xterm widens a cell in place (VS16 makes a
 * one-cell heart two, `InputHandler.print`). No Unicode addon and no new
 * dependency.
 *
 * WHICH TABLE is the caller's to say, from the session row (`cellWidths`, set
 * in main from this Mac's server version, D7). Null keeps xterm's Unicode 6,
 * as before this phase: a session on another machine is drawn by a build
 * nobody measured, so a measured table could be worse there than today.
 */

import type { IUnicodeVersionProvider, Terminal } from '@xterm/xterm';
import { cellWidthIn, type CellWidthTable } from '@shared/cell-widths';
import { nextCell } from '@shared/cells';

/** One provider per measured build, made once: they hold no state of their own. */
function providerFor(table: CellWidthTable): IUnicodeVersionProvider {
  return Object.freeze({
    version: `tmux-${table}`,
    wcwidth(codepoint: number): 0 | 1 | 2 {
      return cellWidthIn(table, codepoint);
    },
    charProperties(codepoint: number, preceding: number): number {
      const step = nextCell(preceding >> 3, codepoint, table);
      return (step.state << 3) | (step.width << 1) | (step.join ? 1 : 0);
    }
  });
}

const PROVIDERS: Readonly<Record<CellWidthTable, IUnicodeVersionProvider>> = Object.freeze({
  '3.7b': providerFor('3.7b'),
  '3.6a': providerFor('3.6a')
});

/** xterm's provider for one measured build's widths and joining rules. */
export function tmuxWidthsProvider(table: CellWidthTable): IUnicodeVersionProvider {
  return PROVIDERS[table];
}

/** True once a terminal without the proposed API was refused, so the console says it once. */
let saidRefused = false;

/**
 * Hand a terminal the widths of the server that draws its session, and make
 * them the ones it uses. Null does nothing: the terminal keeps xterm's Unicode
 * 6, as before this phase. Called right after the terminal is made, before it
 * opens or is written to, because a cell already printed keeps the width it
 * was printed at.
 *
 * A terminal made without `allowProposedApi` would throw on `term.unicode`;
 * this answers it with nothing instead, and says so once.
 */
export function registerTmuxWidths(term: Terminal, table: CellWidthTable | null): void {
  if (table === null) return;
  if (term.options?.allowProposedApi !== true) {
    if (!saidRefused) {
      saidRefused = true;
      console.warn('[gmux] terminal: widths left at Unicode 6, because the terminal was made without allowProposedApi');
    }
    return;
  }
  const provider = tmuxWidthsProvider(table);
  term.unicode.register(provider);
  term.unicode.activeVersion = provider.version;
}
