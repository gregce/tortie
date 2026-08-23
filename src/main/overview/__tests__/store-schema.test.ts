/**
 * The overview store's schema contract (Phase 137).
 *
 * What this pins down:
 * - The file is created where the caller said, with the four tables plus
 *   meta, stamped at OVERVIEW_SCHEMA_VERSION.
 * - Reopening keeps rows. The schema run is additive on an equal or lower
 *   version.
 * - A file stamped with a HIGHER version was written by a newer build. The
 *   store is disposable, so it is dropped and recreated empty rather than
 *   guessed at.
 * - The rebuild path: delete the file, open again, and the store comes back
 *   empty and writable. The cost is stated in the module header, being the
 *   turns whose provider has since deleted them.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  OVERVIEW_SCHEMA_VERSION,
  openOverviewStore,
  type StoredSession
} from '../store';

let dir: string;
let dbPath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-overview-schema-'));
  dbPath = join(dir, 'overview.db');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function sessionRow(id: string): StoredSession {
  return {
    sessionId: id,
    agent: 'claude',
    provider: 'claude',
    agentSessionId: '11111111-2222-4333-8444-555555555555',
    logPath: '/scratch/log.jsonl',
    watermark: null,
    mapVersionAtLastRead: 1,
    lastReadAt: 1_000,
    readState: 'ok',
    readDetail: null,
    lastTouchedAt: '2026-08-20T10:00:00Z',
    model: 'claude-fable-5',
    branch: 'main',
    honest: null
  };
}

function tableNames(path: string): string[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
      )
      .all()
      .map((r) => r.name);
  } finally {
    db.close();
  }
}

function columnNames(path: string, table: string): string[] {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const rows = db.pragma(`table_info(${table})`) as { name: string }[];
    return rows.map((r) => r.name);
  } finally {
    db.close();
  }
}

describe('overview store schema', () => {
  it('creates the four tables plus meta at the given path and stamps the version', () => {
    const store = openOverviewStore(dbPath);
    expect(store.path).toBe(dbPath);
    store.close();

    expect(existsSync(dbPath)).toBe(true);
    const names = tableNames(dbPath);
    for (const t of ['session', 'turn', 'turn_fact', 'provider_map', 'meta']) {
      expect(names).toContain(t);
    }

    const db = new Database(dbPath, { readonly: true });
    const row = db
      .prepare<[], { value: string }>(
        "SELECT value FROM meta WHERE key = 'schema_version'"
      )
      .get();
    db.close();
    expect(row?.value).toBe(String(OVERVIEW_SCHEMA_VERSION));
  });

  it('holds the exact columns the spec wrote for every table', () => {
    openOverviewStore(dbPath).close();
    expect(columnNames(dbPath, 'session')).toEqual([
      'session_id',
      'agent',
      'provider',
      'agent_session_id',
      'log_path',
      'watermark',
      'map_version_at_last_read',
      'last_read_at',
      'read_state',
      'read_detail',
      'last_touched_at',
      'model',
      'branch',
      'honest'
    ]);
    expect(columnNames(dbPath, 'turn')).toEqual([
      'session_id',
      'turn_index',
      'ask_text',
      'ask_at',
      'answer_text',
      'answer_at',
      'queued',
      'closed'
    ]);
    expect(columnNames(dbPath, 'turn_fact')).toEqual([
      'session_id',
      'turn_index',
      'interrupted',
      'notice',
      'stop_reason',
      'duration_ms',
      'paths',
      'path_source',
      'git_verdict',
      'git_checked_at'
    ]);
    expect(columnNames(dbPath, 'provider_map')).toEqual([
      'provider',
      'map_version',
      'map_hash',
      'recorded_at'
    ]);
  });

  it('never touches a manifest shaped schema: no sessions, projects or migrations table', () => {
    openOverviewStore(dbPath).close();
    const names = tableNames(dbPath);
    expect(names).not.toContain('sessions');
    expect(names).not.toContain('projects');
    expect(names).not.toContain('migrations');
    expect(names).not.toContain('restore_attempts');
  });

  it('keeps rows across a close and reopen', () => {
    const store = openOverviewStore(dbPath);
    store.upsertSession(sessionRow('s-1'));
    store.close();

    const again = openOverviewStore(dbPath);
    const row = again.getSession('s-1');
    again.close();
    expect(row?.agent).toBe('claude');
    expect(row?.lastReadAt).toBe(1_000);
  });

  it('drops and recreates a file stamped with a higher version, because the store is disposable', () => {
    const store = openOverviewStore(dbPath);
    store.upsertSession(sessionRow('s-old'));
    store.close();

    const raw = new Database(dbPath);
    raw
      .prepare("UPDATE meta SET value = ? WHERE key = 'schema_version'")
      .run(String(OVERVIEW_SCHEMA_VERSION + 1));
    raw.close();

    const reopened = openOverviewStore(dbPath);
    expect(reopened.getSession('s-old')).toBeNull();
    reopened.close();

    const db = new Database(dbPath, { readonly: true });
    const row = db
      .prepare<[], { value: string }>(
        "SELECT value FROM meta WHERE key = 'schema_version'"
      )
      .get();
    db.close();
    expect(row?.value).toBe(String(OVERVIEW_SCHEMA_VERSION));
  });

  it('rebuilds after the file is deleted: empty schema, then a full write refills it', () => {
    const store = openOverviewStore(dbPath);
    store.upsertSession(sessionRow('s-1'));
    store.replaceTurnsFrom(
      's-1',
      0,
      [
        {
          index: 0,
          ask: { text: 'first ask', at: '2026-08-20T10:00:00Z', queued: 1 },
          answer: { text: 'first answer', at: '2026-08-20T10:01:00Z' },
          closed: true,
          interrupted: false,
          notice: null,
          stopReason: 'end_turn',
          durationMs: 60_000,
          paths: [],
          pathSource: 'text-only'
        }
      ],
      null,
      1,
      2_000
    );
    expect(store.countTurns('s-1')).toBe(1);
    store.close();

    // The delete. The WAL and shm sidecars go with the file, the way a
    // person deleting the store in Finder would take all three.
    rmSync(dbPath, { force: true });
    rmSync(`${dbPath}-wal`, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
    expect(existsSync(dbPath)).toBe(false);

    // The rebuild: open again, find nothing, and refill with a full read.
    const rebuilt = openOverviewStore(dbPath);
    expect(rebuilt.getSession('s-1')).toBeNull();
    expect(rebuilt.countTurns('s-1')).toBe(0);

    rebuilt.upsertSession(sessionRow('s-1'));
    rebuilt.replaceTurnsFrom(
      's-1',
      0,
      [
        {
          index: 0,
          ask: { text: 'first ask', at: '2026-08-20T10:00:00Z', queued: 1 },
          answer: { text: 'first answer', at: '2026-08-20T10:01:00Z' },
          closed: true,
          interrupted: false,
          notice: null,
          stopReason: 'end_turn',
          durationMs: 60_000,
          paths: [],
          pathSource: 'text-only'
        }
      ],
      null,
      1,
      3_000
    );
    const turns = rebuilt.listTurns('s-1');
    rebuilt.close();
    expect(turns).toHaveLength(1);
    expect(turns[0]?.askText).toBe('first ask');
    expect(turns[0]?.answerText).toBe('first answer');
  });
});
