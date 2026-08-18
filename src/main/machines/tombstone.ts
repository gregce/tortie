/**
 * What `machines:remove` does on this Mac, in order (Phase 72, M5, research 51
 * section 4.3).
 *
 * ## The problem this closes
 *
 * Before this rung, Settings then Machines then Remove wrote the machines file
 * and forgot the confirmation, and that was all. Every row for that machine
 * left the window with no record of it ever having existed. The sessions
 * themselves went on running on the other computer, so the person was left with
 * work they could not see and Tortie had no way to say what it had last known
 * about it.
 *
 * ## What this module is, and what it is not
 *
 * It is the ORDER. Four things have to happen when a machine is removed, and
 * three of them are owned elsewhere: `forgetMachineRows` writes the tombstones
 * and drops the rows, `stopCapturingMachine` ends the saving, and
 * `closeControlPlane` closes the connection. Getting them in the wrong order
 * loses the machine's label, which is the one thing the tombstone cannot get
 * back. So the order lives in one small function with a test on it rather than
 * inside an IPC handler where it would be read as incidental.
 *
 * It also answers the one question the removal question asks, being how many
 * sessions Tortie holds a record of on that machine.
 *
 * ## Nothing is sent to the machine
 *
 * This is the rule the whole gesture is built around, and row 10 of the fault
 * matrix measures it rather than taking it on trust. Removing a machine ends no
 * session, stops no server, reads nothing and writes nothing on the other
 * computer. {@link forgetMachineSessions} returns the number of commands it
 * sent, and that number is a constant zero by construction: nothing on the path
 * below can reach the exec plane.
 *
 * ## What is NOT here
 *
 * No sentence. The tombstone is data, and the sentences a person reads are
 * composed by the surface that draws them, in
 * `src/renderer/settings/machines-copy.ts`, under the copy audit that file
 * carries. Prose stored in a database is prose a later edit cannot fix.
 */

import { closeControlPlane } from './control-plane';
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
// Phase 72, Builder A. The one place a remote session meets the manifest.
import { remoteRecordsForMachine } from './remote-record';
import { forgetMachineRows } from './remote-sessions';

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
 * Record what Tortie knew about one machine, then let go of it.
 *
 * The order is the whole of this function.
 *
 *  1. `forgetMachineRows` writes one tombstone per manifest row and drops the
 *     rows in memory. It runs FIRST because a tombstone carries the machine's
 *     label, and the label is in the file the caller is about to rewrite.
 *  2. Saving stops for that machine, and so does reading its stores and
 *     copying its conversations (Phase 73).
 *  3. The connection is closed.
 *
 * The CALLER removes the row from `machines.json` after this returns. Nothing
 * here sends anything to the machine.
 */
export function forgetMachineSessions(
  machineId: string,
  now: number = Date.now()
): MachineForgetOutcome {
  const tombstoned = forgetMachineRows(machineId, now);
  stopCapturingMachine(machineId);
  stopHarvestingMachine(machineId);
  stopSyncingMachine(machineId);
  closeControlPlane(machineId);
  return { tombstoned, commandsSent: 0 };
}
