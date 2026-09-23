/**
 * What Tortie says about the alerts it sends to a paired phone (Phase 314).
 *
 * Every sentence here is NEW copy, and each one is drawn by Phase 316's app or
 * written to the log by the push engine, and by nothing else in this phase. The
 * words are held in one place so the log, the phone and the Settings line
 * cannot say three different things about one fault.
 *
 * WHAT IS NOT HERE. The alert's own words are not copy of this module's. The
 * single alert's title is the session's name and main's status word
 * (`src/main/push/alert.ts`), the count alert's title is the tray's own header
 * (`NEEDS_YOUR_INPUT`, `src/main/tray/attention.ts`), and nothing an agent
 * asked ever reaches an alert: a native alert is JSON Apple reads.
 */

/**
 * The wake alert's first segment. It is true of every row the wake alert
 * covers, which "while your Mac slept" would not be: a local agent sleeps with
 * the Mac, so what the wake gathers is what was FIRST SEEN when it woke.
 */
export const PUSH_WAKE_SEEN = 'Seen when your Mac woke';

/** The key could not be opened, so nothing was sent. */
export const PUSH_NO_KEY = 'Tortie could not open its Apple push key, so it told your phone nothing.';

/** Apple answered that the key, its id, its team or its topic is wrong. */
export const PUSH_KEY_REFUSED = 'Apple refused Tortie’s push key, so it told your phone nothing.';

/** Apple answered that a phone's device token is gone, and it was dropped. */
export const PUSH_TOKEN_STOPPED = 'Your phone stopped taking alerts from this Mac. Pair it again to turn them back on.';

/** Apple could not be reached twice in a row for one alert. */
export const PUSH_UNREACHABLE = 'Tortie could not reach Apple, so this alert was not sent.';

/**
 * Apple called a FRESHLY minted provider token over an hour old (a second
 * `ExpiredProviderToken`, after the one re-mint), which only happens when this
 * Mac's clock is more than an hour behind Apple's. The key is fine, so this is
 * not {@link PUSH_KEY_REFUSED}, and nothing stops: the next alert tries again.
 */
export const PUSH_CLOCK_BEHIND = 'This Mac’s clock is behind Apple’s, so this alert was not sent.';

/** Which sentence the push engine is saying. Each is said at most once per run. */
export type PushSentenceId = 'no-key' | 'refused-key' | 'clock' | 'dropped' | 'unreachable';
