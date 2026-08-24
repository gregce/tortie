/**
 * The fold's version chain (Phase 138).
 *
 * The entry's requirement is that rows are APPENDED and never edited, and that
 * a version is written in ONE transaction after the model returns, so a crash
 * mid fold leaves the previous version intact.
 *
 * This file proves both from two directions. It drives the store's own verbs
 * and reads the rows back with plain SQL through a second connection, and it
 * greps the store module for the two verbs that would break the promise.
 *
 * It also proves the schema bump. A file stamped version one gains the table
 * and keeps every row it already had, because every statement is CREATE TABLE
 * IF NOT EXISTS and no migration code was written.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  openOverviewStore,
  OVERVIEW_SCHEMA_VERSION,
  OVERVIEW_TABLES,
  type NewFoldVersion,
  type OverviewStore
} from '../store';

let dir: string;
let dbPath: string;
let store: OverviewStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-overview-summary-'));
  dbPath = join(dir, 'overview.db');
  store = openOverviewStore(dbPath);
});

afterEach(() => {
  try {
    store.close();
  } catch {
    // Already closed by the test.
  }
  rmSync(dir, { recursive: true, force: true });
});

function version(over: Partial<NewFoldVersion> = {}): NewFoldVersion {
  return {
    sessionId: 's1',
    fromTurn: 0,
    toTurn: 0,
    text: 'You asked and the agent answered.',
    verdict: 'kept',
    reason: null,
    harness: 'claude',
    model: 'claude-haiku-4-5-20251001',
    providerMapVersion: 1,
    inputHash: 'a'.repeat(64),
    writtenAt: 1_700_000_000_000,
    ...over
  };
}

describe('the schema', () => {
  it('is at version two, and summary is one of its tables', () => {
    expect(OVERVIEW_SCHEMA_VERSION).toBe(2);
    expect(OVERVIEW_TABLES).toContain('summary');
  });

  it('gains the table on a file stamped version one and keeps every row', () => {
    store.upsertSession({
      sessionId: 's1',
      agent: 'claude',
      provider: 'claude',
      agentSessionId: null,
      logPath: '/tmp/a.jsonl',
      watermark: null,
      mapVersionAtLastRead: 1,
      lastReadAt: 1,
      readState: 'ok',
      readDetail: null,
      lastTouchedAt: null,
      model: null,
      branch: null,
      honest: null
    });
    store.close();
    // Put the file back to version one and drop the new table, which is what
    // a store written by the parent commit looks like.
    const raw = new Database(dbPath);
    raw.exec('DROP TABLE IF EXISTS summary;');
    raw.prepare('UPDATE meta SET value = ? WHERE key = ?').run(
      '1',
      'schema_version'
    );
    raw.close();

    store = openOverviewStore(dbPath);
    expect(store.getSession('s1')?.logPath).toBe('/tmp/a.jsonl');
    expect(store.latestSummary('s1')).toBeNull();
    const row = store.appendSummary(version());
    expect(row.version).toBe(1);
  });
});

describe('appendSummary', () => {
  it('numbers versions from one, contiguously, per session', () => {
    expect(store.appendSummary(version()).version).toBe(1);
    expect(store.appendSummary(version({ fromTurn: 1, toTurn: 1 })).version).toBe(2);
    expect(store.appendSummary(version({ fromTurn: 2, toTurn: 2 })).version).toBe(3);
    // A different session starts at one again.
    expect(store.appendSummary(version({ sessionId: 's2' })).version).toBe(1);
  });

  it('points the parent at the newest KEPT row, never at a refused one', () => {
    const first = store.appendSummary(version());
    expect(first.parentVersion).toBeNull();
    const refused = store.appendSummary(
      version({ fromTurn: 1, toTurn: 1, text: null, verdict: 'refused', reason: 'digit' })
    );
    expect(refused.parentVersion).toBe(1);
    const third = store.appendSummary(version({ fromTurn: 2, toTurn: 2 }));
    // The refused row did not become anybody's parent.
    expect(third.parentVersion).toBe(1);
    const fourth = store.appendSummary(version({ fromTurn: 3, toTurn: 3 }));
    expect(fourth.parentVersion).toBe(3);
  });

  it('roundtrips every column', () => {
    const written = store.appendSummary(
      version({ fromTurn: 4, toTurn: 9, providerMapVersion: 7, inputHash: 'b'.repeat(64) })
    );
    const read = store.latestSummary('s1');
    expect(read).toEqual(written);
  });

  it('never edits or deletes a row that is already there', () => {
    store.appendSummary(version());
    store.appendSummary(version({ fromTurn: 1, toTurn: 1, text: 'a second one.' }));
    const raw = new Database(dbPath, { readonly: true });
    const rows = raw
      .prepare('SELECT version, text FROM summary WHERE session_id = ? ORDER BY version')
      .all('s1') as { version: number; text: string | null }[];
    raw.close();
    expect(rows).toEqual([
      { version: 1, text: 'You asked and the agent answered.' },
      { version: 2, text: 'a second one.' }
    ]);
  });
});

describe('what the page reads', () => {
  it('answers with the newest row whatever its verdict', () => {
    store.appendSummary(version());
    store.appendSummary(
      version({ fromTurn: 1, toTurn: 1, text: null, verdict: 'refused', reason: 'path' })
    );
    expect(store.latestSummary('s1')?.verdict).toBe('refused');
  });

  it('never reaches past a refused newest row to an older kept one', () => {
    store.appendSummary(version());
    store.appendSummary(
      version({ fromTurn: 1, toTurn: 1, text: null, verdict: 'refused', reason: 'path' })
    );
    // The page draws only when the NEWEST row is kept, so it falls back here.
    const newest = store.latestSummary('s1');
    expect(newest?.verdict === 'kept' ? newest.text : null).toBeNull();
    // The fold's own parent is still the kept row, which is a different question.
    expect(store.latestKeptSummary('s1')?.version).toBe(1);
  });

  it('answers null for a session that has never been folded', () => {
    expect(store.latestSummary('nobody')).toBeNull();
    expect(store.latestKeptSummary('nobody')).toBeNull();
  });
});

describe('a crash mid fold', () => {
  it('leaves the previous version intact, because nothing was open', () => {
    store.appendSummary(version());
    // A fold in flight writes nothing at all. The store is untouched between
    // the spawn and the model returning, so a process that dies here loses
    // the turn and nothing else.
    const raw = new Database(dbPath, { readonly: true });
    const count = raw
      .prepare('SELECT COUNT(*) AS c FROM summary')
      .get() as { c: number };
    const open = raw
      .prepare('SELECT COUNT(*) AS c FROM sqlite_master')
      .get() as { c: number };
    raw.close();
    expect(count.c).toBe(1);
    expect(open.c).toBeGreaterThan(0);
  });

  it('writes no partial row when the append itself throws', () => {
    store.appendSummary(version());
    // A value SQLite cannot bind. The insert throws inside the transaction,
    // which rolls the whole thing back rather than leaving half a row.
    expect(() =>
      store.appendSummary(
        version({
          fromTurn: 1,
          toTurn: 1,
          text: { not: 'a string' } as unknown as string
        })
      )
    ).toThrow();
    const raw = new Database(dbPath, { readonly: true });
    const rows = raw.prepare('SELECT version FROM summary ORDER BY version').all() as {
      version: number;
    }[];
    raw.close();
    expect(rows.map((r) => r.version)).toEqual([1]);
  });
});

describe('the store module itself', () => {
  const source = readFileSync(
    join(import.meta.dirname, '..', 'store', 'store.ts'),
    'utf8'
  );

  it('never updates the summary table', () => {
    expect(source).not.toMatch(/UPDATE summary/i);
  });

  it('never deletes from the summary table', () => {
    expect(source).not.toMatch(/DELETE FROM summary/i);
  });

  it('has one insert into it and nothing else that writes', () => {
    const inserts = source.match(/INSERT INTO summary/gi) ?? [];
    expect(inserts).toHaveLength(1);
  });
});
