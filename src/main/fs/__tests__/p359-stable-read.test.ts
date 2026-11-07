/**
 * Phase 359, Builder C2 — the shared strict bounded reader.
 *
 * WHAT THIS PINS. One helper, two arms, no second copy of the read loop:
 * - the strict arm refuses oversize before allocating, compares the opened
 *   file's identity before AND after the bytes move, NUL-sniffs and fatal
 *   decodes, and answers `changed`/`too-large`/`not-text` as thrown words
 *   the caller maps to its closed refusals;
 * - the relaxed arm IS the editor's old `fs:readFile` answer byte for byte:
 *   at most READ_CAP_BYTES bytes, lossy decode, `truncated` from the fstat
 *   size.
 *
 * NO ELECTRON, NO MANIFEST. Scratch files under the system temp dir, removed
 * in a `finally`.
 */

import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { READ_CAP_BYTES } from '@shared/fs-ops';
import { readTextCapped } from '../read-text';
import { gmuxErrorPayloadOf } from '../../errors';

let dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs = [];
  vi.restoreAllMocks();
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'p359-read-'));
  dirs.push(dir);
  return dir;
}

function wordOf(err: unknown): string {
  return gmuxErrorPayloadOf(err)?.message ?? String(err);
}

describe('readTextCapped', () => {
  it('reads small text exactly in the strict arm', async () => {
    const dir = scratch();
    const abs = join(dir, 'a.txt');
    writeFileSync(abs, 'line1\nline2\n');
    const read = await readTextCapped(abs, 'strict');
    expect(read.text).toBe('line1\nline2\n');
    expect(read.bytes).toBe(Buffer.byteLength('line1\nline2\n'));
    expect(read.truncated).toBe(false);
  });

  it('refuses oversize before allocating', async () => {
    const dir = scratch();
    const abs = join(dir, 'big.bin');
    const fh = await import('node:fs/promises').then((m) => m.open(abs, 'w'));
    try {
      await fh.truncate(READ_CAP_BYTES + 1);
    } finally {
      await fh.close();
    }
    await expect(readTextCapped(abs, 'strict')).rejects.toThrowError(
      /too large/
    );
  });

  it('refuses binary NUL content as not-text', async () => {
    const dir = scratch();
    const abs = join(dir, 'bin.txt');
    writeFileSync(abs, Buffer.from([0x68, 0x69, 0x00, 0x21]));
    await expect(readTextCapped(abs, 'strict')).rejects.toThrowError(/binary/);
  });

  it('reads an atomic replacement as changed', async () => {
    const dir = scratch();
    const abs = join(dir, 'race.txt');
    writeFileSync(abs, 'x'.repeat(200_000));
    const read = readTextCapped(abs, 'strict', {
      afterFirstChunk: () => {
        writeFileSync(abs, 'replaced');
      }
    });
    await expect(read).rejects.toThrowError(/changed/);
    expect(wordOf(await read.catch((e: unknown) => e))).toContain('changed');
  });

  it('reads an in-place append as changed', async () => {
    const dir = scratch();
    const abs = join(dir, 'grow.txt');
    writeFileSync(abs, 'y'.repeat(200_000));
    const read = readTextCapped(abs, 'strict', {
      afterFirstChunk: () => {
        appendFileSync(abs, 'more bytes at the end');
      }
    });
    await expect(read).rejects.toThrowError(/changed/);
  });

  it('keeps the relaxed arm byte-identical to the old editor read', async () => {
    const dir = scratch();
    const abs = join(dir, 'small.txt');
    writeFileSync(abs, 'hello\n');
    const read = await readTextCapped(abs, 'relaxed');
    expect(read.text).toBe('hello\n');
    expect(read.truncated).toBe(false);
    // Oversize maps to the truncation flag, not a throw: the editor
    // composes over a truncated read, so this arm answers it. Space filled
    // so the binary sniff stays quiet, exactly as the old read's head.
    const big = join(dir, 'big.txt');
    writeFileSync(big, 'z'.repeat(READ_CAP_BYTES + 100));
    const bigRead = await readTextCapped(big, 'relaxed');
    expect(bigRead.truncated).toBe(true);
    expect(bigRead.text.length).toBeLessThanOrEqual(READ_CAP_BYTES);
  });

  it('refuses a directory and a missing path with the caller-mapped words', async () => {
    const dir = scratch();
    await expect(readTextCapped(dir, 'strict')).rejects.toThrowError(
      /not a regular file/
    );
    await expect(
      readTextCapped(join(dir, 'nope.txt'), 'strict')
    ).rejects.toThrowError(/no longer/);
  });
});
