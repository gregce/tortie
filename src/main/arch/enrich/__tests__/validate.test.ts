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

  it('refuses a quote the draft never held, because the model never read the code', () => {
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

describe('rule 6 amended: evidence carries forward byte for byte or not at all (Phase 159)', () => {
  const quote = { path: 'src/core/b.ts', lineStart: 1, lineEnd: 1, quote: 'export' };

  function draftWithQuote(): ArchDocument {
    const doc = draft();
    doc.components[1]!.evidence = [quote];
    doc.edges[0]!.evidence = [{ ...quote, lineStart: 2, lineEnd: 2 }];
    return doc;
  }

  it('keeps the draft quotes returned as written, on a part and on a promise', () => {
    const doc = draftWithQuote();
    const answer = validAnswer(doc);
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBeNull();
    expect(ruling.kept?.components[1]?.evidence).toEqual([quote]);
    expect(ruling.kept?.edges[0]?.evidence).toHaveLength(1);
  });

  it('keeps a quote returned with its keys in another order', () => {
    const doc = draftWithQuote();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[1]!['evidence'] = [
      { quote: 'export', lineEnd: 1, lineStart: 1, path: 'src/core/b.ts' }
    ];
    expect(validateArchAnswer(JSON.stringify(answer), contextFor(doc)).refusal).toBeNull();
  });

  it('keeps an answer that DROPS a quote, because a stale quote is a repair', () => {
    const doc = draftWithQuote();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[1]!['evidence'] = [];
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBeNull();
    expect(ruling.kept?.components[1]?.evidence).toEqual([]);
  });

  it('refuses a quote whose words moved by one character', () => {
    const doc = draftWithQuote();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[1]!['evidence'] = [
      { ...quote, quote: 'exports' }
    ];
    const ruling = validateArchAnswer(JSON.stringify(answer), contextFor(doc));
    expect(ruling.refusal).toBe('evidence-not-allowed');
    expect(ruling.detail).toContain('src-core');
  });

  it('refuses a draft quote moved onto another part', () => {
    const doc = draftWithQuote();
    const answer = validAnswer(doc);
    (answer['components'] as Record<string, unknown>[])[0]!['evidence'] = [quote];
    expect(validateArchAnswer(JSON.stringify(answer), contextFor(doc)).refusal).toBe(
      'evidence-not-allowed'
    );
  });

  it('refuses evidence on a promise the draft never held', () => {
    const doc = draftWithQuote();
    const answer = validAnswer(doc);
    const edges = (answer['edges'] as { edges: Record<string, unknown>[] }).edges;
    edges[1]!['evidence'] = [quote];
    expect(validateArchAnswer(JSON.stringify(answer), contextFor(doc)).refusal).toBe(
      'evidence-not-allowed'
    );
  });
});

describe('rule 10: outside the drift nothing moves (Phase 159)', () => {
  /** The draft, enriched once so the parts hold prose the repair must keep. */
  function enriched(): ArchDocument {
    const doc = draft();
    doc.components[0]!.name = 'The App';
    doc.components[0]!.description = 'Draws the screen.';
    doc.components[1]!.name = 'The Core';
    doc.components[1]!.description = 'Owns the rules.';
    doc.edges.push({
      id: 'src-core-must-not-import-src-app',
      from: 'src-core',
      to: 'src-app',
      kind: 'imports',
      rule: 'must-not',
      checker: 'imports',
      evidence: []
    });
    return doc;
  }

  const scope = {
    componentIds: ['src-app', 'src-core'],
    edgeIds: ['src-core-must-not-import-src-app']
  };

  function scoped(document: ArchDocument) {
    return { ...contextFor(document), scope };
  }

  /** The answer a repair gives: the contract back whole, with one gap on a drifted part. */
  function repair(document: ArchDocument): Record<string, unknown> {
    return JSON.parse(
      JSON.stringify({
        contract: document.contract,
        components: [
          document.components[0],
          { ...document.components[1], gaps: ['The core imports the app and must stop.'] }
        ],
        edges: { edges: document.edges },
        suggestions: []
      })
    ) as Record<string, unknown>;
  }

  it('keeps a repair that edits only the drifted part and promise', () => {
    const doc = enriched();
    const answer = repair(doc);
    const edges = (answer['edges'] as { edges: Record<string, unknown>[] }).edges;
    edges[1]!['rule'] = 'may';
    const ruling = validateArchAnswer(JSON.stringify(answer), scoped(doc));
    expect(ruling.refusal).toBeNull();
    expect(ruling.kept?.edges[1]?.rule).toBe('may');
  });

  it('keeps the same answer with keys in another order, so order is not a change', () => {
    const doc = enriched();
    const answer = repair(doc);
    const first = (answer['components'] as Record<string, unknown>[])[0]!;
    (answer['components'] as Record<string, unknown>[])[0] = Object.fromEntries(
      Object.entries(first).reverse()
    );
    expect(validateArchAnswer(JSON.stringify(answer), scoped(doc)).refusal).toBeNull();
  });

  it('refuses an edit to a part outside the drift', () => {
    const doc = enriched();
    const answer = repair(doc);
    const ruling = validateArchAnswer(JSON.stringify(answer), {
      ...contextFor(doc),
      scope: { componentIds: ['src-app'], edgeIds: [] }
    });
    expect(ruling.refusal).toBe('outside-drift');
    expect(ruling.detail).toContain('src-core');
  });

  it('refuses an edit to a promise outside the drift', () => {
    const doc = enriched();
    const answer = repair(doc);
    const edges = (answer['edges'] as { edges: Record<string, unknown>[] }).edges;
    edges[0]!['rule'] = 'must';
    const ruling = validateArchAnswer(JSON.stringify(answer), scoped(doc));
    expect(ruling.refusal).toBe('outside-drift');
    expect(ruling.detail).toContain('src-app-imports-src-core');
  });

  it('refuses a promise the contract never held, which a whole pass would keep', () => {
    const doc = enriched();
    const answer = repair(doc);
    const edges = (answer['edges'] as { edges: Record<string, unknown>[] }).edges;
    edges.push({
      id: 'src-app-must-import-src-core',
      from: 'src-app',
      to: 'src-core',
      kind: 'imports',
      rule: 'must',
      checker: 'imports',
      evidence: []
    });
    expect(validateArchAnswer(JSON.stringify(answer), scoped(doc)).refusal).toBe(
      'outside-drift'
    );
    expect(validateArchAnswer(JSON.stringify(answer), contextFor(doc)).refusal).toBeNull();
  });

  it('refuses a dropped promise, even one inside the drift', () => {
    const doc = enriched();
    const answer = repair(doc);
    (answer['edges'] as { edges: Record<string, unknown>[] }).edges.pop();
    const ruling = validateArchAnswer(JSON.stringify(answer), scoped(doc));
    expect(ruling.refusal).toBe('outside-drift');
    expect(ruling.detail).toContain('removed');
  });

  it('refuses a new quote inside the drift, and keeps a dropped one', () => {
    const doc = enriched();
    doc.components[1]!.evidence = [
      { path: 'src/core/b.ts', lineStart: 1, lineEnd: 1, quote: 'stale' }
    ];
    const withNew = repair(doc);
    (withNew['components'] as Record<string, unknown>[])[1]!['evidence'] = [
      { path: 'src/core/b.ts', lineStart: 1, lineEnd: 1, quote: 'fresh' }
    ];
    expect(validateArchAnswer(JSON.stringify(withNew), scoped(doc)).refusal).toBe(
      'evidence-not-allowed'
    );
    const dropped = repair(doc);
    (dropped['components'] as Record<string, unknown>[])[1]!['evidence'] = [];
    expect(validateArchAnswer(JSON.stringify(dropped), scoped(doc)).refusal).toBeNull();
  });

  it('is inert without a scope: the whole pass still keeps an out of scope edit', () => {
    const doc = enriched();
    const answer = repair(doc);
    expect(
      validateArchAnswer(JSON.stringify(answer), { ...contextFor(doc), scope: null }).refusal
    ).toBeNull();
  });
});

describe('the fix round of Phase 159: the skeleton note, the contract and the promise identity', () => {
  /** The skeleton's own may note, digits and all, as Phase 158 writes it. */
  const SKELETON_NOTE =
    'Tortie saw this import 9 times and wrote it down as something that ' +
    'happens, not as a promise. Decide whether it is one. A healthy contract ' +
    'starts with 5 to 10 promises about what must and must not happen.';

  /** The skeleton over four parts: one may note with digits, one must-not that broke. */
  function skeleton(): ArchDocument {
    const doc = draft();
    doc.components.push(
      {
        id: 'scripts',
        name: 'scripts',
        kind: 'component',
        layer: 'engine',
        provenance: 'first-party',
        anchors: ['scripts'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      },
      {
        id: 'tests',
        name: 'tests',
        kind: 'component',
        layer: 'engine',
        provenance: 'first-party',
        anchors: ['tests'],
        boundary: 'open',
        description: '',
        evidence: [],
        deprecated: false,
        gaps: []
      }
    );
    doc.edges[0]!.note = SKELETON_NOTE;
    doc.edges.push({
      id: 'tests-must-not-scripts',
      from: 'tests',
      to: 'scripts',
      kind: 'imports',
      rule: 'must-not',
      checker: 'imports',
      evidence: []
    });
    return doc;
  }

  /** The scope a broken tests to scripts promise reads as: the two parts and the one edge. */
  const scope = { componentIds: ['scripts', 'tests'], edgeIds: ['tests-must-not-scripts'] };

  /** A scoped context whose fact block, like the real one, carries neither 10 nor the guidance line. */
  function scoped(document: ArchDocument) {
    return {
      document,
      factBlock: 'DRIFT\npromise edge:tests-must-not-scripts: broke\nEND DRIFT\nFACTS\ntracked files at HEAD: 4\nEND FACTS',
      scope
    };
  }

  /** The honest repair: the broken rule flipped, everything else byte identical. */
  function honest(document: ArchDocument): Record<string, unknown> {
    const answer = JSON.parse(
      JSON.stringify({
        contract: document.contract,
        components: document.components,
        edges: { edges: document.edges },
        suggestions: []
      })
    ) as Record<string, unknown>;
    (answer['edges'] as { edges: Record<string, unknown>[] }).edges[1]!['rule'] = 'may';
    return answer;
  }

  it('keeps the honest repair when the untouched skeleton note carries digits the scoped facts do not', () => {
    const doc = skeleton();
    expect(scoped(doc).factBlock.includes('10')).toBe(false);
    const ruling = validateArchAnswer(JSON.stringify(honest(doc)), scoped(doc));
    expect(ruling.refusal).toBeNull();
    expect(ruling.kept?.edges[1]?.rule).toBe('may');
  });

  it('still refuses the same note with one digit moved, so the exemption is byte identity and nothing looser', () => {
    const doc = skeleton();
    const answer = honest(doc);
    const edges = (answer['edges'] as { edges: Record<string, unknown>[] }).edges;
    edges[0]!['note'] = SKELETON_NOTE.replace('9 times', '12 times');
    const ruling = validateArchAnswer(JSON.stringify(answer), scoped(doc));
    // Rule 10 refuses first, because the note is outside the drift.
    expect(ruling.refusal).toBe('outside-drift');
    // In a whole pass rule 10 is inert, and rule 8 is what refuses it.
    const whole = validateArchAnswer(JSON.stringify(answer), {
      ...scoped(doc),
      scope: null
    });
    expect(whole.refusal).toBe('invented-number');
    expect(whole.detail).toContain('12');
  });

  it('exempts a part description returned byte identical in a whole pass too, and reads one that moved', () => {
    const doc = skeleton();
    doc.components[0]!.description = 'Serves the 3 screens.';
    const answer = honest(doc);
    const whole = { ...scoped(doc), scope: null };
    expect(validateArchAnswer(JSON.stringify(answer), whole).refusal).toBeNull();
    (answer['components'] as Record<string, unknown>[])[0]!['description'] = 'Serves the 7 screens.';
    const ruling = validateArchAnswer(JSON.stringify(answer), whole);
    expect(ruling.refusal).toBe('invented-number');
    expect(ruling.detail).toContain('src-app description');
  });

  it('refuses a strictness flip beside an honest repair, and the whole pass still allows one', () => {
    const doc = skeleton();
    const answer = honest(doc);
    (answer['contract'] as Record<string, unknown>)['strictness'] = 'complete';
    const ruling = validateArchAnswer(JSON.stringify(answer), scoped(doc));
    expect(ruling.refusal).toBe('contract-changed');
    expect(ruling.detail).toContain('did not drift');
    expect(
      validateArchAnswer(JSON.stringify(answer), { ...scoped(doc), scope: null }).refusal
    ).toBeNull();
  });

  it('refuses the drifted promise re-pointed at two other parts under its own id', () => {
    const doc = skeleton();
    const answer = honest(doc);
    const broken = (answer['edges'] as { edges: Record<string, unknown>[] }).edges[1]!;
    broken['from'] = 'src-app';
    broken['to'] = 'src-core';
    const ruling = validateArchAnswer(JSON.stringify(answer), scoped(doc));
    expect(ruling.refusal).toBe('outside-drift');
    expect(ruling.detail).toContain('tests-must-not-scripts');
    expect(ruling.detail).toContain('never its ends');
  });

  it('refuses the drifted promise with its checker or its kind changed', () => {
    const doc = skeleton();
    const checker = honest(doc);
    (checker['edges'] as { edges: Record<string, unknown>[] }).edges[1]!['checker'] = 'manifest';
    expect(validateArchAnswer(JSON.stringify(checker), scoped(doc)).refusal).toBe('outside-drift');
    const kind = honest(doc);
    const edge = (kind['edges'] as { edges: Record<string, unknown>[] }).edges[1]!;
    edge['kind'] = 'calls';
    edge['checker'] = 'evidence';
    expect(validateArchAnswer(JSON.stringify(kind), scoped(doc)).refusal).toBe('outside-drift');
  });

  it('refuses a drifted part whose layer, provenance, boundary or deprecated flag moved, and keeps its words moving', () => {
    const doc = skeleton();
    const reshape = (field: string, value: unknown) => {
      const answer = honest(doc);
      const scripts = (answer['components'] as Record<string, unknown>[]).find((c) => c['id'] === 'scripts')!;
      scripts[field] = value;
      return validateArchAnswer(JSON.stringify(answer), scoped(doc));
    };
    for (const [field, value] of [
      ['layer', 'surface'],
      ['provenance', 'vendored'],
      ['boundary', 'closed'],
      ['deprecated', true]
    ] as const) {
      const ruling = reshape(field, value);
      expect(ruling.refusal, field).toBe('outside-drift');
      expect(ruling.detail, field).toContain('scripts');
      expect(ruling.detail, field).toContain('never its layer');
    }
    // The same part with its words moved is a repair and is kept.
    const worded = honest(doc);
    const scripts = (worded['components'] as Record<string, unknown>[]).find((c) => c['id'] === 'scripts')!;
    scripts['name'] = 'The scripts';
    scripts['description'] = 'Holds the scripts a person runs by hand.';
    scripts['gaps'] = ['Tests import it today.'];
    expect(validateArchAnswer(JSON.stringify(worded), scoped(doc)).refusal).toBeNull();
    // A whole pass still lets the same four move.
    expect(
      validateArchAnswer(JSON.stringify(reshapeWhole(doc)), { ...scoped(doc), scope: null }).refusal
    ).toBeNull();
  });

  function reshapeWhole(document: ArchDocument): Record<string, unknown> {
    const answer = honest(document);
    const scripts = (answer['components'] as Record<string, unknown>[]).find((c) => c['id'] === 'scripts')!;
    scripts['layer'] = 'surface';
    scripts['provenance'] = 'vendored';
    scripts['boundary'] = 'closed';
    scripts['deprecated'] = true;
    return answer;
  }

  it('keeps the drifted promise with a new note and a gap on the part that broke it', () => {
    const doc = skeleton();
    const answer = honest(doc);
    (answer['edges'] as { edges: Record<string, unknown>[] }).edges[1]!['note'] =
      'The tests reach into scripts today, so this is an observation until the import goes.';
    const tests = (answer['components'] as Record<string, unknown>[]).find((c) => c['id'] === 'tests')!;
    tests['gaps'] = ['One test imports a script directly and should go through the package instead.'];
    expect(validateArchAnswer(JSON.stringify(answer), scoped(doc)).refusal).toBeNull();
  });
});
