/**
 * The enrichment composer (Phase 158): deterministic bytes, the fact block
 * carried separately for the invented number rule, and a cap that shrinks the
 * file samples rather than the drafted contract.
 */

import { describe, expect, it } from 'vitest';
import type { ArchDocument, ArchDrift } from '@shared/arch';
import {
  ARCH_DELTA_SYSTEM_PROMPT,
  ARCH_ENRICH_PROMPT_MAX_BYTES,
  ARCH_ENRICH_SYSTEM_PROMPT,
  ARCH_ENRICH_FILE_SAMPLE,
  composeArchDeltaPrompt,
  composeArchEnrichPrompt
} from '../compose';

function doc(anchors: string[][]): ArchDocument {
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
    components: anchors.map((anchor, i) => ({
      id: `part-${String(i)}`,
      name: `part ${String(i)}`,
      kind: 'component',
      layer: 'surface',
      provenance: 'first-party',
      anchors: anchor,
      boundary: 'open',
      description: '',
      evidence: [],
      deprecated: false,
      gaps: []
    })),
    edges: [],
    baseline: { accepted: [] },
    problems: []
  };
}

describe('composeArchEnrichPrompt', () => {
  it('composes the same bytes twice for the same facts', () => {
    const document = doc([['src/a'], ['src/b']]);
    const input = {
      document,
      trackedFiles: ['src/a/x.ts', 'src/b/y.ts'],
      imports: [{ fromPath: 'src/a/x.ts', toPath: 'src/b/y.ts' }]
    };
    const one = composeArchEnrichPrompt(input);
    const two = composeArchEnrichPrompt(input);
    expect(one.prompt).toBe(two.prompt);
    expect(one.factBlock).toBe(two.factBlock);
  });

  it('carries the drafted contract, the facts and the ask in one prompt', () => {
    const document = doc([['src/a'], ['src/b']]);
    const built = composeArchEnrichPrompt({
      document,
      trackedFiles: ['src/a/x.ts', 'src/b/y.ts'],
      imports: [{ fromPath: 'src/a/x.ts', toPath: 'src/b/y.ts' }]
    });
    expect(built.prompt).toContain('"subject": "fixture"');
    expect(built.prompt).toContain(built.factBlock);
    expect(built.factBlock).toContain('FACTS');
    expect(built.factBlock).toContain('END FACTS');
    expect(built.factBlock).toContain('part-0 imports part-1: 1 time');
    expect(built.prompt).toContain('Answer with the one JSON object.');
  });

  it('hands the model the crossings inside a part that swallows every import (Phase 179)', () => {
    // One part owns the whole of src/, so at the drafted grain every import
    // reads from === to and the coarse section says none resolved. The finer
    // section must carry the crossings the drilled map draws.
    const document = doc([['src'], ['lib']]);
    const built = composeArchEnrichPrompt({
      document,
      trackedFiles: ['src/a/x.ts', 'src/a/w.ts', 'src/b/y.ts', 'lib/z.ts'],
      imports: [
        { fromPath: 'src/a/x.ts', toPath: 'src/b/y.ts' },
        { fromPath: 'src/a/w.ts', toPath: 'src/b/y.ts' }
      ]
    });
    expect(built.factBlock).toContain('imports between parts:\n  none resolved');
    expect(built.factBlock).toContain(
      'inside part part-0, imports between its finer parts:'
    );
    expect(built.factBlock).toContain('  src/a imports src/b: 2 times');
    // The part with no interior crossing contributes no section.
    expect(built.factBlock).not.toContain('inside part part-1');
  });

  it('composes the same finer crossing bytes from shuffled facts', () => {
    const document = doc([['src'], ['lib']]);
    const trackedFiles = ['src/a/x.ts', 'src/a/w.ts', 'src/b/y.ts', 'lib/z.ts'];
    const imports = [
      { fromPath: 'src/a/x.ts', toPath: 'src/b/y.ts' },
      { fromPath: 'src/b/y.ts', toPath: 'src/a/w.ts' },
      { fromPath: 'src/a/w.ts', toPath: 'src/b/y.ts' }
    ];
    const one = composeArchEnrichPrompt({ document, trackedFiles, imports });
    const two = composeArchEnrichPrompt({
      document,
      trackedFiles: [...trackedFiles].reverse(),
      imports: [...imports].reverse()
    });
    expect(two.prompt).toBe(one.prompt);
    expect(two.factBlock).toBe(one.factBlock);
  });

  it('writes no finer section for a part whose imports stay inside one finer part', () => {
    const document = doc([['src'], ['lib']]);
    const built = composeArchEnrichPrompt({
      document,
      trackedFiles: ['src/a/x.ts', 'src/a/w.ts', 'lib/z.ts'],
      imports: [{ fromPath: 'src/a/x.ts', toPath: 'src/a/w.ts' }]
    });
    expect(built.factBlock).not.toContain('finer parts');
  });

  it('shrinks the file samples under the cap and never drops the contract', () => {
    const anchors: string[][] = [];
    const files: string[] = [];
    for (let part = 0; part < 40; part += 1) {
      anchors.push([`src/part-${String(part)}`]);
      for (let i = 0; i < 60; i += 1) {
        files.push(
          `src/part-${String(part)}/a/very/long/directory/name/that/costs/bytes/file-${String(i)}.ts`
        );
      }
    }
    const document = doc(anchors);
    const built = composeArchEnrichPrompt({
      document,
      trackedFiles: files,
      imports: []
    });
    expect(Buffer.byteLength(built.prompt, 'utf8')).toBeLessThanOrEqual(
      ARCH_ENRICH_PROMPT_MAX_BYTES
    );
    expect(built.fileSample).toBeLessThan(ARCH_ENRICH_FILE_SAMPLE);
    expect(built.prompt).toContain('"subject": "fixture"');
  });

  it('states the map binding in the instruction', () => {
    expect(ARCH_ENRICH_SYSTEM_PROMPT).toContain(
      'Keep every component id and every anchor exactly as drafted.'
    );
    // Phase 179's fix round: over a contract whose drafted promise list is
    // empty the model has no edge row to copy, and the first real rookery
    // run drafted promises the validator refused for their shape
    // (invalid-row, edges[0].id must be text). The instruction states the
    // shape; the validator stays the rule.
    expect(ARCH_ENRICH_SYSTEM_PROMPT).toContain('"checker": "imports"');
    expect(ARCH_ENRICH_SYSTEM_PROMPT).toContain(
      'imports between finer parts inside one drafted part'
    );
    expect(ARCH_ENRICH_SYSTEM_PROMPT).toContain('suggestions');
    expect(ARCH_ENRICH_SYSTEM_PROMPT).toContain(
      'Do not write a baseline and do not accept any divergence.'
    );
  });
});

describe('composeArchDeltaPrompt, the narrower ask (Phase 159)', () => {
  const drift = (): ArchDrift => ({
    promises: [
      {
        subjectId: 'edge:part-0-must-not-part-1',
        status: 'divergent',
        reason: 'One import crosses a line.',
        offending: [
          { fromPath: 'src/a/x.ts', toPath: 'src/b/y.ts', line: 3, specifier: '../b/y' }
        ]
      }
    ],
    quotes: [
      {
        subjectId: 'evidence:component:part-0#0',
        owner: { kind: 'component', id: 'part-0' },
        index: 0,
        path: 'src/a/x.ts',
        line: 2,
        quote: 'gone now',
        status: 'divergent'
      }
    ],
    parts: [{ componentId: 'part-0', commitsBehind: 34 }],
    componentIds: ['part-0', 'part-1'],
    edgeIds: ['part-0-must-not-part-1'],
    count: 3
  });

  it('carries the whole contract, names only the drift, and scopes the facts', () => {
    const document = doc([['src/a'], ['src/b'], ['src/c']]);
    const built = composeArchDeltaPrompt({
      document,
      trackedFiles: ['src/a/x.ts', 'src/b/y.ts', 'src/c/z.ts'],
      imports: [
        { fromPath: 'src/a/x.ts', toPath: 'src/b/y.ts' },
        { fromPath: 'src/c/z.ts', toPath: 'src/b/y.ts' },
        { fromPath: 'src/c/z.ts', toPath: 'src/a/x.ts' }
      ],
      drift: drift()
    });
    // Every part still travels, because the validator compares whole.
    expect(built.prompt).toContain('"id": "part-2"');
    expect(built.prompt).toContain('DRIFT\n');
    expect(built.prompt).toContain(
      'promise edge:part-0-must-not-part-1: broke, One import crosses a line.\n  src/a/x.ts:3 ../b/y'
    );
    expect(built.prompt).toContain(
      'quote src/a/x.ts:2 in component part-0 no longer reads "gone now"'
    );
    expect(built.prompt).toContain('part part-0: 34 commits behind');
    // The facts are scoped: part-2 gets no file lines and no pair without a drifted end.
    expect(built.factBlock).toContain('part part-0: anchors src/a, 1 files');
    expect(built.factBlock).not.toContain('part part-2:');
    expect(built.factBlock).toContain('part-0 imports part-1: 1 time');
    expect(built.factBlock).toContain('part-2 imports part-0: 1 time');
    expect(built.factBlock).not.toContain('a healthy contract');
    // Both blocks are the fact block, so a repeated commit count is not invented.
    expect(built.factBlock.startsWith('DRIFT\n')).toBe(true);
    expect(built.factBlock).toContain('END DRIFT\nFACTS\n');
    expect(built.prompt).toContain(built.factBlock);
    expect(built.prompt.endsWith('Answer with the one JSON object.')).toBe(true);
  });

  it('scopes the finer crossings to the drifted parts (Phase 179)', () => {
    // part-0 owns src/ and part-2 owns vendor/, and both hold an interior
    // crossing. Only part-0 is in the drift scope, so only part-0 gets a
    // finer section: a repair's facts name what drifted and nothing else.
    const document = doc([['src'], ['lib'], ['vendor']]);
    const built = composeArchDeltaPrompt({
      document,
      trackedFiles: [
        'src/a/x.ts',
        'src/b/y.ts',
        'lib/z.ts',
        'vendor/c/u.ts',
        'vendor/d/v.ts'
      ],
      imports: [
        { fromPath: 'src/a/x.ts', toPath: 'src/b/y.ts' },
        { fromPath: 'vendor/c/u.ts', toPath: 'vendor/d/v.ts' }
      ],
      drift: drift()
    });
    expect(built.factBlock).toContain(
      'inside part part-0, imports between its finer parts:'
    );
    expect(built.factBlock).toContain('  src/a imports src/b: 1 time');
    expect(built.factBlock).not.toContain('inside part part-2');
  });

  it('composes the same bytes twice', () => {
    const document = doc([['src/a'], ['src/b'], ['src/c']]);
    const input = {
      document,
      trackedFiles: ['src/a/x.ts', 'src/b/y.ts', 'src/c/z.ts'],
      imports: [{ fromPath: 'src/c/z.ts', toPath: 'src/b/y.ts' }],
      drift: drift()
    };
    const one = composeArchDeltaPrompt(input);
    const two = composeArchDeltaPrompt(input);
    expect(one.prompt).toBe(two.prompt);
    expect(one.factBlock).toBe(two.factBlock);
  });

  it('replaces a control character in a specifier with a space', () => {
    const d = drift();
    const esc = String.fromCharCode(27);
    const cr = String.fromCharCode(13);
    d.promises[0]!.offending[0]!.specifier = `evil${esc}[201~${cr}whoami`;
    const built = composeArchDeltaPrompt({
      document: doc([['src/a'], ['src/b']]),
      trackedFiles: ['src/a/x.ts', 'src/b/y.ts'],
      imports: [],
      drift: d
    });
    const controls = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i))
      .concat(String.fromCharCode(127))
      .filter((c) => c !== '\n');
    expect(controls.some((c) => built.prompt.includes(c))).toBe(false);
    expect(built.prompt).toContain('evil [201~ whoami');
  });

  it('is its own instruction and never asks for every part to be edited', () => {
    // The fix round's one real run: Haiku followed "edit each component's
    // name" from the whole instruction and was refused outside-drift.
    expect(ARCH_DELTA_SYSTEM_PROMPT.startsWith(ARCH_ENRICH_SYSTEM_PROMPT)).toBe(false);
    expect(ARCH_DELTA_SYSTEM_PROMPT).not.toContain("Edit each component's name");
    expect(ARCH_DELTA_SYSTEM_PROMPT).not.toContain('Judge the promises');
    expect(ARCH_DELTA_SYSTEM_PROMPT).toContain('Change only the parts and promises DRIFT names.');
    expect(ARCH_DELTA_SYSTEM_PROMPT).toContain('Return the contract exactly as given.');
    expect(ARCH_DELTA_SYSTEM_PROMPT).toContain('keep every promise between the same two parts');
    expect(ARCH_DELTA_SYSTEM_PROMPT).toContain('Never add a quote and never quote code.');
    expect(ARCH_DELTA_SYSTEM_PROMPT).toContain('Answer with ONE JSON object');
    expect(ARCH_DELTA_SYSTEM_PROMPT).not.toMatch(/[\u2013\u2014]/);
  });

  it('the whole instruction carries hand written evidence forward now', () => {
    expect(ARCH_ENRICH_SYSTEM_PROMPT).toContain('Return every evidence list exactly as given');
    expect(ARCH_ENRICH_SYSTEM_PROMPT).not.toContain('Leave every evidence list empty');
  });
});
