/**
 * src/renderer/search — the ⌘⇧F Search view and the ⌘⇧O symbol palette.
 *
 * Two surfaces, one module, because they answer the same question at two
 * grains: "where is this text" and "where is this definition". They share the
 * result-row vocabulary (`rows.ts`), the highlight mark, and the one way a
 * result opens — through the canonical open-file bus with a `selection`, so a
 * hit is REVEALED and SELECTED rather than merely scrolled near.
 *
 * The public surface is deliberately small: two components for the sidebar,
 * one overlay, and the handful of imperative helpers App.tsx needs to wire the
 * chords.
 */

// PHASE 165. The stylesheet is imported by `./subject.ts`, the lazy door,
// so it arrives with the view rather than with the shell.

// PHASE 165. The two sidebar parts and the palette are exported through their
// lazy doors and NOT from their own files: a static re-export here would keep
// the view, the results list and this barrel's stylesheet in the entry chunk
// of every launch. The three focus reads moved to a leaf for the same reason.
export {
  preloadSearchSubject,
  SearchHeaderLazy,
  SearchSectionLazy,
  SymbolPaletteLazy
} from './lazy';
export {
  focusInsideSearch,
  focusSearchInput,
  selectionSeed
} from './focus';
export { focusResultsList } from './results-focus';
export { useSearch, searchAvailable } from './store';
export type { SearchState, SearchStatus } from './store';
export { useSymbols, symbolsAvailable } from './symbols-store';
export type { SymbolsState } from './symbols-store';
export { parseSymbolQuery } from './symbol-query';
export type { ParsedSymbolQuery, SymbolMode } from './symbol-query';
export { symbolIcon, symbolKindLabel } from './symbol-kinds';
export {
  ROW_HEIGHT,
  flattenRows,
  matchKey,
  mergeFrame,
  rowKey,
  splitHighlights,
  splitPath
} from './rows';
export type { ContextLine, SearchRow } from './rows';
