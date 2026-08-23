/**
 * muse through the product reader. The matrix row is 2 turns, 2 answers.
 * The subagent's stream shares the file shape, so the filter keys on
 * `stream.id` equal to the session id. A terminal record with a reason
 * means the run stopped early, and the reason becomes the turn's notice.
 */

import * as fs from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture, scratchDir } from './reader-helpers';

describe('reader, muse', () => {
  const r = readFixture(JSONL_CASES['muse']!);

  it('fills the matrix row, 2 turns and 2 answers', () => {
    expect(r.turns.length).toBe(2);
    expect(r.turns.filter((t) => t.answer).length).toBe(2);
  });

  it("never shows a subagent's injected task as a human ask", () => {
    const all = keptText(r);
    expect(all).not.toContain('Role: demo-worker');
    expect(all).not.toContain('Let me list them.');
  });

  it("carries the terminal record's duration", () => {
    expect(r.turns[0]!.durationMs).toBe(8121);
  });

  it('marks a turn whose terminal record names a reason, and keeps the reason as the notice', () => {
    const dir = scratchDir('muse');
    try {
      const sid = '0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c';
      const mk = (kind: string, extra: Record<string, unknown>): string =>
        JSON.stringify({
          stream: { kind: 'session', id: sid },
          recorded_at: 1786138661396634,
          payload_type: 'runtime.session',
          payload: { kind: 'run', event: { kind, ...extra } }
        });
      const file = join(dir, 'session.jsonl');
      fs.writeFileSync(
        file,
        [
          mk('started', { prompt: 'count the drafts' }),
          mk('terminal', { reason: 'aborted', turn_duration_ms: 900 })
        ].join('\n') + '\n'
      );
      const rr = readFixture({ ...JSONL_CASES['muse']!, file: 'x' }, { file });
      expect(rr.turns.length).toBe(1);
      expect(rr.turns[0]!.interrupted).toBe(true);
      expect(rr.turns[0]!.notice).toBe('aborted');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
