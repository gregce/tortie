/**
 * The pass record table (Phase 158): append only, newest read back whole,
 * and a row an older build or a hand edit mangled reads safe.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArchStore, type NewArchPassRow } from '../../db';

let dir = '';
let store: ArchStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-arch-pass-'));
  store = new ArchStore(join(dir, 'arch.db'));
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

function row(overrides: Partial<NewArchPassRow> = {}): NewArchPassRow {
  return {
    repoKey: 'k',
    repoPath: '/tmp/repo',
    startedAt: 1000,
    wallMs: 23050,
    agentId: 'claude',
    model: 'claude-haiku-4-5-20251001',
    recipeVersion: 1,
    verdict: 'kept',
    reason: null,
    detail: null,
    painted: 9,
    groupsTotal: 9,
    components: 9,
    suggestions: ['One thought.'],
    ...overrides
  };
}

describe('the pass record', () => {
  it('answers null before any pass ran', () => {
    expect(store.latestPassRun('k')).toBeNull();
  });

  it('reads the newest row back whole', () => {
    store.appendPassRun(row({ startedAt: 1000, verdict: 'refused', reason: 'bad-shape', painted: null, groupsTotal: null, components: null, suggestions: [] }));
    store.appendPassRun(row({ startedAt: 2000 }));
    const latest = store.latestPassRun('k');
    expect(latest).toEqual({
      startedAt: 2000,
      wallMs: 23050,
      agentId: 'claude',
      model: 'claude-haiku-4-5-20251001',
      recipeVersion: 1,
      verdict: 'kept',
      reason: null,
      detail: null,
      painted: 9,
      groupsTotal: 9,
      components: 9,
      suggestions: ['One thought.']
    });
  });

  it('carries the validator own sentence on a refused row', () => {
    const detail =
      'component src description carries 7777777, which is not in the facts';
    store.appendPassRun(
      row({ verdict: 'refused', reason: 'invented-number', detail, painted: null })
    );
    expect(store.latestPassRun('k')?.detail).toBe(detail);
  });

  it('adds the detail column to a database the first build already migrated', async () => {
    // The operator's own profile ran migration 004 before the sentence
    // travelled. Put this database back in that state, then reopen it: the
    // column arrives, the row round trips, and a second open changes nothing.
    store.close();
    const path = join(dir, 'arch.db');
    const raw = new ArchStore(path);
    raw.close();
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(path);
    db.exec('ALTER TABLE arch_pass_run DROP COLUMN detail');
    db.prepare("DELETE FROM migrations WHERE name = ?").run('005-arch-pass-detail');
    const before = (db.pragma('table_info(arch_pass_run)') as { name: string }[]).map((c) => c.name);
    db.close();
    expect(before).not.toContain('detail');
    store = new ArchStore(path);
    store.appendPassRun(row({ verdict: 'refused', reason: 'too-large', detail: 'the raw answer is over the byte ceiling' }));
    expect(store.latestPassRun('k')?.detail).toBe('the raw answer is over the byte ceiling');
    store.close();
    store = new ArchStore(path);
    expect(store.latestPassRun('k')?.detail).toBe('the raw answer is over the byte ceiling');
  });

  it('keys by repository, so two repositories never share a face', () => {
    store.appendPassRun(row({ repoKey: 'a', startedAt: 1 }));
    store.appendPassRun(row({ repoKey: 'b', startedAt: 2, verdict: 'failed', reason: 'no-binary' }));
    expect(store.latestPassRun('a')?.verdict).toBe('kept');
    expect(store.latestPassRun('b')?.verdict).toBe('failed');
  });

  it('is dropped with the repository by forgetRepo', () => {
    store.appendPassRun(row());
    store.forgetRepo('k');
    expect(store.latestPassRun('k')).toBeNull();
  });
});
