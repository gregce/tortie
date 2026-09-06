/**
 * CODEX STATES THE ANSWER IN A DATABASE, and until Phase 215 Tortie inferred
 * it instead.
 *
 * `${CODEX_HOME:-~/.codex}/state_5.sqlite` carries a `threads` table with `id`,
 * `rollout_path`, `cwd`, `created_at_ms` and, decisively, `thread_source`, plus
 * `agent_path`, `agent_nickname` and `agent_role`; and a `thread_spawn_edges`
 * table that is an explicit `(parent_thread_id, child_thread_id, status)` map.
 * The registry has named this file since Phase 12 as a FAST PATH AVAILABLE,
 * NOT YET USED, recorded as a SPEED optimisation, and nobody noticed it also
 * answers *is this a session* and *who is its parent*.
 *
 * Measured read only over the operator's own store on 2026-09-06
 * (docs/research/81 §3): 25,973 `threads` rows, `thread_source` reading `user`
 * 482 times, `subagent` 453 times and NULL for the 25,038 legacy rows that
 * predate the column; 519 edges, 455 open and 64 closed, no self edge, and 28
 * whose parent is itself a child.
 *
 * WHAT THIS MODULE IS AND IS NOT. It is a READER of somebody else's file. It
 * never writes, never migrates, never checkpoints and never runs a pragma that
 * could. Every promise below is enforced in code rather than asserted:
 *
 *  1. THE `-shm` HAZARD, which nobody would predict and which was measured on
 *     this tree with better-sqlite3 itself. A read-only open of a WAL database
 *     that has no `-shm` beside it CREATES the `-shm` file. His `~/.codex` is
 *     writable, so a read-only connection to his live store can WRITE INTO IT.
 *     So the open is refused unless the `-shm` already exists or there is no
 *     `-wal` at all, and the caller falls through to the rollout parse.
 *  2. NEVER `immutable=1`. It creates nothing, and it is STALE: a row
 *     committed into the WAL and not checkpointed is invisible to it. Here a
 *     stale answer is a wrong resume id, which is the whole defect.
 *  3. THE FILE NAME IS VERSION STAMPED and undocumented. A `state_6` is a
 *     silent absence, which is one of four reasons the rollout fallback is not
 *     optional. The others are a database older than the `thread_source`
 *     column, a locked one, and one simply missing the row: 25,038 of his rows
 *     hold NULL there, so that is a measured state rather than a hypothetical.
 *
 * WHAT IT CANNOT ANSWER. It knows a FOLDER and not a tmux pane, so the
 * same-folder residual Phase 34 left open is untouched by adopting it. And it
 * holds two 0.125.0-alpha.3 records with `thread_source` NULL and no edge that
 * the rollout marks derived by `source.subagent`, which is why the two are
 * asked together and a refusal by EITHER is a refusal.
 *
 * Ownership: src/main/manifest/**. Synchronous, because both its callers are.
 */

import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { getLog } from '../../log';

const log = getLog('manifest');

/** What the store says about one thread. Every field may be absent. */
export interface CodexThreadRow {
  id: string;
  rolloutPath: string | null;
  cwd: string | null;
  createdAtMs: number | null;
  threadSource: string | null;
}

/**
 * The store's verdict on whether a thread is a derived stream.
 *
 * `unknown` is a first class answer and it is the common one: the column post
 * dates 25,038 of his rows. It means ASK THE ROLLOUT, never "it is fine".
 */
export type CodexStoreVerdict = 'derived' | 'session' | 'unknown';

export interface CodexStateReader {
  /** The `threads` row for this id, or null. */
  thread(id: string): CodexThreadRow | null;
  /** Is this thread a derived stream? `unknown` when the store cannot say. */
  derived(id: string): CodexStoreVerdict;
  /** The parent `thread_spawn_edges` names for this child, or null. */
  parent(id: string): string | null;
  /** Close the connection. Safe to call twice. */
  close(): void;
}

/**
 * `<codexHome>` for a rollout path, by finding the `sessions` or
 * `archived_sessions` directory above it. The descriptor composes those two
 * roots from `CODEX_HOME`, so walking back up is what lets `confirm`, which is
 * handed a path and nothing else, find the store beside them.
 */
export function codexHomeOfRollout(path: string): string | null {
  let dir = dirname(path);
  for (let i = 0; i < 8; i += 1) {
    const name = basename(dir);
    if (name === 'sessions' || name === 'archived_sessions') return dirname(dir);
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
  return null;
}

/** Where the store lives for a codex home. */
export function codexStatePath(codexHome: string): string {
  return join(codexHome, 'state_5.sqlite');
}

/**
 * TRUE when opening this database read only cannot write anything beside it.
 *
 * The whole rule, and it is measured rather than reasoned: a read-only open
 * creates the `-shm` when a `-wal` exists without one. With no `-wal` present
 * it creates nothing.
 */
export function safeToOpenReadOnly(dbPath: string): boolean {
  if (!existsSync(dbPath)) return false;
  if (!existsSync(`${dbPath}-wal`)) return true;
  return existsSync(`${dbPath}-shm`);
}

/**
 * Open codex's own state store, READ ONLY, or answer null.
 *
 * Null is never an error a caller has to handle specially: it means the
 * rollout parse answers, which is what answered before this phase and what
 * still answers for the 25,038 rows the store says nothing about.
 */
export function openCodexState(codexHome: string): CodexStateReader | null {
  const dbPath = codexStatePath(codexHome);
  if (!safeToOpenReadOnly(dbPath)) return null;

  let db: Database.Database;
  try {
    // readonly + fileMustExist, and NOTHING else. No pragma is run: a
    // `journal_mode` or an `optimize` on somebody else's store is a write.
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } catch (err) {
    // Locked, mid recovery, or a shape sqlite refuses. The rollout answers.
    log.warn(
      `codex state store at ${dbPath} could not be read: ` +
        `${(err as Error).message}. The rollout parse answers instead.`
    );
    return null;
  }

  // A SCHEMA PROBE IN FRONT OF IT, which is the condition Phase 12 attached to
  // this file when it recorded the fast path. A build that renamed a column
  // degrades to the fallback instead of throwing on the first query.
  let threadStatement: Database.Statement | null = null;
  let edgeStatement: Database.Statement | null = null;
  try {
    const columns = new Set(
      (
        db
          .prepare("SELECT name FROM pragma_table_info('threads')")
          .all() as { name: string }[]
      ).map((c) => c.name)
    );
    // EVERY COLUMN BUT `id` IS OPTIONAL, and the select list is composed from
    // what the file actually holds rather than from what his build happens to
    // have. A future codex that drops or renames one degrades to the columns
    // that are left, and losing `threads` itself degrades to the rollout.
    if (columns.has('id')) {
      const pick = (name: string): string =>
        columns.has(name) ? name : `NULL AS ${name}`;
      threadStatement = db.prepare(
        `SELECT id, ${pick('rollout_path')}, ${pick('cwd')},
                ${pick('created_at_ms')}, ${pick('thread_source')}
           FROM threads WHERE id = ? LIMIT 1`
      );
    }
    const edgeColumns = new Set(
      (
        db
          .prepare("SELECT name FROM pragma_table_info('thread_spawn_edges')")
          .all() as { name: string }[]
      ).map((c) => c.name)
    );
    if (edgeColumns.has('child_thread_id') && edgeColumns.has('parent_thread_id')) {
      edgeStatement = db.prepare(
        'SELECT parent_thread_id FROM thread_spawn_edges WHERE child_thread_id = ? LIMIT 1'
      );
    }
  } catch {
    threadStatement = null;
    edgeStatement = null;
  }
  if (threadStatement === null && edgeStatement === null) {
    db.close();
    return null;
  }

  let closed = false;
  const row = (id: string): CodexThreadRow | null => {
    if (closed || threadStatement === null) return null;
    try {
      const found = threadStatement.get(id) as
        | {
            id: string;
            rollout_path: string | null;
            cwd: string | null;
            created_at_ms: number | null;
            thread_source: string | null;
          }
        | undefined;
      if (found === undefined) return null;
      return {
        id: found.id,
        rolloutPath: found.rollout_path,
        cwd: found.cwd,
        createdAtMs: found.created_at_ms,
        threadSource: found.thread_source
      };
    } catch {
      return null;
    }
  };

  return {
    thread: row,
    /**
     * THE COLUMN ALONE IS NOT ENOUGH, and that is measured: 66 of his edge
     * children read `thread_source` NULL, so asking the column alone misses 68
     * of his derived records while `column OR edge` misses 2. Both are asked,
     * and an id the store holds no opinion about is `unknown` rather than
     * `session`, so the rollout is what decides it.
     */
    derived: (id): CodexStoreVerdict => {
      if (closed) return 'unknown';
      if (edgeStatement !== null) {
        try {
          if (edgeStatement.get(id) !== undefined) return 'derived';
        } catch {
          /* the rollout answers */
        }
      }
      const found = row(id);
      if (found === null) return 'unknown';
      if (found.threadSource === 'subagent') return 'derived';
      if (found.threadSource === 'user') return 'session';
      return 'unknown';
    },
    parent: (id): string | null => {
      if (closed || edgeStatement === null) return null;
      try {
        const found = edgeStatement.get(id) as
          | { parent_thread_id: string | null }
          | undefined;
        const parent = found?.parent_thread_id;
        return typeof parent === 'string' && parent.length > 0 ? parent : null;
      } catch {
        return null;
      }
    },
    close: () => {
      if (closed) return;
      closed = true;
      try {
        db.close();
      } catch {
        /* already gone */
      }
    }
  };
}

// ---------------------------------------------------------------------------
// One reader per codex home, so a harvest does not reopen a 578 MB file per
// candidate
// ---------------------------------------------------------------------------

/**
 * A NEGATIVE answer is re-asked after this long. codex writes NEITHER a
 * rollout NOR a `threads` row until the first turn, so a harvest that starts
 * with the pane can easily open before the store exists, and a null cached for
 * the life of the process would then never see it appear.
 */
const RETRY_ABSENT_MS = 60_000;

const readers = new Map<
  string,
  { reader: CodexStateReader | null; checkedAt: number }
>();

/**
 * The reader for this codex home, opened once and kept.
 *
 * The connection is READ ONLY and holds one file descriptor. It cannot
 * checkpoint, cannot recover and cannot write, so the worst a long lived one
 * can do is answer from an older snapshot after the file is replaced. That is
 * safe HERE and only because of how the answer is used: the store's `derived`
 * is an ADDITIONAL refusal and the rollout is asked whatever it says, so a
 * stale store can only under-refuse, never over-refuse, and the rollout is a
 * measured superset of it over 25,972 of his records.
 */
export function codexStateFor(codexHome: string): CodexStateReader | null {
  const cached = readers.get(codexHome);
  if (cached !== undefined) {
    if (cached.reader !== null) return cached.reader;
    if (Date.now() - cached.checkedAt < RETRY_ABSENT_MS) return null;
  }
  const reader = openCodexState(codexHome);
  readers.set(codexHome, { reader, checkedAt: Date.now() });
  return reader;
}

/** Close every kept reader. Teardown, and the test hook. */
export function closeCodexState(): void {
  for (const entry of readers.values()) entry.reader?.close();
  readers.clear();
}
