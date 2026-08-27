/**
 * src/main/symbols — "go to symbol", the tree-sitter way (Phase 14).
 *
 * Seven WASM grammars, six gmux-authored tags queries, a lazily-created pool of
 * at most six `worker_threads`, and a SQLite table keyed by
 * `(repoPath, relPath, mtimeMs, size)` so re-indexing is a diff rather than a
 * rebuild. The decisive property, and the reason every alternative lost:
 * PURE WASM — zero native code and zero codesigning burden.
 *
 * Public surface, deliberately small: the palette talks IPC, and nothing else
 * in main talks to this module at all.
 */

export { registerSymbolsIpc, disposeSymbolsIpc } from './ipc';
export { SymbolService, IDLE_EVICT_MS } from './service';
export type { SymbolServiceDeps } from './service';
export { SymbolTable } from './store';
export { SymbolPool, defaultPoolSize, BATCH_SIZE } from './pool';
export { SymbolPersistence, defaultSymbolDbPath } from './persist';
export { SymbolExtractor } from './extract';
export type { ExtractedSymbol } from './extract';
export { grammarFor, GRAMMARS, INDEXABLE_EXTENSIONS } from './languages';
export type { GrammarId } from './languages';
export { assetProblem, grammarDir, grammarPath, runtimeWasmPath } from './paths';
