/**
 * The two refusals main makes for itself at the lifecycle boundary (Phase 293,
 * findings F2 and B2 of build/p293/SPEC.md §4.9).
 *
 * WHY MAIN ASKS AT ALL. Until the session manager, every surface that could End
 * or Remove a session drew that session in front of the person and acted within
 * a moment of drawing it, and the renderer's own policy was the only gate. The
 * sheet is the first surface where a row sits on screen for minutes while
 * another window, a machine reconnecting or the session itself changes it, and
 * its batch End makes a fresh read and then a call with an await between them.
 * The renderer re-reads at every press, and that closes the stale panel. It
 * cannot close the window between its read and main's write, and it does
 * nothing for a caller that is not the sheet. These two functions close that
 * window for every caller, because they run inside the verb.
 *
 * WHAT EACH ONE STOPS, and both were read off ./core.ts rather than imagined:
 *
 *  - An End that lands on a row another window has just removed. The kill had
 *    no status gate, so it wrote `exited` over `discarded` while `removed_at`
 *    stayed set and the saved output was already deleted. The row silently left
 *    Past Sessions and came back under the managed list with nothing behind it.
 *  - A Remove that lands on a row that has turned live since its menu was
 *    drawn. The tombstone write kills nothing, so the process ran on with no row
 *    pointing at it and its saved output deleted, which is issue 27.
 *
 * PURE, AND A LEAF ON PURPOSE. It reads the two fields it is handed and answers
 * a sentence or null. It reads no store, no feed and no clock, it throws
 * nothing, and it imports no module that can run. ./core.ts owns the throw and
 * the error code, so this file never decides HOW a refusal is delivered, only
 * WHETHER there is one and what it says.
 *
 * THE SENTENCES ARE USER-FACING. The renderer draws main's sentence verbatim,
 * in the sheet's inline panel and in a toast everywhere else, so each one says
 * what did not happen and, where there is one, what to do instead.
 *
 * WHAT IS DELIBERATELY NOT REFUSED, so a later round does not widen this by
 * reflex:
 *
 *  - Ending a `restorable` row. src/main/harness/durability.ts ends leftover
 *    `restorable` rows on purpose and uncaught, the renderer never asks for it,
 *    and the window is one instant wide with a mild consequence. Queued in the
 *    spec's §9 rather than taken.
 *  - Ending or removing a record on ANOTHER machine, whatever it says. A remote
 *    record's status column is what the next launch starts from and not the
 *    truth (`remoteRecordStatus` in ../machines/remote-sessions.ts), and for a
 *    machine that is no longer registered a single confirmed End is the only
 *    way a person can clear the row. That is ruling R11 and it is the
 *    operator's.
 */

// A TYPE, so it compiles to nothing and the manifest's graph is not pulled in.
import type { ManifestSessionRecord } from '../manifest';
// The shared leaf's spelling of "this Mac" rather than `LOCAL_MACHINE_ROW` from
// ../manifest/codecs, which is the same string: that module imports the restore
// layer, and a gate that is pure should not pull a graph in to compare five
// characters. ./__tests__/p293-lifecycle-gate.test.ts holds the two equal.
import { LOCAL_MACHINE_ID } from '@shared/workspace-target';

const END_REFUSED_REMOVED =
  'This session was removed, so there is nothing to end. Nothing was changed.';

const REMOVE_REFUSED_LIVE =
  'This session is still running, so it was not removed. End it first.';

const REMOVE_REFUSED_UNKNOWN =
  'Tortie cannot see whether this session is running, so it was not removed.';

/**
 * May this row be ended? Null means yes.
 *
 * `undefined` passes, and that is not an oversight. A session on another
 * machine that an older Tortie created has no manifest record at all, only a
 * row in that machine's feed, and ending it is the remote branch's work. An id
 * that nothing holds falls through to the verb's own `Session not found.`
 */
export function endRefusal(
  record: Pick<ManifestSessionRecord, 'status'> | undefined
): string | null {
  if (record === undefined) return null;
  return record.status === 'discarded' ? END_REFUSED_REMOVED : null;
}

/**
 * May this row be removed? Null means yes.
 *
 * Asked on the LOCAL path only, and it answers null for a record on another
 * machine anyway, so a caller that asks it somewhere else cannot turn a remote
 * Remove into a refusal by accident. For a session on this Mac the status
 * column IS what every surface draws (`toSession` reads it), so the record is
 * the truth the person was looking at or a newer one.
 *
 * The switch names every status, so a status added to the alphabet is a
 * compile error here rather than a row that may be tombstoned by default.
 */
export function removeRefusal(
  record: Pick<ManifestSessionRecord, 'status' | 'machineId'>
): string | null {
  if (record.machineId !== undefined && record.machineId !== LOCAL_MACHINE_ID) {
    return null;
  }
  switch (record.status) {
    case 'running':
    case 'idle':
    case 'needs_input':
      return REMOVE_REFUSED_LIVE;
    // Unknown state never gains a destructive action. The session server on
    // this Mac did not answer, so nothing here can say the process is gone.
    case 'unknown':
      return REMOVE_REFUSED_UNKNOWN;
    case 'exited':
    case 'restorable':
    // Removing a removed row is what it always was. Nothing offers it, and a
    // refusal here would be a new behaviour nobody asked for.
    case 'discarded':
      return null;
  }
}
