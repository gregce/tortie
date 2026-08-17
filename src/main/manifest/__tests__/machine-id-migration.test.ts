/**
 * Migration 013, `machine_id`, against a real manifest built at schema 12
 * (Phase 71, M4).
 *
 * ## Why it builds the old file rather than asserting on today's
 *
 * The claim migration 013 makes is about OTHER PEOPLE'S FILES: a manifest that
 * has been in use for months, holding rows in every shape the product can
 * produce, opened by a build that has a column their build never had. A test
 * that opens a fresh manifest at schema 13 and finds `machine_id = 'local'`
 * proves the INSERT, which is the easy half. So this file applies the first
 * twelve migrations, writes the seven row shapes a real manifest holds, and only
 * then lets the thirteenth run.
 *
 * ## The five things it asserts, in order
 *
 *  1. `PRAGMA user_version` reads 13.
 *  2. Every pre-existing row reads `machineId === 'local'`.
 *  3. Every other column on every row is what it was, compared FIELD BY FIELD
 *     rather than by row count, because a row count says nothing about whether a
 *     resume argv survived.
 *  4. The migration is idempotent: applying it twice leaves the same bytes.
 *  5. A row inserted after the migration carries `'local'`.
 *
 * And then the refusal, which is what keeps the migration additive: a record
 * naming any other machine is refused rather than written.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.34.0' }
}));

const { runMigrations } = await import('../../db/sqlite');
const { stampSchemaVersion } = await import('../../db/schema-version');
const {
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_IDENTITY,
  MANIFEST_SCHEMA_VERSION,
  MIGRATIONS
} = await import('../schema');
const { LOCAL_MACHINE_ROW } = await import('../codecs');
const { MACHINE_ID_NONLOCAL } = await import('../sessions-repository');
const { ManifestStore } = await import('../store');
const { LOCAL_MACHINE_ID } = await import('../../machines/context');

let root = '';
let dbPath = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-p71-machine-id-'));
  userData = root;
  dbPath = join(root, 'manifest.db');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The file this migration has to be right about
// ---------------------------------------------------------------------------

/** Every migration this build ships except the one under test. */
const UP_TO_012 = MIGRATIONS.filter((one) => one.name !== '013-machine-id');

/**
 * When the discarded row was removed.
 *
 * It is RECENT rather than one of the fixed instants below, because opening the
 * store runs `pruneDiscardedSessions`, which hard deletes a tombstone older than
 * ninety days. A fixed 2023 timestamp made the row vanish at open and the row
 * count came back one short, which is the store working exactly as designed.
 */
const REMOVED_AT = Date.now() - 60_000;

/**
 * The seven row shapes a real manifest holds, written straight through SQL so
 * the values are exactly what a build at schema 12 would have written. Going
 * through today's repository would write today's columns, which is the one thing
 * this test must not do.
 */
const ROWS: Record<string, unknown>[] = [
  {
    id: 'r-running',
    name: 'the running one',
    tmux_name: 'the-running-one',
    project_path: '/w/one',
    cwd: '/w/one',
    agent: 'claude',
    agent_session_id: '11111111-1111-4111-8111-111111111111',
    argv: JSON.stringify(['/opt/homebrew/bin/claude', '--model', 'opus']),
    resume_argv: JSON.stringify(['claude', '--resume', 'abc']),
    env: JSON.stringify({ CLAUDE_CONFIG_DIR: '/w/one/.claude' }),
    status: 'running',
    created_at: 1_700_000_000_000,
    last_seen: 1_700_000_500_000,
    resume_capture: 'armed',
    agent_version: '2.4.1',
    resume_provenance: JSON.stringify({ key: 'session-id', confidence: 'exact' })
  },
  {
    id: 'r-restorable',
    name: 'the saved one',
    tmux_name: 'the-saved-one',
    project_path: '/w/two',
    cwd: '/w/two',
    agent: 'codex',
    argv: JSON.stringify(['/opt/homebrew/bin/codex']),
    status: 'restorable',
    created_at: 1_700_000_100_000,
    last_seen: 1_700_000_200_000,
    resume_capture: 'unavailable'
  },
  {
    id: 'r-exited',
    name: 'the ended one',
    tmux_name: 'the-ended-one',
    project_path: '/w/three',
    cwd: '/w/three',
    agent: 'shell',
    argv: JSON.stringify(['/bin/zsh', '-l']),
    status: 'exited',
    created_at: 1_700_000_200_000,
    last_seen: 1_700_000_300_000,
    exit_signal: 'term',
    exit_code: null,
    exit_detail: 'ENOENT: node not found'
  },
  {
    id: 'r-discarded',
    name: 'the removed one',
    tmux_name: 'the-removed-one',
    project_path: '/w/four',
    cwd: '/w/four',
    agent: 'shell',
    argv: JSON.stringify(['/bin/zsh']),
    status: 'discarded',
    created_at: 1_700_000_300_000,
    last_seen: 1_700_000_400_000,
    removed_at: REMOVED_AT
  },
  {
    id: 'r-passthrough',
    name: 'the one with variables',
    tmux_name: 'the-one-with-variables',
    project_path: '/w/five',
    cwd: '/w/five',
    agent: 'claude',
    argv: JSON.stringify(['/opt/homebrew/bin/claude']),
    status: 'idle',
    created_at: 1_700_000_400_000,
    last_seen: 1_700_000_500_000,
    env_passthrough: JSON.stringify(['ANTHROPIC_API_KEY', 'HTTPS_PROXY'])
  },
  {
    id: 'r-contract',
    name: 'the one with a contract',
    tmux_name: 'the-one-with-a-contract',
    project_path: '/w/six',
    cwd: '/w/six',
    agent: 'claude',
    argv: JSON.stringify(['/opt/homebrew/bin/claude']),
    status: 'needs_input',
    created_at: 1_700_000_500_000,
    last_seen: 1_700_000_600_000,
    agent_contract: JSON.stringify({
      agent: 'claude',
      bin: '/opt/homebrew/bin/claude',
      resumeNeedsOriginalCwd: false,
      cwdReal: '/w/six',
      projectReal: '/w/six',
      at: 1_700_000_500_000
    })
  },
  {
    id: 'r-specstory',
    name: 'the captured one',
    tmux_name: 'the-captured-one',
    project_path: '/w/seven',
    cwd: '/w/seven',
    agent: 'claude',
    argv: JSON.stringify(['/opt/homebrew/bin/specstory', 'run', '-c', 'claude']),
    status: 'unknown',
    created_at: 1_700_000_600_000,
    last_seen: 1_700_000_700_000,
    pane_pid: 4242,
    specstory: JSON.stringify({
      enabled: true,
      bin: '/opt/homebrew/bin/specstory',
      binVersion: '1.2.3',
      provider: 'claude',
      exitCodeFidelity: 'exact',
      agentArgv: ['claude']
    })
  }
];

/** A manifest carrying migrations 001 to 012 and the rows above. */
function seedAtSchema12(): void {
  const db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
    runMigrations(db, UP_TO_012);
    stampSchemaVersion(
      db,
      { ...MANIFEST_SCHEMA_IDENTITY, version: 12 },
      '0.33.0'
    );
    for (const row of ROWS) {
      const names = Object.keys(row);
      db.prepare(
        `INSERT INTO sessions (${names.join(', ')}) VALUES (${names
          .map((one) => `@${one}`)
          .join(', ')})`
      ).run(row);
    }
    // One open restore attempt, because the journal is a second table the
    // migration must leave alone.
    db.prepare(
      `INSERT INTO restore_attempts (session_id, started_at, tmux_id)
       VALUES (?, ?, ?)`
    ).run('r-restorable', 1_700_000_450_000, '$7');
  } finally {
    db.close();
  }
}

/** Every column of every session row, read raw, ordered so two runs compare. */
function rawRows(): Record<string, unknown>[] {
  const db = new Database(dbPath, { readonly: true });
  try {
    return db
      .prepare('SELECT * FROM sessions ORDER BY id ASC')
      .all() as Record<string, unknown>[];
  } finally {
    db.close();
  }
}

function userVersion(): number {
  const db = new Database(dbPath, { readonly: true });
  try {
    return Number((db.pragma('user_version', { simple: true }) as number) ?? -1);
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// The numbers, declared
// ---------------------------------------------------------------------------

describe('the three compatibility numbers', () => {
  it('the schema version is the migration count, and both are 13', () => {
    expect(MANIFEST_SCHEMA_VERSION).toBe(13);
    expect(MIGRATIONS.length).toBe(13);
  });

  it('the last migration is 013-machine-id', () => {
    expect(MIGRATIONS.at(-1)?.name).toBe('013-machine-id');
  });

  /**
   * ADDITIVE, NOT BREAKING. The reason is written at the migration: an older
   * build writing NULL here produces a row the new build reads as local, and
   * every row an older build writes IS local, because no build older than this
   * one can create a session anywhere else.
   */
  it('the oldest build allowed to write this file is still 8', () => {
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(8);
  });

  /**
   * One definition of the word `local`. The manifest keeps its own copy so the
   * machine layer stays out of the import graph the contract inventory bundles,
   * and this is the assertion that stops the two drifting.
   */
  it('the manifest and the machine registry agree on the word local', () => {
    expect(LOCAL_MACHINE_ROW).toBe(LOCAL_MACHINE_ID);
  });
});

// ---------------------------------------------------------------------------
// The round trip
// ---------------------------------------------------------------------------

describe('a manifest built at schema 12, migrated', () => {
  it('migrates every row without changing anything but the new column', () => {
    seedAtSchema12();
    const before = rawRows();
    expect(before).toHaveLength(ROWS.length);
    // The file really is at 12 before the store opens it.
    expect(userVersion()).toBe(12);

    const store = new ManifestStore(dbPath);
    try {
      // 1. The version moved.
      expect(userVersion()).toBe(13);

      // 2. Every pre-existing row reads local.
      const records = store.listSessions();
      expect(records).toHaveLength(ROWS.length);
      for (const record of records) {
        expect(record.machineId).toBe('local');
      }

      // 3. Every other column, field by field.
      const after = rawRows();
      for (const [index, row] of before.entries()) {
        const now = after[index] ?? {};
        expect(now['id']).toBe(row['id']);
        for (const column of Object.keys(row)) {
          expect(
            { column, value: now[column] },
            `${String(row['id'])}.${column}`
          ).toEqual({ column, value: row[column] });
        }
        expect(now['machine_id']).toBe('local');
      }

      // The second table is untouched too.
      expect(store.listUnfinishedRestoreAttempts()).toHaveLength(1);
    } finally {
      store.close();
    }
  });

  /**
   * `/usr/bin/sqlite3 .recover` rebuilds from the FINAL schema, so a recovered
   * manifest can carry the column with no bookkeeping row for the migration.
   * The step describes the schema it wants rather than the change it makes, so
   * running it again is safe, and this is the assertion that says so.
   */
  it('is idempotent: a second application changes no byte', () => {
    seedAtSchema12();
    const first = new ManifestStore(dbPath);
    first.close();
    const afterOnce = rawRows();

    // Force the step to run again by deleting its bookkeeping row.
    const db = new Database(dbPath);
    db.prepare('DELETE FROM migrations WHERE name = ?').run('013-machine-id');
    db.close();

    const second = new ManifestStore(dbPath);
    second.close();
    expect(rawRows()).toEqual(afterOnce);
    expect(userVersion()).toBe(13);
  });

  it('a row inserted after the migration carries local', () => {
    seedAtSchema12();
    const store = new ManifestStore(dbPath);
    try {
      const written = store.insertSession({
        id: 'r-new',
        name: 'created today',
        tmuxName: 'created-today',
        projectPath: '/w/new',
        cwd: '/w/new',
        agent: 'shell',
        status: 'running',
        createdAt: 1_700_001_000_000,
        argv: ['/bin/zsh', '-l'],
        lastSeen: 1_700_001_000_000
      });
      // Both the returned record and the row on disk say the same thing.
      expect(written.machineId).toBe('local');
      expect(store.getSession('r-new')?.machineId).toBe('local');
    } finally {
      store.close();
    }
  });

  /**
   * A NULL that no backfill reached, which is what a `.recover` rebuild can
   * leave, reads as this Mac. That is the true answer for it.
   */
  it('reads a NULL column as local', () => {
    seedAtSchema12();
    const store = new ManifestStore(dbPath);
    store.close();

    const db = new Database(dbPath);
    db.prepare('UPDATE sessions SET machine_id = NULL WHERE id = ?').run(
      'r-running'
    );
    db.close();

    const reopened = new ManifestStore(dbPath);
    try {
      expect(reopened.getSession('r-running')?.machineId).toBe('local');
    } finally {
      reopened.close();
    }
  });
});

// ---------------------------------------------------------------------------
// The refusal that keeps the migration additive
// ---------------------------------------------------------------------------

/**
 * The minimum stays at 8, so a build at schema 12 may still write this file and
 * reads every row as a session on this Mac. That is correct only while every
 * value in the column is `local`, so the write of any other value is refused
 * rather than left to a later reader's judgement.
 */
describe('the refusal on a non local machine id', () => {
  it('refuses a record naming another machine, and writes no row', () => {
    const store = new ManifestStore(dbPath);
    try {
      expect(() =>
        store.insertSession({
          id: 'r-remote',
          name: 'on the studio',
          tmuxName: 'on-the-studio',
          projectPath: '/w/remote',
          cwd: '/w/remote',
          agent: 'claude',
          status: 'running',
          createdAt: 1_700_002_000_000,
          argv: ['/opt/homebrew/bin/claude'],
          lastSeen: 1_700_002_000_000,
          machineId: 'studio'
        })
      ).toThrow(new RegExp(MACHINE_ID_NONLOCAL.slice(0, 40)));
      expect(store.getSession('r-remote')).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it('accepts a record that states local, and one that states nothing', () => {
    const store = new ManifestStore(dbPath);
    try {
      store.insertSession({
        id: 'r-says-local',
        name: 'says local',
        tmuxName: 'says-local',
        projectPath: '/w/a',
        cwd: '/w/a',
        agent: 'shell',
        status: 'running',
        createdAt: 1_700_003_000_000,
        argv: ['/bin/zsh'],
        lastSeen: 1_700_003_000_000,
        machineId: 'local'
      });
      store.insertSession({
        id: 'r-says-nothing',
        name: 'says nothing',
        tmuxName: 'says-nothing',
        projectPath: '/w/b',
        cwd: '/w/b',
        agent: 'shell',
        status: 'running',
        createdAt: 1_700_003_100_000,
        argv: ['/bin/zsh'],
        lastSeen: 1_700_003_100_000
      });
      expect(store.getSession('r-says-local')?.machineId).toBe('local');
      expect(store.getSession('r-says-nothing')?.machineId).toBe('local');
    } finally {
      store.close();
    }
  });

  /**
   * The sentence a person reads. It says what Tortie will not do and what has to
   * change for it to do it, and it names no transport and no table.
   */
  it('the sentence names the fix rather than the mechanism', () => {
    expect(MACHINE_ID_NONLOCAL).toContain('another machine');
    expect(MACHINE_ID_NONLOCAL).toContain('oldest build allowed to write');
    expect(MACHINE_ID_NONLOCAL).not.toContain('—');
    expect(MACHINE_ID_NONLOCAL).not.toContain('machine_id');
  });
});
