/**
 * Defect 7, the watermark. The reference called statSync without bigint, so
 * the modification time guard compared the string "undefined" to itself and
 * never ran, and a rewrite below the first 4,096 bytes resumed into a stale
 * offset and reported success. This file proves the four cases the spec
 * names, plus the tail resume that re-emits the open turn whole.
 */

import * as fs from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURES, JSONL_CASES, readFixture, scratchDir } from './reader-helpers';
import type { Watermark } from '../reader';

const CLAUDE = JSONL_CASES['claude']!;

function copyFixture(dir: string): string {
  const file = join(dir, 'claude.jsonl');
  fs.copyFileSync(join(FIXTURES, CLAUDE.file), file);
  return file;
}

describe('the watermark, defect 7', () => {
  it('an unchanged file is one stat, no bytes read', () => {
    const dir = scratchDir('wm1');
    try {
      const file = copyFixture(dir);
      const first = readFixture(CLAUDE, { file });
      const second = readFixture(CLAUDE, { file, watermark: first.watermark });
      expect(second.work).toBe('none');
      expect(second.acct.bytesRead).toBe(0);
      expect(second.turns.length).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the watermark carries a real nanosecond mtime, not the string undefined', () => {
    const dir = scratchDir('wm2');
    try {
      const file = copyFixture(dir);
      const wm = readFixture(CLAUDE, { file }).watermark as Extract<
        Watermark,
        { kind: 'byte-offset' }
      >;
      expect(wm.kind).toBe('byte-offset');
      expect(wm.mtimeNs).not.toBe('undefined');
      expect(/^\d+$/.test(wm.mtimeNs)).toBe(true);
      expect(wm.tailHash.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('six bytes changed at equal length below the head, with the mtime moved, is a full read', () => {
    const dir = scratchDir('wm3');
    try {
      const file = copyFixture(dir);
      const wm = readFixture(CLAUDE, { file }).watermark as Extract<
        Watermark,
        { kind: 'byte-offset' }
      >;
      const buf = fs.readFileSync(file);
      const pos = Math.min(Math.max(4200, wm.offset - 300), buf.length - 10);
      for (let i = 0; i < 6; i++) buf[pos + i] = 88;
      fs.writeFileSync(file, buf);
      fs.utimesSync(file, new Date(), new Date(Date.now() + 7000));
      const r = readFixture(CLAUDE, { file, watermark: wm });
      expect(r.work).toBe('full');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('bytes rewritten inside the first 4,096 is a full read', () => {
    const dir = scratchDir('wm4');
    try {
      const file = copyFixture(dir);
      const wm = readFixture(CLAUDE, { file }).watermark;
      const buf = fs.readFileSync(file);
      for (let i = 100; i < 106; i++) buf[i] = 89;
      fs.writeFileSync(file, buf);
      const r = readFixture(CLAUDE, { file, watermark: wm });
      expect(r.work).toBe('full');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('truncation is a full read', () => {
    const dir = scratchDir('wm5');
    try {
      const file = copyFixture(dir);
      const wm = readFixture(CLAUDE, { file }).watermark;
      fs.writeFileSync(file, fs.readFileSync(file).subarray(0, 3000));
      const r = readFixture(CLAUDE, { file, watermark: wm });
      expect(r.work).toBe('full');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('one new turn is a tail read that re-emits the open turn whole with its index', () => {
    const dir = scratchDir('wm6');
    try {
      const file = copyFixture(dir);
      const first = readFixture(CLAUDE, { file });
      const lastIndex = first.turns[first.turns.length - 1]!.index;
      const ask = JSON.stringify({
        isSidechain: false,
        type: 'user',
        message: { role: 'user', content: 'and now push the tag' },
        timestamp: '2026-08-20T11:00:00.000Z',
        sessionId: '11111111-2222-4333-8444-555555555555',
        cwd: '/Users/dev/demo-app'
      });
      const answer = JSON.stringify({
        isSidechain: false,
        type: 'assistant',
        message: {
          model: 'claude-opus-5',
          role: 'assistant',
          content: [{ type: 'text', text: 'Pushed.' }]
        },
        timestamp: '2026-08-20T11:00:10.000Z',
        sessionId: '11111111-2222-4333-8444-555555555555',
        cwd: '/Users/dev/demo-app'
      });
      fs.appendFileSync(file, ask + '\n' + answer + '\n');
      const r = readFixture(CLAUDE, { file, watermark: first.watermark });
      expect(r.work).toBe('tail');
      expect(r.acct.bytesRead).toBeLessThan(Number(fs.statSync(file).size));
      expect(r.turns[0]!.index).toBe(lastIndex);
      expect(r.turns[r.turns.length - 1]!.ask.text).toBe('and now push the tag');
      expect(r.turns[r.turns.length - 1]!.answer!.text).toBe('Pushed.');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a resume offset that does not sit after a newline is refused', () => {
    const dir = scratchDir('wm7');
    try {
      const file = copyFixture(dir);
      const wm = readFixture(CLAUDE, { file }).watermark as Extract<
        Watermark,
        { kind: 'byte-offset' }
      >;
      const crooked = { ...wm, offset: wm.offset + 1 };
      fs.appendFileSync(file, '{"type":"x"}\n');
      const r = readFixture(CLAUDE, { file, watermark: crooked });
      expect(r.work).toBe('full');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
