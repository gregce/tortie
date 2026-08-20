/**
 * The pure reconcile decisions (Phase 42 stage 5, audit 2026-08-14).
 *
 * The reconcile loop in core.ts is orchestration: list live tmux sessions,
 * probe identities, hand the pair to the manifest's reconcile, rebuild the id
 * maps and broadcast. Every judgement inside that loop that can be stated
 * without an exec or a database is stated here instead, so each rule has a
 * direct test and the loop reads as the sequence it is.
 *
 * The four decisions Phase 19 and Phase 29 had already extracted as pure
 * functions (restore status, claim strength, the snapshot pass notice) moved
 * here with their tests' import path preserved through core.ts, because they
 * are the same kind of thing: what recorded state may claim, decided without
 * a booted core.
 *
 * Nothing in this module touches tmux, SQLite, the filesystem or a timer.
 */

import type { SnapshotFailedNotice } from '@shared/notice';
import type { SessionRestore, SessionStatus } from '@shared/types';
import { IDENTITY_HARVEST_KEYS } from '../manifest';
import type { ClaimStrength, ManifestSessionRecord } from '../manifest';
// Type only, so this module still touches no tmux code at runtime.
import type { ServerProbeVerdict } from '../tmux/errors';
// Type only, for the same reason. The reason word the pass logs is the one the
// capsule already records, so there is one vocabulary rather than two.
import type { SnapshotReason } from '../restore';
// Phase 71. The id this Mac is registered under, imported rather than written
// again, so there is ONE definition of the word `local` on the reconcile path.
// It is a plain string constant; nothing is started by reading it.
import { LOCAL_MACHINE_ID } from '../machines/context';

// ---------------------------------------------------------------------------
// Phase 19 item 4 — a capture pass that could not write says so once
// ---------------------------------------------------------------------------

/** One session a capture pass could not write, and why. */
export interface UnwrittenSnapshot {
  /** The session's display name. For the log line, never for the notice. */
  name: string;
  /** True when the durable writer reported the volume was full. */
  outOfSpace: boolean;
}

/**
 * The notice one capture pass owes the user, or null when it owes none.
 *
 * Exported and pure because the decision is the part worth pinning: how many
 * failures become how many notices, and when the notice may claim the volume
 * is full. The posting and the logging are the caller's.
 *
 * ONE notice for the whole pass. A full volume fails every session in the pass
 * with the same error, and forty three copies of one sentence is a dashboard.
 * `outOfSpace` is true when ANY failure in the pass was out of space, because
 * that is the one cause the user can clear, and a pass that hit it has hit the
 * end of the disk whatever else also failed.
 */
export function snapshotFailureNotice(
  unwritten: readonly UnwrittenSnapshot[]
): SnapshotFailedNotice | null {
  if (unwritten.length === 0) return null;
  return {
    kind: 'snapshot-failed',
    sessions: unwritten.length,
    outOfSpace: unwritten.some((one) => one.outOfSpace)
  };
}

// ---------------------------------------------------------------------------
// Phase 111 — a capture pass that says what it did
//
// The pass has four ways to write nothing and, until this phase, three of them
// left no trace at all. Only a DurableWriteError was ever reported. A row
// skipped for its status, a row with no live binding on this Mac, and a pane
// with an empty screen all passed in silence. That silence is why the nightly
// durability lane read red for two days with nothing able to say which of the
// three had happened, so the pass now accounts for itself in one line.
//
// COUNTING IS NOT NAMING, and the two rules are deliberately different. Every
// row is counted. Only a row that had a live pane on this Mac and still ended
// with nothing saved is named, being an empty screen or a write that threw.
// A row that was never a candidate for a capture is counted and not named.
// There are two of those, being a row whose status is not a live one and a row
// that is live on a different machine, and neither is a loss. Naming them cost
// the line the only thing it exists to print. A manifest holds every session a
// person ever ran, so the names of long-finished rows fill the whole budget
// before the one real failure is reached, and a session running fine on
// another Mac reads as lost under the heading "Not written". The decision is
// made here, in `NAMED_OUTCOMES`, so that no call site can get it wrong.
//
// It adds no user-facing notice and it changes none. The Phase 19 item 4 rule
// above is untouched: one notice per pass, and only for a write failure.
// ---------------------------------------------------------------------------

/** At most this many names are printed before the count takes over. */
const UNWRITTEN_NAME_CAP = 8;

/**
 * Every way one row can leave a capture pass. Each row lands in exactly one.
 *
 * - `written`: the capsule is on disk.
 * - `nothingOnScreen`: the capture resolved false. On this pass that means the
 *   pane was live and its screen was empty, so there was nothing to save, and
 *   an empty screen is the only producer of false that reaches here.
 *   `storeCapsuleLocked` also returns false when a remote capture repeats a
 *   body it already holds. That path does not run in this pass. A later phase
 *   that routes a remote capture through here has to add a member rather than
 *   reuse this one, because the words below would be wrong for that row.
 * - `notRunning`: the row's status is not a live one, so the pass never looked
 *   at a pane. A row the person discarded is counted here too.
 * - `noPaneHere`: the row is live, and it is live on another machine, so this
 *   Mac holds no binding for it.
 * - `failed`: a capture or a write threw.
 */
export type SnapshotOutcome =
  | 'written'
  | 'nothingOnScreen'
  | 'notRunning'
  | 'noPaneHere'
  | 'failed';

/** What one row did in a capture pass. */
export interface SnapshotPassResult {
  name: string;
  outcome: SnapshotOutcome;
}

/**
 * The phrase each outcome is named with, or null for the ones only counted.
 *
 * This table is the naming rule from the header, written once. An outcome
 * added without an answer here is a compile error, rather than a line that
 * quietly buries the failure it was written to show.
 */
const NAMED_OUTCOMES: Record<SnapshotOutcome, string | null> = {
  written: null,
  nothingOnScreen: 'nothing on screen',
  notRunning: null,
  noPaneHere: null,
  failed: 'could not be written'
};

/**
 * The one line a capture pass owes the log, built from its own results.
 *
 * Pure. It returns a string and logs nothing, which is what makes the wording
 * testable without a booted core. The caller does the writing.
 *
 * The caller hands over one result per row and nothing else. Which outcomes
 * get a name, and how many names one line may carry, are both settled here.
 */
export function snapshotPassLine(
  reason: SnapshotReason,
  results: readonly SnapshotPassResult[]
): string {
  const counts: Record<SnapshotOutcome, number> = {
    written: 0,
    nothingOnScreen: 0,
    notRunning: 0,
    noPaneHere: 0,
    failed: 0
  };
  const names: string[] = [];
  for (const one of results) {
    counts[one.outcome] += 1;
    const phrase = NAMED_OUTCOMES[one.outcome];
    if (phrase !== null) names.push(`"${one.name}" (${phrase})`);
  }
  const total = results.length;
  let line =
    `scrollback pass (${reason}) over ${total} ` +
    `${total === 1 ? 'session' : 'sessions'}: ` +
    `${counts.written} written, ` +
    `${counts.nothingOnScreen} had nothing on screen, ` +
    `${counts.notRunning} were not running, ` +
    `${counts.noPaneHere} had no pane on this Mac, ` +
    `${counts.failed} could not be written.`;
  if (names.length > 0) {
    const shown = names.slice(0, UNWRITTEN_NAME_CAP);
    const rest = names.length - shown.length;
    line +=
      ` Not written: ${shown.join(', ')}` +
      `${rest > 0 ? `, and ${rest} more` : ''}.`;
  }
  return line;
}

// ---------------------------------------------------------------------------
// Phase 19 item 6 — what a restore achieved, and what it may therefore claim
//
// `restoreSessionInTmux` runs three stages that fail independently: create the
// tmux session, replay the saved scrollback, and arm the resume command. Two of
// them only warn when they throw. core.ts used to destructure `info` out of
// the result, drop the other two fields on that line, and write
// `status: 'running'`. A restore whose replay and arming had both thrown was
// stored and broadcast as a healthy working session.
//
// The result now arrives as the discriminated union in restore.ts, whose failed
// arm carries no `info`, so dropping the stage results is a compile error. The
// record stored on the row is `SessionRestore` from src/shared/types.ts, which
// is the same shape the renderer reads. There is one description of a restore
// rather than three.
// ---------------------------------------------------------------------------

/**
 * The status a restored session is allowed to claim, derived from the stage it
 * reached rather than assigned.
 *
 * `running` is not in the range of this function, and that is the point of it.
 * A restored pane holds a fresh interactive shell sitting at a prompt. Nothing
 * is executing. The resume command is TYPED and deliberately not sent, so even
 * the best case has not started the conversation. `running` was a claim about
 * work in progress, and it was made just as loudly when every stage had
 * thrown.
 *
 * `idle` is what the pane is: alive and quiet. The activity oracles move the
 * row to `running` a tick later if the session starts behaving like it, and
 * that observation is the only evidence the word is allowed to rest on. How
 * much of the session came back is a different fact and rides on
 * `Session.restore`, which is why it does not multiply this alphabet.
 *
 * `failed` and `interrupted` never reach here. Nothing was created for them,
 * so the row keeps the status it already had — 'restorable', or 'exited' for
 * an ended session restored under Phase 26.3 (the caller records the outcome
 * without touching status on that path). The switch has no `default`, so a
 * new member of `RestoreResultKind` is a compile error here rather than a
 * silent fall through to a status nobody chose.
 */
export function restoredStatus(result: SessionRestore): SessionStatus {
  switch (result.kind) {
    // Nothing was created. The caller throws before this is asked, and the
    // row keeps its own status (recordRestoreOutcome writes no status), so
    // this arm's value is never stored over an 'exited' row.
    case 'failed':
    case 'interrupted':
      return 'restorable';
    // Alive with no scrollback replayed. The user got their folder back.
    case 'shell_only':
      return 'idle';
    // The scrollback replayed as inert text above a fresh prompt.
    case 'transcript':
      return 'idle';
    // The scrollback replayed and the resume command is typed, waiting on
    // Enter. Still not running: the user has not pressed it.
    case 'armed':
      return 'idle';
  }
}

/**
 * How strongly a row's recorded conversation id may be claimed (Phase 32,
 * extracted in Phase 29 for the restore path, widened in Phase 34).
 *
 * The strength follows the KEY that recorded the id, exactly as a live
 * acceptance does, so a restart cannot turn a takeable claim into an
 * immovable one. Four answers:
 *
 *  - a grace GUESS stays 'provisional', because freezing it would preserve a
 *    live mis-assignment forever;
 *  - a folder key such as 'cwd-newest' reads 'matched', because a folder is
 *    not an identity and the session that can prove ownership must still be
 *    able to take the id back after a reboot;
 *  - an identity key reads 'confirmed';
 *  - a row with NO key reads 'confirmed', because an id Tortie pre-assigned
 *    was never a guess about which record belongs to whom.
 *
 * Two callers share this, being the boot claim loop and `restoreSession`
 * re-acquiring the claim a Remove released, so the answer cannot drift
 * between them.
 */
export function claimStrengthOf(rec: ManifestSessionRecord): ClaimStrength {
  const p = rec.resumeProvenance;
  if (p === undefined) return 'confirmed';
  if (p.viaGraceTimer === true || p.confidence === 'grace-accepted') {
    return 'provisional';
  }
  if (p.key === undefined) return 'confirmed';
  return IDENTITY_HARVEST_KEYS.has(p.key) ? 'confirmed' : 'matched';
}

// ---------------------------------------------------------------------------
// The reconcile loop's own judgements (extracted from identify/refresh)
// ---------------------------------------------------------------------------

/** The two identity facts identify() reads off one live tmux session. */
export interface LiveIdentityFacts {
  /** Immutable tmux `$-id`. */
  sessionId: string;
  /** The `@gmux-id` user option, when the session carries one. */
  gmuxId?: string | undefined;
}

/**
 * Whether one live session's identity is worth one `show-environment` exec.
 *
 * True only when the `@gmux-id` option is missing or names no manifest row,
 * AND the session has not already been proven foreign. A pane's env is fixed
 * at create, and `$-id`s are never reused, so one probe settles a session
 * forever; the foreign memo is what keeps every later refresh from re-probing
 * every foreign session on the socket.
 */
export function identityProbeNeeded(
  info: LiveIdentityFacts,
  known: ReadonlySet<string>,
  foreign: ReadonlySet<string>
): boolean {
  return (
    (info.gmuxId === undefined || !known.has(info.gmuxId)) &&
    !foreign.has(info.sessionId)
  );
}

/** What one env probe proved: ours (adopt this id) or not ours (memoise). */
export type IdentityProbeVerdict =
  | { kind: 'adopted'; gmuxId: string }
  | { kind: 'foreign' };

/**
 * Judge the `GMUX_SESSION_ID` pane-env stamp, the second identity source.
 *
 * Adopt only an id the manifest actually knows. A session carrying NEITHER
 * stamp, or a stamp naming no row, is not ours — gmux leaves it strictly
 * alone (the tmux safety rule, not a heuristic).
 */
export function identityProbeVerdict(
  fromEnv: string | null,
  known: ReadonlySet<string>
): IdentityProbeVerdict {
  return fromEnv !== null && known.has(fromEnv)
    ? { kind: 'adopted', gmuxId: fromEnv }
    : { kind: 'foreign' };
}

/**
 * The bindings a reconcile must carry forward for rows it refused to judge
 * (Phase 16.5.1).
 *
 * A row reconcile skipped keeps the binding createSession / restoreSession
 * already recorded for it: the id map is the one thing that answers "which
 * tmux session do I attach to", and dropping it would fail the attach just as
 * surely as the 'restorable' flip did. A tmux id the reconcile already bound
 * (`taken`) is never bound twice, and neither is one an earlier skipped row
 * in the same pass already kept.
 */
export function retainedBindings(
  skippedIds: readonly string[],
  previousLive: ReadonlyMap<string, string>,
  taken: ReadonlySet<string>
): readonly (readonly [sessionId: string, tmuxId: string])[] {
  const used = new Set(taken);
  const out: [string, string][] = [];
  for (const id of skippedIds) {
    const tmuxId = previousLive.get(id);
    if (tmuxId === undefined || used.has(tmuxId)) continue;
    used.add(tmuxId);
    out.push([id, tmuxId]);
  }
  return out;
}

/**
 * Creates that can no longer be in progress. `tmux new-session` answers in
 * milliseconds, so a minute is generous by orders of magnitude — this exists
 * only so a create that threw between writing the row and spawning the
 * process cannot exempt that row from reconcile for the rest of the app's
 * life, which would leave a dead session reading 'running' and never offer it
 * for restore.
 */
export function staleCreateIds(
  createsInFlight: ReadonlyMap<string, number>,
  now: number,
  maxAgeMs: number
): string[] {
  const cutoff = now - maxAgeMs;
  const out: string[] = [];
  for (const [id, startedAt] of createsInFlight) {
    if (startedAt < cutoff) out.push(id);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Phase 67 — the per-machine reconcile boundary (research 51 §4.3, §4.4, M0)
// Phase 71 — the boundary becomes real: more than one machine can be reconciled
// ---------------------------------------------------------------------------

/**
 * The id of a machine this build reconciles.
 *
 * PHASE 67 WROTE THIS AS THE LITERAL TYPE `'local'`, because there was one
 * machine and the boundary was being adopted before there was anything to
 * separate. Phase 71 widens it, and the widening is the point of the rung: the
 * judgements below now take a machine id and move that machine's rows and no
 * other machine's.
 */
export type MachineId = string;

/**
 * This Mac. It is not a machine row, and it is the only value this release
 * writes into the manifest's `machine_id` column.
 */
export const LOCAL_MACHINE: MachineId = LOCAL_MACHINE_ID;

/** What one list attempt proved, reduced from the exec outcome. */
export type ListAttemptOutcome =
  /** The list completed. Reconcile normally. */
  | { kind: 'listed' }
  /** A completed probe confirmed death. Reconcile against the empty list. */
  | { kind: 'no-server' }
  /** Nothing was proven. Produce 'unknown', never 'restorable'. */
  | { kind: 'unreachable' };

/**
 * Reduce one list attempt to what it PROVED.
 *
 * `verdict` is null when the exec ran to completion, and otherwise carries the
 * judgement `serverProbeVerdict` passed on the failure. The whole point of the
 * three-way answer is that "the exec failed" and "the server is dead" are
 * different facts, and the old code had only one branch for both.
 */
export function listAttemptOutcome(
  verdict: ServerProbeVerdict | null
): ListAttemptOutcome {
  if (verdict === null) return { kind: 'listed' };
  return verdict === 'no-server'
    ? { kind: 'no-server' }
    : { kind: 'unreachable' };
}

/**
 * The rows an unreachable verdict may write 'unknown' on.
 *
 * Only a status that CLAIMS liveness is downgraded, because those are the
 * claims the lost link can no longer back: 'running', 'idle' and
 * 'needs_input'. Everything the boundary refuses to touch, and why:
 *
 *  - 'unknown' is already the honest answer. No rewrite and no event, so a
 *    2 s retry cadence does not become a 2 s broadcast cadence.
 *  - 'restorable' keeps its confirmed death. A later ambiguity does not
 *    un-confirm it, and a pressed Restore on an ambiguous socket fails
 *    cleanly and keeps the row's status (the restore path guarantees that).
 *  - 'exited' and 'discarded' are terminal records, not liveness claims.
 *
 * The same newer-than-the-evidence exemptions reconcile itself applies (see
 * skipReason in ../../manifest/reconciliation.ts) apply here, with the same
 * `>=` tie rule: an in-flight create or restore, and a row created or touched
 * at or after `snapshotAt`, are left exactly as they are. The failed exec is
 * evidence taken at `snapshotAt`, and it proves nothing about a row whose own
 * evidence is newer.
 *
 * PHASE 71 ADDED THE MACHINE FILTER, and it is the first argument after the
 * rows because it is the first question. A failed link to one machine says
 * nothing at all about the sessions on another, so only rows whose own
 * `machine_id` equals `machineId` are considered. Without it, a machine that
 * went to sleep would write 'unknown' over sessions running on this Mac, and a
 * person would be told Tortie cannot see work it is looking straight at.
 *
 * A row with no `machineId` reads as {@link LOCAL_MACHINE}. That is true of
 * every row written before migration 013 and of every row a `.recover` rebuild
 * produced, and it is what keeps an old manifest reconciling exactly as it did.
 */
export function unreachableFlips(
  rows: readonly Pick<
    ManifestSessionRecord,
    'id' | 'status' | 'createdAt' | 'lastSeen' | 'machineId'
  >[],
  machineId: MachineId,
  snapshotAt: number,
  inFlightIds: ReadonlySet<string>
): string[] {
  const out: string[] = [];
  for (const rec of rows) {
    if ((rec.machineId ?? LOCAL_MACHINE) !== machineId) continue;
    if (
      rec.status !== 'running' &&
      rec.status !== 'idle' &&
      rec.status !== 'needs_input'
    ) {
      continue;
    }
    if (inFlightIds.has(rec.id)) continue;
    if (rec.createdAt >= snapshotAt || rec.lastSeen >= snapshotAt) continue;
    out.push(rec.id);
  }
  return out;
}

/** What one status flip the reconcile produced obliges the core to do. */
export interface StatusFlipActions {
  /** A real flip: send the cheap per-session status event. */
  broadcast: boolean;
  /**
   * Phase 15: a captured session that was RUNNING and is now only restorable
   * died while gmux was not watching — a reboot, a tmux server death, a
   * `kill-pane` from outside. Nothing ran its flush, so this is the
   * reconciliation-time backstop research 13 §3.3 asks for. True once per
   * transition, not once per reconcile, because the flip itself is the
   * trigger. A flip FROM 'exited' is not a death: that session already ended
   * and already reported itself.
   */
  captureSync: boolean;
}

/** Judge one row's status against the snapshot taken before the reconcile. */
export function statusFlipActions(
  prev: SessionStatus | undefined,
  next: SessionStatus
): StatusFlipActions {
  const flipped = prev !== undefined && prev !== next;
  return {
    broadcast: flipped,
    captureSync: flipped && next === 'restorable' && prev !== 'exited'
  };
}
