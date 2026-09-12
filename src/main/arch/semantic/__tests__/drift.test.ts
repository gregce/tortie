/**
 * Staleness, the declaration reader and the composed reading (Phase 259,
 * research 118 §7.5).
 *
 * The property that matters most is what staleness DOES NOT do: it never
 * deletes a claim, never changes a sentence and never starts anything. A
 * citation whose file moved and whose fact is still there is re-anchored the
 * way the product already re-anchors a quote; one whose fact is gone kills the
 * citation and turns the claim's chip, and the words stay so a person can see
 * what the reading used to stand on.
 */

import { describe, expect, it } from 'vitest';
import { refreshSemantic, type RefreshSources, type StoredCite } from '../drift';
import { ARCH_DECL_MAX_PER_FILE, readDecls } from '../decl';
import { composeSemanticReading } from '../reading';

const OLD = 'a'.repeat(40);
const NEW = 'b'.repeat(40);

function cite(over: Partial<StoredCite> = {}): StoredCite {
  return {
    claimId: 'p:src-main:does',
    seq: 0,
    relPath: 'src/a.ts',
    line: 10,
    blobOid: OLD,
    factKind: 'ipc-channel',
    factSubject: 'arch:map',
    grade: 'call-site',
    dead: false,
    ...over
  };
}

function tree(input: {
  oids: Record<string, string>;
  rows?: Record<string, { kind: string; subject: string; line: number }[]>;
}): RefreshSources {
  return {
    oidOf: (path) => input.oids[path] ?? null,
    rowsIn: (path) => input.rows?.[path] ?? []
  };
}

describe('the drift fingerprint', () => {
  it('reads nothing at all when the file own bytes did not move', () => {
    const src: RefreshSources = {
      oidOf: () => OLD,
      rowsIn: () => {
        throw new Error('an unchanged file must never be read');
      }
    };
    expect(refreshSemantic([cite()], src)).toEqual({ moved: [], dead: [], revived: [] });
  });

  it('re-anchors a citation whose fact moved down the file', () => {
    const src = tree({
      oids: { 'src/a.ts': NEW },
      rows: { 'src/a.ts': [{ kind: 'ipc-channel', subject: 'arch:map', line: 48 }] }
    });
    const out = refreshSemantic([cite()], src);
    expect(out.dead).toEqual([]);
    expect(out.moved).toEqual([
      { claimId: 'p:src-main:does', seq: 0, line: 48, blobOid: NEW }
    ]);
  });

  it('kills a citation whose fact is gone and names it', () => {
    const src = tree({
      oids: { 'src/a.ts': NEW },
      rows: { 'src/a.ts': [{ kind: 'ipc-channel', subject: 'arch:load', line: 48 }] }
    });
    const out = refreshSemantic([cite()], src);
    expect(out.moved).toEqual([]);
    expect(out.dead[0]?.reason).toBe('src/a.ts:10 no longer carries arch:map');
  });

  it('kills a citation whose file is no longer tracked', () => {
    const out = refreshSemantic([cite()], tree({ oids: {} }));
    expect(out.dead[0]?.reason).toBe(
      'src/a.ts:10 is no longer a file of this repository'
    );
  });

  it('is stricter for a resolves citation: any change to that file kills it', () => {
    const src = tree({
      oids: { 'src/a.ts': NEW },
      rows: { 'src/a.ts': [{ kind: 'ipc-channel', subject: 'arch:map', line: 48 }] }
    });
    const out = refreshSemantic(
      [cite({ grade: 'resolves', factKind: null, factSubject: null })],
      src
    );
    expect(out.dead).toHaveLength(1);
    expect(out.dead[0]?.reason).toContain('nothing was found at that line');
  });

  it('says nothing twice about a citation the store already holds as dead', () => {
    const out = refreshSemantic([cite({ dead: true })], tree({ oids: {} }));
    expect(out.dead).toEqual([]);
  });

  it('revives a citation whose fact came back', () => {
    const src = tree({
      oids: { 'src/a.ts': NEW },
      rows: { 'src/a.ts': [{ kind: 'ipc-channel', subject: 'arch:map', line: 9 }] }
    });
    const out = refreshSemantic([cite({ dead: true })], src);
    expect(out.dead).toEqual([]);
    expect(out.revived).toEqual([
      { claimId: 'p:src-main:does', seq: 0, line: 9, blobOid: NEW }
    ]);
  });
});

describe('the declaration reader', () => {
  const lines = ['export function a() {', '  const x = 1;', '}', 'class B {}'];

  it('admits the nine kinds and refuses everything else', () => {
    const read = readDecls(
      [
        { name: 'a', kind: 'function', container: null, line: 1 },
        { name: 'B', kind: 'class', container: null, line: 4 },
        { name: 'x', kind: 'variable', container: null, line: 2 },
        { name: 'y', kind: 'field', container: 'B', line: 4 }
      ],
      lines
    );
    expect(read.decls.map((row) => row.subject)).toEqual(['function a', 'class B']);
    expect(read.decls[0]?.evidence).toBe('export function a() {');
  });

  it('names a member by its container, which is what the fingerprint compares', () => {
    const read = readDecls(
      [{ name: 'run', kind: 'method', container: 'ArchPassRunner', line: 1 }],
      lines
    );
    expect(read.decls[0]?.subject).toBe('method ArchPassRunner.run');
  });

  it('sorts by line so the same bytes store the same rows in the same order', () => {
    const forward = readDecls(
      [
        { name: 'a', kind: 'function', container: null, line: 1 },
        { name: 'B', kind: 'class', container: null, line: 4 }
      ],
      lines
    );
    const reversed = readDecls(
      [
        { name: 'B', kind: 'class', container: null, line: 4 },
        { name: 'a', kind: 'function', container: null, line: 1 }
      ],
      lines
    );
    expect(reversed).toEqual(forward);
  });

  it('counts the overflow rather than dropping it in silence', () => {
    const many = Array.from({ length: ARCH_DECL_MAX_PER_FILE + 7 }, (_unused, at) => ({
      name: `f${String(at)}`,
      kind: 'function',
      container: null,
      line: at + 1
    }));
    const read = readDecls(many, []);
    expect(read.decls).toHaveLength(ARCH_DECL_MAX_PER_FILE);
    expect(read.truncated).toBe(7);
  });
});

describe('the composed reading', () => {
  it('answers readAt null while nothing has been kept, and still lists the refusal', () => {
    const reading = composeSemanticReading({
      claims: [],
      cites: [],
      journeys: [],
      rates: [],
      runs: [
        {
          runId: 'r1',
          partId: 'src-main',
          agentId: 'claude',
          model: 'opus',
          verdict: 'refused',
          reason: 'level-written',
          startedAt: 5,
          wallMs: 100,
          claims: 0,
          rowsDropped: 0
        }
      ]
    });
    expect(reading.readAt).toBeNull();
    expect(reading.runs).toHaveLength(1);
    expect(reading.runs[0]?.reason).toBe('level-written');
  });

  it('draws a contract journey first, whatever its id', () => {
    const reading = composeSemanticReading(
      {
        claims: [],
        cites: [],
        journeys: [
          {
            journeyId: 'aaa-model',
            name: 'a model walk',
            source: 'model',
            seq: 1,
            partId: 'src-main',
            label: 'it starts'
          }
        ],
        rates: [],
        runs: []
      },
      [
        {
          journeyId: 'zzz-contract',
          name: 'the person own walk',
          source: 'contract',
          agentId: null,
          steps: []
        }
      ]
    );
    expect(reading.journeys.map((one) => one.journeyId)).toEqual([
      'zzz-contract',
      'aaa-model'
    ]);
  });

  it('groups a part claims in field order and names the part from its name claim', () => {
    const runs = [
      {
        runId: 'r1',
        partId: 'src-main',
        agentId: 'codex',
        model: 'gpt-6-astra',
        verdict: 'kept',
        reason: null,
        startedAt: 7,
        wallMs: 1,
        claims: 2,
        rowsDropped: 0
      }
    ];
    const claim = (field: string, text: string) => ({
      claimId: `p:src-main:${field}`,
      subject: 'part:src-main',
      field,
      text,
      question: null,
      answer: null,
      runId: 'r1',
      writtenAt: 7,
      stale: false,
      staleReason: null
    });
    const reading = composeSemanticReading({
      claims: [claim('limit', 'where it stops'), claim('name', 'The session keeper')],
      cites: [],
      journeys: [],
      rates: [],
      runs
    });
    expect(reading.readAt).toBe(7);
    expect(reading.parts[0]?.name).toBe('The session keeper');
    expect(reading.parts[0]?.claims.map((one) => one.field)).toEqual(['name', 'limit']);
    expect(reading.parts[0]?.claims[0]?.agentId).toBe('codex');
  });

  it('reads a gate back with its question and its one word answer', () => {
    const reading = composeSemanticReading({
      claims: [
        {
          claimId: 'g:src-main:adopt',
          subject: 'gate:src-main/adopt',
          field: 'because',
          text: 'a session with no stamp is not ours',
          question: 'Will Tortie adopt it?',
          answer: 'stops',
          runId: 'r1',
          writtenAt: 1,
          stale: true,
          staleReason: 'src/a.ts:1 no longer carries it'
        }
      ],
      cites: [],
      journeys: [],
      rates: [],
      runs: []
    });
    expect(reading.gates[0]).toMatchObject({
      gateId: 'adopt',
      partId: 'src-main',
      answer: 'stops',
      stale: true
    });
  });
});
