/**
 * Streaming JSONL scanner that decides from raw bytes BEFORE JSON.parse.
 * Ported from docs/research/assets/63-keep-map/lib/lines.js with two fixes.
 *
 * The point of the skip mode is that a rejected line is never materialised.
 * The largest single line in the operator's codex store is 18,568,273 bytes.
 * A reader that buffers a line before deciding needs 18 MB of headroom for a
 * record it is going to throw away. This one reads the first `headBytes` of
 * each line, decides, and discards the rest as it streams.
 *
 * Fix one, defects 1 and 3. claude cli 2.1.178 sorts its record keys and
 * codex cli 0.139.0 writes `payload` first, so the marker the head test
 * looks for lands thousands of bytes into the line and the old fixed head
 * silently lost 91.1% of one file's kept bytes. `detectWideHead` samples the
 * first 64 KB and reports whether any line holds a rule's marker beyond the
 * head window. The caller then widens the head to 4 MiB for that file and
 * reports `prefilter: 'wide'`. A rejected line is still never held past the
 * head.
 *
 * Fix two. `decideHead` returns EVERY rule whose head matches, and the line
 * is kept when any of them passes the whole line stage. The reference
 * returned only the first match, which is why a claude assistant record
 * holding only a tool_use part could never reach the path index.
 */

import * as fs from 'node:fs';
import type { Prefilter, PrefilterRule } from './map-types';

/** The widened head for a sorted key vintage, 4 MiB. */
export const WIDE_HEAD_BYTES = 4 * 1024 * 1024;

/** How much of the file the vintage detection samples. */
const DETECT_SAMPLE_BYTES = 64 * 1024;

interface CompiledRule {
  head: Buffer;
  rejectHead: Buffer[];
  requireAnywhere: Buffer[];
  rejectAnywhere: Buffer[];
}

export interface CompiledPrefilter {
  headBytes: number;
  rules: CompiledRule[];
}

export function compileHead(
  prefilter: Prefilter | null | undefined,
  extraRules?: PrefilterRule[],
  headBytesOverride?: number
): CompiledPrefilter | null {
  if (!prefilter) return null;
  const headBytes = headBytesOverride ?? prefilter.headBytes ?? 512;
  const all = [...(prefilter.rules ?? []), ...(extraRules ?? [])];
  const rules: CompiledRule[] = all.map((r) => ({
    head: Buffer.from(r.head, 'utf8'),
    rejectHead: (r.rejectHead ?? []).map((s) => Buffer.from(s, 'utf8')),
    requireAnywhere: (r.requireAnywhere ?? []).map((s) => Buffer.from(s, 'utf8')),
    rejectAnywhere: (r.rejectAnywhere ?? []).map((s) => Buffer.from(s, 'utf8'))
  }));
  return { headBytes, rules };
}

/**
 * Decide from the head alone. Returns every rule whose head marker is
 * present and whose rejectHead markers are absent. An empty list means the
 * line is skipped.
 */
export function decideHead(hf: CompiledPrefilter, head: Buffer): CompiledRule[] {
  const out: CompiledRule[] = [];
  for (const r of hf.rules) {
    if (head.indexOf(r.head) === -1) continue;
    let ok = true;
    for (const b of r.rejectHead) {
      if (head.indexOf(b) !== -1) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(r);
  }
  return out;
}

/** Second stage over the whole line, still raw bytes, still before parse. */
export function decideWhole(rule: CompiledRule, line: Buffer): boolean {
  for (const b of rule.requireAnywhere) if (line.indexOf(b) === -1) return false;
  for (const b of rule.rejectAnywhere) if (line.indexOf(b) !== -1) return false;
  return true;
}

/**
 * Defects 1 and 3. Sample the first 64 KB. When any complete line holds a
 * rule's head marker at a position the head window would truncate, the
 * vintage sorts its keys and the caller must widen the head.
 */
export function detectWideHead(file: string, prefilter: Prefilter, extraRules?: PrefilterRule[]): boolean {
  const headBytes = prefilter.headBytes ?? 512;
  const all = [...(prefilter.rules ?? []), ...(extraRules ?? [])];
  const heads = all.map((r) => Buffer.from(r.head, 'utf8'));
  const fd = fs.openSync(file, 'r');
  let sample: Buffer;
  try {
    const buf = Buffer.allocUnsafe(DETECT_SAMPLE_BYTES);
    const n = fs.readSync(fd, buf, 0, DETECT_SAMPLE_BYTES, 0);
    sample = buf.subarray(0, Math.max(0, n));
  } finally {
    fs.closeSync(fd);
  }
  // Only complete lines are judged, so a marker cut by the sample edge does
  // not read as a late marker.
  const lastNl = sample.lastIndexOf(10);
  if (lastNl === -1) return false;
  let start = 0;
  while (start <= lastNl) {
    const nl = sample.indexOf(10, start);
    const end = nl === -1 ? lastNl : nl;
    const line = sample.subarray(start, end);
    for (const head of heads) {
      const i = line.indexOf(head);
      if (i !== -1 && i + head.length > headBytes) return true;
    }
    start = end + 1;
  }
  return false;
}

export interface ScanAccounting {
  bytesRead: number;
  bytesParsed: number;
  lines: number;
  linesParsed: number;
  linesSkippedOnHead: number;
  linesSkippedOnWhole: number;
  lastCompleteOffset: number;
  peakLineBuffer: number;
  size: number;
  mtimeNs: string;
}

export interface ScanOpts {
  chunkSize?: number;
  start?: number;
}

/**
 * Stream the file, calling onLine(lineBuffer, byteOffsetOfLineStart) for
 * every line the prefilter admits. Returns byte accounting so the saving is
 * measured rather than asserted. A trailing line with no newline is NOT
 * consumed, so a record the agent is still writing is never parsed.
 */
export function scanFile(
  path: string,
  prefilter: CompiledPrefilter | null,
  onLine: (line: Buffer, offset: number) => void,
  opts: ScanOpts = {}
): ScanAccounting {
  const hf = prefilter;
  const chunkSize = opts.chunkSize ?? 1 << 20;
  const start = opts.start ?? 0;
  const fd = fs.openSync(path, 'r');
  const chunk = Buffer.allocUnsafe(chunkSize);

  const acct: ScanAccounting = {
    bytesRead: 0,
    bytesParsed: 0,
    lines: 0,
    linesParsed: 0,
    linesSkippedOnHead: 0,
    linesSkippedOnWhole: 0,
    lastCompleteOffset: start,
    peakLineBuffer: 0,
    size: 0,
    mtimeNs: ''
  };

  let pos = start;
  let lineStart = start;
  let held: Buffer[] = [];
  let heldLen = 0;
  let headLen = 0;
  const headBuf = hf ? Buffer.allocUnsafe(hf.headBytes) : null;
  // undefined = undecided, empty array = skipping, non empty = candidates.
  let candidates: CompiledRule[] | undefined;

  const finishLine = (): void => {
    acct.lines++;
    if (candidates === undefined && hf && headBuf) {
      candidates = decideHead(hf, headBuf.subarray(0, headLen));
    }
    const cands = hf ? (candidates ?? []) : null;
    if (cands !== null && cands.length === 0) {
      acct.linesSkippedOnHead++;
    } else {
      const line = held.length === 1 ? (held[0] as Buffer) : Buffer.concat(held, heldLen);
      if (line.length > acct.peakLineBuffer) acct.peakLineBuffer = line.length;
      const pass = cands === null || cands.some((r) => decideWhole(r, line));
      if (pass) {
        acct.linesParsed++;
        acct.bytesParsed += line.length;
        onLine(line, lineStart);
      } else {
        acct.linesSkippedOnWhole++;
      }
    }
    held = [];
    heldLen = 0;
    headLen = 0;
    candidates = undefined;
  };

  try {
    const stat = fs.fstatSync(fd, { bigint: true });
    acct.size = Number(stat.size);
    acct.mtimeNs = String(stat.mtimeNs);
    for (;;) {
      const n = fs.readSync(fd, chunk, 0, chunkSize, pos);
      if (n <= 0) break;
      acct.bytesRead += n;
      let i = 0;
      while (i < n) {
        const nl = chunk.indexOf(10, i);
        const end = nl === -1 ? n : nl;
        const seg = chunk.subarray(i, end);
        const skipping = candidates !== undefined && candidates.length === 0;
        if (!skipping) {
          if (candidates === undefined && hf && headBuf && headLen < hf.headBytes) {
            const want = Math.min(hf.headBytes - headLen, seg.length);
            seg.copy(headBuf, headLen, 0, want);
            headLen += want;
            if (headLen >= hf.headBytes) {
              candidates = decideHead(hf, headBuf);
              if (candidates.length === 0) {
                held = [];
                heldLen = 0;
              }
            }
          }
          if (candidates === undefined || candidates.length > 0) {
            const c = Buffer.from(seg);
            held.push(c);
            heldLen += c.length;
          }
        }
        if (nl === -1) {
          i = n;
          break;
        }
        finishLine();
        lineStart = pos + nl + 1;
        acct.lastCompleteOffset = lineStart;
        i = nl + 1;
      }
      pos += n;
    }
  } finally {
    fs.closeSync(fd);
  }

  return acct;
}
