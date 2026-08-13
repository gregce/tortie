/**
 * The restore journal and the stored restore result (Phase 19 items 6 and 7).
 *
 * Exercised against a real on-disk SQLite file, migrations and all, because
 * the whole point of both features is what the NEXT process finds when it
 * opens the file. A mocked database would test the mock.
 *
 * WHAT IS DELIBERATELY NOT TESTED HERE. That the durable commits survive power
 * loss. `synchronous=FULL` plus `fullfsync=1` is a call into the drive, and no
 * unit test can cut the power. What is testable, and is tested, is that the
 * rows are written before the side effect and readable afterwards by a second
 * connection that never saw the first one's memory.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { ManifestStore, toSession, type ManifestSessionRecord } from '../store';

let dir: string;
let dbPath: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-restore-journal-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function insert(
  id: string,
  patch: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  const now = Date.now();
  return store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/p',
    cwd: '/p',
    agent: 'claude',
    status: 'restorable',
    createdAt: now,
    lastSeen: now,
    argv: ['claude'],
    ...patch
  });
}

describe('the stored restore result — item 6', () => {
  it('round-trips through SQLite and reaches the renderer projection', () => {
    insert('a');
    store.setRestoreResult(
      'a',
      { kind: 'shell_only', at: 111, replayFailure: 'send-keys failed' },
      'idle'
    );
    const back = store.getSession('a');
    expect(back?.restore).toEqual({
      kind: 'shell_only',
      at: 111,
      replayFailure: 'send-keys failed'
    });
    expect(back?.status).toBe('idle');
    // The renderer has to be able to say "this came back without its
    // history", so the record travels with the projection.
    expect(toSession(back as ManifestSessionRecord).restore?.kind).toBe(
      'shell_only'
    );
  });

  it('stores the result and the status as ONE write', () => {
    insert('b');
    // A row saying `idle` with no record beside it is the defect this item
    // fixes, and a row carrying a failed record while its status says it is
    // alive would be the same defect pointed the other way.
    store.setRestoreResult('b', { kind: 'armed', at: 1 }, 'idle');
    const row = new Database(dbPath, { readonly: true })
      .prepare<[string], { status: string; restore: string | null }>(
        'SELECT status, restore FROM sessions WHERE id = ?'
      )
      .get('b');
    expect(row?.status).toBe('idle');
    expect(JSON.parse(row?.restore ?? 'null')).toMatchObject({ kind: 'armed' });
  });

  it('an unreadable record reads as "never restored", never as half a record', () => {
    insert('c');
    new Database(dbPath)
      .prepare<[string, string]>('UPDATE sessions SET restore = ? WHERE id = ?')
      .run('{"kind":"armed"', 'c'); // truncated JSON
    expect(store.getSession('c')?.restore).toBeUndefined();
  });

  it('a record with an unknown kind is dropped whole', () => {
    insert('d');
    new Database(dbPath)
      .prepare<[string, string]>('UPDATE sessions SET restore = ? WHERE id = ?')
      .run('{"kind":"conversation_confirmed","at":5}', 'd');
    // Written by a later version that knows a kind this build does not. It is
    // dropped rather than half-read, because half a record could claim a
    // conversation came back when nothing did.
    expect(store.getSession('d')?.restore).toBeUndefined();
  });
});

describe('the restore journal — item 7', () => {
  it('the intent row exists before any side effect could have run', () => {
    insert('a');
    const id = store.beginRestoreAttempt('a', 1000);
    // Read through a SECOND connection: the row is committed, not merely
    // held in the writer's memory.
    const row = new Database(dbPath, { readonly: true })
      .prepare<[number], { session_id: string; outcome: string | null }>(
        'SELECT session_id, outcome FROM restore_attempts WHERE id = ?'
      )
      .get(id);
    expect(row?.session_id).toBe('a');
    expect(row?.outcome).toBeNull();
  });

  it('an unfinished attempt is what the next launch finds', () => {
    insert('a');
    const open = store.beginRestoreAttempt('a');
    const closed = store.beginRestoreAttempt('a');
    store.finishRestoreAttempt(closed, 'armed');

    const unfinished = store.listUnfinishedRestoreAttempts();
    expect(unfinished.map((x) => x.id)).toEqual([open]);
    expect(unfinished[0]?.outcome).toBeNull();
    expect(store.getRestoreAttempt(closed)?.outcome).toBe('armed');
  });

  it('the tmux id is recorded on its own, before the outcome is known', () => {
    insert('a');
    const id = store.beginRestoreAttempt('a');
    store.noteRestoreTmuxId(id, '$77');
    // This is the state a crash between new-session and the status write
    // leaves behind, and it has to be readable exactly as it is.
    const open = store.listUnfinishedRestoreAttempts();
    expect(open[0]?.tmuxId).toBe('$77');
    expect(open[0]?.outcome).toBeNull();
  });

  it('survives closing and reopening the database', () => {
    insert('a');
    const id = store.beginRestoreAttempt('a');
    store.noteRestoreTmuxId(id, '$77');
    store.close();

    store = new ManifestStore(dbPath);
    const open = store.listUnfinishedRestoreAttempts();
    expect(open).toHaveLength(1);
    expect(open[0]?.tmuxId).toBe('$77');
  });

  it('pruning on open never removes an unfinished attempt', () => {
    insert('a');
    const open = store.beginRestoreAttempt('a');
    for (let i = 0; i < 5; i += 1) {
      store.finishRestoreAttempt(store.beginRestoreAttempt('a'), 'armed');
    }
    store.close();

    // The constructor prunes. The one row the next launch must act on is the
    // one row it may not delete.
    store = new ManifestStore(dbPath);
    expect(store.listUnfinishedRestoreAttempts().map((x) => x.id)).toEqual([
      open
    ]);
  });

  it('pruning bounds the table and keeps the newest', () => {
    insert('a');
    const ids: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      const id = store.beginRestoreAttempt('a');
      store.finishRestoreAttempt(id, 'armed');
      ids.push(id);
    }
    store.pruneRestoreAttempts(3);
    const left = new Database(dbPath, { readonly: true })
      .prepare<[], { id: number }>('SELECT id FROM restore_attempts ORDER BY id')
      .all()
      .map((r) => r.id);
    expect(left).toEqual(ids.slice(-3));
  });

  it('pruning drops finished attempts whose session row is gone', () => {
    insert('a');
    store.finishRestoreAttempt(store.beginRestoreAttempt('a'), 'armed');
    store.deleteSession('a');
    store.pruneRestoreAttempts();
    const count = new Database(dbPath, { readonly: true })
      .prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM restore_attempts')
      .get();
    expect(count?.n).toBe(0);
  });

  it('ordinary writes still work after a durable commit', () => {
    // The pragma raise and lower is asserted directly in
    // db/__tests__/durable-transaction.test.ts. What matters here is that the
    // store keeps working, because a pragma left raised is invisible until
    // reconcile is slow with forty sessions.
    insert('a');
    store.finishRestoreAttempt(store.beginRestoreAttempt('a'), 'failed');
    expect(() => store.setStatus('a', 'restorable')).not.toThrow();
    expect(store.getSession('a')?.status).toBe('restorable');
  });
});

describe('the status alphabet — item 6', () => {
  it('a tombstone is never claimed, revived or marked restorable', () => {
    insert('t', { status: 'discarded' });
    insert('live', { status: 'running' });
    const out = store.reconcile([{ tmuxId: '$1', tmuxName: 'live', gmuxId: 'live' }]);
    expect(store.getSession('t')?.status).toBe('discarded');
    expect(out.restorable.map((r) => r.id)).not.toContain('t');
    expect(out.alive.map((r) => r.id)).not.toContain('t');
  });

  it('a live session carrying a tombstone identity is reported, not adopted', () => {
    insert('t', { status: 'discarded' });
    const out = store.reconcile([{ tmuxId: '$1', tmuxName: 'zombie', gmuxId: 't' }]);
    // Reported as somebody else's session, which is the same rule that stops
    // reconcile adopting a stranger that took a freed name.
    expect(out.unknownTmuxNames).toEqual(['zombie']);
    expect(store.getSession('t')?.status).toBe('discarded');
  });

  it('seeing an unknown session alive is the evidence it was missing', () => {
    insert('u', { status: 'unknown' });
    const out = store.reconcile([{ tmuxId: '$1', tmuxName: 'u', gmuxId: 'u' }]);
    expect(out.alive.map((r) => r.id)).toEqual(['u']);
    expect(store.getSession('u')?.status).toBe('running');
  });

  it('a status this build does not know degrades rather than crashing', () => {
    insert('f');
    new Database(dbPath)
      .prepare<[string, string]>('UPDATE sessions SET status = ? WHERE id = ?')
      .run('teleporting', 'f');
    expect(store.getSession('f')?.status).toBe('restorable');
  });
});
