/**
 * Last-fetch honesty — BACKLOG Phase 14.5, research 24 §6.3.
 *
 * Every divergence claim gmux makes ("nothing to pull", "1 unpushed",
 * "origin/main is here") is measured against a REMOTE-TRACKING REF, which is
 * a snapshot taken at the last fetch. "Up to date" against a week-old
 * `origin/main` is not a small imprecision — it is the app asserting
 * something it cannot know. The counts are exact about what this clone HAS;
 * they are silent about what the remote has done since.
 *
 * So the age of that snapshot travels with every surface that reads it:
 *
 *  - the Sync control's tooltip (always — fresh or stale, the sentence says
 *    when it was measured),
 *  - a compact age beside the Sync glyph, but ONLY in the one state where
 *    silence would be a lie: level with the upstream and the snapshot is old,
 *  - the ⋯ actions menu, as a plain caption above Fetch,
 *  - each remote ref pill's tooltip in the history list.
 *
 * Voice: quiet and factual. It reports when we last looked; it never scolds,
 * never colours itself as a warning, and never suggests the user has done
 * something wrong. Being behind on fetches is normal.
 */

import { formatRelative, formatRelativeLong, syncTooltip } from './format';

/**
 * How old a fetch has to be before its age is worth showing unprompted.
 *
 * One hour (research 24 §6.3). Below it the snapshot is effectively "now" for
 * a session of work and the chip would be chatter; above it, an unqualified
 * "up to date" starts being wrong often enough to matter.
 */
export const FETCH_STALE_MS = 60 * 60 * 1000;

/** True when the remote snapshot is old enough to say so without being asked. */
export function fetchIsStale(
  lastFetchedAt: number | null,
  now: number
): boolean {
  if (lastFetchedAt === null) return true;
  return now - lastFetchedAt > FETCH_STALE_MS;
}

/**
 * Compact age for the Sync control ("3h", "2d") — the same vocabulary the
 * commit rows already use, so it reads as an age and not as a count.
 * Null when nothing has ever been fetched: there is no age to show, and the
 * tooltip says so in words instead.
 */
export function fetchAgeShort(
  lastFetchedAt: number | null,
  now: number
): string | null {
  if (lastFetchedAt === null) return null;
  return formatRelative(lastFetchedAt, now);
}

/**
 * The freshness clause, in prose, for tooltips and menu captions:
 * "last fetched 3 hours ago" / "nothing fetched from a remote yet".
 */
export function fetchAgeNote(
  lastFetchedAt: number | null,
  now: number
): string {
  if (lastFetchedAt === null) return 'nothing fetched from a remote yet';
  return `last fetched ${formatRelativeLong(lastFetchedAt, now)}`;
}

/** Sentence-cased form for the ⋯ menu, where it stands alone as a caption. */
export function fetchAgeCaption(
  lastFetchedAt: number | null,
  now: number
): string {
  if (lastFetchedAt === null) return 'Nothing fetched from a remote yet';
  return `Last fetched ${formatRelativeLong(lastFetchedAt, now)}`;
}

/**
 * The Sync control's tooltip, with the measurement date attached.
 *
 * The clause is appended in EVERY state, not only the stale one. A fresh
 * fetch reads "· last fetched just now", which is reassurance rather than
 * noise; making it conditional would teach the user that its absence means
 * "fresh", which is exactly the inference this work exists to prevent.
 *
 * `undefined` is the third state and it matters: the age has not been read
 * yet. Saying "nothing fetched from a remote yet" during that window would be
 * its own small lie, so the clause is simply omitted until we know.
 */
export function honestSyncTooltip(
  ahead: number,
  behind: number,
  upstream: string | null,
  lastFetchedAt: number | null | undefined,
  now: number
): string {
  const base = syncTooltip(ahead, behind, upstream);
  if (lastFetchedAt === undefined) return base;
  return `${base} · ${fetchAgeNote(lastFetchedAt, now)}`;
}

/**
 * Tooltip for a remote-tracking ref pill in the history list. The pill's
 * whole job is to say "the remote is HERE" — so it carries when we last
 * checked, on the pill itself.
 */
export function remoteRefTitle(
  name: string,
  lastFetchedAt: number | null,
  now: number
): string {
  return `${name} — remote branch, ${fetchAgeNote(lastFetchedAt, now)}`;
}
