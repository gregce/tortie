/**
 * The FACTS block, its budget and its allocation (Phase 259, research 118
 * §7.8).
 *
 * What these cases hold, each because a later round could undo it alone:
 *
 *  - `test` is NOT one of the categories, and the seven are in the shared
 *    order minus that one rather than in a list of their own;
 *  - the allocation gives every category with rows a floor and stops one
 *    category eating the budget, which is what keeps `gate` (815 rows here)
 *    visible beside `effect` (4,414);
 *  - a category with no rows says so rather than going missing, because a
 *    surface that reports finding nothing is telling the truth about the
 *    reader and a silent absence is an invitation to invent one;
 *  - the bytes are DETERMINISTIC, so the runner's same-input-hash refusal
 *    means something.
 */

import { describe, expect, it } from 'vitest';
import { ARCH_FACT_CATEGORIES, type ArchFact } from '@shared/arch';
import {
  allocateFactLines,
  ARCH_SEMANTIC_CATEGORIES,
  ARCH_SEMANTIC_FACT_LINES,
  ARCH_SEMANTIC_FILE_SAMPLE,
  ARCH_SEMANTIC_JOURNEY_LINES,
  journeyFactsBlock,
  partFactsBlock,
  type ArchSemanticFactInput
} from '../block';

function fact(over: Partial<ArchFact> & Pick<ArchFact, 'category' | 'subject'>): ArchFact {
  return {
    kind: 'ipc-channel',
    file: 'src/a.ts',
    line: 1,
    rule: 'surface.ipc.electron',
    evidence: 'x',
    viaWrapper: false,
    ...over
  } as ArchFact;
}

function input(over: Partial<ArchSemanticFactInput> = {}): ArchSemanticFactInput {
  return {
    trackedFiles: 10,
    parts: [
      { id: 'src-main', label: 'src/main', dirs: ['src/main'], files: ['src/a.ts', 'src/b.ts'], parsed: 2, region: 'Tortie' },
      { id: 'src-renderer', label: 'src/renderer', dirs: ['src/renderer'], files: ['src/r.ts'], parsed: 1, region: null }
    ],
    facts: [
      fact({ category: 'surface', subject: 'arch:map', line: 10 }),
      fact({ category: 'surface', subject: 'arch:load', line: 20, file: 'src/b.ts' }),
      fact({ category: 'gate', kind: 'refusal', subject: 'refuses a bad path', line: 30 }),
      fact({ category: 'effect', kind: 'spawn', subject: 'spawns git', line: 40 })
    ],
    crossings: [{ from: 'src-renderer', to: 'src-main', count: 12 }],
    ...over
  };
}

describe('the budget', () => {
  it('is the three constants and the seven categories, with test absent', () => {
    expect(ARCH_SEMANTIC_FACT_LINES).toBe(120);
    expect(ARCH_SEMANTIC_FILE_SAMPLE).toBe(20);
    expect(ARCH_SEMANTIC_JOURNEY_LINES).toBe(160);
    expect([...ARCH_SEMANTIC_CATEGORIES]).toEqual([
      'entrypoint',
      'boundary',
      'surface',
      'store',
      'effect',
      'network',
      'gate'
    ]);
    expect(ARCH_SEMANTIC_CATEGORIES).not.toContain('test');
    // It is DERIVED from the shared order, so the two cannot drift apart.
    expect([...ARCH_SEMANTIC_CATEGORIES]).toEqual(
      ARCH_FACT_CATEGORIES.filter((one) => one !== 'test')
    );
  });
});

describe('the allocation', () => {
  it('stops one busy category eating the budget and keeps a small one visible', () => {
    // The shape research 118 measured on this repository: effect 4,414 rows
    // against gate 815 and network 97.
    const counts = [0, 0, 612, 40, 4414, 97, 815];
    const spread = allocateFactLines(counts, 120);
    expect(spread.reduce((sum, one) => sum + one, 0)).toBe(120);
    // The ceiling is half the budget, and there is somewhere for the spill.
    expect(Math.max(...spread)).toBeLessThanOrEqual(60);
    // Every category with rows keeps at least its floor of four.
    for (const [at, count] of counts.entries()) {
      if (count === 0) expect(spread[at]).toBe(0);
      else expect(spread[at]).toBeGreaterThanOrEqual(4);
    }
  });

  it('never hands a category more lines than it has rows', () => {
    const spread = allocateFactLines([1, 2, 3, 0, 0, 0, 0], 120);
    expect(spread).toEqual([1, 2, 3, 0, 0, 0, 0]);
  });

  it('spends the whole budget when one category is the only one with rows', () => {
    const spread = allocateFactLines([0, 0, 500, 0, 0, 0, 0], 120);
    expect(spread[2]).toBe(120);
  });

  it('answers nothing for an empty set rather than dividing by zero', () => {
    expect(allocateFactLines([0, 0, 0], 120)).toEqual([0, 0, 0]);
    expect(allocateFactLines([1, 1, 1], 0)).toEqual([0, 0, 0]);
  });
});

describe('the part block', () => {
  it('names every category, with an honest zero where nothing was found', () => {
    const text = partFactsBlock(input(), 'src-main', 120, 20) ?? '';
    for (const category of ARCH_SEMANTIC_CATEGORIES) {
      expect(text).toContain(`\n${category}\n`);
    }
    expect(text).toContain('network\n  none found by this reader');
    expect(text).toContain('entrypoint\n  none found by this reader');
    expect(text).toContain('  ipc-channel arch:map at src/a.ts:10');
    expect(text.startsWith('PART src-main\n')).toBe(true);
    expect(text.endsWith('END FACTS')).toBe(true);
  });

  it('carries no fact from another part box', () => {
    const text = partFactsBlock(input(), 'src-renderer', 120, 20) ?? '';
    expect(text).not.toContain('arch:map');
    expect(text).toContain('surface\n  none found by this reader');
  });

  it('draws the quiet boundary as a zero rather than leaving it out', () => {
    const text = partFactsBlock(input(), 'src-main', 120, 20) ?? '';
    expect(text).toContain('  src-main imports src-renderer: 0 times');
    expect(text).toContain('  src-renderer imports src-main: 12 times');
  });

  it('composes the same bytes from reversed facts, files and parts', () => {
    const one = partFactsBlock(input(), 'src-main', 120, 20);
    const two = partFactsBlock(
      input({
        facts: [...input().facts].reverse(),
        parts: [...input().parts].reverse().map((part) => ({
          ...part,
          files: [...part.files].reverse()
        })),
        crossings: [...input().crossings].reverse()
      }),
      'src-main',
      120,
      20
    );
    expect(two).toBe(one);
  });

  it('answers null for a box the partition does not hold', () => {
    expect(partFactsBlock(input(), 'no-such-box', 120, 20)).toBeNull();
  });

  it('counts the subjects it did not list rather than hiding them', () => {
    const many = input({
      facts: Array.from({ length: 30 }, (_unused, at) =>
        fact({ category: 'surface', subject: `channel-${String(at)}`, line: at + 1 })
      )
    });
    const text = partFactsBlock(many, 'src-main', 8, 20) ?? '';
    expect(text).toMatch(/and \d+ more subjects this reader found and did not list/);
  });
});

describe('the journey block', () => {
  it('summarises every part and prints the crossings between them', () => {
    const text = journeyFactsBlock(input(), 160);
    expect(text.startsWith('PARTS\n')).toBe(true);
    expect(text).toContain('  src-main: 2 files, ');
    expect(text).toContain('  src-renderer imports src-main: 12 times');
    expect(text.endsWith('END FACTS')).toBe(true);
  });

  it('says a part carries no facts rather than printing an empty line', () => {
    expect(journeyFactsBlock(input(), 160)).toContain(
      '  src-renderer: 1 files, no facts found by this reader'
    );
  });
});
