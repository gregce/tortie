/**
 * milestones.ts, the startup marks the diagnostics report reads by name
 * (Phase 163).
 *
 * WHAT THIS IS. Seven named moments in the main process, each recorded ONCE
 * through Node's own `performance.mark`, and read back on demand by the
 * diagnostics report. The audit of 2026-08-26 asked for startup milestones
 * from app ready through first attach, and at `5a92d92` none existed anywhere
 * in the tree: `performance.mark` had zero call sites under src/.
 *
 * WHY MARKS AND NOT A CLOCK OF OUR OWN. `performance.mark` stores a name and a
 * `startTime` relative to the process time origin, which is the moment the
 * main process started. So the mark for app ready IS the launch to ready
 * number, with no subtraction and no clock this module has to keep. Reading
 * them is `performance.getEntriesByName`, which is a lookup in a buffer Node
 * already holds. Nothing here allocates on a timer, and nothing here runs
 * unless a boot path reaches a milestone or a report asks.
 *
 * WHY A LATCH. Four of the seven sites can run more than once: the session
 * list is answered on every renderer hydration, the attach host spawns a
 * client per visible session, every terminal chunk passes the onData edge,
 * and a harness can open a second window. A milestone is the FIRST time each
 * happened, so `markMilestone` records once per name and then costs one Set
 * lookup per later call. That lookup is the whole price on the paths that
 * carry it, which is why the onData edge can afford it.
 *
 * WHAT IS NOT HERE. No timer, no interval, no observer, no measurement of
 * anything after boot. A milestone that never happened is absent from the
 * read, never zero, so a report can say "no attach yet" rather than
 * "attached at 0 ms". The refusal in ZEN-OF-TORTIE, no number that rises on
 * its own, is kept by the shape: these numbers are fixed the moment they
 * land.
 */

import { performance } from 'node:perf_hooks';
import {
  DIAGNOSTICS_MILESTONES,
  type DiagnosticsMilestone,
  type DiagnosticsMilestoneName
} from '@shared/ipc';

/**
 * The milestone names, in the order a healthy launch reaches them. They are
 * the contract between the boot paths that mark and the report that reads,
 * and Phase 164 measures its own work against them, so a rename here is a
 * change to a ruler.
 */
export const MILESTONES = {
  /** `app.whenReady()` resolved and the capabilities are installed. */
  appReady: 'app-ready',
  /** The first BrowserWindow reached `ready-to-show`. */
  windowShown: 'window-shown',
  /** The core booted and its first reconcile against tmux finished. */
  sessionsReconciled: 'sessions-reconciled',
  /** The first `sessions:list` answer left main for a renderer. */
  sessionsListed: 'sessions-listed',
  /** The login shell PATH is installed in this process. */
  pathReady: 'path-ready',
  /** The first attach client was spawned for a session. */
  firstAttach: 'first-attach',
  /** The first terminal bytes reached main from that client. */
  firstBytes: 'first-bytes'
} as const satisfies Record<string, DiagnosticsMilestoneName>;

export type MilestoneName = DiagnosticsMilestoneName;

/**
 * Every name, in launch order. It is the shared contract's own list, so the
 * report tab's labels and this module's marks cannot drift apart.
 */
export const MILESTONE_ORDER: readonly MilestoneName[] = DIAGNOSTICS_MILESTONES;

/**
 * One milestone as the report carries it: the name and the milliseconds after
 * the main process started, which is what `performance.mark` records as
 * `startTime`, rounded to a tenth.
 */
export type Milestone = DiagnosticsMilestone;

/** The prefix every mark carries, so a foreign mark can never be read as ours. */
const PREFIX = 'tortie:';

const landed = new Set<MilestoneName>();

/**
 * Record a milestone, once. Later calls with the same name do nothing and
 * cost one Set lookup, which is the price the onData edge pays per chunk.
 * Returns true when this call was the one that landed it.
 */
export function markMilestone(name: MilestoneName): boolean {
  if (landed.has(name)) return false;
  landed.add(name);
  performance.mark(PREFIX + name);
  return true;
}

/** Whether a milestone has landed. Reads the latch, not the buffer. */
export function milestoneLanded(name: MilestoneName): boolean {
  return landed.has(name);
}

/**
 * Every milestone that has landed, in launch order, with its time since the
 * process started. Names that never landed are absent rather than zero.
 */
export function readMilestones(): Milestone[] {
  const out: Milestone[] = [];
  for (const name of MILESTONE_ORDER) {
    if (!landed.has(name)) continue;
    const entry = performance.getEntriesByName(PREFIX + name, 'mark')[0];
    if (entry === undefined) continue;
    out.push({ name, atMs: Math.round(entry.startTime * 10) / 10 });
  }
  return out;
}

/**
 * Tests only. Clears the latch and the marks so a test can land them again.
 * There is no product path that clears a milestone, because a milestone is
 * a fact about this launch.
 */
export function resetMilestonesForTests(): void {
  for (const name of landed) performance.clearMarks(PREFIX + name);
  landed.clear();
}
