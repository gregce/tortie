/**
 * PHASE 244, audit finding F2. The near side's CRC really is the number the far
 * side's `cksum` prints.
 *
 * The mirror's freshness token is a content digest: the far side runs POSIX
 * `cksum` over each tracked file, one process per page, and this side re-derives
 * the same number over the mirror's own bytes so the mirror stays its own record
 * with no side table beside it. Two halves that disagree would mean every file
 * is carried across on every pass — expensive and silent — so this is the pin.
 *
 * THE VECTORS ARE THE PROGRAM'S OWN OUTPUT, not this implementation's. Each was
 * read from `cksum` on a real macOS machine on 8 September 2026 and is quoted
 * here; a GNU coreutils `cksum` prints the same numbers, because the algorithm
 * is specified by POSIX rather than chosen by an implementation.
 *
 * The last three exist because they are where a hand-written CRC-32/CKSUM goes
 * wrong: the empty input, where the length loop feeds nothing at all; a run of
 * high bytes, which catches a missing `>>> 0`; and an input long enough that its
 * length needs THREE bytes fed in, which catches a length loop that stops early.
 */

import { describe, expect, it } from 'vitest';

import { posixCksum } from '../arch-cksum';

/** [name, bytes, what `cksum` printed]. */
const VECTORS: readonly [string, Uint8Array, number][] = [
  ['an empty file', new Uint8Array(0), 4294967295],
  ['one line', Buffer.from('a\n'), 2418082923],
  ["the audit's first version", Buffer.from('export const a = 1;\n'), 1215176727],
  ["the audit's second version, same length", Buffer.from('export const a = 2;\n'), 672764537],
  ['no trailing newline', Buffer.from('abc'), 1219131554],
  ['a NUL and high bytes', Uint8Array.from([0, 1, 255, 254, 128, 0, 7]), 1962796661],
  ['utf-8 beyond the basic plane', Buffer.from('café 🧮\n'), 3829265492],
  ['256 zero bytes', new Uint8Array(256), 4215202376],
  ['a KiB of 0xff', new Uint8Array(1024).fill(0xff), 2603594795],
  [
    '65,536 bytes, so the length itself needs three bytes',
    Buffer.concat(Array.from({ length: 256 }, () => Buffer.from(Array.from({ length: 256 }, (_, n) => n)))),
    3547434670
  ]
];

describe('posixCksum agrees with the cksum program', () => {
  for (const [name, bytes, expected] of VECTORS) {
    it(name, () => {
      expect(posixCksum(bytes)).toBe(expected);
    });
  }

  it('answers an unsigned 32-bit integer for every vector', () => {
    for (const [, bytes] of VECTORS) {
      const answer = posixCksum(bytes);
      expect(Number.isInteger(answer)).toBe(true);
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(answer).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('separates the two same-length versions the audit used', () => {
    // The whole point in one line: equal size, one letter apart.
    expect(posixCksum(Buffer.from('export const a = 1;\n'))).not.toBe(
      posixCksum(Buffer.from('export const a = 2;\n'))
    );
  });
});
