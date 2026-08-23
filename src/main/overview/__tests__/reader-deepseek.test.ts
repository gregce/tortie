/**
 * deepseek through the product reader. The matrix row is 3 turns, 1 answer.
 * The document carries no per message clock, so every turn's clock is null
 * and the session clock is metadata.updated_at.
 */

import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture } from './reader-helpers';

describe('reader, deepseek', () => {
  const r = readFixture(JSONL_CASES['deepseek']!);

  it('fills the matrix row, 3 turns and 1 answer', () => {
    expect(r.turns.length).toBe(3);
    expect(r.turns.filter((t) => t.answer).length).toBe(1);
    expect(r.acct.prefilter).toBe('off');
    expect(r.acct.turnMode).toBe('per-ask');
  });

  it('drops the <turn_meta> sibling part and keeps the 13 characters the person typed', () => {
    expect(r.turns[0]!.ask.text).toBe('whats up');
    expect(keptText(r)).not.toContain('<turn_meta>');
  });

  it('never shows a tool result wearing the user role as an ask', () => {
    expect(keptText(r)).not.toContain('release checklist lives in docs/RELEASE.md');
  });

  it('marks the unfinished turn interrupted instead of showing its narration', () => {
    const t = r.turns[2]!;
    expect(t.answer).toBeNull();
    expect(t.interrupted).toBe(true);
    expect(keptText(r)).not.toContain('Let me open that as well');
  });

  it('has no per turn clock and reports metadata.updated_at as the session clock', () => {
    for (const t of r.turns) expect(t.ask.at).toBeNull();
    expect(r.lastTouchedAt).toBe('2026-08-10T19:57:47.358535Z');
  });

  it('indexes the tool_use paths of the unfinished turn', () => {
    const paths = r.turns[2]!.paths.map((m) => m.path);
    expect(paths).toContain('NOTES.md');
    expect(paths).toContain('docs/RELEASE.md');
  });
});
