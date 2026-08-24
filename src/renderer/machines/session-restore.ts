/**
 * What Tortie says when it offers to start a session again on another machine,
 * and what it says about the copy of that session's output it kept here.
 *
 * Three headings share this file because Phase 72 and Phase 73 wrote them for
 * one subject, which is a session that is not running and the record Tortie
 * still holds of it. The doctrine that binds them is in ./presentation.ts.
 */

/**
 * What Restore does for a session on another machine, said before the click.
 *
 * PHASE 72 replaced `RESTORE_COMING` with this. That sentence said bringing a
 * session back on another machine was coming in a later release, and this is
 * that release, so the sentence became false and was deleted rather than
 * reworded.
 *
 * Three claims, in the order a person needs them. What comes back: the session,
 * on that machine, in the same folder. What stays here: the output Tortie
 * saved, which is not put back on the other machine. What happens to the
 * conversation, which has two answers as of Phase 89.
 *
 * PHASE 89 REWROTE THE THIRD CLAIM. It said flatly that the conversation does
 * not come back, and that is no longer true for every row. A remote restore now
 * starts that machine's own shell and types the command that continues the
 * conversation into it, for a row two answers prove, being the arming gate and
 * the composer in main. THIS FILE CANNOT KNOW WHICH ROW THAT IS. Both answers
 * are read at restore time, one of them against the machine itself. So the
 * sentence gives both outcomes and names the thing that decides between them,
 * which is whether Tortie recorded the conversation.
 *
 * It also stopped saying "running the same program", because a row that arms
 * comes back running the machine's own shell with the command waiting in it.
 */
export function restoreRemoteBody(label: string): string {
  return (
    `Restoring starts this session again on ${label}, in the same folder. The ` +
    `output Tortie saved is kept on this Mac and is not put back on ${label}. ` +
    `When Tortie recorded this conversation it types the command that ` +
    `continues it into the session and you press Enter, and otherwise the ` +
    `session comes back running the same program with no conversation.`
  );
}

/**
 * The body when Restore is NOT offered and main gave no sentence of its own.
 *
 * Main sends one sentence naming the condition that failed, and `restoreReason`
 * carries it. This is what is drawn if that field is ever null while the verb
 * is refused, which the projection should never produce. It states the general
 * rule rather than guessing at which condition failed, so it is true in every
 * case it can be reached in.
 */
export function restoreNotOfferedBody(label: string): string {
  return (
    `Tortie is not bringing this session back right now. It has to be able to ` +
    `see ${label}, and it has to check that the session is not already ` +
    `running there. Nothing was started.`
  );
}

/**
 * Drawn under the ended block for a remote row that has saved output here.
 *
 * The output is on this Mac and the restore does not put it back, so a person
 * needs to be told where it went. The menu item it names is
 * {@link SAVED_OUTPUT_ITEM}.
 */
export const RESTORE_KEPT_HERE =
  "Tortie kept a copy of this session's output on this Mac. Open it from the " +
  'session menu.';

// ---------------------------------------------------------------------------
// The saved output panel (Phase 72)
// ---------------------------------------------------------------------------

/** The session menu item that opens the panel. */
export const SAVED_OUTPUT_ITEM = 'Show saved output…';

/** The panel's own title. */
export const SAVED_OUTPUT_TITLE = 'Saved output';

/** Under the menu item, and in the panel, when there is nothing to show. */
export const SAVED_OUTPUT_NONE = 'Tortie has no saved output for this session.';

/** While the read is in flight. It is one file read and it is usually a blink. */
export const SAVED_OUTPUT_LOADING = 'Reading the saved copy…';

/** Month names in full, because "17 Aug" reads as an abbreviation of nothing. */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

/**
 * One instant, in this Mac's own local time, as "17 August 2026 at 14:32".
 *
 * ONE helper, so every surface says it the same way. The instant is always this
 * Mac's clock at the moment the copy finished arriving, never a clock on the
 * other machine, which is what makes it safe to read against the reader's own
 * watch.
 */
export function savedWhen(at: number): string {
  const d = new Date(at);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return (
    `${String(d.getDate())} ${MONTHS[d.getMonth()] ?? ''} ` +
    `${String(d.getFullYear())} at ${hours}:${minutes}`
  );
}

/** The clause both headers end with. */
const KEPT_HERE_TAIL = 'This is a copy Tortie kept on this Mac. It is not live.';

/**
 * The line above the saved output, for a session on another machine.
 *
 * The capture time is on screen every time, and it is the reason the line
 * exists. Saved output looks exactly like live output, so without the time a
 * person reads an hours old screen as the current one.
 *
 * `at` is 0 for a copy written before Tortie recorded capture times. That case
 * says so in a sentence of its own rather than drawing a date from nowhere.
 */
export function savedOutputHeader(label: string, at: number): string {
  if (at <= 0) {
    return `Saved from ${label}. Tortie did not record when this copy was taken. ${KEPT_HERE_TAIL}`;
  }
  return `Saved from ${label} on ${savedWhen(at)}. ${KEPT_HERE_TAIL}`;
}

/** The same line for a session on this Mac, which names no machine. */
export function savedOutputHeaderLocal(at: number): string {
  if (at <= 0) {
    return `Saved. Tortie did not record when this copy was taken. ${KEPT_HERE_TAIL}`;
  }
  return `Saved on ${savedWhen(at)}. ${KEPT_HERE_TAIL}`;
}

/**
 * Under the header when the bytes did not match what was recorded for them.
 *
 * The panel still shows them, because unproven text a person can read is worth
 * more than an empty panel, and it says what it is showing.
 */
export const SAVED_OUTPUT_UNVERIFIED =
  'Tortie could not check these bytes against what it recorded for them, so ' +
  'this copy may be incomplete.';

/**
 * The sentence under `Show what it loaded…` for a session on another machine.
 *
 * The launch snapshot is written on this Mac at create time and there is none
 * for a session created on another machine, so the verb is offered disabled
 * with the reason rather than removed. A verb that vanishes teaches nothing.
 */
export const NO_SNAPSHOT =
  'Tortie has no record of what this session loaded, because that record is ' +
  'only kept for sessions on this Mac.';

// ---------------------------------------------------------------------------
// The conversation copy (Phase 73, M6, item 5)
// ---------------------------------------------------------------------------

/**
 * The line under the saved output header, for the conversation copy.
 *
 * THE PROMISE IS LAST SYNC STALENESS AND NOTHING ELSE. Tortie never says a
 * conversation is current. It says when it last copied one, and the person
 * judges. A machine that has been unreachable for a day carries the same number
 * it carried a day ago, so the sentence a person reads gets older rather than
 * being refreshed. That is the same shape the header above it already uses for
 * a captured screen, which is why this line sits under that one.
 *
 * `at` is null or absent when there has never been a copy, and that case says
 * so in a sentence of its own rather than drawing a date from nowhere.
 */
export function conversationCopyLine(at: number | null | undefined): string {
  if (at === null || at === undefined) {
    return (
      'Tortie has no copy of this conversation. It copies a conversation only ' +
      'while it is connected to the machine, and it has not done so for this ' +
      'session.'
    );
  }
  return (
    `Tortie last copied this conversation on ${savedWhen(at)}. Anything the ` +
    `agent has said since then is on that machine and not on this Mac.`
  );
}
