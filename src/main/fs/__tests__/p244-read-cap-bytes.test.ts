/**
 * PHASE 244, audit finding F4. THE BYTE COUNT, TAKEN A SECOND WAY.
 *
 * The audit's own fixture (./audit-0908-read-cap.test.ts) counts what `readSync`
 * returned. That is one instrument, and a count taken with the instrument the
 * finding is about is worth re-deriving, so this file keeps that counter and
 * adds two readings that do not depend on it:
 *
 *  - WHICH refusal sentence came back. `guarded-write.ts` has two `tooLarge`
 *    refusals. The one at the payload check reads "The new contents of X are
 *    too large to write."; the one AFTER `readAllSync` reads "X is too large for
 *    Tortie to rewrite whole." Only the second is reachable once the file's own
 *    size is what is over, so the sentence alone says which question refused.
 *  - The process's own array-buffer growth across the call, which is a different
 *    mechanism from counting a return value, and it is the one that showed the
 *    peak was TWICE the file: 33,619,987 bytes for a 16 MiB read, because the
 *    chunk list is held and then `Buffer.concat` allocates a second full copy.
 *
 * At the parent this read 16,777,217 bytes in 258 `readSync` calls against a
 * 5,242,880 cap. It is turned the right way up here: the reader stops one byte
 * past the budget, the refusal, its word and its sentence are all the same, the
 * target is still not replaced, and the buffer growth is bounded by the cap
 * rather than by the file.
 */
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { READ_CAP_BYTES } from '@shared/fs-ops';

const GROWTH_BYTES = 16 * 1024 * 1024;
const observation = vi.hoisted(() => ({
  target: '',
  bytes: 0,
  calls: 0,
  armed: false,
  /** How many bytes the instrument appends when it fires. */
  growth: 16 * 1024 * 1024,
  /** What the INSTRUMENT itself allocated, so the reader's own share is readable. */
  injected: 0
}));
vi.mock('node:fs', async (original) => {
  const fs = await original<typeof import('node:fs')>();
  return { ...fs, readSync: (...args: Parameters<typeof fs.readSync>) => {
    if (observation.armed) {
      observation.armed = false;
      const growth = Buffer.alloc(observation.growth, 97);
      observation.injected += growth.byteLength;
      fs.appendFileSync(observation.target, growth);
    }
    const got = fs.readSync(...args);
    observation.bytes += got;
    observation.calls += 1;
    return got;
  } };
});
import { writeGuarded } from '../guarded-write';

it('stops one byte past its budget when the file grows after fstat', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'p244-f4-')));
  try {
    const path = join(root, 'a.txt');
    writeFileSync(path, 'a');
    observation.target = path;
    observation.bytes = 0;
    observation.calls = 0;
    observation.injected = 0;
    observation.growth = GROWTH_BYTES;
    observation.armed = true;
    const rssBefore = process.memoryUsage();
    const answer = await writeGuarded({ listProjectRoots: async () => [root] }, {
      root, path: 'a.txt', contents: 'replacement', expect: '0'.repeat(64)
    });
    const rssAfter = process.memoryUsage();
    const readings = {
      answer,
      readSyncBytes: observation.bytes,
      readSyncCalls: observation.calls,
      cap: READ_CAP_BYTES,
      overCapBy: observation.bytes - READ_CAP_BYTES,
      diskBytes: readFileSync(path).length,
      rssDelta: rssAfter.rss - rssBefore.rss,
      externalDelta: rssAfter.external - rssBefore.external,
      arrayBuffersDelta: rssAfter.arrayBuffers - rssBefore.arrayBuffers,
      // The instrument allocates the growth it appends, so the reader's own
      // share is what is left once that is taken back off. At the parent this
      // read about 33.5 MB, being twice the file.
      readerArrayBuffers: rssAfter.arrayBuffers - rssBefore.arrayBuffers - observation.injected
    };
    console.log(JSON.stringify(readings, null, 1));
    // The refusal, its word and its sentence are UNCHANGED by the repair. It is
    // still the question asked after the read, because the reader still hands
    // back one byte past the budget rather than answering the question itself.
    expect(answer).toMatchObject({
      outcome: 'refused', why: 'tooLarge',
      reason: 'a.txt is too large for Tortie to rewrite whole.'
    });
    // The bounded overflow sentinel: exactly one byte past the budget, never the
    // 16,777,217 the parent consumed.
    expect(observation.bytes).toBe(READ_CAP_BYTES + 1);
    // And the second instrument. The reader's own share was about twice the
    // FILE, 33,619,987 bytes measured at the parent for a 16 MiB read, because
    // the chunk list is held and then `Buffer.concat` allocates a second full
    // copy. It is bounded by the BUDGET now: the chunk list plus one concat
    // copy, with room to spare and nowhere near the file.
    expect(readings.readerArrayBuffers).toBeLessThan(READ_CAP_BYTES * 3);
    expect(readings.readerArrayBuffers).toBeLessThan(GROWTH_BYTES);
    // The file itself really did grow, so this is a bounded read of a big file
    // and not a small file measured twice.
    expect(readings.diskBytes).toBe(16 * 1024 * 1024 + 1);
    // And the target was not replaced, which is the refusal's other half.
    expect(readFileSync(path, 'utf8').startsWith('a')).toBe(true);
  } finally {
    observation.armed = false;
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * THE SAME PROPERTY AT A STARTING SIZE THAT IS NOT A MULTIPLE OF 64 KiB.
 *
 * PHASE 244's FIX ROUND. The case above starts at ONE byte, and `READ_CAP_BYTES`
 * is an exact multiple of 64 KiB, so `1 + 80 x 65536` is the ceiling exactly and
 * the loop's chunk clamp is invisible: a reader whose last chunk is a whole
 * 64 KiB reads the same 5,242,881 bytes. Measured by ablating the clamp alone,
 * both read-cap regressions stayed GREEN, so the module header's claim that the
 * read stops one byte past its budget was pinned by a coincidence rather than by
 * a check.
 *
 * At 65,535 bytes it is pinned: the shipping loop reads 5,242,881 and a loop
 * with no clamp reads 5,308,415, which is 65,535 bytes past the cap rather than
 * one. The cost either way is at most 64 KiB and the refusal is unchanged, so
 * this is exactness rather than a leak — and an exactness the module states in
 * its own header is one a check should be able to fail.
 */
it('stops one byte past its budget from a start that is not a chunk multiple', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'p244-f4b-')));
  const START = 65_535;
  const GROWTH = 6 * 1024 * 1024;
  try {
    const path = join(root, 'a.txt');
    writeFileSync(path, Buffer.alloc(START, 97));
    observation.target = path;
    observation.bytes = 0;
    observation.calls = 0;
    observation.injected = 0;
    observation.growth = GROWTH;
    observation.armed = true;
    const answer = await writeGuarded({ listProjectRoots: async () => [root] }, {
      root, path: 'a.txt', contents: 'replacement', expect: '0'.repeat(64)
    });
    console.log(
      JSON.stringify({
        start: START,
        readSyncBytes: observation.bytes,
        readSyncCalls: observation.calls,
        cap: READ_CAP_BYTES,
        overCapBy: observation.bytes - READ_CAP_BYTES,
        diskBytes: readFileSync(path).length
      })
    );
    expect(answer).toMatchObject({
      outcome: 'refused', why: 'tooLarge',
      reason: 'a.txt is too large for Tortie to rewrite whole.'
    });
    // One byte, not 65,535. This is the reading the clamp is pinned by.
    expect(observation.bytes).toBe(READ_CAP_BYTES + 1);
    expect(readFileSync(path).length).toBe(START + GROWTH);
    expect(readFileSync(path, 'utf8').startsWith('a')).toBe(true);
  } finally {
    observation.armed = false;
    rmSync(root, { recursive: true, force: true });
  }
});
