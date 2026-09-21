/**
 * codex through the product reader, against the committed fixture. The
 * matrix row is 4 turns, 4 answers. The fixture holds a goal loop turn with
 * no human ask, two wrapped asks, a response_item turn_aborted, an 18 KB
 * compacted record whose replacement history must never surface, and — since
 * Phase 299 — a turn whose reply exists ONLY as an `AgentMessage` part spelled
 * `Text` on a `task_complete` that carries `last_agent_message: ""`.
 *
 * That last turn is why the row moved from 3 to 3 answers up to 4 and 4. Every
 * one of the 94,841 real `AgentMessage` parts measured on this Mac spells the
 * part `Text`, and 2,890 of 34,805 `task_complete` records carry no
 * `last_agent_message`, so that pair is the shape 8.3 percent of real turns
 * have and the one shape the fixture did not hold. Before Phase 299 the map
 * asked for `text` alone and every `task_complete` in this fixture carried
 * text, so `answers: 3` could not move however broken the branch was.
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

  it('fills the matrix row, 4 turns and 4 answers', () => {
    expect(r.turns.length).toBe(4);
    expect(r.turns.filter((t) => t.answer).length).toBe(4);
    expect(r.acct.turnMode).toBe('markers');
  });

  // Phase 299, C1. Measured at c1de8e0f with the map's own rule restored: this
  // same fixture reads 4 turns and 3 ANSWERS, and the third turn's reply is
  // gone. The part is spelled `Text` and the turn's `task_complete` carries an
  // empty `last_agent_message`, so the rescue has nothing and the part is the
  // only place the reply exists.
  it('counts a reply that exists only as an AgentMessage part spelled Text', () => {
    const t = r.turns[2]!;
    expect(t.ask.text).toContain('regression test of its own');
    expect(t.answer).not.toBeNull();
    expect(t.answer!.text).toContain('covers the empty case');
  });

  it('reads that reply from the PART, because the closing record has no text', () => {
    const t = r.turns[2]!;
    // `close-answer-else-last-answer` prefers the closing record. It cannot win
    // here, and fold.ts requires the closing text to be non-blank, so the part
    // is what is drawn.
    expect(t.answer!.at).toBe('2026-08-19T14:22:10.800Z');
    expect(t.durationMs).toBe(11000);
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
