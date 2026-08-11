/**
 * src/main/search — Phase 14's engine room.
 *
 * Public surface, deliberately small:
 *  - `registerSearchIpc` / `disposeSearchIpc` — the ⌘⇧F channels.
 *  - `rgBinaryPath` — THE ripgrep path, for quick open and the symbol indexer
 *    (O2: one resolver, one enumeration, one ignore truth).
 *  - `buildListFilesArgs` — THE `rg --files` argv, for the same two.
 *
 * Everything else (args, parser, engine internals) is an implementation
 * detail of content search and is imported directly by its tests.
 */

export { registerSearchIpc, disposeSearchIpc } from './ipc';
export { rgBinaryPath, resetRgBinaryPathCache } from './resolve';
export { buildListFilesArgs } from './files-args';
export type { ListFilesOptions } from './files-args';
