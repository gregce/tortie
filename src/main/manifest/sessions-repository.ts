/**
 * The sessions repository: every read and write of the `sessions` table
 * (Phase 42 stage 6 split out of ./store.ts).
 *
 * The transaction shapes and the durable-commit promotions in this file are
 * IMMOVABLE. Each durable method carries the measurement and the reason it
 * was promoted; each method left at NORMAL carries the reason it was not.
 */

import type Database from 'better-sqlite3';
import { durableTransaction } from '../db/sqlite';
import {
  serializeAgentContract,
  serializeResumeProvenance
} from './contract';
import { serializeContextSnapshot } from './context-snapshot';
import type { ResumeProvenance } from './agents';
import type { ContextSnapshot } from '@shared/context-snapshot';
import type {
  ResumeCapture,
  SessionRestore,
  SessionStatus
} from '@shared/types';
import {
  LOCAL_MACHINE_ROW,
  manifestError,
  rowToRecord,
  serializeClosedProjectTab,
  serializeMachineTombstone,
  type ClosedProjectTab,
  type MachineTombstone,
  type ManifestSessionPatch,
  type ManifestSessionRecord,
  type SessionRow,
  type UpdateSessionOptions
} from './codecs';

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
 * PHASE 72 DELETED THE REFUSAL THAT USED TO STAND HERE, and this note is the
 * record of it so a later reader does not go looking for a guard that was
 * removed on purpose.
 *
 * `MACHINE_ID_NONLOCAL`, pinned as `manifest.machine-id-nonlocal`, refused any
 * write of a `machine_id` other than `local`. It existed because Phase 71 left
 * `MANIFEST_MIN_COMPATIBLE_VERSION` at 8 across migration 013, so a build at
 * schema 12 could still write this file and would read every row as a session on
 * this Mac. That was correct only while the column held one value.
 *
 * Phase 71 wrote the instruction and Phase 72 executed it: this build records
 * real machine ids, so `MANIFEST_MIN_COMPATIBLE_VERSION` moved from 8 to 13 in
 * the same commit. The number now does the work the sentence was standing in
 * for, and it does it better, because an older build is refused at the open
 * rather than relying on this build to decline a write.
 */

/**
 * One row a machine's removal has to tombstone, and the record to write on it
 * (Phase 118).
 *
 * The plan is composed by `../machines/remote-sessions.ts` and written by
 * {@link SessionsRepository.markMachinesForgotten} as one transaction, so the
 * caller can never write half a removal.
 */
export interface MachineTombstoneEntry {
  readonly sessionId: string;
  readonly tombstone: MachineTombstone;
}

/** What a harness may do inside the removal transaction (Phase 118). */
export interface MarkMachinesForgottenHooks {
  /**
   * HARNESS ONLY. Called inside the transaction, before each row's UPDATE, with
   * the 0-based index. A throw here rolls the whole transaction back, which is
   * the state this phase exists to make provable. Nothing in production passes
   * it, and the one caller that can arm it refuses unless GMUX_SMOKE is set.
   */
  readonly beforeRow?: (index: number, entry: MachineTombstoneEntry) => void;
}

export class SessionsRepository {
  constructor(private readonly db: Database.Database) {}

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
    // Phase 71. The returned record states the machine, whether the caller did
    // or not, so what this method hands back is what the row now holds. A
    // caller reading `machineId` off the return value would otherwise get
    // `undefined` for a row the database has written a value into. Phase 72: the
    // value is the caller's when it gave one, because a remote create names its
    // machine and the row has to carry it.
    return { ...record, machineId: record.machineId ?? LOCAL_MACHINE_ROW };
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
              context_snapshot, env_passthrough, exit_detail, machine_id,
              machine_tombstone, project_tombstone)
           VALUES
             (@id, @name, @tmuxName, @projectPath, @cwd, @agent,
              @agentSessionId, @argv, @resumeArgv, @env, @status,
              @createdAt, @lastSeen, @exitCode, @exitSignal, @panePid,
              @resumeCapture, @specstory, @restore,
              @agentVersion, @agentContract, @resumeProvenance,
              @contextSnapshot, @envPassthrough, @exitDetail, @machineId,
              @machineTombstone, @projectTombstone)`
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
          // Phase 48. NULL at insert on every ordinary create, because a
          // session that has not started cannot have printed anything. The
          // reaper fills it in the same patch that writes the exit code.
          exitDetail: record.exitDetail ?? null,
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
          contextSnapshot: serializeContextSnapshot(record.contextSnapshot),
          // Phase 33. The NAMES of the variables this session reads from the
          // login shell, and never their values. This is the only statement
          // that writes the column: the UPDATE below does not name it, so the
          // set a person confirmed at create cannot be widened later.
          envPassthrough:
            record.envPassthrough !== undefined && record.envPassthrough.length > 0
              ? JSON.stringify(record.envPassthrough)
              : null,
          // Phase 71. Written once, with the row, and the UPDATE below does not
          // name the column, so where a session runs cannot be changed by any
          // later patch. Phase 72: the record's own value is written, because a
          // remote create names its machine here and the row is the only place
          // that fact can live. A record that states nothing gets the ordinary
          // value, which is what every local create composes.
          machineId: record.machineId ?? LOCAL_MACHINE_ROW,
          // Phase 72. NULL at insert on every create of any kind. A session
          // whose machine has been removed cannot be a session being created.
          // `markMachineForgotten` is the only writer.
          machineTombstone: serializeMachineTombstone(record.machineTombstone),
          // Phase 93. NULL at insert on every create of any kind. A session
          // whose project tab has been closed cannot be a session being
          // created, because the create needs the tab to start from.
          // `markProjectTabClosed` is the only writer.
          projectTombstone: serializeClosedProjectTab(record.projectTombstone)
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
    // `null` REMOVES, which no other field in a patch can say. See
    // ManifestSessionPatch for the second death that made it necessary.
    if (patch.exitDetail === null) delete merged.exitDetail;
    else if (patch.exitDetail !== undefined) merged.exitDetail = patch.exitDetail;
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
      // Phase 48. The pane's own last words are part of the exit cause, and
      // they are the part a person actually reads. A restore that left them
      // on the row would show a message about a process that is no longer the
      // one running.
      delete merged.exitDetail;
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
           exit_signal = @exitSignal, exit_detail = @exitDetail,
           pane_pid = @panePid,
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
        exitDetail: merged.exitDetail ?? null,
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
   * Record that a completed list from a machine still held this session
   * (Phase 72).
   *
   * `last_seen` MEANS "last confirmed alive", and for a session on another
   * machine the only thing that can confirm it is a list from that machine that
   * completed and held the row. This is the write for that, and it is a
   * dedicated statement rather than a `updateSession` patch for two reasons.
   *
   * It runs on every completed pass that holds the row, which on a machine with
   * a live connection is once per event that machine reports. The patch path
   * reads the whole row and writes every column back, and doing that per row per
   * pass would be the most frequent write in the product for the least valuable
   * field in it. This one touches one column.
   *
   * And it must NOT move the status. The status of a remote row is decided by
   * the case table in `../machines/status-truth.ts`, written back only when it
   * changes, and a second writer that could move it by accident is exactly the
   * kind of thing that makes a row disagree with the machine it names.
   *
   * NOT a durable commit. Losing it loses one instant on a row whose next
   * completed pass writes it again seconds later.
   *
   * A silent no-op when the id has no row. A remote row created by 0.34 or 0.35
   * has no manifest row at all, and the feed still reports it every pass.
   */
  setLastSeen(id: string, at: number): void {
    this.db
      .prepare<[number, string]>('UPDATE sessions SET last_seen = ? WHERE id = ?')
      .run(at, id);
  }

  /**
   * Tombstone EVERY row a removed machine held, in ONE durable transaction
   * (Phase 72, migration 014; made one transaction in Phase 118).
   *
   * ALL OR NONE, and that is the whole of this method. Before Phase 118 each row
   * was its own durable commit with a catch around it, so a failure on row 3 of
   * 5 left two rows tombstoned, three untouched, `machines.json` rewritten
   * anyway, and no way for a person to tell which rows had been recorded.
   *
   * ONE STATEMENT PER ROW writes all three facts: the status, the removal
   * instant, and the record of what Tortie last knew. They are one write because
   * they are one event, and a crash between them would leave a discarded row
   * with no explanation of which machine went away.
   *
   * A ROW THAT IS NOT THERE THROWS SESSION_NOT_FOUND and nothing is written.
   *
   * A ROW ALREADY TOMBSTONED by an earlier removal of the same machine is
   * SKIPPED and not counted, because writing a second tombstone would replace
   * what Tortie last knew with less. That skip is what makes a retry after a
   * failure idempotent.
   *
   * DURABLE, for the same reason `markSessionRemoved` is. The caller rewrites
   * `machines.json` the moment this returns, and a NORMAL commit could be
   * discarded by power loss. Durable first means the two sides can only be lost
   * in the safe order: a tombstone naming a machine that is still in the list
   * reads correctly, and a machine removed with no tombstone behind it does not.
   *
   * NOTHING IS SENT TO THE MACHINE by this method or by its caller. The sessions
   * over there keep running, and the tombstone's own sentence says so.
   *
   * @returns how many rows this call tombstoned. 0 is an ordinary answer.
   * @throws whatever the failing row threw, including SESSION_NOT_FOUND for an
   *   id with no row. Nothing is written in that case.
   */
  markMachinesForgotten(
    entries: readonly MachineTombstoneEntry[],
    hooks?: MarkMachinesForgottenHooks
  ): number {
    // An empty list opens no transaction. A machine with no sessions on it is
    // an ordinary machine, not a failure, and a durable commit that writes
    // nothing is 4.24 ms spent for nothing.
    if (entries.length === 0) return 0;
    let written = 0;
    durableTransaction(this.db, () => {
      written = 0;
      for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        if (entry === undefined) continue;
        hooks?.beforeRow?.(i, entry);
        const existing = this.db
          .prepare<[string], { status: string; machine_tombstone: string | null }>(
            'SELECT status, machine_tombstone FROM sessions WHERE id = ?'
          )
          .get(entry.sessionId);
        if (existing === undefined) {
          throw manifestError(
            'SESSION_NOT_FOUND',
            `No manifest row for session ${entry.sessionId}`
          );
        }
        if (
          existing.status === 'discarded' &&
          existing.machine_tombstone !== null
        ) {
          // Already tombstoned by an earlier removal of the same machine.
          continue;
        }
        this.db
          .prepare<[number, string, string]>(
            `UPDATE sessions
                SET status = 'discarded', removed_at = ?, machine_tombstone = ?
              WHERE id = ?`
          )
          .run(
            entry.tombstone.forgottenAt,
            JSON.stringify(entry.tombstone),
            entry.sessionId
          );
        written += 1;
      }
    });
    return written;
  }

  /**
   * Stamp every session a closing project tab leaves without one
   * (Phase 93, migration 016).
   *
   * ONE DURABLE STATEMENT, and the caller runs it BEFORE it deletes the project
   * row. The project row has never been durable, so a crash between the two
   * writes can only lose the tab, which costs a tab. The other order could lose
   * the record of a tab that is already gone, which is the exact state this
   * method exists to remove.
   *
   * IT NEVER CHANGES A STATUS. `markMachineForgotten` above sets 'discarded'
   * because the sessions on a removed machine cannot be seen any more. A closed
   * tab is not that. The sessions are still running, still in the attention list
   * and still reachable, so a status written here would end a session nobody
   * asked to end.
   *
   * IT SKIPS A DISCARDED ROW. A row Phase 72 already tombstoned for its machine
   * carries the record of what Tortie last knew about it, and writing a second
   * record over it would replace what Tortie knew with less.
   *
   * THE MATCH IS ON THE FOLDER AND THE MACHINE, never on the path alone.
   * `/Users/gdc/gmux` on this Mac and `/Users/gdc/gmux` on another computer are
   * two different folders, which is the same rule migration 015 wrote into the
   * `remote_projects` table. A NULL `machine_id` counts as this Mac, because
   * that is what {@link rowToRecord} reads it as.
   *
   * NOTHING IS SENT TO ANY MACHINE by this method or by its caller.
   *
   * @returns how many rows were stamped, so the caller can log it. Zero is an
   * ordinary answer: a tab with no sessions in it is a tab a person opened and
   * never used.
   */
  markProjectTabClosed(
    target: { path: string; machineId?: string },
    tab: ClosedProjectTab
  ): number {
    const machine = target.machineId ?? LOCAL_MACHINE_ROW;
    let changed = 0;
    durableTransaction(this.db, () => {
      const info = this.db
        .prepare<[string, string, string]>(
          `UPDATE sessions
              SET project_tombstone = ?
            WHERE project_path = ?
              AND COALESCE(NULLIF(machine_id, ''), '${LOCAL_MACHINE_ROW}') = ?
              AND status <> 'discarded'`
        )
        .run(JSON.stringify(tab), target.path, machine);
      changed = info.changes;
    });
    return changed;
  }

  /**
   * Clear the stamp on every session in a folder that has a tab again
   * (Phase 93, migration 016).
   *
   * It runs from the two adds in `../sessions/core.ts`, after the upsert
   * returns. A stamp that said "you closed this tab" beside a tab that is open
   * again would be a false record, and the alternative of leaving it there and
   * gating every reader on "is there a tab" was rejected because a later reader
   * would have to remember the gate.
   *
   * NOT A DURABLE COMMIT. Losing it leaves a stale stamp on a row whose tab is
   * open, and the next close writes over it. Nothing is lost and nothing is
   * stranded, so this write does not buy a drive flush.
   *
   * The match is the same folder and machine pair {@link markProjectTabClosed}
   * writes, and a discarded row is left alone for the same reason.
   *
   * @returns how many rows were cleared.
   */
  clearProjectTabClosed(target: { path: string; machineId?: string }): number {
    const machine = target.machineId ?? LOCAL_MACHINE_ROW;
    return this.db
      .prepare<[string, string]>(
        `UPDATE sessions
            SET project_tombstone = NULL
          WHERE project_path = ?
            AND COALESCE(NULLIF(machine_id, ''), '${LOCAL_MACHINE_ROW}') = ?
            AND project_tombstone IS NOT NULL
            AND status <> 'discarded'`
      )
      .run(target.path, machine).changes;
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
}
