/**
 * ONE READ OF A SESSION'S SCREEN ON THIS MAC (Phase 337, build/p337/SPEC.md
 * §5.3.3, D5 to D7).
 *
 * A read is three tmux commands about the session's ACTIVE pane, aimed at the
 * session's immutable `$`-id: a `display-message` of {@link SCREEN_FORMAT}, a
 * styled `capture-pane -p -e`, and the same `display-message` once more.
 *
 * OVER THE CORE'S CONTROL CLIENT, the three are three ONE-COMMAND lines written
 * in one statement, so they reach tmux in one tick and in order (MEASURED, §14
 * M2: 0.116 to 0.122 ms p50, 0.25 to 0.33 ms p99 for the three). A `;` list on
 * that client would desync its queue (src/main/sessions/core.ts's scroll
 * runner says why), so it is never written there.
 *
 * WHEN THE CONTROL CLIENT IS DOWN, ONE spawned `tmux` carries the three as a
 * `;` list (§Attack A8), and its output is SPLIT BY COUNT: the first line is the
 * first display, then exactly that display's `rows` lines of capture, then the
 * second display, and the output must hold exactly that many lines. A captured
 * row that looks like a display is therefore just a row, wherever it stands.
 *
 * THE TWO DISPLAYS must agree on the pane, the width, the height, the
 * alternate screen and the history size ({@link agree}, Phase 337.1 D5), or
 * the read is taken once more; a second disagreement is served with the second
 * display's values, which are the youngest, and `steady: false`, which tells
 * the composer that this picture names no place in the history (its `depth` is
 * null). MEASURED by the 337.1 spec step (build/p3371/SPEC.md §14 M4): the
 * three-line block is not atomic under a flood; its two displays disagreed on
 * the history size in 16 of 400 blocks on 3.7b and 3 of 400 on 3.6a. Anything
 * that fails is null, which the watcher answers as `ended` when the row says
 * so and otherwise reads again at its next tick.
 *
 * THE KEYS AIM AT THE PANE THE SERVED DISPLAY NAMES (337 D5's pane clause,
 * `conformance:pocket` Z23): src/main/screen/keys.ts takes its `%pane` from
 * the fresh reading's `display.paneId`, which is the one this module served.
 *
 * NOTHING SIZES ANYTHING (D7): the verbs here are `display-message` with `-p`
 * and `capture-pane` with `-p`, and the one format is a constant no caller
 * string reaches (a format on a long-lived connection can run programs,
 * src/main/machines/scroll-shapes.ts). It logs nothing and reads no error's
 * text.
 */

import type { Session } from '@shared/types';
import type { ManifestSessionRecord } from '../manifest';
import { execTmux, quoteTmuxArg } from '../tmux';

/**
 * The ONE format a screen read asks tmux for: the active pane, its width and
 * height, the cursor's column, row and visibility, the alternate screen, and
 * (Phase 337.1 D4) the history size, LAST, so the seven fields before it keep
 * their places. Compared with `===` wherever it is read; never built from a
 * caller's string. A page of history (./scrollback.ts) and the far reads
 * (../machines/remote-screen.ts) ask this same constant.
 */
export const SCREEN_FORMAT =
  '#{pane_id}\t#{pane_width}\t#{pane_height}\t#{cursor_x}\t#{cursor_y}\t#{cursor_flag}\t#{alternate_on}\t#{history_size}';

/** What one display line says about the pane a read captured. */
export interface ScreenDisplay {
  readonly paneId: string;
  readonly cols: number;
  readonly rows: number;
  readonly cursorX: number;
  readonly cursorY: number;
  readonly cursorVisible: boolean;
  readonly alternate: boolean;
  /**
   * tmux's `#{history_size}`: how many lines sit above the live screen (Phase
   * 337.1 D2). Line `i` of the history, 0 the oldest, is tmux line
   * `i - history`, and the live screen's top row is index `history`.
   */
  readonly history: number;
}

/**
 * One read: the styled capture, and the display that frames it (the second,
 * the youngest), raw and parsed.
 *
 * `steady` (Phase 337.1 D5) is whether the two displays of the attempt served
 * agreed. `displayLine` is the second display's raw line when they did, and
 * BOTH raw lines, first then second, a newline between, when they did not, so
 * the watcher's revision (which covers this line, 337 D14) never gives a
 * picture whose displays disagreed (and whose `depth` is therefore null) the
 * same revision as the steady picture of the same screen after it: that
 * picture is answered, and its `depth` with it, as D3 says the next one is.
 */
export interface ScreenReading {
  readonly styled: string;
  readonly display: ScreenDisplay;
  readonly displayLine: string;
  readonly steady: boolean;
}

/**
 * What the screen's modules read from and type through, structurally, as
 * src/main/reply/writer.ts's `ReplyCore` is. `GmuxCore` satisfies it as it
 * stands.
 */
export interface ScreenCore {
  listSessions(): readonly Session[];
  tmuxIdOf(sessionId: string): string | null;
  readonly manifest: { getSession(id: string): Pick<ManifestSessionRecord, 'status'> | undefined };
  readonly control: { readonly connected: boolean; sendCommand(command: string): Promise<string[]> };
  readonly activity: { noteUserInput(sessionId: string): void };
}

/** The spawned runner of the down path. Production: `execTmux`. */
export type ScreenSpawn = (args: readonly string[], options?: { timeoutMs?: number }) => Promise<string>;

/** A `$`-id, the only target a read is aimed at. */
const SESSION_TARGET = /^\$(0|[1-9][0-9]{0,8})$/;
/** A `%`-id, the only pane a display may name. */
const PANE_ID = /^%(0|[1-9][0-9]{0,8})$/;
/** A whole number of at most five digits, no sign, no leading zero. */
const WHOLE = /^(0|[1-9][0-9]{0,4})$/;
/**
 * The history size: a whole number of at most NINE digits, the bound `PANE_ID`
 * already uses (Phase 337.1 D4, §Attack B16). A display line that fails to
 * parse fails the whole live read, so a history deeper than the Mac's own
 * limit (a far server's is its own) must never cost him the terminal he has
 * today; one past `POCKET_SCROLLBACK_MAX_INDEX` is read, and answered with no
 * `depth` (./compose.ts).
 */
const WHOLE9 = /^(0|[1-9][0-9]{0,8})$/;
/** tmux's flags, 0 or 1. */
const FLAG = /^[01]$/;

/**
 * One display line, parsed: exactly eight fields, each whole and bounded, or
 * null.
 *
 * THE SEPARATOR IS A TAB, OR `_` THROUGHOUT. tmux turns every byte below 0x20
 * in a format's answer into `_` for a client it does not classify as UTF-8:
 * MEASURED by the screen builder on 2026-10-05 with the vendored 3.7b, the same
 * format read `%2\t120\t0` under `LANG=en_US.UTF-8` and `%2_120_0` under
 * `LANG=C` (Phase 320.1 measured it over a machine's own sshd, where it is the
 * usual case; src/main/machines/remote-pane-history.ts). No field can hold a
 * `_`, so a line split on it is the same eight fields; a line mixing the two is
 * refused.
 */
export function parseScreenDisplay(line: string): ScreenDisplay | null {
  const text = line.endsWith('\n') ? line.slice(0, -1) : line;
  const sep = text.includes('\t') ? '\t' : '_';
  const fields = text.split(sep);
  if (fields.length !== 8) return null;
  const [pane, cols, rows, x, y, visible, alternate, history] = fields;
  if (pane === undefined || !PANE_ID.test(pane)) return null;
  for (const n of [cols, rows, x, y]) if (n === undefined || !WHOLE.test(n)) return null;
  for (const f of [visible, alternate]) if (f === undefined || !FLAG.test(f)) return null;
  if (history === undefined || !WHOLE9.test(history)) return null;
  const width = Number(cols);
  const height = Number(rows);
  if (width < 1 || height < 1) return null;
  return {
    paneId: pane,
    cols: width,
    rows: height,
    cursorX: Number(x),
    cursorY: Number(y),
    cursorVisible: visible === '1',
    alternate: alternate === '1',
    history: Number(history)
  };
}

/**
 * Whether two displays frame the same picture (D5, widened by Phase 337.1):
 * the same pane, the same width and height, the same screen, and the same
 * history size, each compared with `===`. THE ONE COMPARISON: this module's
 * live read, the far read (../machines/remote-screen.ts) and a page of history
 * (./scrollback.ts) all call it (`conformance:pocket` Z23). A history that
 * moved between the two displays means lines scrolled during the read, so the
 * capture sits in neither display's frame for certain (build/p3371/SPEC.md §14
 * M4: every wrong page of that measurement was in a block whose displays
 * disagreed).
 */
export function agree(a: ScreenDisplay, b: ScreenDisplay): boolean {
  return (
    a.paneId === b.paneId &&
    a.cols === b.cols &&
    a.rows === b.rows &&
    a.alternate === b.alternate &&
    a.history === b.history
  );
}

/** One attempt's three answers, or null when any could not be read. */
interface Attempt {
  readonly first: ScreenDisplay;
  readonly firstLine: string;
  readonly second: ScreenDisplay;
  readonly secondLine: string;
  readonly styled: string;
}

/** The control client's one-command line for an argv (./scrollback.ts writes its page round with it too). */
export function lineOf(args: readonly string[]): string {
  return args.map(quoteTmuxArg).join(' ');
}

/** The display's argv, aimed at a `$`-id. */
function displayArgs(tmuxId: string): string[] {
  return ['display-message', '-p', '-t', tmuxId, SCREEN_FORMAT];
}

/** The styled capture's argv, aimed at a `$`-id. */
function captureArgs(tmuxId: string): string[] {
  return ['capture-pane', '-p', '-e', '-t', tmuxId];
}

/** The down path's ONE spawned list: display, capture, display (§Attack A8). */
export function spawnedReadArgs(tmuxId: string): string[] {
  return [...displayArgs(tmuxId), ';', ...captureArgs(tmuxId), ';', ...displayArgs(tmuxId)];
}

/**
 * The down path's output, SPLIT BY COUNT: the first line is the first display,
 * then exactly its `rows` lines of capture, then the second display, and the
 * output holds exactly that many lines. Null when it does not.
 */
export function splitSpawnedRead(stdout: string): Attempt | null {
  const lines = stdout.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const firstLine = lines[0];
  if (firstLine === undefined) return null;
  const first = parseScreenDisplay(firstLine);
  if (first === null) return null;
  if (lines.length !== first.rows + 2) return null;
  const secondLine = lines[first.rows + 1] ?? '';
  const second = parseScreenDisplay(secondLine);
  if (second === null) return null;
  return { first, firstLine, second, secondLine, styled: lines.slice(1, first.rows + 1).join('\n') };
}

/**
 * ONE PAGE ROUND'S THREE ANSWERS (Phase 337.1 D9): the display before the
 * capture, the capture's lines (oldest first, one string a line), and the
 * display after it. ./scrollback.ts asks whether the two displays agree, and
 * where the capture sits, itself.
 */
export interface PageRound {
  readonly first: ScreenDisplay;
  readonly rows: readonly string[];
  readonly last: ScreenDisplay;
}

/**
 * How many lines `capture-pane -S a -E b` prints from a pane whose history is
 * `history`, where `a < b` are tmux's own line numbers (negative is history):
 * tmux 3.6a and 3.7b place each end at `history + n`, an end above the oldest
 * line at the oldest line (index 0), and swap the two if they cross
 * (`cmd-capture-pane.c`), so this is `(b + h) - max(a + h, 0) + 1` for every
 * range whose end is in the history, and one line when both ends are above it.
 */
export function pageLineCount(a: number, b: number, history: number): number {
  return Math.max(b + history, 0) - Math.max(a + history, 0) + 1;
}

/**
 * A page round sent as ONE `;` list (the control client down on this Mac, or
 * one exec on another machine), SPLIT BY COUNT FROM ITS FIRST DISPLAY: one
 * command list runs with no pane output between its commands, so the first
 * display's history is the capture's, and the output is the first display,
 * exactly {@link pageLineCount} capture lines, then the last display, and
 * nothing more. Null when it is not, so a captured row shaped like a display
 * is a row wherever it stands.
 */
export function splitScrollbackRead(stdout: string, a: number, b: number): PageRound | null {
  const lines = stdout.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const firstLine = lines[0];
  if (firstLine === undefined) return null;
  const first = parseScreenDisplay(firstLine);
  if (first === null) return null;
  const count = pageLineCount(a, b, first.history);
  if (!(count >= 1) || lines.length !== count + 2) return null;
  const last = parseScreenDisplay(lines[count + 1] ?? '');
  if (last === null) return null;
  return { first, rows: lines.slice(1, count + 1), last };
}

/** What one statement of display, capture, display answered over the control client. */
export interface ControlStatement {
  readonly first: ScreenDisplay;
  readonly firstLine: string;
  /** The capture's lines, one string a line, as the control client collected them. */
  readonly captured: string[];
  readonly last: ScreenDisplay;
  readonly lastLine: string;
}

/**
 * THE ONE STATEMENT over the control client (D5, and a page round's, Phase
 * 337.1 D9): the display line, the capture line and the display line once
 * more, written in ONE statement, so they reach tmux in one tick and in order.
 * Null when any line was refused, or a display did not answer exactly one line
 * that parses. This module's live read and ./scrollback.ts's rounds both write
 * through it.
 */
export async function statementOverControl(
  control: ScreenCore['control'],
  display: string,
  capture: string
): Promise<ControlStatement | null> {
  const answers = await Promise.allSettled([
    control.sendCommand(display),
    control.sendCommand(capture),
    control.sendCommand(display)
  ]);
  const [a, b, c] = answers;
  if (a?.status !== 'fulfilled' || b?.status !== 'fulfilled' || c?.status !== 'fulfilled') return null;
  if (a.value.length !== 1 || c.value.length !== 1) return null;
  const firstLine = a.value[0] ?? '';
  const lastLine = c.value[0] ?? '';
  const first = parseScreenDisplay(firstLine);
  const last = parseScreenDisplay(lastLine);
  if (first === null || last === null) return null;
  return { first, firstLine, captured: b.value, last, lastLine };
}

/** One attempt over the control client: the three lines written in ONE statement (D5). */
async function attemptOverControl(control: ScreenCore['control'], tmuxId: string): Promise<Attempt | null> {
  const three = await statementOverControl(control, lineOf(displayArgs(tmuxId)), lineOf(captureArgs(tmuxId)));
  if (three === null) return null;
  return {
    first: three.first,
    firstLine: three.firstLine,
    second: three.last,
    secondLine: three.lastLine,
    styled: three.captured.join('\n')
  };
}

/** One attempt as ONE spawned list (the control client is down). */
async function attemptSpawned(spawn: ScreenSpawn, tmuxId: string, timeoutMs: number): Promise<Attempt | null> {
  let stdout: string;
  try {
    stdout = await spawn(spawnedReadArgs(tmuxId), { timeoutMs });
  } catch {
    return null;
  }
  return splitSpawnedRead(stdout);
}

/**
 * An attempt as a reading, framed by its second display, `steady` when its two
 * displays agree; an unsteady reading's `displayLine` holds both lines (see
 * {@link ScreenReading}).
 */
function readingOf(attempt: Attempt): ScreenReading {
  const steady = agree(attempt.first, attempt.second);
  return {
    styled: attempt.styled,
    display: attempt.second,
    displayLine: steady ? attempt.secondLine : `${attempt.firstLine}\n${attempt.secondLine}`,
    steady
  };
}

/** How the down path spawns and how long it waits, for tests and the watcher. */
export interface ScreenReadOptions {
  readonly spawn?: ScreenSpawn;
  /** The spawned list's own deadline; the watcher races every read against its deadline besides. */
  readonly timeoutMs?: number;
}

/**
 * One read of a session on this Mac, aimed at its `$`-id: over the control
 * client while it is connected, else as one spawned list. Two displays that
 * disagree are read once more, and never a third time; a second disagreement
 * is served with the second's values and `steady: false` (D5). Null on any
 * failure.
 */
export async function readScreenLocal(
  core: ScreenCore,
  tmuxId: string,
  options: ScreenReadOptions = {}
): Promise<ScreenReading | null> {
  if (!SESSION_TARGET.test(tmuxId)) return null;
  const spawn = options.spawn ?? execTmux;
  const timeoutMs = options.timeoutMs ?? 1_000;
  const attempt = (): Promise<Attempt | null> =>
    core.control.connected
      ? attemptOverControl(core.control, tmuxId)
      : attemptSpawned(spawn, tmuxId, timeoutMs);
  const once = await attempt();
  if (once === null) return null;
  if (agree(once.first, once.second)) return readingOf(once);
  const twice = await attempt();
  if (twice === null) return null;
  return readingOf(twice);
}
