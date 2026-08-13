/**
 * The durable manifest commits (Phase 20 item 4).
 *
 * WHAT THIS CAN AND CANNOT PROVE. It cannot prove that a promoted commit
 * survives power loss, because no test can cut the power to a drive. What it
 * proves is the part that is a code defect when it is wrong. Each promoted
 * commit raises both pragmas for its own transaction and lowers them again,
 * each unpromoted one does not, and the row is readable afterwards by a second
 * connection that never saw the first one's memory.
 *
 * WHY THE UNPROMOTED HALF IS TESTED TOO. The whole argument for this item is
 * that the cost is paid on a handful of rare writes and nowhere else. A later
 * change that quietly routes `setStatus` or reconcile's per-row writes through
 * the same helper would put 4 ms on the activity monitor's per-verdict path
 * and on every row of every reconcile, and nothing else in the repository
 * would notice. These assertions are the thing that notices.
 *
 * The measured cost of each promotion is recorded in store.ts above
 * `insertSession`, next to the commits it is an argument about.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManifestStore, type ManifestSessionRecord } from '../store';

let dir: string;
let dbPath: string;
let store: ManifestStore;

/** Every `PRAGMA` this process ran, in order, since the last reset. */
let pragmas: string[] = [];

const realPragma = Database.prototype.pragma;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-durable-commit-'));
  dbPath = join(dir, 'manifest.db');
  vi.spyOn(Database.prototype, 'pragma').mockImplementation(function (
    this: Database.Database,
    source: string,
    options?: Database.PragmaOptions
  ): unknown {
    pragmas.push(source);
    return realPragma.call(this, source, options);
  });
  store = new ManifestStore(dbPath);
  // The opener's own three pragmas and the migrations' `table_info` calls are
  // not what any of this is about.
  pragmas = [];
});

afterEach(() => {
  store.close();
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

/** The raise-and-lower a scoped durable commit leaves behind, in order. */
const DURABLE = [
  'synchronous = FULL',
  'fullfsync = 1',
  'fullfsync = 0',
  'synchronous = NORMAL'
];

/** Only the two pragmas this item is about, in the order they were set. */
function durabilityPragmas(): string[] {
  return pragmas.filter(
    (p) => p.startsWith('synchronous') || p.startsWith('fullfsync')
  );
}

function record(id: string): ManifestSessionRecord {
  const now = Date.now();
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/p',
    cwd: '/p',
    agent: 'claude',
    status: 'running',
    createdAt: now,
    lastSeen: now,
    argv: ['/usr/local/bin/claude', '--session-id', id]
  };
}

/** What a second process would find in the file. */
function readBack(id: string): Record<string, unknown> | undefined {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare<[string], Record<string, unknown>>(
        'SELECT * FROM sessions WHERE id = ?'
      )
      .get(id);
  } finally {
    db.close();
  }
}

describe('the five promoted commits', () => {
  it('insertSession commits durably and is readable by another connection', () => {
    store.insertSession(record('a'));
    expect(durabilityPragmas()).toEqual(DURABLE);
    expect(readBack('a')?.['name']).toBe('a');
  });

  it('setAgentSessionId commits durably', () => {
    store.insertSession(record('a'));
    pragmas = [];
    store.setAgentSessionId('a', 'conv-1', ['claude', '--resume', 'conv-1']);
    expect(durabilityPragmas()).toEqual(DURABLE);
    expect(readBack('a')?.['agent_session_id']).toBe('conv-1');
  });

  it('setRestoreResult commits durably', () => {
    store.insertSession(record('a'));
    pragmas = [];
    store.setRestoreResult('a', { kind: 'armed', at: 5 }, 'idle');
    expect(durabilityPragmas()).toEqual(DURABLE);
    expect(readBack('a')?.['status']).toBe('idle');
  });

  it('recordRestoreOutcome commits durably', () => {
    store.insertSession(record('a'));
    pragmas = [];
    store.recordRestoreOutcome('a', { kind: 'failed', at: 5 });
    expect(durabilityPragmas()).toEqual(DURABLE);
  });

  it('deleteSession commits durably, and the row is gone on disk', () => {
    store.insertSession(record('a'));
    pragmas = [];
    store.deleteSession('a');
    expect(durabilityPragmas()).toEqual(DURABLE);
    expect(readBack('a')).toBeUndefined();
  });

  it('leaves the connection at NORMAL, so later writes pay nothing', () => {
    store.insertSession(record('a'));
    store.setAgentSessionId('a', 'conv-1', ['claude', '--resume', 'conv-1']);
    store.deleteSession('a');
    // The store's own connection, read through the unspied pragma so the
    // question does not answer itself. 1 is NORMAL in SQLite's numbering.
    const db = (store as unknown as { db: Database.Database }).db;
    expect(realPragma.call(db, 'synchronous', { simple: true })).toBe(1);
    expect(realPragma.call(db, 'fullfsync', { simple: true })).toBe(0);
  });
});

describe('the writes deliberately left at NORMAL', () => {
  it('setStatus does not, because the activity monitor calls it per verdict', () => {
    store.insertSession(record('a'));
    pragmas = [];
    store.setStatus('a', 'exited');
    expect(durabilityPragmas()).toEqual([]);
  });

  it('updateSession does not', () => {
    store.insertSession(record('a'));
    pragmas = [];
    store.updateSession('a', { name: 'renamed' });
    expect(durabilityPragmas()).toEqual([]);
  });

  it('upsertProject does not', () => {
    store.upsertProject({ id: 'p', path: '/p', name: 'p' });
    expect(durabilityPragmas()).toEqual([]);
  });

  it('reconcile does not, over any number of rows', () => {
    for (const id of ['a', 'b', 'c']) store.insertSession(record(id));
    pragmas = [];
    const result = store.reconcile([
      { tmuxId: '$1', tmuxName: 'a', gmuxId: 'a' }
    ]);
    expect(result.alive.map((r) => r.id)).toEqual(['a']);
    expect(result.restorable.map((r) => r.id)).toEqual(['b', 'c']);
    // reconcile writes every row inside ONE transaction, so promoting the
    // write it calls would also mean nesting a durable commit inside an
    // ordinary one, which db/sqlite.ts refuses outright.
    expect(durabilityPragmas()).toEqual([]);
  });
});

describe('what each restore write is allowed to touch', () => {
  it('setRestoreResult carries the tmux binding in the same commit', () => {
    store.insertSession(record('a'));
    pragmas = [];
    store.setRestoreResult('a', { kind: 'armed', at: 5 }, 'idle', {
      tmuxName: 'a-2',
      panePid: 4242
    });
    // One commit, not a durable one followed by an ordinary one.
    expect(durabilityPragmas()).toEqual(DURABLE);
    const row = readBack('a');
    expect(row?.['tmux_name']).toBe('a-2');
    expect(row?.['pane_pid']).toBe(4242);
  });

  it('recordRestoreOutcome leaves status and lastSeen exactly as they were', () => {
    const seeded = store.insertSession({
      ...record('a'),
      status: 'restorable',
      lastSeen: 1000
    });
    store.recordRestoreOutcome('a', { kind: 'failed', at: 5 });
    const after = store.getSession('a');
    // lastSeen means "last confirmed alive in tmux", and a restore that
    // created nothing confirmed nothing. Refreshing it here would make
    // reconcile skip judging a dead row for a pass.
    expect(after?.lastSeen).toBe(seeded.lastSeen);
    expect(after?.status).toBe('restorable');
    expect(after?.restore).toEqual({ kind: 'failed', at: 5 });
  });
});
