/**
 * Whether a session on another machine may be brought back (Phase 72, M5,
 * research 51 sections 4.3 and 4.6).
 *
 * IT IS PURE. It runs no command, opens no database, reads no file and touches
 * no map. It takes six facts and returns one verdict. Gathering the facts is
 * `./remote-sessions.ts`'s work and acting on the verdict is
 * `./remote-restore.ts`'s, and both of those can be wrong without this table
 * being wrong, which is why the table is on its own.
 *
 * ## The one failure this exists to stop
 *
 * Research 28 ranks one remote failure above every other: two agents on one
 * conversation. It happens when Tortie offers to bring back a session that never
 * stopped running, a person presses the verb, and a second process starts on the
 * same folder and the same conversation store. Both then write. There is no
 * undo.
 *
 * So restore is offered only when ALL of these hold, and the first one that
 * fails is the sentence the person reads:
 *
 *  1. The machine is still in `machines.json`.
 *  2. The row's recorded machine is the machine being restored on.
 *  3. Tortie has signed in to that machine in this run and read its program
 *     search list.
 *  4. Tortie has a route to that machine right now.
 *  5. A list from that machine completed in this run, and the machine answered
 *     the last time Tortie asked.
 *  6. That machine's own last completed list does NOT hold this session.
 *
 * Condition 6 is the double run guard. Conditions 4 and 5 are what stop a lost
 * link being read as a death. Conditions 1, 2 and 3 are what stop Tortie
 * composing a command for a computer it cannot name.
 *
 * ## Condition 4 is about a ROUTE, and never about one kind of route
 *
 * PHASE 72 FIX ROUND. This arm used to ask whether the live connection to the
 * machine was up, and that was wrong in the one case restore exists for. The
 * live connection is opened only after a read proves the machine's own session
 * server is already running, because opening it against a machine with no
 * server would CREATE one with none of Tortie's settings on it. So a machine
 * whose server has died can never have a live connection, and asking for one
 * refused restore for ever in exactly the case research 51 section 4.4 requires
 * it to be offered. Measured by fault matrix row 7 twice: the row became
 * restorable in about 5.1 s and the restore was then refused.
 *
 * A completed list over the other route proves the machine is there just as
 * well, and it is the route the restore itself uses. So the fact is
 * {@link RemoteRestoreFacts.machineReachable}, which is true when either route
 * answered, and the two arms below stay apart:
 *
 *   no-route  neither route answered, so Tortie cannot reach the machine at all
 *   unseen    a route is up and no completed list has come back from it yet
 *
 * ## Why the order of the arms is fixed
 *
 * Several conditions fail at once in ordinary situations. A machine a person
 * removed is also a machine with no route and no completed list, so all of
 * `forgotten`, `not-ready`, `no-route` and `unseen` are true of it. A person
 * reads ONE sentence, so the order decides which one, and the order runs from
 * the fact the person can act on to the fact they can only wait out.
 */

import type { SessionStatus } from '@shared/types';
import {
  MACHINE_NOT_READY,
  RESTORE_FORGOTTEN,
  RESTORE_STILL_RUNNING,
  RESTORE_UNSEEN,
  RESTORE_WRONG_MACHINE
} from './remote-copy';

/** Why a restore is not offered. One id per condition, for the log and the tests. */
export type RemoteRestoreRefusal =
  /** The machine is not answering, or no completed list has been read yet. */
  | 'unseen'
  /** Neither route to this machine answered, so there is no way to reach it. */
  | 'no-route'
  /** The far side still lists a session carrying this id. */
  | 'running'
  /** The row's machine is not the machine being restored on. */
  | 'wrong-machine'
  /** The machine is no longer in machines.json. */
  | 'forgotten'
  /** No signed in connection for this machine, or no program list for it. */
  | 'not-ready';

/** Every refusal id, in the order the arms are asked. For the tests and the gate. */
export const REMOTE_RESTORE_REFUSALS: readonly RemoteRestoreRefusal[] = [
  'forgotten',
  'wrong-machine',
  'not-ready',
  'no-route',
  'unseen',
  'running'
];

export interface RemoteRestoreVerdict {
  readonly offered: boolean;
  /** Null when offered. One plain sentence otherwise. */
  readonly reason: string | null;
  /** Null when offered. The refusal id, for the log and the tests. */
  readonly refusal: RemoteRestoreRefusal | null;
}

/** The six facts, each one gathered by exactly one caller. */
export interface RemoteRestoreFacts {
  /** True while a row for this machine is in machines.json. */
  readonly machineKnown: boolean;
  /** True once a signed in connection AND a program search list exist for it. */
  readonly contextReady: boolean;
  /**
   * True while Tortie has a route to that machine.
   *
   * EITHER route counts. It is the machine's live connection being up, or that
   * machine's last pass having completed over the command route, which is the
   * route a restore itself uses. See the header for why one route alone was the
   * wrong question.
   */
  readonly machineReachable: boolean;
  /** True once any list from that machine COMPLETED in this run. */
  readonly completedListSeen: boolean;
  /** True when the last pass completed, whatever it found. */
  readonly machineAnswering: boolean;
  /** True when that machine's last completed list held a session with this id. */
  readonly listedNow: boolean;
  /** The machine the row was created on. */
  readonly rowMachineId: string;
  /** The machine the restore would run on. */
  readonly targetMachineId: string;
  /** The status the row currently reads. */
  readonly rowStatus: SessionStatus;
}

/** The verdict, offered or refused with one sentence. Pure. */
export function remoteRestoreVerdict(
  facts: RemoteRestoreFacts
): RemoteRestoreVerdict {
  // 1. A machine a person removed. It is first because it is the only arm whose
  //    cause is something the person did, and the fix is theirs: add the machine
  //    again. Every arm below is also true of a removed machine, and none of
  //    them would tell the person that.
  if (!facts.machineKnown) {
    return refused('forgotten', RESTORE_FORGOTTEN);
  }
  // 2. The row belongs to a different machine. Asked before anything about the
  //    link, because it is true whether or not either machine is reachable, and
  //    a link sentence would send the person to fix the wrong thing.
  if (facts.rowMachineId !== facts.targetMachineId) {
    return refused('wrong-machine', RESTORE_WRONG_MACHINE);
  }
  // 3. Nobody signed in to it in this run, or its program search list was never
  //    read. The person can fix this from Settings and then Machines.
  if (!facts.contextReady) {
    return refused('not-ready', MACHINE_NOT_READY);
  }
  // 4. Neither route answered. Below `not-ready` because a machine that was
  //    never prepared has no route either, and "prepare it" is the useful half
  //    of that pair. A machine whose own session server has died still has a
  //    route, so it passes here and its rows may come back, which is the case
  //    research 51 section 4.4 requires and the case restore exists for.
  if (!facts.machineReachable) {
    return refused('no-route', RESTORE_UNSEEN);
  }
  // 5. Nothing completed, or the last pass did not. A row reading `unknown` can
  //    never get past here: `unknown` is written by exactly the events that also
  //    set `machineAnswering` false, and the status is asked again anyway so
  //    that a later edit to one of the two cannot open this arm on its own.
  if (
    !facts.completedListSeen ||
    !facts.machineAnswering ||
    facts.rowStatus === 'unknown'
  ) {
    return refused('unseen', RESTORE_UNSEEN);
  }
  // 6. The double run guard, and it is last because it is the only arm that
  //    needs every fact above to be true before its answer means anything. A
  //    list Tortie could not read holds nothing, and reading that as "not
  //    running" is the exact mistake the five arms above exist to prevent.
  if (facts.listedNow) {
    return refused('running', RESTORE_STILL_RUNNING);
  }
  return { offered: true, reason: null, refusal: null };
}

function refused(
  refusal: RemoteRestoreRefusal,
  reason: string
): RemoteRestoreVerdict {
  return { offered: false, reason, refusal };
}
