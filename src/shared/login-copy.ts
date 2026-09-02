/**
 * The words a login is drawn with, and the rule for which of them appear
 * (Phase 203).
 *
 * ## Why it is here rather than in a renderer copy file
 *
 * Three surfaces draw a login and they are in three places that may not all
 * name each other. The meter's own card is in `src/renderer/app`, the list is
 * in `src/renderer/settings`, and the sentence a finished sign in ends with is
 * posted from `src/renderer/state`, which the directory wall forbids from
 * naming `src/renderer/app` at all. One set of words in one file is the only
 * answer that does not duplicate them, and duplicated copy is how two surfaces
 * end up saying different things about the same login.
 *
 * ## A LOGIN IS DRAWN AS ITS ACCOUNT
 *
 * The operator's report of 2026-09-02: *"right now i'm logged into
 * greg@itavero.software but default isn't actually mapped to that in tortie"*.
 * So the address leads and the name Tortie holds is the secondary word, and
 * `Default` stops being a label on a face. It stays the RESERVED MANIFEST KEY,
 * which is why there is no rename anywhere in this phase: the name is what a
 * session's row carries, and renaming one would strand every session that
 * named it.
 *
 * ## THE ADDRESS IS DRAWN AND NEVER SENT
 *
 * It is the person's own data. It reaches a face and it reaches nothing else:
 * no request, no log line, no manifest row, no argv and no report.
 *
 * ## JUST ENOUGH WORDS
 *
 * One line per login and one short second line. The second line says only what
 * changes the meaning of the first: whose it is, whether anybody has signed in
 * yet, and whether Tortie owns it.
 */

import type { LoginRow } from './logins';

/** The default login, said as the one Tortie does not own. */
export const LOGIN_YOUR_OWN = 'Your own sign in';

/** A login with a credential whose vendor file names no address yet. */
export const LOGIN_ACCOUNT_UNKNOWN = 'Account not known yet';

/** A login nobody has completed the vendor's own sign in for. */
export const LOGIN_NOT_SIGNED_IN = 'Not signed in yet';

/** The separator between the secondary parts, which is never a dash. */
const JOIN = ' · ';

/**
 * The word a login leads with: the address when one is known, the name when
 * it is not, and for the default login the phrase that says whose it is.
 */
export function loginAccountLabel(row: LoginRow): string {
  if (row.email !== null && row.email.length > 0) return row.email;
  return row.isDefault ? LOGIN_YOUR_OWN : row.name;
}

/**
 * The short second line, or the empty string when the first line is the whole
 * answer.
 *
 * The default row is ALWAYS marked as the one Tortie does not own, because
 * that is the whole ownership rule and it is what stops a person expecting a
 * Remove on it.
 */
export function loginAccountDetail(row: LoginRow): string {
  const parts: string[] = [];
  const named = row.email !== null && row.email.length > 0;
  if (row.isDefault) {
    if (named) parts.push(LOGIN_YOUR_OWN);
  } else if (named) {
    parts.push(row.name);
  }
  if (!row.present) parts.push(LOGIN_NOT_SIGNED_IN);
  else if (!named) parts.push(LOGIN_ACCOUNT_UNKNOWN);
  return parts.join(JOIN);
}

/**
 * What a finished sign in says, naming the login and whether a credential now
 * exists (Phase 203).
 *
 * THE PANE CLOSING IS CORRECT and only looked like a crash. The sign in
 * session runs one vendor command that exits when the vendor is done, so the
 * session ending is the flow working; what was missing was anything saying so.
 * This is that sentence, and the list behind the sentence is refreshed before
 * a word of it is composed, so what a person reads is what Tortie found and
 * not what Tortie hoped.
 *
 * `row` is null when the login is gone from the list altogether, which is the
 * same answer as a login with no credential.
 */
export function loginSignInDoneLine(name: string, row: LoginRow | null): string {
  if (row === null || !row.present) {
    return `${name} is still not signed in. Nothing was written.`;
  }
  const named = row.email !== null && row.email.length > 0;
  return named ? `Signed in on ${name} as ${row.email}.` : `Signed in on ${name}.`;
}
