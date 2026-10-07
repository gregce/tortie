/**
 * ONE READ OF A SESSION'S SCREEN ON ANOTHER MACHINE (Phase 337,
 * build/p337/SPEC.md §5.3.3, D5, D7; in ./remote-pane-history.ts's shape), and
 * ONE ROUND OF A PAGE OF ITS HISTORY (Phase 337.1, build/p3371/SPEC.md D6,
 * D10, §5.3.3, §5.3.5).
 *
 * WHAT CROSSES. Exactly three commands in ONE exec, every one a read already on
 * the exec plane's ledger (`display-message` with `-p`, and `capture-pane` with
 * `-p`), composed by {@link remoteScreenArgv} or {@link remoteScrollbackArgv}
 * from the session's immutable `$N`, the one format, `SCREEN_FORMAT`
 * (../screen/read.ts), and for a page two whole numbers main computed and
 * checked, and nothing else: no caller string reaches an argv. The machine is
 * reached through `execOn` alone, and no scroll verb or carriage row is named
 * here: this is a read over the exec plane, not the control connection's
 * closed door in ./scroll-shapes.ts. MEASURED on a loopback machine (337 §14
 * M9): 8.97 and 10.33 ms p50 an exec of two commands; (337.1 §14 M10) 9.97 to
 * 10.28 ms of three, and a 100-row page 10.12 ms p50, 11.5 ms p99.
 *
 * THE TARGET is the session's LIVE address (`remoteScrollAddress`, the scroll's
 * own rule, D4 of Phase 320.1): a row listed on the machine's current
 * connection, never a gone row, so a `$N` a far restart handed to somebody
 * else's session is never read. Anything else is `'unreachable'`.
 *
 * THE LIVE ANSWER (D6) is the display, the capture, then the display, SPLIT BY
 * COUNT: the first line, then the first display's `rows` lines, then the last
 * line, so a captured row shaped like a display is a row. One exec is one tmux
 * command list, which the far server runs with no pane output between its
 * commands, so the count holds for an honest far tmux, and the picture is
 * `steady` when its two displays agree (../screen/read.ts `agree`). An answer
 * whose count does NOT hold is still a picture, as it is today, and never
 * `unreachable` (a false sentence over a server that answered, §Attack B16):
 * its last line is the display and the rest the capture (less the first
 * display line, which is always the first command's answer), served with
 * `steady: false`. A display a far tmux printed with `_` where the format has
 * tabs (a client it does not call UTF-8, as Phase 320.1 measured over a
 * machine's own sshd) reads the same (`parseScreenDisplay`).
 *
 * A PAGE ROUND (D10) is the display, `capture-pane -p -e -S <a> -E <b>`, then
 * the display, in ONE exec, split by count from its first display
 * (`splitScrollbackRead`); ../screen/scrollback.ts decides everything else.
 *
 * NOTHING SIZES ANYTHING (D7), it logs nothing and it reads no error's text.
 */

import {
  agree,
  parseScreenDisplay,
  SCREEN_FORMAT,
  splitScrollbackRead,
  type PageRound,
  type ScreenReading
} from '../screen/read';
import { execOn } from './exec-plane';
import { readyRemoteContext } from './ready-context';
import { remoteScrollAddress } from './remote-sessions';
import { SCROLL_TARGET } from './scroll-shapes';

/**
 * The one argv a remote screen read sends: the display, the styled capture,
 * and the display once more, aimed at a `$N` (D6). Throws for any other
 * target, which is a programming error and never a person's input.
 */
export function remoteScreenArgv(tmuxId: string): string[] {
  if (!SCROLL_TARGET.test(tmuxId)) throw new Error('a remote screen read is aimed at a $N session id');
  return ['display-message', '-p', '-t', tmuxId, SCREEN_FORMAT, ';', 'capture-pane', '-p', '-e', '-t', tmuxId, ';',
    'display-message', '-p', '-t', tmuxId, SCREEN_FORMAT];
}

/**
 * A number `capture-pane` may be handed: a whole number, sign allowed, never a
 * fraction. Clause for clause ./remote-pane-history.ts's `wholeNumber`
 * (Phase 320.1), which is not exported: `Number.isSafeInteger`, else a throw
 * before any argv exists, then `String(`.
 */
function wholeNumber(n: number): string {
  if (!Number.isSafeInteger(n)) {
    throw new Error('a page range end is not a whole number');
  }
  return String(n);
}

/**
 * The one argv a far PAGE ROUND sends (D10): the display, the styled capture
 * of tmux lines `a` to `b`, and the display once more, aimed at a `$N`, in ONE
 * exec. `a` and `b` are whole numbers ../screen/scrollback.ts computed, checked
 * here again; anything else, or another target, throws before an argv exists.
 * Nothing composes a display-only round (§Attack B2).
 */
export function remoteScrollbackArgv(tmuxId: string, a: number, b: number): string[] {
  if (!SCROLL_TARGET.test(tmuxId)) throw new Error('a remote page read is aimed at a $N session id');
  const start = wholeNumber(a);
  const end = wholeNumber(b);
  return ['display-message', '-p', '-t', tmuxId, SCREEN_FORMAT, ';',
    'capture-pane', '-p', '-e', '-t', tmuxId, '-S', start, '-E', end, ';',
    'display-message', '-p', '-t', tmuxId, SCREEN_FORMAT];
}

/**
 * One exec's output as a reading (D6): split by count, `steady` when its two
 * displays agree; when the count does not hold, today's split (the last line
 * the display, the rest the capture, the first display line left out when it
 * is one) with `steady: false`. Null when no last line is a display. An
 * unsteady reading's `displayLine` holds both display lines, as this Mac's
 * does (../screen/read.ts `ScreenReading`).
 */
export function splitRemoteRead(stdout: string): ScreenReading | null {
  const lines = stdout.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const firstLine = lines[0];
  const first = firstLine === undefined ? null : parseScreenDisplay(firstLine);
  // BY COUNT: the first display, exactly its rows of capture, the last display.
  if (first !== null && firstLine !== undefined && lines.length === first.rows + 2) {
    const lastLine = lines[first.rows + 1] ?? '';
    const last = parseScreenDisplay(lastLine);
    if (last !== null) {
      const steady = agree(first, last);
      return {
        styled: lines.slice(1, first.rows + 1).join('\n'),
        display: last,
        displayLine: steady ? lastLine : `${firstLine}\n${lastLine}`,
        steady
      };
    }
  }
  // THE COUNT DOES NOT HOLD: still a picture, as today, never `unreachable`.
  const displayLine = lines.pop();
  if (displayLine === undefined) return null;
  const display = parseScreenDisplay(displayLine);
  if (display === null) return null;
  if (first !== null && lines.length > 0) lines.shift();
  return {
    styled: lines.join('\n'),
    display,
    displayLine: first !== null && firstLine !== undefined ? `${firstLine}\n${displayLine}` : displayLine,
    steady: false
  };
}

/**
 * One read of a session on another machine, in ONE exec under `timeoutMs`
 * (the watcher's `SCREEN_REMOTE_READ_DEADLINE_MS`). `'unreachable'` when the
 * session has no live address, the machine has no ready connection, the exec
 * fails, or its answer is not a reading.
 */
export async function readScreenRemote(sessionId: string, timeoutMs: number): Promise<ScreenReading | 'unreachable'> {
  const address = remoteScrollAddress(sessionId);
  if (address.kind !== 'live') return 'unreachable';
  let stdout: string;
  try {
    const ctx = readyRemoteContext(address.machineId);
    stdout = await execOn(ctx, remoteScreenArgv(address.tmuxId), { timeoutMs });
  } catch {
    return 'unreachable';
  }
  return splitRemoteRead(stdout) ?? 'unreachable';
}

/**
 * ONE ROUND OF A PAGE of a session on another machine (D10): the live address
 * asked first, then ONE exec of {@link remoteScrollbackArgv} under `timeoutMs`
 * (`SCREEN_REMOTE_READ_DEADLINE_MS`), split by count from its first display.
 * `'unreachable'` when the session has no live address, the machine has no
 * ready connection or the exec fails; null when it answered something that is
 * not a round (the reader takes its next attempt).
 */
export async function readScrollbackRemote(
  sessionId: string,
  a: number,
  b: number,
  timeoutMs: number
): Promise<PageRound | 'unreachable' | null> {
  const address = remoteScrollAddress(sessionId);
  if (address.kind !== 'live') return 'unreachable';
  let stdout: string;
  try {
    const ctx = readyRemoteContext(address.machineId);
    stdout = await execOn(ctx, remoteScrollbackArgv(address.tmuxId, a, b), { timeoutMs });
  } catch {
    return 'unreachable';
  }
  return splitScrollbackRead(stdout, a, b);
}
