/**
 * The three reads of the Search view the shell makes on every launch
 * (Phase 14, moved here in Phase 165).
 *
 * These used to live in `./SearchView.tsx`. The keyboard map, the menu
 * actions and the shell actions reach them on a launch that never shows the
 * Search subject, and a leaf that imports the view's own module for three
 * functions drags the view, its results list and its stylesheet into the
 * entry chunk. So they live here, and they reach the DOM and the store only.
 * Nothing about what any of them does moved.
 */

import { useSearch } from './store';

/**
 * Put the caret in the search box (⌘⇧F, and the activity-bar item).
 *
 * Pressed again while already inside the box it SELECTS what is there rather
 * than toggling the view away — retyping over the old query is the gesture
 * people actually make, and losing the view instead is the kind of surprise
 * that stops you using a shortcut.
 */
export function focusSearchInput(seed?: string): void {
  const attempt = (): boolean => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-slot="search-input"]'
    );
    if (input === null) return false;
    if (seed !== undefined && seed.length > 0 && seed !== input.value) {
      useSearch.getState().setQuery(seed);
    }
    input.focus();
    input.select();
    return true;
  };
  // Try NOW — the view is usually already mounted, and a chord that focuses a
  // frame late is a chord that eats the first character you type. The rAF is
  // the fallback for the case where showSidebarView only just mounted it.
  //
  // PHASE 165. The subject is lazy now, so on the very first ⌘⇧F of a launch
  // the view's chunk may still be loading when the frame arrives. A second
  // frame is tried for that case, and the seed is written to the store
  // regardless, so the box shows the seed when it does mount.
  if (attempt()) return;
  if (seed !== undefined && seed.length > 0) {
    useSearch.getState().setQuery(seed);
  }
  let tries = 0;
  const later = (): void => {
    if (attempt()) return;
    tries += 1;
    if (tries < 20) requestAnimationFrame(later);
  };
  requestAnimationFrame(later);
}

/** True while the keyboard is inside the Search view (scopes ⌥⌘C/W/R). */
export function focusInsideSearch(): boolean {
  const el = document.activeElement;
  return el instanceof Element && el.closest('[data-view="search"]') !== null;
}

/**
 * A one-line, non-empty selection makes a good seed for ⌘⇧F — and a multi-line
 * one does not, which is why this refuses it rather than pasting a paragraph
 * into the query box.
 */
export function selectionSeed(): string | undefined {
  const text = window.getSelection()?.toString() ?? '';
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return undefined;
  if (trimmed.includes('\n')) return undefined;
  return trimmed;
}
