/**
 * One project's symbols, held columnar, queried by fuzzy subsequence.
 *
 * WHY COLUMNAR (research 19 §3.3, measured): every name lives in ONE string
 * blob with an `Int32Array` of offsets, so N symbols cost a handful of typed
 * arrays instead of N objects. At 100,000 symbols the blob is 3.6 MB and a
 * three-letter query answers in 4-8 ms; even a pathological 1,000,000-symbol
 * monorepo answers in under 100 ms. The research is explicit about the
 * conclusion that follows: **do not reach for a trie.** Plain JavaScript over
 * flat arrays is already fast enough, and it is the version a future reader
 * can still change.
 *
 * The rows (`Map<relPath, ExtractedSymbol[]>`) are the source of truth and the
 * columns are a derived cache, rebuilt lazily when a file changes. That is
 * also why SQLite persists ROWS and never the blob: rebuilding a million-row
 * table from rows is 245 ms, and a persisted blob would be a second format to
 * keep in step with the first.
 */

import type { SymbolHit, SymbolKind } from '@shared/symbols';
import type { ExtractedSymbol } from './extract';

/** Numeric codes so `kinds` can be a Uint8Array. Order is not meaningful. */
const KINDS: readonly SymbolKind[] = [
  'function',
  'method',
  'class',
  'interface',
  'struct',
  'type',
  'enum',
  'enum-member',
  'constant',
  'variable',
  'field',
  'module',
  'macro',
  'property'
];
const KIND_CODE = new Map<SymbolKind, number>(KINDS.map((k, i) => [k, i]));

interface Columns {
  /** Every name concatenated, LOWER-CASED — the matcher never allocates. */
  lower: string;
  /** Original-case names, same concatenation, same offsets. */
  blob: string;
  /**
   * 1 where the character at that blob index starts a word.
   *
   * Computed at BUILD time from the original-case blob, and that is the whole
   * point: `lower` has thrown the humps away, so `onFileOpen` and `onfileopen`
   * are indistinguishable by the time the matcher runs. Without this array,
   * typing "ofo" would highlight `o`,`F`,`o` at the wrong places and score a
   * camelCase hit no better than a random subsequence — which is most of what
   * makes a symbol picker feel accurate.
   */
  boundaries: Uint8Array;
  /** n + 1 entries: symbol i occupies [offsets[i], offsets[i+1]). */
  offsets: Int32Array;
  kinds: Uint8Array;
  lines: Int32Array;
  columns: Int32Array;
  endColumns: Int32Array;
  /** Index into `files`. */
  fileOf: Int32Array;
  /** Index into `containers`, or -1. */
  containerOf: Int32Array;
  files: string[];
  containers: string[];
  /** For `@` mode: the [start, end) range of each file's symbols. */
  rangeByFile: Map<string, [number, number]>;
}

const EMPTY: Columns = {
  lower: '',
  blob: '',
  boundaries: new Uint8Array(0),
  offsets: new Int32Array(1),
  kinds: new Uint8Array(0),
  lines: new Int32Array(0),
  columns: new Int32Array(0),
  endColumns: new Int32Array(0),
  fileOf: new Int32Array(0),
  containerOf: new Int32Array(0),
  files: [],
  containers: [],
  rangeByFile: new Map()
};

export class SymbolTable {
  private readonly rows = new Map<string, ExtractedSymbol[]>();
  private columns: Columns | null = EMPTY;

  /** Files with rows in the table (indexed, even if they had zero symbols). */
  get fileCount(): number {
    return this.rows.size;
  }

  get symbolCount(): number {
    let n = 0;
    for (const list of this.rows.values()) n += list.length;
    return n;
  }

  has(relPath: string): boolean {
    return this.rows.has(relPath);
  }

  /** Replace one file's symbols. An empty array still marks the file indexed. */
  setFile(relPath: string, symbols: ExtractedSymbol[]): void {
    this.rows.set(relPath, symbols);
    this.columns = null;
  }

  /** Forget a deleted file. */
  removeFile(relPath: string): void {
    if (this.rows.delete(relPath)) this.columns = null;
  }

  /** Keep only these paths (an enumeration says what still exists). */
  retainOnly(paths: Set<string>): number {
    let removed = 0;
    for (const relPath of [...this.rows.keys()]) {
      if (paths.has(relPath)) continue;
      this.rows.delete(relPath);
      removed += 1;
    }
    if (removed > 0) this.columns = null;
    return removed;
  }

  clear(): void {
    this.rows.clear();
    this.columns = EMPTY;
  }

  /**
   * Rank symbols against `query`.
   *
   * `relPath` switches to `@` mode: one file, sorted by POSITION rather than
   * score, because "what is in this file, in order" is the question ⌘⇧O
   * answers about the file you are looking at.
   */
  query(query: string, limit: number, relPath?: string): SymbolHit[] {
    const cols = this.build();
    if (cols.offsets.length <= 1) return [];

    const range = relPath !== undefined ? cols.rangeByFile.get(relPath) : undefined;
    if (relPath !== undefined && range === undefined) return [];
    const from = range?.[0] ?? 0;
    const to = range?.[1] ?? cols.kinds.length;

    const needle = query.toLowerCase();
    const scored: { i: number; score: number; positions: number[] }[] = [];

    if (needle.length === 0) {
      for (let i = from; i < to && scored.length < limit * 4; i++) {
        scored.push({ i, score: 0, positions: [] });
      }
    } else {
      for (let i = from; i < to; i++) {
        const start = cols.offsets[i] ?? 0;
        const end = cols.offsets[i + 1] ?? start;
        if (end - start < needle.length) continue;
        if (!subsequence(cols.lower, start, end, needle)) continue;
        const positions = matchPositions(cols, start, end, needle);
        scored.push({
          i,
          score: scoreOf(cols, start, end, needle, positions),
          positions
        });
      }
    }

    if (relPath !== undefined) {
      // `@` mode: document order, which is already the table's order.
      scored.sort((a, b) => a.i - b.i);
    } else {
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const la = (cols.offsets[a.i + 1] ?? 0) - (cols.offsets[a.i] ?? 0);
        const lb = (cols.offsets[b.i + 1] ?? 0) - (cols.offsets[b.i] ?? 0);
        if (la !== lb) return la - lb;
        return a.i - b.i;
      });
    }

    const hits: SymbolHit[] = [];
    for (const entry of scored.slice(0, limit)) {
      const i = entry.i;
      const start = cols.offsets[i] ?? 0;
      const end = cols.offsets[i + 1] ?? start;
      const containerIdx = cols.containerOf[i] ?? -1;
      hits.push({
        name: cols.blob.slice(start, end),
        kind: KINDS[cols.kinds[i] ?? 0] ?? 'variable',
        container: containerIdx >= 0 ? (cols.containers[containerIdx] ?? null) : null,
        relPath: cols.files[cols.fileOf[i] ?? 0] ?? '',
        line: cols.lines[i] ?? 1,
        column: cols.columns[i] ?? 0,
        endColumn: cols.endColumns[i] ?? 0,
        positions: entry.positions
      });
    }
    return hits;
  }

  /** Rebuild the columns from the rows. Lazy: only after a mutation. */
  private build(): Columns {
    if (this.columns !== null) return this.columns;

    const files = [...this.rows.keys()].sort();
    const containerIds = new Map<string, number>();
    const containers: string[] = [];
    let total = 0;
    for (const list of this.rows.values()) total += list.length;

    const offsets = new Int32Array(total + 1);
    const kinds = new Uint8Array(total);
    const lines = new Int32Array(total);
    const columnsArr = new Int32Array(total);
    const endColumns = new Int32Array(total);
    const fileOf = new Int32Array(total);
    const containerOf = new Int32Array(total).fill(-1);
    const rangeByFile = new Map<string, [number, number]>();
    const parts: string[] = [];

    let i = 0;
    let offset = 0;
    for (let f = 0; f < files.length; f++) {
      const relPath = files[f] ?? '';
      const list = this.rows.get(relPath) ?? [];
      const groupStart = i;
      for (const symbol of list) {
        offsets[i] = offset;
        parts.push(symbol.name);
        offset += symbol.name.length;
        kinds[i] = KIND_CODE.get(symbol.kind) ?? 0;
        lines[i] = symbol.line;
        columnsArr[i] = symbol.column;
        endColumns[i] = symbol.endColumn;
        fileOf[i] = f;
        if (symbol.container !== null) {
          let id = containerIds.get(symbol.container);
          if (id === undefined) {
            id = containers.length;
            containers.push(symbol.container);
            containerIds.set(symbol.container, id);
          }
          containerOf[i] = id;
        }
        i += 1;
      }
      rangeByFile.set(relPath, [groupStart, i]);
    }
    offsets[total] = offset;

    const blob = parts.join('');
    this.columns = {
      blob,
      lower: blob.toLowerCase(),
      boundaries: markBoundaries(blob, offsets, total),
      offsets,
      kinds,
      lines,
      columns: columnsArr,
      endColumns,
      fileOf,
      containerOf,
      files,
      containers,
      rangeByFile
    };
    return this.columns;
  }
}

// ---------------------------------------------------------------------------
// Matching — deliberately plain, deliberately allocation-free on the hot path.
// ---------------------------------------------------------------------------

/** Ordered-subsequence test over blob[start, end). No slicing, no allocation. */
function subsequence(
  lower: string,
  start: number,
  end: number,
  needle: string
): boolean {
  let q = 0;
  for (let p = start; p < end; p++) {
    if (lower.charCodeAt(p) === needle.charCodeAt(q)) {
      q += 1;
      if (q === needle.length) return true;
    }
  }
  return q === needle.length;
}

const CH_UNDERSCORE = 95;
const CH_HYPHEN = 45;
const CH_DOT = 46;
const CH_DOLLAR = 36;
const CH_SLASH = 47;
const CH_SPACE = 32;

/** Is this an ASCII upper-case letter? */
function isUpper(code: number): boolean {
  return code >= 65 && code <= 90;
}

/** Is this a lower-case letter or a digit (the left side of a camel hump)? */
function isLowerOrDigit(code: number): boolean {
  return (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
}

/**
 * Mark every word start in the concatenated ORIGINAL-case blob: the first
 * character of each name, anything after a separator, and both flavours of
 * camel hump (`onFile` and the `HTTPServer` → `Server` case).
 */
function markBoundaries(
  blob: string,
  offsets: Int32Array,
  count: number
): Uint8Array {
  const marks = new Uint8Array(blob.length);
  for (let i = 0; i < count; i++) {
    const start = offsets[i] ?? 0;
    const end = offsets[i + 1] ?? start;
    if (end > start) marks[start] = 1;
    for (let p = start + 1; p < end; p++) {
      const prev = blob.charCodeAt(p - 1);
      const cur = blob.charCodeAt(p);
      if (
        prev === CH_UNDERSCORE ||
        prev === CH_HYPHEN ||
        prev === CH_DOT ||
        prev === CH_DOLLAR ||
        prev === CH_SLASH ||
        prev === CH_SPACE
      ) {
        marks[p] = 1;
        continue;
      }
      if (isUpper(cur) && isLowerOrDigit(prev)) {
        marks[p] = 1;
        continue;
      }
      if (
        isUpper(prev) &&
        isUpper(cur) &&
        p + 1 < end &&
        isLowerOrDigit(blob.charCodeAt(p + 1))
      ) {
        marks[p] = 1;
      }
    }
  }
  return marks;
}

/**
 * Where each needle character landed, preferring word starts.
 *
 * Greedy-left is the cheap answer and it is wrong in the case people hit
 * constantly: `onFileOpen` matched against "ofo" should highlight the three
 * capitals, not the first three `o`-ish characters it can reach. So the greedy
 * pass runs, then each position is pulled RIGHT to a word start when doing so
 * does not collide with the following match. One extra linear pass, walking
 * backwards so each move is already legal; no backtracking.
 */
function matchPositions(
  cols: Columns,
  start: number,
  end: number,
  needle: string
): number[] {
  const out: number[] = [];
  let q = 0;
  for (let p = start; p < end && q < needle.length; p++) {
    if (cols.lower.charCodeAt(p) === needle.charCodeAt(q)) {
      out.push(p - start);
      q += 1;
    }
  }
  if (out.length < needle.length) return out;

  for (let k = out.length - 1; k >= 0; k--) {
    const limit = k + 1 < out.length ? (out[k + 1] ?? 0) - 1 : end - start - 1;
    const current = out[k] ?? 0;
    for (let p = limit; p > current; p--) {
      if (cols.lower.charCodeAt(start + p) !== needle.charCodeAt(k)) continue;
      if (cols.boundaries[start + p] !== 1) continue;
      out[k] = p;
      break;
    }
  }
  return out;
}

/**
 * Score a survivor. Weighted so the three things a person actually means come
 * first: an exact name, then a prefix, then a match that lands on word starts
 * in one run. Everything else is a tiebreak.
 */
function scoreOf(
  cols: Columns,
  start: number,
  end: number,
  needle: string,
  positions: number[]
): number {
  const len = end - start;
  let score = 0;

  if (len === needle.length) score += 1000;
  if ((positions[0] ?? -1) === 0) score += 400;

  let contiguous = 1;
  for (let k = 0; k < positions.length; k++) {
    const cur = positions[k] ?? 0;
    if (k > 0) {
      if (cur === (positions[k - 1] ?? 0) + 1) {
        contiguous += 1;
        score += 12 * Math.min(contiguous, 8);
      } else {
        contiguous = 1;
      }
    }
    if (cols.boundaries[start + cur] === 1) score += 22;
  }

  // Earlier and shorter both read as "more likely the one".
  score -= (positions[0] ?? 0) * 3;
  score -= Math.min(len, 60);
  return score;
}
