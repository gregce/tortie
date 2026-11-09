/**
 * A range of history lines in ONE tmux invocation, with tmux computing the
 * offsets (Phase 295, build/p353/SPEC.md D295-1 and D295-2).
 *
 * THE DEFECT. A copy from a session's history, after a drag past the edge of
 * the pane, used to make two calls: one read of `#{history_size}` and
 * `#{pane_height}`, then a `capture-pane` whose `-S` and `-E` main computed
 * from that read. Each call was its own tmux client, and every line the pane
 * printed between the two moved the top of the live screen down a row, so the
 * offsets named lines that many rows newer. The clipboard then held different
 * lines from the ones highlighted, and nothing said so. MEASURED 2026-11-05 on
 * scratch servers, one pane printing `L<n>`, each trial asking for one line:
 * the pair was off 8 of 300, 58 of 300 and 200 of 200 at 10, 80 and 700 lines
 * a second on tmux 3.7b (by up to 4), and 9, 106 and 200 of 200 on 3.6a (by up
 * to 6). The same request as ONE invocation was off 0 in every cell, and
 * quicker (a median 2.1 to 3.3 ms against 4.3 to 7.2 ms), being one spawn.
 *
 * WHY ONE INVOCATION IS ONE INSTANT, read in the vendored 3.7b's source.
 * `capture-pane` reads `-S` and `-E` through `args_strtonum_and_expand`, which
 * expands a format against the target pane when the command RUNS
 * (`cmd-capture-pane.c`, `arguments.c`). The server runs a client's queued
 * commands back to back (`cmdq_next`, `cmd-queue.c`) until one waits, and
 * neither `display-message -p` without `-I` nor `capture-pane -p` waits. A
 * pane's output is parsed in a libevent callback (`window_pane_read_callback`,
 * `window.c`), which cannot run between two commands of one queue. So the
 * extent `display-message` prints and the lines `capture-pane` takes belong to
 * the same grid.
 *
 * WHY tmux COMPUTES THE OFFSETS. Chaining two commands whose offsets main
 * computed from an EARLIER read is the same race inside one invocation. Here
 * the offset is `#{e|-:<line>,#{history_size}}`, tmux's own arithmetic over
 * the history it holds at that instant: the line the renderer numbered from
 * the oldest the server holds, less the history above the live screen, is the
 * row `capture-pane` numbers from the top of the live screen. Measured to
 * answer `L10 L11 L12` for lines 10 to 12 on 3.6a and 3.7b alike.
 *
 * WHAT THIS DOES NOT DO, and its caller does: the clamp. tmux moves a range
 * above the top to the oldest line, reads any value it cannot parse as the top
 * of the live screen, cuts an end past the last row at the last row, and
 * answers the last row for a start past it. So the caller
 * (`captureHistoryRange` in src/main/capture/service.ts) floors the start at
 * 0 and refuses an end below it BEFORE this is called, and AFTER it applies
 * `clampHistoryRange` (./scroll.ts) to the extent this same invocation printed,
 * which is the one instant the lines came from.
 *
 * A VALUE THAT IS NOT A WHOLE NUMBER IS REFUSED BEFORE ANYTHING IS COMPOSED.
 * tmux reads `NaN`, `Infinity` or `1.5` in a format's arithmetic as something,
 * and `capture-pane` reads a value it cannot parse as the live screen, so a bad
 * number would be a wrong copy rather than an error.
 *
 * This Mac's server only. A copy from a session on another machine has its own
 * two-call reader (src/main/machines/remote-pane-history.ts), which this phase
 * does not touch.
 */

import { formatSessionTarget } from './names';
import type { TmuxScrollRunner } from './scroll';
import { execTmux } from './supervisor';

/** What one invocation answered: the extent it printed, and the lines. */
export interface HistoryLines {
  /** `#{history_size}` at the instant tmux captured the lines. */
  history: number;
  /** `#{pane_height}` at the same instant. */
  rows: number;
  /** `capture-pane -p`'s output, every row ending in a newline. */
  ansi: string;
}

/** The extent `display-message` prints first: two fields and a tab. */
const EXTENT_FORMAT = '#{history_size}\t#{pane_height}';

/** tmux's own offset for a line numbered from the oldest the server holds. */
function offsetOf(line: number): string {
  return `#{e|-:${String(line)},#{history_size}}`;
}

/**
 * The one argv: the extent, then the capture, joined by tmux's own `;`. One
 * client, one queue, one instant.
 */
export function historyLinesArgv(
  target: string,
  start: number,
  end: number,
  join: boolean
): string[] {
  const pane = formatSessionTarget(target);
  return [
    'display-message',
    '-p',
    '-t',
    pane,
    '-F',
    EXTENT_FORMAT,
    ';',
    'capture-pane',
    '-p',
    '-e',
    ...(join ? ['-J'] : []),
    '-t',
    pane,
    '-S',
    offsetOf(start),
    '-E',
    offsetOf(end)
  ];
}

/**
 * The shipped runner: this Mac's server, with the capture's own budget,
 * because a held range can run to thousands of coloured lines.
 */
const runOnThisMac: TmuxScrollRunner = (args) =>
  execTmux(args, { timeoutMs: 30_000 });

/** A field of the extent as a whole number, 0 when tmux answered nothing readable. */
function wholeNumber(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Capture history lines `start` to `end`, both counted from the oldest line
 * the server holds and both inclusive, in ONE invocation.
 *
 * `run` takes the `TmuxScrollRunner` shape so a test drives the argv that
 * ships; it is the default everywhere else.
 */
export async function captureHistoryLines(
  target: string,
  start: number,
  end: number,
  join: boolean,
  run: TmuxScrollRunner = runOnThisMac
): Promise<HistoryLines> {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
    throw new Error(
      'a history range must be two whole numbers; nothing was asked of the session'
    );
  }
  const out = await run(historyLinesArgv(target, start, end, join));
  // `display-message -p` prints one line first; everything after its newline
  // is the capture, byte for byte.
  const newline = out.indexOf('\n');
  const head = newline === -1 ? out : out.slice(0, newline);
  const ansi = newline === -1 ? '' : out.slice(newline + 1);
  const [history, rows] = head.split('\t');
  return { history: wholeNumber(history), rows: wholeNumber(rows), ansi };
}
