/**
 * The enrichment validator's refusals (Phase 158), each driven whole.
 *
 * Every refusal named in the charter is a case here: breaks the shape, names
 * a file it should not, invents a number, drops or invents a part, moves an
 * anchor, and carries baseline content. The keeper cases beside them prove
 * the refusals can pass, which is what makes them meaningful, and the digit
 * rule fixtures pin the mechanical form the spec asked builder A to pin.
 */

import { describe, expect, it } from 'vitest';
import type { ArchDocument } from '@shared/arch';
import { composeArchEnrichPrompt } from '../compose';
import {
  digitRuns,
  unwrapAnswerText,
  validateArchAnswer
} from '../validate';

function draft(): ArchDocument {
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
      {
        id: 'src-app',
        name: 'src/app',
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
        id: 'src-core',
        name: 'src/core',
        kind: 'component',
        layer: 'engine',
        provenance: 'first-party',
        anchors: ['src/core'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      }
    ],
    edges: [
      {
        id: 'src-app-imports-src-core',
        from: 'src-app',
        to: 'src-core',
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

const TRACKED = ['src/app/a.ts', 'src/core/b.ts'];
const IMPORTS = [{ fromPath: 'src/app/a.ts', toPath: 'src/core/b.ts' }];

function contextFor(document: ArchDocument): {
  document: ArchDocument;
  factBlock: string;
} {
  const composed = composeArchEnrichPrompt({
    document,
    trackedFiles: TRACKED,
    imports: IMPORTS
  });
  return { document, factBlock: composed.factBlock };
}

function validAnswer(document: ArchDocument): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(rawAnswer(document))
  ) as Record<string, unknown>;
}

function rawAnswer(document: ArchDocument): Record<string, unknown> {
  return {
    contract: document.contract,
    components: [
      {
        ...document.components[0],
        name: 'The App',
        description: 'Draws the screen.'
      },
      {
        ...document.components[1],
        name: 'The Core',
        description: 'Owns the rules.',
        gaps: ['No one owns error reporting yet.']
      }
    ],
    edges: {
      edges: [
        { ...document.edges[0], rule: 'must' },
        {
          id: 'src-core-must-not-import-src-app',
          from: 'src-core',
          to: 'src-app',
          kind: 'imports',
          rule: 'must-not',
          checker: 'imports',
          evidence: []
        }
      ]
    },
    suggestions: ['Consider splitting the app shell from the views.']
  };
}

describe('validateArchAnswer keeps an honest answer whole', () => {
  it('keeps the valid answer, with the new must-not edge and the suggestion', () => {
    const doc = draft();
    const ruling = validateArchAnswer(
      JSON.stringify(validAnswer(doc)),
      contextFor(doc)
    );
    expect(ruling.refusal).toBeNull();
    expect(ruling.kept).not.toBeNull();
    expect(ruling.kept?.edges).toHaveLength(2);
    expect(ruling.kept?.edges[1]?.rule).toBe('must-not');
    expect(ruling.kept?.suggestions).toEqual([
      'Consider splitting the app shell from the views.'
    ]);
  });

  it('unwraps a markdown fence before parsing, and still judges whole', () => {
    const doc = draft();
    const fenced = '```json\n' + JSON.stringify(validAnswer(doc)) + '\n```';
    const ruling = validateArchAnswer(fenced, contextFor(doc));
    expect(ruling.refusal).toBeNull();
  });

  it('allows a strictness change, a layer move and a boundary edit', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['contract'] as Record<string, unknown>)['strictness'] = 'complete';
    const components = answer['components'] as Record<string, unknown>[];
    components[0]!['layer'] = 'engine';
    components[0]!['boundary'] = 'closed';
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBeNull();
  });
});

describe('validateArchAnswer refuses whole', () => {
  it('refuses text that is not JSON as bad-shape', () => {
    const doc = draft();
    const ruling = validateArchAnswer('this is not JSON {', contextFor(doc));
    expect(ruling.kept).toBeNull();
    expect(ruling.refusal).toBe('bad-shape');
  });

  it('refuses an unknown top level key as bad-shape', () => {
    const doc = draft();
    const answer = { ...validAnswer(doc), extra: true };
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('bad-shape');
  });

  it('refuses baseline content by its own name', () => {
    const doc = draft();
    const answer = { ...validAnswer(doc), baseline: { accepted: [] } };
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('baseline-content');
  });

  it('refuses an unknown key on a component, which load would tolerate', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[0]!['command'] = 'rm';
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('invalid-row');
  });

  it('refuses a dropped part as component-set-changed', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['components'] as unknown[]).pop();
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('component-set-changed');
  });

  it('refuses an invented part as component-set-changed', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    const invented = {
      ...(answer['components'] as Record<string, unknown>[])[0]!,
      id: 'brand-new'
    };
    (answer['components'] as unknown[]).push(invented);
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('component-set-changed');
  });

  it('refuses a moved anchor as anchors-changed, the map binding rule', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[0]!['anchors'] = [
      'src/elsewhere'
    ];
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('anchors-changed');
  });

  it('refuses a path that escapes the repository at the field layer', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[0]!['anchors'] = [
      '../../etc/passwd'
    ];
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.kept).toBeNull();
    expect(ruling.refusal).toBe('invalid-row');
  });

  it('refuses a changed kind', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[0]!['kind'] = 'store';
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('kind-changed');
  });

  it('refuses a changed subject or layer set as contract-changed', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['contract'] as Record<string, unknown>)['subject'] = 'renamed';
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('contract-changed');
  });

  it('refuses evidence anywhere, because the model never read the code', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[0]!['evidence'] = [
      {
        path: 'src/app/a.ts',
        lineStart: 1,
        lineEnd: 1,
        quote: 'import x'
      }
    ];
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('evidence-not-allowed');
  });

  it('refuses an edge whose end names no drafted part', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    const edges = (answer['edges'] as { edges: Record<string, unknown>[] })
      .edges;
    edges.push({
      id: 'src-app-imports-ghost',
      from: 'src-app',
      to: 'ghost',
      kind: 'imports',
      rule: 'must-not',
      checker: 'imports',
      evidence: []
    });
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('edge-endpoints');
  });

  it('refuses an over-long suggestions list, and a non-string entry', () => {
    const doc = draft();
    const long = { ...validAnswer(doc), suggestions: Array(17).fill('s') };
    expect(
      validateArchAnswer(JSON.stringify(long), contextFor(doc)).refusal
    ).toBe('suggestions-invalid');
    const wrong = { ...validAnswer(doc), suggestions: [42] };
    expect(
      validateArchAnswer(JSON.stringify(wrong), contextFor(doc)).refusal
    ).toBe('suggestions-invalid');
  });
});

describe('the invented number rule, pinned mechanically', () => {
  it('splits digit runs maximally', () => {
    expect(digitRuns('handles 99731 requests since 2026-08-28')).toEqual([
      '99731',
      '2026',
      '08',
      '28'
    ]);
    expect(digitRuns('no digits here')).toEqual([]);
  });

  it('keeps a number that appears verbatim in the fact block', () => {
    const doc = draft();
    const context = contextFor(doc);
    // The fact block counts 1 file per part, so "1" is a fact.
    expect(context.factBlock).toContain('1 file');
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[0]!['description'] =
      'Holds 1 file today.';
    const ruling = validateArchAnswer(JSON.stringify(answer), context);
    expect(ruling.refusal).toBeNull();
  });

  it('refuses a number the facts never stated, naming the field', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[0]!['description'] =
      'Handles 99731 requests.';
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('invented-number');
    expect(ruling.detail).toContain('99731');
    expect(ruling.detail).toContain('src-app');
  });

  it('reads gaps and edge notes too', () => {
    const doc = draft();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[1]!['gaps'] = [
      'About 4444 lines are untested.'
    ];
    expect(
      validateArchAnswer(JSON.stringify(answer), contextFor(doc)).refusal
    ).toBe('invented-number');
    const answer2 = validAnswer(doc);
    const edges = (answer2['edges'] as { edges: Record<string, unknown>[] })
      .edges;
    edges[0]!['note'] = 'Seen 7777 times.';
    expect(
      validateArchAnswer(JSON.stringify(answer2), contextFor(doc)).refusal
    ).toBe('invented-number');
  });
});

describe('unwrapAnswerText', () => {
  it('leaves plain JSON alone and unwraps one fence', () => {
    expect(unwrapAnswerText('{"a":1}')).toBe('{"a":1}');
    expect(unwrapAnswerText('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(unwrapAnswerText('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
});
