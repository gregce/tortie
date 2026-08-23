/**
 * qwen through the product reader. The matrix row is 4 turns, 4 answers.
 * qwen's dangerous trap is tool results wearing `message.role` "user", and
 * its answer trap is private reasoning parts, which inflate the answer text
 * by 246.2% when kept.
 */

import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture } from './reader-helpers';

describe('reader, qwen', () => {
  const r = readFixture(JSONL_CASES['qwen']!);

  it('fills the matrix row, 4 turns and 4 answers', () => {
    expect(r.turns.length).toBe(4);
    expect(r.turns.filter((t) => t.answer).length).toBe(4);
  });

  it('leaks no banned trap string', () => {
    const all = keptText(r);
    for (const b of ['task-notification', '<state_snapshot>', 'functionResponse']) {
      expect(all).not.toContain(b);
    }
  });

  it('drops thought parts from the answer', () => {
    expect(keptText(r)).not.toContain('I should read the script first');
  });

  it('reads the model and the branch', () => {
    expect(r.meta.model).toBe('qwen3-coder-plus');
    expect(r.meta.branch).toBe('main');
  });

  it('indexes functionCall argument paths', () => {
    const p = r.turns[0]!.paths.find((m) => m.path === 'sync.sh');
    expect(p).toBeDefined();
    expect(p!.source).toBe('tool');
    expect(r.turns[0]!.pathSource).toBe('tool-calls');
  });
});
