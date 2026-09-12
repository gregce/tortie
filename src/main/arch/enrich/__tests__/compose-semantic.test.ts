/**
 * The two semantic asks (Phase 259, research 118 §7.8).
 *
 * The ask is PER PART because the alternative does not fit: §7.8 measured the
 * whole-repository block at 163,229 bytes of distinct subjects and its largest
 * part alone at 78,439 against a 65,536 byte cap. So the cases here hold the
 * cap, what shrinks first when a block is over it, and that the composed bytes
 * are the same for the same facts, which is what makes the runner's
 * same-input-hash refusal mean anything.
 *
 * The INSTRUCTION is one constant handed to both recipes: only whether it
 * rides a flag or the head of the prompt differs, and the recipe decides that.
 */

import { describe, expect, it } from 'vitest';
import type { ArchFact } from '@shared/arch';
import {
  ARCH_ENRICH_PROMPT_MAX_BYTES,
  ARCH_JOURNEY_SYSTEM_PROMPT,
  ARCH_SEMANTIC_FACT_LINES,
  ARCH_SEMANTIC_SYSTEM_PROMPT,
  composeArchJourneyPrompt,
  composeArchSemanticPrompt,
  type ArchSemanticFactInput
} from '../compose';

function fact(at: number, over: Partial<ArchFact> = {}): ArchFact {
  return {
    category: 'surface',
    kind: 'ipc-channel',
    subject: `channel-${String(at)}`,
    file: 'src/main/a.ts',
    line: at + 1,
    rule: 'surface.ipc.electron',
    evidence: `handle(ipc, 'channel-${String(at)}')`,
    viaWrapper: false,
    ...over
  };
}

function input(files: number, facts: number): ArchSemanticFactInput {
  return {
    trackedFiles: files,
    parts: [
      {
        id: 'src-main',
        label: 'src/main',
        dirs: ['src/main'],
        files: Array.from({ length: files }, (_unused, at) => `src/main/f${String(at)}.ts`).concat(
          'src/main/a.ts'
        ),
        parsed: files,
        region: 'Tortie'
      },
      {
        id: 'src-shared',
        label: 'src/shared',
        dirs: ['src/shared'],
        files: ['src/shared/x.ts'],
        parsed: 1,
        region: null
      }
    ],
    facts: Array.from({ length: facts }, (_unused, at) => fact(at)),
    crossings: [{ from: 'src-main', to: 'src-shared', count: 412 }]
  };
}

describe('the instruction', () => {
  it('is one constant for both recipes, and names no rung as a thing to write', () => {
    expect(ARCH_SEMANTIC_SYSTEM_PROMPT).toContain(
      'Write exactly seven claims, one for each field, in this order: name, receives, does, returns, runsIn, keeps, limit.'
    );
    expect(ARCH_SEMANTIC_SYSTEM_PROMPT).toContain('You have not read this repository.');
    // It names the ten refused words in ONE sentence that forbids them, which
    // is the only place any of them may appear.
    const forbids = ARCH_SEMANTIC_SYSTEM_PROMPT.split('\n').filter((line) =>
      line.includes('accepted live')
    );
    expect(forbids).toHaveLength(1);
    expect(forbids[0]).toContain('Never write');
    // No dash of any kind, which is the rule it asks of the model.
    expect(ARCH_SEMANTIC_SYSTEM_PROMPT.includes('—')).toBe(false);
  });

  it('gives the journeys ask its OWN text rather than the part ask plus two lines', () => {
    expect(ARCH_JOURNEY_SYSTEM_PROMPT).not.toBe(ARCH_SEMANTIC_SYSTEM_PROMPT);
    expect(ARCH_JOURNEY_SYSTEM_PROMPT).toContain('partId names a part from the PARTS list');
    expect(ARCH_JOURNEY_SYSTEM_PROMPT).not.toContain('Write exactly seven claims');
    // The last four lines are the four the validator enforces on any answer.
    const tail = (text: string): string[] => text.split('\n').slice(-4);
    expect(tail(ARCH_JOURNEY_SYSTEM_PROMPT)).toEqual(tail(ARCH_SEMANTIC_SYSTEM_PROMPT));
  });
});

describe('the part ask', () => {
  it('carries the part record, the block and the ask, in one prompt', () => {
    const built = composeArchSemanticPrompt(input(3, 4), 'src-main');
    expect(built).not.toBeNull();
    expect(built?.prompt).toContain('"id": "src-main"');
    expect(built?.prompt).toContain('PART src-main');
    expect(built?.prompt.endsWith('Answer with the one JSON object.')).toBe(true);
    expect(built?.factBlock.startsWith('PART src-main')).toBe(true);
    expect(built?.factLines).toBe(ARCH_SEMANTIC_FACT_LINES);
  });

  it('answers null for a box the partition does not hold', () => {
    expect(composeArchSemanticPrompt(input(3, 4), 'no-such-box')).toBeNull();
  });

  it('composes the same bytes twice for the same facts', () => {
    const one = composeArchSemanticPrompt(input(3, 4), 'src-main');
    const two = composeArchSemanticPrompt(input(3, 4), 'src-main');
    expect(two?.prompt).toBe(one?.prompt);
  });

  it('shrinks the fact lines FIRST and stays under the cap on a large part', () => {
    // The worst shape a real block takes: every subject at the fact base's own
    // 160 character bound, every citation into a deep path. At the full budget
    // that is well over the cap and the shrink is what brings it under.
    const deep = `${'src/vendor/'.repeat(45)}a.ts`;
    const wide = input(40, 400);
    const over: ArchSemanticFactInput = {
      ...wide,
      parts: wide.parts.map((part) =>
        part.id === 'src-main' ? { ...part, files: [...part.files, deep] } : part
      ),
      facts: wide.facts.map((one, at) => ({
        ...one,
        subject: `${'s'.repeat(150)}-${String(at)}`.slice(0, 160),
        file: deep
      }))
    };
    const built = composeArchSemanticPrompt(over, 'src-main');
    expect(built).not.toBeNull();
    expect(Buffer.byteLength(built?.prompt ?? '', 'utf8')).toBeLessThanOrEqual(
      ARCH_ENRICH_PROMPT_MAX_BYTES
    );
    expect(built?.factLines).toBeLessThan(ARCH_SEMANTIC_FACT_LINES);
    // The part record itself always travels whole, whatever the block lost.
    expect(built?.prompt).toContain('"id": "src-main"');
  });

  it('sits comfortably inside the cap at the budget the research sized', () => {
    const built = composeArchSemanticPrompt(input(200, 400), 'src-main');
    const bytes = Buffer.byteLength(built?.prompt ?? '', 'utf8');
    expect(bytes).toBeLessThan(ARCH_ENRICH_PROMPT_MAX_BYTES);
    // Research 118 §7.8 sized a fact line at 88 bytes, so 120 lines is about
    // 10.3 KB of block. The whole prompt here is well under a quarter of the
    // cap, which is the headroom the per part shape buys.
    expect(bytes).toBeLessThan(ARCH_ENRICH_PROMPT_MAX_BYTES / 2);
  });
});

describe('the journeys ask', () => {
  it('carries every part, the crossings and the ask', () => {
    const built = composeArchJourneyPrompt(input(3, 4));
    expect(built.prompt).toContain('"id": "src-shared"');
    expect(built.factBlock).toContain('  src-main imports src-shared: 412 times');
    expect(built.prompt.endsWith('Answer with the one JSON object.')).toBe(true);
  });

  it('stays under the cap with many parts', () => {
    const many: ArchSemanticFactInput = {
      trackedFiles: 9000,
      parts: Array.from({ length: 300 }, (_unused, at) => ({
        id: `part-${String(at)}`,
        label: `part ${String(at)}`,
        dirs: [`src/p${String(at)}`],
        files: [`src/p${String(at)}/a.ts`],
        parsed: 1,
        region: null
      })),
      facts: Array.from({ length: 2000 }, (_unused, at) =>
        fact(at, { file: `src/p${String(at % 300)}/a.ts` })
      ),
      crossings: Array.from({ length: 900 }, (_unused, at) => ({
        from: `part-${String(at % 300)}`,
        to: `part-${String((at + 1) % 300)}`,
        count: at + 1
      }))
    };
    const built = composeArchJourneyPrompt(many);
    expect(Buffer.byteLength(built.prompt, 'utf8')).toBeLessThanOrEqual(
      ARCH_ENRICH_PROMPT_MAX_BYTES
    );
  });
});
