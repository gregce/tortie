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
import { databaseFingerprint } from '../db/digest';
import {
  assertDatabaseUsableAt,
  describeSchemaState,
  readSchemaState,
  stampSchemaVersion,
  type SchemaIdentity,
  type SchemaStateOnDisk
} from '../db/schema-version';
import {
  parseAgentContract,
  parseResumeProvenance,
  serializeAgentContract,
  serializeResumeProvenance
} from './contract';
import {
  parseContextSnapshot,
  serializeContextSnapshot
} from './context-snapshot';
import type { AgentRecoveryContract, ResumeProvenance } from './agents';
import type { ContextSnapshot } from '@shared/context-snapshot';
import { postDurabilityNotice } from '../notice';
// Phase 26.3: presence-only probe (two statSync calls, no read, no hash) so
// the projection can tell the renderer whether an ended row has anything to
// restore. snapshots.ts is a leaf — it never imports the manifest — so this
// direction is cycle-free.
import { snapshotMaterialExists } from '../restore/snapshots';
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
  /**
   * The agent CLI version at launch, as the detection scan reported it
   * (Phase 21, research 30 §2.4 D1).
   *
   * UNDEFINED MEANS UNKNOWN, and that is the honest reading for two different
   * rows: one created before this column existed, and one whose agent has no
   * safe version probe. Neither may be reported as a version.
   *
   * The manifest already recorded the SpecStory WRAPPER's version, so that a
   * restore after a mid flight upgrade replays the same binary. It did not
   * record the agent's, and the agent's resume semantics are the half that
   * actually changes: five of nine installed agents drifted in the three days
   * research 30 measured.
   */
  agentVersion?: string;
  /**
   * What was true about the agent when this session was created (Phase 21,
   * research 33 §2.1 and §2.3). Written once, with the row, never rewritten.
   * Composed by `buildRecoveryContract` in ./agents.ts, which is the one place
   * where reading the live registry is the right thing to do.
   *
   * UNDEFINED MEANS NO CONTRACT WAS RECORDED. It is not a licence to ask the
   * live registry for the answer instead, and it is not `false`. For a pi
   * shaped agent the permissive answer opens an empty session that looks
   * resumed.
   */
  agentContract?: AgentRecoveryContract;
  /**
   * Where this row's conversation id came from and how strongly it was tied to
   * this pane (Phase 21, 28's G6). Written whenever the id is, which is at
   * create for a pre-assigned agent and seconds later for a harvested one.
   *
   * UNDEFINED MEANS NOTHING IS RECORDED. Read it through `provenanceOf` in
   * ./contract.ts, which names that case rather than handing back undefined.
   */
  resumeProvenance?: ResumeProvenance;
  /**
   * What this agent's configuration was at the moment the session launched
   * (Phase 22, research 29 §8.2). The skills, MCP servers, hooks, plugins and
   * instruction files that had resolved for this agent in this directory, each
   * with a content hash.
   *
   * ADVISORY, AND NOTHING DURABILITY-CRITICAL MAY READ IT. It exists so a user
   * can be told "that agent started before you wrote that skill" instead of
   * spending twenty minutes finding out. A missing one must never fail a
   * launch, block a restore or change a resume argument, and deleting one is
   * always safe.
   *
   * WRITTEN ONCE, AT LAUNCH. `recordLaunchContext` in
   * `src/main/context/snapshot.ts` is the only writer, and it is called from
   * exactly two places, being the session create path and the restore path. A
   * restore re-snapshots, because a restored session genuinely re-reads its
   * configuration and carrying the old record forward would be a lie with a
   * timestamp on it. Nothing else writes it, and no refresh in the panel does.
   *
   * UNDEFINED MEANS UNRECORDED, and the readout says so in its own sentence.
   * It is not an empty configuration.
   */
  contextSnapshot?: ContextSnapshot;
}

/**
 * Fields a caller may patch after creation.
 *
 * `removedAt` is EXCLUDED on purpose (Phase 29). The only writers of the
 * tombstone are `markSessionRemoved` and the clear inside `setRestoreResult`.
 * A general patch route would let some later caller tombstone a row by
 * accident, and a tombstone is a promise to the user that Remove was pressed.
 */
export type ManifestSessionPatch = Partial<
  Omit<ManifestSessionRecord, 'id' | 'createdAt' | 'removedAt'>
>;

/**
 * The one thing a patch cannot say (Phase 26.3). A patch merges field by
 * field and skips `undefined`, so no patch can REMOVE a value — and a
 * successful restore has to remove `exitCode` and `exitSignal`, because they
 * describe a death that a new live pane has just superseded. Without the
 * removal, a restored session that later dies quietly shows the stale code
 * from its earlier death, since the reaper only writes an exit cause when it
 * has one.
 */
export interface UpdateSessionOptions {
  /** Delete `exitCode` and `exitSignal` from the row after the patch merges. */
  clearExitCause?: boolean;
  /**
   * Delete `removedAt` from the row after the patch merges (Phase 29). The
   * patch shape cannot express the clear for the same reason it cannot
   * express the exit-cause clear: a merge skips `undefined`. Passed only by
   * `setRestoreResult` when a restore brought the session back, so the
   * tombstone leaves in the same durable commit that writes the live status.
   */
  clearRemovedAt?: boolean;
}

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
  /** Agent CLI version at launch (migration 008, Phase 21). */
  agent_version: string | null;
  /** The frozen recovery contract as JSON (migration 008, Phase 21). */
  agent_contract: string | null;
  /** Where the conversation id came from, as JSON (migration 008, Phase 21). */
  resume_provenance: string | null;
  /**
   * What the agent's configuration was at launch, as JSON (migration 009,
   * Phase 22). ADVISORY. Nothing on the restore path reads it.
   */
  context_snapshot: string | null;
  /**
   * Epoch ms of the user's Remove (migration 010, Phase 29). NULL on every
   * live row. Written only by markSessionRemoved; cleared only by the
   * restore's setRestoreResult.
   */
  removed_at: number | null;
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
  // Phase 21. All three are absent rather than defaulted when the column is
  // NULL, which is the state of every row written before migration 008. A
  // default here would be a guess about a session nobody observed.
  if (row.agent_version !== null && row.agent_version !== undefined) {
    record.agentVersion = row.agent_version;
  }
  const contract = parseAgentContract(row.agent_contract ?? null);
  if (contract !== undefined) record.agentContract = contract;
  const provenance = parseResumeProvenance(row.resume_provenance ?? null);
  if (provenance !== undefined) record.resumeProvenance = provenance;
  // Phase 22. Absent rather than defaulted, for the same reason the three
  // above are: an empty snapshot would tell the user this session loaded
  // nothing, and NULL means nobody looked.
  const context = parseContextSnapshot(row.context_snapshot ?? null);
  if (context !== undefined) record.contextSnapshot = context;
  // Phase 29. NULL means "never removed", which is the truth for every live
  // row and for every row written before migration 010.
  if (row.removed_at !== null && row.removed_at !== undefined) {
    record.removedAt = row.removed_at;
  }
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
  // Phase 26.3: an ended row may offer Restore only when material exists, and
  // whether a snapshot is on disk is a main-process fact the renderer cannot
  // stat for itself. Projected for 'exited' rows only — live rows have their
  // scrollback in tmux, and 'restorable' rows already offer Restore
  // unconditionally because that status MEANS "saved while unwatched".
  if (record.status === 'exited') {
    session.hasSavedScrollback = snapshotMaterialExists(record.id);
  }
  // Phase 29: the Past Sessions panel orders by this and renders it as
  // "removed Aug 12", so it travels with the projection.
  if (record.removedAt !== undefined) session.removedAt = record.removedAt;
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
  },
  {
    // Phase 21: what was TRUE about the agent when the session was created.
    //
    // WHAT IT FIXES. `restore/restore.ts` asked the LIVE REGISTRY whether an
    // agent's resume needs its original directory, and the `catch` under that
    // call answered `false` for any id the registry no longer launches. For a
    // pi shaped agent `false` is the worst possible wrong answer: the restore
    // opens a NEW EMPTY session under the recorded id, the pane looks resumed,
    // and the conversation is gone. The registry describes the software that
    // is installed right now. Restore is asking about the past.
    //
    // WHY THREE COLUMNS AND NOT ONE. They are written at different moments and
    // they answer different questions. `agent_contract` is written once, with
    // the row, before the process exists, and is never rewritten.
    // `resume_provenance` is written whenever the conversation id is, which is
    // at create for a pre-assigned agent and seconds later for a harvested
    // one. `agent_version` is a scalar because it is the field that gets asked
    // about on its own, by the drift check and by a support answer, and it is
    // deliberately not repeated inside the contract JSON.
    //
    // WHY IT CARRIES G6 AS WELL. Research 33 §2.1 requires it. Both halves are
    // "persist what the capture actually knew", both land on this table, and
    // two migrations on a manifest are two chances to be wrong. G7, spatial
    // state, is a third migration on this same table and is NOT here.
    //
    // WHAT AN EXISTING ROW GETS. NULL, in all three, and nothing is
    // backfilled. A row created before Tortie kept a contract has no contract,
    // and filling one in from today's registry would be the same guess this
    // migration exists to remove. Unknown is a real answer.
    //
    // BREAKING, NOT ADDITIVE, and the two words mean different things here.
    // The SQL shape is additive: three nullable columns, no table rebuild, no
    // rename, and research 27 §4.2 measured that an older build's INSERT keeps
    // working against exactly this shape. The COMPATIBILITY STATEMENT is
    // breaking, because research 27 §4.3 sets a stricter rule than SQLite's
    // tolerance: bump the minimum whenever a new column is REQUIRED for
    // correct restore, even where SQLite would let an old build write without
    // it. An older build creating sessions in this manifest would leave
    // `agent_contract` NULL and produce exactly the rows this phase exists to
    // stop producing. So MANIFEST_MIN_COMPATIBLE_VERSION moves with
    // MANIFEST_SCHEMA_VERSION. See ../db/schema-version.ts.
    name: '008-agent-recovery-contract',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'agent_version', 'TEXT');
      addColumnIfMissing(db, 'sessions', 'agent_contract', 'TEXT');
      addColumnIfMissing(db, 'sessions', 'resume_provenance', 'TEXT');
    }
  },
  {
    // Phase 22 (research 29 §8.2): what the agent's CONFIGURATION was when
    // this session launched. The skills, MCP servers, hooks, plugins and
    // instruction files that had resolved for this agent in this directory at
    // that moment, each with a content hash.
    //
    // WHAT IT ANSWERS. No agent records what context it loaded. Research 29
    // §8.1 read 443 `system` records across a 12 MB Claude Code session and
    // not one carries a manifest of it. Tortie owns the launch, so it is the
    // only thing on the machine that can know, and the question it lets a user
    // answer is "why did that agent not use the skill I just wrote".
    //
    // ADDITIVE, NOT BREAKING, and that is a decision rather than a default.
    // Migration 008 was breaking under the rule in research 27 §4.3, which
    // says to bump the minimum whenever a new column is REQUIRED for correct
    // restore. This column is required for nothing. It is advisory by design:
    // a missing snapshot must never fail a launch, block a restore or change a
    // resume argument, and no code on the restore path reads it. An older
    // build inserting a session into this manifest leaves `context_snapshot`
    // NULL, and NULL is not a wrong answer here, it is the true one. That
    // session really did launch without Tortie recording what it loaded, and
    // the readout has a sentence that says exactly that. So
    // MANIFEST_SCHEMA_VERSION moves to 9 and
    // MANIFEST_MIN_COMPATIBLE_VERSION stays at 8.
    //
    // The test of that claim is not the SQL shape, which was additive for 008
    // as well. It is whether an old build writing a NULL here produces a row
    // the new build reads WRONGLY. It does not: it produces a row the new
    // build reads as unrecorded, which is what it is.
    //
    // ONE COLUMN AND NOT A TABLE. Research 29 §12 puts it on the session row,
    // and pruning is the reason to keep it there. Rule 4 of §8.2 is that
    // deleting a snapshot is always safe, and a column is deleted with its
    // session by `deleteSession` with no second delete to write, no foreign
    // key to declare and no orphan to sweep. Its size is capped in
    // ./context-snapshot.ts, because an unbounded advisory blob inside a
    // durability-critical database is a hazard whatever its typical size.
    name: '009-context-snapshot',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'context_snapshot', 'TEXT');
    }
  },
  {
    // Phase 29 (research 39 section 9, first amendment): WHEN this row was
    // removed. `last_seen` means "last confirmed alive in tmux", so it cannot
    // order a removal list honestly: a row that sat ended for 5 days and was
    // then removed by accident would sort below rows removed 3 days earlier.
    // Written only by the tombstone write in markSessionRemoved. NULL on every
    // live row and on every row written before this migration, and NULL is the
    // true answer for both: the session was never removed.
    //
    // ADDITIVE, NOT BREAKING, by the rule in research 27 section 4.3. The test
    // is whether an old build writing NULL here produces a row the new build
    // reads WRONGLY. It cannot. No build older than this one writes
    // status = 'discarded' (the comment at the reconcile guard said "nothing
    // writes it yet" until today), so every discarded row is written by a
    // build that also stamps removed_at in the same statement. A row an old
    // build creates carries NULL, and the new build reads NULL as "never
    // removed", which is what that row is. So MANIFEST_SCHEMA_VERSION moves to
    // 10 and MANIFEST_MIN_COMPATIBLE_VERSION stays at 8.
    name: '010-removed-at',
    up: (db) => {
      addColumnIfMissing(db, 'sessions', 'removed_at', 'INTEGER');
    }
  }
];

/**
 * `PRAGMA application_id` for the manifest: the ASCII bytes of "TRTE".
 *
 * Set once and never changed. It is what lets `file`, a forensic tool, or
 * Tortie itself tell a manifest from some other SQLite database that happens
 * to be at the same path. A wrong file is then refused rather than migrated,
 * and a migration that adds Tortie's columns to somebody else's database is a
 * change nothing can undo.
 */
export const MANIFEST_APPLICATION_ID = 0x54525445;

/**
 * The schema version this build writes into `PRAGMA user_version`.
 *
 * It is the count of migrations, which is the same as the number on the last
 * one. Keep it that way: a number that has to be reasoned about is a number
 * that gets set wrong under time pressure.
 */
export const MANIFEST_SCHEMA_VERSION = 10;

/**
 * The oldest schema version whose code may still write this manifest.
 *
 * IT IS 8, WHICH IS TWO BEHIND THE SCHEMA VERSION, and the gap is the point.
 * Migration 008 is breaking by the rule in research 27 §4.3. A build at schema
 * 7 can open this file and can insert sessions into it, and every session it
 * inserted would carry a NULL `agent_contract`. Those rows restore by asking
 * the live registry, which is the defect Phase 21 removes, and for pi the
 * visible result is an empty session that looks resumed. SQLite would allow
 * that write. This number is what stops it.
 *
 * Migrations 009 and 010 are ADDITIVE by that same rule, so each moved
 * MANIFEST_SCHEMA_VERSION and left this number alone. `context_snapshot` is
 * advisory: nothing on the restore path reads it, and a build at schema 8
 * writing NULL into it produces a session with no record of what it loaded,
 * which is exactly what that session is. `removed_at` (Phase 29) cannot be
 * needed by a row an older build writes, because no older build writes
 * status 'discarded' at all. Reasoning is at migrations 009 and 010.
 *
 * The honest limit of leaving this at 8 across migration 010, stated so it is
 * checked rather than discovered: a build at schema 8 or 9 opened against
 * this manifest shows tombstoned rows in its session list, labeled "removed",
 * and its Remove verb hard deletes such a row. That is a degraded surface in
 * a build the user has moved off, not a misread, and the minimum exists to
 * stop misreads.
 *
 * The older limit still holds too: a build that shipped before the refusal
 * existed has no code to read this number, so it will still open the file.
 * The protection starts with the first build that carries it.
 */
export const MANIFEST_MIN_COMPATIBLE_VERSION = 8;

/** The three numbers, paired with the file they describe. */
export const MANIFEST_SCHEMA_IDENTITY: SchemaIdentity = {
  label: 'session list',
  applicationId: MANIFEST_APPLICATION_ID,
  version: MANIFEST_SCHEMA_VERSION,
  minCompatible: MANIFEST_MIN_COMPATIBLE_VERSION
};

// The migration count and MANIFEST_SCHEMA_VERSION are the same fact stated
// twice, so a migration added without moving the version has to fail here.
//
// It throws at module load rather than in a test, because the failure it
// prevents is a file that lies about which schema it is at, and a file that
// lies about that is a file the refusal cannot protect. MIGRATIONS is a static
// array in this file, so the only way to reach this line is a mistake made
// while editing it, and then every test and every launch stops at once with
// the sentence that says what to change.
if (MIGRATIONS.length !== MANIFEST_SCHEMA_VERSION) {
  throw new Error(
    `MANIFEST_SCHEMA_VERSION is ${String(MANIFEST_SCHEMA_VERSION)} and there ` +
      `are ${String(MIGRATIONS.length)} migrations. They are the same number. ` +
      'Set the version to the migration count, and decide whether the new ' +
      'migration is additive or breaking: additive leaves ' +
      'MANIFEST_MIN_COMPATIBLE_VERSION alone, breaking moves it too. See ' +
      '../db/schema-version.ts.'
  );
}

/**
 * Every migration name this build will apply, in order.
 *
 * Read by the pre-migration copy (./ring-schedule.ts), which opens the manifest
 * READ ONLY before the store is constructed and asks which of these the file has
 * no bookkeeping row for. It is derived from `MIGRATIONS` rather than written out
 * again, so a migration added above cannot be missed here.
 */
export const MANIFEST_MIGRATION_NAMES: readonly string[] = MIGRATIONS.map(
  (m) => m.name
);

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Phase 29: how long a removed session stays restorable. 90 days is the
 * research's own leaning (research 39 section 10). At the measured removal
 * rate of 12.5 rows per day the panel holds about 1125 rows at the cap, and
 * a year of removals would otherwise accumulate unbounded. No count cap is
 * added on top, because two overlapping rules answer "why did my row vanish"
 * two different ways.
 */
const DISCARDED_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

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
  // The durable commits (Phase 20 item 4)
  //
  // Five session writes commit at `synchronous=FULL` with `fullfsync=1`, and
  // every other write in this file stays at the connection's `NORMAL`. The
  // pragmas are raised around the one transaction and lowered again after it,
  // which costs nothing anywhere else on the connection (db/sqlite.ts
  // `durableTransaction`, and research 34 §1.1 for why both pragmas or
  // neither).
  //
  // WHAT THE PROMOTION BUYS, LITERALLY. At `NORMAL` in WAL mode a commit is in
  // the operating system's page cache. It survives the app being killed. It
  // does not survive power loss or a kernel panic, which can discard the last
  // run of commits. At `FULL` with `fullfsync=1` the commit is a
  // `F_FULLFSYNC`, which asks the drive to flush its own cache before the call
  // returns. Research 28 §G2 names the case this exists for: the declaration
  // row is written before the process is spawned, so a power loss that
  // discards it leaves a live agent with no manifest row, and Tortie correctly
  // refuses to adopt a session it has no record of. The process keeps running
  // and the app cannot reach it.
  //
  // MEASURED. Each figure is the median of 200 calls, and the table takes the
  // middle of three such runs. Both columns were measured in the same process
  // against the same on-disk manifest, with the "before" column running the
  // statement the unpromoted method ran, so the two columns differ only in the
  // pragmas. APFS on the internal NVMe disk, better-sqlite3 13.0.3.
  //
  // | Commit                 | Before   | After   | How often it runs            |
  // | ---------------------- | -------- | ------- | ---------------------------- |
  // | `insertSession`        | 0.036 ms | 4.16 ms | once per session created     |
  // | `setAgentSessionId`    | 0.046 ms | 4.83 ms | once per session, at harvest |
  // | `setRestoreResult`     | 0.056 ms | 4.87 ms | once per restore             |
  // | `recordRestoreOutcome` | 0.055 ms | 4.20 ms | once per restore             |
  // | `deleteSession`        | 0.021 ms | 4.27 ms | once per discard             |
  //
  // Read the "after" column as 4 ms to 5 ms rather than as an exact figure.
  // Across the three runs the per-commit median moved between 4.05 ms and
  // 5.00 ms and single calls ranged from 3.62 ms to 6.13 ms, because what is
  // being timed is a drive flush and not arithmetic. The `before` column is
  // stable to about a hundredth of a millisecond.
  //
  // The frequent writes were measured too and are DELIBERATELY LEFT ALONE. The
  // cost of a promotion is paid on every call, and what each of these loses is
  // recomputed at the next launch anyway.
  //
  // | Left at NORMAL  | Measured | Why it stays                                 |
  // | --------------- | -------- | -------------------------------------------- |
  // | `setStatus`     | 0.075 ms | The activity monitor calls it per verdict per session, and reconcile recomputes every status from tmux at each launch |
  // | `updateSession` | 0.064 ms | The general patch, and the one reconcile calls for every row inside a single transaction |
  // | `upsertProject` | 0.033 ms | A lost project row costs a tab, not a session. Session rows carry their own `project_path` |
  //
  // So each promoted commit adds about 4 ms to an operation that already costs
  // hundreds of milliseconds in tmux, or waits on the agent's own store, or
  // follows a click. None of them is on a path a person can perceive, and the
  // paths a person can perceive were not touched.
  // -------------------------------------------------------------------------

  /**
   * `updateSession`, committed durably. The read and the write are inside the
   * same `BEGIN IMMEDIATE` as well, which is the second reason to route these
   * through one helper: `updateSession` reads the row and then writes it, and
   * a deferred transaction would fail that upgrade under contention with
   * `SQLITE_BUSY_SNAPSHOT` (db/sqlite.ts).
   */
  private updateSessionDurably(
    id: string,
    patch: ManifestSessionPatch,
    opts: UpdateSessionOptions = {}
  ): ManifestSessionRecord {
    return durableTransaction(this.db, () =>
      this.updateSession(id, patch, opts)
    );
  }

  // -------------------------------------------------------------------------
  // Sessions — CRUD
  // -------------------------------------------------------------------------

  /**
   * Insert a full record. Call BEFORE spawning the process (§2.4 Step 0).
   *
   * A DURABLE COMMIT, and the one the whole promotion exists for. This row is
   * the only record that a session about to exist belongs to Tortie. The
   * process outlives the app by design, so a row that reaches the page cache
   * and not the drive strands a live agent on the next power loss.
   */
  insertSession(record: ManifestSessionRecord): ManifestSessionRecord {
    durableTransaction(this.db, () => {
      this.insertSessionRow(record);
    });
    return record;
  }

  /**
   * The statement and its error wrapping, split out so that both sit INSIDE
   * the transaction. `durableTransaction` refuses to nest, and that refusal is
   * a programming error rather than a bad record: wrapping it in the
   * `INVALID_INPUT` payload below would tell the user their session name was
   * rejected.
   */
  private insertSessionRow(record: ManifestSessionRecord): void {
    try {
      this.db
        .prepare(
          `INSERT INTO sessions
             (id, name, tmux_name, project_path, cwd, agent, agent_session_id,
              argv, resume_argv, env, status, created_at, last_seen, exit_code,
              exit_signal, pane_pid, resume_capture, specstory, restore,
              agent_version, agent_contract, resume_provenance,
              context_snapshot)
           VALUES
             (@id, @name, @tmuxName, @projectPath, @cwd, @agent,
              @agentSessionId, @argv, @resumeArgv, @env, @status,
              @createdAt, @lastSeen, @exitCode, @exitSignal, @panePid,
              @resumeCapture, @specstory, @restore,
              @agentVersion, @agentContract, @resumeProvenance,
              @contextSnapshot)`
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
          restore: record.restore ? JSON.stringify(record.restore) : null,
          agentVersion: record.agentVersion ?? null,
          agentContract: serializeAgentContract(record.agentContract),
          resumeProvenance: serializeResumeProvenance(record.resumeProvenance),
          // Normally NULL at insert. The snapshot is written a moment later,
          // by `recordLaunchContext`, off the create path, so that resolving
          // the configuration cannot delay or fail the launch it describes.
          contextSnapshot: serializeContextSnapshot(record.contextSnapshot)
        });
    } catch (err) {
      throw manifestError(
        'INVALID_INPUT',
        `Could not record session "${record.name}" in the manifest`,
        (err as Error).message
      );
    }
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
  updateSession(
    id: string,
    patch: ManifestSessionPatch,
    opts: UpdateSessionOptions = {}
  ): ManifestSessionRecord {
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
    if (patch.agentVersion !== undefined) {
      merged.agentVersion = patch.agentVersion;
    }
    // THE CONTRACT IS WRITE ONCE, and this is where that is enforced. It
    // records what was true when the session was created, so a later patch
    // that overwrote it would destroy the only evidence of what the session
    // actually launched under and leave a row claiming today's registry as its
    // own history. A row that somehow has none can still receive one, which is
    // what makes a repair possible without making a rewrite possible.
    if (patch.agentContract !== undefined && merged.agentContract === undefined) {
      merged.agentContract = patch.agentContract;
    }
    // The provenance is NOT write once. A harvest lands seconds after create
    // and a boot rescue can land launches later, and each of those is a
    // stronger statement than the one before it.
    if (patch.resumeProvenance !== undefined) {
      merged.resumeProvenance = patch.resumeProvenance;
    }
    // The snapshot is NOT write once, because a restore genuinely re-reads the
    // configuration and the record has to move with it (research 29 §8.2 rule
    // 3). What keeps it from drifting is that there is one writer,
    // `recordLaunchContext`, called from the create path and the restore path
    // and nowhere else. A patch that reaches here from any other caller is a
    // mistake in that caller rather than something this merge should second
    // guess, and refusing it here would break the restore case.
    if (patch.contextSnapshot !== undefined) {
      merged.contextSnapshot = patch.contextSnapshot;
    }
    // Phase 26.3: removal, which a patch cannot express. See
    // UpdateSessionOptions. Runs after the merge so a caller cannot both
    // clear and set in one call without the set losing, which is the only
    // order that cannot resurrect a stale death.
    if (opts.clearExitCause === true) {
      delete merged.exitCode;
      delete merged.exitSignal;
    }
    // Phase 29: the tombstone's clear, same mechanism. The patch shape cannot
    // SET removedAt (it is excluded from ManifestSessionPatch), so the merged
    // value below is always the row's own unless this option removes it.
    if (opts.clearRemovedAt === true) {
      delete merged.removedAt;
    }

    this.db
      .prepare(
        `UPDATE sessions SET
           name = @name, tmux_name = @tmuxName, project_path = @projectPath,
           cwd = @cwd, agent = @agent, agent_session_id = @agentSessionId,
           argv = @argv, resume_argv = @resumeArgv, env = @env,
           status = @status, last_seen = @lastSeen, exit_code = @exitCode,
           exit_signal = @exitSignal, pane_pid = @panePid,
           resume_capture = @resumeCapture, specstory = @specstory,
           restore = @restore, agent_version = @agentVersion,
           agent_contract = @agentContract,
           resume_provenance = @resumeProvenance,
           context_snapshot = @contextSnapshot,
           removed_at = @removedAt
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
        restore: merged.restore ? JSON.stringify(merged.restore) : null,
        agentVersion: merged.agentVersion ?? null,
        agentContract: serializeAgentContract(merged.agentContract),
        resumeProvenance: serializeResumeProvenance(merged.resumeProvenance),
        contextSnapshot: serializeContextSnapshot(merged.contextSnapshot),
        removedAt: merged.removedAt ?? null
      });
    return merged;
  }

  /**
   * Record what this session's configuration was at launch (Phase 22).
   *
   * NOT A DURABLE COMMIT, and that is the whole point of it. Every promoted
   * write in this file is promoted because losing it costs the user a session
   * or a conversation. Losing this one costs an explanation of a session that
   * is still running and still resumable, and the explanation can be missing
   * without anything being wrong. Paying 4 ms of drive flush per launch for a
   * value nothing depends on would be spending the durability budget on the
   * one row that does not need it. 0.064 ms, the ordinary `updateSession`
   * figure.
   *
   * It is deliberately the only method that writes the column, so that "one
   * writer, called from two places" is a fact about this file rather than a
   * convention someone has to remember. Its caller is
   * `recordLaunchContext` in `src/main/context/snapshot.ts`.
   *
   * @throws SESSION_NOT_FOUND when the row is gone, which a caller that
   * snapshots off the create path must catch. The session can be discarded
   * between the launch and the scan finishing, and a snapshot arriving for a
   * row that no longer exists is an ordinary outcome rather than an error the
   * user should ever hear about.
   */
  setContextSnapshot(
    id: string,
    snapshot: ContextSnapshot
  ): ManifestSessionRecord {
    return this.updateSession(id, { contextSnapshot: snapshot });
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
   *
   * A DURABLE COMMIT (Phase 20 item 4). The harvest that produced this id runs
   * once, in the first seconds of the session's life, by watching the agent's
   * own store for a file that appears exactly once. Nothing re-runs it later.
   * So a lost commit here is not a lost millisecond of bookkeeping, it is a
   * session that comes back as a folder instead of a conversation, and the
   * user cannot tell why. 0.046 ms before, 4.83 ms after.
   *
   * Phase 21 added `provenance` to the SAME write for the same reason the two
   * fields above share it. Where the id came from is a fact about that id, so
   * a commit that stored the id and lost its provenance would leave a row
   * saying `armed` with nothing to say how strongly, and G6 exists precisely
   * because "armed" was one word covering a proven correlation and a three
   * second guess. It is optional so that a caller with nothing to say writes
   * nothing rather than writing a placeholder.
   */
  setAgentSessionId(
    id: string,
    agentSessionId: string,
    resumeArgv: string[],
    provenance?: ResumeProvenance
  ): ManifestSessionRecord {
    return this.updateSessionDurably(id, {
      agentSessionId,
      resumeArgv,
      resumeCapture: resumeArgv.length > 0 ? 'armed' : 'unavailable',
      ...(provenance !== undefined ? { resumeProvenance: provenance } : {})
    });
  }

  /**
   * Withdraw a conversation id that another session has PROVEN is its own
   * (Phase 32, the antigravity claim race).
   *
   * A DURABLE COMMIT for the same reason `setAgentSessionId` is: losing this
   * write leaves a row armed to resume somebody else's conversation, which is
   * the exact failure the reclaim exists to correct. The id, the argv built
   * from it and the capture state move in ONE transaction, so no crash can
   * leave an argv armed for an id the row no longer carries.
   *
   * A dedicated statement rather than the `updateSession` patch path, because
   * the patch shape reads `undefined` as "no change" and cannot express
   * removal; `clearExitCause` is the standing precedent for that limitation.
   *
   * @param resumeCapture 'capturing' when the loser still has a live pane
   *                      and a re-armed watch, else 'unavailable'.
   * @param provenance    the correction record: the withdrawn guess's own
   *                      evidence plus `reclaimedBy`/`reclaimedAt`.
   */
  clearAgentSessionId(
    id: string,
    resumeCapture: ResumeCapture,
    provenance: ResumeProvenance
  ): ManifestSessionRecord {
    return durableTransaction(this.db, () => {
      const existing = this.getSession(id);
      if (!existing) {
        throw manifestError(
          'SESSION_NOT_FOUND',
          `No manifest row for session ${id}`
        );
      }
      this.db
        .prepare(
          `UPDATE sessions SET
             agent_session_id = NULL, resume_argv = NULL,
             resume_capture = @resumeCapture,
             resume_provenance = @resumeProvenance
           WHERE id = @id`
        )
        .run({
          id,
          resumeCapture,
          resumeProvenance: serializeResumeProvenance(provenance)
        });
      const merged: ManifestSessionRecord = { ...existing };
      delete merged.agentSessionId;
      delete merged.resumeArgv;
      merged.resumeCapture = resumeCapture;
      merged.resumeProvenance = provenance;
      return merged;
    });
  }

  /**
   * Record where a conversation id came from, on its own.
   *
   * For the callers that have provenance to store without an id to store with
   * it: a harvest that gave up, or a repair pass that learned something about
   * an id the row already had. Not a durable commit, for the same reason
   * `setResumeCapture` is not. Losing it loses a description of the id, not
   * the id, and the session is no worse off than it already was.
   */
  setResumeProvenance(
    id: string,
    provenance: ResumeProvenance
  ): ManifestSessionRecord {
    return this.updateSession(id, { resumeProvenance: provenance });
  }

  /**
   * A harvest that ended without an id. NOT a silent no-op: 'capturing' is a
   * promise to the user, and a promise that cannot be kept has to be
   * withdrawn where they can see it (research 22 §4.1 point 2).
   *
   * CONSIDERED FOR PROMOTION IN PHASE 20 AND LEFT AT NORMAL. Its sibling
   * `setAgentSessionId` was promoted because losing it loses a conversation.
   * Losing this one loses a withdrawal, so the row keeps saying 'capturing'
   * and the indicator keeps spinning over a session that will not resume. That
   * is a wrong label rather than lost work, and the session is no worse off
   * than it already was.
   */
  setResumeCapture(id: string, state: ResumeCapture): ManifestSessionRecord {
    return this.updateSession(id, { resumeCapture: state });
  }

  /**
   * Hard-delete a row. Prefer setStatus(id,'exited') for normal ends —
   * delete only when the user explicitly discards a restorable session.
   *
   * A DURABLE COMMIT (Phase 20 item 4), and the reason is ordering rather than
   * the row itself. The caller deletes the session's snapshot file and its
   * hook settings straight after this returns. Those deletes go to the file
   * system immediately, while a `NORMAL` commit can still be discarded by a
   * power loss, so the row can come back pointing at a scrollback that is
   * already gone. Committing the removal to the drive first means the two
   * sides can only be lost in the safe order. 0.021 ms before, 4.27 ms after.
   */
  deleteSession(id: string): void {
    durableTransaction(this.db, () => {
      this.db.prepare<[string]>('DELETE FROM sessions WHERE id = ?').run(id);
    });
  }

  /**
   * The reversible remove (Phase 29, research 39 section 10). Writes the
   * tombstone the status alphabet reserved in Phase 19: status 'discarded'
   * plus removed_at, in one statement.
   *
   * A DURABLE COMMIT for the same ordering reason deleteSession is one: the
   * caller deletes the snapshot generations and the hook settings file the
   * moment this returns, and a NORMAL commit could be discarded by power loss,
   * leaving a row that claims a screen which is already gone. Durable first
   * means the two sides can only be lost in the safe order.
   */
  markSessionRemoved(id: string, at: number = Date.now()): void {
    durableTransaction(this.db, () => {
      const info = this.db
        .prepare<[number, string]>(
          `UPDATE sessions SET status = 'discarded', removed_at = ?
            WHERE id = ?`
        )
        .run(at, id);
      if (info.changes === 0) {
        throw manifestError(
          'SESSION_NOT_FOUND',
          `No manifest row for session ${id}`
        );
      }
    });
  }

  /**
   * Hard delete discarded rows whose removal is older than the cap. Runs at
   * manifest open, before pruneRestoreAttempts so the attempts orphaned here
   * are swept in the same open. Goes through deleteSession so the durable
   * ordering promise holds for the prune too. There is no Delete Forever verb;
   * this is the only hygiene (research 39 section 9).
   *
   * A discarded row with NULL removed_at cannot be produced by this build. If
   * one exists anyway (a hand edited file), it is never pruned: the WHERE
   * clause requires a stamp older than the cutoff, and NULL is not one.
   */
  pruneDiscardedSessions(now: number = Date.now()): void {
    const cutoff = now - DISCARDED_RETENTION_MS;
    const ids = this.db
      .prepare<[number], { id: string }>(
        `SELECT id FROM sessions
          WHERE status = 'discarded'
            AND removed_at IS NOT NULL
            AND removed_at < ?`
      )
      .all(cutoff);
    for (const row of ids) this.deleteSession(row.id);
  }

  /**
   * Record what the last restore of this session achieved, and the liveness
   * status that follows from it, as ONE write (Phase 19 item 6).
   *
   * They are one write because they are one fact seen from two sides. A row
   * that says `running` with no restore record next to it is the defect this
   * item exists to fix, and a row that carries a `failed` restore record while
   * its status says `running` would be the same defect wearing the fix.
   *
   * `bind` carries the two things tmux only reports once the session exists,
   * so the whole transition is one commit rather than a durable one followed
   * by an ordinary one.
   *
   * A DURABLE COMMIT (Phase 20 item 4). It sits between two commits that Phase
   * 19 already made durable, the journal's intent row and its resolution, and
   * an ordinary commit between two durable ones is the weakest link of the
   * three. 0.056 ms before, 4.87 ms after, against a restore that costs
   * hundreds of milliseconds in tmux.
   *
   * WHEN THE SESSION CAME BACK, THE OLD DEATH IS ERASED (Phase 26.3). A
   * restored 'exited' row was carrying the exit code or signal of the process
   * that ended it, and a new live pane makes both stale: if the restored
   * session later dies BY a signal, the reaper records no code, and the row
   * would keep showing the code from the earlier death as if it were this
   * one's. The clear rides inside the same durable commit as the status, so
   * no crash can leave a live status beside a dead process's exit cause. The
   * kinds that clear are exactly the kinds where tmux created a session;
   * `failed` and `interrupted` never reach this method from the restore path,
   * and if one ever does, the death it describes is still the truth.
   *
   * WHEN THE SESSION CAME BACK, THE TOMBSTONE IS ERASED TOO (Phase 29). A
   * restore of a 'discarded' row is the undo of a Remove, and `removed_at`
   * clears in the same durable commit that writes the restored status, so no
   * crash can leave a live status beside a removal date. A failed restore
   * never reaches this method, so a row that could not come back stays
   * 'discarded', stays in the Past Sessions panel, and the error rises.
   */
  setRestoreResult(
    id: string,
    restore: SessionRestore,
    status: SessionStatus,
    bind: { tmuxName?: string; panePid?: number } = {}
  ): ManifestSessionRecord {
    const cameBack =
      restore.kind === 'shell_only' ||
      restore.kind === 'transcript' ||
      restore.kind === 'armed';
    return this.updateSessionDurably(
      id,
      {
        restore,
        status,
        lastSeen: Date.now(),
        ...(bind.tmuxName !== undefined ? { tmuxName: bind.tmuxName } : {}),
        ...(bind.panePid !== undefined ? { panePid: bind.panePid } : {})
      },
      { clearExitCause: cameBack, clearRemovedAt: cameBack }
    );
  }

  /**
   * Record what a restore achieved WITHOUT touching the row's status or its
   * `lastSeen` (Phase 20 item 4).
   *
   * Two callers need exactly this and must not use `setRestoreResult`. A
   * restore that failed before tmux was asked for anything leaves the row at
   * `restorable`, which is already correct. And the journal resolution at the
   * next launch is annotating a row about a restore that happened in a process
   * that is gone.
   *
   * `lastSeen` is the reason this is a separate method rather than an optional
   * argument. It means "last confirmed alive in tmux", and reconcile reads it
   * as evidence that a row is newer than the snapshot being judged against it.
   * Refreshing it for a restore that produced no session would make reconcile
   * leave a dead row alone for a pass on the strength of a liveness claim
   * nothing supports. 0.055 ms before, 4.20 ms after.
   */
  recordRestoreOutcome(
    id: string,
    restore: SessionRestore
  ): ManifestSessionRecord {
    return this.updateSessionDurably(id, { restore });
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
