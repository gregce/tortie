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
 * THE TWO DISPLAYS must agree on the pane, the width, the height and the
 * alternate screen, or the read is taken once more; a second disagreement is
 * served with the second display's values, which are the youngest. Anything
 * that fails is null, which the watcher answers as `ended` when the row says
 * so and otherwise reads again at its next tick.
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
 * height, the cursor's column, row and visibility, and the alternate screen.
 * Compared with `===` wherever it is read; never built from a caller's string.
 */
export const SCREEN_FORMAT =
  '#{pane_id}\t#{pane_width}\t#{pane_height}\t#{cursor_x}\t#{cursor_y}\t#{cursor_flag}\t#{alternate_on}';

/** What one display line says about the pane a read captured. */
export interface ScreenDisplay {
  readonly paneId: string;
  readonly cols: number;
  readonly rows: number;
  readonly cursorX: number;
  readonly cursorY: number;
  readonly cursorVisible: boolean;
  readonly alternate: boolean;
}

/** One read: the styled capture, and the display that frames it (the second, the youngest), raw and parsed. */
export interface ScreenReading {
  readonly styled: string;
  readonly display: ScreenDisplay;
  readonly displayLine: string;
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
/** tmux's flags, 0 or 1. */
const FLAG = /^[01]$/;

/**
 * One display line, parsed: exactly seven fields, each whole and bounded, or
 * null.
 *
 * THE SEPARATOR IS A TAB, OR `_` THROUGHOUT. tmux turns every byte below 0x20
 * in a format's answer into `_` for a client it does not classify as UTF-8:
 * MEASURED by the screen builder on 2026-10-05 with the vendored 3.7b, the same
 * format read `%2\t120\t0` under `LANG=en_US.UTF-8` and `%2_120_0` under
 * `LANG=C` (Phase 320.1 measured it over a machine's own sshd, where it is the
 * usual case; src/main/machines/remote-pane-history.ts). No field can hold a
 * `_`, so a line split on it is the same seven fields; a line mixing the two is
 * refused.
 */
export function parseScreenDisplay(line: string): ScreenDisplay | null {
  const text = line.endsWith('\n') ? line.slice(0, -1) : line;
  const sep = text.includes('\t') ? '\t' : '_';
  const fields = text.split(sep);
  if (fields.length !== 7) return null;
  const [pane, cols, rows, x, y, visible, alternate] = fields;
  if (pane === undefined || !PANE_ID.test(pane)) return null;
  for (const n of [cols, rows, x, y]) if (n === undefined || !WHOLE.test(n)) return null;
  for (const f of [visible, alternate]) if (f === undefined || !FLAG.test(f)) return null;
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
    alternate: alternate === '1'
  };
}

/** Whether two displays frame the same picture: the same pane, size and screen (D5). */
function agree(a: ScreenDisplay, b: ScreenDisplay): boolean {
  return a.paneId === b.paneId && a.cols === b.cols && a.rows === b.rows && a.alternate === b.alternate;
}

/** One attempt's three answers, or null when any could not be read. */
interface Attempt {
  readonly first: ScreenDisplay;
  readonly second: ScreenDisplay;
  readonly secondLine: string;
  readonly styled: string;
}

/** The control client's one-command line for an argv. */
function lineOf(args: readonly string[]): string {
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
  return { first, second, secondLine, styled: lines.slice(1, first.rows + 1).join('\n') };
}

/** One attempt over the control client: the three lines written in ONE statement (D5). */
async function attemptOverControl(control: ScreenCore['control'], tmuxId: string): Promise<Attempt | null> {
  const display = lineOf(displayArgs(tmuxId));
  const capture = lineOf(captureArgs(tmuxId));
  const answers = await Promise.allSettled([
    control.sendCommand(display),
    control.sendCommand(capture),
    control.sendCommand(display)
  ]);
  const [a, b, c] = answers;
  if (a?.status !== 'fulfilled' || b?.status !== 'fulfilled' || c?.status !== 'fulfilled') return null;
  if (a.value.length !== 1 || c.value.length !== 1) return null;
  const firstLine = a.value[0] ?? '';
  const secondLine = c.value[0] ?? '';
  const first = parseScreenDisplay(firstLine);
  const second = parseScreenDisplay(secondLine);
  if (first === null || second === null) return null;
  return { first, second, secondLine, styled: b.value.join('\n') };
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

/** An attempt as a reading, framed by its second display. */
function readingOf(attempt: Attempt): ScreenReading {
  return { styled: attempt.styled, display: attempt.second, displayLine: attempt.secondLine };
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
 * disagree are read once more; a second disagreement is served with the
 * second's values (D5). Null on any failure.
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
