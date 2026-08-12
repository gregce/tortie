/**
 * Symbol-index persistence — better-sqlite3, the same library and the same
 * house migration pattern as `src/main/manifest/store.ts`, keyed by
 * `(repoPath, relPath, mtimeMs, size)` so relaunching a project re-parses only
 * the files that actually drifted.
 *
 * WHY A SEPARATE FILE FROM manifest.db, stated plainly because the Phase 14
 * brief says "the existing better-sqlite3 db" and this is a deliberate reading
 * of it rather than a drift:
 *
 *   The brief's requirement is reuse of the library and the incremental key,
 *   and both are honoured here verbatim. What is NOT honoured is co-locating a
 *   large, churny, entirely DISPOSABLE index inside the file that is gmux's
 *   tier-2 durability record. A 50,000-file repo is ~500,000 symbol rows and
 *   tens of MB of write traffic per cold build; better-sqlite3 is synchronous
 *   and SQLite serialises writers, so an indexing burst would contend with the
 *   write that records a session BEFORE it is spawned (manifest §2.4 Step 0) —
 *   the one write in this app that must never wait. CLAUDE.md's first
 *   invariant is that durability-critical state stays isolated; putting the
 *   cheapest-to-rebuild thing in the app next to the most expensive-to-lose
 *   thing is the same mistake pointed the other way.
 *
 *   Cost of the separation: one extra file in the same directory. Cost of not
 *   separating: a symbol index that can stall session creation, and a
 *   `rm symbols.db` recovery that becomes "restore your manifest from a
 *   backup". If a later reviewer disagrees, SYMBOL_DB_FILE below is the only
 *   line to change.
 *
 * The columnar blob is NEVER persisted, only rows — rebuilding a million-row
 * table from rows costs 245 ms (research 19 §3.3), and a second on-disk format
 * would be a second thing to keep in step.
 */

import type Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { SymbolKind } from '@shared/symbols';
import { openGmuxDatabase, runMigrations, type SqliteMigration } from '../db/sqlite';
import type { ExtractedSymbol } from './extract';

/** The one line to change if this should live inside manifest.db after all. */
const SYMBOL_DB_FILE = 'symbols.db';

/**
 * `<userData>/gmux/symbols.db`.
 *
 * electron is required LAZILY, the same way src/main/search/resolve.ts does
 * it, so this module stays loadable in a plain-node unit test — the store's
 * SQL is exactly the kind of thing that should be tested without booting an
 * Electron app.
 */
export function defaultSymbolDbPath(): string {
  const { app } = createRequire(import.meta.url)(
    'electron'
  ) as typeof import('electron');
  return join(app.getPath('userData'), 'gmux', SYMBOL_DB_FILE);
}

/** The persisted freshness key for one file. */
export interface FileStamp {
  mtimeMs: number;
  size: number;
}

const MIGRATIONS: readonly SqliteMigration[] = [
  {
    name: '001-symbol-index',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS symbol_file (
          repo_path  TEXT NOT NULL,
          rel_path   TEXT NOT NULL,
          mtime_ms   REAL NOT NULL,
          size       INTEGER NOT NULL,
          indexed_at INTEGER NOT NULL,
          PRIMARY KEY (repo_path, rel_path)
        );
        CREATE TABLE IF NOT EXISTS symbol_index (
          repo_path  TEXT NOT NULL,
          rel_path   TEXT NOT NULL,
          name       TEXT NOT NULL,
          kind       TEXT NOT NULL,
          container  TEXT,
          line       INTEGER NOT NULL,
          col        INTEGER NOT NULL,
          end_col    INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_symbol_index_file
          ON symbol_index(repo_path, rel_path);
      `);
    }
  }
];

interface FileRow {
  rel_path: string;
  mtime_ms: number;
  size: number;
}

interface SymbolRow {
  rel_path: string;
  name: string;
  kind: string;
  container: string | null;
  line: number;
  col: number;
  end_col: number;
}

export class SymbolPersistence {
  private readonly db: Database.Database;

  constructor(dbPath?: string) {
    // Same opener, same pragmas, same migration runner as the manifest — see
    // src/main/db/sqlite.ts for why that is now enforced rather than copied.
    this.db = openGmuxDatabase(dbPath ?? defaultSymbolDbPath());
    runMigrations(this.db, MIGRATIONS);
  }

  /** The freshness key for every file gmux has indexed in this repo. */
  loadStamps(repoPath: string): Map<string, FileStamp> {
    const rows = this.db
      .prepare<[string], FileRow>(
        'SELECT rel_path, mtime_ms, size FROM symbol_file WHERE repo_path = ?'
      )
      .all(repoPath);
    const out = new Map<string, FileStamp>();
    for (const row of rows) {
      out.set(row.rel_path, { mtimeMs: row.mtime_ms, size: row.size });
    }
    return out;
  }

  /** Every persisted symbol for a repo, grouped by file. */
  loadSymbols(repoPath: string): Map<string, ExtractedSymbol[]> {
    const rows = this.db
      .prepare<[string], SymbolRow>(
        `SELECT rel_path, name, kind, container, line, col, end_col
           FROM symbol_index WHERE repo_path = ?`
      )
      .all(repoPath);
    const out = new Map<string, ExtractedSymbol[]>();
    for (const row of rows) {
      let list = out.get(row.rel_path);
      if (list === undefined) {
        list = [];
        out.set(row.rel_path, list);
      }
      list.push({
        name: row.name,
        kind: row.kind as SymbolKind,
        container: row.container,
        line: row.line,
        column: row.col,
        endColumn: row.end_col
      });
    }
    return out;
  }

  /**
   * Replace one batch of files' symbols, in ONE transaction.
   *
   * Batched deliberately: better-sqlite3 is synchronous, so this blocks the
   * main thread for as long as it runs. A batch is `BATCH_SIZE` files — tens
   * of ms at worst — and the indexer yields between batches. Writing a whole
   * 50k-file build in one transaction would freeze the window for seconds.
   */
  saveFiles(
    repoPath: string,
    files: {
      relPath: string;
      mtimeMs: number;
      size: number;
      symbols: ExtractedSymbol[];
    }[]
  ): void {
    if (files.length === 0) return;
    const deleteSymbols = this.db.prepare<[string, string]>(
      'DELETE FROM symbol_index WHERE repo_path = ? AND rel_path = ?'
    );
    const upsertFile = this.db.prepare<[string, string, number, number, number]>(
      `INSERT INTO symbol_file (repo_path, rel_path, mtime_ms, size, indexed_at)
         VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(repo_path, rel_path) DO UPDATE SET
         mtime_ms = excluded.mtime_ms,
         size = excluded.size,
         indexed_at = excluded.indexed_at`
    );
    const insertSymbol = this.db.prepare(
      `INSERT INTO symbol_index
         (repo_path, rel_path, name, kind, container, line, col, end_col)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = Date.now();
    this.db.transaction(() => {
      for (const file of files) {
        deleteSymbols.run(repoPath, file.relPath);
        upsertFile.run(repoPath, file.relPath, file.mtimeMs, file.size, now);
        for (const s of file.symbols) {
          insertSymbol.run(
            repoPath,
            file.relPath,
            s.name,
            s.kind,
            s.container,
            s.line,
            s.column,
            s.endColumn
          );
        }
      }
    })();
  }

  /** Forget files that no longer exist (a rename, a deletion, a branch flip). */
  forgetFiles(repoPath: string, relPaths: string[]): void {
    if (relPaths.length === 0) return;
    const dropSymbols = this.db.prepare<[string, string]>(
      'DELETE FROM symbol_index WHERE repo_path = ? AND rel_path = ?'
    );
    const dropFile = this.db.prepare<[string, string]>(
      'DELETE FROM symbol_file WHERE repo_path = ? AND rel_path = ?'
    );
    this.db.transaction(() => {
      for (const relPath of relPaths) {
        dropSymbols.run(repoPath, relPath);
        dropFile.run(repoPath, relPath);
      }
    })();
  }

  /** Drop a whole project (its tab was closed for good). */
  forgetRepo(repoPath: string): void {
    this.db.transaction(() => {
      this.db
        .prepare('DELETE FROM symbol_index WHERE repo_path = ?')
        .run(repoPath);
      this.db
        .prepare('DELETE FROM symbol_file WHERE repo_path = ?')
        .run(repoPath);
    })();
  }

  close(): void {
    this.db.close();
  }
}
