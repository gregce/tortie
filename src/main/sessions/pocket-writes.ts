/**
 * THE PHONE'S END, implemented once (Phase 317, build/p317/SPEC.md §5.4).
 *
 * The phone's door declares what it may ask for (`PocketWrites` in
 * `../pocket/routes.ts`) and cannot name the verb that does it
 * (`conformance:pocket` R3). This module is the one implementation, outside
 * that domain, handed in by `../capabilities.ts`. It does exactly what the
 * Mac's own End does, through the Mac's own verb, after asking BOTH gates the
 * Mac asks, over the row as it is NOW:
 *
 *  - MAIN'S GATE, `endRefusal` (./lifecycle-gate.ts), over the manifest record.
 *    It refuses one status, `discarded`, and it is what catches a row another
 *    window removed a moment ago.
 *  - THE SHARED GATE, `sessionActionGates(…).canEnd` (src/shared/session-gates.ts),
 *    over the listed row. It refuses `exited`, `restorable` and, above all,
 *    `unknown`: a session Tortie cannot see is never ended from a pocket.
 *
 * Neither alone is enough (D7), and `conformance:manager` G2 holds the place
 * where they disagree. The batch adds the Mac batch's ONE narrowing (D14,
 * `batchEligibility` in src/renderer/session-manager/batch-end.ts): a session
 * on a machine Tortie holds no row for draws its RECORDED status, so a single
 * End of it writes `exited` and kills nothing, and a batch must never report
 * Ended for a process it did not touch. The predicate is the Mac batch's,
 * spelled with main's `machineRow` (`../machines/store.ts`). A machine that has
 * stopped answering needs no narrowing here: its rows already read `unknown`,
 * which both arms refuse.
 *
 * ## What this module never does
 *
 * It sets no status: the verb is the one that writes `exited`, exactly as when
 * the person presses End on the Mac, and every window draws it so. It names no
 * other verb. It never reads what an error SAYS: a failure is told apart by
 * its code alone (`isGmuxError`), because a failed command's text can carry its
 * argv, and nothing an error says reaches the phone or a log. It logs nothing.
 */

import type { PocketEndOffer } from '@shared/ipc/pocket';
import {
  END_FAILED,
  END_UNREACHABLE_TITLE,
  LIFECYCLE_SESSION_CHANGED,
  SESSION_NOT_FOUND
} from '@shared/lifecycle-words';
import { DOOR_GATE_ENV, sessionActionGates } from '@shared/session-gates';
import type { Session } from '@shared/types';
import { isGmuxError } from '../errors';
import { machineRow } from '../machines/store';
import type { ManifestSessionRecord } from '../manifest';
import type { PocketEndOutcome, PocketWrites } from '../pocket/routes';
import { endRefusal } from './lifecycle-gate';

/** Why the phone's End was refused, as the door's answer words it. */
export type PocketEndRefusal = 'removed' | 'unreachable' | 'ended' | 'gone';

/** The verdict over one row as it is now. */
export type PocketEndVerdict =
  | { ok: true }
  | { ok: false; reason: PocketEndRefusal; sentence: string };

/** What the one implementation reads from the session core. Every member but the verb is a read. */
export interface PocketWritesCore {
  /** Exactly `core.listSessions()`: the rows every surface draws. */
  listSessions(): readonly Session[];
  /** The manifest, for the record main's own gate is asked over. */
  readonly manifest: {
    getSession(id: string): Pick<ManifestSessionRecord, 'status'> | undefined;
  };
  /** The Mac's own End, unchanged: capture, tree read, hang-up, `exited`, broadcast. */
  killSession(sessionId: string): Promise<void>;
}

/**
 * PURE: both gates over the row as it is NOW, and the batch's one narrowing,
 * in the order of the SPEC's table (§5.4). Each arm says which gate owns it.
 */
export function endVerdict(
  session: Session | undefined,
  record: Pick<ManifestSessionRecord, 'status'> | undefined,
  batch: boolean,
  /** Whether Tortie holds a row for this machine: the Mac batch's `machineKnown`, main's spelling. */
  machineKnown: (machineId: string) => boolean
): PocketEndVerdict {
  // MAIN'S GATE: a removed row has nothing to end.
  const refused = endRefusal(record);
  if (refused !== null) return { ok: false, reason: 'removed', sentence: refused };
  // THE VERB'S OWN WORDS for an id nothing holds.
  if (session === undefined && record === undefined) {
    return { ok: false, reason: 'gone', sentence: SESSION_NOT_FOUND };
  }
  // THE PRESS RULE: a record no surface lists any more changed under the press.
  if (session === undefined) return { ok: false, reason: 'gone', sentence: LIFECYCLE_SESSION_CHANGED };
  // THE SHARED GATE: a session Tortie cannot see is never ended.
  if (session.status === 'unknown') {
    return { ok: false, reason: 'unreachable', sentence: END_UNREACHABLE_TITLE };
  }
  // THE SHARED GATE: End is offered for a live session only.
  const canEnd = sessionActionGates(session, session.status, DOOR_GATE_ENV).canEnd;
  if (!canEnd) return { ok: false, reason: 'ended', sentence: LIFECYCLE_SESSION_CHANGED };
  // THE BATCH'S ONE NARROWING, the Mac batch's own predicate (batch-end.ts).
  if (batch && session.machine !== undefined && !machineKnown(session.machine.id)) {
    return { ok: false, reason: 'unreachable', sentence: END_UNREACHABLE_TITLE };
  }
  return { ok: true };
}

/**
 * PURE: End on one row, as the door carries it. The state is the single End's
 * verdict, and `batch` is whether a batch may end it too.
 */
export function endOfferOf(
  session: Session,
  record: Pick<ManifestSessionRecord, 'status'> | undefined,
  machineKnown: (machineId: string) => boolean
): PocketEndOffer {
  const single = endVerdict(session, record, false, machineKnown);
  if (single.ok) return { state: 'offered', batch: endVerdict(session, record, true, machineKnown).ok };
  if (single.reason === 'unreachable') return { state: 'unreachable', title: single.sentence };
  return { state: 'none' };
}

/** The production answer to "does Tortie hold a row for this machine?". */
function machineKnownNow(machineId: string): boolean {
  return machineRow(machineId) !== null;
}

/**
 * What a thrown End came to, told apart BY CODE ONLY. No error's text is read:
 *
 *  - `SESSION_NOT_FOUND`: the verb's own `Session not found.`, an id nothing
 *    holds any more;
 *  - `INVALID_INPUT`: the race where the row was removed after the verdict and
 *    before the verb's own ask. Main's gate is asked AGAIN, and its sentence
 *    is the answer; when it has none, the End failed;
 *  - anything else: the End failed.
 */
function thrownOutcome(err: unknown, core: PocketWritesCore, sessionId: string): PocketEndOutcome {
  if (isGmuxError(err, 'SESSION_NOT_FOUND')) {
    return { outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND };
  }
  if (isGmuxError(err, 'INVALID_INPUT')) {
    let again: string | null = null;
    try {
      again = endRefusal(core.manifest.getSession(sessionId));
    } catch {
      again = null;
    }
    return again === null
      ? { outcome: 'failed', sentence: END_FAILED }
      : { outcome: 'refused', reason: 'removed', sentence: again };
  }
  return { outcome: 'failed', sentence: END_FAILED };
}

/** The one implementation of the phone's writes, and the offer the rows carry. */
export function createPocketWrites(deps: {
  /** The session core, or null while it has not booted. */
  core: () => PocketWritesCore | null;
  /** Production: `(id) => machineRow(id) !== null`, from ../machines/store.ts. Tests inject. */
  machineKnown?: (machineId: string) => boolean;
}): PocketWrites & { endOffer(session: Session): PocketEndOffer } {
  const machineKnown = deps.machineKnown ?? machineKnownNow;

  const recordOf = (core: PocketWritesCore | null, id: string): Pick<ManifestSessionRecord, 'status'> | undefined => {
    if (core === null) return undefined;
    try {
      return core.manifest.getSession(id);
    } catch {
      return undefined;
    }
  };

  return {
    endOffer(session: Session): PocketEndOffer {
      return endOfferOf(session, recordOf(deps.core(), session.id), machineKnown);
    },

    async end(input: { sessionId: string; batch: boolean }): Promise<PocketEndOutcome> {
      const core = deps.core();
      if (core === null) return { outcome: 'failed', sentence: END_FAILED };
      const sessionId = input.sessionId;
      try {
        // THE ROW RE-READ BY ID, and BOTH gates over it, with nothing awaited
        // between the reading and the verb.
        const session = core.listSessions().find((s) => s.id === sessionId);
        const verdict = endVerdict(session, core.manifest.getSession(sessionId), input.batch, machineKnown);
        if (!verdict.ok) return { outcome: 'refused', reason: verdict.reason, sentence: verdict.sentence };
        // THE MAC'S OWN END, the first await in this function.
        await core.killSession(sessionId);
        return { outcome: 'done' };
      } catch (err) {
        return thrownOutcome(err, core, sessionId);
      }
    }
  };
}
