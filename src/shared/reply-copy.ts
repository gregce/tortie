/**
 * THE MAC'S WORDS FOR A PRESS AND A MESSAGE FROM THE PHONE (Phase 318,
 * build/p318/SPEC.md §5.1.6, D19, D20).
 *
 * Main composes every sentence a reply answers, and the phone draws it
 * verbatim, so each one lives here once, a named constant with the reason it
 * exists above it. The door's own sentences (`busy`, `unreadable`, `stopped`)
 * are `POCKET_WRITE_SENTENCES` in ./ipc/pocket.ts; the End words a reply reuses
 * for a session that went or changed are ./lifecycle-words.ts's.
 *
 * It imports nothing, so main, the gates and the copy-drift reader can all read
 * it. No sentence names a tmux word (CLAUDE.md's UI rules), and
 * src/shared/__tests__/p318-reply-copy.test.ts holds that.
 */

/** The Mac's own words for a choice the phone may not press: CHOICE_NOT_PRESSABLE (src/renderer/choice.ts:57), held equal by a test. */
export const REPLY_ANSWER_IN_SESSION = 'Answer this in the session.';

/**
 * A press was typed and, 300 ms later, the same window was drawn and no hook had come. It does NOT say
 * "nothing was changed": an identical next question can be drawn in the same window (research 135 §2.6),
 * so all Tortie knows is what this says.
 */
export const REPLY_NOT_TAKEN = 'Your answer was typed and the question is still there.';

/** A press was typed and the screen could not be read after it. */
export const REPLY_TYPED_UNREAD = 'Your answer was typed, and Tortie could not read the session after it.';

/** tmux refused the press or the message. */
export const REPLY_FAILED = 'Tortie could not type into this session.';

/** Not at its own empty prompt, asking something, something already typed there, or not an agent Tortie sends to. */
export const REPLY_NOT_READY = 'This session is not ready for a message. Nothing was sent.';

/** A message with no characters in it. */
export const REPLY_TEXT_EMPTY = 'There is no message to send.';

/** A message over 4,096 bytes of UTF-8 (`REPLY_TEXT_MAX_BYTES`, src/main/reply/text-rules.ts). */
export const REPLY_TEXT_LONG = 'That message is too long to send. Nothing was sent.';

/** A message holding ESC, a control character other than a line break, DEL, a C1 control or half of a pair. */
export const REPLY_TEXT_CHARACTER = 'That message holds a character Tortie does not send. Nothing was sent.';
