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
 * PHASE 349 (build/p349/SPEC.md D7, D17, M1): the tmux name also stops
 * carrying what tmux READS in a name. tmux expands a session name as a format
 * when it creates or renames one (since 2.7), its command parser ends a
 * command at an argument's final `;`, `rename-session` reads a name that
 * begins with `-` as flags, and a `-t` that begins with `$` is an id. M1
 * measured all of it on nine versions, 3.2a to 3.7c: today's rule kept 23 to
 * 25 of 54 corpus names exact on a create and 19 to 21 on a rename, and with
 * {@link holdBackTmuxSyntax} this Mac's rule keeps 54 of 54 from 3.5a and the
 * far rule (`farTmuxName` in ../machines/remote-sessions.ts) 54 of 54
 * everywhere. Only the TMUX name is mapped: the display name a person reads is
 * never touched, and a name tmux takes whole today, such as `PR #12`, `#x`,
 * `#[fg=red]ok` or `a;b`, stays whole unless it begins with `-` or `$`.
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
 * The tmux names no session of a person's is ever given (Phase 349, D7, M1):
 * the control client's own session, `CONTROL_SESSION_NAME` in
 * ./control-client.ts, which this pure module cannot import, so a vitest pins
 * the two equal. M1 measured `tmux -C new-session -A -s gmux-control`
 * ATTACHING to a person's own session of that name on 3.6a and 3.7b, and a
 * create deduped against it only while it existed, so {@link dedupeSessionName}
 * treats every name here as always taken.
 */
export const RESERVED_TMUX_NAMES: readonly string[] = Object.freeze(['gmux-control']);

/** The one-letter formats every measured version reads after a `#` (M1's scan, 3.2a to 3.7c). */
const HASH_FORMAT_LETTERS = 'DFHIPSTWh';

/** What else every measured version reads after a `#`: a format, a job, an escaped `#`, `#,` and `#}`. */
const HASH_SYNTAX = '{(#,}';

/** The one character each held-back unit becomes. */
const HELD = '_';

/**
 * What tmux reads in a session name, held back one unit for one unit
 * (Phase 349, D7). Each of these becomes `_`:
 *
 *  - every backslash, which every measured version DOUBLES as it stores it;
 *  - every `#` whose next character in the name handed in is one of `{ ( # , }`
 *    or a one-letter format (`D F H I P S T W h`), and a `#` that is the last
 *    character, which 3.7b and 3.7c drop;
 *  - a final `;`, which ends the command it stands in (`x;` creates nothing);
 *  - a leading `-`, which `rename-session` reads as flags on every version, or
 *    a leading `$`, which every `-t` reads as an immutable id.
 *
 * Applied LAST by {@link sanitizeSessionName}, after the 200-character cut, so
 * the cut can never leave a `#` at the end or a `;` last unmapped, and the
 * name never grows. Idempotent: nothing it writes is something it maps.
 */
export function holdBackTmuxSyntax(name: string): string {
  let out = '';
  for (let i = 0; i < name.length; i += 1) {
    const ch = name.charAt(i);
    const last = i === name.length - 1;
    const next = last ? '' : name.charAt(i + 1);
    if (ch === '\\') out += HELD;
    else if (ch === '#' && (last || HASH_SYNTAX.includes(next) || HASH_FORMAT_LETTERS.includes(next))) out += HELD;
    else if (ch === ';' && last) out += HELD;
    else if ((ch === '-' || ch === '$') && i === 0) out += HELD;
    else out += ch;
  }
  return out;
}

/**
 * Derive the sanitized tmux session name from a user-visible display name.
 *
 * Rules (deterministic, order matters):
 *  1. strip control characters (C0, DEL, C1) — except \t \n \r, which the
 *     whitespace pass folds into spaces so pasted text degrades gracefully
 *  2. collapse whitespace runs to a single space, trim ends
 *  3. rewrite `.` `:` `/` → `-` (tmux 3.7+ will NOT do this for us)
 *  4. truncate to MAX_TMUX_NAME_LENGTH
 *  5. hold back what tmux reads in a name, {@link holdBackTmuxSyntax}
 *     (Phase 349, D7, D17): M1 measured every version doubling a backslash,
 *     expanding a `#` before `{ ( # , }` or a one-letter format and dropping a
 *     final `#` (3.7b, 3.7c), ending a command at a final `;`, reading a
 *     leading `-` as flags and a leading `$` as an id
 *  6. empty result → FALLBACK_TMUX_NAME
 */
export function sanitizeSessionName(displayName: string): string {
  const cleaned = displayName
    .replace(CONTROL_CHARS, '')
    .replace(WHITESPACE_RUNS, ' ')
    .trim()
    .replace(AMBIGUOUS, '-')
    .slice(0, MAX_TMUX_NAME_LENGTH);
  const held = holdBackTmuxSyntax(cleaned);
  return held.length > 0 ? held : FALLBACK_TMUX_NAME;
}

/**
 * Pick a tmux name that does not collide with `taken` (case-sensitive, as
 * tmux names are). Sanitized collisions are real: "a.b" and "a:b" both map
 * to "a-b". First candidate is the plain sanitized name, then `name-2`,
 * `name-3`, … A name in {@link RESERVED_TMUX_NAMES} is always taken
 * (Phase 349, D7).
 */
export function dedupeSessionName(
  sanitized: string,
  taken: ReadonlySet<string>
): string {
  const free = (name: string): boolean => !taken.has(name) && !RESERVED_TMUX_NAMES.includes(name);
  if (free(sanitized)) return sanitized;
  for (let i = 2; ; i++) {
    const candidate = `${sanitized}-${i}`;
    if (free(candidate)) return candidate;
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
