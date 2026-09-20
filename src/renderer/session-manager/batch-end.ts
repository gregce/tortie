/**
 * Phase 293 — batch End: who may be ended together, and the loop that ends them.
 *
 * THERE IS NO BATCH CALL ANYWHERE BELOW THIS FILE, and none was added to main.
 * `sessions:kill` already answers per target with main's own sentence, the
 * confirmation and every gate live in the renderer, and a main-side batch would
 * need a second copy of the policy. So a batch is an ORCHESTRATION over the
 * per-session End, one call at a time, and this module is the whole of it.
 *
 * IT IS PURE OVER WHAT IT IS HANDED. It reads no store, no bridge and no DOM.
 * The list, the capability test, the End call, the stop flag and the report are
 * all dependencies, so every arm below is driven by a test with plain functions
 * and by `conformance:manager` from one plain node. `actions.ts` is where the
 * real ones are bound.
 *
 * THE FIVE RULES THE LOOP KEEPS, each of which has an ablation that turns a
 * test red (build/p293/SPEC.md §7, ablations 1 to 5):
 *
 *  1. A FRESH READ BEFORE EVERY CALL. Never call End on a list that was read for
 *     the target before it. A sheet is the first surface where a row can sit on
 *     screen for minutes while another window, a machine reconnecting or the
 *     session itself changes it.
 *  2. THE TARGET IS FOUND BY SESSION ID. Never by name and never by index: two
 *     sessions may share a name, and a list that lost a row shifts every index.
 *     No dependency is ever handed a name.
 *  3. AN ABSENT ID IS SKIPPED, and End is not called for it. That is what a row
 *     another window took away, a session that was started over and a changed
 *     identity all look like.
 *  4. SKIP AND RECORD, NEVER THROW. One failure never stops the batch: every
 *     iteration is wrapped, and whatever it throws becomes that row's outcome.
 *  5. STOP IS ASKED BEFORE EACH TARGET. Once it answers true, that target and
 *     every later one are recorded `not-run`, and nothing more is ended. A
 *     closed sheet reads as stop (the binding is in `actions.ts`), so nothing
 *     ends out of a person's sight.
 *
 * A BATCH ENDS SESSIONS AND DOES NOTHING ELSE. `End` is the only lifecycle verb
 * this file spells, in its code and in its comments, and `conformance:manager`
 * reads this source as text to hold that. The other verbs are deliberately not
 * written here even to refuse them, because the gate cannot tell a refusal
 * from a call.
 */

import type { Session } from '@shared/types';
import type { LifecycleResult, SessionActionGates } from '../state/resume';
import type {
  BatchRowOutcome,
  BatchSkipReason
} from '../state/session-manager-slice';
import { errorText } from '../state/errors';
import { BATCH_LIST_FAILED } from './copy';

// The slice stores these two, and a state module cannot import this domain, so
// they are declared there and re-exported here, where the domain reads them.
export type { BatchRowOutcome, BatchSkipReason };

/**
 * Whether a batch may end this session, or why it may not.
 *
 * It is the policy's own `canEnd` NARROWED by one named case and never widened.
 * The order of the arms is the order of the table in SPEC §2.10.
 *
 * THE NARROWING. A session on a machine that `machineStates` holds no row for
 * draws its RECORDED status, which can read running for a process nobody has
 * seen in days. Main would "end" it by sending nothing anywhere and writing
 * `exited`. A single, confirmed End keeps that behaviour, because it is the
 * only way a person can clear such a row. A BATCH must never report `Ended` for
 * a process it did not touch, so such a row is never eligible. Before the
 * machines list has loaded `machineKnown` denies every id, and every remote
 * target is skipped, which is the safe direction.
 */
export function batchEligibility(
  session: Session,
  gates: SessionActionGates,
  machineKnown: (machineId: string) => boolean
): 'yes' | BatchSkipReason {
  if (gates.unknown) return 'unreachable';
  if (gates.ended) return 'ended';
  if (session.machine !== undefined && !machineKnown(session.machine.id)) {
    return 'unreachable';
  }
  if (gates.canEnd) return 'yes';
  // Whatever is left is a row the batch has no verb for: one that another
  // window moved to Past Sessions between the naming and the press.
  return 'gone';
}

export interface BatchEndDeps {
  /** The frozen targets, by session ID, in drawn order. */
  targetIds: readonly string[];
  /** Main's truth, read fresh. Null when it could not be read. Never throws. */
  list(): Promise<readonly Session[] | null>;
  /** `batchEligibility` over the SAME gates the confirmation used. */
  eligibility(session: Session): 'yes' | BatchSkipReason;
  /** The per-session End. It answers, it does not throw. */
  end(sessionId: string): Promise<LifecycleResult>;
  /** True once this run should end nothing further. */
  stopRequested(): boolean;
  report(sessionId: string, outcome: BatchRowOutcome): void;
}

export interface BatchEndSummary {
  ended: number;
  skipped: number;
  failed: number;
  notRun: number;
}

/** One target, start to finish. It answers an outcome and never throws. */
async function endOne(
  deps: BatchEndDeps,
  sessionId: string
): Promise<BatchRowOutcome> {
  // NOTHING WITHOUT A SESSION ID IS EVER A TARGET. An empty id cannot occur by
  // type, and this is the last place that refuses one: no read is spent on it
  // and nothing is ended, whatever a list answers for it.
  if (sessionId.length === 0) return { state: 'skipped', reason: 'gone' };
  try {
    // Rule 1. The read belongs to THIS target. A null is a failure of this
    // row alone, and End is not called without a read.
    const sessions = await deps.list();
    if (sessions === null) return { state: 'failed', message: BATCH_LIST_FAILED };
    // Rules 2 and 3. By ID, and an absent id is never ended.
    const session = sessions.find((one) => one.id === sessionId);
    if (session === undefined) return { state: 'skipped', reason: 'gone' };
    // The capability, asked again over the fresh row. `ended` here is also the
    // target that ended by itself while the batch was running.
    const eligible = deps.eligibility(session);
    if (eligible !== 'yes') return { state: 'skipped', reason: eligible };
    deps.report(sessionId, { state: 'ending' });
    const result = await deps.end(sessionId);
    return result.ok
      ? { state: 'ended' }
      : { state: 'failed', message: result.message };
  } catch (err) {
    // Rule 4. Whatever an injected dependency threw is this row's outcome.
    return { state: 'failed', message: errorText(err) };
  }
}

/**
 * End the targets one at a time, in order, and say what happened to each.
 *
 * Sequential on purpose: one fresh read per target only means something when
 * no other End of this batch is in flight beside it.
 */
export async function runBatchEnd(deps: BatchEndDeps): Promise<BatchEndSummary> {
  const summary: BatchEndSummary = { ended: 0, skipped: 0, failed: 0, notRun: 0 };
  let stopped = false;
  for (const sessionId of deps.targetIds) {
    // Rule 5, asked BEFORE the read, so a stop costs no further call at all.
    // Once true it stays true for the rest of the run: a flag that flipped
    // back must not resume a batch a person stopped.
    stopped = stopped || readStop(deps);
    const outcome: BatchRowOutcome = stopped
      ? { state: 'not-run' }
      : await endOne(deps, sessionId);
    if (outcome.state === 'ended') summary.ended += 1;
    else if (outcome.state === 'skipped') summary.skipped += 1;
    else if (outcome.state === 'failed') summary.failed += 1;
    else summary.notRun += 1;
    try {
      deps.report(sessionId, outcome);
    } catch {
      // A report that throws is a drawing problem. The count above is already
      // true, and the next target must not inherit it.
    }
  }
  return summary;
}

/** A stop flag that cannot be read is a stop. Nothing ends on a doubt. */
function readStop(deps: BatchEndDeps): boolean {
  try {
    return deps.stopRequested();
  } catch {
    return true;
  }
}
