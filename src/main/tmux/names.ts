/**
 * Display-name → tmux-session-name sanitizer.
 *
 * Why this exists (FINAL-REPORT §2.4 Step 0): as of tmux 3.7 the server no
 * longer rewrites `.`/`:` in session names — they are accepted verbatim, and
 * verbatim `.`/`:` are ambiguous inside `-t` target syntax
 * (`session:window.pane`). `/`-containing names can collide with tmux's
 * path-like target resolution. So gmux enforces its OWN mapping at
 * create/rename time and addresses live sessions by immutable `$-id`
 * (or `=`-prefixed exact-match name) everywhere else.
 *
 * Pure module — no tmux/electron imports — so it is unit-testable under any
 * runner (see __tests__/names.test.ts).
 */

/** Characters that are ambiguous in tmux `-t` targets; each becomes `-`. */
const AMBIGUOUS = /[.:/]/g;

/** C0 controls, DEL, C1 controls — tmux escapes/rejects these; we strip. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/** Collapse any whitespace run (tabs, newlines survive paste) to one space. */
const WHITESPACE_RUNS = /\s+/g;

/** Hard cap; tmux has no documented limit but huge names break UI + logs. */
export const MAX_TMUX_NAME_LENGTH = 200;

/** Fallback when sanitizing leaves nothing usable. */
export const FALLBACK_TMUX_NAME = 'session';

/**
 * Derive the sanitized tmux session name from a user-visible display name.
 *
 * Rules (deterministic, order matters):
 *  1. strip control characters (C0, DEL, C1) — except \t \n \r, which the
 *     whitespace pass folds into spaces so pasted text degrades gracefully
 *  2. collapse whitespace runs to a single space, trim ends
 *  3. rewrite `.` `:` `/` → `-` (tmux 3.7+ will NOT do this for us)
 *  4. truncate to MAX_TMUX_NAME_LENGTH
 *  5. empty result → FALLBACK_TMUX_NAME
 */
export function sanitizeSessionName(displayName: string): string {
  const cleaned = displayName
    .replace(CONTROL_CHARS, '')
    .replace(WHITESPACE_RUNS, ' ')
    .trim()
    .replace(AMBIGUOUS, '-')
    .slice(0, MAX_TMUX_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : FALLBACK_TMUX_NAME;
}

/**
 * Pick a tmux name that does not collide with `taken` (case-sensitive, as
 * tmux names are). Sanitized collisions are real: "a.b" and "a:b" both map
 * to "a-b". First candidate is the plain sanitized name, then `name-2`,
 * `name-3`, …
 */
export function dedupeSessionName(
  sanitized: string,
  taken: ReadonlySet<string>
): string {
  if (!taken.has(sanitized)) return sanitized;
  for (let i = 2; ; i++) {
    const candidate = `${sanitized}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Format a session reference for `-t`. Immutable `$-ids` pass through;
 * anything else is `=`-prefixed so tmux does an exact name match instead of
 * prefix/path-like resolution (Control Mode wiki best practice).
 */
export function formatSessionTarget(ref: string): string {
  return ref.startsWith('$') ? ref : `=${ref}`;
}
