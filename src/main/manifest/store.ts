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
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  GmuxErrorPayload,
  Project,
  ResumeCapture,
  Session,
  SessionCapture,
  SessionStatus
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
}

interface ProjectRow {
  id: string;
  path: string;
  name: string;
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

const SESSION_STATUSES: readonly SessionStatus[] = [
  'running',
  'idle',
  'needs_input',
  'exited',
  'restorable'
];

function asStatus(s: string): SessionStatus {
  if ((SESSION_STATUSES as readonly string[]).includes(s)) {
    return s as SessionStatus;
  }
  // A row written by a future schema shouldn't crash the app; degrade to
  // the safest interpretation ("we only know it from the manifest").
  return 'restorable';
}

const RESUME_CAPTURES: readonly ResumeCapture[] = [
  'armed',
  'capturing',
  'unavailable',
  'none'
];

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
  return session;
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

interface Migration {
  name: string;
  up: (db: Database.Database) => void;
}

const MIGRATIONS: readonly Migration[] = [
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
      db.exec('ALTER TABLE sessions ADD COLUMN exit_code INTEGER;');
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
      db.exec(`
        ALTER TABLE sessions ADD COLUMN exit_signal TEXT;
        ALTER TABLE sessions ADD COLUMN pane_pid INTEGER;
      `);
    }
  },
  {
    // Phase 13.5 (research 22 §4): whether this session's CONVERSATION comes
    // back, not just its directory. Derivable from resumeArgv for the armed
    // case, but not for the other two the user needs to see: a harvest still
    // in flight, and a harvest that gave up. NULL for pre-existing rows.
    name: '004-resume-capture',
    up: (db) => {
      db.exec('ALTER TABLE sessions ADD COLUMN resume_capture TEXT;');
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
      db.exec('ALTER TABLE sessions ADD COLUMN specstory TEXT;');
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
      mkdirSync(dirname(dbPath), { recursive: true });
      this.db = new Database(dbPath);
      // WAL: crash-safe, and readers never block the (single) writer.
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.migrate();
    } catch (err) {
      throw manifestError(
        'FS_FAILED',
        `Could not open the session manifest at ${dbPath}`,
        (err as Error).message
      );
    }
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL
      );
    `);
    const applied = new Set(
      this.db
        .prepare<[], { name: string }>('SELECT name FROM migrations')
        .all()
        .map((r) => r.name)
    );
    const insert = this.db.prepare<[string, number]>(
      'INSERT INTO migrations (name, applied_at) VALUES (?, ?)'
    );
    for (const m of MIGRATIONS) {
      if (applied.has(m.name)) continue;
      this.db.transaction(() => {
        m.up(this.db);
        insert.run(m.name, Date.now());
      })();
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
              exit_signal, pane_pid, resume_capture, specstory)
           VALUES
             (@id, @name, @tmuxName, @projectPath, @cwd, @agent,
              @agentSessionId, @argv, @resumeArgv, @env, @status,
              @createdAt, @lastSeen, @exitCode, @exitSignal, @panePid,
              @resumeCapture, @specstory)`
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
          specstory: record.specstory ? JSON.stringify(record.specstory) : null
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

  listSessionsForProject(projectPath: string): ManifestSessionRecord[] {
    return this.db
      .prepare<[string], SessionRow>(
        'SELECT * FROM sessions WHERE project_path = ? ORDER BY created_at ASC'
      )
      .all(projectPath)
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

    this.db
      .prepare(
        `UPDATE sessions SET
           name = @name, tmux_name = @tmuxName, project_path = @projectPath,
           cwd = @cwd, agent = @agent, agent_session_id = @agentSessionId,
           argv = @argv, resume_argv = @resumeArgv, env = @env,
           status = @status, last_seen = @lastSeen, exit_code = @exitCode,
           exit_signal = @exitSignal, pane_pid = @panePid,
           resume_capture = @resumeCapture, specstory = @specstory
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
        specstory: merged.specstory ? JSON.stringify(merged.specstory) : null
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

  /** Heartbeat: refresh last_seen without touching anything else. */
  touchSession(id: string): void {
    this.db
      .prepare<[number, string]>(
        'UPDATE sessions SET last_seen = ? WHERE id = ?'
      )
      .run(Date.now(), id);
  }

  /**
   * Hard-delete a row. Prefer setStatus(id,'exited') for normal ends —
   * delete only when the user explicitly discards a restorable session.
   */
  deleteSession(id: string): void {
    this.db.prepare<[string]>('DELETE FROM sessions WHERE id = ?').run(id);
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
   *
   * Runs in a single transaction; synchronous.
   */
  reconcile(live: readonly LiveTmuxSession[]): ReconcileResult {
    const result: ReconcileResult = {
      alive: [],
      restorable: [],
      exited: [],
      unknownTmuxNames: [],
      bindings: new Map<string, string>()
    };

    this.db.transaction(() => {
      const all = this.listSessions();
      const byId = new Map(all.map((rec) => [rec.id, rec]));
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
        if (session !== undefined) {
          const needsStatusFlip =
            rec.status === 'restorable' || rec.status === 'exited';
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
        } else {
          const updated =
            rec.status === 'restorable'
              ? rec
              : this.updateSession(rec.id, { status: 'restorable' });
          result.restorable.push(updated);
        }
      }
    })();

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

  getProject(id: string): Project | undefined {
    const row = this.db
      .prepare<[string], ProjectRow>('SELECT * FROM projects WHERE id = ?')
      .get(id);
    return row ? { id: row.id, path: row.path, name: row.name } : undefined;
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
