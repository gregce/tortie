/**
 * What Tortie stamps on a session it created on another machine, and the two
 * pure helpers that compose a stamp.
 *
 * MOVED HERE IN PHASE 123, from `./remote-sessions.ts`, with no change to any
 * value. `./pane-env-rescue.ts` needed these three things and nothing else from
 * that file, and `./remote-sessions.ts` imports `./pane-env-rescue.ts`, so the
 * pair was a runtime cycle. Nothing in this module imports anything, so it can
 * be read by both sides.
 *
 * THE FOUR NAMES AND THEIR ORDER ARE LOAD BEARING. `remoteCreate` writes the
 * stamps in the order {@link REMOTE_STAMPS} declares them, and a session that
 * carries neither `@gmux-id` nor the `GMUX_SESSION_ID` pane stamp is not
 * Tortie's. `./remote-sessions.ts` re-exports all three names, so every existing
 * caller is unchanged.
 */

/** The four options Tortie stamps on a session it created on a machine. */
export const REMOTE_STAMPS = [
  '@gmux-id',
  '@gmux-agent',
  '@gmux-name',
  '@gmux-project'
] as const;

/**
 * One value, with every tab and newline replaced by a single space.
 *
 * Applied to the display name and the project path before either is stamped on
 * the far side. A newline would end the line the poll reads, and a tab comes
 * back as an underscore from a client with no UTF-8 locale, which is measured in
 * the header of `REMOTE_LIST_FORMAT` in `./remote-sessions.ts`. So the value
 * Tortie writes is the value Tortie reads back. A display name with a tab in it
 * is something a paste can produce, and it is worth one space rather than a
 * value that changes on the way home.
 */
export function oneLine(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ');
}

/** One stamp, aimed at an immutable identifier. Pure. */
export function remoteStampArgs(
  tmuxId: string,
  option: string,
  value: string
): string[] {
  return ['set-option', '-t', tmuxId, option, value];
}
