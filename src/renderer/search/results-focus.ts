/**
 * The keyboard bridge from the query box into the results list (Phase 42
 * stage 8, re-homed out of SearchView.tsx).
 *
 * It lived in SearchView.tsx, and QueryBlock.tsx imported it from there while
 * SearchView imported the QueryBlock component — a production import cycle.
 * The helper touches only the DOM slot and the search store, so it is a leaf
 * both files can share. The public surface is unchanged: `../search` still
 * exports `focusResultsList`.
 */

import { useSearch } from './store';

/**
 * Move focus into the results list, selecting the first row if nothing is.
 *
 * This is the keyboard bridge between the box and the results, and it is ↓
 * from the query field rather than Esc. Esc cannot be it: the first Esc in a
 * non-empty box CLEARS the query, which takes the results with it, so
 * "Esc to reach the results" would only ever work on an empty search.
 */
export function focusResultsList(): boolean {
  const list = document.querySelector<HTMLElement>(
    '[data-slot="search-results"]'
  );
  if (list === null) return false;
  const search = useSearch.getState();
  if (search.selectedKey === null) {
    const first = search.files[0];
    const match = first?.matches[0];
    if (first !== undefined && match !== undefined) {
      search.setSelectedKey(`m:${first.relPath}:${String(match.line)}`);
    }
  }
  list.focus();
  return true;
}
