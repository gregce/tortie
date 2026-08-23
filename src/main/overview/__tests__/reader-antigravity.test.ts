/**
 * antigravity through the product reader. The matrix row is 3 turns, 2
 * answers. The CHECKPOINT record holds the person's earlier asks verbatim,
 * so a prose match would double count them. The rule is `source`, never
 * prose.
 */

import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture } from './reader-helpers';

const BANNED = [
  'ADDITIONAL_METADATA',
  'USER_SETTINGS_CHANGE',
  'Created At:',
  'CHECKPOINT',
  'not actually sent by the user',
  'Model Selection'
];

describe('reader, antigravity', () => {
  const r = readFixture(JSONL_CASES['antigravity']!);

  it('fills the matrix row, 3 turns and 2 answers', () => {
    expect(r.turns.length).toBe(3);
    expect(r.turns.filter((t) => t.answer).length).toBe(2);
  });

  it('leaks no banned trap string', () => {
    const all = keptText(r);
    for (const b of BANNED) expect(all).not.toContain(b);
  });

  it('keeps only the text between the USER_REQUEST tags', () => {
    expect(r.turns[0]!.ask.text).toBe(
      'Read DESIGN.md and tell me which rule stops the runner from editing its own gate.'
    );
  });

  it('never takes a PLANNER_RESPONSE that carries tool_calls as the answer', () => {
    expect(keptText(r)).not.toContain('view_file');
  });
});
