/**
 * What `machines:remove` does on this Mac, in order (Phase 72, M5, research 51
 * section 4.3; made one transaction in Phase 118).
 *
 * ## The problem this closes
 *
 * Before Phase 72, Settings then Machines then Remove wrote the machines file
 * and forgot the confirmation, and that was all. Every row for that machine
 * left the window with no record of it ever having existed. The sessions
 * themselves went on running on the other computer, so the person was left with
 * work they could not see and Tortie had no way to say what it had last known
 * about it.
 *
 * ## What Phase 118 changed, and it is the whole reason this file has a new name
 *
 * The tombstones were written one durable commit at a time, with a catch around
 * each one. A failure on row 3 of 5 was logged, the loop kept going, and
 * `removeMachineRow` rewrote `machines.json` anyway. The person was left with
 * two rows recorded, three untouched, the machine gone from their list and no
 * way to tell which was which. That is phase 2 of
 * `docs/audits/2026-08-20-electron-typescript-architecture.md`, which the
 * operator ranked P1.
 *
 * Now the removal is TWO steps and the second is unreachable unless the first
 * committed:
 *
 *  1. Every tombstone is written in ONE durable transaction. Any row that fails
 *     rolls the whole transaction back and throws, and nothing else runs.
 *  2. Only then does anything let go: the rows in memory, the feeds, the per
 *     generation memories, the link, the run time, the file and the record.
 *
 * A failed removal leaves every session record exactly as it was and the
 * machine still in the person's list. They read a sentence and press Remove
 * again.
 *
 * ## What this module is, and what it is not
 *
 * It is the ORDER. Most of the work is owned elsewhere: `machineTombstonePlan`
 * composes what would be written, `tombstoneRemoteRows` writes it,
 * `dropMachineRowsFromMemory` lets the rows go, `stopCapturingMachine` ends the
 * saving, and `closeControlPlane` closes the connection. Getting them in the
 * wrong order loses the machine's label, which is the one thing the tombstone
 * cannot get back. So the order lives in one small function with a test on it
 * rather than inside an IPC handler where it would be read as incidental.
 *
 * It also answers the one question the removal question asks, being how many
 * sessions Tortie holds a record of on that machine.
 *
 * ## Nothing is sent to the machine
 *
 * This is the rule the whole gesture is built around, and row 10 of the fault
 * matrix measures it rather than taking it on trust. Removing a machine ends no
 * session, stops no server, reads nothing and writes nothing on the other
 * computer. {@link removeMachineCompletely} returns the number of commands it
 * sent, and that number is a constant zero by construction: nothing on the path
 * below can reach the exec plane.
 *
 * ## What is NOT here
 *
 * No sentence about what a removal RECORDED. The tombstone is data, and the
 * sentences a person reads about it are composed by the surface that draws
 * them, in `src/renderer/settings/machines-copy.ts`, under the copy audit that
 * file carries. Prose stored in a database is prose a later edit cannot fix.
 * The one sentence this file does own is the refusal below, because a refusal
 * is not data: it is what a person reads at the moment nothing happened.
 */

import { gmuxError } from '../errors';
import { getLog } from '../log';
import { closeControlPlane } from './control-plane';
// Phase 117, Phase 68. The agreement a person sealed for this machine. It goes
// with the row, so a machine that comes back later is a machine nobody has
// agreed to yet.
import { forgetMachine } from './confirm';
// Phase 109, fix 7, second half. The machine's context and its generation
// record. Before that phase a removed machine kept both in memory for the life
// of the process, so a context nothing could reach still held the connection
// details of a machine the person had told Tortie to forget.
import { forgetMachineRuntime } from './context';
// Phase 72, Builder B. Capture is connected only, so a machine nobody can
// reach any more is a machine nothing is captured from.
import { stopCapturingMachine } from './remote-capsule';
// Phase 73, Builder A. Reading an agent's own store on a machine is connected
// only for the same reason saving is, so a machine nobody can reach any more is
// a machine nothing is read from. Neither of these deletes anything: a
// conversation id already on a row is a record of a moment that really
// happened, and a copy already on this Mac is what a person reads after the
// machine is gone.
import { stopHarvestingMachine } from './remote-harvest';
import { stopSyncingMachine } from './remote-store-sync';
// Phase 109, fix 7. The two per generation memories a removal used to leave
// behind: the machine's agent answer and its stated home. Neither call sends
// anything to any machine.
import { forgetMachineAgents } from './machine-agents';
import { forgetRemoteMachineHome } from './remote-image';
// Phase 72, Builder A. The one place a remote session meets the manifest.
import {
  remoteRecordsForMachine,
  tombstoneRemoteRows,
  type MachineTombstoneEntry,
  type MarkMachinesForgottenHooks
} from './remote-record';
import {
  dropMachineRowsFromMemory,
  machineTombstonePlan
} from './remote-sessions';
// The file itself. It is rewritten LAST, and only when the transaction above it
// has already committed.
import { removeMachineRow } from './store';

const removalLog = getLog('config');

/**
 * The removal could not be recorded, so nothing was removed.
 *
 * PINNED as `machine.removal-not-recorded` in build/assert-bundle-refusals.mjs.
 */
export const MACHINE_REMOVAL_NOT_RECORDED =
  'Tortie could not record what it knew about that machine, so it removed ' +
  'nothing. Every session record is exactly as it was, and the machine is ' +
  'still in your list. Try again.';

/** What one removal did, in numbers, for the log line and for the harness. */
export interface MachineForgetOutcome {
  /** Manifest rows that became a record of what Tortie last knew. */
  tombstoned: number;
  /**
   * Commands sent to the machine. Always 0.
   *
   * It is returned rather than left implicit, so the fault matrix prints a
   * number instead of a promise.
   */
  commandsSent: 0;
}

// ---------------------------------------------------------------------------
// The fault seam, and it exists only inside a harness launch
// ---------------------------------------------------------------------------

/** Which row the next removal throws before writing, counted from 1. */
let armedFaultRow: number | null = null;

/**
 * HARNESS ONLY. Make the next removal throw before it writes the nth tombstone,
 * inside the transaction, so the rollback is real rather than described.
 *
 * REFUSED unless `GMUX_SMOKE` is set, exactly as `src/main/fault/inject.ts`
 * refuses to arm. A value left in a shell profile cannot reach a person's own
 * app, because nothing outside a harness launch can arm it at all.
 *
 * It is ONE SHOT. The arm clears itself the moment it fires, so the retry the
 * harness makes straight afterwards is the ordinary path.
 *
 * @param nth the row to fail on, counted from 1. `null` disarms.
 */
export function armRemovalFault(nth: number | null): void {
  if ((process.env['GMUX_SMOKE'] ?? '') === '') {
    throw new Error(
      'the removal fault can only be armed inside a harness launch, and this ' +
        'is not one. GMUX_SMOKE is not set.'
    );
  }
  armedFaultRow = nth;
}

/** The hooks for this removal, or nothing at all when no fault is armed. */
function armedHooks(): MarkMachinesForgottenHooks | undefined {
  const nth = armedFaultRow;
  if (nth === null) return undefined;
  return {
    beforeRow: (index: number, entry: MachineTombstoneEntry): void => {
      if (index + 1 !== nth) return;
      // Disarm BEFORE the throw. The transaction rolls back but this variable
      // is not in it, so the retry runs the ordinary path.
      armedFaultRow = null;
      throw new Error(
        `the harness armed a fault on row ${String(nth)} of this removal, ` +
          `which is ${entry.sessionId}`
      );
    }
  };
}

/**
 * How many sessions Tortie holds a live record of on one machine.
 *
 * The removal question counts them out loud, because "Tortie keeps a record of
 * the 2 sessions it knows about there" is a fact a person can check and "some
 * sessions" is not.
 *
 * Rows already tombstoned by an earlier removal of the same machine are NOT
 * counted. They are the record of a machine that was removed once already, and
 * counting them would tell a person they are about to lose sight of work that
 * is already out of sight.
 */
export function machineSessionCount(machineId: string): number {
  return remoteRecordsForMachine(machineId).filter(
    (record) => record.status !== 'discarded'
  ).length;
}

/**
 * Record what Tortie knew about one machine, then let go of it. All, or none.
 *
 * The order is the whole of this function.
 *
 *  1. The plan is composed while `machines.json` still holds the row, because
 *     the tombstone carries the machine's label and the label is in that file.
 *     Composing writes nothing.
 *  2. Every row of the plan is tombstoned in ONE durable transaction. A failure
 *     rolls all of it back and throws {@link MACHINE_REMOVAL_NOT_RECORDED}, and
 *     every line below this one is unreachable.
 *  3. The rows in memory go, with both timers cleared and the link closed.
 *  4. Saving stops for that machine, and so does reading its stores and copying
 *     its conversations (Phase 73).
 *  5. The per generation memories go: which agents it has and where its home is
 *     (Phase 109, fix 7).
 *  6. The connection is closed. It was closed at step 3 as well, and closing a
 *     closed link is nothing, but the order is written out so a later reader
 *     does not have to know that.
 *  7. The run time goes: the machine's context and its generation record.
 *  8. The row leaves `machines.json`.
 *  9. The agreement goes with it.
 *
 * Nothing here sends anything to the machine. The sessions over there keep
 * running, and every tombstone sentence says so.
 *
 * @throws GmuxError FS_FAILED when the record could not be written. Nothing was
 *   removed in that case, on disk or in memory.
 */
export function removeMachineCompletely(
  machineId: string,
  now: number = Date.now()
): MachineForgetOutcome {
  const plan = machineTombstonePlan(machineId, now);
  let tombstoned = 0;
  try {
    tombstoned = tombstoneRemoteRows(plan, armedHooks());
  } catch (err) {
    const detail = `${machineId}: ${(err as Error).message}`;
    removalLog.warn(
      `${machineId} was NOT removed, because what Tortie knew about it could ` +
        `not be recorded: ${(err as Error).message}. ${String(plan.length)} ` +
        `session record(s) are exactly as they were and machines.json was not ` +
        `rewritten.`
    );
    throw gmuxError('FS_FAILED', MACHINE_REMOVAL_NOT_RECORDED, detail);
  }
  dropMachineRowsFromMemory(machineId);
  stopCapturingMachine(machineId);
  stopHarvestingMachine(machineId);
  stopSyncingMachine(machineId);
  forgetMachineAgents(machineId);
  forgetRemoteMachineHome(machineId);
  closeControlPlane(machineId);
  forgetMachineRuntime(machineId);
  removeMachineRow(machineId);
  forgetMachine(machineId);
  removalLog.info(
    `${machineId} was removed and ${String(tombstoned)} session record(s) now ` +
      `say what Tortie last knew. Nothing was sent to that machine.`
  );
  return { tombstoned, commandsSent: 0 };
}
