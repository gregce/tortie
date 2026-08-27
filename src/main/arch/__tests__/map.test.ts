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
import { composeArchMap, type ArchMapComposeInput } from '../map';

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
        description: '',
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
