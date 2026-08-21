/**
 * The remote execution journal: every read and write of the
 * `remote_executions` table (Phase 118, migration 017).
 *
 * ## What one row is
 *
 * One long running piece of work on another computer that Tortie may have to
 * end without finishing. A copy of a project onto that machine gets 600,000 ms,
 * and until this phase nothing owned the ssh child underneath it. Quitting
 * Tortie left the copy either running with no owner or cut dead, with nothing
 * recording which, so a person came back to a folder partly copied and no
 * explanation.
 *
 * ## ONLY A COPY IS RECORDED HERE, and that is the honest boundary
 *
 * Tortie classifies five kinds of remote work in memory and logs every one of
 * them. It writes a row here for one kind, being the copy.
 *
 * A copy WRITES ON THE OTHER COMPUTER. A cut one leaves a folder partly there,
 * the next attempt refuses that path by name, and a person has to go and look.
 * Reading a screen, reading an agent's own store and copying a conversation back
 * are reads onto this Mac that a later pass redoes, so a cut one leaves nothing
 * on either computer for a person to act on. A durable commit is 4.24 ms
 * measured (research 34 section 1.1), and the three read kinds run on timers, so
 * journaling them would put two durable commits per machine per pass on the
 * quiet path for a record nobody would ever read.
 *
 * ## The shape is the restore journal's shape
 *
 * `./restore-journal.ts` writes a durable row before the side effect and closes
 * it after, and the next launch reads what was never closed. This is that same
 * shape with the same reasoning: the row that says a copy was started is the
 * only record a machine which loses power mid copy will have.
 *
 * The two enums live HERE rather than in the machines domain, so the manifest
 * never imports that domain. `../machines/execution-ledger.ts` imports them from
 * this file and re-exports them for its own callers.
 */

import type Database from 'better-sqlite3';
import { durableTransaction } from '../db/sqlite';

/**
 * What one piece of long running work on another computer IS.
 *
 * Every member is a real thing Tortie sends, and the list is complete because
 * these five are the only shapes of remote work this product starts.
 */
export const REMOTE_EXECUTION_KINDS = [
  /** git clone on that machine. Up to 600,000 ms. The one journaled kind. */
  'clone',
  /** Reading one session's screen. */
  'capture',
  /** Reading an agent's own store on that machine. */
  'harvest',
  /** Copying one conversation back to this Mac. */
  'store-sync',
  /** Every other remote tmux verb and every other login shell read. */
  'command'
] as const;

export type RemoteExecutionKind = (typeof REMOTE_EXECUTION_KINDS)[number];

/**
 * The one kind that is written down durably. See the header for why the other
 * four are classified in memory and logged instead.
 */
export const JOURNALED_REMOTE_EXECUTION_KIND: RemoteExecutionKind = 'clone';

/**
 * How one piece of remote work ended.
 *
 *  - `answered`: the machine answered. What it said is the caller's business.
 *  - `failed`: it ended in an error and no quit was running.
 *  - `cutOff`: Tortie ended the ssh child because it was quitting.
 *  - `unjoined`: the join bound expired. Tortie stopped waiting and does not
 *    know which of the two above happened. "Could not wait" is a different fact
 *    from "it was cut off" and it gets a different word for that reason.
 */
export const REMOTE_EXECUTION_OUTCOMES = [
  'answered',
  'failed',
  'cutOff',
  'unjoined'
] as const;

export type RemoteExecutionOutcome = (typeof REMOTE_EXECUTION_OUTCOMES)[number];

/** One row of `remote_executions` (migration 017, Phase 118). */
interface RemoteExecutionRow {
  id: number;
  machine_id: string;
  machine_label: string;
  kind: string;
  subject: string;
  started_at: number;
  outcome: string | null;
  finished_at: number | null;
}

/**
 * One recorded piece of long running work on another computer.
 *
 * `outcome === null` means the work never finished, which is the only signal
 * this journal exists to produce. The label is stored on the row rather than
 * looked up, for the reason `machine_tombstone` stores it: the machine may be
 * removed before anybody reads the row.
 */
export interface RemoteExecutionRecord {
  readonly id: number;
  readonly machineId: string;
  readonly machineLabel: string;
  readonly kind: RemoteExecutionKind;
  readonly subject: string;
  readonly startedAt: number;
  readonly outcome: RemoteExecutionOutcome | null;
  readonly finishedAt: number | null;
}

/** What a caller hands the journal to open a row. */
export interface RemoteExecutionBegin {
  readonly machineId: string;
  readonly machineLabel: string;
  readonly kind: RemoteExecutionKind;
  /** What a person would call it, e.g. the destination folder. May be ''. */
  readonly subject: string;
}

/**
 * A kind this build does not know is read as `command`, and an outcome it does
 * not know is read as null.
 *
 * A row written by a build that added a member cannot be dropped whole, because
 * the row is the only record that a copy was started, and dropping it would
 * silence exactly the case the journal exists for. So the unknown value is read
 * as the least specific one this build has, and the machine, the subject and
 * the instant, which are what a sentence is built from, are read as they are.
 */
function toRecord(row: RemoteExecutionRow): RemoteExecutionRecord {
  const kind = (REMOTE_EXECUTION_KINDS as readonly string[]).includes(row.kind)
    ? (row.kind as RemoteExecutionKind)
    : 'command';
  const outcome =
    row.outcome !== null &&
    (REMOTE_EXECUTION_OUTCOMES as readonly string[]).includes(row.outcome)
      ? (row.outcome as RemoteExecutionOutcome)
      : null;
  return {
    id: row.id,
    machineId: row.machine_id,
    machineLabel: row.machine_label,
    kind,
    subject: row.subject,
    startedAt: row.started_at,
    outcome,
    finishedAt: row.finished_at
  };
}

export class RemoteExecutionJournal {
  constructor(private readonly db: Database.Database) {}

  /**
   * Write down that one piece of work on one machine has started, BEFORE the
   * ssh child is spawned, and return the row id.
   *
   * DURABLE, for the reason the restore journal's first write is durable. The
   * side effect this row covers happens on another computer and cannot be
   * undone from here, so the record of it must be on the disk before the side
   * effect begins. Synchronous by construction: better-sqlite3 does not await,
   * so there is no window between this row committing and the spawn.
   */
  beginRemoteExecution(
    input: RemoteExecutionBegin,
    at: number = Date.now()
  ): number {
    return durableTransaction(this.db, () => {
      const info = this.db
        .prepare<[string, string, string, string, number]>(
          `INSERT INTO remote_executions
             (machine_id, machine_label, kind, subject, started_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          input.machineId,
          input.machineLabel,
          input.kind,
          input.subject,
          at
        );
      return Number(info.lastInsertRowid);
    });
  }

  /**
   * Close one row with how the work ended.
   *
   * A row that is not there is not an error. The only writer is the ledger, and
   * a row it opened can be closed by a boot read that ran first, which is the
   * ordinary shape of a relaunch rather than a fault.
   */
  finishRemoteExecution(
    id: number,
    outcome: RemoteExecutionOutcome,
    at: number = Date.now()
  ): void {
    durableTransaction(this.db, () => {
      this.db
        .prepare<[string, number, number]>(
          `UPDATE remote_executions SET outcome = ?, finished_at = ?
            WHERE id = ? AND outcome IS NULL`
        )
        .run(outcome, at, id);
    });
  }

  /**
   * Every piece of work that never finished, oldest first.
   *
   * `outcome IS NULL` is the whole signal: Tortie stopped between starting the
   * work and recording how it ended.
   */
  listUnfinishedRemoteExecutions(): RemoteExecutionRecord[] {
    return this.db
      .prepare<[], RemoteExecutionRow>(
        `SELECT * FROM remote_executions WHERE outcome IS NULL
          ORDER BY started_at ASC, id ASC`
      )
      .all()
      .map(toRecord);
  }

  /** One row by id. Reading a row back is what the tests assert on. */
  getRemoteExecution(id: number): RemoteExecutionRecord | undefined {
    const row = this.db
      .prepare<[number], RemoteExecutionRow>(
        'SELECT * FROM remote_executions WHERE id = ?'
      )
      .get(id);
    return row ? toRecord(row) : undefined;
  }

  /**
   * Drop finished rows beyond the newest `keep`.
   *
   * Called on open, exactly as the restore journal's prune is. Without it the
   * table grows for the life of the install, and a journal that costs disk
   * forever to answer one question at launch is not worth having. An unfinished
   * row is never pruned here, because the launch that is starting right now has
   * not yet had its chance to tell somebody about it.
   */
  pruneRemoteExecutions(keep = 200): void {
    this.db
      .prepare<[number]>(
        `DELETE FROM remote_executions
          WHERE outcome IS NOT NULL
            AND id NOT IN (
              SELECT id FROM remote_executions
               WHERE outcome IS NOT NULL
               ORDER BY id DESC LIMIT ?
            )`
      )
      .run(keep);
  }
}
