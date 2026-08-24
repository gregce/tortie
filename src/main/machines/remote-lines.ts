/**
 * The last lines one session on another machine printed (Phase 100).
 *
 * ## What it is for
 *
 * A person can see a session running on another machine, and until this phase
 * they could not read a word of it above the current screen. Phase 95 drew a
 * sentence saying so. This module answers instead. A person opens one panel and
 * reads the last lines that session printed, at one of four depths.
 *
 * ## The rule that decides the design
 *
 * IT IS NOT A SCROLLBAR, and research 57 section 3.1 refused one twice over.
 *
 *  - Over the exec plane a scrollbar needs the tmux verb that puts a pane into
 *    its own scroll buffer, which is on no row of the verb ledger, and an open
 *    family of scrolling commands with numeric arguments through the one door
 *    Phase 89 narrowed to a fixed five element argv that types literal text and
 *    refuses every control character.
 *  - Over the control connection it would be the first interactive write on
 *    carriage 6, which is the one carriage with no gate.
 *  - The speed does not reach either way. Pulling 25,000 lines was measured at
 *    about 0.51 s composed, which is fine for a menu item and 32 times too slow
 *    for a wheel notch against the 16 ms budget in `WHEEL_COALESCE_MS`.
 *
 * THE TWO REFUSED VERBS ARE NOT SPELLED ANYWHERE IN THIS FILE, and that is
 * deliberate rather than coy. Condition 54 of `build/conformance-machines.mjs`
 * reads this file's own source text and fails when either name appears in it,
 * comment or code, so the refusal is executable rather than written down.
 * Research 57 section 3.1 and `REMOTE_VERB_LEDGER` in `./exec-plane.ts` name
 * them, and those are the two places to read.
 *
 * ## The one cost this phase prices, stated rather than hidden
 *
 * {@link remoteCaptureArgs} hardcodes `-J`, which joins a line the pane wrapped.
 * `CapturePaneOptions` in `../tmux/sessions.ts` records that `-J` is wrong for
 * reproducing on-screen wrapping and cites research 17 section 2.1.
 *
 * THIS PHASE KEEPS `-J` AND WRITES THE DIFFERENCE DOWN. A long line the agent
 * printed reads here as one line, even though the pane over there broke it
 * across several rows. No second argv composer is written, for three reasons and
 * the third decides it. The flags are then the same flags in the same order as
 * `capturePane` on this Mac, so a local read and a remote read are the same
 * bytes read the same way. The local sibling item of this feature, being
 * "Capture Last 250 Lines", joins as well. And a second composer is a second
 * thing to keep in step, which is how two copies of one command drift apart.
 *
 * ## What it writes, on either computer
 *
 * NOTHING. It does not go through `storeCapsuleText` and it makes no snapshot
 * generation, because it is a live read a person asked for rather than the
 * background copy `./remote-capsule.ts` keeps. The one thing it borrows from
 * that side of the product is `stripControls`, imported as one word so this
 * file holds no second copy of that regular expression.
 *
 * ## It never throws
 *
 * A session Tortie holds no row for, a machine Tortie is not signed in to and a
 * machine that did not answer are three ordinary states. Each comes back as a
 * result carrying its own mode word, and the renderer draws the sentence from
 * `src/renderer/machines/read-lines.ts`. No prose crosses this boundary.
 *
 * ## What is not measured
 *
 * Every second in research 57 section 3.2 came from the operator's Mac Pro over
 * a Tailscale path with a 6 ms ping. No slow link has been measured. No Linux
 * machine has been measured either, so a foreign tmux is reasoned about from
 * tmux's own documented behaviour rather than timed.
 */

import {
  REMOTE_SESSION_LINES_BYTES_MAX,
  REMOTE_SESSION_LINES_MAX,
  type MachineSessionLinesInput,
  type MachineSessionLinesMode,
  type MachineSessionLinesResult
} from '@shared/ipc';
import { stripAnsi } from '../ansi';
// ONE WORD, and it is the only thing this module takes from the saved output
// side. A read here writes no capsule, makes no generation and touches no ring.
import { stripControls } from '../restore/snapshots';
import type { RemoteMachineContext } from './context';
import { execOn } from './exec-plane';
// The composer the background copy already uses, reused unchanged. See the
// header for the `-J` ruling.
import { remoteCaptureArgs } from './remote-capsule';
import { machineIsConnected } from './remote-run';
import { readyRemoteContext, remoteSessionRow } from './remote-sessions';
import { machineLabelOf, machineRow } from './store';

/**
 * How long one read gets on the machine. 30,000 ms.
 *
 * A DEADLINE AND NOT AN EXPECTATION. It is the same number
 * `REMOTE_FILE_LIST_TIMEOUT_MS` and `REMOTE_SEARCH_TIMEOUT_MS` carry, for the
 * same reason: a machine that went to sleep mid answer must not hold a call
 * open forever. Research 57 section 3.2 measured the deepest read this module
 * offers at about 0.51 s composed.
 */
export const REMOTE_SESSION_LINES_TIMEOUT_MS = 30_000;

/**
 * The depth one read may ask for, after the clamp. PURE.
 *
 * A number below zero is the screen alone, a number above the ceiling is the
 * ceiling, and a fraction is truncated. A number that is not finite is the
 * screen alone too: neither value can come from the panel, which sends one of
 * four constants, and a number nobody can explain must not turn into the
 * deepest command this module sends.
 *
 * `capture-pane -S -N` clamps to the start of that pane's history on the far
 * side as well, so a session holding less than this asks for answers with what
 * it has and says nothing about it. The panel is what turns "fewer lines than
 * asked for" into a sentence.
 */
export function clampSessionLineDepth(lines: number): number {
  if (!Number.isFinite(lines)) return 0;
  return Math.max(0, Math.min(Math.trunc(lines), REMOTE_SESSION_LINES_MAX));
}

/**
 * The bytes that survive the ceiling, and whether anything was dropped. PURE.
 *
 * THE NEWEST BYTES ARE THE ONES KEPT. A person opening this panel is reading
 * what the agent just said, so an answer over the ceiling loses its oldest end
 * rather than its newest.
 *
 * Everything up to and including the first newline of what is left is dropped
 * as well, so the panel never opens on half a line and never opens on half an
 * escape sequence. A body with no newline at all after the cut is kept whole,
 * because dropping it would leave nothing to read.
 */
export function cutToCeiling(
  text: string,
  ceiling: number = REMOTE_SESSION_LINES_BYTES_MAX
): { text: string; truncated: boolean } {
  const buffer = Buffer.from(text, 'utf8');
  if (buffer.byteLength <= ceiling) return { text, truncated: false };
  const kept = buffer.subarray(buffer.byteLength - ceiling).toString('utf8');
  const firstBreak = kept.indexOf('\n');
  return {
    text: firstBreak < 0 ? kept : kept.slice(firstBreak + 1),
    truncated: true
  };
}

/**
 * How many lines one body holds. PURE.
 *
 * An empty body is zero lines. A body ending in a newline holds one line per
 * newline. A final line with no newline after it counts as one, because it is a
 * line a person reads.
 */
export function countLines(text: string): number {
  if (text.length === 0) return 0;
  const breaks = text.split('\n').length - 1;
  return text.endsWith('\n') ? breaks : breaks + 1;
}

/** The label this machine's row carries, or its id when there is no row. */
function labelOf(machineId: string): string {
  const row = machineRow(machineId);
  return row === null ? machineId : machineLabelOf(row);
}

/** Everything but the body, for the three answers that carry none. */
function emptyResult(
  sessionId: string,
  machineId: string | null,
  mode: MachineSessionLinesMode,
  asked: number,
  startedAt: number
): MachineSessionLinesResult {
  return {
    sessionId,
    machineId,
    machineLabel: machineId === null ? null : labelOf(machineId),
    mode,
    text: '',
    asked,
    lines: 0,
    bytes: 0,
    truncated: false,
    readAt: Date.now(),
    elapsedMs: Date.now() - startedAt
  };
}

/**
 * Read the last lines one session on one machine printed.
 *
 * The order of the refusals is the design, and every one of them sends nothing.
 *
 *  1. No row for this session on any machine is `noSession`.
 *  2. A machine Tortie is not signed in to is `notConnected`.
 *  3. A context that cannot be made ready is `notConnected` as well, because it
 *     is the same fact read a second way.
 *  4. A machine that did not answer is `unreachable`.
 *
 * @returns a result carrying `read` and the body, or one of the three refusals.
 *   It never throws.
 */
export async function readSessionLinesOnMachine(
  input: MachineSessionLinesInput
): Promise<MachineSessionLinesResult> {
  const startedAt = Date.now();
  const asked = clampSessionLineDepth(input.lines);
  const row = remoteSessionRow(input.sessionId);
  if (row === null) {
    return emptyResult(input.sessionId, null, 'noSession', asked, startedAt);
  }
  const machineId = row.machineId;
  if (!machineIsConnected(machineId)) {
    return emptyResult(
      input.sessionId,
      machineId,
      'notConnected',
      asked,
      startedAt
    );
  }
  let ctx: RemoteMachineContext;
  try {
    ctx = readyRemoteContext(machineId);
  } catch {
    return emptyResult(
      input.sessionId,
      machineId,
      'notConnected',
      asked,
      startedAt
    );
  }
  let raw: string;
  try {
    raw = await execOn(ctx, remoteCaptureArgs(row.tmuxId, asked), {
      timeoutMs: REMOTE_SESSION_LINES_TIMEOUT_MS
    });
  } catch {
    return emptyResult(
      input.sessionId,
      machineId,
      'unreachable',
      asked,
      startedAt
    );
  }
  // Read before anything is stripped, so `readAt` is when the bytes arrived
  // rather than when this function finished with them.
  const arrivedAt = Date.now();
  // The cut comes FIRST, so the ceiling bounds the work the two strippers do on
  // a runaway answer rather than the other way round.
  const cut = cutToCeiling(raw);
  // The panel is not a terminal, so the colour and the single control bytes come
  // out here. `stripAnsi` removes escape SEQUENCES and `stripControls` removes
  // what a program can print on its own, e.g. a bell.
  const text = stripControls(stripAnsi(cut.text));
  return {
    sessionId: input.sessionId,
    machineId,
    machineLabel: labelOf(machineId),
    mode: 'read',
    text,
    asked,
    // Both numbers describe the FINAL text, after the cut and after both
    // strippers, because that is the text on screen and a count of anything
    // else would describe a body nobody can see.
    //
    // THE PANEL PAYS FOR THAT CHOICE IN WORDS. `bytes` is therefore smaller
    // than the ceiling the cut was applied to, and a cut answer of 1.5 MB
    // under an 8,388,608 byte ceiling reads as a contradiction unless the
    // sentence says why. `READ_LINES_CUT` in
    // `src/renderer/machines/read-lines.ts` names the ceiling and says that the
    // size above it counts the text that was left. Changing either number here
    // means reading that sentence again.
    lines: countLines(text),
    bytes: Buffer.byteLength(text, 'utf8'),
    truncated: cut.truncated,
    readAt: arrivedAt,
    elapsedMs: Date.now() - startedAt
  };
}
