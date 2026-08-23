/**
 * The overview store (Phase 137). A SQLite file beside the manifest, at
 * <userData>/gmux/overview.db, opened the way the manifest opens its own
 * file and never sharing that file or its schema.
 *
 * The store is disposable with a stated cost. Deleting it loses turns whose
 * provider has since deleted them from disk. The rebuild path is to delete
 * the file and open it again: the schema is recreated empty, getSession
 * returns null for every session, and the next read of each session is a
 * full read that refills every table from the logs that still exist.
 *
 * Three rules govern every write.
 * - One transaction per session read. replaceTurnsFrom deletes the tail,
 *   inserts the new turns and their facts, and stamps the watermark, the
 *   map version and the read time on the session row, all in one durable
 *   transaction. A crash at any point inside it leaves the previous state
 *   intact and readable.
 * - Redaction runs inside the store and nowhere else on the write path.
 *   replaceTurnsFrom applies redactText to the ask, the answer and the
 *   notice before the insert, so there is no path to a stored row that
 *   skipped it.
 * - The cache key is the watermark plus the map version, both read back
 *   through getSession. An unchanged session is one row read and no write.
 *
 * Growth, from research 63 section 18: the operator's 25 live resolved
 * sessions keep 274.8 KB out of 161.48 MB of log, which is 0.166%. At that
 * ratio one gigabyte of new log adds about 1.7 MB to this file, so a month
 * of ordinary use costs a few megabytes and never gigabytes.
 */

import type Database from 'better-sqlite3';
import { durableTransaction, openGmuxDatabase } from '../../db/sqlite';
import { redactText } from '../redact';
import type { OverviewGitMark } from '@shared/overview';
import type { PathMention, ReadTurn, Watermark } from '../reader';
import { ensureOverviewSchema } from './schema';

/** How the last read of a session ended. Mirrors the line kinds the views draw. */
export type StoredReadState =
  | 'ok'
  | 'no-file'
  | 'no-store'
  | 'unreadable'
  | 'wrong-conversation'
  | 'shell'
  | 'remote';

export interface StoredSession {
  sessionId: string;
  agent: string;
  provider: string;
  agentSessionId: string | null;
  logPath: string | null;
  watermark: Watermark | null;
  mapVersionAtLastRead: number | null;
  lastReadAt: number | null;
  readState: StoredReadState;
  readDetail: string | null;
  lastTouchedAt: string | null;
  model: string | null;
  branch: string | null;
  honest: string | null;
}

export interface StoredTurn {
  sessionId: string;
  index: number;
  askText: string; // REDACTED
  askAt: string | null;
  answerText: string | null; // REDACTED
  answerAt: string | null;
  queued: number;
  closed: boolean;
  interrupted: boolean;
  notice: string | null;
  stopReason: string | null;
  durationMs: number | null;
  paths: PathMention[];
  pathSource: 'tool-calls' | 'text-only';
  gitVerdict: OverviewGitMark | null;
  gitCheckedAt: number | null;
}

// ---------------------------------------------------------------------------
// Row shapes, named so every read is typed end to end.
// ---------------------------------------------------------------------------

interface SessionRow {
  session_id: string;
  agent: string;
  provider: string;
  agent_session_id: string | null;
  log_path: string | null;
  watermark: string | null;
  map_version_at_last_read: number | null;
  last_read_at: number | null;
  read_state: string;
  read_detail: string | null;
  last_touched_at: string | null;
  model: string | null;
  branch: string | null;
  honest: string | null;
}

interface TurnJoinRow {
  session_id: string;
  turn_index: number;
  ask_text: string;
  ask_at: string | null;
  answer_text: string | null;
  answer_at: string | null;
  queued: number;
  closed: number;
  interrupted: number | null;
  notice: string | null;
  stop_reason: string | null;
  duration_ms: number | null;
  paths: string | null;
  path_source: string | null;
  git_verdict: string | null;
  git_checked_at: number | null;
}

const TURN_JOIN_SELECT =
  'SELECT t.session_id, t.turn_index, t.ask_text, t.ask_at, t.answer_text, ' +
  't.answer_at, t.queued, t.closed, f.interrupted, f.notice, f.stop_reason, ' +
  'f.duration_ms, f.paths, f.path_source, f.git_verdict, f.git_checked_at ' +
  'FROM turn t LEFT JOIN turn_fact f ' +
  'ON f.session_id = t.session_id AND f.turn_index = t.turn_index ' +
  'WHERE t.session_id = ?';

function toStoredSession(row: SessionRow): StoredSession {
  return {
    sessionId: row.session_id,
    agent: row.agent,
    provider: row.provider,
    agentSessionId: row.agent_session_id,
    logPath: row.log_path,
    watermark:
      row.watermark === null ? null : (JSON.parse(row.watermark) as Watermark),
    mapVersionAtLastRead: row.map_version_at_last_read,
    lastReadAt: row.last_read_at,
    readState: row.read_state as StoredReadState,
    readDetail: row.read_detail,
    lastTouchedAt: row.last_touched_at,
    model: row.model,
    branch: row.branch,
    honest: row.honest
  };
}

function toStoredTurn(row: TurnJoinRow): StoredTurn {
  return {
    sessionId: row.session_id,
    index: row.turn_index,
    askText: row.ask_text,
    askAt: row.ask_at,
    answerText: row.answer_text,
    answerAt: row.answer_at,
    queued: row.queued,
    closed: row.closed !== 0,
    interrupted: (row.interrupted ?? 0) !== 0,
    notice: row.notice,
    stopReason: row.stop_reason,
    durationMs: row.duration_ms,
    paths:
      row.paths === null ? [] : (JSON.parse(row.paths) as PathMention[]),
    pathSource: row.path_source === 'tool-calls' ? 'tool-calls' : 'text-only',
    gitVerdict: (row.git_verdict as OverviewGitMark | null) ?? null,
    gitCheckedAt: row.git_checked_at
  };
}

/**
 * The turns handed to replaceTurnsFrom keep their own index values, so the
 * first one must sit exactly at fromIndex and the rest must follow it with
 * no gap. Anything else would leave a hole the views cannot explain, so the
 * write refuses before the transaction starts.
 */
function assertTurnsContiguousFrom(
  turns: readonly ReadTurn[],
  fromIndex: number
): void {
  const first = turns[0];
  if (first === undefined) return;
  if (first.index !== fromIndex) {
    throw new Error(
      `replaceTurnsFrom was given turns starting at index ${first.index} ` +
        `while fromIndex is ${fromIndex}. The two must be equal.`
    );
  }
  for (let i = 1; i < turns.length; i++) {
    const prev = turns[i - 1];
    const next = turns[i];
    if (prev === undefined || next === undefined) continue;
    if (next.index !== prev.index + 1) {
      throw new Error(
        `replaceTurnsFrom was given a gap in turn indexes: ${prev.index} ` +
          `is followed by ${next.index}. Turns must be contiguous.`
      );
    }
  }
}

export class OverviewStore {
  readonly path: string;

  private readonly db: Database.Database;
  private readonly stmtGetSession: Database.Statement<[string], SessionRow>;
  private readonly stmtUpsertSession: Database.Statement<
    [
      string,
      string,
      string,
      string | null,
      string | null,
      string | null,
      number | null,
      number | null,
      string,
      string | null,
      string | null,
      string | null,
      string | null,
      string | null
    ]
  >;
  private readonly stmtEnsureSession: Database.Statement<[string]>;
  private readonly stmtStampRead: Database.Statement<
    [string | null, number, number, string]
  >;
  private readonly stmtDeleteTurns: Database.Statement<[string, number]>;
  private readonly stmtDeleteFacts: Database.Statement<[string, number]>;
  private readonly stmtInsertTurn: Database.Statement<
    [
      string,
      number,
      string,
      string | null,
      string | null,
      string | null,
      number,
      number
    ]
  >;
  private readonly stmtInsertFact: Database.Statement<
    [
      string,
      number,
      number,
      string | null,
      string | null,
      number | null,
      string,
      string
    ]
  >;
  private readonly stmtListTurnsAsc: Database.Statement<[string], TurnJoinRow>;
  private readonly stmtListTurnsTail: Database.Statement<
    [string, number],
    TurnJoinRow
  >;
  private readonly stmtCountTurns: Database.Statement<[string], { c: number }>;
  private readonly stmtSetGitVerdict: Database.Statement<
    [string, number, string, number]
  >;
  private readonly stmtRecordProviderMap: Database.Statement<
    [string, number, string, number]
  >;
  private readonly stmtProviderMapVersion: Database.Statement<
    [string],
    { map_version: number }
  >;

  /** Internal. Open through openOverviewStore, which runs the schema first. */
  constructor(db: Database.Database, dbPath: string) {
    this.db = db;
    this.path = dbPath;
    this.stmtGetSession = db.prepare(
      'SELECT * FROM session WHERE session_id = ?'
    );
    this.stmtUpsertSession = db.prepare(
      'INSERT INTO session (session_id, agent, provider, agent_session_id, ' +
        'log_path, watermark, map_version_at_last_read, last_read_at, ' +
        'read_state, read_detail, last_touched_at, model, branch, honest) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(session_id) DO UPDATE SET ' +
        'agent = excluded.agent, provider = excluded.provider, ' +
        'agent_session_id = excluded.agent_session_id, ' +
        'log_path = excluded.log_path, watermark = excluded.watermark, ' +
        'map_version_at_last_read = excluded.map_version_at_last_read, ' +
        'last_read_at = excluded.last_read_at, ' +
        'read_state = excluded.read_state, ' +
        'read_detail = excluded.read_detail, ' +
        'last_touched_at = excluded.last_touched_at, ' +
        'model = excluded.model, branch = excluded.branch, ' +
        'honest = excluded.honest'
    );
    // A placeholder for a turn write that lands before the first
    // upsertSession of the session. upsertSession fills every field on its
    // next call, and the placeholder keeps the watermark stamp from landing
    // on no row at all.
    this.stmtEnsureSession = db.prepare(
      "INSERT INTO session (session_id, agent, provider, read_state) " +
        "VALUES (?, '', '', 'ok') ON CONFLICT(session_id) DO NOTHING"
    );
    this.stmtStampRead = db.prepare(
      'UPDATE session SET watermark = ?, map_version_at_last_read = ?, ' +
        'last_read_at = ? WHERE session_id = ?'
    );
    this.stmtDeleteTurns = db.prepare(
      'DELETE FROM turn WHERE session_id = ? AND turn_index >= ?'
    );
    this.stmtDeleteFacts = db.prepare(
      'DELETE FROM turn_fact WHERE session_id = ? AND turn_index >= ?'
    );
    this.stmtInsertTurn = db.prepare(
      'INSERT INTO turn (session_id, turn_index, ask_text, ask_at, ' +
        'answer_text, answer_at, queued, closed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    this.stmtInsertFact = db.prepare(
      'INSERT INTO turn_fact (session_id, turn_index, interrupted, notice, ' +
        'stop_reason, duration_ms, paths, path_source) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    this.stmtListTurnsAsc = db.prepare(
      `${TURN_JOIN_SELECT} ORDER BY t.turn_index ASC`
    );
    this.stmtListTurnsTail = db.prepare(
      `${TURN_JOIN_SELECT} ORDER BY t.turn_index DESC LIMIT ?`
    );
    this.stmtCountTurns = db.prepare(
      'SELECT COUNT(*) AS c FROM turn WHERE session_id = ?'
    );
    this.stmtSetGitVerdict = db.prepare(
      'UPDATE turn_fact SET git_verdict = ?, git_checked_at = ? ' +
        'WHERE session_id = ? AND turn_index = ?'
    );
    this.stmtRecordProviderMap = db.prepare(
      'INSERT INTO provider_map (provider, map_version, map_hash, recorded_at) ' +
        'VALUES (?, ?, ?, ?) ON CONFLICT(provider) DO UPDATE SET ' +
        'map_version = excluded.map_version, map_hash = excluded.map_hash, ' +
        'recorded_at = excluded.recorded_at'
    );
    this.stmtProviderMapVersion = db.prepare(
      'SELECT map_version FROM provider_map WHERE provider = ?'
    );
  }

  getSession(sessionId: string): StoredSession | null {
    const row = this.stmtGetSession.get(sessionId);
    return row === undefined ? null : toStoredSession(row);
  }

  upsertSession(row: StoredSession): void {
    this.stmtUpsertSession.run(
      row.sessionId,
      row.agent,
      row.provider,
      row.agentSessionId,
      row.logPath,
      row.watermark === null ? null : JSON.stringify(row.watermark),
      row.mapVersionAtLastRead,
      row.lastReadAt,
      row.readState,
      row.readDetail,
      row.lastTouchedAt,
      row.model,
      row.branch,
      row.honest
    );
  }

  /**
   * Deletes every turn of the session at or after fromIndex, inserts the
   * given turns, writes the watermark, the map version and lastReadAt on the
   * session row, in ONE transaction. Redacts ask, answer and notice before
   * the insert. The turns' own index values are kept, so turns[0].index must
   * equal fromIndex.
   *
   * The transaction is the durable kind, because this write is the copy that
   * outlives the provider's own file and it must survive a crash that
   * happens right after the page closes.
   */
  replaceTurnsFrom(
    sessionId: string,
    fromIndex: number,
    turns: ReadTurn[],
    watermark: Watermark | null,
    mapVersion: number,
    readAt: number
  ): void {
    assertTurnsContiguousFrom(turns, fromIndex);
    const watermarkJson = watermark === null ? null : JSON.stringify(watermark);
    durableTransaction(this.db, () => {
      this.stmtDeleteTurns.run(sessionId, fromIndex);
      this.stmtDeleteFacts.run(sessionId, fromIndex);
      for (const turn of turns) {
        this.stmtInsertTurn.run(
          sessionId,
          turn.index,
          redactText(turn.ask.text),
          turn.ask.at,
          turn.answer === null ? null : redactText(turn.answer.text),
          turn.answer === null ? null : turn.answer.at,
          turn.ask.queued,
          turn.closed ? 1 : 0
        );
        this.stmtInsertFact.run(
          sessionId,
          turn.index,
          turn.interrupted ? 1 : 0,
          turn.notice === null ? null : redactText(turn.notice),
          turn.stopReason,
          turn.durationMs,
          JSON.stringify(turn.paths),
          turn.pathSource
        );
      }
      this.stmtEnsureSession.run(sessionId);
      this.stmtStampRead.run(watermarkJson, mapVersion, readAt, sessionId);
    });
  }

  /** Ascending by index. With a limit, the LAST limit turns. */
  listTurns(sessionId: string, limit?: number): StoredTurn[] {
    if (limit === undefined) {
      return this.stmtListTurnsAsc.all(sessionId).map(toStoredTurn);
    }
    const tail = this.stmtListTurnsTail.all(sessionId, limit);
    tail.reverse();
    return tail.map(toStoredTurn);
  }

  countTurns(sessionId: string): number {
    return this.stmtCountTurns.get(sessionId)?.c ?? 0;
  }

  setGitVerdict(
    sessionId: string,
    index: number,
    verdict: OverviewGitMark,
    checkedAt: number
  ): void {
    this.stmtSetGitVerdict.run(verdict, checkedAt, sessionId, index);
  }

  recordProviderMap(
    provider: string,
    version: number,
    hash: string,
    at: number
  ): void {
    this.stmtRecordProviderMap.run(provider, version, hash, at);
  }

  providerMapVersion(provider: string): number | null {
    return this.stmtProviderMapVersion.get(provider)?.map_version ?? null;
  }

  close(): void {
    this.db.close();
  }
}

/**
 * Opens the store, creating parent directories and running the schema. The
 * path is the caller's: production passes <userData>/gmux/overview.db and
 * tests pass a scratch path.
 *
 * recover is off because the store is disposable. A damaged file is set
 * aside by the integrity gate and a fresh empty one is created, and the
 * next read of every session refills it from the logs that still exist.
 */
export function openOverviewStore(dbPath: string): OverviewStore {
  const db = openGmuxDatabase(dbPath, { recover: false });
  ensureOverviewSchema(db);
  return new OverviewStore(db, dbPath);
}
