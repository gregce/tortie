/**
 * The overview store schema (Phase 137).
 *
 * This file is the one place the shape of the store is written down. The
 * store keeps four tables:
 * - session: one row per Tortie session that was read. The row holds the
 *   provider, the resolved log path, the watermark and the map version at
 *   the last read. The watermark plus the map version is the cache key, so
 *   an unchanged session costs one row read to check.
 * - turn: the kept slice. Your ask and the agent's closing answer, both
 *   redacted before they were written. This is the copy that survives a
 *   provider deleting its own history from disk.
 * - turn_fact: what no model ever touches. The stop reason, the duration,
 *   the interrupt flag, the path list from the path index, and the git
 *   verdict.
 * - provider_map: the map version and hash per provider, so any row can be
 *   traced to the rules that produced it.
 *
 * The schema runs when the meta table is absent or its recorded version is
 * lower than OVERVIEW_SCHEMA_VERSION. A file stamped with a HIGHER version
 * was written by a newer build. The store is disposable, so that file is
 * dropped and recreated empty rather than guessed at. The cost of the drop
 * is the store's stated cost: turns whose provider has since deleted them
 * from disk are gone.
 */

import type Database from 'better-sqlite3';
import { immediateTransaction } from '../../db/sqlite';

export const OVERVIEW_SCHEMA_VERSION = 1;

/** The meta key the version is stored under. */
const VERSION_KEY = 'schema_version';

/** The four tables plus the meta table, exactly as the Phase 137 spec wrote them. */
export const OVERVIEW_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS session (
  session_id               TEXT PRIMARY KEY,
  agent                    TEXT NOT NULL,
  provider                 TEXT NOT NULL,
  agent_session_id         TEXT,
  log_path                 TEXT,
  watermark                TEXT,            -- JSON
  map_version_at_last_read INTEGER,
  last_read_at             INTEGER,
  read_state               TEXT NOT NULL,
  read_detail              TEXT,
  last_touched_at          TEXT,
  model                    TEXT,
  branch                   TEXT,
  honest                   TEXT
);
CREATE TABLE IF NOT EXISTS turn (
  session_id   TEXT NOT NULL,
  turn_index   INTEGER NOT NULL,
  ask_text     TEXT NOT NULL,    -- redacted
  ask_at       TEXT,
  answer_text  TEXT,             -- redacted
  answer_at    TEXT,
  queued       INTEGER NOT NULL DEFAULT 1,
  closed       INTEGER NOT NULL,
  PRIMARY KEY (session_id, turn_index)
);
CREATE TABLE IF NOT EXISTS turn_fact (
  session_id     TEXT NOT NULL,
  turn_index     INTEGER NOT NULL,
  interrupted    INTEGER NOT NULL DEFAULT 0,
  notice         TEXT,
  stop_reason    TEXT,
  duration_ms    INTEGER,
  paths          TEXT NOT NULL DEFAULT '[]',  -- JSON PathMention[]
  path_source    TEXT NOT NULL,
  git_verdict    TEXT,
  git_checked_at INTEGER,
  PRIMARY KEY (session_id, turn_index)
);
CREATE TABLE IF NOT EXISTS provider_map (
  provider    TEXT PRIMARY KEY,
  map_version INTEGER NOT NULL,
  map_hash    TEXT NOT NULL,
  recorded_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

/** Every table the schema owns, for the rebuild on a newer stamp. */
const OVERVIEW_TABLES = [
  'session',
  'turn',
  'turn_fact',
  'provider_map',
  'meta'
] as const;

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare<[string], { c: number }>(
      "SELECT COUNT(*) AS c FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(name);
  return (row?.c ?? 0) > 0;
}

/**
 * The version recorded in the meta table, or null when there is none. Null
 * means the file is empty or was never finished being created, and either
 * way the answer is to run the schema.
 */
export function overviewSchemaVersionOnDisk(
  db: Database.Database
): number | null {
  if (!tableExists(db, 'meta')) return null;
  const row = db
    .prepare<[string], { value: string }>(
      'SELECT value FROM meta WHERE key = ?'
    )
    .get(VERSION_KEY);
  if (row === undefined) return null;
  const version = Number(row.value);
  return Number.isInteger(version) ? version : null;
}

/**
 * Bring the file to OVERVIEW_SCHEMA_VERSION in one transaction.
 *
 * - No meta table, or no version row: run the schema and stamp the version.
 * - The recorded version equals ours: nothing to do.
 * - The recorded version is lower: run the schema again. Every statement is
 *   CREATE TABLE IF NOT EXISTS, so a lower version gains what it is missing
 *   and loses nothing. Then stamp the new version.
 * - The recorded version is higher: a newer build wrote this file. The
 *   store is disposable, so drop every table and recreate the schema empty
 *   rather than write into a shape this build does not know.
 */
export function ensureOverviewSchema(db: Database.Database): void {
  const onDisk = overviewSchemaVersionOnDisk(db);
  if (onDisk === OVERVIEW_SCHEMA_VERSION) return;
  immediateTransaction(db, () => {
    if (onDisk !== null && onDisk > OVERVIEW_SCHEMA_VERSION) {
      for (const table of OVERVIEW_TABLES) {
        db.exec(`DROP TABLE IF EXISTS ${table};`);
      }
    }
    db.exec(OVERVIEW_SCHEMA_SQL);
    db.prepare<[string, string]>(
      'INSERT INTO meta (key, value) VALUES (?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(VERSION_KEY, String(OVERVIEW_SCHEMA_VERSION));
  });
}
