/**
 * THE PHONE'S END, implemented once (Phase 317, build/p317/SPEC.md §5.4), and
 * the one place the phone's other two writes are composed (Phase 318,
 * build/p318/SPEC.md §5.1.5).
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
 * PHASE 318: `choose` and `say` are DELEGATED, byte for byte, to the reply
 * verbs `../capabilities.ts` hands in (`createReplyVerbs` in
 * `src/main/reply/writer.ts`), so `PocketWrites` stays implemented in exactly
 * one place and this module names nothing that types. `end` and `endOffer`
 * are Phase 317's, unchanged.
 *
 * PHASE 337 (build/p337/SPEC.md §5.4): `keys` is delegated the same way, to
 * the Screen's keys verb (`createScreenKeys` in `src/main/screen/keys.ts`),
 * handed in by `../capabilities.ts`.
 *
 * PHASE 346 (build/p346/SPEC.md §4.7): `start` is delegated the same way, to
 * the phone's start (`createPocketStart` in `./pocket-start.ts`), handed in by
 * `../capabilities.ts`, which re-reads what the phone named and starts the
 * session through the Mac's own one guarded create. This module only passes
 * the call through, and names nothing that starts a process.
 *
 * PHASE 348 (build/p348/SPEC.md §4.2 steps 3 to 6, D6, D47 to D49; his
 * request of 2026-10-18, "when you end a session from the phone you should
 * also have the ability to remove it", which is what changed Phase 317's "No
 * Remove"): `remove` is implemented HERE, beside `end`, and calls the Mac's
 * own Remove, `core.removeSession`, ONCE, then `core.broadcastSessions()`, as
 * the Mac's own `sessions:discard` does (the core's local Remove does not
 * broadcast by itself). It asks BOTH gates the Mac's Remove asks, over the
 * row as it is NOW, in the pure {@link removeVerdict}: main's `removeRefusal`
 * over the manifest record, and the shared gate's `canRemove` over the listed
 * row with a SECOND named environment, `DOOR_REMOVE_GATE_ENV`, whose
 * `canDiscard` is true. For a session on another machine the shared gate is
 * the only lock, because main's gate passes every remote record (ruling R11):
 * a remote row the phone names while it runs is refused here and never
 * tombstoned. `removeOffer` is the verdict passing, in the Mac's own words.
 * `paste` is delegated, as `keys` is, to the Screen's paste verb
 * (`createScreenPaste` in `src/main/screen/paste.ts`).
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

import type { PocketEndConfirm, PocketEndOffer, PocketRemoveReason } from '@shared/ipc/pocket';
import {
  END_FAILED,
  END_UNREACHABLE_TITLE,
  LIFECYCLE_SESSION_CHANGED,
  REMOVE_FAILED,
  removeSessionConfirm,
  SESSION_NOT_FOUND
} from '@shared/lifecycle-words';
import { DOOR_GATE_ENV, DOOR_REMOVE_GATE_ENV, sessionActionGates } from '@shared/session-gates';
import type { Session } from '@shared/types';
import { isGmuxError } from '../errors';
import { machineRow } from '../machines/store';
import type { ManifestSessionRecord } from '../manifest';
import type {
  PocketEndOutcome,
  PocketPasteOutcome,
  PocketRemoveOutcome,
  PocketReplyOutcome,
  PocketStartOutcome,
  PocketWrites
} from '../pocket/routes';
import { endRefusal, removeRefusal } from './lifecycle-gate';

/** Why the phone's End was refused, as the door's answer words it. */
export type PocketEndRefusal = 'removed' | 'unreachable' | 'ended' | 'gone';

/** The verdict over one row as it is now. */
export type PocketEndVerdict =
  | { ok: true }
  | { ok: false; reason: PocketEndRefusal; sentence: string };

/** What the one implementation reads from the session core. Every member but the verbs and the broadcast is a read. */
export interface PocketWritesCore {
  /** Exactly `core.listSessions()`: the rows every surface draws. */
  listSessions(): readonly Session[];
  /**
   * The manifest, for the record main's own gates are asked over. Phase 348
   * widened it to `machineId`, which `removeRefusal` reads (the core satisfies
   * it as it stands).
   */
  readonly manifest: {
    getSession(id: string): Pick<ManifestSessionRecord, 'status' | 'machineId'> | undefined;
  };
  /** The Mac's own End, unchanged: capture, tree read, hang-up, `exited`, broadcast. */
  killSession(sessionId: string): Promise<void>;
  /**
   * The Mac's own Remove, unchanged (Phase 348): the tombstone, the claim
   * released, the saved scrollback and the hook file deleted. Synchronous; it
   * throws `INVALID_INPUT` when main's own gate refuses a local row and
   * `SESSION_NOT_FOUND` for an id nothing holds.
   */
  removeSession(sessionId: string): void;
  /** Every window told the list moved, as `sessions:discard` tells them after a Remove (Phase 348, D10). */
  broadcastSessions(): void;
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

/** Why the phone's Remove was refused, as the door's answer words it (Phase 348): every reason but the door's own `malformed`. */
export type PocketRemoveRefusal = Exclude<PocketRemoveReason, 'malformed'>;

/** The Remove verdict over one row as it is now (Phase 348, D48). */
export type PocketRemoveVerdict =
  | { ok: true }
  | { ok: false; reason: PocketRemoveRefusal; sentence: string };

/**
 * PURE: both of the Mac's Remove gates over the row as it is NOW (Phase 348,
 * build/p348/SPEC.md D48), in this order, each arm saying which gate owns it:
 *
 *   1. no record and no listed row: `gone`, the verb's own `Session not found.`;
 *   2. MAIN'S GATE, `removeRefusal`, over a record it refuses: `unreachable`
 *      when the record is `unknown`, else `changed`, in main's own words (it
 *      passes every record on another machine, ruling R11, and a removed one);
 *   3. no listed row (a removed record is filtered out of the list): `gone`,
 *      the press rule's words;
 *   4. THE SHARED GATE: a row Tortie cannot see is `unreachable`;
 *   5. THE SHARED GATE, `canRemove` with {@link DOOR_REMOVE_GATE_ENV}: a row
 *      that has not ended is `changed`. THE ONLY LOCK ON A REMOTE ROW.
 *
 * A record main has none of (a row an older Tortie made on another machine)
 * passes step 2 and is held by the shared gate alone, as the Mac's own Remove
 * holds it.
 */
export function removeVerdict(
  session: Session | undefined,
  record: Pick<ManifestSessionRecord, 'status' | 'machineId'> | undefined
): PocketRemoveVerdict {
  // THE VERB'S OWN WORDS for an id nothing holds.
  if (session === undefined && record === undefined) {
    return { ok: false, reason: 'gone', sentence: SESSION_NOT_FOUND };
  }
  // MAIN'S GATE, in main's own sentence.
  if (record !== undefined) {
    const refusedByMain = removeRefusal(record);
    if (refusedByMain !== null) {
      return { ok: false, reason: record.status === 'unknown' ? 'unreachable' : 'changed', sentence: refusedByMain };
    }
  }
  // THE PRESS RULE: a record no surface lists any more changed under the press.
  if (session === undefined) return { ok: false, reason: 'gone', sentence: LIFECYCLE_SESSION_CHANGED };
  // THE SHARED GATE: a session Tortie cannot see is never removed.
  if (session.status === 'unknown') {
    return { ok: false, reason: 'unreachable', sentence: END_UNREACHABLE_TITLE };
  }
  // THE SHARED GATE: Remove is offered on an ended session only.
  const canRemove = sessionActionGates(session, session.status, DOOR_REMOVE_GATE_ENV).canRemove;
  if (!canRemove) return { ok: false, reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED };
  return { ok: true };
}

/**
 * What a thrown Remove came to, told apart BY CODE ONLY (Phase 348, D48). No
 * error's text is read:
 *
 *  - `SESSION_NOT_FOUND`: the verb's own `Session not found.`;
 *  - `INVALID_INPUT`: main's own gate refused inside the verb (the row turned
 *    live after the verdict). Main's gate is asked AGAIN, and its sentence is
 *    the answer; when it has none, the Remove failed;
 *  - anything else (a quit that started, say): the Remove failed.
 */
function removeThrownOutcome(err: unknown, core: PocketWritesCore, sessionId: string): PocketRemoveOutcome {
  if (isGmuxError(err, 'SESSION_NOT_FOUND')) {
    return { outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND };
  }
  if (isGmuxError(err, 'INVALID_INPUT')) {
    let again: string | null = null;
    try {
      const record = core.manifest.getSession(sessionId);
      again = record === undefined ? null : removeRefusal(record);
    } catch {
      again = null;
    }
    return again === null
      ? { outcome: 'failed', sentence: REMOVE_FAILED }
      : { outcome: 'refused', reason: 'changed', sentence: again };
  }
  return { outcome: 'failed', sentence: REMOVE_FAILED };
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
  /**
   * The press and the message (Phase 318): the reply verbs, `createReplyVerbs`'s
   * `choose` and `say`, handed in by `../capabilities.ts`. Each answers an
   * outcome and never throws; this module only passes the call through.
   */
  reply: Pick<PocketWrites, 'choose' | 'say'>;
  /**
   * The keys (Phase 337): the Screen's keys verb, `createScreenKeys`'s `keys`,
   * handed in by `../capabilities.ts`. It answers an outcome and never throws;
   * this module only passes the call through.
   */
  keys: Pick<PocketWrites, 'keys'>;
  /**
   * The start (Phase 346): the phone's start, `createPocketStart`'s `start`,
   * handed in by `../capabilities.ts`. It answers an outcome and never throws;
   * this module only passes the call through.
   */
  start: Pick<PocketWrites, 'start'>;
  /**
   * The paste (Phase 348): the Screen's paste verb, `createScreenPaste`'s
   * `paste`, handed in by `../capabilities.ts`. It answers an outcome and never
   * throws; this module only passes the call through.
   */
  paste: Pick<PocketWrites, 'paste'>;
}): PocketWrites & {
  endOffer(session: Session): PocketEndOffer;
  removeOffer(session: Session): PocketEndConfirm | null;
} {
  const machineKnown = deps.machineKnown ?? machineKnownNow;

  const recordOf = (
    core: PocketWritesCore | null,
    id: string
  ): Pick<ManifestSessionRecord, 'status' | 'machineId'> | undefined => {
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
    },

    // PHASE 318. Passed through to the reply verbs, and nothing else.
    choose: (input, still): Promise<PocketReplyOutcome> => deps.reply.choose(input, still),
    say: (input, still): Promise<PocketReplyOutcome> => deps.reply.say(input, still),
    // PHASE 337. Passed through to the Screen's keys verb, and nothing else.
    keys: (input, still): Promise<PocketReplyOutcome> => deps.keys.keys(input, still),
    // PHASE 346. Passed through to the phone's start, and nothing else.
    start: (input, still): Promise<PocketStartOutcome> => deps.start.start(input, still),

    /**
     * PHASE 348 (D49). The Remove offer on one row: the verdict passing, in the
     * Mac's own words (`removeSessionConfirm`), copied field by field; null
     * otherwise. A READ: it asks the two gates and does nothing.
     */
    removeOffer(session: Session): PocketEndConfirm | null {
      const core = deps.core();
      if (core === null) return null;
      const verdict = removeVerdict(session, recordOf(core, session.id));
      if (!verdict.ok) return null;
      const confirm = removeSessionConfirm(session);
      return { title: confirm.title, body: confirm.body, confirmLabel: confirm.confirmLabel };
    },

    /**
     * PHASE 348 (D48). THE PHONE'S REMOVE: the row re-read by id and BOTH
     * gates over it, then the Mac's own Remove and the broadcast, with nothing
     * awaited between the verdict and the verb. It sets no status, kills
     * nothing and sends nothing to any machine (the core's remote branch sends
     * nothing either).
     */
    async remove(input: { sessionId: string }): Promise<PocketRemoveOutcome> {
      const core = deps.core();
      if (core === null) return { outcome: 'failed', sentence: REMOVE_FAILED };
      const sessionId = input.sessionId;
      try {
        const session = core.listSessions().find((s) => s.id === sessionId);
        const verdict = removeVerdict(session, core.manifest.getSession(sessionId));
        if (!verdict.ok) return { outcome: 'refused', reason: verdict.reason, sentence: verdict.sentence };
        // THE MAC'S OWN REMOVE, synchronous, in the statement after the verdict.
        core.removeSession(sessionId);
      } catch (err) {
        return removeThrownOutcome(err, core, sessionId);
      }
      // The Mac's windows and its open Past tab are told, as `sessions:discard`
      // tells them (D10). The session is removed whether or not this lands.
      try {
        core.broadcastSessions();
      } catch {
        // The next broadcast carries it.
      }
      return { outcome: 'done' };
    },

    // PHASE 348. Passed through to the Screen's paste verb, and nothing else.
    paste: (input, still): Promise<PocketPasteOutcome> => deps.paste.paste(input, still)
  };
}
