/**
 * The drop whole rule, one case at a time (Phase 63).
 *
 * The gate proves this over a fixture with four planted faults. These prove the
 * shape of the rule itself: what a drop costs, what it names, and the one case
 * that is deliberately not a drop.
 */

import { describe, expect, it } from 'vitest';
import { ARCH_COMPONENT_KINDS } from '@shared/arch';
import { loadArchDocument, type ArchFileSystem } from '../load';
import {
  isTortieComponent,
  parseArchJson,
  validateBaseline,
  validateComponent,
  validateContract,
  validateEdges
} from '../validate';

const contract = {
  version: 1,
  subject: 'A test contract',
  strictness: 'not-wrong',
  layers: [
    { id: 'surface', name: 'surface', order: 0 },
    { id: 'engine', name: 'engine', order: 1 },
    { id: 'foundation', name: 'foundation', order: 2 }
  ],
  flows: []
};

const component = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'app',
  name: 'app',
  kind: 'component',
  layer: 'surface',
  provenance: 'first-party',
  anchors: ['src/app'],
  boundary: 'open',
  description: '',
  evidence: [],
  deprecated: false,
  gaps: [],
  ...over
});

/** A reader over an in memory tree, so a load can be driven with no disk at all. */
function memoryFs(files: Record<string, string>): ArchFileSystem {
  return {
    readFile: (path) => Promise.resolve(files[path] ?? null),
    readDir: (path) =>
      Promise.resolve(
        Object.keys(files)
          .filter((p) => p.startsWith(`${path}/`))
          .map((p) => p.slice(path.length + 1))
      )
  };
}

describe('validateContract', () => {
  it('reads a good one', () => {
    const result = validateContract(contract, 'contract.json');
    expect(result.value?.subject).toBe('A test contract');
    expect(result.problems).toEqual([]);
  });

  it('refuses a version this build does not read, and says growth is a bump', () => {
    const result = validateContract({ ...contract, version: 2 }, 'contract.json');
    expect(result.value).toBeNull();
    expect(result.problems[0]?.field).toBe('contract.version');
    expect(result.problems[0]?.message).toContain('version bump with a converter');
  });

  it('refuses fewer bands than a drawing needs', () => {
    const result = validateContract({ ...contract, layers: [] }, 'contract.json');
    expect(result.value).toBeNull();
    expect(result.problems[0]?.field).toBe('contract.layers');
  });
});

describe('validateComponent', () => {
  it('drops the row whole when one anchor is bad, and names the field', () => {
    const result = validateComponent(
      component({ anchors: ['src/app', '-hostile'] }),
      'components/app.json'
    );
    expect(result.value).toBeNull();
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.file).toBe('components/app.json');
    expect(result.problems[0]?.field).toBe('component.anchors[1]');
    expect(result.problems[0]?.message).toContain('starts with a hyphen');
  });

  it('keeps a row that carries a field this build does not know, and reports it', () => {
    const result = validateComponent(
      component({ command: 'rm -rf /' }),
      'components/app.json'
    );
    expect(result.value?.id).toBe('app');
    expect(result.problems[0]?.field).toBe('component.command');
    expect(result.problems[0]?.message).toContain('this build ignores');
  });

  it('refuses a part that lives in the tree and names none of it', () => {
    const result = validateComponent(component({ anchors: [] }), 'components/app.json');
    expect(result.value).toBeNull();
    expect(result.problems[0]?.message).toContain('checked against nothing');
  });

  it('lets the two kinds that live outside the tree name no place', () => {
    const result = validateComponent(
      component({ id: 'left-pad', kind: 'external-service', anchors: [] }),
      'components/left-pad.json'
    );
    expect(result.value?.id).toBe('left-pad');
  });
});

describe('the recognisably a component rule (Phase 177, ignore quietly)', () => {
  /** Rookery's Set A shape: the operator's hand authored foreign schema. */
  const foreign = {
    id: 'acp-facade',
    name: 'ACP Facade',
    layer: 'server-edge',
    provenance: 'written-here',
    anchors: ['server/src/acp'],
    summary: 'A facade over the agent client protocol.',
    notes: 'Hand authored before the run.'
  };

  it('recognises every kind this build draws, and nothing else', () => {
    for (const kind of ARCH_COMPONENT_KINDS) {
      expect(isTortieComponent({ kind })).toBe(true);
    }
    expect(isTortieComponent(foreign)).toBe(false);
    expect(isTortieComponent({ kind: 'servce' })).toBe(false);
    expect(isTortieComponent({ kind: 7 })).toBe(false);
    expect(isTortieComponent([])).toBe(false);
    expect(isTortieComponent('component')).toBe(false);
    expect(isTortieComponent(null)).toBe(false);
  });

  it('folds a foreign file to ONE calm line, not the two red rows', () => {
    const result = validateComponent(foreign, 'components/acp-facade.json');
    expect(result.value).toBeNull();
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.file).toBe('components/acp-facade.json');
    expect(result.problems[0]?.message).toContain('Not a Tortie component');
    expect(result.problems[0]?.message).toContain('skipped');
  });

  it('folds valid JSON that is no component at all to the same one line', () => {
    for (const raw of [{ hello: true }, {}, [], 'text', 42, null]) {
      const result = validateComponent(raw, 'components/stray.json');
      expect(result.value).toBeNull();
      expect(result.problems).toHaveLength(1);
      expect(result.problems[0]?.message).toContain('Not a Tortie component');
    }
  });

  it('folds a kind this build does not draw, because no valid kind at all is the rule', () => {
    const result = validateComponent(
      component({ kind: 'servce' }),
      'components/app.json'
    );
    expect(result.value).toBeNull();
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.message).toContain('Not a Tortie component');
  });

  it('THE PHASE 23 REFUSAL SURVIVES: a real component with one bad field still drops whole, named', () => {
    const result = validateComponent(
      component({ anchors: ['-hostile'] }),
      'components/app.json'
    );
    expect(result.value).toBeNull();
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.field).toBe('component.anchors[0]');
    expect(result.problems[0]?.message).not.toContain('Not a Tortie component');
  });

  it('a real component with one extra field is still kept and the field still reported', () => {
    const result = validateComponent(
      component({ summary: 'extra' }),
      'components/app.json'
    );
    expect(result.value?.id).toBe('app');
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.field).toBe('component.summary');
    expect(result.problems[0]?.message).toContain('this build ignores');
  });
});

describe('validateEdges', () => {
  const edge = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 'a-to-b',
    from: 'app',
    to: 'core',
    kind: 'imports',
    rule: 'must-not',
    checker: 'imports',
    evidence: [],
    ...over
  });

  it('drops one bad promise and keeps the rest of the file', () => {
    const result = validateEdges(
      { edges: [edge(), edge({ id: 'b-to-c', rule: 'sideways' })] },
      'edges.json'
    );
    expect(result.rows.map((r) => r.id)).toEqual(['a-to-b']);
    expect(result.problems[0]?.field).toBe('edges[1].rule');
  });

  it('keeps the first promise with a repeated id and says which one it ignored', () => {
    const result = validateEdges({ edges: [edge(), edge({ to: 'store' })] }, 'edges.json');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.to).toBe('core');
    expect(result.problems[0]?.message).toContain('repeats the id');
  });
});

describe('validateBaseline', () => {
  it('reads the accepted rows and refuses a path that could be an option', () => {
    const result = validateBaseline(
      {
        accepted: [
          {
            fromPath: 'src/a.ts',
            toPath: 'src/b.ts',
            because: 'It is on the list.',
            at: '2026-08-25'
          },
          {
            fromPath: '-hostile',
            toPath: 'src/b.ts',
            because: 'no',
            at: '2026-08-25'
          }
        ]
      },
      'baseline.json'
    );
    expect(result.value?.accepted).toHaveLength(1);
    expect(result.problems[0]?.field).toBe('baseline.accepted[1].fromPath');
  });
});

describe('parseArchJson', () => {
  it('turns a conflicted file into one problem that names the merge', () => {
    const result = parseArchJson('<<<<<<< HEAD\n{}\n', 'edges.json');
    expect(result.value).toBeNull();
    expect(result.problems[0]?.message).toContain('conflict markers');
  });
});

describe('loadArchDocument', () => {
  it('drops a part whose band does not exist and keeps the others', async () => {
    const doc = await loadArchDocument(
      memoryFs({
        'docs/arch/contract.json': JSON.stringify(contract),
        'docs/arch/components/app.json': JSON.stringify(component()),
        'docs/arch/components/lost.json': JSON.stringify(
          component({ id: 'lost', layer: 'nowhere' })
        )
      })
    );
    expect(doc.components.map((c) => c.id)).toEqual(['app']);
    expect(doc.problems[0]?.field).toBe('component.layer');
    expect(doc.problems[0]?.message).toContain('has no band with that name');
  });

  it('drops a promise whose far end names nothing', async () => {
    const doc = await loadArchDocument(
      memoryFs({
        'docs/arch/contract.json': JSON.stringify(contract),
        'docs/arch/components/app.json': JSON.stringify(component()),
        'docs/arch/edges.json': JSON.stringify({
          edges: [
            {
              id: 'dangling',
              from: 'app',
              to: 'nope',
              kind: 'imports',
              rule: 'must',
              checker: 'imports',
              evidence: []
            }
          ]
        })
      })
    );
    expect(doc.edges).toEqual([]);
    expect(doc.problems[0]?.message).toContain('no component file declares');
  });

  it('reads nothing at all when there is no contract, and says nothing is wrong', async () => {
    const doc = await loadArchDocument(memoryFs({}));
    expect(doc.contract).toBeNull();
    expect(doc.problems).toEqual([]);
  });
});
