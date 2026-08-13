/**
 * The launch context comparison and the sentences it produces (Phase 22,
 * research 29 §8.2 and §8.3).
 *
 * ## What is being tested, and what would be easy to get wrong
 *
 * The readout answers one question: has anything about this session's
 * configuration changed since it started. Three ways to answer that question
 * wrongly are what these cases are aimed at.
 *
 * 1. **Saying "unchanged" when the truth is "I could not tell."** A file the
 *    resolver could not hash has an empty hash on one side of the comparison.
 *    Folding those into the unchanged pile would put a confident sentence over
 *    the one thing the panel does not know.
 * 2. **Missing the removal.** Research 29 §8.3 calls it the one nobody expects
 *    and the one that bites: the file is gone from disk and the running
 *    session is still running it. It has no row in the current set, so a diff
 *    written as a walk over the current set alone cannot see it.
 * 3. **Comparing a truncated hash against a full one.** The record stores 16
 *    hex characters and a live resolver may hand over 64. A comparison that
 *    did not normalise both sides would mark every single row as changed.
 */

import { describe, expect, it } from 'vitest';
import {
  CONTEXT_HASH_CHARS,
  CONTEXT_SNAPSHOT_VERSION,
  describeSessionContext,
  describeUnknownCategories,
  diffContextSnapshot,
  driftById,
  removedEntries,
  shortContextHash,
  toSnapshotEntries,
  type ContextSnapshot,
  type ContextSnapshotEntry
} from '../context-snapshot';

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
    hash: `${id}0000000000000000`.slice(0, CONTEXT_HASH_CHARS),
    ...patch
  };
}

function snapshot(
  entries: ContextSnapshotEntry[],
  patch: Partial<ContextSnapshot> = {}
): ContextSnapshot {
  return {
    v: CONTEXT_SNAPSHOT_VERSION,
    at: 1_700_000_000_000,
    reason: 'create',
    agent: 'claude',
    cwd: '/Users/x/work/repo',
    entries,
    ...patch
  };
}

describe('diffContextSnapshot', () => {
  it('reports nothing when both sides hold the same entries', () => {
    const rows = [entry('impeccable'), entry('govuk-style')];
    const drift = diffContextSnapshot(snapshot(rows), rows);
    expect(drift.entries).toEqual([]);
    expect(drift.uncomparable).toEqual([]);
  });

  it('marks a row whose hash moved as changed, and keeps the old one', () => {
    const before = entry('impeccable', { hash: 'aaaaaaaaaaaaaaaa' });
    const after = entry('impeccable', { hash: 'bbbbbbbbbbbbbbbb' });
    const drift = diffContextSnapshot(snapshot([before]), [after]);
    expect(drift.entries).toHaveLength(1);
    expect(drift.entries[0]?.kind).toBe('changed');
    // The CURRENT entry is what the view draws, and the snapshot's is carried
    // beside it so the detail card can say what it was.
    expect(drift.entries[0]?.entry).toBe(after);
    expect(drift.entries[0]?.previous).toBe(before);
  });

  it('marks a row the snapshot never held as added', () => {
    const drift = diffContextSnapshot(snapshot([entry('a')]), [
      entry('a'),
      entry('b')
    ]);
    expect(drift.entries).toHaveLength(1);
    expect(drift.entries[0]).toMatchObject({ kind: 'added', id: 'b' });
  });

  it('marks a row that has left the current set as removed', () => {
    // The case that has no row to hang a mark on, and the reason the diff
    // walks the snapshot as well as the current set.
    const gone = entry('deleted-skill');
    const drift = diffContextSnapshot(snapshot([entry('a'), gone]), [
      entry('a')
    ]);
    expect(drift.entries).toHaveLength(1);
    expect(drift.entries[0]).toMatchObject({
      kind: 'removed',
      id: 'deleted-skill'
    });
    expect(drift.entries[0]?.entry).toBe(gone);
    expect(removedEntries(drift)).toHaveLength(1);
  });

  it('treats a missing hash as "cannot tell", never as unchanged', () => {
    const drift = diffContextSnapshot(
      snapshot([entry('a', { hash: '' }), entry('b', { hash: 'bbbbbbbbbbbbbbbb' })]),
      [entry('a', { hash: 'aaaaaaaaaaaaaaaa' }), entry('b', { hash: '' })]
    );
    // Neither is claimed to have changed, and neither is claimed to be the
    // same. Both are named.
    expect(drift.entries).toEqual([]);
    expect(drift.uncomparable.sort()).toEqual(['a', 'b']);
  });

  it('does not mark every row changed when one side carries a full hash', () => {
    const full = 'a'.repeat(64);
    const stored = entry('a', { hash: shortContextHash(full) });
    const live = entry('a', { hash: full });
    expect(diffContextSnapshot(snapshot([stored]), [live]).entries).toEqual([]);
  });

  it('reads a scope move as one removal and one addition', () => {
    // The id carries the scope key (research 29 §4), so a skill that moved
    // from project to personal is genuinely a different row. A single
    // "changed" mark would hide which of the two the session is holding.
    const drift = diffContextSnapshot(
      snapshot([entry('skill:fmt:project')]),
      [entry('skill:fmt:global')]
    );
    expect(drift.entries.map((e) => e.kind).sort()).toEqual([
      'added',
      'removed'
    ]);
  });

  it('indexes drift by id for a view already drawing those rows', () => {
    const drift = diffContextSnapshot(snapshot([entry('a')]), [
      entry('a', { hash: 'zzzzzzzzzzzzzzzz' }),
      entry('b')
    ]);
    const byId = driftById(drift);
    expect(byId.get('a')?.kind).toBe('changed');
    expect(byId.get('b')?.kind).toBe('added');
    expect(byId.has('c')).toBe(false);
  });
});

describe('toSnapshotEntries', () => {
  it('keeps six fields and truncates the hash', () => {
    const rich = {
      ...entry('a', { hash: 'f'.repeat(64) }),
      // The fields a real ResolvedEntry carries that the record must not.
      summary: 'a long description that would be copied per session',
      agents: ['claude', 'codex'],
      state: 'active',
      shadows: [{ scope: 'project' }],
      executes: { commands: [] }
    } as unknown as ContextSnapshotEntry;
    const [folded] = toSnapshotEntries([rich]);
    expect(Object.keys(folded ?? {}).sort()).toEqual([
      'category',
      'hash',
      'id',
      'name',
      'scope',
      'sourcePath'
    ]);
    expect(folded?.hash).toHaveLength(CONTEXT_HASH_CHARS);
  });
});

describe('describeSessionContext', () => {
  it('names the unrecorded case and both reasons for it', () => {
    const header = describeSessionContext({
      snapshot: null,
      drift: null,
      age: '3h'
    });
    expect(header.unrecorded).toBe(true);
    expect(header.driftCount).toBe(0);
    expect(header.lines.join(' ')).toContain('no record');
    // "no drift" and "no record" look identical on screen and mean opposite
    // things, so the unrecorded branch must never produce the other sentence.
    expect(header.lines.join(' ')).not.toContain('Nothing has changed');
  });

  it('says nothing changed rather than showing an empty header', () => {
    const rows = [entry('a')];
    const header = describeSessionContext({
      snapshot: snapshot(rows),
      drift: diffContextSnapshot(snapshot(rows), rows),
      age: '3h'
    });
    expect(header.lines[0]).toBe('Started 3h ago.');
    expect(header.lines[1]).toBe('Nothing has changed since.');
    expect(header.driftCount).toBe(0);
  });

  it('counts the changes, and uses singular English for one', () => {
    const one = describeSessionContext({
      snapshot: snapshot([entry('a')]),
      drift: diffContextSnapshot(snapshot([entry('a')]), [
        entry('a', { hash: 'zzzzzzzzzzzzzzzz' })
      ]),
      age: '3h'
    });
    expect(one.lines[1]).toBe('One thing has changed since.');
    expect(one.driftCount).toBe(1);

    const two = describeSessionContext({
      snapshot: snapshot([entry('a')]),
      drift: diffContextSnapshot(snapshot([entry('a')]), [
        entry('a', { hash: 'zzzzzzzzzzzzzzzz' }),
        entry('b')
      ]),
      age: '3h'
    });
    expect(two.lines[1]).toBe('2 things have changed since.');
    expect(two.driftCount).toBe(2);
  });

  it('gives the files it could not read their own clause', () => {
    const rows = [entry('a', { hash: '' })];
    const header = describeSessionContext({
      snapshot: snapshot(rows),
      drift: diffContextSnapshot(snapshot(rows), [entry('a')]),
      age: '3h'
    });
    expect(header.lines[1]).toBe('Nothing has changed since.');
    expect(header.lines[2]).toContain('cannot tell whether one more');
  });

  it('says which categories are unknown rather than staying silent', () => {
    const header = describeSessionContext({
      snapshot: snapshot([], { unknown: ['hook', 'plugin'] }),
      drift: diffContextSnapshot(snapshot([]), []),
      age: '1d'
    });
    expect(header.lines.join(' ')).toContain('hooks and plugins');
  });

  it('says when the record itself was cut short', () => {
    const header = describeSessionContext({
      snapshot: snapshot([entry('a')], { truncated: true }),
      drift: diffContextSnapshot(snapshot([entry('a')]), [entry('a')]),
      age: '2m'
    });
    expect(header.lines.at(-1)).toContain('cut short');
  });

  it('does not write "0m ago" for a session that just started', () => {
    const header = describeSessionContext({
      snapshot: snapshot([]),
      drift: null,
      age: 'now'
    });
    expect(header.lines[0]).toBe('Started just now.');
  });
});

describe('describeUnknownCategories', () => {
  it('reads as English for one, two and three', () => {
    expect(describeUnknownCategories(['mcp'])).toContain('MCP servers');
    expect(describeUnknownCategories(['hook', 'plugin'])).toContain(
      'hooks and plugins'
    );
    expect(
      describeUnknownCategories(['skill', 'hook', 'instruction'])
    ).toContain('skills, hooks and instructions');
  });
});
