/**
 * Phase 359, Builder C2 — the one strict bounded reader the agent-access
 * open path shares with `fs:readFile`.
 *
 * WHAT THIS FILE OWNS. `readTextCapped`: anonymous-temp re-read semantics
 * for one regular file, bounded at every step (pre-read refusal above
 * `READ_CAP_BYTES`, the inside-loop budget from `guarded-write.ts`), UTF-8
 * with a fatal decoder, NUL-sniffed like the editor's read, and identity
 * checked before AND after the bytes move. Nothing here knows about
 * projects, sessions, the socket, or the renderer.
 *
 * THE SEMANTICS, and both halves exist for the race the conformance gate
 * drives:
 *   - `strict`: an atomic replace (`rename` over the name) or an in-place
 *     write between the first and second identity reads returns `changed`
 *     and no text. The caller answers its closed refusal word.
 *   - `relaxed`: the editor's own `fs:readFile` answers, unchanged through
 *     this function.
 *
 * The harness seam (§6.9 in SPEC terms) is NOT here. It is armed only in
 * `open.ts`'s call site, through the injected `afterFirstChunk` callback:
 * this file pauses between chunks only when a caller hands it a function,
 * and the only production caller that does is the one the harness gate arms.
 */

import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync
} from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { READ_CAP_BYTES } from '@shared/fs-ops';
import { gmuxError, type GmuxErrorCode } from '../errors';

/** Bytes sniffed for NUL to classify a file as binary (git's heuristic). */
export const AGENT_ACCESS_BINARY_SNIFF_BYTES = 8192;

/** How the caller wants identity drift handled. */
export type AgentAccessReadStrictness = 'strict' | 'relaxed';

/**
 * Extra knobs for tests and for the single harness-armed call site in
 * `open.ts`. Production calls pass nothing.
 */
export interface AgentAccessReadOptions {
  /**
   * Called after the first read chunk lands, before the rest of the file
   * is read. The gate's live replacement race arms this alone; a call with
   * no callback never pauses.
   */
  afterFirstChunk?: () => void;
}

/** What a successful bounded read hands back. */
export interface AgentAccessReadText {
  /** The exact text bytes read, decoded as fatal UTF-8. */
  text: string;
  /** Byte length of the text as read (≤ cap in the relaxed arm). */
  bytes: number;
  /**
   * True when the file holds more than the cap: only the relaxed arm (the
   * editor's own `fs:readFile` answer) says this. The strict arm throws
   * before it could return a partial read.
   */
  truncated: boolean;
}

/**
 * Read one regular file's text, bounded at every step. Answered words are
 * the caller's to map; this file throws the stamped `GmuxError` and answers
 * `changed: true` for an identity that moved mid-read, never silently.
 */
export async function readTextCapped(
  abs: string,
  strictness: AgentAccessReadStrictness,
  options?: AgentAccessReadOptions
): Promise<AgentAccessReadText> {
  let fd: number;
  try {
    fd = openSync(
      abs,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | constants.O_NONBLOCK
    );
  } catch (err) {
    throw mapOpenError(abs, err);
  }
  let stat: BigIntStats;
  try {
    stat = fstatSync(fd, { bigint: true });
  } catch (err) {
    closeSync(fd);
    throw mapErrno(err, 'FS_FAILED');
  }
  if (!stat.isFile()) {
    closeSync(fd);
    throw gmuxError('FS_FAILED', `That path is not a regular file.`);
  }
  // Strict pre-read refusal: reject before allocating when the size the
  // descriptor reports is already over the cap. The word matches the
  // editor's own truncation boundary; the caller maps it to its closed
  // refusal. The relaxed arm keeps the editor's truncation flag instead.
  if (strictness === 'strict' && Number(stat.size) > READ_CAP_BYTES) {
    closeSync(fd);
    throw gmuxError('FS_FAILED', `That file is too large for Tortie to open.`);
  }
  const identity = snapshotOf(stat);
  const fstatSize = Number(stat.size);
  const chunks: Buffer[] = [];
  let total = 0;
  // One byte past the budget and never more, whatever the file does while
  // this runs: the caller's `overCap` question answers itself.
  const ceiling = READ_CAP_BYTES + 1;
  let want = Math.min(Math.max(fstatSize, 1), ceiling);
  let firstChunk = true;
  try {
    for (;;) {
      const buf = Buffer.alloc(want);
      let got = 0;
      while (got < want) {
        const n = readSync(fd, buf, got, want - got, total + got);
        if (n === 0) break;
        got += n;
      }
      if (got > 0) {
        chunks.push(got === want ? buf : buf.subarray(0, got));
        total += got;
      }
      if (firstChunk) {
        firstChunk = false;
        // The gate's deterministic race: pause here so an outside process
        // can replace or rewrite the file between chunks.
        options?.afterFirstChunk?.();
      }
      if (got < want) break;
      if (total >= ceiling) break;
      want = Math.min(64 * 1024, ceiling - total);
    }
  } catch (err) {
    closeSync(fd);
    throw mapErrno(err, 'FS_FAILED');
  } finally {
    closeSync(fd);
  }
  const raw =
    chunks.length === 1 ? chunks[0]! : Buffer.concat(chunks, total);
  if (strictness === 'strict') {
    if (raw.length > READ_CAP_BYTES) {
      // The strict arm never truncates: a file that grew past the cap
      // while the bytes moved is the same refusal as the pre-read one.
      // The relaxed arm (the editor's own read) keeps its flag instead.
      throw gmuxError('FS_FAILED', `That file is too large for Tortie to open.`);
    }
  } else {
    // The relaxed arm IS the editor's old read, byte for byte: at most the
    // cap's bytes, the lossy decode below, and the fstat-sized flag.
    const capped = raw.length > READ_CAP_BYTES ? raw.subarray(0, READ_CAP_BYTES) : raw;
    const head = capped.subarray(
      0,
      Math.min(capped.length, AGENT_ACCESS_BINARY_SNIFF_BYTES)
    );
    if (head.includes(0)) {
      throw gmuxError(
        'FS_FAILED',
        `That file is binary — Tortie opens text files only.`
      );
    }
    return {
      text: capped.toString('utf8'),
      bytes: capped.length,
      truncated: fstatSize > READ_CAP_BYTES
    };
  }
  if (strictness === 'strict') {
    // Post-read identity: the path is statted again after the bytes moved
    // and must still be the same entry the open descriptor saw. An atomic
    // replace moves dev/ino; an in-place write moves size/mtime/ctime; a
    // swap for a link moves the entry itself.
    let now: BigIntStats;
    try {
      now = lstatSync(abs, { bigint: true });
    } catch {
      throw gmuxError(
        'FS_FAILED',
        `That file changed while Tortie was reading it.`
      );
    }
    if (!sameEntry(identity, snapshotOf(now))) {
      throw gmuxError('FS_FAILED', `That file changed while Tortie was reading it.`);
    }
  }
  const head = raw.subarray(
    0,
    Math.min(raw.length, AGENT_ACCESS_BINARY_SNIFF_BYTES)
  );
  if (head.includes(0)) {
    throw gmuxError(
      'FS_FAILED',
      `That file is binary — Tortie opens text files only.`
    );
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  } catch {
    throw gmuxError(
      'FS_FAILED',
      `That file is not UTF-8 text, and opening it would damage it.`
    );
  }
  return { text, bytes: raw.length, truncated: raw.length > READ_CAP_BYTES };
}

export interface AgentAccessEntryIdentity {
  dev: bigint;
  ino: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}

function snapshotOf(stat: BigIntStats): AgentAccessEntryIdentity {
  return {
    dev: stat.dev,
    ino: stat.ino,
    size: stat.size,
    mtimeNs: stat.mtimeNs,
    ctimeNs: stat.ctimeNs
  };
}

/** Same entry: one inode, unchanged size, unchanged mtime and ctime. */
export function agentAccessSameEntry(
  a: AgentAccessEntryIdentity,
  b: AgentAccessEntryIdentity
): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs
  );
}

function sameEntry(a: AgentAccessEntryIdentity, b: AgentAccessEntryIdentity): boolean {
  return agentAccessSameEntry(a, b);
}

function codeOf(err: unknown): string | undefined {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

function mapErrno(err: unknown, fallback: GmuxErrorCode): never {
  const code = codeOf(err);
  throw gmuxError(
    fallback,
    code === undefined
      ? `That file could not be read.`
      : `That file could not be read (${code}).`
  );
}

function mapOpenError(abs: string, err: unknown): never {
  const code = codeOf(err);
  if (code === 'ENOENT') {
    throw gmuxError('PROJECT_NOT_FOUND', `That file is no longer there.`);
  }
  if (code === 'ELOOP' || code === 'EMLINK' || code === 'EISDIR') {
    throw gmuxError('FS_FAILED', `That path is not a regular file.`);
  }
  void abs;
  return mapErrno(err, 'FS_FAILED');
}
