/**
 * gemini through the product reader. The matrix row is 3 turns, 3 answers,
 * proved against the fixture only, because 215 of 216 real gemini files on
 * the operator's machine never got an answer. $set.messages is an upsert and
 * never a clear, records dedupe by id with the last write winning, and the
 * raw byte skip is off because it measures 0.58x here.
 */

import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture } from './reader-helpers';

describe('reader, gemini', () => {
  const r = readFixture(JSONL_CASES['gemini']!);

  it('fills the matrix row, 3 turns and 3 answers', () => {
    expect(r.turns.length).toBe(3);
    expect(r.turns.filter((t) => t.answer).length).toBe(3);
  });

  it('runs with the byte skip off, the measured 0.58x loss', () => {
    expect(r.acct.prefilter).toBe('off');
  });

  it('leaks no banned trap string', () => {
    const all = keptText(r);
    for (const b of ['<session_context>', 'Content from referenced files', 'Update successful']) {
      expect(all).not.toContain(b);
    }
  });

  it('dedupes by id with the last write winning, so the full answer replaces the stub', () => {
    expect(r.turns[0]!.answer!.text).toContain('cold start the widget cache is empty');
  });

  it('drops the /model command echo under the vendor ignore rule', () => {
    expect(keptText(r)).not.toContain('/model');
  });

  it('cuts the @file injection at the referenced files marker', () => {
    expect(r.turns[1]!.ask.text).not.toContain('WidgetStore');
  });

  it('carries the honest sentence about the missing answers', () => {
    expect(r.honest).toContain('answer');
  });

  it('reads the model from the answer record', () => {
    expect(r.meta.model).toBe('gemini-3-flash-preview');
  });
});
