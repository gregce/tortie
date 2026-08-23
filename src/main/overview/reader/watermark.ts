/**
 * The watermark, being what makes the second read of an unchanged file one
 * stat call. Ported from docs/research/assets/63-keep-map/read.js with the
 * two engine wide fixes from research 63 section 19.
 *
 * Fix one, defect 7 part one. Every stat here passes `{ bigint: true }`. The
 * reference called statSync without it, so `mtimeNs` was undefined on both
 * sides, `String(undefined)` matched itself, and the modification time guard
 * never ran. Only size equality was actually checked.
 *
 * Fix two, defect 7 part two. A rewrite that preserves the first 4,096 bytes
 * used to resume into a stale offset and report success. The guard now also
 * hashes the 4,096 bytes immediately BEFORE the resume offset, and requires
 * the byte before the offset to be a newline, so a rewrite below the head
 * turns into a full read instead of a wrong page.
 */

import * as fs from 'node:fs';
import { createHash } from 'node:crypto';

export type Watermark =
  | {
      kind: 'byte-offset';
      file: string;
      size: string;
      mtimeNs: string;
      /** sha256 of bytes [0, 4096). */
      headHash: string;
      /** sha256 of the 4,096 bytes ending at offset. */
      tailHash: string;
      /** The line that OPENED the still open turn, or the last complete line. */
      offset: number;
      open: boolean;
      /** The index the first re-emitted turn will carry. */
      turnIndex: number;
    }
  | {
      kind: 'whole-doc';
      file: string;
      size: string;
      mtimeNs: string;
      messageCount: number | null;
      lastMessageDate: string | null;
      turnIndex: number;
    }
  | {
      kind: 'content-hash';
      file: string;
      rootBlobId: string;
      chainLength: number;
      tailId: string | null;
      turnIndex: number;
    };

const GUARD_BYTES = 4096;

function hashRange(file: string, start: number, end: number): string {
  const n = Math.max(0, end - start);
  if (n === 0) return sha256(Buffer.alloc(0));
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(n);
    const r = fs.readSync(fd, buf, 0, n, start);
    return sha256(buf.subarray(0, Math.max(0, r)));
  } finally {
    fs.closeSync(fd);
  }
}

function sha256(b: Buffer): string {
  return createHash('sha256').update(b).digest('hex').slice(0, 16);
}

/** sha256 of bytes [0, 4096). */
export function headHash(file: string): string {
  return hashRange(file, 0, GUARD_BYTES);
}

/** sha256 of the 4,096 bytes ending at offset. */
export function tailHash(file: string, offset: number): string {
  return hashRange(file, Math.max(0, offset - GUARD_BYTES), offset);
}

/** True when the byte before the offset is a newline, or the offset is 0. */
export function newlineBeforeOffset(file: string, offset: number): boolean {
  if (offset === 0) return true;
  const fd = fs.openSync(file, 'r');
  try {
    const b = Buffer.allocUnsafe(1);
    const r = fs.readSync(fd, b, 0, 1, offset - 1);
    return r === 1 && b[0] === 10;
  } finally {
    fs.closeSync(fd);
  }
}

export function buildByteOffsetWatermark(
  file: string,
  size: number,
  mtimeNs: string,
  offset: number,
  open: boolean,
  turnIndex: number
): Watermark {
  return {
    kind: 'byte-offset',
    file,
    size: String(size),
    mtimeNs,
    headHash: headHash(file),
    tailHash: tailHash(file, offset),
    offset,
    open,
    turnIndex
  };
}

export type ResumeVerdict = 'unchanged' | 'resume' | 'full';

/**
 * Decide what a byte-offset watermark buys against the file as it stands.
 * `st` is a bigint stat of the same file.
 */
export function checkByteOffset(
  file: string,
  wm: Watermark | null,
  st: fs.BigIntStats
): ResumeVerdict {
  if (!wm || wm.kind !== 'byte-offset') return 'full';
  if (wm.size === String(st.size) && wm.mtimeNs === String(st.mtimeNs)) return 'unchanged';
  if (Number(st.size) < wm.offset) return 'full';
  if (!newlineBeforeOffset(file, wm.offset)) return 'full';
  if (headHash(file) !== wm.headHash) return 'full';
  if (tailHash(file, wm.offset) !== wm.tailHash) return 'full';
  return 'resume';
}

/** The one stat comparison every container starts with. */
export function statUnchanged(
  wm: { size: string; mtimeNs: string } | null | undefined,
  st: fs.BigIntStats
): boolean {
  return (
    wm != null && wm.size === String(st.size) && wm.mtimeNs === String(st.mtimeNs)
  );
}
