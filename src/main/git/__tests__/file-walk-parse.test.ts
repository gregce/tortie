/**
 * Phase 198. The name status chunk reader and the file walk's parse, over
 * bytes in the shape git 2.50.1 actually emits: after a record's NUL the
 * status token begins with a newline, the paths follow NUL separated, a
 * rename or copy carries two paths, and a merge on the plain path walk has
 * no chunk at all.
 */

import { describe, expect, it } from 'vitest';
import { parseGraphLog } from '../graph-parse';
import { readNameStatusChunk } from '../parse';

const US = '\x1f';
const NUL = '\0';

function record(hash: string, parents: string, subject: string): string {
  return [
    hash,
    hash.slice(0, 7),
    parents,
    'Probe',
    'probe@example.invalid',
    '1700000001',
    '',
    subject
  ].join(US);
}

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const D = 'd'.repeat(40);

describe('readNameStatusChunk', () => {
  it('reads one M entry and stops at the next record', () => {
    const tokens = [record(A, B, 'edit'), '\nM', 'notes/a.txt', record(B, '', 'add')];
    const out = readNameStatusChunk(tokens, 1);
    expect(out).toEqual({
      entries: [{ path: 'notes/a.txt', status: 'M' }],
      next: 3
    });
  });

  it('reads an R100 entry as old then new', () => {
    const tokens = ['\nR100', 'notes/b.txt', 'notes/star*[x].txt', ''];
    expect(readNameStatusChunk(tokens, 0)).toEqual({
      entries: [
        { path: 'notes/star*[x].txt', origPath: 'notes/b.txt', status: 'R' }
      ],
      next: 3
    });
  });

  it('reads a C100 entry the same way', () => {
    const tokens = ['\nC100', 'notes/a.txt', 'notes/b.txt'];
    expect(readNameStatusChunk(tokens, 0).entries).toEqual([
      { path: 'notes/b.txt', origPath: 'notes/a.txt', status: 'C' }
    ]);
  });

  it('answers nothing when the next token is a record, which is a merge', () => {
    const tokens = [record(A, `${B} ${C}`, 'merge'), record(B, '', 'add')];
    expect(readNameStatusChunk(tokens, 1)).toEqual({ entries: [], next: 1 });
  });

  it('reads a folder chunk with several entries until the next record', () => {
    const tokens = [
      '\nA',
      'notes/a.txt',
      '\nA',
      'notes/gone.txt',
      record(A, '', 'add')
    ];
    const out = readNameStatusChunk(tokens, 0);
    expect(out.entries.map((e) => e.path)).toEqual([
      'notes/a.txt',
      'notes/gone.txt'
    ]);
    expect(out.next).toBe(4);
  });

  it('is not fooled by a status without its newline', () => {
    // parseNameStatusZ's shape, which the walk never emits. The reader must
    // not consume it as a chunk, so a stray token cannot swallow a record.
    expect(readNameStatusChunk(['M', 'x'], 0)).toEqual({ entries: [], next: 0 });
  });

  it('answers the end of the tokens without reading past them', () => {
    expect(readNameStatusChunk(['\nM'], 0)).toEqual({ entries: [], next: 2 });
    expect(readNameStatusChunk([], 0)).toEqual({ entries: [], next: 0 });
  });
});

describe('parseGraphLog over a file walk', () => {
  const walk =
    record(A, B, 'c7 rename b to star') +
    NUL +
    '\nR100' +
    NUL +
    'notes/b.txt' +
    NUL +
    'notes/star*[x].txt' +
    NUL +
    record(B, `${C} ${D}`, 'c5 merge side') +
    NUL +
    record(C, D, 'c4 copy a to b') +
    NUL +
    '\nC100' +
    NUL +
    'notes/a.txt' +
    NUL +
    'notes/b.txt' +
    NUL +
    record(D, '', 'c1 add a') +
    NUL +
    '\nA' +
    NUL +
    'notes/a.txt' +
    NUL;

  it('attaches the chunk to its record and leaves a merge without one', () => {
    const rows = parseGraphLog(walk, { files: true });
    expect(rows.map((r) => r.subject)).toEqual([
      'c7 rename b to star',
      'c5 merge side',
      'c4 copy a to b',
      'c1 add a'
    ]);
    expect(rows.map((r) => r.file)).toEqual([
      { path: 'notes/star*[x].txt', origPath: 'notes/b.txt', status: 'R' },
      undefined,
      { path: 'notes/b.txt', origPath: 'notes/a.txt', status: 'C' },
      { path: 'notes/a.txt', status: 'A' }
    ]);
    expect(rows[1]?.parents).toEqual([C, D]);
  });

  it('discards the chunks on the plain walk exactly as before', () => {
    const rows = parseGraphLog(walk);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.file === undefined)).toBe(true);
  });

  it('keeps every row when a chunk sits between two records', () => {
    // The row count must not depend on whether a chunk was read, only on
    // how many records the walk produced.
    expect(parseGraphLog(walk, { files: true })).toHaveLength(
      parseGraphLog(walk).length
    );
  });
});
