/**
 * Migration 009 — the launch context snapshot column, and the compatibility
 * decision that ships with it (Phase 22, research 29 §8.2).
 *
 * ## The claim these cases exist to hold
 *
 * Migration 009 is ADDITIVE where migration 008 was BREAKING, and the two
 * words do not mean "the SQL shape differs". Both add nullable columns and
 * both leave an old build's `INSERT` working. The difference is what an old
 * build's NULL MEANS.
 *
 * For `agent_contract` a NULL is a row that restores by asking today's
 * registry about a session that launched last month, and for a pi shaped agent
 * that produces an empty session which looks resumed. That is a wrong answer,
 * so the minimum moved.
 *
 * For `context_snapshot` a NULL is a session Tortie has no record of, which is
 * exactly what a session created by a build that does not write the column is.
 * The readout has a sentence for it. Nothing on the restore path reads it. So
 * the version moved and the minimum did not, and that is what
 * `MANIFEST_MIN_COMPATIBLE_VERSION` staying at 8 is asserting.
 *
 * ## The other three things being held
 *
 * A record survives a round trip through an unrelated write, because
 * `updateSession` rewrites every column and a codec that rebuilt a subset
 * would erase a newer build's fields on the first rename.
 *
 * An unreadable value becomes nothing rather than half a list, because half a
 * list is a list of what the session loaded with rows silently missing.
 *
 * Deleting the session deletes the record, which is rule 4 of research 29
 * §8.2, and the reason the snapshot is a column rather than a table.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import {
  MANIFEST_MIGRATION_NAMES,
  MANIFEST_MIN_COMPATIBLE_VERSION,
  MANIFEST_SCHEMA_VERSION,
  ManifestStore,
  type ManifestSessionRecord
} from '../store';
import {
  parseContextSnapshot,
  serializeContextSnapshot
} from '../context-snapshot';
import { captureAndStore, setContextResolver } from '../../context/snapshot';
import {
  CONTEXT_SNAPSHOT_MAX_BYTES,
  CONTEXT_SNAPSHOT_MAX_ENTRIES,
  CONTEXT_SNAPSHOT_VERSION,
  type ContextSnapshot,
  type ContextSnapshotEntry
} from '@shared/context-snapshot';

let dir: string;
let dbPath: string;
let store: ManifestStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-context-snapshot-'));
  dbPath = join(dir, 'manifest.db');
  store = new ManifestStore(dbPath);
});

afterEach(() => {
  try {
    store.close();
  } catch {
    /* a test that closed it itself */
  }
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function entry(
  id: string,
  patch: Partial<ContextSnapshotEntry> = {}
): ContextSnapshotEntry {
  return {
    id,
    category: 'skill',
    name: id,
    scope: 'global',
    sourcePath: `/Users/x/.agents/skills/${id}/SKILL.md`,
    hash: 'aaaaaaaaaaaaaaaa',
    ...patch
  };
}

function snapshot(patch: Partial<ContextSnapshot> = {}): ContextSnapshot {
  return {
    v: CONTEXT_SNAPSHOT_VERSION,
    at: 1_700_000_000_000,
    reason: 'create',
    agent: 'claude',
    cwd: '/Users/x/work/repo',
    entries: [entry('impeccable'), entry('govuk-style')],
    ...patch
  };
}

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

// ---------------------------------------------------------------------------
// The migration and the numbers
// ---------------------------------------------------------------------------

describe('migration 009', () => {
  it('adds one column to sessions', () => {
    const raw = new Database(dbPath, { readonly: true });
    try {
      const names = (
        raw.pragma('table_info(sessions)') as { name: string }[]
      ).map((c) => c.name);
      expect(names).toContain('context_snapshot');
    } finally {
      raw.close();
    }
  });

  it('is the ninth migration, and the schema version has kept counting', () => {
    expect(MANIFEST_MIGRATION_NAMES).toHaveLength(MANIFEST_SCHEMA_VERSION);
    // Phase 29 appended migration 010, Phase 33 appended 011, Phase 48
    // appended 012 and Phase 71 appended 013, so the version moved to 13 and
    // this migration's own position is what stays pinned.
    expect(MANIFEST_SCHEMA_VERSION).toBe(13);
    expect(MANIFEST_MIGRATION_NAMES[8]).toBe('009-context-snapshot');
  });

  it('is declared ADDITIVE, so the minimum stayed where 008 left it', () => {
    // The whole compatibility decision, in one line. See the file header for
    // why "additive" here is a statement about meaning and not about SQL.
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBe(8);
    expect(MANIFEST_MIN_COMPATIBLE_VERSION).toBeLessThan(
      MANIFEST_SCHEMA_VERSION
    );
  });

  it('lets a build at schema 8 keep opening and writing the file', () => {
    // The refusal reads the MINIMUM, not the version. A build that understands
    // format 8 is entitled to this file, and the sessions it creates carry a
    // NULL snapshot, which reads as unrecorded rather than as wrong.
    store.close();
    const raw = new Database(dbPath, { readonly: true });
    try {
      const min = raw
        .prepare<[string], { value: string }>(
          'SELECT value FROM meta WHERE key = ?'
        )
        .get('min_compatible_version');
      expect(Number(min?.value)).toBe(8);
    } finally {
      raw.close();
    }
    store = new ManifestStore(dbPath);
  });
});

// ---------------------------------------------------------------------------
// The column round trip
// ---------------------------------------------------------------------------

describe('the column', () => {
  it('is NULL on a row nobody snapshotted, and reads as undefined', () => {
    insert('a');
    expect(store.getSession('a')?.contextSnapshot).toBeUndefined();
  });

  it('stores and reads back a record whole', () => {
    insert('a');
    store.setContextSnapshot('a', snapshot());
    const read = store.getSession('a')?.contextSnapshot;
    expect(read).toEqual(snapshot());
  });

  it('survives an unrelated write, e.g. a rename', () => {
    // `updateSession` rewrites every column. A codec that rebuilt a subset
    // would erase the record here.
    insert('a');
    store.setContextSnapshot('a', snapshot());
    store.renameSession('a', 'renamed', 'renamed');
    expect(store.getSession('a')?.contextSnapshot).toEqual(snapshot());
  });

  it('keeps a field a newer build added', () => {
    insert('a');
    const withExtra = {
      ...snapshot(),
      somethingLater: { kind: 'a field this build has never seen' }
    } as unknown as ContextSnapshot;
    store.setContextSnapshot('a', withExtra);
    store.setStatus('a', 'restorable');
    const read = store.getSession('a')?.contextSnapshot as unknown as Record<
      string,
      unknown
    >;
    expect(read['somethingLater']).toEqual({
      kind: 'a field this build has never seen'
    });
  });

  it('keeps a field a newer build added to an ENTRY', () => {
    insert('a');
    const rich = {
      ...snapshot(),
      entries: [{ ...entry('a'), tokens: 812 }]
    } as unknown as ContextSnapshot;
    store.setContextSnapshot('a', rich);
    store.setStatus('a', 'restorable');
    const read = store.getSession('a')?.contextSnapshot;
    expect((read?.entries[0] as unknown as Record<string, unknown>)['tokens'])
      .toBe(812);
  });

  it('is overwritten by a restore, which is the one non write-once case', () => {
    insert('a');
    store.setContextSnapshot('a', snapshot());
    const after = snapshot({
      reason: 'restore',
      at: 1_700_000_500_000,
      entries: [entry('impeccable')]
    });
    store.setContextSnapshot('a', after);
    expect(store.getSession('a')?.contextSnapshot).toEqual(after);
  });

  it('goes away with the session, which is why it is a column', () => {
    insert('a');
    store.setContextSnapshot('a', snapshot());
    store.deleteSession('a');
    expect(store.getSession('a')).toBeUndefined();
    const raw = new Database(dbPath, { readonly: true });
    try {
      const left = raw
        .prepare<[], { c: number }>(
          "SELECT COUNT(*) AS c FROM sessions WHERE context_snapshot IS NOT NULL"
        )
        .get();
      expect(left?.c).toBe(0);
    } finally {
      raw.close();
    }
  });

  it('throws SESSION_NOT_FOUND for a row that is already gone', () => {
    // The writer catches this. It is an ordinary outcome, because a user can
    // discard a session between the launch and the scan finishing.
    expect(() => store.setContextSnapshot('missing', snapshot())).toThrow(
      /SESSION_NOT_FOUND/
    );
  });
});

// ---------------------------------------------------------------------------
// The codec
// ---------------------------------------------------------------------------

describe('parseContextSnapshot', () => {
  it('drops a record with no version, no timestamp or no entries', () => {
    expect(parseContextSnapshot(null)).toBeUndefined();
    expect(parseContextSnapshot('not json')).toBeUndefined();
    expect(parseContextSnapshot('[]')).toBeUndefined();
    expect(
      parseContextSnapshot(JSON.stringify({ at: 1, entries: [] }))
    ).toBeUndefined();
    expect(
      parseContextSnapshot(JSON.stringify({ v: 1, entries: [] }))
    ).toBeUndefined();
    expect(parseContextSnapshot(JSON.stringify({ v: 1, at: 1 }))).toBeUndefined();
  });

  it('keeps an empty entry list, because that is a real answer', () => {
    const text = JSON.stringify(snapshot({ entries: [] }));
    expect(parseContextSnapshot(text)?.entries).toEqual([]);
  });

  it('drops one unreadable entry and keeps the rest', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const text = JSON.stringify({
      ...snapshot(),
      entries: [entry('good'), { name: 'no id' }, entry('also-good')]
    });
    const read = parseContextSnapshot(text);
    expect(read?.entries.map((e) => e.id)).toEqual(['good', 'also-good']);
  });

  it('drops the whole record when no entry survives', () => {
    // Reporting an empty list would tell the user their session loaded
    // nothing, which is a much stronger claim than "this could not be read".
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const text = JSON.stringify({
      ...snapshot(),
      entries: [{ name: 'no id' }, { nope: true }]
    });
    expect(parseContextSnapshot(text)).toBeUndefined();
  });

  it('keeps a category string this build does not recognise', () => {
    // A sixth category added by a newer build must not turn the record into
    // "nothing was recorded", which is a stronger and falser claim.
    const text = JSON.stringify({
      ...snapshot(),
      entries: [{ ...entry('a'), category: 'subagent' }]
    });
    expect(parseContextSnapshot(text)?.entries[0]?.category).toBe('subagent');
  });
});

// ---------------------------------------------------------------------------
// The seam between the writer and the store
// ---------------------------------------------------------------------------

describe('the writer against a real manifest', () => {
  it('lands a resolved set in the column, end to end', async () => {
    // The store's own tests prove the column and the writer's own tests prove
    // the rules. This is the one case that proves they fit: `ManifestStore`
    // satisfies `ContextSnapshotSink`, and the record the resolver produced is
    // what a later read gets back.
    insert('a');
    setContextResolver(() => ({
      entries: [
        {
          id: 'skill:impeccable:global',
          category: 'skill',
          name: 'impeccable',
          scope: 'global',
          sourcePath: '/Users/x/.agents/skills/impeccable/SKILL.md',
          hash: 'b'.repeat(64)
        }
      ] as never
    }));
    try {
      await captureAndStore(store, {
        sessionId: 'a',
        reason: 'create',
        agent: 'claude',
        cwd: '/Users/x/work/repo'
      });
      const read = store.getSession('a')?.contextSnapshot;
      expect(read?.reason).toBe('create');
      expect(read?.agent).toBe('claude');
      expect(read?.entries).toHaveLength(1);
      expect(read?.entries[0]?.name).toBe('impeccable');
      // Truncated by the writer, so a later comparison against a live 64
      // character hash cannot read as a change.
      expect(read?.entries[0]?.hash).toBe('b'.repeat(16));
    } finally {
      setContextResolver(null);
    }
  });

  it('leaves the row alone when the resolver fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    insert('a');
    setContextResolver(() => {
      throw new Error('EACCES');
    });
    try {
      await captureAndStore(store, {
        sessionId: 'a',
        reason: 'create',
        agent: 'claude',
        cwd: '/Users/x/work/repo'
      });
      expect(store.getSession('a')?.contextSnapshot).toBeUndefined();
      // And the row is otherwise untouched, which is the durability claim.
      expect(store.getSession('a')?.status).toBe('running');
    } finally {
      setContextResolver(null);
    }
  });
});

describe('serializeContextSnapshot', () => {
  it('writes NULL for nothing', () => {
    expect(serializeContextSnapshot(undefined)).toBeNull();
  });

  it('trims to the entry cap and marks the record', () => {
    const many = Array.from({ length: CONTEXT_SNAPSHOT_MAX_ENTRIES + 40 }, (_, i) =>
      entry(`s${String(i)}`)
    );
    const text = serializeContextSnapshot(snapshot({ entries: many }));
    const read = parseContextSnapshot(text);
    expect(read?.entries).toHaveLength(CONTEXT_SNAPSHOT_MAX_ENTRIES);
    expect(read?.truncated).toBe(true);
  });

  it('trims to the byte cap when a few entries are pathological', () => {
    // The entry cap does not bind here: 20 entries with very long paths. The
    // byte cap is the one that has to.
    const huge = Array.from({ length: 20 }, (_, i) =>
      entry(`s${String(i)}`, { sourcePath: `/${'x'.repeat(40_000)}` })
    );
    const text = serializeContextSnapshot(snapshot({ entries: huge }));
    expect(Buffer.byteLength(text ?? '', 'utf8')).toBeLessThanOrEqual(
      CONTEXT_SNAPSHOT_MAX_BYTES
    );
    expect(parseContextSnapshot(text)?.truncated).toBe(true);
  });

  it('leaves an ordinary record untouched and unmarked', () => {
    const text = serializeContextSnapshot(snapshot());
    expect(parseContextSnapshot(text)?.truncated).toBeUndefined();
  });
});
