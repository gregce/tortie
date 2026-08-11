/**
 * The manifest column that answers "will this session come back with its
 * conversation?" (Phase 13.5, research 22 §4).
 *
 * The failure this guards against is not a crash — it is a lie. Before this
 * phase the only signal was `resumeArgv`, which is empty both while a harvest
 * is legitimately in flight and forever after a harvest has silently given
 * up. The user could not tell those apart until after a reboot, which is the
 * one moment at which the difference is unfixable.
 *
 * Exercised against a real on-disk SQLite file, migrations and all.
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
  dir = mkdtempSync(join(tmpdir(), 'gmux-resume-capture-'));
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
    argv: ['claude'],
    ...patch
  });
}

describe('resume capture state', () => {
  it('round-trips through SQLite and reaches the renderer projection', () => {
    insert('a', { resumeCapture: 'capturing' });
    const back = store.getSession('a');
    expect(back?.resumeCapture).toBe('capturing');
    expect(toSession(back as ManifestSessionRecord).resumeCapture).toBe(
      'capturing'
    );
  });

  it('arming an id and clearing "capturing" is ONE write', () => {
    insert('b', { agent: 'codex', argv: ['codex'], resumeCapture: 'capturing' });
    const armed = store.setAgentSessionId('b', 'the-uuid', [
      'codex',
      'resume',
      'the-uuid'
    ]);
    expect(armed.resumeCapture).toBe('armed');
    expect(armed.resumeArgv).toEqual(['codex', 'resume', 'the-uuid']);
    // A row that has an id but still reads 'capturing' would spin forever.
    expect(store.getSession('b')?.resumeCapture).toBe('armed');
  });

  it('an id with no usable argv is unavailable, not armed', () => {
    insert('c', { resumeCapture: 'capturing' });
    // registryResumeArgv returns [] rather than emit an id-less resume.
    expect(store.setAgentSessionId('c', 'id', []).resumeCapture).toBe(
      'unavailable'
    );
  });

  it('a harvest that gave up can withdraw its promise', () => {
    insert('d', { resumeCapture: 'capturing' });
    expect(store.setResumeCapture('d', 'unavailable').resumeCapture).toBe(
      'unavailable'
    );
  });

  it('survives an unrelated patch — updates must not blank the column', () => {
    insert('e', { resumeCapture: 'armed' });
    store.setStatus('e', 'idle');
    store.renameSession('e', 'renamed', 'renamed');
    expect(store.getSession('e')?.resumeCapture).toBe('armed');
  });

  /**
   * A row written before migration 004 has NULL here. It must read back as
   * undefined, not as a guess: inventing 'unavailable' would tell a user
   * their armed claude session comes back as a folder, and inventing 'armed'
   * would promise a conversation that is not there.
   */
  it('leaves pre-migration rows undefined rather than guessing', () => {
    insert('f');
    store.close();
    const raw = new Database(dbPath);
    raw.prepare('UPDATE sessions SET resume_capture = NULL').run();
    raw.close();
    store = new ManifestStore(dbPath);
    expect(store.getSession('f')?.resumeCapture).toBeUndefined();
  });

  it('ignores a value written by a newer schema', () => {
    insert('g', { resumeCapture: 'armed' });
    store.close();
    const raw = new Database(dbPath);
    raw.prepare("UPDATE sessions SET resume_capture = 'quantum'").run();
    raw.close();
    store = new ManifestStore(dbPath);
    expect(store.getSession('g')?.resumeCapture).toBeUndefined();
  });
});
