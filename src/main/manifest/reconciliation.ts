/**
 * Reconciliation: the manifest judged against live tmux truth (Phase 42
 * stage 6 split out of ./store.ts; runs at startup, %exit and
 * %sessions-changed).
 *
 * IDENTITY, NOT NAMES, is the standing law here (Phase 12.7 F1, research 21
 * §6), and the doc comment on `reconcileManifest` states it in full.
 */

import type Database from 'better-sqlite3';
import { immediateTransaction } from '../db/sqlite';
import {
  LOCAL_MACHINE_ROW,
  type ManifestSessionPatch,
  type ManifestSessionRecord,
  type UpdateSessionOptions
} from './codecs';

/**
 * One live tmux session as reconcile sees it. `gmuxId` is the identity
 * (`@gmux-id`, or the `GMUX_SESSION_ID` pane-env stamp when the option is
 * missing); `tmuxId` is the immutable `$-id` the caller will address it by.
 * Names appear here for reporting only — reconcile never claims a row by
 * one (research 21 §6: a name is mutable and reusable, so name-binding let
 * gmux adopt — and then kill — a session it never created).
 */
export interface LiveTmuxSession {
  tmuxId: string;
  tmuxName: string;
  gmuxId?: string;
}

/**
 * Why reconcile refused to judge a row this pass.
 *
 * The first three mean the same thing: the `live` snapshot is OLDER than the
 * row's own evidence, so its silence about the row proves nothing. The fourth
 * is different in kind and is explained where it is used.
 */
export type ReconcileSkipReason =
  /** Row inserted after the snapshot was taken (a create in progress). */
  | 'created-after-snapshot'
  /** Caller says this row's tmux side is being created right now. */
  | 'in-flight'
  /** Something proved the row live after the snapshot (restore, activity). */
  | 'touched-after-snapshot'
  /** The row's session runs on another computer, so this list cannot see it. */
  | 'another-machine';

/** A row reconcile deliberately left alone, with the reason it did. */
export interface ReconcileSkip {
  record: ManifestSessionRecord;
  reason: ReconcileSkipReason;
}

/**
 * What the caller knows about the snapshot it is handing in.
 *
 * reconcile() is the function that decides a session is unreachable, so it
 * must not act on rows the snapshot could not possibly have seen (Phase
 * 16.5.1): the caller takes the tmux list, then awaits identity probes for
 * every foreign session on the socket — dozens of execs — and a session
 * created during those awaits is absent from the list purely because the
 * list predates it.
 */
export interface ReconcileOptions {
  /**
   * `Date.now()` from immediately BEFORE the list-sessions exec that produced
   * `live`. Omitted (tests, migration smoke) = no exemption, old behaviour.
   */
  snapshotAt?: number;
  /**
   * Session ids whose tmux side is mid-create or mid-restore. Needed on top
   * of `snapshotAt` because the manifest row is written BEFORE the process
   * exists (§2.4 Step 0): a row inserted just before the snapshot can have
   * its tmux session appear just after it.
   */
  inFlightIds?: ReadonlySet<string>;
}

/**
 * True when this row's session runs on another computer (Phase 72 fix round).
 *
 * A row written before migration 013 has no machine at all and reads `local`,
 * which is what every session on this Mac is.
 */
function runsElsewhere(rec: ManifestSessionRecord): boolean {
  return rec.machineId !== undefined && rec.machineId !== LOCAL_MACHINE_ROW;
}

/** Result of reconciling the manifest against live tmux sessions. */
export interface ReconcileResult {
  /** Manifest rows with a live tmux session (lastSeen refreshed). */
  alive: ManifestSessionRecord[];
  /**
   * Rows whose tmux session is gone and were marked (or already were)
   * 'restorable' — the post-reboot / post-T2 restore candidates.
   */
  restorable: ManifestSessionRecord[];
  /**
   * Rows already 'exited' and still absent from tmux — left untouched
   * (exited sessions do not re-enter the restore path; §2.4 Step 3).
   */
  exited: ManifestSessionRecord[];
  /**
   * Live tmux sessions with no manifest row (created by hand on the private
   * socket, or belonging to another gmux install). IGNORED — gmux touches
   * nothing it cannot prove it owns.
   */
  unknownTmuxNames: string[];
  /**
   * Rows the snapshot could not have seen, left EXACTLY as they were — no
   * status write, no binding, no claim. The caller keeps whatever binding it
   * already recorded for a row skipped for a creation reason.
   */
  skipped: ReconcileSkip[];
  /**
   * manifest session id → live tmux `$-id`, for every row claimed above.
   * The caller's `liveIds` map is this, verbatim: one matching algorithm,
   * in one place (growth guardrail — it used to be re-derived by name).
   */
  bindings: Map<string, string>;
}

/**
 * The two session operations reconcile needs, typed as a surface rather than
 * as the repository class. The facade passes ITSELF here, so a caller (or a
 * test) that overrides `listSessions`/`updateSession` on the store observes
 * reconcile's reads and writes exactly as it did before the stage 6 split.
 */
export interface ReconcileSessions {
  listSessions(): ManifestSessionRecord[];
  updateSession(
    id: string,
    patch: ManifestSessionPatch,
    // Optional, so a test double that takes two arguments still satisfies
    // this. The flip below is the only caller that passes it.
    opts?: UpdateSessionOptions
  ): ManifestSessionRecord;
}

/**
 * Is this row NEWER than the snapshot that is about to be used against it?
 * (Phase 16.5.1 — see ReconcileOptions.) Returns the reason, or null when the
 * snapshot really is entitled to an opinion about the row.
 *
 * `lastSeen` counts as evidence because every writer of it — reconcile's own
 * alive branch, restoreSession, and the activity monitor's setStatus, which
 * only ever runs for a session bound to a live tmux id — writes it having
 * just seen the session alive.
 */
function skipReason(
  rec: ManifestSessionRecord,
  snapshotAt: number | undefined,
  inFlightIds: ReadonlySet<string> | undefined
): ReconcileSkipReason | null {
  if (inFlightIds?.has(rec.id) === true) return 'in-flight';
  if (snapshotAt === undefined) return null;
  // `>=`, not `>`: same-millisecond means the order cannot be proven, and the
  // safe answer is to leave a possibly-live session alone for one more pass.
  if (rec.createdAt >= snapshotAt) return 'created-after-snapshot';
  if (rec.lastSeen >= snapshotAt) return 'touched-after-snapshot';
  return null;
}

/**
 * Compare the manifest against the tmux-side truth on the private socket.
 *
 * IDENTITY, NOT NAMES (Phase 12.7 F1, research 21 §6). A row is claimed by
 * `@gmux-id`/`GMUX_SESSION_ID` — the id gmux stamped on the session when it
 * created it — and by nothing else. The old name matching adopted any live
 * session that happened to hold a row's name, which is how gmux could end
 * up killing a session it never created (reproduced: a foreign session took
 * a freed name, was adopted, and died in place of the real one).
 *
 * - Rows whose session is alive: lastSeen refreshed, tmux_name re-synced
 *   (tmux is truth for names — an external rename no longer disowns the
 *   row), and 'restorable'/'exited' flip back to 'running'.
 * - Non-exited rows with no live session: marked 'restorable'. NOT killed,
 *   not adopted from anything else.
 * - 'exited' rows missing from tmux: left untouched.
 * - Live sessions with no matching row: reported and otherwise ignored.
 * - Rows NEWER than the snapshot (`options`): skipped, not judged. See
 *   ReconcileOptions — the caller's list is taken before a long identity
 *   pass, so a session created during that pass is missing from it for a
 *   reason that has nothing to do with being unreachable. Marking it
 *   'restorable' made a just-created session refuse to attach
 *   (SESSION_NOT_FOUND / "status: restorable", 3 of 5 smoke runs on a
 *   socket with 44 foreign sessions).
 *
 * Runs in a single IMMEDIATE transaction; synchronous. Immediate because it
 * reads (`listSessions`) and then writes (`updateSession`): a deferred
 * transaction would take a read snapshot first and fail the write upgrade
 * with SQLITE_BUSY_SNAPSHOT if any other connection committed in between —
 * an error `busy_timeout` does not retry (see db/sqlite.ts). That surfaced
 * as `[gmux] refresh failed: database is locked`, i.e. a manifest left
 * unreconciled with tmux.
 */
export function reconcileManifest(
  db: Database.Database,
  sessions: ReconcileSessions,
  live: readonly LiveTmuxSession[],
  options: ReconcileOptions = {}
): ReconcileResult {
  const result: ReconcileResult = {
    alive: [],
    restorable: [],
    exited: [],
    unknownTmuxNames: [],
    skipped: [],
    bindings: new Map<string, string>()
  };
  const { snapshotAt, inFlightIds } = options;

  immediateTransaction(db, () => {
    const all = sessions.listSessions();
    // Tombstones are not claimable (Phase 19 item 6). Leaving them out of
    // the id map here, rather than only skipping them in the loop below, is
    // what makes a live session that carries a tombstone's identity get
    // REPORTED as an unknown session instead of quietly disappearing from
    // every bucket.
    // PHASE 72 FIX ROUND. A row whose session runs on another computer is left
    // out of the id map for the same reason a tombstone is: this list is THIS
    // Mac's own session server, and it can say nothing at all about a session
    // on a different computer. A live session here that carried such a row's
    // identity is REPORTED as one Tortie does not own rather than claimed.
    const byId = new Map(
      all
        .filter((rec) => rec.status !== 'discarded' && !runsElsewhere(rec))
        .map((rec) => [rec.id, rec])
    );
    const now = Date.now();

    // One live session per row and one row per live session: a duplicate
    // id (two servers, one manifest) must not double-claim.
    const claimedRows = new Map<string, LiveTmuxSession>();
    for (const session of live) {
      const rec =
        session.gmuxId !== undefined ? byId.get(session.gmuxId) : undefined;
      if (rec === undefined || claimedRows.has(rec.id)) {
        result.unknownTmuxNames.push(session.tmuxName);
        continue;
      }
      claimedRows.set(rec.id, session);
    }

    for (const rec of all) {
      const session = claimedRows.get(rec.id);
      const skip = skipReason(rec, snapshotAt, inFlightIds);
      // A tombstone is terminal (Phase 19 item 6). The user removed this
      // session, and the row exists only so the removal can be undone. It
      // is never claimed, never revived by a live session that happens to
      // carry its identity, and never marked restorable. Nothing writes
      // 'discarded' yet; the guard is here so that a row written by a later
      // build cannot be resurrected by an older one.
      if (rec.status === 'discarded') continue;
      // PHASE 72 FIX ROUND, AND IT IS A DURABILITY BUG THIS CLOSES. Before it,
      // every pass compared a row for a session on another computer against
      // this Mac's own list, found it absent, and wrote `restorable` on it. The
      // row then said a session on a machine that was working perfectly well
      // had stopped, and that is the value the NEXT launch starts from, before
      // any machine has answered. Per machine truth is written by the per
      // machine feed in ../machines/remote-sessions.ts, from that machine's own
      // answers, and this list is entitled to no opinion about it.
      if (runsElsewhere(rec)) {
        result.skipped.push({ record: rec, reason: 'another-machine' });
        continue;
      }
      if (session !== undefined) {
        const needsStatusFlip =
          rec.status === 'restorable' ||
          rec.status === 'exited' ||
          // Seeing it alive is exactly the evidence 'unknown' was missing.
          rec.status === 'unknown';
        const updated = sessions.updateSession(
          rec.id,
          {
            lastSeen: now,
            ...(session.tmuxName !== rec.tmuxName
              ? { tmuxName: session.tmuxName }
              : {}),
            ...(needsStatusFlip ? { status: 'running' as const } : {})
          },
          // THE DEATH IS OVER WHEN THE ROW IS ALIVE AGAIN (Phase 48 fix
          // round). This flip is the second way a row leaves 'exited', beside
          // `setRestoreResult`, and only that one cleared the exit cause. A
          // row that came back here kept its `exitCode`, its `exitSignal` and,
          // since Phase 48, the words of a process that is no longer the one
          // running. Cleared in the same durable write as the status, so no
          // crash can leave a live status beside a dead process's cause.
          needsStatusFlip ? { clearExitCause: true } : {}
        );
        result.alive.push(updated);
        result.bindings.set(rec.id, session.tmuxId);
      } else if (rec.status === 'exited') {
        result.exited.push(rec);
      } else if (skip !== null) {
        // Newer than the evidence against it — leave it exactly as it is.
        result.skipped.push({ record: rec, reason: skip });
      } else {
        const updated =
          rec.status === 'restorable'
            ? rec
            : sessions.updateSession(rec.id, { status: 'restorable' });
        result.restorable.push(updated);
      }
    }
  });

  return result;
}
