/**
 * Phase 33. What the manifest keeps about `launch.envPassthrough`, and what it
 * must never keep.
 *
 * The whole promise of the phase sits in this column. Option B in research 41
 * was rejected because it wrote provider keys into this database in plain
 * text, so the test that matters is not "does the round trip work" but "is the
 * value absent from the file on disk". Both are here, and the second one reads
 * the SQLite file as bytes rather than through the codec that wrote it.
 *
 * The store is exercised against a real on-disk SQLite file in a temp dir.
 * Nothing is mocked and no process is spawned.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ManifestStore, type ManifestSessionRecord } from '../store';
import { paneEnvFor } from '../../sessions/launch-plan';

/** A value that exists only in a resolved map, never in anything persisted. */
const SENTINEL = 'p33-sentinel-value-6f2a1c';

let dir: string;
let dbPath: string;
let store: ManifestStore;

function row(extra: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  const now = Date.now();
  return store.insertSession({
    id: 'p33',
    name: 'p33',
    tmuxName: 'p33',
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status: 'running',
    createdAt: now,
    argv: ['/bin/zsh'],
    lastSeen: now,
    ...extra
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-p33-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('the env_passthrough column', () => {
  it('round trips the names', () => {
    row({ envPassthrough: ['P33_A_NAME', 'P33_B_NAME'] });
    expect(store.getSession('p33')?.envPassthrough).toEqual([
      'P33_A_NAME',
      'P33_B_NAME'
    ]);
  });

  it('is absent, not empty, on a row that asked for nothing', () => {
    row();
    const rec = store.getSession('p33');
    expect(rec).toBeDefined();
    expect('envPassthrough' in (rec ?? {})).toBe(false);
  });

  it('writes NULL rather than an empty array', () => {
    row();
    store.close();
    const raw = new Database(dbPath, { readonly: true });
    try {
      const value = raw
        .prepare<[], { env_passthrough: string | null }>(
          'SELECT env_passthrough FROM sessions'
        )
        .get();
      expect(value?.env_passthrough).toBeNull();
    } finally {
      raw.close();
    }
    store = new ManifestStore(dbPath);
  });

  // THE PROMISE OF THE PHASE, checked against the bytes on disk. A resolved
  // value reaches the tmux `-e` set and nothing else. There is no API here
  // that could write one, and this reads the file to prove it rather than
  // trusting the codec that wrote it.
  it('never holds a resolved value, checked by reading the file', () => {
    row({ envPassthrough: ['P33_A_NAME'], env: { FORCE_COLOR: '1' } });
    // The one place the value does exist: the pane env, composed a moment
    // before the spawn and never persisted.
    const paneEnv = paneEnvFor({ FORCE_COLOR: '1' }, { P33_A_NAME: SENTINEL }, 'p33');
    expect(paneEnv['P33_A_NAME']).toBe(SENTINEL);
    store.close();
    const bytes = readFileSync(dbPath);
    expect(bytes.includes(Buffer.from(SENTINEL, 'utf8'))).toBe(false);
    // The name IS there, which is what makes the check above meaningful.
    expect(bytes.includes(Buffer.from('P33_A_NAME', 'utf8'))).toBe(true);
    store = new ManifestStore(dbPath);
  });

  // Written once, at create. The patch type excludes the field and the UPDATE
  // statement does not name the column, so an ordinary patch of a live row
  // leaves the confirmed set exactly as it was.
  it('survives an unrelated patch unchanged', () => {
    row({ envPassthrough: ['P33_A_NAME'] });
    store.updateSession('p33', { status: 'exited' });
    const rec = store.getSession('p33');
    expect(rec?.status).toBe('exited');
    expect(rec?.envPassthrough).toEqual(['P33_A_NAME']);
  });

  it('reads an unparseable column as no passthrough at all', () => {
    row({ envPassthrough: ['P33_A_NAME'] });
    store.close();
    const raw = new Database(dbPath);
    raw.prepare("UPDATE sessions SET env_passthrough = 'not json'").run();
    raw.close();
    store = new ManifestStore(dbPath);
    expect(store.getSession('p33')?.envPassthrough).toBeUndefined();
  });
});
