/**
 * Reading the last lines of a session on another machine (Phase 100).
 *
 * The doctrine that binds these sentences is in ./presentation.ts.
 */

import { REMOTE_SESSION_LINES_BYTES_MAX } from '@shared/ipc';
import { formatScrollbackBytes } from '@shared/scrollback';

/**
 * WHAT THIS BLOCK REPLACES. Phase 95 gave both bands above the terminal a quiet
 * note saying that a person could not scroll back, and a tooltip saying that it
 * was not available for a session on another machine yet. Phase 100 makes a
 * person able to read back, so the first half of that pair stayed true and the
 * second half became false. Both constants are deleted and the sentences below
 * take their place. Neither of the two old strings is written out here, because
 * ../app/__tests__/p100-remote-lines.test.tsx reads every file under src and fails
 * on either of them.
 *
 * WHAT IS STILL NOT TRUE, and every sentence here has to keep saying so. There
 * is no scrollbar for a session on another machine and there is not going to
 * be one. Research 57 section 3.1 refused it, because the lane would need verbs
 * Tortie does not send and a wheel notch would cost about 32 times its budget.
 * What a person gets instead is one read at one instant, in a panel, and the
 * panel says on screen that it does not refresh.
 *
 * NO PROSE CROSSES THE CHANNEL. Main answers a mode word and a set of numbers
 * for one read, and this file holds every sentence a person reads about it.
 * That is the shape `machines:searchContent` and `machines:listFiles` already
 * use, and it keeps every sentence about a machine inside the one file the
 * vocabulary audit reads.
 */

/** The strip button, in both bands above a session on another machine. */
export const READ_LAST_LINES_HERE = 'Read last lines';

/** Its tooltip, and the whole reason the button is there. */
export const READ_LAST_LINES_HERE_TITLE =
  'Tortie cannot scroll back through a session on another machine. ' +
  'Open this to read the last lines it printed.';

/** The session menu item, beside the capture items. */
export const READ_LAST_LINES_ITEM = 'Read Last Lines…';

/**
 * The panel title, naming the session it was opened on.
 *
 * The pair below is the pair `SAVED_OUTPUT_TITLE` in ./session-restore.ts
 * already has, and for
 * the same reason. A session can end on that machine while its panel is open,
 * and main's next push drops the row, so the panel is left holding an id and no
 * name. It draws the bare title then rather than a title with a hole in it.
 */
export function readLinesTitle(sessionName: string): string {
  return `Last lines of ${sessionName}`;
}

/** The same title with no session to name. */
export const READ_LINES_TITLE = 'Last lines';

/**
 * The first line under the title, in the read state.
 *
 * `when` is composed by the panel from `savedWhen` in ./session-restore.ts, so
 * the instant reads
 * the same here as it does above saved output, whose words are in
 * ./session-restore.ts. It is always this Mac's own
 * clock at the moment the bytes finished arriving, and never a clock on the
 * other machine.
 */
export function readLinesHeader(label: string, when: string): string {
  return `Tortie read this from ${label} at ${when}.`;
}

/**
 * The second line, and it is why the panel is honest about being a snapshot.
 *
 * A screen of an agent working looks the same whether it was read a second ago
 * or ten minutes ago. Nothing refreshes this panel, so it says so rather than
 * letting a person watch a still picture and wait for it to move.
 */
export const READ_LINES_NOT_LIVE =
  'This panel does not refresh. Read again to see anything printed since.';

/** How much came back. */
export function readLinesCount(lines: number, bytes: number): string {
  return `Tortie brought back ${lines.toLocaleString()} lines and ${formatScrollbackBytes(bytes)}.`;
}

/**
 * Drawn only when Tortie cut the answer.
 *
 * PHASE 99.1 IS WHY THIS EXISTS. Phase 99 carried a cut through main and never
 * drew it, so a list that had been cut was drawn as if it were whole. This
 * sentence is the fix for that shape, and it says which end was dropped so a
 * person knows the newest lines are the ones on screen.
 *
 * IT ALSO HAS TO SURVIVE THE SENTENCE ABOVE IT. {@link readLinesCount} states
 * the size of the text on screen, and that text has had the escape sequences
 * removed, so it is smaller than the bytes the ceiling was applied to. The
 * first build of this phase said the answer was "too large to bring back
 * whole" directly under a line reading "Tortie brought back 8,552 lines and
 * 1.5 MB", against a ceiling of 8.0 MB, which reads as one claim that
 * contradicts itself. So this sentence names the ceiling as a number and says
 * why the count above is the smaller figure. The number comes from
 * {@link REMOTE_SESSION_LINES_BYTES_MAX}, which is the value main cuts at.
 */
export const READ_LINES_CUT =
  `That machine sent back more than the ${formatScrollbackBytes(REMOTE_SESSION_LINES_BYTES_MAX)} ` +
  'Tortie keeps from one read, so the oldest lines were dropped and the ' +
  'newest are shown. The size above is smaller than that because it counts ' +
  'the plain text that was left once the codes a terminal uses to colour and ' +
  'redraw were taken out.';

/**
 * Drawn only when the session has kept less than was asked for.
 *
 * It is a DIFFERENT fact from the cut above and the two are never both on
 * screen. This one means the session itself has nothing older, because the read
 * clamps to the start of what that session has kept.
 */
export const READ_LINES_ALL_THERE = 'That is everything this session has kept.';

/** While the one read is in flight. */
export function readLinesReading(label: string): string {
  return `Tortie is reading this session on ${label}.`;
}

/** The session answered and had printed nothing. */
export const READ_LINES_EMPTY = 'This session has printed nothing.';

/** The label of the depth group, and the colon introduces the list. */
export const READ_LINES_DEPTH_LABEL = 'How far back to read:';

/** The shallowest of the four depths, being what is on screen right now. */
export const READ_LINES_DEPTH_SCREEN = 'The screen';

/** The other three depths, each named by its own number. */
export function readLinesDepthLabel(lines: number): string {
  return `${lines.toLocaleString()} lines`;
}

/** Tortie is not signed in to that machine right now. */
export function readLinesNotConnected(label: string): string {
  return `Tortie is not connected to ${label}, so it read nothing.`;
}

/** The machine did not answer. */
export function readLinesUnreachable(label: string): string {
  return `${label} did not answer, so there are no lines to show.`;
}

/** Tortie holds no row for this session on a machine any more. */
export const READ_LINES_NO_SESSION =
  'This session is not running on that machine any more, so there is nothing ' +
  'to read.';

/** An older preload has no way to read a session on another machine. */
export const READ_LINES_NO_BRIDGE =
  'This build cannot read a session on another machine.';

/**
 * The call was made and it was rejected.
 *
 * IT IS A DIFFERENT FACT FROM {@link READ_LINES_NO_BRIDGE} and the first build
 * of this phase drew that one for both. A build that has the bridge and whose
 * call failed was told it could not do this at all, which is untrue. The toast
 * carries the error itself and it is gone by the time a person reads the
 * panel, so this sentence says what happened and what to do about it.
 */
export const READ_LINES_FAILED =
  'Tortie could not finish reading this session. Read it again to try once ' +
  'more.';
