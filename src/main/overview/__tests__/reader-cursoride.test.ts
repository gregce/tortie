/**
 * cursoride through the product reader against a real state.vscdb built from
 * the committed description. The matrix row is 3 turns, 3 answers. It can
 * never be a Tortie session, so this container exists for the conformance
 * fixtures. Its danger is byte inflation, a real turn whose ask is half a
 * megabyte of injected harness text with the one line question at the end.
 */

import * as fs from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { readSessionLog } from '../reader';
import { buildCursorideStore, keptText, scratchDir } from './reader-helpers';
import type { ReadResult } from '../reader';

function readStore(file: string, sessionId: string, watermark: ReadResult['watermark'] = null): ReadResult {
  return readSessionLog({
    provider: 'cursoride',
    file,
    sessionId,
    cwd: '/Users/example/rookery',
    projectPath: '/Users/example/rookery',
    watermark
  });
}

describe('reader, cursoride', () => {
  const dir = scratchDir('cursoride');
  const { file, sessionId } = buildCursorideStore(dir);
  const r = readStore(file, sessionId);

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fills the matrix row, 3 turns and 3 answers', () => {
    expect(r.turns.length).toBe(3);
    expect(r.turns.filter((t) => t.answer).length).toBe(3);
  });

  it('leaks no banned trap string', () => {
    const all = keptText(r);
    for (const b of ['Base directory for this skill', 'Request interrupted by user', '<tool-use>']) {
      expect(all).not.toContain(b);
    }
  });

  it('splits the skill preamble at the User Request heading', () => {
    const asks = r.turns.map((t) => t.ask.text);
    expect(asks.some((a) => a.startsWith('correct flag to pass'))).toBe(true);
  });

  it('an unchanged store is no work', () => {
    const r2 = readStore(file, sessionId, r.watermark);
    expect(r2.work).toBe('none');
    expect(r2.acct.bytesRead).toBe(0);
  });

  it('strips [Image: source: …] lines, which carry absolute home paths', () => {
    const dir2 = scratchDir('cursoride-img');
    try {
      const built = buildCursorideStore(dir2, (kv) => {
        for (const [k, v] of Object.entries(kv)) {
          if (!k.includes('b00000001')) continue;
          const bubble = v as Record<string, unknown>;
          bubble['text'] =
            '[Image: source: /Users/example/Desktop/secret-screenshot.png]\nwhat is wrong in this picture';
        }
      });
      const rr = readStore(built.file, built.sessionId);
      const all = keptText(rr);
      expect(all).not.toContain('[Image: source:');
      expect(all).not.toContain('secret-screenshot.png');
      expect(all).toContain('what is wrong in this picture');
    } finally {
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });
});
