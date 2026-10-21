/**
 * THE MAC'S WORDS FOR A SESSION'S SCREEN AND ITS KEYS ON THE PHONE (Phase 337,
 * build/p337/SPEC.md §5.4, D13, D21), and for a page of its history (Phase
 * 337.1, build/p3371/SPEC.md D23).
 *
 * The phone calls the feature Terminal (his ruling of 2026-10-05, "lets do
 * B"), so every sentence that names it says terminal; the store text still
 * says "the session's screen", which is not a sentence here.
 *
 * Main composes every sentence a screen answer or a keys write carries, and the
 * phone draws it verbatim, so each one lives here once, a named constant with
 * the reason it exists above it. A keys act that fails says
 * `REPLY_FAILED` (./reply-copy.ts), which is true whether or not some keys
 * landed; a session that went or changed says ./lifecycle-words.ts's words; the
 * door's own refusals are `POCKET_WRITE_SENTENCES` in ./ipc/pocket.ts.
 *
 * It imports nothing, so main, the gates and the copy-drift reader can all read
 * it. No sentence names a tmux word (CLAUDE.md's UI rules), and
 * src/shared/__tests__/screen-copy.test.ts holds that.
 */

/** Keys sent while a question is drawn, against a screen whose question id or window has moved since (D21). */
export const SCREEN_QUESTION_MOVED = 'The question on this session changed since your terminal was drawn. Nothing was typed.';

/** Not running, unknown, or on a machine with no live connection now. */
export const SCREEN_NOT_TYPABLE = 'This session cannot take keys now. Nothing was typed.';

/** A text item holding a control character, DEL or a lone surrogate. */
export const SCREEN_KEY_CHARACTER = 'That holds a character Tortie does not send. Nothing was typed.';

/** `why: 'ended'`: the session is not running, so there is no terminal to read (a page of its history says the same). */
export const SCREEN_ENDED = 'This session is not running, so it has no terminal.';

/** `why: 'unreachable'`: a session on another machine with no live connection, or no reading by the hold's end. */
export const SCREEN_UNREACHABLE = 'Tortie cannot reach this session’s machine now.';

/** `why: 'large'`: over a cap of D15 (columns, rows, styles, runs or the answer's bytes). */
export const SCREEN_TOO_LARGE = 'This terminal is too large to show on your phone.';

/**
 * A page's `why: 'moved'` (Phase 337.1 D12): the history the phone was paging
 * is not the one it numbered any more (trimmed at its limit, cleared, rewrapped
 * to another width, or covered by a full-screen program). The phone draws the
 * same words when its own check refuses a page (D13).
 */
export const SCROLLBACK_MOVED = 'Earlier lines changed on your Mac. Go back to the live terminal to read them again.';

/**
 * A page's `why: 'busy'` (Phase 337.1 D9, D14, §Attack B14): no read agreed and
 * covered in three attempts, or more pages already waited on this session than
 * the Mac holds. True of both, which "printing too fast" was not.
 */
export const SCROLLBACK_BUSY = 'Tortie could not read this session’s earlier lines just now.';

/**
 * THE PASTE'S OWN WORDS (Phase 348, build/p348/SPEC.md §5.1, D50, D51). A
 * paste that breaks a text rule is refused whole with nothing typed, each rule
 * with its own sentence; a paste the gate refuses for its machine says why;
 * and an act that failed says `PASTE_FAILED`, which is true whether or not
 * part of it landed. The paste's other refusals are the keys verb's own words
 * above and ./lifecycle-words.ts's, unchanged.
 */

/** `empty`: the text has no characters. */
export const PASTE_EMPTY = 'There is nothing to paste.';

/** `long`: more than `POCKET_PASTE_MAX_TEXT_BYTES` bytes of UTF-8 (./ipc/pocket.ts). */
export const PASTE_TOO_LONG = 'That is too long to paste. Nothing was pasted.';

/** `character`: ESC, CR or any other control character but a line feed and a tab, DEL, a C1 control, or half of a surrogate pair. */
export const PASTE_CHARACTER = 'That holds a character Tortie does not paste. Nothing was pasted.';

/** `machine`: the session runs on another machine, where this phase pastes nothing (D22). */
export const PASTE_THIS_MAC_ONLY = 'Tortie pastes only into sessions on this Mac. Nothing was pasted.';

/** `failed`: the paste was asked for and is not known to have landed. */
export const PASTE_FAILED = 'Tortie could not paste into this session.';
