/**
 * The eleven grammars gmux ships, and the extension → grammar map.
 *
 * EIGHT come from `@vscode/tree-sitter-wasm` (research 19 §2.8, measured on
 * disk): typescript 1,381 KB, tsx 1,412 KB, rust 1,088 KB, python 447 KB,
 * javascript 402 KB, go 212 KB, ruby 2,057 KB since Phase 157 and java 405 KB
 * since Phase 184 = 7.2 MB. That package also carries cpp (5.1 MB), c-sharp
 * (4.9 MB), bash, php, powershell, css, ini and regex.
 *
 * THE PACKAGE IS NOT THE BUNDLE, and Phase 184 is where that stopped being a
 * detail. `electron-builder.yml` copies these out of the package BY EXACT
 * FILENAME, never by directory, so a grammar the package carries and this list
 * does not name costs nothing and a grammar this list names costs its whole
 * size in signed app. Java's 414,641 bytes are a deliberate act with a size
 * cost like every one before it, and what they buy is a Java repository's
 * imports RESOLVING rather than its files being counted as unread.
 *
 * THREE MORE ARE VENDORED IN `resources/tree-sitter/`, admitted by Phase 180
 * as its own deliberate act because no package the bundle carries ships them:
 * swift 3,736 KB (alex-pinkus/tree-sitter-swift 0.7.3), kotlin 3,958 KB
 * (fwcd/tree-sitter-kotlin 0.3.8) and objc 5,193 KB
 * (tree-sitter-grammars/tree-sitter-objc v3.0.2) = 12.6 MB. Each is a prebuilt
 * MIT-licensed release asset pinned by sha256 in
 * `resources/tree-sitter/GRAMMAR-PINS.json`; wasm is data run by the
 * tree-sitter runtime the bundle already carries, so the Phase 23 refusal on
 * third-party native code is not touched.
 *
 * EVERY GRAMMAR PAST THE SIX WAS A DELIBERATE ACT WITH A SIZE COST, which is
 * what the rule here has always said it would take. Phase 157 spent 2.0 MB of
 * signed bundle so that a Ruby repository's imports RESOLVE rather than being
 * counted as files nobody read. Phase 180 spent 12.6 MB the same way for the
 * client languages rookery is written in. The next one costs the same again,
 * and the same argument has to be made for it.
 *
 * This module holds NO paths and imports NO electron: it is the vocabulary the
 * worker and the indexer share, and it has to be loadable in a plain vitest
 * process. Path resolution lives in `paths.ts` (main only), and which grammar
 * lives in which of the two source directories is paths.ts's knowledge too.
 */

/** Grammar ids — one `.wasm` file each. */
export type GrammarId =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'go'
  | 'python'
  | 'rust'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'objc'
  | 'java';

export const GRAMMARS: readonly GrammarId[] = [
  'typescript',
  'tsx',
  'javascript',
  'go',
  'python',
  'rust',
  'ruby',
  'swift',
  'kotlin',
  'objc',
  'java'
];

/**
 * Extension (no dot, lower-case) → grammar.
 *
 * `.mts`/`.cts` and `.mjs`/`.cjs` are in because agent-written tooling uses
 * them constantly; `.d.ts` needs no entry — it is `.ts`, and the TS query's
 * ambient-declaration patterns are what read it.
 *
 * `.h` reads with the OBJC grammar (Phase 180), which is a C superset, so a
 * plain C or C++ header still parses; its C++ ONLY constructs are skipped
 * rather than crashing the file, and that limit is deliberate: the alternative
 * was leaving every Objective-C header unread. `.kts` is a Kotlin script and
 * the same grammar reads it.
 */
const BY_EXTENSION: Readonly<Record<string, GrammarId>> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  go: 'go',
  py: 'python',
  pyi: 'python',
  rs: 'rust',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  m: 'objc',
  h: 'objc',
  java: 'java'
};

/** The grammar for a path, or null when gmux does not index that language. */
export function grammarFor(relPath: string): GrammarId | null {
  const dot = relPath.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = relPath.slice(dot + 1).toLowerCase();
  return BY_EXTENSION[ext] ?? null;
}

/** Every extension the indexer will open. Used to filter the enumeration. */
export const INDEXABLE_EXTENSIONS: readonly string[] = Object.keys(BY_EXTENSION);

/**
 * Files this big are skipped. A 4 MB generated client is minutes of parse time
 * and contributes symbols nobody searches for; the honest answer is to leave
 * it out rather than to make the whole index slow.
 */
export const MAX_INDEXED_FILE_BYTES = 2 * 1024 * 1024;
