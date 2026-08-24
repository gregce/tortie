/**
 * What the fold sends (Phase 138).
 *
 * The property this file pins down is the one that makes the cost per turn
 * flat: the fold sends the previous summary plus the new turns, and never the
 * whole session. A session on its two hundredth turn must compose the same
 * size of prompt as one on its second.
 */

import { describe, expect, it } from 'vitest';
import type { StoredTurn } from '../../store';
import {
  composeFoldPrompt,
  foldInputHash,
  FOLD_ANSWER_MAX_CHARS,
  FOLD_ASK_MAX_CHARS,
  FOLD_NO_ANSWER_ON_RECORD,
  FOLD_NO_EARLIER_SUMMARY,
  FOLD_PROMPT_MAX_BYTES,
  FOLD_SYSTEM_PROMPT
} from '../compose';

function turn(index: number, ask = `ask ${index}`, answer: string | null = `answer ${index}`): StoredTurn {
  return {
    sessionId: 's1',
    index,
    askText: ask,
    askAt: null,
    answerText: answer,
    answerAt: null,
    queued: 1,
    closed: true,
    interrupted: false,
    notice: null,
    stopReason: null,
    durationMs: null,
    paths: [],
    pathSource: 'text-only',
    gitVerdict: null,
    gitCheckedAt: null
  };
}

describe('composeFoldPrompt', () => {
  it('answers null when there is no new turn, so a fold spends on nothing', () => {
    expect(composeFoldPrompt('an earlier sentence', [])).toBeNull();
  });

  it('says so plainly when there is no earlier summary', () => {
    const out = composeFoldPrompt(null, [turn(0)]);
    expect(out?.prompt).toContain(FOLD_NO_EARLIER_SUMMARY);
  });

  it('carries the previous summary rather than the whole session', () => {
    const out = composeFoldPrompt('the sentence from last time', [turn(9)]);
    expect(out?.prompt).toContain('the sentence from last time');
    expect(out?.prompt).not.toContain('ask 0');
    expect(out?.turns).toHaveLength(1);
  });

  it('reports the turn range it covers', () => {
    const out = composeFoldPrompt(null, [turn(4), turn(5), turn(6)]);
    expect(out?.fromTurn).toBe(4);
    expect(out?.toTurn).toBe(6);
  });

  it('orders turns oldest first whatever order it was handed', () => {
    const out = composeFoldPrompt(null, [turn(6), turn(4), turn(5)]);
    expect(out?.turns.map((t) => t.index)).toEqual([4, 5, 6]);
  });

  it('clips a long ask and a long answer', () => {
    const out = composeFoldPrompt(null, [
      turn(0, 'a'.repeat(5_000), 'b'.repeat(5_000))
    ]);
    expect(out?.prompt).toContain('a'.repeat(FOLD_ASK_MAX_CHARS));
    expect(out?.prompt).not.toContain('a'.repeat(FOLD_ASK_MAX_CHARS + 1));
    expect(out?.prompt).toContain('b'.repeat(FOLD_ANSWER_MAX_CHARS));
    expect(out?.prompt).not.toContain('b'.repeat(FOLD_ANSWER_MAX_CHARS + 1));
  });

  it('says the agent recorded no answer rather than sending nothing', () => {
    const out = composeFoldPrompt(null, [turn(0, 'what happened', null)]);
    expect(out?.prompt).toContain(FOLD_NO_ANSWER_ON_RECORD);
  });

  it('drops the OLDEST turns first when the cap is reached', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      turn(i, `ask ${i} ${'x'.repeat(400)}`, `answer ${i} ${'y'.repeat(900)}`)
    );
    const out = composeFoldPrompt(null, many);
    expect(out).not.toBeNull();
    expect(Buffer.byteLength(out?.prompt ?? '', 'utf8')).toBeLessThanOrEqual(
      FOLD_PROMPT_MAX_BYTES
    );
    expect(out?.dropped).toBeGreaterThan(0);
    // The newest turn always goes, because gate two proved it is where nearly
    // all the value is.
    expect(out?.turns[out.turns.length - 1]?.index).toBe(59);
    expect(out?.turns[0]?.index).toBeGreaterThan(0);
  });

  it('keeps the range even when older turns were dropped, so the watermark advances', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      turn(i, `ask ${i} ${'x'.repeat(400)}`, `answer ${i} ${'y'.repeat(900)}`)
    );
    const out = composeFoldPrompt(null, many);
    expect(out?.fromTurn).toBe(0);
    expect(out?.toTurn).toBe(59);
  });

  it('sends the newest turn alone rather than nothing when it is over the cap', () => {
    const huge = turn(0, 'z'.repeat(50_000), 'w'.repeat(50_000));
    const out = composeFoldPrompt(null, [huge]);
    expect(out?.turns).toHaveLength(1);
  });

  it('keeps the prompt the same size as a session grows', () => {
    const early = composeFoldPrompt('a sentence', [turn(2)]);
    const late = composeFoldPrompt('a sentence', [turn(200)]);
    const delta = Math.abs(
      (early?.prompt.length ?? 0) - (late?.prompt.length ?? 0)
    );
    // The only difference is the two extra digits in the turn's own text.
    expect(delta).toBeLessThan(10);
  });
});

describe('foldInputHash', () => {
  const base = {
    recipeAgentId: 'claude',
    recipeVersion: 1,
    model: 'claude-haiku-4-5-20251001',
    systemPrompt: FOLD_SYSTEM_PROMPT,
    prompt: 'a prompt'
  };

  it('is stable for the same inputs', () => {
    expect(foldInputHash(base)).toBe(foldInputHash(base));
  });

  it.each([
    ['the agent', { recipeAgentId: 'codex' }],
    ['the recipe version', { recipeVersion: 2 }],
    ['the model', { model: 'sonnet' }],
    ['the system prompt', { systemPrompt: 'something else' }],
    ['the prompt', { prompt: 'a different prompt' }]
  ])('moves when %s moves', (_what, patch) => {
    expect(foldInputHash({ ...base, ...patch })).not.toBe(foldInputHash(base));
  });
});

describe('FOLD_SYSTEM_PROMPT', () => {
  it('carries the recency rule gate two proved is free', () => {
    expect(FOLD_SYSTEM_PROMPT).toContain('Lead with the newest turn');
  });

  it('carries the digit rule', () => {
    expect(FOLD_SYSTEM_PROMPT).toContain('Never write a digit');
  });

  it('names you and the agent, and never "it"', () => {
    expect(FOLD_SYSTEM_PROMPT).toContain('Neither is ever "it"');
  });

  it('uses no dash of any kind itself', () => {
    expect(FOLD_SYSTEM_PROMPT).not.toMatch(/[–—]/);
  });
});
