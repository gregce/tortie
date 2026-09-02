/**
 * Every sentence on the usage group in Settings then Agents (Phase 181, moved
 * here by Phase 181.1), in one file so the copy rules test can read them.
 *
 * JUST ENOUGH WORDS. The resting face is two switches with one line each, and
 * the rest of what a person may want to know once sits behind the disclosure
 * at the bottom rather than on the page.
 *
 * PHASE 181.1 REWROTE THAT DISCLOSURE. The operator read the four paragraphs
 * and asked for simpler text. Shorter sentences, plainer words, and every
 * promise still made: only the vendor that issued the login is asked, the
 * addresses cannot be changed by a setting, the login is read and never
 * written, refreshed or copied, running the agent is what refreshes a stale
 * login, nothing is stored, no part of a login reaches a log or a file, and a
 * meter asks every fifteen minutes only while this window is in front, with
 * the refresh control asking now. No promise was dropped to save a line.
 */

export const USAGE_TITLE = 'Usage';

export const USAGE_CLAUDE_LABEL = 'Claude';
export const USAGE_CLAUDE_CAPTION =
  'Reads the login Claude Code already stored and asks Anthropic how much of your plan you have used.';

export const USAGE_CODEX_LABEL = 'Codex';
export const USAGE_CODEX_CAPTION =
  'Reads the login Codex already stored and asks OpenAI how much of your plan you have used.';

export const USAGE_OFF_NOTE =
  'While a meter is off nothing is read and nothing is sent.';

/**
 * The bar's window (Phase 181.2).
 *
 * The caption carries the whole reason this control exists. Phase 181 filled
 * the bar to whichever window was further along and said so nowhere, so a
 * person read the bar against the first number beside it and the two
 * disagreed. Most used is kept, because the fullest window is the one that
 * will stop you first, and now the page says what most used means.
 */
export const USAGE_BAR_LABEL = 'Bar shows';
export const USAGE_BAR_CAPTION =
  'Which window each bar fills to. Most used follows whichever window is further along.';

export const USAGE_BAR_FIVE_HOUR = 'Last 5 hours';
export const USAGE_BAR_SEVEN_DAY = 'This week';
export const USAGE_BAR_MOST_USED = 'Most used';

export const USAGE_ABOUT_OPEN = 'How this works';
export const USAGE_ABOUT_WHERE =
  'Only the vendor that issued your login is asked. Both addresses are built in and no setting changes them.';
export const USAGE_ABOUT_READONLY =
  'Your login is read, never written, refreshed or copied. Run the agent once to refresh a stale login.';
export const USAGE_ABOUT_KEPT =
  'Nothing is stored. Numbers stay in memory until you quit, and no part of your login reaches a log or a file.';
export const USAGE_ABOUT_WHEN =
  'A meter asks every fifteen minutes, and only while this window is in front. The refresh control asks now.';

/**
 * The logins block (Phase 202).
 *
 * JUST ENOUGH WORDS. One line saying what a login is, one row per login, and a
 * Remove on the ones Tortie owns. The default login gets no control at all,
 * which is the surface saying what the code says: it is the person's own and
 * Tortie never touches it.
 */
export const USAGE_LOGINS_LABEL = 'Logins';
export const USAGE_LOGINS_CAPTION =
  'Which sign in a new session runs under. Choose one from the usage meter. Running sessions keep the one they started with.';

/**
 * PHASE 203 MOVED THE THREE PER ROW NOTES OUT OF THIS FILE.
 *
 * A row now says whose account it is rather than which of three states it is
 * in, and the meter's own menu says the same thing in the same words, so those
 * words live in src/shared/login-copy.ts where all three login surfaces reach
 * them. `Your own sign in`, `Not signed in yet` and `Account not known yet`
 * are there, and this page composes nothing of its own about a row.
 */

export const USAGE_LOGIN_CHOSEN = 'Chosen';
export const USAGE_LOGIN_REMOVE = 'Remove';
export const USAGE_LOGIN_ADD = 'Add login…';

/**
 * What Remove does, said where a person presses it rather than in a
 * disclosure, because it is the one control on this page that deletes
 * something.
 */
export const USAGE_LOGIN_REMOVE_NOTE =
  'Removing deletes only the folder Tortie made. Sessions on that login come back on your own sign in.';
