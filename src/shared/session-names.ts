/**
 * ONE RULE FOR A NEW SESSION'S NAME (Phase 346, build/p346/SPEC.md §4.3,
 * D14).
 *
 * A session made with no name typed is called `<agent>-<n>`, where `n` is one
 * more than the largest such number already in the project, and a name the
 * project already holds gets `-2`, `-3` and so on until it is free. The
 * renderer's one-press create (`quickCreate` in
 * src/renderer/state/sessions-slice.ts) and the phone's start
 * (src/main/sessions/pocket-start.ts) both name a session here, so the two can
 * never draw two names for one press.
 *
 * `nextOrdinal` was MOVED HERE from sessions-slice.ts, its doc and its body
 * byte for byte and its list widened to anything with a name, and the slice
 * re-exports it, so every importer kept its import. `dedupedName` is the loop
 * `createSession` ran inline. Pure: no clock, no I/O.
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
