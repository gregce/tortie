/**
 * The manifest codecs: the record shapes, the snake_case row shapes, and the
 * conversions between them (Phase 42 stage 6 split out of ./store.ts).
 *
 * Everything here is pure. No module in this file opens a database or touches
 * a transaction; the repositories do that and call these conversions.
 */

import {
  parseAgentContract,
  parseResumeProvenance
} from './contract';
import { parseContextSnapshot } from './context-snapshot';
import type { AgentRecoveryContract, ResumeProvenance } from './agents';
import type { ContextSnapshot } from '@shared/context-snapshot';
// Phase 26.3: presence-only probe (two statSync calls, no read, no hash) so
// the projection can tell the renderer whether an ended row has anything to
// restore. snapshots.ts is a leaf — it never imports the manifest — so this
// direction is cycle-free.
import { snapshotMaterialExists } from '../restore/snapshots';
import {
  RESUME_CAPTURES,
  SESSION_STATUSES,
  type GmuxErrorPayload,
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
  /**
   * Environment variable NAMES this session's agent row asked Tortie to read
   * from the login shell (Phase 33, migration 011).
   *
   * NAMES ONLY, NEVER VALUES. A value is resolved by one login shell probe at
   * the moment of the launch, handed to that pane, and dropped. It is not in
   * this record, not in this database and not in any file Tortie writes.
   *
   * RESTORE RE-RESOLVES. It reads these names, runs the same probe again and
   * injects whatever the shell says then. So a key the user rotated between
   * the create and the restore arrives correct rather than stale, and a
   * freshly created pane and a restored pane see the same environment.
   *
   * Written once, with the row. `ManifestSessionPatch` excludes it.
   */
  envPassthrough?: string[];
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
  /**
   * Which machine this session runs on (Phase 71, migration 013).
   *
   * EVERY VALUE IN THIS RELEASE IS `'local'`. A session on another machine gets
   * no manifest row at all in this rung, and `./sessions-repository.ts` refuses
   * any other value under `manifest.machine-id-nonlocal`. The column exists so
   * the reconcile boundary can be per machine, which is what stops a link to
   * one machine writing 'unknown' over rows on another.
   *
   * UNDEFINED READS AS `'local'`, and {@link rowToRecord} never leaves it
   * undefined: a NULL column becomes `'local'` on the way out. It is optional on
   * this type so that a record composed by hand, which is what every create path
   * and every test does, does not have to state the one value the column can
   * hold. `LOCAL_MACHINE_ID` in `../machines/context.ts` is the one definition of
   * the word.
   *
   * Written once, with the row. `ManifestSessionPatch` excludes it, for the same
   * reason it excludes `envPassthrough`: where a session runs is decided once,
   * at create, and a patch route would let another caller move it.
   */
  machineId?: string;
}

/**
 * Fields a caller may patch after creation.
 *
 * `removedAt` is EXCLUDED on purpose (Phase 29). The only writers of the
 * tombstone are `markSessionRemoved` and the clear inside `setRestoreResult`.
 * A general patch route would let some later caller tombstone a row by
 * accident, and a tombstone is a promise to the user that Remove was pressed.
 *
 * `envPassthrough` is EXCLUDED for a related reason (Phase 33). The set of
 * variable names is part of what a person confirmed for this launch. A general
 * patch route would let a later caller widen it on a live row with nobody
 * agreeing to the change, and the UPDATE statement leaves the column alone so
 * a patch could not write it even if the type allowed one.
 *
 * `machineId` is EXCLUDED for the same reason again (Phase 71). Where a session
 * runs is decided once, at create, and a patch route would let another caller
 * move a row to a machine nobody chose. The UPDATE statement does not name the
 * column either, so a patch could not write it even if the type allowed one.
 */
export type ManifestSessionPatch = Partial<
  Omit<
    ManifestSessionRecord,
    | 'id'
    | 'createdAt'
    | 'removedAt'
    | 'envPassthrough'
    | 'exitDetail'
    | 'machineId'
  >
> & {
  /**
   * The one field a patch CAN remove, and `null` is how it says so (Phase 48
   * fix round).
   *
   * The reaper is the reason. It writes the pane's last words when it has
   * them, and before this it simply omitted the field when it had none. A row
   * that had already died once, and had been flipped back to 'running' by
   * reconcile, therefore kept the FIRST death's sentence through the second
   * death. Reproduced against a real manifest: after a second death at exit
   * code 2 the row still read "ENOENT: node not found" from the first one.
   *
   * A stale number is bad and a stale sentence is worse, so the reaper now
   * always states the answer and `null` is how it states "nothing". The other
   * exit fields keep the `clearExitCause` route, which runs AFTER the merge
   * and is therefore the wrong tool for a caller that wants to set and clear
   * in one write.
   */
  exitDetail?: string | null;
};

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
  /**
   * Delete `exitCode`, `exitSignal` and `exitDetail` from the row after the
   * patch merges.
   *
   * All three since Phase 48. `exitDetail` is the pane's own last words, so a
   * restored session that kept them would show the user a message about a
   * process that is no longer the one running.
   */
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

// ---------------------------------------------------------------------------
// Row shapes (snake_case DB side)
// ---------------------------------------------------------------------------

export interface SessionRow {
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
  /**
   * The last thing the pane printed before it died (migration 012, Phase 48).
   * NULL on every row written before the migration and on every death with an
   * empty pane, and NULL is the true answer for both. Written verbatim, read
   * verbatim, never parsed.
   */
  exit_detail: string | null;
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
  /**
   * Environment variable names as a JSON array (migration 011, Phase 33).
   * NULL on every row created before this migration, and on every row whose
   * agent asks for no passthrough, which is all twelve compiled agents.
   */
  env_passthrough: string | null;
  /**
   * Which machine this session runs on (migration 013, Phase 71).
   *
   * `'local'` on every row in this release. NULL is possible on a row a
   * `.recover` rebuild produced, because that rebuild writes the FINAL schema
   * and never runs the migration's backfill, and NULL is read as `'local'`.
   */
  machine_id: string | null;
}

// ---------------------------------------------------------------------------
// The one value `machine_id` may hold in this release
// ---------------------------------------------------------------------------

/**
 * `'local'`, the only value the `machine_id` column may carry today.
 *
 * IT IS THE SAME STRING AS `LOCAL_MACHINE_ID` IN `../machines/context.ts`, and
 * it is written out here rather than imported, on purpose. Importing that module
 * would pull the whole machine layer, being the ssh carriage, the confirm gate
 * and the logging framework, into the import graph of the manifest store, and
 * `build/contract-inventory.mjs` bundles that store on its own to read the
 * schema. Phase 69 measured what a wider graph costs there: one native module
 * reached it and the gate crashed rather than diffed.
 *
 * The copy cannot drift, because
 * `./__tests__/machine-id-migration.test.ts` imports both and asserts they are
 * the same string.
 */
export const LOCAL_MACHINE_ROW = 'local';

// ---------------------------------------------------------------------------
// Errors (shared GmuxErrorPayload convention: JSON-stringified message)
// ---------------------------------------------------------------------------

export function manifestError(
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
export const RESTORE_KINDS: readonly RestoreResultKind[] = [
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

export function rowToRecord(row: SessionRow): ManifestSessionRecord {
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
  // Phase 48. Absent rather than an empty string, because absent is what the
  // renderer reads as "no last words were recorded" and an empty string would
  // draw an empty monospace block.
  if (
    row.exit_detail !== null &&
    row.exit_detail !== undefined &&
    row.exit_detail.length > 0
  ) {
    record.exitDetail = row.exit_detail;
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
  // Phase 33. A list of NAMES. An unreadable or empty value is dropped whole
  // and the row reads as "no passthrough", which is what every row written
  // before migration 011 is. The alternative, half a list, would start a pane
  // claiming to carry variables it does not.
  const passthrough = parseJsonArray(row.env_passthrough ?? null);
  if (passthrough !== undefined && passthrough.length > 0) {
    record.envPassthrough = passthrough;
  }
  // Phase 71. ALWAYS SET, never left undefined, so every caller that reads a
  // record from the store gets an answer rather than a maybe. NULL reads as
  // 'local', which is true of every row written before migration 013 and of
  // every row a `.recover` rebuild produced from the final schema without ever
  // running the backfill. An empty string is treated the same way, because a
  // hand edited file is the only thing that can produce one.
  record.machineId =
    row.machine_id !== null &&
    row.machine_id !== undefined &&
    row.machine_id.length > 0
      ? row.machine_id
      : LOCAL_MACHINE_ROW;
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
  // Phase 48: the pane's own last words travel with the projection, because
  // the ended-session block draws them and the renderer cannot read a pane
  // that tmux destroyed.
  if (record.exitDetail !== undefined) session.exitDetail = record.exitDetail;
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
