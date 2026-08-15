/**
 * The restore journal: every read and write of the `restore_attempts` table
 * (Phase 42 stage 6 split out of ./store.ts; the table is migration 007,
 * Phase 19 item 7).
 *
 * Three writes per restore, and all three are durable commits: the intent
 * before anything is created, the tmux id the instant the session exists,
 * and the resolution. Durable here means `synchronous=FULL` plus
 * `fullfsync=1` for that commit only, measured at 4.24 ms against 0.011 ms
 * for an ordinary one (research 34 §1.1). A restore already costs hundreds
 * of milliseconds in tmux, and these three rows are the only record of it
 * that a machine which loses power mid-restore will have.
 */

import type Database from 'better-sqlite3';
import { durableTransaction, immediateTransaction } from '../db/sqlite';
import type { RestoreResultKind } from '@shared/types';
import { RESTORE_KINDS } from './codecs';

/** One row of `restore_attempts` (migration 007, Phase 19 item 7). */
interface RestoreAttemptRow {
  id: number;
  session_id: string;
  started_at: number;
  tmux_id: string | null;
  outcome: string | null;
  finished_at: number | null;
}

/**
 * One recorded restore attempt.
 *
 * `outcome === null` means the attempt never finished, which is the only
 * signal the journal exists to produce. `tmuxId === null` on such a row means
 * no tmux session was recorded, which is NOT the same as "no tmux session
 * exists": the app can stop between `new-session` returning and the id being
 * written. Only tmux can settle that, so the resolution asks it.
 */
export interface RestoreAttemptRecord {
  id: number;
  sessionId: string;
  startedAt: number;
  tmuxId: string | null;
  outcome: RestoreResultKind | null;
  finishedAt: number | null;
}

function toRestoreAttempt(row: RestoreAttemptRow): RestoreAttemptRecord {
  const outcome =
    row.outcome !== null &&
    (RESTORE_KINDS as readonly string[]).includes(row.outcome)
      ? (row.outcome as RestoreResultKind)
      : null;
  return {
    id: row.id,
    sessionId: row.session_id,
    startedAt: row.started_at,
    tmuxId: row.tmux_id,
    outcome,
    finishedAt: row.finished_at
  };
}

export class RestoreJournal {
  constructor(private readonly db: Database.Database) {}

  /**
   * Write the intent to restore `sessionId`, BEFORE any side effect, and
   * return the attempt id.
   *
   * Synchronous by construction. better-sqlite3 does not await, so there is no
   * window between this row committing and the caller taking its first action.
   */
  beginRestoreAttempt(sessionId: string, at: number = Date.now()): number {
    return durableTransaction(this.db, () => {
      const info = this.db
        .prepare<[string, number]>(
          'INSERT INTO restore_attempts (session_id, started_at) VALUES (?, ?)'
        )
        .run(sessionId, at);
      return Number(info.lastInsertRowid);
    });
  }

  /**
   * Record the tmux session id the instant `new-session` returns.
   *
   * This is the row that tells the next launch a process may exist. It is
   * written as its own durable commit rather than being folded into the
   * resolution, because the gap it covers is precisely the one where Tortie
   * dies holding a session it has no record of creating.
   */
  noteRestoreTmuxId(attemptId: number, tmuxId: string): void {
    durableTransaction(this.db, () => {
      this.db
        .prepare<[string, number]>(
          'UPDATE restore_attempts SET tmux_id = ? WHERE id = ?'
        )
        .run(tmuxId, attemptId);
    });
  }

  /** Close an attempt with what it achieved. */
  finishRestoreAttempt(
    attemptId: number,
    outcome: RestoreResultKind,
    at: number = Date.now()
  ): void {
    durableTransaction(this.db, () => {
      this.db
        .prepare<[string, number, number]>(
          'UPDATE restore_attempts SET outcome = ?, finished_at = ? WHERE id = ?'
        )
        .run(outcome, at, attemptId);
    });
  }

  /**
   * Every attempt that never finished. `outcome IS NULL` is the whole signal:
   * Tortie stopped between starting a restore and finishing it.
   */
  listUnfinishedRestoreAttempts(): RestoreAttemptRecord[] {
    return this.db
      .prepare<[], RestoreAttemptRow>(
        `SELECT * FROM restore_attempts WHERE outcome IS NULL
         ORDER BY started_at ASC`
      )
      .all()
      .map(toRestoreAttempt);
  }

  /** One attempt by id. Reading a row back is what the tests assert on. */
  getRestoreAttempt(attemptId: number): RestoreAttemptRecord | undefined {
    const row = this.db
      .prepare<[number], RestoreAttemptRow>(
        'SELECT * FROM restore_attempts WHERE id = ?'
      )
      .get(attemptId);
    return row ? toRestoreAttempt(row) : undefined;
  }

  /**
   * Drop finished attempts beyond the newest `keep`, and every attempt whose
   * session no longer has a row.
   *
   * Called on open. Without it the table grows for the life of the install,
   * and a journal that costs disk forever to answer one question at launch is
   * not worth having. Unfinished attempts are never pruned here, because the
   * next launch has not yet had its chance to act on them.
   */
  pruneRestoreAttempts(keep = 200): void {
    immediateTransaction(this.db, () => {
      this.db.exec(
        `DELETE FROM restore_attempts
          WHERE session_id NOT IN (SELECT id FROM sessions)
            AND outcome IS NOT NULL`
      );
      this.db
        .prepare<[number]>(
          `DELETE FROM restore_attempts
            WHERE outcome IS NOT NULL
              AND id NOT IN (
                SELECT id FROM restore_attempts
                 WHERE outcome IS NOT NULL
                 ORDER BY id DESC LIMIT ?
              )`
        )
        .run(keep);
    });
  }
}
