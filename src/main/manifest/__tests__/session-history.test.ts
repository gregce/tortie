/**
 * Phase 29 — session history. The data layer's promises, pinned at the store:
 *
 *  - migration 010 adds `removed_at`, moves the schema version on and leaves
 *    the compatibility minimum at 8 (the additive decision). The version
 *    reads 11 since Phase 33 appended migration 011;
 *  - `markSessionRemoved` writes the tombstone in one statement and throws
 *    on a missing row;
 *  - the prune deletes at 91 days back, keeps 89 days back, never touches a
 *    NULL stamp, and sweeps the orphaned restore attempts in the same open;
 *  - `setRestoreResult` clears the tombstone in the same durable commit that
 *    writes the restored status, and a failed restore changes nothing;
 *  - reconcile reports a live session carrying a tombstone's identity as
 *    unknown instead of adopting or reviving it.
 *
 * The store is exercised against a real on-disk SQLite file (a temp dir);
 * these are not mocks.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_VERSION,
  ManifestStore,
  toSession,
  type LiveTmuxSession,
  type ManifestSessionRecord
} from '../store';

const DAY_MS = 24 * 60 * 60 * 1000;

let dir: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-manifest-'));
  store = new ManifestStore(join(dir, 'manifest.db'));
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function row(
  id: string,
  extra: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  const now = Date.now();
  return store.insertSession({
    id,
    name: id,
    tmuxName: id,
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status: 'exited',
    createdAt: now,
    argv: ['/bin/zsh'],
    lastSeen: now,
    ...extra
  });
}

describe('the two schema numbers', () => {
  // Phase 71 appended migration 013, so the version reads 13 here. The
  // minimum is the number this file is actually about, and it has not moved
  // since migration 008.
  it('schema version is 13 and the minimum stays 8 (the additive decision)', () => {
    expect(MANIFEST_SCHEMA_VERSION).toBe(13);
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(8);
  });

  it('stamps both numbers on the file', () => {
    const state = store.schemaState();
    expect(state.userVersion).toBe(13);
    expect(state.minCompatible).toBe(8);
  });
});

describe('migration 010 against a schema 9 file', () => {
  it('adds removed_at, moves user_version past 10, and a second open is a no-op', () => {
    // Build a byte-honest schema 9 fixture: this build's file, minus exactly
    // what migrations 010, 011, 012 and 013 added. Each adds one nullable
    // column and nothing else, so removing the four columns and the four
    // bookkeeping rows IS schema 9. Phase 33 added the second one, Phase 48
    // added the third and Phase 71 added the fourth; before them, this fixture
    // had one column to remove.
    const dbPath = join(dir, 'nine.db');
    const fresh = new ManifestStore(dbPath);
    fresh.insertSession({
      id: 'old-row',
      name: 'old-row',
      tmuxName: 'old-row',
      projectPath: '/w',
      cwd: '/w',
      agent: 'shell',
      status: 'exited',
      createdAt: 1_000,
      argv: ['/bin/zsh'],
      lastSeen: 1_000
    });
    fresh.close();
    const raw = new Database(dbPath);
    raw.exec('ALTER TABLE sessions DROP COLUMN removed_at');
    raw.exec('ALTER TABLE sessions DROP COLUMN env_passthrough');
    raw.exec('ALTER TABLE sessions DROP COLUMN exit_detail');
    raw.exec('ALTER TABLE sessions DROP COLUMN machine_id');
    raw.prepare("DELETE FROM migrations WHERE name = '010-removed-at'").run();
    raw
      .prepare("DELETE FROM migrations WHERE name = '011-env-passthrough'")
      .run();
    raw.prepare("DELETE FROM migrations WHERE name = '012-exit-detail'").run();
    raw.prepare("DELETE FROM migrations WHERE name = '013-machine-id'").run();
    raw.pragma('user_version = 9');
    raw.close();

    // First open: all four pending migrations run.
    const migrated = new ManifestStore(dbPath);
    const state = migrated.schemaState();
    expect(state.userVersion).toBe(13);
    expect(state.minCompatible).toBe(8);
    // Migration 013 backfilled the row this fixture wrote at schema 9.
    expect(migrated.getSession('old-row')?.machineId).toBe('local');
    // NULL on a row written before the migration reads as "never removed".
    const old = migrated.getSession('old-row');
    expect(old?.removedAt).toBeUndefined();
    // The column exists: the tombstone write works against the migrated file.
    // A RECENT stamp, because the next open runs the retention prune and an
    // epoch-early stamp would be 90 days past by definition.
    const removedAt = Date.now() - 1_000;
    migrated.markSessionRemoved('old-row', removedAt);
    expect(migrated.getSession('old-row')?.removedAt).toBe(removedAt);
    migrated.close();

    // Second open: nothing pending, nothing changes.
    const again = new ManifestStore(dbPath);
    expect(again.schemaState().userVersion).toBe(13);
    expect(again.getSession('old-row')?.removedAt).toBe(removedAt);
    expect(again.getSession('old-row')?.status).toBe('discarded');
    again.close();
  });
});

describe('markSessionRemoved', () => {
  it('flips status and stamps the clock in one write', () => {
    row('s1');
    store.markSessionRemoved('s1', 12_345);
    const rec = store.getSession('s1');
    expect(rec?.status).toBe('discarded');
    expect(rec?.removedAt).toBe(12_345);
  });

  it('throws SESSION_NOT_FOUND on a missing row', () => {
    expect(() => {
      store.markSessionRemoved('nope');
    }).toThrowError(/SESSION_NOT_FOUND/);
  });

  it('projects removedAt into the shared Session shape', () => {
    row('s1');
    store.markSessionRemoved('s1', 777);
    const rec = store.getSession('s1');
    expect(rec).toBeDefined();
    const session = toSession(rec as ManifestSessionRecord);
    expect(session.removedAt).toBe(777);
    expect(session.status).toBe('discarded');
  });

  it('a live row projects no removedAt', () => {
    const rec = row('s2', { status: 'running' });
    expect(toSession(rec).removedAt).toBeUndefined();
  });

  it('an ordinary patch preserves the tombstone rather than clearing it', () => {
    row('s1');
    store.markSessionRemoved('s1', 500);
    // The patch shape cannot express removedAt at all; a rename must ride
    // through without disturbing the stamp.
    store.updateSession('s1', { name: 'renamed' });
    const rec = store.getSession('s1');
    expect(rec?.name).toBe('renamed');
    expect(rec?.status).toBe('discarded');
    expect(rec?.removedAt).toBe(500);
  });
});

describe('restore against a tombstone', () => {
  it('setRestoreResult clears removed_at in the same commit that writes the status', () => {
    row('s1');
    store.markSessionRemoved('s1', 500);
    const merged = store.setRestoreResult(
      's1',
      { kind: 'armed', at: Date.now() },
      'idle',
      { tmuxName: 's1' }
    );
    // The returned record and the row on disk agree: no live status can sit
    // beside a removal date.
    expect(merged.removedAt).toBeUndefined();
    const rec = store.getSession('s1');
    expect(rec?.status).toBe('idle');
    expect(rec?.removedAt).toBeUndefined();
  });

  it('a failed restore leaves the row discarded and in the panel', () => {
    row('s1');
    store.markSessionRemoved('s1', 500);
    // The failed arm records the outcome WITHOUT touching status — the same
    // call the restore path makes (recordRestoreOutcome, never
    // setRestoreResult, for a failure).
    store.recordRestoreOutcome('s1', {
      kind: 'failed',
      at: Date.now(),
      stage: 'preflight',
      reason: 'the folder is gone'
    });
    const rec = store.getSession('s1');
    expect(rec?.status).toBe('discarded');
    expect(rec?.removedAt).toBe(500);
    expect(rec?.restore?.kind).toBe('failed');
  });
});

describe('the 90 day prune', () => {
  it('deletes at 91 days back, keeps 89 days back, never touches a NULL stamp', () => {
    const now = Date.now();
    row('old');
    row('recent');
    row('null-stamp');
    store.markSessionRemoved('old', now - 91 * DAY_MS);
    store.markSessionRemoved('recent', now - 89 * DAY_MS);
    // The hand edited case: discarded with no stamp. This build cannot
    // produce it (markSessionRemoved writes both in one statement), so it is
    // simulated the only way it can exist, by a raw status write.
    store.updateSession('null-stamp', { status: 'discarded' });

    store.pruneDiscardedSessions(now);

    expect(store.getSession('old')).toBeUndefined();
    expect(store.getSession('recent')?.status).toBe('discarded');
    expect(store.getSession('null-stamp')?.status).toBe('discarded');
  });

  it('never touches live rows whatever their age', () => {
    const now = Date.now();
    row('ancient-live', { status: 'idle', createdAt: now - 400 * DAY_MS });
    store.pruneDiscardedSessions(now);
    expect(store.getSession('ancient-live')).toBeDefined();
  });

  it('runs at open, before the attempt prune, so orphaned attempts sweep in the same open', () => {
    const dbPath = join(dir, 'prune.db');
    const first = new ManifestStore(dbPath);
    const now = Date.now();
    first.insertSession({
      id: 'doomed',
      name: 'doomed',
      tmuxName: 'doomed',
      projectPath: '/w',
      cwd: '/w',
      agent: 'shell',
      status: 'exited',
      createdAt: now,
      argv: ['/bin/zsh'],
      lastSeen: now
    });
    const attempt = first.beginRestoreAttempt('doomed');
    first.finishRestoreAttempt(attempt, 'armed');
    first.markSessionRemoved('doomed', now - 91 * DAY_MS);
    first.close();

    const second = new ManifestStore(dbPath);
    expect(second.getSession('doomed')).toBeUndefined();
    // The attempt's session row was deleted by the discard prune, and the
    // attempt prune in the SAME constructor swept the orphan.
    expect(second.getRestoreAttempt(attempt)).toBeUndefined();
    second.close();
  });
});

describe('reconcile refuses tombstones', () => {
  const live = (
    tmuxId: string,
    tmuxName: string,
    gmuxId?: string
  ): LiveTmuxSession =>
    gmuxId === undefined ? { tmuxId, tmuxName } : { tmuxId, tmuxName, gmuxId };

  it('reports a live session carrying a tombstone identity as unknown, never adopts it', () => {
    row('tomb');
    store.markSessionRemoved('tomb', 1_000);
    const result = store.reconcile([live('$7', 'tomb', 'tomb')]);
    expect(result.unknownTmuxNames).toEqual(['tomb']);
    expect(result.alive).toEqual([]);
    expect(result.bindings.size).toBe(0);
    const rec = store.getSession('tomb');
    expect(rec?.status).toBe('discarded');
    expect(rec?.removedAt).toBe(1_000);
  });

  it('never marks an absent tombstone restorable', () => {
    row('tomb');
    store.markSessionRemoved('tomb', 1_000);
    const result = store.reconcile([]);
    expect(result.restorable).toEqual([]);
    expect(result.exited).toEqual([]);
    expect(store.getSession('tomb')?.status).toBe('discarded');
  });
});
