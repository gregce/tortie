/**
 * `arch.db` — the disposable side of the standing contract (Phase 63).
 *
 * WHAT LIVES HERE AND WHY IT IS A THIRD FILE. The contract itself is tracked
 * files in the person's repository and Tortie never writes them. Everything
 * this database holds is DERIVED from those files and from the code beside
 * them: the computed import edges, the verdicts the five checkers reached, the
 * freshness counts, and one row per repository saying what commit the last
 * completed check ran at. Deleting the file costs a re-check and loses nothing
 * a person wrote.
 *
 * It is a separate file from `manifest.db` for the reason `symbols.db` is, and
 * research 49 section 4.5 says so in its own words. better-sqlite3 is
 * synchronous and SQLite serialises writers, so an import scan over a large
 * repository must never be able to make the write that records a session wait.
 * CLAUDE.md's first invariant is that durability critical state stays isolated.
 * `build/assert-import-boundaries.mjs` holds the other half of that wall, which
 * is that nothing under `src/main/arch/` may name `src/main/manifest/`.
 *
 * THE OPENER IS THE ONE OPENER. `openGmuxDatabase` in ../db/sqlite.ts owns the
 * pragmas, the integrity gate and the migration runner, and this file adds no
 * opinion of its own beyond turning the rebuild off: a damaged arch database is
 * cheaper to recompute than to reconstruct, and the recompute is the same code
 * path a first run takes.
 *
 * KEYED BY IDENTITY, NOT BY NAME. A repository is keyed by `(st_dev, st_ino)`
 * of its directory, with the path as the fallback when the stat fails. A person
 * who renames a project keeps their verdicts; two checkouts of the same
 * repository at two paths keep separate ones, which is right, because their
 * HEADs differ.
 */

import type Database from 'better-sqlite3';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type {
  ArchCoverage,
  ArchCoverageCounts,
  ArchFreshness,
  ArchOffending,
  ArchVerdict,
  ArchVerdictStatus
} from '@shared/arch';
import {
  immediateTransaction,
  openGmuxDatabase,
  runMigrations,
  type SqliteMigration
} from '../db/sqlite';

/** The one line to change if this should ever live somewhere else. */
const ARCH_DB_FILE = 'arch.db';

/**
 * `<userData>/gmux/arch.db`, inside the protected inner directory beside the
 * manifest and the symbol index.
 *
 * electron is required LAZILY, the way ../symbols/persist.ts does it, so this
 * module stays loadable in a plain node unit test. The SQL below is exactly the
 * kind of thing that should be tested without booting an Electron app.
 */
export function defaultArchDbPath(): string {
  const { app } = createRequire(import.meta.url)(
    'electron'
  ) as typeof import('electron');
  return join(app.getPath('userData'), 'gmux', ARCH_DB_FILE);
}

/**
 * The identity of one project directory: its device and inode, or its path when
 * the stat fails. See the header for why identity rather than name.
 */
export function archRepoKey(repoPath: string): string {
  try {
    const st = statSync(repoPath);
    return `${st.dev}:${st.ino}`;
  } catch {
    return `path:${repoPath}`;
  }
}

/** How one specifier was answered. `unverifiable` is a language this build does not resolve. */
export type ArchImportResolution =
  | 'first-party'
  | 'external'
  | 'unresolved'
  | 'unverifiable';

/** One import, as the fact base holds it. */
export interface ArchImportEdge {
  /** Repository relative path of the file the import is written in. */
  fromPath: string;
  /** 1 based line of the specifier. */
  line: number;
  /** The specifier exactly as written. */
  specifier: string;
  /** Repository relative path it resolved to, or null when it did not. */
  toPath: string | null;
  resolution: ArchImportResolution;
  /** The grammar the file was read with, for the per language container. */
  language: string;
}

/** The freshness key for one scanned file, so a re-scan reads only what drifted. */
export interface ArchFileStamp {
  mtimeMs: number;
  size: number;
}

/** What the store knows about one repository between runs. */
export interface ArchRepoState {
  checkedAtCommit: string | null;
  generation: number;
  /** The commit the import fact base was scanned at, or null before any scan. */
  scannedAtCommit: string | null;
  /**
   * The verdict strip's own counts from the last completed run, or null before
   * one.
   *
   * STORED RATHER THAN RECOMPUTED, and the reason is the accepted count. A
   * baseline row that already accepted a divergence is counted separately and
   * shown with its `because` text, so a person can see that an acceptance
   * exists. Which verdicts were accepted is a fact the checkers know and the
   * stored verdict row does not carry, so recomputing the strip from stored
   * rows alone would silently fold every accepted divergence back into the
   * held count, which is the one thing the by coverage rule exists to stop.
   */
  counts: ArchCoverageCounts | null;
}

const MIGRATIONS: readonly SqliteMigration[] = [
  {
    name: '001-arch',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS arch_repo (
          repo_key          TEXT PRIMARY KEY,
          repo_path         TEXT NOT NULL,
          checked_at_commit TEXT,
          scanned_at_commit TEXT,
          counts            TEXT,
          generation        INTEGER NOT NULL DEFAULT 0,
          updated_at        INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS arch_import_file (
          repo_key   TEXT NOT NULL,
          rel_path   TEXT NOT NULL,
          mtime_ms   REAL NOT NULL,
          size       INTEGER NOT NULL,
          scanned_at INTEGER NOT NULL,
          PRIMARY KEY (repo_key, rel_path)
        );
        CREATE TABLE IF NOT EXISTS arch_import (
          repo_key   TEXT NOT NULL,
          from_path  TEXT NOT NULL,
          line       INTEGER NOT NULL,
          specifier  TEXT NOT NULL,
          to_path    TEXT,
          resolution TEXT NOT NULL,
          language   TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_arch_import_file
          ON arch_import(repo_key, from_path);
        CREATE INDEX IF NOT EXISTS idx_arch_import_to
          ON arch_import(repo_key, to_path);
        CREATE TABLE IF NOT EXISTS arch_verdict (
          repo_key          TEXT NOT NULL,
          subject_id        TEXT NOT NULL,
          status            TEXT NOT NULL,
          coverage          TEXT NOT NULL,
          offending         TEXT,
          checked_at_commit TEXT NOT NULL,
          generation        INTEGER NOT NULL,
          first_check       INTEGER NOT NULL,
          reason            TEXT,
          duration_ms       INTEGER NOT NULL,
          PRIMARY KEY (repo_key, subject_id)
        );
        CREATE TABLE IF NOT EXISTS arch_freshness (
          repo_key          TEXT NOT NULL,
          component_id      TEXT NOT NULL,
          commits_behind    INTEGER NOT NULL,
          uncommitted_files INTEGER NOT NULL,
          PRIMARY KEY (repo_key, component_id)
        );
      `);
    }
  },
  {
    // PHASE 157. THREE ARMS SHIPPED AND THE FACT BASE COULD NOT HAVE NOTICED.
    //
    // The freshness key for an import row is the file's mtime and size, held in
    // arch_import_file. Phase 157 changed no Rust, Python or Ruby FILE, it
    // changed the resolver that reads them, so every stamp still matches and a
    // re-scan would have reused every stored row. A repository scanned by the
    // previous build holds `unverifiable` for every Rust and Python import and
    // holds nothing at all for Ruby, and those rows would have survived
    // forever, on this machine and on every person's.
    //
    // So the fact base is dropped whole rather than aged. It is DERIVED: the
    // next check re-parses the tree and writes it again, which was measured at
    // about 1.25 ms per file, and nothing a person wrote lives in either table.
    // The verdicts are left alone, because a run publishes over them anyway and
    // deleting them would blank the view before the first re-scan finishes.
    name: '002-arch-rescan-for-resolver-arms',
    up: (db) => {
      db.exec(`
        DELETE FROM arch_import;
        DELETE FROM arch_import_file;
      `);
    }
  }
];

interface ImportRow {
  from_path: string;
  line: number;
  specifier: string;
  to_path: string | null;
  resolution: string;
  language: string;
}

interface VerdictRow {
  subject_id: string;
  status: string;
  coverage: string;
  offending: string | null;
  checked_at_commit: string;
  generation: number;
  first_check: number;
  reason: string | null;
  duration_ms: number;
}

interface FreshnessRow {
  component_id: string;
  commits_behind: number;
  uncommitted_files: number;
}

interface StampRow {
  rel_path: string;
  mtime_ms: number;
  size: number;
}

/**
 * The arch store. One instance per process, opened on the first arch call and
 * closed by the ordered disposer.
 */
export class ArchStore {
  private readonly db: Database.Database;

  constructor(dbPath?: string) {
    // The one opener, the one migration runner. `recover: false` because this
    // whole file is derived: rebuilding it from the repository is cheaper and
    // more honest than reconstructing rows out of a damaged one.
    this.db = openGmuxDatabase(dbPath ?? defaultArchDbPath(), {
      recover: false
    });
    runMigrations(this.db, MIGRATIONS);
  }

  /** What the store knows about this repository between runs. */
  repoState(repoKey: string): ArchRepoState {
    const row = this.db
      .prepare<
        [string],
        {
          checked_at_commit: string | null;
          scanned_at_commit: string | null;
          counts: string | null;
          generation: number;
        }
      >(
        `SELECT checked_at_commit, scanned_at_commit, counts, generation
           FROM arch_repo WHERE repo_key = ?`
      )
      .get(repoKey);
    if (row === undefined) {
      return {
        checkedAtCommit: null,
        generation: 0,
        scannedAtCommit: null,
        counts: null
      };
    }
    return {
      checkedAtCommit: row.checked_at_commit,
      generation: row.generation,
      scannedAtCommit: row.scanned_at_commit,
      counts: parseCounts(row.counts)
    };
  }

  /**
   * Claim the next generation for a run, before the run starts.
   *
   * The stamp is what keeps a torn tree honest. A run writes its verdicts under
   * the generation it claimed here, and a run whose generation is no longer the
   * newest discards its own results rather than publishing half of two runs
   * over each other.
   */
  claimGeneration(repoKey: string, repoPath: string): number {
    return immediateTransaction(this.db, () => {
      const state = this.repoState(repoKey);
      const next = state.generation + 1;
      this.db
        .prepare<[string, string, number, number]>(
          `INSERT INTO arch_repo (repo_key, repo_path, generation, updated_at)
             VALUES (?, ?, ?, ?)
           ON CONFLICT(repo_key) DO UPDATE SET
             repo_path = excluded.repo_path,
             generation = excluded.generation,
             updated_at = excluded.updated_at`
        )
        .run(repoKey, repoPath, next, Date.now());
      return next;
    });
  }

  /** The generation a later run must still match to be allowed to publish. */
  currentGeneration(repoKey: string): number {
    return this.repoState(repoKey).generation;
  }

  // -------------------------------------------------------------------------
  // The fact base
  // -------------------------------------------------------------------------

  /** The freshness key for every file this repository's import scan has read. */
  importStamps(repoKey: string): Map<string, ArchFileStamp> {
    const rows = this.db
      .prepare<[string], StampRow>(
        'SELECT rel_path, mtime_ms, size FROM arch_import_file WHERE repo_key = ?'
      )
      .all(repoKey);
    const out = new Map<string, ArchFileStamp>();
    for (const row of rows) {
      out.set(row.rel_path, { mtimeMs: row.mtime_ms, size: row.size });
    }
    return out;
  }

  /**
   * Replace one batch of files' imports, in ONE transaction.
   *
   * Batched for the reason the symbol index batches: better-sqlite3 is
   * synchronous, so this blocks the main thread for as long as it runs. A batch
   * is tens of milliseconds at worst and the scanner yields between batches.
   */
  saveImports(
    repoKey: string,
    files: {
      relPath: string;
      mtimeMs: number;
      size: number;
      imports: ArchImportEdge[];
    }[]
  ): void {
    if (files.length === 0) return;
    const dropImports = this.db.prepare<[string, string]>(
      'DELETE FROM arch_import WHERE repo_key = ? AND from_path = ?'
    );
    const upsertFile = this.db.prepare<
      [string, string, number, number, number]
    >(
      `INSERT INTO arch_import_file (repo_key, rel_path, mtime_ms, size, scanned_at)
         VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(repo_key, rel_path) DO UPDATE SET
         mtime_ms = excluded.mtime_ms,
         size = excluded.size,
         scanned_at = excluded.scanned_at`
    );
    const insertImport = this.db.prepare(
      `INSERT INTO arch_import
         (repo_key, from_path, line, specifier, to_path, resolution, language)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const now = Date.now();
    immediateTransaction(this.db, () => {
      for (const file of files) {
        dropImports.run(repoKey, file.relPath);
        upsertFile.run(repoKey, file.relPath, file.mtimeMs, file.size, now);
        for (const edge of file.imports) {
          insertImport.run(
            repoKey,
            edge.fromPath,
            edge.line,
            edge.specifier,
            edge.toPath,
            edge.resolution,
            edge.language
          );
        }
      }
    });
  }

  /** Forget files that no longer exist: a rename, a deletion, a branch flip. */
  forgetImportFiles(repoKey: string, relPaths: string[]): void {
    if (relPaths.length === 0) return;
    const dropImports = this.db.prepare<[string, string]>(
      'DELETE FROM arch_import WHERE repo_key = ? AND from_path = ?'
    );
    const dropFile = this.db.prepare<[string, string]>(
      'DELETE FROM arch_import_file WHERE repo_key = ? AND rel_path = ?'
    );
    immediateTransaction(this.db, () => {
      for (const relPath of relPaths) {
        dropImports.run(repoKey, relPath);
        dropFile.run(repoKey, relPath);
      }
    });
  }

  /** Every computed import edge for a repository. The checkers' whole fact base. */
  imports(repoKey: string): ArchImportEdge[] {
    const rows = this.db
      .prepare<[string], ImportRow>(
        `SELECT from_path, line, specifier, to_path, resolution, language
           FROM arch_import WHERE repo_key = ?`
      )
      .all(repoKey);
    return rows.map((row) => ({
      fromPath: row.from_path,
      line: row.line,
      specifier: row.specifier,
      toPath: row.to_path,
      resolution: row.resolution as ArchImportResolution,
      language: row.language
    }));
  }

  /** Record the commit the fact base was scanned at, once the scan finished. */
  markScanned(repoKey: string, repoPath: string, commit: string | null): void {
    this.db
      .prepare<[string, string, string | null, number]>(
        `INSERT INTO arch_repo (repo_key, repo_path, scanned_at_commit, updated_at)
           VALUES (?, ?, ?, ?)
         ON CONFLICT(repo_key) DO UPDATE SET
           repo_path = excluded.repo_path,
           scanned_at_commit = excluded.scanned_at_commit,
           updated_at = excluded.updated_at`
      )
      .run(repoKey, repoPath, commit, Date.now());
  }

  // -------------------------------------------------------------------------
  // The verdicts
  // -------------------------------------------------------------------------

  /** Whatever the last completed check concluded. Answerable with nothing running. */
  verdicts(repoKey: string): ArchVerdict[] {
    const rows = this.db
      .prepare<[string], VerdictRow>(
        `SELECT subject_id, status, coverage, offending, checked_at_commit,
                generation, first_check, reason, duration_ms
           FROM arch_verdict WHERE repo_key = ?`
      )
      .all(repoKey);
    return rows.map((row) => ({
      subjectId: row.subject_id,
      status: row.status as ArchVerdictStatus,
      coverage: row.coverage as ArchCoverage,
      offending: parseOffending(row.offending),
      checkedAtCommit: row.checked_at_commit,
      generation: row.generation,
      firstCheck: row.first_check === 1,
      reason: row.reason,
      durationMs: row.duration_ms
    }));
  }

  /** What the freshness pass last counted, per component. */
  freshness(repoKey: string): ArchFreshness[] {
    const rows = this.db
      .prepare<[string], FreshnessRow>(
        `SELECT component_id, commits_behind, uncommitted_files
           FROM arch_freshness WHERE repo_key = ?`
      )
      .all(repoKey);
    return rows.map((row) => ({
      componentId: row.component_id,
      commitsBehind: row.commits_behind,
      uncommittedFiles: row.uncommitted_files
    }));
  }

  /**
   * Publish one finished run, in ONE transaction, under its generation stamp.
   *
   * It refuses when a newer run has already claimed a generation, and the
   * return value says so. That is the whole torn tree rule: a slow run over a
   * half written tree never overwrites a newer run's answer, and the caller
   * throws its own results away rather than publishing them late.
   */
  publish(input: {
    repoKey: string;
    repoPath: string;
    generation: number;
    checkedAtCommit: string;
    verdicts: ArchVerdict[];
    freshness: ArchFreshness[];
    counts: ArchCoverageCounts;
  }): boolean {
    return immediateTransaction(this.db, () => {
      const current = this.repoState(input.repoKey).generation;
      if (input.generation < current) return false;
      this.db
        .prepare<[string]>('DELETE FROM arch_verdict WHERE repo_key = ?')
        .run(input.repoKey);
      this.db
        .prepare<[string]>('DELETE FROM arch_freshness WHERE repo_key = ?')
        .run(input.repoKey);
      const insertVerdict = this.db.prepare(
        `INSERT INTO arch_verdict
           (repo_key, subject_id, status, coverage, offending,
            checked_at_commit, generation, first_check, reason, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const verdict of input.verdicts) {
        insertVerdict.run(
          input.repoKey,
          verdict.subjectId,
          verdict.status,
          verdict.coverage,
          verdict.offending === undefined || verdict.offending.length === 0
            ? null
            : JSON.stringify(verdict.offending),
          verdict.checkedAtCommit,
          input.generation,
          verdict.firstCheck ? 1 : 0,
          verdict.reason,
          Math.round(verdict.durationMs)
        );
      }
      const insertFreshness = this.db.prepare(
        `INSERT INTO arch_freshness
           (repo_key, component_id, commits_behind, uncommitted_files)
         VALUES (?, ?, ?, ?)`
      );
      for (const row of input.freshness) {
        insertFreshness.run(
          input.repoKey,
          row.componentId,
          row.commitsBehind,
          row.uncommittedFiles
        );
      }
      this.db
        .prepare<[string, string, string, string, number]>(
          `INSERT INTO arch_repo
             (repo_key, repo_path, checked_at_commit, counts, updated_at)
             VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(repo_key) DO UPDATE SET
             repo_path = excluded.repo_path,
             checked_at_commit = excluded.checked_at_commit,
             counts = excluded.counts,
             updated_at = excluded.updated_at`
        )
        .run(
          input.repoKey,
          input.repoPath,
          input.checkedAtCommit,
          JSON.stringify(input.counts),
          Date.now()
        );
      return true;
    });
  }

  /** Drop everything about one repository. Its tab was closed for good. */
  forgetRepo(repoKey: string): void {
    immediateTransaction(this.db, () => {
      for (const table of [
        'arch_import',
        'arch_import_file',
        'arch_verdict',
        'arch_freshness',
        'arch_repo'
      ]) {
        this.db
          .prepare(`DELETE FROM ${table} WHERE repo_key = ?`)
          .run(repoKey);
      }
    });
  }

  close(): void {
    this.db.close();
  }
}

/**
 * A stored offending list, back as records.
 *
 * A row written by an older build, or one somebody edited by hand, is dropped
 * whole rather than crashing the read. The verdict itself survives without its
 * jump targets, which renders as a verdict with nowhere to jump instead of an
 * empty view.
 */
function parseOffending(raw: string | null): ArchOffending[] | undefined {
  if (raw === null || raw.length === 0) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed as ArchOffending[];
  } catch {
    return undefined;
  }
}

/**
 * The stored strip counts, back as a record.
 *
 * A row written by an older build, or one that was never written, reads as null
 * and the view says not yet checked rather than drawing a strip of zeroes that
 * would be read as a clean bill of health.
 */
function parseCounts(raw: string | null): ArchCoverageCounts | null {
  if (raw === null || raw.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return null;
    return parsed as ArchCoverageCounts;
  } catch {
    return null;
  }
}
