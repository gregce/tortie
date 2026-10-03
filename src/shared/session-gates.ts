/**
 * What a session offers, decided once, for every process that asks
 * (Phase 317, moved here from src/renderer/state/resume.ts).
 *
 * PHASE 293 PUT THE ONE READING OF WHAT A SESSION OFFERS IN THE RENDERER'S
 * resume.ts, below both the session menu's policy and the session manager,
 * because a state module cannot import an app one and the store's own verbs
 * have to ask the same question the menu asks. The refusal that block kept is
 * the refusal this file keeps: THERE IS NO SECOND ACTION POLICY. The Restore
 * gate was written three times before Phase 293 (session-actions.tsx,
 * TerminalRegion.tsx and split/SplitSurface.tsx) and the third copy had
 * already lost the `machine.canRestore` arm.
 *
 * PHASE 317 MOVED IT ONE LAYER DOWN, TO SHARED, AND REWROTE NOTHING. The
 * phone's door ends a session from main (src/main/sessions/pocket-writes.ts),
 * and main cannot import the renderer. The door asks `canEnd` of this very
 * function over main's own row, beside main's own `endRefusal`, because neither
 * alone is enough: main's catches a removed row, this one catches `exited`,
 * `restorable` and above all `unknown` (build/p317/SPEC.md D7, D8). Every
 * expression below is the one resume.ts carried at 551312f7, moved and not
 * rewritten; `holdsResumableConversation` is exported now only because
 * resume.ts's `resumeNote` still reads it. resume.ts re-exports none of these
 * names, so a missed importer is a compile error and never a second path.
 *
 * `sessionMenuItems` reads this predicate, the sheet's visible button reads
 * it, the batch reads it, every `*Now` verb in the sessions slice asks its own
 * field of it over a fresh row before it touches the bridge, and the phone's
 * door asks `canEnd` of it with {@link DOOR_GATE_ENV}.
 *
 * `conformance:manager` holds it: G1 drives it, G2 drives the End partition
 * against main's `endRefusal` and requires the exact difference, T24 refuses a
 * re-export from resume.ts or a second `sessionActionGates`, T25 reads that
 * the phone asks both. It imports `./types` and nothing else.
 */

import type { Session, SessionStatus } from './types';

/**
 * Phase 26.3, the material rule. An ended session offers Restore only when
 * something exists to bring back. Material means a saved scrollback capsule
 * (main projects `hasSavedScrollback` from the snapshot store) or an armed
 * resume command. An exited row with neither offers only Restart and Remove,
 * because restoring it would produce an empty shell and the verb would lie.
 * Main accepts a restore for any exited row without checking material, since
 * the restore machinery is already honest about missing pieces; this
 * gate exists to keep the offered verb truthful.
 */
export function hasRestoreMaterial(session: Session): boolean {
  return (
    session.hasSavedScrollback === true ||
    (session.resumeArgv?.length ?? 0) > 0
  );
}

/**
 * Whether this session may be brought back without SpecStory.
 *
 * Three facts, all read from the row itself.
 *
 *  - It runs on this Mac. A session on another machine is never captured,
 *    because Phase 91 refuses capture on a machine, so the verb would have
 *    nothing to decline.
 *  - It is captured. `session.capture` is set by main's projection only while
 *    the row's capture record is enabled, so the verb disappears by itself the
 *    moment the choice is made. That disappearance is the feedback that the
 *    choice took, and it needs no extra state in the renderer.
 *  - It has ended. There is nothing to restore or restart while it runs.
 *
 * One predicate, exported once, read by both surfaces so they cannot drift.
 */
export function offersBareRecovery(session: Session): boolean {
  return (
    session.machine === undefined &&
    session.capture !== undefined &&
    (session.status === 'exited' || session.status === 'restorable')
  );
}

// ---------------------------------------------------------------------------
// PHASE 141 — the agent that left. The record and the one predicate that
// draws the Resume verb; every sentence about it stays in resume.ts. None of
// these is a status, and nothing here reaches the dot (refusal 5).
// ---------------------------------------------------------------------------

/**
 * What Tortie can currently say about a session whose agent left.
 *
 * - `left`        — the witnessed process went away and nothing has run in the
 *                   session since. This is the only state that offers the verb.
 * - `returning`   — something is running in the session again and Tortie has
 *                   not yet been told which conversation it is in.
 * - `unconfirmed` — something ran and named a conversation that is not the one
 *                   this row holds, so Tortie did not adopt it.
 *
 * Main reports `none` for a session in none of those states, and the renderer
 * holds no record at all for one, so `none` has no member here.
 */
export type HandbackState = 'left' | 'returning' | 'unconfirmed';

/** One session's handback record, as the renderer holds it. */
export interface SessionHandback {
  state: HandbackState;
  /**
   * Epoch ms of the moment the witnessed process went away, or 0 when Tortie
   * did not see the clock. The card names the time only when it has one.
   */
  leftAt: number;
}

/**
 * Whether this row holds a conversation Tortie could put back: it runs on
 * this Mac, a conversation id was harvested, and a resume command is
 * recorded. These are the three row refusals inside `showsResumeVerb`, split
 * out because `resumeNote` in src/renderer/state/resume.ts asks the same
 * question before it lets a handback sentence claim a conversation is held.
 * One reading, two surfaces, so the tooltip and the word on the row can never
 * disagree.
 */
export function holdsResumableConversation(
  session: Pick<Session, 'machine' | 'agentSessionId' | 'resumeArgv'>
): boolean {
  if (session.machine !== undefined) return false;
  if (session.agentSessionId === undefined) return false;
  return (session.resumeArgv?.length ?? 0) > 0;
}

/**
 * Whether the verb is offered for this session, on the row and in both menus.
 *
 * ONE PREDICATE, READ BY EVERY SURFACE AND BY THE STORE'S OWN VERB, so the word
 * on the row, the row in the native menu and the row in the menu bar can never
 * disagree about whether the verb exists. It lives in this module rather than
 * beside the component because the sessions slice reads it too, and a state
 * module cannot import an app one (Phase 317 moved it from the renderer's
 * resume.ts to here, unchanged).
 *
 * Five conditions, and each one is a refusal that matters.
 *
 *  - The row has a conversation to put back AND a command that carries it.
 *    Main refuses the press with `no-conversation` when the row records no
 *    conversation id, and with `not-composed` when there is no recorded resume
 *    command to type, so a row in either shape used to be offered a word that
 *    could only ever answer a refusal. Research 64 section 6 says droid's verb
 *    is not offered for exactly this reason, and every row whose id was never
 *    harvested is the same shape.
 *
 *  - The session runs on this Mac. A session on another machine has no local
 *    process table, so Tortie never witnessed a process for it and can never
 *    hold a record for one. `resumeMarkLabel` in resume.ts already says
 *    nothing for every remote row for the same family of reasons.
 *  - Main says the agent left AND nothing has run since. `returning` and
 *    `unconfirmed` both mean something is running in that session, and typing
 *    into a session a program owns is how armed text reaches a program in raw
 *    mode. The word goes away for the length of whatever is running and comes
 *    back after, and Tortie says nothing about it either way.
 *  - The session is still alive. A session that has ended offers Restore, and
 *    the two can never appear together: Restore needs the session to be over
 *    and this needs it to be alive.
 *  - Tortie can currently see the session. An `unknown` row is one the session
 *    server did not answer for, and every verb that acts on the tmux side is
 *    withheld from it.
 *
 * NOTHING HERE READS THE SHAPE OF THE SESSION, and that is the whole design. A
 * session Tortie has just restored, sitting with its command armed and
 * unpressed, has an agent on its row, an armed resume command, a running
 * status and a login shell as its own program, which is byte for byte the shape
 * of a session whose agent left. The only thing that separates them is the
 * record, and main holds one only for a process it actually watched.
 */
export function showsResumeVerb(
  session: Pick<Session, 'machine' | 'agentSessionId' | 'resumeArgv'>,
  handback: SessionHandback | undefined,
  status: SessionStatus
): boolean {
  if (!holdsResumableConversation(session)) return false;
  if (handback?.state !== 'left') return false;
  return status !== 'exited' && status !== 'restorable' && status !== 'unknown';
}

// ---------------------------------------------------------------------------
// PHASE 293 — the ONE reading of what a session offers.
// ---------------------------------------------------------------------------

/**
 * What the gates need to know that is not on the row.
 *
 * Three facts about this build and this moment, and the one per-session record
 * that is not a field of `Session`. They are passed in rather than read from
 * the store so the predicate stays pure and a caller that re-reads at a press
 * passes the values it read at that press.
 */
export interface SessionGateEnv {
  /** Whether this build's bridge can restore at all. */
  canRestore: boolean;
  /** Whether this build's bridge can remove at all. */
  canDiscard: boolean;
  /** Phase 81. False until the login shell has said where the tools are. */
  shellPathReady: boolean;
  /** Phase 141. This session's handback record, when main holds one. */
  handback: SessionHandback | undefined;
}

/**
 * Everything a surface may offer for one session, decided once.
 *
 * PRESENCE AND ENABLEMENT ARE TWO FIELDS, ON PURPOSE. The shipped `Remove` row
 * is drawn whenever the row has ended and is greyed when this build cannot
 * discard, and the shipped `Restore` row is drawn when there is something to
 * restore and is greyed until the login shell has answered. A predicate that
 * folded either pair into one field would make a row disappear that the policy
 * draws, and a test that compared two surfaces built on it would pass, because
 * both would share the regression.
 */
export interface SessionActionGates {
  /** Tortie cannot currently see this session. Nothing that acts is offered. */
  unknown: boolean;
  /** A person removed it. Its only verb is coming back. */
  removed: boolean;
  /** `exited` or `restorable`. */
  ended: boolean;
  /** `running`, `idle` or `needs_input`. */
  live: boolean;
  /** It runs on another machine. */
  remote: boolean;
  /** Rename is offered. */
  canRename: boolean;
  /** The Restore row is PRESENT. */
  offersRestore: boolean;
  /** The Restore row is ENABLED. */
  canRestoreNow: boolean;
  /** A removed row can be restored right now. The Past tab's one verb. */
  canRestorePastNow: boolean;
  /** Restart is offered: ended, and on this Mac. */
  offersRestart: boolean;
  /** Phase 119. The two rows that bring a session back without SpecStory. */
  offersBare: boolean;
  /** Phase 141. The row that puts the resume command on the prompt. */
  offersResumeInPlace: boolean;
  /** End is offered, and it is offered for a live session only. */
  canEnd: boolean;
  /** The Remove row is PRESENT. */
  showsRemove: boolean;
  /** The Remove row is ENABLED. */
  canRemove: boolean;
}

/**
 * The gates for one session, from its row, its status and the env.
 *
 * `status` is handed in, because status is main's and every surface reads it
 * through one expression (`effectiveStatusOf` in src/renderer/state/store.ts).
 * This function does not reach for a second one.
 *
 * Every expression below is the one the policy carried at the commit before
 * this phase, moved and not rewritten, with ONE named difference: `removed`. A
 * `discarded` row was neither unknown nor ended, so the policy offered Rename
 * and End session on it. Nothing called the policy with one. The sheet's Past
 * tab is the first caller, and the policy learns the status here rather than
 * the sheet filtering what the policy answers.
 *
 * AN `unknown` ROW GAINS NOTHING THAT ACTS, EVER. It is a session the server
 * did not answer for, and acting on a session that may be alive is how a second
 * agent lands on one conversation (Phase 67).
 */
export function sessionActionGates(
  session: Session,
  status: SessionStatus,
  env: SessionGateEnv
): SessionActionGates {
  const unknown = status === 'unknown';
  const removed = status === 'discarded';
  const ended = status === 'exited' || status === 'restorable';
  const live =
    status === 'running' || status === 'idle' || status === 'needs_input';
  const machine = session.machine;
  const remote = machine !== undefined;
  // A row that may be acted on at all. Every acting field below starts here.
  const acts = !unknown && !removed;
  // Phase 72. A row on another machine reads ONE fact, which main sets only
  // when every condition holds. Phase 26.3, the material rule, decides a row
  // on this Mac.
  const offersRestore =
    acts &&
    env.canRestore &&
    (machine !== undefined
      ? machine.canRestore
      : status === 'restorable' ||
        (status === 'exited' && hasRestoreMaterial(session)));
  return {
    unknown,
    removed,
    ended,
    live,
    remote,
    canRename: acts,
    offersRestore,
    canRestoreNow: offersRestore && env.shellPathReady,
    // A row whose machine a person removed carries `machineGone` and no
    // machine id, by design, so nothing could say where to bring it back.
    canRestorePastNow:
      removed &&
      env.canRestore &&
      env.shellPathReady &&
      session.machineGone === undefined &&
      (machine !== undefined ? machine.canRestore : true),
    // Restart stays absent for every remote row: it ends a session and starts
    // a new one, and the ending half is a verb aimed at another machine.
    offersRestart: ended && !remote,
    offersBare: acts && offersBareRecovery(session),
    offersResumeInPlace: acts && showsResumeVerb(session, env.handback, status),
    canEnd: live,
    showsRemove: ended,
    canRemove: ended && env.canDiscard
  };
}

/**
 * The environment the phone's door asks the gate with (Phase 317). The door asks
 * `canEnd` and nothing else, and `canEnd` reads none of these: a test holds that
 * over every status and every environment.
 */
export const DOOR_GATE_ENV: SessionGateEnv = Object.freeze({
  canRestore: false,
  canDiscard: false,
  shellPathReady: false,
  handback: undefined
});
