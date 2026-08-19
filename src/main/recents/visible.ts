/**
 * Which recent rows a person is allowed to see (Phase 92).
 *
 * ONE FILTER, TWO SURFACES. The home screen reads `recents:list` and the native
 * `File > Open Recent` menu is built in main from the same store. Before this
 * file they read the store directly, and a rule applied in one place would have
 * left the other showing rows the first had dropped. Both now read
 * {@link visibleRecents}, so the two surfaces cannot disagree about which rows
 * exist.
 *
 * WHAT IT DROPS, AND ONLY THIS. A row naming a machine that is no longer in the
 * machines file. Nothing else is filtered. A row whose machine is present but
 * unconfirmed is kept, because confirmation decides whether a read may run and
 * this decides whether a row exists at all. A row whose folder has gone is kept,
 * because that row has a repair the home screen can offer.
 *
 * NOTHING IS DELETED. The row stays in `recents.json`. Forgetting a machine is
 * a deliberate act taken in Settings and a person may reverse it in a minute,
 * so adding the same machine back with the same id brings its rows back. What
 * is not true, and the phase report says so: those hidden rows still occupy one
 * of the 20 slots the file keeps, and nothing prunes them.
 *
 * IT READS MEMORY AND STARTS NOTHING. `currentMachines()` is the snapshot main
 * already holds, so this is safe to call while a native menu template is being
 * built, which is a synchronous pass that must not wait on anything.
 *
 * Direct module imports from ../machines/store, NOT the ../machines barrel, for
 * the reason src/main/menu.ts already records at its own import: the barrel
 * re-exports the whole remote layer and would pull the session feed into the
 * import graph of a menu.
 *
 * Ownership: src/main/recents/**.
 */

import type { RecentProject } from '@shared/ipc';
import { currentMachines, machineLabelOf } from '../machines/store';
import { listRecents, withKnownMachines } from './store';

/** Every machine id in the machines file, confirmed or not. */
export function knownMachineIds(): Set<string> {
  return new Set(currentMachines().rows.map((row) => row.id));
}

/**
 * The rows both surfaces draw, newest first, with forgotten machines dropped.
 */
export function visibleRecents(): RecentProject[] {
  return withKnownMachines(listRecents(), knownMachineIds());
}

/**
 * What a machine is called, for a menu row's sublabel, or null when the machine
 * is not in the file any more.
 *
 * A caller that gets null must drop the row rather than print the id. An id is
 * a word the person never chose.
 */
export function recentMachineLabel(machineId: string): string | null {
  const row = currentMachines().rows.find((one) => one.id === machineId);
  return row === undefined ? null : machineLabelOf(row);
}
