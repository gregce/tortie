/**
 * The POSIX `cksum` CRC, computed here over the mirror's own bytes (Phase 244).
 *
 * ## Why this exists
 *
 * The 0.101.0 audit's finding F2: the remote Architecture mirror decided a file
 * was unchanged from the far side's whole-second modification time and its size,
 * so a same-length rewrite inside one second was invisible and the mirror kept
 * the old bytes for ever. The repair is a CONTENT token, because a higher
 * resolution stamp still says nothing when a tool preserves the timestamp.
 *
 * `cksum` is the far side's half of that token: POSIX, present on every machine
 * this product can reach, spelled the same on macOS and on Linux, specified to
 * print `<crc> <octets> <pathname>`, and able to take a whole page of files in
 * ONE process. This module is the near side's half. Recomputing the digest from
 * the mirrored bytes rather than recording what the far side said is what keeps
 * the mirror its own record: there is no side table to fall out of step, and a
 * mirror somebody deleted half of, or edited by hand, simply re-fetches that
 * half — which is the property `mirrorStamps` was written for.
 *
 * ## The algorithm, which is NOT zlib's CRC-32
 *
 * POSIX `cksum` is CRC-32/CKSUM: polynomial 0x04C11DB7 fed most significant bit
 * first, no reflection on either side, initial value zero, then the LENGTH of
 * the input is fed in as bytes least significant first with high-order zero
 * bytes omitted, and the result is complemented. `zlib.crc32` is the reflected
 * CRC-32 with a 0xFFFFFFFF seed and answers something else entirely, so it
 * cannot stand in here.
 *
 * The vectors in `__tests__/p244-arch-cksum.test.ts` are what the `cksum` on a
 * real machine printed, so this file is checked against the program it must
 * agree with rather than against its own arithmetic.
 */

/** The MSB-first table for polynomial 0x04C11DB7, built once. */
const TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n << 24;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 0x80000000) !== 0 ? ((value << 1) ^ 0x04c11db7) >>> 0 : (value << 1) >>> 0;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

/**
 * The number `cksum` prints for these bytes.
 *
 * PURE, and it never throws. The answer is an unsigned 32-bit integer, which is
 * what the far side's text parses to.
 */
export function posixCksum(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc = ((crc << 8) ^ (TABLE[((crc >>> 24) ^ byte) & 0xff] as number)) >>> 0;
  }
  // The length, least significant byte first, with high-order zero bytes left
  // out. An empty input therefore feeds nothing here and answers 0xffffffff.
  for (let length = bytes.length; length !== 0; length = Math.floor(length / 256)) {
    crc = ((crc << 8) ^ (TABLE[((crc >>> 24) ^ (length & 0xff)) & 0xff] as number)) >>> 0;
  }
  return (~crc >>> 0) as number;
}
