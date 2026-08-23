/**
 * pi through the product reader. The matrix row is 2 turns, 2 answers. The
 * fixture's tool result holds a sentence that reads like a person giving an
 * instruction, which is why the ask rule keys on `role == "user"` and never
 * on "not assistant".
 */

import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture } from './reader-helpers';

describe('reader, pi', () => {
  const r = readFixture(JSONL_CASES['pi']!);

  it('fills the matrix row, 2 turns and 2 answers', () => {
    expect(r.turns.length).toBe(2);
    expect(r.turns.filter((t) => t.answer).length).toBe(2);
  });

  it('never shows a tool result as an ask', () => {
    expect(keptText(r)).not.toContain('Please rewrite the whole module');
  });

  it('never takes narration before a tool call as the closing answer', () => {
    expect(keptText(r)).not.toContain('Checking the size now.');
  });

  it('indexes toolCall argument paths', () => {
    const p = r.turns[0]!.paths.find((m) => m.path === 'notes.md');
    expect(p).toBeDefined();
    expect(p!.inside).toBe(true);
  });
});
