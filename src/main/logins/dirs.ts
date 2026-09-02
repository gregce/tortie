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
