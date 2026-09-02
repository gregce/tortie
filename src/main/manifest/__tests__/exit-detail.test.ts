/**
 * Phase 48, migration 012. What the manifest keeps about the last thing a dead
 * pane printed.
 *
 * Three claims are checked here, and the third is the one that is easy to
 * lose. The column round trips. A row written before the migration reads the
 * field as absent rather than as an empty string. And a restore that brings a
 * session back deletes the words along with the code and the signal, because
 * they describe a process that is no longer the one running.
 *
 * The store is exercised against a real on-disk SQLite file in a temp dir.
 * Nothing is mocked and no process is spawned.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ManifestStore, toSession, type ManifestSessionRecord } from '../store';
import {
  MANIFEST_MIGRATION_NAMES,
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_VERSION
} from '../schema';

/** What a real pane prints when its interpreter is missing. */
const LAST_WORDS =
  "env: node: No such file or directory\nclaude exited with status 127";

let dir: string;
let dbPath: string;
let store: ManifestStore;

function row(extra: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  const now = Date.now();
  return store.insertSession({
    id: 'p48',
    name: 'p48',
    tmuxName: 'p48',
    projectPath: '/w',
    cwd: '/w',
    agent: 'claude',
    status: 'running',
    createdAt: now,
    argv: ['/usr/local/bin/claude'],
    lastSeen: now,
    ...extra
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-p48-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('migration 012', () => {
  it('is the twelfth migration and the version counts it', () => {
    expect(MANIFEST_MIGRATION_NAMES).toHaveLength(MANIFEST_SCHEMA_VERSION);
    // Phase 71 appended 013-machine-id, Phase 72 appended
    // 014-machine-tombstone, Phase 90.3 appended 015-remote-projects, Phase 93
    // appended 016-project-tombstone and Phase 118 appended
    // 017-remote-executions, so the version reads 17 and this migration's own
    // position is what stays pinned.
    expect(MANIFEST_SCHEMA_VERSION).toBe(18);
    expect(MANIFEST_MIGRATION_NAMES[11]).toBe('012-exit-detail');
  });

  it('is declared ADDITIVE, so it never moved the minimum itself', () => {
    // NULL means "no last words were recorded", which is true of every row an
    // older build writes. Nothing on the restore path reads the column, so this
    // migration left the minimum where it found it.
    //
    // THE NUMBER MOVED IN PHASE 72 AND NOT BECAUSE OF THIS MIGRATION. Migration
    // 013's column started carrying real machine ids, which an older build
    // would read as sessions on this Mac, so the minimum went from 8 to 13. The
    // claim this case keeps is that 012 is additive, and the way to write that
    // now is that the minimum is below this migration's own number.
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(13);
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBeLessThan(
      MANIFEST_SCHEMA_VERSION
    );
  });

  it('adds exactly one column to sessions', () => {
    store.close();
    const raw = new Database(dbPath, { readonly: true });
    try {
      const names = (
        raw.pragma('table_info(sessions)') as { name: string }[]
      ).map((c) => c.name);
      expect(names).toContain('exit_detail');
    } finally {
      raw.close();
    }
    store = new ManifestStore(dbPath);
  });
});

describe('the exit_detail column', () => {
  it('round trips through insert, read, patch and read', () => {
    row({ exitDetail: 'written at insert' });
    expect(store.getSession('p48')?.exitDetail).toBe('written at insert');
    store.updateSession('p48', {
      status: 'exited',
      exitCode: 127,
      exitDetail: LAST_WORDS
    });
    const rec = store.getSession('p48');
    expect(rec?.exitCode).toBe(127);
    expect(rec?.exitDetail).toBe(LAST_WORDS);
  });

  it('travels with the shared Session projection', () => {
    row();
    store.updateSession('p48', {
      status: 'exited',
      exitCode: 127,
      exitDetail: LAST_WORDS
    });
    const rec = store.getSession('p48');
    expect(toSession(rec as ManifestSessionRecord).exitDetail).toBe(LAST_WORDS);
  });

  it('is absent, not empty, on an ordinary create', () => {
    row();
    const rec = store.getSession('p48');
    expect(rec).toBeDefined();
    expect('exitDetail' in (rec ?? {})).toBe(false);
  });

  it('writes NULL rather than an empty string', () => {
    row();
    store.close();
    const raw = new Database(dbPath, { readonly: true });
    try {
      const value = raw
        .prepare<[], { exit_detail: string | null }>(
          'SELECT exit_detail FROM sessions'
        )
        .get();
      expect(value?.exit_detail).toBeNull();
    } finally {
      raw.close();
    }
    store = new ManifestStore(dbPath);
  });

  // A row written by a build at schema 11 has no value here, and this build
  // must read that as "nothing was recorded" rather than as an empty message.
  // The fixture is this build's file minus exactly what migrations 012 and 013
  // added, which is one nullable column and one bookkeeping row each.
  it('reads a row written before the migration as absent', () => {
    const elevenPath = join(dir, 'eleven.db');
    const fresh = new ManifestStore(elevenPath);
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
      lastSeen: 1_000,
      exitCode: 1
    });
    fresh.close();

    const raw = new Database(elevenPath);
    raw.exec('ALTER TABLE sessions DROP COLUMN exit_detail');
    raw.exec('ALTER TABLE sessions DROP COLUMN machine_id');
    raw.exec('ALTER TABLE sessions DROP COLUMN machine_tombstone');
    raw.prepare("DELETE FROM migrations WHERE name = '012-exit-detail'").run();
    raw.prepare("DELETE FROM migrations WHERE name = '013-machine-id'").run();
    raw
      .prepare("DELETE FROM migrations WHERE name = '014-machine-tombstone'")
      .run();
    raw.pragma('user_version = 11');
    raw.close();

    const migrated = new ManifestStore(elevenPath);
    expect(migrated.schemaState().userVersion).toBe(18);
    expect(migrated.schemaState().minCompatible).toBe(13);
    const old = migrated.getSession('old-row');
    expect(old?.exitCode).toBe(1);
    expect(old?.exitDetail).toBeUndefined();
    // The column exists now, so this build can write it on the same row.
    migrated.updateSession('old-row', { exitDetail: LAST_WORDS });
    expect(migrated.getSession('old-row')?.exitDetail).toBe(LAST_WORDS);
    migrated.close();
  });

  // THE LINE THAT IS EASY TO MISS. `clearExitCause` deletes the code and the
  // signal so a restored session cannot show an old death. The pane's own
  // words are part of that death and they are the part a person reads, so a
  // clear that left them behind would put a message about a finished process
  // next to a live one.
  it('is cleared with exitCode and exitSignal when a restore brings the session back', () => {
    row();
    store.updateSession('p48', {
      status: 'exited',
      exitCode: 127,
      exitSignal: 'term',
      exitDetail: LAST_WORDS
    });
    const restored = store.updateSession(
      'p48',
      { status: 'running' },
      { clearExitCause: true }
    );
    expect(restored.exitCode).toBeUndefined();
    expect(restored.exitSignal).toBeUndefined();
    expect(restored.exitDetail).toBeUndefined();
    // And the clear reached the file, not just the returned object.
    const reread = store.getSession('p48');
    expect(reread?.exitDetail).toBeUndefined();
  });

  it('is cleared by the restore path itself, through setRestoreResult', () => {
    row();
    store.updateSession('p48', {
      status: 'exited',
      exitCode: 1,
      exitDetail: LAST_WORDS
    });
    store.setRestoreResult(
      'p48',
      { kind: 'armed', at: Date.now() },
      'running'
    );
    const rec = store.getSession('p48');
    expect(rec?.status).toBe('running');
    expect(rec?.exitCode).toBeUndefined();
    expect(rec?.exitDetail).toBeUndefined();
  });

  it('survives an unrelated patch unchanged', () => {
    row();
    store.updateSession('p48', { status: 'exited', exitDetail: LAST_WORDS });
    store.updateSession('p48', { lastSeen: 42 });
    expect(store.getSession('p48')?.exitDetail).toBe(LAST_WORDS);
  });
});

/**
 * PHASE 48 FIX ROUND. The second death, and the two holes it fell through.
 *
 * A row that dies once, is flipped back to 'running' by reconcile, and then
 * dies again in silence used to keep the FIRST death's sentence. Two things
 * were needed. The reaper has to be able to say "nothing", which no patch
 * could express, and the reconcile flip has to clear the exit cause the way
 * the restore path already did.
 */
describe('a row that dies twice', () => {
  it('lets a patch remove the words with null', () => {
    row();
    store.updateSession('p48', { status: 'exited', exitDetail: LAST_WORDS });
    const cleared = store.updateSession('p48', { exitDetail: null });
    expect(cleared.exitDetail).toBeUndefined();
    expect(store.getSession('p48')?.exitDetail).toBeUndefined();
  });

  it('does not confuse null with the empty string', () => {
    row();
    store.updateSession('p48', { status: 'exited', exitDetail: LAST_WORDS });
    store.updateSession('p48', { exitDetail: '' });
    // An empty string is not last words either, and the codec already reads it
    // back as absent. What matters is that it did not keep the old sentence.
    expect(store.getSession('p48')?.exitDetail).toBeUndefined();
  });

  it('shows the second death only, never the first', () => {
    row();
    // First death, with words.
    store.updateSession('p48', {
      status: 'exited',
      exitCode: 127,
      exitDetail: LAST_WORDS
    });
    // Reconcile finds it alive and flips it back, clearing the cause.
    store.updateSession('p48', { status: 'running' }, { clearExitCause: true });
    // Second death, silent. The reaper states the answer either way.
    store.updateSession('p48', {
      status: 'exited',
      exitCode: 2,
      exitDetail: null
    });
    const rec = store.getSession('p48');
    expect(rec?.exitCode).toBe(2);
    expect(rec?.exitDetail).toBeUndefined();
  });
});
