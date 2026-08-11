/**
 * The manifest column that makes a RESTORED session keep capturing
 * (Phase 15, research 13 §3.1).
 *
 * The promise under test is narrow and load-bearing: a session created with
 * SpecStory capture ON must come back captured after a quit, a crash or a
 * reboot — with the SAME binary it launched under, wrapping the SAME agent
 * argv, resuming the SAME conversation. Every one of those facts lives in this
 * column, because none of them can be recovered from the wrapped `argv`:
 * re-splitting a `-c` string is the lossy direction (see specstory/wrap.ts),
 * and the binary that `specstory` resolves to today may not be the one this
 * session started with.
 *
 * Exercised against a real on-disk SQLite file, migrations and all — the
 * upgrade path matters as much as the write, since every pre-Phase-15 row
 * arrives here with a NULL in this column.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { ManifestStore, toSession, type ManifestSessionRecord } from '../store';
import type { SpecstoryCaptureRecord } from '../../specstory/capture';
import { wrapWithRecord } from '../../specstory/capture';

let dir: string;
let dbPath: string;
let store: ManifestStore;

const BIN = '/Applications/gmux.app/Contents/Resources/bin/specstory';
const UUID = '550e8400-e29b-41d4-a716-446655440000';

const CAPTURE: SpecstoryCaptureRecord = {
  enabled: true,
  bin: BIN,
  binVersion: '2.8.0',
  provider: 'claude',
  exitCodeFidelity: 'exact',
  agentArgv: ['/Users/g/.local/bin/claude', '--dangerously-skip-permissions']
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-specstory-capture-'));
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
    status: 'running',
    createdAt: now,
    lastSeen: now,
    argv: [BIN, 'run', 'claude', '--no-version-check', '--silent', '-c', 'claude'],
    ...patch
  });
}

describe('specstory capture in the manifest', () => {
  it('round-trips every field a restore needs', () => {
    insert('a', { specstory: CAPTURE });
    const back = store.getSession('a');
    expect(back?.specstory).toEqual(CAPTURE);
  });

  it('reaches the renderer as facts it may act on — including the exit-code caveat', () => {
    insert('b', { specstory: CAPTURE });
    const exact = toSession(store.getSession('b') as ManifestSessionRecord);
    expect(exact.capture).toEqual({
      provider: 'claude',
      bin: BIN,
      binVersion: '2.8.0',
      exitCodeApproximate: false
    });

    // codex/droid/deepseek/antigravity collapse every non-zero agent exit to
    // 1 through the wrapper (MEASURED: a child exiting 42 comes back 1). The
    // renderer has to know not to present that as the agent's own code.
    insert('c', {
      specstory: { ...CAPTURE, provider: 'codex', exitCodeFidelity: 'collapsed' }
    });
    const collapsed = toSession(store.getSession('c') as ManifestSessionRecord);
    expect(collapsed.capture?.exitCodeApproximate).toBe(true);
  });

  it('an uncaptured session carries nothing — the renderer sees no capture at all', () => {
    insert('d', { argv: ['claude'] });
    const session = toSession(store.getSession('d') as ManifestSessionRecord);
    expect(session.capture).toBeUndefined();
    expect(store.getSession('d')?.specstory).toBeUndefined();
  });

  it('survives a reopen of the database — this IS the reboot case', () => {
    insert('e', { specstory: CAPTURE });
    store.close();
    store = new ManifestStore(dbPath);
    const back = store.getSession('e');
    expect(back?.specstory).toEqual(CAPTURE);
    // And the recorded record still composes the wrap that keeps capturing.
    expect(
      wrapWithRecord(back?.specstory as SpecstoryCaptureRecord, [
        'claude',
        '--resume',
        UUID,
        '--dangerously-skip-permissions'
      ])
    ).toEqual([
      BIN,
      'run',
      'claude',
      '--no-version-check',
      '--silent',
      '-c',
      `claude --resume ${UUID} --dangerously-skip-permissions`
    ]);
  });

  it('a harvested resume argv is stored WRAPPED, so a restore relaunches captured', () => {
    insert('f', { specstory: CAPTURE });
    const inner = ['/Users/g/.local/bin/claude', '--resume', UUID];
    const wrapped = wrapWithRecord(CAPTURE, inner) as string[];
    const armed = store.setAgentSessionId('f', UUID, wrapped);
    expect(armed.resumeArgv).toEqual(wrapped);
    expect(store.getSession('f')?.resumeArgv?.[0]).toBe(BIN);
    // The unwrapped agent argv is still there — the only non-lossy source for
    // re-composing anything later.
    expect(store.getSession('f')?.specstory?.agentArgv).toEqual(CAPTURE.agentArgv);
  });

  it('a local-only session stays local-only when it comes back', () => {
    // The no-cloud opt-out is recorded per session, not re-read from the
    // environment at restore — otherwise a session created under it would
    // silently gain a cloud upload the next time gmux started without it.
    insert('n', { specstory: { ...CAPTURE, noCloud: true } });
    store.close();
    store = new ManifestStore(dbPath);
    const back = store.getSession('n')?.specstory as SpecstoryCaptureRecord;
    expect(back.noCloud).toBe(true);
    expect(wrapWithRecord(back, ['claude'])).toContain('--no-cloud-sync');
    expect(wrapWithRecord(CAPTURE, ['claude'])).not.toContain('--no-cloud-sync');
  });

  it('drops a corrupt record whole rather than restoring half a wrap', () => {
    insert('g');
    const db = new Database(dbPath);
    // A record missing the binary cannot compose any launch; a session that
    // restores UNCAPTURED is the honest degradation, and it must not throw.
    db.prepare('UPDATE sessions SET specstory = ? WHERE id = ?').run(
      JSON.stringify({ enabled: true, provider: 'claude', agentArgv: ['claude'] }),
      'g'
    );
    db.prepare('INSERT INTO sessions (id, name, tmux_name, project_path, cwd, agent, argv, status, created_at, last_seen, specstory) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
      'h', 'h', 'h', '/p', '/p', 'claude', JSON.stringify(['claude']), 'running', Date.now(), Date.now(), 'not json at all'
    );
    db.close();
    store.close();
    store = new ManifestStore(dbPath);
    expect(store.getSession('g')?.specstory).toBeUndefined();
    expect(store.getSession('h')?.specstory).toBeUndefined();
    expect(toSession(store.getSession('g') as ManifestSessionRecord).capture).toBeUndefined();
  });

  it('upgrades a pre-Phase-15 database: old rows arrive uncaptured, not broken', () => {
    // A manifest written before migration 005 has no `specstory` column at
    // all. Dropping it and reopening is the closest reproduction that does
    // not require shipping an old binary.
    insert('i');
    store.close();
    const db = new Database(dbPath);
    db.exec('ALTER TABLE sessions DROP COLUMN specstory;');
    db.prepare('DELETE FROM migrations WHERE name = ?').run('005-specstory-capture');
    db.close();
    store = new ManifestStore(dbPath);
    const back = store.getSession('i');
    expect(back?.specstory).toBeUndefined();
    // …and the column is back, so a capture written now persists.
    store.updateSession('i', { specstory: CAPTURE });
    expect(store.getSession('i')?.specstory).toEqual(CAPTURE);
  });
});
