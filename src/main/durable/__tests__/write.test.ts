/**
 * The durable write sequence (Phase 19 item 2).
 *
 * Every test here is one property of research 34 §4, and the two that matter
 * most are the two a reviewer does not think to check. A flushed file is not
 * a complete file, and a rename is not durable until its directory is
 * flushed. Both were measured on a real volume filled to ENOSPC, where the
 * write failed and `fsync`, `rename` and the directory flush all returned
 * success while publishing zero bytes.
 */

import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DurableWriteError, isOutOfSpace } from '../error';
import { flushDirectory, sha256Of, writeDurable, writeDurableBatch } from '../write';
import { enospc, probeFs } from './probe-fs';

let scratch: string;
let dir: string;

beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'gmux-durable-'));
  dir = join(scratch, 'snapshots');
});

afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

/** Staged files left behind, which should be none once a call has returned. */
async function partsIn(path: string): Promise<string[]> {
  const names = await readdir(path).catch(() => [] as string[]);
  return names.filter((n) => n.endsWith('.part'));
}

describe('the happy path', () => {
  it('publishes the bytes, creates the directory, and leaves nothing staged', async () => {
    const receipt = await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' });

    expect(await readFile(join(dir, 'a.txt'), 'utf8')).toBe('hello');
    expect(receipt).toEqual({ path: join(dir, 'a.txt'), bytes: 5, sha256: sha('hello') });
    expect(await partsIn(dir)).toEqual([]);
  });

  it('creates the file 0600, because a snapshot is the owner’s business only', async () => {
    await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' });
    const mode = (await stat(join(dir, 'a.txt'))).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('takes a Buffer as well as a string', async () => {
    const data = Buffer.from([0, 1, 2, 255]);
    const receipt = await writeDurable({ path: join(dir, 'b.bin'), data });
    expect(await readFile(join(dir, 'b.bin'))).toEqual(data);
    expect(receipt.sha256).toBe(sha256Of(data));
  });

  it('replaces an existing file in place', async () => {
    await writeDurable({ path: join(dir, 'a.txt'), data: 'first' });
    await writeDurable({ path: join(dir, 'a.txt'), data: 'second' });
    expect(await readFile(join(dir, 'a.txt'), 'utf8')).toBe('second');
    expect(await partsIn(dir)).toEqual([]);
  });
});

describe('the sequence itself', () => {
  it('runs write, size, flush, close, read back, rename, in that order', async () => {
    const fs = probeFs();
    await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs });

    const staged = fs.log.filter((line) => line.includes('a.txt'));
    expect(staged.map((line) => line.split(' ')[0])).toEqual([
      'open',
      'write',
      'stat',
      'sync',
      'close',
      'readFile',
      'rename'
    ]);
  });

  it('flushes the containing directory after the rename', async () => {
    const fs = probeFs();
    await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs });

    const rename = fs.log.indexOf('rename a.txt');
    const dirSync = fs.log.lastIndexOf('sync snapshots');
    expect(rename).toBeGreaterThan(-1);
    expect(dirSync).toBeGreaterThan(rename);
  });

  it('flushes the directory ONCE for a batch, after every rename', async () => {
    const fs = probeFs();
    const items = ['a', 'b', 'c'].map((n) => ({ path: join(dir, `${n}.txt`), data: n }));
    const result = await writeDurableBatch(items, { fs });

    expect(result.written).toHaveLength(3);
    expect(result.failed).toEqual([]);
    const dirSyncs = fs.log.filter((line) => line === 'sync snapshots');
    expect(dirSyncs).toHaveLength(1);
    const lastRename = Math.max(...['a', 'b', 'c'].map((n) => fs.log.indexOf(`rename ${n}.txt`)));
    expect(fs.log.lastIndexOf('sync snapshots')).toBeGreaterThan(lastRename);
  });

  it('flushes each directory once when a batch spans two of them', async () => {
    const fs = probeFs();
    const other = join(scratch, 'other');
    await writeDurableBatch(
      [
        { path: join(dir, 'a.txt'), data: 'a' },
        { path: join(other, 'b.txt'), data: 'b' }
      ],
      { fs }
    );
    expect(fs.log.filter((l) => l === 'sync snapshots')).toHaveLength(1);
    expect(fs.log.filter((l) => l === 'sync other')).toHaveLength(1);
  });

  it('holds a bounded number of files open, whatever the size of the batch', async () => {
    let open = 0;
    let peak = 0;
    const fs = probeFs({
      onWrite: () => {
        open += 1;
        peak = Math.max(peak, open);
      },
      onSync: (path) => {
        if (path.endsWith('.part')) open -= 1;
      }
    });
    const items = Array.from({ length: 40 }, (_v, i) => ({
      path: join(dir, `s${i}.txt`),
      data: `body ${i}`
    }));
    const result = await writeDurableBatch(items, { fs, concurrency: 4 });

    expect(result.written).toHaveLength(40);
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('stages beside the final name, under a name no second writer can collide with', async () => {
    const seen: string[] = [];
    const fs = probeFs({
      onWrite: (path) => {
        seen.push(path);
      }
    });
    await writeDurable({ path: join(dir, 'a.txt'), data: 'one' }, { fs });
    await writeDurable({ path: join(dir, 'a.txt'), data: 'two' }, { fs });

    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
    for (const path of seen) {
      expect(path.startsWith(join(dir, '.a.txt.'))).toBe(true);
      expect(path.endsWith('.part')).toBe(true);
    }
  });

  it('lets two writers race on one final name without either losing its bytes', async () => {
    // The old fixed temp name `.${sessionId}.tmp` let the quit path and the
    // %exit path write the same staged file. Both of those exist today.
    await Promise.all([
      writeDurable({ path: join(dir, 'a.txt'), data: 'x'.repeat(4096) }),
      writeDurable({ path: join(dir, 'a.txt'), data: 'y'.repeat(4096) })
    ]);
    const text = await readFile(join(dir, 'a.txt'), 'utf8');
    expect([('x').repeat(4096), ('y').repeat(4096)]).toContain(text);
    expect(await partsIn(dir)).toEqual([]);
  });

  it('keeps writing until the whole payload is on disk when a write is short', async () => {
    let call = 0;
    const fs = probeFs({
      onWrite: (_path, _chunk, length) => {
        call += 1;
        return call === 1 ? Math.floor(length / 3) : length;
      }
    });
    const body = 'z'.repeat(3000);
    await writeDurable({ path: join(dir, 'a.txt'), data: body }, { fs });
    expect(await readFile(join(dir, 'a.txt'), 'utf8')).toBe(body);
    expect(call).toBeGreaterThan(1);
  });
});

describe('the full volume, which is why the verification steps exist', () => {
  it('stops at the write when the volume is full, and publishes nothing', async () => {
    const fs = probeFs({
      onWrite: (path) => {
        throw enospc(path);
      }
    });
    const err = await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs }).catch(
      (e: unknown) => e
    );

    expect(err).toBeInstanceOf(DurableWriteError);
    expect((err as DurableWriteError).step).toBe('write');
    expect((err as DurableWriteError).errno).toBe('ENOSPC');
    expect(isOutOfSpace(err)).toBe(true);
    expect(existsSync(join(dir, 'a.txt'))).toBe(false);
    expect(await partsIn(dir)).toEqual([]);
  });

  it('catches the measured shape, where only the size on disk is wrong', async () => {
    // Reproduced on a 6 MB sparse APFS image filled to ENOSPC: write failed,
    // fsync returned OK, rename returned OK, the directory flush returned OK,
    // and a zero byte file was published. Nothing but the size check sees it.
    const fs = probeFs({ onStat: () => 0 });
    const err = await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs }).catch(
      (e: unknown) => e
    );

    expect((err as DurableWriteError).step).toBe('size');
    expect(isOutOfSpace(err)).toBe(true);
    expect(existsSync(join(dir, 'a.txt'))).toBe(false);
    expect(await partsIn(dir)).toEqual([]);
  });

  it('refuses to publish a file that reads back short', async () => {
    const fs = probeFs({ onReadFile: (_p, real) => real.subarray(0, 2) });
    const err = await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs }).catch(
      (e: unknown) => e
    );
    expect((err as DurableWriteError).step).toBe('size');
    expect(existsSync(join(dir, 'a.txt'))).toBe(false);
  });

  it('refuses to publish a file whose bytes changed under it', async () => {
    const fs = probeFs({ onReadFile: () => Buffer.from('HELLO') });
    const err = await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs }).catch(
      (e: unknown) => e
    );
    expect((err as DurableWriteError).step).toBe('verify');
    expect((err as DurableWriteError).message).toContain(sha('hello'));
    expect(existsSync(join(dir, 'a.txt'))).toBe(false);
    expect(await partsIn(dir)).toEqual([]);
  });

  it('skips the read back when the caller asks for the size check alone', async () => {
    const fs = probeFs({ onReadFile: () => Buffer.from('HELLO') });
    await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs, verify: 'size' });
    expect(await readFile(join(dir, 'a.txt'), 'utf8')).toBe('hello');
    expect(fs.log.some((l) => l.startsWith('readFile'))).toBe(false);
  });
});

describe('failures that are not the file', () => {
  it('reports a failed flush of the file and publishes nothing', async () => {
    const fs = probeFs({
      onSync: (path) => {
        if (path.endsWith('.part')) throw new Error('EIO');
      }
    });
    const err = await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs }).catch(
      (e: unknown) => e
    );
    expect((err as DurableWriteError).step).toBe('sync');
    expect(existsSync(join(dir, 'a.txt'))).toBe(false);
  });

  it('withholds every receipt in a directory whose flush failed', async () => {
    // The bytes are probably on disk. Nothing may RECORD them as durable,
    // and recording them is the only thing a receipt authorises.
    const fs = probeFs({
      onSync: (path) => {
        if (path.endsWith('snapshots')) throw new Error('EIO');
      }
    });
    const items = ['a', 'b'].map((n) => ({ path: join(dir, `${n}.txt`), data: n }));
    const result = await writeDurableBatch(items, { fs });

    expect(result.written).toEqual([]);
    expect(result.failed.map((f) => f.path).sort()).toEqual(
      [join(dir, 'a.txt'), join(dir, 'b.txt')].sort()
    );
    expect(result.failed[0]?.error.step).toBe('flush-directory');
    // The rename did happen, which is exactly why the caller must not treat
    // the absence of a receipt as the absence of a file.
    expect(existsSync(join(dir, 'a.txt'))).toBe(true);
  });

  it('reports a failed rename and sweeps its own staged file', async () => {
    const fs = probeFs({
      onRename: () => {
        throw new Error('EXDEV');
      }
    });
    const result = await writeDurableBatch([{ path: join(dir, 'a.txt'), data: 'hello' }], { fs });
    expect(result.written).toEqual([]);
    expect(result.failed[0]?.error.step).toBe('rename');
    expect(await partsIn(dir)).toEqual([]);
  });

  it('loses one file in a batch without losing the others', async () => {
    const fs = probeFs({
      onWrite: (path) => {
        if (path.includes('.b.txt.')) throw enospc(path);
      }
    });
    const items = ['a', 'b', 'c'].map((n) => ({ path: join(dir, `${n}.txt`), data: n }));
    const result = await writeDurableBatch(items, { fs });

    expect(result.written.map((r) => r.path).sort()).toEqual(
      [join(dir, 'a.txt'), join(dir, 'c.txt')].sort()
    );
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.path).toBe(join(dir, 'b.txt'));
    expect(isOutOfSpace(result.failed[0]?.error)).toBe(true);
    expect(await readFile(join(dir, 'a.txt'), 'utf8')).toBe('a');
    expect(await readFile(join(dir, 'c.txt'), 'utf8')).toBe('c');
    // The directory still gets its one flush, for the files that made it.
    expect(fs.log.filter((l) => l === 'sync snapshots')).toHaveLength(1);
  });

  it('does not flush a directory where every file failed', async () => {
    const fs = probeFs({
      onWrite: (path) => {
        throw enospc(path);
      }
    });
    const result = await writeDurableBatch([{ path: join(dir, 'a.txt'), data: 'a' }], { fs });
    expect(result.written).toEqual([]);
    expect(fs.log.filter((l) => l === 'sync snapshots')).toHaveLength(0);
  });

  it('opens the staged file with wx, so a crash’s leftovers are never clobbered', async () => {
    const fs = probeFs();
    await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs });
    const opens = fs.log.filter((l) => l.startsWith('open .a.txt.'));
    expect(opens).toHaveLength(1);
    expect(opens[0]?.endsWith(' wx')).toBe(true);
  });

  it('reports the open failing rather than writing somewhere else', async () => {
    const fs = probeFs();
    await writeFile(join(scratch, 'blocker'), 'x', 'utf8');
    const result = await writeDurableBatch(
      [{ path: join(scratch, 'blocker', 'a.txt'), data: 'hello' }],
      { fs }
    );
    expect(result.written).toEqual([]);
    expect(result.failed[0]?.error.step).toBe('mkdir');
    expect(result.failed[0]?.error.message).toContain('blocker');
  });

  it('flushes the parent when it had to create the directory itself', async () => {
    // A new directory is itself an entry in ITS parent, and that entry has
    // to survive the same power cut the files inside it are protected from.
    const fs = probeFs();
    await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' }, { fs });
    expect(fs.log.filter((l) => l === 'sync snapshots')).toHaveLength(1);
    expect(fs.log.some((l) => l.startsWith('sync gmux-durable-'))).toBe(true);
  });

  it('does not flush the parent when the directory was already there', async () => {
    await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' });
    const fs = probeFs();
    await writeDurable({ path: join(dir, 'b.txt'), data: 'hello' }, { fs });
    expect(fs.log.some((l) => l.startsWith('sync gmux-durable-'))).toBe(false);
  });
});

describe('flushDirectory', () => {
  it('opens the directory for reading, because opening it to write throws EISDIR', async () => {
    await writeDurable({ path: join(dir, 'a.txt'), data: 'hello' });
    await expect(flushDirectory(dir)).resolves.toBeUndefined();
  });

  it('reports a directory that is not there rather than pretending', async () => {
    const err = await flushDirectory(join(scratch, 'nope')).catch((e: unknown) => e);
    expect((err as DurableWriteError).step).toBe('flush-directory');
    expect((err as DurableWriteError).errno).toBe('ENOENT');
  });
});
