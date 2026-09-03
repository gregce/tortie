/**
 * The two file operations this domain is allowed to use, and why they are not
 * the ordinary ones (Phase 204, fix round).
 *
 * ## THE DEFECT THIS EXISTS FOR, re-derived rather than described
 *
 * Every write in this domain stages beside the real place and then renames the
 * staged copy onto it. The staged place is a NAME NOBODY HAS OPENED YET, being
 * `<store>.tortie-pending` inside a login directory, `<slot>.cred.writing`
 * inside Tortie's own kept directory, and `.kept.<pid>.tmp` beside the record
 * file. `writeFile` follows a symbolic link, so an entry planted at one of
 * those names sends the whole write somewhere else, and the check that follows
 * it reads back through the SAME link and sees exactly what it just wrote, so
 * it passes. The commit then renames the link itself onto the store.
 *
 * Driven against the shipping modules over real files, a link planted at
 * `<login dir>/auth.json.tortie-pending` and pointed at a file standing in for
 * the person's own `~/.codex/auth.json` took the kept credential byte for byte,
 * the write answered ok, and the login's own store became a link to it. That is
 * the refusal this phase states in four places, that the person's own store is
 * never written, defeated by one planted entry.
 *
 * ## WHY IT IS THIS DOMAIN'S PROBLEM AND NOT THE FILE SYSTEM'S
 *
 * `../logins/dirs.ts` already guards the login DIRECTORY against exactly this
 * planted link, at length, because the Phase 202 verifier found one in the
 * running app. This phase put a file write INSIDE that guarded directory and
 * did not extend the guard to the file. The threat model was already the
 * project's own.
 *
 * ## THE SHAPE, and both halves are load bearing
 *
 * Remove first, then create EXCLUSIVELY. `unlink` acts on the link and never
 * on what it points at, so a planted entry is removed rather than followed.
 * `O_EXCL` refuses a path that exists, and a symbolic link counts as existing
 * even when its target does not, so an entry re-planted in the window between
 * the two fails the write instead of being followed. The mode is set on the
 * open file descriptor rather than on the path, so the umask cannot widen it
 * and no second name is resolved.
 *
 * The rename is asked the same question with `lstat`, which reports on the
 * link and never on what it points at, so a link planted after the write
 * cannot be renamed onto a store.
 *
 * NOTHING HERE LOGS, and no refusal names the bytes it was handed.
 */

import {
  closeSync,
  constants,
  fchmodSync,
  lstatSync,
  openSync,
  renameSync,
  unlinkSync,
  writeSync
} from 'node:fs';

/** The mode every file this domain writes carries. */
export const CREDENTIAL_FILE_MODE = 0o600;

/**
 * Write `text` to `path`, refusing to follow a link that is there.
 *
 * It is only ever used for a STAGED place, being a name this domain composes
 * and then renames away, so removing whatever is there is right: there is
 * nothing at that name a person or a vendor put.
 */
export function writeNoFollowSync(
  path: string,
  text: string,
  mode: number = CREDENTIAL_FILE_MODE
): void {
  try {
    unlinkSync(path);
  } catch {
    // Nothing was there, or what was there is not something this process may
    // remove. Either way the exclusive create below is what decides.
  }
  const fd = openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
    mode
  );
  try {
    // The mode on the DESCRIPTOR, so the umask cannot widen it and no second
    // path is resolved to set it.
    fchmodSync(fd, mode);
    writeSync(fd, text, null, 'utf8');
  } finally {
    closeSync(fd);
  }
}

/**
 * Rename `from` onto `to`, refusing when `from` is a link.
 *
 * `rename` moves the LINK rather than what it points at, so without this a
 * link planted between the write and the commit becomes the store itself.
 */
export function renameNoFollowSync(from: string, to: string): void {
  if (lstatSync(from).isSymbolicLink()) {
    throw new Error('the staged place is not a file Tortie wrote');
  }
  renameSync(from, to);
}
