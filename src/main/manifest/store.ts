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
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'node:path';
import {
  addColumnIfMissing,
  durableTransaction,
  immediateTransaction,
  openGmuxDatabase,
  reportDatabaseGate,
  runMigrations,
  type IntegrityGateReport,
  type SqliteMigration
} from '../db/sqlite';
import { postDurabilityNotice } from '../notice';
import {
  RESUME_CAPTURES,
  SESSION_STATUSES,
  type GmuxErrorPayload,
  type Project,
  type ResumeCapture,
  type RestoreResultKind,
  type RestoreStage,
  type Session,
  type SessionCapture,
  type SessionRestore,
  type SessionStatus
} from '@shared/types';
import type { SpecstoryCaptureRecord } from '../specstory/capture';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A full manifest row: the shared Session shape plus the launch bookkeeping
 * that only the main process needs (argv/env/lastSeen). Renderers only ever
 * see the Session projection.
 */
export interface ManifestSessionRecord extends Session {
  /**
   * Full original launch argv, e.g. ["claude","--session-id","<uuid>",...].
   * Recorded because `--resume` does NOT re-apply launch flags
   * (--mcp-config/--add-dir/--settings; research 02).
   */
  argv: string[];
  /** Environment deltas applied at launch (e.g. CLAUDE_CONFIG_DIR). */
  env?: Record<string, string>;
  /** Epoch ms this session was last confirmed alive in tmux. */
  lastSeen: number;
  /**
   * `#{pane_pid}` as tmux reported it at create (Phase 12.7 F2). Main-process
   * only — the renderer never shows a pid; this exists so a death can be
   * correlated against `ps`/log history after the pane is gone.
   */
  panePid?: number;
  /**
   * SpecStory capture (Phase 15), present only on sessions created with the
   * capture toggle ON.
   *
   * THIS IS WHAT MAKES A RESTORED SESSION KEEP CAPTURING. `argv` and
   * `resumeArgv` are stored in their WRAPPED form — they are what gmux spawns
   * and what restore types into the pane — and this record carries the two
   * things that cannot be recovered from them: the unwrapped agent argv
   * (`agentArgv`, because re-splitting the `-c` string is the lossy
   * direction) and the exact binary the session launched with, so a `brew
   * upgrade` mid-session cannot change what an armed resume means.
   */
  specstory?: SpecstoryCaptureRecord;
}

/** Fields a caller may patch after creation. */
export type ManifestSessionPatch = Partial<
  Omit<ManifestSessionRecord, 'id' | 'createdAt'>
>;

/**
 * One live tmux session as reconcile sees it. `gmuxId` is the identity
 * (`@gmux-id`, or the `GMUX_SESSION_ID` pane-env stamp when the option is
 * missing); `tmuxId` is the immutable `$-id` the caller will address it by.
 * Names appear here for reporting only — reconcile never claims a row by
 * one (research 21 §6: a name is mutable and reusable, so name-binding let
 * gmux adopt — and then kill — a session it never created).
 */
export interface LiveTmuxSession {
  tmuxId: string;
  tmuxName: string;
  gmuxId?: string;
}

/**
 * Why reconcile refused to judge a row this pass. All three mean the same
 * thing: the `live` snapshot is OLDER than the row's own evidence, so its
 * silence about the row proves nothing.
 */
export type ReconcileSkipReason =
  /** Row inserted after the snapshot was taken (a create in progress). */
  | 'created-after-snapshot'
  /** Caller says this row's tmux side is being created right now. */
  | 'in-flight'
  /** Something proved the row live after the snapshot (restore, activity). */
  | 'touched-after-snapshot';

/** A row reconcile deliberately left alone, with the reason it did. */
export interface ReconcileSkip {
  record: ManifestSessionRecord;
  reason: ReconcileSkipReason;
}

/**
 * What the caller knows about the snapshot it is handing in.
 *
 * reconcile() is the function that decides a session is unreachable, so it
 * must not act on rows the snapshot could not possibly have seen (Phase
 * 16.5.1): the caller takes the tmux list, then awaits identity probes for
 * every foreign session on the socket — dozens of execs — and a session
 * created during those awaits is absent from the list purely because the
 * list predates it.
 */
export interface ReconcileOptions {
  /**
   * `Date.now()` from immediately BEFORE the list-sessions exec that produced
   * `live`. Omitted (tests, migration smoke) = no exemption, old behaviour.
   */
  snapshotAt?: number;
  /**
   * Session ids whose tmux side is mid-create or mid-restore. Needed on top
   * of `snapshotAt` because the manifest row is written BEFORE the process
   * exists (§2.4 Step 0): a row inserted just before the snapshot can have
   * its tmux session appear just after it.
   */
  inFlightIds?: ReadonlySet<string>;
}

/** Result of reconciling the manifest against live tmux sessions. */
export interface ReconcileResult {
  /** Manifest rows with a live tmux session (lastSeen refreshed). */
  alive: ManifestSessionRecord[];
  /**
   * Rows whose tmux session is gone and were marked (or already were)
   * 'restorable' — the post-reboot / post-T2 restore candidates.
   */
  restorable: ManifestSessionRecord[];
  /**
   * Rows already 'exited' and still absent from tmux — left untouched
   * (exited sessions do not re-enter the restore path; §2.4 Step 3).
   */
  exited: ManifestSessionRecord[];
  /**
   * Live tmux sessions with no manifest row (created by hand on the private
   * socket, or belonging to another gmux install). IGNORED — gmux touches
   * nothing it cannot prove it owns.
   */
  unknownTmuxNames: string[];
  /**
   * Rows the snapshot could not have seen, left EXACTLY as they were — no
   * status write, no binding, no claim. The caller keeps whatever binding it
   * already recorded for a row skipped for a creation reason.
   */
  skipped: ReconcileSkip[];
  /**
   * manifest session id → live tmux `$-id`, for every row claimed above.
   * The caller's `liveIds` map is this, verbatim: one matching algorithm,
   * in one place (growth guardrail — it used to be re-derived by name).
   */
  bindings: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Row shapes (snake_case DB side)
// ---------------------------------------------------------------------------

interface SessionRow {
  id: string;
  name: string;
  tmux_name: string;
  project_path: string;
  cwd: string;
  agent: string;
  agent_session_id: string | null;
  argv: string;
  resume_argv: string | null;
  env: string | null;
  status: string;
  created_at: number;
  last_seen: number;
  /** Exit status of the session's process, when known (migration 002). */
  exit_code: number | null;
  /** Signal that killed it, e.g. "term" (migration 003). */
  exit_signal: string | null;
  /** `#{pane_pid}` captured at create (migration 003). */
  pane_pid: number | null;
  /** Resume-capture state (migration 004, Phase 13.5). */
  resume_capture: string | null;
  /** SpecStory capture record as JSON (migration 005, Phase 15). */
  specstory: string | null;
  /** What the last restore achieved, as JSON (migration 006, Phase 19). */
  restore: string | null;
}

interface ProjectRow {
  id: string;
  path: string;
  name: string;
}

/** One row of `restore_attempts` (migration 007, Phase 19 item 7). */
interface RestoreAttemptRow {
  id: number;
  session_id: string;
  started_at: number;
  tmux_id: string | null;
  outcome: string | null;
  finished_at: number | null;
}

/**
 * One recorded restore attempt.
 *
 * `outcome === null` means the attempt never finished, which is the only
 * signal the journal exists to produce. `tmuxId === null` on such a row means
 * no tmux session was recorded, which is NOT the same as "no tmux session
 * exists": the app can stop between `new-session` returning and the id being
 * written. Only tmux can settle that, so the resolution asks it.
 */
export interface RestoreAttemptRecord {
  id: number;
  sessionId: string;
  startedAt: number;
  tmuxId: string | null;
  outcome: RestoreResultKind | null;
  finishedAt: number | null;
}

function toRestoreAttempt(row: RestoreAttemptRow): RestoreAttemptRecord {
  const outcome =
    row.outcome !== null &&
    (RESTORE_KINDS as readonly string[]).includes(row.outcome)
      ? (row.outcome as RestoreResultKind)
      : null;
  return {
    id: row.id,
    sessionId: row.session_id,
    startedAt: row.started_at,
    tmuxId: row.tmux_id,
    outcome,
    finishedAt: row.finished_at
  };
}

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
// Serialization helpers
// ---------------------------------------------------------------------------

/**
 * The parse whitelists are the SAME lists the types are derived from
 * (`SESSION_STATUSES`, `RESUME_CAPTURES` in shared/types.ts), imported rather
 * than copied. They used to be two local copies typed `readonly Session-
 * Status[]` and `readonly ResumeCapture[]`, and that type accepts a SHORTER
 * array: adding a member to either union and forgetting the copy here compiled
 * cleanly, and every row carrying the new member then degraded silently on
 * read (research 34 §3.5). One list, one place, and a missing member is now a
 * compile error at the declaration instead.
 */
function asStatus(s: string): SessionStatus {
  if ((SESSION_STATUSES as readonly string[]).includes(s)) {
    return s as SessionStatus;
  }
  // A row written by a future schema shouldn't crash the app; degrade to
  // the safest interpretation ("we only know it from the manifest").
  //
  // A LATER PHASE ADDING A MEMBER MUST CHECK THIS LINE. `restorable` is safe
  // for every member that exists today, because every one of them is either
  // live (and reconcile will see it live) or a restore candidate. It would NOT
  // be safe for a member that means "do not act on this row", so a member of
  // that kind needs its own answer here, not this default.
  return 'restorable';
}

/**
 * A row written before migration 004 has no capture state. It is left
 * UNDEFINED rather than guessed: the renderer already knows how to read
 * `resumeArgv`, and inventing 'unavailable' here would tell a user their
 * armed claude session will come back as a folder.
 */
function asResumeCapture(s: string | null): ResumeCapture | undefined {
  if (s === null) return undefined;
  return (RESUME_CAPTURES as readonly string[]).includes(s)
    ? (s as ResumeCapture)
    : undefined;
}

function parseJsonArray(text: string | null): string[] | undefined {
  if (text === null) return undefined;
  try {
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) ? v.map(String) : undefined;
  } catch {
    return undefined;
  }
}

function parseJsonObject(
  text: string | null
): Record<string, string> | undefined {
  if (text === null) return undefined;
  try {
    const v: unknown = JSON.parse(text);
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        out[k] = String(val);
      }
      return out;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse the `specstory` column. Every field is checked because this row can
 * be years old by the time a restore reads it, and a half-parsed capture
 * record would compose a launch argv naming a binary that is not there.
 * Anything that fails validation is dropped whole: the session then restores
 * UNCAPTURED, which is a visible, honest degradation.
 */
function parseSpecstory(text: string | null): SpecstoryCaptureRecord | undefined {
  if (text === null) return undefined;
  try {
    const v: unknown = JSON.parse(text);
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return undefined;
    const o = v as Record<string, unknown>;
    const bin = o['bin'];
    const provider = o['provider'];
    const agentArgv = o['agentArgv'];
    if (typeof bin !== 'string' || bin.length === 0) return undefined;
    if (typeof provider !== 'string' || provider.length === 0) return undefined;
    if (!Array.isArray(agentArgv) || agentArgv.length === 0) return undefined;
    const version = o['binVersion'];
    return {
      enabled: o['enabled'] === true,
      bin,
      binVersion: typeof version === 'string' ? version : null,
      provider: provider as SpecstoryCaptureRecord['provider'],
      exitCodeFidelity: o['exitCodeFidelity'] === 'collapsed' ? 'collapsed' : 'exact',
      agentArgv: agentArgv.map(String),
      // Local-only capture is a property OF THE SESSION, not of today's
      // environment: a session created under the no-cloud opt-out must come
      // back without one, rather than gaining an upload at restore.
      ...(o['noCloud'] === true ? { noCloud: true } : {})
    };
  } catch {
    return undefined;
  }
}

/** The five kinds, as the parse whitelist. Derived from the type, not copied. */
const RESTORE_KINDS: readonly RestoreResultKind[] = [
  'failed',
  'interrupted',
  'shell_only',
  'transcript',
  'armed'
];

const RESTORE_STAGES: readonly RestoreStage[] = [
  'preflight',
  'create',
  'replay',
  'arm'
];

/**
 * Parse the `restore` column (Phase 19 item 6).
 *
 * An unreadable value is dropped whole and the session reads as one that has
 * never been restored. That is the safe direction: the alternative is half a
 * record, and a half-read record could claim a conversation came back when
 * nothing did.
 */
function parseRestore(text: string | null): SessionRestore | undefined {
  if (text === null) return undefined;
  try {
    const v: unknown = JSON.parse(text);
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return undefined;
    const o = v as Record<string, unknown>;
    const kind = o['kind'];
    const at = o['at'];
    if (typeof kind !== 'string') return undefined;
    if (!(RESTORE_KINDS as readonly string[]).includes(kind)) return undefined;
    if (typeof at !== 'number' || !Number.isFinite(at)) return undefined;
    const stage = o['stage'];
    const reason = o['reason'];
    const replayFailure = o['replayFailure'];
    const armFailure = o['armFailure'];
    return {
      kind: kind as RestoreResultKind,
      at,
      ...(typeof stage === 'string' &&
      (RESTORE_STAGES as readonly string[]).includes(stage)
        ? { stage: stage as RestoreStage }
        : {}),
      ...(typeof reason === 'string' ? { reason } : {}),
      ...(typeof replayFailure === 'string' ? { replayFailure } : {}),
      ...(typeof armFailure === 'string' ? { armFailure } : {})
    };
  } catch {
    return undefined;
  }
}

function rowToRecord(row: SessionRow): ManifestSessionRecord {
  const record: ManifestSessionRecord = {
    id: row.id,
    name: row.name,
    tmuxName: row.tmux_name,
    projectPath: row.project_path,
    cwd: row.cwd,
    agent: row.agent as Session['agent'],
    status: asStatus(row.status),
    createdAt: row.created_at,
    argv: parseJsonArray(row.argv) ?? [],
    lastSeen: row.last_seen
  };
  if (row.agent_session_id !== null) record.agentSessionId = row.agent_session_id;
  const resume = parseJsonArray(row.resume_argv);
  if (resume) record.resumeArgv = resume;
  const env = parseJsonObject(row.env);
  if (env) record.env = env;
  if (row.exit_code !== null && row.exit_code !== undefined) {
    record.exitCode = row.exit_code;
  }
  if (row.exit_signal !== null && row.exit_signal !== undefined) {
    record.exitSignal = row.exit_signal;
  }
  if (row.pane_pid !== null && row.pane_pid !== undefined) {
    record.panePid = row.pane_pid;
  }
  const capture = asResumeCapture(row.resume_capture);
  if (capture !== undefined) record.resumeCapture = capture;
  const specstory = parseSpecstory(row.specstory);
  if (specstory !== undefined) record.specstory = specstory;
  const restore = parseRestore(row.restore);
  if (restore !== undefined) record.restore = restore;
  return record;
}

/**
 * The renderer's view of capture. Only the facts the UI may act on travel:
 * the provider it runs under, which binary (Settings shows it), and the one
 * caveat that changes what the death report may claim.
 */
export function toSessionCapture(
  record: SpecstoryCaptureRecord
): SessionCapture {
  return {
    provider: record.provider,
    bin: record.bin,
    ...(record.binVersion !== null ? { binVersion: record.binVersion } : {}),
    exitCodeApproximate: record.exitCodeFidelity === 'collapsed'
  };
}

/** Strip main-process-only fields down to the shared Session projection. */
export function toSession(record: ManifestSessionRecord): Session {
  const session: Session = {
    id: record.id,
    name: record.name,
    tmuxName: record.tmuxName,
    projectPath: record.projectPath,
    cwd: record.cwd,
    agent: record.agent,
    status: record.status,
    createdAt: record.createdAt
  };
  if (record.agentSessionId !== undefined) {
    session.agentSessionId = record.agentSessionId;
  }
  if (record.resumeArgv !== undefined) session.resumeArgv = record.resumeArgv;
  if (record.resumeCapture !== undefined) {
    session.resumeCapture = record.resumeCapture;
  }
  if (record.exitCode !== undefined) session.exitCode = record.exitCode;
  if (record.exitSignal !== undefined) session.exitSignal = record.exitSignal;
  if (record.specstory?.enabled === true) {
    session.capture = toSessionCapture(record.specstory);
  }
  // Phase 19 item 6: the renderer has to be able to say "this came back
  // without its history", so the restore result travels with the projection
  // rather than staying a main-process fact.
  if (record.restore !== undefined) session.restore = record.restore;
  return session;
}

/**
 * Is this row NEWER than the snapshot that is about to be used against it?
 * (Phase 16.5.1 — see ReconcileOptions.) Returns the reason, or null when the
 * snapshot really is entitled to an opinion about the row.
 *
 * `lastSeen` counts as evidence because every writer of it — reconcile's own
 * alive branch, restoreSession, and the activity monitor's setStatus, which
 * only ever runs for a session bound to a live tmux id — writes it having
 * just seen the session alive.
 */
function skipReason(
  rec: ManifestSessionRecord,
  snapshotAt: number | undefined,
  inFlightIds: ReadonlySet<string> | undefined
): ReconcileSkipReason | null {
  if (inFlightIds?.has(rec.id) === true) return 'in-flight';
  if (snapshotAt === undefined) return null;
  // `>=`, not `>`: same-millisecond means the order cannot be proven, and the
  // safe answer is to leave a possibly-live session alone for one more pass.
  if (rec.createdAt >= snapshotAt) return 'created-after-snapshot';
  if (rec.lastSeen >= snapshotAt) return 'touched-after-snapshot';
  return null;
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

const MIGRATIONS: readonly SqliteMigration[] = [
  {
    name: '001-initial',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id               TEXT PRIMARY KEY,
          name             TEXT NOT NULL,
          tmux_name        TEXT NOT NULL,
          project_path     TEXT NOT NULL,
          cwd              TEXT NOT NULL,
          agent            TEXT NOT NULL,
          agent_session_id TEXT,
          argv             TEXT NOT NULL,
          resume_argv      TEXT,
          env              TEXT,
          status           TEXT NOT NULL DEFAULT 'running',
          created_at       INTEGER NOT NULL,
          last_seen        INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_project
          ON sessions(project_path);
        CREATE INDEX IF NOT EXISTS idx_sessions_tmux_name
          ON sessions(tmux_name);
        CREATE TABLE IF NOT EXISTS projects (
          id   TEXT PRIMARY KEY,
          path TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL
        );
      `);
    }
  },
  {
    // Phase 8 (§6.6 exit-code truth): the exit status of the session's
    // process, read from tmux's dead-pane status before the reap. NULL for
    // live sessions, user-killed sessions, and rows written before this
    // migration.
    name: '002-exit-code',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'exit_code', 'INTEGER');
    }
  },
  {
    // Phase 12.7 (research 21 §7): exit_code is WEXITSTATUS only — a process
    // that dies BY a signal reports an EMPTY #{pane_dead_status} and puts the
    // signal in #{pane_dead_signal}, so every non-self-mapping agent used to
    // vanish with no recorded cause at all. pane_pid rides along: captured at
    // create, it is what lets a post-mortem correlate against `ps` history.
    name: '003-death-forensics',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'exit_signal', 'TEXT');
      addColumnIfMissing(db, 'sessions', 'pane_pid', 'INTEGER');
    }
  },
  {
    // Phase 13.5 (research 22 §4): whether this session's CONVERSATION comes
    // back, not just its directory. Derivable from resumeArgv for the armed
    // case, but not for the other two the user needs to see: a harvest still
    // in flight, and a harvest that gave up. NULL for pre-existing rows.
    name: '004-resume-capture',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'resume_capture', 'TEXT');
    }
  },
  {
    // Phase 15 (research 13 §3.1): SpecStory capture, as JSON, on the sessions
    // that asked for it. NULL — the value every pre-existing row gets — is
    // "not captured", which is exactly what those sessions were.
    //
    // It is one column rather than four because the fields are meaningless
    // apart: a provider without the binary that has it, or a binary without
    // the unwrapped agent argv, cannot compose anything.
    name: '005-specstory-capture',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'specstory', 'TEXT');
    }
  },
  {
    // Phase 19 item 6: what the last restore of this session ACHIEVED. The
    // restore path computed whether the scrollback was replayed and whether
    // the resume was armed, then discarded both and wrote 'running', so a
    // restore whose two stages had failed read as a healthy session.
    //
    // One JSON column rather than three, for the same reason `specstory` is
    // one: the fields are meaningless apart. A failure string without the
    // kind it belongs to cannot be rendered, and a kind without its failure
    // strings cannot tell "this shell had no conversation" from "this
    // session's conversation could not be armed".
    //
    // NULL — what every pre-existing row gets — reads as "never restored",
    // which is what those rows are.
    name: '006-restore-outcome',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'restore', 'TEXT');
    }
  },
  {
    // Phase 19 item 7: the restore journal, in the manifest.
    //
    // WHY IT IS A TABLE IN THIS DATABASE AND NOT A FILE OF ITS OWN. A second
    // durability domain can disagree with the first, and detecting exactly
    // that disagreement is the reason the journal exists. If the journal is a
    // file, "the journal and the manifest disagree" has two possible causes,
    // being a real interrupted restore or a torn journal file, and no way to
    // tell them apart. In the same database the intent row and the row it is
    // about commit under the same transaction machinery, so a disagreement
    // means what it says.
    //
    // WHAT `outcome IS NULL` MEANS AT THE NEXT LAUNCH. Tortie stopped between
    // starting a restore and finishing it. `tmux_id` tells the next launch
    // whether a tmux session was created before it stopped. Neither field is
    // taken as proof on its own: the resolution asks tmux what is actually
    // there and compares. See restore/journal.ts.
    //
    // better-sqlite3 is synchronous, so the intent row is written before the
    // first side effect with no `await` between them and therefore no window.
    // An async journal would put that window back.
    name: '007-restore-attempts',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS restore_attempts (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT    NOT NULL,
          started_at INTEGER NOT NULL,
          -- Filled the instant tmux new-session returns. NULL means no
          -- session was created, or Tortie stopped before it could be
          -- recorded, and only tmux can say which.
          tmux_id     TEXT,
          -- NULL means the attempt never finished. Otherwise a
          -- RestoreResultKind.
          outcome     TEXT,
          finished_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_restore_attempts_open
          ON restore_attempts(outcome) WHERE outcome IS NULL;
      `);
    }
  }
];

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
 */
function reportManifestGate(report: IntegrityGateReport): void {
  reportDatabaseGate(report);
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
    // One read through the real query surface. A schema that migrates and then
    // cannot be selected from is still a manifest the app cannot use.
    db.prepare('SELECT COUNT(*) AS c FROM sessions').get();
  } finally {
    db.close();
  }
}

export class ManifestStore {
  private readonly db: Database.Database;

  /**
   * Opens (creating if needed) the manifest DB. Pass an explicit path for
   * tests; production callers use the default userData location.
   *
   * @throws Error with a JSON GmuxErrorPayload (code FS_FAILED) when the DB
   *         cannot be created/opened — surface as a friendly UI state.
   */
  constructor(dbPath: string = defaultManifestDbPath()) {
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
      runMigrations(this.db, MIGRATIONS);
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

  // -------------------------------------------------------------------------
  // Sessions — CRUD
  // -------------------------------------------------------------------------

  /** Insert a full record. Call BEFORE spawning the process (§2.4 Step 0). */
  insertSession(record: ManifestSessionRecord): ManifestSessionRecord {
    try {
      this.db
        .prepare(
          `INSERT INTO sessions
             (id, name, tmux_name, project_path, cwd, agent, agent_session_id,
              argv, resume_argv, env, status, created_at, last_seen, exit_code,
              exit_signal, pane_pid, resume_capture, specstory, restore)
           VALUES
             (@id, @name, @tmuxName, @projectPath, @cwd, @agent,
              @agentSessionId, @argv, @resumeArgv, @env, @status,
              @createdAt, @lastSeen, @exitCode, @exitSignal, @panePid,
              @resumeCapture, @specstory, @restore)`
        )
        .run({
          id: record.id,
          name: record.name,
          tmuxName: record.tmuxName,
          projectPath: record.projectPath,
          cwd: record.cwd,
          agent: record.agent,
          agentSessionId: record.agentSessionId ?? null,
          argv: JSON.stringify(record.argv),
          resumeArgv: record.resumeArgv
            ? JSON.stringify(record.resumeArgv)
            : null,
          env: record.env ? JSON.stringify(record.env) : null,
          status: record.status,
          createdAt: record.createdAt,
          lastSeen: record.lastSeen,
          exitCode: record.exitCode ?? null,
          exitSignal: record.exitSignal ?? null,
          panePid: record.panePid ?? null,
          resumeCapture: record.resumeCapture ?? null,
          specstory: record.specstory ? JSON.stringify(record.specstory) : null,
          restore: record.restore ? JSON.stringify(record.restore) : null
        });
    } catch (err) {
      throw manifestError(
        'INVALID_INPUT',
        `Could not record session "${record.name}" in the manifest`,
        (err as Error).message
      );
    }
    return record;
  }

  getSession(id: string): ManifestSessionRecord | undefined {
    const row = this.db
      .prepare<[string], SessionRow>('SELECT * FROM sessions WHERE id = ?')
      .get(id);
    return row ? rowToRecord(row) : undefined;
  }

  listSessions(): ManifestSessionRecord[] {
    return this.db
      .prepare<[], SessionRow>('SELECT * FROM sessions ORDER BY created_at ASC')
      .all()
      .map(rowToRecord);
  }

  /**
   * Patch any mutable fields of a session row.
   * @throws SESSION_NOT_FOUND when the id has no row.
   */
  updateSession(id: string, patch: ManifestSessionPatch): ManifestSessionRecord {
    const existing = this.getSession(id);
    if (!existing) {
      throw manifestError(
        'SESSION_NOT_FOUND',
        `No manifest row for session ${id}`
      );
    }
    const merged: ManifestSessionRecord = { ...existing };
    if (patch.name !== undefined) merged.name = patch.name;
    if (patch.tmuxName !== undefined) merged.tmuxName = patch.tmuxName;
    if (patch.projectPath !== undefined) merged.projectPath = patch.projectPath;
    if (patch.cwd !== undefined) merged.cwd = patch.cwd;
    if (patch.agent !== undefined) merged.agent = patch.agent;
    if (patch.agentSessionId !== undefined) {
      merged.agentSessionId = patch.agentSessionId;
    }
    if (patch.argv !== undefined) merged.argv = patch.argv;
    if (patch.resumeArgv !== undefined) merged.resumeArgv = patch.resumeArgv;
    if (patch.env !== undefined) merged.env = patch.env;
    if (patch.status !== undefined) merged.status = patch.status;
    if (patch.lastSeen !== undefined) merged.lastSeen = patch.lastSeen;
    if (patch.exitCode !== undefined) merged.exitCode = patch.exitCode;
    if (patch.exitSignal !== undefined) merged.exitSignal = patch.exitSignal;
    if (patch.panePid !== undefined) merged.panePid = patch.panePid;
    if (patch.resumeCapture !== undefined) {
      merged.resumeCapture = patch.resumeCapture;
    }
    if (patch.specstory !== undefined) merged.specstory = patch.specstory;
    if (patch.restore !== undefined) merged.restore = patch.restore;

    this.db
      .prepare(
        `UPDATE sessions SET
           name = @name, tmux_name = @tmuxName, project_path = @projectPath,
           cwd = @cwd, agent = @agent, agent_session_id = @agentSessionId,
           argv = @argv, resume_argv = @resumeArgv, env = @env,
           status = @status, last_seen = @lastSeen, exit_code = @exitCode,
           exit_signal = @exitSignal, pane_pid = @panePid,
           resume_capture = @resumeCapture, specstory = @specstory,
           restore = @restore
         WHERE id = @id`
      )
      .run({
        id: merged.id,
        name: merged.name,
        tmuxName: merged.tmuxName,
        projectPath: merged.projectPath,
        cwd: merged.cwd,
        agent: merged.agent,
        agentSessionId: merged.agentSessionId ?? null,
        argv: JSON.stringify(merged.argv),
        resumeArgv: merged.resumeArgv ? JSON.stringify(merged.resumeArgv) : null,
        env: merged.env ? JSON.stringify(merged.env) : null,
        status: merged.status,
        lastSeen: merged.lastSeen,
        exitCode: merged.exitCode ?? null,
        exitSignal: merged.exitSignal ?? null,
        panePid: merged.panePid ?? null,
        resumeCapture: merged.resumeCapture ?? null,
        specstory: merged.specstory ? JSON.stringify(merged.specstory) : null,
        restore: merged.restore ? JSON.stringify(merged.restore) : null
      });
    return merged;
  }

  /** Rename (display + sanitized tmux name) — F2 flow and %session-renamed. */
  renameSession(
    id: string,
    name: string,
    tmuxName: string
  ): ManifestSessionRecord {
    return this.updateSession(id, { name, tmuxName });
  }

  setStatus(id: string, status: SessionStatus): ManifestSessionRecord {
    return this.updateSession(id, { status, lastSeen: Date.now() });
  }

  /**
   * Record a harvested agent conversation id together with the resume argv
   * it enables. Arming the argv and flipping the capture state are ONE write:
   * a row that has an id but still reads 'capturing' would leave the user's
   * indicator spinning forever over a session that is in fact resumable.
   */
  setAgentSessionId(
    id: string,
    agentSessionId: string,
    resumeArgv: string[]
  ): ManifestSessionRecord {
    return this.updateSession(id, {
      agentSessionId,
      resumeArgv,
      resumeCapture: resumeArgv.length > 0 ? 'armed' : 'unavailable'
    });
  }

  /**
   * A harvest that ended without an id. NOT a silent no-op: 'capturing' is a
   * promise to the user, and a promise that cannot be kept has to be
   * withdrawn where they can see it (research 22 §4.1 point 2).
   */
  setResumeCapture(id: string, state: ResumeCapture): ManifestSessionRecord {
    return this.updateSession(id, { resumeCapture: state });
  }

  /**
   * Hard-delete a row. Prefer setStatus(id,'exited') for normal ends —
   * delete only when the user explicitly discards a restorable session.
   */
  deleteSession(id: string): void {
    this.db.prepare<[string]>('DELETE FROM sessions WHERE id = ?').run(id);
  }

  /**
   * Record what the last restore of this session achieved, and the liveness
   * status that follows from it, as ONE write (Phase 19 item 6).
   *
   * They are one write because they are one fact seen from two sides. A row
   * that says `running` with no restore record next to it is the defect this
   * item exists to fix, and a row that carries a `failed` restore record while
   * its status says `running` would be the same defect wearing the fix.
   */
  setRestoreResult(
    id: string,
    restore: SessionRestore,
    status: SessionStatus
  ): ManifestSessionRecord {
    return this.updateSession(id, { restore, status, lastSeen: Date.now() });
  }

  // -------------------------------------------------------------------------
  // The restore journal (Phase 19 item 7)
  //
  // Three writes per restore, and all three are durable commits: the intent
  // before anything is created, the tmux id the instant the session exists,
  // and the resolution. Durable here means `synchronous=FULL` plus
  // `fullfsync=1` for that commit only, measured at 4.24 ms against 0.011 ms
  // for an ordinary one (research 34 §1.1). A restore already costs hundreds
  // of milliseconds in tmux, and these three rows are the only record of it
  // that a machine which loses power mid-restore will have.
  // -------------------------------------------------------------------------

  /**
   * Write the intent to restore `sessionId`, BEFORE any side effect, and
   * return the attempt id.
   *
   * Synchronous by construction. better-sqlite3 does not await, so there is no
   * window between this row committing and the caller taking its first action.
   */
  beginRestoreAttempt(sessionId: string, at: number = Date.now()): number {
    return durableTransaction(this.db, () => {
      const info = this.db
        .prepare<[string, number]>(
          'INSERT INTO restore_attempts (session_id, started_at) VALUES (?, ?)'
        )
        .run(sessionId, at);
      return Number(info.lastInsertRowid);
    });
  }

  /**
   * Record the tmux session id the instant `new-session` returns.
   *
   * This is the row that tells the next launch a process may exist. It is
   * written as its own durable commit rather than being folded into the
   * resolution, because the gap it covers is precisely the one where Tortie
   * dies holding a session it has no record of creating.
   */
  noteRestoreTmuxId(attemptId: number, tmuxId: string): void {
    durableTransaction(this.db, () => {
      this.db
        .prepare<[string, number]>(
          'UPDATE restore_attempts SET tmux_id = ? WHERE id = ?'
        )
        .run(tmuxId, attemptId);
    });
  }

  /** Close an attempt with what it achieved. */
  finishRestoreAttempt(
    attemptId: number,
    outcome: RestoreResultKind,
    at: number = Date.now()
  ): void {
    durableTransaction(this.db, () => {
      this.db
        .prepare<[string, number, number]>(
          'UPDATE restore_attempts SET outcome = ?, finished_at = ? WHERE id = ?'
        )
        .run(outcome, at, attemptId);
    });
  }

  /**
   * Every attempt that never finished. `outcome IS NULL` is the whole signal:
   * Tortie stopped between starting a restore and finishing it.
   */
  listUnfinishedRestoreAttempts(): RestoreAttemptRecord[] {
    return this.db
      .prepare<[], RestoreAttemptRow>(
        `SELECT * FROM restore_attempts WHERE outcome IS NULL
         ORDER BY started_at ASC`
      )
      .all()
      .map(toRestoreAttempt);
  }

  /** One attempt by id. Reading a row back is what the tests assert on. */
  getRestoreAttempt(attemptId: number): RestoreAttemptRecord | undefined {
    const row = this.db
      .prepare<[number], RestoreAttemptRow>(
        'SELECT * FROM restore_attempts WHERE id = ?'
      )
      .get(attemptId);
    return row ? toRestoreAttempt(row) : undefined;
  }

  /**
   * Drop finished attempts beyond the newest `keep`, and every attempt whose
   * session no longer has a row.
   *
   * Called on open. Without it the table grows for the life of the install,
   * and a journal that costs disk forever to answer one question at launch is
   * not worth having. Unfinished attempts are never pruned here, because the
   * next launch has not yet had its chance to act on them.
   */
  pruneRestoreAttempts(keep = 200): void {
    immediateTransaction(this.db, () => {
      this.db.exec(
        `DELETE FROM restore_attempts
          WHERE session_id NOT IN (SELECT id FROM sessions)
            AND outcome IS NOT NULL`
      );
      this.db
        .prepare<[number]>(
          `DELETE FROM restore_attempts
            WHERE outcome IS NOT NULL
              AND id NOT IN (
                SELECT id FROM restore_attempts
                 WHERE outcome IS NOT NULL
                 ORDER BY id DESC LIMIT ?
              )`
        )
        .run(keep);
    });
  }

  // -------------------------------------------------------------------------
  // Reconcile — manifest vs live tmux (startup, %exit, %sessions-changed)
  // -------------------------------------------------------------------------

  /**
   * Compare the manifest against the tmux-side truth on the private socket.
   *
   * IDENTITY, NOT NAMES (Phase 12.7 F1, research 21 §6). A row is claimed by
   * `@gmux-id`/`GMUX_SESSION_ID` — the id gmux stamped on the session when it
   * created it — and by nothing else. The old name matching adopted any live
   * session that happened to hold a row's name, which is how gmux could end
   * up killing a session it never created (reproduced: a foreign session took
   * a freed name, was adopted, and died in place of the real one).
   *
   * - Rows whose session is alive: lastSeen refreshed, tmux_name re-synced
   *   (tmux is truth for names — an external rename no longer disowns the
   *   row), and 'restorable'/'exited' flip back to 'running'.
   * - Non-exited rows with no live session: marked 'restorable'. NOT killed,
   *   not adopted from anything else.
   * - 'exited' rows missing from tmux: left untouched.
   * - Live sessions with no matching row: reported and otherwise ignored.
   * - Rows NEWER than the snapshot (`options`): skipped, not judged. See
   *   ReconcileOptions — the caller's list is taken before a long identity
   *   pass, so a session created during that pass is missing from it for a
   *   reason that has nothing to do with being unreachable. Marking it
   *   'restorable' made a just-created session refuse to attach
   *   (SESSION_NOT_FOUND / "status: restorable", 3 of 5 smoke runs on a
   *   socket with 44 foreign sessions).
   *
   * Runs in a single IMMEDIATE transaction; synchronous. Immediate because it
   * reads (`listSessions`) and then writes (`updateSession`): a deferred
   * transaction would take a read snapshot first and fail the write upgrade
   * with SQLITE_BUSY_SNAPSHOT if any other connection committed in between —
   * an error `busy_timeout` does not retry (see db/sqlite.ts). That surfaced
   * as `[gmux] refresh failed: database is locked`, i.e. a manifest left
   * unreconciled with tmux.
   */
  reconcile(
    live: readonly LiveTmuxSession[],
    options: ReconcileOptions = {}
  ): ReconcileResult {
    const result: ReconcileResult = {
      alive: [],
      restorable: [],
      exited: [],
      unknownTmuxNames: [],
      skipped: [],
      bindings: new Map<string, string>()
    };
    const { snapshotAt, inFlightIds } = options;

    immediateTransaction(this.db, () => {
      const all = this.listSessions();
      // Tombstones are not claimable (Phase 19 item 6). Leaving them out of
      // the id map here, rather than only skipping them in the loop below, is
      // what makes a live session that carries a tombstone's identity get
      // REPORTED as an unknown session instead of quietly disappearing from
      // every bucket.
      const byId = new Map(
        all.filter((rec) => rec.status !== 'discarded').map((rec) => [rec.id, rec])
      );
      const now = Date.now();

      // One live session per row and one row per live session: a duplicate
      // id (two servers, one manifest) must not double-claim.
      const claimedRows = new Map<string, LiveTmuxSession>();
      for (const session of live) {
        const rec =
          session.gmuxId !== undefined ? byId.get(session.gmuxId) : undefined;
        if (rec === undefined || claimedRows.has(rec.id)) {
          result.unknownTmuxNames.push(session.tmuxName);
          continue;
        }
        claimedRows.set(rec.id, session);
      }

      for (const rec of all) {
        const session = claimedRows.get(rec.id);
        const skip = skipReason(rec, snapshotAt, inFlightIds);
        // A tombstone is terminal (Phase 19 item 6). The user removed this
        // session, and the row exists only so the removal can be undone. It
        // is never claimed, never revived by a live session that happens to
        // carry its identity, and never marked restorable. Nothing writes
        // 'discarded' yet; the guard is here so that a row written by a later
        // build cannot be resurrected by an older one.
        if (rec.status === 'discarded') continue;
        if (session !== undefined) {
          const needsStatusFlip =
            rec.status === 'restorable' ||
            rec.status === 'exited' ||
            // Seeing it alive is exactly the evidence 'unknown' was missing.
            rec.status === 'unknown';
          const updated = this.updateSession(rec.id, {
            lastSeen: now,
            ...(session.tmuxName !== rec.tmuxName
              ? { tmuxName: session.tmuxName }
              : {}),
            ...(needsStatusFlip ? { status: 'running' as const } : {})
          });
          result.alive.push(updated);
          result.bindings.set(rec.id, session.tmuxId);
        } else if (rec.status === 'exited') {
          result.exited.push(rec);
        } else if (skip !== null) {
          // Newer than the evidence against it — leave it exactly as it is.
          result.skipped.push({ record: rec, reason: skip });
        } else {
          const updated =
            rec.status === 'restorable'
              ? rec
              : this.updateSession(rec.id, { status: 'restorable' });
          result.restorable.push(updated);
        }
      }
    });

    return result;
  }

  // -------------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------------

  /** Insert or update by unique path (idempotent "add project"). */
  upsertProject(project: Project): Project {
    this.db
      .prepare(
        `INSERT INTO projects (id, path, name) VALUES (@id, @path, @name)
         ON CONFLICT(path) DO UPDATE SET name = excluded.name`
      )
      .run({ id: project.id, path: project.path, name: project.name });
    // Path conflicts keep the ORIGINAL row id — return the row as stored.
    const stored = this.getProjectByPath(project.path);
    return stored ?? project;
  }

  getProjectByPath(path: string): Project | undefined {
    const row = this.db
      .prepare<[string], ProjectRow>('SELECT * FROM projects WHERE path = ?')
      .get(path);
    return row ? { id: row.id, path: row.path, name: row.name } : undefined;
  }

  listProjects(): Project[] {
    return this.db
      .prepare<[], ProjectRow>('SELECT * FROM projects ORDER BY name ASC')
      .all()
      .map((row) => ({ id: row.id, path: row.path, name: row.name }));
  }

  /** Remove a project tab. Sessions rows keep their project_path history. */
  deleteProject(id: string): void {
    this.db.prepare<[string]>('DELETE FROM projects WHERE id = ?').run(id);
  }
}
