/**
 * The drift trigger's own decisions (Phase 159), kept pure so a test drives
 * them without a store, a watcher or an Electron.
 *
 * WHAT THIS IS NOT. It is not a scheduler, not a timer and not a second
 * spawn path. The automatic repair rides the check that already ran: the
 * watcher's coalescing window produced one check, the settle window held any
 * downgrade for a second opinion, and only a check that PUBLISHED with
 * nothing held reaches the runner. Everything after that is Phase 158's
 * `ArchPassRunner`, which re-checks the confirm gate at the spawn, refuses
 * `no-drift`, `interval` and `same-input` on its own authority, and spawns
 * through the fold's one shot `runFold`.
 *
 * THE THREE SKIPS HERE ARE THE ONES THE RUNNER CANNOT SEE.
 *
 *  - `no-choice`: no agent is chosen, so nothing may start. The runner would
 *    refuse this too, but it would log a refusal on every check of every
 *    repository with no agent, and the Phase 158 rule is that a project with
 *    no configured agent gets the skeleton and NOTHING ELSE, silently.
 *  - `no-drift`: the same drift the check just counted for the ribbon is
 *    null, so there is nothing to repair. One arithmetic, read once.
 *  - `held`: the settle window is holding a downgrade for a second opinion.
 *    A promise that looks broken on a half written tree never spawns; the
 *    run that follows the hold is the one that fires.
 */

import type { ArchDrift } from '@shared/arch';
import type { ArchDriftFace } from '@shared/ipc';
import type { ArchEnrichImport } from './enrich/compose';

/** Why a finished check did not hand its drift to the runner. */
export type ArchRepairSkip = 'no-choice' | 'no-drift' | 'held';

/** What the trigger reads off one published check. */
export interface ArchRepairReading {
  /** A person has picked an agent and a model for the pass. */
  chosen: boolean;
  /** The subjects the settle window is holding, from `applySettleWindow`. */
  held: readonly string[];
  /** The drift the check counted, or null when nothing drifted. */
  drift: ArchDrift | null;
}

/**
 * The one decision: does this check reach the runner? Null means yes.
 *
 * The order is deliberate. A repository with no agent answers first and
 * silently. The hold comes next, BEFORE the drift, because a held downgrade
 * publishes the previous holding verdict and the drift read over that set
 * is empty: judged the other way round the hold would never be named, and
 * it is the one skip worth a log line, saying a repair may be owed and is
 * deferred until the second opinion. An empty drift with nothing held is
 * silent, since a quiet check is the ordinary case.
 */
export function repairSkipReason(reading: ArchRepairReading): ArchRepairSkip | null {
  if (!reading.chosen) return 'no-choice';
  if (reading.held.length > 0) return 'held';
  if (reading.drift === null) return 'no-drift';
  return null;
}

/** The drift as the load and the check answer it: one number, never a list. */
export function driftFace(drift: ArchDrift | null): ArchDriftFace {
  return { count: drift === null ? 0 : drift.count };
}

/**
 * The resolved first party pairs out of a fact base's imports, which is the
 * slice the composer and the map read. The check already walked the tree, so
 * the trigger never scans again: an unresolved import names something this
 * build could not find, and a repair drafted from it would put a guess in a
 * person's contract.
 */
export function firstPartyPairs(
  imports: readonly { fromPath: string; toPath: string | null }[]
): ArchEnrichImport[] {
  return imports.flatMap((row) =>
    row.toPath === null ? [] : [{ fromPath: row.fromPath, toPath: row.toPath }]
  );
}
