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
 * - ./remote-folder-pins.ts   the `remote_folder_pins` table (Phase 336)
 * - ./closed-remote-folders.ts the `closed_remote_folders` table (Phase 344)
 *
 * PHASE 357: THE STORE STOPS WHEN ITS CONNECTION BREAKS. On 2026-11-05 every
 * read of the session list in one running 0.114.0 threw "database disk image
 * is malformed", Electron drew a dialog once per refresh, and the quit crashed
 * inside SQLite's page cache while closing this connection. The FILE passed its
 * full check at the next launch, so the damage was in this connection's memory.
 *
 * So every public member of the class below is ONE statement handed to
 * `through` (or to `quiet`, for the three that answer instead of throwing),
 * which asks the latch first. The first error SQLite throws that says the
 * connection can no longer account for its pages (`isBrokenConnectionError`,
 * ../db/integrity.ts) latches the store, once: one read only check of the FILE
 * from a fresh connection, one `manifest.stopped` log record naming the
 * operation and the code and no row data, and one `manifest-stopped` notice.
 * From then on every member refuses with a typed `MANIFEST_STOPPED` error
 * before SQLite is reached, because writing pages out of a damaged cache is how
 * damage in memory becomes damage in the file, and a read would only throw
 * again. `MANIFEST_OPERATIONS` names every member, and
 * build/conformance-stopped-list.mjs holds the one statement shape, so a member
 * added later cannot walk past the latch.
 *
 * Two members are neither: `close`, which closes the connection on every path
 * but one (a stopped store whose file is fine holds its connection open, so
 * nothing runs SQLite's last close through the damaged cache), and
 * `stoppedReading`, a read of the latch itself.
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
  checkDatabaseIntegrity,
  isBrokenConnectionError,
  isUnreadable,
  type IntegrityCheckKind
} from '../db/integrity';
import {
  assertDatabaseUsableAt,
  describeSchemaState,
  readSchemaState,
  stampSchemaVersion,
  type SchemaStateOnDisk
} from '../db/schema-version';
import { getLog, logEvent } from '../log';
import { postDurabilityNotice } from '../notice';
import type { ResumeProvenance } from './agents';
import type { ContextSnapshot } from '@shared/context-snapshot';
import { MANIFEST_STOPPED_REFUSAL } from '@shared/manifest-stopped-copy';
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
  ClosedProjectTab,
  ManifestSessionPatch,
  ManifestSessionRecord,
  UpdateSessionOptions
} from './codecs';
import {
  SessionsRepository,
  type MachineTombstoneEntry,
  type MarkMachinesForgottenHooks
} from './sessions-repository';
import {
  ProjectsRepository,
  type RemoteProjectInput
} from './projects-repository';
import { RestoreJournal, type RestoreAttemptRecord } from './restore-journal';
import {
  RemoteExecutionJournal,
  type RemoteExecutionBegin,
  type RemoteExecutionOutcome,
  type RemoteExecutionRecord
} from './remote-executions';
import {
  RemoteFolderPins,
  type RemoteFolderPin
} from './remote-folder-pins';
import type { ClosedRemoteFolder } from './closed-remote-folders';
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
  serializeClosedProjectTab,
  LOCAL_MACHINE_ROW,
  type ClosedProjectTab,
  type MachineTombstone,
  type ManifestSessionPatch,
  type ManifestSessionRecord,
  type UpdateSessionOptions
} from './codecs';
export type { RestoreAttemptRecord } from './restore-journal';
export {
  JOURNALED_REMOTE_EXECUTION_KIND,
  REMOTE_EXECUTION_KINDS,
  REMOTE_EXECUTION_OUTCOMES,
  type RemoteExecutionBegin,
  type RemoteExecutionKind,
  type RemoteExecutionOutcome,
  type RemoteExecutionRecord
} from './remote-executions';
export type {
  MachineTombstoneEntry,
  MarkMachinesForgottenHooks
} from './sessions-repository';
export {
  REMOTE_FOLDER_IDENTITY_PATTERN,
  isRemoteFolderIdentity,
  type RemoteFolderPin
} from './remote-folder-pins';
export type { ClosedRemoteFolder } from './closed-remote-folders';
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
// Phase 357: the latch every public member passes through. See the header.
// ---------------------------------------------------------------------------

/**
 * Every public member of `ManifestStore`, by name, in the class's own order.
 * `close` is here and `stoppedReading` is not: the first is a store operation
 * that never asks the latch (it decides by it), the second is the latch's own
 * read. The conformance gate compares this list to the class, member by member.
 */
export const MANIFEST_OPERATIONS = Object.freeze([
  'close',
  'contentFingerprint',
  'schemaState',
  'describeSchema',
  'insertSession',
  'getSession',
  'listSessions',
  'updateSession',
  'setContextSnapshot',
  'setResumeArgvColumn',
  'setEnvColumn',
  'renameSession',
  'setStatus',
  'setAgentSessionId',
  'clearAgentSessionId',
  'setResumeProvenance',
  'setResumeCapture',
  'deleteSession',
  'markSessionRemoved',
  'markMachinesForgotten',
  'markProjectTabClosed',
  'clearProjectTabClosed',
  'projectTabClosedFor',
  'closedRemoteFolder',
  'setLastSeen',
  'pruneDiscardedSessions',
  'setRestoreResult',
  'recordRestoreOutcome',
  'beginRestoreAttempt',
  'noteRestoreTmuxId',
  'finishRestoreAttempt',
  'listUnfinishedRestoreAttempts',
  'getRestoreAttempt',
  'pruneRestoreAttempts',
  'beginRemoteExecution',
  'finishRemoteExecution',
  'listUnfinishedRemoteExecutions',
  'getRemoteExecution',
  'reconcile',
  'upsertProject',
  'getProjectByPath',
  'upsertRemoteProject',
  'getRemoteProject',
  'listRemoteProjects',
  'listProjects',
  'deleteProject',
  'remoteFolderPin',
  'setRemoteFolderPin'
] as const);

/** One store operation, as the latch, its log record and the seam name it. */
export type ManifestOperation = (typeof MANIFEST_OPERATIONS)[number];

/**
 * What the latch recorded, once, when the connection broke. `file` is the
 * fresh read only check's verdict on the FILE, which is what the quit decides
 * by: a fine file means the damage is in this connection's memory.
 */
interface ManifestStop {
  /** The member whose call broke. */
  operation: ManifestOperation;
  /** SQLite's own code, e.g. `SQLITE_CORRUPT`. */
  code: string;
  /** Epoch ms. */
  at: number;
  file: 'fine' | 'damaged' | 'unreadable';
  /** Which check the file got. */
  check: IntegrityCheckKind;
  /** How long that check took. */
  checkMs: number;
}

/**
 * The typed refusal every member answers once the store has stopped.
 *
 * The house shape: the message is a JSON `GmuxErrorPayload`, so an IPC
 * rejection carries the sentence to the renderer's toast; `detail` names the
 * operation that refused. The `code` PROPERTY is what main reads, through
 * `isManifestStopped`, and the message is never parsed for it.
 */
export function manifestStoppedError(
  operation: ManifestOperation
): Error & { code: 'MANIFEST_STOPPED' } {
  const payload: GmuxErrorPayload = {
    code: 'MANIFEST_STOPPED',
    message: MANIFEST_STOPPED_REFUSAL,
    detail: operation
  };
  return Object.assign(new Error(JSON.stringify(payload)), {
    code: 'MANIFEST_STOPPED' as const
  });
}

/** True when this is the stopped store's refusal, read by its `code`. */
export function isManifestStopped(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'MANIFEST_STOPPED'
  );
}

/**
 * Connections a stopped store left open because its file was fine, held here
 * so the garbage collector cannot run better-sqlite3's destructor, which would
 * close them through the damaged cache all the same. Nothing ever empties it:
 * the quit asks its length and ends the process without closing them.
 */
const held: Database.Database[] = [];

/** How many session list connections are held open after a stop. */
export function manifestConnectionsLeftOpen(): number {
  return held.length;
}

/**
 * The harness seam's hook (src/main/harness/manifest-fault.ts, the one caller
 * of the setter). Null in every launch that does not arm it. Asked once per
 * call inside `through`'s and `quiet`'s `try`, so an error it throws is read by
 * exactly the classifier real damage meets.
 */
let manifestFaultHook: ((operation: ManifestOperation) => void) | null = null;

/** Arm or clear the seam's hook. The harness seam is the only caller. */
export function setManifestFaultHook(
  hook: ((operation: ManifestOperation) => void) | null
): void {
  manifestFaultHook = hook;
}

/**
 * `schemaState`'s answer once the store has stopped: nothing read, nothing
 * claimed. A fresh copy is handed out each time, so no caller shares it.
 */
const STOPPED_SCHEMA_STATE: SchemaStateOnDisk = {
  applicationId: 0,
  userVersion: 0,
  minCompatible: null,
  lastOpenedBy: null
};

/** `describeSchema`'s answer once the store has stopped, for diagnostics. */
const STOPPED_SCHEMA_SENTENCE = 'session list: stopped reading';

/**
 * `contentFingerprint`'s answer once the store has stopped, when it never
 * answered a fingerprint of its own before the stop (Phase 357's fix round).
 * It is not a sha256, so it equals no fingerprint a store computes. See
 * `contentFingerprint` for why a stopped store never answers null.
 */
export const STOPPED_FINGERPRINT = 'stopped';

/** The latch record's `detail`: integrity text names pages, never rows. */
const STOP_DETAIL_MAX_CHARS = 160;

const manifestLog = getLog('manifest');

/**
 * The fingerprint, or today's null for any failure, except a broken
 * connection, which goes on to the latch and answers the stopped store's
 * fingerprint there (`contentFingerprint`).
 */
function fingerprintOrNull(db: Database.Database): string | null {
  try {
    return databaseFingerprint(db);
  } catch (err) {
    if (isBrokenConnectionError(err)) throw err;
    return null;
  }
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
  private readonly remoteExecutions: RemoteExecutionJournal;
  private readonly folderPins: RemoteFolderPins;
  /** Where the file is, for the latch's one fresh check of it (Phase 357). */
  private readonly dbPath: string;
  /** The latch (Phase 357). Null until the connection breaks, then never again. */
  private stopped: ManifestStop | null = null;
  /** `close` says once that it held the connection open. */
  private leftOpenSaid = false;
  /**
   * The fingerprint `contentFingerprint` last answered (Phase 357's fix round),
   * which a stopped store answers again. Written by that member's work alone.
   */
  private lastFingerprint: string | null = null;

  /**
   * Opens (creating if needed) the manifest DB. Pass an explicit path for
   * tests; production callers use the default userData location.
   *
   * @throws Error with a JSON GmuxErrorPayload (code FS_FAILED) when the DB
   *         cannot be created/opened — surface as a friendly UI state.
   */
  constructor(dbPath: string = defaultManifestDbPath()) {
    // Phase 357. First, so a latch from one of the prunes below can check the
    // file it names.
    this.dbPath = dbPath;
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
      this.remoteExecutions = new RemoteExecutionJournal(this.db);
      this.folderPins = new RemoteFolderPins(this.db);
      // Phase 29: retention for removed sessions, BEFORE the attempt prune so
      // the restore attempts orphaned here are swept in the same open.
      this.pruneDiscardedSessions();
      // Bound the journal on open (Phase 19 item 7). Unfinished attempts are
      // never pruned: the launch that is starting right now has not yet had
      // its chance to act on them.
      this.pruneRestoreAttempts();
      // Phase 118. Bounded on open for the same reason, and an unfinished row
      // is never pruned: this launch has not yet had its chance to say so.
      this.remoteExecutions.pruneRemoteExecutions();
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

  /**
   * Close the connection, except in the one case where closing is the danger
   * (Phase 357).
   *
   * A store that stopped because its connection broke while the FILE checked
   * fine has the damage in this connection's memory, and its close is what
   * crashed the operator's quit: SQLite's last close walks the page cache to
   * free it and checkpoints the WAL into the file through that same memory. So
   * that store closes nothing, holds the connection off the collector, and the
   * quit ends the process without closing it (WAL needs no clean close; the
   * next open replays the log through the integrity gate). Every other store,
   * a stopped one whose file is damaged or unreadable included, closes exactly
   * as before, which the parent measured clean.
   */
  close(): void {
    if (this.stopped === null || this.stopped.file !== 'fine') {
      this.db.close();
      return;
    }
    if (this.leftOpenSaid) return;
    this.leftOpenSaid = true;
    manifestLog.info(
      'the session list connection is left open so nothing closes a damaged cache'
    );
  }

  /**
   * Has the store stopped? A read of the latch itself, which touches no
   * SQLite, so it answers whichever path latched it (Phase 357).
   */
  stoppedReading(): boolean {
    return this.stopped !== null;
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
   *
   * PHASE 357, AND ITS FIX ROUND. A broken connection met here stops the
   * store. A stopped store answers the fingerprint it last answered, or
   * `STOPPED_FINGERPRINT` when it never answered one, and never null: nothing
   * can write the file through a stopped store, so its content cannot move,
   * and the ring's own change test then reads "unchanged" and takes nothing.
   * The latch's first build answered null here, which the ring reads as "take
   * one". With the file fine that took a generation at every poll past the
   * five minute floor and rotated every generation from before the stop out of
   * the ring, where the parent's digest answers one fixed text for a table it
   * cannot read and takes one generation at most (build/p357/SPEC.md, the fix
   * round).
   */
  contentFingerprint(): string | null {
    return this.quiet(
      'contentFingerprint',
      this.lastFingerprint ?? STOPPED_FINGERPRINT,
      () => (this.lastFingerprint = fingerprintOrNull(this.db))
    );
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
    return this.quiet('schemaState', { ...STOPPED_SCHEMA_STATE }, () =>
      readSchemaState(this.db)
    );
  }

  /**
   * That state as one sentence, e.g. the line a bug report pastes. Phase 357:
   * it reads the state itself rather than through `schemaState`, so a broken
   * connection met here answers this member's own sentence.
   */
  describeSchema(): string {
    return this.quiet('describeSchema', STOPPED_SCHEMA_SENTENCE, () =>
      describeSchemaState('session list', readSchemaState(this.db))
    );
  }

  // -------------------------------------------------------------------------
  // Sessions — delegated to ./sessions-repository.ts, where each durable
  // commit carries its measurement and its reason.
  // -------------------------------------------------------------------------

  insertSession(record: ManifestSessionRecord): ManifestSessionRecord {
    return this.through('insertSession', () => this.sessions.insertSession(record));
  }

  getSession(id: string): ManifestSessionRecord | undefined {
    return this.through('getSession', () => this.sessions.getSession(id));
  }

  listSessions(): ManifestSessionRecord[] {
    return this.through('listSessions', () => this.sessions.listSessions());
  }

  updateSession(
    id: string,
    patch: ManifestSessionPatch,
    opts: UpdateSessionOptions = {}
  ): ManifestSessionRecord {
    return this.through('updateSession', () =>
      this.sessions.updateSession(id, patch, opts)
    );
  }

  setContextSnapshot(
    id: string,
    snapshot: ContextSnapshot
  ): ManifestSessionRecord {
    return this.through('setContextSnapshot', () =>
      this.sessions.setContextSnapshot(id, snapshot)
    );
  }

  /** One row's `resume_argv` and no other column. See the repository. */
  setResumeArgvColumn(id: string, argv: readonly string[]): void {
    this.through('setResumeArgvColumn', () =>
      this.sessions.setResumeArgvColumn(id, argv)
    );
  }

  /** One row's `env` and no other column. See the repository. */
  setEnvColumn(id: string, env: Readonly<Record<string, string>>): void {
    this.through('setEnvColumn', () => this.sessions.setEnvColumn(id, env));
  }

  renameSession(
    id: string,
    name: string,
    tmuxName: string
  ): ManifestSessionRecord {
    return this.through('renameSession', () =>
      this.sessions.renameSession(id, name, tmuxName)
    );
  }

  setStatus(id: string, status: SessionStatus): ManifestSessionRecord {
    return this.through('setStatus', () => this.sessions.setStatus(id, status));
  }

  setAgentSessionId(
    id: string,
    agentSessionId: string,
    resumeArgv: string[],
    provenance?: ResumeProvenance
  ): ManifestSessionRecord {
    return this.through('setAgentSessionId', () =>
      this.sessions.setAgentSessionId(
        id,
        agentSessionId,
        resumeArgv,
        provenance
      )
    );
  }

  clearAgentSessionId(
    id: string,
    resumeCapture: ResumeCapture,
    provenance: ResumeProvenance
  ): ManifestSessionRecord {
    return this.through('clearAgentSessionId', () =>
      this.sessions.clearAgentSessionId(id, resumeCapture, provenance)
    );
  }

  setResumeProvenance(
    id: string,
    provenance: ResumeProvenance
  ): ManifestSessionRecord {
    return this.through('setResumeProvenance', () =>
      this.sessions.setResumeProvenance(id, provenance)
    );
  }

  setResumeCapture(id: string, state: ResumeCapture): ManifestSessionRecord {
    return this.through('setResumeCapture', () =>
      this.sessions.setResumeCapture(id, state)
    );
  }

  deleteSession(id: string): void {
    this.through('deleteSession', () => this.sessions.deleteSession(id));
  }

  markSessionRemoved(id: string, at: number = Date.now()): void {
    this.through('markSessionRemoved', () =>
      this.sessions.markSessionRemoved(id, at)
    );
  }

  /**
   * Phase 72, made one transaction in Phase 118. The tombstone a machine's
   * removal writes on every session row that named it. ONE durable transaction
   * over every row, all or none, and nothing is sent to the machine.
   */
  markMachinesForgotten(
    entries: readonly MachineTombstoneEntry[],
    hooks?: MarkMachinesForgottenHooks
  ): number {
    return this.through('markMachinesForgotten', () =>
      this.sessions.markMachinesForgotten(entries, hooks)
    );
  }

  /**
   * Phase 93. Stamp every session a closing project tab leaves without one. One
   * durable write, no status change, and nothing is sent to any machine. The
   * caller runs it BEFORE it deletes the project row. See the repository method
   * for why that order is the only safe one.
   */
  markProjectTabClosed(
    target: { path: string; machineId?: string },
    tab: ClosedProjectTab
  ): number {
    return this.through('markProjectTabClosed', () =>
      this.sessions.markProjectTabClosed(target, tab)
    );
  }

  /**
   * Phase 93. Clear the stamp on every session in a folder that has a tab
   * again. Runs from both project adds, after the upsert returns.
   */
  clearProjectTabClosed(target: { path: string; machineId?: string }): number {
    return this.through('clearProjectTabClosed', () =>
      this.sessions.clearProjectTabClosed(target)
    );
  }

  /**
   * PHASE 306. Whether a person closed the tab for this folder on this machine
   * and that is still the record. A read; see the repository method.
   */
  projectTabClosedFor(target: { path: string; machineId?: string }): boolean {
    return this.through('projectTabClosedFor', () =>
      this.sessions.projectTabClosedFor(target)
    );
  }

  /**
   * PHASE 344. The record of a close for one folder on another machine, kept
   * by the folder itself, or undefined when there is none or the row is not in
   * the one shape. A read. `listSessions` carries it on that folder's sessions
   * that have no stamp of their own; see ./closed-remote-folders.ts.
   */
  closedRemoteFolder(machineId: string, path: string): ClosedRemoteFolder | undefined {
    return this.through('closedRemoteFolder', () =>
      this.sessions.closedRemoteFolder(machineId, path)
    );
  }

  /**
   * Phase 72. A completed list from a machine still held this session. One
   * column, no status change, not durable. See the repository method.
   */
  setLastSeen(id: string, at: number): void {
    this.through('setLastSeen', () => this.sessions.setLastSeen(id, at));
  }

  pruneDiscardedSessions(now: number = Date.now()): void {
    this.through('pruneDiscardedSessions', () =>
      this.sessions.pruneDiscardedSessions(now)
    );
  }

  setRestoreResult(
    id: string,
    restore: SessionRestore,
    status: SessionStatus,
    bind: { tmuxName?: string; panePid?: number } = {}
  ): ManifestSessionRecord {
    return this.through('setRestoreResult', () =>
      this.sessions.setRestoreResult(id, restore, status, bind)
    );
  }

  recordRestoreOutcome(
    id: string,
    restore: SessionRestore
  ): ManifestSessionRecord {
    return this.through('recordRestoreOutcome', () =>
      this.sessions.recordRestoreOutcome(id, restore)
    );
  }

  // -------------------------------------------------------------------------
  // The restore journal — delegated to ./restore-journal.ts (Phase 19 item 7).
  // -------------------------------------------------------------------------

  beginRestoreAttempt(sessionId: string, at: number = Date.now()): number {
    return this.through('beginRestoreAttempt', () =>
      this.journal.beginRestoreAttempt(sessionId, at)
    );
  }

  noteRestoreTmuxId(attemptId: number, tmuxId: string): void {
    this.through('noteRestoreTmuxId', () =>
      this.journal.noteRestoreTmuxId(attemptId, tmuxId)
    );
  }

  finishRestoreAttempt(
    attemptId: number,
    outcome: RestoreResultKind,
    at: number = Date.now()
  ): void {
    this.through('finishRestoreAttempt', () =>
      this.journal.finishRestoreAttempt(attemptId, outcome, at)
    );
  }

  listUnfinishedRestoreAttempts(): RestoreAttemptRecord[] {
    return this.through('listUnfinishedRestoreAttempts', () =>
      this.journal.listUnfinishedRestoreAttempts()
    );
  }

  getRestoreAttempt(attemptId: number): RestoreAttemptRecord | undefined {
    return this.through('getRestoreAttempt', () =>
      this.journal.getRestoreAttempt(attemptId)
    );
  }

  pruneRestoreAttempts(keep = 200): void {
    this.through('pruneRestoreAttempts', () =>
      this.journal.pruneRestoreAttempts(keep)
    );
  }

  // -------------------------------------------------------------------------
  // The remote execution journal — delegated to ./remote-executions.ts
  // (Phase 118, migration 017). ONE kind of remote work is written here, being
  // a copy of a project onto another machine, because that is the one kind that
  // writes on the other computer. The file's header says why the other four are
  // classified in memory and logged instead.
  // -------------------------------------------------------------------------

  beginRemoteExecution(
    input: RemoteExecutionBegin,
    at: number = Date.now()
  ): number {
    return this.through('beginRemoteExecution', () =>
      this.remoteExecutions.beginRemoteExecution(input, at)
    );
  }

  finishRemoteExecution(
    id: number,
    outcome: RemoteExecutionOutcome,
    at: number = Date.now()
  ): void {
    this.through('finishRemoteExecution', () =>
      this.remoteExecutions.finishRemoteExecution(id, outcome, at)
    );
  }

  listUnfinishedRemoteExecutions(): RemoteExecutionRecord[] {
    return this.through('listUnfinishedRemoteExecutions', () =>
      this.remoteExecutions.listUnfinishedRemoteExecutions()
    );
  }

  getRemoteExecution(id: number): RemoteExecutionRecord | undefined {
    return this.through('getRemoteExecution', () =>
      this.remoteExecutions.getRemoteExecution(id)
    );
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
    // still sits inside reconcile's transaction window. Phase 357: those inner
    // calls pass through the latch on their own, so one that breaks stops the
    // store there and its refusal comes out of this call unchanged.
    return this.through('reconcile', () =>
      reconcileManifest(this.db, this, live, options)
    );
  }

  // -------------------------------------------------------------------------
  // Projects — delegated to ./projects-repository.ts.
  // -------------------------------------------------------------------------

  upsertProject(project: Project): Project {
    return this.through('upsertProject', () => this.projects.upsertProject(project));
  }

  getProjectByPath(path: string): Project | undefined {
    return this.through('getProjectByPath', () =>
      this.projects.getProjectByPath(path)
    );
  }

  /**
   * Phase 90.3. One folder on one machine, opened as a project tab. Idempotent
   * on `(machineId, path)`, and a second add keeps the original id.
   */
  upsertRemoteProject(input: RemoteProjectInput): Project {
    return this.through('upsertRemoteProject', () =>
      this.projects.upsertRemoteProject(input)
    );
  }

  /** Phase 90.3. One folder on one machine, or undefined. */
  getRemoteProject(machineId: string, path: string): Project | undefined {
    return this.through('getRemoteProject', () =>
      this.projects.getRemoteProject(machineId, path)
    );
  }

  /** Phase 90.3. Every folder on every machine. */
  listRemoteProjects(): Project[] {
    return this.through('listRemoteProjects', () =>
      this.projects.listRemoteProjects()
    );
  }

  listProjects(): Project[] {
    return this.through('listProjects', () => this.projects.listProjects());
  }

  deleteProject(id: string): void {
    this.through('deleteProject', () => this.projects.deleteProject(id));
  }

  // -------------------------------------------------------------------------
  // Folder pins — delegated to ./remote-folder-pins.ts (Phase 336, migration
  // 019). The identity of one folder on another machine, taken when a person
  // opened it as a project and compared on that machine at every write. This
  // store keeps it and reads it back; the write path in
  // ../machines/write-folder.ts decides when one is taken.
  // -------------------------------------------------------------------------

  /**
   * Phase 336. The pin for one folder on one machine, keyed by the project
   * row's stored path byte for byte, or undefined when there is none or the
   * stored identity is not `<device>:<inode>`.
   */
  remoteFolderPin(machineId: string, path: string): RemoteFolderPin | undefined {
    return this.through('remoteFolderPin', () =>
      this.folderPins.remoteFolderPin(machineId, path)
    );
  }

  /**
   * Phase 336. Record or replace one folder's pin, durably. Refuses an
   * identity that is not `<device>:<inode>` and writes nothing.
   */
  setRemoteFolderPin(
    machineId: string,
    path: string,
    identity: string,
    at: number = Date.now()
  ): void {
    this.through('setRemoteFolderPin', () =>
      this.folderPins.setRemoteFolderPin(machineId, path, identity, at)
    );
  }

  // -------------------------------------------------------------------------
  // Phase 357: the latch. See the header.
  // -------------------------------------------------------------------------

  /**
   * Run one member's work, unless the store has stopped.
   *
   * A stopped store refuses before anything else, the seam's hook included,
   * so nothing after the latch reaches SQLite. Otherwise the hook and the work
   * share one `try`: an error that says the connection broke latches the store
   * and answers the typed refusal in its place, and every other error, the
   * refusal of a nested call included, goes on exactly as it was thrown.
   */
  private through<T>(operation: ManifestOperation, run: () => T): T {
    if (this.stopped !== null) throw manifestStoppedError(operation);
    try {
      manifestFaultHook?.(operation);
      return run();
    } catch (err) {
      if (!isBrokenConnectionError(err)) throw err;
      this.latch(operation, err);
      throw manifestStoppedError(operation);
    }
  }

  /** `through` for the three members that answer `fallback` instead of refusing. */
  private quiet<T>(operation: ManifestOperation, fallback: T, run: () => T): T {
    if (this.stopped !== null) return fallback;
    try {
      manifestFaultHook?.(operation);
      return run();
    } catch (err) {
      if (!isBrokenConnectionError(err)) throw err;
      this.latch(operation, err);
      return fallback;
    }
  }

  /**
   * Stop the store, once.
   *
   * 1. Ask a fresh read only connection, with its own page cache, whether the
   *    FILE is fine: the integrity gate's own check, synchronously, because it
   *    measured 0 to 2 ms here and the gate runs it on the whole file at every
   *    launch. Inside a transaction it reads the last commit, which WAL allows.
   * 2. One log record naming the operation, SQLite's code and the verdict,
   *    never a row value: integrity text names pages and trees.
   * 3. When the file is fine, hold this connection off the collector (`close`).
   * 4. One notice, which the person sees with its Restart action.
   *
   * Once, even when calls nest: `reconcile` runs its reads inside its own
   * `through`, so an inner call can latch and a raw SQLite error can still
   * reach the outer catch afterwards (a ROLLBACK that throws replaces the
   * refusal it was unwinding). The second arrival records nothing.
   */
  private latch(operation: ManifestOperation, err: unknown): void {
    if (this.stopped !== null) return;
    const startedAt = performance.now();
    const verdict = checkDatabaseIntegrity(this.dbPath);
    const checkMs = Math.round((performance.now() - startedAt) * 10) / 10;
    const file: ManifestStop['file'] = verdict.ok
      ? 'fine'
      : isUnreadable(verdict)
        ? 'unreadable'
        : 'damaged';
    const code = String((err as { code?: unknown }).code);
    this.stopped = {
      operation,
      code,
      at: Date.now(),
      file,
      check: verdict.check,
      checkMs
    };
    logEvent(
      'manifest',
      'error',
      'manifest.stopped',
      'the session list stopped reading correctly',
      {
        operation,
        code,
        file,
        check: verdict.check,
        checkMs,
        detail: verdict.detail.slice(0, STOP_DETAIL_MAX_CHARS)
      }
    );
    if (file === 'fine') held.push(this.db);
    postDurabilityNotice({
      kind: 'manifest-stopped',
      fileFine: file === 'fine' ? true : file === 'damaged' ? false : null
    });
  }
}
