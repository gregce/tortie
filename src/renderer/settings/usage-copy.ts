/**
 * Every sentence on Settings then Usage (Phase 181), in one file so the copy
 * rules test can read them.
 *
 * JUST ENOUGH WORDS. The resting face is two switches with one line each, and
 * the rest of what a person may want to know once sits behind the disclosure
 * at the bottom rather than on the page.
 */

export const USAGE_TITLE = 'Usage';
export const USAGE_GROUP = 'Meters';

export const USAGE_CLAUDE_LABEL = 'Claude';
export const USAGE_CLAUDE_CAPTION =
  'Reads the login Claude Code already stored and asks Anthropic how much of your plan you have used.';

export const USAGE_CODEX_LABEL = 'Codex';
export const USAGE_CODEX_CAPTION =
  'Reads the login Codex already stored and asks OpenAI how much of your plan you have used.';

export const USAGE_OFF_NOTE =
  'While a meter is off nothing is read and nothing is sent.';

export const USAGE_ABOUT_OPEN = 'How this works';
export const USAGE_ABOUT_WHERE =
  'Tortie asks the vendor that issued your login and no other place. The two addresses are compiled in and no setting can change them.';
export const USAGE_ABOUT_READONLY =
  'Your saved login is read and never written, refreshed or copied. Run the agent once when the login has gone stale, because the agent is what refreshes a login.';
export const USAGE_ABOUT_KEPT =
  'Nothing is stored. The numbers live in memory until you quit, and no part of your login ever reaches a log or a file.';
export const USAGE_ABOUT_WHEN =
  'A meter asks every fifteen minutes, and only while this window is in front. The refresh control asks now.';
