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
import {
  ARCH_BOUNDARY_START_KINDS,
  ARCH_CITE_GRADES,
  ARCH_FACT_CATEGORIES,
  ARCH_FACT_KINDS,
  ARCH_FACT_LIMITS,
  ARCH_MODULE_ROOT_KIND
} from '@shared/arch';
import type {
  ArchCiteGrade,
  ArchCoverage,
  ArchCoverageCounts,
  ArchFact,
  ArchFactCategory,
  ArchFactCounts,
  ArchFactDraft,
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
import type { ArchSemanticAskFacts } from './semantic/types';
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

/** One parsed file's definition counts by kind, kept by the same scan (Phase 201). */
export interface ArchFileDefinitions {
  path: string;
  kinds: Record<string, number>;
}

/** One tracked file as one read of the tree saw it (Phase 201). */
export interface ArchTreeFileFact {
  path: string;
  /** Newlines in the file; zero for a binary or an absent file. */
  lines: number;
  /** The name a manifest declares, null for any other file or an unnamed one. */
  declares: string | null;
}

/**
 * The freshness key for one file the fact pass has seen (Phase 257).
 *
 * `oid` is git's own blob name of the bytes, computed in process, and it is
 * what lets a file whose stamp moved but whose bytes did not be LINKED without
 * a parse. `wrapDigest` is the wrapper map the file's `+wrap` facts were
 * computed under, or null when the pass was off at the link.
 */
export interface ArchFactStamp extends ArchFileStamp {
  oid: string;
  wrapDigest: string | null;
  /** The grammar id, `manifest`, `path`, or null for a file no rule reads. */
  lang: string | null;
  /** The vendor reason the link was written under, or null when the file was rule-read. */
  vendored: string | null;
  /** Whether the worker hit its call ceiling on the parse the link records. */
  truncated: boolean;
}

/** One file to link, or re-link, to the facts of its bytes (Phase 257). */
export interface ArchFactFileLink {
  relPath: string;
  oid: string;
  mtimeMs: number;
  size: number;
  lang: string | null;
  /** The vendor filter's reason, or null when the file was rule-read. */
  vendored: string | null;
  /** True when the worker hit its call ceiling on this file. */
  truncated: boolean;
  wrapDigest: string | null;
}

/**
 * One wrapper declaration as the store keeps it (Phase 257). Structurally the
 * worker's own `ExtractedWrapper`, so a list of those is passed straight in.
 * `innerLast` is already alias-resolved by the worker.
 */
export interface ArchWrapperDecl {
  name: string;
  innerCallee: string;
  innerLast: string;
  paramIndex: number;
  innerIndex: number;
  /** 1 when the inner callee is an anchor, else 0 for an unresolved candidate. */
  hops: number;
  line: number;
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
   * PHASE 244, audit finding F3. Why the scan at {@link scannedAtCommit} is
   * INCOMPLETE, or null when it read the whole folder.
   *
   * A scan can finish without having seen everything, and until this phase that
   * fact was thrown away. `ArchSource.syncTree` answers `overBudget` when a
   * remote mirror stopped at its file or byte ceiling, and BOTH coordinator
   * paths then recorded the run as a complete scan at the supplied commit: the
   * contract path kept the sentence for the check result and stamped anyway,
   * and the fact-only path did not even bind the result. The map derives
   * `building` from the stamp, so the person was shown a settled answer over a
   * fact base that had never seen part of the folder.
   *
   * THE STAMP IS STILL WRITTEN, deliberately. Leaving it null is what keeps
   * `building` true, and `building` schedules the next check on every map read;
   * a mirror ceiling is not something a rescan can get past, so that is the
   * endless impossible read the audit warned against, and it was measured once
   * before at about thirty pushes a second (see ARCH_SCANNED_NO_HEAD). So the
   * loop stops and the REASON travels instead.
   */
  scanIncomplete: string | null;
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

// ---------------------------------------------------------------------------
// The semantic reading (Phase 259; SPEC §3)
// ---------------------------------------------------------------------------

/** One declaration row, keyed on the bytes it was read from. */
export interface ArchDeclDraftRow {
  kind: string;
  subject: string;
  line: number;
  evidence: string;
}

/** One declaration joined to the file it sits in. */
export interface ArchDeclRow extends ArchDeclDraftRow {
  file: string;
}

/** One semantic ask to record, whatever its verdict. */
export interface NewArchSemanticRun extends ArchSemanticAskFacts {
  repoKey: string;
  runId: string;
  claims: number;
}

/** One citation to write, already graded. */
export interface NewArchClaimCite {
  relPath: string;
  line: number;
  why: string;
  grade: ArchCiteGrade;
  factKind: string | null;
  factSubject: string | null;
  factLine: number | null;
  /** The cited file's blob oid at the moment the claim was written. */
  blobOid: string;
}

/** One claim, gate reason or journey step label to write, with its citations. */
export interface NewArchClaimRow {
  claimId: string;
  /** `part:<id>`, `gate:<partId>/<id>` or `journey:<id>#<seq>`. */
  subject: string;
  field: string;
  text: string;
  /** A gate's question, null for everything else. */
  question: string | null;
  /** A gate's one word answer, null for everything else. */
  answer: string | null;
  cites: readonly NewArchClaimCite[];
}

/** One journey's walk. */
export interface NewArchJourneyRow {
  journeyId: string;
  name: string;
  source: 'model' | 'contract';
  steps: readonly { seq: number; partId: string; label: string }[];
}

/** One claim as the store reads it back. */
export interface StoredArchClaim {
  claimId: string;
  subject: string;
  field: string;
  text: string;
  question: string | null;
  answer: string | null;
  runId: string;
  writtenAt: number;
  stale: boolean;
  staleReason: string | null;
}

/** One citation as the store reads it back. */
export interface StoredArchCite {
  claimId: string;
  seq: number;
  relPath: string;
  line: number;
  why: string;
  grade: ArchCiteGrade;
  factKind: string | null;
  factSubject: string | null;
  factLine: number | null;
  blobOid: string;
  dead: boolean;
}

/** One journey step as the store reads it back. */
export interface StoredArchJourneyStep {
  journeyId: string;
  name: string;
  source: 'model' | 'contract';
  seq: number;
  partId: string;
  label: string;
}

/** One scope's backing WITH its floor. There is no shape without one. */
export interface StoredArchRate {
  scope: string;
  backed: number;
  total: number;
  floorWithin: number;
  floorLines: number;
  byGrade: Record<ArchCiteGrade, number>;
  floorByGrade: Record<ArchCiteGrade, number>;
  gateShaped: number;
  gateClaims: number;
  computedAt: number;
}

/** One recorded semantic ask, read back for the face. */
export interface StoredArchSemanticRun extends Omit<NewArchSemanticRun, 'repoKey'> {}

/** Everything one repository's reading holds, as raw rows. */
export interface ArchSemanticRows {
  claims: StoredArchClaim[];
  cites: StoredArchCite[];
  journeys: StoredArchJourneyStep[];
  rates: StoredArchRate[];
  runs: StoredArchSemanticRun[];
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
  },
  {
    // PHASE 201, the reading. The scan keeps the definition counts by kind
    // beside each file's imports, because the symbols come back on the SAME
    // worker message and the store used to drop them: the sentence behind a
    // box's hover says what a part defines from the one parse rather than a
    // second. Same shape as 002 and 007 for the existing rows, being a
    // derived fact base dropped whole so no row lacks its kinds. Beside it,
    // one row per tracked file from one read of the tree, being its line
    // count and, for a manifest, the name it declares, stamped by mtime and
    // size like the import rows so a warm pass reads only what drifted.
    name: '008-arch-reading',
    up: (db) => {
      addColumnIfMissing(db, 'arch_import_file', 'kinds', 'TEXT');
      db.exec(`
        DELETE FROM arch_import;
        DELETE FROM arch_import_file;
        CREATE TABLE IF NOT EXISTS arch_tree_file (
          repo_key TEXT NOT NULL,
          rel_path TEXT NOT NULL,
          mtime_ms REAL NOT NULL,
          size     INTEGER NOT NULL,
          lines    INTEGER NOT NULL,
          declares TEXT,
          PRIMARY KEY (repo_key, rel_path)
        );
      `);
    }
  },
  {
    // PHASE 244, audit finding F3. One column, holding the sentence that says
    // why the scan at `scanned_at_commit` did not see the whole folder, or NULL
    // when it did. Nothing is dropped: an existing row read the whole folder by
    // the only route that could stamp it before this phase, so NULL is the right
    // answer for every row already there.
    name: '009-arch-scan-incomplete',
    up: (db) => {
      addColumnIfMissing(db, 'arch_repo', 'scan_incomplete', 'TEXT');
    }
  },
  {
    // PHASE 257, the fact base (research 118 §6, §10 Phase 1). Four tables and
    // nothing dropped, nothing altered.
    //
    // A FACT IS A FUNCTION OF (BYTES, PATH), so `arch_fact` is keyed on the
    // blob oid AND the repository relative path. Three rule families read the
    // path: the test-path refusal on every surface rule, the path conventions,
    // and the manifest rules, which key on the basename. A row keyed on oid
    // alone would say `app.get('/x')` in `src/server.ts` and the same bytes in
    // `test/server.test.ts` have the same facts, and they do not. What the oid
    // buys is the link without a parse: a branch switch, a `touch` or a fresh
    // clone moves every stamp and no byte, and is hashed rather than read.
    //
    // `arch_fact_file` is one row per tracked file per repository, being the
    // link from the repository's file to the facts of its bytes plus the
    // freshness stamp and the denominators a face will need. Two repositories
    // holding the same bytes at the same path share one fact list, and a fact
    // list nothing links is pruned.
    //
    // WRAPPER-ONLY FACTS CANNOT BE KEYED ON THE FILE'S OWN BYTES. A `+wrap`
    // fact on `src/main/arch/ipc.ts` exists because `src/main/typed-ipc.ts`
    // declares `handle`; change the declaration and the fact moves although
    // `ipc.ts`'s oid did not. So `arch_fact_wrap` is keyed on the FILE under
    // a digest of the closed wrapper map, held on `arch_fact_file.wrap_digest`,
    // and a moved digest re-reads every wrapper-grammar file for its wrapper
    // arm alone. Wrapper DECLARATIONS are a function of one file's bytes and
    // are cached by oid in `arch_fact_wrapper`, so pass 1 parses nothing that
    // did not change. That is a fact about identity rather than a preference:
    // folding `arch_fact_wrap` into `arch_fact` for tidiness would put a
    // repository-dependent row under a bytes-keyed primary key.
    name: '010-arch-facts',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS arch_fact (
          oid       TEXT    NOT NULL,
          rel_path  TEXT    NOT NULL,
          seq       INTEGER NOT NULL,
          category  TEXT    NOT NULL,
          kind      TEXT    NOT NULL,
          subject   TEXT    NOT NULL,
          line      INTEGER NOT NULL,
          rule      TEXT    NOT NULL,
          evidence  TEXT    NOT NULL,
          PRIMARY KEY (oid, rel_path, seq)
        );
        CREATE INDEX IF NOT EXISTS idx_arch_fact_category
          ON arch_fact (oid, rel_path, category);
        CREATE TABLE IF NOT EXISTS arch_fact_file (
          repo_key    TEXT    NOT NULL,
          rel_path    TEXT    NOT NULL,
          oid         TEXT    NOT NULL,
          mtime_ms    REAL    NOT NULL,
          size        INTEGER NOT NULL,
          lang        TEXT,
          vendored    TEXT,
          truncated   INTEGER NOT NULL DEFAULT 0,
          wrap_digest TEXT,
          PRIMARY KEY (repo_key, rel_path)
        );
        CREATE INDEX IF NOT EXISTS idx_arch_fact_file_oid
          ON arch_fact_file (oid, rel_path);
        CREATE TABLE IF NOT EXISTS arch_fact_wrapper (
          oid          TEXT    NOT NULL,
          rel_path     TEXT    NOT NULL,
          seq          INTEGER NOT NULL,
          name         TEXT    NOT NULL,
          inner_callee TEXT    NOT NULL,
          inner_last   TEXT    NOT NULL,
          param_index  INTEGER NOT NULL,
          inner_index  INTEGER NOT NULL,
          hops         INTEGER NOT NULL,
          line         INTEGER NOT NULL,
          PRIMARY KEY (oid, rel_path, seq)
        );
        CREATE TABLE IF NOT EXISTS arch_fact_wrap (
          repo_key  TEXT    NOT NULL,
          rel_path  TEXT    NOT NULL,
          seq       INTEGER NOT NULL,
          category  TEXT    NOT NULL,
          kind      TEXT    NOT NULL,
          subject   TEXT    NOT NULL,
          line      INTEGER NOT NULL,
          rule      TEXT    NOT NULL,
          evidence  TEXT    NOT NULL,
          PRIMARY KEY (repo_key, rel_path, seq)
        );
      `);
    }
  }
,
  {
    // PHASE 259, THE DECLARATION HALF (research 118 §6.4; SPEC §3.1).
    //
    // A semantic claim's best evidence is usually a DECLARATION: "the one door
    // that rewrites your file" is evidenced by `export async function
    // writeGuarded(`, which is not a call site and never will be. Research 118
    // measured the hand pass's backing going from 22.0% to 58.5% once
    // declarations joined the base, so without this table the grader's best
    // answer for the sharpest sentence a person can write is `resolves`.
    //
    // IT IS NOT A NINTH FACT CATEGORY. `ARCH_FACT_CATEGORIES`,
    // `ARCH_FACT_KINDS`, `arch:facts`, the surfaces list, the rungs and
    // `conformance:facts`'s recall scopes do not move. Two readers exist,
    // `declsOf` and `declCountsUnder`, and both are the grader's and the
    // floor's; no face ever counts a declaration. The reason is the floor: a
    // declaration within three lines beats chance by 2.46x where a call site
    // beats it by 9.6x, and folding the two together would quietly make every
    // count in this pane a count over a much noisier signal.
    //
    // Keyed on the blob oid AND the path exactly as `arch_fact` is, for the
    // same reason and with the same prune: a branch switch, a `touch` or a
    // fresh clone moves every stamp and no byte, and two repositories holding
    // the same bytes at the same path share one row list. The symbols arrive
    // on the SAME worker message `tree-facts.ts` already reads for calls, so
    // this costs no second parse.
    //
    // THE EXISTING FACT ROWS ARE DROPPED, the same shape as 002, 007 and 008.
    // A declaration is written at the moment a file is parsed for its facts,
    // and `hasFactsFor` answers true for every file already linked, so without
    // this the first run after the migration would re-link every file without
    // parsing one and the declaration table would stay empty until somebody
    // edited a file. It costs one re-parse, which the fact base was designed
    // to be cheap enough to pay.
    name: '011-arch-decl',
    up: (db) => {
      db.exec(`
        DELETE FROM arch_fact;
        DELETE FROM arch_fact_file;
        DELETE FROM arch_fact_wrap;
        CREATE TABLE IF NOT EXISTS arch_decl (
          oid      TEXT    NOT NULL,
          rel_path TEXT    NOT NULL,
          seq      INTEGER NOT NULL,
          kind     TEXT    NOT NULL,
          subject  TEXT    NOT NULL,
          line     INTEGER NOT NULL,
          evidence TEXT    NOT NULL,
          PRIMARY KEY (oid, rel_path, seq)
        );
        CREATE INDEX IF NOT EXISTS idx_arch_decl_line
          ON arch_decl (oid, rel_path, line);
      `);
    }
  },
  {
    // PHASE 259, THE READING (research 118 §7.1, §7.3 and §7.5; SPEC §3.2).
    //
    // What an agent said each part is FOR, with every sentence's citations
    // already graded. Five tables and nothing dropped, nothing altered.
    //
    // `arch_claim` is the one row table for everything that carries a sentence
    // and citations: a part's seven claims, a gate's reason, a journey step's
    // label. `subject` says which, being `part:<id>`, `gate:<partId>/<id>` or
    // `journey:<id>#<seq>`, and `stale` is the drift answer of §7.5: the
    // sentence STAYS, the chip turns, and `stale_reason` names the citation
    // that died. Nothing is ever deleted for being stale.
    //
    // `question` and `answer` are NULL for every row but a gate's. They are two
    // columns rather than a sixth table because a gate is a sentence with
    // citations exactly as a claim is, and the drift machinery, the grading and
    // the rate arithmetic all want one table to walk.
    //
    // `arch_claim_cite` carries the GRADE and the drift fingerprint, being the
    // cited file's blob oid plus the fact kind and subject the grade came from.
    // `dead` is what §7.5's refresh writes when the oid moved and no row with
    // that kind and subject is in the file any more.
    //
    // `arch_claim_rate` HAS NO COLUMN FOR A RATE WITHOUT ITS FLOOR, which is
    // research 118 §7.3's ruling made structural rather than remembered: a
    // reader shown "24 of 41" and not shown "and 10 of 41 would happen anyway"
    // has been given a number without its denominator.
    //
    // `arch_journey` holds the WALK, and a journey out of `docs/arch/flows/`
    // rides the same table with `source: 'contract'`, drawn first and never
    // overwritten by a model's. Nothing here is written into `docs/arch/`:
    // `ARCH_ROW_KEYS` is untouched and `conformance:arch` rule 12 runs
    // unchanged.
    name: '012-arch-semantic',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS arch_semantic_run (
          repo_key       TEXT    NOT NULL,
          run_id         TEXT    NOT NULL,
          part_id        TEXT,
          agent_id       TEXT    NOT NULL,
          model          TEXT    NOT NULL,
          recipe_version INTEGER NOT NULL,
          head_commit    TEXT    NOT NULL,
          started_at     INTEGER NOT NULL,
          wall_ms        INTEGER NOT NULL,
          verdict        TEXT    NOT NULL,
          reason         TEXT,
          detail         TEXT,
          cost_usd       REAL,
          claims         INTEGER NOT NULL DEFAULT 0,
          rows_dropped   INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (repo_key, run_id)
        );
        CREATE TABLE IF NOT EXISTS arch_claim (
          repo_key     TEXT    NOT NULL,
          claim_id     TEXT    NOT NULL,
          subject      TEXT    NOT NULL,
          field        TEXT    NOT NULL,
          text         TEXT    NOT NULL,
          question     TEXT,
          answer       TEXT,
          run_id       TEXT    NOT NULL,
          written_at   INTEGER NOT NULL,
          stale        INTEGER NOT NULL DEFAULT 0,
          stale_reason TEXT,
          PRIMARY KEY (repo_key, claim_id)
        );
        CREATE INDEX IF NOT EXISTS idx_arch_claim_subject
          ON arch_claim (repo_key, subject);
        CREATE TABLE IF NOT EXISTS arch_claim_cite (
          repo_key     TEXT    NOT NULL,
          claim_id     TEXT    NOT NULL,
          seq          INTEGER NOT NULL,
          rel_path     TEXT    NOT NULL,
          line         INTEGER NOT NULL,
          why          TEXT    NOT NULL,
          grade        TEXT    NOT NULL,
          fact_kind    TEXT,
          fact_subject TEXT,
          fact_line    INTEGER,
          blob_oid     TEXT    NOT NULL,
          dead         INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (repo_key, claim_id, seq)
        );
        CREATE TABLE IF NOT EXISTS arch_claim_rate (
          repo_key       TEXT    NOT NULL,
          scope          TEXT    NOT NULL,
          backed         INTEGER NOT NULL,
          total          INTEGER NOT NULL,
          floor_within   INTEGER NOT NULL,
          floor_lines    INTEGER NOT NULL,
          by_grade       TEXT    NOT NULL,
          floor_by_grade TEXT    NOT NULL,
          gate_shaped    INTEGER NOT NULL,
          gate_claims    INTEGER NOT NULL,
          computed_at    INTEGER NOT NULL,
          PRIMARY KEY (repo_key, scope)
        );
        CREATE TABLE IF NOT EXISTS arch_journey (
          repo_key   TEXT    NOT NULL,
          journey_id TEXT    NOT NULL,
          name       TEXT    NOT NULL,
          source     TEXT    NOT NULL,
          seq        INTEGER NOT NULL,
          part_id    TEXT    NOT NULL,
          label      TEXT    NOT NULL,
          PRIMARY KEY (repo_key, journey_id, seq)
        );
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

interface FactStampRow extends StampRow {
  oid: string;
  wrap_digest: string | null;
  lang: string | null;
  vendored: string | null;
  truncated: number;
}

interface FactRow {
  rel_path: string;
  category: string;
  kind: string;
  subject: string;
  line: number;
  rule: string;
  evidence: string;
}

interface WrapperDeclRow {
  rel_path: string;
  name: string;
  inner_callee: string;
  inner_last: string;
  param_index: number;
  inner_index: number;
  hops: number;
  line: number;
}

/**
 * One sentence naming the field and the reason a fact row is refused, or null
 * when the row is fine (Phase 257). The category and the kind are closed sets
 * from `@shared/arch`; the two lengths are `ARCH_FACT_LIMITS`, which the
 * reader cuts at and the store refuses past; the line is 1 based.
 */
/** One stored declaration row, as SQLite hands it back. */
interface DeclRow {
  rel_path: string;
  kind: string;
  subject: string;
  line: number;
  evidence: string;
}

interface ClaimRow {
  claim_id: string;
  subject: string;
  field: string;
  text: string;
  question: string | null;
  answer: string | null;
  run_id: string;
  written_at: number;
  stale: number;
  stale_reason: string | null;
}

interface CiteRow {
  claim_id: string;
  seq: number;
  rel_path: string;
  line: number;
  why: string;
  grade: string;
  fact_kind: string | null;
  fact_subject: string | null;
  fact_line: number | null;
  blob_oid: string;
  dead: number;
}

interface JourneyRow {
  journey_id: string;
  name: string;
  source: string;
  seq: number;
  part_id: string;
  label: string;
}

interface RateRow {
  scope: string;
  backed: number;
  total: number;
  floor_within: number;
  floor_lines: number;
  by_grade: string;
  floor_by_grade: string;
  gate_shaped: number;
  gate_claims: number;
  computed_at: number;
}

interface SemanticRunRow {
  run_id: string;
  part_id: string | null;
  agent_id: string;
  model: string;
  recipe_version: number;
  head_commit: string;
  started_at: number;
  wall_ms: number;
  verdict: string;
  reason: string | null;
  detail: string | null;
  cost_usd: number | null;
  claims: number;
  rows_dropped: number;
}

/**
 * One sentence naming the refusing field, or null (Phase 259).
 *
 * A declaration is bounded by the FACT base's own two numbers, because the
 * grader compares a declaration's subject against a fact's and two bounds
 * would be two answers to one question.
 */
function refuseDecl(row: ArchDeclDraftRow): string | null {
  if (typeof row.kind !== 'string' || row.kind.length === 0 || row.kind.length > 40) {
    return 'arch_decl.kind must be a kind of 1 to 40 characters';
  }
  if (typeof row.subject !== 'string' || row.subject.length === 0) {
    return 'arch_decl.subject must be a non-empty string';
  }
  if (row.subject.length > ARCH_FACT_LIMITS.maxSubject) {
    return `arch_decl.subject holds ${String(row.subject.length)} characters and the most is ${String(ARCH_FACT_LIMITS.maxSubject)}`;
  }
  if (typeof row.evidence !== 'string' || row.evidence.length > ARCH_FACT_LIMITS.maxEvidence) {
    return `arch_decl.evidence holds ${String(row.evidence.length)} characters and the most is ${String(ARCH_FACT_LIMITS.maxEvidence)}`;
  }
  if (!Number.isInteger(row.line) || row.line < 1) {
    return `arch_decl.line must be a positive integer, not ${String(row.line)}`;
  }
  return null;
}

/**
 * One sentence naming the refusing field of a claim, or null (Phase 259).
 *
 * The GRADE is the closed set: a row carrying a fifth word would put a grade
 * on a face that no chip and no floor knows how to draw, so the whole write
 * throws with the field named and nothing lands.
 */
function refuseClaim(row: NewArchClaimRow): string | null {
  if (typeof row.claimId !== 'string' || row.claimId.length === 0 || row.claimId.length > 200) {
    return 'arch_claim.claim_id must be an id of 1 to 200 characters';
  }
  if (typeof row.subject !== 'string' || row.subject.length === 0 || row.subject.length > 300) {
    return 'arch_claim.subject must be a subject of 1 to 300 characters';
  }
  if (typeof row.text !== 'string' || row.text.length === 0 || row.text.length > 1000) {
    return 'arch_claim.text must be a sentence of 1 to 1000 characters';
  }
  for (const cite of row.cites) {
    if (!(ARCH_CITE_GRADES as readonly string[]).includes(cite.grade)) {
      return `arch_claim_cite.grade "${String(cite.grade)}" is not one of ${ARCH_CITE_GRADES.join(', ')}`;
    }
    if (!Number.isInteger(cite.line) || cite.line < 1) {
      return `arch_claim_cite.line must be a positive integer, not ${String(cite.line)}`;
    }
    if (typeof cite.blobOid !== 'string' || cite.blobOid.length === 0) {
      return 'arch_claim_cite.blob_oid must be the cited file\'s blob name';
    }
  }
  return null;
}

/**
 * A stored per grade tally, back as a record with every grade present.
 *
 * A row an older build wrote, or one somebody edited by hand, reads as zeroes
 * rather than crashing the read: a rate with a missing grade would draw a
 * blank chip count, and a blank is read as "none" rather than as "unknown".
 */
function parseGradeTally(raw: string): Record<ArchCiteGrade, number> {
  const out = {} as Record<ArchCiteGrade, number>;
  for (const grade of ARCH_CITE_GRADES) out[grade] = 0;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
    for (const grade of ARCH_CITE_GRADES) {
      const value = (parsed as Record<string, unknown>)[grade];
      if (typeof value === 'number' && Number.isFinite(value)) out[grade] = value;
    }
  } catch {
    // A damaged row reads as zeroes. The whole database is derived.
  }
  return out;
}

function refuseFact(table: string, fact: ArchFactDraft): string | null {
  if (!(ARCH_FACT_CATEGORIES as readonly string[]).includes(fact.category)) {
    return `${table}.category "${String(fact.category)}" is not one of ${ARCH_FACT_CATEGORIES.join(', ')}`;
  }
  const kinds = ARCH_FACT_KINDS[fact.category];
  if (!kinds.includes(fact.kind)) {
    return `${table}.kind "${String(fact.kind)}" is not a ${fact.category} kind (${kinds.join(', ')})`;
  }
  if (typeof fact.subject !== 'string' || fact.subject.length === 0) {
    return `${table}.subject must be a non-empty string`;
  }
  if (fact.subject.length > ARCH_FACT_LIMITS.maxSubject) {
    return `${table}.subject holds ${String(fact.subject.length)} characters and the most is ${String(ARCH_FACT_LIMITS.maxSubject)}`;
  }
  if (typeof fact.evidence !== 'string' || fact.evidence.length > ARCH_FACT_LIMITS.maxEvidence) {
    return `${table}.evidence holds ${String(fact.evidence.length)} characters and the most is ${String(ARCH_FACT_LIMITS.maxEvidence)}`;
  }
  if (!Number.isInteger(fact.line) || fact.line < 1) {
    return `${table}.line must be a positive integer, not ${String(fact.line)}`;
  }
  if (typeof fact.rule !== 'string' || fact.rule.length === 0 || fact.rule.length > 80) {
    return `${table}.rule must be a rule id of 1 to 80 characters`;
  }
  return null;
}

/** The order the store answers facts in: file, line, rule, subject. Deterministic, so a face can diff two answers. */
function compareFacts(a: ArchFact, b: ArchFact): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  if (a.rule !== b.rule) return a.rule < b.rule ? -1 : 1;
  if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
  return 0;
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
          scan_incomplete: string | null;
          counts: string | null;
          generation: number;
        }
      >(
        `SELECT checked_at_commit, scanned_at_commit, scan_incomplete, counts, generation
           FROM arch_repo WHERE repo_key = ?`
      )
      .get(repoKey);
    if (row === undefined) {
      return {
        checkedAtCommit: null,
        generation: 0,
        scannedAtCommit: null,
        scanIncomplete: null,
        counts: null
      };
    }
    return {
      checkedAtCommit: row.checked_at_commit,
      generation: row.generation,
      scannedAtCommit: row.scanned_at_commit,
      scanIncomplete: row.scan_incomplete,
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
      /** Definition counts by kind, from the same parse (Phase 201). */
      kinds?: Readonly<Record<string, number>>;
    }[]
  ): void {
    if (files.length === 0) return;
    const dropImports = this.db.prepare<[string, string]>(
      'DELETE FROM arch_import WHERE repo_key = ? AND from_path = ?'
    );
    const upsertFile = this.db.prepare<
      [string, string, number, number, number, string]
    >(
      `INSERT INTO arch_import_file (repo_key, rel_path, mtime_ms, size, scanned_at, kinds)
         VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(repo_key, rel_path) DO UPDATE SET
         mtime_ms = excluded.mtime_ms,
         size = excluded.size,
         scanned_at = excluded.scanned_at,
         kinds = excluded.kinds`
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
        upsertFile.run(
          repoKey,
          file.relPath,
          file.mtimeMs,
          file.size,
          now,
          JSON.stringify(file.kinds ?? {})
        );
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

  /**
   * Every parsed file's definition counts by kind, kept by the scan beside its
   * imports (Phase 201). A row an older build wrote carries none, and reads
   * as no definitions rather than as an error.
   */
  definitions(repoKey: string): ArchFileDefinitions[] {
    const rows = this.db
      .prepare<[string], { rel_path: string; kinds: string | null }>(
        'SELECT rel_path, kinds FROM arch_import_file WHERE repo_key = ?'
      )
      .all(repoKey);
    const out: ArchFileDefinitions[] = [];
    for (const row of rows) {
      if (row.kinds === null) continue;
      let kinds: unknown;
      try {
        kinds = JSON.parse(row.kinds);
      } catch {
        continue;
      }
      if (kinds === null || typeof kinds !== 'object' || Array.isArray(kinds)) continue;
      const clean: Record<string, number> = {};
      for (const [kind, count] of Object.entries(kinds as Record<string, unknown>)) {
        if (typeof count === 'number' && Number.isFinite(count) && count > 0) clean[kind] = count;
      }
      out.push({ path: row.rel_path, kinds: clean });
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // One read of the tree (Phase 201)
  // -------------------------------------------------------------------------

  /** The freshness key for every tracked file the tree read has seen. */
  treeStamps(repoKey: string): Map<string, ArchFileStamp> {
    const rows = this.db
      .prepare<[string], StampRow>(
        'SELECT rel_path, mtime_ms, size FROM arch_tree_file WHERE repo_key = ?'
      )
      .all(repoKey);
    const out = new Map<string, ArchFileStamp>();
    for (const row of rows) out.set(row.rel_path, { mtimeMs: row.mtime_ms, size: row.size });
    return out;
  }

  /** Replace one batch of tree rows, in ONE transaction. */
  saveTreeFacts(
    repoKey: string,
    files: { relPath: string; mtimeMs: number; size: number; lines: number; declares: string | null }[]
  ): void {
    if (files.length === 0) return;
    const upsert = this.db.prepare<[string, string, number, number, number, string | null]>(
      `INSERT INTO arch_tree_file (repo_key, rel_path, mtime_ms, size, lines, declares)
         VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(repo_key, rel_path) DO UPDATE SET
         mtime_ms = excluded.mtime_ms,
         size = excluded.size,
         lines = excluded.lines,
         declares = excluded.declares`
    );
    immediateTransaction(this.db, () => {
      for (const file of files) {
        upsert.run(repoKey, file.relPath, file.mtimeMs, file.size, file.lines, file.declares);
      }
    });
  }

  /** Forget tree rows for files the tree no longer tracks. */
  forgetTreeFiles(repoKey: string, relPaths: string[]): void {
    if (relPaths.length === 0) return;
    const drop = this.db.prepare<[string, string]>(
      'DELETE FROM arch_tree_file WHERE repo_key = ? AND rel_path = ?'
    );
    immediateTransaction(this.db, () => {
      for (const relPath of relPaths) drop.run(repoKey, relPath);
    });
  }

  /** Every tracked file's line count and declared name, as the last tree read left them. */
  treeFacts(repoKey: string): ArchTreeFileFact[] {
    const rows = this.db
      .prepare<[string], { rel_path: string; lines: number; declares: string | null }>(
        'SELECT rel_path, lines, declares FROM arch_tree_file WHERE repo_key = ?'
      )
      .all(repoKey);
    return rows.map((row) => ({ path: row.rel_path, lines: row.lines, declares: row.declares }));
  }

  /**
   * Record the commit the fact base was scanned at, once the scan finished and
   * the WHOLE folder was read.
   *
   * PHASE 244. It clears {@link ArchRepoState.scanIncomplete}, because a
   * complete scan is exactly the thing that ends an earlier partial one, and a
   * reason left behind would outlive the ceiling that produced it.
   */
  markScanned(repoKey: string, repoPath: string, commit: string | null): void {
    this.markScan(repoKey, repoPath, commit, null);
  }

  /**
   * PHASE 244, audit finding F3. Record the commit the fact base was scanned at
   * AND the one sentence saying why that scan did not see the whole folder.
   *
   * It is a different call from {@link markScanned} rather than a flag on it,
   * because the two mean different things to a person: one says the answer is
   * about all of the folder and the other says it is about part of it. A caller
   * that meant the second and reached for the first is the defect this phase
   * repaired, so the two are not the same door.
   */
  markScanPartial(
    repoKey: string,
    repoPath: string,
    commit: string | null,
    reason: string
  ): void {
    this.markScan(repoKey, repoPath, commit, reason);
  }

  private markScan(
    repoKey: string,
    repoPath: string,
    commit: string | null,
    incomplete: string | null
  ): void {
    this.db
      .prepare<[string, string, string | null, string | null, number]>(
        `INSERT INTO arch_repo (repo_key, repo_path, scanned_at_commit, scan_incomplete, updated_at)
           VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(repo_key) DO UPDATE SET
           repo_path = excluded.repo_path,
           scanned_at_commit = excluded.scanned_at_commit,
           scan_incomplete = excluded.scan_incomplete,
           updated_at = excluded.updated_at`
      )
      .run(repoKey, repoPath, commit, incomplete, Date.now());
  }

  // -------------------------------------------------------------------------
  // The fact base's second half: the facts (Phase 257)
  // -------------------------------------------------------------------------

  /** The freshness key, the oid, the wrapper digest and the grammar for every file the fact pass has seen. */
  factStamps(repoKey: string): Map<string, ArchFactStamp> {
    const rows = this.db
      .prepare<[string], FactStampRow>(
        `SELECT rel_path, mtime_ms, size, oid, wrap_digest, lang, vendored, truncated
           FROM arch_fact_file WHERE repo_key = ?`
      )
      .all(repoKey);
    const out = new Map<string, ArchFactStamp>();
    for (const row of rows) {
      out.set(row.rel_path, {
        mtimeMs: row.mtime_ms,
        size: row.size,
        oid: row.oid,
        wrapDigest: row.wrap_digest,
        lang: row.lang,
        vendored: row.vendored,
        truncated: row.truncated === 1
      });
    }
    return out;
  }

  /**
   * Does the store already hold the facts for these bytes at this path?
   *
   * A link is proof of a read: a file with NO facts writes no `arch_fact` row,
   * so the question is asked of the links as well, or a fact-less file would
   * be parsed again on every stamp move.
   */
  hasFactsFor(oid: string, relPath: string): boolean {
    const fact = this.db
      .prepare<[string, string], { one: number }>(
        'SELECT 1 AS one FROM arch_fact WHERE oid = ? AND rel_path = ? LIMIT 1'
      )
      .get(oid, relPath);
    if (fact !== undefined) return true;
    const link = this.db
      .prepare<[string, string], { one: number }>(
        'SELECT 1 AS one FROM arch_fact_file WHERE oid = ? AND rel_path = ? LIMIT 1'
      )
      .get(oid, relPath);
    return link !== undefined;
  }

  /**
   * Replace the sorted fact list for (oid, relPath), in ONE transaction.
   *
   * A row whose category or kind is outside the closed sets, whose subject or
   * evidence is past its bound, or whose line is not 1 based, makes the WHOLE
   * call throw with the field named and writes nothing. That is the closed
   * set rule from `@shared/arch` made structural rather than documentary.
   */
  saveFacts(oid: string, relPath: string, facts: readonly ArchFactDraft[]): void {
    for (const fact of facts) {
      const why = refuseFact('arch_fact', fact);
      if (why !== null) throw new Error(`${relPath}: ${why}`);
    }
    const drop = this.db.prepare<[string, string]>(
      'DELETE FROM arch_fact WHERE oid = ? AND rel_path = ?'
    );
    const insert = this.db.prepare<[string, string, number, string, string, string, number, string, string]>(
      `INSERT INTO arch_fact
         (oid, rel_path, seq, category, kind, subject, line, rule, evidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    immediateTransaction(this.db, () => {
      drop.run(oid, relPath);
      facts.forEach((fact, seq) => {
        insert.run(oid, relPath, seq, fact.category, fact.kind, fact.subject, fact.line, fact.rule, fact.evidence);
      });
    });
  }

  /** Replace the cached wrapper declarations for (oid, relPath), in ONE transaction. */
  saveWrapperDecls(oid: string, relPath: string, decls: readonly ArchWrapperDecl[]): void {
    const drop = this.db.prepare<[string, string]>(
      'DELETE FROM arch_fact_wrapper WHERE oid = ? AND rel_path = ?'
    );
    const insert = this.db.prepare<[string, string, number, string, string, string, number, number, number, number]>(
      `INSERT INTO arch_fact_wrapper
         (oid, rel_path, seq, name, inner_callee, inner_last, param_index, inner_index, hops, line)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    immediateTransaction(this.db, () => {
      drop.run(oid, relPath);
      decls.forEach((d, seq) => {
        insert.run(oid, relPath, seq, d.name, d.innerCallee, d.innerLast, d.paramIndex, d.innerIndex, d.hops, d.line);
      });
    });
  }

  /** Every cached wrapper declaration for the files listed, keyed by relPath. A file with none is absent. */
  wrapperDecls(files: readonly { oid: string; relPath: string }[]): Map<string, ArchWrapperDecl[]> {
    const select = this.db.prepare<[string, string], WrapperDeclRow>(
      `SELECT rel_path, name, inner_callee, inner_last, param_index, inner_index, hops, line
         FROM arch_fact_wrapper WHERE oid = ? AND rel_path = ? ORDER BY seq`
    );
    const out = new Map<string, ArchWrapperDecl[]>();
    for (const file of files) {
      const rows = select.all(file.oid, file.relPath);
      if (rows.length === 0) continue;
      out.set(
        file.relPath,
        rows.map((row) => ({
          name: row.name,
          innerCallee: row.inner_callee,
          innerLast: row.inner_last,
          paramIndex: row.param_index,
          innerIndex: row.inner_index,
          hops: row.hops,
          line: row.line
        }))
      );
    }
    return out;
  }

  /** Link or re-link files to the facts of their bytes, in ONE transaction. */
  linkFactFiles(repoKey: string, rows: readonly ArchFactFileLink[]): void {
    if (rows.length === 0) return;
    const upsert = this.db.prepare<
      [string, string, string, number, number, string | null, string | null, number, string | null]
    >(
      `INSERT INTO arch_fact_file
         (repo_key, rel_path, oid, mtime_ms, size, lang, vendored, truncated, wrap_digest)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(repo_key, rel_path) DO UPDATE SET
         oid = excluded.oid,
         mtime_ms = excluded.mtime_ms,
         size = excluded.size,
         lang = excluded.lang,
         vendored = excluded.vendored,
         truncated = excluded.truncated,
         wrap_digest = excluded.wrap_digest`
    );
    immediateTransaction(this.db, () => {
      for (const row of rows) {
        upsert.run(
          repoKey,
          row.relPath,
          row.oid,
          row.mtimeMs,
          row.size,
          row.lang,
          row.vendored,
          row.truncated ? 1 : 0,
          row.wrapDigest
        );
      }
    });
  }

  /** Replace one file's wrapper-only facts, in ONE transaction, under the same refusals as `saveFacts`. */
  saveWrapFacts(repoKey: string, relPath: string, facts: readonly ArchFactDraft[]): void {
    for (const fact of facts) {
      const why = refuseFact('arch_fact_wrap', fact);
      if (why !== null) throw new Error(`${relPath}: ${why}`);
    }
    const drop = this.db.prepare<[string, string]>(
      'DELETE FROM arch_fact_wrap WHERE repo_key = ? AND rel_path = ?'
    );
    const insert = this.db.prepare<[string, string, number, string, string, string, number, string, string]>(
      `INSERT INTO arch_fact_wrap
         (repo_key, rel_path, seq, category, kind, subject, line, rule, evidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    immediateTransaction(this.db, () => {
      drop.run(repoKey, relPath);
      facts.forEach((fact, seq) => {
        insert.run(repoKey, relPath, seq, fact.category, fact.kind, fact.subject, fact.line, fact.rule, fact.evidence);
      });
    });
  }

  /** Drop every wrapper-only fact of a repository: the pass was turned off, and a stale `+wrap` row is a lie. */
  clearWrapFacts(repoKey: string): void {
    this.db.prepare<[string]>('DELETE FROM arch_fact_wrap WHERE repo_key = ?').run(repoKey);
  }

  /** Forget files the tree no longer tracks: their link and their wrapper-only facts. Prune afterwards. */
  forgetFactFiles(repoKey: string, relPaths: readonly string[]): void {
    if (relPaths.length === 0) return;
    const dropLink = this.db.prepare<[string, string]>(
      'DELETE FROM arch_fact_file WHERE repo_key = ? AND rel_path = ?'
    );
    const dropWrap = this.db.prepare<[string, string]>(
      'DELETE FROM arch_fact_wrap WHERE repo_key = ? AND rel_path = ?'
    );
    immediateTransaction(this.db, () => {
      for (const relPath of relPaths) {
        dropLink.run(repoKey, relPath);
        dropWrap.run(repoKey, relPath);
      }
    });
  }

  /**
   * Prune every (oid, rel_path) fact list and wrapper cache no repository links
   * any more. Answers how many rows went, across both tables.
   */
  pruneUnlinkedFacts(): number {
    return immediateTransaction(this.db, () => this.pruneUnlinked());
  }

  private pruneUnlinked(): number {
    const facts = this.db
      .prepare(
        `DELETE FROM arch_fact WHERE NOT EXISTS (
           SELECT 1 FROM arch_fact_file f
            WHERE f.oid = arch_fact.oid AND f.rel_path = arch_fact.rel_path)`
      )
      .run();
    const wrappers = this.db
      .prepare(
        `DELETE FROM arch_fact_wrapper WHERE NOT EXISTS (
           SELECT 1 FROM arch_fact_file f
            WHERE f.oid = arch_fact_wrapper.oid AND f.rel_path = arch_fact_wrapper.rel_path)`
      )
      .run();
    // Phase 259. The declarations are keyed on bytes exactly as the facts are,
    // so they are pruned by the same link and never deleted by repository key.
    this.db
      .prepare(
        `DELETE FROM arch_decl WHERE NOT EXISTS (
           SELECT 1 FROM arch_fact_file f
            WHERE f.oid = arch_decl.oid AND f.rel_path = arch_decl.rel_path)`
      )
      .run();
    return facts.changes + wrappers.changes;
  }

  /** Every fact of a repository, joined through the links and the wrap table, sorted (file, line, rule, subject). */
  facts(repoKey: string): ArchFact[] {
    const linked = this.db
      .prepare<[string], FactRow>(
        `SELECT a.rel_path, a.category, a.kind, a.subject, a.line, a.rule, a.evidence
           FROM arch_fact a
           JOIN arch_fact_file f ON f.oid = a.oid AND f.rel_path = a.rel_path
          WHERE f.repo_key = ?`
      )
      .all(repoKey);
    const wrapped = this.db
      .prepare<[string], FactRow>(
        `SELECT rel_path, category, kind, subject, line, rule, evidence
           FROM arch_fact_wrap WHERE repo_key = ?`
      )
      .all(repoKey);
    const out: ArchFact[] = [];
    for (const row of linked) out.push(factOf(row, false));
    for (const row of wrapped) out.push(factOf(row, true));
    return out.sort(compareFacts);
  }

  /**
   * The facts of the named categories only, joined through the links and the
   * wrap table, sorted (file, line, rule, subject) (Phase 258). The map
   * compose reads the seven non-test categories through this rather than
   * `facts()`, because the 15,816 test rows this repository carries would
   * otherwise cross into a compose that only ever asks which FILES carry one;
   * that question is `factFiles` below. The category list is bound as
   * parameters, never spliced into the SQL.
   */
  factsOf(repoKey: string, categories: readonly ArchFactCategory[]): ArchFact[] {
    const wanted = [...new Set(categories)].filter((c) =>
      (ARCH_FACT_CATEGORIES as readonly string[]).includes(c)
    );
    if (wanted.length === 0) return [];
    const marks = wanted.map(() => '?').join(', ');
    const linked = this.db
      .prepare<[string, ...string[]], FactRow>(
        `SELECT a.rel_path, a.category, a.kind, a.subject, a.line, a.rule, a.evidence
           FROM arch_fact a
           JOIN arch_fact_file f ON f.oid = a.oid AND f.rel_path = a.rel_path
          WHERE f.repo_key = ? AND a.category IN (${marks})`
      )
      .all(repoKey, ...wanted);
    const wrapped = this.db
      .prepare<[string, ...string[]], FactRow>(
        `SELECT rel_path, category, kind, subject, line, rule, evidence
           FROM arch_fact_wrap WHERE repo_key = ? AND category IN (${marks})`
      )
      .all(repoKey, ...wanted);
    const out: ArchFact[] = [];
    for (const row of linked) out.push(factOf(row, false));
    for (const row of wrapped) out.push(factOf(row, true));
    return out.sort(compareFacts);
  }

  /** The distinct files carrying a fact of one category, sorted (Phase 258). */
  factFiles(repoKey: string, category: ArchFactCategory): string[] {
    const linked = this.db
      .prepare<[string, string], { rel_path: string }>(
        `SELECT DISTINCT a.rel_path
           FROM arch_fact a
           JOIN arch_fact_file f ON f.oid = a.oid AND f.rel_path = a.rel_path
          WHERE f.repo_key = ? AND a.category = ?`
      )
      .all(repoKey, category);
    const wrapped = this.db
      .prepare<[string, string], { rel_path: string }>(
        `SELECT DISTINCT rel_path FROM arch_fact_wrap WHERE repo_key = ? AND category = ?`
      )
      .all(repoKey, category);
    const out = new Set<string>();
    for (const row of linked) out.add(row.rel_path);
    for (const row of wrapped) out.add(row.rel_path);
    return [...out].sort();
  }

  /**
   * The link denominators under a set of directories (Phase 258), for the
   * surfaces list's per region line: files linked, files rule-read (`parsed`,
   * being a link with a grammar and no vendor reason), files the vendor
   * filter refused, and files whose call list hit the worker's ceiling. The
   * root '' holds everything, and a file under two of the directories is
   * counted once.
   */
  linkCountsUnder(
    repoKey: string,
    dirs: readonly string[]
  ): { files: number; parsed: number; vendored: number; truncated: number } {
    const rows = this.db
      .prepare<[string], { rel_path: string; lang: string | null; vendored: string | null; truncated: number }>(
        'SELECT rel_path, lang, vendored, truncated FROM arch_fact_file WHERE repo_key = ?'
      )
      .all(repoKey);
    const under = (path: string): boolean =>
      dirs.some((dir) => dir === '' || path === dir || path.startsWith(`${dir}/`));
    const out = { files: 0, parsed: 0, vendored: 0, truncated: 0 };
    for (const row of rows) {
      if (!under(row.rel_path)) continue;
      out.files += 1;
      if (row.vendored !== null) out.vendored += 1;
      else if (row.lang !== null) out.parsed += 1;
      if (row.truncated === 1) out.truncated += 1;
    }
    return out;
  }

  /** Per category and per rule, plus the denominators: files linked, vendored, truncated, unread, wrap facts. */
  factCounts(repoKey: string): ArchFactCounts {
    const byCategory = {} as Record<ArchFactCategory, number>;
    for (const category of ARCH_FACT_CATEGORIES) byCategory[category] = 0;
    const byRule: Record<string, number> = {};
    let wrapFacts = 0;
    for (const fact of this.facts(repoKey)) {
      byCategory[fact.category] += 1;
      byRule[fact.rule] = (byRule[fact.rule] ?? 0) + 1;
      if (fact.viaWrapper) wrapFacts += 1;
    }
    const files = this.db
      .prepare<[string], { files: number; vendored: number; truncated: number; unread: number }>(
        `SELECT COUNT(*) AS files,
                SUM(CASE WHEN vendored IS NOT NULL THEN 1 ELSE 0 END) AS vendored,
                SUM(CASE WHEN truncated = 1 THEN 1 ELSE 0 END) AS truncated,
                SUM(CASE WHEN lang IS NULL AND vendored IS NULL THEN 1 ELSE 0 END) AS unread
           FROM arch_fact_file WHERE repo_key = ?`
      )
      .get(repoKey) ?? { files: 0, vendored: 0, truncated: 0, unread: 0 };
    const digest = this.db
      .prepare<[string], { wrap_digest: string }>(
        `SELECT wrap_digest FROM arch_fact_file
          WHERE repo_key = ? AND wrap_digest IS NOT NULL
          GROUP BY wrap_digest ORDER BY COUNT(*) DESC, wrap_digest LIMIT 1`
      )
      .get(repoKey);
    return {
      byCategory,
      byRule,
      files: files.files,
      vendored: files.vendored ?? 0,
      truncated: files.truncated ?? 0,
      unread: files.unread ?? 0,
      wrapFacts,
      wrapDigest: digest === undefined ? null : digest.wrap_digest
    };
  }

  /**
   * The boundary facts that say what a repository BUILDS and STARTS: the six
   * kinds of `ARCH_BOUNDARY_START_KINDS` and never `module-root`. There is
   * deliberately no reader for the union (see `ARCH_FACT_KINDS`).
   */
  boundaryStarts(repoKey: string): ArchFact[] {
    const marks = ARCH_BOUNDARY_START_KINDS.map(() => '?').join(', ');
    const rows = this.db
      .prepare<[string, ...string[]], FactRow>(
        `SELECT a.rel_path, a.category, a.kind, a.subject, a.line, a.rule, a.evidence
           FROM arch_fact a
           JOIN arch_fact_file f ON f.oid = a.oid AND f.rel_path = a.rel_path
          WHERE f.repo_key = ? AND a.category = 'boundary' AND a.kind IN (${marks})`
      )
      .all(repoKey, ...ARCH_BOUNDARY_START_KINDS);
    return rows.map((row) => factOf(row, false)).sort(compareFacts);
  }

  /** The boundary facts that say a language's package root is here, and nothing else. */
  moduleRoots(repoKey: string): ArchFact[] {
    const rows = this.db
      .prepare<[string, string], FactRow>(
        `SELECT a.rel_path, a.category, a.kind, a.subject, a.line, a.rule, a.evidence
           FROM arch_fact a
           JOIN arch_fact_file f ON f.oid = a.oid AND f.rel_path = a.rel_path
          WHERE f.repo_key = ? AND a.category = 'boundary' AND a.kind = ?`
      )
      .all(repoKey, ARCH_MODULE_ROOT_KIND);
    return rows.map((row) => factOf(row, false)).sort(compareFacts);
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
      // PHASE 259 widened this from two words to four. A row an older build
      // wrote carries neither of the new ones, so `whole` stays the fallback
      // and nothing already stored moves.
      scope:
        row.scope === 'drift' || row.scope === 'part' || row.scope === 'journeys'
          ? row.scope
          : 'whole',
      trigger:
        row.trigger === 'ribbon' || row.trigger === 'drift'
          ? row.trigger
          : 'gesture',
      inputHash: row.input_hash
    };
  }

  // -------------------------------------------------------------------------
  // The declaration half (Phase 259; SPEC §3.1)
  // -------------------------------------------------------------------------

  /**
   * Replace the declaration list for (oid, relPath), in ONE transaction.
   *
   * A row past the subject or evidence bound makes the WHOLE call throw with
   * the field named and writes nothing, the same rule `saveFacts` applies, so
   * what is stored is always something the reader really produced.
   */
  saveDecls(oid: string, relPath: string, decls: readonly ArchDeclDraftRow[]): void {
    for (const row of decls) {
      const why = refuseDecl(row);
      if (why !== null) throw new Error(`${relPath}: ${why}`);
    }
    const drop = this.db.prepare<[string, string]>(
      'DELETE FROM arch_decl WHERE oid = ? AND rel_path = ?'
    );
    const insert = this.db.prepare<[string, string, number, string, string, number, string]>(
      `INSERT INTO arch_decl (oid, rel_path, seq, kind, subject, line, evidence)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    immediateTransaction(this.db, () => {
      drop.run(oid, relPath);
      decls.forEach((row, seq) => {
        insert.run(oid, relPath, seq, row.kind, row.subject, row.line, row.evidence);
      });
    });
  }

  /**
   * Every declaration in the named files of one repository, sorted (file,
   * line, kind, subject).
   *
   * Asked of the CITED files rather than of the whole tree, because the two
   * readers are the grader and the floor and both only ever look at files a
   * reading actually names.
   */
  declsOf(repoKey: string, files: readonly string[]): ArchDeclRow[] {
    const wanted = [...new Set(files)];
    if (wanted.length === 0) return [];
    const select = this.db.prepare<[string, string], DeclRow>(
      `SELECT d.rel_path, d.kind, d.subject, d.line, d.evidence
         FROM arch_decl d
         JOIN arch_fact_file f ON f.oid = d.oid AND f.rel_path = d.rel_path
        WHERE f.repo_key = ? AND d.rel_path = ?`
    );
    const out: ArchDeclRow[] = [];
    for (const file of wanted) {
      for (const row of select.all(repoKey, file)) {
        out.push({
          file: row.rel_path,
          kind: row.kind,
          subject: row.subject,
          line: row.line,
          evidence: row.evidence
        });
      }
    }
    return out.sort((a, b) => {
      if (a.file !== b.file) return a.file < b.file ? -1 : 1;
      if (a.line !== b.line) return a.line - b.line;
      if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
      return a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0;
    });
  }

  /**
   * How many declarations sit under a set of directories. The one COUNT this
   * table answers, and it is for the phase's own measurement rather than for
   * any face: no surface in this product counts a declaration.
   */
  declCountsUnder(repoKey: string, dirs: readonly string[]): number {
    const rows = this.db
      .prepare<[string], { rel_path: string; n: number }>(
        `SELECT d.rel_path AS rel_path, COUNT(*) AS n
           FROM arch_decl d
           JOIN arch_fact_file f ON f.oid = d.oid AND f.rel_path = d.rel_path
          WHERE f.repo_key = ?
          GROUP BY d.rel_path`
      )
      .all(repoKey);
    const under = (path: string): boolean =>
      dirs.some((dir) => dir === '' || path === dir || path.startsWith(`${dir}/`));
    let total = 0;
    for (const row of rows) if (under(row.rel_path)) total += row.n;
    return total;
  }

  // -------------------------------------------------------------------------
  // The reading (Phase 259; SPEC §3.2 and §3.3)
  // -------------------------------------------------------------------------

  /** Record one semantic ask, whatever its verdict. Refusals are rows, never silence. */
  writeSemanticRun(row: NewArchSemanticRun): void {
    this.db
      .prepare<
        [
          string,
          string,
          string | null,
          string,
          string,
          number,
          string,
          number,
          number,
          string,
          string | null,
          string | null,
          number | null,
          number,
          number
        ]
      >(
        `INSERT INTO arch_semantic_run
           (repo_key, run_id, part_id, agent_id, model, recipe_version, head_commit,
            started_at, wall_ms, verdict, reason, detail, cost_usd, claims, rows_dropped)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(repo_key, run_id) DO UPDATE SET
           verdict = excluded.verdict,
           reason = excluded.reason,
           detail = excluded.detail,
           wall_ms = excluded.wall_ms,
           claims = excluded.claims,
           rows_dropped = excluded.rows_dropped`
      )
      .run(
        row.repoKey,
        row.runId,
        row.partId,
        row.agentId,
        row.model,
        row.recipeVersion,
        row.headCommit,
        row.startedAt,
        row.wallMs,
        row.verdict,
        row.reason,
        row.detail,
        row.costUsd,
        row.claims,
        row.rowsDropped
      );
  }

  /**
   * Replace one reading's rows, in ONE transaction.
   *
   * `subjects` names the LIKE prefixes this write owns: a part ask owns
   * `part:<id>` and `gate:<id>/`, a journeys ask owns `journey:`. Everything
   * under them is replaced whole, so a second reading of one part never leaves
   * half the previous one behind, and a reading of one part never touches
   * another part's.
   *
   * A JOURNEY OUT OF THE CONTRACT IS NEVER OVERWRITTEN BY A MODEL'S. The
   * contract rows are written under `source: 'contract'` by the loader and the
   * model's write below deletes only `source = 'model'`.
   */
  replaceSemantic(input: {
    repoKey: string;
    subjects: readonly string[];
    runId: string;
    writtenAt: number;
    claims: readonly NewArchClaimRow[];
    journeys: readonly NewArchJourneyRow[];
    /** Which journey source this write owns, or null when it writes none. */
    journeySource: 'model' | 'contract' | null;
  }): void {
    for (const claim of input.claims) {
      const why = refuseClaim(claim);
      if (why !== null) throw new Error(`${claim.claimId}: ${why}`);
    }
    const dropClaims = this.db.prepare<[string, string]>(
      'DELETE FROM arch_claim WHERE repo_key = ? AND subject LIKE ?'
    );
    const dropCites = this.db.prepare<[string, string]>(
      `DELETE FROM arch_claim_cite WHERE repo_key = ? AND claim_id IN (
         SELECT claim_id FROM arch_claim WHERE repo_key = arch_claim_cite.repo_key AND subject LIKE ?)`
    );
    const dropJourneys = this.db.prepare<[string, string]>(
      'DELETE FROM arch_journey WHERE repo_key = ? AND source = ?'
    );
    const insertClaim = this.db.prepare<
      [string, string, string, string, string, string | null, string | null, string, number]
    >(
      `INSERT INTO arch_claim
         (repo_key, claim_id, subject, field, text, question, answer, run_id, written_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(repo_key, claim_id) DO UPDATE SET
         subject = excluded.subject,
         field = excluded.field,
         text = excluded.text,
         question = excluded.question,
         answer = excluded.answer,
         run_id = excluded.run_id,
         written_at = excluded.written_at,
         stale = 0,
         stale_reason = NULL`
    );
    const insertCite = this.db.prepare<
      [
        string,
        string,
        number,
        string,
        number,
        string,
        string,
        string | null,
        string | null,
        number | null,
        string
      ]
    >(
      `INSERT INTO arch_claim_cite
         (repo_key, claim_id, seq, rel_path, line, why, grade, fact_kind, fact_subject,
          fact_line, blob_oid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertStep = this.db.prepare<[string, string, string, string, number, string, string]>(
      `INSERT INTO arch_journey (repo_key, journey_id, name, source, seq, part_id, label)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(repo_key, journey_id, seq) DO UPDATE SET
         name = excluded.name,
         source = excluded.source,
         part_id = excluded.part_id,
         label = excluded.label`
    );
    const dropCitesOf = this.db.prepare<[string, string]>(
      'DELETE FROM arch_claim_cite WHERE repo_key = ? AND claim_id = ?'
    );
    immediateTransaction(this.db, () => {
      for (const subject of input.subjects) {
        dropCites.run(input.repoKey, subject);
        dropClaims.run(input.repoKey, subject);
      }
      if (input.journeySource !== null) dropJourneys.run(input.repoKey, input.journeySource);
      for (const claim of input.claims) {
        insertClaim.run(
          input.repoKey,
          claim.claimId,
          claim.subject,
          claim.field,
          claim.text,
          claim.question,
          claim.answer,
          input.runId,
          input.writtenAt
        );
        dropCitesOf.run(input.repoKey, claim.claimId);
        claim.cites.forEach((cite, seq) => {
          insertCite.run(
            input.repoKey,
            claim.claimId,
            seq,
            cite.relPath,
            cite.line,
            cite.why,
            cite.grade,
            cite.factKind,
            cite.factSubject,
            cite.factLine,
            cite.blobOid
          );
        });
      }
      for (const journey of input.journeys) {
        for (const step of journey.steps) {
          insertStep.run(
            input.repoKey,
            journey.journeyId,
            journey.name,
            journey.source,
            step.seq,
            step.partId,
            step.label
          );
        }
      }
    });
  }

  /**
   * Apply one drift refresh, in ONE transaction (SPEC §3.3).
   *
   * A citation whose line moved is rewritten and its claim stays current; one
   * that died is marked dead and its claim is marked stale with the sentence
   * that says which citation it was. NOTHING IS DELETED and no sentence
   * changes: the chip turns and the words stay, so a person can see what the
   * reading used to stand on.
   */
  applySemanticRefresh(
    repoKey: string,
    refresh: {
      moved: readonly { claimId: string; seq: number; line: number; blobOid: string }[];
      dead: readonly { claimId: string; seq: number; reason: string }[];
      revived: readonly { claimId: string; seq: number; line: number; blobOid: string }[];
    }
  ): void {
    const move = this.db.prepare<[number, string, string, string, number]>(
      `UPDATE arch_claim_cite SET line = ?, blob_oid = ?, dead = 0
        WHERE repo_key = ? AND claim_id = ? AND seq = ?`
    );
    const kill = this.db.prepare<[string, string, number]>(
      'UPDATE arch_claim_cite SET dead = 1 WHERE repo_key = ? AND claim_id = ? AND seq = ?'
    );
    const stale = this.db.prepare<[string, string, string]>(
      'UPDATE arch_claim SET stale = 1, stale_reason = ? WHERE repo_key = ? AND claim_id = ?'
    );
    const fresh = this.db.prepare<[string, string]>(
      `UPDATE arch_claim SET stale = 0, stale_reason = NULL
        WHERE repo_key = ? AND claim_id = ?
          AND NOT EXISTS (SELECT 1 FROM arch_claim_cite c
                           WHERE c.repo_key = arch_claim.repo_key
                             AND c.claim_id = arch_claim.claim_id AND c.dead = 1)`
    );
    immediateTransaction(this.db, () => {
      for (const row of [...refresh.moved, ...refresh.revived]) {
        move.run(row.line, row.blobOid, repoKey, row.claimId, row.seq);
      }
      for (const row of refresh.dead) {
        kill.run(repoKey, row.claimId, row.seq);
        stale.run(row.reason, repoKey, row.claimId);
      }
      for (const row of refresh.revived) fresh.run(repoKey, row.claimId);
    });
  }

  /**
   * Write one scope's backing WITH its floor.
   *
   * There is no overload that takes a rate alone: the table has no column for
   * one, so a caller that wanted to store a bare rate would not compile.
   */
  writeClaimRate(repoKey: string, rate: StoredArchRate): void {
    this.db
      .prepare<
        [string, string, number, number, number, number, string, string, number, number, number]
      >(
        `INSERT INTO arch_claim_rate
           (repo_key, scope, backed, total, floor_within, floor_lines, by_grade,
            floor_by_grade, gate_shaped, gate_claims, computed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(repo_key, scope) DO UPDATE SET
           backed = excluded.backed,
           total = excluded.total,
           floor_within = excluded.floor_within,
           floor_lines = excluded.floor_lines,
           by_grade = excluded.by_grade,
           floor_by_grade = excluded.floor_by_grade,
           gate_shaped = excluded.gate_shaped,
           gate_claims = excluded.gate_claims,
           computed_at = excluded.computed_at`
      )
      .run(
        repoKey,
        rate.scope,
        rate.backed,
        rate.total,
        rate.floorWithin,
        rate.floorLines,
        JSON.stringify(rate.byGrade),
        JSON.stringify(rate.floorByGrade),
        rate.gateShaped,
        rate.gateClaims,
        rate.computedAt
      );
  }

  /** Drop every rate whose scope no reading covers any more. */
  forgetClaimRates(repoKey: string, scopes: readonly string[]): void {
    if (scopes.length === 0) return;
    const drop = this.db.prepare<[string, string]>(
      'DELETE FROM arch_claim_rate WHERE repo_key = ? AND scope = ?'
    );
    immediateTransaction(this.db, () => {
      for (const scope of scopes) drop.run(repoKey, scope);
    });
  }

  /**
   * Every row of one repository's reading, raw. The composing is pure and
   * lives in `./semantic/reading.ts`: this file owns the SQL and nothing else.
   */
  semanticRows(repoKey: string): ArchSemanticRows {
    const claims = this.db
      .prepare<[string], ClaimRow>(
        `SELECT claim_id, subject, field, text, question, answer, run_id, written_at,
                stale, stale_reason
           FROM arch_claim WHERE repo_key = ? ORDER BY subject, claim_id`
      )
      .all(repoKey)
      .map((row) => ({
        claimId: row.claim_id,
        subject: row.subject,
        field: row.field,
        text: row.text,
        question: row.question,
        answer: row.answer,
        runId: row.run_id,
        writtenAt: row.written_at,
        stale: row.stale === 1,
        staleReason: row.stale_reason
      }));
    const cites = this.db
      .prepare<[string], CiteRow>(
        `SELECT claim_id, seq, rel_path, line, why, grade, fact_kind, fact_subject,
                fact_line, blob_oid, dead
           FROM arch_claim_cite WHERE repo_key = ? ORDER BY claim_id, seq`
      )
      .all(repoKey)
      .map((row) => ({
        claimId: row.claim_id,
        seq: row.seq,
        relPath: row.rel_path,
        line: row.line,
        why: row.why,
        grade: row.grade as ArchCiteGrade,
        factKind: row.fact_kind,
        factSubject: row.fact_subject,
        factLine: row.fact_line,
        blobOid: row.blob_oid,
        dead: row.dead === 1
      }));
    const journeys = this.db
      .prepare<[string], JourneyRow>(
        `SELECT journey_id, name, source, seq, part_id, label
           FROM arch_journey WHERE repo_key = ? ORDER BY source DESC, journey_id, seq`
      )
      .all(repoKey)
      .map((row) => ({
        journeyId: row.journey_id,
        name: row.name,
        source: row.source === 'contract' ? ('contract' as const) : ('model' as const),
        seq: row.seq,
        partId: row.part_id,
        label: row.label
      }));
    const rates = this.db
      .prepare<[string], RateRow>(
        `SELECT scope, backed, total, floor_within, floor_lines, by_grade, floor_by_grade,
                gate_shaped, gate_claims, computed_at
           FROM arch_claim_rate WHERE repo_key = ? ORDER BY scope`
      )
      .all(repoKey)
      .map((row) => ({
        scope: row.scope,
        backed: row.backed,
        total: row.total,
        floorWithin: row.floor_within,
        floorLines: row.floor_lines,
        byGrade: parseGradeTally(row.by_grade),
        floorByGrade: parseGradeTally(row.floor_by_grade),
        gateShaped: row.gate_shaped,
        gateClaims: row.gate_claims,
        computedAt: row.computed_at
      }));
    const runs = this.db
      .prepare<[string], SemanticRunRow>(
        `SELECT run_id, part_id, agent_id, model, recipe_version, head_commit, started_at,
                wall_ms, verdict, reason, detail, cost_usd, claims, rows_dropped
           FROM arch_semantic_run WHERE repo_key = ? ORDER BY started_at DESC, run_id DESC`
      )
      .all(repoKey)
      .map((row) => ({
        runId: row.run_id,
        partId: row.part_id,
        agentId: row.agent_id,
        model: row.model,
        recipeVersion: row.recipe_version,
        headCommit: row.head_commit,
        startedAt: row.started_at,
        wallMs: row.wall_ms,
        verdict: row.verdict as StoredArchSemanticRun['verdict'],
        reason: row.reason,
        detail: row.detail,
        costUsd: row.cost_usd,
        claims: row.claims,
        rowsDropped: row.rows_dropped
      }));
    return { claims, cites, journeys, rates, runs };
  }

  /** Drop everything about one repository. Its tab was closed for good. */
  forgetRepo(repoKey: string): void {
    immediateTransaction(this.db, () => {
      for (const table of [
        'arch_import',
        'arch_import_file',
        'arch_fact_file',
        'arch_fact_wrap',
        'arch_verdict',
        'arch_freshness',
        'arch_camera',
        'arch_layout',
        'arch_pass_run',
        'arch_verdict_change',
        // Phase 259. The reading is keyed by repository and goes with it; the
        // declarations are keyed on BYTES and are pruned below with the facts.
        'arch_semantic_run',
        'arch_claim',
        'arch_claim_cite',
        'arch_claim_rate',
        'arch_journey',
        'arch_repo'
      ]) {
        this.db
          .prepare(`DELETE FROM ${table} WHERE repo_key = ?`)
          .run(repoKey);
      }
      // The facts are keyed on bytes and shared between repositories, so what
      // this one alone linked is pruned rather than deleted by key.
      this.pruneUnlinked();
    });
  }

  close(): void {
    this.db.close();
  }
}

/** One stored fact row, back as a record. */
function factOf(row: FactRow, viaWrapper: boolean): ArchFact {
  return {
    file: row.rel_path,
    category: row.category as ArchFactCategory,
    kind: row.kind,
    subject: row.subject,
    line: row.line,
    rule: row.rule,
    evidence: row.evidence,
    viaWrapper
  };
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
