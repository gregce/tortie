/**
 * The seven grammars gmux ships, and the extension → grammar map.
 *
 * SEVEN, not sixteen (research 19 §2.8, measured on disk): typescript 1,381 KB,
 * tsx 1,412 KB, rust 1,088 KB, python 447 KB, javascript 402 KB, go 212 KB and,
 * since Phase 157, ruby 2,057 KB = 6.8 MB. `@vscode/tree-sitter-wasm` also
 * carries cpp (5.1 MB), c-sharp (4.9 MB), bash, java, php, powershell, css, ini
 * and regex, which is about 12 MB for languages nobody in these repos writes.
 *
 * THE SEVENTH WAS A DELIBERATE ACT WITH A SIZE COST, which is what the rule
 * here has always said it would take. Phase 157 spent 2.0 MB of signed bundle
 * so that a Ruby repository's imports RESOLVE rather than being counted as
 * files nobody read. Ruby was the one language of the phase's three that had no
 * grammar in the bundle and no query, so it cost both. An eighth costs the same
 * again, and the same argument has to be made for it.
 *
 * This module holds NO paths and imports NO electron: it is the vocabulary the
 * worker and the indexer share, and it has to be loadable in a plain vitest
 * process. Path resolution lives in `paths.ts` (main only).
 */

/** Grammar ids — one `.wasm` file each. */
export type GrammarId =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'go'
  | 'python'
  | 'rust'
  | 'ruby';

export const GRAMMARS: readonly GrammarId[] = [
  'typescript',
  'tsx',
  'javascript',
  'go',
  'python',
  'rust',
  'ruby'
];

/**
 * Extension (no dot, lower-case) → grammar.
 *
 * `.mts`/`.cts` and `.mjs`/`.cjs` are in because agent-written tooling uses
 * them constantly; `.d.ts` needs no entry — it is `.ts`, and the TS query's
 * ambient-declaration patterns are what read it.
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
  rb: 'ruby'
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
