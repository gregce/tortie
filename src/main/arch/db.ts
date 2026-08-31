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
  ArchVerdictChanges,
  ArchVerdictStatus
} from '@shared/arch';
import type {
  ArchCameraState,
  ArchNodePosition,
  ArchPassScope,
  ArchPassTrigger
} from '@shared/ipc';
import {
  addColumnIfMissing,
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

/**
 * The scanned stamp for a repository that has no commits yet.
 *
 * `git rev-parse HEAD` has no commit to name there, and the fact base is
 * still complete, being every one of its zero tracked files read. The stamp
 * must be non null so the map's `building` flag clears; leaving it null put
 * the map into a permanent scan loop, because every `arch:mapUpdated` push
 * made the renderer re-read `arch:map`, whose building flag scheduled the
 * next scan, about thirty times a second until quit (Phase 160 fix round,
 * measured at 615 pushes in 20 seconds). The value can never collide with a
 * real commit because a commit is forty hex characters, and the first real
 * commit replaces it through the same mark.
 */
export const ARCH_SCANNED_NO_HEAD = 'no-commits-yet';

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
  },
  {
    // PHASE 162. The canvas: the camera and the kept layout, per repository
    // and per drill scope (`root`, or `part:<groupId>`), so each rung of the
    // ladder keeps its own picture. POSITIONS ONLY, never sizes: a box's size
    // is computed from its weight and file counts move, so a stored size
    // would freeze a lie. Both tables are as disposable as everything else in
    // this file: losing them costs a re-layout and a re-fit, nothing a person
    // wrote.
    name: '003-arch-canvas',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS arch_camera (
          repo_key TEXT NOT NULL,
          scope    TEXT NOT NULL,
          k        REAL NOT NULL,
          x        REAL NOT NULL,
          y        REAL NOT NULL,
          PRIMARY KEY (repo_key, scope)
        );
        CREATE TABLE IF NOT EXISTS arch_layout (
          repo_key TEXT NOT NULL,
          scope    TEXT NOT NULL,
          node_id  TEXT NOT NULL,
          x        REAL NOT NULL,
          y        REAL NOT NULL,
          PRIMARY KEY (repo_key, scope, node_id)
        );
      `);
    }
  },
  {
    // PHASE 158. One row per enrichment pass, whatever its verdict, so the
    // run's face can say what happened and when the contract was last
    // written, and a refusal rate that climbs after a model upgrade is
    // readable. The row carries the painted coverage count, being map binding
    // rule 2 made queryable, and the model's regroup suggestions as plain
    // sentences, which land on the run's face and are NEVER written to
    // docs/arch/. As disposable as everything else here: the contract itself
    // is in the repository, and losing this table loses only the history of
    // who wrote it.
    name: '004-arch-pass',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS arch_pass_run (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          repo_key       TEXT NOT NULL,
          repo_path      TEXT NOT NULL,
          started_at     INTEGER NOT NULL,
          wall_ms        INTEGER NOT NULL,
          agent_id       TEXT NOT NULL,
          model          TEXT NOT NULL,
          recipe_version INTEGER NOT NULL,
          verdict        TEXT NOT NULL,
          reason         TEXT,
          painted        INTEGER,
          groups_total   INTEGER,
          components     INTEGER,
          suggestions    TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_arch_pass_repo
          ON arch_pass_run(repo_key, id);
      `);
    }
  },
  {
    // PHASE 158, the fix round. A refused pass used to reach the face as a
    // token alone ("anchors-changed") while the validator's sentence naming
    // the field and the reason was dropped at the record. The sentence now
    // rides the row. Through `addColumnIfMissing` for the recovery reason
    // its own comment gives.
    name: '005-arch-pass-detail',
    up: (db) => {
      addColumnIfMissing(db, 'arch_pass_run', 'detail', 'TEXT');
    }
  },
  {
    // PHASE 159. A pass now says what it covered (`scope`: whole or drift),
    // who asked (`trigger`: the button, the ribbon, or the check itself) and
    // the fold's input hash over everything that decided the ask, written
    // whatever the verdict, so the automatic trigger can refuse the same
    // input rather than re-spend on it. Older rows read as whole, gesture,
    // and no hash. Beside them, one row per repository holding the last
    // burst of verdict changes a check produced, replaced only when a check
    // moved something. Derived and disposable like everything else here.
    name: '006-arch-pass-scope',
    up: (db) => {
      addColumnIfMissing(db, 'arch_pass_run', 'scope', 'TEXT');
      addColumnIfMissing(db, 'arch_pass_run', 'trigger', 'TEXT');
      addColumnIfMissing(db, 'arch_pass_run', 'input_hash', 'TEXT');
      db.exec(`
        CREATE TABLE IF NOT EXISTS arch_verdict_change (
          repo_key        TEXT PRIMARY KEY,
          from_generation INTEGER NOT NULL,
          to_generation   INTEGER NOT NULL,
          from_commit     TEXT,
          to_commit       TEXT NOT NULL,
          at              INTEGER NOT NULL,
          rows            TEXT NOT NULL
        );
      `);
    }
  },
  {
    // PHASE 178. The manifest reader learned every nested `package.json` in
    // the tree and the script arm's external answer became path aware, but the
    // freshness key for an import row is the FILE's mtime and size, so no
    // stamp moved and a re-scan would have reused every stored answer forever.
    // Same shape as 002: the fact base is derived, dropping it costs one
    // re-parse at about 1.25 ms per file, and the verdicts are left alone
    // because a run publishes over them anyway.
    name: '007-arch-rescan-for-nested-manifests',
    up: (db) => {
      db.exec(`
        DELETE FROM arch_import;
        DELETE FROM arch_import_file;
      `);
    }
  }
];

/**
 * The canvas bounds (Phase 162). A scope is `root` or `part:<groupId>`, and a
 * group id is a kebab directory name, so 256 characters is generous. The row
 * cap covers every scale a drawing lays out — 5 to 9 boxes at level 1, the
 * cap of 30 at level 2 — with two orders of headroom; matrix cells are never
 * positioned one by one. Anything past a bound refuses the WHOLE write with
 * the field named, never a truncation, so what is stored is always a picture
 * somebody actually made.
 */
const MAX_SCOPE_CHARS = 256;
const MAX_NODE_ID_CHARS = 256;
const MAX_LAYOUT_ROWS = 512;

/** One sentence naming the refusing field, or null when the scope is fine. */
function refuseScope(scope: string): string | null {
  if (scope.length === 0 || scope.length > MAX_SCOPE_CHARS) {
    return `scope must be 1 to ${String(MAX_SCOPE_CHARS)} characters`;
  }
  if (scope !== 'root' && !scope.startsWith('part:')) {
    return 'scope must be "root" or "part:<groupId>"';
  }
  return null;
}

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

interface PassRunRow {
  started_at: number;
  wall_ms: number;
  agent_id: string;
  model: string;
  recipe_version: number;
  verdict: string;
  reason: string | null;
  detail: string | null;
  painted: number | null;
  groups_total: number | null;
  components: number | null;
  suggestions: string;
  scope: string | null;
  trigger: string | null;
  input_hash: string | null;
}

/** One pass to record, whatever its verdict: the stored shape plus its keys. */
export interface NewArchPassRow extends StoredArchPassRun {
  repoKey: string;
  repoPath: string;
}

/** One recorded pass, read back for the run's face. */
export interface StoredArchPassRun {
  startedAt: number;
  wallMs: number;
  agentId: string;
  model: string;
  recipeVersion: number;
  verdict: 'kept' | 'refused' | 'failed';
  reason: string | null;
  /** The validator's sentence on a refusal. Null on kept and on older rows. */
  detail: string | null;
  painted: number | null;
  groupsTotal: number | null;
  components: number | null;
  suggestions: string[];
  /** Whole contract or drift only. Older rows read as whole. */
  scope: ArchPassScope;
  /** Who asked. Older rows read as gesture. */
  trigger: ArchPassTrigger;
  /** The fold's input hash, or null on an older row or a run that threw first. */
  inputHash: string | null;
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
   * The last burst of changes a check produced for a repository, or null
   * before any check moved anything. Read back whole; a row an older build
   * or a hand edit mangled reads as null rather than crashing the view.
   */
  verdictChanges(repoKey: string): ArchVerdictChanges | null {
    const row = this.db
      .prepare<[string], VerdictChangeRow>(
        `SELECT from_generation, to_generation, from_commit, to_commit, at, rows
           FROM arch_verdict_change WHERE repo_key = ?`
      )
      .get(repoKey);
    if (row === undefined) return null;
    const parsed = parseChangeRows(row.rows);
    if (parsed === null) return null;
    return {
      fromGeneration: row.from_generation,
      toGeneration: row.to_generation,
      fromCommit: row.from_commit,
      toCommit: row.to_commit,
      at: row.at,
      verdicts: parsed.verdicts,
      parts: parsed.parts
    };
  }

  /**
   * Replace the burst for one repository. `publish` calls this inside its
   * own transaction; it is public so a caller with a burst and no publish,
   * which today is only a test, can write one.
   */
  saveVerdictChanges(repoKey: string, changes: ArchVerdictChanges): void {
    this.db
      .prepare<[string, number, number, string | null, string, number, string]>(
        `INSERT INTO arch_verdict_change
           (repo_key, from_generation, to_generation, from_commit, to_commit, at, rows)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(repo_key) DO UPDATE SET
           from_generation = excluded.from_generation,
           to_generation = excluded.to_generation,
           from_commit = excluded.from_commit,
           to_commit = excluded.to_commit,
           at = excluded.at,
           rows = excluded.rows`
      )
      .run(
        repoKey,
        changes.fromGeneration,
        changes.toGeneration,
        changes.fromCommit,
        changes.toCommit,
        changes.at,
        JSON.stringify({ verdicts: changes.verdicts, parts: changes.parts })
      );
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
    /**
     * The burst this check produced (Phase 159), written in the same
     * transaction. Null or absent keeps the last burst, so a check that
     * moved nothing leaves the previous one on screen.
     */
    changes?: ArchVerdictChanges | null;
  }): boolean {
    return immediateTransaction(this.db, () => {
      const current = this.repoState(input.repoKey).generation;
      if (input.generation < current) return false;
      if (input.changes !== undefined && input.changes !== null) {
        this.saveVerdictChanges(input.repoKey, input.changes);
      }
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

  // -------------------------------------------------------------------------
  // The canvas (Phase 162): the camera and the kept layout
  // -------------------------------------------------------------------------

  /**
   * The kept camera and the kept positions for one scope, in one read.
   *
   * A row that fails validation — a non-finite number, written by an older
   * build or a hand edit — is dropped WHOLE rather than crashing the read or
   * handing the renderer a camera it cannot draw. The view then falls back to
   * the computed fit and the computed layout, which is exactly what a first
   * run does.
   */
  canvasState(
    repoKey: string,
    scope: string
  ): { camera: ArchCameraState | null; positions: ArchNodePosition[] } {
    const cameraRow = this.db
      .prepare<[string, string], { k: number; x: number; y: number }>(
        'SELECT k, x, y FROM arch_camera WHERE repo_key = ? AND scope = ?'
      )
      .get(repoKey, scope);
    const camera =
      cameraRow !== undefined &&
      Number.isFinite(cameraRow.k) &&
      cameraRow.k > 0 &&
      Number.isFinite(cameraRow.x) &&
      Number.isFinite(cameraRow.y)
        ? { k: cameraRow.k, x: cameraRow.x, y: cameraRow.y }
        : null;
    const rows = this.db
      .prepare<[string, string], { node_id: string; x: number; y: number }>(
        `SELECT node_id, x, y FROM arch_layout
           WHERE repo_key = ? AND scope = ? ORDER BY node_id`
      )
      .all(repoKey, scope);
    const positions: ArchNodePosition[] = [];
    for (const row of rows) {
      if (!Number.isFinite(row.x) || !Number.isFinite(row.y)) continue;
      positions.push({ nodeId: row.node_id, x: row.x, y: row.y });
    }
    return { camera, positions };
  }

  /**
   * Keep the scope's camera. Answers null when kept, or one sentence naming
   * the field and the reason when the write was refused whole.
   */
  saveCamera(
    repoKey: string,
    scope: string,
    camera: ArchCameraState
  ): string | null {
    const badScope = refuseScope(scope);
    if (badScope !== null) return badScope;
    if (!Number.isFinite(camera.k) || camera.k <= 0) {
      return 'camera.k must be a finite positive number';
    }
    if (!Number.isFinite(camera.x)) return 'camera.x must be a finite number';
    if (!Number.isFinite(camera.y)) return 'camera.y must be a finite number';
    this.db
      .prepare<[string, string, number, number, number]>(
        `INSERT INTO arch_camera (repo_key, scope, k, x, y)
           VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(repo_key, scope) DO UPDATE SET
           k = excluded.k, x = excluded.x, y = excluded.y`
      )
      .run(repoKey, scope, camera.k, camera.x, camera.y);
    return null;
  }

  /**
   * Replace the scope's kept layout WHOLE, in one transaction: the old rows
   * go and the new rows land together, so a kill between the two can never
   * leave half of each picture. Validation runs before the transaction and an
   * invalid position refuses the whole write, never a partial merge.
   */
  saveLayout(
    repoKey: string,
    scope: string,
    positions: ArchNodePosition[]
  ): string | null {
    const badScope = refuseScope(scope);
    if (badScope !== null) return badScope;
    if (positions.length > MAX_LAYOUT_ROWS) {
      return `positions has ${String(positions.length)} rows and the most a scope can hold is ${String(MAX_LAYOUT_ROWS)}`;
    }
    for (const p of positions) {
      if (p.nodeId.length === 0 || p.nodeId.length > MAX_NODE_ID_CHARS) {
        return `nodeId must be 1 to ${String(MAX_NODE_ID_CHARS)} characters`;
      }
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        return `position for ${p.nodeId} must be finite numbers`;
      }
    }
    const drop = this.db.prepare<[string, string]>(
      'DELETE FROM arch_layout WHERE repo_key = ? AND scope = ?'
    );
    const insert = this.db.prepare<[string, string, string, number, number]>(
      `INSERT INTO arch_layout (repo_key, scope, node_id, x, y)
         VALUES (?, ?, ?, ?, ?)`
    );
    immediateTransaction(this.db, () => {
      drop.run(repoKey, scope);
      for (const p of positions) {
        insert.run(repoKey, scope, p.nodeId, p.x, p.y);
      }
    });
    return null;
  }

  /** Drop the scope's kept layout: re-layout as an explicit act. */
  clearLayout(repoKey: string, scope: string): string | null {
    const badScope = refuseScope(scope);
    if (badScope !== null) return badScope;
    this.db
      .prepare<[string, string]>(
        'DELETE FROM arch_layout WHERE repo_key = ? AND scope = ?'
      )
      .run(repoKey, scope);
    return null;
  }

  // -------------------------------------------------------------------------
  // The enrichment pass record (Phase 158)
  // -------------------------------------------------------------------------

  /** Record one pass, whatever its verdict. Append only. */
  appendPassRun(row: NewArchPassRow): void {
    this.db
      .prepare<
        [
          string,
          string,
          number,
          number,
          string,
          string,
          number,
          string,
          string | null,
          string | null,
          number | null,
          number | null,
          number | null,
          string,
          string,
          string,
          string | null
        ]
      >(
        `INSERT INTO arch_pass_run
           (repo_key, repo_path, started_at, wall_ms, agent_id, model,
            recipe_version, verdict, reason, detail, painted, groups_total,
            components, suggestions, scope, trigger, input_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.repoKey,
        row.repoPath,
        row.startedAt,
        row.wallMs,
        row.agentId,
        row.model,
        row.recipeVersion,
        row.verdict,
        row.reason,
        row.detail,
        row.painted,
        row.groupsTotal,
        row.components,
        JSON.stringify(row.suggestions),
        row.scope,
        row.trigger,
        row.inputHash
      );
  }

  /** The newest recorded pass for a repository, or null before any ran. */
  latestPassRun(repoKey: string): StoredArchPassRun | null {
    const row = this.db
      .prepare<[string], PassRunRow>(
        `SELECT started_at, wall_ms, agent_id, model, recipe_version, verdict,
                reason, detail, painted, groups_total, components, suggestions,
                scope, trigger, input_hash
           FROM arch_pass_run WHERE repo_key = ?
          ORDER BY id DESC LIMIT 1`
      )
      .get(repoKey);
    if (row === undefined) return null;
    return {
      startedAt: row.started_at,
      wallMs: row.wall_ms,
      agentId: row.agent_id,
      model: row.model,
      recipeVersion: row.recipe_version,
      verdict: row.verdict as StoredArchPassRun['verdict'],
      reason: row.reason,
      detail: row.detail,
      painted: row.painted,
      groupsTotal: row.groups_total,
      components: row.components,
      suggestions: parseSuggestions(row.suggestions),
      scope: row.scope === 'drift' ? 'drift' : 'whole',
      trigger:
        row.trigger === 'ribbon' || row.trigger === 'drift'
          ? row.trigger
          : 'gesture',
      inputHash: row.input_hash
    };
  }

  /** Drop everything about one repository. Its tab was closed for good. */
  forgetRepo(repoKey: string): void {
    immediateTransaction(this.db, () => {
      for (const table of [
        'arch_import',
        'arch_import_file',
        'arch_verdict',
        'arch_freshness',
        'arch_camera',
        'arch_layout',
        'arch_pass_run',
        'arch_verdict_change',
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
/**
 * A stored suggestions list, back as sentences. A row an older build wrote,
 * or one somebody edited, reads as an empty list rather than crashing.
 */
function parseSuggestions(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

interface VerdictChangeRow {
  from_generation: number;
  to_generation: number;
  from_commit: string | null;
  to_commit: string;
  at: number;
  rows: string;
}

/** The stored burst rows, back as records, or null when the row is not one. */
function parseChangeRows(
  raw: string
): Pick<ArchVerdictChanges, 'verdicts' | 'parts'> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return null;
    const record = parsed as { verdicts?: unknown; parts?: unknown };
    if (!Array.isArray(record.verdicts) || !Array.isArray(record.parts)) return null;
    return {
      verdicts: record.verdicts as ArchVerdictChanges['verdicts'],
      parts: record.parts as ArchVerdictChanges['parts']
    };
  } catch {
    return null;
  }
}

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
