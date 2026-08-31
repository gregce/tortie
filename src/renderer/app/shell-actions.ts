/**
 * The four shell reads both keyboard controllers need (Phase 127).
 *
 * WHY THIS FILE EXISTS. `./keyboard.ts` and `./menu-actions.ts` are two ways
 * into the same verbs. A chord and the menu row that prints it must do the
 * same thing, so the answer to "which session is the keyboard on", "show this
 * view", "show search" and "is a layer up" has to be written once. Without
 * this leaf the two controllers would import each other and
 * `build/assert-no-runtime-cycles.mjs` would reject the pair.
 *
 * Every function here READS the document or the store and then calls a store
 * setter. None of them owns state and none of them touches a session status.
 */

import { useApp } from '../state/store';
import type { SidebarViewId } from '../state/store';
// Phase 175. The Architecture switch, read at the one gate below.
import { archSurfacesOn } from '../settings/settings-store';
// PHASE 165. The leaf, not the barrel, which is the Search subject's door.
import { focusSearchInput, selectionSeed } from '../search/focus';

/**
 * The session surface the keyboard is "on" right now: any focused element
 * inside a session tab (top orientation), a dock row or the identity strip
 * (right orientation) resolves to that surface's session via its
 * data-session-id. Null when focus is elsewhere (terminal, editor…) —
 * callers fall back to the active session, per §4 "rename focused item".
 */
export function focusedSessionRowId(): string | null {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return null;
  return el.closest<HTMLElement>('[data-session-id]')?.dataset['sessionId'] ?? null;
}

/**
 * ⌘⇧E / ⌃⇧G (S3): show + focus the view; pressed again while the view is
 * focused → focus returns to the terminal.
 */
export function showViewAction(view: SidebarViewId): void {
  // Phase 175. The Architecture view is off until a person turns it on in
  // Settings. The chord and the View menu row both land here, and a dead
  // entry point does NOTHING: no focus dance, no store call, no side
  // effect. The store's own setters refuse too, so a caller that bypasses
  // this body still cannot show the view.
  if (view === 'arch' && !archSurfacesOn()) return;
  const s = useApp.getState();
  const viewEl = document.querySelector<HTMLElement>('.sidebar-view');
  const focusInside =
    viewEl !== null && viewEl.contains(document.activeElement);
  if (s.sidebarVisible && s.activeSidebarView() === view && focusInside) {
    document
      .querySelector<HTMLTextAreaElement>('.gmux-terminal-mount textarea')
      ?.focus();
    return;
  }
  s.showSidebarView(view);
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('.sidebar-view')?.focus();
  });
}

/**
 * ⌘⇧F: show the Search view and put the caret in the box.
 *
 * Pressed again while the caret is already there it SELECTS the query rather
 * than toggling the view away — the gesture people make is "search for
 * something else", and losing the view instead is the kind of surprise that
 * stops you using a shortcut at all. That is why this is not `showViewAction`.
 */
export function showSearchAction(): void {
  const inBox =
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.dataset['slot'] === 'search-input';
  useApp.getState().showSidebarView('search');
  // A one-line selection is a seed; a paragraph is not (selectionSeed refuses
  // multi-line and very long text).
  focusSearchInput(inBox ? undefined : selectionSeed());
}

/**
 * A sheet or an overlay owns the keyboard right now.
 *
 * One expression, read by `runMenuAction` (which had it inline until Phase
 * 80.1) and by the focus chord below. The two palettes are NOT in it, because
 * ⌘P and ⌘⇧O are both meant to work from inside another layer; the focus
 * chord adds them at its own call site.
 */
export function modalLayerOpen(): boolean {
  const s = useApp.getState();
  return (
    s.confirm !== null ||
    s.createOpen ||
    s.newProjectOpen ||
    s.remoteProjectOpen ||
    s.shortcutsOpen ||
    s.attentionOpen ||
    s.pastOpen ||
    // Phase 137. The Catch Me Up page counts as a layer, so ⇧⌘↩ and the
    // other view actions are swallowed while it is open. Its own chord and
    // Escape are handled above this guard and still work.
    s.overview !== null
  );
}
