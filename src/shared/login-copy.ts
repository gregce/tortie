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

/**
 * A login whose store is empty and whose account Tortie is holding (Phase 204).
 *
 * IT IS NOT `Not signed in yet`, and the difference is the whole of what the
 * operator asked for. A login promoted from an account he signed out of has
 * nothing in its own store and IS reachable: choosing it puts the account
 * back. Saying it was never signed into would be the Phase 203 defect in a new
 * shape, being a surface answering a narrower question than the one a person
 * is asking.
 */
export const LOGIN_KEPT = 'Kept by Tortie';

/**
 * What choosing a login will do, in one short line each (Phase 204).
 *
 * They are said BEFORE the switch rather than after it, which is the whole
 * reason they exist: a switch moves a credential, and a person is entitled to
 * know that before they pick.
 */
export const LOGIN_SWITCH_RESTORE = 'Puts this account back.';

/**
 * When a switch takes effect, said with the number READ FROM THE BUNDLE
 * (Phase 211, corrected by the fix round).
 *
 * On macOS a running Claude Code caches its keychain read for thirty seconds:
 * `S8t=30000` at offset 158840519 of the installed 2.1.259 bundle, honoured by
 * its keychain `read()` at 158845461, both in docs/research/79. So a session
 * picks a switch up on its own within about half a minute. No vendor process
 * was driven to time it, and the research says what that would take, so this
 * is the bundle's constant and not a stopwatch; the operator's acceptance
 * step in the Phase 211 entry is the reading that can confirm it. `Restart
 * now` beside the sentence is the instant path. On every other platform the
 * vendor re-reads its credential FILE the moment it changes, so the switch
 * lands on the next message.
 */
export const LOGIN_SWITCH_TAKES_MAC =
  'Takes effect within about half a minute, or restart the session now.';
export const LOGIN_SWITCH_TAKES_OTHER = 'Takes effect on the next message.';

/** The timing half of the switch line, for the platform a person is on. */
export function loginSwitchTiming(isMac: boolean): string {
  return isMac ? LOGIN_SWITCH_TAKES_MAC : LOGIN_SWITCH_TAKES_OTHER;
}

/** The label of the instant path on the card and in the toast after a switch. */
export const LOGIN_RESTART_NOW = 'Restart now';

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
  // PHASE 204. AN EMPTY STORE TORTIE IS HOLDING AN ACCOUNT FOR IS NOT A LOGIN
  // NOBODY SIGNED INTO. It is one the person can go back to, and the words say
  // which of the two it is.
  if (!row.present) parts.push(row.kept ? LOGIN_KEPT : LOGIN_NOT_SIGNED_IN);
  else if (!named) parts.push(LOGIN_ACCOUNT_UNKNOWN);
  return parts.join(JOIN);
}

/**
 * What choosing this login will do, or the empty string when it does nothing
 * a person needs warning about (Phase 204).
 *
 * IT SPEAKS ONLY WHEN A CREDENTIAL WILL MOVE. Choosing a login that is already
 * chosen, choosing the person's own default location, which Tortie never
 * writes, and choosing a login whose store already holds its account all move
 * nothing, and a line about nothing is the kind of paragraph the operator
 * refused on 2026-08-28. So the one line appears exactly on the rows where a
 * switch will put an account back.
 */
export function loginSwitchLine(row: LoginRow, isMac = true): string {
  if (row.chosen || row.isDefault) return '';
  if (!row.restores) return '';
  // PHASE 211. What the switch does AND WHEN, because the switch now reaches the
  // running session and a person is entitled to know the timing before they
  // pick. The measured number is on `loginSwitchTiming`.
  return `${LOGIN_SWITCH_RESTORE} ${loginSwitchTiming(isMac)}`;
}

/**
 * The second line a menu item or a list row carries, being what the login is
 * and then what choosing it would do (Phase 204, timing added Phase 211).
 *
 * The two are joined by the same separator every other pair of parts uses, and
 * the switch half is usually empty, so a row that has nothing new to say reads
 * exactly as it read in Phase 203.
 */
export function loginRowDetail(row: LoginRow, isMac = true): string {
  const parts = [loginAccountDetail(row), loginSwitchLine(row, isMac)].filter(
    (part) => part !== ''
  );
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
