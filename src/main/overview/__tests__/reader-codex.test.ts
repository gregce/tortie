/**
 * codex through the product reader, against the committed fixture. The
 * matrix row is 3 turns, 3 answers. The fixture holds a goal loop turn with
 * no human ask, two wrapped asks, a response_item turn_aborted, and an 18 KB
 * compacted record whose replacement history must never surface.
 */

import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture } from './reader-helpers';

const BANNED = [
  '<environment_context>',
  'AGENTS.md instructions',
  'codex_internal_context',
  'turn_aborted',
  'attachments/',
  'Files mentioned by the user',
  'Pasted text.txt'
];

describe('reader, codex', () => {
  const r = readFixture(JSONL_CASES['codex']!);

  it('fills the matrix row, 3 turns and 3 answers', () => {
    expect(r.turns.length).toBe(3);
    expect(r.turns.filter((t) => t.answer).length).toBe(3);
    expect(r.acct.turnMode).toBe('markers');
  });

  it('leaks no banned trap string', () => {
    const all = keptText(r);
    for (const b of BANNED) expect(all).not.toContain(b);
  });

  it('drops the goal loop turn, which holds no human ask', () => {
    expect(keptText(r)).not.toContain('active thread goal');
  });

  it('unwraps the attachment manifest down to the request after the marker', () => {
    const t = r.turns[1]!;
    expect(t.ask.text).toContain('Here is the traceback I saw');
    expect(t.ask.text).not.toContain('Files mentioned');
  });

  it('merges queued asks into one turn and counts them', () => {
    expect(r.turns[1]!.ask.queued).toBe(2);
    expect(r.turns[1]!.ask.text).toContain('never mind the traceback');
  });

  it('marks the turn the response_item turn_aborted landed in', () => {
    expect(r.turns[1]!.interrupted).toBe(true);
    expect(r.turns[0]!.interrupted).toBe(false);
  });

  it('prefers task_complete.last_agent_message as the closing answer', () => {
    expect(r.turns[0]!.answer!.text).toContain('instead of raising');
    expect(r.turns[0]!.answer!.text).toContain('test_empty_ledger');
  });

  it('reads the join from the session_meta record', () => {
    expect(r.join.sessionId).toBe('0000aaaa-1111-7000-8000-222233334444');
    expect(r.join.cwd).toBe('/Users/example/rookery');
    expect(r.join.threadSource).toBe('user');
  });

  it("carries the CLI's own duration for a closed turn", () => {
    expect(r.turns[0]!.durationMs).toBe(16408);
  });

  it('indexes the command paths from item_completed records', () => {
    const t = r.turns[0]!;
    expect(t.pathSource).toBe('tool-calls');
    const p = t.paths.find((m) => m.path === 'src/nest_counter.py');
    expect(p).toBeDefined();
    expect(p!.inside).toBe(true);
  });

  it('never holds a compacted record, whose outer type never matches', () => {
    expect(keptText(r)).not.toContain('replacement_history');
  });
});
