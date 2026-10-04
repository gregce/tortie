/**
 * ONE FRESH READING OF A SESSION, FOR A PRESS OR A MESSAGE (Phase 318,
 * build/p318/SPEC.md §5.4.2, §5.4.5, D13, D14, D18; §Revision R1, R15, R17,
 * R19).
 *
 * The door's offer and the writer's press read the session ONE WAY, through
 * {@link readReply}, so what the phone is offered and what a press checks can
 * never be two readings of two different rules. Every read is awaited, in this
 * order, and a read that fails reads as "not pressable" and "cannot say":
 *
 *  1. `list-panes -t <$id> -F PANE_FORMAT`, the pane the session runs in; the
 *     act aims at THAT `%`-pane (§Revision R19 b);
 *  2. a fresh process table, the program holding the pane's terminal and its
 *     whole command line, asked of the gate's own program-token rule
 *     (`commandRunsAgent`). Never `agentHoldsTerminal`, which answers false for
 *     every Codex session, and never `noteForeground` or `foregroundToRead`,
 *     which keep their one call site in the monitor (D13);
 *  3. for a message, the agent's own reader (`nativeReadingOf`), and for a
 *     Codex message tmux's cursor;
 *  4. LAST, the screen: plain for a press (the screen the dialog detector was
 *     measured on), styled for a message (§5.4.4). It is the youngest thing the
 *     final check reads (§Revision R15).
 *
 * THE OFFER (§5.4.5) is decided here too, over one such reading. A press is
 * offered only when the question id did not move across the reading, a
 * compiled shape reads the screen, and what the SAME door answer draws is what
 * was just read (§Revision R1): the activity map the door draws from moves only
 * on the monitor's tick, so without that binding a phone could draw one
 * command's question over options that read the same for the next.
 *
 * It sets no status, logs nothing and never reads an error's text.
 */

import { POCKET_NO_REPLY, type PocketReplyOffer } from '@shared/ipc/pocket';
import type { SessionChoiceInfo, SessionChoiceOption } from '@shared/ipc/sessions';
import type { Session } from '@shared/types';
import { choiceMarkOf } from '../activity/monitor';
import { PANE_FORMAT, parsePaneLines, type PaneFacts } from '../activity/panes';
import type { ProcSnapshot } from '../activity/process';
import { composeQuestion } from '../activity/question';
import {
  detectDialogRows,
  hashScreen,
  normalizeCapture,
  type DialogRows
} from '../activity/screen';
import {
  binaryCandidatesFor,
  bundledRootsFor,
  commandRunsAgent,
  foregroundProgram
} from '../activity/state-machine';
import type { ActivityVerdict } from '../activity/types';
import type { PocketReplyDrawn } from '../pocket/routes';
import { replyAgentOf, replyGate, type ReplyKind } from './gate';
import { promptIsEmpty } from './input-row';
import { pressableOf, readPress, type PressReading } from './press-shapes';
import type { QuestionIds, QuestionTurn } from './question-id';

/** tmux's cursor for one pane, as `display-message` prints it: column, a tab, row. */
export const CURSOR_FORMAT = '#{cursor_x}\t#{cursor_y}';

/** What the reader reads with. Production: `execTmux`, `readProcSnapshot`, `readProcessCommand`, the monitor. */
export interface ReplyReadDeps {
  run(args: readonly string[]): Promise<string>;
  readProc(): Promise<ProcSnapshot | null>;
  readCommand(pid: number): Promise<string | null>;
  nativeReadingOf(
    sessionId: string,
    agent: string,
    cwd: string,
    pane: PaneFacts,
    proc: ProcSnapshot | null
  ): ActivityVerdict | null;
}

/** One fresh reading. */
export interface ReplyReading {
  /** The `$`-id this reading used, which the final check holds the session to. */
  readonly tmuxId: string;
  /** The pane read and captured; the act aims at its `%`-id. */
  readonly pane: PaneFacts;
  /** Whether the session's own agent holds the pane's terminal, read fresh. */
  readonly agentHolds: boolean;
  /** The agent's own reader, for a message; null otherwise or when it has nothing to say. */
  readonly native: ActivityVerdict | null;
  /** tmux's cursor, for a Codex message; null otherwise or when it could not be read. */
  readonly cursor: { x: number; y: number } | null;
  /** The capture, taken LAST: plain for a press, styled for a message. Null when not taken, or it failed. */
  readonly screen: string | null;
}

/** A press as one reading shows it. */
export interface PressView {
  readonly rows: DialogRows;
  readonly press: PressReading;
  /** The reply's own mark, which a press echoes (§Revision R19 c). */
  readonly mark: string;
}

/** The two numbers of a cursor line, or null. */
function cursorOf(line: string): { x: number; y: number } | null {
  const found = /^(\d{1,5})\t(\d{1,5})$/.exec(line.trim());
  if (found === null) return null;
  return { x: Number(found[1]), y: Number(found[2]) };
}

/**
 * Read one session fresh, in the order above. Null when its pane cannot be
 * read at all. The reads stop as soon as the answer is known to be no (the
 * agent does not hold the terminal, or its reader is not idle), so the capture,
 * when taken, is always the last read.
 */
export async function readReply(
  session: Session,
  kind: ReplyKind,
  tmuxId: string,
  deps: ReplyReadDeps
): Promise<ReplyReading | null> {
  const agent = replyAgentOf(session);
  if (agent === null) return null;
  // 1. The pane.
  let pane: PaneFacts | undefined;
  try {
    pane = parsePaneLines(await deps.run(['list-panes', '-t', tmuxId, '-F', PANE_FORMAT])).get(tmuxId);
  } catch {
    return null;
  }
  if (pane === undefined || pane.dead) return null;
  const nothing = { tmuxId, pane, native: null, cursor: null, screen: null };
  // 2. Who holds the terminal, read fresh.
  const proc = await deps.readProc();
  const pid = proc === null ? null : foregroundProgram(proc, pane.panePid);
  const command = pid === null ? null : await deps.readCommand(pid);
  const agentHolds =
    command !== null && commandRunsAgent(command, binaryCandidatesFor(agent), bundledRootsFor(agent));
  if (!agentHolds) return { ...nothing, agentHolds: false };
  // 3. For a message: the agent's own reader, then (Codex) tmux's cursor.
  let native: ActivityVerdict | null = null;
  let cursor: { x: number; y: number } | null = null;
  if (kind === 'say') {
    native = deps.nativeReadingOf(session.id, agent, session.cwd, pane, proc);
    if (native === null || native.state !== 'idle') return { ...nothing, agentHolds, native };
    if (agent === 'codex') {
      try {
        cursor = cursorOf(await deps.run(['display-message', '-p', '-t', pane.paneId, CURSOR_FORMAT]));
      } catch {
        cursor = null;
      }
      if (cursor === null) return { ...nothing, agentHolds, native };
    }
  }
  // 4. LAST: the screen.
  let screen: string | null;
  try {
    screen = await deps.run(
      kind === 'press'
        ? ['capture-pane', '-p', '-t', pane.paneId]
        : ['capture-pane', '-p', '-e', '-t', pane.paneId]
    );
  } catch {
    screen = null;
  }
  return { tmuxId, pane, agentHolds, native, cursor, screen };
}

/**
 * Rows of the screen a press's read-back compares, counted up from the last
 * inked row: the detector's own dialog window (src/main/activity/screen.ts),
 * so a spinner far above a dialog is not read as an answer.
 */
const READ_BACK_WINDOW_ROWS = 24;

/** The last inked rows of a capture, normalized: what a press's read-back compares (D16). */
export function readBackWindowOf(capture: string): string {
  return normalizeCapture(capture).split('\n').slice(-READ_BACK_WINDOW_ROWS).join('\n');
}

/** The choice a reading's rows carry, in the channel's own shape. */
function choiceOf(rows: DialogRows): SessionChoiceInfo {
  return rows.atChoice && rows.options.length > 0
    ? { atChoice: true, options: rows.options }
    : { atChoice: false };
}

/** The monitor's own mark of a reading's choice (`choiceMarkOf`), over its own question. */
export function choiceMarkOfRows(rows: DialogRows): string {
  return choiceMarkOf(choiceOf(rows), rows.question ?? '');
}

/**
 * The mark a press echoes (§5.4.5, §Revision R19 c): the choice mark and the
 * command the phone draws, under one more hash. For Codex it covers the `$`
 * line, because two approvals whose options name the same prefix share a choice
 * mark and differ only there; for Claude, whose command is the hook's and is
 * bound by the question id, it is the choice mark under one more hash.
 */
export function replyMarkOf(rows: DialogRows, command: string | null): string {
  return hashScreen(JSON.stringify([choiceMarkOfRows(rows), command ?? '']));
}

/** A press as one plain capture and one question turn show it, or null when it is no measured shape. */
export function pressViewOf(agent: string, capture: string, turn: QuestionTurn): PressView | null {
  const screen = normalizeCapture(capture);
  const rows = detectDialogRows(screen);
  const press = readPress({ agent, screen, rows, hookAsk: turn.hookAsk, hookBash: turn.hookBash });
  if (press === null) return null;
  return { rows, press, mark: replyMarkOf(rows, press.command) };
}

/** The same options, element for element: each marker and text equal, the same length. */
function sameChoices(read: readonly SessionChoiceOption[], drawn: readonly SessionChoiceOption[]): boolean {
  if (read.length !== drawn.length) return false;
  for (let i = 0; i < read.length; i += 1) {
    if (read[i]?.marker !== drawn[i]?.marker || read[i]?.text !== drawn[i]?.text) return false;
  }
  return true;
}

/** Whether one message may be sent now, over one reading. Idle and only idle (§Revision R15). */
export function canSayOver(agent: 'claude' | 'codex', reading: ReplyReading | null): boolean {
  return (
    reading !== null &&
    reading.agentHolds &&
    reading.native !== null &&
    reading.native.state === 'idle' &&
    reading.screen !== null &&
    promptIsEmpty(agent, reading.screen, reading.cursor)
  );
}

/** What the offer reads with. */
export interface ReplyOfferDeps extends ReplyReadDeps {
  turns: QuestionIds;
  tmuxIdOf(sessionId: string): string | null;
}

/**
 * What the phone may do with one session now, over one fresh reading, bound to
 * what the same door answer draws. Never rejects: anything it cannot read is
 * the empty offer.
 */
export async function replyOffer(
  session: Session,
  drawn: PocketReplyDrawn,
  deps: ReplyOfferDeps
): Promise<PocketReplyOffer> {
  try {
    const agent = replyAgentOf(session);
    const tmuxId = deps.tmuxIdOf(session.id);
    if (agent === null || tmuxId === null) return POCKET_NO_REPLY;
    if (replyGate(session, 'press', tmuxId) === null) {
      const before = deps.turns.current(session.id);
      const reading = await readReply(session, 'press', tmuxId, deps);
      const after = deps.turns.current(session.id);
      if (before.n !== after.n || after.n === 0) return POCKET_NO_REPLY;
      if (reading === null || !reading.agentHolds || reading.screen === null) return POCKET_NO_REPLY;
      const view = pressViewOf(agent, reading.screen, after);
      if (view === null) return POCKET_NO_REPLY;
      // §Revision R1: offered only over the question and options this answer draws.
      if (composeQuestion(after.hookAsk, view.rows.question) !== drawn.question) return POCKET_NO_REPLY;
      if (!sameChoices(view.rows.options, drawn.choices)) return POCKET_NO_REPLY;
      const pressable = pressableOf(view.press);
      if (pressable.length === 0) return POCKET_NO_REPLY;
      return {
        question: after.id,
        mark: view.mark,
        pressable: [...pressable],
        command: view.press.command,
        canSay: false
      };
    }
    if (replyGate(session, 'say', tmuxId) === null) {
      const reading = await readReply(session, 'say', tmuxId, deps);
      return { question: null, mark: null, pressable: [], command: null, canSay: canSayOver(agent, reading) };
    }
    return POCKET_NO_REPLY;
  } catch {
    return POCKET_NO_REPLY;
  }
}
