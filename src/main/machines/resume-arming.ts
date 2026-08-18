/**
 * May a restore type the command that continues a conversation? (Phase 72, M5,
 * research 51 section 4.3.)
 *
 * IT IS PURE. It runs no command, opens no database, reads no file and arms no
 * timer. It takes four facts about one manifest row and returns one verdict.
 * Acting on that verdict is the caller's work, and the caller is the remote
 * restore in `./remote-restore.ts`.
 *
 * ## The one rule the whole module exists for
 *
 * > A conversation id Tortie did not collect, or collected on a different
 * > machine, or recorded as anything weaker than exact, is not typed into a
 * > pane.
 *
 * Research 51 section 4.3 states the promise table this rule comes from. A
 * resume id for a session on another machine is DEGRADED AND LABELLED, and the
 * provenance records the weaker source so restore refuses rather than pretends.
 * A restore that types a resume command built from an id nobody can check is how
 * a person is handed somebody else's conversation, and it is how a second agent
 * lands on one conversation.
 *
 * ## THE LOCAL PATH DOES NOT MOVE, and that is arm 1
 *
 * `machineId === 'local'` returns `{ arm: true }` for EVERY other input, by
 * construction rather than by care. The first line of the function is that
 * branch, so no combination of source, confidence or argv length can reach the
 * refusals below from a local row. `./__tests__/resume-arming.test.ts` asserts
 * it over every member of both unions, which is 6 sources times 5 confidences
 * plus the empty argv case.
 *
 * `src/main/restore/restore.ts` is untouched by this phase and nothing in it
 * calls this module. Arm 1 is what makes that safe to say.
 *
 * ## The arm that says yes to a REMOTE row HAS a producer as of Phase 73
 *
 * PHASE 73 (M6) built it. The last arm is reachable only for a remote row whose
 * provenance records `confidence: 'exact'` and a `machineId` equal to the
 * machine being restored on. The connected time store harvest in
 * `./remote-harvest.ts` writes exactly such a record, with
 * `source: 'remote-store-harvest'`, for ONE agent of the thirteen, being muse.
 * muse's key is its own pane key, which the far side reports in its own session
 * list, so the id can be checked rather than guessed. Three more agents get a
 * recorded id at `confidence: 'weak'`, and they take arm 6 and are refused.
 * Every other remote row still records `source: 'remote-not-collected'` and
 * takes arm 4.
 *
 * WHAT THE ARM STILL DOES NOT DO, and it is the honest half. Saying yes is not
 * typing. `./remote-restore.ts` reads this verdict, and this release has no way
 * to type a resume command into a pane on another machine, so it reports
 * `resumeArmed: false` for every row and logs the gap. So a muse conversation
 * on a machine is now PROVABLE and still not CONTINUED. Closing that is the
 * typing half, recorded as owed in the Phase 73 backlog entry.
 *
 * The gate was built one rung before its producer, and this is the reason. The
 * gate that says yes has to exist before the rung that fills it, or the rung
 * that fills it also writes the gate and there is nobody left to disagree with
 * it. The unit test drives both directions.
 *
 * ## Why the empty resume command is not the first question
 *
 * PHASE 72 FIX ROUND. The first cut asked whether the row had a resume command
 * before it asked anything else. At that time no remote row had one, because
 * collecting one was M6 and M6 had not been built. So every remote row answered
 * `nothing-to-arm`, which says nothing to the person, and the arm that tells
 * them their conversation is not coming back was never reached by any row. The
 * order below is still the right one after Phase 73, because the nine agents
 * the harvest cannot prove an id for are still in exactly that position.
 *
 * An empty resume command on a remote row is the SYMPTOM of nothing having been
 * collected rather than evidence that there was nothing to collect. So the
 * question asked first is whether this session keeps a conversation at all,
 * which is a fact about the agent, and the empty command is asked about only
 * after the provenance has had its say.
 */

import type { ResumeProvenance } from '../manifest/agents';
import { LOCAL_MACHINE_ID } from './context';
// The sentence a person reads for the `not-collected` arm. It lives in
// ./remote-copy.ts with every other sentence main prints about a session on
// another machine, and `build/assert-bundle-refusals.mjs` pins it there as
// `machine.resume-not-collected`. One sentence, one home.
import { RESUME_NOT_COLLECTED } from './remote-copy';

// ---------------------------------------------------------------------------
// The verdict
// ---------------------------------------------------------------------------

/** Why a resume command was not typed. */
export type ArmingRefusal =
  /** No resume argv on the row. Nothing was lost, so nothing is said. */
  | 'nothing-to-arm'
  /** A remote row: Tortie never collected a conversation id for it. */
  | 'not-collected'
  /** Provenance recorded a source restore may not act on. */
  | 'weaker-source'
  /** The id was fixed on a different machine from the one being restored on. */
  | 'other-machine';

export interface ArmingVerdict {
  readonly arm: boolean;
  readonly refusal: ArmingRefusal | null;
  /**
   * Null when arming, and null for `nothing-to-arm`.
   *
   * A session with no conversation has lost nothing, so there is nothing to
   * tell a person and a sentence there would invent a problem. The other three
   * refusals each carry one plain sentence, safe to print in the pane, because
   * each of them is a conversation that existed and is not coming back.
   */
  readonly reason: string | null;
}

// ---------------------------------------------------------------------------
// The two sentences this module owns
// ---------------------------------------------------------------------------
//
// The third, for the `not-collected` arm, is `RESUME_NOT_COLLECTED` in
// ./remote-copy.ts and it is imported above rather than restated here.

/**
 * The recorded id is not one Tortie can stand behind.
 *
 * `confidence` is `exact` only when the id was chosen by Tortie or proved by a
 * key that is a true identity. Everything else was separated by time, or
 * accepted by a timer, or never recorded at all. Typing such an id is how a
 * person is handed a conversation that belongs to another session.
 */
export const RESUME_WEAKER_SOURCE =
  'Tortie recorded a conversation id for this session, and it cannot check ' +
  'that the id belongs to this session rather than to another one that ran in ' +
  'the same folder. It will not continue a conversation it cannot prove. The ' +
  'session comes back with its folder and its program.';

/** The id belongs to a different machine than the one being restored on. */
export function resumeOtherMachine(
  recordedMachineId: string,
  targetMachineId: string
): string {
  return (
    `Tortie recorded this conversation id on ${recordedMachineId} and this ` +
    `session is being brought back on ${targetMachineId}. A conversation id ` +
    `means something on the machine it was recorded on and nowhere else, so ` +
    `Tortie will not use it here. The session comes back with its folder and ` +
    `its program.`
  );
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

export interface ArmingFacts {
  /** The row's machine. `local` for this Mac. */
  readonly machineId: string;
  /** The machine the session is being brought back on. */
  readonly targetMachineId: string;
  /**
   * True when this session's agent keeps a conversation at all.
   *
   * False for a plain shell, which has never had one and cannot lose one. The
   * caller decides it, because the agent table is not this module's to read.
   */
  readonly agentKeepsConversation: boolean;
  /** How many words the row's recorded resume command has. */
  readonly resumeArgvLength: number;
  /** Read through `provenanceOf`, never a raw `undefined`. */
  readonly provenance: ResumeProvenance;
}

/**
 * The rules, in order. The FIRST one that matches decides.
 *
 *  1. A local row arms. Always, whatever else is true.
 *  2. A session whose agent keeps no conversation has nothing to arm, and
 *     nothing to say. That is every shell.
 *  3. A provenance recorded on another machine refuses.
 *  4. A provenance that says nothing was ever collected refuses.
 *  5. A row with no resume command left has nothing to arm, and nothing to say.
 *  6. Any confidence other than `exact` refuses.
 *  7. Otherwise arm.
 *
 * The order of 3 before 4 is deliberate. A record naming another machine is the
 * more specific fact, and a person reading "this was recorded on Attic" learns
 * more than a person reading "nothing was collected".
 *
 * The order of 4 before 5 is the fix round's, and the header says why: on a
 * remote row the empty resume command is the symptom of nothing having been
 * collected, so naming the cause tells the person more than saying nothing.
 */
export function resumeArmingVerdict(facts: ArmingFacts): ArmingVerdict {
  // 1. THE LOCAL PATH DOES NOT MOVE. Every local row arms, by construction.
  if (facts.machineId === LOCAL_MACHINE_ID) {
    return { arm: true, refusal: null, reason: null };
  }
  // 2. Not a refusal. A shell has no conversation and never had one.
  if (!facts.agentKeepsConversation) {
    return { arm: false, refusal: 'nothing-to-arm', reason: null };
  }
  const recorded = facts.provenance.machineId;
  // 3. An id fixed somewhere else.
  if (recorded !== undefined && recorded !== facts.targetMachineId) {
    return {
      arm: false,
      refusal: 'other-machine',
      reason: resumeOtherMachine(recorded, facts.targetMachineId)
    };
  }
  // 4. Nothing was ever read, so nothing can be checked. Every remote row whose
  //    agent the Phase 73 harvest cannot prove an id for takes this arm, which
  //    is nine of the thirteen agents plus every row read before Phase 73.
  if (facts.provenance.source === 'remote-not-collected') {
    return {
      arm: false,
      refusal: 'not-collected',
      reason: RESUME_NOT_COLLECTED
    };
  }
  // 5. An agent row whose provenance claims an id and which carries no command
  //    to type. There is nothing to arm and nothing a person lost.
  if (facts.resumeArgvLength === 0) {
    return { arm: false, refusal: 'nothing-to-arm', reason: null };
  }
  // 6. Anything weaker than proven.
  if (facts.provenance.confidence !== 'exact') {
    return {
      arm: false,
      refusal: 'weaker-source',
      reason: RESUME_WEAKER_SOURCE
    };
  }
  // 7. Reached by a muse row the Phase 73 harvest proved on the machine being
  //    restored on. Saying yes here is not typing: see the header.
  return { arm: true, refusal: null, reason: null };
}

/** Every refusal, for the tests and for a reader counting the arms. */
export const ARMING_REFUSALS: readonly ArmingRefusal[] = [
  'nothing-to-arm',
  'not-collected',
  'weaker-source',
  'other-machine'
];
