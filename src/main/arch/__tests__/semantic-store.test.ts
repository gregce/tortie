/**
 * The two new tables (Phase 259; SPEC §3.1 and §3.2), driven end to end over a
 * scratch database.
 *
 * The four things a later round could undo one at a time:
 *
 *  - declarations are keyed on BYTES exactly as facts are, so two repositories
 *    holding the same file share one row list and a row nothing links is
 *    pruned with the facts;
 *  - a reading of ONE part replaces its own rows whole and touches no other
 *    part's;
 *  - `arch_claim_rate` has no column for a rate without its floor, so a rate
 *    cannot be stored bare;
 *  - a refresh marks a citation dead and its claim stale and DELETES NOTHING,
 *    which is what lets a person see what a reading used to stand on.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ArchStore, type NewArchClaimRow, type ArchFactFileLink } from '../db';

let dir: string;
let store: ArchStore;
const KEY = 'dev:ino';
const OTHER = 'dev:ino2';
const OID = 'a'.repeat(40);

function link(relPath: string, oid = OID): ArchFactFileLink {
  return {
    relPath,
    oid,
    mtimeMs: 1,
    size: 2,
    lang: 'typescript',
    vendored: null,
    truncated: false,
    wrapDigest: null
  };
}

function claim(over: Partial<NewArchClaimRow> = {}): NewArchClaimRow {
  return {
    claimId: 'p:src-main:does',
    subject: 'part:src-main',
    field: 'does',
    text: 'it registers the doors',
    question: null,
    answer: null,
    cites: [
      {
        relPath: 'src/a.ts',
        line: 10,
        why: 'the registration',
        grade: 'call-site',
        factKind: 'ipc-channel',
        factSubject: 'arch:map',
        factLine: 10,
        blobOid: OID
      }
    ],
    ...over
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p259-store-'));
  store = new ArchStore(join(dir, 'arch.db'));
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('the declaration table', () => {
  it('round trips a row and sorts by line, kind and subject', () => {
    store.saveDecls(OID, 'src/a.ts', [
      { kind: 'function', subject: 'function b', line: 20, evidence: 'export function b() {' },
      { kind: 'class', subject: 'class A', line: 4, evidence: 'class A {}' }
    ]);
    store.linkFactFiles(KEY, [link('src/a.ts')]);
    expect(store.declsOf(KEY, ['src/a.ts'])).toEqual([
      { file: 'src/a.ts', kind: 'class', subject: 'class A', line: 4, evidence: 'class A {}' },
      {
        file: 'src/a.ts',
        kind: 'function',
        subject: 'function b',
        line: 20,
        evidence: 'export function b() {'
      }
    ]);
  });

  it('refuses a row past the subject bound and writes nothing at all', () => {
    expect(() =>
      store.saveDecls(OID, 'src/a.ts', [
        { kind: 'function', subject: 'x'.repeat(400), line: 1, evidence: '' }
      ])
    ).toThrow(/arch_decl.subject/);
    store.linkFactFiles(KEY, [link('src/a.ts')]);
    expect(store.declsOf(KEY, ['src/a.ts'])).toEqual([]);
  });

  it('shares one row list between two repositories holding the same bytes', () => {
    store.saveDecls(OID, 'src/a.ts', [
      { kind: 'function', subject: 'function b', line: 1, evidence: '' }
    ]);
    store.linkFactFiles(KEY, [link('src/a.ts')]);
    store.linkFactFiles(OTHER, [link('src/a.ts')]);
    expect(store.declsOf(OTHER, ['src/a.ts'])).toHaveLength(1);
    // One repository forgetting it leaves the other's reading intact.
    store.forgetFactFiles(KEY, ['src/a.ts']);
    expect(store.pruneUnlinkedFacts()).toBe(0);
    expect(store.declsOf(OTHER, ['src/a.ts'])).toHaveLength(1);
    store.forgetFactFiles(OTHER, ['src/a.ts']);
    store.pruneUnlinkedFacts();
    expect(store.declsOf(OTHER, ['src/a.ts'])).toEqual([]);
  });

  it('counts what sits under a set of directories, and nothing outside them', () => {
    store.saveDecls(OID, 'src/a.ts', [
      { kind: 'function', subject: 'function a', line: 1, evidence: '' }
    ]);
    store.saveDecls(OID, 'build/b.ts', [
      { kind: 'function', subject: 'function b', line: 1, evidence: '' }
    ]);
    store.linkFactFiles(KEY, [link('src/a.ts'), link('build/b.ts')]);
    expect(store.declCountsUnder(KEY, ['src'])).toBe(1);
    expect(store.declCountsUnder(KEY, [''])).toBe(2);
  });
});

describe('the reading', () => {
  it('replaces one part whole and leaves another part alone', () => {
    store.replaceSemantic({
      repoKey: KEY,
      subjects: ['part:src-main', 'gate:src-main/%'],
      runId: 'r1',
      writtenAt: 1,
      claims: [claim(), claim({ claimId: 'g:src-main:one', subject: 'gate:src-main/one', field: 'because', question: 'Will it?', answer: 'stops' })],
      journeys: [],
      journeySource: null
    });
    store.replaceSemantic({
      repoKey: KEY,
      subjects: ['part:src-renderer', 'gate:src-renderer/%'],
      runId: 'r2',
      writtenAt: 2,
      claims: [claim({ claimId: 'p:src-renderer:does', subject: 'part:src-renderer' })],
      journeys: [],
      journeySource: null
    });
    expect(store.semanticRows(KEY).claims).toHaveLength(3);

    // A second reading of src-main replaces its two rows and touches nothing
    // of src-renderer's.
    store.replaceSemantic({
      repoKey: KEY,
      subjects: ['part:src-main', 'gate:src-main/%'],
      runId: 'r3',
      writtenAt: 3,
      claims: [claim({ text: 'it registers exactly one door' })],
      journeys: [],
      journeySource: null
    });
    const rows = store.semanticRows(KEY);
    expect(rows.claims.map((one) => one.claimId).sort()).toEqual([
      'p:src-main:does',
      'p:src-renderer:does'
    ]);
    expect(rows.claims.find((one) => one.claimId === 'p:src-main:does')?.text).toBe(
      'it registers exactly one door'
    );
    expect(rows.cites).toHaveLength(2);
  });

  it('refuses a grade outside the four and writes nothing', () => {
    expect(() =>
      store.replaceSemantic({
        repoKey: KEY,
        subjects: ['part:src-main'],
        runId: 'r1',
        writtenAt: 1,
        claims: [
          claim({
            cites: [
              {
                relPath: 'src/a.ts',
                line: 1,
                why: 'x',
                grade: 'proven' as never,
                factKind: null,
                factSubject: null,
                factLine: null,
                blobOid: OID
              }
            ]
          })
        ],
        journeys: [],
        journeySource: null
      })
    ).toThrow(/arch_claim_cite.grade/);
    expect(store.semanticRows(KEY).claims).toEqual([]);
  });

  it('keeps the walk and its steps, and replaces only the model source', () => {
    store.replaceSemantic({
      repoKey: KEY,
      subjects: ['journey:%'],
      runId: 'r1',
      writtenAt: 1,
      claims: [
        claim({ claimId: 'j:start:1', subject: 'journey:start#1', field: 'label', text: 'one' })
      ],
      journeys: [
        {
          journeyId: 'start',
          name: 'starting',
          source: 'model',
          steps: [{ seq: 1, partId: 'src-main', label: 'one' }]
        }
      ],
      journeySource: 'model'
    });
    expect(store.semanticRows(KEY).journeys).toEqual([
      {
        journeyId: 'start',
        name: 'starting',
        source: 'model',
        seq: 1,
        partId: 'src-main',
        label: 'one'
      }
    ]);
  });

  it('records a run whatever its verdict, and a refusal keeps its name', () => {
    const base = {
      repoKey: KEY,
      partId: 'src-main',
      agentId: 'claude',
      model: 'opus',
      recipeVersion: 1,
      headCommit: 'b'.repeat(40),
      wallMs: 10,
      costUsd: 0.02,
      claims: 0,
      rowsDropped: 2
    };
    store.writeSemanticRun({
      ...base,
      runId: 'r1',
      startedAt: 1,
      verdict: 'refused',
      reason: 'level-written',
      detail: 'the answer says "reached"'
    });
    store.writeSemanticRun({
      ...base,
      runId: 'r2',
      startedAt: 2,
      verdict: 'kept',
      reason: null,
      detail: null,
      claims: 7
    });
    const runs = store.semanticRows(KEY).runs;
    expect(runs.map((one) => one.runId)).toEqual(['r2', 'r1']);
    expect(runs[1]?.reason).toBe('level-written');
    expect(runs[1]?.rowsDropped).toBe(2);
  });

  it('stores a rate only with its floor, and reads both halves back', () => {
    store.writeClaimRate(KEY, {
      scope: 'repo',
      backed: 24,
      total: 41,
      floorWithin: 238,
      floorLines: 1000,
      byGrade: { gate: 0, 'call-site': 9, declaration: 15, resolves: 17 },
      floorByGrade: { gate: 1, 'call-site': 22, declaration: 215, resolves: 762 },
      gateShaped: 0,
      gateClaims: 6,
      computedAt: 5
    });
    const rate = store.semanticRows(KEY).rates[0];
    expect(rate).toMatchObject({
      scope: 'repo',
      backed: 24,
      total: 41,
      floorWithin: 238,
      floorLines: 1000,
      gateShaped: 0,
      gateClaims: 6
    });
    expect(rate?.byGrade.declaration).toBe(15);
    expect(rate?.floorByGrade.declaration).toBe(215);
  });
});

describe('the refresh', () => {
  it('marks a citation dead and its claim stale, and deletes nothing', () => {
    store.replaceSemantic({
      repoKey: KEY,
      subjects: ['part:src-main'],
      runId: 'r1',
      writtenAt: 1,
      claims: [claim()],
      journeys: [],
      journeySource: null
    });
    store.applySemanticRefresh(KEY, {
      moved: [],
      dead: [{ claimId: 'p:src-main:does', seq: 0, reason: 'src/a.ts:10 no longer carries arch:map' }],
      revived: []
    });
    const rows = store.semanticRows(KEY);
    expect(rows.claims[0]?.stale).toBe(true);
    expect(rows.claims[0]?.staleReason).toBe('src/a.ts:10 no longer carries arch:map');
    // The sentence and the citation both STAY.
    expect(rows.claims[0]?.text).toBe('it registers the doors');
    expect(rows.cites).toHaveLength(1);
    expect(rows.cites[0]?.dead).toBe(true);
  });

  it('re-anchors a citation whose line moved and leaves the claim current', () => {
    store.replaceSemantic({
      repoKey: KEY,
      subjects: ['part:src-main'],
      runId: 'r1',
      writtenAt: 1,
      claims: [claim()],
      journeys: [],
      journeySource: null
    });
    store.applySemanticRefresh(KEY, {
      moved: [{ claimId: 'p:src-main:does', seq: 0, line: 48, blobOid: 'c'.repeat(40) }],
      dead: [],
      revived: []
    });
    const rows = store.semanticRows(KEY);
    expect(rows.cites[0]?.line).toBe(48);
    expect(rows.cites[0]?.blobOid).toBe('c'.repeat(40));
    expect(rows.claims[0]?.stale).toBe(false);
  });

  it('clears stale only when every citation of the claim stands again', () => {
    store.replaceSemantic({
      repoKey: KEY,
      subjects: ['part:src-main'],
      runId: 'r1',
      writtenAt: 1,
      claims: [
        claim({
          cites: [
            { relPath: 'src/a.ts', line: 10, why: 'x', grade: 'call-site', factKind: 'k', factSubject: 's', factLine: 10, blobOid: OID },
            { relPath: 'src/b.ts', line: 20, why: 'y', grade: 'declaration', factKind: 'function', factSubject: 'function f', factLine: 20, blobOid: OID }
          ]
        })
      ],
      journeys: [],
      journeySource: null
    });
    store.applySemanticRefresh(KEY, {
      moved: [],
      dead: [
        { claimId: 'p:src-main:does', seq: 0, reason: 'one died' },
        { claimId: 'p:src-main:does', seq: 1, reason: 'so did the other' }
      ],
      revived: []
    });
    store.applySemanticRefresh(KEY, {
      moved: [],
      dead: [],
      revived: [{ claimId: 'p:src-main:does', seq: 0, line: 11, blobOid: OID }]
    });
    // One of the two is back; the claim is still stale because the other is not.
    expect(store.semanticRows(KEY).claims[0]?.stale).toBe(true);
    store.applySemanticRefresh(KEY, {
      moved: [],
      dead: [],
      revived: [{ claimId: 'p:src-main:does', seq: 1, line: 21, blobOid: OID }]
    });
    expect(store.semanticRows(KEY).claims[0]?.stale).toBe(false);
  });
});

describe('forgetting a repository', () => {
  it('drops its reading and leaves another repository untouched', () => {
    store.replaceSemantic({
      repoKey: KEY,
      subjects: ['part:src-main'],
      runId: 'r1',
      writtenAt: 1,
      claims: [claim()],
      journeys: [],
      journeySource: null
    });
    store.replaceSemantic({
      repoKey: OTHER,
      subjects: ['part:src-main'],
      runId: 'r1',
      writtenAt: 1,
      claims: [claim()],
      journeys: [],
      journeySource: null
    });
    store.writeClaimRate(KEY, {
      scope: 'repo',
      backed: 1,
      total: 1,
      floorWithin: 1,
      floorLines: 10,
      byGrade: { gate: 0, 'call-site': 1, declaration: 0, resolves: 0 },
      floorByGrade: { gate: 0, 'call-site': 1, declaration: 0, resolves: 9 },
      gateShaped: 0,
      gateClaims: 0,
      computedAt: 1
    });
    store.forgetRepo(KEY);
    const gone = store.semanticRows(KEY);
    expect(gone.claims).toEqual([]);
    expect(gone.cites).toEqual([]);
    expect(gone.rates).toEqual([]);
    expect(store.semanticRows(OTHER).claims).toHaveLength(1);
  });
});
