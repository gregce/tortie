/**
 * Where a login's directory is, and the one function that decides whether a
 * directory is one Tortie owns (Phase 202).
 *
 * ```
 * <userData>/gmux/logins/
 *   logins.json           the store: names, ids and which one is chosen
 *   claude/<id>/          one directory per added claude login
 *   codex/<id>/           one directory per added codex login
 * ```
 *
 * IT IS INSIDE `gmux/` for the reason `config/` is: that inner directory name
 * is one of the identifiers live data is bound to, so it stays `gmux` and is
 * never "finished off" by a later rename. CLAUDE.md carries the list.
 *
 * THE DEFAULT LOGIN HAS NO PATH IN THIS MODULE AT ALL, and that is the whole
 * design of the ownership rule. `~/.claude`, the `Claude Code-credentials`
 * keychain item and `~/.codex` are the person's own; they are never a write
 * target, never a delete target, and no function here can name one. Every
 * path this file produces is rooted at the logins root it is handed, and a
 * directory that is not strictly inside it is refused by
 * {@link isOwnedLoginDir} before any create or remove is attempted.
 *
 * NOTHING HERE IMPORTS ELECTRON, on purpose: `npm run conformance:logins`
 * runs these functions under plain node, so the gate judges the shipping rule
 * rather than a copy of it. `./paths.ts` is the one file that knows where
 * userData is.
 */

import { lstatSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import type { LoginProviderId } from '@shared/logins';

/**
 * An id is a directory NAME and it is minted by Tortie, never typed.
 *
 * Sixteen lowercase hex characters. The shape is checked on the way OUT of
 * the store file as well as on the way in, because that file is one an agent
 * with write access to the home directory could edit, and a row whose id
 * carried a separator or a `..` would otherwise compose a path outside the
 * root. A row that fails this is dropped WHOLE with the field named.
 */
export const LOGIN_ID_RE = /^[0-9a-f]{16}$/;

/** `<root>/logins.json`, the store file. */
export function loginsFileIn(root: string): string {
  return join(root, 'logins.json');
}

/** `<root>/<provider>`, the parent of every added login of one provider. */
export function loginProviderRootIn(
  root: string,
  provider: LoginProviderId
): string {
  return join(root, provider);
}

/** `<root>/<provider>/<id>`, and only ever that. */
export function loginDirIn(
  root: string,
  provider: LoginProviderId,
  id: string
): string {
  return join(loginProviderRootIn(root, provider), id);
}

/**
 * Is this directory one Tortie owns, being a direct child of a provider root?
 *
 * THE ATTACK THIS ANSWERS, and the phase names it: a login pointed at a
 * directory Tortie does not own. No field anywhere carries a path, so the
 * only way to try it is a hand edited store file whose id is `../../..`, an
 * absolute path, or a name with a separator in it. All of those compose a
 * directory this function refuses, and it is asked at every create and at
 * every remove rather than only at the read, because the two guards fail
 * differently: the read guard stops a bad row being used, and this one stands
 * in front of the mkdir and the delete even if a later round finds another
 * way to compose a path.
 *
 * It is a STRING comparison over resolved paths and it opens nothing, so it
 * is honest about a symlink in exactly one direction: it can refuse a path
 * that is really inside the root, and it can never accept one that is not
 * spelled inside it. That is the safe direction for a function whose job is
 * to stand in front of a delete.
 */
export function isOwnedLoginDir(
  root: string,
  provider: LoginProviderId,
  dir: string
): boolean {
  if (typeof dir !== 'string' || dir.length === 0) return false;
  if (!isAbsolute(dir) || !isAbsolute(root)) return false;
  const base = resolve(loginProviderRootIn(root, provider));
  const full = resolve(dir);
  if (full === base) return false;
  const prefix = base.endsWith(sep) ? base : base + sep;
  if (!full.startsWith(prefix)) return false;
  // A DIRECT child and nothing deeper. A login directory is the whole world a
  // vendor CLI writes into, so a path naming something inside one is not a
  // login and must never be created or removed as one.
  const rest = full.slice(prefix.length);
  return rest.length > 0 && !rest.includes(sep);
}

/** What is actually on disk where a login's directory should be. */
export type LoginDirDiskState =
  /** A real directory, reached without following a single link. */
  | 'ok'
  /** Nothing is there. A login whose folder was deleted answers this. */
  | 'absent'
  /** Something is there and it is not a directory Tortie owns. */
  | 'escapes';

/**
 * The same question asked of the DISK, and it is the one the string rule
 * above cannot answer.
 *
 * THE ATTACK THIS ANSWERS, found by the Phase 202 verifier in the running
 * app. `resolve` does no input and output at all, so it does not follow a
 * link: an entry at `<root>/<provider>/<sixteen hex>` that is a SYMLINK to
 * any directory on the machine is spelled inside the root, passes the id
 * shape and passes {@link isOwnedLoginDir}. The verifier planted one before
 * the app started, which is the whole threat model, and it was listed as
 * present, chosen, put on a pane as `CLAUDE_CONFIG_DIR` and read by the
 * meter. That variable moves claude's whole world with it, being its
 * settings, hooks, skills, plugins and agents, so a writer of that directory
 * would decide what runs inside every future session with no human
 * confirmation, which is refusal 8.
 *
 * SO EVERY COMPONENT TORTIE COMPOSES IS ASKED, being the logins root, the
 * provider root and the entry itself, and a link anywhere in those three is
 * refused. `lstat` is what makes that a real answer: it reports on the link
 * and never on what it points at. The real paths are then compared as well,
 * so a shape none of the three tests foresaw still has to land as a direct
 * child of the real provider root.
 *
 * ANCESTORS ABOVE THE LOGINS ROOT ARE DELIBERATELY NOT ASKED. They are the
 * person's own userData path, they are routinely reached through a link on
 * macOS, and both sides of the comparison below resolve them identically. A
 * check there would refuse ordinary installs and would prove nothing.
 *
 * ABSENT IS NOT AN ESCAPE, and the difference matters: a login whose folder
 * the person deleted must still fall back to the default and say which name
 * it could not honour, which is what the phase promised and what an escape
 * must never be confused with.
 */
export function loginDirOnDisk(
  root: string,
  provider: LoginProviderId,
  dir: string
): LoginDirDiskState {
  if (!isOwnedLoginDir(root, provider, dir)) return 'escapes';
  let present: boolean;
  try {
    present = lstatSync(dir).isDirectory();
  } catch (err) {
    // ENOENT is the deleted folder and every other error is a directory
    // Tortie cannot read, which is not one it may hand to a launch.
    return (err as NodeJS.ErrnoException).code === 'ENOENT' ? 'absent' : 'escapes';
  }
  // A link to a directory is a directory to `stat` and is NOT one here, which
  // is why `lstat` is asked: `isDirectory` on the link itself is false.
  if (!present) return 'escapes';
  const base = loginProviderRootIn(root, provider);
  for (const step of [root, base]) {
    try {
      if (lstatSync(step).isSymbolicLink()) return 'escapes';
    } catch {
      return 'escapes';
    }
  }
  try {
    const realBase = realpathSync(base);
    const realDir = realpathSync(dir);
    const prefix = realBase.endsWith(sep) ? realBase : realBase + sep;
    if (!realDir.startsWith(prefix)) return 'escapes';
    const rest = realDir.slice(prefix.length);
    if (rest.length === 0 || rest.includes(sep)) return 'escapes';
  } catch {
    return 'escapes';
  }
  return 'ok';
}
