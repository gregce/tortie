/**
 * grok through the product reader. The matrix row is 3 turns, 3 answers.
 * grok labels its own fake turn with a boolean, hideFromScrollback, where
 * claude needs a text match.
 */

import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture } from './reader-helpers';

describe('reader, grok', () => {
  const r = readFixture(JSONL_CASES['grok']!);

  it('fills the matrix row, 3 turns and 3 answers', () => {
    expect(r.turns.length).toBe(3);
    expect(r.turns.filter((t) => t.answer).length).toBe(3);
    expect(r.acct.turnMode).toBe('markers');
  });

  it('drops the hideFromScrollback injection and the subagent notice', () => {
    const all = keptText(r);
    expect(all).not.toContain('system-reminder');
    expect(all).not.toContain('Background subagent');
  });

  it('never takes an agent_thought_chunk as an answer', () => {
    expect(keptText(r)).not.toContain('I will read the file first');
  });

  it('carries the stop reason from turn_completed', () => {
    expect(r.turns[0]!.stopReason).toBe('end_turn');
  });

  it('reads the model id the update named', () => {
    expect(r.meta.model).toBe('grok-4.6');
  });

  it('indexes tool_call paths and keeps tool_call_update out', () => {
    const p = r.turns[0]!.paths.find((m) => m.path === 'notes.txt');
    expect(p).toBeDefined();
    expect(p!.source).toBe('tool');
  });

  it('converts the epoch clock to ISO', () => {
    expect(r.turns[0]!.ask.at).toBe(new Date(1786935753523).toISOString());
  });
});
