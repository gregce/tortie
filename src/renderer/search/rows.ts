/**
 * Result tree → a flat list of fixed-height rows.
 *
 * Pure, and separated from the component for one reason: **virtualization is
 * mandatory** (research 19 §4.2 — 10,000 match rows will be routine), and a
 * windowed list is only correct if "which row is at index N" is a function
 * rather than a rendering side effect. Everything the view does — scroll to a
 * row, move the selection, decide what is on screen — is index arithmetic over
 * the array this module returns.
 *
 * Every row is the same height so the windowing is `Math.floor(scrollTop / H)`
 * with no measurement pass. That is also why a context line is its own row
 * type rather than extra content inside a match row.
 */

import type { SearchFileResult, SearchMatch } from '@shared/ipc';

/** One line of fetched context, above or below a match. */
export interface ContextLine {
  line: number;
  text: string;
}

export type SearchRow =
  | { kind: 'file'; index: number; relPath: string; file: SearchFileResult }
  | {
      kind: 'match';
      index: number;
      relPath: string;
      match: SearchMatch;
      /** Context is showing for this match. */
      expanded: boolean;
      /** Context was asked for but has not arrived. */
      loading: boolean;
    }
  | {
      kind: 'context';
      index: number;
      relPath: string;
      /** The match this context belongs to, so a click still opens sensibly. */
      anchorLine: number;
      context: ContextLine;
    }
  | {
      kind: 'clipped';
      index: number;
      relPath: string;
      /** Matches found beyond maxPerFile. */
      hidden: number;
    };

/** Every row is this tall. Denser than the tree's 24 px: a match is one line of code. */
export const ROW_HEIGHT = 22;

/** The identity a selection survives a re-render by. */
export function rowKey(row: SearchRow): string {
  switch (row.kind) {
    case 'file':
      return `f:${row.relPath}`;
    case 'match':
      return `m:${row.relPath}:${row.match.line}`;
    case 'context':
      return `c:${row.relPath}:${row.anchorLine}:${row.context.line}`;
    case 'clipped':
      return `x:${row.relPath}`;
  }
}

export interface FlattenInput {
  files: SearchFileResult[];
  /** Groups the user collapsed. Everything else is open, VS Code-style. */
  collapsed: ReadonlySet<string>;
  /** Match rows showing context, keyed `relPath:line`. */
  expanded: ReadonlySet<string>;
  /** Fetched context, keyed `relPath:line`. */
  context: ReadonlyMap<string, ContextLine[]>;
}

/** `relPath:line` — the key both `expanded` and `context` are addressed by. */
export function matchKey(relPath: string, line: number): string {
  return `${relPath}:${line}`;
}

/** Flatten the grouped results into the exact rows the view will paint. */
export function flattenRows(input: FlattenInput): SearchRow[] {
  const rows: SearchRow[] = [];
  for (const file of input.files) {
    rows.push({
      kind: 'file',
      index: rows.length,
      relPath: file.relPath,
      file
    });
    if (input.collapsed.has(file.relPath)) continue;

    for (const match of file.matches) {
      const key = matchKey(file.relPath, match.line);
      const isExpanded = input.expanded.has(key);
      const lines = input.context.get(key);

      // Context is split around the match rather than piled under it. The
      // engine returns both sides in one list; rendering them all below the
      // hit put line 178 UNDER line 180, which reads as a bug in the search
      // rather than as context. Code has an order and the rows must keep it.
      const before = lines?.filter((l) => l.line < match.line) ?? [];
      const after = lines?.filter((l) => l.line > match.line) ?? [];

      if (isExpanded) {
        for (const context of before) {
          rows.push({
            kind: 'context',
            index: rows.length,
            relPath: file.relPath,
            anchorLine: match.line,
            context
          });
        }
      }
      rows.push({
        kind: 'match',
        index: rows.length,
        relPath: file.relPath,
        match,
        expanded: isExpanded,
        loading: isExpanded && lines === undefined
      });
      if (!isExpanded || lines === undefined) continue;
      for (const context of after) {
        rows.push({
          kind: 'context',
          index: rows.length,
          relPath: file.relPath,
          anchorLine: match.line,
          context
        });
      }
    }

    if (file.clipped && file.matchCount > file.matches.length) {
      rows.push({
        kind: 'clipped',
        index: rows.length,
        relPath: file.relPath,
        hidden: file.matchCount - file.matches.length
      });
    }
  }
  return rows;
}

/**
 * Merge one streamed frame into the accumulated result list.
 *
 * Frames are INCREMENTAL and may repeat a file (ripgrep reports a file's
 * matches as it finds them, and a big file can straddle two flushes), so this
 * appends to an existing group rather than replacing it — replacing would make
 * a large file's earlier matches flicker away mid-search.
 *
 * The accumulator is rebuilt into a NEW array so React sees a changed
 * reference exactly once per frame, not once per file.
 */
export function mergeFrame(
  current: SearchFileResult[],
  incoming: SearchFileResult[]
): SearchFileResult[] {
  if (incoming.length === 0) return current;
  const byPath = new Map<string, number>();
  for (let i = 0; i < current.length; i++) {
    const relPath = current[i]?.relPath;
    if (relPath !== undefined) byPath.set(relPath, i);
  }
  const next = [...current];
  for (const file of incoming) {
    const at = byPath.get(file.relPath);
    if (at === undefined) {
      byPath.set(file.relPath, next.length);
      next.push(file);
      continue;
    }
    const existing = next[at];
    if (existing === undefined) continue;
    next[at] = {
      ...existing,
      matchCount: file.matchCount,
      clipped: existing.clipped || file.clipped,
      ...(file.binary === true ? { binary: true } : {}),
      matches: dedupeByLine(existing.matches, file.matches)
    };
  }
  return next;
}

/**
 * Append new matches, keeping line order and dropping repeats.
 *
 * A repeat is not hypothetical: a retry, an overlapping flush, or a "Show
 * more" re-run with a higher cap all deliver lines the view already has, and a
 * duplicated line in a results list looks exactly like a bug in the search.
 */
function dedupeByLine(
  existing: SearchMatch[],
  incoming: SearchMatch[]
): SearchMatch[] {
  if (existing.length === 0) return incoming;
  const seen = new Set(existing.map((m) => m.line));
  const merged = [...existing];
  for (const match of incoming) {
    if (seen.has(match.line)) continue;
    seen.add(match.line);
    merged.push(match);
  }
  merged.sort((a, b) => a.line - b.line);
  return merged;
}

/**
 * Split a match line into plain and highlighted pieces.
 *
 * The ranges arrive as UTF-16 offsets already converted and already shifted
 * for the trimmed indentation (main does both before the row crosses IPC —
 * research 19 §2.7), so this is a straight walk. It defends anyway: an
 * out-of-order or out-of-range span from a future engine change must degrade
 * to "no highlight", never to a scrambled line.
 */
export function splitHighlights(
  text: string,
  ranges: readonly [number, number][]
): { text: string; hit: boolean }[] {
  if (ranges.length === 0) return [{ text, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const [rawStart, rawEnd] of ranges) {
    const start = Math.max(at, Math.min(rawStart, text.length));
    const end = Math.max(start, Math.min(rawEnd, text.length));
    if (end <= start) continue;
    if (start > at) out.push({ text: text.slice(at, start), hit: false });
    out.push({ text: text.slice(start, end), hit: true });
    at = end;
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out.length > 0 ? out : [{ text, hit: false }];
}

/** `src/renderer/editor/store.ts` → `{ name: 'store.ts', dir: 'src/renderer/editor' }`. */
export function splitPath(relPath: string): { name: string; dir: string } {
  const slash = relPath.lastIndexOf('/');
  if (slash === -1) return { name: relPath, dir: '' };
  return { name: relPath.slice(slash + 1), dir: relPath.slice(0, slash) };
}
