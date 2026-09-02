/**
 * Every word the usage meter draws (Phase 181).
 *
 * MAIN NAMES WHAT HAPPENED AND THIS FILE WRITES THE WORDS, which is the same
 * split Settings then Catch Me Up and Settings then Architecture already use.
 * It is not tidiness here. The snapshot carries a state CODE rather than a
 * vendor sentence precisely so that no error string somebody else composed can
 * reach a face in this app, and the words are in one file so the copy rules
 * test can read them.
 *
 * JUST ENOUGH WORDS, the operator's rule. The resting face is an icon, a bar
 * and two percentages. Everything below is what hover says instead, and every
 * one of these is one short line.
 */

import type { UsageProviderId, UsageState } from '@shared/usage';
import { boundUsageReset, clampUsagePercent, usagePlanWord } from '@shared/usage';

/** The vendor names, as a person knows them. */
export const USAGE_PROVIDER_LABEL: Record<UsageProviderId, string> = {
  claude: 'Claude',
  codex: 'Codex'
};

/** The agent a person runs, which is what refreshes the login. */
export const USAGE_AGENT_LABEL: Record<UsageProviderId, string> = {
  claude: 'Claude Code',
  codex: 'Codex'
};

/** The two window labels. Short because the strip is narrow. */
export const USAGE_FIVE_HOUR = '5h';
export const USAGE_SEVEN_DAY = 'wk';

export const USAGE_TITLE = 'Usage';
export const USAGE_REFRESH = 'Refresh usage';
export const USAGE_STALE_MARK = 'Last read failed';
export const USAGE_NOTHING_ON = 'No usage meter is switched on.';
export const USAGE_NO_BRIDGE = 'This build cannot read usage.';

/**
 * The login lines the hover card draws (Phase 202).
 *
 * JUST ENOUGH WORDS. One line naming the login these numbers belong to, and a
 * second only when a running session is somewhere else, because that is the
 * one case where the meter would otherwise be read as speaking for a session
 * it is not about. Everything else about logins lives in Settings.
 */
export const USAGE_LOGIN_CONTROL = 'Choose login';
/**
 * WHICH STALE THIS IS. A person who has just chosen another account has
 * numbers on screen that are the previous one's, and `Last read failed` would
 * be a false sentence about it: nothing failed. This is the true one, and it
 * is drawn in that mark's place while the meter is between logins.
 */
export const USAGE_LOGIN_SWITCHING = 'Reading the new login';

/** `Login: Work`, or nothing at all for the person's own default sign in. */
export function usageLoginLine(login: string | null): string {
  return login === null || login.length === 0 ? '' : `Login: ${login}`;
}

/**
 * `1 session on Default`, or nothing when every running session of this agent
 * is on the login the meter is reading.
 *
 * A RUNNING SESSION KEEPS THE LOGIN IT STARTED WITH, for its whole life, so
 * this is a real and ordinary state rather than an error: a person switches,
 * and what is already running does not move. Research 72's rule is that the
 * meter may never lie across accounts, and this is the line that keeps it
 * honest about the sessions in front of the person.
 */
export function usageOtherLoginsLine(counts: Map<string, number>): string {
  const parts: string[] = [];
  for (const [name, count] of counts) {
    parts.push(`${String(count)} session${count === 1 ? '' : 's'} on ${name}`);
  }
  return parts.join(', ');
}

/** The one line hover says when a provider has no numbers to draw. */
export function usageStateLine(
  provider: UsageProviderId,
  state: UsageState
): string {
  const agent = USAGE_AGENT_LABEL[provider];
  switch (state) {
    case 'signed-out':
      return `Sign in with ${agent} to see usage.`;
    case 'expired':
      return `Run ${agent} to refresh the login.`;
    case 'api-key':
      return 'Billed by API key, so there is no plan window.';
    case 'no-windows':
      return `${USAGE_PROVIDER_LABEL[provider]} reported no plan window.`;
    case 'unavailable':
      return `${USAGE_PROVIDER_LABEL[provider]} usage could not be read.`;
    default:
      return '';
  }
}

/**
 * The plan line the hover card draws, or nothing (Phase 181.2).
 *
 * WHAT IT IS FOR: a person with more than one login, or one who has switched,
 * could not tell whose quota was on screen. So the card names the thing the
 * person pays for, in the vendor's own word, and names nothing else. No
 * account, no address, no identifier.
 *
 * The word is read twice, here and in main, for the same reason a percentage
 * is: this file is the only place a served value becomes words, and a value
 * this file cannot draw honestly draws nothing at all. Underscores and
 * hyphens become spaces because a plan word is a word on a face, not a key.
 */
export function usagePlanLine(plan: string | null): string {
  const word = usagePlanWord(plan);
  if (word === null) return '';
  const title = word
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter((part) => part !== '')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  if (title === '') return '';
  return /plan$/i.test(title) ? title : `${title} plan`;
}

/**
 * The percent form the operator asked for, being the number then the window.
 *
 * It clamps again. Main clamps every served percentage already, proved over
 * 31 hostile bodies, so nothing that reaches here from the wire needs it. But
 * this file is the only place a number becomes words, and the fix round of
 * 2026-08-31 served hostile snapshots through the real channel and watched it
 * draw `NaN% 5h` and `500% 5h`. A number this file cannot draw honestly draws
 * NOTHING, and the caller leaves that window out.
 */
export function usagePercentText(percent: number, window: string): string {
  const clamped = clampUsagePercent(percent);
  if (clamped === null) return '';
  return `${Math.round(clamped)}% ${window}`;
}

/**
 * How long until a window resets, in the app's own compact form.
 *
 * Research 72 says a countdown reads better than a wall clock time, and the
 * resting face has no room for either, so this is what hover says.
 *
 * A reset beyond the horizon says nothing at all rather than counting to a
 * date nobody will see. Main drops one before it crosses IPC; this is the
 * second reading, for the same reason the percentage is clamped twice.
 */
export function usageResetIn(resetsAt: number, now: number): string {
  const bounded = boundUsageReset(resetsAt, now);
  if (bounded === null) return '';
  const delta = Math.max(0, bounded - now);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'Resets now';
  if (minutes < 60) return `Resets in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Resets in ${hours}h ${minutes % 60}m`;
  return `Resets in ${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** The severity a bar wears, stepping where research 72 records orca's steps. */
export function usageSeverity(percent: number): 'normal' | 'warm' | 'hot' {
  if (percent >= 80) return 'hot';
  if (percent >= 60) return 'warm';
  return 'normal';
}
