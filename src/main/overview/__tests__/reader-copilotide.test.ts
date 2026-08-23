/**
 * copilotide through the product reader. The matrix row is 2 turns, 2
 * answers. One element of requests[] is exactly one turn, and the answer is
 * read from message.text and response value parts, never from
 * result.metadata.renderedUserMessage, which is a verbatim second copy of
 * the ask at 42.94% of the corpus. droid's honest line rides along here.
 */

import * as fs from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { readSessionLog } from '../reader';
import { buildCopilotideFile, keptText, scratchDir } from './reader-helpers';

describe('reader, copilotide', () => {
  const dir = scratchDir('copilotide');
  const file = buildCopilotideFile(dir);
  const r = readSessionLog({
    provider: 'copilotide',
    file,
    sessionId: null,
    cwd: '/Users/example/rookery',
    projectPath: '/Users/example/rookery',
    watermark: null
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fills the matrix row, 2 turns and 2 answers, one element one turn', () => {
    expect(r.turns.length).toBe(2);
    expect(r.turns.filter((t) => t.answer).length).toBe(2);
    expect(r.acct.turnMode).toBe('per-element');
    expect(r.acct.prefilter).toBe('off');
  });

  it('never reads renderedUserMessage or tool results', () => {
    const all = keptText(r);
    expect(all).not.toContain('renderedUserMessage');
    expect(all).not.toContain('toolCallResults');
  });

  it('an unchanged document is no work', () => {
    const r2 = readSessionLog({
      provider: 'copilotide',
      file,
      sessionId: null,
      cwd: '/Users/example/rookery',
      projectPath: '/Users/example/rookery',
      watermark: r.watermark
    });
    expect(r2.work).toBe('none');
    expect(r2.acct.bytesRead).toBe(0);
  });
});

describe('reader, droid', () => {
  it('returns the honest line and nothing else', () => {
    const r = readSessionLog({
      provider: 'droid',
      file: '',
      sessionId: null,
      cwd: '/x',
      projectPath: '/x',
      watermark: null
    });
    expect(r.work).toBe('none');
    expect(r.turns.length).toBe(0);
    expect(r.watermark).toBeNull();
    expect(r.honest).toContain('no record on this Mac');
  });
});
