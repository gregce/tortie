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
    scope: 'whole',
    trigger: 'gesture',
    inputHash: null,
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
      suggestions: ['One thought.'],
      scope: 'whole',
      trigger: 'gesture',
      inputHash: null
    });
  });

  it('carries scope, trigger and the input hash, whatever the verdict (Phase 159)', () => {
    const hash = 'a'.repeat(64);
    store.appendPassRun(
      row({
        verdict: 'refused',
        reason: 'outside-drift',
        scope: 'drift',
        trigger: 'drift',
        inputHash: hash
      })
    );
    const latest = store.latestPassRun('k');
    expect(latest?.scope).toBe('drift');
    expect(latest?.trigger).toBe('drift');
    expect(latest?.inputHash).toBe(hash);
  });

  it('adds the three Phase 159 columns to a database Phase 158 migrated, and older rows read whole, gesture', async () => {
    store.close();
    const path = join(dir, 'arch.db');
    const raw = new ArchStore(path);
    raw.close();
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(path);
    db.exec('ALTER TABLE arch_pass_run DROP COLUMN scope');
    db.exec('ALTER TABLE arch_pass_run DROP COLUMN trigger');
    db.exec('ALTER TABLE arch_pass_run DROP COLUMN input_hash');
    db.exec('DROP TABLE arch_verdict_change');
    db.prepare('DELETE FROM migrations WHERE name = ?').run('006-arch-pass-scope');
    db.prepare(
      `INSERT INTO arch_pass_run
         (repo_key, repo_path, started_at, wall_ms, agent_id, model, recipe_version,
          verdict, reason, detail, painted, groups_total, components, suggestions)
       VALUES ('k', '/tmp/repo', 5, 1, 'claude', 'm', 1, 'kept', NULL, NULL, 1, 1, 1, '[]')`
    ).run();
    db.close();
    store = new ArchStore(path);
    const older = store.latestPassRun('k');
    expect(older?.scope).toBe('whole');
    expect(older?.trigger).toBe('gesture');
    expect(older?.inputHash).toBeNull();
    expect(store.verdictChanges('k')).toBeNull();
    store.appendPassRun(
      row({ startedAt: 9, scope: 'drift', trigger: 'ribbon', inputHash: 'b'.repeat(64) })
    );
    store.close();
    store = new ArchStore(path);
    expect(store.latestPassRun('k')?.trigger).toBe('ribbon');
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

describe('the verdict change burst (Phase 159)', () => {
  const burst = (toGeneration: number) => ({
    fromGeneration: toGeneration - 1,
    toGeneration,
    fromCommit: 'a'.repeat(40),
    toCommit: 'b'.repeat(40),
    at: 1234,
    verdicts: [
      {
        subjectId: 'edge:x',
        from: 'convergent' as const,
        to: 'divergent' as const,
        fromCoverage: 'checked' as const,
        toCoverage: 'checked' as const
      }
    ],
    parts: [{ componentId: 'core', commitsBehindDelta: 3, uncommittedFiles: 0 }]
  });

  const published = (
    generation: number,
    changes: ReturnType<typeof burst> | null | undefined
  ) =>
    store.publish({
      repoKey: 'k',
      repoPath: '/tmp/repo',
      generation,
      checkedAtCommit: 'b'.repeat(40),
      verdicts: [],
      freshness: [],
      counts: {
        checkedHold: 0,
        broke: 0,
        cannotCheck: 0,
        accepted: 0,
        unresolvedImports: 0,
        totalImports: 0
      },
      ...(changes === undefined ? {} : { changes })
    });

  it('answers null before any check moved anything', () => {
    expect(store.verdictChanges('k')).toBeNull();
  });

  it('is written by publish and read back whole', () => {
    expect(published(1, burst(1))).toBe(true);
    expect(store.verdictChanges('k')).toEqual(burst(1));
  });

  it('a publish with no burst keeps the last one on screen', () => {
    published(1, burst(1));
    published(2, null);
    published(3, undefined);
    expect(store.verdictChanges('k')?.toGeneration).toBe(1);
    published(4, burst(4));
    expect(store.verdictChanges('k')?.toGeneration).toBe(4);
  });

  it('a mangled row reads as null rather than crashing', async () => {
    published(1, burst(1));
    store.close();
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(join(dir, 'arch.db'));
    db.prepare("UPDATE arch_verdict_change SET rows = 'not json' WHERE repo_key = 'k'").run();
    db.close();
    store = new ArchStore(join(dir, 'arch.db'));
    expect(store.verdictChanges('k')).toBeNull();
  });

  it('is dropped with the repository by forgetRepo', () => {
    published(1, burst(1));
    store.forgetRepo('k');
    expect(store.verdictChanges('k')).toBeNull();
  });
});
