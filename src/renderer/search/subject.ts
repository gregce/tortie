/**
 * The Search domain's three mounted surfaces, behind ONE door (Phase 165).
 *
 * `./lazy.tsx` imports this file with a single `import()`, so Rollup emits the
 * view, the results list, the symbol palette and the stylesheet they share as
 * one chunk rather than three. The stylesheet is imported here rather than in
 * the barrel because the barrel is eager and this file is not; the rules
 * arrive with the first surface that needs them. Nothing else imports this
 * file, and nothing else here runs.
 */

import './search.css';

export { SearchHeader, SearchSection } from './SearchView';
export { SymbolPalette } from './SymbolPalette';
