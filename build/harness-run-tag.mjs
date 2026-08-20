/**
 * Naming and refusal rules for the scratch tmux servers the harnesses use
 * (Phase 114).
 *
 * This module is pure on purpose. Importing it runs nothing, reads no
 * command line, and spawns no process. It exists because
 * `build/harness-socket.mjs` runs its harness on import, so the phase that
 * wanted to share these rules with a second script had to move them into a
 * module of their own first. That is exactly what the old header of
 * `harness-socket.mjs` said a later phase must do, and Phase 114 is that
 * phase. Both `harness-socket.mjs` and `smoke-standalone.mjs` import from
 * here, so the two scripts can never drift apart on a name or a message.
 */

import { basename } from 'node:path';

/** The operator's live server. Never reachable from any harness. */
const REAL_SOCKET = 'gmux';
/** The user's own tmux server. Tortie never touches it. */
const USER_SOCKET = 'default';

/**
 * The longest composed socket name a harness will use. tmux puts the socket
 * at `${TMUX_TMPDIR:-/tmp}/tmux-<uid>/<name>`, which is 14 bytes of prefix on
 * this Mac, so 64 leaves the path at 78 bytes against a system limit of 104.
 */
export const MAX_SOCKET_NAME = 64;

/**
 * The slug that makes a name this directory's own.
 *
 * It is the current directory's own name, so a worktree at
 * `/tmp/.../wt-p112` gives `wt-p112` and a CI checkout gives the repository
 * name. It is lowercased, every character outside a to z and 0 to 9 becomes a
 * dash, runs of dashes collapse to one, leading and trailing dashes go, and
 * the result is cut to 12 characters with no trailing dash. When nothing is
 * left the word `run` is used.
 */
export function dirSlug() {
  const cut = basename(process.cwd())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12)
    .replace(/-+$/, '');
  return cut === '' ? 'run' : cut;
}

/**
 * The part of a socket name that makes it this run's own: the directory slug
 * above plus the process id of the calling script.
 */
export function harnessRunTag() {
  return `${dirSlug()}-${process.pid}`;
}

/**
 * The exact refusal message for a socket name, or null when the name is
 * acceptable. The three checks run in this order: the name `gmux` is the
 * operator's real server, the name `default` is the user's own tmux, and
 * anything else must look like `gmux-<something>`. Callers print the message
 * under their own prefix and exit 2, so both scripts refuse with one voice.
 */
export function refuseReason(name) {
  if (name === REAL_SOCKET) {
    return `refusing to run a harness on "${name}", the real server`;
  }
  if (name === USER_SOCKET) {
    return `refusing to run a harness on "${name}", the user's own tmux`;
  }
  if (!/^gmux-[A-Za-z0-9._-]+$/.test(name)) {
    return `"${name}" is not a harness socket name; use gmux-<something>`;
  }
  return null;
}
