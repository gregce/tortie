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
  Session,
  SessionStatus
} from '@shared/types';

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
}

/** Fields a caller may patch after creation. */
export type ManifestSessionPatch = Partial<
  Omit<ManifestSessionRecord, 'id' | 'createdAt'>
>;

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
   * Live tmux session names with no manifest row (e.g. created by hand on
   * the private socket). gmux may adopt or ignore them — caller's call.
   */
  unknownTmuxNames: string[];
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
  return record;
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
              argv, resume_argv, env, status, created_at, last_seen)
           VALUES
             (@id, @name, @tmuxName, @projectPath, @cwd, @agent,
              @agentSessionId, @argv, @resumeArgv, @env, @status,
              @createdAt, @lastSeen)`
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
          lastSeen: record.lastSeen
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

  /**
   * Look up by sanitized tmux-side name. Prefers non-exited rows (an old
   * exited row may share a tmux name with a newer live session), then the
   * newest by creation time.
   */
  getSessionByTmuxName(tmuxName: string): ManifestSessionRecord | undefined {
    const row = this.db
      .prepare<[string], SessionRow>(
        `SELECT * FROM sessions WHERE tmux_name = ?
         ORDER BY (status = 'exited') ASC, created_at DESC LIMIT 1`
      )
      .get(tmuxName);
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

    this.db
      .prepare(
        `UPDATE sessions SET
           name = @name, tmux_name = @tmuxName, project_path = @projectPath,
           cwd = @cwd, agent = @agent, agent_session_id = @agentSessionId,
           argv = @argv, resume_argv = @resumeArgv, env = @env,
           status = @status, last_seen = @lastSeen
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
        lastSeen: merged.lastSeen
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
   * Record a harvested agent conversation id (e.g. a Codex rollout uuid)
   * together with the resume argv it enables.
   */
  setAgentSessionId(
    id: string,
    agentSessionId: string,
    resumeArgv: string[]
  ): ManifestSessionRecord {
    return this.updateSession(id, { agentSessionId, resumeArgv });
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
   * Compare the manifest against the tmux-side truth (list of live tmux
   * session names on the private socket).
   *
   * - Rows whose tmux session is alive: lastSeen refreshed; rows previously
   *   'restorable'/'exited' flip back to 'running' (they demonstrably exist;
   *   finer running/idle/needs_input state is the status detector's job).
   * - Non-exited rows missing from tmux: marked 'restorable'.
   * - 'exited' rows missing from tmux: left untouched.
   * - Live tmux names with no manifest row: reported for the caller.
   *
   * Runs in a single transaction; synchronous.
   */
  reconcile(tmuxSessionNames: readonly string[]): ReconcileResult {
    const liveNames = new Set(tmuxSessionNames);
    const result: ReconcileResult = {
      alive: [],
      restorable: [],
      exited: [],
      unknownTmuxNames: []
    };

    this.db.transaction(() => {
      const all = this.listSessions();
      const now = Date.now();

      // A tmux name can appear on several rows (old exited + current). Give
      // each live name to the best-matching row: non-exited first, then
      // newest. Every other non-exited row missing from tmux → restorable.
      const claimed = new Set<string>();
      const byPreference = [...all].sort((a, b) => {
        const aExited = a.status === 'exited' ? 1 : 0;
        const bExited = b.status === 'exited' ? 1 : 0;
        if (aExited !== bExited) return aExited - bExited;
        return b.createdAt - a.createdAt;
      });

      const aliveIds = new Set<string>();
      for (const rec of byPreference) {
        if (liveNames.has(rec.tmuxName) && !claimed.has(rec.tmuxName)) {
          claimed.add(rec.tmuxName);
          aliveIds.add(rec.id);
        }
      }

      for (const rec of all) {
        if (aliveIds.has(rec.id)) {
          const needsStatusFlip =
            rec.status === 'restorable' || rec.status === 'exited';
          const updated = this.updateSession(rec.id, {
            lastSeen: now,
            ...(needsStatusFlip ? { status: 'running' as const } : {})
          });
          result.alive.push(updated);
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

      for (const name of liveNames) {
        if (!claimed.has(name)) result.unknownTmuxNames.push(name);
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
