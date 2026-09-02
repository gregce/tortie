/**
 * The level 1 map model (Phase 160).
 *
 * The gate proves the bytes repeat over the committed fixture. These prove the
 * decisions: the boxes carry their weights, the honest grey's denominators
 * travel per box, the overlay follows the strict majority rule and never
 * blends a disagreement, and the verdict colour rides only an edge the
 * contract judged, worst status first.
 */

import { describe, expect, it } from 'vitest';
import type { ArchDocument } from '@shared/arch';
import type { ArchFileDefinitions, ArchTreeFileFact } from '../db';
import {
  composeArchMap,
  composeArchMapPart,
  firstSentence,
  type ArchMapComposeInput,
  type ArchMapPartComposeInput
} from '../map';

const tree = [
  'src/app/main.ts',
  'src/app/view.ts',
  'src/core/engine.ts',
  'src/core/util.ts',
  'src/store/db.ts',
  'src/net/http.ts',
  'src/log/log.ts',
  'vendor/lib/thing.ts',
  'package.json'
];

const imports = [
  { fromPath: 'src/app/main.ts', toPath: 'src/core/engine.ts', resolution: 'first-party' },
  { fromPath: 'src/app/view.ts', toPath: 'src/core/engine.ts', resolution: 'first-party' },
  { fromPath: 'src/core/engine.ts', toPath: 'src/store/db.ts', resolution: 'first-party' },
  { fromPath: 'src/net/http.ts', toPath: 'src/core/util.ts', resolution: 'first-party' },
  { fromPath: 'src/app/main.ts', toPath: null, resolution: 'external' },
  { fromPath: 'src/log/log.ts', toPath: null, resolution: 'unresolved' }
];

function contract(): ArchDocument {
  return {
    contract: {
      version: 1,
      subject: 'a test',
      strictness: 'not-wrong',
      layers: [],
      flows: []
    },
    components: [
      {
        id: 'the-app',
        name: 'The App',
        kind: 'component',
        layer: 'surface',
        provenance: 'first-party',
        anchors: ['src/app'],
        boundary: 'open',
        description: 'Draws the window. Everything else feeds it.',
        evidence: [],
        deprecated: false,
        gaps: []
      },
      {
        id: 'engine',
        name: 'Engine',
        kind: 'component',
        layer: 'engine',
        provenance: 'first-party',
        anchors: ['src/core'],
        boundary: 'closed',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      },
      {
        id: 'everything',
        name: 'Everything',
        kind: 'component',
        layer: 'engine',
        provenance: 'first-party',
        anchors: ['src'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      },
      {
        id: 'ghost',
        name: 'Ghost',
        kind: 'component',
        layer: 'engine',
        provenance: 'first-party',
        anchors: ['no/such/dir'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      }
    ],
    edges: [
      {
        id: 'app-may-engine',
        from: 'the-app',
        to: 'engine',
        kind: 'imports',
        rule: 'may',
        checker: 'imports',
        evidence: []
      },
      {
        id: 'app-must-not-engine',
        from: 'the-app',
        to: 'engine',
        kind: 'imports',
        rule: 'must-not',
        checker: 'imports',
        evidence: []
      }
    ],
    baseline: { accepted: [] },
    problems: []
  };
}

function input(overrides?: Partial<ArchMapComposeInput>): ArchMapComposeInput {
  return {
    subject: 'a test',
    trackedFiles: tree,
    imports,
    document: null,
    verdicts: [],
    ...overrides
  };
}

describe('the computed picture', () => {
  it('draws the skeleton groups with their weights', () => {
    const model = composeArchMap(input());
    const app = model.groups.find((g) => g.id === 'src-app');
    expect(app?.label).toBe('src/app');
    expect(app?.componentId).toBeNull();
    expect(app?.fileCount).toBe(2);
    expect(app?.band).toBe('surface');
    expect(model.fileCount).toBe(tree.length);
    expect(model.contractPresent).toBe(false);
  });

  it('rolls the resolved imports up with counts, heaviest first, unsliced', () => {
    const model = composeArchMap(input());
    expect(model.edges[0]).toMatchObject({
      from: 'src-app',
      to: 'src-core',
      count: 2,
      status: null,
      edgeId: null
    });
    expect(model.edges.length).toBe(3);
  });

  it('carries the honest denominators per box and repository wide', () => {
    const model = composeArchMap(input());
    const app = model.groups.find((g) => g.id === 'src-app');
    expect(app?.totalImports).toBe(3);
    expect(app?.resolvedImports).toBe(2);
    expect(app?.externalImports).toBe(1);
    expect(app?.unresolvedImports).toBe(0);
    const log = model.groups.find((g) => g.id === 'src-log');
    expect(log?.totalImports).toBe(1);
    expect(log?.unresolvedImports).toBe(1);
    expect(log?.resolvedImports).toBe(0);
    expect(model.totalImports).toBe(6);
    expect(model.resolvedImports).toBe(4);
    expect(model.unresolvedImports).toBe(1);
  });

  it('gives the same bytes whatever order the facts arrive in', () => {
    const one = composeArchMap(input());
    const two = composeArchMap(
      input({ imports: [...imports].reverse(), trackedFiles: [...tree].reverse() })
    );
    expect(JSON.stringify(two)).toBe(JSON.stringify(one));
  });
});

describe('the overlay', () => {
  it('paints a box when a component holds a strict majority in it', () => {
    const model = composeArchMap(input({ document: contract() }));
    const app = model.groups.find((g) => g.id === 'src-app');
    expect(app?.label).toBe('The App');
    expect(app?.componentId).toBe('the-app');
    expect(app?.id).toBe('src-app');
    expect(model.contractPresent).toBe(true);
    // Phase 158: the painted box carries the purpose sentence, clipped to
    // the description's first sentence, so the hover can say what the part
    // is FOR. An empty description and a computed box both carry null.
    expect(app?.description).toBe('Draws the window.');
    const core = model.groups.find((g) => g.id === 'src-core');
    expect(core?.description).toBeNull();
    const log = model.groups.find((g) => g.id === 'src-log');
    expect(log?.description).toBeNull();
  });

  it('clips a description to its first sentence, and keeps one with no stop', () => {
    expect(firstSentence('Draws the window. Everything else feeds it.')).toBe(
      'Draws the window.'
    );
    expect(firstSentence('One sentence with no full stop')).toBe(
      'One sentence with no full stop'
    );
    expect(firstSentence('  padded.  ')).toBe('padded.');
    expect(firstSentence('')).toBeNull();
    expect(firstSentence('   ')).toBeNull();
    // A dot inside a name does not end a sentence; only one that ends a
    // word does.
    expect(firstSentence('Owns config.json and reads it. Writes nothing.')).toBe(
      'Owns config.json and reads it.'
    );
  });

  it('never paints a spanning or an absent component onto any box', () => {
    const model = composeArchMap(input({ document: contract() }));
    // "everything" spans five groups without a majority in any, and "ghost"
    // matches nothing at HEAD. Neither name appears on the picture.
    for (const group of model.groups) {
      expect(group.componentId).not.toBe('everything');
      expect(group.componentId).not.toBe('ghost');
    }
  });

  it('rides the worst judged verdict on the edge between painted boxes', () => {
    const model = composeArchMap(
      input({
        document: contract(),
        verdicts: [
          { subjectId: 'edge:app-may-engine', status: 'convergent' },
          { subjectId: 'edge:app-must-not-engine', status: 'divergent' }
        ]
      })
    );
    const edge = model.edges.find((e) => e.from === 'src-app' && e.to === 'src-core');
    expect(edge?.status).toBe('divergent');
    expect(edge?.edgeId).toBe('app-must-not-engine');
    // The unjudged edges stay uncoloured rather than guessed at.
    const other = model.edges.find((e) => e.from === 'src-net');
    expect(other?.status).toBeNull();
  });

  it('leaves every edge uncoloured when nothing was judged', () => {
    const model = composeArchMap(input({ document: contract() }));
    for (const edge of model.edges) expect(edge.status).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The drilled part (Phase 161)
// ---------------------------------------------------------------------------

const deepTree = [
  'app/ui/button.ts',
  'app/ui/list.ts',
  'app/state/store.ts',
  'app/state/undo.ts',
  'app/index.ts',
  'core/run.ts',
  'core/plan.ts',
  'store/db.ts',
  'net/http.ts',
  'log/log.ts'
];

const deepImports = [
  { fromPath: 'app/ui/button.ts', toPath: 'app/state/store.ts', resolution: 'first-party' },
  { fromPath: 'app/ui/list.ts', toPath: 'app/state/store.ts', resolution: 'first-party' },
  { fromPath: 'app/index.ts', toPath: 'app/ui/button.ts', resolution: 'first-party' },
  { fromPath: 'app/state/store.ts', toPath: 'store/db.ts', resolution: 'first-party' },
  { fromPath: 'core/run.ts', toPath: 'app/state/undo.ts', resolution: 'first-party' },
  { fromPath: 'net/http.ts', toPath: 'core/plan.ts', resolution: 'first-party' },
  { fromPath: 'app/ui/button.ts', toPath: null, resolution: 'external' },
  { fromPath: 'app/state/undo.ts', toPath: null, resolution: 'unresolved' },
  { fromPath: 'log/log.ts', toPath: null, resolution: 'unresolved' }
];

function deepContract(): ArchDocument {
  return {
    contract: {
      version: 1,
      subject: 'a deep test',
      strictness: 'not-wrong',
      layers: [],
      flows: []
    },
    components: [
      {
        id: 'the-app',
        name: 'The App',
        kind: 'component',
        layer: 'surface',
        provenance: 'first-party',
        anchors: ['app'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      },
      {
        id: 'the-ui',
        name: 'The UI',
        kind: 'component',
        layer: 'surface',
        provenance: 'first-party',
        anchors: ['app/ui'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      },
      {
        id: 'the-core',
        name: 'The Core',
        kind: 'component',
        layer: 'engine',
        provenance: 'first-party',
        anchors: ['core'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      }
    ],
    edges: [
      {
        id: 'app-must-not-store',
        from: 'the-app',
        to: 'the-core',
        kind: 'imports',
        rule: 'must-not',
        checker: 'imports',
        evidence: []
      }
    ],
    baseline: { accepted: [] },
    problems: []
  };
}

function partInput(
  overrides?: Partial<ArchMapPartComposeInput>
): ArchMapPartComposeInput {
  return {
    subject: 'a deep test',
    trackedFiles: deepTree,
    imports: deepImports,
    document: null,
    verdicts: [],
    groupId: 'app',
    ...overrides
  };
}

describe('the drilled part', () => {
  it('groups the part one directory level deeper, weights and bands scoped', () => {
    const model = composeArchMapPart(partInput());
    expect(model.known).toBe(true);
    expect(model.groupId).toBe('app');
    expect(model.groupDir).toBe('app');
    expect(model.modules.map((m) => m.id)).toEqual(['app', 'app-state', 'app-ui']);
    const ui = model.modules.find((m) => m.id === 'app-ui');
    expect(ui?.fileCount).toBe(2);
    expect(ui?.band).toBe('engine');
    const state = model.modules.find((m) => m.id === 'app-state');
    expect(state?.band).toBe('foundation');
    // The loose file draws as a module wearing the part's own directory.
    const loose = model.modules.find((m) => m.id === 'app');
    expect(loose?.fileCount).toBe(1);
    expect(loose?.band).toBe('surface');
    expect(model.fileCount).toBe(5);
  });

  it('carries the part denominators and the per module honest grey', () => {
    const model = composeArchMapPart(partInput());
    expect(model.totalImports).toBe(6);
    expect(model.resolvedImports).toBe(4);
    expect(model.unresolvedImports).toBe(1);
    const state = model.modules.find((m) => m.id === 'app-state');
    expect(state?.totalImports).toBe(2);
    expect(state?.resolvedImports).toBe(1);
    expect(state?.unresolvedImports).toBe(1);
    const ui = model.modules.find((m) => m.id === 'app-ui');
    expect(ui?.externalImports).toBe(1);
  });

  it('draws the interior edges between modules, heaviest first', () => {
    const model = composeArchMapPart(partInput());
    expect(model.edges).toEqual([
      { from: 'app-ui', to: 'app-state', count: 2, status: null, edgeId: null },
      { from: 'app', to: 'app-ui', count: 1, status: null, edgeId: null }
    ]);
  });

  it('keeps the crossing edges at the frame with direction, name and count', () => {
    const model = composeArchMapPart(partInput());
    expect(model.crossings).toEqual([
      {
        moduleId: 'app-state',
        outsideId: 'core',
        outsideLabel: 'core',
        outsideBand: 'engine',
        direction: 'in',
        count: 1
      },
      {
        moduleId: 'app-state',
        outsideId: 'store',
        outsideLabel: 'store',
        outsideBand: 'foundation',
        direction: 'out',
        count: 1
      }
    ]);
  });

  it('answers known false when the partition no longer holds the group', () => {
    const model = composeArchMapPart(partInput({ groupId: 'no-such-part' }));
    expect(model.known).toBe(false);
    expect(model.modules).toEqual([]);
    expect(model.edges).toEqual([]);
    expect(model.crossings).toEqual([]);
    expect(model.fileCount).toBe(0);
  });

  it('gives the same bytes whatever order the facts arrive in', () => {
    const one = composeArchMapPart(partInput());
    const two = composeArchMapPart(
      partInput({
        imports: [...deepImports].reverse(),
        trackedFiles: [...deepTree].reverse()
      })
    );
    expect(JSON.stringify(two)).toBe(JSON.stringify(one));
  });

  it('wears the overlay name on the part and on a module a component sits in', () => {
    const model = composeArchMapPart(partInput({ document: deepContract() }));
    expect(model.groupLabel).toBe('The App');
    expect(model.componentId).toBe('the-app');
    const ui = model.modules.find((m) => m.id === 'app-ui');
    expect(ui?.label).toBe('The UI');
    expect(ui?.componentId).toBe('the-ui');
    // The outside frame keeps the person's name too.
    const crossing = model.crossings.find((c) => c.outsideId === 'core');
    expect(crossing?.outsideLabel).toBe('The Core');
  });

  it('scopes the strip counts and the subject ids to the part', () => {
    const model = composeArchMapPart(
      partInput({
        document: deepContract(),
        verdicts: [
          {
            subjectId: 'component:the-app',
            status: 'convergent',
            coverage: 'checked'
          },
          {
            subjectId: 'component:the-core',
            status: 'convergent',
            coverage: 'checked'
          },
          {
            subjectId: 'edge:app-must-not-store',
            status: 'divergent',
            coverage: 'checked',
            offending: [
              {
                fromPath: 'app/state/store.ts',
                toPath: 'core/run.ts',
                line: 3,
                specifier: '../core/run'
              }
            ]
          },
          {
            subjectId: 'component:the-app#gap:0',
            status: 'unverifiable',
            coverage: 'unverifiable'
          },
          {
            subjectId: 'component:the-app#freshness',
            status: 'convergent',
            coverage: 'checked'
          }
        ]
      })
    );
    // the-core holds its majority outside the part, so its component verdict
    // stays out of scope; its promise touches the-app, so that one is in.
    expect(model.subjectIds).toEqual([
      'component:the-app',
      'component:the-app#freshness',
      'component:the-app#gap:0',
      'edge:app-must-not-store'
    ]);
    expect(model.counts.checkedHold).toBe(1);
    expect(model.counts.broke).toBe(1);
    expect(model.counts.cannotCheck).toBe(1);
    expect(model.counts.accepted).toBe(0);
    expect(model.counts.totalImports).toBe(6);
    expect(model.counts.unresolvedImports).toBe(1);
  });

  it('re-derives accepted from the baseline over the stored offences', () => {
    const document = deepContract();
    document.baseline = {
      accepted: [
        {
          edgeId: 'app-must-not-store',
          fromPath: 'app/state/store.ts',
          toPath: 'core/run.ts',
          because: 'grandfathered',
          at: '2026-08-27'
        }
      ]
    };
    const model = composeArchMapPart(
      partInput({
        document,
        verdicts: [
          {
            subjectId: 'edge:app-must-not-store',
            status: 'divergent',
            coverage: 'checked',
            offending: [
              {
                fromPath: 'app/state/store.ts',
                toPath: 'core/run.ts',
                line: 3,
                specifier: '../core/run'
              }
            ]
          }
        ]
      })
    );
    expect(model.counts.accepted).toBe(1);
    expect(model.counts.broke).toBe(0);
  });

  it('counts nothing scoped when no contract exists', () => {
    const model = composeArchMapPart(partInput());
    expect(model.contractPresent).toBe(false);
    expect(model.subjectIds).toEqual([]);
    expect(model.counts).toEqual({
      checkedHold: 0,
      broke: 0,
      cannotCheck: 0,
      accepted: 0,
      unresolvedImports: 1,
      totalImports: 6
    });
  });
});

// ---------------------------------------------------------------------------
// The reading (Phase 201)
// ---------------------------------------------------------------------------

describe('the reading on the map', () => {
  const readingTree = [
    ...Array.from({ length: 6 }, (_, i) => `src/main/machines/m${String(i)}.ts`),
    ...Array.from({ length: 5 }, (_, i) => `src/main/arch/a${String(i)}.ts`),
    'src/main/index.ts',
    ...Array.from({ length: 6 }, (_, i) => `src/shared/s${String(i)}.ts`),
    ...Array.from({ length: 5 }, (_, i) => `build/probe-${String(i)}.mjs`),
    ...Array.from({ length: 5 }, (_, i) => `docs/research/${String(i)}.md`),
    ...Array.from({ length: 5 }, (_, i) => `tools/t${String(i)}.mjs`),
    ...Array.from({ length: 4 }, (_, i) => `server/src/r${String(i)}.ts`),
    'server/package.json',
    'package.json',
    'README.md'
  ];
  const readingImports = [
    { fromPath: 'build/probe-0.mjs', toPath: 'src/main/index.ts', resolution: 'first-party' },
    { fromPath: 'src/main/arch/a0.ts', toPath: 'src/shared/s0.ts', resolution: 'first-party' },
    { fromPath: 'src/main/arch/a1.ts', toPath: 'src/shared/s1.ts', resolution: 'first-party' },
    { fromPath: 'src/main/machines/m0.ts', toPath: null, resolution: 'external' },
    // Target grain: the target is a directory, which P6 places.
    { fromPath: 'server/src/r0.ts', toPath: 'src/shared', resolution: 'first-party' }
  ];
  const readingTreeFacts: ArchTreeFileFact[] = [
    { path: 'src/main/index.ts', lines: 40, declares: null },
    { path: 'src/main/arch/a0.ts', lines: 200, declares: null },
    { path: 'server/package.json', lines: 3, declares: 'rookery-server' },
    { path: 'package.json', lines: 9, declares: 'tortie' }
  ];
  const readingDefinitions: ArchFileDefinitions[] = [
    { path: 'src/main/index.ts', kinds: { function: 2 } },
    { path: 'src/main/arch/a0.ts', kinds: { function: 5, interface: 1 } }
  ];
  const reading = () =>
    composeArchMap(
      input({
        subject: 'tortie',
        trackedFiles: readingTree,
        imports: readingImports,
        treeFacts: readingTreeFacts,
        definitions: readingDefinitions
      })
    );

  it('draws rule P boxes with a sentence, the languages, the lines, the entries and the facts', () => {
    const model = reading();
    expect(model.groups.map((g) => g.id)).toEqual([
      'build',
      'other',
      'server',
      'src-main',
      'src-shared',
      'tools'
    ]);
    const main = model.groups.find((g) => g.id === 'src-main');
    expect(main?.label).toBe('src/main');
    expect(main?.sentence).toBe(
      '12 files, TypeScript; made of machines, arch and 1 more; used by build; uses src/shared; entry src/main/index.ts.'
    );
    expect(main?.languages).toEqual([{ name: 'TypeScript', files: 12 }]);
    expect(main?.lines).toBe(240);
    expect(main?.entries).toEqual(['src/main/index.ts']);
    expect(main?.facts).toEqual([
      'Size: 12 files, 240 lines',
      'Languages: TypeScript 12',
      'Defines: 7 functions, 1 interface',
      'Entries: src/main/index.ts',
      'Imports: 3 written, 2 to this repository, 1 to dependencies, 0 not followed',
      'Used by: build 1',
      'Uses: src/shared 2',
      'Folders: machines 6, arch 5'
    ]);
  });

  it('names a box for the manifest at its root, and the fold everything else', () => {
    const model = reading();
    expect(model.groups.find((g) => g.id === 'server')?.label).toBe('server (rookery-server)');
    const other = model.groups.find((g) => g.id === 'other');
    expect(other?.label).toBe('everything else');
    expect(other?.dir).toBe('');
    expect(other?.sentence).toBe('7 files, mostly Markdown; 1 small folder (docs) and 2 root files; not code.');
    expect(other?.facts).toContain('Declares: package.json tortie');
  });

  it('draws the edge a target grain import makes, through P6', () => {
    const model = reading();
    expect(model.edges).toContainEqual({
      from: 'server',
      to: 'src-shared',
      count: 1,
      status: null,
      edgeId: null
    });
    const server = model.groups.find((g) => g.id === 'server');
    expect(server?.band).toBe('surface');
    expect(server?.sentence).toContain('uses src/shared');
  });

  it('carries the repository line, rule R', () => {
    const model = reading();
    expect(model.sentence).toBe(
      'tortie: 40 files, mostly TypeScript; 6 parts, the biggest src/main (30%); 3 connections between parts; 4 of 5 imports lead inside the repository.'
    );
  });

  it('composes the same bytes whatever order the facts arrive in', () => {
    const one = reading();
    const two = composeArchMap(
      input({
        subject: 'tortie',
        trackedFiles: [...readingTree].reverse(),
        imports: [...readingImports].reverse(),
        treeFacts: [...readingTreeFacts].reverse(),
        definitions: [...readingDefinitions].reverse()
      })
    );
    expect(JSON.stringify(two)).toBe(JSON.stringify(one));
  });

  it('gives the drilled modules the same five fields, and the frame the P6 crossing', () => {
    const model = composeArchMapPart({
      ...input({ subject: 'tortie', trackedFiles: readingTree, imports: readingImports }),
      groupId: 'src-shared',
      verdicts: []
    });
    expect(model.known).toBe(true);
    for (const module of model.modules) {
      expect(typeof module.sentence).toBe('string');
      expect(Array.isArray(module.facts)).toBe(true);
    }
    expect(model.crossings.map((c) => `${c.outsideId}:${c.direction}:${String(c.count)}`)).toEqual([
      'src-main:in:2',
      'server:in:1'
    ]);
    expect(model.crossings.find((c) => c.outsideId === 'server')?.outsideLabel).toBe('server');
  });
});
