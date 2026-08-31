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

/** The percent form the operator asked for, being the number then the window. */
export function usagePercentText(percent: number, window: string): string {
  const rounded = Math.round(percent);
  return `${rounded}% ${window}`;
}

/**
 * How long until a window resets, in the app's own compact form.
 *
 * Research 72 says a countdown reads better than a wall clock time, and the
 * resting face has no room for either, so this is what hover says.
 */
export function usageResetIn(resetsAt: number, now: number): string {
  const delta = Math.max(0, resetsAt - now);
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
