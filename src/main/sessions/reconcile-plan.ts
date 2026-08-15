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
