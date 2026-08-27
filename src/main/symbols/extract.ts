/**
 * Source text → symbols. The whole tree-sitter surface gmux uses, in one
 * place, with NO worker and NO electron in scope so the unit tests can drive
 * it directly — which matters, because the six queries in `queries.ts` are
 * hand-authored and their regression test is the reason a grammar bump breaks
 * CI instead of breaking the user's palette (research 19 §7.2).
 *
 * Two decisions worth knowing before editing:
 *
 * **Grammars load lazily, one per language actually seen.** A worker that
 * eagerly loaded all seven would pay 6.8 MB of wasm compile to index a Go repo
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
  IMPORT_BY_CAPTURE,
  JS_QUERY,
  IMPORT_TRUNCATION_MARKER,
  KIND_BY_CAPTURE,
  kindWins,
  PYTHON_QUERY,
  RUBY_QUERY,
  RUST_QUERY,
  TS_QUERY,
  type ImportForm
} from './queries';

/**
 * One import, before it is resolved (Phase 63).
 *
 * The specifier is exactly the text the author wrote, with the quotes already
 * off. Nothing here has been resolved, classified or judged: resolution is
 * src/main/arch/resolver's job and it happens in main, where the manifests are.
 *
 * A SPECIFIER NEVER REACHES AN ARGV, here or anywhere downstream. It is matched
 * in process against a file list, and that is the whole argv defense for this
 * half of the fact base.
 */
export interface ExtractedImport {
  /** The specifier as written, quotes stripped. */
  specifier: string;
  /** 1-based line of the specifier. */
  line: number;
  /** How it was written. Provenance, never a verdict. */
  form: ImportForm;
}

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
/**
 * How long an import specifier may be before it is recorded TRUNCATED.
 *
 * IT IS A TRUNCATION AND NEVER A DROP, and Phase 157's verifier is why. The
 * first build of this cap dropped anything longer than 512 characters and said
 * nothing, and that was harmless only while Rust imports were `unverifiable`.
 * The Rust query captures the WHOLE `use` argument, braces and all, so a real
 * `use super::{ ...sixty names... }` is over a thousand characters. Nine of
 * herdr's 1,889 `use` statements and 27 of deadreckon's 2,762 were being
 * dropped, and a dropped import is neither a crossing nor an unresolved, so
 * `src/main/arch/checkers/imports.ts` could not know it existed and rendered a
 * `must-not` promise that IS violated in the source as CONVERGENT. Green. That
 * is the single outcome the conservative verdict rule exists to prevent, and it
 * arrived through the fact base rather than through the checker.
 *
 * So the cap now bounds MEMORY and never VISIBILITY. A specifier longer than
 * this is recorded with its head plus a marker that no grammar's path syntax
 * can produce, so every arm answers `unresolved`, the checker counts it, and
 * the promise goes grey instead of green. The one arm that answers `external`
 * for an unrecognised specifier is Go's, and that is Go's own rule rather than
 * a truncation artefact: a path not under the module directive is a dependency.
 * A Go import path this long does not exist, and the longest real specifier
 * measured on 2026-08-26 across herdr and deadreckon is 2,840 characters, so
 * nothing real reaches the marker at all.
 */
const MAX_SPECIFIER_CHARS = 4096;

const QUERY_TEXT: Readonly<Record<GrammarId, string>> = {
  javascript: JS_QUERY,
  typescript: `${JS_QUERY}\n${TS_QUERY}`,
  tsx: `${JS_QUERY}\n${TS_QUERY}`,
  go: GO_QUERY,
  python: PYTHON_QUERY,
  rust: RUST_QUERY,
  ruby: RUBY_QUERY
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
    return (await this.extractAll(relPath, source)).symbols;
  }

  /**
   * Symbols AND imports in one file's text, from ONE parse and ONE walk of the
   * matches (Phase 63).
   *
   * There is no second query and no second traversal. The import patterns live
   * in the same five strings as the definition patterns, so a match carrying
   * `@import.path` and a match carrying `@definition.function` come out of the
   * same `matches()` call and are separated by capture name below.
   */
  async extractAll(
    relPath: string,
    source: string
  ): Promise<{ symbols: ExtractedSymbol[]; imports: ExtractedImport[] }> {
    const id = grammarFor(relPath);
    if (id === null) return { symbols: [], imports: [] };
    const g = await this.grammar(id);
    if (g === null) return { symbols: [], imports: [] };

    let tree: Tree | null = null;
    try {
      tree = g.parser.parse(source);
      if (tree === null) return { symbols: [], imports: [] };
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
  ): Promise<{
    symbols: ExtractedSymbol[];
    imports: ExtractedImport[];
    mtimeMs: number;
    size: number;
  } | null> {
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
    const found = await this.extractAll(relPath, buf.toString('utf8'));
    return { symbols: found.symbols, imports: found.imports, mtimeMs, size };
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
function collect(
  query: Query,
  root: TsNode
): { symbols: ExtractedSymbol[]; imports: ExtractedImport[] } {
  const out = new Map<string, ExtractedSymbol>();
  const imports: ExtractedImport[] = [];
  const seenImports = new Set<string>();

  for (const match of query.matches(root)) {
    let container: string | null = null;
    const defs: { kind: SymbolKind; node: TsNode }[] = [];
    const names: TsNode[] = [];
    // Phase 63. The import half of the same match stream. A match either
    // carries `@import.path` or it carries `@name`, never both, so the two
    // families never contend for the same match.
    let importForm: ImportForm | null = null;
    let importPath: TsNode | null = null;
    // Python's `from a.b import c`. See `memberSpecifier` below for why the
    // imported NAME is captured beside the module and what it is worth.
    let importMember: TsNode | null = null;

    for (const capture of match.captures) {
      if (capture.name === 'container') {
        container ??= capture.node.text;
        continue;
      }
      if (capture.name === 'name') {
        names.push(capture.node);
        continue;
      }
      if (capture.name === 'import.path') {
        importPath = capture.node;
        continue;
      }
      if (capture.name === 'import.member') {
        importMember = capture.node;
        continue;
      }
      const form = IMPORT_BY_CAPTURE[capture.name];
      if (form !== undefined) {
        importForm = form;
        continue;
      }
      const kind = KIND_BY_CAPTURE[capture.name];
      if (kind !== undefined) defs.push({ kind, node: capture.node });
    }

    if (importPath !== null && importForm !== null) {
      const written =
        importMember === null
          ? unquote(importPath.text)
          : memberSpecifier(unquote(importPath.text), importMember.text);
      if (written.length > 0) {
        const specifier =
          written.length <= MAX_SPECIFIER_CHARS
            ? written
            : `${written.slice(0, MAX_SPECIFIER_CHARS)}${IMPORT_TRUNCATION_MARKER}`;
        const line = importPath.startPosition.row + 1;
        // One import per (line, specifier, form). The re-export and static
        // patterns can both match one `export ... from` on some grammars, and
        // the fact base should hold one edge rather than two.
        const key = `${line}:${importForm}:${specifier}`;
        if (!seenImports.has(key)) {
          seenImports.add(key);
          imports.push({ specifier, line, form: importForm });
        }
      }
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

  return { symbols: [...out.values()], imports };
}

/**
 * The specifier without its quotes.
 *
 * The JavaScript, TypeScript and Python patterns capture a `string_fragment` or
 * a `dotted_name`, which carries no quotes at all, so this is a no-op for them.
 * Go has no `string_fragment` node, so its capture arrives as
 * `"github.com/foo/bar"` including the quotes, and a Go raw string uses
 * backticks. Ruby captures the whole string node on purpose, so its specifiers
 * arrive quoted too, in either quote style. Stripping here rather than in six
 * places is what keeps the fact base holding one shape.
 */
/**
 * `from a.b import c` to the dotted name `a.b.c`, which is the module that
 * really gets executed when `c` is a submodule.
 *
 * WHY THIS EXISTS, and it is the second half of the same defect the truncation
 * comment above describes. `PYTHON_QUERY` used to capture `module_name` alone,
 * so `from .routes import auth` arrived at the Python arm as `.routes` and the
 * arm answered `first-party lift_sys/api/routes/__init__.py`. That is a
 * DEFINITE answer, so `src/main/arch/checkers/imports.ts` counted the search as
 * resolved, and the real edge to `lift_sys/api/routes/auth.py` was neither
 * recorded as a crossing nor counted as a miss. A `must-not` promise across it
 * rendered CONVERGENT. Green. Measured on 2026-08-26: 6 such imports in
 * lift-sys and 126 in last30days-skill.
 *
 * The join is Python's own dotted-name rule and this is the only language that
 * uses `@import.member`. A relative module already ends in the dot that
 * separates it, so `.` plus `http` is `.http` and `.routes` plus `auth` is
 * `.routes.auth`.
 *
 * IT NEVER LOSES THE PACKAGE EDGE. The module-only pattern still matches the
 * same statement, so `from .routes import auth` records BOTH `.routes` and
 * `.routes.auth`, which is what Python really executes: the package's
 * `__init__.py` runs and then the submodule does. And when the imported name is
 * an ordinary class rather than a submodule, `resolvePython`'s walk stops at the
 * last real file and answers the package `__init__.py` anyway, so the extra row
 * is a harmless duplicate rather than a wrong answer.
 */
function memberSpecifier(moduleText: string, member: string): string {
  const module = moduleText.trim();
  const name = member.trim();
  if (module.length === 0 || name.length === 0) return module;
  return module.endsWith('.') ? `${module}${name}` : `${module}.${name}`;
}

function unquote(text: string): string {
  const first = text[0];
  const last = text[text.length - 1];
  if (
    text.length >= 2 &&
    (first === '"' || first === "'" || first === '`') &&
    last === first
  ) {
    return text.slice(1, -1);
  }
  return text;
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
