/**
 * userdata.ts — carry the user's data across the app rename (Phase 16.5a).
 *
 * ## Why this module exists, stated as the failure it prevents
 *
 * Electron derives `app.getPath('userData')` from the app NAME. Rename the app
 * from `gmux` to `Tortie` and the very next launch points at
 * `~/Library/Application Support/Tortie` — a directory that does not exist
 * yet. Nothing is deleted, but from the user's seat everything is gone: the
 * SQLite manifest (so every durable session is unrestorable), the snapshots
 * (so no scrollback comes back), settings.json (agents, hotkeys, scrollback
 * limits), and the renderer's localStorage (one-time tips, tree state, quick
 * open recents). The tmux sessions themselves are still alive on the private
 * socket — but with no manifest rows the app cannot prove it owns them, and by
 * design it will not adopt what it cannot prove (CLAUDE.md invariant 4). The
 * user's work is stranded.
 *
 * So: on first launch under the new name, copy the old directory into the new
 * one, VERIFY the copy, and LEAVE THE ORIGINAL IN PLACE as the backup. Never
 * move, never delete, never "and then clean up". Disk is cheap; a manifest is
 * not.
 *
 * ## The four rules this implementation is built around
 *
 * 1. **The original is read-only.** Every source open is `readonly`, including
 *    the SQLite ones. A `VACUUM INTO` snapshot from a readonly connection
 *    cannot checkpoint, truncate or otherwise touch the user's database or its
 *    `-wal` (verified against a real 40-session manifest with a 2.7 MB WAL,
 *    and pinned by a test that fingerprints every byte before and after). The
 *    one trace it can leave is a read-mark inside SQLite's `-shm`
 *    shared-memory index — bookkeeping, never data — and only in the case
 *    where a snapshot is needed at all.
 * 2. **A half-migrated directory is never the live one.** Everything is
 *    copied into `<userData>.migrating` first and verified there. Only then is
 *    it published — by a single `rename()` of the whole staging directory when
 *    the target does not exist yet (atomic), or entry by entry when Chromium
 *    already created the target. An in-progress marker is written BEFORE the
 *    first publish, so an interrupted run is detected and resumed on the next
 *    launch instead of being mistaken for a finished one.
 * 3. **Nothing in the target is ever destroyed.** When publishing has to
 *    overwrite an entry, the existing one is MOVED ASIDE into
 *    `<userData>/.pre-migration-<ts>/`, never removed. That is what makes the
 *    resume path safe even in the paranoid case where the app ran between the
 *    interruption and the retry.
 * 4. **Nothing here can stop the app booting.** Every path returns a result;
 *    the only throw is caught at the boundary. An app that fails to launch
 *    because its migration failed is strictly worse than one that launches
 *    with the old data still sitting safely where it was.
 *
 * ## What is copied, and what is deliberately not
 *
 * A DENYLIST, not an allowlist: anything gmux (or a future phase) writes under
 * userData migrates automatically, so this module does not silently become
 * wrong the day someone adds a new file. What it skips is Chromium's
 * regenerable cache tier (`Cache` alone was 749 MB on the reporting machine,
 * against 4.4 MB of actual gmux state) and the per-instance lock files, which
 * must never be duplicated into a second profile.
 *
 * ## What it deliberately does NOT touch
 *
 * - **The tmux socket name** stays `gmux` forever (CLAUDE.md; renaming it
 *   orphans every live session at upgrade). Nothing here reads or writes it.
 * - **The inner `<userData>/gmux/` directory name** is unchanged: it is an
 *   internal path, invisible to the user, and every reader in the app expects
 *   it. A rename there would be a second migration for no benefit.
 * - **The recorded SpecStory binary path in captured manifest rows** is NOT
 *   rewritten. It points into the OLD app bundle
 *   (`/Applications/gmux.app/Contents/Resources/bin/specstory`) and the rename
 *   invalidates it for every captured row at once — but the heal already
 *   exists at the point of use (`armableResumeArgv` in restore/restore.ts,
 *   Phase 15.1), where it can consult the specstory actually resolvable on
 *   this machine. Rewriting rows here would guess at that answer while holding
 *   a lock on the file we least want to be wrong about. Instead the migration
 *   AUDITS them and says out loud how many rows are affected.
 *
 * ## Phase 19 item 10 — the failure path, which used to be one-way
 *
 * Everything above describes the success path, and the success path was
 * shipped and tested. The failure path was silent and permanent, and research
 * 33 §3.1 proved it with a probe rather than arguing it. One file at mode 000
 * in the legacy root made the copy throw. The run correctly published nothing
 * and left the original intact, and then three things happened in order. The
 * user was never told, because the notice was gated on success. The app booted
 * anyway and created `<userData>/gmux/`, which is one of the two things
 * `hasOwnPayload` looks for. Every launch after that returned
 * `skipped` / `target-has-data`, forever, even once the permission was fixed.
 * The 41 session manifest would have stayed in the old root for good.
 *
 * Three changes close it, and they are all in this file and ./notice.ts.
 *
 * 1. A failure now WRITES a marker recording the failure, before the app can
 *    create its own payload. It is written first because the app creates
 *    `<userData>/gmux/` at its first boot and there is no later moment at
 *    which the target still looks untouched.
 * 2. A marker that says `failed` or `in-progress` beats `hasOwnPayload`, so
 *    the next launch retries instead of standing down. The mechanism stays
 *    armed rather than disabling itself.
 * 3. The user is told, in ./notice.ts, with its own words and its own stamp.
 *
 * The retry publishes the same way an interrupted run does. Anything already
 * in the target is MOVED ASIDE into `<userData>/.pre-migration-<ts>/` and
 * nothing is deleted, so a user who worked under the new name between the
 * failure and the retry keeps that work as well as getting their old data
 * back. The notice says where it went.
 *
 * ## Phase 19 item 10 — row counts were never verification
 *
 * A copy was verified by comparing per table row counts. Research 34 §3.2
 * measured a copy of the real manifest that had identical counts in every
 * table, passed an integrity check, and was stale on all 40 rows, because this
 * manifest's churn is `UPDATE` against `last_seen` and `status` and a count
 * cannot see an `UPDATE`. The comparison is now a sha256 per table over the
 * rows in a fixed order, from ../db/digest.ts. Counts are still recorded,
 * because they are what a person reads in the log.
 *
 * ## Phase 20 — the copy engine moved out of this file
 *
 * The `VACUUM INTO` from a read only connection, and the read that turns a
 * database into counts and content hashes, now live in
 * ../manifest/recovery.ts. This module calls them. Research 33 §4 named this
 * file as the place the engine already existed and said to generalise it into
 * `manifest/recovery.ts` rather than write a second copy path for the backup
 * ring, and the engine had already been run against the operator's real user
 * data. What stays here is the migration's own business: which strategy to use
 * for a given file, how a failure is reported, and what a failure means for the
 * upgrade.
 */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { readDatabaseEvidence, snapshotDatabase } from '../manifest/recovery';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The name the app shipped under before the rename. Never change this. */
export const LEGACY_APP_NAME = 'gmux';

/** Written at the ROOT of the new userData directory. */
export const MIGRATION_MARKER = '.userdata-migration.json';

/** Suffix of the staging directory (sibling of the target, same filesystem). */
const STAGING_SUFFIX = '.migrating';

/** Prefix of the never-deleted "what was already here" holding pen. */
const ASIDE_PREFIX = '.pre-migration-';

/** Log prefix; grep-able in a packaged run's console. */
const LOG = '[gmux-migrate]';

/**
 * Top-level entries NOT copied. Every one of these is either regenerated on
 * demand by Chromium (caches) or is a per-instance lock/handle that must not
 * exist twice (`Singleton*`, `DevToolsActivePort`). Measured shares of a real
 * 828 MB profile: Cache 749 MB, Code Cache 68 MB, GPUCache 5.6 MB — against
 * 4.4 MB of gmux's own state, which is the part that matters.
 */
const SKIP_ENTRIES: ReadonlySet<string> = new Set([
  'Cache',
  'Code Cache',
  'GPUCache',
  'ShaderCache',
  'GrShaderCache',
  'DawnGraphiteCache',
  'DawnWebGPUCache',
  'DawnCache',
  'blob_storage',
  'component_crx_cache',
  'extensions_crx_cache',
  'Shared Dictionary',
  'Crashpad',
  'logs',
  'DevToolsActivePort',
  'SingletonLock',
  'SingletonSocket',
  'SingletonCookie',
  '.DS_Store'
]);

/** Files bigger than this are verified by size only — nothing here is. */
const HASH_MAX_BYTES = 64 * 1024 * 1024;

/** A torn read of a file another process is writing is retried this often. */
const COPY_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MigrationStatus = 'migrated' | 'skipped' | 'failed';

/** Why a run did nothing (or could not finish). Stable, machine-readable. */
export type MigrationReason =
  | 'name-unchanged'
  | 'userdata-overridden'
  | 'disabled-by-env'
  | 'no-legacy-data'
  | 'target-has-data'
  | 'already-migrated'
  | 'copied'
  | 'verification-failed'
  | 'error';

/**
 * Per-database evidence. What `ok` MEANS depends on how the copy was taken,
 * and both meanings are strong:
 *
 * - `raw-copy` (the source has no live WAL): every file of the database —
 *   `.db`, `-wal`, `-shm` — is byte-identical, proved by sha256. Row counts and
 *   digests are read from the copy and reported for the log, and nothing opens
 *   the original at all.
 * - `vacuum-into` (the source HAS unmerged WAL content, i.e. another process
 *   is writing or the last one exited unclean): the copy is a consistent
 *   snapshot, so byte-identity is not the claim. A sha256 per table over the
 *   rows in a fixed order, read separately from the original and from the
 *   copy, is. Row counts are recorded alongside because they are what a person
 *   reads, but they are NOT what decides `ok` — research 34 §3.2 measured a
 *   stale copy that matched on every count.
 */
export interface DbVerification {
  /** Path relative to the userData root, e.g. `gmux/manifest.db`. */
  file: string;
  /** How the copy was taken. */
  method: 'vacuum-into' | 'raw-copy';
  /** table → row count, read from the SOURCE (or from a byte-identical copy). */
  source: Record<string, number>;
  /** table → row count, read from the COPY. */
  copy: Record<string, number>;
  /** table → sha256 over its rows, read from the SOURCE. */
  sourceDigests: Record<string, string>;
  /** table → sha256 over its rows, read from the COPY. */
  copyDigests: Record<string, string>;
  /** Tables the two sides disagree about. Empty when they hold the same rows. */
  differences: string[];
  ok: boolean;
}

export interface MigrationResult {
  status: MigrationStatus;
  reason: MigrationReason;
  legacyDir: string;
  targetDir: string;
  /** Top-level entries published into the target. */
  entries: string[];
  /** Top-level entries deliberately not copied (see SKIP_ENTRIES). */
  skipped: string[];
  /** Regular files copied (recursive count). */
  files: number;
  /** Bytes copied. */
  bytes: number;
  /** Row-count evidence for every SQLite database found. */
  databases: DbVerification[];
  /** Pre-existing target entries moved into `.pre-migration-<ts>/`. */
  movedAside: string[];
  /** Non-fatal oddities worth a sentence in the log. */
  warnings: string[];
  /** Human-readable summary — the line printed to the console. */
  summary: string;
  /**
   * The underlying failure on its own, with no path and no framing. Only set
   * when `status` is `failed`.
   *
   * It exists because the migration failure DIALOG needs a sentence and
   * `summary` is a log line. The dialog was printing `summary` verbatim, so a
   * person read "migration failed: … — your data is still at /Users/…" inside
   * a modal that had already told them where their data was, with an em dash
   * in it. A log line and a sentence for a person are two different strings.
   */
  cause?: string;
  /** Milliseconds the whole run took. */
  ms: number;
}

/**
 * What the target directory records about the migration.
 *
 * `failed` is the Phase 19 item 10 addition, and its job is to exist BEFORE the
 * app can create its own payload. Without it the app's first boot makes
 * `hasOwnPayload` true and the migration stands down for good.
 */
export interface MarkerFile {
  version: 1;
  status: 'in-progress' | 'complete' | 'failed';
  from: string;
  to: string;
  startedAt: number;
  finishedAt?: number;
  entries: string[];
  files?: number;
  bytes?: number;
  databases?: DbVerification[];
  app: { legacyName: string };
  /** Why the last attempt failed. Only on a `failed` marker. */
  reason?: MigrationReason;
  /** The sentence the user is shown. Only on a `failed` marker. */
  error?: string;
  /** How many attempts have been made, including the one being recorded. */
  attempts?: number;
  /** When the last attempt ran, whatever its outcome. */
  lastAttemptAt?: number;
}

// ---------------------------------------------------------------------------
// Where the two directories are — the decision, apart from the doing
// ---------------------------------------------------------------------------

export interface MigrationSite {
  legacyDir: string;
  targetDir: string;
}

export type SiteDecision =
  | { migrate: true; site: MigrationSite }
  | { migrate: false; reason: MigrationReason; detail: string };

/**
 * Decide WHETHER this launch is a rename upgrade at all, from paths alone.
 *
 * Two guards, and the second one matters more than it looks:
 *
 * - `userDataDir` must be the DEFAULT location for the current app name. Every
 *   smoke harness in this repo runs with `--user-data-dir=<scratch>`; without
 *   this guard each of them would faithfully copy the user's real 4.4 MB of
 *   manifest and snapshots into its throwaway directory, and a `create`/
 *   `verify` pair would then be reconciling against the real session list.
 * - The legacy directory must not BE the target. Before the rename lands they
 *   are the same path, and this module must be a no-op the whole time.
 */
export function decideMigrationSite(opts: {
  appDataDir: string;
  appName: string;
  userDataDir: string;
  legacyName?: string;
  env?: Record<string, string | undefined>;
}): SiteDecision {
  const legacyName = opts.legacyName ?? LEGACY_APP_NAME;
  const env = opts.env ?? {};
  if (env['GMUX_SKIP_USERDATA_MIGRATION'] === '1') {
    return {
      migrate: false,
      reason: 'disabled-by-env',
      detail: 'GMUX_SKIP_USERDATA_MIGRATION=1'
    };
  }

  const target = resolvePath(opts.userDataDir);
  const expected = resolvePath(join(opts.appDataDir, opts.appName));
  if (target !== expected) {
    return {
      migrate: false,
      reason: 'userdata-overridden',
      detail: `userData is ${target}, not the default ${expected}`
    };
  }

  const legacyDir = resolvePath(join(opts.appDataDir, legacyName));
  if (legacyDir === target) {
    return {
      migrate: false,
      reason: 'name-unchanged',
      detail: `still running as "${legacyName}"`
    };
  }

  return { migrate: true, site: { legacyDir, targetDir: target } };
}

// ---------------------------------------------------------------------------
// The migration
// ---------------------------------------------------------------------------

export interface MigrateOptions extends MigrationSite {
  /** Defaults to console.log with the standard prefix. */
  log?: (line: string) => void;
  /** Test seam: pretend `now` for the aside directory's timestamp. */
  now?: () => number;
}

/**
 * Copy `legacyDir` → `targetDir`, verify it, publish it, and leave the
 * original exactly as it was found.
 *
 * Never throws: every failure becomes a `failed` result with the reason in
 * `summary`, because the caller runs at boot.
 */
export function migrateUserData(opts: MigrateOptions): MigrationResult {
  const started = Date.now();
  const log = opts.log ?? ((line: string) => console.log(`${LOG} ${line}`));
  const now = opts.now ?? (() => Date.now());
  const legacyDir = resolvePath(opts.legacyDir);
  const targetDir = resolvePath(opts.targetDir);
  const base: Omit<MigrationResult, 'status' | 'reason' | 'summary' | 'ms'> = {
    legacyDir,
    targetDir,
    entries: [],
    skipped: [],
    files: 0,
    bytes: 0,
    databases: [],
    movedAside: [],
    warnings: []
  };
  const done = (
    status: MigrationStatus,
    reason: MigrationReason,
    summary: string,
    extra: Partial<MigrationResult> = {}
  ): MigrationResult => {
    const result: MigrationResult = {
      ...base,
      ...extra,
      status,
      reason,
      summary,
      ms: Date.now() - started
    };
    // Phase 19 item 10. A failure records itself in the target BEFORE the app
    // gets to create `<userData>/gmux/`, which is the moment `hasOwnPayload`
    // would otherwise start winning and never stop. Written here rather than at
    // each return so no future failure branch can forget it.
    if (status === 'failed') {
      recordFailedAttempt({
        targetDir,
        legacyDir,
        reason,
        // The marker carries the CAUSE, because the next launch reads it back
        // into the dialog. See MigrationResult.cause.
        summary: result.cause ?? summary,
        now,
        log
      });
    }
    log(summary);
    return result;
  };

  try {
    if (!existsSync(legacyDir)) {
      return done(
        'skipped',
        'no-legacy-data',
        `nothing to migrate — no ${legacyDir} (fresh install)`
      );
    }

    const marker = readMarker(targetDir);
    if (marker?.status === 'complete') {
      return done(
        'skipped',
        'already-migrated',
        `already migrated on ${new Date(marker.finishedAt ?? marker.startedAt).toISOString()} ` +
          `(${marker.entries.length} entries from ${marker.from})`
      );
    }

    // Phase 19 item 10. Both of these beat `hasOwnPayload`, and for the same
    // reason: the target's payload may be nothing more than the empty database
    // the app created on the boot that followed the failure. Standing down
    // because of it is how a recoverable failure became a permanent one.
    const resuming = marker?.status === 'in-progress';
    const retryingAfterFailure = marker?.status === 'failed';
    if (resuming) {
      base.warnings.push(
        `resuming an interrupted migration started ${new Date(marker.startedAt).toISOString()}`
      );
      log(
        `an earlier migration was interrupted — redoing it from ${legacyDir}, ` +
          'which was never modified'
      );
    } else if (retryingAfterFailure) {
      const attempts = marker.attempts ?? 1;
      base.warnings.push(
        `attempt ${attempts + 1}: the previous attempt failed ` +
          `(${marker.reason ?? 'error'}) on ` +
          `${new Date(marker.lastAttemptAt ?? marker.startedAt).toISOString()}`
      );
      log(
        `an earlier migration failed (${marker.reason ?? 'error'}). Trying ` +
          `again from ${legacyDir}, which was never modified.`
      );
    } else if (hasOwnPayload(targetDir)) {
      // Spec rule: both directories populated ⇒ do nothing, prefer the new.
      return done(
        'skipped',
        'target-has-data',
        `${targetDir} already holds gmux data — leaving both directories alone`
      );
    }

    // The old app may be RUNNING (an upgrade where the user launched the new
    // bundle without quitting the old one). Not fatal: the SQLite snapshot is
    // consistent by construction and the flat files are re-read on mismatch.
    if (existsSync(join(legacyDir, 'SingletonLock'))) {
      base.warnings.push(
        'the old app looks like it is still running (SingletonLock present) — ' +
          'copied anyway; quit it and relaunch if anything looks stale'
      );
    }

    const entries = readdirSync(legacyDir).sort();
    const copyList: string[] = [];
    for (const name of entries) {
      if (isSkippedEntry(name)) base.skipped.push(name);
      else copyList.push(name);
    }
    if (copyList.length === 0) {
      return done(
        'skipped',
        'no-legacy-data',
        `${legacyDir} holds nothing worth migrating`
      );
    }

    // --- stage -----------------------------------------------------------
    const staging = targetDir + STAGING_SUFFIX;
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });

    const ctx: CopyContext = {
      files: 0,
      bytes: 0,
      databases: [],
      warnings: base.warnings,
      handled: new Set<string>()
    };
    log(`copying ${copyList.length} entries from ${legacyDir}`);
    for (const name of copyList) {
      copyEntry(join(legacyDir, name), join(staging, name), name, ctx);
    }
    base.files = ctx.files;
    base.bytes = ctx.bytes;
    base.databases = ctx.databases;

    // --- verify (before anything is published) ---------------------------
    const problems = verifyStaging(legacyDir, staging, copyList, ctx);
    if (problems.length > 0) {
      for (const p of problems) log(`VERIFY FAILED: ${p}`);
      log(
        `left the unverified copy at ${staging} for inspection; your original ` +
          `data is untouched at ${legacyDir}`
      );
      return done(
        'failed',
        'verification-failed',
        `migration ABORTED — ${problems.length} verification failure(s); ` +
          `nothing was published, ${legacyDir} is intact`,
        { warnings: [...base.warnings, ...problems] }
      );
    }

    // --- publish ---------------------------------------------------------
    const startedAt = now();
    const inProgress: MarkerFile = {
      version: 1,
      status: 'in-progress',
      from: legacyDir,
      to: targetDir,
      startedAt,
      entries: copyList,
      app: { legacyName: LEGACY_APP_NAME },
      attempts: (marker?.attempts ?? 0) + 1,
      lastAttemptAt: startedAt
    };

    if (!existsSync(targetDir)) {
      // The whole payload becomes live in ONE atomic rename.
      writeMarker(staging, inProgress);
      mkdirSync(dirname(targetDir), { recursive: true });
      renameSync(staging, targetDir);
    } else {
      writeMarker(targetDir, inProgress);
      const asideDir = join(targetDir, `${ASIDE_PREFIX}${startedAt}`);
      for (const name of copyList) {
        const dest = join(targetDir, name);
        if (existsSync(dest)) {
          mkdirSync(asideDir, { recursive: true });
          renameSync(dest, join(asideDir, name));
          base.movedAside.push(name);
        }
        renameSync(join(staging, name), dest);
      }
      rmSync(staging, { recursive: true, force: true });
      if (base.movedAside.length > 0) {
        log(
          `moved ${base.movedAside.length} pre-existing ` +
            `${base.movedAside.length === 1 ? 'entry' : 'entries'} aside into ` +
            `${asideDir} — nothing was deleted`
        );
      }
    }

    writeMarker(targetDir, {
      ...inProgress,
      status: 'complete',
      finishedAt: Date.now(),
      files: ctx.files,
      bytes: ctx.bytes,
      databases: ctx.databases
    });

    for (const db of ctx.databases) {
      const counts = Object.entries(db.source)
        .map(([t, n]) => `${t}=${n}`)
        .join(' ');
      log(`verified ${db.file} (${db.method}): ${counts || 'no tables'}`);
    }
    auditCapturedBinaries(targetDir, log);

    return done(
      'migrated',
      'copied',
      `migrated ${ctx.files} files (${formatBytes(ctx.bytes)}) from ${legacyDir} ` +
        `to ${targetDir}; the original is untouched and kept as the backup`,
      { entries: copyList }
    );
  } catch (err) {
    const message = (err as Error).message;
    return done(
      'failed',
      'error',
      `migration failed: ${message}. Your data is still at ${legacyDir}.`,
      { cause: message, warnings: [...base.warnings, message] }
    );
  }
}

// ---------------------------------------------------------------------------
// Copying
// ---------------------------------------------------------------------------

interface CopyContext {
  files: number;
  bytes: number;
  databases: DbVerification[];
  warnings: string[];
  /** Source paths already handled as part of a database (relative to root). */
  handled: Set<string>;
}

function copyEntry(
  src: string,
  dest: string,
  rel: string,
  ctx: CopyContext
): void {
  const st = lstatSync(src);

  if (st.isSymbolicLink()) {
    // Copied as a LINK, never followed: following one could pull in an
    // arbitrary tree (or loop), and the only symlinks Chromium puts here are
    // the per-instance Singleton* handles this module already skips.
    try {
      symlinkSync(readlinkSync(src), dest);
    } catch (err) {
      ctx.warnings.push(`could not copy symlink ${rel}: ${(err as Error).message}`);
    }
    return;
  }

  if (st.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const name of readdirSync(src).sort()) {
      if (isSkippedEntry(name)) continue;
      copyEntry(join(src, name), join(dest, name), `${rel}/${name}`, ctx);
    }
    return;
  }

  if (!st.isFile()) {
    ctx.warnings.push(`skipped ${rel} (not a regular file)`);
    return;
  }

  if (ctx.handled.has(rel)) return;

  if (rel.endsWith('.db')) {
    copyDatabase(src, dest, rel, ctx);
    return;
  }

  copyFileVerified(src, dest, rel, ctx);
}

/**
 * Copy a SQLite database, choosing the strategy from the WAL — and touching
 * the original as little as SQLite allows.
 *
 * **No live WAL** (the ordinary case: the old app was quit, so every
 * transaction is already in the `.db`): copy the file (and any `-wal`/`-shm`
 * beside it) BYTE FOR BYTE and prove it with sha256. Nothing opens the
 * original at all, so the source directory is not modified in any way — not
 * even by SQLite's own scratch files.
 *
 * **A non-empty `-wal`** (another process is writing, or the last one exited
 * unclean — the real upgrade case where the user launches the new bundle
 * without quitting the old one): a three-file `cp` can be TORN, because the
 * `.db` and the `-wal` are read at different instants. So take a consistent
 * snapshot instead: `VACUUM INTO` from a **readonly** connection reads through
 * the WAL and writes one self-contained file holding every committed
 * transaction, without checkpointing or truncating the user's original
 * (measured against a real 40-session manifest carrying a 2.7 MB WAL: source
 * `.db`, `-wal` and their mtimes all unchanged). The `-wal`/`-shm` are then
 * deliberately not copied — their content is inside the snapshot, and a stale
 * `-wal` beside a fresh database is at best ignored and at worst confusing.
 * The one thing this can add to the source directory is SQLite's own `-shm`
 * scratch file, which SQLite itself removes when the last connection closes.
 *
 * Either way, `openGmuxDatabase()` re-establishes WAL mode the first time the
 * app opens the copy.
 *
 * The snapshot itself is `snapshotDatabase` in ../manifest/recovery.ts. The
 * choice between the two strategies stays here, because it is a property of a
 * one time upgrade rather than of copying a database.
 */
function copyDatabase(
  src: string,
  dest: string,
  rel: string,
  ctx: CopyContext
): void {
  const walPath = `${src}-wal`;
  const liveWal = existsSync(walPath) && statSync(walPath).size > 0;

  if (!liveWal) {
    copyFileVerified(src, dest, rel, ctx);
    let identical = sha256(src) === sha256(dest);
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${src}${suffix}`;
      if (!existsSync(sidecar)) continue;
      copyFileVerified(sidecar, `${dest}${suffix}`, `${rel}${suffix}`, ctx);
      ctx.handled.add(`${rel}${suffix}`);
      identical &&= sha256(sidecar) === sha256(`${dest}${suffix}`);
    }
    // Read from the COPY on purpose. Every byte of it was just proved equal to
    // the original, and this is the branch whose whole claim is that nothing
    // opened the original at all.
    const evidence = readEvidence(dest, rel, ctx);
    ctx.databases.push({
      file: rel,
      method: 'raw-copy',
      source: evidence.counts,
      copy: evidence.counts,
      sourceDigests: evidence.digests,
      copyDigests: evidence.digests,
      differences: [],
      ok: identical
    });
    return;
  }

  try {
    // Phase 20 moved this engine into ../manifest/recovery.ts, where the backup
    // ring is its second caller. Research 33 §4 named this module as the place
    // the engine already existed and said to generalise it rather than write a
    // second copy path. What arrives back is the same evidence this module
    // recorded before, plus one improvement: a source that is still being
    // written is retried instead of failing the migration on the first
    // disagreement.
    const snapshot = snapshotDatabase({ from: src, to: dest });
    ctx.databases.push({
      file: rel,
      method: 'vacuum-into',
      source: snapshot.source,
      copy: snapshot.copy,
      sourceDigests: snapshot.sourceDigests,
      copyDigests: snapshot.copyDigests,
      differences: snapshot.differences,
      // Content, not counts. A count cannot see an UPDATE, and this manifest's
      // churn is almost entirely UPDATE against `last_seen` and `status`.
      ok: snapshot.ok
    });
    if (snapshot.drifted) {
      ctx.warnings.push(
        `${rel} was still being written after ${String(snapshot.attempts)} ` +
          'attempts, so the copy could not be compared with its source'
      );
    }
    ctx.files += 1;
    ctx.bytes += snapshot.bytes;
    // Folded in — do not then copy stale sidecars next to the snapshot, and do
    // not hold the verifier to files that intentionally did not travel.
    ctx.handled.add(`${rel}-wal`);
    ctx.handled.add(`${rel}-shm`);
  } catch (err) {
    rmSync(dest, { force: true });
    ctx.warnings.push(
      `${rel} could not be snapshotted (${(err as Error).message}) — ` +
        'copied byte-for-byte instead'
    );
    copyFileVerified(src, dest, rel, ctx);
  }
}

/**
 * Counts and per-table digests read from a copy we just wrote. Both are empty
 * when the file is not a SQLite database at all, which is not an error: a
 * `.db` that is something else is copied byte for byte and verified that way.
 */
function readEvidence(
  path: string,
  rel: string,
  ctx: CopyContext
): { counts: Record<string, number>; digests: Record<string, string> } {
  // The read and its `-shm` cleanup are ../manifest/recovery.ts's, so the two
  // callers that need evidence out of a database do it the same way. What stays
  // here is the migration's own reaction to a file that is not one.
  const evidence = readDatabaseEvidence(path);
  if (evidence.error !== undefined) {
    ctx.warnings.push(
      `${rel} is not a readable SQLite database (${evidence.error}) — ` +
        'copied byte-for-byte anyway'
    );
  }
  return { counts: evidence.counts, digests: evidence.digests };
}

/** Copy one file and prove the bytes landed (hash, or size past the cap). */
function copyFileVerified(
  src: string,
  dest: string,
  rel: string,
  ctx: CopyContext
): void {
  for (let attempt = 1; attempt <= COPY_ATTEMPTS; attempt++) {
    copyFileSync(src, dest);
    const srcSize = statSync(src).size;
    const destSize = statSync(dest).size;
    if (srcSize === destSize) {
      if (srcSize > HASH_MAX_BYTES) {
        ctx.warnings.push(`${rel}: ${formatBytes(srcSize)}, verified by size only`);
        ctx.files += 1;
        ctx.bytes += destSize;
        return;
      }
      if (sha256(src) === sha256(dest)) {
        ctx.files += 1;
        ctx.bytes += destSize;
        return;
      }
    }
    if (attempt === COPY_ATTEMPTS) {
      // Not fatal here — verifyStaging() re-checks every file and turns a
      // genuine mismatch into an aborted migration. A file another process is
      // actively rewriting is the expected cause, so say so rather than
      // failing an upgrade over a Chromium cookie jar.
      ctx.warnings.push(
        `${rel} changed while it was being copied (${COPY_ATTEMPTS} attempts) — ` +
          'the copy holds the last state read'
      );
      ctx.files += 1;
      ctx.bytes += statSync(dest).size;
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Re-walk the ORIGINAL and prove the staged copy answers for every byte of it.
 *
 * Deliberately independent of the copy loop: the loop's own checks could be
 * wrong in the same way twice, and this is the gate that decides whether the
 * user's session history becomes live under the new name.
 */
function verifyStaging(
  legacyDir: string,
  staging: string,
  entries: readonly string[],
  ctx: CopyContext
): string[] {
  const problems: string[] = [];

  for (const db of ctx.databases) {
    if (db.ok) continue;
    problems.push(
      db.differences.length > 0
        ? `${db.file}: the copy does not hold the same rows — ${db.differences.join(', ')}`
        : `${db.file}: the copy does not match the original byte for byte`
    );
  }

  const walk = (rel: string): void => {
    const src = join(legacyDir, rel);
    const dest = join(staging, rel);
    const st = lstatSync(src);
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      if (!existsSync(dest)) {
        problems.push(`${rel}: directory missing from the copy`);
        return;
      }
      for (const name of readdirSync(src)) {
        if (isSkippedEntry(name)) continue;
        walk(`${rel}/${name}`);
      }
      return;
    }
    if (!st.isFile()) return;
    // A snapshotted database is verified by row count, and its WAL/SHM live
    // INSIDE the snapshot rather than beside it — so neither the file nor its
    // sidecars can be held to byte-identity. A raw-copied one is not exempt:
    // it falls through and gets hashed like everything else.
    const snapshotted = (file: string): boolean =>
      ctx.databases.some((d) => d.file === file && d.method === 'vacuum-into');
    if (snapshotted(rel) || snapshotted(rel.replace(/-(wal|shm)$/, ''))) return;
    if (!existsSync(dest)) {
      problems.push(`${rel}: missing from the copy`);
      return;
    }
    const a = statSync(src).size;
    const b = statSync(dest).size;
    if (a !== b) {
      problems.push(`${rel}: ${a} bytes in the original, ${b} in the copy`);
      return;
    }
    if (a <= HASH_MAX_BYTES && sha256(src) !== sha256(dest)) {
      problems.push(`${rel}: contents differ (sha256 mismatch)`);
    }
  };

  for (const name of entries) walk(name);
  return problems;
}

/**
 * Say out loud how many captured sessions recorded a SpecStory binary that no
 * longer exists — the rename's one silent casualty (hazard 4). Read-only: the
 * heal lives in restore/restore.ts, where it can see what is resolvable now.
 */
function auditCapturedBinaries(
  targetDir: string,
  log: (line: string) => void
): void {
  const dbPath = join(targetDir, LEGACY_APP_NAME, 'manifest.db');
  if (!existsSync(dbPath)) return;
  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = db
      .prepare<[], { name: string; specstory: string | null }>(
        "SELECT name, specstory FROM sessions WHERE specstory IS NOT NULL AND specstory <> ''"
      )
      .all();
    const stale = new Set<string>();
    let captured = 0;
    for (const row of rows) {
      if (row.specstory === null) continue;
      captured += 1;
      try {
        const bin = (JSON.parse(row.specstory) as { bin?: string }).bin;
        if (typeof bin === 'string' && bin !== '' && !existsSync(bin)) {
          stale.add(bin);
        }
      } catch {
        /* a row we cannot parse is not a row we can audit */
      }
    }
    if (captured === 0) return;
    if (stale.size === 0) {
      log(`${captured} captured session(s); their SpecStory binaries still exist`);
      return;
    }
    log(
      `${captured} captured session(s) recorded a SpecStory binary that is now ` +
        `gone (${[...stale].join(', ')}) — restore re-resolves it, so these ` +
        'sessions still come back (captured if a SpecStory CLI is available, ' +
        'uncaptured if not)'
    );
  } catch (err) {
    log(`could not audit captured sessions: ${(err as Error).message}`);
  } finally {
    db?.close();
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function isSkippedEntry(name: string): boolean {
  return (
    SKIP_ENTRIES.has(name) ||
    name === MIGRATION_MARKER ||
    name.startsWith(ASIDE_PREFIX) ||
    name.endsWith(STAGING_SUFFIX)
  );
}

/**
 * Does this directory already hold data gmux itself wrote? `settings.json` and
 * the inner `gmux/` directory are the two things only this app creates —
 * Chromium's own `Preferences`/`Local State` appear the moment a window opens
 * and must NOT be read as "the new install has been used".
 */
function hasOwnPayload(dir: string): boolean {
  return (
    existsSync(join(dir, LEGACY_APP_NAME)) || existsSync(join(dir, 'settings.json'))
  );
}

function readMarker(dir: string): MarkerFile | null {
  try {
    const raw = readFileSync(join(dir, MIGRATION_MARKER), 'utf8');
    const parsed = JSON.parse(raw) as MarkerFile;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function writeMarker(dir: string, marker: MarkerFile): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, MIGRATION_MARKER), JSON.stringify(marker, null, 2));
}

/**
 * Record a failed attempt in the target directory (Phase 19 item 10).
 *
 * Two things make this worth its own function rather than a line at each
 * failure return. It must run BEFORE the app creates `<userData>/gmux/`, which
 * means it runs at the moment of failure rather than at the next launch. And
 * it must never throw, because a migration that failed and then crashed the
 * app trying to say so is strictly worse than the silence it replaces.
 *
 * It creates the target directory. That is not a side effect worth avoiding:
 * Electron creates the same directory a few milliseconds later, and an empty
 * directory holding one marker is exactly what `hasOwnPayload` is written not
 * to count as data.
 */
function recordFailedAttempt(opts: {
  targetDir: string;
  legacyDir: string;
  reason: MigrationReason;
  summary: string;
  now: () => number;
  log: (line: string) => void;
}): void {
  try {
    const previous = readMarker(opts.targetDir);
    // A completed migration is never overwritten by a later failure. Whatever
    // failed after that, the user's data is already across.
    if (previous?.status === 'complete') return;
    const at = opts.now();
    writeMarker(opts.targetDir, {
      version: 1,
      status: 'failed',
      from: opts.legacyDir,
      to: opts.targetDir,
      startedAt: previous?.startedAt ?? at,
      entries: previous?.entries ?? [],
      app: { legacyName: LEGACY_APP_NAME },
      reason: opts.reason,
      error: opts.summary,
      attempts: (previous?.attempts ?? 0) + 1,
      lastAttemptAt: at
    });
  } catch (err) {
    opts.log(
      `could not record the failed attempt: ${(err as Error).message}. The ` +
        'next launch will try the migration again from scratch.'
    );
  }
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Read a published marker back — what a migration left behind, and when. */
export function readMigrationMarker(userDataDir: string): MarkerFile | null {
  return readMarker(userDataDir);
}

/** Would this top-level entry be left behind as regenerable? */
export function isRegenerableEntry(name: string): boolean {
  return isSkippedEntry(name);
}
