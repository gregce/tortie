/**
 * Git's own blob name, computed in process (Phase 257, spec D2).
 *
 * `arch_fact` is keyed on the blob oid of the bytes a fact was read from, so a
 * file whose stamp moved but whose bytes did not, being a branch switch, a
 * `touch` or a fresh clone, is hashed and LINKED without a parse. The name is
 * the one `git hash-object` would print, sha1 over `blob <len>\0` plus the
 * bytes, so nothing new joins `ARCH_ARGV_WORDS` and the mirror needs nothing
 * from the far side. This is the one `node:` import the directory makes.
 */

import { createHash } from 'node:crypto';

/** The 40 hex blob object name of these bytes. */
export function blobOid(buf: Buffer): string {
  const h = createHash('sha1');
  h.update(`blob ${buf.length}\0`);
  h.update(buf);
  return h.digest('hex');
}

/** sha256 of a string, hex. The wrapper map digest is made with it. */
export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
