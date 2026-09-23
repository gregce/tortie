/**
 * What the menu-bar sentinel is allowed to say.
 *
 * The Zen of Tortie asks one question — "What needs me now?" — so the status
 * menu carries exactly the sessions that are BLOCKED on a human, across every
 * project, newest-blocked first. No counters, no activity, no history: "a
 * number that rises on its own is not a signal, it is noise in a nicer font."
 *
 * Pure functions on plain data so the ordering and the labels are testable
 * without an Electron menu.
 */

import { basename } from 'node:path';
import type { Project, Session } from '@shared/types';

/** One blocked session, as the menu will render it. */
export interface AttentionRow {
  sessionId: string;
  /** "<session> — <project>", ready to be a menu label. */
  label: string;
  /** When this session STARTED needing input (see blockedSince). */
  since: number;
}

/**
 * Track when each session started needing input, so the menu can order by
 * "newest blocked first" like ⌘J does.
 *
 * Main only ever sees the CURRENT status, and the manifest deliberately does
 * not record status transitions (it records durability, not telemetry), so
 * the stamp is process-local and starts fresh with the app — exactly like the
 * renderer's own attentionSince map.
 */
export function blockedSince(
  prev: ReadonlyMap<string, number>,
  sessions: readonly Session[],
  now: number
): Map<string, number> {
  const next = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== 'needs_input') continue;
    next.set(session.id, prev.get(session.id) ?? now);
  }
  return next;
}

/** Blocked sessions across ALL projects, newest-blocked first. */
export function attentionRows(
  sessions: readonly Session[],
  projects: readonly Project[],
  since: ReadonlyMap<string, number>
): AttentionRow[] {
  const nameByPath = new Map(projects.map((p) => [p.path, p.name]));
  return sessions
    .filter((s) => s.status === 'needs_input')
    .map((s) => ({
      sessionId: s.id,
      // A session whose project tab was closed is still blocked and still
      // deserves a name — fall back to the directory the path points at.
      label: `${s.name} — ${nameByPath.get(s.projectPath) ?? basename(s.projectPath)}`,
      since: since.get(s.id) ?? s.createdAt
    }))
    .sort((a, b) => b.since - a.since);
}

// ---------------------------------------------------------------------------
// The wake, and the one age function (Phase 314)
// ---------------------------------------------------------------------------

/**
 * One sleep this process lived through: when the Mac said it was suspending
 * (null when the suspend was never heard, which a resume without one is), and
 * when it said it had resumed. Wall-clock epoch ms, the clock
 * {@link blockedSince} stamps with.
 */
export interface WakeWindow {
  readonly suspendedAt: number | null;
  readonly resumedAt: number;
}

/**
 * How long after a resume a newly seen wait still counts as "seen when the Mac
 * woke". A chosen number, stated as chosen: the poll runs every 2 s with no
 * window focused, a dialog needs two captures to be confirmed, and agents that
 * were frozen by the sleep reach their dialogs seconds after it, so fifteen is
 * about four times the confirm span (`build/p314/SPEC.md` §3.2).
 */
export const WAKE_WINDOW_MS = 15_000;

/**
 * THE ONE AGE FUNCTION. Every surface that draws how long a session has been
 * waiting reads this answer, and nothing else in `src/` compares a stamp with
 * a resume time.
 *
 * Why it exists: the 1 Hz poll does not run while the Mac sleeps, so a wait
 * that began during the sleep, or in the first seconds after it as frozen
 * agents resumed, is first SEEN on the wake tick and stamped then. Its age is
 * therefore the age since the wake, not since it began, and a surface that drew
 * "3 s ago" for it would be lying. `seenAtWake` says so, and the surface draws
 * that instead of an age. A wait stamped before the sleep keeps its true stamp
 * across it, because a sleep does not restart the process, and reads false.
 *
 * Pure. `since` is the stamp itself; it is here so a later rule that moves the
 * number moves it in one place.
 */
export function blockedAge(
  stamp: number,
  wakes: readonly WakeWindow[]
): { readonly since: number; readonly seenAtWake: boolean } {
  const seenAtWake = wakes.some(
    (w) => stamp >= w.resumedAt && stamp <= w.resumedAt + WAKE_WINDOW_MS
  );
  return { since: stamp, seenAtWake };
}

/**
 * The header over the blocked rows, spelled once for main: the menu-bar
 * sentinel's header, and the push alert's count title (`Needs your input (N)`,
 * the same words ⌘J's header draws in the renderer).
 */
export const NEEDS_YOUR_INPUT = 'Needs your input';

/** What the sentinel and the door say when nothing is blocked, spelled once for main. */
export const NOTHING_NEEDS_YOU = 'Nothing needs you';
