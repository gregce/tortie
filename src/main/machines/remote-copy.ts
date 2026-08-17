/**
 * Every sentence main prints about a session on another machine (Phase 70, M3).
 *
 * They are in one module for two reasons. The vocabulary audit in the renderer
 * reads one file rather than hunting through the verb implementations, and
 * `build/assert-bundle-refusals.mjs` pins two of them so a later rollup cannot
 * delete a refusal that production reaches rarely.
 *
 * The writing rules apply to every string here. Simple words, complete
 * sentences, no dashes of any kind, a colon only before a list, and no tmux
 * vocabulary at all. A person reading one of these should learn what Tortie did
 * not do and what is still true of their work.
 */

/**
 * Restore, refused for a session that lives on another machine.
 *
 * PINNED as `machine.restore-refused`. It is the sentence that stands between a
 * person and a restore Tortie cannot yet prove, and it is reachable in
 * production through the session menu, so it is watched firing in
 * `GMUX_SMOKE=remote-sessions` rather than assumed to exist.
 */
export const RESTORE_REFUSED =
  'Tortie will not bring back a session that lives on another machine. That ' +
  'is coming in a later release. Nothing was started.';

/**
 * A verb aimed at a session no completed list from that machine reported.
 *
 * PINNED as `machine.remote-target-unbound`. This is the refusal that stops
 * Tortie ending somebody else's work. A remote kill or rename is composed only
 * against an identifier a completed poll of that machine reported, on a row
 * whose stamp equals the session being acted on. With no such row, nothing is
 * sent.
 */
export const TARGET_UNBOUND =
  'Tortie will not send that command, because it has not seen this session in ' +
  'a list from that machine. Acting on a session it cannot account for is how ' +
  'work on somebody else’s machine gets ended. Nothing was sent.';

/**
 * The machine has not been prepared in this run of Tortie.
 *
 * Preparing is where the sign in happens, where the version is read and where
 * the machine's own list of places it looks for programs is captured. A create
 * before that would run the wrong copy of a program, or none at all.
 */
export const MACHINE_NOT_READY =
  'Tortie has not signed in to that machine yet, so it cannot start a session ' +
  'there. Open Settings and then Machines, and prepare it. Nothing was started.';

/** The folder named for the new session is not on that machine. */
export const REMOTE_DIR_MISSING =
  'That machine has no folder at the path you gave, so nothing was started ' +
  'there.';

/** A create that ran and then could not be found again by name. */
export function noRemoteRowFor(name: string): string {
  return (
    `Tortie could not find a session called ${name} on that machine after it ` +
    `created one. Nothing was changed.`
  );
}
