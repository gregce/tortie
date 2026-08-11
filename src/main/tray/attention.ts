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
