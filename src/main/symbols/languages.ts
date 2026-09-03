/**
 * The thirteen grammars gmux ships, and the extension → grammar map.
 *
 * TEN come from `@vscode/tree-sitter-wasm` (research 19 §2.8, measured on
 * disk): typescript 1,381 KB, tsx 1,412 KB, rust 1,088 KB, python 447 KB,
 * javascript 402 KB, go 212 KB, ruby 2,057 KB since Phase 157, and java 405 KB,
 * php 1,033 KB and c-sharp 4,984 KB since Phase 184 = 13.1 MB. That package
 * also carries cpp (5.1 MB), bash, powershell, css, ini and regex.
 *
 * THE PACKAGE IS NOT THE BUNDLE, and Phase 184 is where that stopped being a
 * detail. `electron-builder.yml` copies these out of the package BY EXACT
 * FILENAME, never by directory, so a grammar the package carries and this list
 * does not name costs nothing and a grammar this list names costs its whole
 * size in signed app. Java's 414,641 bytes are a deliberate act with a size
 * cost like every one before it, and what they buy is a Java repository's
 * imports RESOLVING rather than its files being counted as unread. PHP's
 * 1,058,041 bytes buy the same thing, and Composer's `autoload.psr-4` map
 * makes PHP the one language in this resolver whose first party answers lean
 * on no convention at all. C sharp's 5,103,332 bytes are the largest single
 * spend of the three and the argument is the same: no grammar the bundle
 * carries reads a `using` directive, so without it a C sharp repository has no
 * imports at all.
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
  | 'java'
  | 'php'
  | 'c-sharp';

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
  'java',
  'php',
  'c-sharp'
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
 *
 * PHASE 184 PUT `.c` AND THE C++ EXTENSIONS ON THAT SAME GRAMMAR AND ADMITTED
 * NEITHER OF THE TWO THE PACKAGE OFFERS, and both refusals are measured rather
 * than assumed. tree-sitter-c v0.24.2 is 645,157 bytes and beats objc by ONE
 * clean file on libgit2 while losing by TWO on redis, extracting exactly the
 * same includes. The bundled cpp grammar is 5,394,393 bytes and buys NO import
 * resolution at all: over 400 abseil files objc extracted 3,637 `#include`
 * directives against a ground truth of 3,636, because a tree-sitter parse
 * recovers a preprocessor directive whatever the macro soup around it does.
 * Every grammar this build has ever spent bytes on bought imports RESOLVING,
 * and cpp would buy symbols only, from 5.5 percent of abseil's files clean to
 * 20 percent. The limit that follows is stated where a person meets it: a
 * template heavy C++ file gives PARTIAL SYMBOLS, and whole imports.
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
  // Phase 184: the C family on the grammar this build already vendors. Which
  // ARM reads each of these is src/main/arch/scan.ts's knowledge, not this
  // module's: `.h` stays on the Objective-C arm and the rest do not.
  c: 'objc',
  cc: 'objc',
  cpp: 'objc',
  cxx: 'objc',
  hpp: 'objc',
  hh: 'objc',
  hxx: 'objc',
  java: 'java',
  php: 'php',
  cs: 'c-sharp'
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
