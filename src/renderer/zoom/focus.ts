/**
 * Which region a zoom keystroke belongs to.
 *
 * Read off the SAME focus model the rest of the app uses — the keydown target
 * (or `document.activeElement`), resolved by `closest()` against the region
 * roots, exactly as App.tsx's `showViewAction` and `focusedSessionRowId` do.
 * No parallel "focused region" state: a second copy of focus is a second
 * thing to keep in sync, and the DOM already knows.
 *
 * Two rules that are not obvious from the list:
 *
 *  - **The image viewer keeps its own ⌘+ / ⌘- / ⌘0.** Phase 12.10 gave it a
 *    real magnifier with pointer-anchored scaling and a fit mode; the window
 *    handler runs in the capture phase and would otherwise swallow the chord
 *    before the viewer's own bubble-phase handler ever saw it. `'defer'`
 *    means "not ours — let it through untouched". The ARCHITECTURE MAP TAB
 *    (Phase 162) defers for the same reason: its camera owns the coordinate
 *    math, so the chord routes into the camera's own scale and never into a
 *    CSS zoom region.
 *  - **A sidebar view is its own region, whichever view it is.** The region
 *    comes from the view's own identifier rather than from a branch that
 *    names the views it knows, so the sidebar's next view zooms on the day it
 *    ships instead of quietly moving another view's level.
 *  - **A focused session tab is not the sessions region in TOP orientation.**
 *    There the strip IS the 36px band, which never zooms (regions.ts). The
 *    tab points at a session, so ⌘+ enlarges that session — the text the user
 *    is actually reading — instead of doing nothing.
 */

import {
  isSidebarViewId,
  SIDEBAR_VIEW_DEFAULT
} from '../state/sidebar-views';
import type { ZoomRegionId } from './regions';

/** Right-hand dock vs. top tab strip; mirrors the store's SessionOrientation. */
export type SessionSurfaceOrientation = 'top' | 'right';

export type ZoomTarget = ZoomRegionId | 'defer';

/** `Element.closest`, narrowed to what the rule below actually needs. */
export type ClosestProbe = (selector: string) => { view?: string } | null;

/**
 * A sidebar view zooms as ITSELF: the `data-view` attribute the sidebar
 * already writes IS the region name, because regions.ts spreads the view ids
 * into its region list. The line this replaces was
 * `view === 'explorer' ? 'explorer' : 'scm'`, which meant that focusing Search
 * and pressing ⌘+ moved the Source Control level instead — a level the user
 * had not asked to change (Phase 18.55).
 *
 * The fallback is the sidebar's own default view, for an element that carries
 * no `data-view` at all. This return also types the promise the phase makes:
 * a `SidebarViewId` is assignable to `ZoomRegionId` only for as long as the
 * region list keeps deriving from the view list, so breaking that derivation
 * breaks the build here rather than going quiet.
 */
function sidebarZoomRegion(view: string | undefined): ZoomRegionId {
  return isSidebarViewId(view) ? view : SIDEBAR_VIEW_DEFAULT;
}

/**
 * The rule, as a pure function of "what does an ancestor match?". Kept apart
 * from the DOM so the whole decision table is testable without a layout
 * engine — the ordering here is the part that can silently rot.
 */
export function zoomTargetFor(
  closest: ClosestProbe,
  orientation: SessionSurfaceOrientation
): ZoomTarget {
  // Surfaces that own the chord themselves. The MAP TAB (Phase 162) is the
  // image viewer's twin: its camera owns the coordinate math, so ⌘+ over the
  // map scales the camera rather than a CSS region (research 68 §6.3, the
  // Monaco and Pierre precedent). ORDERING IS LOAD-BEARING: both surfaces
  // nest inside `.ed-panel`, so deferring must win over the editor region,
  // or the chord silently moves `--zoom-editor` — a level the person did not
  // ask to change, the exact Phase 18.55 bug shape.
  if (closest('.imgv') !== null) return 'defer';
  if (closest('.arch-map-tab') !== null) return 'defer';

  if (closest('.ed-panel') !== null) return 'editor';
  if (closest('.gmux-terminal-pane') !== null) return 'terminal';

  const view = closest('.sidebar-view');
  if (view !== null) return sidebarZoomRegion(view.view);

  // The right-hand dock has a real list under its band slice; the top strip
  // does not (see the header note), so a tab there defers to its session.
  if (closest('[data-slot="session-dock"]') !== null) return 'sessions';
  if (closest('[data-slot="session-strip"]') !== null) {
    return orientation === 'right' ? 'sessions' : 'terminal';
  }

  // Focus is nowhere in particular (body, a toast, the titlebar): the session
  // is where the work is, and it is what ⌘+ should reach for.
  return 'terminal';
}

export function resolveZoomTarget(
  from: EventTarget | Element | null,
  orientation: SessionSurfaceOrientation
): ZoomTarget {
  const el = from instanceof Element ? from : null;
  if (el === null) return 'terminal';
  return zoomTargetFor((selector) => {
    const hit = el.closest<HTMLElement>(selector);
    if (hit === null) return null;
    const view = hit.dataset['view'];
    return view === undefined ? {} : { view };
  }, orientation);
}
