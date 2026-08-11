/**
 * ripgrep `--json` NDJSON → rows the renderer can paint without touching them
 * again. Pure functions over strings (plus one small stateful line splitter),
 * because every quirk in this file is a case manual testing will not find.
 *
 * THE TWO TRAPS THE RESEARCH PAID FOR (docs/research/19-search.md §2.7):
 *
 * 1. **`--max-columns` is silently ignored by the JSON printer.** Measured on
 *    a node_modules search: the longest output line is 6,952,086 bytes with
 *    the flag, without it, and with --max-columns-preview. Match counts are
 *    identical, so nothing is being dropped — the printer just does not honour
 *    it. `clampLine` therefore imposes gmux's own cap, windowed around the
 *    first match, offsets shifted by the same amount. Without it one webpack
 *    bundle allocates a 7 MB string per match line and the Search view dies.
 *
 * 2. **`submatches[].start/end` are BYTE offsets** into `lines.text`, not
 *    UTF-16 indices. `'café'` at bytes 6..11 sliced naively gives `'café '` —
 *    one character wrong, which in a search result means the highlight sits
 *    off the match. The obvious per-submatch `Buffer.subarray().toString()`
 *    fix is correct and 41x too slow (184.8 ms vs 4.5 ms over one real result
 *    set), because the non-ASCII lines in a real corpus are also the LONG
 *    ones and get re-decoded twice per submatch. `toUtf16` walks each line at
 *    most once and short-circuits pure ASCII.
 *
 * Both conversions happen in MAIN, once, before the row crosses IPC.
 */

import { StringDecoder } from 'node:string_decoder';
import type { SearchMatch } from '@shared/ipc';

// ---------------------------------------------------------------------------
// The wire shapes, as ripgrep actually emits them
// ---------------------------------------------------------------------------

/** Any ripgrep text field: UTF-8 as `text`, otherwise base64 as `bytes`. */
export interface RgText {
  text?: string;
  bytes?: string;
}

export interface RgSubmatch {
  match: RgText;
  /** Present only with `--replace`: what the text would become. */
  replacement?: RgText;
  /** BYTE offsets into the line — see the header. */
  start: number;
  end: number;
}

export interface RgMatchData {
  path: RgText;
  lines: RgText;
  line_number: number | null;
  /** Byte offset of the line start in the file. The replace path needs it. */
  absolute_offset: number;
  submatches: RgSubmatch[];
}

export interface RgBeginData {
  path: RgText;
}

export interface RgEndData {
  path: RgText;
  /** Non-null ⇒ ripgrep stopped early: the file is binary. */
  binary_offset: number | null;
}

export type RgEvent =
  | { type: 'begin'; data: RgBeginData }
  | { type: 'match'; data: RgMatchData }
  | { type: 'context'; data: RgMatchData }
  | { type: 'end'; data: RgEndData }
  | { type: 'summary'; data: unknown };

/**
 * Parse one NDJSON line. Returns null for anything unrecognised — a future
 * ripgrep event type must not take the search down with it.
 */
export function parseRgLine(line: string): RgEvent | null {
  if (line.length === 0) return null;
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const event = value as { type?: unknown; data?: unknown };
  if (typeof event.type !== 'string' || typeof event.data !== 'object') {
    return null;
  }
  switch (event.type) {
    case 'begin':
    case 'match':
    case 'context':
    case 'end':
    case 'summary':
      return event as RgEvent;
    default:
      return null;
  }
}

/** `{text}` or `{bytes: base64}` → a string. ripgrep emits either. */
export function bytesOrText(value: RgText | undefined): string {
  if (value === undefined) return '';
  if (typeof value.text === 'string') return value.text;
  if (typeof value.bytes === 'string') {
    return Buffer.from(value.bytes, 'base64').toString('utf8');
  }
  return '';
}

/** './src/foo.ts' → 'src/foo.ts'. We always search '.' with cwd = the root. */
export function relPathOf(path: RgText | undefined): string {
  const raw = bytesOrText(path);
  return raw.startsWith('./') ? raw.slice(2) : raw;
}

// ---------------------------------------------------------------------------
// Offsets
// ---------------------------------------------------------------------------

/**
 * ripgrep byte offsets → UTF-16 offsets, in one pass, with an ASCII
 * short-circuit. Verbatim from the research (D3 §4.4) — byte-identical to the
 * naive converter over 9,705 real submatches, 41x faster. Do not "optimise"
 * this into a per-submatch slice.
 */
export function toUtf16(
  text: string,
  pairs: [number, number][]
): [number, number][] {
  if (pairs.length === 0) return pairs;
  if (Buffer.byteLength(text, 'utf8') === text.length) return pairs; // ASCII
  const wanted = pairs.flat().sort((a, b) => a - b);
  const map = new Map<number, number>();
  let b = 0;
  let k = 0;
  for (let i = 0; i < text.length && k < wanted.length; ) {
    while (k < wanted.length && wanted[k] === b) map.set(wanted[k++]!, i);
    const cp = text.codePointAt(i)!;
    b += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    i += cp >= 0x10000 ? 2 : 1;
  }
  while (k < wanted.length) map.set(wanted[k++]!, text.length);
  return pairs.map(([s, e]) => [map.get(s) ?? s, map.get(e) ?? e]);
}

/** Keep every range inside [0, len] and drop the empty/backwards ones. */
function clampRanges(
  ranges: [number, number][],
  len: number
): [number, number][] {
  const out: [number, number][] = [];
  for (const [s, e] of ranges) {
    const start = Math.max(0, Math.min(s, len));
    const end = Math.max(start, Math.min(e, len));
    out.push([start, end]);
  }
  return out;
}

export interface ShiftedLine {
  text: string;
  ranges: [number, number][];
  /**
   * The TOTAL left shift, in UTF-16 units: how many units of the ORIGINAL
   * line precede `text[0]`. `ranges` index into `text`, so `range + trimmed`
   * is the column in the file — that sum is the only thing the editor can
   * navigate by, and it must be complete.
   *
   * Two shifts compose here, which is exactly what made this off by
   * thousands of columns once: the stripped indentation AND, when the line
   * is `truncated`, the window's own left edge (less the one-character
   * ellipsis head that stands in for everything before it).
   */
  trimmed: number;
  /** The line was windowed: `text` is a fragment with ellipses. */
  truncated: boolean;
}

/**
 * Trim the leading indentation (and shift the highlight offsets by exactly as
 * much — the bug this function exists to prevent), then window the line to
 * `maxChars` around the first match.
 *
 * Order matters: trimming first means a 4,000-character line of which 3,000
 * is indentation is not "truncated" at all.
 *
 * BOTH shifts have to leave through `trimmed`, not just the indentation. A
 * windowed line is a fragment starting thousands of columns into the file;
 * report only the indentation and the editor reveals — and SELECTS — a span
 * that far to the left, landing on unrelated text on the right line.
 */
export function shapeLine(
  raw: string,
  ranges: [number, number][],
  maxChars: number
): ShiftedLine {
  // Strip the trailing newline ripgrep includes; --crlf can leave the \r.
  let text = raw;
  if (text.endsWith('\n')) text = text.slice(0, -1);
  if (text.endsWith('\r')) text = text.slice(0, -1);

  let shifted = clampRanges(ranges, text.length);

  const trimmed = text.length - text.trimStart().length;
  if (trimmed > 0) {
    text = text.slice(trimmed);
    shifted = clampRanges(
      shifted.map(([s, e]) => [s - trimmed, e - trimmed]),
      text.length
    );
  }

  if (text.length <= maxChars) {
    return { text, ranges: shifted, trimmed, truncated: false };
  }

  // Window around the first match, keeping a little context in front of it.
  const first = shifted[0]?.[0] ?? 0;
  const lead = Math.min(80, Math.floor(maxChars / 4));
  const start = Math.max(0, Math.min(first - lead, text.length - maxChars));
  const end = start + maxChars;
  const head = start > 0 ? '…' : '';
  const tail = end < text.length ? '…' : '';
  const windowed = `${head}${text.slice(start, end)}${tail}`;
  const shift = head.length - start;
  const lo = head.length;
  const hi = windowed.length - tail.length;

  const kept: [number, number][] = [];
  for (const [s, e] of shifted) {
    const ns = s + shift;
    const ne = e + shift;
    if (ne <= lo || ns >= hi) continue; // entirely outside the window
    kept.push([Math.max(lo, ns), Math.min(hi, ne)]);
  }

  // `shift` maps a trimmed-text offset into the window; subtracting it maps
  // the window back out. Adding that to the indentation gives the ONE number
  // the consumer needs: original column = windowedOffset + trimmed.
  return {
    text: windowed,
    ranges: kept,
    trimmed: trimmed - shift,
    truncated: true
  };
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/**
 * One ripgrep `match` event → one renderable row.
 *
 * ZERO-SUBMATCH LINES ARE REAL: certain regexes make ripgrep report a matching
 * line with an empty `submatches` array (an upstream quirk VS Code works
 * around the same way). A row with no highlight reads as a bug, so synthesise
 * a one-character span rather than shipping an unexplained plain line.
 */
export function buildMatch(
  data: RgMatchData,
  maxLineChars: number
): SearchMatch | null {
  const lineNumber = data.line_number;
  if (typeof lineNumber !== 'number' || lineNumber < 1) return null;

  const rawText = bytesOrText(data.lines);
  const submatches = Array.isArray(data.submatches) ? data.submatches : [];

  const bytePairs: [number, number][] = submatches
    .filter(
      (sm) => typeof sm?.start === 'number' && typeof sm?.end === 'number'
    )
    .map((sm) => [sm.start, sm.end]);

  const pairs =
    bytePairs.length > 0
      ? toUtf16(rawText, bytePairs)
      : ([[0, Math.min(1, rawText.trimEnd().length)]] as [number, number][]);

  const shaped = shapeLine(rawText, pairs, maxLineChars);

  const match: SearchMatch = {
    line: lineNumber,
    text: shaped.text,
    trimmed: shaped.trimmed,
    ranges: shaped.ranges,
    byteOffset:
      typeof data.absolute_offset === 'number' ? data.absolute_offset : 0
  };
  if (shaped.truncated) match.truncated = true;

  // --replace preview: ripgrep hands us the replacement per submatch in the
  // same pass, which is the entire reason replace-in-files is affordable.
  if (bytePairs.length > 0 && submatches.some((sm) => sm.replacement)) {
    match.replacements = submatches.map((sm) => bytesOrText(sm.replacement));
  }

  return match;
}

// ---------------------------------------------------------------------------
// NDJSON framing
// ---------------------------------------------------------------------------

/**
 * Split a byte stream into NDJSON lines without ever concatenating the whole
 * stream. `StringDecoder` is what keeps a multi-byte character split across
 * two 64 KB pipe chunks from becoming two replacement characters — which
 * would corrupt exactly the non-ASCII lines the offset converter exists for.
 */
export class LineSplitter {
  private readonly decoder = new StringDecoder('utf8');
  private parts: string[] = [];

  push(chunk: Buffer, onLine: (line: string) => void): void {
    const s = this.decoder.write(chunk);
    let start = 0;
    for (;;) {
      const nl = s.indexOf('\n', start);
      if (nl === -1) break;
      const piece = s.slice(start, nl);
      if (this.parts.length > 0) {
        this.parts.push(piece);
        onLine(this.parts.join(''));
        this.parts = [];
      } else {
        onLine(piece);
      }
      start = nl + 1;
    }
    if (start < s.length) this.parts.push(s.slice(start));
  }

  /** Emit whatever is left when the stream closes without a final newline. */
  flush(onLine: (line: string) => void): void {
    const tail = this.parts.join('') + this.decoder.end();
    this.parts = [];
    if (tail.length > 0) onLine(tail);
  }
}
