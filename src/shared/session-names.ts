/**
 * ONE RULE FOR EACH OF A SESSION'S TWO NAMES: the name a new session is given
 * (Phase 346, build/p346/SPEC.md §4.3, D14), and the name a person types
 * (Phase 349, build/p349/SPEC.md §4.3 step 1, D5).
 *
 * THE NAME A NEW SESSION IS GIVEN (Phase 346). A session made with no name
 * typed is called `<agent>-<n>`, where `n` is one more than the largest such
 * number already in the project, and a name the project already holds gets
 * `-2`, `-3` and so on until it is free. The renderer's one-press create
 * (`quickCreate` in src/renderer/state/sessions-slice.ts) and the phone's start
 * (src/main/sessions/pocket-start.ts) both name a session here, so the two can
 * never draw two names for one press.
 *
 * `nextOrdinal` was MOVED HERE from sessions-slice.ts, its doc and its body
 * byte for byte and its list widened to anything with a name, and the slice
 * re-exports it, so every importer kept its import. `dedupedName` is the loop
 * `createSession` ran inline.
 *
 * THE NAME A PERSON TYPES (Phase 349). The phone renames a session, and names
 * one in New session, through the Mac's own rename, which refuses only a blank
 * name and stores whatever else it is handed (`renameSessionAdmitted` in
 * src/main/sessions/core.ts). So the phone's door asks THIS rule before it
 * hands a name to that verb (`renameVerdict` in
 * src/main/sessions/pocket-writes.ts, the one reader on the Mac), and the phone
 * holds a Swift copy (`NameRule`), held to this one by the shared vectors'
 * `names` section, which are read off these functions one code unit at a time.
 * A name is trimmed as the Mac trims it, by ECMAScript's own `trim`
 * (sessions-slice.ts), then refused, in this order, each with its sentence:
 * when nothing is left; when it holds more than {@link SESSION_NAME_MAX_UNITS}
 * UTF-16 units, the Mac sheet's own field; or at the first unit Tortie does not
 * use: a C0 control (TAB, LF and CR included), DEL, a C1 control, a bidi
 * embedding, override or isolate (U+202A to U+202E, U+2066 to U+2069), U+2028
 * or U+2029, or half of a surrogate pair. The bidi and line marks could reorder
 * the status drawn beside a name in an alert's title (src/main/push/alert.ts).
 * Anything else passes, a duplicate included, as on the Mac.
 *
 * Pure: no clock, no I/O, and no pattern in the rule a person types.
 */

import type { Session } from './types';

/** Next free `<base>-<n>` ordinal within a session list (S6 name prefill). */
export function nextOrdinal(sessions: readonly Pick<Session, 'name'>[], base: string): number {
  let max = 0;
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  for (const s of sessions) {
    const m = re.exec(s.name);
    if (m && m[1] !== undefined) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/** Silent display-name dedupe within the project (S6): `name`, else `name-2`, `name-3`, … */
export function dedupedName(name: string, existing: ReadonlySet<string>): string {
  let finalName = name;
  for (let n = 2; existing.has(finalName); n++) {
    finalName = `${name}-${n}`;
  }
  return finalName;
}

/** The name a one-press create gives a new `<base>` session in a project holding `sessions`. */
export function ordinalName(base: string, sessions: readonly Pick<Session, 'name'>[]): string {
  return dedupedName(`${base}-${nextOrdinal(sessions, base)}`, new Set(sessions.map((s) => s.name)));
}

// ---------------------------------------------------------------------------
// PHASE 349 — the name a person types (build/p349/SPEC.md §4.3 step 1, D5).
// ---------------------------------------------------------------------------

/** The most UTF-16 units a session name may hold: the Mac sheet's own field (InlinePanel.tsx `maxLength={120}`). */
export const SESSION_NAME_MAX_UNITS = 120;

/** A name with nothing left once trimmed: the Mac's own words, byte for byte (`renameSessionAdmitted`, core.ts). */
export const SESSION_NAME_EMPTY = 'Session name cannot be empty.';

/** A name over {@link SESSION_NAME_MAX_UNITS} units, in the words src/renderer/tree/entry-name.ts says of a file's. */
export const SESSION_NAME_TOO_LONG = 'That name is too long.';

/** A name holding a unit the rule refuses (a control, a line mark, a bidi mark, half a surrogate pair). */
export const SESSION_NAME_CHARACTER = 'That name holds a character Tortie does not use.';

/** Why a name is refused. */
export type SessionNameReason = 'empty' | 'long' | 'character';

/** ECMAScript's own trim, which is how the Mac trims a name (sessions-slice.ts). */
export function trimmedSessionName(name: string): string {
  return name.trim();
}

/**
 * Whether one UTF-16 code unit is refused wherever it stands. A surrogate is
 * not judged here: half of a pair is refused, and a whole pair passes, which
 * needs the unit beside it.
 */
function refusedUnit(unit: number): boolean {
  if (unit <= 0x1f) return true; // C0, TAB, LF and CR included
  if (unit === 0x7f) return true; // DEL
  if (unit >= 0x80 && unit <= 0x9f) return true; // C1
  if (unit >= 0x202a && unit <= 0x202e) return true; // bidi embeddings and overrides
  if (unit >= 0x2066 && unit <= 0x2069) return true; // bidi isolates
  return unit === 0x2028 || unit === 0x2029; // line and paragraph separators
}

/** A high surrogate, the first half of a pair. */
function isHighSurrogate(unit: number): boolean {
  return unit >= 0xd800 && unit <= 0xdbff;
}

/** A low surrogate, the second half of a pair. */
function isLowSurrogate(unit: number): boolean {
  return unit >= 0xdc00 && unit <= 0xdfff;
}

/** Why a name is refused, in this order, or null: read one code unit at a time, no pattern. */
export function sessionNameRefusal(name: string): { reason: SessionNameReason; sentence: string } | null {
  const trimmed = trimmedSessionName(name);
  if (trimmed.length === 0) return { reason: 'empty', sentence: SESSION_NAME_EMPTY };
  if (trimmed.length > SESSION_NAME_MAX_UNITS) return { reason: 'long', sentence: SESSION_NAME_TOO_LONG };
  for (let i = 0; i < trimmed.length; i += 1) {
    const unit = trimmed.charCodeAt(i);
    if (isHighSurrogate(unit)) {
      // A high surrogate passes only with the low one that completes it.
      if (i + 1 < trimmed.length && isLowSurrogate(trimmed.charCodeAt(i + 1))) {
        i += 1;
        continue;
      }
      return { reason: 'character', sentence: SESSION_NAME_CHARACTER };
    }
    // A low surrogate reached here was not preceded by a high one.
    if (isLowSurrogate(unit) || refusedUnit(unit)) {
      return { reason: 'character', sentence: SESSION_NAME_CHARACTER };
    }
  }
  return null;
}
