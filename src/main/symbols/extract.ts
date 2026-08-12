/**
 * Source text → symbols. The whole tree-sitter surface gmux uses, in one
 * place, with NO worker and NO electron in scope so the unit tests can drive
 * it directly — which matters, because the five queries in `queries.ts` are
 * hand-authored and their regression test is the reason a grammar bump breaks
 * CI instead of breaking the user's palette (research 19 §7.2).
 *
 * Two decisions worth knowing before editing:
 *
 * **Grammars load lazily, one per language actually seen.** A worker that
 * eagerly loaded all six would pay 4.8 MB of wasm compile to index a Go repo
 * that contains no TypeScript. Boot measured 39-94 ms per worker WITH the
 * grammar load included; per-language laziness keeps that at the low end.
 *
 * **`matches()`, not `captures()`.** A tags query's `@container` and `@name`
 * only mean anything TOGETHER — `(class_declaration name: (_) @container body:
 * (class_body (method_definition name: (_) @name) @definition.method))` is one
 * match per (class, method) pair. Flattening to captures would give a stream
 * of names with no idea which class each belonged to.
 */

import { readFileSync } from 'node:fs';
import { Language, Parser, Query } from 'web-tree-sitter';
import type { Node as TsNode, Tree } from 'web-tree-sitter';
import type { SymbolKind } from '@shared/symbols';
import type { GrammarId } from './languages';
import { grammarFor, MAX_INDEXED_FILE_BYTES } from './languages';
import {
  GO_QUERY,
  JS_QUERY,
  KIND_BY_CAPTURE,
  kindWins,
  PYTHON_QUERY,
  RUST_QUERY,
  TS_QUERY
} from './queries';

/** One definition, before it is given a `relPath`. */
export interface ExtractedSymbol {
  name: string;
  kind: SymbolKind;
  container: string | null;
  /** 1-based. */
  line: number;
  /** 0-based UTF-16 (tree-sitter's Point.column is UTF-16 in the JS binding). */
  column: number;
  endColumn: number;
}

/**
 * Query text per grammar. TS and TSX get the JavaScript base layered under the
 * TypeScript patterns as ONE query — same node names, one compile, one walk.
 */
const QUERY_TEXT: Readonly<Record<GrammarId, string>> = {
  javascript: JS_QUERY,
  typescript: `${JS_QUERY}\n${TS_QUERY}`,
  tsx: `${JS_QUERY}\n${TS_QUERY}`,
  go: GO_QUERY,
  python: PYTHON_QUERY,
  rust: RUST_QUERY
};

export interface ExtractorOptions {
  /** Absolute path of web-tree-sitter's OWN runtime wasm (never the grammars' copy). */
  runtimeWasm: string;
  /** Absolute path of one grammar's wasm. */
  grammarPath: (id: GrammarId) => string;
}

interface LoadedGrammar {
  language: Language;
  query: Query;
  parser: Parser;
}

export class SymbolExtractor {
  private readonly grammars = new Map<GrammarId, LoadedGrammar | null>();

  private constructor(private readonly options: ExtractorOptions) {}

  /**
   * Boot the wasm runtime. Call once per worker.
   *
   * `locateFile` is not optional: `@vscode/tree-sitter-wasm` ships its own
   * OLDER `tree-sitter.wasm` next to the grammars, and emscripten will happily
   * find that one and then fail with `ENOENT: web-tree-sitter.wasm`
   * (research 19 §7.3, hit during the research).
   */
  static async create(options: ExtractorOptions): Promise<SymbolExtractor> {
    await Parser.init({
      locateFile: (name: string) =>
        name.endsWith('.wasm') ? options.runtimeWasm : name
    });
    return new SymbolExtractor(options);
  }

  /** Load (once) the grammar + compiled query for a language. */
  private async grammar(id: GrammarId): Promise<LoadedGrammar | null> {
    const cached = this.grammars.get(id);
    if (cached !== undefined) return cached;
    let loaded: LoadedGrammar | null = null;
    try {
      const language = await Language.load(this.options.grammarPath(id));
      const parser = new Parser();
      parser.setLanguage(language);
      const text = QUERY_TEXT[id];
      loaded = { language, query: new Query(language, text), parser };
    } catch {
      // A missing or incompatible grammar makes that LANGUAGE unavailable, not
      // the index: a Go repo still indexes when the rust wasm is absent.
      loaded = null;
    }
    this.grammars.set(id, loaded);
    return loaded;
  }

  /** Symbols in one file's text. `[]` for an unsupported language. */
  async extract(relPath: string, source: string): Promise<ExtractedSymbol[]> {
    const id = grammarFor(relPath);
    if (id === null) return [];
    const g = await this.grammar(id);
    if (g === null) return [];

    let tree: Tree | null = null;
    try {
      tree = g.parser.parse(source);
      if (tree === null) return [];
      return collect(g.query, tree.rootNode);
    } finally {
      tree?.delete();
    }
  }

  /**
   * Read + extract one file. Returns null when the file cannot contribute —
   * unreadable, binary-ish, or over MAX_INDEXED_FILE_BYTES.
   */
  async extractFile(
    relPath: string,
    absPath: string
  ): Promise<{ symbols: ExtractedSymbol[]; mtimeMs: number; size: number } | null> {
    if (grammarFor(relPath) === null) return null;
    let buf: Buffer;
    let mtimeMs: number;
    let size: number;
    try {
      const { statSync } = await import('node:fs');
      const st = statSync(absPath);
      if (!st.isFile() || st.size > MAX_INDEXED_FILE_BYTES) return null;
      mtimeMs = st.mtimeMs;
      size = st.size;
      buf = readFileSync(absPath);
    } catch {
      return null;
    }
    // A NUL in the first 8 KB is the same binary heuristic git uses. Parsing a
    // binary file is not wrong so much as pointless, and it is slow.
    const probe = buf.subarray(0, 8192);
    if (probe.includes(0)) return null;
    const symbols = await this.extract(relPath, buf.toString('utf8'));
    return { symbols, mtimeMs, size };
  }

  /** Free every loaded grammar. Called when a worker is about to exit. */
  dispose(): void {
    for (const g of this.grammars.values()) {
      if (g === null) continue;
      try {
        g.query.delete();
        g.parser.delete();
      } catch {
        /* teardown is best-effort */
      }
    }
    this.grammars.clear();
  }
}

/**
 * Turn one query's matches into deduplicated symbols.
 *
 * DEDUPE, and why it is not optional: several patterns legitimately match the
 * same span. `export const useEditor = create(...)` is caught by the
 * arrow-function rule AND by the top-level-const rule; without a dedupe the
 * palette shows `useEditor` twice, once as a function and once as a constant.
 * One row per (line, column, name) survives, and `kindWins` decides which —
 * "function" tells the reader more than "constant".
 */
function collect(query: Query, root: TsNode): ExtractedSymbol[] {
  const out = new Map<string, ExtractedSymbol>();

  for (const match of query.matches(root)) {
    let container: string | null = null;
    const defs: { kind: SymbolKind; node: TsNode }[] = [];
    const names: TsNode[] = [];

    for (const capture of match.captures) {
      if (capture.name === 'container') {
        container ??= capture.node.text;
        continue;
      }
      if (capture.name === 'name') {
        names.push(capture.node);
        continue;
      }
      const kind = KIND_BY_CAPTURE[capture.name];
      if (kind !== undefined) defs.push({ kind, node: capture.node });
    }
    if (names.length === 0 || defs.length === 0) continue;

    for (const nameNode of names) {
      const kind = kindFor(nameNode, defs);
      if (kind === null) continue;
      const name = nameNode.text;
      if (name.length === 0 || name.length > 255) continue;
      const start = nameNode.startPosition;
      const key = `${start.row}:${start.column}:${name}`;
      const existing = out.get(key);
      if (existing !== undefined && !kindWins(kind, existing.kind)) {
        // Keep the better kind but never lose a container we did have.
        if (existing.container === null && container !== null) {
          existing.container = container;
        }
        continue;
      }
      out.set(key, {
        name,
        kind,
        container,
        line: start.row + 1,
        column: start.column,
        endColumn: nameNode.endPosition.column
      });
    }
  }

  return [...out.values()];
}

/**
 * Which `@definition.*` this `@name` belongs to: the SMALLEST definition node
 * that contains it. A Go struct-field pattern captures the whole
 * `type_declaration` as `@container`'s parent and each `field_declaration` as
 * `@definition.field`; picking the smallest container is what keeps a field
 * from being reported at the struct's own line.
 */
function kindFor(
  name: TsNode,
  defs: { kind: SymbolKind; node: TsNode }[]
): SymbolKind | null {
  let best: { kind: SymbolKind; span: number } | null = null;
  for (const def of defs) {
    if (def.node.startIndex > name.startIndex) continue;
    if (def.node.endIndex < name.endIndex) continue;
    const span = def.node.endIndex - def.node.startIndex;
    if (best === null || span < best.span) best = { kind: def.kind, span };
  }
  if (best !== null) return best.kind;
  return defs[0]?.kind ?? null;
}
