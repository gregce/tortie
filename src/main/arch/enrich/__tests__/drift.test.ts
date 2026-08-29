/**
 * The drift reader and the verdict delta reader (Phase 159), driven pure.
 *
 * The drift is STATE and the diff is TRANSITION, and the two are tested
 * apart. The reader's definition of broke is the strip's, so a wholly
 * accepted divergence, an unverifiable row and a freshness row are all left
 * out, whatever their status says.
 */

import { describe, expect, it } from 'vitest';
import type { ArchDocument, ArchFreshness } from '@shared/arch';
import { ARCH_PROSE_MAX_COMMITS_BEHIND } from '@shared/arch-copy';
import {
  diffArchVerdicts,
  driftScope,
  readArchDrift,
  sortOffending,
  type ArchDriftVerdict
} from '../drift';

type Evidence = ArchDocument['components'][number]['evidence'];

function doc(): ArchDocument {
  const component = (id: string, evidence: Evidence = []) => ({
    id,
    name: id,
    kind: 'component' as const,
    layer: 'surface',
    provenance: 'first-party' as const,
    anchors: [`src/${id}`],
    boundary: 'open' as const,
    description: '',
    evidence,
    deprecated: false,
    gaps: []
  });
  return {
    contract: {
      version: 1,
      subject: 'fixture',
      strictness: 'not-wrong',
      layers: [
        { id: 'surface', name: 'surface', order: 0 },
        { id: 'engine', name: 'engine', order: 1 },
        { id: 'foundation', name: 'foundation', order: 2 }
      ],
      flows: []
    },
    components: [
      component('app'),
      component('core', [
        { path: 'src/core/engine.ts', lineStart: 2, lineEnd: 2, quote: 'gone' }
      ]),
      component('store'),
      component('quiet')
    ],
    edges: [
      {
        id: 'app-must-not-store',
        from: 'app',
        to: 'store',
        kind: 'imports',
        rule: 'must-not',
        checker: 'imports',
        evidence: []
      },
      {
        id: 'core-calls-store',
        from: 'core',
        to: 'store',
        kind: 'calls',
        rule: 'may',
        checker: 'evidence',
        evidence: [
          { path: 'src/core/engine.ts', lineStart: 3, lineEnd: 3, quote: 'db.write(' }
        ]
      },
      {
        id: 'app-may-core',
        from: 'app',
        to: 'core',
        kind: 'imports',
        rule: 'may',
        checker: 'imports',
        evidence: []
      }
    ],
    baseline: { accepted: [] },
    problems: []
  };
}

const v = (
  subjectId: string,
  status: ArchDriftVerdict['status'],
  coverage: ArchDriftVerdict['coverage'] = 'checked',
  extra: Partial<ArchDriftVerdict> = {}
): ArchDriftVerdict => ({
  subjectId,
  status,
  coverage,
  reason: `${subjectId} reason`,
  ...extra
});

const fresh = (
  componentId: string,
  commitsBehind: number,
  uncommittedFiles = 0
): ArchFreshness => ({ componentId, commitsBehind, uncommittedFiles });

describe('readArchDrift, the state of what is wrong now', () => {
  it('answers null over a set with no failures, the no spawn control', () => {
    const drift = readArchDrift(
      doc(),
      [
        v('edge:app-must-not-store', 'convergent'),
        v('edge:app-may-core', 'convergent'),
        v('component:core#freshness', 'unverifiable', 'unverifiable'),
        v('edge:core-calls-store', 'unverifiable', 'unverifiable')
      ],
      [fresh('core', ARCH_PROSE_MAX_COMMITS_BEHIND - 1)]
    );
    expect(drift).toBeNull();
  });

  it('names a broken promise with its open offences only, sorted, and both ends in scope', () => {
    const drift = readArchDrift(
      doc(),
      [
        v('edge:app-must-not-store', 'divergent', 'checked', {
          offending: [
            { fromPath: 'src/app/z.ts', toPath: 'src/store/db.ts', line: 9, specifier: '../store/db' },
            {
              fromPath: 'src/app/a.ts',
              toPath: 'src/store/db.ts',
              line: 4,
              specifier: '../store/db',
              accepted: 'on purpose'
            },
            { fromPath: 'src/app/a.ts', toPath: 'src/store/db.ts', line: 2, specifier: '../store/db' }
          ]
        })
      ],
      []
    );
    expect(drift).not.toBeNull();
    expect(drift?.promises).toHaveLength(1);
    expect(
      drift?.promises[0]?.offending.map((o) => `${o.fromPath}:${String(o.line)}`)
    ).toEqual(['src/app/a.ts:2', 'src/app/z.ts:9']);
    expect(drift?.componentIds).toEqual(['app', 'store']);
    expect(drift?.edgeIds).toEqual(['app-must-not-store']);
    expect(drift?.count).toBe(1);
  });

  it('leaves a wholly accepted divergence out, whether the flag is set or not', () => {
    const rows = [
      {
        fromPath: 'src/app/a.ts',
        toPath: 'src/store/db.ts',
        line: 4,
        specifier: '../store/db',
        accepted: 'on purpose'
      }
    ];
    const withFlag = {
      ...v('component:store#boundary', 'divergent', 'checked', { offending: rows }),
      accepted: true
    };
    const withoutFlag = v('component:store#boundary', 'divergent', 'checked', {
      offending: rows
    });
    expect(readArchDrift(doc(), [withFlag], [])).toBeNull();
    expect(readArchDrift(doc(), [withoutFlag], [])).toBeNull();
  });

  it('leaves unverifiable and freshness rows out, whatever their status', () => {
    expect(
      readArchDrift(
        doc(),
        [
          v('edge:app-must-not-store', 'divergent', 'unverifiable'),
          v('component:core#freshness', 'absent', 'checked')
        ],
        []
      )
    ).toBeNull();
  });

  it('names a dead anchor, a closed boundary and a missing package by their subjects', () => {
    const drift = readArchDrift(
      doc(),
      [
        v('component:quiet#anchor:0', 'absent'),
        v('component:store#boundary', 'divergent', 'checked', {
          offending: [
            { fromPath: 'src/app/a.ts', toPath: 'src/store/db.ts', line: 1, specifier: 'x' }
          ]
        }),
        v('component:core#manifest', 'absent')
      ],
      []
    );
    expect(drift?.promises.map((p) => p.subjectId)).toEqual([
      'component:core#manifest',
      'component:quiet#anchor:0',
      'component:store#boundary'
    ]);
    expect(drift?.componentIds).toEqual(['core', 'quiet', 'store']);
    expect(drift?.edgeIds).toEqual([]);
  });

  it('reads a stale quote from the document, for a part and for a promise', () => {
    const drift = readArchDrift(
      doc(),
      [
        v('evidence:component:core#0', 'divergent'),
        v('evidence:edge:core-calls-store#0', 'absent')
      ],
      []
    );
    expect(drift?.quotes).toEqual([
      {
        subjectId: 'evidence:component:core#0',
        owner: { kind: 'component', id: 'core' },
        index: 0,
        path: 'src/core/engine.ts',
        line: 2,
        quote: 'gone',
        status: 'divergent'
      },
      {
        subjectId: 'evidence:edge:core-calls-store#0',
        owner: { kind: 'edge', id: 'core-calls-store' },
        index: 0,
        path: 'src/core/engine.ts',
        line: 3,
        quote: 'db.write(',
        status: 'absent'
      }
    ]);
    // The part holding the quote, and both ends of the promise holding one.
    expect(drift?.componentIds).toEqual(['core', 'store']);
    expect(drift?.edgeIds).toEqual(['core-calls-store']);
  });

  it('drops a quote verdict the document no longer holds', () => {
    expect(readArchDrift(doc(), [v('evidence:component:core#7', 'divergent')], [])).toBeNull();
    expect(readArchDrift(doc(), [v('evidence:component:ghost#0', 'divergent')], [])).toBeNull();
  });

  it('counts a part as behind at the prose threshold, on commits alone', () => {
    const drift = readArchDrift(
      doc(),
      [],
      [
        fresh('quiet', ARCH_PROSE_MAX_COMMITS_BEHIND, 0),
        fresh('app', ARCH_PROSE_MAX_COMMITS_BEHIND - 1, 500),
        fresh('ghost', ARCH_PROSE_MAX_COMMITS_BEHIND + 5, 0)
      ]
    );
    expect(drift?.parts).toEqual([
      { componentId: 'quiet', commitsBehind: ARCH_PROSE_MAX_COMMITS_BEHIND }
    ]);
    expect(drift?.componentIds).toEqual(['quiet']);
    expect(drift?.count).toBe(1);
  });

  it('answers the same drift over the same verdicts in any order', () => {
    const verdicts = [
      v('component:store#boundary', 'divergent', 'checked', {
        offending: [
          { fromPath: 'src/app/b.ts', toPath: 'src/store/db.ts', line: 1, specifier: 'b' },
          { fromPath: 'src/app/a.ts', toPath: 'src/store/db.ts', line: 1, specifier: 'a' }
        ]
      }),
      v('edge:app-must-not-store', 'absent'),
      v('evidence:component:core#0', 'divergent')
    ];
    const freshness = [fresh('quiet', 40), fresh('app', 30)];
    const one = readArchDrift(doc(), verdicts, freshness);
    const two = readArchDrift(
      doc(),
      [...verdicts].reverse().map((row) => ({
        ...row,
        ...(row.offending === undefined ? {} : { offending: [...row.offending].reverse() })
      })),
      [...freshness].reverse()
    );
    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
    expect(one?.count).toBe(5);
    expect(driftScope(one as NonNullable<typeof one>)).toEqual({
      componentIds: ['app', 'core', 'quiet', 'store'],
      edgeIds: ['app-must-not-store']
    });
  });
});

describe('sortOffending', () => {
  it('orders by path, then line, then specifier', () => {
    const sorted = sortOffending([
      { fromPath: 'b', toPath: 'x', line: 1, specifier: 'z' },
      { fromPath: 'a', toPath: 'x', line: 2, specifier: 'z' },
      { fromPath: 'a', toPath: 'x', line: 1, specifier: 'z' },
      { fromPath: 'a', toPath: 'x', line: 1, specifier: 'y' }
    ]);
    expect(sorted.map((o) => `${o.fromPath}:${String(o.line)}:${o.specifier}`)).toEqual([
      'a:1:y',
      'a:1:z',
      'a:2:z',
      'b:1:z'
    ]);
  });
});

describe('diffArchVerdicts, what moved between two checks', () => {
  it('reports a status move, a coverage move, an appearance and a vanishing, sorted', () => {
    const diff = diffArchVerdicts(
      [
        v('edge:b', 'convergent'),
        v('edge:a', 'convergent', 'partly-checked'),
        v('edge:gone', 'absent'),
        v('edge:same', 'convergent')
      ],
      [
        v('edge:b', 'divergent'),
        v('edge:a', 'convergent', 'checked'),
        v('edge:new', 'unverifiable', 'unverifiable'),
        v('edge:same', 'convergent')
      ],
      [],
      []
    );
    expect(diff.verdicts).toEqual([
      {
        subjectId: 'edge:a',
        from: 'convergent',
        to: 'convergent',
        fromCoverage: 'partly-checked',
        toCoverage: 'checked'
      },
      {
        subjectId: 'edge:b',
        from: 'convergent',
        to: 'divergent',
        fromCoverage: 'checked',
        toCoverage: 'checked'
      },
      { subjectId: 'edge:gone', from: 'absent', to: null, fromCoverage: 'checked', toCoverage: null },
      {
        subjectId: 'edge:new',
        from: null,
        to: 'unverifiable',
        fromCoverage: null,
        toCoverage: 'unverifiable'
      }
    ]);
    expect(diff.parts).toEqual([]);
  });

  it('skips freshness rows as verdicts and reports parts whose commit count rose', () => {
    const diff = diffArchVerdicts(
      [v('component:core#freshness', 'unverifiable', 'unverifiable')],
      [],
      [fresh('core', 2), fresh('app', 5)],
      [fresh('core', 7, 3), fresh('app', 5, 9), fresh('new', 1)]
    );
    expect(diff.verdicts).toEqual([]);
    expect(diff.parts).toEqual([
      { componentId: 'core', commitsBehindDelta: 5, uncommittedFiles: 3 },
      { componentId: 'new', commitsBehindDelta: 1, uncommittedFiles: 0 }
    ]);
  });

  it('answers empty when nothing moved', () => {
    const same = [v('edge:a', 'convergent')];
    const diff = diffArchVerdicts(same, same, [fresh('a', 3)], [fresh('a', 3)]);
    expect(diff).toEqual({ verdicts: [], parts: [] });
  });
});
