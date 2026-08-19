/**
 * gmux manifest store — the durable session bookkeeping layer.
 *
 * SQLite (better-sqlite3, synchronous) at userData/gmux/manifest.db. The
 * manifest is the tier-2 durability record (FINAL-REPORT §2.4): tmux keeps
 * live processes alive across app restarts (T1); the manifest is what lets
 * gmux recreate sessions with ARMED resume commands after tmux server death
 * (T2) or reboot (T3).
 *
 * Everything here is synchronous by design — better-sqlite3's sync API is
 * faster than async wrappers for this workload and keeps write ordering
 * trivial (manifest row is written BEFORE spawn, per §2.4 Step 0).
 *
 * Ownership: src/main/manifest/**. No IPC wiring here — the sessions service
 * (tmux stream) composes records and calls this store.
 *
 * THIS FILE IS THE STABLE FACADE (Phase 42 stage 6). The implementation
 * lives behind it in focused modules, and every name this file exported
 * before the split is still exported from here:
 *
 * - ./schema.ts               the migrations and the compatibility numbers
 * - ./codecs.ts               record shapes and row/record conversions
 * - ./sessions-repository.ts  the `sessions` table reads and writes
 * - ./projects-repository.ts  the `projects` table reads and writes
 * - ./restore-journal.ts      the `restore_attempts` table
 * - ./reconciliation.ts       the manifest judged against live tmux truth
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'node:path';
import {
  openGmuxDatabase,
  reportDatabaseGate,
  runMigrations,
  type IntegrityGateReport
} from '../db/sqlite';
import { databaseFingerprint } from '../db/digest';
import {
  assertDatabaseUsableAt,
  describeSchemaState,
  readSchemaState,
  stampSchemaVersion,
  type SchemaStateOnDisk
} from '../db/schema-version';
import { postDurabilityNotice } from '../notice';
import type { ResumeProvenance } from './agents';
import type { ContextSnapshot } from '@shared/context-snapshot';
import type {
  GmuxErrorPayload,
  Project,
  ResumeCapture,
  RestoreResultKind,
  SessionRestore,
  SessionStatus
} from '@shared/types';
import { MANIFEST_SCHEMA_IDENTITY, MIGRATIONS } from './schema';
import type {
  MachineTombstone,
  ManifestSessionPatch,
  ManifestSessionRecord,
  UpdateSessionOptions
} from './codecs';
import { SessionsRepository } from './sessions-repository';
import {
  ProjectsRepository,
  type RemoteProjectInput
} from './projects-repository';
import { RestoreJournal, type RestoreAttemptRecord } from './restore-journal';
import {
  reconcileManifest,
  type LiveTmuxSession,
  type ReconcileOptions,
  type ReconcileResult
} from './reconciliation';

// ---------------------------------------------------------------------------
// The facade surface: everything ./store exported before the stage 6 split
// still resolves here, so no importer moved.
// ---------------------------------------------------------------------------

export {
  MANIFEST_APPLICATION_ID,
  MANIFEST_MIGRATION_NAMES,
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_IDENTITY,
  MANIFEST_SCHEMA_VERSION
} from './schema';
export {
  toSession,
  toSessionCapture,
  serializeMachineTombstone,
  LOCAL_MACHINE_ROW,
  type MachineTombstone,
  type ManifestSessionPatch,
  type ManifestSessionRecord,
  type UpdateSessionOptions
} from './codecs';
export type { RestoreAttemptRecord } from './restore-journal';
export type {
  LiveTmuxSession,
  ReconcileOptions,
  ReconcileResult,
  ReconcileSkip,
  ReconcileSkipReason
} from './reconciliation';

// ---------------------------------------------------------------------------
// Errors (shared GmuxErrorPayload convention: JSON-stringified message)
// ---------------------------------------------------------------------------

function manifestError(
  code: GmuxErrorPayload['code'],
  message: string,
  detail?: string
): Error {
  const payload: GmuxErrorPayload = { code, message, ...(detail ? { detail } : {}) };
  return new Error(JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Default on-disk location: <userData>/gmux/manifest.db
 * (userData is already app-scoped: ~/Library/Application Support/gmux).
 */
export function defaultManifestDbPath(): string {
  return join(app.getPath('userData'), 'gmux', 'manifest.db');
}

/**
 * Say out loud that the session list was damaged and where the damaged copy
 * went (items 5 and 9).
 *
 * A quarantine the user cannot find is indistinguishable from a delete, so the
 * path travels with the notice and the renderer offers a Finder reveal on it.
 * `recoveredAt` is the moment the copy now in use was rebuilt, and it is null
 * when the rebuild produced nothing and Tortie is starting empty.
 *
 * The log line the opener writes is kept as well. This adds a reader, it does
 * not replace one.
 *
 * PHASE 35: the narrative half is now one error record at scope "manifest",
 * beside the notice, so a packaged user's quarantine leaves a record of which
 * file moved and whether the rebuild worked.
 */
function reportManifestGate(report: IntegrityGateReport): void {
  reportDatabaseGate(report, 'manifest');
  // A file nothing could read is not a file that was damaged, and the two need
  // opposite reactions from the user. See ManifestUnreadableNotice.
  if (report.outcome === 'unreadable') {
    postDurabilityNotice({ kind: 'manifest-unreadable', path: report.path });
    return;
  }
  if (report.outcome !== 'quarantined' || report.quarantinedTo === undefined) {
    return;
  }
  postDurabilityNotice({
    kind: 'manifest-quarantined',
    quarantinePath: report.quarantinedTo,
    recoveredAt: report.recovery?.ok === true ? Date.now() : null
  });
}

/**
 * Open a candidate manifest exactly the way the constructor below opens the
 * real one, and throw if anything about it refuses.
 *
 * Handed to the recovery step as `verifyRebuilt`, which will not publish a
 * rebuild that does not survive this. WHY IT HAS TO BE THIS FUNCTION AND NOT A
 * PRAGMA. `/usr/bin/sqlite3 .recover` rebuilds from the FINAL schema, so a
 * recovered manifest already carries every column, while the `migrations`
 * bookkeeping table can come back holding one row. `integrity_check` says the
 * file is perfect. The migration runner then decides `002-exit-code` has not
 * run and its `ALTER TABLE` throws `duplicate column name: exit_code`.
 * Measured: the rebuilt file was published, the app could not open it, and
 * EVERY later launch on that profile failed the same way with no notice at all.
 *
 * The migrations are idempotent as well now (`addColumnIfMissing`), so this
 * gate and that change close the same hole from both ends.
 */
function verifyManifestOpenable(dbPath: string): void {
  const db = new Database(dbPath, { fileMustExist: true });
  try {
    db.pragma('journal_mode = WAL');
    runMigrations(db, MIGRATIONS);
    // The rebuilt file gets the same three numbers the real one gets. A
    // manifest that carries every column and no compatibility statement is a
    // manifest an older build would open without refusing, and a rebuild is
    // exactly the moment where that would go unnoticed.
    stampSchemaVersion(db, MANIFEST_SCHEMA_IDENTITY, currentAppVersion());
    // One read through the real query surface. A schema that migrates and then
    // cannot be selected from is still a manifest the app cannot use.
    db.prepare('SELECT COUNT(*) AS c FROM sessions').get();
  } finally {
    db.close();
  }
}

/**
 * The app version, for the `last_opened_by` row.
 *
 * Wrapped because this module is unit tested outside Electron, where importing
 * `electron` yields a path string and `app` is undefined. A test profile
 * recording 'unknown' is correct: no version of Tortie opened it.
 */
function currentAppVersion(): string {
  try {
    return app.getVersion();
  } catch {
    return 'unknown';
  }
}

export class ManifestStore {
  private readonly db: Database.Database;
  private readonly sessions: SessionsRepository;
  private readonly projects: ProjectsRepository;
  private readonly journal: RestoreJournal;

  /**
   * Opens (creating if needed) the manifest DB. Pass an explicit path for
   * tests; production callers use the default userData location.
   *
   * @throws Error with a JSON GmuxErrorPayload (code FS_FAILED) when the DB
   *         cannot be created/opened — surface as a friendly UI state.
   */
  constructor(dbPath: string = defaultManifestDbPath()) {
    // Phase 21. BEFORE the writable open, and outside the try below, because a
    // refusal is not a failure to open and must not be reported as one.
    //
    // WHY IT IS HERE AND NOT INSIDE THE TRY. The `catch` turns everything into
    // "Tortie could not open your session list", which is the right sentence
    // for a permission error and the wrong one for a file that is simply newer
    // than this build. The user's sessions are fine, they are still running in
    // tmux, and the fix is to open the newer Tortie. Wrapping that in a
    // generic failure would send them looking for damage that is not there.
    //
    // The probe behind this opens the file READ ONLY and never migrates. See
    // ../db/schema-version.ts for the numbers and for the one thing this
    // cannot protect against, which is a build that shipped before it existed.
    assertDatabaseUsableAt(dbPath, MANIFEST_SCHEMA_IDENTITY);
    try {
      // Pragmas (WAL, synchronous, busy_timeout) live in ONE opener shared with
      // the symbol index — they had already drifted apart once, and the copy
      // that lost the busy_timeout was this one (research 25 §3 B2).
      // Phase 19 items 5 and 9. The gate's own default only writes to the log,
      // which nobody in the shipped app can read. The notice is posted HERE
      // rather than inside the opener because the opener is shared with the
      // symbol index, and "your session list was damaged" is false about a
      // file the app rebuilds by walking the repository.
      this.db = openGmuxDatabase(dbPath, {
        onGate: reportManifestGate,
        // A rebuild the app cannot open is a FAILED rebuild. See
        // verifyManifestOpenable for the permanent failure this closes.
        verifyRebuilt: verifyManifestOpenable
      });
      // Phase 21. The compatibility statement describes the schema the file is
      // now at, so it goes in with the last migration rather than after it.
      // The fix round moved it INSIDE that transaction: the columns and the
      // number that says an older build may not write them are now one commit,
      // and no crash can separate them. `runMigrations` says whether it had a
      // transaction to put it in; nothing pending means the file is already at
      // this schema and the stamp is written on its own.
      //
      // It writes nothing when nothing changed, which keeps the backup ring
      // from taking a generation on every launch for a value that never moves.
      const stamp = (db: Database.Database): void => {
        stampSchemaVersion(db, MANIFEST_SCHEMA_IDENTITY, currentAppVersion());
      };
      if (!runMigrations(this.db, MIGRATIONS, stamp)) stamp(this.db);
      this.sessions = new SessionsRepository(this.db);
      this.projects = new ProjectsRepository(this.db);
      this.journal = new RestoreJournal(this.db);
      // Phase 29: retention for removed sessions, BEFORE the attempt prune so
      // the restore attempts orphaned here are swept in the same open.
      this.pruneDiscardedSessions();
      // Bound the journal on open (Phase 19 item 7). Unfinished attempts are
      // never pruned: the launch that is starting right now has not yet had
      // its chance to act on them.
      this.pruneRestoreAttempts();
    } catch (err) {
      // The message reaches a toast verbatim, so it is product copy. The path
      // travels in `detail`, where a bug report finds it: a truncated absolute
      // path in a two-line toast tells the user nothing and looks like a crash.
      throw manifestError(
        'FS_FAILED',
        'Tortie could not open your session list.',
        `${dbPath}: ${(err as Error).message}`
      );
    }
  }

  close(): void {
    this.db.close();
  }

  /**
   * One hash over the content of every user table, or null when it cannot be
   * read (Phase 20 item 2).
   *
   * The backup schedule's change test. It lives here because the schedule must
   * not open a second connection to a database this process already holds open
   * for writing, and because `databaseFingerprint` needs the connection rather
   * than the path. 0.334 ms, measured against the operator's 38 session
   * manifest.
   *
   * Null means "cannot be read", and the schedule treats that as a reason to
   * take a copy rather than a reason to skip one.
   */
  contentFingerprint(): string | null {
    try {
      return databaseFingerprint(this.db);
    } catch {
      return null;
    }
  }

  /**
   * The three numbers this file carries, for the diagnostics block (Phase 21,
   * research 27 §4.7).
   *
   * They belong in the copyable support text rather than in About. A user does
   * not need to know their schema number. The first support question about a
   * manifest that will not open is answerable with one line of it.
   */
  schemaState(): SchemaStateOnDisk {
    return readSchemaState(this.db);
  }

  /** That state as one sentence, e.g. the line a bug report pastes. */
  describeSchema(): string {
    return describeSchemaState('session list', this.schemaState());
  }

  // -------------------------------------------------------------------------
  // Sessions — delegated to ./sessions-repository.ts, where each durable
  // commit carries its measurement and its reason.
  // -------------------------------------------------------------------------

  insertSession(record: ManifestSessionRecord): ManifestSessionRecord {
    return this.sessions.insertSession(record);
  }

  getSession(id: string): ManifestSessionRecord | undefined {
    return this.sessions.getSession(id);
  }

  listSessions(): ManifestSessionRecord[] {
    return this.sessions.listSessions();
  }

  updateSession(
    id: string,
    patch: ManifestSessionPatch,
    opts: UpdateSessionOptions = {}
  ): ManifestSessionRecord {
    return this.sessions.updateSession(id, patch, opts);
  }

  setContextSnapshot(
    id: string,
    snapshot: ContextSnapshot
  ): ManifestSessionRecord {
    return this.sessions.setContextSnapshot(id, snapshot);
  }

  renameSession(
    id: string,
    name: string,
    tmuxName: string
  ): ManifestSessionRecord {
    return this.sessions.renameSession(id, name, tmuxName);
  }

  setStatus(id: string, status: SessionStatus): ManifestSessionRecord {
    return this.sessions.setStatus(id, status);
  }

  setAgentSessionId(
    id: string,
    agentSessionId: string,
    resumeArgv: string[],
    provenance?: ResumeProvenance
  ): ManifestSessionRecord {
    return this.sessions.setAgentSessionId(
      id,
      agentSessionId,
      resumeArgv,
      provenance
    );
  }

  clearAgentSessionId(
    id: string,
    resumeCapture: ResumeCapture,
    provenance: ResumeProvenance
  ): ManifestSessionRecord {
    return this.sessions.clearAgentSessionId(id, resumeCapture, provenance);
  }

  setResumeProvenance(
    id: string,
    provenance: ResumeProvenance
  ): ManifestSessionRecord {
    return this.sessions.setResumeProvenance(id, provenance);
  }

  setResumeCapture(id: string, state: ResumeCapture): ManifestSessionRecord {
    return this.sessions.setResumeCapture(id, state);
  }

  deleteSession(id: string): void {
    this.sessions.deleteSession(id);
  }

  markSessionRemoved(id: string, at: number = Date.now()): void {
    this.sessions.markSessionRemoved(id, at);
  }

  /**
   * Phase 72. The tombstone a machine's removal writes on every session row that
   * named it. One durable write per row, and nothing is sent to the machine.
   */
  markMachineForgotten(id: string, tombstone: MachineTombstone): void {
    this.sessions.markMachineForgotten(id, tombstone);
  }

  /**
   * Phase 72. A completed list from a machine still held this session. One
   * column, no status change, not durable. See the repository method.
   */
  setLastSeen(id: string, at: number): void {
    this.sessions.setLastSeen(id, at);
  }

  pruneDiscardedSessions(now: number = Date.now()): void {
    this.sessions.pruneDiscardedSessions(now);
  }

  setRestoreResult(
    id: string,
    restore: SessionRestore,
    status: SessionStatus,
    bind: { tmuxName?: string; panePid?: number } = {}
  ): ManifestSessionRecord {
    return this.sessions.setRestoreResult(id, restore, status, bind);
  }

  recordRestoreOutcome(
    id: string,
    restore: SessionRestore
  ): ManifestSessionRecord {
    return this.sessions.recordRestoreOutcome(id, restore);
  }

  // -------------------------------------------------------------------------
  // The restore journal — delegated to ./restore-journal.ts (Phase 19 item 7).
  // -------------------------------------------------------------------------

  beginRestoreAttempt(sessionId: string, at: number = Date.now()): number {
    return this.journal.beginRestoreAttempt(sessionId, at);
  }

  noteRestoreTmuxId(attemptId: number, tmuxId: string): void {
    this.journal.noteRestoreTmuxId(attemptId, tmuxId);
  }

  finishRestoreAttempt(
    attemptId: number,
    outcome: RestoreResultKind,
    at: number = Date.now()
  ): void {
    this.journal.finishRestoreAttempt(attemptId, outcome, at);
  }

  listUnfinishedRestoreAttempts(): RestoreAttemptRecord[] {
    return this.journal.listUnfinishedRestoreAttempts();
  }

  getRestoreAttempt(attemptId: number): RestoreAttemptRecord | undefined {
    return this.journal.getRestoreAttempt(attemptId);
  }

  pruneRestoreAttempts(keep = 200): void {
    this.journal.pruneRestoreAttempts(keep);
  }

  // -------------------------------------------------------------------------
  // Reconcile — delegated to ./reconciliation.ts (startup, %exit,
  // %sessions-changed).
  // -------------------------------------------------------------------------

  reconcile(
    live: readonly LiveTmuxSession[],
    options: ReconcileOptions = {}
  ): ReconcileResult {
    // `this`, not the internal repository: reconcile's reads and writes go
    // through the facade's own methods, so an override of `listSessions` or
    // `updateSession` on the store (the sqlite interleaving test does this)
    // still sits inside reconcile's transaction window.
    return reconcileManifest(this.db, this, live, options);
  }

  // -------------------------------------------------------------------------
  // Projects — delegated to ./projects-repository.ts.
  // -------------------------------------------------------------------------

  upsertProject(project: Project): Project {
    return this.projects.upsertProject(project);
  }

  getProjectByPath(path: string): Project | undefined {
    return this.projects.getProjectByPath(path);
  }

  /**
   * Phase 90.3. One folder on one machine, opened as a project tab. Idempotent
   * on `(machineId, path)`, and a second add keeps the original id.
   */
  upsertRemoteProject(input: RemoteProjectInput): Project {
    return this.projects.upsertRemoteProject(input);
  }

  /** Phase 90.3. One folder on one machine, or undefined. */
  getRemoteProject(machineId: string, path: string): Project | undefined {
    return this.projects.getRemoteProject(machineId, path);
  }

  /** Phase 90.3. Every folder on every machine. */
  listRemoteProjects(): Project[] {
    return this.projects.listRemoteProjects();
  }

  listProjects(): Project[] {
    return this.projects.listProjects();
  }

  deleteProject(id: string): void {
    this.projects.deleteProject(id);
  }
}
