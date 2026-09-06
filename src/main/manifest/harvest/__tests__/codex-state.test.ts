/**
 * Phase 215 — reading codex's own state store, and the two promises that
 * matter more than the reading.
 *
 * The first is that Tortie never writes a byte into `~/.codex`. A read-only
 * open of a WAL database with no `-shm` beside it CREATES the `-shm`, measured
 * on this tree with better-sqlite3 itself, and his store is writable, so the
 * open is refused in exactly that state and the rollout parse answers instead.
 * That case is driven here with a real WAL database rather than asserted.
 *
 * The second is that the store is never the only voice. `unknown` is the
 * common answer, because the `thread_source` column post dates 25,038 of his
 * 25,973 rows, and the column ALONE misses 68 of his derived records while
 * `column OR edge` misses 2.
 */

import { mkdtempSync, existsSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  closeCodexState,
  codexHomeOfRollout,
  codexStateFor,
  codexStatePath,
  openCodexState,
  safeToOpenReadOnly
} from '../codex-state';

let home: string;

/** A codex home holding a state store with the shape he has. */
function writeStore(
  rows: {
    id: string;
    rollout_path?: string;
    cwd?: string;
    created_at_ms?: number;
    thread_source?: string | null;
  }[],
  edges: { parent_thread_id: string; child_thread_id: string; status?: string }[]
): string {
  const path = codexStatePath(home);
  const db = new Database(path);
  db.exec(
    `CREATE TABLE threads (id TEXT PRIMARY KEY, rollout_path TEXT, cwd TEXT,
        created_at_ms INTEGER, thread_source TEXT, agent_path TEXT,
        agent_nickname TEXT, agent_role TEXT, archived INTEGER DEFAULT 0);
     CREATE TABLE thread_spawn_edges (parent_thread_id TEXT,
        child_thread_id TEXT PRIMARY KEY, status TEXT);`
  );
  const insert = db.prepare(
    `INSERT INTO threads (id, rollout_path, cwd, created_at_ms, thread_source)
     VALUES (@id, @rollout_path, @cwd, @created_at_ms, @thread_source)`
  );
  for (const row of rows) {
    insert.run({
      rollout_path: null,
      cwd: null,
      created_at_ms: null,
      thread_source: null,
      ...row
    });
  }
  const edge = db.prepare(
    `INSERT INTO thread_spawn_edges (parent_thread_id, child_thread_id, status)
     VALUES (@parent_thread_id, @child_thread_id, @status)`
  );
  for (const e of edges) edge.run({ status: 'open', ...e });
  db.close();
  return path;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'p215-state-'));
});

afterEach(() => {
  closeCodexState();
  rmSync(home, { recursive: true, force: true });
});

describe('the store answers, and says so honestly when it cannot', () => {
  it('reads thread_source, an edge, and the row behind them', () => {
    writeStore(
      [
        { id: 'parent', thread_source: 'user', cwd: '/w', rollout_path: '/r/p.jsonl' },
        { id: 'child', thread_source: 'subagent', cwd: '/w' },
        // 66 of his edge children read NULL here, so the edge is what speaks.
        { id: 'legacy-child', thread_source: null, cwd: '/w' },
        { id: 'legacy', thread_source: null, cwd: '/w' }
      ],
      [
        { parent_thread_id: 'parent', child_thread_id: 'child' },
        { parent_thread_id: 'parent', child_thread_id: 'legacy-child' }
      ]
    );
    const reader = openCodexState(home);
    expect(reader).not.toBeNull();
    expect(reader?.derived('parent')).toBe('session');
    expect(reader?.derived('child')).toBe('derived');
    // THE COLUMN ALONE IS NOT ENOUGH. This one is derived by the edge only.
    expect(reader?.derived('legacy-child')).toBe('derived');
    // And a legacy row with neither is UNKNOWN, never 'session': 25,038 of his
    // rows are here, and calling them sessions would be the old bug with a
    // database behind it.
    expect(reader?.derived('legacy')).toBe('unknown');
    // An id the store has never heard of is unknown too.
    expect(reader?.derived('absent')).toBe('unknown');
    expect(reader?.parent('child')).toBe('parent');
    expect(reader?.parent('parent')).toBeNull();
    expect(reader?.thread('parent')).toMatchObject({
      cwd: '/w',
      rolloutPath: '/r/p.jsonl',
      threadSource: 'user'
    });
    reader?.close();
  });

  it('a missing store is null, not a throw', () => {
    expect(openCodexState(home)).toBeNull();
    expect(openCodexState(join(home, 'nope'))).toBeNull();
  });

  it('a file that is not a database is null, not a throw', () => {
    writeFileSync(codexStatePath(home), 'this is not sqlite');
    expect(openCodexState(home)).toBeNull();
  });

  it('a state_6 shape with no threads table degrades to null', () => {
    const db = new Database(codexStatePath(home));
    db.exec('CREATE TABLE conversations (id TEXT)');
    db.close();
    expect(openCodexState(home)).toBeNull();
  });

  it('a build with no thread_source column still answers from the edges', () => {
    const db = new Database(codexStatePath(home));
    db.exec(
      `CREATE TABLE threads (id TEXT PRIMARY KEY, cwd TEXT, created_at_ms INTEGER);
       CREATE TABLE thread_spawn_edges (parent_thread_id TEXT,
         child_thread_id TEXT PRIMARY KEY, status TEXT);
       INSERT INTO threads VALUES ('a', '/w', 1);
       INSERT INTO threads VALUES ('b', '/w', 2);
       INSERT INTO thread_spawn_edges VALUES ('a', 'b', 'open');`
    );
    db.close();
    const reader = openCodexState(home);
    expect(reader?.derived('b')).toBe('derived');
    expect(reader?.derived('a')).toBe('unknown');
    expect(reader?.thread('a')?.rolloutPath).toBeNull();
    reader?.close();
  });
});

describe('the -shm hazard, driven rather than asserted', () => {
  it('refuses to open a WAL database that has no -shm, and creates nothing', () => {
    // A live codex writing its store leaves a -wal. Copy the database and its
    // -wal without the -shm, which is the shape a read-only open would write
    // into, and the shape his own store is in whenever codex is running.
    const source = join(home, 'live.sqlite');
    const db = new Database(source);
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE threads (id TEXT PRIMARY KEY, thread_source TEXT)');
    db.prepare("INSERT INTO threads VALUES ('a', 'subagent')").run();
    const target = codexStatePath(home);
    copyFileSync(source, target);
    copyFileSync(`${source}-wal`, `${target}-wal`);
    db.close();

    expect(existsSync(`${target}-wal`)).toBe(true);
    expect(existsSync(`${target}-shm`)).toBe(false);
    expect(safeToOpenReadOnly(target)).toBe(false);
    expect(openCodexState(home)).toBeNull();
    // THE PROMISE: nothing appeared beside his file.
    expect(existsSync(`${target}-shm`)).toBe(false);
  });

  it('opens when the -shm is already there, which is what a running codex leaves', () => {
    const target = codexStatePath(home);
    const db = new Database(target);
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE threads (id TEXT PRIMARY KEY, thread_source TEXT)');
    db.prepare("INSERT INTO threads VALUES ('a', 'subagent')").run();
    expect(existsSync(`${target}-shm`)).toBe(true);
    expect(safeToOpenReadOnly(target)).toBe(true);
    const reader = openCodexState(home);
    expect(reader?.derived('a')).toBe('derived');
    reader?.close();
    db.close();
  });

  it('a checkpointed store with no -wal is safe to open', () => {
    writeStore([{ id: 'a', thread_source: 'subagent' }], []);
    expect(existsSync(`${codexStatePath(home)}-wal`)).toBe(false);
    expect(safeToOpenReadOnly(codexStatePath(home))).toBe(true);
  });
});

describe('finding the store from a rollout path', () => {
  it('walks up to sessions and to archived_sessions', () => {
    expect(
      codexHomeOfRollout('/h/.codex/sessions/2026/09/03/rollout-x-y.jsonl')
    ).toBe('/h/.codex');
    expect(
      codexHomeOfRollout('/h/.codex/archived_sessions/rollout-x-y.jsonl')
    ).toBe('/h/.codex');
    expect(codexHomeOfRollout('/h/somewhere/rollout-x-y.jsonl')).toBeNull();
  });

  it('the kept reader is one connection and closing it is idempotent', () => {
    writeStore([{ id: 'a', thread_source: 'subagent' }], []);
    const first = codexStateFor(home);
    expect(first).not.toBeNull();
    expect(codexStateFor(home)).toBe(first);
    first?.close();
    first?.close();
    // A closed reader answers unknown rather than throwing.
    expect(first?.derived('a')).toBe('unknown');
  });
});
