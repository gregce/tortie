/**
 * Generations, pruning and the verified read.
 *
 * The property under test is the one a destructive replace cannot have. At
 * every instant there is a complete copy on disk, so a power cut has no
 * window in which the old file is gone and the new one is not there yet.
 */

import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  generationName,
  generationPath,
  listGenerations,
  nextGeneration,
  parseGeneration,
  pruneGenerations,
  readVerified
} from '../generations';
import { writeDurable, writeDurableBatch } from '../write';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'gmux-generations-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const sha = (text: string): string => createHash('sha256').update(text).digest('hex');

describe('naming', () => {
  it('pads the number so a directory listing reads in order', () => {
    expect(generationName('s.txt', 1)).toBe('s.txt.000001');
    expect(generationName('s.txt', 42)).toBe('s.txt.000042');
  });

  it('reads the number back', () => {
    expect(parseGeneration('s.txt.000042', 's.txt')).toBe(42);
  });

  it('refuses a name that is not a generation of this stem', () => {
    expect(parseGeneration('s.txt', 's.txt')).toBeNull();
    expect(parseGeneration('s.txt.part', 's.txt')).toBeNull();
    expect(parseGeneration('.s.txt.0001.part', 's.txt')).toBeNull();
    expect(parseGeneration('other.txt.000001', 's.txt')).toBeNull();
    expect(parseGeneration('s.txt.00a1', 's.txt')).toBeNull();
  });

  it('orders by the number, not by the text, past the padding width', async () => {
    for (const gen of [999999, 1000000, 2]) {
      await writeFile(generationPath(dir, 's.txt', gen), String(gen), 'utf8');
    }
    const found = await listGenerations(dir, 's.txt');
    expect(found.map((g) => g.generation)).toEqual([1000000, 999999, 2]);
  });
});

describe('nextGeneration', () => {
  it('starts at 1 in an empty directory', async () => {
    expect(await nextGeneration(dir, 's.txt')).toBe(1);
  });

  it('starts at 1 when the directory is not there at all', async () => {
    expect(await nextGeneration(join(dir, 'missing'), 's.txt')).toBe(1);
  });

  it('is taken from the disk, so a crash does not repeat a number', async () => {
    await writeFile(generationPath(dir, 's.txt', 7), 'seven', 'utf8');
    expect(await nextGeneration(dir, 's.txt')).toBe(8);
  });

  it('ignores another stem living in the same directory', async () => {
    await writeFile(generationPath(dir, 'other.txt', 9), 'nine', 'utf8');
    expect(await nextGeneration(dir, 's.txt')).toBe(1);
  });
});

describe('pruning', () => {
  it('keeps the newest N and removes the rest', async () => {
    for (const gen of [1, 2, 3, 4]) {
      await writeFile(generationPath(dir, 's.txt', gen), String(gen), 'utf8');
    }
    const result = await pruneGenerations(dir, 's.txt', 2);

    expect(result.kept.map((g) => g.generation)).toEqual([4, 3]);
    expect(result.removed).toHaveLength(2);
    expect((await readdir(dir)).sort()).toEqual(['s.txt.000003', 's.txt.000004']);
  });

  it('never prunes down to nothing, whatever it is asked for', async () => {
    await writeFile(generationPath(dir, 's.txt', 1), '1', 'utf8');
    const result = await pruneGenerations(dir, 's.txt', 0);
    expect(result.kept).toHaveLength(1);
    expect(await readdir(dir)).toEqual(['s.txt.000001']);
  });

  it('leaves another stem alone', async () => {
    await writeFile(generationPath(dir, 's.txt', 1), '1', 'utf8');
    await writeFile(generationPath(dir, 'other.txt', 1), '1', 'utf8');
    await pruneGenerations(dir, 's.txt', 1);
    expect((await readdir(dir)).sort()).toEqual(['other.txt.000001', 's.txt.000001']);
  });

  it('sweeps a staged file an earlier crash left behind', async () => {
    const stale = join(dir, '.s.txt.abc-0011.part');
    await writeFile(stale, 'half a file', 'utf8');
    const old = new Date(Date.now() - 10 * 60_000);
    await utimes(stale, old, old);

    const result = await pruneGenerations(dir, 's.txt', 2);
    expect(result.sweptParts).toEqual([stale]);
    expect(await readdir(dir)).toEqual([]);
  });

  it('leaves a staged file that a write happening right now may own', async () => {
    const fresh = join(dir, '.s.txt.abc-0011.part');
    await writeFile(fresh, 'being written', 'utf8');
    const result = await pruneGenerations(dir, 's.txt', 2);
    expect(result.sweptParts).toEqual([]);
    expect(await readdir(dir)).toEqual(['.s.txt.abc-0011.part']);
  });

  /**
   * The exact shape a verifier measured on a real filesystem, and the reason
   * `recorded` exists. One recorded generation, two bodies of the kind a
   * SIGKILL inside `snapshot.after-write` actually leaves, then one good
   * capture. Choosing survivors from the DIRECTORY kept the three orphans and
   * deleted the one generation a reader could verify, so the verified
   * fallbacks went from one to zero.
   */
  describe('with a completion record', () => {
    async function crashShape(): Promise<void> {
      for (const gen of [1, 2, 3, 4]) {
        await writeFile(generationPath(dir, 's.txt', gen), String(gen), 'utf8');
      }
    }

    it('keeps the RECORDED generations, not the newest on disk', async () => {
      await crashShape();
      const result = await pruneGenerations(dir, 's.txt', 3, { recorded: [4, 1] });
      expect(result.kept.map((g) => g.generation).sort((a, b) => a - b)).toEqual([1, 4]);
      expect((await readdir(dir)).sort()).toEqual(['s.txt.000001', 's.txt.000004']);
    });

    it('reproduces the loss when the record is not passed', async () => {
      await crashShape();
      await pruneGenerations(dir, 's.txt', 3);
      // Generation 1 is the only one anything vouched for and it is gone.
      expect(await readdir(dir)).not.toContain('s.txt.000001');
    });

    it('keeps a body newer than the newest recorded one, which may be in flight', async () => {
      await crashShape();
      await pruneGenerations(dir, 's.txt', 3, { recorded: [2, 1] });
      expect((await readdir(dir)).sort()).toEqual([
        's.txt.000001',
        's.txt.000002',
        's.txt.000003',
        's.txt.000004'
      ]);
    });

    it('honours the ring size against the record', async () => {
      for (const gen of [1, 2, 3, 4, 5]) {
        await writeFile(generationPath(dir, 's.txt', gen), String(gen), 'utf8');
      }
      await pruneGenerations(dir, 's.txt', 3, { recorded: [5, 4, 3, 2, 1] });
      expect((await readdir(dir)).sort()).toEqual([
        's.txt.000003',
        's.txt.000004',
        's.txt.000005'
      ]);
    });
  });
});

describe('the verified read', () => {
  it('returns the newest generation when it proves out', async () => {
    const records = [
      { path: join(dir, 'b'), bytes: 3, sha256: sha('two') },
      { path: join(dir, 'a'), bytes: 3, sha256: sha('one') }
    ];
    await writeFile(records[0]!.path, 'two', 'utf8');
    await writeFile(records[1]!.path, 'one', 'utf8');

    const hit = await readVerified(records);
    expect(hit?.data.toString('utf8')).toBe('two');
  });

  it('falls back to the older generation when the newest is corrupt', async () => {
    const records = [
      { path: join(dir, 'b'), bytes: 3, sha256: sha('two') },
      { path: join(dir, 'a'), bytes: 3, sha256: sha('one') }
    ];
    await writeFile(records[0]!.path, 'TWO', 'utf8');
    await writeFile(records[1]!.path, 'one', 'utf8');

    const hit = await readVerified(records);
    expect(hit?.record.path).toBe(records[1]!.path);
    expect(hit?.data.toString('utf8')).toBe('one');
  });

  it('falls back when the newest is truncated', async () => {
    const records = [
      { path: join(dir, 'b'), bytes: 3, sha256: sha('two') },
      { path: join(dir, 'a'), bytes: 3, sha256: sha('one') }
    ];
    await writeFile(records[0]!.path, 't', 'utf8');
    await writeFile(records[1]!.path, 'one', 'utf8');
    expect((await readVerified(records))?.data.toString('utf8')).toBe('one');
  });

  it('falls back when the newest file is missing', async () => {
    const records = [
      { path: join(dir, 'gone'), bytes: 3, sha256: sha('two') },
      { path: join(dir, 'a'), bytes: 3, sha256: sha('one') }
    ];
    await writeFile(records[1]!.path, 'one', 'utf8');
    expect((await readVerified(records))?.data.toString('utf8')).toBe('one');
  });

  it('returns null rather than unverified bytes when nothing proves out', async () => {
    const records = [{ path: join(dir, 'a'), bytes: 3, sha256: sha('one') }];
    await writeFile(records[0]!.path, 'XXX', 'utf8');
    expect(await readVerified(records)).toBeNull();
  });
});

describe('the whole shape, save then load', () => {
  it('keeps two generations, and the older one is still complete', async () => {
    const stem = 'session.txt';
    const records: { path: string; bytes: number; sha256: string }[] = [];

    for (const text of ['first', 'second', 'third']) {
      const gen = await nextGeneration(dir, stem);
      const receipt = await writeDurable({ path: generationPath(dir, stem, gen), data: text });
      records.unshift(receipt);
      await pruneGenerations(dir, stem, 2);
    }

    expect((await readdir(dir)).sort()).toEqual(['session.txt.000002', 'session.txt.000003']);
    const hit = await readVerified(records);
    expect(hit?.data.toString('utf8')).toBe('third');

    // Tear the newest one, the way a crash mid write would if the sequence
    // did not stage and rename, and the previous generation still answers.
    await writeFile(records[0]!.path, '', 'utf8');
    const fallback = await readVerified(records);
    expect(fallback?.data.toString('utf8')).toBe('second');
  });

  it('publishes a batch of generations under one directory flush', async () => {
    const items = ['s1', 's2', 's3'].map((stem) => ({
      path: generationPath(dir, `${stem}.txt`, 1),
      data: `body of ${stem}`
    }));
    const out = await writeDurableBatch(items);

    expect(out.failed).toEqual([]);
    expect(out.written).toHaveLength(3);
    for (const receipt of out.written) {
      const bytes = await readFile(receipt.path);
      expect(bytes.length).toBe(receipt.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(receipt.sha256);
    }
  });
});
