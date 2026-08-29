/**
 * The enrichment composer (Phase 158): deterministic bytes, the fact block
 * carried separately for the invented number rule, and a cap that shrinks the
 * file samples rather than the drafted contract.
 */

import { describe, expect, it } from 'vitest';
import type { ArchDocument } from '@shared/arch';
import {
  ARCH_ENRICH_PROMPT_MAX_BYTES,
  ARCH_ENRICH_SYSTEM_PROMPT,
  ARCH_ENRICH_FILE_SAMPLE,
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
    expect(ARCH_ENRICH_SYSTEM_PROMPT).toContain('suggestions');
    expect(ARCH_ENRICH_SYSTEM_PROMPT).toContain(
      'Do not write a baseline and do not accept any divergence.'
    );
  });
});
